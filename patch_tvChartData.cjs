const fs = require('fs');
let content = fs.readFileSync('src/components/portfolio_v2/PortfolioViewV2.tsx', 'utf8');

const regexToRemoveAiLiveCandles = /\s*\/\/ --- CHART STATE MANAGEMENT ---[\s\S]*?\/\/ Live execution events mapped directly to timestamps in tvChartData/;

const newTvChartData = `  // --- CHART STATE MANAGEMENT ---
  const [timeframe, setTimeframe] = useState<string>('1D');

  const tvChartData = useMemo(() => {
    if (!user?.snapshots || user.snapshots.length === 0) return [];
    
    // Sort snapshots ascending
    const sorted = [...user.snapshots].sort((a, b) => {
      const aTime = (a.timestamp as any)?.seconds || (a.timestamp as any)?._seconds || (new Date(a.timestamp).getTime() / 1000);
      const bTime = (b.timestamp as any)?.seconds || (b.timestamp as any)?._seconds || (new Date(b.timestamp).getTime() / 1000);
      return aTime - bTime;
    });

    return sorted.map(snap => {
      const timeInSeconds = (snap.timestamp as any)?.seconds || (snap.timestamp as any)?._seconds || Math.floor(new Date(snap.timestamp).getTime() / 1000);
      return {
        time: timeInSeconds,
        value: snap.totalValue
      };
    });
  }, [user?.snapshots, timeframe]);

  const mergedChartData = tvChartData;

  // Live execution events mapped directly to timestamps in tvChartData`;

if (regexToRemoveAiLiveCandles.test(content)) {
  content = content.replace(regexToRemoveAiLiveCandles, newTvChartData);
  fs.writeFileSync('src/components/portfolio_v2/PortfolioViewV2.tsx', content);
  console.log("Replaced successfully");
} else {
  console.log("Regex not found");
}
