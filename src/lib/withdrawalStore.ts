import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const WITHDRAWALS_STORAGE_KEY = 'aver_admin_withdrawals_local';
export const WITHDRAWAL_ACTIONS_REGISTRY_KEY = 'aver_withdrawal_actions_registry';

export interface WithdrawalActionRecord {
  status: 'Completed' | 'Failed' | 'Reversed';
  rawStatus: 'completed' | 'failed' | 'reversed';
  reversalReason?: string;
  updatedAt: string;
}

export function isActionedStatus(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s === 'completed' || s === 'successful' || s === 'success' || s === 'approved' ||
    s === 'failed' || s === 'rejected' || s === 'declined' || s === 'cancelled' ||
    s === 'reversed'
  );
}

export function getStatusPriority(status?: string): number {
  const s = (status || '').toLowerCase();
  if (isActionedStatus(s)) return 2;
  if (s === 'processing' || s === 'verifying') return 1;
  return 0; // 'pending' or unknown
}

export function resolveStatus(currentStatus?: string, incomingStatus?: string): string {
  const curIsActioned = isActionedStatus(currentStatus);
  const incIsActioned = isActionedStatus(incomingStatus);

  // If incoming status is an action taken by admin (completed, failed, reversed), it ALWAYS wins!
  if (incIsActioned) {
    return (incomingStatus || '').toLowerCase();
  }

  // If current status was already actioned and incoming is NOT actioned (pending/processing),
  // NEVER revert to pending! Retain the actioned status forever!
  if (curIsActioned && !incIsActioned) {
    return (currentStatus || 'pending').toLowerCase();
  }

  return (incomingStatus || currentStatus || 'pending').toLowerCase();
}

export function getWithdrawalActionsRegistry(): Record<string, WithdrawalActionRecord> {
  try {
    const raw = localStorage.getItem(WITHDRAWAL_ACTIONS_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function recordWithdrawalAction(
  identifiers: (string | undefined)[],
  action: {
    status: 'completed' | 'failed' | 'reversed' | 'Successful' | 'Failed' | 'Reversed' | string;
    reversalReason?: string;
  }
) {
  try {
    const registry = getWithdrawalActionsRegistry();
    const raw = (action.status || '').toLowerCase();
    const canonicalStatus: 'Completed' | 'Failed' | 'Reversed' =
      (raw === 'completed' || raw === 'approved' || raw === 'successful' || raw === 'success') ? 'Completed' :
      (raw === 'failed' || raw === 'rejected' || raw === 'declined' || raw === 'cancelled') ? 'Failed' :
      'Reversed';
    
    const canonicalRaw: 'completed' | 'failed' | 'reversed' =
      canonicalStatus === 'Completed' ? 'completed' :
      canonicalStatus === 'Failed' ? 'failed' : 'reversed';

    const record: WithdrawalActionRecord = {
      status: canonicalStatus,
      rawStatus: canonicalRaw,
      reversalReason: action.reversalReason,
      updatedAt: new Date().toISOString()
    };

    identifiers.filter(Boolean).forEach(id => {
      if (id) {
        registry[id] = record;
        // Also persist to global Firestore withdrawal_actions_registry collection so any session / device gets healed automatically!
        setDoc(doc(db, 'withdrawal_actions_registry', id), {
          ...record,
          id
        }, { merge: true }).catch((err) => {
          console.warn("[withdrawalStore] setDoc withdrawal_actions_registry failed:", err);
        });
      }
    });

    localStorage.setItem(WITHDRAWAL_ACTIONS_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn("Failed to record withdrawal action in registry:", e);
  }
}

export function getActionForWithdrawal(
  ...ids: (string | undefined)[]
): WithdrawalActionRecord | undefined {
  const registry = getWithdrawalActionsRegistry();
  for (const id of ids) {
    if (id && registry[id]) {
      return registry[id];
    }
  }
  return undefined;
}

export function getLocalWithdrawals(): any[] {
  const map = new Map<string, any>();
  try {
    const raw = localStorage.getItem(WITHDRAWALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(w => { 
          if (w && w.id) {
            map.set(w.id, {
              ...w,
              status: (w.status || 'pending').toLowerCase()
            }); 
          }
        });
      }
    }
  } catch (e) {
    console.warn("Failed to parse local withdrawals:", e);
  }

  // Scan all localStorage keys for any user withdrawal items or transactions
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('aver_txs_') ||
        key.startsWith('aver_user_transactions_') || 
        key.startsWith('aver_transactions') || 
        key.startsWith('user_profile_')
      ) {
        try {
          const itemRaw = localStorage.getItem(key);
          if (!itemRaw) continue;
          const parsed = JSON.parse(itemRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach(t => {
              if (t && (t.type === 'withdrawal' || t.category === 'withdrawal' || t.refId?.startsWith('WTH-') || t.id?.startsWith('wth-'))) {
                const id = t.id || t.refId || t.txHash;
                if (id) {
                  const existing = map.get(id);
                  if (existing) {
                    existing.status = resolveStatus(existing.status, t.status);
                    if (t.reversalReason) existing.reversalReason = t.reversalReason;
                  } else {
                    map.set(id, {
                      ...t,
                      status: (t.status || 'pending').toLowerCase()
                    });
                  }
                }
              }
            });
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.withdrawals)) {
              parsed.withdrawals.forEach((w: any) => {
                const id = w.id || w.refId || w.txHash;
                if (id) {
                  const existing = map.get(id);
                  if (existing) {
                    existing.status = resolveStatus(existing.status, w.status);
                    if (w.reversalReason) existing.reversalReason = w.reversalReason;
                  } else {
                    map.set(id, {
                      ...w,
                      email: parsed.email || w.email || 'User',
                      userName: parsed.displayName || parsed.username || w.userName || 'User',
                      userId: parsed.uid || w.userId,
                      status: (w.status || 'pending').toLowerCase()
                    });
                  }
                }
              });
            }
          }
        } catch (err) {}
      }
    }
  } catch (err) {}

  // Forcibly apply persistent action registry to guarantee actioned statuses persist
  const list = Array.from(map.values()).map(w => {
    const action = getActionForWithdrawal(w.id, w.refId, w.txHash);
    if (action) {
      return {
        ...w,
        status: action.rawStatus,
        reversalReason: action.reversalReason || w.reversalReason
      };
    }
    return w;
  });

  return list;
}

export function saveLocalWithdrawal(withdrawal: any) {
  try {
    const rawStatus = (withdrawal.status || 'pending').toLowerCase();
    const cleanWithdrawal = {
      ...withdrawal,
      status: rawStatus,
      createdAt: typeof withdrawal.createdAt === 'string' ? withdrawal.createdAt : new Date().toISOString(),
      updatedAt: typeof withdrawal.updatedAt === 'string' ? withdrawal.updatedAt : new Date().toISOString()
    };

    // Determine normalized transaction status for history display
    const txStatus: 'Successful' | 'Failed' | 'Reversed' | 'Pending' = 
      (rawStatus === 'completed' || rawStatus === 'approved' || rawStatus === 'successful' || rawStatus === 'success') ? 'Successful' :
      (rawStatus === 'failed' || rawStatus === 'rejected' || rawStatus === 'declined' || rawStatus === 'cancelled') ? 'Failed' :
      (rawStatus === 'reversed') ? 'Reversed' : 'Pending';

    // If an action was taken, register in WITHDRAWAL_ACTIONS_REGISTRY immediately
    if (isActionedStatus(rawStatus)) {
      recordWithdrawalAction(
        [cleanWithdrawal.id, cleanWithdrawal.refId, cleanWithdrawal.txHash],
        { status: txStatus, reversalReason: cleanWithdrawal.reversalReason }
      );
    }

    const current = getLocalWithdrawals();
    const map = new Map<string, any>();
    current.forEach(w => {
      if (w && w.id) map.set(w.id, w);
    });

    // Check for existing by id, refId, or txHash
    let matchedExistingId: string | null = null;
    for (const [key, existing] of map.entries()) {
      if (
        key === cleanWithdrawal.id ||
        (cleanWithdrawal.refId && (key === cleanWithdrawal.refId || existing.refId === cleanWithdrawal.refId)) ||
        (cleanWithdrawal.txHash && (key === cleanWithdrawal.txHash || existing.txHash === cleanWithdrawal.txHash))
      ) {
        matchedExistingId = key;
        break;
      }
    }

    if (matchedExistingId) {
      const existing = map.get(matchedExistingId);
      map.set(matchedExistingId, {
        ...existing,
        ...cleanWithdrawal,
        id: matchedExistingId,
        status: resolveStatus(existing?.status, rawStatus),
        reversalReason: cleanWithdrawal.reversalReason || existing?.reversalReason
      });
    } else {
      map.set(cleanWithdrawal.id, cleanWithdrawal);
    }

    localStorage.setItem(WITHDRAWALS_STORAGE_KEY, JSON.stringify(Array.from(map.values())));

    // Synchronize status across all aver_txs_* and user profile keys in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // 1. Transaction collections
        if (key.startsWith('aver_txs_') || key.startsWith('aver_transactions') || key.startsWith('aver_user_transactions_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              let updated = false;
              const newList = parsed.map((item: any) => {
                if (
                  item &&
                  (item.id === cleanWithdrawal.id ||
                   item.refId === cleanWithdrawal.id ||
                   item.txHash === cleanWithdrawal.id ||
                   (cleanWithdrawal.refId && (item.refId === cleanWithdrawal.refId || item.id === cleanWithdrawal.refId)) ||
                   (cleanWithdrawal.txHash && (item.txHash === cleanWithdrawal.txHash || item.id === cleanWithdrawal.txHash)))
                ) {
                  updated = true;
                  const targetStatus = isActionedStatus(rawStatus) ? txStatus : (isActionedStatus(item.status) ? item.status : txStatus);
                  return {
                    ...item,
                    status: targetStatus,
                    ...(cleanWithdrawal.reversalReason ? { reversalReason: cleanWithdrawal.reversalReason } : {}),
                    updatedAt: new Date().toISOString()
                  };
                }
                return item;
              });
              if (updated) {
                localStorage.setItem(key, JSON.stringify(newList));
              }
            }
          }
        }

        // 2. User profile records (aver_active_user & user_profile_*)
        if (key === 'aver_active_user' || key.startsWith('user_profile_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const u = JSON.parse(raw);
              if (u && Array.isArray(u.withdrawals)) {
                let userUpdated = false;
                const newWithdrawals = u.withdrawals.map((w: any) => {
                  const isMatch = w && (
                    w.id === cleanWithdrawal.id ||
                    w.refId === cleanWithdrawal.id ||
                    w.txHash === cleanWithdrawal.id ||
                    (cleanWithdrawal.refId && (w.refId === cleanWithdrawal.refId || w.id === cleanWithdrawal.refId)) ||
                    (cleanWithdrawal.txHash && (w.txHash === cleanWithdrawal.txHash || w.id === cleanWithdrawal.txHash))
                  );
                  if (isMatch) {
                    userUpdated = true;
                    const targetStatus = isActionedStatus(rawStatus) ? txStatus : (isActionedStatus(w.status) ? w.status : txStatus);
                    return {
                      ...w,
                      status: targetStatus,
                      ...(cleanWithdrawal.reversalReason ? { reversalReason: cleanWithdrawal.reversalReason } : {}),
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return w;
                });

                if (userUpdated) {
                  const updatedU = {
                    ...u,
                    withdrawals: newWithdrawals,
                    lastUpdated: new Date().toISOString()
                  };
                  localStorage.setItem(key, JSON.stringify(updatedU));
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn("Failed syncing local transaction & profile keys:", e);
    }

    window.dispatchEvent(new CustomEvent('withdrawal_updated', { detail: cleanWithdrawal.id }));
    window.dispatchEvent(new CustomEvent('aver_transaction_created', { detail: cleanWithdrawal.id }));
    window.dispatchEvent(new Event('aver_user_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn("Local storage update notice:", e);
  }
}

function getMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'string') return new Date(val).getTime();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export function mergeWithdrawalsWithLocal(firestoreWithdrawals: any[]): any[] {
  const localWithdrawals = getLocalWithdrawals();
  const map = new Map<string, any>();
  
  localWithdrawals.forEach(w => {
    if (w && w.id) {
      map.set(w.id, {
        ...w,
        status: (w.status || 'pending').toLowerCase()
      });
    }
  });

  firestoreWithdrawals.forEach(w => {
    if (!w || !w.id) return;
    const normalized = {
      ...w,
      status: (w.status || 'pending').toLowerCase()
    };

    // Find existing match by id, refId, or txHash
    let matchedId: string | null = null;
    if (map.has(w.id)) {
      matchedId = w.id;
    } else {
      for (const [key, existing] of map.entries()) {
        if (
          (w.refId && (key === w.refId || existing.refId === w.refId)) ||
          (w.txHash && (key === w.txHash || existing.txHash === w.txHash))
        ) {
          matchedId = key;
          break;
        }
      }
    }

    if (matchedId) {
      const existing = map.get(matchedId);
      const resolved = resolveStatus(existing?.status, normalized.status);
      map.set(matchedId, {
        ...existing,
        ...normalized,
        id: matchedId,
        status: resolved,
        reversalReason: normalized.reversalReason || existing.reversalReason
      });
    } else {
      map.set(w.id, {
        ...normalized,
        createdAt: typeof w.createdAt === 'string' ? w.createdAt : (w.timestamp || new Date().toISOString()),
        updatedAt: typeof w.updatedAt === 'string' ? w.updatedAt : (w.timestamp || new Date().toISOString())
      });
    }
  });

  // Apply action registry to ensure absolute consistency
  const list = Array.from(map.values()).map(item => {
    const action = getActionForWithdrawal(item.id, item.refId, item.txHash);
    if (action) {
      return {
        ...item,
        status: action.rawStatus,
        reversalReason: action.reversalReason || item.reversalReason
      };
    }
    return item;
  });
  
  return list.sort((a, b) => {
    const timeA = getMs(a.timestamp) || getMs(a.createdAt) || getMs(a.updatedAt);
    const timeB = getMs(b.timestamp) || getMs(b.createdAt) || getMs(b.updatedAt);
    return timeB - timeA;
  });
}
