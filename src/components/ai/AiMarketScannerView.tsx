import React, { useState } from 'react';
import { 
  Search, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Radio, 
  Cpu, 
  Filter,
  Layers
} from 'lucide-react';
import CoinLogo from '../CoinLogo';

interface MarketAsset {
  symbol: string;
  name: string;
  category: 'CRYPTO' | 'STOCKS' | 'FOREX';
  price: number;
  change: number;
  rsi: number;
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  monitored: boolean;
  favorite: boolean;
}

const initialMarkets: MarketAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', category: 'CRYPTO', price: 64230, change: 2.4, rsi: 58, volatility: 'HIGH', monitored: true, favorite: true },
  { symbol: 'ETH', name: 'Ethereum', category: 'CRYPTO', price: 3450, change: -1.2, rsi: 44, volatility: 'HIGH', monitored: true, favorite: true },
  { symbol: 'SOL', name: 'Solana', category: 'CRYPTO', price: 142, change: 5.6, rsi: 65, volatility: 'HIGH', monitored: true, favorite: false },
  { symbol: 'XRP', name: 'Ripple', category: 'CRYPTO', price: 0.58, change: 0.8, rsi: 49, volatility: 'MEDIUM', monitored: false, favorite: false },
  { symbol: 'ADA', name: 'Cardano', category: 'CRYPTO', price: 0.38, change: -0.4, rsi: 41, volatility: 'MEDIUM', monitored: false, favorite: false },
  { symbol: 'DOT', name: 'Polkadot', category: 'CRYPTO', price: 6.2, change: -1.5, rsi: 35, volatility: 'HIGH', monitored: false, favorite: false },
  { symbol: 'DOGE', name: 'Dogecoin', category: 'CRYPTO', price: 0.12, change: 2.1, rsi: 60, volatility: 'HIGH', monitored: false, favorite: false },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'STOCKS', price: 224.5, change: 1.1, rsi: 54, volatility: 'LOW', monitored: true, favorite: true },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'STOCKS', price: 254.3, change: -3.4, rsi: 38, volatility: 'HIGH', monitored: true, favorite: false },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', category: 'STOCKS', price: 128.2, change: 4.8, rsi: 72, volatility: 'HIGH', monitored: true, favorite: true },
  { symbol: 'MSFT', name: 'Microsoft Corp.', category: 'STOCKS', price: 442.1, change: 0.2, rsi: 51, volatility: 'LOW', monitored: false, favorite: false },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'STOCKS', price: 185.4, change: 0.5, rsi: 53, volatility: 'LOW', monitored: false, favorite: false },
  { symbol: 'AMZN', name: 'Amazon.com', category: 'STOCKS', price: 198.2, change: -0.2, rsi: 48, volatility: 'LOW', monitored: false, favorite: false },
  { symbol: 'META', name: 'Meta Platforms', category: 'STOCKS', price: 512.4, change: 1.5, rsi: 58, volatility: 'MEDIUM', monitored: false, favorite: false },
  { symbol: 'NFLX', name: 'Netflix Inc.', category: 'STOCKS', price: 685.2, change: -0.8, rsi: 42, volatility: 'MEDIUM', monitored: false, favorite: false },
  { symbol: 'AMD', name: 'AMD', category: 'STOCKS', price: 172.4, change: 2.2, rsi: 62, volatility: 'HIGH', monitored: false, favorite: false },
  { symbol: 'INTC', name: 'Intel Corp.', category: 'STOCKS', price: 32.5, change: -5.4, rsi: 28, volatility: 'HIGH', monitored: false, favorite: false },
  { symbol: 'SPY', name: 'S&P 500 ETF', category: 'STOCKS', price: 542.1, change: 0.3, rsi: 52, volatility: 'LOW', monitored: true, favorite: true },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', category: 'STOCKS', price: 482.5, change: 0.5, rsi: 55, volatility: 'LOW', monitored: false, favorite: false },
  { symbol: 'ARKK', name: 'Ark Innovation', category: 'STOCKS', price: 42.1, change: 3.2, rsi: 64, volatility: 'HIGH', monitored: false, favorite: false },
  { symbol: 'GLD', name: 'Gold Trust', category: 'STOCKS', price: 224.2, change: 0.1, rsi: 50, volatility: 'LOW', monitored: false, favorite: false },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'FOREX', price: 1.085, change: 0.05, rsi: 48, volatility: 'LOW', monitored: false, favorite: false },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'FOREX', price: 1.291, change: -0.1, rsi: 46, volatility: 'LOW', monitored: false, favorite: false },
  { symbol: 'USD/JPY', name: 'US Dollar / Yen', category: 'FOREX', price: 155.2, change: 0.3, rsi: 62, volatility: 'MEDIUM', monitored: false, favorite: false },
];

interface AiMarketScannerViewProps {
  monitoredMarkets: string[];
  onToggleMarket: (symbol: string) => void;
  isDark: boolean;
}

export default function AiMarketScannerView({ monitoredMarkets, onToggleMarket, isDark }: AiMarketScannerViewProps) {
  const [markets, setMarkets] = useState<MarketAsset[]>(
    initialMarkets.map(m => ({
      ...m,
      monitored: monitoredMarkets.includes(m.symbol)
    }))
  );
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CRYPTO' | 'STOCKS' | 'FOREX'>('ALL');
  const [viewMode, setViewMode] = useState<'ALL' | 'MONITORED' | 'FAVORITES'>('ALL');

  const cardClasses = isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const handleToggleMonitored = (symbol: string) => {
    onToggleMarket(symbol);
    setMarkets(prev => 
      prev.map(m => m.symbol === symbol ? { ...m, monitored: !m.monitored } : m)
    );
  };

  const handleToggleFavorite = (symbol: string) => {
    setMarkets(prev => 
      prev.map(m => m.symbol === symbol ? { ...m, favorite: !m.favorite } : m)
    );
  };

  const filteredMarkets = markets.filter(m => {
    const matchesSearch = m.symbol.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
    const matchesView = 
      viewMode === 'ALL' || 
      (viewMode === 'MONITORED' && m.monitored) || 
      (viewMode === 'FAVORITES' && m.favorite);
    return matchesSearch && matchesCategory && matchesView;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-xl font-black flex items-center gap-2 ${textPrimary}`}>
            <Radio className="w-5 h-5 text-[#00D09C] animate-pulse" /> Neural Market Scanner
          </h2>
          <p className={`text-xs ${textSecondary} mt-1`}>
            Monitored assets are parsed in real-time. Toggle scanner indexing on any market asset to begin parsing order books.
          </p>
        </div>
        <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl self-end sm:self-auto">
          {(['ALL', 'MONITORED', 'FAVORITES'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                viewMode === mode 
                  ? 'bg-white dark:bg-white/10 text-black dark:text-[#00D09C] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Control Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search symbols or index assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full text-xs pl-10 pr-4 py-3.5 bg-black/10 dark:bg-white/5 border border-white/5 rounded-xl outline-none ${textPrimary} focus:border-[#00D09C]`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['ALL', 'CRYPTO', 'STOCKS', 'FOREX'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-1 sm:flex-initial px-4 py-3 border text-[10px] font-black rounded-xl transition-all ${
                categoryFilter === cat 
                  ? 'bg-[#00D09C]/10 border-[#00D09C] text-[#00D09C]' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of monitored assets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMarkets.map(m => (
          <div key={m.symbol} className={`rounded-2xl border p-5 ${cardClasses} relative overflow-hidden transition-all group hover:border-[#00D09C]/30`}>
            {/* Top Indicator */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleToggleFavorite(m.symbol)}
                  className={`p-1 rounded-md transition-colors ${m.favorite ? 'text-amber-500' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  <Star className={`w-4 h-4 ${m.favorite ? 'fill-current' : ''}`} />
                </button>
                <div className="flex items-center gap-3">
                  <CoinLogo symbol={m.symbol} size={40} className="rounded-xl border border-white/10" />
                  <div>
                    <h4 className={`text-base font-black ${textPrimary}`}>{m.symbol}</h4>
                    <span className={`text-[10px] ${textSecondary}`}>{m.name}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-mono font-black ${m.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {m.change >= 0 ? '+' : ''}{m.change}%
                </p>
                <span className="text-[10px] font-mono text-slate-500">${m.price.toLocaleString()}</span>
              </div>
            </div>

            {/* Neural scan properties */}
            <div className="grid grid-cols-2 gap-3 mb-6 bg-black/10 dark:bg-white/5 p-3 rounded-xl border border-white/5 text-xs">
              <div>
                <p className={`text-[9px] font-black uppercase tracking-widest ${textSecondary} opacity-60`}>RSI Index (14)</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Activity className="w-3.5 h-3.5 text-[#00D09C]" />
                  <span className={`font-mono font-bold ${textPrimary}`}>{m.rsi}</span>
                  <span className={`text-[9px] font-bold ${m.rsi > 70 ? 'text-rose-400' : m.rsi < 30 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {m.rsi > 70 ? 'Overbought' : m.rsi < 30 ? 'Oversold' : 'Neutral'}
                  </span>
                </div>
              </div>
              <div>
                <p className={`text-[9px] font-black uppercase tracking-widest ${textSecondary} opacity-60`}>Volatility</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Cpu className="w-3.5 h-3.5 text-blue-500" />
                  <span className={`font-bold ${
                    m.volatility === 'HIGH' ? 'text-rose-500' : m.volatility === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {m.volatility}
                  </span>
                </div>
              </div>
            </div>

            {/* Scanning switch */}
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <span className={`text-[10px] font-black uppercase tracking-widest ${textSecondary} flex items-center gap-1.5`}>
                <span className={`h-1.5 w-1.5 rounded-full relative ${m.monitored ? 'bg-[#00D09C]' : 'bg-slate-500'}`}>
                  {m.monitored && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D09C] opacity-75"></span>}
                </span>
                {m.monitored ? 'Active Indexing' : 'Scanning Offline'}
              </span>

              <button 
                onClick={() => handleToggleMonitored(m.symbol)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                  m.monitored 
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20' 
                    : 'bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/20 hover:bg-[#00D09C]/20'
                }`}
              >
                {m.monitored ? 'De-Index' : 'Index Asset'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
