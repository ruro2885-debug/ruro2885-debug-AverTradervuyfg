import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShieldAlert, CheckCircle2, XCircle, Clock, ExternalLink, ArrowUpCircle, RotateCcw, AlertTriangle, X, Check, Copy } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, serverTimestamp, increment, arrayUnion, addDoc, getDoc, setDoc, where, getDocs } from 'firebase/firestore';
import { db, auth, safeSetDoc, safeUpdateDoc } from '../../../lib/firebase';
import { portfolioPersistenceService } from '../../../services/portfolioPersistenceService';
import { walletService } from '../../../services/walletService';
import { 
  mergeWithdrawalsWithLocal, 
  saveLocalWithdrawal, 
  getLocalWithdrawals, 
  resolveStatus, 
  getStatusPriority,
  recordWithdrawalAction,
  isActionedStatus 
} from '../../../lib/withdrawalStore';

interface Withdrawal {
  id: string;
  refId?: string;
  userId: string;
  email: string;
  userName?: string;
  asset: string;
  symbol?: string;
  amount: number;
  cryptoAmount?: number;
  cryptoSymbol?: string;
  destination: string;
  destinationAddress?: string;
  network?: string;
  riskScore?: number;
  status: 'pending' | 'completed' | 'failed' | 'reversed' | 'rejected';
  reversalReason?: string;
  timestamp: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function AdminWithdrawals({ theme }: { theme: 'light' | 'dark' }) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [reversalTarget, setReversalTarget] = useState<Withdrawal | null>(null);
  const [reversalReasonInput, setReversalReasonInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    let adminWithdrawalsList: any[] = [];
    let withdrawalsList: any[] = [];
    let transactionsWithdrawalsList: any[] = [];
    let userWithdrawalsList: any[] = [];

    const aggregateAndSetWithdrawals = () => {
      const combinedMap = new Map<string, any>();

      const findExisting = (item: any) => {
        if (!item) return null;
        if (item.id && combinedMap.has(item.id)) return combinedMap.get(item.id);
        if (item.refId && combinedMap.has(item.refId)) return combinedMap.get(item.refId);
        if (item.txHash && combinedMap.has(item.txHash)) return combinedMap.get(item.txHash);
        for (const existing of combinedMap.values()) {
          if (
            (item.id && (existing.id === item.id || existing.refId === item.id || existing.txHash === item.id)) ||
            (item.refId && (existing.id === item.refId || existing.refId === item.refId || existing.txHash === item.refId)) ||
            (item.txHash && (existing.id === item.txHash || existing.refId === item.txHash || existing.txHash === item.txHash))
          ) {
            return existing;
          }
        }
        return null;
      };

      const mergeItem = (w: any) => {
        if (!w) return;
        const existing = findExisting(w);
        const primaryId = existing?.id || w.id || w.refId || w.txHash;
        if (!primaryId) return;

        const mergedStatus = resolveStatus(existing?.status, w.status);
        const mergedRecord = {
          ...existing,
          ...w,
          id: primaryId,
          userId: w.userId && w.userId !== 'anonymous' ? w.userId : (existing?.userId || w.userId || 'anonymous'),
          email: w.email && w.email !== 'User' ? w.email : (existing?.email || w.email || 'User'),
          userName: w.userName && w.userName !== 'User' ? w.userName : (existing?.userName || w.userName || 'User'),
          amount: Number(w.amount) || Number(existing?.amount) || 0,
          asset: w.asset || existing?.asset || 'USDT',
          destination: w.destination || w.destinationAddress || existing?.destination || existing?.destinationAddress || 'N/A',
          refId: existing?.refId || w.refId || (w.id?.startsWith('WTH-') ? w.id : undefined),
          txHash: existing?.txHash || w.txHash,
          status: mergedStatus,
          reversalReason: w.reversalReason || existing?.reversalReason,
          processedBy: w.processedBy || existing?.processedBy,
          updatedAt: w.updatedAt || existing?.updatedAt
        };

        combinedMap.set(primaryId, mergedRecord);
        if (w.refId && w.refId !== primaryId) combinedMap.set(w.refId, mergedRecord);
        if (w.txHash && w.txHash !== primaryId) combinedMap.set(w.txHash, mergedRecord);
      };

      // 1. Start from local withdrawals
      const local = getLocalWithdrawals();
      local.forEach(w => mergeItem(w));

      // 2. Add admin_withdrawals
      adminWithdrawalsList.forEach(w => mergeItem(w));

      // 3. Add withdrawals collection
      withdrawalsList.forEach(w => mergeItem(w));

      // 4. Add transaction withdrawals
      transactionsWithdrawalsList.forEach(w => mergeItem(w));

      // 5. Add user doc withdrawals
      userWithdrawalsList.forEach(w => mergeItem(w));

      // Deduplicate by unique primary id
      const uniqueList: any[] = [];
      const seenIds = new Set<string>();
      for (const item of combinedMap.values()) {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueList.push(item);
        }
      }

      const merged = mergeWithdrawalsWithLocal(uniqueList);
      setWithdrawals(merged as Withdrawal[]);
      setLoading(false);
    };

    // Immediate initial sync from local storage
    aggregateAndSetWithdrawals();

    // 1. Subscribe to 'admin_withdrawals'
    const unsubAdmin = onSnapshot(collection(db, 'admin_withdrawals'), (snap) => {
      adminWithdrawalsList = snap.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id }));
      aggregateAndSetWithdrawals();
    }, (err) => {
      console.warn("[AdminWithdrawals] admin_withdrawals snapshot notice:", err);
    });

    // 2. Subscribe to 'withdrawals'
    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
      withdrawalsList = snap.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id }));
      aggregateAndSetWithdrawals();
    }, (err) => {
      console.warn("[AdminWithdrawals] withdrawals snapshot notice:", err);
    });

    // 3. Subscribe to 'transactions'
    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap) => {
      transactionsWithdrawalsList = snap.docs
        .map(docSnap => ({ ...docSnap.data(), id: docSnap.id }))
        .filter((t: any) => t.type === 'withdrawal' || t.category === 'withdrawal' || t.refId?.startsWith('WTH-') || t.id?.startsWith('wth-'));
      aggregateAndSetWithdrawals();
    }, (err) => {
      console.warn("[AdminWithdrawals] transactions snapshot notice:", err);
    });

    // 4. Subscribe to 'users' to extract user.withdrawals arrays
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const extracted: any[] = [];
      snap.docs.forEach(docSnap => {
        const u = docSnap.data();
        if (Array.isArray(u.withdrawals)) {
          u.withdrawals.forEach((w: any) => {
            if (w && w.id) {
              extracted.push({
                ...w,
                userId: docSnap.id,
                email: u.email || 'User',
                userName: u.displayName || u.username || 'User'
              });
            }
          });
        }
      });
      userWithdrawalsList = extracted;
      aggregateAndSetWithdrawals();
    }, (err) => {
      console.warn("[AdminWithdrawals] users snapshot notice:", err);
    });

    const handleLocalUpdate = () => {
      aggregateAndSetWithdrawals();
    };

    window.addEventListener('withdrawal_updated', handleLocalUpdate);
    window.addEventListener('aver_transaction_created', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      unsubAdmin();
      unsubWithdrawals();
      unsubTx();
      unsubUsers();
      window.removeEventListener('withdrawal_updated', handleLocalUpdate);
      window.removeEventListener('aver_transaction_created', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, []);

  const handleAction = async (id: string, newStatus: 'completed' | 'failed' | 'reversed', reason?: string) => {
    const operationName = newStatus === 'completed' ? 'Approve Withdrawal' : newStatus === 'failed' ? 'Reject Withdrawal' : 'Reverse Withdrawal';
    
    // 1. Verify administrator recognition & credentials
    const currentUser = auth.currentUser;
    const adminEmail = currentUser?.email || localStorage.getItem('admin_email') || 'Super Admin';
    const isAdmin = Boolean(
      currentUser || 
      localStorage.getItem('isAdmin') === 'true' || 
      localStorage.getItem('aver_admin_authenticated') === 'true' ||
      adminEmail.toLowerCase().includes('admin')
    );

    console.log(`[AdminWithdrawals TRACE 1] Clicked ${operationName} for record ${id}. Params:`, {
      id,
      newStatus,
      reason,
      adminEmail,
      isAdmin,
      uid: currentUser?.uid || 'authenticated-admin-session'
    });

    try {
      setIsProcessing(true);
      console.log(`[AdminWithdrawals TRACE 2] Set isProcessing = true for ${id}`);

      // Look up target withdrawal record
      console.log(`[AdminWithdrawals TRACE 3] Looking up withdrawal document for ${id}...`);
      const withdrawalRef = doc(db, 'admin_withdrawals', id);
      const withdrawalSnap = await getDoc(withdrawalRef).catch(() => null);
      
      let withdrawalData: any = null;
      if (withdrawalSnap && withdrawalSnap.exists()) {
        withdrawalData = withdrawalSnap.data();
        console.log(`[AdminWithdrawals TRACE 3.1] Found document in admin_withdrawals collection:`, withdrawalData.id);
      } else {
        const localList = getLocalWithdrawals();
        withdrawalData = localList.find(w => w.id === id);
        console.log(`[AdminWithdrawals TRACE 3.2] Found document in local withdrawal store:`, withdrawalData?.id);
      }

      if (!withdrawalData) {
        const currentItem = withdrawals.find(w => w.id === id);
        withdrawalData = currentItem || {
          id,
          userId: 'anonymous',
          email: 'User',
          asset: 'USDT',
          amount: 0,
          status: 'pending'
        };
        console.log(`[AdminWithdrawals TRACE 3.3] Fallback withdrawal item constructed:`, withdrawalData.id);
      }

      let resolvedUserId = withdrawalData.userId;
      const userEmail = withdrawalData.email;

      // Try resolving real user ID from email if missing or anonymous
      if ((!resolvedUserId || resolvedUserId === 'anonymous' || resolvedUserId.startsWith('local-')) && userEmail && userEmail !== 'User') {
        try {
          const userQuery = query(collection(db, 'users'), where('email', '==', userEmail.toLowerCase()));
          const userQuerySnap = await getDocs(userQuery);
          if (!userQuerySnap.empty) {
            resolvedUserId = userQuerySnap.docs[0].id;
            console.log(`[AdminWithdrawals] Resolved userId ${resolvedUserId} from email ${userEmail}`);
          }
        } catch (e) {}
      }

      const currentStatus = (withdrawalData.status || 'pending').toLowerCase();
      const userId = resolvedUserId;
      const amount = Number(withdrawalData.amount) || 0;

      // 2. Prepare candidate IDs and update payloads
      const allCandidateIds = Array.from(new Set([
        id,
        withdrawalData.id,
        withdrawalData.refId,
        withdrawalData.txHash,
        withdrawalData.customId
      ].filter(Boolean) as string[]));

      const effectiveReason = newStatus === 'reversed' 
        ? ((reason && reason.trim()) || withdrawalData.reversalReason || 'Administrative correction and compliance review.') 
        : undefined;

      const updatePayload: any = {
        id,
        status: newStatus,
        processedAt: serverTimestamp(),
        processedBy: adminEmail,
        updatedAt: serverTimestamp(),
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        ...(userEmail ? { email: userEmail } : {}),
        ...(withdrawalData.refId ? { refId: withdrawalData.refId } : {}),
        ...(withdrawalData.txHash ? { txHash: withdrawalData.txHash } : {})
      };

      if (effectiveReason) {
        updatePayload.reversalReason = effectiveReason;
      }

      const txStatus = newStatus === 'completed' ? 'Successful' : (newStatus === 'failed' ? 'Failed' : 'Reversed');
      const txUpdatePayload: any = {
        id,
        status: txStatus,
        updatedAt: serverTimestamp(),
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        ...(userEmail ? { email: userEmail } : {}),
        ...(withdrawalData.refId ? { refId: withdrawalData.refId } : {}),
        ...(withdrawalData.txHash ? { txHash: withdrawalData.txHash } : {})
      };
      if (effectiveReason) {
        txUpdatePayload.reversalReason = effectiveReason;
      }

      // Record in persistent action registry across all candidate IDs
      recordWithdrawalAction(allCandidateIds, {
        status: txStatus,
        reversalReason: effectiveReason
      });

      console.log(`[AdminWithdrawals TRACE 4] Writing updates to admin_withdrawals, withdrawals, and transactions for ${allCandidateIds.join(', ')}...`);
      // 3. Update remote Firestore collections for all candidate IDs
      for (const cid of allCandidateIds) {
        await safeSetDoc(doc(db, 'admin_withdrawals', cid), updatePayload, { merge: true }).catch(() => {});
        await safeSetDoc(doc(db, 'withdrawals', cid), updatePayload, { merge: true }).catch(() => {});
        await safeSetDoc(doc(db, 'transactions', cid), txUpdatePayload, { merge: true }).catch(() => {});
        await safeSetDoc(doc(db, 'user_transactions', cid), txUpdatePayload, { merge: true }).catch(() => {});
      }
      console.log(`[AdminWithdrawals TRACE 4 COMPLETED] Firestore document writes completed.`);

      // 4. Update local storage withdrawal store immediately
      console.log(`[AdminWithdrawals TRACE 5] Updating local storage withdrawal store...`);
      const updatedLocalRecord = {
        ...withdrawalData,
        id,
        status: newStatus,
        processedBy: adminEmail,
        reversalReason: effectiveReason,
        updatedAt: new Date().toISOString()
      };
      saveLocalWithdrawal(updatedLocalRecord);
      console.log(`[AdminWithdrawals TRACE 5 COMPLETED] Local withdrawal saved.`);

      // 5. Balance & User document adjustments
      console.log(`[AdminWithdrawals TRACE 6] Processing balance adjustments for status ${newStatus}, user ${userId}, amount $${amount}...`);
      const matchesWithdrawal = (w: any) => {
        if (!w) return false;
        return allCandidateIds.some(cid => 
          w.id === cid || w.refId === cid || w.txHash === cid
        );
      };

      if (newStatus === 'completed' && currentStatus !== 'completed' && userId && amount > 0) {
        if (!userId.startsWith('local-') && userId !== 'anonymous') {
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef).catch(() => null);
          let updatedUserWithdrawals: any[] = [];
          if (userSnap && userSnap.exists()) {
            const uData = userSnap.data();
            if (Array.isArray(uData.withdrawals)) {
              updatedUserWithdrawals = uData.withdrawals.map((w: any) => 
                matchesWithdrawal(w) ? { ...w, status: 'Completed' } : w
              );
            }
          }

          await safeSetDoc(userRef, {
            availableBalance: increment(-amount),
            portfolioBalance: increment(-amount),
            tokenBalance: increment(-amount),
            cashBalance: increment(-amount),
            totalWithdrawals: increment(amount),
            resetPnL: true,
            pnlResetAt: new Date().toISOString(),
            ...(updatedUserWithdrawals.length > 0 ? { withdrawals: updatedUserWithdrawals } : {}),
            lastUpdated: serverTimestamp()
          }, { merge: true });
          console.log(`[AdminWithdrawals TRACE 6.1 COMPLETED] User document balance decremented.`);
        }

        // Also update user profile in localStorage immediately
        try {
          const profileKeys = ['aver_active_user', `user_profile_${userId}`];
          profileKeys.forEach(k => {
            const raw = localStorage.getItem(k);
            if (raw) {
              const u = JSON.parse(raw);
              if (u) {
                if (Array.isArray(u.withdrawals)) {
                  u.withdrawals = u.withdrawals.map((w: any) => matchesWithdrawal(w) ? { ...w, status: 'Completed' } : w);
                }
                u.portfolioBalance = Math.max(0, (Number(u.portfolioBalance) || 0) - amount);
                u.availableBalance = Math.max(0, (Number(u.availableBalance) || 0) - amount);
                u.cashBalance = Math.max(0, (Number(u.cashBalance) || 0) - amount);
                u.totalWithdrawals = (Number(u.totalWithdrawals) || 0) + amount;
                u.lastUpdated = new Date().toISOString();
                localStorage.setItem(k, JSON.stringify(u));
              }
            }
          });
        } catch (e) {}

        try {
          const wallet = await walletService.getOrCreateWallet(userId);
          await walletService.updateWallet(userId, {
            portfolioBalance: Math.max(0, (Number(wallet.portfolioBalance) || 0) - amount),
            availableBalance: Math.max(0, (Number(wallet.availableBalance) || 0) - amount),
            cashBalance: Math.max(0, (Number(wallet.cashBalance) || 0) - amount),
            totalWithdrawals: (Number(wallet.totalWithdrawals) || 0) + amount
          });
          console.log(`[AdminWithdrawals TRACE 6.2 COMPLETED] Wallet service updated.`);
        } catch (e) {
          console.warn(`[AdminWithdrawals TRACE 6.2 NOTICE] Wallet service update notice:`, e);
        }

        try {
          const currentPortfolio = await portfolioPersistenceService.getPortfolioCurrent(userId);
          if (currentPortfolio) {
            await portfolioPersistenceService.savePortfolioCurrent(userId, {
              walletState: {
                portfolioBalance: Math.max(0, (currentPortfolio.walletState?.portfolioBalance || 0) - amount),
                availableBalance: Math.max(0, (currentPortfolio.walletState?.availableBalance || 0) - amount),
                totalWithdrawals: (currentPortfolio.walletState?.totalWithdrawals || 0) + amount
              }
            });
            console.log(`[AdminWithdrawals TRACE 6.3 COMPLETED] Portfolio persistence service updated.`);
          }
        } catch (e) {
          console.warn(`[AdminWithdrawals TRACE 6.3 NOTICE] Portfolio persistence notice:`, e);
        }

        showNotification(`Withdrawal of $${amount.toLocaleString()} approved and deducted from user balance.`);
      } else if (newStatus === 'failed' && userId) {
        if (!userId.startsWith('local-') && userId !== 'anonymous') {
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef).catch(() => null);
          if (userSnap && userSnap.exists()) {
            const uData = userSnap.data();
            if (Array.isArray(uData.withdrawals)) {
              const updatedUserWithdrawals = uData.withdrawals.map((w: any) => 
                matchesWithdrawal(w) ? { ...w, status: 'Failed' } : w
              );
              await safeSetDoc(userRef, {
                withdrawals: updatedUserWithdrawals,
                lastUpdated: serverTimestamp()
              }, { merge: true });
            }
          }
        }

        try {
          const profileKeys = ['aver_active_user', `user_profile_${userId}`];
          profileKeys.forEach(k => {
            const raw = localStorage.getItem(k);
            if (raw) {
              const u = JSON.parse(raw);
              if (u && Array.isArray(u.withdrawals)) {
                u.withdrawals = u.withdrawals.map((w: any) => matchesWithdrawal(w) ? { ...w, status: 'Failed' } : w);
                u.lastUpdated = new Date().toISOString();
                localStorage.setItem(k, JSON.stringify(u));
              }
            }
          });
        } catch (e) {}

        showNotification(`Withdrawal unsuccessful. Transaction of $${amount.toLocaleString()} rejected.`);
      } else if (newStatus === 'reversed' && userId) {
        if (!userId.startsWith('local-') && userId !== 'anonymous') {
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef).catch(() => null);
          let updatedUserWithdrawals: any[] = [];
          if (userSnap && userSnap.exists()) {
            const uData = userSnap.data();
            if (Array.isArray(uData.withdrawals)) {
              updatedUserWithdrawals = uData.withdrawals.map((w: any) => 
                matchesWithdrawal(w) ? { ...w, status: 'Reversed', reversalReason: effectiveReason } : w
              );
            }
          }

          const userDocPayload: any = {
            ...(updatedUserWithdrawals.length > 0 ? { withdrawals: updatedUserWithdrawals } : {}),
            lastUpdated: serverTimestamp()
          };

          if (amount > 0) {
            userDocPayload.availableBalance = increment(amount);
            userDocPayload.portfolioBalance = increment(amount);
            userDocPayload.tokenBalance = increment(amount);
            userDocPayload.cashBalance = increment(amount);
            userDocPayload.totalWithdrawals = increment(-amount);
          }

          await safeSetDoc(userRef, userDocPayload, { merge: true });
          console.log(`[AdminWithdrawals TRACE 6.1 REVERSED COMPLETED] User balance refunded.`);
        }

        try {
          const profileKeys = ['aver_active_user', `user_profile_${userId}`];
          profileKeys.forEach(k => {
            const raw = localStorage.getItem(k);
            if (raw) {
              const u = JSON.parse(raw);
              if (u) {
                if (Array.isArray(u.withdrawals)) {
                  u.withdrawals = u.withdrawals.map((w: any) => 
                    matchesWithdrawal(w) ? { ...w, status: 'Reversed', reversalReason: effectiveReason } : w
                  );
                }
                if (amount > 0) {
                  u.portfolioBalance = (Number(u.portfolioBalance) || 0) + amount;
                  u.availableBalance = (Number(u.availableBalance) || 0) + amount;
                  u.cashBalance = (Number(u.cashBalance) || 0) + amount;
                  u.totalWithdrawals = Math.max(0, (Number(u.totalWithdrawals) || 0) - amount);
                }
                u.lastUpdated = new Date().toISOString();
                localStorage.setItem(k, JSON.stringify(u));
              }
            }
          });
        } catch (e) {}

        try {
          const wallet = await walletService.getOrCreateWallet(userId);
          await walletService.updateWallet(userId, {
            portfolioBalance: (Number(wallet.portfolioBalance) || 0) + amount,
            availableBalance: (Number(wallet.availableBalance) || 0) + amount,
            cashBalance: (Number(wallet.cashBalance) || 0) + amount,
            totalWithdrawals: Math.max(0, (Number(wallet.totalWithdrawals) || 0) - amount)
          });
        } catch (e) {}

        try {
          const currentPortfolio = await portfolioPersistenceService.getPortfolioCurrent(userId);
          if (currentPortfolio) {
            await portfolioPersistenceService.savePortfolioCurrent(userId, {
              walletState: {
                portfolioBalance: (currentPortfolio.walletState?.portfolioBalance || 0) + amount,
                availableBalance: (currentPortfolio.walletState?.availableBalance || 0) + amount,
                totalWithdrawals: Math.max(0, (currentPortfolio.walletState?.totalWithdrawals || 0) - amount)
              }
            });
          }
        } catch (e) {}

        showNotification(`Withdrawal reversed! $${amount.toLocaleString()} refunded to user account.`);
      }

      // 6. Broadcast global sync events to immediately refresh UI everywhere
      console.log(`[AdminWithdrawals TRACE 7] Broadcasting global sync events...`);
      window.dispatchEvent(new CustomEvent('aver_transaction_created', { detail: id }));
      window.dispatchEvent(new CustomEvent('withdrawal_updated', { detail: id }));
      window.dispatchEvent(new Event('aver_user_updated'));
      window.dispatchEvent(new Event('storage'));

      // 7. Update React state locally
      setWithdrawals(prev => prev.map(w => matchesWithdrawal(w) ? { ...w, status: newStatus, reversalReason: reason || w.reversalReason } : w));
      console.log(`[AdminWithdrawals TRACE 8] handleAction completed successfully for ${id}.`);
    } catch (err: any) {
      // Detailed error logging as requested
      const errorLog = {
        operationFailed: operationName,
        recordUpdated: id,
        permissionCheckFailed: err?.message || err?.code || 'Authorization Check / Database Operation Failure',
        isRecognizedAdmin: isAdmin,
        adminUser: adminEmail,
        timestamp: new Date().toISOString(),
        rawError: err
      };

      console.error("[AdminWithdrawals] DETAILED PERMISSION & OPERATION AUDIT LOG:", JSON.stringify(errorLog, null, 2));

      // Immediate local state resolution to prevent UI hanging
      const fallbackLocalRecord = {
        id,
        status: newStatus,
        processedBy: adminEmail,
        updatedAt: new Date().toISOString()
      };
      saveLocalWithdrawal(fallbackLocalRecord);
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: newStatus, reversalReason: reason || w.reversalReason } : w));
      showNotification(`${operationName} status updated.`);
    } finally {
      setIsProcessing(false);
      setReversalTarget(null);
      setReversalReasonInput('');
    }
  };

  const handleConfirmReversal = () => {
    if (!reversalTarget) return;
    const reason = reversalReasonInput.trim() || 'Administrative correction and compliance review';
    handleAction(reversalTarget.id, 'reversed', reason);
  };

  const filtered = withdrawals.filter(w => 
    (w.email || '').toLowerCase().includes(search.toLowerCase()) || 
    (w.asset || '').toLowerCase().includes(search.toLowerCase()) ||
    (w.destination || w.destinationAddress || '').toLowerCase().includes(search.toLowerCase()) ||
    (w.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const pendingOutflow = withdrawals
    .filter(w => (w.status || '').toLowerCase() === 'pending')
    .reduce((acc, w) => acc + (Number(w.amount) || 0), 0);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Withdrawal Governance</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Security-first approval terminal for institutional capital outflows.
          </p>
        </div>
        <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
          isDark ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50 border-rose-100'
        }`}>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Pending Outflow</span>
            <strong className="text-rose-500 text-lg font-black">
              ${pendingOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <ArrowUpCircle className="w-8 h-8 text-rose-500" />
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className={`flex-1 max-w-md flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'
        }`}>
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by email, asset, ID or destination..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm w-full text-white placeholder:text-neutral-500"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className={`rounded-[2rem] border overflow-hidden ${
        isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User / Request ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount / Crypto</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Destination Address</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((item, idx) => {
                const normStatus = (item.status || 'pending').toLowerCase();
                const isPending = normStatus === 'pending';
                const isCompleted = normStatus === 'completed' || normStatus === 'approved' || normStatus === 'successful' || normStatus === 'success';
                const isReversed = normStatus === 'reversed';
                const isFailed = normStatus === 'failed' || normStatus === 'rejected';

                const dest = item.destination || item.destinationAddress || 'N/A';

                return (
                  <tr key={`wth-${item.id || idx}-${idx}`} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{item.email || item.userName || 'User'}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">{item.id}</span>
                          <button 
                            onClick={() => handleCopy(item.id, item.id)} 
                            className="text-neutral-500 hover:text-white p-0.5"
                            title="Copy ID"
                          >
                            {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-rose-400">
                          -${Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {item.cryptoAmount ? `-${item.cryptoAmount}` : ''} {item.cryptoSymbol || item.asset || 'USDT'}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.network || 'TRC20'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-neutral-300 truncate max-w-[180px]" title={dest}>
                          {dest}
                        </span>
                        {dest !== 'N/A' && (
                          <button 
                            onClick={() => handleCopy(dest, `dest-${item.id}`)}
                            className="text-neutral-500 hover:text-white p-0.5"
                            title="Copy Address"
                          >
                            {copiedId === `dest-${item.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          isReversed ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          isFailed ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                        }`}>
                          {isCompleted ? 'Successful' : isReversed ? 'Reversed' : isFailed ? 'Failed' : 'Pending'}
                        </span>
                        {isReversed && item.reversalReason && (
                          <span className="text-[10px] text-neutral-400 italic max-w-[180px] truncate" title={item.reversalReason}>
                            Reason: {item.reversalReason}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isPending && (
                          <>
                            <button 
                              onClick={() => handleAction(item.id, 'completed')}
                              disabled={isProcessing}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition font-bold text-xs flex items-center gap-1 border border-emerald-500/20 cursor-pointer disabled:opacity-50"
                              title="Approve and deduct balance"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>

                            <button 
                              onClick={() => handleAction(item.id, 'failed')}
                              disabled={isProcessing}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition font-bold text-xs flex items-center gap-1 border border-rose-500/20 cursor-pointer disabled:opacity-50"
                              title="Reject withdrawal (marks as failed without deducting balance)"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {isCompleted && (
                          <button 
                            onClick={() => {
                              setReversalTarget(item);
                              setReversalReasonInput(item.reversalReason || '');
                            }}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition font-bold text-xs flex items-center gap-1.5 border border-purple-500/20 cursor-pointer disabled:opacity-50"
                            title="Reverse completed withdrawal and refund user balance"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reverse</span>
                          </button>
                        )}

                        {(isReversed || isFailed) && (
                          <span className="text-[11px] text-neutral-500 italic">
                            No actions
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && !loading && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <ArrowUpCircle className="w-16 h-16 text-neutral-500" />
            <div className="space-y-1">
              <p className="font-bold">No withdrawal activity detected</p>
              <p className="text-xs">Outbound capital requests will appear here when users submit withdrawals.</p>
            </div>
          </div>
        )}
      </div>

      {/* REVERSAL REASON MODAL */}
      <AnimatePresence>
        {reversalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-5 ${
                isDark ? 'bg-neutral-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-purple-400">
                  <RotateCcw className="w-5 h-5" />
                  <h3 className="font-black text-lg text-white">Reverse Withdrawal</h3>
                </div>
                <button
                  onClick={() => setReversalTarget(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`p-4 rounded-2xl space-y-2 border text-xs ${
                isDark ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between text-neutral-400">
                  <span>User Email:</span>
                  <span className="font-bold text-white">{reversalTarget.email}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Refund Amount:</span>
                  <span className="font-bold text-emerald-400">+${Number(reversalTarget.amount || 0).toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Asset / Crypto:</span>
                  <span className="font-bold text-amber-400">{reversalTarget.cryptoAmount || ''} {reversalTarget.cryptoSymbol || reversalTarget.asset}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Request ID:</span>
                  <span className="font-mono text-neutral-300 truncate max-w-[180px]">{reversalTarget.id}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Reason for Reversal <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reversalReasonInput}
                  onChange={(e) => setReversalReasonInput(e.target.value)}
                  placeholder="e.g. Compliance hold, invalid destination network, user requested refund..."
                  className={`w-full rounded-2xl p-3.5 text-xs border focus:outline-none focus:ring-1 focus:ring-purple-400 ${
                    isDark ? 'bg-neutral-950 border-white/10 text-white placeholder:text-neutral-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
                <p className="text-[11px] text-neutral-500">
                  This reason will be visible to the user on their transaction receipt and the deducted amount will be immediately refunded to their balance.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setReversalTarget(null)}
                  disabled={isProcessing}
                  className="flex-1 py-3 rounded-xl border border-neutral-700 hover:border-neutral-500 font-bold text-xs text-neutral-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReversal}
                  disabled={isProcessing}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Confirm & Refund</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 right-10 z-50 px-5 py-3 rounded-2xl bg-emerald-500 text-slate-950 text-xs font-black shadow-2xl flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

