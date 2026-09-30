import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldCheck, AlertTriangle, Clock, RefreshCw, Server, Database, Globe, Zap } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface HealthStatus {
  id: string;
  status: 'operational' | 'degraded' | 'maintenance';
  uptimePct: number;
  responseTimeMs: number;
  lastChecked: string;
  activeIncidents: number;
}

export default function AdminSystemHealth({ theme }: { theme: 'light' | 'dark' }) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'platform_health', 'current'), (snap) => {
      if (snap.exists()) {
        setHealth({ id: snap.id, ...snap.data() } as HealthStatus);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const systems = [
    { name: 'Core API Terminal', status: 'operational', load: '12%', latency: '45ms' },
    { name: 'Firestore Enterprise Cluster', status: 'operational', load: '8%', latency: '12ms' },
    { name: 'Institutional Auth Gateway', status: 'operational', load: '4%', latency: '28ms' },
    { name: 'Cross-chain Node Bridge', status: health?.status || 'operational', load: '24%', latency: '110ms' },
    { name: 'AI Neural Compute Hub', status: 'operational', load: '45%', latency: '850ms' },
    { name: 'Global Asset Oracle', status: 'operational', load: '2%', latency: '5ms' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Platform Pulse</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time infrastructure diagnostic and institutional system health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auto-refresh active</span>
          <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin-slow" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center text-center ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            health?.status === 'operational' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
          }`}>
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Systems Status</h3>
          <p className={`text-sm font-black uppercase tracking-widest ${
            health?.status === 'operational' ? 'text-emerald-500' : 'text-amber-500'
          }`}>
            {health?.status || 'OPERATIONAL'}
          </p>
        </div>

        <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center text-center ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
            <Globe className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Global Uptime</h3>
          <p className="text-sm font-black uppercase tracking-widest text-blue-500">
            {health?.uptimePct || '99.99'}% Available
          </p>
        </div>

        <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center text-center ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
            <Zap className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Avg Latency</h3>
          <p className="text-sm font-black uppercase tracking-widest text-purple-500">
            {health?.responseTimeMs || '42'}ms Responsive
          </p>
        </div>
      </div>

      <div className={`p-8 rounded-[2.5rem] border ${
        isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-emerald-500" />
            <h3 className="text-xl font-bold">Microservice Inventory</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{systems.length} Modules Online</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systems.map((sys) => (
            <div key={sys.name} className={`p-5 rounded-2xl border transition-all ${
              isDark ? 'bg-white/5 border-white/5 hover:border-emerald-500/20' : 'bg-slate-50 border-slate-100 hover:border-emerald-500/30'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-sm font-bold max-w-[150px]">{sys.name}</h4>
                <div className={`w-2 h-2 rounded-full ${
                  sys.status === 'operational' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`} />
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Load: {sys.load}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {sys.latency}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`p-8 rounded-[2.5rem] border flex items-center justify-between ${
        isDark ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50 border-rose-100'
      }`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-rose-500">Active Critical Incidents</h4>
            <p className="text-xs text-rose-500/70 font-medium">Platform-wide events requiring immediate engineering response.</p>
          </div>
        </div>
        <div className="text-4xl font-black text-rose-500">{health?.activeIncidents || 0}</div>
      </div>
    </div>
  );
}
