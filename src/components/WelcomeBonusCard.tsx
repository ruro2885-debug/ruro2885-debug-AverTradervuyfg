import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Gift, Sparkles, Coins, Gem, Zap, Lock, Users, DollarSign, ArrowRight } from 'lucide-react';

interface WelcomeBonusCardProps {
  theme: 'light' | 'dark';
  onCtaClick?: () => void;
}

export default function WelcomeBonusCard({ theme, onCtaClick }: WelcomeBonusCardProps) {
  const isDark = theme === 'dark';
  const [bonusCount, setBonusCount] = useState(0);

  // Smooth ease-out counter from $0 to $150 on page load
  useEffect(() => {
    let start = 0;
    const end = 150;
    const duration = 1600; // 1.6 seconds
    const startTime = performance.now();

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Cubic ease-out curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(easeProgress * end);
      
      setBonusCount(current);

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };

    requestAnimationFrame(animateCount);
  }, []);

  return (
    <div className={`relative w-full max-w-xl p-4 sm:p-5 rounded-3xl border overflow-hidden backdrop-blur-xl transition-all shadow-2xl ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900/60 via-black/80 to-slate-950/70 border-white/10 shadow-black/80 text-white' 
        : 'bg-gradient-to-br from-white/90 via-slate-50/80 to-slate-100/90 border-slate-200/80 shadow-slate-200/50 text-slate-900'
    }`}>
      
      {/* Moving background glowing orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 20, 0],
            y: [0, -20, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-[60px]" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -30, 0],
            y: [0, 30, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-amber-500/10 blur-[70px]" 
        />
      </div>

      {/* FLOATING CRYPTO COIN BADGES with staggered motion */}
      {/* 1. Bitcoin */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, 3, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`absolute top-4 left-4 z-10 py-1 px-2.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-lg select-none ${
          isDark 
            ? 'bg-amber-950/40 border-amber-500/20 text-amber-400 shadow-amber-950/20' 
            : 'bg-amber-50 border-amber-200 text-amber-600 shadow-amber-100/30'
        }`}
      >
        <Coins className="w-3 h-3 text-amber-500 animate-spin-slow" />
        <span>BTC</span>
      </motion.div>

      {/* 2. Ethereum */}
      <motion.div
        animate={{
          y: [0, -12, 0],
          rotate: [0, -4, 0]
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
        className={`absolute top-6 right-6 z-10 py-1 px-2.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-lg select-none ${
          isDark 
            ? 'bg-purple-950/40 border-purple-500/20 text-purple-400 shadow-purple-950/20' 
            : 'bg-purple-50 border-purple-200 text-purple-600 shadow-purple-100/30'
        }`}
      >
        <Gem className="w-3 h-3 text-purple-400" />
        <span>ETH</span>
      </motion.div>

      {/* 3. Solana */}
      <motion.div
        animate={{
          y: [0, -8, 0],
          rotate: [0, 5, 0]
        }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2
        }}
        className={`absolute bottom-4 left-6 z-10 py-1 px-2.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-lg select-none ${
          isDark 
            ? 'bg-teal-950/40 border-teal-500/20 text-teal-400 shadow-teal-950/20' 
            : 'bg-teal-50 border-teal-200 text-teal-600 shadow-teal-100/30'
        }`}
      >
        <Zap className="w-3 h-3 text-teal-400" />
        <span>SOL</span>
      </motion.div>

      {/* 4. BNB */}
      <motion.div
        animate={{
          y: [0, -9, 0],
          rotate: [0, -3, 0]
        }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.7
        }}
        className={`absolute bottom-5 right-4 z-10 py-1 px-2.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-lg select-none ${
          isDark 
            ? 'bg-yellow-950/40 border-yellow-500/20 text-yellow-400 shadow-yellow-950/20' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-600 shadow-yellow-100/30'
        }`}
      >
        <DollarSign className="w-3 h-3 text-yellow-500" />
        <span>BNB</span>
      </motion.div>

      {/* Core visual layout */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-2.5">
        
        {/* Slowly rotating floating Gift Box with glowing light */}
        <div className="relative pt-1">
          {/* Glowing Aura Effect */}
          <motion.div 
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 m-auto w-14 h-14 bg-amber-500/30 rounded-full blur-[20px] z-0"
          />
          
          <motion.div
            animate={{
              y: [0, -8, 0],
              rotate: [0, 8, -8, 0]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xl relative z-10 ${
              isDark 
                ? 'bg-gradient-to-b from-[#161c2b] to-[#0b0f19] border-amber-500/30 shadow-amber-500/10' 
                : 'bg-gradient-to-b from-amber-50 to-yellow-50 border-amber-300 shadow-amber-500/20'
            }`}
          >
            <Gift className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            
            {/* Sparkling particles on the box */}
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="w-3 h-3 text-yellow-400" />
            </motion.div>
          </motion.div>
        </div>

        {/* Headline & Subheadline */}
        <div className="space-y-1 max-w-sm">
          <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight leading-tight">
            🎁 Sign Up & Get Up to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
              ${bonusCount}
            </span>{' '}
            Welcome Bonus
          </h2>
          <p className={`text-xs sm:text-sm leading-relaxed font-sans font-semibold ${
            isDark ? 'text-gray-400' : 'text-slate-600'
          }`}>
            Join thousands of traders and unlock exclusive rewards when you create your account.
          </p>
        </div>

        {/* FEATURE CARDS (Grid Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md pt-0.5">
          
          {/* Feature 1: Bonus */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className={`p-2.5 rounded-xl border flex items-center space-x-3 text-left transition-colors ${
              isDark 
                ? 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-amber-500/20' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-amber-300'
            }`}
          >
            <div className={`p-2 rounded-lg flex-shrink-0 ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-sans font-bold leading-none">Welcome Bonus</p>
              <p className="text-[10px] font-mono font-bold text-emerald-500 mt-1">Up to $150 Rewards</p>
            </div>
          </motion.div>

          {/* Feature 2: Referrals */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className={`p-2.5 rounded-xl border flex items-center space-x-3 text-left transition-colors ${
              isDark 
                ? 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-emerald-500/20' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-emerald-300'
            }`}
          >
            <div className={`p-2 rounded-lg flex-shrink-0 ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-sans font-bold leading-none">Extra Referral Rewards</p>
              <p className="text-[10px] font-mono font-bold text-emerald-500 mt-1">Boost with friends</p>
            </div>
          </motion.div>

        </div>

      </div>

    </div>
  );
}
