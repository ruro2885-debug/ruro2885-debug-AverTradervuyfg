const fs = require('fs');
let code = fs.readFileSync('src/components/portfolio_v2/PortfolioViewV2.tsx', 'utf8');

const replacement = `
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'perf' | 'alloc'>('perf');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="min-h-screen bg-[#08080c] text-white w-full flex flex-col relative"
    >
      {/* 1. PORTFOLIO HEADER */}
      <PortfolioHeaderV2 
        theme={theme} 
        onBack={onBack} 
        onSearchChange={(val) => {
          if (val) {
            const upper = val.toUpperCase().trim();
            setSelectedTicker(upper);
          } else {
            setSelectedTicker(null);
          }
        }}
        onOpenSettings={() => alert("Portfolio Settings: Advanced API keys, custom risk weights, and database synchronization profiles.")}
      />

      {/* Main scrollable body workspace */}
      <div className="flex-1 overflow-y-auto w-full pt-[80px]">
        <div className="w-full max-w-[1400px] mx-auto flex flex-col items-center">
          
          {/* 2. PORTFOLIO OVERVIEW */}
          <div className="w-[96%] mx-auto mt-6">
            <PortfolioOverview theme={theme} />
          </div>

          {/* PORTFOLIO TABS */}
          <div className="w-[96%] mx-auto mt-6 flex gap-3">
            <button 
              onClick={() => setActiveTab('perf')}
              className={\`flex-1 py-3 rounded-full text-sm font-bold transition-all \${activeTab === 'perf' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-slate-400 hover:bg-white/10'}\`}
            >
              Performance
            </button>
            <button 
              onClick={() => setActiveTab('alloc')}
              className={\`flex-1 py-3 rounded-full text-sm font-bold transition-all \${activeTab === 'alloc' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-slate-400 hover:bg-white/10'}\`}
            >
              Allocation
            </button>
          </div>

          {activeTab === 'perf' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col items-center"
            >
              {/* 3. INTERACTIVE CANDLESTICK CHART */}
              <div className="w-full mt-7">
                <PortfolioChart theme={theme} />
              </div>

              {/* 4. QUICK ACTIONS */}
              <div className="w-full mt-6">
                <QuickActions 
                  theme={theme} 
                  onOpenDeposit={onOpenDeposit}
                  onOpenWithdraw={onOpenWithdraw}
                  onOpenTransfer={() => alert("Inter-account Transfer: Transferring funds to paper futures or margin pools is optimized for immediate settlement.")}
                  onNavigate={onNavigate}
                />
              </div>

              {/* 6.5 TRANSACTIONS / HISTORY */}
              <div className="w-full mt-8">
                <PortfolioTransactions theme={theme} />
              </div>

              {/* 7. PERFORMANCE ANALYTICS */}
              <div className="w-full mt-8">
                <PortfolioAnalytics theme={theme} />
              </div>

              {/* 8. AI PORTFOLIO INTELLIGENCE */}
              <div className="w-full mt-8">
                <PortfolioAIInsights theme={theme} />
              </div>

              {/* 9. RISK ANALYSIS */}
              <div className="w-full mt-8">
                <PortfolioRisk theme={theme} />
              </div>

              {/* 10. EARN & YIELD */}
              <div className="w-full mt-8">
                <PortfolioYield theme={theme} />
              </div>

              {/* 11. MARKET NEWS */}
              <div className="w-full mt-8">
                <PortfolioNews theme={theme} />
              </div>
            </motion.div>
          )}

          {activeTab === 'alloc' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col items-center"
            >
              {/* 5. ASSET ALLOCATION (Donut + Breakdown) */}
              <div className="w-full mt-8">
                <PortfolioAllocation 
                  theme={theme} 
                  selectedTicker={selectedTicker}
                  onSelectTicker={(ticker) => setSelectedTicker(ticker)}
                />
              </div>

              {/* 6. MY HOLDINGS (Expansion rows) */}
              <div className="w-full mt-8">
                <PortfolioHoldings 
                  theme={theme} 
                  selectedTicker={selectedTicker}
                  onSelectTicker={(ticker) => setSelectedTicker(ticker)}
                />
              </div>
            </motion.div>
          )}

          {/* 12. BOTTOM PADDING */}
          <div className="h-[120px] w-full" />
        </div>
      </div>
    </motion.div>
  );
}
`;

const regex = /const \[selectedTicker, setSelectedTicker\] = useState<string \| null>\(null\);[\s\S]*\}\s*\);\s*\}/;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/portfolio_v2/PortfolioViewV2.tsx', code);
