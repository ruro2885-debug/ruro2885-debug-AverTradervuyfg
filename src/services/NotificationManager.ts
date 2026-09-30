import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, onSnapshot, getDoc, runTransaction, Timestamp, arrayRemove } from 'firebase/firestore';
import { NotificationItem, NotificationCategory, NotificationPriority } from '../types/notifications';
import { safeStorage } from '../utils/storage';

export class NotificationManager {
  private userId: string | null;
  private unsubscribe: (() => void) | null = null;
  private static recentAdditions: Map<string, number> = new Map();

  constructor(userId: string | null) {
    this.userId = userId;
  }

  public static deduplicateList(rawNotifs: NotificationItem[]): NotificationItem[] {
    const seen = new Set<string>();
    const unique: NotificationItem[] = [];

    for (const raw of rawNotifs) {
      if (!raw) continue;
      const notif: NotificationItem = {
        ...raw,
        id: raw.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        category: raw.category || 'system',
        priority: raw.priority || 'low',
        title: raw.title || 'Notification',
        body: raw.body || '',
        date: raw.date || new Date().toISOString(),
        createdAtTimestamp: raw.createdAtTimestamp || (raw.date ? new Date(raw.date).getTime() : Date.now())
      };
      if (notif.id && seen.has(notif.id)) continue;

      const cleanTitle = (notif.title || '').trim().toLowerCase();
      const cleanBody = (notif.body || '').trim().toLowerCase();
      const timeMs = notif.createdAtTimestamp;
      const timeBucket = Math.floor(timeMs / 120000); // 2-minute bucket
      const contentKey = `${notif.category}|${cleanTitle}|${cleanBody}|${timeBucket}`;

      if (seen.has(contentKey)) continue;

      // Check if duplicate of an already processed notification within 5 minutes or identical title+body
      const isDup = unique.some(existing => {
        if (existing.id === notif.id) return true;
        const exTitle = (existing.title || '').trim().toLowerCase();
        const exBody = (existing.body || '').trim().toLowerCase();
        const exTime = existing.createdAtTimestamp || (existing.date ? new Date(existing.date).getTime() : Date.now());
        const timeDiff = Math.abs(exTime - timeMs);
        if (existing.category === notif.category && exTitle === cleanTitle && exBody === cleanBody && timeDiff < 300000) return true;
        if (exTitle === cleanTitle && exBody === cleanBody && timeDiff < 60000) return true;
        return false;
      });

      if (!isDup) {
        if (notif.id) seen.add(notif.id);
        seen.add(contentKey);
        unique.push(notif);
      }
    }

    return unique;
  }

  public subscribe(onUpdate: (notifications: NotificationItem[]) => void) {
    if (!this.userId || this.userId.startsWith('local-')) {
      // Scoped local storage fallback for anonymous/local
      const uid = this.userId || 'guest';
      const userNotifsStr = safeStorage.getItem(`user_notifications_${uid}`);
      if (userNotifsStr) {
        try {
          const notifs = JSON.parse(userNotifsStr);
          const deduplicated = NotificationManager.deduplicateList(notifs);
          onUpdate(deduplicated);
        } catch (e) {
          onUpdate([]);
        }
      } else {
        onUpdate([]);
      }
      return;
    }

    const userDocRef = doc(db, 'users', this.userId);
    this.unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const rawNotifs = data.notificationsList || [];
        const uniqueNotifs = NotificationManager.deduplicateList(rawNotifs);
        uniqueNotifs.sort((a: NotificationItem, b: NotificationItem) => b.createdAtTimestamp - a.createdAtTimestamp);
        onUpdate(uniqueNotifs);
      }
    }, (error) => {
      console.error("[NotificationManager] Snapshot error:", error);
      handleFirestoreError(error, OperationType.GET, `users/${this.userId}`);
    });
  }

  public unsubscribeAll() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  public async addNotification(
    category: NotificationCategory,
    priority: NotificationPriority,
    title: string,
    body: string,
    actionUrl?: string,
    action?: string,
    metadata?: Record<string, any>
  ) {
    // Check notification preferences
    let notifPrefs: any = null;
    try {
      const raw = safeStorage.getItem('aver_notifications');
      if (raw) notifPrefs = JSON.parse(raw);
    } catch (e) {}

    if (notifPrefs) {
      if (notifPrefs.master === false) return;
      if (category === 'security' && notifPrefs.security === false) return;
      if (['account', 'profile'].includes(category) && notifPrefs.profile === false) return;
      if (category === 'deposit' && notifPrefs.deposits === false) return;
      if (category === 'withdrawal' && notifPrefs.withdrawals === false) return;
      if (['trading', 'portfolio', 'copy_trading', 'swap', 'ai'].includes(category) && notifPrefs.trading === false) return;
      if (['referral', 'vault', 'rewards'].includes(category) && notifPrefs.rewards === false) return;
      if (category === 'system' && notifPrefs.system === false) return;
      if (category === 'marketing' && notifPrefs.marketing === false) return;
    }

    const cleanTitle = (title || '').trim();
    const cleanBody = (body || '').trim();
    const debounceKey = `${this.userId || 'anon'}|${category}|${cleanTitle.toLowerCase()}|${cleanBody.toLowerCase()}`;
    const now = Date.now();

    // 5-second in-memory debounce to completely prevent double-firing
    const lastSent = NotificationManager.recentAdditions.get(debounceKey);
    if (lastSent && (now - lastSent) < 5000) {
      console.log("[NotificationManager] Blocked rapid duplicate notification:", cleanTitle);
      return;
    }
    NotificationManager.recentAdditions.set(debounceKey, now);

    const newNotif: NotificationItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      category,
      priority,
      title: cleanTitle,
      body: cleanBody,
      read: false,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      createdAtTimestamp: now,
      actionUrl: actionUrl || '',
      action: action || null,
      metadata: metadata || {},
      pinned: false,
      archived: false,
    };

    if (!this.userId || this.userId.startsWith('local-')) {
      if (safeStorage.getItem('aver_logged_out') === 'true') return;
      // Scoped local storage fallback
      const uid = this.userId || 'guest';
      const userNotifsStr = safeStorage.getItem(`user_notifications_${uid}`);
      let notifs: NotificationItem[] = [];
      if (userNotifsStr) {
        try { notifs = JSON.parse(userNotifsStr); } catch (e) {}
      }
      const isDuplicate = notifs.some((n: NotificationItem) => {
        const sameText = n.category === category && n.title.trim().toLowerCase() === cleanTitle.toLowerCase() && n.body.trim().toLowerCase() === cleanBody.toLowerCase();
        const timeDiff = Math.abs((n.createdAtTimestamp || 0) - now);
        return sameText && timeDiff < 30000;
      });
      if (isDuplicate) {
        console.log("[NotificationManager] Duplicate local notification blocked:", cleanTitle);
        return;
      }
      const updatedNotifs = NotificationManager.deduplicateList([newNotif, ...notifs]);
      safeStorage.setItem(`user_notifications_${uid}`, JSON.stringify(updatedNotifs));
      return;
    }

    const userDocRef = doc(db, 'users', this.userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const notifs = data.notificationsList || [];
      const isDuplicate = notifs.some((n: NotificationItem) => {
        const sameText = n.category === category && n.title.trim().toLowerCase() === cleanTitle.toLowerCase() && n.body.trim().toLowerCase() === cleanBody.toLowerCase();
        const timeDiff = Math.abs((n.createdAtTimestamp || 0) - now);
        return sameText && timeDiff < 30000;
      });
      if (isDuplicate) {
        console.log("[NotificationManager] Duplicate firestore notification blocked:", cleanTitle);
        return;
      }
    }

    await updateDoc(userDocRef, {
      notificationsList: arrayUnion(newNotif)
    });
  }

  public async markAsRead(id: string, readState?: boolean) {
    if (!this.userId || this.userId.startsWith('local-')) {
      if (safeStorage.getItem('aver_logged_out') === 'true') return;
      // Scoped local storage fallback
      const uid = this.userId || 'guest';
      const userNotifsStr = safeStorage.getItem(`user_notifications_${uid}`);
      if (userNotifsStr) {
        try {
          const notifs = JSON.parse(userNotifsStr);
          const updated = notifs.map((n: NotificationItem) => n.id === id ? { ...n, read: readState !== undefined ? readState : !n.read } : n);
          safeStorage.setItem(`user_notifications_${uid}`, JSON.stringify(updated));
        } catch (e) {}
      }
      return;
    }

    await runTransaction(db, async (transaction) => {
      const userDocRef = doc(db, 'users', this.userId!);
      const docSnap = await transaction.get(userDocRef);
      if (!docSnap.exists()) throw new Error("User document not found");

      const notifs = docSnap.data().notificationsList || [];
      const updatedNotifs = notifs.map((n: NotificationItem) => n.id === id ? { ...n, read: readState !== undefined ? readState : !n.read } : n);
      transaction.update(userDocRef, { notificationsList: updatedNotifs });
    });
  }
}
