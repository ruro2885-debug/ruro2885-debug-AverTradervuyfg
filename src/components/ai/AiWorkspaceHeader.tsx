import { Play, Square, Activity, AlertCircle, Clock, Moon, ShieldAlert, PauseCircle, CheckCircle2, Lock } from 'lucide-react';
import { AiSession } from '../../types/aiTrading';
import { EngineStatus } from '../../services/aiTradingService';

interface AiWorkspaceHeaderProps {
  session: AiSession | null;
  engineStatus: EngineStatus;
  onStart: () => void;
  onEnd: () => void;
  isDark: boolean;
  hasPrefs: boolean;
  disabled?: boolean;
}

export default function AiWorkspaceHeader({ session, engineStatus, onStart, onEnd, isDark, hasPrefs, disabled }: AiWorkspaceHeaderProps) {
  const isActive = session?.status === 'ACTIVE';

  const getStateBadgeStyle = (state: string) => {
    switch (state) {
      case 'RUNNING':
      case 'SESSION_SCANNING':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
      case 'WAITING':
      case 'PAUSED':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      case 'COOLING_BREAK':
        return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500';
      case 'RISK_LOCK':
      case 'EMERGENCY_STOP':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-500';
      case 'MARKET_CLOSED':
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500';
      case 'SESSION_COMPLETE':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-500';
      default:
        return 'bg-slate-500/10 border-slate-500/20 text-slate-400';
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'RUNNING': return 'AI Running';
      case 'SESSION_SCANNING': return 'Scanning Markets';
      case 'WAITING': return 'Window Standby';
      case 'PAUSED': return 'Trading Paused';
      case 'COOLING_BREAK': return 'Cooling Break';
      case 'RISK_LOCK': return 'Risk Lockout';
      case 'MARKET_CLOSED': return 'Market Closed';
      case 'EMERGENCY_STOP': return 'Emergency Stop';
      case 'SESSION_COMPLETE': return 'Session Complete';
      case 'SLEEPING': return 'AI Sleeping';
      default: return 'Inactive';
    }
  };
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          AI Trading Workspace
        </h1>
        {isActive ? (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStateBadgeStyle(engineStatus?.state || 'INACTIVE')}`}>
            <span className="flex h-2 w-2 relative">
              {(engineStatus?.state === 'RUNNING' || engineStatus?.state === 'SESSION_SCANNING') && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                engineStatus?.state === 'RUNNING' || engineStatus?.state === 'SESSION_SCANNING' ? 'bg-emerald-500' : 'bg-current'
              }`}></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {getStateLabel(engineStatus?.state || 'INACTIVE')}
            </span>
            {engineStatus?.countdownText && (
              <span className="text-[10px] font-mono font-bold opacity-80 border-l border-current/20 pl-2">
                {engineStatus.countdownText}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inactive</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {!hasPrefs ? (
          <div className="flex items-center gap-2 text-amber-500 text-xs font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>Please configure your AI Profile first</span>
          </div>
        ) : isActive ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onEnd}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-rose-500/20"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Terminate Session</span>
            </button>
            
            {engineStatus?.reason && !engineStatus.reason.includes('Continuous Mode') && (
              <div className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-xl text-[11px] font-semibold ${getStateBadgeStyle(engineStatus?.state || 'INACTIVE')}`}>
                {engineStatus?.state === 'RISK_LOCK' || engineStatus?.state === 'EMERGENCY_STOP' ? <ShieldAlert className="w-3.5 h-3.5" /> :
                 engineStatus?.state === 'PAUSED' ? <PauseCircle className="w-3.5 h-3.5" /> :
                 engineStatus?.state === 'SESSION_COMPLETE' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                 <Clock className="w-3.5 h-3.5" />}
                <span>{engineStatus.reason}</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={disabled ? undefined : onStart}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg ${
              disabled 
                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/20 shadow-none'
                : 'bg-[#00D09C] hover:bg-[#00B585] text-black active:scale-95 shadow-[#00D09C]/20'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch session</span>
          </button>
        )}
      </div>
    </div>
  );
}
