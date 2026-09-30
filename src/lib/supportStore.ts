import { db, safeSetDoc } from './firebase';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';

export interface SupportMessage {
  isAdmin?: boolean;
  senderRole?: 'user' | 'admin';
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'document' | 'file' | 'pdf';
  isVoice?: boolean;
  reactions?: Record<string, number>;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  title: string;
  category: string;
  description: string;
  status: 'pending' | 'answered' | 'open' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  transactionId?: string;
  tradingSessionId?: string;
  attachmentUrl?: string;
  adminNotes?: string;
}

const STORAGE_KEY = 'aver_support_tickets_v2';

/**
 * Deep sanitization to guarantee NO `undefined` values are ever passed to Firestore.
 * Prevents "Unsupported field value: undefined" errors that silently drop writes.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean as T;
}

/**
 * Uploads an image or document attachment to the backend high-performance API.
 * Returns a permanent lightweight URL (`/api/support/image/att_...`) that stores cleanly in Firestore.
 */
export async function uploadSupportAttachment(dataUrl: string, filename: string, mimeType = 'image/jpeg'): Promise<string> {
  try {
    const res = await fetch('/api/support/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, filename, mimeType }),
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn("[SupportStore] Backend upload fallback to compressed data URL:", err);
  }
  return dataUrl;
}

/**
 * Merges Firestore ticket data with local localStorage backup.
 * Deduplicates by ticket ID, preferring the newer or combined message history.
 */
export function mergeTicketsWithLocal(firestoreTickets: SupportTicket[]): SupportTicket[] {
  let localTickets: SupportTicket[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Clean out hardcoded fake ticket TCK-SUPPORT-01
        localTickets = parsed.filter(t => t && t.id !== 'TCK-SUPPORT-01');
      }
    }
  } catch (e) {
    console.warn("Failed to parse local support tickets:", e);
  }

  const map = new Map<string, SupportTicket>();

  const mergeTwoTickets = (t1: SupportTicket, t2: SupportTicket): SupportTicket => {
    const combinedMsgsMap = new Map<string, SupportMessage>();
    (t1.messages || []).forEach(m => {
      if (m && (m.id || m.text || m.attachmentUrl)) {
        const key = m.id || `${m.timestamp || ''}-${m.text || ''}-${m.attachmentUrl ? m.attachmentUrl.slice(-20) : ''}`;
        combinedMsgsMap.set(key, m);
      }
    });
    (t2.messages || []).forEach(m => {
      if (m && (m.id || m.text || m.attachmentUrl)) {
        const key = m.id || `${m.timestamp || ''}-${m.text || ''}-${m.attachmentUrl ? m.attachmentUrl.slice(-20) : ''}`;
        if (combinedMsgsMap.has(key)) {
          const prev = combinedMsgsMap.get(key)!;
          combinedMsgsMap.set(key, {
            ...prev,
            ...m,
            attachmentUrl: m.attachmentUrl || prev.attachmentUrl,
            attachmentName: m.attachmentName || prev.attachmentName,
            attachmentType: m.attachmentType || prev.attachmentType
          });
        } else {
          combinedMsgsMap.set(key, m);
        }
      }
    });

    const mergedMsgs = Array.from(combinedMsgsMap.values()).sort(
      (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );

    const t1Time = new Date(t1.updatedAt || t1.createdAt || 0).getTime();
    const t2Time = new Date(t2.updatedAt || t2.createdAt || 0).getTime();
    const newest = t2Time >= t1Time ? t2 : t1;
    const base = t2Time >= t1Time ? t1 : t2;

    return {
      ...base,
      ...newest,
      messages: mergedMsgs,
      userId: newest.userId || base.userId || 'guest',
      userEmail: newest.userEmail || base.userEmail || '',
      userName: newest.userName || base.userName || 'Trader',
      updatedAt: newest.updatedAt || base.updatedAt || new Date().toISOString()
    };
  };

  // 1. Seed with local tickets
  if (Array.isArray(localTickets)) {
    localTickets.forEach(t => {
      if (t && t.id) map.set(t.id, t);
    });
  }

  // 2. Overwrite / merge with Firestore tickets
  if (Array.isArray(firestoreTickets)) {
    firestoreTickets.forEach(t => {
      if (t && t.id) {
        const existing = map.get(t.id);
        if (existing) {
          map.set(t.id, mergeTwoTickets(existing, t));
        } else {
          map.set(t.id, t);
        }
      }
    });
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());

  // Save back to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    // Trim oldest if storage quota exceeds
    try {
      const trimmed = merged.slice(0, 30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (ignore) {}
  }

  return merged;
}

/**
 * Saves a ticket document to both Firestore AND local storage.
 * Broadcasts real-time events to all tabs and listeners instantly.
 */
export async function saveSupportTicket(ticket: SupportTicket): Promise<void> {
  const now = new Date().toISOString();
  const rawTicket: SupportTicket = {
    ...ticket,
    updatedAt: ticket.updatedAt || now,
    messages: ticket.messages || []
  };

  // Clean all fields so Firestore never rejects with undefined
  const ticketToSave = sanitizeForFirestore(rawTicket);

  // 1. Local Storage Instant Update
  try {
    const current = mergeTicketsWithLocal([]);
    const map = new Map<string, SupportTicket>();
    current.forEach(t => map.set(t.id, t));
    map.set(ticketToSave.id, ticketToSave);
    const updated = Array.from(map.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Local storage update notice:", e);
  }

  // 2. Dispatch real-time events for instant UI synchronization
  window.dispatchEvent(new CustomEvent('support_ticket_updated', { detail: ticketToSave.id }));
  window.dispatchEvent(new Event('storage'));

  // 3. Persist to Firestore DB with merge
  try {
    await safeSetDoc(doc(db, 'support_tickets', ticketToSave.id), ticketToSave, { merge: true });
  } catch (err) {
    console.error("Firestore setDoc support ticket error:", err);
  }
}
