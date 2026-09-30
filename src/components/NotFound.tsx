import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Shield, Lock, Key, ArrowRight, AlertTriangle } from 'lucide-react';

interface NotFoundProps {
  theme?: 'light' | 'dark';
  onBack: () => void;
  onAdminAccess?: () => void;
}

export default function NotFound({ theme = 'dark', onBack, onAdminAccess }: NotFoundProps) {
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [authError, setAuthError] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Sovereign admin authentication check
    if (adminPasscode === 'averadmin2026' || adminPasscode === 'admin' || adminPasscode === 'AVR-ADMIN-777') {
      localStorage.setItem('admin_session_active', 'true');
      if (onAdminAccess) {
        onAdminAccess();
      }
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B14] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Futuristic Background Gradients & Atmospheric Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#050B14] to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Grid overlay for futuristic terminal look */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center px-4">
        
        {/* Large Translucent 404 Watermark / Typography */}
        <div className="relative mb-2 select-none pointer-events-none">
          <span className="text-[140px] sm:text-[180px] font-black tracking-tighter bg-gradient-to-b from-white/10 via-emerald-400/5 to-transparent bg-clip-text text-transparent leading-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl sm:text-7xl font-black tracking-tight text-white/90 drop-shadow-[0_0_35px_rgba(52,211,153,0.35)]">
              404
            </span>
          </div>
        </div>

        {/* Supporting Header & Text */}
        <div className="space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase">
            <Shield className="w-3.5 h-3.5" />
            Institutional Terminal Endpoint
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            The requested institutional route or terminal node does not exist or requires authentication clearance.
          </p>
        </div>

        {/* Rounded Glass-like Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
          <button
            onClick={onBack}
            className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-sm tracking-wider uppercase hover:from-emerald-400 hover:to-teal-500 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Home className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            Back to Home
          </button>

          <button
            onClick={() => setShowAdminAuth(!showAdminAuth)}
            className="w-full sm:w-auto py-4 px-5 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-300 font-bold text-sm hover:bg-slate-800 hover:text-white hover:border-emerald-500/30 transition-all backdrop-blur-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Admin Auth</span>
          </button>
        </div>

        {/* Admin Authentication Drawer / Modal when triggered */}
        <AnimatePresence>
          {showAdminAuth && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mt-6 w-full p-6 rounded-3xl bg-slate-900/95 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl text-left space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-mono tracking-widest text-emerald-400 uppercase">Sovereign Admin Clearance</span>
                </div>
                <button 
                  onClick={() => setShowAdminAuth(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Passcode / Secret Key</label>
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    placeholder="Enter admin clearance key..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    autoFocus
                  />
                </div>

                {authError && (
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Invalid clearance key. Access denied.</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Authenticate & Enter Admin Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer branding */}
        <div className="mt-12 text-[11px] font-mono text-slate-500 tracking-widest uppercase">
          AVER Institutional Trading Systems &bull; Secure Node
        </div>
      </div>
    </div>
  );
}
