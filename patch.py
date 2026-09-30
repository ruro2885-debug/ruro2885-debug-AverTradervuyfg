import re

with open('src/utils/portfolioHelpers.ts', 'r') as f:
    content = f.read()

new_func = """export function generateChartData(timeframe: string, benchmark: string): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];
  let basePrice = 54000;
  
  // Adjust parameters based on timeframe
  let numPoints = 60;
  let timeLabels: string[] = [];
  const now = new Date();
  
  switch (timeframe) {
    case '1H':
      numPoints = 60;
      break;
    case '1D':
      numPoints = 96;
      break;
    case '1W':
      numPoints = 84;
      break;
    case '1M':
      numPoints = 120;
      break;
    case '3M':
      numPoints = 90;
      break;
    case '1Y':
    default:
      numPoints = 100;
      break;
  }

  const volatility = 0.006;
  let currentPrice = basePrice;
  const emaPeriod = 12;
  const smaPeriod = 26;
  const prices: number[] = [];

  // Use a predictable pseudo-random seed
  let seed = 12345;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  let currentBenchmark = benchmark === 'S&P 500' ? 5100 : benchmark === 'NASDAQ' ? 16000 : benchmark === 'Bitcoin' ? 58000 : 2100; // Gold
  const bchVol = benchmark === 'Bitcoin' ? 0.03 : 0.008;

  for (let i = 0; i < numPoints; i++) {
    const trend = Math.sin(i / 10) * 0.001;
    const change = currentPrice * (pseudoRandom() - 0.48) * volatility + (currentPrice * trend);
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + pseudoRandom() * (currentPrice * volatility * 0.8);
    const low = Math.min(open, close) - pseudoRandom() * (currentPrice * volatility * 0.8);
    const volume = Math.floor(1000 + pseudoRandom() * 9000);
    
    prices.push(close);
    currentPrice = close;

    let ema = close;
    if (i > 0 && points[i - 1]) {
      const k = 2 / (emaPeriod + 1);
      ema = close * k + points[i - 1].ema * (1 - k);
    }

    let sma = close;
    if (i >= smaPeriod) {
      const sum = prices.slice(i - smaPeriod, i).reduce((a, b) => a + b, 0);
      sma = sum / smaPeriod;
    } else if (i > 0 && points[i - 1]) {
      sma = points[i - 1].sma * 0.98 + close * 0.02;
    } else {
      sma = close * 0.99;
    }

    const vwap = sma * (1 + (pseudoRandom() - 0.5) * 0.002);
    const bollingerUpper = ema * (1 + volatility * 1.5);
    const bollingerLower = ema * (1 - volatility * 1.5);
    const aiPrediction = close * (1 + (pseudoRandom() - 0.35) * volatility * 0.5);

    const bchChange = currentBenchmark * (pseudoRandom() - 0.49) * bchVol + (currentBenchmark * 0.0002);
    currentBenchmark += bchChange;

    const macd = (ema - sma) * 0.1;
    let macdSignal = macd * 0.8;
    if (i > 0 && points[i - 1] && points[i - 1].macdSignal !== undefined) {
      macdSignal = macd * 0.2 + points[i - 1].macdSignal * 0.8;
    }
    const macdHist = macd - macdSignal;
    const rsi = 45 + Math.sin(i * 0.3) * 15 + (pseudoRandom() - 0.5) * 10;

    points.push({
      time: '',
      open,
      high,
      low,
      close,
      volume,
      ema,
      sma,
      vwap,
      bollingerUpper,
      bollingerLower,
      aiPrediction,
      benchmark: currentBenchmark,
      macd,
      macdSignal,
      macdHist,
      rsi,
      isFuture: false,
    });
  }

  // Future points
  let lastClose = points[points.length - 1].close;
  let lastBenchmark = points[points.length - 1].benchmark;
  for (let j = 1; j <= 8; j++) {
    lastClose = lastClose * (1 + 0.0015 * j + (pseudoRandom() - 0.4) * volatility * 0.4);
    lastBenchmark = lastBenchmark * (1 + 0.0003 * j);
    points.push({
      time: '',
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
      ema: 0,
      sma: 0,
      vwap: 0,
      bollingerUpper: 0,
      bollingerLower: 0,
      aiPrediction: lastClose,
      benchmark: lastBenchmark,
      isFuture: true,
    });
  }

  return points;
}"""

content = re.sub(
    r'export function generateChartData\(timeframe: string, benchmark: string\): ChartDataPoint\[\] \{.*?\nexport interface SimulationResult \{',
    new_func + "\n\nexport interface SimulationResult {",
    content,
    flags=re.DOTALL
)

with open('src/utils/portfolioHelpers.ts', 'w') as f:
    f.write(content)
