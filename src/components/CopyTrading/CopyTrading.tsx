import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ShieldCheck } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TraderProfile } from '../../types/trading';
import { getAvatarDataUrl } from '../../utils/avatarGenerator';

export default function CopyTrading({ theme }: { theme: 'light' | 'dark' }) {
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const isDark = theme === 'dark';

  useEffect(() => {
    const tradersRef = collection(db, 'traderProfiles');
    const unsub = onSnapshot(tradersRef, (snap) => {
      setTraders(snap.docs.map(d => ({ id: d.id, ...d.data() })) as TraderProfile[]);
    });

    return () => unsub();
  }, []);

  // Sort traders by rank
  const top10 = [...traders].sort((a, b) => a.rank - b.rank).slice(0, 10);

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <Trophy className="text-emerald-500" />
          Live Leaderboard
        </h2>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {top10.map((trader) => (
            <motion.div 
              key={trader.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-xl font-black text-gray-500 w-8">#{trader.rank}</span>
                <img 
                  src={trader.avatar || getAvatarDataUrl(trader.username || trader.id)} 
                  alt={trader.username} 
                  className="w-12 h-12 rounded-full object-cover shadow-sm" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getAvatarDataUrl(trader.username || trader.id);
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{trader.username}</span>
                    {trader.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <span className="text-xs text-gray-400">{trader.strategy}</span>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`text-lg font-black ${trader.return30d > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {trader.return30d > 0 ? '+' : ''}{trader.return30d.toFixed(1)}%
                </span>
                <div className="text-xs text-gray-400">30d Return</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
