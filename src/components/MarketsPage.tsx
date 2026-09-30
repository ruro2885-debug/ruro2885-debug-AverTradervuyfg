import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, TrendingUp, TrendingDown, Star, ChevronRight, Newspaper } from 'lucide-react';
import CoinLogo from './CoinLogo';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';

export default function MarketsPage({ theme, onSelectAsset }: { theme: 'light' | 'dark', onSelectAsset: (asset: any) => void }) {
  const { user, toggleWatchlist } = useAuth();
  const { formatCurrency } = usePreferences();
  
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [insights, setInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const watchlist = user?.watchlist || [];
  
  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/market/ticker');
      if (!res.ok) throw new Error('Failed to fetch market data');
      const data = await res.json();
      const mapped = data.map((d: any) => {
        const symbol = d.symbol.replace('USDT', '');
        const rawChange = parseFloat(d.priceChangePercent) || 0;
        const isPositive = rawChange >= 0;
        return {
          symbol,
          name: symbol === 'BTC' ? 'Bitcoin' : symbol === 'ETH' ? 'Ethereum' : symbol === 'ADA' ? 'Cardano' : symbol === 'XRP' ? 'Ripple' : symbol === 'SOL' ? 'Solana' : symbol === 'DOGE' ? 'Dogecoin' : symbol === 'AVAX' ? 'Avalanche' : symbol === 'BNB' ? 'Binance Coin' : symbol === 'FET' ? 'Artificial Superintelligence Alliance' : symbol === 'LINK' ? 'Chainlink' : symbol,
          price: parseFloat(d.lastPrice),
          change: (isPositive ? '+' : '') + rawChange.toFixed(2) + '%',
          isPositive,
          rawPrice: parseFloat(d.lastPrice),
          rawChange,
          quoteVolume: parseFloat(d.quoteVolume) || 0
        };
      });
      setAssets(mapped);
    } catch (err) {
      console.warn("MarketsPage fetch failed, using fallback market data:", err);
      const fallbackList = [
        { symbol: 'BTC', name: 'Bitcoin', price: 64850.00, change: '+2.45%', isPositive: true, rawPrice: 64850.00, rawChange: 2.45, quoteVolume: 1420500000 },
        { symbol: 'ETH', name: 'Ethereum', price: 3480.50, change: '+1.82%', isPositive: true, rawPrice: 3480.50, rawChange: 1.82, quoteVolume: 850300000 },
        { symbol: 'SOL', name: 'Solana', price: 148.20, change: '+5.14%', isPositive: true, rawPrice: 148.20, rawChange: 5.14, quoteVolume: 620100000 },
        { symbol: 'BNB', name: 'Binance Coin', price: 585.40, change: '+0.95%', isPositive: true, rawPrice: 585.40, rawChange: 0.95, quoteVolume: 210400000 },
        { symbol: 'XRP', name: 'Ripple', price: 0.584, change: '-0.85%', isPositive: false, rawPrice: 0.584, rawChange: -0.85, quoteVolume: 180200000 },
        { symbol: 'ADA', name: 'Cardano', price: 0.412, change: '+1.20%', isPositive: true, rawPrice: 0.412, rawChange: 1.20, quoteVolume: 95000000 },
        { symbol: 'DOGE', name: 'Dogecoin', price: 0.128, change: '+3.40%', isPositive: true, rawPrice: 0.128, rawChange: 3.40, quoteVolume: 310000000 },
        { symbol: 'AVAX', name: 'Avalanche', price: 28.50, change: '-1.10%', isPositive: false, rawPrice: 28.50, rawChange: -1.10, quoteVolume: 88000000 },
        { symbol: 'LINK', name: 'Chainlink', price: 14.20, change: '+2.15%', isPositive: true, rawPrice: 14.20, rawChange: 2.15, quoteVolume: 74000000 },
        { symbol: 'FET', name: 'Artificial Superintelligence Alliance', price: 1.45, change: '+8.60%', isPositive: true, rawPrice: 1.45, rawChange: 8.60, quoteVolume: 120000000 }
      ];
      setAssets(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  const generateLocalInsights = (currentAssets: any[]) => {
    if (!currentAssets || currentAssets.length === 0) return 'No insights available.';
    const btc = currentAssets.find(a => a.symbol === 'BTC');
    const eth = currentAssets.find(a => a.symbol === 'ETH');
    const gainers = [...currentAssets].sort((a, b) => b.rawChange - a.rawChange);
    const topGainer = gainers[0];
    
    let insight = `Market analysis indicates a ${btc?.isPositive ? 'bullish' : 'bearish'} trend led by Bitcoin at ${formatCurrency(btc?.price || 0)}. `;
    if (topGainer && topGainer.rawChange > 5) {
      insight += `${topGainer.name} (${topGainer.symbol}) is showing exceptionally strong momentum, up ${topGainer.change}. `;
    }
    if (eth) {
      insight += `Ethereum is currently trading at ${formatCurrency(eth.price)}, showing a ${eth.change} shift. `;
    }
    insight += `Overall liquidity remains concentrated in top-tier assets. Quantum engine recommends maintaining a balanced exposure weighted towards high-conviction momentum plays.`;
    return insight;
  };

  const fetchInsights = async (currentAssets: any[]) => {
    try {
      setInsightsLoading(true);
      const currentPrices = currentAssets.reduce((acc, asset) => {
        acc[asset.symbol] = asset.price;
        return acc;
      }, {} as Record<string, number>);
      
      const res = await fetch('/api/market/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPrices })
      });
      if (!res.ok) {
        setInsights(generateLocalInsights(currentAssets));
        return;
      }
      const data = await res.json();
      if (!data || (!data.briefing && !data.intelligence)) {
        setInsights(generateLocalInsights(currentAssets));
        return;
      }
      setInsights(data.briefing?.summary || data.intelligence || generateLocalInsights(currentAssets));
    } catch (err) {
      console.error(err);
      setInsights(generateLocalInsights(currentAssets));
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (assets.length > 0) {
      fetchInsights(assets);
    }
  }, [assets.length]);

  const fetchNews = async () => {
    try {
      setNewsLoading(true);
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss');
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const mappedNews = data.items.slice(0, 5).map((item: any) => {
          const diffMs = Date.now() - new Date(item.pubDate).getTime();
          const hours = Math.floor(diffMs / 3600000);
          const time = hours > 0 ? `${hours}h ago` : 'Just now';
          
          let relatedAsset = null;
          const text = (item.title + " " + (item.description || "")).toUpperCase();
          if (text.includes('BITCOIN') || text.includes('BTC')) relatedAsset = 'BTC';
          else if (text.includes('ETHEREUM') || text.includes('ETH')) relatedAsset = 'ETH';
          else if (text.includes('SOLANA') || text.includes('SOL')) relatedAsset = 'SOL';
          else if (text.includes('RIPPLE') || text.includes('XRP')) relatedAsset = 'RIPPLE';
          else if (text.includes('CARDANO') || text.includes('ADA')) relatedAsset = 'ADA';

          return {
            headline: item.title,
            source: item.author || 'Cointelegraph',
            time,
            link: item.link,
            relatedAsset
          };
        });
        setNews(mappedNews);
        return;
      }
      throw new Error('No items');
    } catch (err) {
      console.warn("Markets news fetch warning (using fallback):", err);
      setNews([
        { headline: 'Bitcoin Surges Past Key Resistance Level as Institutional Inflows Accelerate', source: 'Cointelegraph', time: '2h ago', link: 'https://cointelegraph.com', relatedAsset: 'BTC' },
        { headline: 'Ethereum Layer 2 Total Value Locked Reaches New All-Time High', source: 'CoinDesk', time: '4h ago', link: 'https://coindesk.com', relatedAsset: 'ETH' },
        { headline: 'Solana DeFi Volume Surpasses Major Competitors in Q3 Trading Surge', source: 'Decrypt', time: '6h ago', link: 'https://decrypt.co', relatedAsset: 'SOL' },
        { headline: 'Global Regulatory Frameworks Shape Next Phase of Digital Asset Adoption', source: 'Blockworks', time: '8h ago', link: 'https://blockworks.co', relatedAsset: null },
      ]);
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchNews();
    const assetsInterval = setInterval(fetchAssets, 40 * 60000); // 40m refresh
    const newsInterval = setInterval(fetchNews, 60000); // 60s refresh
    return () => {
      clearInterval(assetsInterval);
      clearInterval(newsInterval);
    };
  }, []);

  const isDark = theme === 'dark';
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardClasses = isDark ? "bg-slate-900/40 backdrop-blur-md border border-white/5" : "bg-white/60 backdrop-blur-md border border-slate-200/50";

  const categories = ['Favorites', 'Trending', 'Gainers', 'Losers'];
  const [activeCategory, setActiveCategory] = useState('Trending');

  const filteredAssets = useMemo(() => {
    let list = [...assets];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q));
    }

    if (activeCategory === 'Favorites') {
      return list.filter(asset => watchlist.includes(asset.symbol));
    }
    
    if (activeCategory === 'Trending') {
      return list.sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0));
    }
    
    if (activeCategory === 'Gainers') {
      // ONLY positive gains (green), sorted highest gain first
      return list.filter(a => a.rawChange > 0).sort((a, b) => b.rawChange - a.rawChange);
    }
    
    if (activeCategory === 'Losers') {
      // ONLY negative losses (red), sorted worst loss first
      return list.filter(a => a.rawChange < 0).sort((a, b) => a.rawChange - b.rawChange);
    }
    
    return list;
  }, [assets, activeCategory, watchlist, searchQuery]);

  return (
    <div className="pt-[73px] flex-1 flex flex-col">
      {/* 1. FIXED HEADER */}
      <header className={`fixed top-0 left-0 right-0 w-full z-40 backdrop-blur-xl ${isDark ? 'bg-black/90' : 'bg-white/90'} border-b ${isDark ? 'border-white/5' : 'border-slate-200'} p-4 flex justify-between items-center box-border`}>
        <div className="w-full flex items-center justify-between gap-4">
          <h1 className={`text-xl font-black ${textPrimary}`}>Markets</h1>
          <div className="relative flex-1 max-w-xs">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input 
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none border ${
                isDark 
                  ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500/50' 
                  : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/50'
              }`}
            />
          </div>
        </div>
      </header>

      {/* 2. CATEGORY TABS */}
      <div className="flex overflow-x-auto gap-1.5 px-4 py-4 scrollbar-hide sticky top-[73px] z-30 bg-inherit">
        {categories.map((cat, i) => (
          <button 
            key={`market-cat-${cat}-${i}`} 
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === cat 
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                : isDark 
                  ? 'bg-slate-900/50 text-slate-400 hover:text-white' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat === 'Favorites' && <Star size={12} className={activeCategory === cat ? "fill-black" : "text-amber-400 fill-amber-400"} />}
            {cat}
            {cat === 'Favorites' && watchlist.length > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                activeCategory === cat ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {watchlist.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 3. MARKET OVERVIEW */}
      <div className="px-4 py-2">
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-sm font-black uppercase tracking-wider ${textSecondary}`}>
            {activeCategory === 'Favorites' ? 'Your Favorite Assets' : activeCategory === 'Gainers' ? 'Top Gainers (Bullish)' : activeCategory === 'Losers' ? 'Top Losers (Bearish)' : 'Market Overview'}
          </h3>
          <span className="text-xs font-bold text-slate-500">
            {filteredAssets.length} {filteredAssets.length === 1 ? 'asset' : 'assets'}
          </span>
        </div>

        <div className={`rounded-[24px] overflow-hidden ${cardClasses} shadow-xl`}>
          {loading && filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">Retrieving digital assets...</div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-gray-500 flex flex-col items-center gap-3">
              <span>Unable to load market data. Tap to retry.</span>
              <button onClick={fetchAssets} className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Retry</button>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <p className="font-bold">
                {activeCategory === 'Favorites' 
                  ? 'No favorite assets added yet.' 
                  : activeCategory === 'Gainers' 
                  ? 'No positive gainers in this session.' 
                  : activeCategory === 'Losers' 
                  ? 'No bearish assets in this session.' 
                  : 'No matching assets found.'}
              </p>
              {activeCategory === 'Favorites' && (
                <p className="text-[11px] text-slate-500">
                  Open any asset details and tap the star icon at the top right to save it to your Favorites list.
                </p>
              )}
            </div>
          ) : (
            filteredAssets.map((asset, i) => {
              return (
                <motion.div 
                  key={`${asset.symbol}-${i}`} 
                  onClick={() => onSelectAsset(asset)} 
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center justify-between p-4 sm:p-5 cursor-pointer transition-colors ${i !== filteredAssets.length - 1 ? (isDark ? 'border-b border-white/5' : 'border-b border-slate-100') : ''} ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100 shadow-inner'}`}>
                      <CoinLogo symbol={asset.symbol} size={28} />
                    </div>
                    <div>
                      <p className={`font-black text-sm tracking-tight ${textPrimary}`}>{asset.name}</p>
                      <p className={`text-[11px] font-bold ${textSecondary} uppercase tracking-wider`}>{asset.symbol}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-black text-sm ${textPrimary}`}>{formatCurrency(asset.price)}</p>
                    <p className={`text-[11px] font-black ${asset.isPositive ? 'text-emerald-500' : 'text-red-500'} flex items-center justify-end gap-1`}>
                      {asset.isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {asset.change}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. LIVE MARKET CONTENT */}
      <div className="px-4 py-6">
        <h3 className={`text-lg font-black tracking-tight ${textPrimary} mb-4`}>Market Insights</h3>
        <div className={`rounded-[24px] p-6 ${cardClasses}`}>
            {insightsLoading ? (
              <p className="text-sm text-slate-500 animate-pulse">Analyzing market pulse...</p>
            ) : insights ? (
              <p className="text-sm text-slate-300 leading-relaxed">{insights}</p>
            ) : (
              <p className="text-sm text-slate-400">No insights currently available.</p>
            )}
        </div>
      </div>

      {/* 5. MARKET NEWS */}
      <div className="px-4 py-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-black tracking-tight ${textPrimary} flex items-center gap-2`}>
            <Newspaper className="w-5 h-5 text-indigo-500" />
            Financial Intelligence
          </h3>
        </div>

        {newsLoading ? (
          <div className={`rounded-3xl p-8 text-center ${cardClasses} animate-pulse`}>
            <p className="text-xs text-gray-500">Retrieving institutional headlines...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item, i) => (
              <div 
                key={`news-${i}`} 
                onClick={() => window.open(item.link, '_blank')}
                className={`rounded-[24px] p-5 cursor-pointer border hover:border-emerald-500/30 transition-all ${cardClasses}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider">{item.source}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{item.time}</span>
                </div>
                <h4 className={`text-sm font-bold leading-snug ${textPrimary} hover:text-emerald-500 transition-colors mb-2 line-clamp-2`}>
                  {item.headline}
                </h4>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
