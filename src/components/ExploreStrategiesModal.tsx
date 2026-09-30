import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, TrendingUp, Info, CheckCircle2, Zap, Shield, Sparkles, 
  Activity, ArrowUpRight, Cpu, Layers, Sliders, Check
} from 'lucide-react';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { Strategy } from '../data/strategies';
import { useFeaturedStrategy } from '../hooks/useFeaturedStrategy';

interface ExploreStrategiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onSelectStrategy: (strategy: Strategy) => void;
}

type Timeframe = '24H' | '7D' | '1M' | '3M' | '1Y' | 'ALL';

// Generator for timeframe chart simulation data
const generateChartData = (timeframe: Timeframe, apyStr: string) => {
  const baseApy = parseFloat(apyStr) || 42.8;
  
  if (timeframe === '24H') {
    return [
      { time: '00:00', strategy: 0.0, benchmark: 0.0, alpha: '+0.0%', signal: 91, volume: '$12.4M' },
      { time: '04:00', strategy: 0.8, benchmark: 0.2, alpha: '+0.6%', signal: 94, volume: '$18.2M' },
      { time: '08:00', strategy: 1.5, benchmark: 0.5, alpha: '+1.0%', signal: 89, volume: '$24.1M' },
      { time: '12:00', strategy: 1.2, benchmark: -0.1, alpha: '+1.3%', signal: 96, volume: '$31.0M' },
      { time: '16:00', strategy: 2.4, benchmark: 0.6, alpha: '+1.8%', signal: 93, volume: '$28.5M' },
      { time: '20:00', strategy: 3.1, benchmark: 0.9, alpha: '+2.2%', signal: 95, volume: '$34.8M' },
      { time: 'Live',  strategy: 3.8, benchmark: 1.1, alpha: '+2.7%', signal: 98, volume: '$42.0M' }
    ];
  }

  if (timeframe === '7D') {
    return [
      { time: 'Mon', strategy: 0.0, benchmark: 0.0, alpha: '+0.0%', signal: 90, volume: '$84M' },
      { time: 'Tue', strategy: 2.1, benchmark: 0.8, alpha: '+1.3%', signal: 93, volume: '$110M' },
      { time: 'Wed', strategy: 1.8, benchmark: 0.1, alpha: '+1.7%', signal: 95, volume: '$95M' },
      { time: 'Thu', strategy: 4.2, benchmark: 1.2, alpha: '+3.0%', signal: 92, volume: '$140M' },
      { time: 'Fri', strategy: 5.6, benchmark: 1.5, alpha: '+4.1%', signal: 96, volume: '$165M' },
      { time: 'Sat', strategy: 6.1, benchmark: 1.4, alpha: '+4.7%', signal: 88, volume: '$72M' },
      { time: 'Sun', strategy: 8.4, benchmark: 2.0, alpha: '+6.4%', signal: 97, volume: '$120M' }
    ];
  }

  if (timeframe === '3M') {
    return [
      { time: 'Month 1', strategy: 0.0, benchmark: 0.0, alpha: '+0.0%', signal: 90, volume: '$310M' },
      { time: 'Month 2', strategy: 6.8, benchmark: 2.1, alpha: '+4.7%', signal: 93, volume: '$420M' },
      { time: 'Month 3', strategy: 15.4, benchmark: 4.8, alpha: '+10.6%', signal: 96, volume: '$580M' }
    ];
  }

  if (timeframe === '1Y') {
    return [
      { time: 'Q1', strategy: 0.0, benchmark: 0.0, alpha: '+0.0%', signal: 88, volume: '$1.1B' },
      { time: 'Q2', strategy: 11.2, benchmark: 3.4, alpha: '+7.8%', signal: 92, volume: '$1.4B' },
      { time: 'Q3', strategy: 24.5, benchmark: 7.1, alpha: '+17.4%', signal: 95, volume: '$1.9B' },
      { time: 'Q4', strategy: baseApy, benchmark: 11.2, alpha: `+${(baseApy - 11.2).toFixed(1)}%`, signal: 98, volume: '$2.3B' }
    ];
  }

  if (timeframe === 'ALL') {
    return [
      { time: 'Launch', strategy: 0.0, benchmark: 0.0, alpha: '+0.0%', signal: 90, volume: '$50M' },
      { time: '2024',   strategy: 18.5, benchmark: 5.2, alpha: '+13.3%', signal: 94, volume: '$850M' },
      { time: '2025',   strategy: 36.8, benchmark: 12.1, alpha: '+24.7%', signal: 96, volume: '$1.8B' },
      { time: 'Current', strategy: baseApy * 1.25, benchmark: 15.4, alpha: `+${((baseApy * 1.25) - 15.4).toFixed(1)}%`, signal: 98, volume: '$3.1B' }
    ];
  }

  // Default '1M'
  return [
    { time: 'Week 1', strategy: 0.0, benchmark: 0.0, alpha: '+0.0%', signal: 90, volume: '$42M' },
    { time: 'Week 2', strategy: 2.8, benchmark: 0.9, alpha: '+1.9%', signal: 92, volume: '$88M' },
    { time: 'Week 3', strategy: 2.1, benchmark: 0.2, alpha: '+1.9%', signal: 95, volume: '$105M' },
    { time: 'Week 4', strategy: 5.4, benchmark: 1.5, alpha: '+3.9%', signal: 94, volume: '$142M' },
    { time: 'Week 5', strategy: 8.9, benchmark: 2.4, alpha: '+6.5%', signal: 97, volume: '$190M' },
    { time: 'Current', strategy: baseApy / 4, benchmark: 3.1, alpha: `+${((baseApy / 4) - 3.1).toFixed(1)}%`, signal: 98, volume: '$220M' }
  ];
};

export const ExploreStrategiesModal: React.FC<ExploreStrategiesModalProps> = ({ 
  isOpen, 
  onClose, 
  theme, 
  onSelectStrategy 
}) => {
  const isDark = theme === 'dark';
  const featuredStrategy = useFeaturedStrategy();
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [isDeploying, setIsDeploying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!featuredStrategy) return [];
    return generateChartData(timeframe, featuredStrategy.apy);
  }, [timeframe, featuredStrategy]);

  const handleDeploy = () => {
    if (!featuredStrategy) return;
    setIsDeploying(true);

    // Call callback to copy requirements & implementation logic to configuration
    onSelectStrategy(featuredStrategy);

    // Show subtle toast notification
    setToastMessage("Deployed successfully");

    setTimeout(() => {
      setIsDeploying(false);
      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 1500);
    }, 600);
  };

  if (!isOpen || !featuredStrategy) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: '3%' }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={`fixed inset-x-0 bottom-0 top-[3%] rounded-t-[28px] z-50 flex flex-col shadow-2xl max-w-5xl mx-auto border-t ${
          isDark ? 'bg-[#0B0E14] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}
      >
        {/* Subtle Floating Notification Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/30 flex items-center gap-2.5 border border-emerald-300/40"
            >
              <div className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-slate-950" />
              </div>
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">{featuredStrategy.name}</h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                  {featuredStrategy.badge}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{featuredStrategy.tagline}</p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Detailed Performance Chart Section */}
          <div className={`p-5 sm:p-6 rounded-2xl border ${isDark ? 'bg-[#12161F] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
            
            {/* Chart Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b pb-4 border-white/5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Live Performance & Backtest Simulation
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                    PEO ACTIVE
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-500">{featuredStrategy.apy}</span>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target APY Yield</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Win Rate: {featuredStrategy.successRate}
                  </span>
                </div>
              </div>

              {/* Timeframe selector */}
              <div className={`flex items-center p-1 rounded-xl border self-start sm:self-auto ${isDark ? 'bg-black/30 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                {(['24H', '7D', '1M', '3M', '1Y', 'ALL'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      timeframe === tf
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="strategyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="benchmarkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#E2E8F0'} vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke={isDark ? '#64748B' : '#94A3B8'} 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke={isDark ? '#64748B' : '#94A3B8'} 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => `+${v}%`} 
                  />

                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className={`p-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs space-y-1.5 ${
                          isDark ? 'bg-[#0B0E14]/95 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
                        }`}>
                          <div className="font-extrabold text-slate-400 border-b border-white/10 pb-1 flex justify-between gap-4">
                            <span>Timeframe: {label}</span>
                            <span className="text-emerald-400 font-black">Alpha: {data.alpha}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-emerald-500 font-extrabold">Strategy Return:</span>
                            <span className="font-black text-emerald-400">+{data.strategy}%</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-blue-400 font-bold">Benchmark (Raw):</span>
                            <span className="font-extrabold text-blue-300">+{data.benchmark}%</span>
                          </div>
                          <div className="flex justify-between gap-4 text-[11px] pt-1 border-t border-white/5 text-slate-400">
                            <span>AI Confidence Score:</span>
                            <span className="font-bold text-white">{data.signal}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Area 
                    type="monotone" 
                    dataKey="strategy" 
                    name="Strategy Return"
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    fill="url(#strategyGrad)" 
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                  />

                  <Line 
                    type="monotone" 
                    dataKey="benchmark" 
                    name="Benchmark"
                    stroke="#3b82f6" 
                    strokeWidth={1.5} 
                    strokeDasharray="4 4" 
                    dot={false} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Footer Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5 text-xs">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <span className={`block text-[10px] font-black uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sharpe Ratio</span>
                <span className="text-sm font-black text-emerald-400">{featuredStrategy.sharpeRatio}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <span className={`block text-[10px] font-black uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Max Drawdown</span>
                <span className="text-sm font-black text-emerald-400">{featuredStrategy.maxDrawdown}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <span className={`block text-[10px] font-black uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Monthly Return</span>
                <span className="text-sm font-black text-emerald-400">{featuredStrategy.monthlyReturn}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <span className={`block text-[10px] font-black uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>AI Confidence</span>
                <span className="text-sm font-black text-emerald-400">{featuredStrategy.aiConfidence}</span>
              </div>
            </div>

          </div>

          {/* Strategy Details Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className={`text-xs font-black uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Overview & Mechanics
              </h4>
              <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {featuredStrategy.description}
              </p>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                <h5 className="text-xs font-black uppercase mb-1.5 text-emerald-500 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Execution Methodology
                </h5>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {featuredStrategy.howItWorks}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Deployment Parameters
              </h4>

              <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                {[
                  { label: 'Category', value: featuredStrategy.category },
                  { label: 'Risk Profile', value: featuredStrategy.riskLevel },
                  { label: 'Supported Pairs', value: featuredStrategy.supportedAssets.join(', ') },
                  { label: 'Execution Timeframe', value: featuredStrategy.timeframes.join(', ') },
                  { label: 'Frequency', value: featuredStrategy.recommendedAiConfig.frequency },
                  { label: 'Position Sizing', value: featuredStrategy.recommendedAiConfig.positionSizing },
                  { label: 'Capital Allocation', value: featuredStrategy.recommendedAiConfig.capitalAllocation }
                ].map((row, i) => (
                  <div key={row.label} className={`flex items-center justify-between p-3.5 text-xs ${i !== 6 ? (isDark ? 'border-b border-white/5' : 'border-b border-slate-100') : ''}`}>
                    <span className={`font-black uppercase text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{row.label}</span>
                    <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Advantages & Disadvantages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
              <h4 className={`text-xs font-black uppercase mb-2 flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Key Advantages
              </h4>
              <ul className={`text-xs space-y-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {featuredStrategy.advantages.map((adv, i) => (
                  <li key={`adv-${i}`} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-100'}`}>
              <h4 className={`text-xs font-black uppercase mb-2 flex items-center gap-1.5 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                <Info className="w-3.5 h-3.5" />
                Considerations
              </h4>
              <ul className={`text-xs space-y-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {featuredStrategy.disadvantages.map((dis, i) => (
                  <li key={`dis-${i}`} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{dis}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* Modal Footer / Action Button */}
        <div className={`p-5 sm:p-6 border-t flex-shrink-0 ${isDark ? 'border-white/10 bg-[#0B0E14]' : 'border-slate-200 bg-white'}`}>
          <button
            disabled={isDeploying}
            onClick={handleDeploy}
            className="w-full py-4 rounded-xl bg-emerald-500 text-slate-950 font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {isDeploying ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                <span>Deploying Strategy...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Deploy Strategy</span>
              </>
            )}
          </button>
        </div>

      </motion.div>
    </AnimatePresence>
  );
};
