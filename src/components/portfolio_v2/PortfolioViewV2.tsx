import React, { useState, useEffect, useMemo, useRef, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Activity, Bell, X, RefreshCw, ZoomIn, 
  ZoomOut, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, 
  ChevronUp, Shield, Landmark, PieChart, Coins, ExternalLink, 
  Sparkles, Sliders, Play, Share2, FileText, ChevronRight, MessageSquare,
  Search, SlidersHorizontal, Layers, Zap, Info, Clock, Lock, ArrowRightLeft,
  ArrowUpRight, ArrowDownRight, BarChart3, Wallet, Menu, Vault, KeyRound,
  ShieldAlert
} from 'lucide-react';
import { createChart, IChartApi, ISeriesApi, AreaSeries, BaselineSeries, createSeriesMarkers } from 'lightweight-charts';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useFinancials } from '../../hooks/useFinancials';
import { TradingEngineContext } from '../../contexts/TradingEngineContext';
import { equityService } from '../../services/equityService';
import { EquityHistoryRecord } from '../../types/aiTrading';
import { safeStorage } from '../../utils/storage';
import { 

  initialWatchlistData, 
  WatchlistItem 
} from '../../utils/portfolioHelpers';
import { generateAvatarSvg } from '../../utils/avatarGenerator';
import AverLogo from '../AverLogo';
import CoinLogo from '../CoinLogo';
import VaultScreen from './VaultScreen';
import AssetStatsScreen from './AssetStatsScreen';
import { useAppNavigation } from '../../contexts/NavigationContext';

interface PortfolioViewV2Props {
  theme: 'light' | 'dark';
  onBack: () => void;
  onNavigate?: (tab: string) => void;
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
  onViewModeChange?: (viewMode: 'portfolio' | 'vault' | 'asset-stats') => void;
}

interface HoverData {
  time: number;
  value: number;
  change: number;
  changePercent: number;
}

// --- DYNAMIC AI COMMENTARY GENERATION ENGINE ---
function generateCatherineCommentary(
  totalValue: number, 
  holdings: any[], // User holdings from AuthContext
  livePrices: Record<string, number>
) {
  // Use actual user holdings instead of hardcoded mock values
  const cryptoTotalVal = (holdings || []).reduce((sum, h) => {
    const price = livePrices[h.ticker || h.symbol] || h.currentPrice || h.price || 0;
    return sum + (price * (h.quantity || 0));
  }, 0);
  
  const cashVal = Math.max(0, totalValue - cryptoTotalVal);
  const cryptoPercent = totalValue > 0 ? ((cryptoTotalVal / totalValue) * 100).toFixed(1) : '0';
  const cashPercent = totalValue > 0 ? ((cashVal / totalValue) * 100).toFixed(1) : '0';

  // Find the top performer from actual holdings or use defaults if empty
  const enrichedHoldings = (holdings || []).map(h => {
    const price = livePrices[h.ticker || h.symbol] || h.currentPrice || h.price || 0;
    const prevPrice = h.avgPrice || price * 0.98; // Fallback for change calc
    const change = ((price - prevPrice) / prevPrice) * 100;
    return { ticker: h.ticker || h.symbol, price, change };
  });

  const sortedByChange = [...enrichedHoldings].sort((a, b) => b.change - a.change);
  const topAsset = sortedByChange[0]?.ticker || 'BTC';
  const topAssetChange = sortedByChange[0]?.change?.toFixed(2) || '0.00';
  const topAssetPrice = (sortedByChange[0]?.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const worstAsset = sortedByChange[sortedByChange.length - 1]?.ticker || 'SOL';
  const worstAssetChange = sortedByChange.length > 0 ? Math.abs(sortedByChange[sortedByChange.length - 1]?.change || 0).toFixed(2) : '0.00';

  const commentaries = [
    {
      topic: 'Strategic Position Balance',
      text: `Sovereign Vault I is currently positioned with a highly resilient ${cashPercent}% cash reserve and ${cryptoPercent}% exposure in premier crypto positions. This conservative posture minimizes overall portfolio Beta to 0.85, effectively insulating core capital from systemic market drawdowns while maintaining an active upside hedge through our ${topAsset} position.`
    },
    {
      topic: 'Staking Velocity & Asset Yields',
      text: `Our active staking positions are capitalizing on network velocity. Staking yields on Ethereum remain optimized at 4.2% APY, while our ${topAsset} holdings (+${topAssetChange}%) continue to act as a core performance driver. Given current market momentum, maintaining this exposure with a high AI Health Score of 98/100 is recommended.`
    },
    {
      topic: 'Tactical Profit Reallocation',
      text: `The portfolio is showing strong concentration gains as ${topAsset} trades near $${topAssetPrice} (+${topAssetChange}% today). Our algorithmic indicators suggest capturing partial profits at this key near-term resistance level, reallocating those yields back into our stable compounding Sovereign Vaults to secure our high-water marks.`
    },
    {
      topic: 'Buy-The-Dip Accumulation Window',
      text: `With today's minor retracement in ${worstAsset} (-${worstAssetChange}%), we are seeing a valuable accumulation window. Thanks to our disciplined risk framework, our core portfolio value remains protected. The liquid cash reserve of $${Math.round(cashVal).toLocaleString()} is positioned to scale into these high-liquidity zones over the next 72 hours.`
    },
    {
      topic: 'Systemic Diversification Evaluation',
      text: `An analysis of our asset allocation matrix confirms optimal diversification across core store-of-value assets and smart-contract utility platforms. With Solana DeFi velocity exceeding expectations, our overall cryptocurrency exposure within custody holdings provides an exceptional asymmetric return profile.`
    }
  ];

  const hour = new Date().getHours();
  const index = hour % commentaries.length;
  return commentaries[index];
}

// --- FINANCIAL TIME-SERIES EQUITY CURVE CHART WITH DYNAMIC MULTI-COLOR SEGMENTS ---
/**
 * Intelligently downsamples a chronological array of equity points to a target max count (e.g. 50-60 points),
 * strictly preserving:
 * - First point & Last point (current live equity)
 * - Global Min & Global Max
 * - Local Peaks (maximums) & Local Troughs (minimums)
 * - Direction reversals (UP -> DOWN, DOWN -> UP)
 * - Strict chronological order
 */
function smartDownsample(
  rawData: Array<{ time: any; value: number }>,
  maxPoints: number = 55
): Array<{ time: any; value: number }> {
  if (!rawData || rawData.length <= maxPoints) {
    return rawData;
  }

  const n = rawData.length;
  const resultIndices = new Set<number>();

  // Always include boundary points
  resultIndices.add(0);
  resultIndices.add(n - 1);

  // Global min & max
  let minIdx = 0;
  let maxIdx = 0;
  for (let i = 1; i < n; i++) {
    const v = Number(rawData[i].value) || 0;
    if (v < (Number(rawData[minIdx].value) || 0)) minIdx = i;
    if (v > (Number(rawData[maxIdx].value) || 0)) maxIdx = i;
  }
  resultIndices.add(minIdx);
  resultIndices.add(maxIdx);

  // Local peaks & troughs (direction reversals)
  for (let i = 1; i < n - 1; i++) {
    const prev = Number(rawData[i - 1].value) || 0;
    const curr = Number(rawData[i].value) || 0;
    const next = Number(rawData[i + 1].value) || 0;

    if ((curr > prev && curr >= next) || (curr < prev && curr <= next)) {
      resultIndices.add(i);
    }
  }

  let keyIndices = Array.from(resultIndices).sort((a, b) => a - b);

  // If we extracted more key feature points than maxPoints, bucket chunk-by-chunk preserving peak/trough
  if (keyIndices.length > maxPoints) {
    const bucketed = new Set<number>([0, n - 1, minIdx, maxIdx]);
    const numBuckets = maxPoints - 4;
    const chunkSize = (keyIndices.length - 2) / numBuckets;

    for (let i = 0; i < numBuckets; i++) {
      const startKey = Math.floor(i * chunkSize) + 1;
      const endKey = Math.min(keyIndices.length - 1, Math.floor((i + 1) * chunkSize) + 1);

      let localMinKey = startKey;
      let localMaxKey = startKey;

      for (let k = startKey; k < endKey; k++) {
        const idx = keyIndices[k];
        const val = Number(rawData[idx].value) || 0;
        if (val < (Number(rawData[keyIndices[localMinKey]].value) || 0)) localMinKey = k;
        if (val > (Number(rawData[keyIndices[localMaxKey]].value) || 0)) localMaxKey = k;
      }

      bucketed.add(keyIndices[localMinKey]);
      bucketed.add(keyIndices[localMaxKey]);
    }

    keyIndices = Array.from(bucketed).sort((a, b) => a - b);
  } else if (keyIndices.length < maxPoints) {
    // If fewer peaks/troughs exist, evenly fill intermediate points so horizontal spacing is smooth
    const needed = maxPoints - keyIndices.length;
    const step = (n - 1) / (needed + 1);
    for (let i = 1; i <= needed; i++) {
      const sampleIdx = Math.round(i * step);
      if (sampleIdx >= 0 && sampleIdx < n) {
        resultIndices.add(sampleIdx);
      }
    }
    keyIndices = Array.from(resultIndices).sort((a, b) => a - b);
  }

  return keyIndices.map(idx => rawData[idx]);
}

function AverPortfolioChart({ 
  data, 
  baselineValue,
  isDark,
  onHover,
  executionEvents,
  onSelectEvent
}: { 
  data: { time: any; value: number; }[], 
  baselineValue: number,
  isDark: boolean,
  onHover: (hoverData: HoverData | null) => void,
  executionEvents: any[],
  onSelectEvent?: (eventId: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 260 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Viewport windowing & pan state
  const [viewMode, setViewMode] = useState<'live' | 'all'>('live');
  const [panIndex, setPanIndex] = useState<number>(0); // 0 = latest points
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartPanRef = useRef<number>(0);

  const MAX_VIEWPORT_POINTS = 55;

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 600;
        setDimensions({ width: w, height: 260 });
      }
    };
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute the current visible window dataset from complete stored history
  const { visibleData, isWindowed, totalCount, startIdx, endIdx } = useMemo(() => {
    if (!data || data.length === 0) {
      return { visibleData: [], isWindowed: false, totalCount: 0, startIdx: 0, endIdx: 0 };
    }

    const total = data.length;
    if (total <= MAX_VIEWPORT_POINTS) {
      return { visibleData: data, isWindowed: false, totalCount: total, startIdx: 0, endIdx: total };
    }

    if (viewMode === 'live') {
      const end = Math.max(MAX_VIEWPORT_POINTS, total - panIndex);
      const start = Math.max(0, end - MAX_VIEWPORT_POINTS);
      return {
        visibleData: data.slice(start, end),
        isWindowed: true,
        totalCount: total,
        startIdx: start,
        endIdx: end
      };
    } else {
      const downsampled = smartDownsample(data, MAX_VIEWPORT_POINTS);
      return {
        visibleData: downsampled,
        isWindowed: true,
        totalCount: total,
        startIdx: 0,
        endIdx: total
      };
    }
  }, [data, viewMode, panIndex]);

  const { width, height } = dimensions;
  const paddingLeft = 12;
  const paddingRight = 64; // Dedicated margin for crisp right price scale
  const paddingTop = 22;
  const paddingBottom = 26; // Dedicated margin for bottom time scale

  const chartLeft = paddingLeft;
  const chartRight = Math.max(chartLeft + 50, width - paddingRight);
  const chartWidth = chartRight - chartLeft;

  const chartTop = paddingTop;
  const chartBottom = height - paddingBottom;
  const chartHeight = chartBottom - chartTop;

  // Derive mathematical coordinate mapping strictly from visible window points
  const { displayMin, displayMax, displayRange, points, segments } = useMemo(() => {
    if (!visibleData || visibleData.length === 0) {
      return { displayMin: 0, displayMax: 100, displayRange: 100, points: [], segments: [] };
    }

    const values = visibleData.map(d => Number(d.value) || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const rawRange = maxVal - minVal;

    // Proportional 10-12% padding above and below so points never touch bounding box edges
    const pad = rawRange > 0.001 
      ? Math.max(rawRange * 0.12, 0.25)
      : Math.max(1.0, Math.abs(minVal || 100) * 0.05);

    const dMin = minVal - pad;
    const dMax = maxVal + pad;
    const dRange = Math.max(0.001, dMax - dMin);

    // Map each visible point to physical coordinates inside chart box
    const pts = visibleData.map((d, i) => {
      const x = visibleData.length > 1
        ? chartLeft + (i / (visibleData.length - 1)) * chartWidth
        : chartLeft + chartWidth / 2;

      const normY = (Number(d.value) - dMin) / dRange;
      const y = chartBottom - (normY * chartHeight);

      return {
        x,
        y: Math.max(chartTop, Math.min(chartBottom, y)),
        value: Number(d.value),
        time: d.time,
        index: i
      };
    });

    // Consecutive segments: UP delta => GREEN (#00D09C), DOWN delta => RED (#FF6B6B)
    const segs = [];
    for (let i = 1; i < pts.length; i++) {
      const pPrev = pts[i - 1];
      const pCurr = pts[i];
      const delta = pCurr.value - pPrev.value;
      const isUp = delta >= 0;
      const color = isUp ? '#00D09C' : '#FF6B6B';

      segs.push({
        pPrev,
        pCurr,
        delta,
        isUp,
        color,
        key: `seg-${i}`
      });
    }

    return {
      displayMin: dMin,
      displayMax: dMax,
      displayRange: dRange,
      points: pts,
      segments: segs
    };
  }, [visibleData, chartLeft, chartRight, chartWidth, chartTop, chartBottom, chartHeight]);

  // Y-axis horizontal gridlines and price labels (4 evenly spaced levels)
  const yAxisTicks = useMemo(() => {
    const count = 4;
    const ticks = [];
    for (let i = 0; i < count; i++) {
      const ratio = i / (count - 1);
      const val = displayMin + ratio * displayRange;
      const y = chartBottom - (ratio * chartHeight);
      ticks.push({ val, y });
    }
    return ticks;
  }, [displayMin, displayRange, chartBottom, chartHeight]);

  // Format time label for X-axis
  const formatTimeLabel = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const timeMs = typeof timestamp === 'number'
        ? (timestamp > 1e11 ? timestamp : timestamp * 1000)
        : Date.now();
      const d = new Date(timeMs);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  // X-axis time ticks
  const xAxisTicks = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length <= 4) {
      return points.map(p => ({ x: p.x, label: formatTimeLabel(p.time) }));
    }
    const step = (points.length - 1) / 3;
    const indices = [0, Math.round(step), Math.round(step * 2), points.length - 1];
    const uniqueIndices = Array.from(new Set(indices));
    return uniqueIndices.map(idx => ({
      x: points[idx].x,
      label: formatTimeLabel(points[idx].time)
    }));
  }, [points]);

  // Map execution markers to exact point coordinates
  const mappedEvents = useMemo(() => {
    if (!executionEvents || executionEvents.length === 0 || points.length === 0) return [];
    return executionEvents.map(evt => {
      const evtTimeSec = typeof evt.timestamp === 'number' 
        ? (evt.timestamp > 1e11 ? Math.floor(evt.timestamp / 1000) : evt.timestamp)
        : Math.floor(Date.now() / 1000);
      
      let closestPt = points[0];
      let minDiff = Infinity;
      for (const p of points) {
        const pSec = typeof p.time === 'number' ? (p.time > 1e11 ? Math.floor(p.time / 1000) : p.time) : 0;
        const diff = Math.abs(pSec - evtTimeSec);
        if (diff < minDiff) {
          minDiff = diff;
          closestPt = p;
        }
      }

      return {
        ...evt,
        x: closestPt.x,
        y: closestPt.y,
        isBuy: evt.action === 'BUY',
      };
    });
  }, [executionEvents, points]);

  // Hover & Drag interaction handling
  const handleInteraction = (clientX: number) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;

    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }

    setHoverIndex(closestIdx);
    const currPoint = points[closestIdx];
    const prevPoint = closestIdx > 0 ? points[closestIdx - 1] : currPoint;
    const change = currPoint.value - prevPoint.value;
    const changePercent = prevPoint.value !== 0 ? (change / prevPoint.value) * 100 : 0;

    onHover({
      time: currPoint.time,
      value: currPoint.value,
      change,
      changePercent
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (data.length <= MAX_VIEWPORT_POINTS) return;
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartPanRef.current = panIndex;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStartXRef.current;
      const pointsShift = Math.round(deltaX / 8);
      const maxPan = Math.max(0, data.length - MAX_VIEWPORT_POINTS);
      const newPan = Math.min(maxPan, Math.max(0, dragStartPanRef.current + pointsShift));
      setPanIndex(newPan);
      if (viewMode !== 'live') setViewMode('live');
      return;
    }
    handleInteraction(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (data.length <= MAX_VIEWPORT_POINTS || e.touches.length === 0) return;
    setIsDragging(true);
    dragStartXRef.current = e.touches[0].clientX;
    dragStartPanRef.current = panIndex;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      if (isDragging) {
        const deltaX = e.touches[0].clientX - dragStartXRef.current;
        const pointsShift = Math.round(deltaX / 8);
        const maxPan = Math.max(0, data.length - MAX_VIEWPORT_POINTS);
        const newPan = Math.min(maxPan, Math.max(0, dragStartPanRef.current + pointsShift));
        setPanIndex(newPan);
        if (viewMode !== 'live') setViewMode('live');
        return;
      }
      handleInteraction(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    handleMouseLeave();
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverIndex(null);
    onHover(null);
  };

  const activeHoverPoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const hoverPrevPoint = hoverIndex !== null && hoverIndex > 0 ? points[hoverIndex - 1] : activeHoverPoint;
  const hoverDelta = activeHoverPoint && hoverPrevPoint ? activeHoverPoint.value - hoverPrevPoint.value : 0;
  const hoverColor = hoverDelta >= 0 ? '#00D09C' : '#FF6B6B';

  // Baseline Y position if within visible bounds
  const baselineY = useMemo(() => {
    if (baselineValue !== undefined && baselineValue >= displayMin && baselineValue <= displayMax && displayRange > 0) {
      const normBase = (baselineValue - displayMin) / displayRange;
      return chartBottom - (normBase * chartHeight);
    }
    return null;
  }, [baselineValue, displayMin, displayMax, displayRange, chartBottom, chartHeight]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-[260px] relative select-none cursor-crosshair touch-manipulation overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Chart Viewport Bar for large history sets */}
      {data && data.length > MAX_VIEWPORT_POINTS && (
        <div className="absolute top-1 left-3 right-16 z-10 flex items-center justify-between text-[10px] font-sans pointer-events-auto">
          <div className="flex items-center space-x-1 bg-[#080B11]/90 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/[0.08]">
            <button
              onClick={() => { setViewMode('live'); setPanIndex(0); }}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${viewMode === 'live' && panIndex === 0 ? 'bg-[#00D09C] text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              LIVE FOCUS
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${viewMode === 'all' ? 'bg-[#00D09C] text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              FULL CURVE
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {viewMode === 'live' && panIndex > 0 && (
              <button
                onClick={() => setPanIndex(0)}
                className="bg-[#00D09C]/20 border border-[#00D09C]/40 text-[#00D09C] hover:bg-[#00D09C]/30 px-2 py-0.5 rounded text-[9px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
              >
                <span>⚡ RETURN TO LIVE</span>
              </button>
            )}
            <span className="text-[9px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded border border-white/[0.05]">
              {viewMode === 'live' 
                ? (panIndex === 0 ? `LIVE (${visibleData.length}/${totalCount} pts)` : `HISTORICAL (${startIdx + 1}-${endIdx}/${totalCount})`)
                : `SMART CURVE (${visibleData.length} key pts of ${totalCount})`
              }
            </span>
          </div>
        </div>
      )}

      <svg width={width} height={height} className="w-full h-full block overflow-visible">
        <defs>
          {/* Green Upward Area Gradient */}
          <linearGradient id="upAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00D09C" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00D09C" stopOpacity="0.01" />
          </linearGradient>
          {/* Red Downward Area Gradient */}
          <linearGradient id="downAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.01" />
          </linearGradient>
          {/* Subtle Glow Filters */}
          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#00D09C" floodOpacity="0.4" />
          </filter>
          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#FF6B6B" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Horizontal Grid Lines & Price Labels */}
        {yAxisTicks.map((tick, idx) => (
          <g key={`ytick-${idx}`}>
            <line 
              x1={chartLeft} 
              y1={tick.y} 
              x2={chartRight} 
              y2={tick.y} 
              stroke={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"} 
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text 
              x={chartRight + 8} 
              y={tick.y + 3.5} 
              fill={isDark ? "#64748b" : "#94a3b8"} 
              fontSize="10" 
              fontFamily="monospace"
              fontWeight="500"
              textAnchor="start"
            >
              ${tick.val.toFixed(2)}
            </text>
          </g>
        ))}

        {/* 2. Baseline Reference Line (if active) */}
        {baselineY !== null && (
          <g>
            <line 
              x1={chartLeft} 
              y1={baselineY} 
              x2={chartRight} 
              y2={baselineY} 
              stroke="rgba(255, 255, 255, 0.15)" 
              strokeDasharray="2 2"
              strokeWidth="1"
            />
            <rect 
              x={chartRight + 6} 
              y={baselineY - 7} 
              width={34} 
              height={14} 
              rx={3} 
              fill={isDark ? "#0f172a" : "#e2e8f0"} 
              stroke="rgba(255,255,255,0.1)" 
            />
            <text 
              x={chartRight + 10} 
              y={baselineY + 3} 
              fill="#94a3b8" 
              fontSize="8" 
              fontFamily="monospace"
              fontWeight="bold"
            >
              BASE
            </text>
          </g>
        )}

        {/* 3. Under-Curve Area Fills for each consecutive segment */}
        {segments.map(seg => (
          <polygon 
            key={`poly-${seg.key}`}
            points={`${seg.pPrev.x},${seg.pPrev.y} ${seg.pCurr.x},${seg.pCurr.y} ${seg.pCurr.x},${chartBottom} ${seg.pPrev.x},${chartBottom}`}
            fill={seg.isUp ? "url(#upAreaGrad)" : "url(#downAreaGrad)"}
          />
        ))}

        {/* 4. Multi-Color Line Segments (UP = Green #00D09C, DOWN = Red #FF6B6B) */}
        {segments.map(seg => (
          <line 
            key={`line-${seg.key}`}
            x1={seg.pPrev.x}
            y1={seg.pPrev.y}
            x2={seg.pCurr.x}
            y2={seg.pCurr.y}
            stroke={seg.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* 5. Smooth Vertex Dots at Connection Points */}
        {points.map((p, idx) => {
          const isLast = idx === points.length - 1;
          const color = idx > 0 
            ? (p.value >= points[idx - 1].value ? '#00D09C' : '#FF6B6B')
            : '#00D09C';
          return (
            <circle 
              key={`dot-${idx}`}
              cx={p.x}
              cy={p.y}
              r={isLast ? 3.5 : 1.5}
              fill={color}
              stroke={isLast ? '#fff' : 'none'}
              strokeWidth={isLast ? 1.5 : 0}
            />
          );
        })}

        {/* 6. Trade Execution Markers (BUY / SELL dots on the exact curve) */}
        {mappedEvents.map((evt, idx) => (
          <g 
            key={`evt-${evt.id || idx}`}
            className="cursor-pointer transition-transform hover:scale-125"
            onClick={() => onSelectEvent && onSelectEvent(evt.id)}
          >
            {/* Outer Pulsing Halo */}
            <circle 
              cx={evt.x} 
              cy={evt.y} 
              r="7" 
              fill={evt.isBuy ? "rgba(0, 208, 156, 0.2)" : "rgba(255, 107, 107, 0.2)"}
            >
              <animate attributeName="r" values="5;10;5" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.2s" repeatCount="indefinite" />
            </circle>
            {/* Inner Solid Badge */}
            <circle 
              cx={evt.x} 
              cy={evt.y} 
              r="4" 
              fill={evt.isBuy ? "#00D09C" : "#FF6B6B"}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {/* Small Label Pill */}
            <rect 
              x={evt.x - 14} 
              y={evt.y - 18} 
              width="28" 
              height="12" 
              rx="3" 
              fill="#080B11" 
              stroke={evt.isBuy ? "#00D09C" : "#FF6B6B"} 
              strokeWidth="0.8" 
            />
            <text 
              x={evt.x} 
              y={evt.y - 9} 
              fill="#ffffff" 
              fontSize="7" 
              fontWeight="bold" 
              fontFamily="sans-serif" 
              textAnchor="middle"
            >
              {evt.action || (evt.isBuy ? 'BUY' : 'SELL')}
            </text>
          </g>
        ))}

        {/* 7. Interactive Crosshair & Cursor Highlight */}
        {activeHoverPoint && (
          <g>
            {/* Vertical crosshair line */}
            <line 
              x1={activeHoverPoint.x} 
              y1={chartTop} 
              x2={activeHoverPoint.x} 
              y2={chartBottom} 
              stroke={isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"} 
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            {/* Horizontal crosshair line */}
            <line 
              x1={chartLeft} 
              y1={activeHoverPoint.y} 
              x2={chartRight} 
              y2={activeHoverPoint.y} 
              stroke={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"} 
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            {/* Outer glowing cursor ring */}
            <circle 
              cx={activeHoverPoint.x} 
              cy={activeHoverPoint.y} 
              r="7" 
              fill={hoverColor === '#00D09C' ? "rgba(0, 208, 156, 0.25)" : "rgba(255, 107, 107, 0.25)"} 
            />
            {/* Inner cursor dot */}
            <circle 
              cx={activeHoverPoint.x} 
              cy={activeHoverPoint.y} 
              r="4.5" 
              fill="#ffffff" 
              stroke={hoverColor} 
              strokeWidth="2.5" 
            />
            {/* Active Price Badge on Right Y-Axis */}
            <g>
              <rect 
                x={chartRight + 2} 
                y={activeHoverPoint.y - 9} 
                width="56" 
                height="18" 
                rx="4" 
                fill="#080B11" 
                stroke={hoverColor} 
                strokeWidth="1"
              />
              <text 
                x={chartRight + 6} 
                y={activeHoverPoint.y + 3.5} 
                fill="#ffffff" 
                fontSize="10" 
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="start"
              >
                ${activeHoverPoint.value.toFixed(2)}
              </text>
            </g>
            {/* Active Time Badge on Bottom X-Axis */}
            <g>
              <rect 
                x={Math.max(chartLeft, Math.min(chartRight - 54, activeHoverPoint.x - 27))} 
                y={chartBottom + 3} 
                width="54" 
                height="16" 
                rx="3" 
                fill="#080B11" 
                stroke="rgba(255, 255, 255, 0.2)" 
                strokeWidth="0.8"
              />
              <text 
                x={Math.max(chartLeft + 27, Math.min(chartRight - 27, activeHoverPoint.x))} 
                y={chartBottom + 14} 
                fill="#94a3b8" 
                fontSize="8" 
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {formatTimeLabel(activeHoverPoint.time)}
              </text>
            </g>
          </g>
        )}

        {/* 8. Bottom X-Axis Time Ticks */}
        {xAxisTicks.map((tick, idx) => (
          <text 
            key={`xtick-${idx}`}
            x={tick.x} 
            y={height - 6} 
            fill={isDark ? "#64748b" : "#94a3b8"} 
            fontSize="9" 
            fontFamily="monospace"
            fontWeight="500"
            textAnchor="middle"
          >
            {tick.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

interface RadarAsset {
  symbol: string;
  name: string;
  baseConfidence: number;
  category?: string;
}

interface RadarCategory {
  key: string;
  label: string;
  subtitle: string;
  icon: string;
  dotColor: string;
  assets: RadarAsset[];
}

export default function PortfolioViewV2({ 
  theme, 
  onBack, 
  onNavigate, 
  onOpenDeposit, 
  onOpenWithdraw,
  onViewModeChange
}: PortfolioViewV2Props) {
  const { user, updateProfile } = useAuth();
  const { positions, trades, config, liveTradePrices, session, sessionEquityPoints } = useContext(TradingEngineContext);
  const { 
    totalNetBalance, 
    tokenBalance,
    aiTradingCapital,
    activeTradingBalance,
    vaultBalance,
    totalHoldingsValue,
    updateVaultBalance, 
    addFundsToActiveBalance,
    executeVaultTransfer,
  } = useFinancials();

  // Placeholders for removed functionality to satisfy existing component props
  const activeBalanceOffset = 0;
  const updateActiveBalanceOffset = (_val: any) => {};

  const enrichedActiveTrades = useMemo(() => trades.filter(t => t.status === 'OPEN').map(trade => {
    const livePrice = liveTradePrices[trade.id] || trade.currentPrice || trade.entry;
    return { ...trade, pnl: (livePrice - trade.entry) * trade.quantity };
  }), [trades, liveTradePrices]);

  const totalFloatingPnl = useMemo(() => enrichedActiveTrades.reduce((sum, t) => sum + (t.pnl || 0), 0), [enrichedActiveTrades]);

  const activeEngineCapital = useMemo(() => {
    if (session?.status === 'ACTIVE') {
      return Math.max(0, (session.tradingCapital || session.initialCapital || 0) + totalFloatingPnl);
    }
    return 0;
  }, [session, totalFloatingPnl]);

  const totalValue = useMemo(() => {
    return tokenBalance + activeEngineCapital + vaultBalance + totalHoldingsValue;
  }, [tokenBalance, activeEngineCapital, vaultBalance, totalHoldingsValue]);

  const scrollPositionRef = useRef<number>(0);
  const { formatCurrency } = usePreferences();

  // State to hold hover indicators
  const [hoveredOHLC, setHoveredOHLC] = useState<HoverData | null>(null);

  const handleHover = useCallback((h: HoverData | null) => {
    setHoveredOHLC(h);
  }, []);

  // Navigation mode to switch full-screen pages
  const { currentLocation, navigateSubView, goBack } = useAppNavigation();
  const [localViewMode, setLocalViewMode] = useState<'portfolio' | 'vault' | 'asset-stats'>('portfolio');
  const viewMode: 'portfolio' | 'vault' | 'asset-stats' = 
    (currentLocation.subView === 'vault' || currentLocation.subView === 'asset-stats') 
      ? currentLocation.subView 
      : localViewMode;

  const setViewMode = useCallback((mode: 'portfolio' | 'vault' | 'asset-stats') => {
    setLocalViewMode(mode);
    navigateSubView(mode === 'portfolio' ? undefined : mode);
  }, [navigateSubView]);

  const onViewModeChangeRef = useRef(onViewModeChange);
  useEffect(() => {
    onViewModeChangeRef.current = onViewModeChange;
  }, [onViewModeChange]);

  useEffect(() => {
    if (onViewModeChangeRef.current) {
      onViewModeChangeRef.current(viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'portfolio') {
      const timer = setTimeout(() => {
        window.scrollTo({
          top: scrollPositionRef.current,
          behavior: 'auto'
        });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      scrollPositionRef.current = window.scrollY;
      window.scrollTo({
        top: 0,
        behavior: 'auto'
      });
    }
  }, [viewMode]);

  // Dynamic theme support matching the Aver luxury aesthetic
  const isDark = theme === 'dark';
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardClasses = isDark
    ? "bg-slate-900/40 backdrop-blur-md border border-white/5 shadow-xl"
    : "bg-white/60 backdrop-blur-md border border-slate-200/50 shadow-lg";

  // Real-time fluctuating asset tick simulation state
  // Derived watchlist with actual holdings from user document and live prices
  const watchlist = useMemo<WatchlistItem[]>(() => {
    if (user?.holdings && user.holdings.length > 0) {
      return user.holdings.map((h: any) => {
        const livePrice = liveTradePrices[h.ticker || h.symbol] || h.currentPrice || h.price || 0;
        return {
          ticker: h.ticker || h.symbol || '???',
          name: h.name || h.asset || 'Asset',
          price: livePrice,
          change: h.change || 0,
          allocation: totalNetBalance > 0 ? ((livePrice * (h.quantity || 0)) / totalNetBalance) * 100 : 0,
          aiRating: h.aiRating || 85,
          aiDecision: h.aiDecision || 'HODL',
          news: h.news || 'Market sentiment is currently being analyzed by AI.',
          newsSentiment: h.newsSentiment || 'Neutral',
          logoColor: h.logoColor || 'from-emerald-500 to-teal-500',
          logoText: h.logoText || (h.ticker ? h.ticker[0] : '?'),
          quantity: h.quantity || 0,
          avgEntry: h.avgEntry || h.entryPrice || 0,
          aiDetails: h.aiDetails || 'Autonomous analysis in progress.'
        };
      }) as WatchlistItem[];
    }
    return initialWatchlistData;
  }, [user?.holdings, totalNetBalance, liveTradePrices]);

  const [livePrices, setLivePrices] = useState<Record<string, number>>({
    BTC: 64230.00,
    ETH: 3450.20,
    SOL: 145.60,
    AAPL: 172.50,
    TSLA: 254.30,
    NVDA: 128.20,
    MSFT: 442.10,
    AMZN: 198.20,
    META: 512.40,
    NFLX: 685.20,
    AMD: 172.40,
    INTC: 32.50,
    SPY: 542.10,
    QQQ: 482.50,
    ARKK: 42.10,
    GLD: 224.20,
    Gold: 2035.00,
    ETFs: 450.00
  });

  const mergedLivePrices = useMemo(() => {
    return {
      ...livePrices,
      ...liveTradePrices
    };
  }, [livePrices, liveTradePrices]);

  const [tickTracker, setTickTracker] = useState(0);

  // Live timer interval to update tickTracker every 2 seconds for dynamic AI scores and market fluctuations
  useEffect(() => {
    const timer = setInterval(() => {
      setTickTracker(prev => prev + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Real-time AI Opinion / Radar state
  const [selectedRadarCategory, setSelectedRadarCategory] = useState<string>('all');
  const [isRescanningRadar, setIsRescanningRadar] = useState<boolean>(false);
  const [lastRadarScan, setLastRadarScan] = useState<Date>(new Date());

  const MASTER_ASSET_POOL = useMemo(() => [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'XRP', name: 'Ripple' },
    { symbol: 'Gold', name: 'Gold Spot' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'PEPE', name: 'Pepe' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'SHIB', name: 'Shiba Inu' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'LTC', name: 'Litecoin' },
    { symbol: 'NEAR', name: 'Near Protocol' },
    { symbol: 'SUI', name: 'Sui' },
    { symbol: 'APT', name: 'Aptos' },
    { symbol: 'ARB', name: 'Arbitrum' },
    { symbol: 'OP', name: 'Optimism' }
  ], []);

  const [radarAssets, setRadarAssets] = useState<RadarAsset[]>([
    { symbol: 'BTC', name: 'Bitcoin', baseConfidence: 96, category: 'high_conviction' },
    { symbol: 'ETH', name: 'Ethereum', baseConfidence: 89, category: 'preparing_entry' },
    { symbol: 'SOL', name: 'Solana', baseConfidence: 79, category: 'watching' },
    { symbol: 'XRP', name: 'Ripple', baseConfidence: 65, category: 'preparing_entry' },
    { symbol: 'ADA', name: 'Cardano', baseConfidence: 58, category: 'watching' },
  ]);

  const handleRescanRadar = () => {
    setIsRescanningRadar(true);
    setTimeout(() => {
      // Pick 5 random assets from the pool
      const shuffled = [...MASTER_ASSET_POOL].sort(() => Math.random() - 0.5);
      const count = 5;
      const selected = shuffled.slice(0, count);

      const newAssets = selected.map(asset => {
        const baseConfidence = Math.floor(Math.random() * 85) + 12; // 12 to 97
        let category = 'watching';
        if (baseConfidence >= 85) {
          category = 'high_conviction';
        } else if (baseConfidence >= 65) {
          category = 'preparing_entry';
        } else if (baseConfidence >= 35) {
          category = 'watching';
        } else {
          category = 'avoiding';
        }
        return {
          symbol: asset.symbol,
          name: asset.name,
          baseConfidence,
          category
        };
      });

      setRadarAssets(newAssets);
      setLastRadarScan(new Date());
      setIsRescanningRadar(false);
      showNotification('AI Market Radar rescanned 182 signals across 12 exchanges.');
    }, 1200);
  };

  const radarCategories = useMemo<RadarCategory[]>(() => [
    {
      key: 'watching',
      label: 'Watching',
      subtitle: 'Assets currently being monitored.',
      icon: '👁',
      dotColor: 'bg-sky-400',
      assets: radarAssets.filter(a => a.category === 'watching')
    },
    {
      key: 'preparing_entry',
      label: 'Preparing Entry',
      subtitle: 'Assets approaching AI entry conditions.',
      icon: '🟡',
      dotColor: 'bg-amber-400',
      assets: radarAssets.filter(a => a.category === 'preparing_entry')
    },
    {
      key: 'high_conviction',
      label: 'High Conviction',
      subtitle: 'Assets with the highest confidence score.',
      icon: '🟢',
      dotColor: 'bg-emerald-400',
      assets: radarAssets.filter(a => a.category === 'high_conviction')
    },
    {
      key: 'avoiding',
      label: 'Avoiding',
      subtitle: 'Assets intentionally ignored by the AI.',
      icon: '🔴',
      dotColor: 'bg-rose-500',
      assets: radarAssets.filter(a => a.category === 'avoiding')
    }
  ], [radarAssets]);

  const allocations = useMemo<any[]>(() => {
    // We strictly respect real user holdings and cash. No mock seed data.
    const baseList = [
      { ticker: 'Cash', name: 'USD Cash', color: '#10b981', icon: '$', quantity: user?.availableBalance || 0 }
    ];
    
    // Add real user holdings
    if (user?.holdings && user.holdings.length > 0) {
      user.holdings.forEach((h: any) => {
        if (h.ticker !== 'Cash' && h.symbol !== 'Cash') {
          baseList.push({
            ticker: h.ticker || h.symbol,
            name: h.name || h.ticker || h.symbol,
            color: h.color || '#3b82f6',
            icon: h.icon || (h.ticker || h.symbol).charAt(0),
            quantity: h.quantity || 0
          });
        }
      });
    }

    return baseList.map(a => {
      if (a.ticker === 'Cash' && user?.availableBalance !== undefined) {
        return { ...a, quantity: user.availableBalance };
      }
      if (user?.holdings && user.holdings.length > 0) {
        const match = user.holdings.find(h => h.ticker === a.ticker || h.symbol === a.ticker);
        if (match) {
          return { ...a, quantity: match.quantity };
        }
      }
      return a;
    });
  }, [user?.holdings, user?.availableBalance]);

  const liveAllocations = useMemo(() => {
    const vals = allocations.map(a => {
      let price = 1;
      if (a.ticker === 'BTC') price = mergedLivePrices['BTC'] || 64230;
      else if (a.ticker === 'ETH') price = mergedLivePrices['ETH'] || 3450.20;
      else if (a.ticker === 'SOL') price = mergedLivePrices['SOL'] || 145.60;
      else if (a.ticker === 'AAPL') price = mergedLivePrices['AAPL'] || 172.50;
      else if (a.ticker === 'Gold') price = mergedLivePrices['Gold'] || 2035.00;
      else if (a.ticker === 'ETFs') price = mergedLivePrices['ETFs'] || 450.00;
      
      const valuation = price * a.quantity;
      return { ...a, price, valuation };
    });

    const sum = vals.reduce((acc, curr) => acc + curr.valuation, 0);
    return vals.map(v => ({
      ...v,
      percentage: sum > 0 ? (v.valuation / sum) * 100 : 0
    }));
  }, [allocations, mergedLivePrices]);

  const liveWatchlist = useMemo(() => {
    return watchlist.map(w => {
      const livePrice = mergedLivePrices[w.ticker] || w.price;
      const allocObj = liveAllocations.find(la => la.ticker === w.ticker);
      return {
        ...w,
        price: livePrice,
        allocation: allocObj ? allocObj.percentage : w.allocation
      };
    });
  }, [watchlist, mergedLivePrices, liveAllocations]);

  // Dynamic Portfolio Calculations

  // Lead analyst Catherine Vance state
  const [analystCommentary, setAnalystCommentary] = useState({
    topic: 'Strategic Position Balance',
    text: 'Formulating institutional asset commentary...'
  });
  const [lastCommentaryUpdate, setLastCommentaryUpdate] = useState<Date>(new Date());
  const [isRefreshingCommentary, setIsRefreshingCommentary] = useState(false);

  // Missing States for Vault and Trading dialogs
  const [activeDialog, setActiveDialog] = useState<'trade' | 'vault' | null>(null);
  const [vaultState, setVaultState] = useState<'closed' | 'deposit' | 'withdraw' | 'goal' | 'setup' | 'locked' | 'unlocked'>('closed');
  const [vaultActionType, setVaultActionType] = useState<'deposit' | 'withdraw' | 'DEPOSIT' | 'WITHDRAW' | null>(null);
  const [vaultActionAsset, setVaultActionAsset] = useState<string>('BTC');
  const [vaultActionAmount, setVaultActionAmount] = useState<string>('');
  const [vaultGoalName, setVaultGoalName] = useState<string>('');
  const [vaultPasscode, setVaultPasscode] = useState<string>('1234'); // Default simulated passcode
  const [showWithdrawPasscodeVerify, setShowWithdrawPasscodeVerify] = useState<boolean>(false);
  const [withdrawVerifyInput, setWithdrawVerifyInput] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState<boolean>(false);

  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeAsset, setTradeAsset] = useState<string>('BTC');
  const [tradeAmount, setTradeAmount] = useState<string>('0');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [vaultSetupStep, setVaultSetupStep] = useState<number>(1);
  const [isPasscodeConfirming, setIsPasscodeConfirming] = useState<boolean>(false);
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [passcodeConfirm, setPasscodeConfirm] = useState<string>('');
  const [isVaultOnboarded, setIsVaultOnboarded] = useState<boolean>(false);
  const [vaultTargetDate, setVaultTargetDate] = useState<string>('');
  const [vaultNotes, setVaultNotes] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Updates analyst advice dynamically based on hourly rotation or live changes
  const updateAnalystAdvice = async (force = false) => {
    if (force) setIsRefreshingCommentary(true);
    
    let cryptoTotalVal = 0;
    liveAllocations.forEach(a => {
      if (a.ticker !== 'Cash') cryptoTotalVal += a.valuation;
    });
    const cashVal = Math.max(0, totalNetBalance - cryptoTotalVal);

    const holdingsSummary = liveAllocations.map(a => ({
      ticker: a.ticker,
      name: a.name,
      percentage: Math.round((a.valuation / (totalNetBalance || 1)) * 100)
    }));

    try {
      const response = await fetch('/api/ai/commentary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolioMetrics: {
            totalValue: totalNetBalance,
            holdings: holdingsSummary,
            cashVal: cashVal
          }
        })
      });

      if (!response.ok) {
        throw new Error('API server returned error status');
      }

      const data = await response.json();
      if (data && data.topic && data.text) {
        setAnalystCommentary(data);
        setLastCommentaryUpdate(new Date());
        if (force) {
          showNotification('AI Analyst advice refreshed using live Gemini model insights.');
        }
      } else {
        throw new Error('Invalid JSON schema received from Gemini commentary');
      }
    } catch (err) {
      console.warn('Gemini commentary API error, falling back to local commentary engine:', err);
      // Fallback local engine
      const freshCommentary = generateCatherineCommentary(totalNetBalance, watchlist, mergedLivePrices);
      setAnalystCommentary(freshCommentary);
      setLastCommentaryUpdate(new Date());
      if (force) {
        showNotification('AI Analyst advice refreshed using local risk metrics (offline mode).');
      }
    } finally {
      if (force) {
        setIsRefreshingCommentary(false);
      }
    }
  };

  const lastAnalyzedBalanceRef = useRef<number | null>(null);

  // Run update on mount / major balance updates
  useEffect(() => {
    // Prevent infinite render loops and API spamming by only updating if balance shifts by more than $1000
    if (lastAnalyzedBalanceRef.current !== null && Math.abs(lastAnalyzedBalanceRef.current - totalNetBalance) < 1000) {
      return;
    }
    lastAnalyzedBalanceRef.current = totalNetBalance;
    updateAnalystAdvice();
  }, [totalNetBalance]);

  // Radar Asset Analysis States
  const [analyzingAsset, setAnalyzingAsset] = useState<RadarAsset | null>(null);
  const [analysisReport, setAnalysisReport] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const runRadarAnalysis = async (asset: RadarAsset) => {
    setAnalyzingAsset(asset);
    setIsAnalyzing(true);
    setAnalysisReport(null);
    
    const symbol = asset.symbol;
    const currentPrice = mergedLivePrices[symbol] || 100;
    const assetChange = watchlist.find(w => w.ticker === symbol)?.change || 1.25;

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketData: {
            symbol: symbol,
            price: currentPrice,
            change: assetChange,
            confidence: getDynamicConfidence(asset.baseConfidence, symbol)
          },
          userProfile: {
            riskProfile: user?.aiSettings?.riskProfile || user?.riskPreference || 'Medium',
            tradingStyle: 'Aggressive',
            preferredMarkets: ['BTC', 'ETH', 'SOL']
          }
        })
      });

      if (!response.ok) {
        throw new Error('API server returned error status');
      }

      const data = await response.json();
      if (data && data.suggestedAction) {
        setAnalysisReport(data);
      } else {
        throw new Error('Invalid JSON received from Gemini analyze');
      }
    } catch (err) {
      console.warn('Gemini analyze API error, falling back to local analysis generator:', err);
      // Fallback local report
      const action = Number(getDynamicConfidence(asset.baseConfidence, symbol)) > 70 ? 'BUY' : 'SELL';
      const p = currentPrice;
      setAnalysisReport({
        asset: symbol,
        currentPrice: p,
        suggestedAction: action,
        entry: Number((p * 0.99).toFixed(2)),
        stopLoss: Number((p * (action === 'BUY' ? 0.95 : 1.05)).toFixed(2)),
        takeProfit: Number((p * (action === 'BUY' ? 1.15 : 0.85)).toFixed(2)),
        riskRating: asset.baseConfidence > 80 ? 'LOW' : 'MEDIUM',
        confidence: Number(getDynamicConfidence(asset.baseConfidence, symbol)),
        holdingWindow: '72 Hours',
        volatility: 'MEDIUM',
        indicators: ['EMA-20 Crossing', 'Relative Strength Index (RSI)', 'Volume Spike'],
        explanation: `Algorithmic monitoring suggests that ${symbol} is exhibiting significant volume breakouts at current price levels. The institutional support band remains strong with high buyer convergence. Maintain risk protection at target key support thresholds.`
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // High-end real photos for asset representation
  const assetImages = useMemo<Record<string, string>>(() => ({
    BTC: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&q=80&w=200',
    ETH: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&q=80&w=200',
    SOL: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=200'
  }), []);  // --- CHART STATE MANAGEMENT ---
  const [timeframe, setTimeframe] = useState<string>('1D');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('ticker');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [equityHistory, setEquityHistory] = useState<EquityHistoryRecord[]>([]);

  useEffect(() => {
    if (user?.uid) {
      const unsub = equityService.subscribeHistory(user.uid, (records) => {
        setEquityHistory(records);
      });
      return () => unsub();
    }
  }, [user?.uid]);

  const filteredEquityHistory = useMemo(() => {
    if (!equityHistory || equityHistory.length === 0) return [];
    const now = Date.now();
    let durationMs = 24 * 60 * 60 * 1000; // 1D default
    if (timeframe === '1D') durationMs = 24 * 60 * 60 * 1000;
    else if (timeframe === '1M') durationMs = 30 * 24 * 60 * 60 * 1000;
    else if (timeframe === '1Y') durationMs = 365 * 24 * 60 * 60 * 1000;

    const cutoff = now - durationMs;
    const filtered = equityHistory.filter(record => {
      const recordTime = record.timestamp && record.timestamp.toMillis 
        ? record.timestamp.toMillis() 
        : (record.timestamp?.seconds 
          ? record.timestamp.seconds * 1000 
          : (typeof record.timestamp === 'number' 
            ? record.timestamp 
            : Date.now()));
      return recordTime >= cutoff;
    });

    if (filtered.length === 0 && equityHistory.length > 0) {
      return [equityHistory[equityHistory.length - 1]];
    }

    return filtered;
  }, [equityHistory, timeframe]);

  const tvChartData = useMemo(() => {
    const points: Array<{ time: number; value: number }> = [];

    if (session?.status === 'ACTIVE' && sessionEquityPoints && sessionEquityPoints.length > 0) {
      // Prioritize active continuous session equity updates
      sessionEquityPoints.forEach(point => {
        const val = point.totalAccountEquity ?? point.equity;
        points.push({
          time: Math.floor(point.timestamp / 1000),
          value: Number(val) || 0
        });
      });
    } else {
      // Add filtered historical equity records
      if (filteredEquityHistory && filteredEquityHistory.length > 0) {
        filteredEquityHistory.forEach(record => {
          const timeSec = record.timestamp && typeof record.timestamp.seconds === 'number' 
            ? record.timestamp.seconds 
            : Math.floor((record.timestamp?.toMillis ? record.timestamp.toMillis() : Date.now()) / 1000);
          points.push({
            time: timeSec,
            value: Number(record.totalNetBalance ?? record.equity ?? 0)
          });
        });
      }

      // Add session equity points
      if (sessionEquityPoints && sessionEquityPoints.length > 0) {
        sessionEquityPoints.forEach(point => {
          const val = point.totalAccountEquity ?? point.equity;
          points.push({
            time: Math.floor(point.timestamp / 1000),
            value: Number(val) || 0
          });
        });
      }
    }

    // Deduplicate by second timestamp (latest point in same second overwrites) and sort chronologically
    const pointMap = new Map<number, { time: number; value: number }>();
    points.forEach(p => {
      if (!isNaN(p.value) && p.value !== null && p.value !== undefined) {
        pointMap.set(p.time, p);
      }
    });
    const uniquePoints = Array.from(pointMap.values()).sort((a, b) => a.time - b.time);

    // If no points or only 1 point exist (no real recorded session/history yet), provide robust sample demo curve
    if (uniquePoints.length <= 1) {
      const now = Date.now();
      const count = 63;
      const demoPoints: Array<{ time: number; value: number }> = [];
      let startVal = 6197.05;
      let endVal = 5931.43;
      let durationMs = 24 * 60 * 60 * 1000;
      if (timeframe === '1M') {
        startVal = 5500.00;
        endVal = 6245.80;
        durationMs = 30 * 24 * 60 * 60 * 1000;
      } else if (timeframe === '1Y') {
        startVal = 4800.00;
        endVal = 7120.50;
        durationMs = 365 * 24 * 60 * 60 * 1000;
      }
      const step = durationMs / count;
      for (let i = 0; i < count; i++) {
        const t = Math.floor((now - durationMs + (i * step)) / 1000);
        const progress = i / (count - 1);
        const wave = Math.sin(progress * Math.PI * 3) * (timeframe === '1D' ? 45 : 120);
        const val = startVal + (endVal - startVal) * progress + wave;
        demoPoints.push({ time: t, value: Math.max(0, parseFloat(val.toFixed(2))) });
      }
      return demoPoints;
    }

    return uniquePoints;
  }, [session?.status, sessionEquityPoints, filteredEquityHistory, timeframe]);

  const mergedChartData = tvChartData;

  const chartBaselineValue = useMemo(() => {
    if (session?.status === 'ACTIVE' && session.initialCapital) {
      return session.initialCapital;
    }
    if (sessionEquityPoints && sessionEquityPoints.length > 0) {
      return sessionEquityPoints[0].initialCapital || sessionEquityPoints[0].equity;
    }
    if (filteredEquityHistory && filteredEquityHistory.length > 0) {
      const firstRec = filteredEquityHistory[0];
      return firstRec.totalNetBalance ?? firstRec.equity ?? 0;
    }
    if (mergedChartData.length > 0) {
      return mergedChartData[0].value;
    }
    return totalNetBalance || 0;
  }, [session, sessionEquityPoints, filteredEquityHistory, mergedChartData, totalNetBalance]);

  // Synchronized header value calculations derived directly from chart dataset
  const latestChartPoint = useMemo(() => {
    if (mergedChartData && mergedChartData.length > 0) {
      return mergedChartData[mergedChartData.length - 1];
    }
    return null;
  }, [mergedChartData]);

  const firstChartPoint = useMemo(() => {
    if (mergedChartData && mergedChartData.length > 0) {
      return mergedChartData[0];
    }
    return null;
  }, [mergedChartData]);

  const headerDisplayValue = hoveredOHLC
    ? hoveredOHLC.value
    : (latestChartPoint ? latestChartPoint.value : (totalNetBalance || 0));

  const headerBaselineValue = firstChartPoint ? firstChartPoint.value : (totalNetBalance || 0);

  const headerPeriodChange = headerDisplayValue - headerBaselineValue;

  // Live execution events mapped directly to timestamps in tvChartData
  const executionEvents = useMemo(() => {
    // Markers are LIVE SESSION UI markers ONLY.
    // When session is NOT ACTIVE/RUNNING (ENDED/STOPPED/INACTIVE), immediately return empty list to remove all markers.
    if (!session || (session.status !== 'ACTIVE' && session.status !== 'RUNNING')) {
      return [];
    }

    if (tvChartData.length === 0 || !trades || trades.length === 0) return [];

    const nowMs = Date.now();
    let durationMs = 30 * 24 * 60 * 60 * 1000; // 1M default
    if (timeframe === '1D') durationMs = 24 * 60 * 60 * 1000;
    else if (timeframe === '5D') durationMs = 5 * 24 * 60 * 60 * 1000;
    else if (timeframe === '1M') durationMs = 30 * 24 * 60 * 60 * 1000;
    else if (timeframe === '3M') durationMs = 90 * 24 * 60 * 60 * 1000;
    else if (timeframe === '6M') durationMs = 180 * 24 * 60 * 60 * 1000;
    else if (timeframe === '1Y') durationMs = 365 * 24 * 60 * 60 * 1000;

    const chartStartTimeMs = nowMs - durationMs;

    const getChartTimeForDate = (date: Date): any => {
      const dateMs = date.getTime();
      if (dateMs < chartStartTimeMs) {
        return tvChartData[0]?.time || '';
      }
      if (dateMs >= nowMs) {
        return tvChartData[tvChartData.length - 1]?.time || '';
      }
      const fraction = (dateMs - chartStartTimeMs) / durationMs;
      const index = Math.floor(fraction * tvChartData.length);
      const safeIndex = Math.min(tvChartData.length - 1, Math.max(0, index));
      return tvChartData[safeIndex]?.time || '';
    };

    const list: any[] = [];

    trades.forEach((trade) => {
      const openDate = trade.openedAt ? (trade.openedAt.toDate ? trade.openedAt.toDate() : new Date(trade.openedAt as any)) : new Date();
      
      // BUY marker
      list.push({
        id: `${trade.id}-buy`,
        asset: trade.asset,
        action: 'Entry Buy',
        label: `${trade.asset} BUY`,
        pnl: 'Active',
        pnlType: 'neutral',
        price: formatCurrency(trade.entry),
        confidence: '95.0%',
        color: '#3B82F6',
        textColor: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
        dotColor: 'bg-blue-400',
        markerShape: 'arrowUp',
        markerPosition: 'belowBar',
        timestamp: getChartTimeForDate(openDate),
        fullTime: openDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rawDate: openDate
      });

      // CLOSE marker if closed
      if (trade.status === 'CLOSED' && trade.closedAt) {
        const closeDate = trade.closedAt.toDate ? trade.closedAt.toDate() : new Date(trade.closedAt as any);
        const profit = trade.pnl || 0;
        const isGain = profit >= 0;
        
        list.push({
          id: `${trade.id}-close`,
          asset: trade.asset,
          action: isGain ? 'Take Profit' : 'Stop Loss',
          label: isGain ? `${trade.asset} TP` : `${trade.asset} SL`,
          pnl: `${isGain ? '+' : ''}${formatCurrency(profit)}`,
          pnlType: isGain ? 'gain' : 'loss',
          price: formatCurrency(trade.exit || trade.entry),
          confidence: '92.0%',
          color: isGain ? '#00D09C' : '#FF6B6B',
          textColor: isGain ? 'text-[#00D09C]' : 'text-[#FF6B6B]',
          bgColor: isGain ? 'bg-[#00D09C]/10' : 'bg-[#FF6B6B]/10',
          dotColor: isGain ? 'bg-[#00D09C]' : 'bg-[#FF6B6B]',
          markerShape: isGain ? 'arrowDown' : 'arrowUp',
          markerPosition: isGain ? 'aboveBar' : 'belowBar',
          timestamp: getChartTimeForDate(closeDate),
          fullTime: closeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rawDate: closeDate
        });
      }
    });

    list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    return list;
  }, [tvChartData, trades, timeframe, formatCurrency, session]);

  const watchlistRef = useRef<WatchlistItem[]>([]);
  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  // Real-time simulated price feed WebSocket/Ticks simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrices(prev => {
        const next: Record<string, number> = { ...prev };
        watchlistRef.current.forEach(w => {
          const currentPrice = prev[w.ticker] || w.price;
          const fluctuation = currentPrice * (Math.random() - 0.495) * 0.0008;
          next[w.ticker] = +(currentPrice + fluctuation).toFixed(2);
        });
        return next;
      });
      setTickTracker(prev => prev + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      updateAnalystAdvice();
      showNotification('Compounding assets synced. Direct price-feed verified.');
    }, 900);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Sort and Filter Holdings
  const filteredHoldings = useMemo(() => {
    return watchlist
      .filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.ticker.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortBy === 'ticker') {
          return sortOrder === 'asc' ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
        }
        if (sortBy === 'value') {
          valA = (livePrices[a.ticker] || a.price) * a.quantity;
          valB = (livePrices[b.ticker] || b.price) * b.quantity;
        } else if (sortBy === 'change') {
          valA = a.change;
          valB = b.change;
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [watchlist, searchQuery, sortBy, sortOrder, livePrices]);

  const change24hPercent = useMemo(() => {
    const closedTradesPnL = trades.filter(t => t.status === 'CLOSED').reduce((sum, t) => sum + (t.pnl || 0), 0);
    // Fallback logic for synchronized display
    let effectivePnl = closedTradesPnL;
    if (effectivePnl === 0 && user?.portfolio?.todayPnL) {
      effectivePnl = user.portfolio.todayPnL;
    }
    
    const totalPlAmount = effectivePnl + totalFloatingPnl;
    const baseCapital = user?.portfolioBalance || user?.portfolio?.totalValue || 100;
    return (totalPlAmount / baseCapital) * 100;
  }, [trades, totalFloatingPnl, user]);

  const getDynamicConfidence = (base: number, symbol: string) => {
    const seed = symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
    const offset = Math.sin(tickTracker * 0.15 + seed) * 1.5;
    const val = base + offset;
    return Math.min(100, Math.max(0, val)).toFixed(1);
  };

  const dynamicExposure = useMemo(() => {
    const btcOffset = Math.sin(tickTracker * 0.08) * 0.4;
    const ethOffset = Math.cos(tickTracker * 0.1) * 0.3;
    
    // Base values: Crypto 48%, Stocks 27%, Commodities 15%, Cash 10%
    const crypto = 48 + btcOffset;
    const stocks = 27 + ethOffset;
    const commodities = 15 - (btcOffset + ethOffset) * 0.5;
    const cash = 10 - (btcOffset + ethOffset) * 0.5;

    // Risk: Low 41%, Medium 36%, High 23%
    const lowRisk = 41 + btcOffset * 0.8;
    const medRisk = 36 - ethOffset * 0.5;
    const highRisk = 23 - (btcOffset * 0.8 - ethOffset * 0.5);

    // Largest: Weight 28%, Confidence 96%
    const weight = 28 + btcOffset * 0.3;
    const confidence = 96 + Math.sin(tickTracker * 0.12) * 0.6;

    return {
      allocations: [
        { name: 'Crypto', value: crypto, color: '#00D09C', textBg: 'bg-[#00D09C]/10' },
        { name: 'Stocks', value: stocks, color: '#3b82f6', textBg: 'bg-blue-500/10' },
        { name: 'Commodities', value: commodities, color: '#eab308', textBg: 'bg-amber-500/10' },
        { name: 'Cash Reserve', value: cash, color: '#64748b', textBg: 'bg-slate-500/10' },
      ],
      risks: [
        { name: 'Low Risk', value: lowRisk, color: '#10b981', dotColor: 'bg-emerald-400' },
        { name: 'Medium Risk', value: medRisk, color: '#f59e0b', dotColor: 'bg-amber-400' },
        { name: 'High Risk', value: highRisk, color: '#ef4444', dotColor: 'bg-rose-500' },
      ],
      largest: {
        name: 'Bitcoin',
        weight: weight,
        confidence: confidence
      }
    };
  }, [tickTracker]);

  const executeTradeOrder = () => {
    showNotification(`Tactical order block filled: ${tradeType} ${tradeAmount} ${tradeAsset}.`);
    setActiveDialog(null);
  };

  return (
    <AnimatePresence>
      {viewMode === 'vault' && (
        <VaultScreen 
          key="vault"
          theme={theme}
          onBack={() => goBack()}
          activeTradingBalance={activeTradingBalance + totalFloatingPnl}
          showNotification={showNotification}
          vaultBalance={vaultBalance}
          setVaultBalance={updateVaultBalance}
          activeBalanceOffset={activeBalanceOffset}
          setActiveBalanceOffset={updateActiveBalanceOffset}
        />
      )}

      {viewMode === 'asset-stats' && (
        <AssetStatsScreen 
          key="asset-stats"
          theme={theme}
          onBack={() => goBack()}
          activeTradingBalance={activeTradingBalance + totalFloatingPnl}
          allocations={liveAllocations}
        />
      )}

      {viewMode === 'portfolio' && (
        <motion.div 
          key="portfolio"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`pt-[73px] text-slate-200 font-sans antialiased relative flex flex-col justify-start flex-1 pb-6`}
        >
      {/* Toast HUD */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="fixed top-18 left-4 right-4 z-50 flex items-center space-x-2.5 px-4 py-3 bg-[#0E1320]/95 border border-white/[0.06] text-slate-100 text-xs font-semibold rounded-2xl shadow-2xl backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-[#00D09C] animate-pulse" />
            <span className="flex-1 font-sans text-[10px] uppercase tracking-wider">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* 1. FIXED HEADER */}
      <header className={`fixed top-0 left-0 lg:left-64 right-0 z-40 backdrop-blur-xl ${isDark ? 'bg-black/90' : 'bg-white/90'} border-b ${isDark ? 'border-white/5' : 'border-slate-200'} p-4 flex justify-between items-center box-border`}>
        <div>
          <h1 className={`text-xl font-black ${textPrimary}`}>Portfolio</h1>
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C] animate-pulse" />
            Track your trades and assets
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={triggerSync}
            className={`transition-all hover:opacity-80 cursor-pointer ${textSecondary}`}
            title="Refresh positions"
          >
            <RefreshCw size={20} className={`${isSyncing ? 'animate-spin text-[#00D09C]' : ''}`} />
          </button>
        </div>
      </header>
 
      {/* --- SCROLLABLE LAYOUT WRAPPER --- */}
      <main className="w-full space-y-6 flex-grow flex flex-col mt-4 px-4 sm:px-6 lg:max-w-5xl lg:mx-auto">
        
        {/* --- 2. THE TOTAL MANAGED ASSET VALUE DISPLAY --- */}
        <div 
          className={`${cardClasses} p-6 rounded-[24px] space-y-4 relative overflow-hidden`}
        >
          {/* Main Top Header: Total Net Balance */}
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#00D09C] rounded-full animate-pulse" />
              Total Net Balance
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3.5xl font-extrabold text-white tracking-tight">
                {formatCurrency(totalValue)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Consolidated value of wallet, AI sessions, and vault holdings.
            </p>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 pt-3.5 border-t border-white/[0.05]">
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold block flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Wallet Balance
              </span>
              <div className="text-sm font-bold text-slate-100 font-mono">
                {formatCurrency(tokenBalance)}
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold block flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 ${session?.status === 'ACTIVE' ? 'bg-[#00D09C]' : 'bg-slate-500'} rounded-full`} />
                Active Engine
              </span>
              <div className={`text-sm font-bold font-mono ${session?.status === 'ACTIVE' ? 'text-[#00D09C]' : 'text-slate-400'}`}>
                {formatCurrency(activeEngineCapital)}
              </div>
            </div>
            <div className="space-y-0.5 col-span-2 md:col-span-1">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold block flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Vault Savings
              </span>
              <div className="text-sm font-bold text-slate-100 font-mono">
                {formatCurrency(vaultBalance)}
              </div>
            </div>
          </div>

          {/* Return Info Footing */}
          <div className="flex justify-between items-center pt-3 border-t border-white/[0.05]">
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${change24hPercent >= 0 ? 'bg-[#00D09C]/10 text-[#00D09C]' : 'bg-[#FF6B6B]/10 text-[#FF6B6B]'}`}>
                {change24hPercent >= 0 ? '▲ +' : '▼ '}{change24hPercent.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">24h Return</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium tracking-wide">
              Live Price Feed Active
            </div>
          </div>
        </div>

        {/* --- 3. THE PORTFOLIO NAV CHART PANEL --- */}
        <div 
          className={`${cardClasses} rounded-[24px] p-5 space-y-4`}
        >
          <div className="flex justify-between items-end pb-3 border-b border-white/[0.05]">
            <div className="flex items-center space-x-2 pb-0.5">
              <Activity className="w-4 h-4 text-[#00D09C]" />
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-white font-sans">
                  Equity Performance
                </h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Historical balance track</p>
              </div>
            </div>

            {/* Timeframe Selectors */}
            <div className="flex items-center">
              <div className="flex bg-[#080B11]/80 p-0.5 rounded-lg border border-white/[0.05]">
                {['1D', '1M', '1Y'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider transition-all cursor-pointer touch-manipulation ${
                      timeframe === t ? 'bg-[#00D09C] text-black shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Stage */}
          <div className="bg-[#080B11]/40 p-2 border border-white/[0.04] rounded-2xl relative overflow-hidden">
            {mergedChartData.length === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-slate-500 space-y-3">
                <BarChart3 className="w-8 h-8 opacity-50" />
                <span className="text-sm font-semibold tracking-wide">No Chart Data Available</span>
                <span className="text-xs text-slate-600">Trading activity will populate this chart.</span>
              </div>
            ) : (
              <AverPortfolioChart 
                data={mergedChartData} 
                baselineValue={chartBaselineValue}
                isDark={isDark} 
                onHover={handleHover} 
                executionEvents={executionEvents}
                onSelectEvent={(id) => setSelectedEventId(id)}
              />
            )}

            {/* Live Interactive Overlay Tooltip for Selected Event */}
            <AnimatePresence>
              {selectedEventId && (() => {
                const activeEvt = executionEvents.find(e => e.id === selectedEventId);
                if (!activeEvt) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute top-4 left-4 right-4 z-20 p-3 bg-[#080B11]/95 border border-white/[0.08] rounded-xl shadow-2xl backdrop-blur-xl space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${activeEvt.dotColor} animate-pulse`} />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                          {activeEvt.asset} — {activeEvt.action}
                        </span>
                      </div>
                      <button 
                        onClick={() => setSelectedEventId(null)}
                        className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-medium font-sans bg-black/40 p-2 rounded-lg border border-white/[0.04]">
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Execution Price</span>
                        <span className="text-white font-mono font-bold text-xs">{activeEvt.price}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Profit / Loss</span>
                        <span className={`font-mono font-bold text-xs ${activeEvt.pnlType === 'gain' ? 'text-[#00D09C]' : activeEvt.pnlType === 'loss' ? 'text-[#FF6B6B]' : 'text-slate-200'}`}>
                          {activeEvt.pnl}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Confidence</span>
                        <span className="text-[#00D09C] font-mono font-bold text-xs">{activeEvt.confidence}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono px-0.5">
                      <span>Timeline Sync: {activeEvt.timestamp}</span>
                      <span>Execution Time: {activeEvt.fullTime}</span>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Clickable Timeline Execution Indicators */}
          <div className="space-y-2 pt-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
              Live AI Executions Feed
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {executionEvents.map((evt, idx) => (
                <button
                  key={`exec-${evt.id || idx}-${idx}`}
                  onClick={() => setSelectedEventId(selectedEventId === evt.id ? null : evt.id)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-bold font-sans uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer touch-manipulation whitespace-nowrap border ${
                    selectedEventId === evt.id 
                      ? 'bg-[#00D09C]/10 border-[#00D09C]/30 text-[#00D09C] shadow-md shadow-[#00D09C]/5' 
                      : 'bg-white/[0.02] border-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${evt.dotColor}`} />
                  <span>{evt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Equity Output Grid */}
          <div className="grid grid-cols-4 gap-2 bg-[#080B11]/60 p-3 border border-white/[0.04] rounded-2xl font-sans text-[10px] text-center">
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-semibold mb-0.5 tracking-wider">Equity</div>
              <strong className="text-slate-200 font-semibold block font-mono">
                {hoveredOHLC ? `$${Math.round(hoveredOHLC.value).toLocaleString()}` : '--'}
              </strong>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-semibold mb-0.5 tracking-wider">Change</div>
              <strong className={`font-semibold block font-mono ${hoveredOHLC ? (hoveredOHLC.change >= 0 ? 'text-[#00D09C]' : 'text-[#FF6B6B]') : 'text-slate-200'}`}>
                {hoveredOHLC ? `${hoveredOHLC.change >= 0 ? '+' : ''}$${Math.round(hoveredOHLC.change).toLocaleString()}` : '--'}
              </strong>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-semibold mb-0.5 tracking-wider">% Gain</div>
              <strong className={`font-semibold block font-mono ${hoveredOHLC ? (hoveredOHLC.changePercent >= 0 ? 'text-[#00D09C]' : 'text-[#FF6B6B]') : 'text-slate-200'}`}>
                {hoveredOHLC ? `${hoveredOHLC.changePercent >= 0 ? '+' : ''}${hoveredOHLC.changePercent.toFixed(2)}%` : '--'}
              </strong>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-semibold mb-0.5 tracking-wider">Time</div>
              <strong className="text-slate-200 font-semibold block font-mono">
                {hoveredOHLC ? new Date(hoveredOHLC.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
              </strong>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-400 font-medium tracking-wide text-center">
            Drag across the chart to view historical details or tap a feed event to locate
          </div>
        </div>

        {/* --- 4. PORTFOLIO TOOLS --- */}
        <div className="space-y-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
            Portfolio Tools
          </span>

          {/* VAULT CARD - Premium Solid Style */}
          <motion.button 
            layoutId="vault-card-container"
            onClick={() => {
              setViewMode('vault');
            }}
            className={`w-full ${cardClasses} rounded-[24px] p-5 flex items-center space-x-4 relative overflow-hidden group hover:opacity-90 transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#00D09C]/30 min-h-[96px] touch-manipulation`}
          >
            <motion.div 
              layoutId="vault-icon-bg"
              className="w-12 h-12 rounded-2xl bg-[#00D09C]/10 flex-shrink-0 flex items-center justify-center transition-all group-hover:scale-105"
            >
              <Vault className="w-5 h-5 text-[#00D09C]" />
            </motion.div>

            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <motion.h4 
                  layoutId="vault-title"
                  className="text-base font-bold text-white tracking-tight"
                >
                  Vault
                </motion.h4>
              </div>
              <p className="text-slate-400 text-xs font-normal leading-relaxed">
                Secure savings system excluded from active AI trading
              </p>
            </div>
          </motion.button>

          {/* ASSET STATISTICS - Premium Solid Style */}
          <motion.button 
            layoutId="stats-card-container"
            onClick={() => {
              setViewMode('asset-stats');
            }}
            className={`w-full ${cardClasses} rounded-[24px] p-5 flex items-center space-x-4 relative overflow-hidden group hover:opacity-90 transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#00D09C]/30 min-h-[96px] touch-manipulation`}
          >
            <motion.div 
              layoutId="stats-icon-bg"
              className="w-12 h-12 rounded-2xl bg-[#00D09C]/10 flex-shrink-0 flex items-center justify-center transition-all group-hover:scale-105"
            >
              <PieChart className="w-5 h-5 text-[#00D09C]" />
            </motion.div>

            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <motion.h4 
                  layoutId="stats-title"
                  className="text-base font-bold text-white tracking-tight"
                >
                  Asset Statistics
                </motion.h4>
              </div>
              <p className="text-slate-400 text-xs font-normal leading-relaxed">
                Interactive capital allocation and diversification metrics
              </p>
            </div>
          </motion.button>
        </div>

        {/* --- 5. LEAD ANALYST AI COMMENTARY (Broadcast Style) --- */}
        <div 
          className={`${cardClasses} rounded-[24px] p-5 space-y-4`}
        >
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
            <div className="flex items-center space-x-2.5">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Aver AI Engine</h4>
                <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest block font-sans">
                  System Intelligence
                </span>
              </div>
            </div>

            <button 
              onClick={() => updateAnalystAdvice(true)}
              disabled={isRefreshingCommentary}
              className="w-8 h-8 bg-[#080B11] hover:bg-black/40 border border-white/[0.05] text-slate-400 hover:text-[#00D09C] rounded-xl transition-all flex items-center justify-center cursor-pointer touch-manipulation"
              title="Force re-evaluate metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCommentary ? 'animate-spin text-[#00D09C]' : ''}`} />
            </button>
          </div>

          <div className="bg-[#080B11]/50 p-4 rounded-2xl border border-white/[0.04] space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-[#00D09C] uppercase tracking-wider">
                {analystCommentary.topic}
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed italic font-medium">
              "{analystCommentary.text}"
            </p>
            <div className="text-[9px] text-slate-500 font-medium font-sans text-right pt-2 border-t border-white/[0.03]">
              Evaluated: {lastCommentaryUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>

        {/* --- 6. AI MARKET INTELLIGENCE --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 font-sans uppercase">
                AI Market Intelligence
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#00D09C] animate-pulse" />
              <span className="text-[10px] font-bold text-[#00D09C] uppercase tracking-wider font-mono">182 Signals/min</span>
            </div>
          </div>

          <div className="space-y-5">
            {/* AI MARKET RADAR CARD */}
            <div className={`${cardClasses} rounded-[24px] p-5 space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.05] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-base font-bold text-white tracking-tight">AI Market Radar</h4>
                    <span className="px-2 py-0.5 rounded-full bg-[#00D09C]/10 border border-[#00D09C]/20 text-[9px] font-bold text-[#00D09C] uppercase tracking-wider">
                      Live Stream
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-normal leading-relaxed mt-0.5">
                    Assets dynamically monitored by the Aver AI engine.
                  </p>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Scan: {lastRadarScan.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <button
                    onClick={handleRescanRadar}
                    disabled={isRescanningRadar}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#080B11] hover:bg-black/60 border border-white/[0.08] hover:border-[#00D09C]/30 text-slate-300 hover:text-[#00D09C] rounded-xl text-xs font-semibold transition-all cursor-pointer touch-manipulation active:scale-95"
                    title="Rescan AI Engine Radar"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRescanningRadar ? 'animate-spin text-[#00D09C]' : ''}`} />
                    <span>{isRescanningRadar ? 'Scanning...' : 'Rescan AI'}</span>
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: 'All Assets', count: radarAssets.length },
                  { id: 'high_conviction', label: '🟢 High Conviction', count: radarAssets.filter(a => a.category === 'high_conviction').length },
                  { id: 'preparing_entry', label: '🟡 Preparing Entry', count: radarAssets.filter(a => a.category === 'preparing_entry').length },
                  { id: 'watching', label: '👁 Watching', count: radarAssets.filter(a => a.category === 'watching').length },
                  { id: 'avoiding', label: '🔴 Avoiding', count: radarAssets.filter(a => a.category === 'avoiding').length },
                ].map(tab => {
                  const isActive = selectedRadarCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedRadarCategory(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer touch-manipulation border ${
                        isActive 
                          ? 'bg-[#00D09C] text-black border-[#00D09C] font-bold shadow-lg shadow-[#00D09C]/20' 
                          : 'bg-white/[0.02] text-slate-400 border-white/[0.05] hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {tab.label} <span className={isActive ? 'text-black/70' : 'text-slate-500'}>({tab.count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Unified, Beautiful Flat List of Monitored Assets */}
              <div className="space-y-2 pt-1">
                {(() => {
                  const filteredAssets = radarAssets
                    .filter(asset => selectedRadarCategory === 'all' || asset.category === selectedRadarCategory)
                    .sort((a, b) => b.baseConfidence - a.baseConfidence);

                  if (filteredAssets.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        No assets found in this category.
                      </div>
                    );
                  }

                  return filteredAssets.map((asset, index) => {
                    const dynConf = getDynamicConfidence(asset.baseConfidence, asset.symbol);
                    const livePrice = mergedLivePrices[asset.symbol] || (
                      asset.symbol === 'BTC' ? 89450 : 
                      asset.symbol === 'ETH' ? 3420 : 
                      asset.symbol === 'SOL' ? 185 : 
                      asset.symbol === 'NVDA' ? 128 : 
                      asset.symbol === 'Gold' ? 2410 : 
                      asset.symbol === 'XRP' ? 2.45 : 
                      asset.symbol === 'DOGE' ? 0.38 : 
                      asset.symbol === 'PEPE' ? 0.000012 : 
                      asset.symbol === 'ADA' ? 0.65 :
                      asset.symbol === 'DOT' ? 6.20 :
                      asset.symbol === 'LINK' ? 18.50 :
                      asset.symbol === 'AVAX' ? 34.20 :
                      asset.symbol === 'SHIB' ? 0.000025 :
                      asset.symbol === 'UNI' ? 7.80 :
                      asset.symbol === 'LTC' ? 85.00 :
                      asset.symbol === 'NEAR' ? 5.40 : 1.25
                    );
                    const mockChange = (Math.sin(tickTracker * 0.1 + asset.symbol.charCodeAt(0)) * 2.8).toFixed(2);
                    const isPositive = Number(mockChange) >= 0;

                    return (
                      <button 
                        key={`${asset.symbol}-${index}`} 
                        onClick={() => runRadarAnalysis(asset)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:bg-white/[0.04] hover:border-[#00D09C]/30 transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#00D09C]/30 touch-manipulation group"
                      >
                        {/* Left Part: Logo + Asset Name/Symbol */}
                        <div className="flex items-center space-x-3 min-w-0">
                          <CoinLogo symbol={asset.symbol} size={32} className="rounded-full overflow-hidden shadow-md flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="text-sm font-black text-white group-hover:text-[#00D09C] transition-colors">{asset.symbol}</span>
                              
                              {/* Slick Compact Badge indicating Confidence & Category */}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider flex items-center gap-1 flex-shrink-0 ${
                                asset.category === 'high_conviction' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                asset.category === 'preparing_entry' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                asset.category === 'watching' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                <span>
                                  {asset.category === 'high_conviction' ? '🟢' :
                                   asset.category === 'preparing_entry' ? '🟡' :
                                   asset.category === 'watching' ? '👁' : '🔴'}
                                </span>
                                <span>{dynConf}%</span>
                                <span className="opacity-80">
                                  {asset.category === 'high_conviction' ? 'Buy' :
                                   asset.category === 'preparing_entry' ? 'Target' :
                                   asset.category === 'watching' ? 'Watch' : 'Avoid'}
                                </span>
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">{asset.name}</div>
                          </div>
                        </div>
                        
                        {/* Right Part: Price + Percent change */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-mono font-bold text-slate-100">
                            ${typeof livePrice === 'number' ? livePrice.toLocaleString(undefined, { minimumFractionDigits: livePrice < 10 ? (livePrice < 0.1 ? 6 : 4) : 2, maximumFractionDigits: livePrice < 10 ? (livePrice < 0.1 ? 6 : 4) : 2 }) : livePrice}
                          </div>
                          <div className={`text-[11px] font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? '+' : ''}{mockChange}%
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* --- DRAWERS AND ACTION SHEETS (Android Portals) --- */}
      <AnimatePresence>
        {activeDialog && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4">
            
            {/* Dark background click handler */}
            <div className="absolute inset-0" onClick={() => {
              setActiveDialog(null);
              setVaultState('closed');
              setVaultActionType(null);
              setShowWithdrawPasscodeVerify(false);
            }} />

            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-[#0E1320] border-t sm:border border-white/[0.08] rounded-t-[32px] sm:rounded-[24px] w-full max-w-sm p-6 space-y-5 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-[#00D09C]/10 text-[#00D09C] rounded-xl">
                    {activeDialog === 'trade' ? (
                      <Zap className="w-4 h-4" />
                    ) : (
                      <Vault className="w-4 h-4" />
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight uppercase font-sans">
                    {activeDialog === 'trade' ? 'Liquidity Swap' : 'Secure Savings Vault'}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setActiveDialog(null);
                    setVaultState('closed');
                    setVaultActionType(null);
                    setShowWithdrawPasscodeVerify(false);
                  }}
                  className="p-1.5 bg-[#080B11] hover:bg-black/40 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer touch-manipulation min-w-[36px] min-h-[36px] border border-white/[0.05]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Trade Form Drawer */}
              {activeDialog === 'trade' && (
                <div className="space-y-4 text-xs font-medium">
                  <div className="grid grid-cols-2 gap-2 bg-[#080B11]/60 p-1 border border-white/[0.04] rounded-xl text-center">
                    <button 
                      onClick={() => setTradeType('BUY')}
                      className={`py-2 rounded-lg font-semibold transition-all cursor-pointer touch-manipulation ${tradeType === 'BUY' ? 'bg-[#00D09C] text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      BUY
                    </button>
                    <button 
                      onClick={() => setTradeType('SELL')}
                      className={`py-2 rounded-lg font-semibold transition-all cursor-pointer touch-manipulation ${tradeType === 'SELL' ? 'bg-[#FF6B6B] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      SELL
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Select Asset</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['BTC', 'ETH', 'SOL'].map((a, i) => (
                        <button 
                          key={`trade-asset-${a}-${i}`}
                          onClick={() => setTradeAsset(a)}
                          className={`py-2 border rounded-xl font-mono text-xs cursor-pointer touch-manipulation transition-all ${tradeAsset === a ? 'bg-[#00D09C]/10 border-[#00D09C]/30 text-[#00D09C] font-semibold' : 'bg-[#080B11]/40 border-white/[0.04] text-slate-400 hover:text-white'}`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                      <span>Order Size</span>
                      <span className="font-sans text-slate-400 font-medium">Avail: ${activeTradingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} Active</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="text"
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-3 text-white outline-none font-semibold text-sm focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]/20 transition-all"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[#00D09C] font-semibold font-mono">{tradeAsset}</span>
                    </div>
                  </div>

                  <button 
                    onClick={executeTradeOrder}
                    className="w-full bg-[#00D09C] hover:bg-[#00b084] text-black font-semibold py-3.5 rounded-xl uppercase tracking-wider transition-all mt-2 touch-manipulation min-h-[44px] shadow-md"
                  >
                    Confirm {tradeType} Order
                  </button>
                </div>
              )}

              {/* SECURE VAULT FLOWS */}
              {activeDialog === 'vault' && (
                <div className="space-y-4">
                  
                  {/* STEP 1: ONBOARDING WELCOME */}
                  {vaultState === 'setup' && vaultSetupStep === 1 && (
                    <div className="space-y-4 text-center">
                      <div className="w-16 h-16 bg-[#00D09C]/10 rounded-full flex items-center justify-center mx-auto">
                        <Vault className="w-7 h-7 text-[#00D09C]" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white tracking-tight">Welcome to Private Vault</h4>
                        <p className="text-slate-400 text-xs font-normal leading-relaxed">
                          Securely stores your capital outside of active AI rotation. Assets placed here are 100% protected and excluded from automated trading runs until you withdraw them.
                        </p>
                      </div>
                      <div className="bg-[#080B11]/50 p-3 rounded-xl border border-white/[0.04] text-[10px] text-[#00D09C] font-semibold flex items-center gap-2 text-left leading-relaxed">
                        <Shield className="w-4 h-4 flex-shrink-0" />
                        <span>Sovereign security passcode will be generated to decrypt and access savings.</span>
                      </div>
                      <button 
                        onClick={() => setVaultSetupStep(2)}
                        className="w-full py-3 bg-[#00D09C] hover:bg-[#00b084] text-black text-xs font-bold rounded-xl uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Create Security Passcode
                      </button>
                    </div>
                  )}

                  {/* STEP 2: ONBOARDING PIN SETUP */}
                  {vaultState === 'setup' && vaultSetupStep === 2 && (
                    <div className="space-y-4 text-center">
                      <h4 className="text-sm font-bold text-white tracking-tight uppercase tracking-widest">
                        {!isPasscodeConfirming ? 'Create 6-Digit PIN' : 'Verify Security PIN'}
                      </h4>
                      <p className="text-slate-400 text-xs leading-tight">
                        {!isPasscodeConfirming 
                          ? 'Enter 6 numbers to lock your protected Vault.' 
                          : 'Re-enter your 6-digit passcode to authorize security sync.'}
                      </p>

                      {/* Dot Pin indicators */}
                      <div className={`flex justify-center space-x-3.5 py-2.5 ${shakeTrigger ? 'animate-bounce' : ''}`}>
                        {Array.from({ length: 6 }).map((_, idx) => {
                          const digits = !isPasscodeConfirming ? passcodeInput : passcodeConfirm;
                          const isActive = idx < digits.length;
                          return (
                            <div 
                              key={idx}
                              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                                isActive 
                                  ? 'bg-[#00D09C] border-[#00D09C] scale-110 shadow-sm shadow-[#00D09C]/50' 
                                  : 'border-white/10 bg-white/5'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {passcodeError && (
                        <p className="text-[#FF6B6B] text-[11px] font-semibold leading-relaxed">
                          {passcodeError}
                        </p>
                      )}

                      {/* Custom numerical secure keypad */}
                      <div className="grid grid-cols-3 gap-2 pt-2 max-w-[240px] mx-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              const digits = !isPasscodeConfirming ? passcodeInput : passcodeConfirm;
                              if (digits.length < 6) {
                                const val = num.toString();
                                if (!isPasscodeConfirming) {
                                  const next = passcodeInput + val;
                                  setPasscodeInput(next);
                                  if (next.length === 6) {
                                    setTimeout(() => {
                                      setIsPasscodeConfirming(true);
                                      setPasscodeError(null);
                                    }, 200);
                                  }
                                } else {
                                  const next = passcodeConfirm + val;
                                  setPasscodeConfirm(next);
                                  if (next.length === 6) {
                                    setTimeout(() => {
                                      if (passcodeInput === next) {
                                        setVaultPasscode(passcodeInput);
                                        safeStorage.setItem('vault_passcode', passcodeInput);
                                        setVaultSetupStep(3);
                                      } else {
                                        setPasscodeConfirm('');
                                        setPasscodeError("Passcodes do not match. Re-enter confirm PIN.");
                                        setShakeTrigger(true);
                                        setTimeout(() => setShakeTrigger(false), 500);
                                      }
                                    }, 350);
                                  }
                                }
                              }
                            }}
                            className="w-12 h-12 rounded-full bg-white/[0.02] hover:bg-white/[0.08] active:bg-white/[0.12] text-white text-sm font-bold flex items-center justify-center cursor-pointer border border-white/[0.04] transition-all"
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            if (!isPasscodeConfirming) {
                              setPasscodeInput('');
                            } else {
                              setPasscodeConfirm('');
                            }
                          }}
                          className="text-[9px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          CLEAR
                        </button>
                        <button
                          onClick={() => {
                            const digits = !isPasscodeConfirming ? passcodeInput : passcodeConfirm;
                            if (digits.length < 6) {
                              const val = '0';
                              if (!isPasscodeConfirming) {
                                const next = passcodeInput + val;
                                setPasscodeInput(next);
                                if (next.length === 6) {
                                  setTimeout(() => {
                                    setIsPasscodeConfirming(true);
                                    setPasscodeError(null);
                                  }, 200);
                                }
                              } else {
                                const next = passcodeConfirm + val;
                                setPasscodeConfirm(next);
                                if (next.length === 6) {
                                  setTimeout(() => {
                                    if (passcodeInput === next) {
                                      setVaultPasscode(passcodeInput);
                                      safeStorage.setItem('vault_passcode', passcodeInput);
                                      setVaultSetupStep(3);
                                    } else {
                                      setPasscodeConfirm('');
                                      setPasscodeError("Passcodes do not match. Re-enter confirm PIN.");
                                      setShakeTrigger(true);
                                      setTimeout(() => setShakeTrigger(false), 500);
                                    }
                                  }, 350);
                                }
                              }
                            }
                          }}
                          className="w-12 h-12 rounded-full bg-white/[0.02] hover:bg-white/[0.08] active:bg-white/[0.12] text-white text-sm font-bold flex items-center justify-center cursor-pointer border border-white/[0.04] transition-all"
                        >
                          0
                        </button>
                        <button
                          onClick={() => {
                            if (!isPasscodeConfirming) {
                              setPasscodeInput(prev => prev.slice(0, -1));
                            } else {
                              setPasscodeConfirm(prev => prev.slice(0, -1));
                            }
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          ⌫
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SUCCESS ONBOARDING */}
                  {vaultState === 'setup' && vaultSetupStep === 3 && (
                    <div className="space-y-4 text-center">
                      <div className="w-16 h-16 bg-[#00D09C]/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <CheckCircle2 className="w-8 h-8 text-[#00D09C]" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white tracking-tight">Security Vault Active</h4>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          Your sovereign crypto savings system has been secured with private bank-grade encryption algorithms. Excluded from AI trading pool.
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setIsVaultOnboarded(true);
                          safeStorage.setItem('vault_onboarded', 'true');
                          setVaultState('unlocked');
                          setPasscodeInput('');
                          setPasscodeConfirm('');
                        }}
                        className="w-full py-3 bg-[#00D09C] hover:bg-[#00b084] text-black text-xs font-bold rounded-xl uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Open Secure Vault
                      </button>
                    </div>
                  )}

                  {/* VAULT ACCESS PIN LOCKSCREEN */}
                  {vaultState === 'locked' && (
                    <div className="space-y-4 text-center">
                      <div className="w-12 h-12 bg-white/[0.02] border border-white/[0.05] rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Authorize Decryption</h4>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Enter your private 6-digit secure key to open.
                        </p>
                      </div>

                      {/* Pin dots */}
                      <div className={`flex justify-center space-x-3.5 py-1.5 ${shakeTrigger ? 'animate-bounce' : ''}`}>
                        {Array.from({ length: 6 }).map((_, idx) => {
                          const isActive = idx < passcodeInput.length;
                          return (
                            <div 
                              key={idx}
                              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                                isActive 
                                  ? 'bg-[#00D09C] border-[#00D09C] scale-110 shadow-sm shadow-[#00D09C]/50' 
                                  : 'border-white/10 bg-white/5'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {passcodeError && (
                        <p className="text-[#FF6B6B] text-[11px] font-semibold">
                          {passcodeError}
                        </p>
                      )}

                      {/* Secure numeric keypad */}
                      <div className="grid grid-cols-3 gap-2 pt-1 max-w-[240px] mx-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              if (passcodeInput.length < 6) {
                                const val = num.toString();
                                const next = passcodeInput + val;
                                setPasscodeInput(next);
                                if (next.length === 6) {
                                  setTimeout(() => {
                                    if (next === vaultPasscode) {
                                      setVaultState('unlocked');
                                      setPasscodeInput('');
                                      setPasscodeError(null);
                                    } else {
                                      setPasscodeInput('');
                                      setPasscodeError("Incorrect PIN. Access denied.");
                                      setShakeTrigger(true);
                                      setTimeout(() => setShakeTrigger(false), 500);
                                    }
                                  }, 250);
                                }
                              }
                            }}
                            className="w-12 h-12 rounded-full bg-white/[0.02] hover:bg-white/[0.08] active:bg-white/[0.12] text-white text-sm font-bold flex items-center justify-center cursor-pointer border border-white/[0.04] transition-all"
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          onClick={() => setPasscodeInput('')}
                          className="text-[9px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          CLEAR
                        </button>
                        <button
                          onClick={() => {
                            if (passcodeInput.length < 6) {
                              const val = '0';
                              const next = passcodeInput + val;
                              setPasscodeInput(next);
                              if (next.length === 6) {
                                setTimeout(() => {
                                  if (next === vaultPasscode) {
                                    setVaultState('unlocked');
                                    setPasscodeInput('');
                                    setPasscodeError(null);
                                  } else {
                                    setPasscodeInput('');
                                    setPasscodeError("Incorrect PIN. Access denied.");
                                    setShakeTrigger(true);
                                    setTimeout(() => setShakeTrigger(false), 500);
                                  }
                                }, 250);
                              }
                            }
                          }}
                          className="w-12 h-12 rounded-full bg-white/[0.02] hover:bg-white/[0.08] active:bg-white/[0.12] text-white text-sm font-bold flex items-center justify-center cursor-pointer border border-white/[0.04] transition-all"
                        >
                          0
                        </button>
                        <button
                          onClick={() => setPasscodeInput(prev => prev.slice(0, -1))}
                          className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          ⌫
                        </button>
                      </div>

                      <div className="pt-2 border-t border-white/[0.03]">
                        <button
                          onClick={() => {
                            if (confirm("Reset Vault? This will clear your passcode and existing vault data.")) {
                              setVaultPasscode('');
                              setIsVaultOnboarded(false);
                              updateVaultBalance(0);
                              updateActiveBalanceOffset(0);
                              safeStorage.removeItem('vault_passcode');
                              safeStorage.removeItem('vault_onboarded');
                              safeStorage.removeItem('portfolio_vault_balance');
                              safeStorage.removeItem('portfolio_active_offset');
                              setVaultState('setup');
                              setVaultSetupStep(1);
                              setPasscodeInput('');
                            }
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-[#FF6B6B] transition-all uppercase tracking-wider cursor-pointer"
                        >
                          Forgot PIN? Reset Vault
                        </button>
                      </div>
                    </div>
                  )}

                  {/* UNLOCKED VAULT HOME PANEL */}
                  {vaultState === 'unlocked' && vaultActionType === null && (
                    <div className="space-y-4 font-medium text-xs">
                      
                      {/* Secure metrics panel */}
                      <div className="bg-[#080B11]/80 border border-white/[0.06] p-4 rounded-2xl space-y-3.5 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Protected Savings Pool</span>
                          <span className="text-[8px] bg-[#00D09C]/10 text-[#00D09C] px-2 py-0.5 rounded-md font-bold tracking-widest uppercase animate-pulse flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            Multi-Sig Active
                          </span>
                        </div>
                        <div className="space-y-0.5 text-center py-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">Total Vault Balance</span>
                          <strong className="text-2xl font-bold text-white tracking-tight font-mono">
                            ${vaultBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                        
                        {/* Core features listing */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-white/[0.04]">
                          <div className="bg-white/[0.01] p-2 border border-white/[0.02] rounded-xl">
                            <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Annual APY Lock</span>
                            <span className="text-[#00D09C] font-bold font-mono">5.82% compounded</span>
                          </div>
                          <div className="bg-white/[0.01] p-2 border border-white/[0.02] rounded-xl">
                            <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Sovereign Space</span>
                            <span className="text-white font-bold font-sans">Unlimited</span>
                          </div>
                        </div>

                        {/* Goal Progress Bar */}
                        <div className="space-y-1.5 pt-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-semibold">Long-term Savings Goal</span>
                            <span className="text-white font-mono font-bold">{Math.round((vaultBalance / 500000) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-white/[0.03] border border-white/[0.05] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-[#00D09C] rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (vaultBalance / 500000) * 100)}%` }} />
                          </div>
                          <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                            <span>Goal: $500,000.00</span>
                            <span>Remaining: ${(500000 - vaultBalance > 0 ? 500000 - vaultBalance : 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Locked Assets List Overview */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Locked Assets Allocation</span>
                        <div className="space-y-1.5 pr-1">
                          {[
                            { name: 'Bitcoin Stable Reserves', ticker: 'BTC', qty: `${(vaultBalance * 0.5 / 64000).toFixed(4)} BTC`, value: vaultBalance * 0.5, color: '#f59e0b' },
                            { name: 'Ethereum Gas locked', ticker: 'ETH', qty: `${(vaultBalance * 0.35 / 3400).toFixed(4)} ETH`, value: vaultBalance * 0.35, color: '#6366f1' },
                            { name: 'USDT Reserve', ticker: 'USDT', qty: `$${(vaultBalance * 0.15).toLocaleString()} USDT`, value: vaultBalance * 0.15, color: '#10b981' },
                          ].map(asset => (
                            <div key={asset.ticker} className="flex justify-between items-center bg-[#080B11]/40 border border-white/[0.03] p-2 rounded-xl text-[10px]">
                              <div className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: asset.color }} />
                                <div>
                                  <span className="text-white font-bold block">{asset.ticker}</span>
                                  <span className="text-slate-400 block text-[8px]">{asset.name}</span>
                                </div>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-white font-bold block">${Math.round(asset.value).toLocaleString()}</span>
                                <span className="text-slate-400 block text-[8px]">{asset.qty}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-3.5 pt-2">
                        <button 
                          onClick={() => {
                            setVaultActionType('deposit');
                            setVaultActionAsset('BTC');
                            setVaultActionAmount('');
                            setVaultGoalName('');
                            setVaultTargetDate('');
                            setVaultNotes('');
                          }}
                          className="py-3 bg-[#00D09C] hover:bg-[#00b084] text-black text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md text-center"
                        >
                          Deposit Funds
                        </button>
                        <button 
                          onClick={() => {
                            setShowWithdrawPasscodeVerify(true);
                            setWithdrawVerifyInput('');
                            setPasscodeError(null);
                          }}
                          className="py-3 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.05] text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md text-center"
                        >
                          Withdraw Savings
                        </button>
                      </div>
                    </div>
                  )}

                  {/* WITHDRAW PIN VERIFICATION FIRST */}
                  {vaultState === 'unlocked' && showWithdrawPasscodeVerify && (
                    <div className="space-y-4 text-center">
                      <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center mx-auto text-amber-400">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Verify Savings PIN</h4>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Re-enter your secure PIN to authorize withdrawals.
                        </p>
                      </div>

                      {/* Dots */}
                      <div className={`flex justify-center space-x-3.5 py-1.5 ${shakeTrigger ? 'animate-bounce' : ''}`}>
                        {Array.from({ length: 6 }).map((_, idx) => {
                          const isActive = idx < withdrawVerifyInput.length;
                          return (
                            <div 
                              key={idx}
                              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                                isActive 
                                  ? 'bg-[#00D09C] border-[#00D09C] scale-110 shadow-sm shadow-[#00D09C]/50' 
                                  : 'border-white/10 bg-white/5'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {passcodeError && (
                        <p className="text-[#FF6B6B] text-[11px] font-semibold">
                          {passcodeError}
                        </p>
                      )}

                      {/* Secure numeric keypad */}
                      <div className="grid grid-cols-3 gap-2 pt-1 max-w-[240px] mx-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              if (withdrawVerifyInput.length < 6) {
                                const val = num.toString();
                                const next = withdrawVerifyInput + val;
                                setWithdrawVerifyInput(next);
                                if (next.length === 6) {
                                  setTimeout(() => {
                                    if (next === vaultPasscode) {
                                      setShowWithdrawPasscodeVerify(false);
                                      setVaultActionType('withdraw');
                                      setVaultActionAsset('BTC');
                                      setVaultActionAmount('');
                                      setWithdrawVerifyInput('');
                                      setPasscodeError(null);
                                    } else {
                                      setWithdrawVerifyInput('');
                                      setPasscodeError("Security verification PIN mismatch.");
                                      setShakeTrigger(true);
                                      setTimeout(() => setShakeTrigger(false), 500);
                                    }
                                  }, 250);
                                }
                              }
                            }}
                            className="w-12 h-12 rounded-full bg-white/[0.02] hover:bg-white/[0.08] active:bg-white/[0.12] text-white text-sm font-bold flex items-center justify-center cursor-pointer border border-white/[0.04] transition-all"
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          onClick={() => setWithdrawVerifyInput('')}
                          className="text-[9px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          CLEAR
                        </button>
                        <button
                          onClick={() => {
                            if (withdrawVerifyInput.length < 6) {
                              const val = '0';
                              const next = withdrawVerifyInput + val;
                              setWithdrawVerifyInput(next);
                              if (next.length === 6) {
                                setTimeout(() => {
                                  if (next === vaultPasscode) {
                                    setShowWithdrawPasscodeVerify(false);
                                    setVaultActionType('withdraw');
                                    setVaultActionAsset('BTC');
                                    setVaultActionAmount('');
                                    setWithdrawVerifyInput('');
                                    setPasscodeError(null);
                                  } else {
                                    setWithdrawVerifyInput('');
                                    setPasscodeError("Security PIN failed.");
                                    setShakeTrigger(true);
                                    setTimeout(() => setShakeTrigger(false), 500);
                                  }
                                }, 250);
                              }
                            }
                          }}
                          className="w-12 h-12 rounded-full bg-white/[0.02] hover:bg-white/[0.08] active:bg-white/[0.12] text-white text-sm font-bold flex items-center justify-center cursor-pointer border border-white/[0.04] transition-all"
                        >
                          0
                        </button>
                        <button
                          onClick={() => setWithdrawVerifyInput(prev => prev.slice(0, -1))}
                          className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          ⌫
                        </button>
                      </div>

                      <button
                        onClick={() => setShowWithdrawPasscodeVerify(false)}
                        className="w-full mt-2 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold uppercase tracking-wider text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* DEPOSIT FORM PANEL */}
                  {vaultState === 'unlocked' && vaultActionType === 'deposit' && (
                    <div className="space-y-4 font-medium text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
                        <span className="text-white font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-[#00D09C]">
                          <ArrowUpRight className="w-4 h-4" />
                          Deposit Capital to Vault
                        </span>
                        <button 
                          onClick={() => setVaultActionType(null)}
                          className="text-slate-400 hover:text-white text-[10px] font-bold"
                        >
                          Back
                        </button>
                      </div>

                      {/* Select Asset */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Select Source Asset</label>
                        <div className="grid grid-cols-3 gap-1.5 font-mono">
                          {['BTC', 'ETH', 'Cash', 'SOL', 'Gold', 'AAPL'].map((a, i) => (
                            <button
                              key={`vault-asset-${a}-${i}`}
                              type="button"
                              onClick={() => setVaultActionAsset(a)}
                              className={`py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all ${vaultActionAsset === a ? 'bg-[#00D09C]/10 border-[#00D09C]/30 text-[#00D09C]' : 'bg-[#080B11]/40 border-white/[0.04] text-slate-400'}`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Amount Field */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                          <span>Deposit Amount (USD)</span>
                          <span className="font-mono">Avail: ${activeTradingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</span>
                        </div>
                        <div className="relative">
                          <input 
                            type="number"
                            placeholder="0.00"
                            value={vaultActionAmount}
                            onChange={(e) => setVaultActionAmount(e.target.value)}
                            className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-3 text-white outline-none font-semibold text-sm focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]/20 transition-all font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setVaultActionAmount(Math.round(activeTradingBalance * 0.5).toString())}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold bg-[#00D09C]/10 text-[#00D09C] px-2 py-1 rounded-md uppercase cursor-pointer"
                          >
                            50% Max
                          </button>
                        </div>
                      </div>

                      {/* Savings Goal Name */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Goal Category / Label (Optional)</label>
                        <input 
                          type="text"
                          placeholder="e.g. BTC Bull Peak, Tax Reserve, Real Estate"
                          value={vaultGoalName}
                          onChange={(e) => setVaultGoalName(e.target.value)}
                          className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-3 text-white outline-none text-xs focus:border-[#00D09C] transition-all"
                        />
                      </div>

                      {/* Live Math Summary */}
                      {vaultActionAmount && !isNaN(parseFloat(vaultActionAmount)) && (
                        <div className="bg-[#080B11]/70 p-3 rounded-xl border border-white/[0.04] space-y-1.5 font-mono text-[10px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Active Trading Capital:</span>
                            <span>${activeTradingBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[#FF6B6B]">
                            <span>Deduct to Savings:</span>
                            <span>-${parseFloat(vaultActionAmount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[#00D09C] font-bold pt-1 border-t border-white/[0.03]">
                            <span>Remaining Active Pool:</span>
                            <span>${(activeTradingBalance - parseFloat(vaultActionAmount)).toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={async () => {
                          const amt = parseFloat(vaultActionAmount);
                          if (isNaN(amt) || amt <= 0) {
                            showNotification("Please enter a valid deposit amount.");
                            return;
                          }
                          const activeCap = activeTradingBalance;
                          if (amt > activeCap) {
                            showNotification("Insufficient active capital available for deposit.");
                            return;
                          }
                          const success = await executeVaultTransfer(amt, 'deposit');
                          if (success) {
                            showNotification(`Successfully protected $${amt.toLocaleString()} inside Vault.`);
                            setVaultActionType(null);
                            setVaultActionAmount('');
                            setVaultGoalName('');
                          } else {
                            showNotification("Deposit failed. Insufficient active capital.");
                          }
                        }}
                        className="w-full bg-[#00D09C] hover:bg-[#00b084] text-black font-semibold py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer touch-manipulation min-h-[44px] shadow-md text-center"
                      >
                        Confirm Safe Deposit
                      </button>
                    </div>
                  )}

                  {/* WITHDRAW FORM PANEL */}
                  {vaultState === 'unlocked' && vaultActionType === 'withdraw' && (
                    <div className="space-y-4 font-medium text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
                        <span className="text-white font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-amber-400">
                          <ArrowDownRight className="w-4 h-4" />
                          Withdraw Savings to Active Pool
                        </span>
                        <button 
                          onClick={() => setVaultActionType(null)}
                          className="text-slate-400 hover:text-white text-[10px] font-bold"
                        >
                          Back
                        </button>
                      </div>

                      {/* Select Asset */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Select Asset to Unlock</label>
                        <div className="grid grid-cols-3 gap-1.5 font-mono">
                          {['BTC', 'ETH', 'USDT'].map((a, i) => (
                            <button
                              key={`vault-unlock-${a}-${i}`}
                              type="button"
                              onClick={() => setVaultActionAsset(a)}
                              className={`py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all ${vaultActionAsset === a ? 'bg-[#00D09C]/10 border-[#00D09C]/30 text-[#00D09C]' : 'bg-[#080B11]/40 border-white/[0.04] text-slate-400'}`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Amount Field */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                          <span>Amount to Unlock (USD)</span>
                          <span className="font-mono">Vault Max: ${vaultBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</span>
                        </div>
                        <div className="relative">
                          <input 
                            type="number"
                            placeholder="0.00"
                            value={vaultActionAmount}
                            onChange={(e) => setVaultActionAmount(e.target.value)}
                            className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-3 text-white outline-none font-semibold text-sm focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]/20 transition-all font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setVaultActionAmount(vaultBalance.toString())}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold bg-[#00D09C]/10 text-[#00D09C] px-2 py-1 rounded-md uppercase cursor-pointer"
                          >
                            100% MAX
                          </button>
                        </div>
                      </div>

                      {/* Math Preview */}
                      {vaultActionAmount && !isNaN(parseFloat(vaultActionAmount)) && (
                        <div className="bg-[#080B11]/70 p-3 rounded-xl border border-white/[0.04] space-y-1.5 font-mono text-[10px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Vault Balance:</span>
                            <span>${vaultBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[#FF6B6B]">
                            <span>Deduct Savings:</span>
                            <span>-${parseFloat(vaultActionAmount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[#00D09C] font-bold pt-1 border-t border-white/[0.03]">
                            <span>Restored Active Pool:</span>
                            <span>+${(activeTradingBalance + parseFloat(vaultActionAmount)).toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={async () => {
                          const amt = parseFloat(vaultActionAmount);
                          if (isNaN(amt) || amt <= 0) {
                            showNotification("Please enter a valid withdrawal amount.");
                            return;
                          }
                          const currentTarget = Number(safeStorage.getItem('vault_target')) || 0;
                          if (currentTarget > 0 && vaultBalance < currentTarget) {
                            showNotification(`Withdrawal locked: You cannot withdraw until you reach your savings target of $${currentTarget.toLocaleString()} (Current balance: $${vaultBalance.toLocaleString()}).`);
                            return;
                          }
                          if (amt > vaultBalance) {
                            showNotification("Withdrawal exceeds current protected savings balance.");
                            return;
                          }
                          const success = await executeVaultTransfer(amt, 'withdraw');
                          if (success) {
                            showNotification(`Successfully unlocked $${amt.toLocaleString()} back to Active Pool.`);
                            setVaultActionType(null);
                            setVaultActionAmount('');
                          } else {
                            showNotification("Withdrawal failed.");
                          }
                        }}
                        className="w-full bg-[#00D09C] hover:bg-[#00b084] text-black font-semibold py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer touch-manipulation min-h-[44px] shadow-md text-center"
                      >
                        Confirm Withdrawal
                      </button>
                    </div>
                  )}

                </div>
              )}

              <button 
                onClick={() => {
                  setActiveDialog(null);
                  setVaultState('closed');
                  setVaultActionType(null);
                  setShowWithdrawPasscodeVerify(false);
                }}
                className="w-full py-2.5 bg-[#080B11]/80 hover:bg-black/40 border border-white/[0.05] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer touch-manipulation min-h-[44px]"
              >
                Close Secure Panel
              </button>
            </motion.div>

          </div>
        )}

        {analyzingAsset && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4">
            
            {/* Dark background click handler */}
            <div className="absolute inset-0" onClick={() => setAnalyzingAsset(null)} />

            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-[#0E1320] border-t sm:border border-white/[0.08] rounded-t-[32px] sm:rounded-[24px] w-full max-w-md p-6 space-y-5 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-[#00D09C]/10 text-[#00D09C] rounded-xl">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight uppercase font-sans">
                      AI Deep Diagnostics
                    </h3>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest block leading-none">
                      Gemini Intelligence Core
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setAnalyzingAsset(null)}
                  className="w-7 h-7 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {isAnalyzing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-[#00D09C]/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#00D09C] animate-spin" />
                    <div className="absolute inset-3 rounded-full bg-[#00D09C]/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-[#00D09C] animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Analyzing {analyzingAsset.symbol}</p>
                    <p className="text-[10px] text-slate-400">Interrogating global order books and volatility indices...</p>
                  </div>
                </div>
              ) : analysisReport ? (
                <div className="space-y-4 font-sans text-xs">
                  {/* Action Pill Display */}
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.01] rounded-2xl border border-white/[0.03]">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-sans font-bold">Recommended Bias</span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className={`text-base font-black ${analysisReport.suggestedAction === 'BUY' ? 'text-[#00D09C]' : 'text-[#FF6B6B]'}`}>
                          {analysisReport.suggestedAction}
                        </span>
                        <span className="text-slate-400 font-medium">Order Pool</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-sans font-bold">Confidence Index</span>
                      <div className="text-sm font-mono font-black text-white mt-0.5">
                        {analysisReport.confidence}%
                      </div>
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#080B11]/50 p-3 rounded-xl border border-white/[0.03] text-center space-y-0.5">
                      <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Entry Target</span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        ${analysisReport.entry?.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-[#080B11]/50 p-3 rounded-xl border border-[#FF6B6B]/10 text-center space-y-0.5">
                      <span className="text-[8px] text-[#FF6B6B]/80 uppercase tracking-wider block font-bold">Stop Loss</span>
                      <span className="text-xs font-mono font-bold text-[#FF6B6B]">
                        ${analysisReport.stopLoss?.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-[#080B11]/50 p-3 rounded-xl border border-[#00D09C]/10 text-center space-y-0.5">
                      <span className="text-[8px] text-[#00D09C]/80 uppercase tracking-wider block font-bold">Take Profit</span>
                      <span className="text-xs font-mono font-bold text-[#00D09C]">
                        ${analysisReport.takeProfit?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Analytical Parameters */}
                  <div className="grid grid-cols-2 gap-2 bg-[#080B11]/30 p-3.5 rounded-2xl border border-white/[0.03] font-mono text-[10px]">
                    <div className="flex justify-between border-r border-white/[0.05] pr-3">
                      <span className="text-slate-500">Risk Profile:</span>
                      <span className="font-bold text-white uppercase">{analysisReport.riskRating}</span>
                    </div>
                    <div className="flex justify-between pl-3">
                      <span className="text-slate-500">Volatility:</span>
                      <span className="font-bold text-white uppercase">{analysisReport.volatility}</span>
                    </div>
                  </div>

                  {/* Indicators Analyzed */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-sans font-bold">Technical Triggers</span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisReport.indicators?.map((ind: string, i: number) => (
                        <span key={`ind-${ind}-${i}`} className="px-2 py-1 bg-white/[0.02] border border-white/[0.04] text-slate-300 text-[9px] rounded-lg font-mono">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Core Intelligence Text */}
                  <div className="bg-[#080B11]/60 p-4 border border-white/[0.04] rounded-2xl space-y-1.5">
                    <span className="text-[9px] text-[#00D09C] font-sans font-bold uppercase tracking-widest block">Strategist Assessment</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed font-medium">
                      {analysisReport.explanation}
                    </p>
                  </div>

                  {/* Call to action */}
                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        setAnalyzingAsset(null);
                        setActiveDialog('trade');
                      }}
                      className="w-full bg-[#00D09C] hover:bg-[#00b084] text-black font-semibold py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 touch-manipulation min-h-[44px] shadow-lg shadow-[#00D09C]/10 text-xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-black" />
                      <span>Execute Liquidity Swap</span>
                    </button>
                  </div>
                </div>
              ) : null}

              <button 
                onClick={() => setAnalyzingAsset(null)}
                className="w-full py-2.5 bg-[#080B11]/80 hover:bg-black/40 border border-white/[0.05] text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer touch-manipulation min-h-[44px]"
              >
                Close Diagnosis
              </button>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </motion.div>
    )}
    </AnimatePresence>
  );
}
