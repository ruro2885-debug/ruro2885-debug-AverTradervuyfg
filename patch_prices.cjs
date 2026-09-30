const fs = require('fs');
let content = fs.readFileSync('src/contexts/TradingEngineContext.tsx', 'utf8');

const target = `    // 1. HIGH-FREQUENCY LIVE PRICES TICKER (Every 1 second)
    tickInterval = setInterval(() => {
      const currentSession = sessionRefVal.current;
      if (!currentSession || currentSession.status !== 'ACTIVE') {
        clearInterval(tickInterval);
        return;
      }

      const openTrades = tradesRefVal.current.filter(t => t.status === 'OPEN');
      
      setLiveTradePrices(prev => {
        const next = { ...prev };
        openTrades.forEach(trade => {
          const basePrice = next[trade.id] || trade.entry;
          const fluctuation = (Math.random() - 0.5) * 0.001 * basePrice;
          next[trade.id] = parseFloat((basePrice + fluctuation).toFixed(2));
        });

        // Also fluctuate general asset prices for BTC, ETH, SOL, AAPL, NVDA, TSLA
        const assets = ['BTC', 'ETH', 'SOL', 'AAPL', 'NVDA', 'TSLA'];
        assets.forEach(asset => {
          const basePrice = next[asset] || (asset === 'BTC' ? 64000 : asset === 'ETH' ? 3450 : asset === 'SOL' ? 145 : asset === 'AAPL' ? 172 : asset === 'NVDA' ? 120 : 180);
          const fluctuation = (Math.random() - 0.5) * 0.0005 * basePrice;
          next[asset] = parseFloat((basePrice + fluctuation).toFixed(2));
        });

        livePricesRef.current = next;
        // console.log("[TradingEngineContext] Live prices updated:", next);
        return next;
      });
    }, 1000);`;

const replacement = `    // 1. HIGH-FREQUENCY LIVE PRICES TICKER (Every 5 seconds)
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
          const priceMap: Record<string, number> = {};
          data.forEach((item: any) => {
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
            
            // Keep non-crypto mock fallbacks for AAPL, NVDA, TSLA if they exist as they aren't on Binance
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

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/contexts/TradingEngineContext.tsx', content);
  console.log("Replaced successfully");
} else {
  console.log("Target not found");
}
