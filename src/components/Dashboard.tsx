import { useState } from 'react';
import { 
  TrendingUp, Wallet, ShieldCheck, Activity, BarChart2, 
  ArrowUpRight, Cpu, Zap, CheckCircle2,
  FileText, LogOut, Users, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard({ onNavigate }: { theme?: string; initialTab?: string; onNavigate: (view: string, tab?: string) => void; onBack?: () => void }) {
  const { user, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'markets' | 'trade' | 'ai' | 'wallet' | 'copytrade' | 'support'>('home');
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('1000');
  const [orderExecuted, setOrderExecuted] = useState(false);

  const assets = [
    { symbol: 'BTC', name: 'Bitcoin', price: '$94,280.00', change: '+3.4%', volume: '$24.8B', trend: 'up' },
    { symbol: 'ETH', name: 'Ethereum', price: '$3,540.20', change: '+2.1%', volume: '$12.4B', trend: 'up' },
    { symbol: 'SOL', name: 'Solana', price: '$188.50', change: '+5.8%', volume: '$4.1B', trend: 'up' },
    { symbol: 'AVR', name: 'Aver Token', price: '$14.85', change: '+12.4%', volume: '$890M', trend: 'up' },
    { symbol: 'XRP', name: 'Ripple', price: '$2.45', change: '-1.2%', volume: '$3.2B', trend: 'down' },
  ];

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderExecuted(true);
    setTimeout(() => setOrderExecuted(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Institutional Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
            <span className="text-2xl font-black bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent tracking-wider">AVER</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">INSTITUTIONAL</span>
          </div>
          <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'home', label: 'Overview', icon: BarChart2 },
              { id: 'markets', label: 'Markets', icon: TrendingUp },
              { id: 'trade', label: 'Terminal', icon: Activity },
              { id: 'ai', label: 'AI Alpha', icon: Cpu },
              { id: 'wallet', label: 'Vaults', icon: Wallet },
              { id: 'copytrade', label: 'CopyTrade', icon: Users },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('preferences')} className="p-2 text-slate-400 hover:text-amber-400 transition bg-slate-800/40 rounded-xl border border-slate-800" title="Preferences">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={() => onNavigate('history')} className="p-2 text-slate-400 hover:text-amber-400 transition bg-slate-800/40 rounded-xl border border-slate-800" title="Audit History">
            <FileText className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{user?.displayName || 'Elite Trader'}</div>
              <div className="text-[10px] text-amber-400 uppercase tracking-wider">Sovereign Tier 1</div>
            </div>
            <button 
              onClick={() => signOutUser()}
              className="p-2 bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Quick Ticker Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Total Portfolio Value</div>
              <div className="text-2xl font-black text-white mt-0.5">$1,485,290.40</div>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">24h Alpha Return</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">+$34,820.10 (+2.4%)</div>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Available Vault Margin</div>
              <div className="text-2xl font-black text-white mt-0.5">$450,000.00</div>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">AI Alpha Confidence</div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">98.4% (Bullish)</div>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'home' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Markets & Charts */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-400" />
                    Market Liquidity & Price Feed
                  </h2>
                  <button onClick={() => onNavigate('market-highlights')} className="text-xs text-amber-400 hover:underline">View All Markets &rarr;</button>
                </div>
                <div className="space-y-3">
                  {assets.map(asset => (
                    <div key={asset.symbol} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-amber-500/50 transition cursor-pointer" onClick={() => { setSelectedAsset(asset.symbol); setActiveTab('trade'); }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400">
                          {asset.symbol}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{asset.name}</div>
                          <div className="text-xs text-slate-400">Vol: {asset.volume}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-white">{asset.price}</div>
                        <div className={`text-xs font-semibold ${asset.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>{asset.change}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Sovereign Vault & Security Status
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-xs text-slate-400 mb-1">Cold Custody Multi-Sig</div>
                    <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> 3 of 5 Keys Active
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-xs text-slate-400 mb-1">Biometric 2FA Guard</div>
                    <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Enforced & Verified
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Quick Execution Terminal */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Quick Block Trade
                </h2>
                {orderExecuted && (
                  <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Order executed successfully at best institutional rate.</span>
                  </div>
                )}
                <form onSubmit={handleExecuteTrade} className="space-y-4">
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setOrderType('buy')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${orderType === 'buy' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                    >
                      BUY / LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('sell')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${orderType === 'sell' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                    >
                      SELL / SHORT
                    </button>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Select Asset</label>
                    <select 
                      value={selectedAsset} 
                      onChange={(e) => setSelectedAsset(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {assets.map(a => <option key={a.symbol} value={a.symbol}>{a.name} ({a.symbol})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Amount (USD)</label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-xl shadow-lg hover:opacity-90 transition text-sm flex items-center justify-center gap-2"
                  >
                    Execute {orderType.toUpperCase()} Order
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-3">Promos & Rewards</h3>
                <p className="text-xs text-slate-400 mb-4">Claim your $10,000 institutional trading bonus credit.</p>
                <button onClick={() => onNavigate('bonus-center')} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/30 transition">
                  Open Bonus Center &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'markets' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Global Markets & Order Books</h2>
            <div className="space-y-4">
              {assets.map(asset => (
                <div key={asset.symbol} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 text-lg">
                      {asset.symbol}
                    </div>
                    <div>
                      <div className="font-bold text-white text-base">{asset.name}</div>
                      <div className="text-xs text-slate-400">24h Volume: {asset.volume}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold text-white">{asset.price}</div>
                      <div className={`text-xs font-semibold ${asset.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>{asset.change}</div>
                    </div>
                    <button onClick={() => { setSelectedAsset(asset.symbol); setActiveTab('trade'); }} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs">
                      Trade
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'trade' && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Advanced Trading Terminal: {selectedAsset}/USD</h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">Sub-millisecond order matching engine with professional charting and depth indicators.</p>
            <div className="h-80 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500">
              Interactive Candlestick Chart & Order Book Active
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Gemini AI Alpha & Market Scanner</h2>
                <p className="text-xs text-slate-400">Autonomous predictive trading signals and sentiment analysis</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl">
                <h3 className="font-bold text-amber-400 mb-2">Bullish Momentum Alert</h3>
                <p className="text-slate-300 text-sm mb-4">BTC whales accumulating in institutional OTC pools. Recommended allocation: Long with 5x leverage.</p>
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">Confidence: 96.8%</span>
              </div>
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl">
                <h3 className="font-bold text-amber-400 mb-2">Liquidity Imbalance Detector</h3>
                <p className="text-slate-300 text-sm mb-4">SOL order book shows significant buy wall at $182.00 support level.</p>
                <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">Confidence: 92.4%</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
            <h2 className="text-xl font-bold text-white">Sovereign Vaults & Asset Balances</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400">Bitcoin Vault</div>
                <div className="text-2xl font-bold text-white mt-1">8.4500 BTC</div>
                <div className="text-xs text-slate-400 mt-1">≈ $796,666.00</div>
              </div>
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400">Ethereum Vault</div>
                <div className="text-2xl font-bold text-white mt-1">45.2000 ETH</div>
                <div className="text-xs text-slate-400 mt-1">≈ $159,977.04</div>
              </div>
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400">USDT Sovereign Reserve</div>
                <div className="text-2xl font-bold text-white mt-1">$528,647.36</div>
                <div className="text-xs text-slate-400 mt-1">Liquid Margin</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'copytrade' && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
            <h2 className="text-xl font-bold text-white">Elite Trader Copy Trading Matrix</h2>
            <p className="text-slate-400 text-sm">Automatically mirror top-performing institutional quant strategies with zero latency.</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-lg">Quantum Alpha Fund I</div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">+348.2% All-Time ROI</div>
                  <div className="text-xs text-slate-400 mt-2">Followers: 1,420 | AUM: $12.4M</div>
                </div>
                <button className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg">Copy Strategy</button>
              </div>
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-lg">Apex Arbitrage Syndicate</div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">+184.6% All-Time ROI</div>
                  <div className="text-xs text-slate-400 mt-2">Followers: 890 | AUM: $6.8M</div>
                </div>
                <button className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg">Copy Strategy</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
