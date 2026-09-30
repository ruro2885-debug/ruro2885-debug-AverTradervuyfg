import React, { useState } from 'react';
import { 
  Zap, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Info,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AiRecommendation, AiSession, TradingSchedule } from '../../types/aiTrading';
import { usePreferences } from '../../contexts/PreferencesContext';
import { aiTradingService } from '../../services/aiTradingService';
import { useAuth } from '../../contexts/AuthContext';

interface AiRecommendationListProps {
  recommendations: AiRecommendation[];
  isDark: boolean;
  session: AiSession | null;
  schedule?: TradingSchedule;
}

export default function AiRecommendationList({ recommendations, isDark, session, schedule }: AiRecommendationListProps) {
  const [selectedRec, setSelectedRec] = useState<AiRecommendation | null>(null);
  
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary}`}>
          Active Intelligence Recommendations
        </h3>
        <span className={`text-[10px] font-mono ${textSecondary}`}>
          Showing {recommendations.length} opportunities
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className={`rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} p-12 text-center`}>
          <Zap className={`w-12 h-12 mx-auto mb-4 ${textSecondary} opacity-20`} />
          <p className={`text-sm font-bold ${textSecondary}`}>
            {session?.status === 'ACTIVE' 
              ? 'AI is currently analyzing market order books. New recommendations will appear here shortly.' 
              : 'Launch an AI Session to begin receiving intelligence recommendations.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <RecommendationItem 
              key={rec.id} 
              rec={rec} 
              isDark={isDark} 
              onClick={() => setSelectedRec(rec)} 
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRec && (
          <RecommendationDetailModal 
            rec={selectedRec} 
            onClose={() => setSelectedRec(null)} 
            isDark={isDark}
            schedule={schedule}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RecommendationItem({ rec, isDark, onClick }: { rec: AiRecommendation, isDark: boolean, onClick: () => void, key?: string }) {
  const cardClasses = isDark ? 'bg-[#0B0E14] border-white/5 hover:border-[#00D09C]/30' : 'bg-white border-slate-200 hover:border-[#00D09C] shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <motion.div 
      layout
      onClick={onClick}
      className={`rounded-2xl border p-5 ${cardClasses} cursor-pointer transition-all group relative overflow-hidden`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${rec.suggestedAction === 'BUY' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            {rec.suggestedAction === 'BUY' ? (
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-500" />
            )}
          </div>
          <div>
            <h4 className={`text-lg font-black ${textPrimary}`}>{rec.asset}</h4>
            <p className={`text-[10px] font-mono font-bold ${rec.suggestedAction === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>
              SUGGESTED {rec.suggestedAction} @ ${rec.entry}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
            rec.confidence > 85 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
          }`}>
            {rec.confidence}% CONFIDENCE
          </div>
          <p className={`text-[10px] ${textSecondary} mt-1`}>Expires in 45m</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-black/10 dark:bg-white/5 rounded-xl border border-white/5">
          <p className={`text-[9px] font-black uppercase tracking-widest ${textSecondary} mb-1`}>Stop Loss</p>
          <p className={`text-xs font-mono font-bold ${textPrimary}`}>${rec.stopLoss}</p>
        </div>
        <div className="p-3 bg-black/10 dark:bg-white/5 rounded-xl border border-white/5">
          <p className={`text-[9px] font-black uppercase tracking-widest ${textSecondary} mb-1`}>Take Profit</p>
          <p className={`text-xs font-mono font-bold ${textPrimary}`}>${rec.takeProfit}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className={`text-[10px] font-bold ${textSecondary}`}>{rec.riskRating} RISK</span>
        </div>
        <ChevronRight className={`w-4 h-4 ${textSecondary} group-hover:text-[#00D09C] transition-colors`} />
      </div>
    </motion.div>
  );
}

function RecommendationDetailModal({ rec, onClose, isDark, schedule }: { rec: AiRecommendation, onClose: () => void, isDark: boolean, schedule?: TradingSchedule }) {
  const { user, addNotification } = useAuth();
  const { formatCurrency } = usePreferences();
  const [executing, setExecuting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const modalBg = isDark ? 'bg-[#0B0E14]' : 'bg-white';

  const handleExecute = async () => {
    if (!user) return;
    setExecuting(true);
    try {
      await aiTradingService.executeTrade(user.uid, rec, quantity, schedule);
      addNotification('trading', 'medium', 'Trade Executed', `${rec.suggestedAction} ${quantity} ${rec.asset} order successfully placed.`);
      onClose();
    } catch (error: any) {
      addNotification('trading', 'high', 'Execution Failed', error.message || 'Could not process trade order.');
    } finally {
      setExecuting(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await aiTradingService.updateRecommendationStatus(rec.id, 'DISMISSED');
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-2xl rounded-3xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'} ${modalBg} shadow-2xl shadow-black/50`}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#00D09C]" />
            <h2 className={`text-xl font-black ${textPrimary}`}>Intelligence Review</h2>
          </div>
          <button onClick={onClose} className={`p-2 hover:bg-white/10 rounded-full ${textSecondary}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* Top Section */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${rec.suggestedAction === 'BUY' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {rec.suggestedAction === 'BUY' ? (
                  <TrendingUp className="w-10 h-10 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-10 h-10 text-rose-500" />
                )}
              </div>
              <div>
                <h3 className={`text-3xl font-black ${textPrimary}`}>{rec.asset}</h3>
                <p className={`text-sm font-mono font-bold ${rec.suggestedAction === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  SUGGESTED {rec.suggestedAction} AT ${rec.entry}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black ${
                rec.confidence > 85 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {rec.confidence}% Confidence
              </div>
              <p className={`text-xs ${textSecondary} mt-2 flex items-center justify-end gap-1`}>
                <Clock className="w-3 h-3" /> Expires in 42m
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className={`p-6 rounded-2xl bg-black/20 border border-white/5`}>
            <h4 className={`text-xs font-black uppercase tracking-widest ${textSecondary} mb-3 flex items-center gap-2`}>
              <Info className="w-4 h-4" /> AI Rationale
            </h4>
            <p className={`text-sm leading-relaxed ${textPrimary}`}>
              {rec.explanation}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {rec.indicators?.map(ind => (
                <span key={ind} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-slate-400">
                  {ind}
                </span>
              ))}
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest ${textSecondary} mb-3`}>
                  Position Sizing
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className={`flex-1 bg-black/20 border border-white/10 rounded-xl p-3 font-mono font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                  />
                  <div className="text-right">
                    <p className={`text-[10px] ${textSecondary}`}>Total Value</p>
                    <p className={`text-sm font-bold ${textPrimary}`}>{formatCurrency(quantity * rec.entry)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest ${textSecondary} mb-3`}>
                  Risk Exposure
                </label>
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-rose-500">Max Potential Loss</span>
                      <span className="text-sm font-mono font-bold text-rose-400">-{formatCurrency((rec.entry - rec.stopLoss) * quantity)}</span>
                   </div>
                   <div className="w-full h-1.5 bg-rose-500/10 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: '15%' }} />
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                <p className={`text-[10px] font-black uppercase tracking-widest ${textSecondary} mb-1`}>Exit Parameters</p>
                <div className="space-y-3 mt-4">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-rose-400">Stop Loss</span>
                      <span className={`text-sm font-mono font-bold ${textPrimary}`}>${rec.stopLoss}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-emerald-400">Take Profit</span>
                      <span className={`text-sm font-mono font-bold ${textPrimary}`}>${rec.takeProfit}</span>
                   </div>
                   <div className="flex justify-between items-center border-t border-white/5 pt-3">
                      <span className={`text-xs font-medium ${textSecondary}`}>Risk/Reward</span>
                      <span className={`text-sm font-mono font-bold ${textPrimary}`}>1:3.2</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-black/30 border-t border-white/5 flex items-center justify-between gap-4">
           <button 
             onClick={handleDismiss}
             className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all hover:bg-white/5 ${textSecondary}`}
           >
             Dismiss Intelligence
           </button>
           <button 
             onClick={handleExecute}
             disabled={executing}
             className="flex-[2] py-4 bg-[#00D09C] hover:bg-[#00B585] text-black rounded-2xl text-xs font-black transition-all shadow-lg shadow-[#00D09C]/20 flex items-center justify-center gap-2"
           >
             {executing ? (
               <RefreshCcw className="w-4 h-4 animate-spin" />
             ) : (
               <CheckCircle2 className="w-4 h-4" />
             )}
             {executing ? 'Executing Strategy...' : 'Authorize Execution'}
           </button>
        </div>
      </motion.div>
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
