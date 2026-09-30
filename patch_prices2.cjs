const fs = require('fs');
let content = fs.readFileSync('src/contexts/TradingEngineContext.tsx', 'utf8');

const regex = /\/\/ 1\. HIGH-FREQUENCY LIVE PRICES TICKER[\s\S]*?\}, 1000\);/;

const replacement = `    // 1. HIGH-FREQUENCY LIVE PRICES TICKER (Every 5 seconds, real API)
    tickInterval = setInterval(async () => {
      const currentSession = sessionRefVal.current;
      if (!currentSession || currentSession.status !== 'ACTIVE') {
        clearInterval(tickInterval);
        return;
      }

      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22BNBUSDT%22,%22XRPUSDT%22,%22ADAUSDT%22,%22DOGEUSDT%22%5D');
        if (res.ok) {
          const data = await res.json();
          const priceMap = {};
          data.forEach(item => {
            const asset = item.symbol.replace('USDT', '');
            priceMap[asset] = parseFloat(item.price);
          });
          
          setLiveTradePrices(prev => {
            const next = { ...prev };
            // Update open trades with real prices
            const openTrades = tradesRefVal.current.filter(t => t.status === 'OPEN');
            openTrades.forEach(trade => {
              if (priceMap[trade.asset]) {
                next[trade.id] = priceMap[trade.asset];
              } else {
                next[trade.id] = prev[trade.id] || trade.entry; // Fallback
              }
            });
            
            // Update general asset prices
            Object.keys(priceMap).forEach(asset => {
               next[asset] = priceMap[asset];
            });
            
            // Keep non-crypto mock fallbacks static
            const stocks = ['AAPL', 'NVDA', 'TSLA'];
            stocks.forEach(stock => {
               if (!next[stock]) next[stock] = (stock === 'AAPL' ? 172 : stock === 'NVDA' ? 120 : 180);
            });

            livePricesRef.current = next;
            return next;
          });
        }
      } catch (err) {
        console.warn("[TradingEngineContext] Failed to fetch real prices", err);
      }
    }, 5000);`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/contexts/TradingEngineContext.tsx', content);
  console.log("Replaced successfully");
} else {
  console.log("Regex not found");
}
