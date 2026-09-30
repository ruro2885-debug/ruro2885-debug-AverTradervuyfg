import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Target, Clock, ShieldCheck, Activity, Calendar, FileSpreadsheet, Layers } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { AiTrade, AiRecommendation } from '../../types/aiTrading';

interface AiPerformanceHubProps {
  isDark: boolean;
  trades?: AiTrade[];
  recommendations?: AiRecommendation[];
  isSessionActive: boolean;
}

function getTradeTimestamp(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (ts.seconds) return ts.seconds * 1000;
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export default function AiPerformanceHub({ isDark, trades = [], recommendations = [] }: AiPerformanceHubProps) {
  const cardClasses = isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const windowStart = now - THIRTY_DAYS_MS;

  // 1. Single Source of Truth: Filter trades to 30-day window
  const tradesIn30d = useMemo(() => {
    return trades.filter(t => {
      const tTime = getTradeTimestamp(t.closedAt) || getTradeTimestamp(t.openedAt);
      return tTime >= windowStart;
    });
  }, [trades, windowStart]);

  const closedTrades30d = useMemo(() => {
    return tradesIn30d.filter(t => t.status === 'CLOSED');
  }, [tradesIn30d]);

  const hasClosedTrades = closedTrades30d.length > 0;

  // 2. Metric: Strategy Accuracy
  const accuracyResult = useMemo(() => {
    if (closedTrades30d.length === 0) {
      return { value: 'NO DATA', subtitle: '0 Closed Trades (30d)', isPositive: true, hasData: false };
    }
    const winningTrades = closedTrades30d.filter(t => (t.pnl || 0) > 0);
    const winRate = (winningTrades.length / closedTrades30d.length) * 100;
    return {
      value: `${winRate.toFixed(1)}%`,
      subtitle: `${winningTrades.length}/${closedTrades30d.length} Wins`,
      isPositive: winRate >= 50,
      hasData: true
    };
  }, [closedTrades30d]);

  // 3. Metric: Total Trades
  const totalTradesResult = useMemo(() => {
    const count = tradesIn30d.length;
    if (count === 0) {
      return { value: '0', subtitle: '0 Executed (30d)', hasData: false };
    }
    return { value: count.toString(), subtitle: `${closedTrades30d.length} Closed / ${count} Total`, hasData: true };
  }, [tradesIn30d, closedTrades30d]);

  // 4. Metric: Average Holding Time
  const avgHoldingTimeResult = useMemo(() => {
    if (closedTrades30d.length === 0) {
      return { value: 'NO DATA', subtitle: '0 Closed Trades (30d)', hasData: false };
    }
    let totalMs = 0;
    let count = 0;
    closedTrades30d.forEach(t => {
      const openTime = getTradeTimestamp(t.openedAt);
      const closeTime = getTradeTimestamp(t.closedAt);
      if (closeTime > openTime && openTime > 0) {
        totalMs += (closeTime - openTime);
        count++;
      }
    });
    if (count === 0) return { value: 'NO DATA', subtitle: 'No valid duration logs', hasData: false };
    const avgHours = (totalMs / count) / (1000 * 60 * 60);
    if (avgHours < 1) {
      const mins = Math.max(1, Math.round(avgHours * 60));
      return { value: `${mins}m`, subtitle: `Avg across ${count} trades`, hasData: true };
    }
    if (avgHours < 24) {
      return { value: `${avgHours.toFixed(1)}h`, subtitle: `Avg across ${count} trades`, hasData: true };
    }
    const days = avgHours / 24;
    return { value: `${days.toFixed(1)}d`, subtitle: `Avg across ${count} trades`, hasData: true };
  }, [closedTrades30d]);

  // 5. Metric: Profit Factor
  const profitFactorResult = useMemo(() => {
    if (closedTrades30d.length === 0) {
      return { value: 'NO DATA', subtitle: '0 Closed Trades (30d)', isPositive: true, hasData: false };
    }
    const grossProfit = closedTrades30d.filter(t => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = closedTrades30d.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);

    if (grossLoss === 0) {
      return {
        value: grossProfit > 0 ? 'MAX' : '0.00',
        subtitle: grossProfit > 0 ? 'Zero Loss Trades' : 'No Profit Generated',
        isPositive: grossProfit > 0,
        hasData: true
      };
    }
    const factor = grossProfit / grossLoss;
    return {
      value: factor.toFixed(2),
      subtitle: factor >= 1.0 ? 'Profitable (P/L Ratio)' : 'Loss > Profit Ratio',
      isPositive: factor >= 1.0,
      hasData: true
    };
  }, [closedTrades30d]);

  // 6. Cumulative Intelligence Return Chart
  const chartData = useMemo(() => {
    const daysCount = 14;
    const result: { date: string; pnl: number; cumulativePnl: number }[] = [];
    let runningPnl = 0;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const dayTrades = closedTrades30d.filter(t => {
        const closeTs = getTradeTimestamp(t.closedAt);
        return closeTs >= dayStart && closeTs < dayEnd;
      });

      const dayPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      runningPnl += dayPnl;

      result.push({
        date: dateStr,
        pnl: parseFloat(dayPnl.toFixed(2)),
        cumulativePnl: parseFloat(runningPnl.toFixed(2))
      });
    }

    return result;
  }, [closedTrades30d, now]);

  // 7. Daily Performance Snapshots Breakdown Table
  const dailyBreakdown = useMemo(() => {
    const map = new Map<string, {
      dateStr: string;
      total: number;
      wins: number;
      losses: number;
      netPnl: number;
      durationsMs: number[];
    }>();

    closedTrades30d.forEach(t => {
      const closeTs = getTradeTimestamp(t.closedAt);
      if (!closeTs) return;
      const d = new Date(closeTs);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateStr,
          total: 0,
          wins: 0,
          losses: 0,
          netPnl: 0,
          durationsMs: []
        });
      }

      const entry = map.get(dateKey)!;
      entry.total += 1;
      const pnl = t.pnl || 0;
      entry.netPnl += pnl;
      if (pnl > 0) entry.wins += 1;
      else if (pnl < 0) entry.losses += 1;

      const openTs = getTradeTimestamp(t.openedAt);
      if (closeTs > openTs && openTs > 0) {
        entry.durationsMs.push(closeTs - openTs);
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([_, item]) => {
        const winRate = item.total > 0 ? ((item.wins / item.total) * 100).toFixed(1) : '0.0';
        const avgMs = item.durationsMs.length > 0
          ? item.durationsMs.reduce((a, b) => a + b, 0) / item.durationsMs.length
          : 0;
        const avgMins = Math.round(avgMs / 60000);
        const avgHolding = avgMins < 60 ? `${avgMins}m` : `${(avgMins / 60).toFixed(1)}h`;

        return {
          ...item,
          winRate: `${winRate}%`,
          avgHolding
        };
      });
  }, [closedTrades30d]);

  // 8. Recommendation Distribution
  const distributionData = useMemo(() => {
    const acceptedRecommendationIds = new Set(trades.map(t => t.recommendationId));
    const acceptedCount = recommendations.filter(r => acceptedRecommendationIds.has(r.id)).length;
    const totalRecs = recommendations.length;
    
    if (totalRecs === 0) {
      return {
        data: [
          { name: 'Accepted', value: 0, color: '#00D09C' },
          { name: 'Rejected', value: 0, color: '#f43f5e' },
        ],
        acceptedPercent: 0,
        rejectedPercent: 0,
        hasData: false
      };
    }
    
    const acceptedPercent = (acceptedCount / totalRecs) * 100;
    const rejectedPercent = 100 - acceptedPercent;
    
    return {
      data: [
        { name: 'Accepted', value: parseFloat(acceptedPercent.toFixed(1)), color: '#00D09C' },
        { name: 'Rejected', value: parseFloat(rejectedPercent.toFixed(1)), color: '#f43f5e' },
      ],
      acceptedPercent: parseFloat(acceptedPercent.toFixed(1)),
      rejectedPercent: parseFloat(rejectedPercent.toFixed(1)),
      hasData: true
    };
  }, [recommendations, trades]);

  return (
    <div className="space-y-6">
      {/* 30-Day Window Badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#00D09C]" />
          <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
            Rolling 30-Day Performance Window
          </span>
        </div>
        <span className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/20`}>
          {hasClosedTrades ? `${closedTrades30d.length} Completed Trades` : 'NO DATA YET'}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          label="Strategy Accuracy" 
          value={accuracyResult.value} 
          trend={accuracyResult.subtitle} 
          trendColor={accuracyResult.isPositive ? 'text-emerald-500/90' : 'text-rose-500/90'}
          icon={<Target className="w-4 h-4 text-[#00D09C]" />} 
          isDark={isDark} 
        />
        <MetricCard 
          label="Total Trades" 
          value={totalTradesResult.value} 
          trend={totalTradesResult.subtitle} 
          trendColor={isDark ? 'text-slate-400' : 'text-slate-500'}
          icon={<Activity className="w-4 h-4 text-blue-500" />} 
          isDark={isDark} 
        />
        <MetricCard 
          label="Avg Holding Time" 
          value={avgHoldingTimeResult.value} 
          trend={avgHoldingTimeResult.subtitle} 
          trendColor={isDark ? 'text-slate-400' : 'text-slate-500'}
          icon={<Clock className="w-4 h-4 text-amber-500" />} 
          isDark={isDark} 
        />
        <MetricCard 
          label="Profit Factor" 
          value={profitFactorResult.value} 
          trend={profitFactorResult.subtitle} 
          trendColor={profitFactorResult.isPositive ? 'text-emerald-500/90' : 'text-rose-500/90'}
          icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />} 
          isDark={isDark} 
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative Intelligence Return Chart */}
        <div className={`lg:col-span-2 rounded-2xl border ${cardClasses} p-6 relative`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-sm font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
              <TrendingUp className="w-4 h-4 text-[#00D09C]" /> Cumulative Intelligence Return
            </h3>
            <span className={`text-[10px] font-mono px-2 py-1 rounded bg-white/5 border border-white/5 ${textSecondary}`}>
              {hasClosedTrades ? 'RECORDED EXECUTIVE HISTORY' : 'NO HISTORICAL DATA'}
            </span>
          </div>

          <div className="h-[280px] w-full relative">
            {!hasClosedTrades && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-xs rounded-xl text-center">
                <Layers className="w-10 h-10 text-slate-500 mb-2 opacity-60" />
                <h4 className={`text-sm font-bold ${textPrimary}`}>NO PERFORMANCE DATA YET</h4>
                <p className={`text-xs ${textSecondary} max-w-sm mt-1`}>
                  Execute trades via AI Trading to record real 30-day performance analytics and strategy metrics.
                </p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D09C" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#00D09C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} 
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0F172A' : '#fff', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px', 
                    fontSize: '11px',
                    color: isDark ? '#fff' : '#000'
                  }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Cumulative P/L']}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativePnl" 
                  stroke="#00D09C" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPnl)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recommendation Distribution */}
        <div className={`rounded-2xl border ${cardClasses} p-6 flex flex-col`}>
          <h3 className={`text-sm font-black uppercase tracking-widest ${textSecondary} mb-6 flex items-center gap-2`}>
            <BarChart3 className="w-4 h-4 text-blue-500" /> Recommendation Signals
          </h3>
          
          <div className="flex-1 space-y-6">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData.data}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis hide />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {distributionData.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className={textSecondary}>Accepted (Live Execution)</span>
                <span className={`font-black ${textPrimary}`}>{distributionData.acceptedPercent}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={textSecondary}>Rejected (Ignored/Dismissed)</span>
                <span className={`font-black ${textPrimary}`}>{distributionData.rejectedPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 30-Day Daily Performance Snapshots Table */}
      <div className={`rounded-2xl border ${cardClasses} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#00D09C]" />
            <h3 className={`text-sm font-black uppercase tracking-widest ${textSecondary}`}>
              30-Day Daily Performance Snapshots
            </h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 ${textSecondary}`}>
            {dailyBreakdown.length} Active Days
          </span>
        </div>

        {dailyBreakdown.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-xl my-2">
            <p className={`text-xs font-semibold ${textSecondary}`}>
              No daily performance records log found in the past 30 days.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Active trading results will automatically record here upon position close.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'} text-[10px] font-bold uppercase tracking-wider`}>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Trades</th>
                  <th className="py-3 px-3">Win / Loss</th>
                  <th className="py-3 px-3">Win Rate</th>
                  <th className="py-3 px-3">Avg Hold Time</th>
                  <th className="py-3 px-3 text-right">Day Net P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {dailyBreakdown.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className={`py-3 px-3 font-semibold ${textPrimary}`}>{row.dateStr}</td>
                    <td className={`py-3 px-3 font-mono ${textSecondary}`}>{row.total}</td>
                    <td className="py-3 px-3 font-mono">
                      <span className="text-emerald-500 font-bold">{row.wins}W</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-rose-500 font-bold">{row.losses}L</span>
                    </td>
                    <td className={`py-3 px-3 font-mono font-semibold ${row.wins >= row.losses ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {row.winRate}
                    </td>
                    <td className={`py-3 px-3 font-mono ${textSecondary}`}>{row.avgHolding}</td>
                    <td className={`py-3 px-3 font-mono text-right font-black ${row.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {row.netPnl >= 0 ? '+' : ''}${row.netPnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend, isDark, icon, trendColor }: any) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col justify-between ${isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200'}`}>
      <div>
        <div className="flex items-center gap-1.5 mb-2.5">
          {icon}
          <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
        </div>
        <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'} leading-none`}>{value}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-[10px] font-medium block truncate ${trendColor}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}
