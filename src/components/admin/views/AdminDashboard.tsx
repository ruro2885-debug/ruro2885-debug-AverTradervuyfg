import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Wallet, ArrowDownCircle, ArrowUpCircle, 
  TrendingUp, Activity, ShieldAlert, MessageSquare, UserCheck, RefreshCw
} from 'lucide-react';
import { collection, query, onSnapshot, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

interface AdminStats {
  totalUsers: number;
  totalWallets: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingKYC: number;
  openTickets: number;
}

interface FinancialRecord {
  amount?: number;
  timestamp?: any;
  status?: string;
  type?: string;
}

type TimeframeRange = 'days' | 'weeks' | 'months';

export default function AdminDashboard({ theme }: { theme: 'light' | 'dark' }) {
  const { resetAllFinancialData } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetAll = async () => {
    if (!window.confirm("Are you sure you want to completely reset all existing account financial data? This will set all balances to 0.00 and clear all deposits, withdrawals, and transaction history across all user accounts.")) {
      return;
    }
    setResetting(true);
    try {
      await resetAllFinancialData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (e) {
      console.error("Reset failed:", e);
      alert("Failed to reset financial data. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalWallets: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    pendingKYC: 0,
    openTickets: 0
  });

  const [allDeposits, setAllDeposits] = useState<FinancialRecord[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<FinancialRecord[]>([]);
  const [timeframe, setTimeframe] = useState<TimeframeRange>('days');
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  useEffect(() => {
    let loadedCount = 0;
    let isSubscribed = true;

    const checkLoaded = () => {
      if (!isSubscribed) return;
      loadedCount++;
      if (loadedCount >= 4) {
        setLoading(false);
      }
    };

    // Timeout safety net to clear loading skeleton if network is slow
    const timeoutId = setTimeout(() => {
      if (isSubscribed) {
        setLoading(false);
      }
    }, 1500);

    // Real-time listener for Total Platform Users directly from Firestore 'users' collection
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      if (isSubscribed) {
        // Count unique valid users by email to avoid duplication in stats
        const emailSet = new Set<string>();
        const uidOnlySet = new Set<string>();

        snap.docs.forEach(d => {
          const data = d.data();
          if (!data || data.isDeleted || data.accountStatus === 'Deleted') return;
          
          const email = (data.email || '').toLowerCase().trim();
          if (email) {
            emailSet.add(email);
          } else if (!d.id.startsWith('local-') && !d.id.startsWith('auto_')) {
            // Also count valid Firebase Auth users who might not have an email field yet
            uidOnlySet.add(d.id);
          }
        });
        
        setStats(prev => ({ ...prev, totalUsers: emailSet.size + uidOnlySet.size }));
        checkLoaded();
      }
    }, (err) => {
      console.warn('Users listener notice:', err);
      if (isSubscribed) {
        checkLoaded();
      }
    });

    // Real-time listener for Linked Institutional Wallets
    const unsubWallets = onSnapshot(collection(db, 'linked_wallets'), (snap) => {
      if (isSubscribed) {
        setStats(prev => ({ ...prev, totalWallets: snap.size }));
        checkLoaded();
      }
    }, (err) => {
      console.warn('Wallets listener notice:', err);
      if (isSubscribed) {
        setStats(prev => ({ ...prev, totalWallets: 0 }));
        checkLoaded();
      }
    });

    // Real-time listener for Deposits and Inbound Financial Flux
    const unsubDeposits = onSnapshot(collection(db, 'admin_deposits'), (snap) => {
      if (isSubscribed) {
        const docs = snap.docs.map(doc => doc.data() as FinancialRecord);
        const pendingCount = docs.filter(d => (d.status || '').toLowerCase() === 'pending').length;
        setStats(prev => ({ ...prev, pendingDeposits: pendingCount }));
        setAllDeposits(docs);
        checkLoaded();
      }
    }, (err) => {
      console.warn('Deposits listener notice:', err);
      if (isSubscribed) {
        setStats(prev => ({ ...prev, pendingDeposits: 0 }));
        checkLoaded();
      }
    });

    // Real-time listener for Withdrawals and Outbound Financial Flux
    const unsubWithdrawals = onSnapshot(collection(db, 'admin_withdrawals'), (snap) => {
      if (isSubscribed) {
        const docs = snap.docs.map(doc => doc.data() as FinancialRecord);
        const pendingCount = docs.filter(w => (w.status || '').toLowerCase() === 'pending').length;
        setStats(prev => ({ ...prev, pendingWithdrawals: pendingCount }));
        setAllWithdrawals(docs);
        checkLoaded();
      }
    }, (err) => {
      console.warn('Withdrawals listener notice:', err);
      if (isSubscribed) {
        setStats(prev => ({ ...prev, pendingWithdrawals: 0 }));
        checkLoaded();
      }
    });

    // Real-time listener for Pending KYC Verifications
    const unsubKYC = onSnapshot(
      query(collection(db, 'admin_kyc'), where('status', '==', 'pending')),
      (snap) => {
        if (isSubscribed) {
          setStats(prev => ({ ...prev, pendingKYC: snap.size }));
          checkLoaded();
        }
      },
      (err) => {
        console.warn('KYC listener notice:', err);
        if (isSubscribed) {
          checkLoaded();
        }
      }
    );

    // Real-time listener for Open Support Tickets
    const unsubSupport = onSnapshot(
      query(collection(db, 'support_tickets'), where('status', 'in', ['open', 'pending', 'unanswered'])),
      (snap) => {
        if (isSubscribed) {
          setStats(prev => ({ ...prev, openTickets: snap.size }));
          checkLoaded();
        }
      },
      (err) => {
        console.warn('Support listener notice:', err);
        if (isSubscribed) {
          checkLoaded();
        }
      }
    );

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
      unsubUsers();
      unsubWallets();
      unsubDeposits();
      unsubWithdrawals();
      unsubKYC();
      unsubSupport();
    };
  }, []);

  // Compute dynamic period flux data (M1 - M6) from real transaction history
  const fluxData = useMemo(() => {
    const now = new Date();
    const periods: { label: string; startDate: Date; endDate: Date; inbound: number; outbound: number }[] = [];

    if (timeframe === 'days') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        periods.push({ label, startDate: start, endDate: end, inbound: 0, outbound: 0 });
      }
    } else if (timeframe === 'weeks') {
      for (let i = 5; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        const label = `Wk ${6 - i}`;
        periods.push({ label, startDate: start, endDate: end, inbound: 0, outbound: 0 });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        periods.push({ label, startDate: start, endDate: end, inbound: 0, outbound: 0 });
      }
    }

    const parseTs = (ts: any): Date | null => {
      if (!ts) return null;
      if (typeof ts === 'string') {
        const parsed = new Date(ts);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      if (typeof ts === 'number') return new Date(ts);
      if (ts.seconds) return new Date(ts.seconds * 1000);
      return null;
    };

    // Aggregate Inbound (Deposits)
    allDeposits.forEach((dep) => {
      const dt = parseTs(dep.timestamp);
      if (!dt) return;
      const amount = dep.amount || 0;
      const target = periods.find(p => dt >= p.startDate && dt <= p.endDate);
      if (target) {
        target.inbound += amount;
      }
    });

    // Aggregate Outbound (Withdrawals)
    allWithdrawals.forEach((wd) => {
      const dt = parseTs(wd.timestamp);
      if (!dt) return;
      const amount = wd.amount || 0;
      const target = periods.find(p => dt >= p.startDate && dt <= p.endDate);
      if (target) {
        target.outbound += amount;
      }
    });

    const maxVal = Math.max(
      ...periods.map(p => Math.max(p.inbound, p.outbound)),
      1
    );

    return periods.map(p => ({
      ...p,
      inboundPct: p.inbound === 0 ? 0 : Math.max(8, Math.min(100, Math.round((p.inbound / maxVal) * 100))),
      outboundPct: p.outbound === 0 ? 0 : Math.max(8, Math.min(100, Math.round((p.outbound / maxVal) * 100))),
    }));
  }, [allDeposits, allWithdrawals, timeframe]);

  const totalVolume = useMemo(() => {
    return fluxData.reduce((acc, p) => acc + p.inbound + p.outbound, 0);
  }, [fluxData]);

  const statCards = [
    { 
      label: 'Total Platform Users', 
      value: stats.totalUsers.toLocaleString(), 
      icon: Users, 
      color: 'blue', 
      trend: stats.totalUsers > 0 ? 'Live Users' : '0 Users', 
      bg: 'bg-blue-500/10', 
      text: 'text-blue-500', 
      border: 'border-blue-500/20' 
    },
    { 
      label: 'Linked Institutional Wallets', 
      value: stats.totalWallets.toLocaleString(), 
      icon: Wallet, 
      color: 'emerald', 
      trend: stats.totalWallets > 0 ? 'Connected' : '0 Wallets', 
      bg: 'bg-emerald-500/10', 
      text: 'text-emerald-500', 
      border: 'border-emerald-500/20' 
    },
    { 
      label: 'Pending Deposits', 
      value: stats.pendingDeposits.toLocaleString(), 
      icon: ArrowDownCircle, 
      color: 'amber', 
      trend: stats.pendingDeposits > 0 ? 'Action Needed' : '0 Pending', 
      bg: 'bg-amber-500/10', 
      text: 'text-amber-500', 
      border: 'border-amber-500/20' 
    },
    { 
      label: 'Pending Withdrawals', 
      value: stats.pendingWithdrawals.toLocaleString(), 
      icon: ArrowUpCircle, 
      color: 'rose', 
      trend: stats.pendingWithdrawals > 0 ? 'High Priority' : '0 Pending', 
      bg: 'bg-rose-500/10', 
      text: 'text-rose-500', 
      border: 'border-rose-500/20' 
    },
  ];

  const hasAlerts = stats.pendingWithdrawals > 0 || stats.pendingKYC > 0 || stats.pendingDeposits > 0 || stats.openTickets > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Terminal Overview</h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Real-time institutional control center monitor. Global platform status and financial flows.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-3xl border ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'
            } shadow-sm group hover:border-emerald-500/30 transition-all`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.text} border ${stat.border}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {loading ? (
                <div className="h-5 w-16 rounded-lg bg-slate-300/40 dark:bg-white/10 animate-pulse" />
              ) : (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                  stat.trend === 'Action Needed' || stat.trend === 'High Priority' 
                    ? 'bg-rose-500/10 text-rose-500' 
                    : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>
                {stat.label}
              </span>
              <div className="text-3xl font-black tracking-tight min-h-[36px] flex items-center">
                {loading ? (
                  <div className="h-8 w-20 rounded-lg bg-slate-300/40 dark:bg-white/10 animate-pulse" />
                ) : (
                  stat.value
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Operational Alerts & Priority Queue */}
        <div className={`p-8 rounded-[2rem] border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-emerald-500" />
              <h3 className="text-xl font-bold">Operational Alerts</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Priority Queue</span>
          </div>

          <div className="space-y-4">
            {/* Critical Priority: Pending Withdrawals */}
            {stats.pendingWithdrawals > 0 && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <div>
                    <span className="text-sm font-bold block">Withdrawal Approvals Required</span>
                    <span className="text-[10px] text-slate-500 font-medium">Outbound institutional capital security queue</span>
                  </div>
                </div>
                <span className="text-sm font-black text-rose-500 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  {stats.pendingWithdrawals} Pending
                </span>
              </div>
            )}

            {/* High Priority: Unanswered Support Chats */}
            {stats.openTickets > 0 && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-blue-500 animate-bounce" />
                  <div>
                    <span className="text-sm font-bold block">Unanswered Support Chats</span>
                    <span className="text-[10px] text-slate-500 font-medium">Active client support requests</span>
                  </div>
                </div>
                <span className="text-sm font-black text-blue-500 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  {stats.openTickets} Open
                </span>
              </div>
            )}

            {/* Medium Priority: Pending KYC Verifications */}
            {stats.pendingKYC > 0 && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="text-sm font-bold block">Pending KYC Verifications</span>
                    <span className="text-[10px] text-slate-500 font-medium">Compliance and verification documentation</span>
                  </div>
                </div>
                <span className="text-sm font-black text-amber-500 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  {stats.pendingKYC} Requests
                </span>
              </div>
            )}

            {/* Medium Priority: Pending Capital Deposits */}
            {stats.pendingDeposits > 0 && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center gap-3">
                  <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="text-sm font-bold block">Pending Deposit Confirmations</span>
                    <span className="text-[10px] text-slate-500 font-medium">Inbound capital audit and verification</span>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-500 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  {stats.pendingDeposits} Pending
                </span>
              </div>
            )}

            {/* System Clean Empty State */}
            {!hasAlerts && !loading && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                <Activity className="w-10 h-10 mb-1 text-emerald-500" />
                <p className="text-sm font-bold">System clean. No high-priority alerts.</p>
                <p className="text-xs text-slate-500">No pending administrative tasks.</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Flux (Real-time Dynamic Chart) */}
        <div className={`p-8 rounded-[2rem] border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
              <div>
                <h3 className="text-xl font-bold">Financial Flux</h3>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                  Real-Time Capital Flows
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className={`flex gap-1 p-1 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  onClick={() => setTimeframe('days')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    timeframe === 'days' 
                      ? 'bg-emerald-500 text-slate-950 font-black' 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  6 Days
                </button>
                <button
                  onClick={() => setTimeframe('weeks')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    timeframe === 'weeks' 
                      ? 'bg-emerald-500 text-slate-950 font-black' 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  6 Weeks
                </button>
                <button
                  onClick={() => setTimeframe('months')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    timeframe === 'months' 
                      ? 'bg-emerald-500 text-slate-950 font-black' 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  6 Months
                </button>
              </div>

              <div className="flex gap-1.5">
                <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">Inbound</div>
                <div className="px-2 py-1 rounded bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase">Outbound</div>
              </div>
            </div>
          </div>

          {totalVolume === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-center opacity-40 space-y-2">
              <TrendingUp className="w-10 h-10 text-slate-500" />
              <p className="text-sm font-bold">No transaction history yet.</p>
              <p className="text-xs text-slate-500">Inbound deposits and outbound withdrawals will render here automatically.</p>
            </div>
          ) : (
            <div className="h-[220px] flex items-end gap-3 px-2">
              {fluxData.map((period, i) => (
                <div key={i} className="flex-1 flex flex-col gap-2 items-center group">
                  <div className="w-full relative h-[180px] flex items-end justify-center gap-1">
                    {/* Inbound Bar */}
                    <div className="w-1/2 h-full flex items-end">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${period.inboundPct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="w-full rounded-t-md bg-emerald-500/60 group-hover:bg-emerald-500 transition-all cursor-pointer"
                        title={`Inbound: $${period.inbound.toLocaleString()}`}
                      />
                    </div>
                    {/* Outbound Bar */}
                    <div className="w-1/2 h-full flex items-end">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${period.outboundPct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="w-full rounded-t-md bg-rose-500/60 group-hover:bg-rose-500 transition-all cursor-pointer"
                        title={`Outbound: $${period.outbound.toLocaleString()}`}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 truncate max-w-full">
                    {period.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Global Financial Reset Panel */}
      <div className={`p-8 rounded-[2rem] border ${
        isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-black text-rose-500 mb-1">Global Financial Data Reset</h4>
            <p className="text-xs text-slate-400">Reset Portfolio Net Balance, Home Net Balance, Available Withdrawals, and clear all deposit history, withdrawal history, transaction history, pending requests, and financial notifications across all accounts to $0.00.</p>
          </div>
          <button
            onClick={handleResetAll}
            disabled={resetting}
            className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {resetting ? 'Resetting All Accounts...' : 'Reset All Financial Data'}
          </button>
        </div>
        {resetSuccess && (
          <p className="text-xs text-emerald-400 font-bold mt-3">✓ All account financial data successfully reset across the entire platform!</p>
        )}
      </div>
    </div>
  );
}

