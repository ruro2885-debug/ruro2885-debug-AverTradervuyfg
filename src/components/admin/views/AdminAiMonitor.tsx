import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bot, Search, Play, Square, Activity, Zap, TrendingUp, AlertCircle, Cpu, Globe } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface AiSession {
  id: string;
  userId: string;
  status: 'active' | 'completed' | 'error';
  startTime: string;
  marketsScanned: string[];
}

interface Recommendation {
  id: string;
  userId: string;
  asset: string;
  suggestedAction: string;
  confidence: number;
  status: string;
  createdAt: string;
}

export default function AdminAiMonitor({ theme }: { theme: 'light' | 'dark' }) {
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  useEffect(() => {
    // Recent Sessions
    const qSessions = query(collection(db, 'aiSessions'), orderBy('startTime', 'desc'), limit(100));
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiSession)));
    });

    // Recent Recommendations
    const qRecs = query(collection(db, 'aiRecommendations'), orderBy('createdAt', 'desc'), limit(10));
    const unsubRecs = onSnapshot(qRecs, (snap) => {
      setRecommendations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recommendation)));
      setLoading(false);
    });

    return () => {
      unsubSessions();
      unsubRecs();
    };
  }, []);

  const activeSessionsCount = sessions.filter(s => String(s.status || '').toUpperCase() === 'ACTIVE').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">AI Trading Monitor</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time neural engine oversight and automated recommendation audit.
          </p>
        </div>
        <div className={`px-6 py-3 rounded-2xl border flex items-center gap-4 ${
          isDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-black text-emerald-500 uppercase tracking-widest">{activeSessionsCount} Active Sessions</span>
          </div>
          <Zap className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Active Sessions */}
        <div className="xl:col-span-2 space-y-6">
          <div className={`p-8 rounded-[2.5rem] border ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Cpu className="w-6 h-6 text-emerald-500" />
                <h3 className="text-xl font-bold">In-Flight Neural Sessions</h3>
              </div>
              <button className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-emerald-500 transition-colors">
                View All Clusters
              </button>
            </div>

            <div className="space-y-4">
              {sessions.map((session, idx) => (
                <div key={`sess-${session.id || idx}-${idx}`} className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${
                  isDark ? 'bg-white/5 border-white/5 hover:border-emerald-500/30' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      session.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {session.status === 'active' ? <Activity className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">User: {session.userId}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${
                          session.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {session.marketsScanned?.length || 0} Markets
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          Started: {new Date(session.startTime).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-500">
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="py-12 text-center opacity-30 space-y-2">
                  <Bot className="w-12 h-12 mx-auto" />
                  <p className="text-sm font-bold">No trading sessions active</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className={`p-8 rounded-[2.5rem] border ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
                <h3 className="text-xl font-bold">Alpha Generation Rate</h3>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
            </div>
            <div className="h-[200px] flex items-end gap-1">
              {Array.from({ length: 40 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 rounded-t-sm transition-all bg-emerald-500/20 hover:bg-emerald-500`}
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Recent Recommendations */}
        <div className={`p-8 rounded-[2.5rem] border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 mb-8">
            <Zap className="w-6 h-6 text-emerald-500" />
            <h3 className="text-xl font-bold">Neural Output</h3>
          </div>

          <div className="space-y-6">
            {recommendations.map((rec, idx) => (
              <div key={`rec-${rec.id || idx}-${idx}`} className="relative pl-6 border-l border-emerald-500/20 py-1">
                <div className="absolute top-2 -left-1.5 w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-black">{rec.asset}</h4>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    rec.suggestedAction === 'BUY' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {rec.suggestedAction}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                  <span>Conf: {(rec.confidence * 100).toFixed(1)}%</span>
                  <span>{new Date(rec.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} line-clamp-2`}>
                  Neural model detected high volatility breakout with strong support cluster at entry level.
                </p>
              </div>
            ))}
            {recommendations.length === 0 && (
              <div className="py-20 text-center opacity-30 space-y-2">
                <AlertCircle className="w-12 h-12 mx-auto" />
                <p className="text-sm font-bold">No neural output recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
