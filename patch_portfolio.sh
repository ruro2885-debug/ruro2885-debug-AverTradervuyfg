#!/bin/bash
sed -i -e '/const tvChartData = useMemo(() => {/,/}, \[timeframe, totalNetBalance, totalFloatingPnl\]);/c\
  const tvChartData = useMemo(() => {\
    const helperTimeframe = timeframe === "1H" ? "1D" : timeframe === "1D" ? "5D" : timeframe === "1W" ? "1M" : "3M";\
    const rawData = generateChartData(helperTimeframe, "Bitcoin");\
    \
    const currentTotalValue = totalNetBalance + totalFloatingPnl;\
    const lastRawPoint = rawData[rawData.length - 1];\
    const lastRawClose = (lastRawPoint && lastRawPoint.close) ? lastRawPoint.close : 64230;\
    const scaleFactor = (Number.isFinite(currentTotalValue) && currentTotalValue > 0) ? currentTotalValue / lastRawClose : 1;\
    \
    const now = Math.floor(Date.now() / 1000);\
    let secondsPerCandle = 24 * 60 * 60;\
    if (timeframe === "1D") secondsPerCandle = 15 * 60;\
    else if (timeframe === "5D") secondsPerCandle = 4 * 60 * 60;\
    else if (timeframe === "1M") secondsPerCandle = 24 * 60 * 60;\
    else if (timeframe === "3M") secondsPerCandle = 2 * 24 * 60 * 60;\
    else if (timeframe === "6M") secondsPerCandle = 4 * 24 * 60 * 60;\
    else if (timeframe === "1Y") secondsPerCandle = 8 * 24 * 60 * 60;\
    else secondsPerCandle = 24 * 60 * 60;\
    \
    return rawData.map((d, idx) => {\
      const timeInSeconds = now - (rawData.length - 1 - idx) * secondsPerCandle;\
      const safeScale = (val: number) => {\
        const scaled = val * scaleFactor;\
        return Number.isFinite(scaled) ? Number(scaled.toFixed(2)) : Number(val.toFixed(2));\
      };\
      \
      return {\
        time: timeInSeconds,\
        open: safeScale(d.open || 64100),\
        high: safeScale(d.high || 64300),\
        low: safeScale(d.low || 63900),\
        close: safeScale(d.close || 64200),\
      };\
    });\
  }, [timeframe, totalNetBalance, totalFloatingPnl]);
' src/components/portfolio_v2/PortfolioViewV2.tsx
