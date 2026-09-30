import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, Save, Shield, DollarSign, Ban, Globe, Cpu, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface SystemSettings {
  id: string;
  maintenanceMode: boolean;
  minDeposit: number;
  maxWithdrawalDaily: number;
  platformFeePct: number;
  supportedNetworks: string[];
  allowNewRegistrations: boolean;
  updatedAt: string;
}

export default function AdminSettings({ theme }: { theme: 'light' | 'dark' }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'global'), (snap) => {
      if (snap.exists()) {
        setSettings({ id: snap.id, ...snap.data() } as SystemSettings);
      }
    });
    return unsub;
  }, []);

  const handleUpdate = async (updates: Partial<SystemSettings>) => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'system_settings', 'global'), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Platform Configuration</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Global institutional parameters and master system overrides.
          </p>
        </div>
        {success && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-emerald-500 font-bold text-sm"
          >
            <Shield className="w-4 h-4" />
            Synchronized to Cloud
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Risk & Fees */}
        <div className={`p-8 rounded-[2.5rem] border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 mb-8">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            <h3 className="text-xl font-bold">Risk & Liquidity</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Platform Fee Percentage</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={settings.platformFeePct}
                  onChange={(e) => handleUpdate({ platformFeePct: parseFloat(e.target.value) })}
                  className={`w-full bg-transparent border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                    isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Minimum Deposit ($)</label>
              <input 
                type="number" 
                value={settings.minDeposit}
                onChange={(e) => handleUpdate({ minDeposit: parseFloat(e.target.value) })}
                className={`w-full bg-transparent border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                  isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Daily Withdrawal Limit ($)</label>
              <input 
                type="number" 
                value={settings.maxWithdrawalDaily}
                onChange={(e) => handleUpdate({ maxWithdrawalDaily: parseFloat(e.target.value) })}
                className={`w-full bg-transparent border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                  isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Global Overrides */}
        <div className={`p-8 rounded-[2.5rem] border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 mb-8">
            <Lock className="w-6 h-6 text-emerald-500" />
            <h3 className="text-xl font-bold">Master Overrides</h3>
          </div>

          <div className="space-y-6">
            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
              settings.maintenanceMode ? 'bg-rose-500/10 border-rose-500/20' : (isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100')
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.maintenanceMode ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold block leading-none mb-1">Maintenance Mode</span>
                  <span className="text-[10px] text-slate-500 font-medium">Disables all user interactions</span>
                </div>
              </div>
              <button 
                onClick={() => handleUpdate({ maintenanceMode: !settings.maintenanceMode })}
                className={`w-12 h-6 rounded-full relative transition-all ${settings.maintenanceMode ? 'bg-rose-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.maintenanceMode ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.allowNewRegistrations ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold block leading-none mb-1">New Registrations</span>
                  <span className="text-[10px] text-slate-500 font-medium">Allow public account creation</span>
                </div>
              </div>
              <button 
                onClick={() => handleUpdate({ allowNewRegistrations: !settings.allowNewRegistrations })}
                className={`w-12 h-6 rounded-full relative transition-all ${settings.allowNewRegistrations ? 'bg-emerald-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.allowNewRegistrations ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-[10px] text-amber-500 font-bold leading-relaxed uppercase tracking-widest">
                  Caution: Modifying these parameters affects all live institutional nodes and capital flows instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-8 rounded-[2.5rem] border ${
        isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3 mb-8">
          <Globe className="w-6 h-6 text-emerald-500" />
          <h3 className="text-xl font-bold">Network Infrastructure</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {['Ethereum Mainnet', 'Solana', 'Polygon POS', 'Arbitrum One', 'Optimism', 'Avalanche C-Chain'].map(net => (
            <div key={net} className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs ${
              isDark ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
            }`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {net}
            </div>
          ))}
          <button className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed text-slate-500 hover:text-emerald-500 hover:border-emerald-500 transition-all text-xs font-bold`}>
            <RefreshCw className="w-3.5 h-3.5" />
            Add Network Node
          </button>
        </div>
      </div>
    </div>
  );
}
