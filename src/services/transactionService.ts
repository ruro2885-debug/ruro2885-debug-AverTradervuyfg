import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TransactionRecord, TransactionType } from '../types';
import { getLocalDeposits } from '../lib/depositStore';
import { getLocalWithdrawals, getStatusPriority, isActionedStatus, getActionForWithdrawal, recordWithdrawalAction } from '../lib/withdrawalStore';

export const isTradeEngineTransaction = (tx: any): boolean => {
  if (!tx) return false;
  const net = (tx.network || '').toLowerCase();
  const typ = (tx.type || '').toLowerCase();
  const tit = (tx.title || '').toLowerCase();
  const id = (tx.id || '').toLowerCase();
  return (
    net.includes('trading engine') ||
    net.includes('trade engine') ||
    id.startsWith('trd-') ||
    typ === 'order_creation' ||
    (typ === 'trade' && (net.includes('engine') || tit.includes('trade') || tit.includes('crypto'))) ||
    tit.includes('trading engine') ||
    tit.includes('trade engine')
  );
};

export const getExplorerUrl = (txHash?: string, network?: string): string | undefined => {
  if (!txHash) return undefined;
  const net = (network || '').toLowerCase();
  if (net.includes('trc') || net.includes('tron')) {
    return `https://tronscan.org/#/transaction/${txHash}`;
  }
  if (net.includes('sol')) {
    return `https://solscan.io/tx/${txHash}`;
  }
  if (net.includes('bep') || net.includes('bsc') || net.includes('binance')) {
    return `https://bscscan.com/tx/${txHash}`;
  }
  if (net.includes('btc') || net.includes('bitcoin')) {
    return `https://mempool.space/tx/${txHash}`;
  }
  if (net.includes('erc') || net.includes('eth') || net.includes('ethereum')) {
    return `https://etherscan.io/tx/${txHash}`;
  }
  return `https://etherscan.io/tx/${txHash}`;
};

export const transactionService = {
  /**
   * Record a new financial operation into Firestore & localStorage
   */
  async recordTransaction(params: Omit<TransactionRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Promise<TransactionRecord> {
    if (isTradeEngineTransaction(params)) {
      return null as any;
    }

    const userId = params.userId || 'guest';
    const id = params.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = params.timestamp || new Date().toISOString();

    let category = params.category;
    if (!category) {
      if (params.type === 'order_creation' && params.status === 'Pending') {
        category = 'orders';
      } else if (['order_completion', 'order_cancellation', 'ai_trade_close', 'trade'].includes(params.type)) {
        category = 'order-history';
      } else {
        category = 'transactions';
      }
    }

    const explorerUrl = params.explorerUrl || getExplorerUrl(params.txHash, params.network);

    const record: TransactionRecord = {
      ...params,
      id,
      timestamp,
      category,
      explorerUrl: explorerUrl || undefined
    };

    // 1. Save locally in localStorage for instant offline / local sync
    try {
      const storageKey = `aver_txs_${userId}`;
      const existingStr = localStorage.getItem(storageKey);
      let list: TransactionRecord[] = [];
      if (existingStr) {
        try {
          list = JSON.parse(existingStr);
        } catch (e) {}
      }
      list = [record, ...list.filter(t => t.id !== id)];
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (err) {
      console.warn("Failed saving transaction to localStorage:", err);
    }

    // 2. Write to Firestore 'transactions' collection
    try {
      const firestoreDoc = {
        ...record,
        serverCreatedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'transactions', id), firestoreDoc);
    } catch (err) {
      console.warn("Failed saving transaction to Firestore:", err);
    }

    // 3. Dispatch real-time local custom event
    window.dispatchEvent(new CustomEvent('aver_transaction_created', { detail: record }));

    return record;
  },

  /**
   * Helper method for deposits
   */
  async recordDeposit(userId: string, amount: number, asset: string = 'USDT', network: string = 'TRC20', txHash?: string, customId?: string, cryptoAmount?: number) {
    return this.recordTransaction({
      id: customId,
      userId,
      type: 'deposit',
      category: 'transactions',
      title: `${asset} Deposit`,
      amount,
      cryptoAmount,
      asset,
      network,
      status: 'Pending',
      txHash
    });
  },

  /**
   * Helper method for withdrawals
   */
  async recordWithdrawal(userId: string, amount: number, asset: string = 'USDT', network: string = 'TRC20', txHash?: string, customId?: string, status: any = 'Processing') {
    return this.recordTransaction({
      id: customId,
      userId,
      type: 'withdrawal',
      category: 'transactions',
      title: `${asset} Withdrawal`,
      amount,
      asset,
      network,
      status,
      txHash
    });
  },

  /**
   * Helper method for transfers
   */
  async recordTransfer(userId: string, amount: number, asset: string = 'USDT', network: string = 'Internal', title?: string) {
    return this.recordTransaction({
      userId,
      type: 'internal_transfer',
      category: 'transactions',
      title: title || `${asset} Internal Transfer`,
      amount,
      asset,
      network,
      status: 'Completed'
    });
  },

  /**
   * Helper method for orders & trades (do not record as ledger transaction receipts)
   */
  async recordOrder(
    _userId: string, 
    _ticker: string, 
    _side: 'buy' | 'sell', 
    _price: number, 
    _quantity: number, 
    _status: 'Pending' | 'Completed' | 'Cancelled' = 'Pending'
  ) {
    return null as any;
  },

  /**
   * Fetch all transactions for a user from Firestore + localStorage + admin_deposits + profile fields
   */
  async getUserTransactions(userId: string, userProfile?: any): Promise<TransactionRecord[]> {
    const map = new Map<string, TransactionRecord>();

    const normalizeStatus = (s?: string): TransactionRecord['status'] => {
      const lower = (s || '').toLowerCase();
      if (lower === 'completed' || lower === 'approved' || lower === 'success' || lower === 'successful') return 'Completed';
      if (lower === 'reversed') return 'Reversed';
      if (lower === 'rejected' || lower === 'declined' || lower === 'failed' || lower === 'expired' || lower === 'cancelled') return 'Failed';
      if (lower === 'processing') return 'Processing';
      return 'Pending';
    };

    const findExistingInMap = (id?: string, refId?: string, txHash?: string): TransactionRecord | undefined => {
      if (id && map.has(id)) return map.get(id);
      if (refId && map.has(refId)) return map.get(refId);
      if (txHash && map.has(txHash)) return map.get(txHash);
      for (const existing of map.values()) {
        if (
          (id && (existing.id === id || existing.refId === id || existing.txHash === id)) ||
          (refId && (existing.refId === refId || existing.id === refId || existing.txHash === refId)) ||
          (txHash && (existing.txHash === txHash || existing.id === txHash || existing.refId === txHash))
        ) {
          return existing;
        }
      }
      return undefined;
    };

    const applyStatusIfHigher = (existing: TransactionRecord, newStatus: TransactionRecord['status']) => {
      const curIsActioned = isActionedStatus(existing.status);
      const incIsActioned = isActionedStatus(newStatus);

      // If incoming status is actioned, it ALWAYS supersedes/overwrites!
      if (incIsActioned) {
        existing.status = newStatus;
        return;
      }

      // If current status is actioned and incoming is not, never downgrade to pending/processing!
      if (curIsActioned && !incIsActioned) {
        return;
      }

      existing.status = newStatus;
    };

    // 1. Read from localStorage and purge any existing trade engine records
    try {
      const storageKey = `aver_txs_${userId}`;
      const localStr = localStorage.getItem(storageKey);
      if (localStr) {
        const localList: TransactionRecord[] = JSON.parse(localStr);
        let hasEngineTx = false;
        localList.forEach(item => {
          if (isTradeEngineTransaction(item)) {
            hasEngineTx = true;
            return;
          }
          if (item.id) {
            const normalized = normalizeStatus(item.status);
            const existing = findExistingInMap(item.id, item.refId, item.txHash);
            if (existing) {
              applyStatusIfHigher(existing, normalized);
            } else {
              map.set(item.id, { ...item, status: normalized });
            }
          }
        });
        if (hasEngineTx) {
          const cleaned = localList.filter(item => !isTradeEngineTransaction(item));
          localStorage.setItem(storageKey, JSON.stringify(cleaned));
        }
      }
    } catch (err) {}

    // 2. Read from local admin_deposits store (aver_admin_deposits_local)
    try {
      const localAdminDeposits = getLocalDeposits();
      localAdminDeposits.forEach(d => {
        const matchesUser = d.userId === userId || (!d.userId && userId === 'anonymous') || (userProfile?.email && d.email && d.email.toLowerCase() === userProfile.email.toLowerCase());
        if (matchesUser) {
          const id = d.id;
          const status = normalizeStatus(d.status);
          const existing = findExistingInMap(id, d.refId, d.txHash);
          if (existing) {
            applyStatusIfHigher(existing, status);
            if (d.amount) existing.amount = Number(d.amount);
            if (d.cryptoAmount) existing.cryptoAmount = Number(d.cryptoAmount);
            if (d.cryptoSymbol || d.asset) existing.asset = d.cryptoSymbol || d.asset;
          } else {
            map.set(id, {
              id,
              userId,
              type: 'deposit',
              category: 'transactions',
              title: `${d.cryptoSymbol || d.asset || 'USD'} Deposit`,
              amount: Number(d.amount) || 0,
              cryptoAmount: d.cryptoAmount ? Number(d.cryptoAmount) : undefined,
              asset: d.cryptoSymbol || d.asset || 'USD',
              network: d.network || d.cryptoNetwork || 'Mainnet',
              status,
              timestamp: d.timestamp || d.createdAt || new Date().toISOString(),
              txHash: d.txHash || undefined
            });
          }
        }
      });
    } catch (e) {}

    // 2b. Read from local admin_withdrawals store (aver_admin_withdrawals_local)
    try {
      const localAdminWithdrawals = getLocalWithdrawals();
      localAdminWithdrawals.forEach(w => {
        const matchesUser = w.userId === userId || 
                            (!w.userId && userId === 'anonymous') || 
                            (userProfile?.email && w.email && w.email.toLowerCase() === userProfile.email.toLowerCase()) ||
                            findExistingInMap(w.id, w.refId, w.txHash) !== undefined;
        if (matchesUser) {
          const id = w.id;
          const status = normalizeStatus(w.status);
          const existing = findExistingInMap(id, w.refId, w.txHash);
          if (existing) {
            applyStatusIfHigher(existing, status);
            if (w.reversalReason || w.reason) existing.reversalReason = w.reversalReason || w.reason;
            if (w.amount) existing.amount = -Math.abs(Number(w.amount));
            if (w.cryptoAmount) existing.cryptoAmount = -Math.abs(Number(w.cryptoAmount));
            if (w.cryptoSymbol || w.asset) existing.asset = w.cryptoSymbol || w.asset;
            if (w.txHash) existing.txHash = w.txHash;
          } else {
            map.set(id, {
              id,
              userId,
              type: 'withdrawal',
              category: 'transactions',
              title: `${w.cryptoSymbol || w.asset || 'USDT'} Withdrawal`,
              amount: -Math.abs(Number(w.amount) || 0),
              cryptoAmount: w.cryptoAmount ? -Math.abs(Number(w.cryptoAmount)) : undefined,
              asset: w.cryptoSymbol || w.asset || 'USDT',
              network: w.network || w.cryptoNetwork || 'TRC20',
              destination: w.destination || w.address || 'N/A',
              status,
              reversalReason: w.reversalReason || w.reason || undefined,
              timestamp: w.timestamp || w.createdAt || w.date || new Date().toISOString(),
              txHash: w.txHash || undefined,
              refId: w.refId || w.id
            });
          }
        }
      });
    } catch (e) {}

    // 3. Map user legacy arrays (deposits, withdrawals, trades, history)
    if (userProfile) {
      if (Array.isArray(userProfile.deposits)) {
        userProfile.deposits.forEach((d: any, idx: number) => {
          const id = d.id || `dep-${d.timestamp || d.date || idx}`;
          const asset = d.asset || d.symbol || 'USDT';
          const network = d.network || d.cryptoNetwork || 'TRC20';
          const status = normalizeStatus(d.status || 'Completed');
          const existing = findExistingInMap(id, d.refId, d.txHash);
          if (!existing) {
            map.set(id, {
              id,
              userId,
              type: 'deposit',
              category: 'transactions',
              title: `${asset} Deposit`,
              amount: Number(d.amount) || 0,
              cryptoAmount: d.cryptoAmount ? Number(d.cryptoAmount) : undefined,
              asset,
              network,
              status,
              timestamp: d.timestamp || d.date || new Date().toISOString(),
              txHash: d.txHash || d.hash || undefined
            });
          } else {
            applyStatusIfHigher(existing, status);
          }
        });
      }

      if (Array.isArray(userProfile.withdrawals)) {
        userProfile.withdrawals.forEach((w: any, idx: number) => {
          const id = w.id || `wd-${w.timestamp || w.date || idx}`;
          const asset = w.asset || w.symbol || 'USDT';
          const network = w.network || w.cryptoNetwork || 'TRC20';
          const status = normalizeStatus(w.status || 'Processing');
          const existing = findExistingInMap(id, w.refId, w.txHash);
          if (existing) {
            applyStatusIfHigher(existing, status);
            if (w.reversalReason || w.reason) existing.reversalReason = w.reversalReason || w.reason;
            if (w.txHash) existing.txHash = w.txHash || w.hash;
          } else {
            map.set(id, {
              id,
              userId,
              type: 'withdrawal',
              category: 'transactions',
              title: `${asset} Withdrawal`,
              amount: -Math.abs(Number(w.amount) || 0),
              asset,
              network,
              destination: w.destination || w.address || 'N/A',
              status,
              reversalReason: w.reversalReason || w.reason || undefined,
              timestamp: w.timestamp || w.date || new Date().toISOString(),
              txHash: w.txHash || w.hash || undefined,
              refId: w.refId || w.id
            });
          }
        });
      }

      if (Array.isArray(userProfile.history)) {
        userProfile.history.forEach((h: any, idx: number) => {
          const id = h.id || `hist-${h.timestamp || h.date || idx}`;
          if (!map.has(id)) {
            map.set(id, {
              id,
              userId,
              type: h.type || 'internal_transfer',
              category: 'transactions',
              title: h.title || h.description || 'Account Movement',
              amount: Number(h.amount) || 0,
              asset: h.asset || 'USDT',
              network: h.network || 'Internal',
              status: normalizeStatus(h.status || 'Completed'),
              timestamp: h.timestamp || h.date || new Date().toISOString(),
              txHash: h.txHash || undefined
            });
          }
        });
      }
    }

    // 4. Query Firestore 'transactions'
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data() as TransactionRecord;
        if (isTradeEngineTransaction(data)) {
          deleteDoc(doc(db, 'transactions', d.id)).catch(() => {});
          return;
        }
        const normalized = normalizeStatus(data.status);
        const existing = findExistingInMap(d.id, data.refId, data.txHash);
        if (existing) {
          applyStatusIfHigher(existing, normalized);
          if (data.txHash) existing.txHash = data.txHash;
        } else {
          map.set(d.id, { ...data, id: d.id, status: normalized });
        }
      });
    } catch (err) {
      console.warn("Firestore transactions query notice:", err);
    }

    // 5. Query Firestore 'admin_deposits' to ensure instant synchronization with Admin approvals/declines
    try {
      const qAdmin = query(collection(db, 'admin_deposits'), where('userId', '==', userId));
      const snapAdmin = await getDocs(qAdmin);
      snapAdmin.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;
        const status = normalizeStatus(d.status);
        const existing = findExistingInMap(id, d.refId, d.txHash);
        if (existing) {
          applyStatusIfHigher(existing, status);
          if (d.amount) existing.amount = Number(d.amount);
          if (d.cryptoAmount) existing.cryptoAmount = Number(d.cryptoAmount);
          if (d.cryptoSymbol || d.asset) existing.asset = d.cryptoSymbol || d.asset;
        } else {
          map.set(id, {
            id,
            userId,
            type: 'deposit',
            category: 'transactions',
            title: `${d.cryptoSymbol || d.asset || 'USD'} Deposit`,
            amount: Number(d.amount) || 0,
            cryptoAmount: d.cryptoAmount ? Number(d.cryptoAmount) : undefined,
            asset: d.cryptoSymbol || d.asset || 'USD',
            network: d.network || d.cryptoNetwork || 'Mainnet',
            status,
            timestamp: d.timestamp || d.createdAt || new Date().toISOString(),
            txHash: d.txHash || undefined
          });
        }
      });
    } catch (err) {
      console.warn("Firestore admin_deposits sync notice:", err);
    }

    // 6. Query Firestore 'admin_withdrawals' & 'withdrawals' for instant sync with Admin approvals/rejections
    try {
      const qAdminWth = query(collection(db, 'admin_withdrawals'), where('userId', '==', userId));
      const snapAdminWth = await getDocs(qAdminWth);
      snapAdminWth.forEach(docSnap => {
        const w = docSnap.data();
        const id = docSnap.id;
        const status = normalizeStatus(w.status);
        const existing = findExistingInMap(id, w.refId, w.txHash);
        if (existing) {
          applyStatusIfHigher(existing, status);
          if (w.reversalReason || w.reason) existing.reversalReason = w.reversalReason || w.reason;
          if (w.txHash) existing.txHash = w.txHash;
        } else {
          map.set(id, {
            id,
            userId,
            type: 'withdrawal',
            category: 'transactions',
            title: `${w.cryptoSymbol || w.asset || 'USDT'} Withdrawal`,
            amount: -Math.abs(Number(w.amount) || 0),
            cryptoAmount: w.cryptoAmount ? -Math.abs(Number(w.cryptoAmount)) : undefined,
            asset: w.cryptoSymbol || w.asset || 'USDT',
            network: w.network || w.cryptoNetwork || 'TRC20',
            destination: w.destination || w.address || 'N/A',
            status,
            reversalReason: w.reversalReason || w.reason || undefined,
            timestamp: w.timestamp || w.createdAt || w.date || new Date().toISOString(),
            txHash: w.txHash || undefined,
            refId: w.refId || w.id
          });
        }
      });

      if (userProfile?.email) {
        const qEmailWth = query(collection(db, 'admin_withdrawals'), where('email', '==', userProfile.email));
        const snapEmailWth = await getDocs(qEmailWth);
        snapEmailWth.forEach(docSnap => {
          const w = docSnap.data();
          const id = docSnap.id;
          const status = normalizeStatus(w.status);
          const existing = findExistingInMap(id, w.refId, w.txHash);
          if (existing) {
            applyStatusIfHigher(existing, status);
            if (w.reversalReason || w.reason) existing.reversalReason = w.reversalReason || w.reason;
            if (w.txHash) existing.txHash = w.txHash;
          }
        });
      }
    } catch (err) {
      console.warn("Firestore admin_withdrawals sync notice:", err);
    }

    try {
      const qWth = query(collection(db, 'withdrawals'), where('userId', '==', userId));
      const snapWth = await getDocs(qWth);
      snapWth.forEach(docSnap => {
        const w = docSnap.data();
        const id = docSnap.id;
        const status = normalizeStatus(w.status);
        const existing = findExistingInMap(id, w.refId, w.txHash);
        if (existing) {
          applyStatusIfHigher(existing, status);
          if (w.reversalReason || w.reason) existing.reversalReason = w.reversalReason || w.reason;
          if (w.txHash) existing.txHash = w.txHash;
        } else {
          map.set(id, {
            id,
            userId,
            type: 'withdrawal',
            category: 'transactions',
            title: `${w.cryptoSymbol || w.asset || 'USDT'} Withdrawal`,
            amount: -Math.abs(Number(w.amount) || 0),
            cryptoAmount: w.cryptoAmount ? -Math.abs(Number(w.cryptoAmount)) : undefined,
            asset: w.cryptoSymbol || w.asset || 'USDT',
            network: w.network || w.cryptoNetwork || 'TRC20',
            destination: w.destination || w.address || 'N/A',
            status,
            reversalReason: w.reversalReason || w.reason || undefined,
            timestamp: w.timestamp || w.createdAt || w.date || new Date().toISOString(),
            txHash: w.txHash || undefined,
            refId: w.refId || w.id
          });
        }
      });
    } catch (err) {
      console.warn("Firestore withdrawals sync notice:", err);
    }

    // 7. Direct doc ID verification for any known withdrawal in the map
    const mappedWithdrawals = Array.from(map.values()).filter(t => t.type === 'withdrawal' || t.id.startsWith('wth-'));
    for (const item of mappedWithdrawals) {
      const checkIds = Array.from(new Set([item.id, item.refId, item.txHash].filter(Boolean))) as string[];
      for (const cid of checkIds) {
        try {
          const wSnap = await getDoc(doc(db, 'admin_withdrawals', cid));
          if (wSnap.exists()) {
            const data = wSnap.data();
            const s = normalizeStatus(data.status);
            applyStatusIfHigher(item, s);
            if (data.reversalReason || data.reason) item.reversalReason = data.reversalReason || data.reason;
            if (data.txHash) item.txHash = data.txHash;
          }
        } catch (e) {}

        try {
          const txSnap = await getDoc(doc(db, 'transactions', cid));
          if (txSnap.exists()) {
            const data = txSnap.data();
            const s = normalizeStatus(data.status);
            applyStatusIfHigher(item, s);
            if (data.reversalReason || data.reason) item.reversalReason = data.reversalReason || data.reason;
            if (data.txHash) item.txHash = data.txHash;
          }
        } catch (e) {}
      }
    }

    // Sync actions registry from Firestore first to heal local memory and ensure absolute persistence
    try {
      const qReg = query(collection(db, 'withdrawal_actions_registry'));
      const snapReg = await getDocs(qReg);
      snapReg.forEach(docSnap => {
        const act = docSnap.data();
        if (act && act.status) {
          recordWithdrawalAction([docSnap.id], act as any);
        }
      });
    } catch (e) {
      console.warn("Notice syncing withdrawal_actions_registry:", e);
    }

    // Apply action registry to ensure absolute status persistence before deduplication
    const list = Array.from(map.values()).map(tx => {
      if (tx.type === 'withdrawal' || (tx.id && tx.id.startsWith('wth-')) || (tx.refId && tx.refId.startsWith('WTH-'))) {
        const action = getActionForWithdrawal(tx.id, tx.refId, tx.txHash);
        if (action) {
          tx.status = action.status;
          if (action.reversalReason) tx.reversalReason = action.reversalReason;
        }
      }
      return tx;
    });

    // Sort list so actioned status records come first (ensures deduplication keeps actioned records)
    const sortedForDeduplication = [...list].sort((a, b) => {
      const aAct = isActionedStatus(a.status) ? 1 : 0;
      const bAct = isActionedStatus(b.status) ? 1 : 0;
      return bAct - aAct; // Actioned items first
    });

    // Deduplicate duplicate entries created during legacy deposit/history sync
    const deduplicated: TransactionRecord[] = [];
    const seenKeys = new Set<string>();

    sortedForDeduplication.forEach(tx => {
      // Priority 1: Unique ID
      if (seenKeys.has(`id-${tx.id}`)) return;
      seenKeys.add(`id-${tx.id}`);

      // Priority 2: Transaction Hash (Bulletproof unique)
      if (tx.txHash) {
        if (seenKeys.has(`hash-${tx.txHash}`)) return;
        seenKeys.add(`hash-${tx.txHash}`);
      }

      // Priority 3: Fuzzy matching for legacy records without IDs/Hashes
      if (tx.amount && tx.timestamp) {
        const timeBucket = Math.floor(new Date(tx.timestamp).getTime() / (5 * 60 * 1000)); 
        const fuzzyKey = `fuzzy-${tx.amount}-${tx.asset}-${tx.type}-${timeBucket}`;
        if (seenKeys.has(fuzzyKey)) return;
        seenKeys.add(fuzzyKey);
      }

      deduplicated.push(tx);
    });

    const filteredList = deduplicated.filter(tx => {
      if (isTradeEngineTransaction(tx)) return false;
      try {
        const deletedStr = localStorage.getItem(`aver_deleted_txs_${userId}`);
        if (deletedStr) {
          const deletedSet: string[] = JSON.parse(deletedStr);
          if (deletedSet.includes(tx.id)) return false;
        }
      } catch (e) {}
      return true;
    });

    return filteredList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  /**
   * Delete a transaction record
   */
  async deleteTransaction(txId: string, userId: string) {
    try {
      const storageKey = `aver_txs_${userId}`;
      const existingStr = localStorage.getItem(storageKey);
      if (existingStr) {
        let list: TransactionRecord[] = JSON.parse(existingStr);
        list = list.filter(t => t.id !== txId);
        localStorage.setItem(storageKey, JSON.stringify(list));
      }
    } catch (e) {}

    try {
      const deletedKey = `aver_deleted_txs_${userId}`;
      const deletedStr = localStorage.getItem(deletedKey);
      const deletedSet: string[] = deletedStr ? JSON.parse(deletedStr) : [];
      if (!deletedSet.includes(txId)) {
        deletedSet.push(txId);
        localStorage.setItem(deletedKey, JSON.stringify(deletedSet));
      }
    } catch (e) {}

    try {
      await deleteDoc(doc(db, 'transactions', txId));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('aver_transaction_created'));
  },

  /**
   * Real-time listener for user transactions
   */
  subscribeUserTransactions(userId: string, callback: (txs: TransactionRecord[]) => void, userProfile?: any) {
    const fetchAndCallback = async () => {
      const txs = await this.getUserTransactions(userId, userProfile);
      callback(txs);
    };

    // Initial fetch
    fetchAndCallback();

    // Event listener for local updates & deposit/withdrawal state updates
    const handleLocalUpdate = () => {
      fetchAndCallback();
    };
    window.addEventListener('aver_transaction_created', handleLocalUpdate);
    window.addEventListener('deposit_updated', handleLocalUpdate);
    window.addEventListener('withdrawal_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    // Firestore listener on transactions
    let unsubTransactions = () => {};
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      unsubTransactions = onSnapshot(q, () => {
        fetchAndCallback();
      }, (err) => {
        console.warn("Realtime transactions listener notice:", err);
      });
    } catch (err) {}

    // Firestore listener on admin_deposits
    let unsubDeposits = () => {};
    try {
      const qDep = query(collection(db, 'admin_deposits'), where('userId', '==', userId));
      unsubDeposits = onSnapshot(qDep, () => {
        fetchAndCallback();
      }, (err) => {
        console.warn("Realtime admin_deposits listener notice:", err);
      });
    } catch (err) {}

    // Firestore listener on admin_withdrawals
    let unsubWithdrawals = () => {};
    try {
      const qWth = query(collection(db, 'admin_withdrawals'), where('userId', '==', userId));
      unsubWithdrawals = onSnapshot(qWth, () => {
        fetchAndCallback();
      }, (err) => {
        console.warn("Realtime admin_withdrawals listener notice:", err);
      });
    } catch (err) {}

    return () => {
      window.removeEventListener('aver_transaction_created', handleLocalUpdate);
      window.removeEventListener('deposit_updated', handleLocalUpdate);
      window.removeEventListener('withdrawal_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
      unsubTransactions();
      unsubDeposits();
      unsubWithdrawals();
    };
  }
};
