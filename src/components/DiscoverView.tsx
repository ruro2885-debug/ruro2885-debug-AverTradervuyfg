import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Users, Sparkles, Flame, Calendar, BookOpen, ChevronRight, 
  PlayCircle, LifeBuoy, Zap, Layers, Cpu, BarChart2, CheckCircle2, ShieldCheck, 
  ArrowUpRight, Clock, Activity, Sliders, X, Radio, Rocket, Lock, Star, Bell, Tag, Ticket
} from 'lucide-react';
import CoinLogo from './CoinLogo';
import { usePreferences } from '../contexts/PreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import CopyTradeDashboard from './copytrade/CopyTradeDashboard';

// Institutional-grade AI Strategies Dataset with Advisor Insights
export default function DiscoverView({ 
  theme, 
  onOpenMarketHighlights, 
  onOpenEventsPromos, 
  onOpenSupportCenter,
  onOpenStrategies
}: { 
  theme: 'light' | 'dark', 
  onOpenMarketHighlights: () => void, 
  onOpenEventsPromos: () => void,
  onOpenSupportCenter: () => void,
  onOpenStrategies: () => void
}) {
  const isDark = theme === 'dark';
  const { t } = usePreferences();
  const { user, updateProfile } = useAuth();
  
  const [showCopyTrade, setShowCopyTrade] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  // Compute user-scoped storage key so new users start fresh and NOT hardcoded
  const userStorageKey = user?.uid 
    ? `aver2_notified_user_${user.uid}` 
    : (user?.email ? `aver2_notified_email_${user.email}` : null);

  const [isNotified, setIsNotified] = useState(false);

  // Synchronize on mount and when user changes
  useEffect(() => {
    // Purge legacy global key that caused all users to be hardcoded to notified
    try {
      localStorage.removeItem('aver2_notified');
    } catch (e) {}

    if (!userStorageKey) {
      setIsNotified(false);
      return;
    }

    try {
      const stored = localStorage.getItem(userStorageKey);
      const profileFlag = Boolean((user as any)?.aver2Notified);
      setIsNotified(stored === 'true' || profileFlag);
    } catch (e) {
      setIsNotified(false);
    }
  }, [userStorageKey, user?.uid]);

  const handleNotifyClick = () => {
    const nextState = !isNotified;
    setIsNotified(nextState);
    if (userStorageKey) {
      try {
        if (nextState) {
          localStorage.setItem(userStorageKey, 'true');
        } else {
          localStorage.removeItem(userStorageKey);
        }
      } catch (e) {}
    }
    if (user?.uid && updateProfile) {
      updateProfile({
        aver2Notified: nextState
      } as any, undefined, undefined, true);
    }
  };
  
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardClasses = isDark
    ? "bg-slate-900/40 backdrop-blur-md border border-white/5 shadow-xl"
    : "bg-white/60 backdrop-blur-md border border-slate-200/50 shadow-lg";

  const [trendingAssets, setTrendingAssets] = useState<any[]>([]);

  useEffect(() => {
    // Dynamic Trending Assets
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/trending');
        const data = await res.json();
        
        if (data && data.coins) {
          setTrendingAssets(data.coins.slice(0, 3).map((c: any) => {
            const usdPrice = c.item.data?.price || `$${(c.item.price_btc * 65000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const changeVal = c.item.data?.price_change_percentage_24h?.usd;
            const changeStr = typeof changeVal === 'number' 
              ? `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(2)}%`
              : '+5.0%';
            const isPositive = typeof changeVal === 'number' ? changeVal >= 0 : true;

            return {
              symbol: c.item.symbol,
              name: c.item.name,
              price: usdPrice,
              change: changeStr,
              isPositive
            };
          }));
        } else {
          // Fallback if API rate limited
          setTrendingAssets([
            { symbol: 'SOL', name: 'Solana', price: '$143.20', change: '+5.4%', isPositive: true },
            { symbol: 'AVAX', name: 'Avalanche', price: '$35.12', change: '+2.1%', isPositive: true },
            { symbol: 'INJ', name: 'Injective', price: '$28.40', change: '-1.2%', isPositive: false }
          ]);
        }
      } catch (e) {
        console.error("Failed to fetch trending:", e);
        // Fallback
        setTrendingAssets([
          { symbol: 'SOL', name: 'Solana', price: '$143.20', change: '+5.4%', isPositive: true },
          { symbol: 'AVAX', name: 'Avalanche', price: '$35.12', change: '+2.1%', isPositive: true },
          { symbol: 'INJ', name: 'Injective', price: '$28.40', change: '-1.2%', isPositive: false }
        ]);
      }
    };
    fetchTrending();
  }, []);

  if (showCopyTrade) {
    return (
      <CopyTradeDashboard 
        theme={theme} 
        onBack={() => setShowCopyTrade(false)} 
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-6"
    >
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${textPrimary}`}>{t('common.discover_title')}</h2>
          <p className={`text-sm ${textSecondary} mt-1`}>{t('common.discover_subtitle')}</p>
        </div>
      </div>

      {/* ELEGANT COMPACT BANNER: AVER 2.0 IS COMING SOON */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative group rounded-3xl overflow-hidden p-6 sm:p-8 border border-white/10 bg-slate-950 shadow-xl my-2"
      >
        {/* CINEMATIC BACKGROUND IMAGE WITH SUBTLE MOVEMENT */}
        <motion.div 
          className="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-luminosity scale-105 transition-transform duration-1000 group-hover:scale-110 pointer-events-none"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2000&auto=format&fit=crop')` 
          }}
        />

        {/* ELEGANT DARK GRADIENT OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#060810] via-[#060810]/90 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060810] via-transparent to-transparent pointer-events-none" />

        {/* CONTENT LAYOUT */}
        <div className="relative z-10 max-w-xl space-y-3.5 text-left">
          {/* TITLE */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans uppercase">
            AVER 2.0 IS COMING SOON
          </h2>

          {/* DESCRIPTION */}
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
            Experience the next generation of intelligent investing, premium automation, and institutional-grade trading technology.
          </p>

          {/* SINGLE NOTIFY ME BUTTON */}
          <div className="pt-2">
            <button
              onClick={handleNotifyClick}
              disabled={isNotified}
              className={`py-3 px-6 rounded-2xl font-bold text-xs tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                isNotified 
                  ? 'bg-[#042f2e]/60 border border-emerald-500/50 text-emerald-400 cursor-default' 
                  : 'bg-white hover:bg-slate-100 text-slate-950 shadow-white/10 cursor-pointer'
              }`}
            >
              <Bell className={`w-4 h-4 ${isNotified ? 'text-emerald-400 fill-emerald-400' : 'text-slate-950'}`} />
              <span>{isNotified ? 'NOTIFIED' : 'NOTIFY ME'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* AVER 2.0 ROADMAP MODAL */}
      <AnimatePresence>
        {showRoadmapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-indigo-500/30 p-6 sm:p-8 text-white shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Aver 2.0 Roadmap & Features</h3>
                    <p className="text-xs text-slate-400">Target Launch: Q3 2026</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRoadmapModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 uppercase tracking-wider text-[10px]">Phase 1 • Core Infrastructure</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Completed</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Ultra-Low Latency Order Matching Engine</h4>
                  <p className="text-slate-300 leading-relaxed">Multi-threaded Rust order matching capable of handling 500,000 requests per second with microsecond latency.</p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Phase 2 • AI Neural Copilot</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">In Testing</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Autonomous Algorithmic Strategy Execution</h4>
                  <p className="text-slate-300 leading-relaxed">Predictive deep-learning models trained on 10+ years of institutional orderflow data for sentiment & arbitrage execution.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-400 uppercase tracking-wider text-[10px]">Phase 3 • Cross-Chain Vaults</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-bold">Upcoming</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Multi-Asset Yield & Liquidity Aggregation</h4>
                  <p className="text-slate-300 leading-relaxed">Direct connection to tier-1 liquidity venues and decentralized protocol vaults with automated risk hedging.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    if (!isNotified) {
                      handleNotifyClick();
                    }
                    setShowRoadmapModal(false);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-xs tracking-wider uppercase hover:opacity-90 transition shadow-xl cursor-pointer"
                >
                  {isNotified ? 'Already on Priority Access List' : 'Join VIP Priority Early Access List'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Grid: Trending & AI Strategies */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Col: Trending Assets (4 Cols on lg) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-end mb-3">
              <h3 className={`text-lg font-bold ${textPrimary} flex items-center`}>
                <Flame className="w-5 h-5 mr-2 text-orange-500" />
                {t('common.trending_assets')}
              </h3>
            </div>
            <div className={`rounded-[24px] overflow-hidden ${cardClasses} divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {trendingAssets.map((asset, i) => (
                <div key={`${asset.symbol}-${i}`} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CoinLogo symbol={asset.symbol} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold text-sm truncate ${textPrimary}`}>{asset.symbol}</p>
                      <p className={`text-[11px] truncate ${textSecondary}`}>{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${textPrimary}`}>{asset.price}</p>
                    <p className={`text-[11px] font-semibold flex items-center justify-end mt-0.5 ${asset.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                      {asset.change}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Quantitative Asset Strategies Summary Card */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-lg font-bold ${textPrimary} flex items-center`}>
              <Sliders className="w-5 h-5 mr-2 text-emerald-500" />
              Quantitative Strategies
            </h3>
            <span className="flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
              Institutional Suite
            </span>
          </div>

          <div className={`rounded-[20px] p-4 sm:p-5 relative overflow-hidden transition-all duration-300 ${cardClasses} border border-emerald-500/20`}>
            {/* Ambient Background Glow */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-3">
              
              {/* Header: Icon, Title & Button */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`font-black text-base ${textPrimary} tracking-tight`}>Quantitative Strategy Engine</h4>
                    <p className={`text-[10px] font-semibold text-emerald-400`}>Multi-Venue Portfolio Optimization & Risk Execution</p>
                  </div>
                </div>

                <button 
                  onClick={onOpenStrategies}
                  className="w-full sm:w-auto py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
                >
                  <span>Explore Strategies</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-950" />
                </button>
              </div>

              {/* Description */}
              <p className={`text-xs ${textSecondary} leading-relaxed max-w-2xl`}>
                Institutional quantitative models for automated yield execution and continuous risk management, tailored to your assets.
              </p>

              {/* Mini Tags */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-medium flex items-center gap-1.5 ${isDark ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                  <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                  Trend Detection & Skew
                </div>
                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-medium flex items-center gap-1.5 ${isDark ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                  <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                  Conservative to High-Growth
                </div>
                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-medium flex items-center gap-1.5 ${isDark ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                  <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                  BTC, ETH, SOL & Multi-Asset
                </div>
                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-400`}>
                  <Sliders className="w-3 h-3" />
                  8 Quantitative Models
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* PREMIUM COPY TRADE LAUNCHER CARD */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <h3 className={`text-lg font-bold ${textPrimary} flex items-center`}>
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            Copy Trade
          </h3>
        </div>
        
        <button 
          onClick={() => setShowCopyTrade(true)}
          className={`w-full p-5 rounded-[24px] ${cardClasses} transition-all hover:scale-[1.01] active:scale-[0.99] hover:border-blue-500/30 flex items-center justify-between text-left group relative overflow-hidden`}
        >
          {/* Subtle blue gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[30px] rounded-full" />
          
          <div className="flex items-center space-x-4 z-10">
            <Users className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div>
              <h4 className={`font-black text-base ${textPrimary}`}>Top Traders</h4>
              <p className={`text-xs ${textSecondary} mt-0.5`}>Replicate institutional-grade neural configurations from high-performance traders.</p>
            </div>
          </div>
          <div className="flex items-center text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors z-10 gap-1">
            <span>Explore</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      </div>

      {/* Dynamic Grid: Secondary sections */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {[
          { title: 'Market Highlights', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', onClick: onOpenMarketHighlights },
          { title: 'Events & Promos', icon: Tag, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', onClick: onOpenEventsPromos },
        ].map((item, i) => (
          <motion.button 
            key={`${item.title}-${i}`} 
            onClick={item.onClick}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`p-5 rounded-[24px] ${cardClasses} flex flex-col items-start text-left group relative overflow-hidden transition-all duration-300 hover:border-white/20`}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${item.bg} border shadow-sm`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <h4 className={`font-bold text-base ${textPrimary} mb-1 tracking-tight`}>{item.title}</h4>
            <div className={`flex items-center text-xs font-semibold ${textSecondary} group-hover:text-white transition-colors`}>
              Access Now <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

