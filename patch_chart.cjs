const fs = require('fs');
let content = fs.readFileSync('src/components/portfolio_v2/PortfolioViewV2.tsx', 'utf8');

// replace CandlestickSeries with AreaSeries
content = content.replace('CandlestickSeries, createSeriesMarkers', 'AreaSeries, createSeriesMarkers');

const oldSeries = `    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00D09C',
      downColor: '#FF6B6B',
      borderUpColor: '#00D09C',
      borderDownColor: '#FF6B6B',
      wickUpColor: '#00D09C',
      wickDownColor: '#FF6B6B',
    });`;

const newSeries = `    const candleSeries = chart.addSeries(AreaSeries, {
      lineColor: '#00D09C',
      topColor: 'rgba(0, 208, 156, 0.4)',
      bottomColor: 'rgba(0, 208, 156, 0.0)',
      lineWidth: 2,
    });`;
content = content.replace(oldSeries, newSeries);

const oldHover = `        if (seriesData) {
          onHover({
            open: (seriesData as any).open,
            high: (seriesData as any).high,
            low: (seriesData as any).low,
            close: (seriesData as any).close,
          });
          return;
        }`;

const newHover = `        if (seriesData) {
          onHover({
            open: (seriesData as any).value,
            high: (seriesData as any).value,
            low: (seriesData as any).value,
            close: (seriesData as any).value,
          });
          return;
        }`;
content = content.replace(oldHover, newHover);

fs.writeFileSync('src/components/portfolio_v2/PortfolioViewV2.tsx', content);
