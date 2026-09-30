const fs = require('fs');
let content = fs.readFileSync('src/components/portfolio_v2/PortfolioViewV2.tsx', 'utf8');

const target = `          {/* Chart Stage */}
          <div className="bg-[#080B11]/40 p-2 border border-white/[0.04] rounded-2xl relative overflow-hidden">
            <AverPortfolioChart 
              data={mergedChartData} 
              isDark={isDark} 
              onHover={handleHover} 
              executionEvents={executionEvents}
            />`;

const replacement = `          {/* Chart Stage */}
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
                isDark={isDark} 
                onHover={handleHover} 
                executionEvents={executionEvents}
              />
            )}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/portfolio_v2/PortfolioViewV2.tsx', content);
  console.log("Replaced successfully");
} else {
  console.log("Target not found");
}
