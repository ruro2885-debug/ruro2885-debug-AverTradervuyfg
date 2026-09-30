export interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema: number;
  sma: number;
  vwap: number;
  bollingerUpper: number;
  bollingerLower: number;
  aiPrediction: number;
  benchmark: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  rsi?: number;
  marker?: { type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal' | 'corp'; label: string } | null;
  isFuture?: boolean;
}

// Generate TradingView styled candlestick data
export function generateChartData(timeframe: string, benchmark: string): ChartDataPoint[] {
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
    if (i > 0 && points[i - 1] && points[i - 1]?.macdSignal !== undefined) {
      macdSignal = macd * 0.2 + (points[i - 1]?.macdSignal ?? 0) * 0.8;
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
}

export interface SimulationResult {
  projectedValue: number;
  totalContributions: number;
  totalProfit: number;
  inflationAdjustedValue: number;
  yearlyData: { year: number; total: number; contributions: number; profit: number }[];
}

// AVER compound growth simulator algorithm
export function runCompoundSimulator(
  initial: number,
  monthly: number,
  annualReturnPct: number,
  years: number,
  riskProfile: string,
  drip: boolean
): SimulationResult {
  // Adjust rate based on risk profile multiplier
  let rateMultiplier = 1.0;
  if (riskProfile === 'Quantum') rateMultiplier = 1.35;
  else if (riskProfile === 'High') rateMultiplier = 1.15;
  else if (riskProfile === 'Low') rateMultiplier = 0.85;

  const adjustedAnnualRate = (annualReturnPct / 100) * rateMultiplier + (drip ? 0.015 : 0); // DRIP adds simulated 1.5% dividend yield
  const monthlyRate = adjustedAnnualRate / 12;
  const months = years * 12;

  let total = initial;
  let totalContributions = initial;
  const yearlyData: SimulationResult['yearlyData'] = [
    { year: 0, total: initial, contributions: initial, profit: 0 }
  ];

  for (let m = 1; m <= months; m++) {
    total = total * (1 + monthlyRate) + monthly;
    totalContributions += monthly;

    if (m % 12 === 0) {
      const year = m / 12;
      const profit = Math.max(0, total - totalContributions);
      yearlyData.push({
        year,
        total: Math.round(total),
        contributions: Math.round(totalContributions),
        profit: Math.round(profit)
      });
    }
  }

  // Inflation discount at 2.5% constant rate
  const inflationAdjustedValue = total / Math.pow(1 + 0.025, years);

  return {
    projectedValue: Math.round(total),
    totalContributions: Math.round(totalContributions),
    totalProfit: Math.round(Math.max(0, total - totalContributions)),
    inflationAdjustedValue: Math.round(inflationAdjustedValue),
    yearlyData
  };
}

export interface WatchlistItem {
  ticker: string;
  name: string;
  price: number;
  change: number;
  allocation: number;
  aiRating: number;
  aiDecision: 'BUY' | 'SELL' | 'HODL' | 'ACCUMULATE';
  news: string;
  newsSentiment: 'Bullish' | 'Neutral' | 'Bearish';
  logoColor: string;
  logoText: string;
  quantity: number;
  avgEntry: number;
  aiDetails: string;
}

// Premium Volatility Watchlist initial dataset
export const initialWatchlistData: WatchlistItem[] = [
  {
    ticker: 'BTC',
    name: 'Bitcoin',
    price: 64230.00,
    change: 2.45,
    allocation: 49.3,
    aiRating: 94,
    aiDecision: 'HODL',
    news: 'Bitcoin spot ETFs draw record $520M institutional inflows inside 24 hours.',
    newsSentiment: 'Bullish',
    logoColor: 'from-amber-500 to-orange-600',
    logoText: '₿',
    quantity: 0.85,
    avgEntry: 52000,
    aiDetails: 'Sovereign-grade asset accumulation phase complete. Support established at $58,000. AI models forecast breakout toward $68,500.'
  },
  {
    ticker: 'ETH',
    name: 'Ethereum',
    price: 3450.20,
    change: 1.82,
    allocation: 37.2,
    aiRating: 88,
    aiDecision: 'ACCUMULATE',
    news: 'ConsenSys reports 18% increase in validator rewards as Dencun upgrade lowers operational fees.',
    newsSentiment: 'Bullish',
    logoColor: 'from-blue-500 to-indigo-600',
    logoText: 'Ξ',
    quantity: 12.0,
    avgEntry: 2800,
    aiDetails: 'Vast utility moat. Staking yield optimized. Institutional accumulation persistent. AI projects price expansion due to supply squeeze.'
  },
  {
    ticker: 'SOL',
    name: 'Solana',
    price: 145.60,
    change: -0.52,
    allocation: 13.5,
    aiRating: 82,
    aiDecision: 'BUY',
    news: 'DeFi velocity on Solana surpasses Ethereum mainnet for three consecutive trading sessions.',
    newsSentiment: 'Bullish',
    logoColor: 'from-purple-500 to-teal-500',
    logoText: 'S',
    quantity: 120.0,
    avgEntry: 110,
    aiDetails: 'Ultra-fast transaction throughput. Short-term retracement provides optimal buy-the-dip entry before next network load-test.'
  }
];
