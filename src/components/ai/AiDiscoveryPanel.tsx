import React from 'react';
import { Search, CheckCircle2, Clock, XCircle, Zap } from 'lucide-react';
import { AiSession, AiRecommendation, AiConfiguration } from '../../types/aiTrading';
import { motion } from 'motion/react';

import CoinLogo from '../CoinLogo';

interface AiDiscoveryPanelProps {
  session: AiSession | null;
  config: AiConfiguration | null;
  recommendations: AiRecommendation[];
  isDark: boolean;
  liveStates?: Record<string, string>;
}

export default function AiDiscoveryPanel({ session, config, recommendations, isDark, liveStates }: AiDiscoveryPanelProps) {
  const cardClasses = isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const markets = config?.aiTradingRules?.assetSelection || [];
  
  return (
    <div className={`rounded-2xl border ${cardClasses} overflow-hidden`}>
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
          <Search className="w-4 h-4" /> Market Discovery Engine
        </h3>
        <span className="text-[10px] font-mono text-[#00D09C]">
          {session ? 'Scanning Active' : config ? 'Ready' : 'Waiting for Configuration'}
        </span>
      </div>
      
      {markets.length === 0 ? (
        <div className={`p-8 text-center ${textSecondary} text-xs font-mono`}>
          No trading pairs selected. Please save a configuration to begin.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 divide-x divide-y divide-white/5 border-b border-white/5">
          {markets.map((asset, i) => {
            const hasRec = recommendations.some(r => r.asset === asset && r.status === 'PENDING');
            const isScanning = session && !hasRec && i % 3 === 0;
            const liveState = liveStates?.[asset];
            
            return (
              <div key={asset} className="p-6 flex flex-col items-center gap-4 hover:bg-white/2 transition-colors border-r border-b border-white/5">
                <div className="flex flex-col items-center gap-2">
                  <CoinLogo symbol={asset} size={28} />
                  <span className={`text-sm font-black tracking-wider ${textPrimary}`}>{asset}</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center justify-center">
                  {liveState ? (
                    <>
                      {(() => {
                        const stateLower = liveState.toLowerCase();
                        if (stateLower.includes('scan') || stateLower.includes('analyz')) {
                          return (
                            <>
                              <motion.div 
                                animate={{ rotate: 360 }} 
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <RefreshCcw className="w-3 h-3 text-[#00D09C]" />
                              </motion.div>
                              <span className="text-[8px] font-black uppercase text-[#00D09C]">{liveState}</span>
                            </>
                          );
                        } else if (stateLower.includes('found') || stateLower.includes('high') || stateLower.includes('open')) {
                          return (
                            <>
                              <Zap className="w-3 h-3 text-amber-500 animate-pulse" />
                              <span className="text-[8px] font-black uppercase text-amber-500">{liveState}</span>
                            </>
                          );
                        } else if (stateLower.includes('enter') || stateLower.includes('running') || stateLower.includes('manag')) {
                          return (
                            <>
                              <span className="flex h-1.5 w-1.5 relative my-0.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              <span className="text-[8px] font-black uppercase text-emerald-500">{liveState}</span>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <CheckCircle2 className={`w-3 h-3 ${textSecondary} opacity-40`} />
                              <span className={`text-[8px] font-black uppercase ${textSecondary} opacity-60`}>{liveState}</span>
                            </>
                          );
                        }
                      })()}
                    </>
                  ) : hasRec ? (
                    <>
                      <Zap className="w-3 h-3 text-amber-500 animate-pulse" />
                      <span className="text-[8px] font-black uppercase text-amber-500">Opportunity</span>
                    </>
                  ) : isScanning ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <RefreshCcw className="w-3 h-3 text-[#00D09C]" />
                      </motion.div>
                      <span className="text-[8px] font-black uppercase text-[#00D09C]">Scanning</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className={`w-3 h-3 ${textSecondary} opacity-20`} />
                      <span className={`text-[8px] font-black uppercase ${textSecondary} opacity-40`}>
                        {session ? 'No Entry' : 'Ready'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="p-4 bg-black/20 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${session ? 'bg-[#00D09C]' : 'bg-slate-700'}`} />
            <span className={textSecondary}>Analyzed: 1,200</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${recommendations.length > 0 ? 'bg-amber-500' : 'bg-slate-700'}`} />
            <span className={textSecondary}>Alerts: {recommendations.length}</span>
          </div>
        </div>
        <div className={textSecondary}>
          Cycle Speed: {1.2}ms
        </div>
      </div>
    </div>
  );
}

function RefreshCcw(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
