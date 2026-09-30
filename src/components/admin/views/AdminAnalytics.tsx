import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Users, Wallet, ArrowDownRight, ArrowUpRight, Activity, Calendar } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface PlatformAnalytics {
  id: string;
  totalUsers: number;
  activeUsers24h: number;
  totalVolume: number;
  totalDeposits: number;
  totalWithdrawals: number;
  avgUserBalance: number;
  timestamp: string;
}

export default function AdminAnalytics({ theme }: { theme: 'light' | 'dark' }) {
  const [data, setData] = useState<PlatformAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  useEffect(() => {
    const q = query(collection(db, 'platform_analytics'), orderBy('timestamp', 'desc'), limit(30));
    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformAnalytics));
      setData(records);
      setLoading(false);
    });
    return unsub;
  }, []);

  const current = data[0] || {
    totalUsers: 0,
    activeUsers24h: 0,
    totalVolume: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    avgUserBalance: 0
  };

  const metrics = [
    { label: 'Total Volume', value: `$${current.totalVolume.toLocaleString()}`, change: '+14.5%', up: true, icon: TrendingUp },
    { label: 'Net Deposits', value: `$${(current.totalDeposits - current.totalWithdrawals).toLocaleString()}`, change: '+8.2%', up: true, icon: Wallet },
    { label: 'Active Users (24h)', value: current.activeUsers24h.toLocaleString(), change: '-2.4%', up: false, icon: Users },
    { label: 'Avg User Liquidity', value: `$${current.avgUserBalance.toLocaleString()}`, change: '+1.2%', up: true, icon: Activity },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Institutional Analytics</h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          High-fidelity platform performance tracking and financial metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-3xl border ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'
            } shadow-sm`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-white/5 text-emerald-500' : 'bg-slate-50 text-slate-900'}`}>
                <m.icon className="w-5 h-5" />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${
                m.up ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
              }`}>
                {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {m.change}
              </div>
            </div>
            <div className="space-y-1">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>
                {m.label}
              </span>
              <div className="text-2xl font-black tracking-tight">{m.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={`p-8 rounded-[2.5rem] border ${
        isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Growth Projection</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
            }`}>
              7 Days
            </button>
            <button className={`px-4 py-2 rounded-xl text-xs font-bold border bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20`}>
              30 Days
            </button>
          </div>
        </div>

        <div className="h-[300px] flex items-end gap-3 px-4">
          {[30, 45, 25, 60, 40, 75, 55, 90, 70, 85, 65, 100, 80, 95, 85].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col gap-2 items-center group">
              <div className="w-full relative h-[240px] flex items-end">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  className={`w-full rounded-t-xl transition-all ${
                    isDark ? 'bg-white/10 group-hover:bg-emerald-500/50' : 'bg-slate-100 group-hover:bg-emerald-500/20'
                  }`}
                />
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${h * 0.7}%` }}
                  className={`absolute bottom-0 w-full rounded-t-xl bg-emerald-500 transition-all opacity-0 group-hover:opacity-100`}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">D{i+1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`col-span-1 lg:col-span-2 p-8 rounded-[2.5rem] border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className="text-lg font-bold mb-6">Recent Platform Snapshots</h3>
          <div className="space-y-4">
            {data.slice(0, 5).map((record, idx) => (
              <div key={`rec-${record.id || idx}-${idx}`} className={`flex items-center justify-between p-4 rounded-2xl border ${
                isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{new Date(record.timestamp).toLocaleDateString()}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Daily Close</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-500">${record.totalVolume.toLocaleString()}</span>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">24h Vol</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-8 rounded-[2.5rem] border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className="text-lg font-bold mb-6">Volume Distribution</h3>
          <div className="space-y-6">
            {[
              { label: 'Institutional (OTC)', pct: 65, text: 'text-emerald-500', bg: 'bg-emerald-500' },
              { label: 'Retail Trading', pct: 25, text: 'text-blue-500', bg: 'bg-blue-500' },
              { label: 'Yield Farming', pct: 10, text: 'text-purple-500', bg: 'bg-purple-500' },
            ].map(item => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{item.label}</span>
                  <span className={item.text}>{item.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    className={`h-full rounded-full ${item.bg}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
