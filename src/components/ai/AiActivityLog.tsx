import React from 'react';
import { 
  Activity, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Radio, 
  Clock,
  ShieldCheck
} from 'lucide-react';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';
  message: string;
  source: string;
}

interface AiActivityLogProps {
  events: ActivityEvent[];
  isDark: boolean;
}

export default function AiActivityLog({ events, isDark }: AiActivityLogProps) {
  const cardClasses = isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`rounded-2xl border ${cardClasses} overflow-hidden`}>
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
          <Activity className="w-4 h-4 text-[#00D09C]" /> Neural Activities Log
        </h3>
        <span className="text-[10px] font-mono text-[#00D09C] flex items-center gap-1">
          <Radio className="w-3 h-3 text-[#00D09C] animate-pulse" /> Live System Events
        </span>
      </div>

      <div className="divide-y divide-white/5 max-h-[350px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-12 text-center text-xs">
            <p className={`${textSecondary} opacity-40`}>No recent activity events.</p>
          </div>
        ) : (
          events.map((ev, idx) => (
            <div key={`${ev.id}-${idx}`} className="p-4 hover:bg-white/5 transition-colors flex gap-3.5 items-start">
              <div className="mt-0.5">
                {ev.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {ev.type === 'INFO' && <Info className="w-4 h-4 text-blue-500" />}
                {ev.type === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                {ev.type === 'ALERT' && <Sparkles className="w-4 h-4 text-[#00D09C]" />}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className={`font-black uppercase ${
                    ev.type === 'SUCCESS' ? 'text-emerald-500' :
                    ev.type === 'INFO' ? 'text-blue-500' :
                    ev.type === 'WARNING' ? 'text-amber-500' : 'text-[#00D09C]'
                  }`}>{ev.type}</span>
                  <span className={textSecondary}>{ev.timestamp}</span>
                </div>
                <p className={`text-xs ${textPrimary}`}>{ev.message}</p>
                <p className={`text-[9px] font-mono font-bold uppercase ${textSecondary} opacity-60`}>
                  Source: {ev.source}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
