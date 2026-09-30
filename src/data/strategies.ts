import { 
  Zap, Layers, Cpu, BarChart2, TrendingUp, Activity, 
  Target, Shield, Globe, Rocket, Compass, Anchor
} from 'lucide-react';

export interface Strategy {
  id: string;
  name: string;
  category: string;
  badge: string;
  tagline: string;
  description: string;
  howItWorks: string;
  idealMarketConditions: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  expectedBehavior: string;
  strengths: string[];
  weaknesses: string[];
  advantages: string[];
  disadvantages: string[];
  whenToUse: string;
  whenNotToUse: string;
  supportedAssets: string[];
  timeframes: string[];
  aiConfidence: string;
  recommendedAiConfig: {
    frequency: string;
    riskExposure: string;
    positionSizing: string;
    stopLoss: string;
    capitalAllocation: string;
  };
  apy: string;
  successRate: string;
  maxDrawdown: string;
  monthlyReturn: string;
  sharpeRatio: string;
  color: string;
  icon: any;
}

export const STRATEGY_CATEGORIES = [
  'All',
  'Trend Following',
  'Scalping',
  'Swing Trading',
  'Breakout',
  'Mean Reversion',
  'Grid',
  'Momentum',
  'Volatility'
];

export const STRATEGIES: Strategy[] = [
  {
    id: 'quantum-momentum',
    name: "Quantum Momentum AI",
    category: 'Momentum',
    badge: "HFT Quantitative",
    tagline: "Micro-Arbitrage & Trend Acceleration Engine",
    description: "Executes micro-arbitrage and high-frequency trend-following using neural sentiment analysis across Tier-1 CEX order books and DEX liquidity pools.",
    howItWorks: "The engine scans 20,000+ depth snapshot updates per second, identifying micro-trends before they manifest in price action. It uses neural sentiment analysis to gauge if a move is institutional or retail-driven.",
    idealMarketConditions: "High liquidity periods with clear directional bias or sharp volatility expansion.",
    riskLevel: 'Medium',
    expectedBehavior: "Rapid execution with high win rates but small individual gains. Expect frequent activity during London and New York sessions.",
    strengths: ["Ultra-fast execution", "Sentiment-aware entries", "Low latency advantage"],
    weaknesses: ["High trading fees", "Sensitive to network congestion", "Struggles in low-volume weekends"],
    advantages: ["Rapid profit capture", "Adaptive to news"],
    disadvantages: ["High cost", "Network dependency"],
    whenToUse: "High volatility periods",
    whenNotToUse: "Low volume weekends",
    supportedAssets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    timeframes: ['1m', '5m', '15m'],
    aiConfidence: '92%',
    recommendedAiConfig: {
      frequency: "High (~140 trades/day)",
      riskExposure: "Moderate (5/10)",
      positionSizing: "15% per trade allocation",
      stopLoss: "Dynamic trailing stop @ 1.5%",
      capitalAllocation: "80% active trading / 20% cash buffer"
    },
    apy: "+42.8%",
    successRate: "94.2%",
    maxDrawdown: "-3.8%",
    monthlyReturn: "+11.4%",
    sharpeRatio: "3.12",
    color: "emerald",
    icon: Zap
  },
  {
    id: 'arbitrage-alpha',
    name: "Arbitrage Alpha v4",
    category: 'Mean Reversion',
    badge: "Delta Neutral",
    tagline: "Cross-Venue Delta-Neutral Spread Harvester",
    description: "Captures instant price discrepancies between global exchanges while maintaining dynamic delta-neutral derivative hedges to neutralize market directional risk.",
    howItWorks: "Simultaneously monitors price gaps across 15+ exchanges. When a spread exceeds 0.15%, it executes buy/sell pairs while opening offsetting derivative positions to hedge against price swings.",
    idealMarketConditions: "Persistent price spreads across decentralized and centralized venues.",
    riskLevel: 'Low',
    expectedBehavior: "Steady, incremental growth with minimal drawdowns. Returns are relatively independent of market direction.",
    strengths: ["Zero directional risk", "Consistent performance", "Low maximum drawdown"],
    weaknesses: ["Lower ceiling during bull markets", "Margin efficiency requirements", "Exchange withdrawal dependencies"],
    advantages: ["Market-neutral", "Low drawdown"],
    disadvantages: ["High margin requirements", "Execution speed dependent"],
    whenToUse: "High price discrepancy environments",
    whenNotToUse: "When spreads are too tight to cover fees",
    supportedAssets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    timeframes: ['1m', '5m'],
    aiConfidence: '98%',
    recommendedAiConfig: {
      frequency: "Very High (~320 trades/day)",
      riskExposure: "Low (2/10)",
      positionSizing: "10% per spread execution",
      stopLoss: "Instant convergence stop",
      capitalAllocation: "90% active / 10% reserve"
    },
    apy: "+35.2%",
    successRate: "98.7%",
    maxDrawdown: "-1.1%",
    monthlyReturn: "+8.9%",
    sharpeRatio: "4.28",
    color: "cyan",
    icon: Layers
  },
  {
    id: 'grid-master-pro',
    name: "Grid Master Pro",
    category: 'Grid',
    badge: "Range Specialist",
    tagline: "High-Frequency Sideways Yield Generator",
    description: "Deploys a sophisticated grid of buy and sell orders within a defined price range to capture profits from natural market oscillations.",
    howItWorks: "Establishes a geometric or arithmetic grid. It systematically buys low and sells high as the price bounces within the range, automatically adjusting grid density based on ATR volatility.",
    idealMarketConditions: "Sideways ranging markets with consistent volatility and no clear breakout.",
    riskLevel: 'Medium',
    expectedBehavior: "Excellent performance in boring, flat markets. Potential for 'holding' if price breaks out of the bottom of the grid without stop-loss.",
    strengths: ["Passive income in flat markets", "Emotional-free execution", "Compounding gains"],
    weaknesses: ["Trending market underperformance", "Potential for unrealized losses if range breaks", "High capital commitment"],
    advantages: ["Steady yield", "Automated"],
    disadvantages: ["Capital lockup", "Vulnerable to breaks"],
    whenToUse: "Ranging markets",
    whenNotToUse: "Strongly trending markets",
    supportedAssets: ['BTC/USDT', 'ETH/USDT'],
    timeframes: ['15m', '1h'],
    aiConfidence: '88%',
    recommendedAiConfig: {
      frequency: "High (~80 trades/day)",
      riskExposure: "Moderate (6/10)",
      positionSizing: "Divided across 50+ grid levels",
      stopLoss: "Range exit stop-loss @ -5%",
      capitalAllocation: "100% active grid"
    },
    apy: "+28.5%",
    successRate: "92.1%",
    maxDrawdown: "-7.5%",
    monthlyReturn: "+7.2%",
    sharpeRatio: "2.15",
    color: "blue",
    icon: Activity
  },
  {
    id: 'breakout-hunter',
    name: "Breakout Hunter AI",
    category: 'Breakout',
    badge: "Momentum Burst",
    tagline: "Volatility Expansion Capture System",
    description: "Identifies key psychological and technical levels where price compression indicates an impending explosive move.",
    howItWorks: "Uses Bollinger Band squeeze detection and volume profile analysis. It enters positions when price breaches multi-day ranges with confirmed institutional volume support.",
    idealMarketConditions: "After long periods of low-volatility consolidation.",
    riskLevel: 'High',
    expectedBehavior: "Fewer trades but with significantly higher profit-per-trade. High probability of being stopped out on 'fakeouts' before the real move.",
    strengths: ["High reward-to-risk ratio", "Captures major market turns", "Efficient use of capital"],
    weaknesses: ["Lower win rate", "Frustrating in choppy markets", "Requires precise entry timing"],
    advantages: ["High upside", "Trend capture"],
    disadvantages: ["Low win rate", "Fakeout vulnerability"],
    whenToUse: "Following low-volatility consolidation",
    whenNotToUse: "During highly choppy/sideways markets",
    supportedAssets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    timeframes: ['4h', '1d'],
    aiConfidence: '75%',
    recommendedAiConfig: {
      frequency: "Low (~5 trades/week)",
      riskExposure: "High (8/10)",
      positionSizing: "20% per breakout setup",
      stopLoss: "Tight range-re-entry stop",
      capitalAllocation: "60% active / 40% waiting"
    },
    apy: "+64.2%",
    successRate: "48.5%",
    maxDrawdown: "-12.4%",
    monthlyReturn: "+18.2%",
    sharpeRatio: "1.85",
    color: "orange",
    icon: Rocket
  },
  {
    id: 'trend-navigator',
    name: "Trend Navigator v2",
    category: 'Trend Following',
    badge: "Long Term Growth",
    tagline: "Adaptive Multi-Timeframe Trend Following",
    description: "Follows strong market trends using an ensemble of moving averages, Ichimoku clouds, and parabolic SAR indicators.",
    howItWorks: "Filters market noise by requiring confirmation across 4h, 1d, and 1w timeframes. It stays in winning positions as long as the macro-trend remains intact.",
    idealMarketConditions: "Strong bull or bear markets with sustained direction.",
    riskLevel: 'Medium',
    expectedBehavior: "Slow and steady. It won't catch the exact bottom or top, but it will capture the meat of the move.",
    strengths: ["Robust performance", "Low stress execution", "Proven historical edge"],
    weaknesses: ["Gives back profit in reversals", "Loses money in flat markets", "Slow response to flash crashes"],
    advantages: ["High ROI", "Proven edge"],
    disadvantages: ["Slow to react", "Profit give-back"],
    whenToUse: "Strong bull/bear markets",
    whenNotToUse: "Range-bound markets",
    supportedAssets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    timeframes: ['4h', '1d', '1w'],
    aiConfidence: '85%',
    recommendedAiConfig: {
      frequency: "Very Low (~2 trades/month)",
      riskExposure: "Moderate (4/10)",
      positionSizing: "25% core position",
      stopLoss: "Trailing ATR-based stop",
      capitalAllocation: "90% active / 10% reserve"
    },
    apy: "+38.4%",
    successRate: "62.0%",
    maxDrawdown: "-8.2%",
    monthlyReturn: "+9.1%",
    sharpeRatio: "2.45",
    color: "indigo",
    icon: TrendingUp
  },
  {
    id: 'sentinel-scalper',
    name: "Sentinel Scalper AI",
    category: 'Scalping',
    badge: "Sub-Second HFT",
    tagline: "High-Frequency Liquidity Absorber & Rebate Harvester",
    description: "Captures tiny order book imbalances and price inefficiencies at sub-second intervals across major spot and futures markets.",
    howItWorks: "Operates in the millisecond domain, analyzing liquidity depth imbalances and micro-spreads. It continuously places buy and sell limit orders to harvest exchange maker rebates and capture spread variance.",
    idealMarketConditions: "Sideways markets with high, constant trade frequency and narrow bid-ask spreads.",
    riskLevel: 'Low',
    expectedBehavior: "Very high volume of rapid, small-scale trades. Extremely low average holding time (less than 20 seconds).",
    strengths: ["Extremely fast processing", "High rebate capture", "Low directional exposure"],
    weaknesses: ["Dependent on low execution latency", "Can incur platform API limits", "Vulnerable to rapid trend transitions"],
    advantages: ["High win rate", "Almost market neutral"],
    disadvantages: ["Requires high tier fee schedule", "API dependency"],
    whenToUse: "High liquidity, flat markets",
    whenNotToUse: "Major news events or high-slippage markets",
    supportedAssets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'],
    timeframes: ['Sub-1s', '1m'],
    aiConfidence: '96%',
    recommendedAiConfig: {
      frequency: "Ultra-High (~850 trades/day)",
      riskExposure: "Low (1/10)",
      positionSizing: "5% per scalping level",
      stopLoss: "Instant algorithmic stop-out",
      capitalAllocation: "95% active / 5% fallback"
    },
    apy: "+51.3%",
    successRate: "95.6%",
    maxDrawdown: "-2.3%",
    monthlyReturn: "+13.2%",
    sharpeRatio: "3.82",
    color: "teal",
    icon: Cpu
  },
  {
    id: 'swing-matrix',
    name: "Swing Matrix v8",
    category: 'Swing Trading',
    badge: "Macro Swing",
    tagline: "Multi-Asset Liquidity Cycle Arbitrage",
    description: "Positions inside medium-term accumulation and distribution cycles by identifying key structural pivot points and institutional block orders.",
    howItWorks: "Monitors global order flow and volume block distributions. Employs Fibonacci extensions and multi-day trend exhaustion matrices to buy at local capitulations and sell at local distribution peaks.",
    idealMarketConditions: "Sustained macro price channels and well-defined swing periods.",
    riskLevel: 'Medium',
    expectedBehavior: "Patience-driven. Holds positions for days to capture 5%–15% swings while ignoring short-term intraday volatility.",
    strengths: ["High return per trade", "Low fee overhead", "Resilient to market manipulation"],
    weaknesses: ["Requires patience", "Vulnerable to extreme black-swan events", "Slightly larger drawdowns"],
    advantages: ["Massive single gains", "Optimized compound returns"],
    disadvantages: ["Longer holding times", "Drawdown variance"],
    whenToUse: "Strong macro channels",
    whenNotToUse: "Hyper-volatile ranging spikes",
    supportedAssets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    timeframes: ['1h', '4h', '1d'],
    aiConfidence: '84%',
    recommendedAiConfig: {
      frequency: "Medium (~8 trades/week)",
      riskExposure: "Moderate (4/10)",
      positionSizing: "15% per macro swing setup",
      stopLoss: "Pivot reversal invalidation @ 3.5%",
      capitalAllocation: "70% active positions / 30% standby"
    },
    apy: "+58.9%",
    successRate: "71.2%",
    maxDrawdown: "-6.4%",
    monthlyReturn: "+15.7%",
    sharpeRatio: "2.68",
    color: "purple",
    icon: Compass
  },
  {
    id: 'volatility-harvester',
    name: "Apex Volatility Harvester",
    category: 'Volatility',
    badge: "Option Yielding",
    tagline: "Volatility Arbitrage & Range-Hedging Engine",
    description: "Monitors volatility indexes and implements statistical arbitrage during extreme market fear or euphoria to capture mean-reverting ranges.",
    howItWorks: "Detects standard deviation spikes in asset volatility. Executes short or long straddles/strangles using options proxy algorithmic positions to capture volatility decay and premium contraction.",
    idealMarketConditions: "Following heavy capitulation panic or over-leveraged long squeeze expansions.",
    riskLevel: 'High',
    expectedBehavior: "Steady performance with explosive yield expansions during massive market spikes or quick calm-down phases.",
    strengths: ["Exceptional returns in panic selloffs", "Adapts to flash crashes", "Sophisticated volatility pricing edge"],
    weaknesses: ["Vulnerable to continuous volatility trends", "Complex margining models", "High risk during prolonged black-swan expansions"],
    advantages: ["Anti-fragile performance", "High yield expansions"],
    disadvantages: ["High capital exposure", "Leverage risk"],
    whenToUse: "Post-capitulation market exhaustion",
    whenNotToUse: "Beginning of secular market paradigm shifts",
    supportedAssets: ['BTC/USDT', 'ETH/USDT'],
    timeframes: ['15m', '1h', '4h'],
    aiConfidence: '89%',
    recommendedAiConfig: {
      frequency: "Low (~15 trades/week)",
      riskExposure: "High (7/10)",
      positionSizing: "12% per volatility arbitrage grid",
      stopLoss: "Implied volatility trend expansion cap @ 4.8%",
      capitalAllocation: "50% volatility portfolio / 50% cash hedging"
    },
    apy: "+72.4%",
    successRate: "82.5%",
    maxDrawdown: "-9.1%",
    monthlyReturn: "+21.8%",
    sharpeRatio: "2.89",
    color: "fuchsia",
    icon: Shield
  }
];
