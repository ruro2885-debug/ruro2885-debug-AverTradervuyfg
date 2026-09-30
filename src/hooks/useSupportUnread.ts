import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SupportTicket, mergeTicketsWithLocal } from '../lib/supportStore';

export function useSupportUnread(userId?: string | null, userEmail?: string | null) {
  const [hasUnreadAdminMessage, setHasUnreadAdminMessage] = useState(false);
  const [unreadAdminCount, setUnreadAdminCount] = useState(0);

  const getStorageKey = useCallback(() => {
    return userId ? `aver_support_last_read_${userId}` : 'aver_support_last_read_guest';
  }, [userId]);

  const getLastReadTime = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const stored = localStorage.getItem(getStorageKey());
      return stored ? Number(stored) : 0;
    } catch (e) {
      return 0;
    }
  }, [getStorageKey]);

  const evaluateUnread = useCallback((tickets: SupportTicket[]) => {
    if (!userId && !userEmail) {
      setHasUnreadAdminMessage(false);
      setUnreadAdminCount(0);
      return;
    }

    const lastRead = getLastReadTime();
    let unreadCount = 0;

    for (const ticket of tickets) {
      // Must strictly belong to this respective user
      const isUserMatch = (userId && ticket.userId === userId) ||
        (userEmail && ticket.userEmail && ticket.userEmail.toLowerCase() === userEmail.toLowerCase());
      
      if (!isUserMatch) continue;

      const msgs = ticket.messages || [];
      for (const m of msgs) {
        // ONLY count messages sent by the admin
        const isAdminMsg = m.isAdmin === true || m.senderRole === 'admin';
        if (!isAdminMsg) continue;

        const msgTime = new Date(m.timestamp || 0).getTime();
        const isDeliveredOrUnread = m.status !== 'read';

        if (msgTime > lastRead && isDeliveredOrUnread) {
          unreadCount++;
        }
      }
    }

    setHasUnreadAdminMessage(unreadCount > 0);
    setUnreadAdminCount(unreadCount);
  }, [userId, userEmail, getLastReadTime]);

  const markAsRead = useCallback(() => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    try {
      localStorage.setItem(getStorageKey(), String(now));
    } catch (e) {}
    setHasUnreadAdminMessage(false);
    setUnreadAdminCount(0);
    window.dispatchEvent(new CustomEvent('aver_support_read', { detail: { timestamp: now, userId } }));
  }, [getStorageKey, userId]);

  useEffect(() => {
    if (!userId && !userEmail) {
      setHasUnreadAdminMessage(false);
      setUnreadAdminCount(0);
      return;
    }

    // 1. Check local tickets first
    const local = mergeTicketsWithLocal([]);
    evaluateUnread(local);

    // 2. Real-time Firestore listener strictly for this user's tickets
    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', userId || '')
    );

    const unsubscribeFs = onSnapshot(q, (snapshot) => {
      const fsTickets: SupportTicket[] = [];
      snapshot.forEach(docSnap => {
        fsTickets.push({ id: docSnap.id, ...docSnap.data() } as SupportTicket);
      });
      const combined = mergeTicketsWithLocal(fsTickets);
      evaluateUnread(combined);
    }, (err) => {
      console.warn("[useSupportUnread] Firestore listener warning:", err);
    });

    const handleCustomUpdate = () => {
      const updated = mergeTicketsWithLocal([]);
      evaluateUnread(updated);
    };

    window.addEventListener('support_ticket_updated', handleCustomUpdate);
    window.addEventListener('aver_support_read', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    return () => {
      unsubscribeFs();
      window.removeEventListener('support_ticket_updated', handleCustomUpdate);
      window.removeEventListener('aver_support_read', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, [userId, userEmail, evaluateUnread]);

  return {
    hasUnreadAdminMessage,
    unreadAdminCount,
    markAsRead
  };
}
