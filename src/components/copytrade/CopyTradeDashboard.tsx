import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, TrendingUp, TrendingDown, ChevronRight, ChevronDown, Search, Sliders, X, 
  Brain, ShieldCheck, Trophy, Sparkles, Star, Zap, Eye, Cpu, BookOpen,
  ArrowUpRight, ArrowDownRight, Clock, DollarSign, CheckCircle2, UserCheck, Play
} from 'lucide-react';
import { generateAvatarSvg } from '../../utils/avatarGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useTradingEngine } from '../../contexts/TradingEngineContext';
import { aiTradingService } from '../../services/aiTradingService';
import { collection, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AiConfiguration, TradingSchedule, RiskControls, RecommendationRules } from '../../types/aiTrading';
import { safeStorage } from '../../utils/storage';
import { 
  SimulatedTrader as Trader, 
  SimulatedTrade, 
  SimulationEvent, 
  initSimulatedTraders, 
  saveSimulatedTraders,
  runSimulationTick, 
  runScheduledRankingsUpdate,
  rotateTraderStatuses,
  getTraderEquityCurve 
} from '../../utils/traderSimulation';

function formatTradeTime(isoString: string, indexOffset: number = 0): string {
  if (!isoString) return `${15 * (indexOffset + 1)}m ago`;
  const date = new Date(isoString);
  const now = Date.now();
  if (isNaN(date.getTime())) return `${15 * (indexOffset + 1)}m ago`;

  let diffMs = now - date.getTime();
  
  if (diffMs < 0 || diffMs > 7 * 24 * 3600 * 1000) {
    const defaultOffsetsMinutes = [14, 115, 290, 680, 1420];
    const mins = defaultOffsetsMinutes[indexOffset % defaultOffsetsMinutes.length];
    diffMs = mins * 60 * 1000;
  }

  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (3600 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${hours}:${minutes}`;
}

export default function CopyTradeDashboard({ theme, onBack, initialSelectedTraderId }: { theme: 'light' | 'dark', onBack: () => void, initialSelectedTraderId?: string | null }) {
  const { user, addNotification } = useAuth();
  const { preferences, formatCurrency } = usePreferences();
  const { saveConfiguration } = useTradingEngine();
  const isDark = theme === 'dark';

  const [traders, setTraders] = useState<Trader[]>(() => {
    return initSimulatedTraders();
  });

  // Scheduled ranking update logic
  useEffect(() => {
    const performUpdate = () => {
      setTraders(currentTraders => {
        const { updatedTraders, events: newEvents } = runScheduledRankingsUpdate(currentTraders);
        if (updatedTraders !== currentTraders) {
          if (newEvents.length > 0) {
            setEvents(prev => [...newEvents, ...prev].slice(0, 30));
          }
          return updatedTraders;
        }
        return currentTraders;
      });
    };

    // Run check on mount
    performUpdate();

    // Also check every 30 minutes in case the app is left open
    const interval = setInterval(performUpdate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const [events, setEvents] = useState<SimulationEvent[]>(() => {
    const savedEvts = safeStorage.getItem('aver_copytrade_events');
    return savedEvts ? JSON.parse(savedEvts) : [];
  });

  const [activeTab, setActiveTab] = useState<'top10' | 'all' | 'gold' | 'platinum'>('top10');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // Advanced filters state
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [styleFilter, setStyleFilter] = useState<'ALL' | 'SCALPING' | 'DAY_TRADING' | 'SWING_TRADING'>('ALL');

  // Copy success animation trigger
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  // Profile view sub-tab
  const [profileSubTab, setProfileSubTab] = useState<'stats' | 'strategy' | 'activity'>('stats');
  const [chartTimeline, setChartTimeline] = useState<'24h' | '7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardClasses = isDark
    ? "bg-slate-900/60 backdrop-blur-md border border-white/5 shadow-xl"
    : "bg-white/70 backdrop-blur-md border border-slate-200/50 shadow-lg";

  // Persist traders state so follow states or dynamic updates are preserved
  useEffect(() => {
    saveSimulatedTraders(traders);
  }, [traders]);

  // Real-time live status rotator interval (updates online/offline statuses dynamically)
  useEffect(() => {
    const statusInterval = setInterval(() => {
      setTraders(currentTraders => rotateTraderStatuses(currentTraders));
    }, 15000); // Rotates every 15s so users see online/offline changes live
    return () => clearInterval(statusInterval);
  }, []);

  // Keep selectedTrader in sync when traders state updates
  useEffect(() => {
    if (selectedTrader) {
      const updated = traders.find(t => t.id === selectedTrader.id);
      if (updated && updated.status !== selectedTrader.status) {
        setSelectedTrader(updated);
      }
    }
  }, [traders, selectedTrader]);

  // Persist events state
  useEffect(() => {
    safeStorage.setItem('aver_copytrade_events', JSON.stringify(events));
  }, [events]);

  // Handle initialSelectedTraderId
  useEffect(() => {
    if (initialSelectedTraderId) {
      const match = traders.find(t => t.id === initialSelectedTraderId);
      if (match) {
        setSelectedTrader(match);
      }
    }
  }, [initialSelectedTraderId, traders]);

  // Synchronize active selectedTrader profile details with simulated updates
  useEffect(() => {
    if (selectedTrader) {
      const current = traders.find(t => t.id === selectedTrader.id);
      if (current) {
        setSelectedTrader(current);
      }
    }
  }, [traders, selectedTrader?.id]);

  // Real-time synchronization with Firestore copy-trading simulation database
  useEffect(() => {
    const tradersRef = collection(db, 'traderProfiles');
    const unsub = onSnapshot(tradersRef, (snapshot) => {
      if (snapshot.empty || snapshot.docs.length === 0) {
        return;
      }
      
      const list = snapshot.docs.map(d => {
        const data = d.data() as any;
        const ret30 = data.return30D || data.return30d || 0;
        return {
          ...data,
          id: d.id,
          return30D: ret30,
          return30d: ret30,
          returnAllTime: data.returnAllTime || ret30 * 2.5 || 120,
          winRate: data.winRate || 75,
        };
      }) as Trader[];

      if (list.length < 5) {
        return;
      }

      // Sort by rank ascending
      list.sort((a, b) => (a.rank || 99) - (b.rank || 99));

      setTraders(prev => {
        if (prev.length === 0) {
          return list;
        }

        // Compare with previous state to trigger dynamic, live simulation events and notifications!
        const newEvents: SimulationEvent[] = [];
        list.forEach(t => {
          const old = prev.find(p => p.id === t.id);
          if (old) {
            // Check for rank climbs
            if (t.rank < old.rank) {
              newEvents.push({
                id: `evt_rank_up_${t.id}_${Date.now()}`,
                text: `📈 Leaderboard Shift: ${t.username} climbed to Rank #${t.rank}!`,
                timestamp: new Date().toISOString(),
                traderId: t.id,
                type: 'rank_up'
              });
            }
            // Check for completed trade events
            const oldClosedTrades = old.trades ? old.trades.filter(tr => tr.status === 'CLOSED') : [];
            const newClosedTrades = t.trades ? t.trades.filter(tr => tr.status === 'CLOSED') : [];
            if (newClosedTrades.length > oldClosedTrades.length) {
              const lastTrade = newClosedTrades[newClosedTrades.length - 1];
              if (lastTrade) {
                const isWin = (lastTrade.pnlPercent || 0) > 0;
                newEvents.push({
                  id: `evt_trade_${t.id}_${Date.now()}`,
                  text: `${isWin ? '✅ Take Profit' : '❌ Stop Loss'}: ${t.username} closed a ${lastTrade.asset} trade for ${isWin ? '+' : ''}${lastTrade.pnlPercent}%!`,
                  timestamp: new Date().toISOString(),
                  traderId: t.id,
                  type: 'entry'
                });
              }
            }
          }
        });

        if (newEvents.length > 0) {
          setTimeout(() => {
            setEvents(prevEvts => [
              ...newEvents,
              ...prevEvts
            ].slice(0, 30));

            if (addNotification) {
              newEvents.forEach(evt => {
                addNotification(
                  'copy_trading',
                  evt.type === 'rank_up' || evt.type === 'entry' ? 'high' : 'medium',
                  'Competitive Leaderboard Update',
                  evt.text
                ).catch(err => console.error("Error creating workspace notification:", err));
              });
            }
          }, 0);
        }

        return list;
      });
    });

    return () => unsub();
  }, [addNotification]);

  const [jitter, setJitter] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setJitter((Math.random() - 0.5) * 0.1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Filter & Search computation
  const filteredTraders = traders.filter(t => {
    // Search match
    const matchesSearch = t.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.strategyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.style.toLowerCase().includes(searchQuery.toLowerCase());

    // Tab match
    let matchesTab = true;
    if (activeTab === 'top10') {
      // Just handled by slicing the first 10, but keep basic filter active
      matchesTab = true; 
    } else if (activeTab === 'gold') {
      matchesTab = t.tier === 'Gold';
    } else if (activeTab === 'platinum') {
      matchesTab = t.tier === 'Platinum';
    }

    // Advanced filters
    const matchesRisk = riskFilter === 'ALL' || t.riskLevel === riskFilter;
    const matchesStyle = styleFilter === 'ALL' || t.style === styleFilter;

    return matchesSearch && matchesTab && matchesRisk && matchesStyle;
  });

  // Final rendering list: slice top 10 if on top 10 tab
  const displayList = activeTab === 'top10' ? filteredTraders.slice(0, 10) : filteredTraders;

  // Render first three traders for the Live Leaderboard Hero Cards
  const firstPlace = traders[0];
  const secondPlace = traders[1];
  const thirdPlace = traders[2];

  // Helper to trigger configuration clone to user center
  const handleCopyConfiguration = async (trader: Trader) => {
    if (!user) {
      alert("Please log in to copy AI configurations.");
      return;
    }
    
    setIsCopying(true);
    setCopySuccess(null);

    try {
      // Create clone configuration document structure
      const newConfigId = `cfg_copy_${Math.random().toString(36).substring(2, 11)}`;
      const clonedConfig: AiConfiguration = {
        id: newConfigId,
        ownerId: user.uid,
        name: `Cloned: ${trader.username} - ${trader.strategyName.split(' ').slice(0, 2).join(' ')}`,
        status: 'INACTIVE', // default standby mode
        createdAt: Timestamp.now(),
        lastModified: Timestamp.now(),
        sessionSetup: {
          amountToAllocate: trader.allocatedAmount || 1000,
          fundingSource: 'WALLET',
          sessionDuration: 24
        },
        profitRiskManagement: {
          sessionTakeProfit: trader.riskControls?.sessionTakeProfit || 10,
          sessionStopLoss: trader.riskControls?.lossLimit || 5,
          maxPositionSize: trader.riskControls?.maxPositionSize || 15,
          maxRiskPerTrade: trader.riskControls?.lossLimit || 2
        },
        aiTradingRules: {
          tradingStrategy: trader.strategyName.includes('Momentum') ? 'NEURAL_MOMENTUM' : 
                          trader.strategyName.includes('Swing') ? 'VOLATILITY_BREAKOUT' : 
                          trader.strategyName.includes('Grid') ? 'QUANT_GRID' : 'MEAN_REVERSION',
          assetSelection: [...trader.preferredMarkets],
          minConfidence: trader.recommendationRules?.minConfidence || 85,
          maxSimultaneousPositions: trader.riskControls?.maxSimultaneousPositions || 3
        },
        schedule: trader.schedule ? { ...trader.schedule } : undefined,
        configurationDetails: {
          description: `Procedurally duplicated directly from copy-trading profile of ${trader.username} (${trader.strategyName}). Built for ${(trader.style || 'SCALPING').replace(/_/g, ' ')} execution. Original performance: ${trader.return30D >= 0 ? '+' : ''}${trader.return30D}% ROI.`,
          category: 'Copy Trading',
          version: '1.0.0'
        },
        analyticsAndNotes: {
          riskScore: trader.riskManagementScore || 50,
          strategyNotes: `Follows ${trader.username}'s ${trader.strategyName} strategy. Original Win Rate: ${trader.winRate}%. Preferred markets: ${trader.preferredMarkets.join(', ')}.`,
          performanceStats: {
            winRate: trader.winRate || 0,
            totalReturn: trader.return30D || 0,
            drawdown: trader.currentDrawdown || 0
          }
        },
        notificationPreferences: {
          newRecommendations: true,
          tradeExecutions: true,
          marketAlerts: false
        }
      };

      // Save using TradingEngineContext saveConfiguration so state and storage stay strictly synced
      if (user?.uid) {
        await saveConfiguration(clonedConfig);
      } else {
        await aiTradingService.saveConfiguration('guest_user', clonedConfig);
      }

      // Trigger beautiful UI feedback
      setCopySuccess(newConfigId);
      
      // Increment follower count in Firestore for persistence and real-time sync across clients
      try {
        const traderDocRef = doc(db, 'traderProfiles', trader.id);
        await updateDoc(traderDocRef, {
          followers: trader.followers + 1
        });
      } catch (err) {
        console.warn("Failed to update follower count in Firestore:", err);
      }

      // Increment follower count locally for instant feedback loop
      setTraders(prev => prev.map(t => {
        if (t.id === trader.id) {
          return { ...t, followers: t.followers + 1 };
        }
        return t;
      }));

      // Update selected trader local stats too
      if (selectedTrader && selectedTrader.id === trader.id) {
        setSelectedTrader(prev => prev ? { ...prev, followers: prev.followers + 1 } : null);
      }

      // Add actual workspace notification
      if (addNotification) {
        await addNotification(
          'copy_trading',
          'high',
          'AI Configuration Copied Successfully',
          `You have successfully cloned ${trader.username}'s active neural profile. Configuration '${clonedConfig.name}' is now loaded into your Neural Workspace standby deck.`
        );
      }
    } catch (e: any) {
      console.error("Error cloning configuration:", e);
      alert("Failed to replicate configuration: " + e?.message);
    } finally {
      setIsCopying(false);
    }
  };

  // Custom high-quality SVG data generator for trader profile chart supporting 6 timeline periods
  const renderInteractiveChart = (trader: Trader, timeline: '24h' | '7d' | '30d' | '90d' | '1y' | 'all') => {
    const { labels, dataPoints } = getTraderEquityCurve(trader as any, timeline);

    const width = 600;
    const height = 180;
    const padding = 25;
    
    // Scale maths
    const maxVal = Math.max(...dataPoints);
    const minVal = Math.min(...dataPoints);
    const valRange = maxVal - minVal;
    
    // Fallbacks if flat
    const range = valRange === 0 ? 10 : valRange;

    const points = dataPoints.map((val, i) => {
      const x = padding + (i / (dataPoints.length - 1)) * (width - padding * 2);
      // invert Y coordinate for SVG
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return { x, y, val };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    // Calculate percentage change over this timeline
    const startVal = dataPoints[0] || 0;
    const endVal = dataPoints[dataPoints.length - 1] || 0;
    const timelineReturn = endVal - startVal;

    return (
      <div className="relative">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className={isDark ? "text-slate-500" : "text-slate-400"}>Timeline Performance:</span>
            <span className={`font-black ${timelineReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {timelineReturn >= 0 ? '+' : ''}{timelineReturn.toFixed(2)}%
            </span>
          </div>
          <span className={`text-[9px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {dataPoints.length} Dynamic Cycles Compiled
          </span>
        </div>

        {(() => {
          const isProfitable = timelineReturn >= 0;
          const colorHex = isProfitable ? "#10B981" : "#F43F5E";
          const dotClass = isProfitable ? "fill-emerald-500" : "fill-rose-500";
          const hoverClass = isProfitable ? "fill-emerald-400" : "fill-rose-400";

          return (
            <svg className="w-full h-44 overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id={`chartGradient_${trader.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colorHex} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={colorHex} stopOpacity="0.0" />
                </linearGradient>
                <filter id={`glow_${trader.id}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={colorHex} floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"} strokeDasharray="3,3" />
              <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"} strokeDasharray="3,3" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"} strokeDasharray="3,3" />

              {/* Area under curve */}
              {areaD && (
                <path
                  d={areaD}
                  fill={`url(#chartGradient_${trader.id})`}
                />
              )}

              {/* Line Path */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={colorHex}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter={`url(#glow_${trader.id})`}
                />
              )}

              {/* Interactive Dots */}
              {points.map((p, i) => {
                // Only draw dots for first, middle, last, or every few if small timeline
                const showDot = i === 0 || i === points.length - 1 || points.length < 15 || i % Math.floor(points.length / 5) === 0;
                if (!showDot) return null;
                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="3" className={`${dotClass} stroke-black stroke-2`} />
                    <circle cx={p.x} cy={p.y} r="8" className={`${hoverClass} opacity-0 hover:opacity-25 transition-opacity cursor-pointer`} />
                  </g>
                );
              })}

              {/* Labels */}
              {points.map((p, i) => {
                const showLabel = i === 0 || i === points.length - 1 || (points.length >= 6 && i === Math.floor(points.length / 2));
                if (!showLabel) return null;
                return (
                  <text
                    key={`lbl_${i}`}
                    x={p.x}
                    y={height - 6}
                    textAnchor="middle"
                    className={`font-mono text-[9px] font-bold ${isDark ? "fill-slate-500" : "fill-slate-400"}`}
                  >
                    {labels[i]}
                  </text>
                );
              })}
            </svg>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!selectedTrader ? (
          // ==================== DASHBOARD LEADERBOARD HOME ====================
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Header section with back navigators */}
            <div className="flex justify-between items-center">
              <div>
                <button 
                  onClick={onBack}
                  className="group mb-2 flex items-center gap-1.5 text-xs font-black text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
                  <span>Back</span>
                </button>
                <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${textPrimary}`}>
                  <Users className="w-6 h-6 text-emerald-400" /> Copy Trade
                </h2>
                <p className={`text-xs ${textSecondary} mt-1`}>
                  Follow elite quantitative traders. Duplicate their production AI configurations. Grow in synergy.
                </p>
              </div>
            </div>

            {/* DYNAMIC TELEMETRY TICKER */}
            {events.length > 0 && (
              <div className={`p-3 rounded-2xl ${cardClasses} border border-emerald-500/10 flex items-center gap-3 overflow-hidden`}>
                <span className="flex-shrink-0 text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                  LIVE TELEMETRY
                </span>
                <div className="flex-1 overflow-hidden h-5 flex items-center relative">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={events[0].id}
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -15, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="text-xs font-bold text-gray-300 truncate font-sans w-full"
                    >
                      {events[0].text}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* LIVE LEADERBOARD HERO HIGHLIGHTS */}
            <div className={`p-6 rounded-[28px] ${cardClasses} relative overflow-hidden border border-emerald-500/10`}>
              {/* Background ambient lighting */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-44 h-44 bg-sky-500/5 blur-[50px] rounded-full pointer-events-none" />

              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h3 className={`text-sm font-black tracking-wider uppercase text-slate-200`}>Live Leaderboard</h3>
                </div>
              </div>

              {/* THREE HEROES PODIUM COLUMN GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* 2nd PLACE COLUMN */}
                {secondPlace && (
                  <motion.div 
                    layoutId={`hero_card_${secondPlace.id}`}
                    onClick={() => setSelectedTrader(secondPlace)}
                    className="relative order-2 md:order-1 rounded-2xl bg-white/[0.02] border border-white/5 p-5 flex flex-col items-center justify-between hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.03] group cursor-pointer"
                  >
                    <span className="absolute top-3 left-4 text-xs font-black font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">#2</span>
                    <div className="relative mt-2">
                      <div className="w-16 h-16 rounded-full border-2 border-sky-400 p-0.5 overflow-hidden flex items-center justify-center bg-black/40">
                        {secondPlace.avatarUrl ? (
                           <img src={secondPlace.avatarUrl} alt={secondPlace.username} className="w-full h-full rounded-full object-cover grayscale-0 hover:grayscale transition-all" />
                        ) : (
                           <div className="w-full h-full rounded-full overflow-hidden" dangerouslySetInnerHTML={{ __html: generateAvatarSvg(secondPlace.avatarSeed) }} />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center mt-3">
                      <h4 className="text-sm font-black text-white flex flex-col items-center justify-center leading-tight">
                        <span className="flex items-center gap-1">{secondPlace.username} {secondPlace.verified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-black flex-shrink-0" />}</span>
                      </h4>
                      <span className="text-[9px] font-mono font-black text-gray-400 tracking-wider uppercase px-2 py-0.5 bg-white/5 rounded-full mt-1.5 inline-block">
                        {secondPlace.strategyName.split(' ')[0]}
                      </span>
                    </div>

                    <div className="mt-4 text-center">
                      <span className={`text-lg font-black font-mono tracking-tight ${secondPlace.return30D >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {secondPlace.return30D >= 0 ? '+' : ''}{secondPlace.return30D.toFixed(2)}%
                      </span>
                      <p className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest mt-0.5">30D RETURN</p>
                      <p className="text-[10px] font-mono font-bold text-gray-400 mt-1">${(secondPlace.allocatedAmount || 1000).toLocaleString()} Capital</p>
                    </div>
                  </motion.div>
                )}

                {/* 1st PLACE COLUMN (GLOWING / CROWNED) */}
                {firstPlace && (
                  <motion.div 
                    layoutId={`hero_card_${firstPlace.id}`}
                    onClick={() => setSelectedTrader(firstPlace)}
                    className="relative order-1 md:order-2 rounded-2xl bg-emerald-500/[0.02] border-2 border-emerald-500/30 p-6 flex flex-col items-center justify-between hover:bg-emerald-500/[0.04] transition-all duration-300 hover:scale-[1.04] group cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.05)]"
                  >
                    {/* Top status indicator flag */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full text-[9px] font-black text-black tracking-widest uppercase flex items-center gap-1 shadow-lg">
                      <Trophy className="w-3 h-3" /> CHAMPION
                    </div>
                    <span className="absolute top-3 left-4 text-xs font-black font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">#1</span>
                    
                    <div className="relative mt-4">
                      <div className="w-20 h-20 rounded-full border-2 border-yellow-500 p-0.5 overflow-hidden flex items-center justify-center bg-black/40 shadow-lg shadow-yellow-500/10">
                        {firstPlace.avatarUrl ? (
                           <img src={firstPlace.avatarUrl} alt={firstPlace.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                           <div className="w-full h-full rounded-full overflow-hidden" dangerouslySetInnerHTML={{ __html: generateAvatarSvg(firstPlace.avatarSeed) }} />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center mt-3">
                      <h4 className="text-base font-black text-white flex flex-col items-center justify-center leading-tight">
                        <span className="flex items-center gap-1">
                          {firstPlace.username} 
                          {firstPlace.verified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-black flex-shrink-0" />}
                          <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                        </span>
                      </h4>
                      <span className="text-[10px] font-mono font-black text-yellow-500 tracking-wider uppercase px-2.5 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/10 mt-1.5 inline-block">
                        {firstPlace.strategyName.split(' ')[0]}
                      </span>
                    </div>

                    <div className="mt-4 text-center">
                      <span className={`text-2xl font-black font-mono tracking-tight ${firstPlace.return30D >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {firstPlace.return30D >= 0 ? '+' : ''}{firstPlace.return30D.toFixed(2)}%
                      </span>
                      <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-0.5">30D RETURN</p>
                      <p className="text-[10px] font-mono font-bold text-emerald-400/90 mt-1">${(firstPlace.allocatedAmount || 1000).toLocaleString()} Capital</p>
                    </div>
                  </motion.div>
                )}

                {/* 3rd PLACE COLUMN */}
                {thirdPlace && (
                  <motion.div 
                    layoutId={`hero_card_${thirdPlace.id}`}
                    onClick={() => setSelectedTrader(thirdPlace)}
                    className="relative order-3 rounded-2xl bg-white/[0.02] border border-white/5 p-5 flex flex-col items-center justify-between hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.03] group cursor-pointer"
                  >
                    <span className="absolute top-3 left-4 text-xs font-black font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">#3</span>
                    <div className="relative mt-2">
                      <div className="w-16 h-16 rounded-full border-2 border-amber-600 p-0.5 overflow-hidden flex items-center justify-center bg-black/40">
                        {thirdPlace.avatarUrl ? (
                           <img src={thirdPlace.avatarUrl} alt={thirdPlace.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                           <div className="w-full h-full rounded-full overflow-hidden" dangerouslySetInnerHTML={{ __html: generateAvatarSvg(thirdPlace.avatarSeed) }} />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center mt-3">
                      <h4 className="text-sm font-black text-white flex flex-col items-center justify-center leading-tight">
                        <span className="flex items-center gap-1">{thirdPlace.username} {thirdPlace.verified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-black flex-shrink-0" />}</span>
                      </h4>
                      <span className="text-[9px] font-mono font-black text-gray-400 tracking-wider uppercase px-2 py-0.5 bg-white/5 rounded-full mt-1.5 inline-block">
                        {thirdPlace.strategyName.split(' ')[0]}
                      </span>
                    </div>

                    <div className="mt-4 text-center">
                      <span className={`text-lg font-black font-mono tracking-tight ${thirdPlace.return30D >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {thirdPlace.return30D >= 0 ? '+' : ''}{thirdPlace.return30D.toFixed(2)}%
                      </span>
                      <p className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest mt-0.5">30D RETURN</p>
                      <p className="text-[10px] font-mono font-bold text-gray-400 mt-1">${(thirdPlace.allocatedAmount || 1000).toLocaleString()} Capital</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* TAB SELECTORS AND FILTER/SEARCH ROW */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                {/* Category tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {[
                    { id: 'top10', name: 'Top 10', icon: Trophy },
                    { id: 'all', name: 'All Traders', icon: Users },
                    { id: 'platinum', name: 'Platinum', icon: Trophy },
                    { id: 'gold', name: 'Gold', icon: null }
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setSearchQuery('');
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer border ${
                          isActive 
                            ? 'bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-500/15' 
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border-transparent'
                        }`}
                      >
                        {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                        <span>{tab.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Filters Trigger */}
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    showFilterDropdown || riskFilter !== 'ALL' || styleFilter !== 'ALL'
                      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Filter {riskFilter !== 'ALL' || styleFilter !== 'ALL' ? '(Active)' : ''}</span>
                </button>
              </div>

              {/* SEARCH BAR ROW */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Search traders by name, neural strategy, style, or asset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 bg-black/15 dark:bg-white/5 border border-white/5 rounded-2xl text-xs outline-none focus:border-emerald-500/40 transition-all ${textPrimary}`}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* ADVANCED MULTI-FILTER DROPDOWN ACCORDION */}
              <AnimatePresence>
                {showFilterDropdown && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-4 space-y-4`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Risk controls */}
                      <div>
                        <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block mb-2">Risk Level</span>
                        <div className="flex flex-wrap gap-2">
                          {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as const).map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => setRiskFilter(lvl)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                riskFilter === lvl 
                                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                                  : 'border-white/5 bg-white/5 text-gray-400 hover:text-white'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Trading style */}
                      <div>
                        <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block mb-2">Trading Style</span>
                        <div className="flex flex-wrap gap-2">
                          {(['ALL', 'SCALPING', 'DAY_TRADING', 'SWING_TRADING'] as const).map((style) => (
                            <button
                              key={style}
                              onClick={() => setStyleFilter(style)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                styleFilter === style 
                                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                                  : 'border-white/5 bg-white/5 text-gray-400 hover:text-white'
                              }`}
                            >
                              {(style || '').replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reset button */}
                    <div className="flex justify-end pt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          setRiskFilter('ALL');
                          setStyleFilter('ALL');
                        }}
                        className="text-xs font-black text-gray-400 hover:text-white transition-colors"
                      >
                        Reset Advanced Filters
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* LEADERBOARD DETAILED LIST TABLE */}
            <div className={`rounded-3xl border border-white/5 bg-black/10 overflow-hidden`}>
              {/* Header Titles */}
              <div className="grid grid-cols-12 gap-3 px-6 py-3.5 bg-white/[0.02] border-b border-white/5 text-[10px] font-mono font-black uppercase tracking-wider text-gray-400">
                <div className="col-span-2 sm:col-span-1">Rank</div>
                <div className="col-span-6 sm:col-span-5">Trader</div>
                <div className="col-span-4 sm:col-span-3 text-right">30D Return</div>
                <div className="col-span-3 hidden sm:block text-right">Followers</div>
              </div>

              {/* Dynamic list rows */}
              <div className="divide-y divide-white/5">
                {displayList.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className={`text-sm font-bold ${textPrimary}`}>No elite traders matching parameters.</p>
                    <p className="text-xs text-gray-500 mt-1">Try broadening your search or resetting active filters.</p>
                  </div>
                ) : (
                  displayList.map((trader, idx) => {
                    // Find actual overall rank from global traders list
                    const rank = traders.findIndex(t => t.id === trader.id) + 1;
                    return (
                      <motion.div
                        layout
                        key={`trader-${trader.id || idx}-${idx}`}
                        onClick={() => setSelectedTrader(trader)}
                        className={`grid grid-cols-12 gap-3 px-6 py-4 items-center cursor-pointer transition-all hover:bg-white/[0.02]`}
                      >
                        {/* Rank */}
                        <div className="col-span-2 sm:col-span-1 flex items-center font-mono font-black text-sm">
                          {rank === 1 ? (
                            <span className="w-6 h-6 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center text-xs">1</span>
                          ) : rank === 2 ? (
                            <span className="w-6 h-6 bg-slate-400/15 border border-slate-400/20 text-slate-300 rounded-full flex items-center justify-center text-xs">2</span>
                          ) : rank === 3 ? (
                            <span className="w-6 h-6 bg-amber-600/15 border border-amber-600/20 text-amber-500 rounded-full flex items-center justify-center text-xs">3</span>
                          ) : (
                            <span className="text-gray-500 px-2">{rank}</span>
                          )}
                        </div>

                        {/* Trader Information */}
                        <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-black/30">
                            {trader.avatarUrl ? (
                               <img src={trader.avatarUrl} alt={trader.username} className="w-full h-full object-cover" />
                            ) : (
                               <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: generateAvatarSvg(trader.avatarSeed) }} />
                            )}
                            {/* Live Status indicator */}
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#090A0E] ${
                              trader.status === 'Trading' ? 'bg-emerald-500' :
                              trader.status === 'Analyzing' ? 'bg-sky-500' :
                              trader.status === 'Online' ? 'bg-teal-500' : 'bg-gray-600'
                            }`} />
                          </div>
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-black text-white hover:text-emerald-400 transition-colors truncate`}>{trader.username}</span>
                              {trader.verified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-black flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                                trader.tier === 'Platinum' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                trader.tier === 'Gold' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                'bg-slate-400/10 text-slate-400 border border-slate-400/20'
                              }`}>
                                {trader.tier}
                              </span>
                              <span className={`text-[10px] ${textSecondary} truncate`}>{trader.strategyName}</span>
                              <span className={`text-[8px] font-mono font-bold px-1.5 rounded-full ${
                                trader.riskLevel === 'HIGH' ? 'bg-rose-500/10 text-rose-400' :
                                trader.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500' :
                                'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {trader.riskLevel} RISK
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 30D Return & Sparkline */}
                        <div className="col-span-4 sm:col-span-3 flex flex-col items-end justify-center">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${trader.return30D >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                            {trader.return30D >= 0 ? '+' : ''}{trader.return30D.toFixed(2)}%
                          </span>
                          
                          {/* Mini Sparkline graph */}
                          <div className="w-16 h-5 mt-1 opacity-80 hidden xs:block">
                            <svg className="w-full h-full" viewBox="0 0 50 15">
                                <path 
                                  d={trader.pnlHistory30D.reduce((acc, val, i) => {
                                    const x = (i / (trader.pnlHistory30D.length - 1)) * 50;
                                    const y = 13 - ((val / 250) * 11); // scale to fit height 15
                                    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                                  }, '')}
                                  fill="none"
                                  stroke={trader.return30D >= 0 ? "#10b981" : "#f43f5e"}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                            </svg>
                          </div>
                        </div>

                        {/* Followers */}
                        <div className="col-span-3 hidden sm:flex flex-col items-end">
                          <span className={`text-xs font-black ${textPrimary}`}>
                            {(trader.followers / 1000).toFixed(1)}K
                          </span>
                          <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest mt-0.5">FOLLOWERS</span>
                        </div>


                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          // ==================== PREMIUM TRADER PROFILE VIEW ====================
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Back Navigators Header */}
            <div className="flex justify-between items-center">
              <button 
                onClick={() => {
                  setSelectedTrader(null);
                  setProfileSubTab('stats');
                  setCopySuccess(null);
                }}
                className="group flex items-center gap-1.5 text-xs font-black text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
                <span>Back to Leaderboard</span>
              </button>

              <span className={`text-[10px] font-mono font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-full ${
                selectedTrader.status === 'Trading' ? 'text-emerald-400' :
                selectedTrader.status === 'Analyzing' ? 'text-sky-400' : 'text-gray-400'
              } flex items-center gap-1.5`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  selectedTrader.status === 'Trading' ? 'bg-emerald-400 animate-pulse' :
                  selectedTrader.status === 'Analyzing' ? 'bg-sky-400 animate-pulse' : 'bg-gray-500'
                }`} />
                {selectedTrader.status === 'Trading' ? 'Currently Deploying' : selectedTrader.status}
              </span>
            </div>

            {/* HERO PROFILE SUMMARY CARD */}
            <div className={`p-6 sm:p-8 rounded-[32px] ${cardClasses} relative overflow-hidden border border-white/5 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
              
              {/* Dynamic Animated Avatar */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.02, 1],
                  rotate: [0, 1, -1, 0]
                }}
                transition={{ 
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut"
                }}
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-emerald-500/30 p-0.5 overflow-hidden flex items-center justify-center bg-black/40 shadow-xl flex-shrink-0"
              >
                {selectedTrader.avatarUrl ? (
                   <img src={selectedTrader.avatarUrl} alt={selectedTrader.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                   <div className="w-full h-full rounded-full overflow-hidden" dangerouslySetInnerHTML={{ __html: generateAvatarSvg(selectedTrader.avatarSeed) }} />
                )}
              </motion.div>

              {/* Identity descriptions */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <div className="flex flex-col items-center sm:items-start leading-tight">
                    <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      {selectedTrader.username}
                      {selectedTrader.verified && <CheckCircle2 className="w-5 h-5 text-sky-400 fill-black" />}
                    </h3>
                    <span className="text-sm text-slate-400">{selectedTrader.username}</span>
                  </div>
                </div>
                <div className="flex justify-center sm:justify-start">
                  <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full ${
                    selectedTrader.tier === 'Platinum' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' :
                    selectedTrader.tier === 'Gold' ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20' :
                    'bg-slate-400/15 text-slate-400 border border-slate-400/20'
                  }`}>
                    {selectedTrader.tier} Tier Trader
                  </span>
                </div>

                <p className="text-sm text-gray-300 leading-relaxed max-w-xl">
                  {selectedTrader.bio}
                </p>

                <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-2 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span><strong className="text-white">{selectedTrader.followers.toLocaleString()}</strong> followers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Allocated Capital: <strong className="text-emerald-400 font-mono">${(selectedTrader.allocatedAmount || 1000).toLocaleString()}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Risk Rating: <strong className="text-white">{selectedTrader.riskLevel}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-emerald-400" />
                    <span>Preferred Style: <strong className="text-white">{(selectedTrader.style || 'SCALPING').replace(/_/g, ' ')}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB PROFILE SECTIONS SELECTOR */}
            <div className="flex border-b border-white/5 pb-1 gap-2 overflow-x-auto">
              {[
                { id: 'stats', name: 'Performance Indicators', icon: Trophy },
                { id: 'strategy', name: 'Strategy & Engine Controls', icon: Brain },
                { id: 'activity', name: 'Recent Activity Logs', icon: Clock }
              ].map((subTab) => {
                const isActive = profileSubTab === subTab.id;
                const SubIcon = subTab.icon;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setProfileSubTab(subTab.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer border-b-2 ${
                      isActive 
                        ? 'text-emerald-400 border-emerald-500 bg-white/[0.02]' 
                        : 'text-gray-400 border-transparent hover:text-white'
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5" />
                    <span>{subTab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* PROFILE SUB-TAB CONTENTS */}
            <AnimatePresence mode="wait">
              {profileSubTab === 'stats' && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* METRIC CARD BOX GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-2xl ${cardClasses} border border-white/5 text-center`}>
                      <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">30D Performance</p>
                      <h4 className={`text-xl font-black mt-1 font-mono ${(selectedTrader.return30D + jitter) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {(selectedTrader.return30D + jitter) >= 0 ? '+' : ''}{(selectedTrader.return30D + jitter).toFixed(2)}%
                      </h4>
                    </div>
                    <div className={`p-4 rounded-2xl ${cardClasses} border border-white/5 text-center`}>
                      <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Win Rate Percentage</p>
                      <h4 className="text-xl font-black text-white mt-1 font-mono">{Math.max(0, Math.min(100, selectedTrader.winRate + (jitter * 10))).toFixed(1)}%</h4>
                    </div>
                    <div className={`p-4 rounded-2xl ${cardClasses} border border-white/5 text-center`}>
                      <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Total Positions Placed</p>
                      <h4 className="text-xl font-black text-white mt-1 font-mono">{selectedTrader.wins + selectedTrader.losses}</h4>
                    </div>
                    <div className={`p-4 rounded-2xl ${cardClasses} border border-white/5 text-center`}>
                      <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest font-sans">Avg Trade Duration</p>
                      <h4 className="text-xl font-black text-white mt-1">{selectedTrader.avgTradeDuration}</h4>
                    </div>
                  </div>

                  {/* SECONDARY METRIC CARD BOX GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-2xl ${cardClasses} border border-white/5 text-center`}>
                      <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">All-Time ROI</p>
                      <h4 className={`text-xl font-black mt-1 font-mono ${(selectedTrader.returnAllTime + jitter * 5) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {(selectedTrader.returnAllTime + jitter * 5) >= 0 ? '+' : ''}{(selectedTrader.returnAllTime + jitter * 5).toFixed(2)}%
                      </h4>
                    </div>
                    <div className={`p-4 rounded-2xl ${cardClasses} border border-white/5 text-center`}>
                      <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest font-sans">Winning Streak</p>
                      <h4 className="text-xl font-black text-white mt-1">{selectedTrader.currentWinningStreak || 0} Trades</h4>
                    </div>
                  </div>

                  {/* INTERACTIVE PREMIUM GROWTH CHART */}
                  <div className={`p-6 rounded-3xl ${cardClasses} border border-white/5`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                      <div>
                        <h4 className="text-sm font-black text-white">Dynamic Equity Curve</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Replicating cumulative performance timeline across major seasons.</p>
                      </div>
                      <div className="flex flex-wrap rounded-lg bg-black/40 border border-white/5 p-1 gap-1">
                        {(['24h', '7d', '30d', '90d', '1y', 'all'] as const).map((tl) => (
                          <button
                            key={tl}
                            onClick={() => setChartTimeline(tl)}
                            className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              chartTimeline === tl 
                                ? 'bg-emerald-500 text-black' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {tl === '24h' ? '24H' :
                             tl === '7d' ? '7D' :
                             tl === '30d' ? '30D' :
                             tl === '90d' ? '90D' :
                             tl === '1y' ? '1Y' : 'ALL'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {renderInteractiveChart(selectedTrader, chartTimeline)}
                  </div>

                  {/* PREFERRED MARKETS & RISK INFO BOX */}
                  <div className="grid grid-cols-1 gap-6">
                    {/* Wins Losses */}
                    <div className={`p-5 rounded-2xl ${cardClasses} border border-white/5 flex flex-col justify-between`}>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-gray-400 tracking-wider uppercase">Win / Loss Ratio Spectrum</h4>
                        <div className="flex justify-between text-xs font-mono font-bold text-gray-400 pt-2">
                          <span className="text-emerald-500">{selectedTrader.wins} Wins</span>
                          <span className="text-rose-500">{selectedTrader.losses} Losses</span>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-rose-500/20 rounded-full overflow-hidden mt-3 mb-3 flex">
                        <div 
                          style={{ width: `${(selectedTrader.wins / (selectedTrader.wins + selectedTrader.losses)) * 100}%` }} 
                          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                        />
                      </div>

                      <p className="text-xs text-gray-500 leading-relaxed">
                        Compounding an accurate {selectedTrader.winRate}% win rate index across {selectedTrader.wins + selectedTrader.losses} total autonomous cycles. Average drawdowns remain strictly bounded.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {profileSubTab === 'strategy' && (
                <motion.div
                  key="strategy"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Strategy Description Info Box */}
                  <div className={`p-5 rounded-2xl ${cardClasses} border border-white/5 space-y-2`}>
                    <h4 className="text-xs font-black text-gray-400 tracking-wider uppercase">AI Neural Strategy Deployment</h4>
                    <span className="text-base font-black text-emerald-400 font-mono inline-block py-1">
                      {selectedTrader.strategyName}
                    </span>
                    <p className="text-xs text-gray-300 leading-relaxed pt-1">
                      {selectedTrader.strategyExplanation}
                    </p>
                  </div>

                  {/* DYNAMIC CONFIGURATION SUMMARY COMPONENT */}
                  <div className={`p-6 rounded-3xl ${cardClasses} border border-white/5 space-y-4`}>
                    <h4 className="text-xs font-black text-gray-400 tracking-wider uppercase border-b border-white/5 pb-2">Central Risk & Sizing Controls</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Allocated Copy Capital</span>
                        <p className="text-sm font-black text-emerald-400 font-mono">${(selectedTrader.allocatedAmount || 1000).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Position Sizing Preference</span>
                        <p className="text-sm font-black text-white">{selectedTrader.riskControls.positionSizingPreference}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Max Capital Sizing / Trade</span>
                        <p className="text-sm font-black text-white">{selectedTrader.riskControls.maxPositionSize}%</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Max Simultaneous Positions</span>
                        <p className="text-sm font-black text-white">{selectedTrader.riskControls.maxSimultaneousPositions} concurrent max</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Neural Stop Limit threshold</span>
                        <p className="text-sm font-black text-rose-400 font-mono">-{selectedTrader.riskControls.lossLimit}%</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Net Portfolio Exposure Limit</span>
                        <p className="text-sm font-black text-white">{selectedTrader.riskControls.exposureLimit}% Cap</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">AI Sentiment Grounding</span>
                        <p className={`text-sm font-black ${selectedTrader.advancedBehavior.useSentimentGrounding ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {selectedTrader.advancedBehavior.useSentimentGrounding ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-4 text-xs">
                      <div>
                        <span className="text-gray-400 font-black">Trading Schedule:</span>
                        <p className="text-gray-300 mt-1">Weekdays active, timezone {selectedTrader.schedule?.timezone}. Sessions: {(selectedTrader.schedule?.sessions || []).map(s => `${s.start}-${s.end}`).join(', ')}.</p>
                      </div>
                      <div>
                        <span className="text-gray-400 font-black">Confidence Threshold:</span>
                        <p className="text-emerald-400 font-mono font-black mt-1">Min {selectedTrader.recommendationRules.minConfidence}% Signal Index</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {profileSubTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-black text-gray-400 tracking-wider uppercase">Recent Order Executions</h4>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Engine Sync
                    </span>
                  </div>
                  
                  <div className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md overflow-hidden shadow-xl">
                    {(selectedTrader.recentTrades || []).map((t, idx) => {
                      const leverage = t.leverage || [10, 20, 15, 5, 25][idx % 5];
                      const marginUsd = t.marginUsd || (selectedTrader.allocatedAmount ? Math.round(selectedTrader.allocatedAmount * 0.12) : 1250);
                      const pnlPercent = t.pnlPercent ?? (t.status === 'OPEN' ? 1.85 : (idx % 2 === 0 ? 3.45 : -1.25));
                      const pnlUsd = t.pnlUsd ?? parseFloat((marginUsd * (pnlPercent / 100)).toFixed(2));
                      const formattedTime = formatTradeTime(t.timestamp, idx);
                      const isLong = t.type === 'BUY';

                      return (
                        <div key={`trd-${t.id || idx}-${idx}`} className="p-3.5 sm:p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between text-xs">
                          {/* Left Column: Direction Icon + Asset + Type + Leverage + Relative Time */}
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                              isLong ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                            }`}>
                              {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-white font-mono text-xs sm:text-sm">{t.asset}/USDT</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide font-mono ${
                                  isLong 
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {isLong ? 'BUY' : 'SELL'} {leverage}x
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
                                <span className="flex items-center gap-1 font-mono text-gray-400">
                                  <Clock className="w-3 h-3 text-gray-500" />
                                  {formattedTime}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-gray-400">${marginUsd.toLocaleString()} Size</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Entry Price + PnL Badge / Active status */}
                          <div className="text-right flex flex-col items-end gap-1">
                            <div className="text-[10px] sm:text-[11px] font-mono text-gray-300">
                              <span className="text-gray-500 mr-1">Entry:</span>
                              <span className="font-bold text-white">${t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                            </div>

                            {t.status === 'CLOSED' ? (
                              <div className={`px-2.5 py-0.5 sm:py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs inline-flex items-center gap-1 ${
                                pnlPercent >= 0 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                <span>{pnlPercent >= 0 ? '+' : ''}${Math.abs(pnlUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="text-[10px] opacity-80">({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
                              </div>
                            ) : (
                              <div className="px-2.5 py-0.5 sm:py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping" />
                                <span>Active Execution</span>
                                <span className="text-[10px] text-emerald-400 ml-0.5">(+${(marginUsd * leverage * 0.015).toFixed(2)})</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FLOATING ACTION BOTTOM BAR FOR COPY WORKSPACE CONFIGURATION */}
            <div className={`p-4 sm:p-5 rounded-3xl ${cardClasses} border border-emerald-500/20 bg-emerald-950/5 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 mt-6`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
              
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-black text-white flex items-center justify-center sm:justify-start gap-1">
                  <Brain className="w-4 h-4 text-emerald-400 animate-pulse" /> Replicate AI Neural Model
                </h4>
                <p className="text-xs text-gray-400">
                  Duplicate {selectedTrader.username}’s active config settings into your local workspace standalone deck.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {copySuccess ? (
                  <div className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-black px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20">
                    <UserCheck className="w-4 h-4" />
                    <span>Config Copied! Loaded in Standby</span>
                  </div>
                ) : (
                  <button
                    disabled={isCopying}
                    onClick={() => handleCopyConfiguration(selectedTrader)}
                    className="w-full sm:w-auto py-3 px-6 bg-[#00D09C] hover:bg-[#00B585] text-black rounded-2xl text-xs font-black transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isCopying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Synchronising Config...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Copy Trader Configuration</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
