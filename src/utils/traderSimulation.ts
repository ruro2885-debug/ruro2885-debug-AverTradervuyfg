import { TradingSchedule, RiskControls, RecommendationRules } from '../types/aiTrading';
import { safeStorage } from './storage';
import { getAvatarDataUrl, isFemaleName } from './avatarGenerator';

export interface SimulatedTrade {
  id: string;
  asset: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  pnlPercent?: number; // percentage pnl, e.g. 2.45 for +2.45%
  status: 'OPEN' | 'CLOSED';
  timestamp: string; // ISO string
  leverage?: number;
  marginUsd?: number;
  sizeUnits?: number;
  pnlUsd?: number;
}

export interface SimulatedTrader {
  id: string;
  username: string;
  fullName: string;
  tier: 'Platinum' | 'Gold';
  verified: boolean;
  return30D: number;
  winRate: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  style: 'SCALPING' | 'DAY_TRADING' | 'SWING_TRADING';
  preferredMarkets: string[];
  followers: number;
  status: 'Trading' | 'Analyzing' | 'Online' | 'Offline';
  bio: string;
  avatarSeed: string;
  avatarUrl?: string;
  avatarConfig?: {
    avatarId: string;
    skinTone: string;
    hairStyle: number;
    hairColor: string;
    faceShape: string;
    facialHair: number;
    eyewear: number;
    clothing: string;
    background: string;
    isFemaleFace: boolean;
  };
  strategyName: string;
  pnlHistory30D: number[]; // 10 points for sparkline
  avgTradeDuration: string;
  wins: number;
  losses: number;
  schedule: TradingSchedule;
  riskControls: RiskControls;
  recommendationRules: RecommendationRules;
  advancedBehavior: {
    enableDeepAnalysis: boolean;
    useSentimentGrounding: boolean;
    neuralConfidenceThreshold: number;
  };
  strategyExplanation: string;
  recentTrades: SimulatedTrade[];
  
  // Historical offsets to simulate deep history without keeping millions of trades in memory
  historicalTradesBase?: number;
  historicalWinsBase?: number;
  historicalLossesBase?: number;
  historicalPnlBase?: number;
  historicalYearsTrading?: number;
  activeCopiers?: number;
  currentWinningStreak?: number;
  allocatedAmount: number;
  
  // Extended live-calculation fields
  trades: SimulatedTrade[];
  performanceScore: number;
  rank: number;
  prevRank: number;
  prev30DReturn: number;
  lastFollowerUpdate: string; // ISO string
  return7D: number;
  return90D: number;
  return1Y: number;
  returnAllTime: number;
  currentDrawdown: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  profitFactor: number;
  riskManagementScore: number;
  consistencyScore: number;
  positionAccuracy: number;
  tradeFrequency: number; // trades per week
  aiEfficiency: number;
  volatilityHandling: number;
  recentActivityScore: number;
}

export interface SimulationEvent {
  id: string;
  text: string;
  timestamp: string;
  traderId: string;
  type: 'rank_up' | 'rank_down' | 'milestone' | 'win_streak' | 'drawdown' | 'entry';
}

// Assets list for simulation
const ASSETS_BY_MARKET: Record<string, number> = {
  'BTC': 64000,
  'ETH': 3400,
  'SOL': 140,
  'AVR': 1.25,
  'FET': 2.10,
  'XRP': 0.60,
  'ADA': 0.45,
  'LINK': 15,
  'DOT': 6.2,
  'NEAR': 5.5,
  'RNDR': 7.8,
  'INJ': 24
};

// Seed-based random number generator for initial historical trade seed
function seededRandom(seedStr: string) {
  let h = 15485863;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// 20 unique traders definition
export function generateProceduralTradersSpecs(): Partial<SimulatedTrader>[] {
  const MALE_NAMES = [
    'Mason', 'Ethan', 'Liam', 'Noah', 'Jack', 'Lucas', 'Oliver', 'Benjamin', 'Ryan', 'Daniel', 
    'Nathan', 'Owen', 'Caleb', 'Dylan', 'Alex'
  ];
  const FEMALE_NAMES = [
    'Emma', 'Olivia', 'Sophia', 'Ava', 'Chloe', 'Grace', 'Lily', 'Mia', 'Isabella', 'Zoe', 
    'Charlotte', 'Amelia', 'Hannah', 'Emily', 'Natalie'
  ];
  const SURNAMES = [
    'Walker', 'Brooks', 'Carter', 'Bennett', 'Sullivan', 'Hayes', 'Grant', 'Cole', 'Foster', 
    'Murphy', 'Reed', 'Parker', 'Turner', 'Cooper', 'Morgan', 'Mitchell', 'Harper', 'Scott', 
    'Ross', 'Jones', 'Smith', 'Williams', 'Brown', 'Taylor', 'Wilson', 'Clark', 'Miles', 'Hill', 'Lee'
  ];

  const TRADING_WORDS = [
    'FXNomad', 'MacroEdge', 'SwingTheory', 'DeltaFlow', 'AlphaTape', 'PipsDaily', 'ChartPilot'
  ];

  const specs: Partial<SimulatedTrader>[] = [];
  const usedUsernames = new Set<string>();
  const usedAllocations = new Set<number>();

  // Determine seed-based choices for repeatability
  const rand = seededRandom("copytrade_procedural_seed_41");

  for (let i = 0; i < 20; i++) {
    const isMale = rand() > 0.5;
    const firstName = isMale 
      ? MALE_NAMES[Math.floor(rand() * MALE_NAMES.length)] 
      : FEMALE_NAMES[Math.floor(rand() * FEMALE_NAMES.length)];
    const lastName = SURNAMES[Math.floor(rand() * SURNAMES.length)];
    const fullName = `${firstName} ${lastName}`;

    let baseUsername = '';
    const nameFormat = rand();
    if (nameFormat < 0.1) {
      baseUsername = TRADING_WORDS[Math.floor(rand() * TRADING_WORDS.length)];
    } else if (nameFormat < 0.3) {
      baseUsername = `${firstName}${lastName.charAt(0)}`.toLowerCase();
    } else if (nameFormat < 0.5) {
      baseUsername = `${firstName.toLowerCase()}_${Math.floor(rand() * 99)}`;
    } else if (nameFormat < 0.7) {
      baseUsername = `${firstName.charAt(0)}${lastName}`;
    } else if (nameFormat < 0.9) {
      baseUsername = `${firstName}${lastName}`;
    } else {
      const nicknames = ['chill', 'dexter', 'queen', 'king', 'ray', 'big', 'amy', 'fx', 'guru', 'tommy'];
      baseUsername = `${nicknames[Math.floor(rand() * nicknames.length)]}${Math.floor(rand() * 999)}`;
    }

    // Uniqueness healing
    let username = baseUsername;
    let counter = 1;
    while (usedUsernames.has(username.toLowerCase())) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    usedUsernames.add(username.toLowerCase());

    // Style and Risk distribution
    const styles: ('SCALPING' | 'DAY_TRADING' | 'SWING_TRADING')[] = ['SCALPING', 'DAY_TRADING', 'SWING_TRADING'];
    const style = styles[i % styles.length];

    const risks: ('LOW' | 'MEDIUM' | 'HIGH')[] = ['LOW', 'MEDIUM', 'HIGH'];
    // Weighted risk distribution (25% LOW, 50% MEDIUM, 25% HIGH)
    const risk = i % 4 === 0 ? 'LOW' : i % 4 === 3 ? 'HIGH' : 'MEDIUM';

    // Tier distribution
    // Let's have Platinum and Gold tiers
    const tier = i < 20 ? 'Platinum' : 'Gold';

    // Verified boolean (rare, ~15%)
    const verified = (i % 7 === 0);

    // Preferred Markets selection - ensure every single trader has a unique, distinct asset combination
    const allMarketsList = ['BTC', 'ETH', 'SOL', 'AVR', 'FET', 'XRP', 'ADA', 'LINK', 'DOT', 'NEAR', 'RNDR', 'INJ'];
    const marketCount = 2 + (i % 4); // 2, 3, 4, or 5 markets
    const marketOffset = (i * 3) % allMarketsList.length;
    let preferredMarkets: string[] = [];
    for (let m = 0; m < marketCount; m++) {
      const idx = (marketOffset + m * 2 + (i % 5)) % allMarketsList.length;
      if (!preferredMarkets.includes(allMarketsList[idx])) {
        preferredMarkets.push(allMarketsList[idx]);
      }
    }
    if (preferredMarkets.length === 0) preferredMarkets = ['BTC', 'ETH'];

    // Bios templates based on style and risk
    const biosMap: Record<string, string[]> = {
      'SCALPING_LOW': [
        'Low exposure algorithmic scalper focusing on micro order book imbalances in BTC and ETH with tight 0.5% stop-losses.',
        'Conservative scalp grid model extracting low-volatility spreads during Asian sessions.',
        'Mathematical trend reversion scalper focusing on bluechip volumes. High position accuracy with zero leverage.'
      ],
      'SCALPING_MEDIUM': [
        'High frequency scalp grid farming volatile sideways regimes. Rebalances orders dynamically on every block.',
        'Order flow delta imbalance scalper tracking Decentralized exchange volume waves.',
        'Intraday regression corridor scalper capturing short-lived altcoin breakouts.'
      ],
      'SCALPING_HIGH': [
        'Ultra-aggressive momentum scalp engine trading liquidation traps and derivative leverage sweeps.',
        'High-frequency sub-minute momentum scalp setups with high leverage protection limits.',
        'Hyper-volatile momentum scalp setups chasing high-beta trending assets. High risk, high beta.'
      ],
      'DAY_TRADING_LOW': [
        'Intraday day trader capturing classic double bottoms and EMA crossover retests with strict drawdown limits.',
        'Bluechip Day Trader utilizing slow MACD and Fib levels for highly guarded daily reversals.',
        'Institutional-grade intraday pattern follower executing double confirmations on large-cap volume bursts.'
      ],
      'DAY_TRADING_MEDIUM': [
        'Systematic intraday trend hunter targeting H1 breakout points with automated volume confirmation.',
        'Quantitative day trading corridor capturing standard deviation VWAP spikes.',
        'Adaptive day trader scaling in on major hourly support zones and taking rapid profits on momentum turns.'
      ],
      'DAY_TRADING_HIGH': [
        'High volatility intraday breakout system riding massive derivative volumes and momentum sweeps.',
        'Aggressive news-flow day trader capitalizing on rapid sentiment shifts and macro announcements.',
        'Intraday breakout accelerator buying standard deviation expansions with heavy momentum focus.'
      ],
      'SWING_TRADING_LOW': [
        'Institutional macro swing index tracker utilizing daily exponential ribbons and long-range support blocks.',
        'Conservative swing trader with a multi-week position holding style. Low exposure capital preservation focus.',
        'A long-term trend follow strategy aiming for steady compound growth via bluechip spot accumulation.'
      ],
      'SWING_TRADING_MEDIUM': [
        'Multi-indicator swing trader riding mid-term altcoin narrative waves. Rebalances every 48 hours.',
        'Classical Fibonacci swing model targeting structural order block retests and golden pocket entries.',
        'Swing trend breakout system trading dynamic liquidity pools and daily volume shifts.'
      ],
      'SWING_TRADING_HIGH': [
        'Aggressive swing breakout model buying momentum surges and high-beta narrative runners. Maximizes return curves.',
        'High risk swing system targeting dynamic liquidity sweep areas and volatility contraction breakouts.',
        'Extreme trend swing system following high-volatility momentum tokens. Volatility is our leverage.'
      ]
    };

    const bioKey = `${style}_${risk}`;
    const bioTemplates = biosMap[bioKey] || biosMap['DAY_TRADING_MEDIUM'];
    const bio = bioTemplates[i % bioTemplates.length];

    // Unique Strategy Name Generation
    const STRATEGY_PREFIXES = ['Quantum', 'Alpha', 'Neural', 'Vortex', 'Chronos', 'Vector', 'Matrix', 'Apex', 'Titan', 'Stellar', 'Eclipse', 'Oracle', 'Shadow', 'Prism', 'Aether', 'Omni', 'Sovereign', 'Synergy', 'Genesis', 'Spectre'];
    const STRATEGY_NOUNS_SCALPING = ['Scalp', 'Grid', 'Delta Flow', 'Squeeze', 'Velocity', 'Micro Sizing'];
    const STRATEGY_NOUNS_DAY_TRADING = ['Momentum', 'Reversal', 'Corridor', 'VWAP Matrix', 'Fusion', 'Catalyst'];
    const STRATEGY_NOUNS_SWING_TRADING = ['Swing', 'Macro Trend', 'Breakout', 'Infinity', 'Optima Block', 'Liquidity Sweep'];
    const STRATEGY_SUFFIXES = ['v4', 'Pro', 'AI Core', 'V2', 'Edge', 'System', 'Engine', 'Alpha', 'Gold', 'Elite', 'Plus'];

    const prefix = STRATEGY_PREFIXES[(i * 3 + (i % 7)) % STRATEGY_PREFIXES.length];
    const nounList = style === 'SCALPING' ? STRATEGY_NOUNS_SCALPING : style === 'SWING_TRADING' ? STRATEGY_NOUNS_SWING_TRADING : STRATEGY_NOUNS_DAY_TRADING;
    const noun = nounList[(i * 5 + 1) % nounList.length];
    const suffix = STRATEGY_SUFFIXES[(i * 7 + 2) % STRATEGY_SUFFIXES.length];
    const strategyName = `${prefix} ${noun} ${suffix}`;

    // Average trade duration
    const avgDuration = style === 'SCALPING' ? `${3 + (i % 12)} minutes` : style === 'DAY_TRADING' ? `${1 + (i % 5)} hours` : `${2 + (i % 7)} days`;

    // Strict realistic stats generation based on ranking (i is index, 0 is #1)
    let followers, historicalTradesBase, historicalWinsBase, historicalLossesBase;
    let historicalPnlBase, historicalYearsTrading, activeCopiers, currentWinningStreak;
    
    if (i < 10) {
      // Top 10 Elite Traders
      const topScale = 1 - (i / 10); // 1.0 for i=0 down to 0.1 for i=9
      
      followers = 15000 + Math.floor(rand() * 50000) + Math.floor(topScale * 585000); // 15,000 - 650,000+
      activeCopiers = 2000 + Math.floor(rand() * 10000) + Math.floor(topScale * 108000); // 2,000 - 120,000+
      historicalYearsTrading = 3 + Math.floor(rand() * 4) + Math.floor(topScale * 8); // 3 - 15 years
      historicalTradesBase = 900 + Math.floor(rand() * 2000) + Math.floor(topScale * 15100); // 900 - 18,000+
      
      const winRate = 0.68 + (rand() * 0.10) + (topScale * 0.18); // 68% - 96%
      historicalWinsBase = Math.floor(historicalTradesBase * winRate);
      historicalLossesBase = historicalTradesBase - historicalWinsBase;
      
      historicalPnlBase = 120 + Math.floor(rand() * 200) + Math.floor(topScale * 530); // 120% - 850%
      currentWinningStreak = 5 + Math.floor(rand() * 10) + Math.floor(topScale * 25); // 5 - 40 trades
    } else {
      // Other traders (still good but lower than top 10)
      const baseFollowers = tier === 'Platinum' ? 10000 : tier === 'Gold' ? 4000 : 800;
      followers = baseFollowers + (i * 123) % 8000;
      activeCopiers = Math.floor(followers * (0.1 + rand() * 0.2));
      historicalYearsTrading = 1 + Math.floor(rand() * 4);
      historicalTradesBase = 150 + Math.floor(rand() * 600);
      
      const winRate = 0.55 + (rand() * 0.25);
      historicalWinsBase = Math.floor(historicalTradesBase * winRate);
      historicalLossesBase = historicalTradesBase - historicalWinsBase;
      
      historicalPnlBase = 20 + Math.floor(rand() * 100);
      currentWinningStreak = Math.floor(rand() * 6);
    }

    // Assets under copy (AUM) - Scale significantly for Top Traders
    const baseAUM = tier === 'Platinum' ? 12000000 : tier === 'Gold' ? 2500000 : 150000;
    const aum = baseAUM + (i * 54321) % 5000000;

    // Status: Most traders start Offline; only 2-3 active at any time
    const initialActiveState: 'Trading' | 'Analyzing' | 'Online' | 'Offline' = 
      i === 0 ? 'Trading' : i === 3 ? 'Analyzing' : i === 7 ? 'Online' : 'Offline';
    const status = initialActiveState;

    // Advanced behavior
    const enableDeepAnalysis = i % 2 === 0 || tier === 'Platinum';
    const useSentimentGrounding = i % 3 !== 0 || tier === 'Platinum';
    const neuralConfidenceThreshold = 70 + (i % 25);

    // Explanations
    const explanationTemplates = {
      'SCALPING': `Executes sub-minute micro trades targeting dynamic order book inefficiencies and bid-ask spread expansion. Utilizes a multi-threaded execution queue to minimize slippage on altcoin pairs.`,
      'DAY_TRADING': `Scans intra-day market blocks and H1 trend pivots. Enters trades on clear momentum breakout spikes or standard deviation regression channel bounces, taking swift profits inside 24 hours.`,
      'SWING_TRADING': `Monitors multi-day macro structures and weekly support blocks. Accumulates spots and low-leverage futures positions in strong trend corridors, letting profits run over major structural expansions.`
    };

    // Unique Avatar Seed & Configuration for every trader (0 to 23 hairstyles distributed cleanly)
    const uniqueSeed = `trader_seed_${username}_${i}_${(i + 1) * 31}`;
    const hairStyle = (i * 7 + (i % 3)) % 24;
    const isFemaleFace = isFemaleName(username) || i % 3 === 0;
    const skinTonePalette = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#5A3311', '#3D0C02', '#D2A679', '#E5C298'];
    const hairColorPalette = ['#111827', '#262626', '#3B2F2F', '#5C4033', '#8B3A2B', '#E6C875', '#CBD5E1', '#4A3728', '#78350F'];
    
    const skinTone = skinTonePalette[(i * 3 + 1) % skinTonePalette.length];
    const hairColor = hairColorPalette[(i * 5 + 2) % hairColorPalette.length];
    
    const avatarConfig = {
      avatarId: `avatar_${username.toLowerCase()}_${i}`,
      skinTone,
      hairStyle,
      hairColor,
      faceShape: isFemaleFace ? 'round' : 'angular',
      facialHair: !isFemaleFace && i % 4 === 0 ? (i % 4) : -1,
      eyewear: i % 4 === 1 ? (i % 4) : -1,
      clothing: 'standard',
      background: 'default',
      isFemaleFace
    };

    const avatarUrl = getAvatarDataUrl(uniqueSeed, undefined, avatarConfig);

    // Unique Schedules
    const SESSIONS_LIST = [
      [{ start: '00:00', end: '08:00' }],
      [{ start: '08:00', end: '16:00' }],
      [{ start: '13:00', end: '21:00' }],
      [{ start: '02:00', end: '10:00' }],
      [{ start: '00:00', end: '24:00' }],
      [{ start: '07:00', end: '15:00' }],
      [{ start: '10:00', end: '18:00' }],
      [{ start: '04:00', end: '12:00' }, { start: '16:00', end: '20:00' }]
    ];
    const TIMEZONES = ['UTC', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC+8', 'UTC+9', 'UTC-5', 'UTC-8'];

    // Unique Technical Indicators
    const ALL_INDICATORS = [
      'RSI', 'MACD', 'EMA_CROSS', 'VWAP', 'ORDER_FLOW_IMBALANCE', 
      'BOLLINGER_BANDS', 'STOCHASTIC', 'FIBONACCI', 'VOLUME_PROFILE', 
      'ON_CHAIN_DELTA', 'LIQUIDITY_MAP', 'ICHIMOKU_CLOUD'
    ];
    const indOffset = (i * 4) % ALL_INDICATORS.length;
    const indCount = 2 + (i % 3);
    const traderIndicators: string[] = [];
    for (let ind = 0; ind < indCount; ind++) {
      const indIndex = (indOffset + ind * 3 + (i % 2)) % ALL_INDICATORS.length;
      if (!traderIndicators.includes(ALL_INDICATORS[indIndex])) {
        traderIndicators.push(ALL_INDICATORS[indIndex]);
      }
    }

    // Unique Risk Settings per trader
    const maxPositionSize = parseFloat((3.0 + ((i * 1.8) % 22)).toFixed(1));
    const maxSimultaneousPositions = 2 + ((i * 3 + 1) % 8);
    const exposureLimit = Math.min(95, Math.max(15, 20 + ((i * 7 + 5) % 75)));
    const lossLimit = parseFloat((0.8 + ((i * 0.35 + 0.1) % 4.5)).toFixed(1));
    const sessionTakeProfit = parseFloat((2.5 + ((i * 0.85 + 0.5) % 12.0)).toFixed(1));
    const minConfidence = 65 + ((i * 3 + 1) % 28);

    // Guaranteed unique allocated capital amount per trader
    const baseAlloc = tier === 'Platinum' ? 5000 : tier === 'Gold' ? 2500 : 750;
    let alloc = Math.round((baseAlloc + ((i * 1370 + (i % 7) * 450 + 250) % 14500)) / 50) * 50;
    while (usedAllocations.has(alloc)) {
      alloc += 50;
    }
    usedAllocations.add(alloc);
    const allocatedAmount = alloc;

    specs.push({
      id: `trader_proc_${i}`,
      username,
      fullName,
      tier,
      verified,
      riskLevel: risk,
      style,
      preferredMarkets,
      status,
      bio,
      avatarSeed: uniqueSeed,
      avatarUrl,
      avatarConfig,
      strategyName,
      avgTradeDuration: avgDuration,
      followers,
      activeCopiers,
      historicalTradesBase,
      historicalWinsBase,
      historicalLossesBase,
      historicalPnlBase,
      historicalYearsTrading,
      currentWinningStreak,
      allocatedAmount,
      schedule: {
        enabled: true,
        operatingWindows: [
          {
            id: `win_${Date.now()}_${i}`,
            startTime: '09:00',
            endTime: '17:00',
            days: 'Every Day',
            markets: 'All Markets',
            timezone: TIMEZONES[i % TIMEZONES.length],
            enabled: true
          }
        ],
        coolingBreaks: i % 3 === 0 ? [{ id: `brk_${Date.now()}_${i}`, startTime: '12:00', endTime: '13:00', days: 'Every Day', enabled: true }] : [],
        marketCalendar: {
          'Stocks': { excludeHolidays: true },
          'Crypto': { excludeHolidays: false },
          'Forex': { excludeHolidays: true },
          'Indices': { excludeHolidays: true },
          'Commodities': { excludeHolidays: true }
        },
        monitorOutsideWindow: true
      },
      riskControls: {
        maxPositionSize,
        maxSimultaneousPositions,
        exposureLimit,
        positionSizingPreference: 'PERCENTAGE',
        lossLimit,
        sessionTakeProfit
      },
      recommendationRules: {
        minConfidence,
        allowedAssetClasses: ['CRYPTO'],
        indicators: traderIndicators
      },
      advancedBehavior: {
        enableDeepAnalysis,
        useSentimentGrounding,
        neuralConfidenceThreshold
      },
      strategyExplanation: explanationTemplates[style],
      wins: 0,
      losses: 0,
      recentTrades: [],
      trades: []
    });
  }

  return specs;
}

export const BASE_TRADERS_SPECS: Partial<SimulatedTrader>[] = generateProceduralTradersSpecs();

/**
 * Generates unique, highly realistic historical trades for a trader based on their style, risk level, and intrinsic bias.
 * Ensures the equity curve contains pullbacks, recovery periods, sideways trends, and volatility.
 */
export function generateHistoricalTradesForTrader(traderSpec: Partial<SimulatedTrader>, intendedRank?: number): SimulatedTrade[] {
  const rand = seededRandom(traderSpec.id || 'seed');
  const style = traderSpec.style || 'DAY_TRADING';
  const risk = traderSpec.riskLevel || 'MEDIUM';
  
  // Set parameters based on style
  let basePnlRange = 2.0; // average trade scale
  let winChance = 0.74; // base win rate
  let frequencyMultiplier = 1; // days spacing
  
  if (style === 'SCALPING') {
    basePnlRange = 1.2;
    winChance = 0.80; 
    frequencyMultiplier = 0.5;
  } else if (style === 'SWING_TRADING') {
    basePnlRange = 8.0;
    winChance = 0.60; 
    frequencyMultiplier = 3;
  } else { 
    basePnlRange = 3.5;
    winChance = 0.70;
    frequencyMultiplier = 1;
  }

  // Elite ranking boost for Top 10
  // To hit 60%-240% in 30 days:
  const isElite = intendedRank !== undefined && intendedRank <= 10;
  // Elite traders trade more frequently to show activity
  const eliteMultiplier = isElite ? (3.5 - (intendedRank! * 0.22)) : 1.0;

  if (traderSpec.tier === 'Platinum') {
    winChance = 0.88 + (rand() * 0.09); 
    basePnlRange *= 1.4;
  } else if (traderSpec.tier === 'Gold') {
    winChance = 0.78 + (rand() * 0.10); 
    basePnlRange *= 1.1;
  }

  if (isElite) {
    // For Rank 1-10, we want to target 60% to 240% return in 30 days.
    // Rank 1: 240%, Rank 10: 60%
    const target30D = 240 - ((intendedRank! - 1) * 20); // 1: 240, 2: 220, ..., 10: 60
    
    if (risk === 'HIGH') {
      winChance = 0.55 + (rand() * 0.15); // 55-70% win rate
    } else if (risk === 'MEDIUM') {
      winChance = 0.75 + (rand() * 0.10); // 75-85% win rate
    } else {
      winChance = 0.88 + (rand() * 0.10); // 88-98% win rate
    }
    
    const estTrades30D = 45;
    const estWins = Math.floor(estTrades30D * winChance);
    const estLosses = estTrades30D - estWins;
    
    const netWins = Math.max(1, estWins - (estLosses * 0.8)); // Adjust for slight loss ratio
    basePnlRange = (target30D / netWins) * 2.2; 
  } else if (risk === 'HIGH') {
    basePnlRange *= 5.0;
    winChance -= 0.15; 
  } else if (risk === 'LOW') {
    basePnlRange *= 0.5;
    winChance += 0.08; 
  }

  const tradesCount = isElite ? 1800 + Math.floor(rand() * 400) : // Elite traders have deep history
                     traderSpec.tier === 'Platinum' ? 250 + Math.floor(rand() * 150) : 
                     traderSpec.tier === 'Gold' ? 150 + Math.floor(rand() * 100) : 
                     80 + Math.floor(rand() * 70);
  const trades: SimulatedTrade[] = [];
  const baseDate = new Date();
  
  // Backwards in time
  let currentDate = new Date(baseDate.getTime() - (365 * 24 * 60 * 60 * 1000)); // 1 year ago

  for (let i = 0; i < tradesCount; i++) {
    // Add realistic spacing with some randomness
    const hoursSpacing = (rand() * 12 + 4) * frequencyMultiplier;
    currentDate = new Date(currentDate.getTime() + hoursSpacing * 60 * 60 * 1000);
    
    if (currentDate > baseDate) {
      break;
    }

    // Select random asset from preferred markets
    const markets = traderSpec.preferredMarkets || ['BTC', 'ETH'];
    const asset = markets[Math.floor(rand() * markets.length)];
    const basePrice = ASSETS_BY_MARKET[asset] || 100;
    
    // Simulate trade type
    const type = rand() < 0.55 ? 'BUY' : 'SELL';
    
    // Simulate PnL percentage
    // To include pullbacks, recovery, sideways, and volatile periods:
    // Let's introduce cyclic market seasons!
    const dayOfYear = Math.floor((currentDate.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000) + 365);
    
    // Season effects:
    // Every trader has their own unique "seasons" of luck/performance
    const traderPhaseShift = (rand() * 365);
    const dayWithShift = (dayOfYear + traderPhaseShift) % 365;
    
    let seasonalBias = 0;
    if ((dayWithShift >= 50 && dayWithShift <= 120)) {
      seasonalBias = -0.12; // individual drawdown period
    } else if ((dayWithShift >= 180 && dayWithShift <= 260)) {
      seasonalBias = 0.12; // individual bull run
    }

    const isWin = rand() < (winChance + seasonalBias);
    let pnlPercent = 0;
    
    if (isWin) {
      // Winning trade: positive return
      pnlPercent = parseFloat((rand() * basePnlRange + 0.1).toFixed(2));
    } else {
      // Losing trade: negative return
      pnlPercent = parseFloat((-(rand() * basePnlRange * 0.95 + 0.1)).toFixed(2));
    }

    // Dynamic entry/exit prices
    const entryPrice = parseFloat((basePrice * (1 + (rand() - 0.5) * 0.15)).toFixed(2));
    const exitPrice = parseFloat((entryPrice * (1 + pnlPercent / 100)).toFixed(2));

    trades.push({
      id: `t_${traderSpec.id}_${i}`,
      asset,
      type,
      entryPrice,
      exitPrice,
      pnlPercent,
      status: 'CLOSED',
      timestamp: currentDate.toISOString()
    });
  }

  // Ensure the final trade list is sorted chronologically
  trades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Add 1-2 OPEN trades at the very end
  const openMarkets = traderSpec.preferredMarkets || ['BTC', 'ETH'];
  const openAsset = openMarkets[0];
  const openBasePrice = ASSETS_BY_MARKET[openAsset] || 100;
  const openEntryPrice = parseFloat((openBasePrice * (1 + (rand() - 0.5) * 0.02)).toFixed(2));
  
  trades.push({
    id: `t_${traderSpec.id}_open`,
    asset: openAsset,
    type: rand() < 0.5 ? 'BUY' : 'SELL',
    entryPrice: openEntryPrice,
    status: 'OPEN',
    timestamp: new Date().toISOString()
  });

  return trades;
}

/**
 * Calculates a complete suite of performance metrics for a trader from their list of trades.
 * Returns the updated trader object with synchronized, derived fields.
 */
export function calculateTraderMetrics(trader: SimulatedTrader): SimulatedTrader {
  const closedTrades = trader.trades.filter(t => t.status === 'CLOSED');
  const totalTrades = closedTrades.length;
  
    if (totalTrades === 0) {
      // Ensure no 0.00% placeholders exist by providing a realistic default if trades are missing
      const isElite = trader.rank && trader.rank <= 10;
      // Target 60% to 240% for elite
      const rank = trader.rank || 1;
      const boost = isElite ? (3.5 - (rank * 0.25)) : 1.0;
      
      const target30D = isElite ? (240 - ((rank - 1) * 20)) : 15.5;

      trader.returnAllTime = parseFloat((trader.historicalPnlBase || 450 * boost).toFixed(2));
      trader.return1Y = parseFloat((trader.returnAllTime * 0.6).toFixed(2));
      trader.return90D = parseFloat((target30D * 2.5).toFixed(2));
      trader.return30D = parseFloat(target30D.toFixed(2));
      trader.return7D = parseFloat((target30D / 4).toFixed(2));
      trader.winRate = isElite ? 94 - rank : 65;
      trader.wins = isElite ? 82 : 65;
      trader.losses = isElite ? 18 : 35;
      trader.currentDrawdown = parseFloat((4.2 / boost).toFixed(2));
      trader.consecutiveWins = isElite ? 12 : 3;
      trader.consecutiveLosses = 1;
      trader.profitFactor = isElite ? 3.25 : 1.45;
      trader.riskManagementScore = isElite ? 94 : 82;
      trader.consistencyScore = isElite ? 92 : 78;
      trader.positionAccuracy = 88;
      trader.tradeFrequency = isElite ? 55 : 12;
      trader.aiEfficiency = 94;
      trader.volatilityHandling = 88;
      return trader;
    }

  // Chronological sorting
  closedTrades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Derive timelines based on virtual "current date" which is today
  const nowMs = new Date().getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const trades7D = closedTrades.filter(t => (nowMs - new Date(t.timestamp).getTime()) <= 7 * dayMs);
  const trades30D = closedTrades.filter(t => (nowMs - new Date(t.timestamp).getTime()) <= 30 * dayMs);
  const trades90D = closedTrades.filter(t => (nowMs - new Date(t.timestamp).getTime()) <= 90 * dayMs);
  const trades1Y = closedTrades.filter(t => (nowMs - new Date(t.timestamp).getTime()) <= 365 * dayMs);

  // 1. Returns calculation (cumulative compounding returns or sum of PnL)
  const basePnl = trader.historicalPnlBase || 0;
  trader.returnAllTime = parseFloat((basePnl + closedTrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0)).toFixed(2));
  trader.return1Y = parseFloat(trades1Y.reduce((sum, t) => sum + (t.pnlPercent || 0), 0).toFixed(2));
  trader.return90D = parseFloat(trades90D.reduce((sum, t) => sum + (t.pnlPercent || 0), 0).toFixed(2));
  trader.return30D = parseFloat(trades30D.reduce((sum, t) => sum + (t.pnlPercent || 0), 0).toFixed(2));
  trader.return7D = parseFloat(trades7D.reduce((sum, t) => sum + (t.pnlPercent || 0), 0).toFixed(2));

  // Ensure no 0.00% placeholders - if a calculation ends up at 0, give it a tiny jitter
  if (trader.return30D === 0) {
    const isElite = trader.rank && trader.rank <= 10;
    if (isElite) {
      trader.return30D = parseFloat((240 - ((trader.rank! - 1) * 20) + Math.random() * 5).toFixed(2));
    } else {
      trader.return30D = parseFloat((Math.random() * 0.5 + 0.1).toFixed(2));
    }
  }
  if (trader.returnAllTime === 0) trader.returnAllTime = parseFloat((Math.random() * 2 + 5).toFixed(2));

  // 2. Win rate, wins, losses
  const winningTrades = closedTrades.filter(t => (t.pnlPercent || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnlPercent || 0) <= 0);
  
  trader.wins = winningTrades.length + (trader.historicalWinsBase || 0);
  trader.losses = losingTrades.length + (trader.historicalLossesBase || 0);
  const effectiveTotalTrades = trader.wins + trader.losses;
  trader.winRate = effectiveTotalTrades > 0 ? parseFloat(((trader.wins / effectiveTotalTrades) * 100).toFixed(1)) : 0;

  // 3. Consecutive wins/losses
  let maxConsecWins = trader.currentWinningStreak || 0;
  let maxConsecLosses = 0;
  let currentConsecWins = trader.currentWinningStreak || 0;
  let currentConsecLosses = 0;

  closedTrades.forEach(t => {
    const isWin = (t.pnlPercent || 0) > 0;
    if (isWin) {
      currentConsecWins++;
      currentConsecLosses = 0;
      if (currentConsecWins > maxConsecWins) maxConsecWins = currentConsecWins;
    } else {
      currentConsecLosses++;
      currentConsecWins = 0;
      if (currentConsecLosses > maxConsecLosses) maxConsecLosses = currentConsecLosses;
    }
  });

  trader.consecutiveWins = maxConsecWins;
  trader.consecutiveLosses = maxConsecLosses;

  // 4. Current Drawdown
  let currentEquity = 100;
  let peak = 100;
  let maxDrawdown = 0;

  closedTrades.forEach(t => {
    currentEquity *= (1 + (t.pnlPercent || 0) / 100);
    if (currentEquity > peak) {
      peak = currentEquity;
    }
    const dd = ((peak - currentEquity) / peak) * 100;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
  });

  trader.currentDrawdown = parseFloat(Math.max(1.2, Math.min(35, maxDrawdown)).toFixed(2));

  // 5. Profit Factor
  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0));
  trader.profitFactor = grossLoss === 0 ? parseFloat((grossProfit / 0.1).toFixed(2)) : parseFloat((grossProfit / grossLoss).toFixed(2));
  if (trader.profitFactor < 0.1) trader.profitFactor = 0.1;
  if (trader.profitFactor > 15) trader.profitFactor = 15;

  // 6. Risk Management Score
  let rms = 100 - trader.currentDrawdown * 1.5;
  if (trader.riskLevel === 'HIGH') rms -= 15;
  if (trader.riskLevel === 'LOW') rms += 10;
  rms -= (trader.riskControls.lossLimit || 2) * 2;
  trader.riskManagementScore = Math.floor(Math.max(45, Math.min(99, rms)));

  // 7. Consistency Score
  const averagePnL = closedTrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0) / totalTrades;
  const variance = closedTrades.reduce((sum, t) => sum + Math.pow((t.pnlPercent || 0) - averagePnL, 2), 0) / totalTrades;
  const stdDev = Math.sqrt(variance);
  let consistency = 100 - stdDev * 5;
  if (trader.style === 'SCALPING') consistency += 10;
  trader.consistencyScore = Math.floor(Math.max(50, Math.min(98, consistency)));

  // 8. Position Accuracy & Trade Frequency
  trader.positionAccuracy = Math.floor(trader.winRate);
  trader.tradeFrequency = Math.round(totalTrades / 52); 
  if (trader.tradeFrequency < 1) trader.tradeFrequency = 1;

  // 9. AI Efficiency
  let aie = 82;
  if (trader.advancedBehavior.enableDeepAnalysis) aie += 5;
  if (trader.advancedBehavior.useSentimentGrounding) aie += 4;
  aie += (trader.recommendationRules.indicators?.length || 2) * 1.5;
  trader.aiEfficiency = Math.floor(Math.max(80, Math.min(98, aie)));

  // 10. Volatility Handling
  let vh = 75;
  if (trader.riskLevel === 'HIGH' && trader.winRate > 75) vh += 15;
  if (trader.riskLevel === 'LOW') vh -= 10;
  vh += (trader.preferredMarkets.includes('SOL') || trader.preferredMarkets.includes('AVR') ? 8 : 0);
  trader.volatilityHandling = Math.floor(Math.max(55, Math.min(97, vh)));

  // 11. Recent Activity Score
  const recentTradesCount = trades7D.length;
  trader.recentActivityScore = Math.floor(Math.max(30, Math.min(100, recentTradesCount * 12)));

  // 12. PnL Sparkline
  const sparkline: number[] = [];
  const chunkSize = Math.max(1, Math.floor(closedTrades.length / 10));
  let cumulative = 0;
  for (let i = 0; i < 10; i++) {
    const tradeIdx = Math.min(closedTrades.length - 1, (i + 1) * chunkSize - 1);
    const subtrades = closedTrades.slice(0, tradeIdx + 1);
    cumulative = subtrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0);
    sparkline.push(parseFloat(cumulative.toFixed(2)));
  }
  trader.pnlHistory30D = sparkline.map(val => {
    const lastVal = sparkline[sparkline.length - 1] || 1;
    const ratio = trader.return30D / lastVal;
    return parseFloat((val * (isNaN(ratio) ? 1 : ratio)).toFixed(2));
  });

  const openTrades = trader.trades.filter(t => t.status === 'OPEN');
  const sortedClosed = [...closedTrades].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const rawRecent = [...openTrades, ...sortedClosed.slice(0, 4)];
  const defaultMarkets = trader.preferredMarkets && trader.preferredMarkets.length > 0 
    ? trader.preferredMarkets 
    : ['BTC', 'ETH', 'SOL', 'AVR', 'INJ', 'XRP', 'LINK', 'NEAR'];

  trader.recentTrades = rawRecent.map((t, idx) => {
    // Relative realistic spacing (12m ago, 1h 45m ago, 4h 30m ago, 11h ago, 26h ago)
    const offsetMinutes = t.status === 'OPEN' 
      ? 12 + (idx * 14)
      : idx === 0 ? 95 : idx === 1 ? 285 : idx === 2 ? 680 : 1350;

    const freshTime = new Date(nowMs - offsetMinutes * 60 * 1000).toISOString();
    
    // Rotate assets to avoid exact duplicate pairs in a row
    const asset = (idx > 0 && t.asset === rawRecent[idx - 1]?.asset)
      ? defaultMarkets[(idx + 1) % defaultMarkets.length]
      : t.asset || defaultMarkets[idx % defaultMarkets.length];

    const leverage = t.leverage || [10, 20, 15, 5, 25][idx % 5];
    const marginUsd = t.marginUsd || Math.round((trader.allocatedAmount ? trader.allocatedAmount * 0.12 : 1250) * (0.85 + (idx % 3) * 0.15));
    const pnlPercent = t.pnlPercent ?? (t.status === 'OPEN' ? 1.85 : (idx % 2 === 0 ? 3.45 : -1.25));
    const pnlUsd = t.pnlUsd ?? parseFloat((marginUsd * (pnlPercent / 100)).toFixed(2));
    const sizeUnits = parseFloat(((marginUsd * leverage) / t.entryPrice).toFixed(4));

    return {
      ...t,
      asset,
      leverage,
      marginUsd,
      sizeUnits,
      pnlPercent,
      pnlUsd,
      timestamp: freshTime
    };
  });

  // 13. Performance Score
  const score = (trader.return30D * 0.40) + 
                (trader.return7D * 0.35) + 
                (trader.returnAllTime * 0.05) + 
                (trader.winRate * 2.5) + 
                (trader.profitFactor * 12) - 
                (trader.currentDrawdown * 1.5) + 
                (trader.riskManagementScore * 0.15) + 
                (trader.consistencyScore * 0.15) + 
                (trader.consecutiveWins * 1.2) - 
                (trader.consecutiveLosses * 1.8);

  trader.performanceScore = parseFloat(Math.max(50, score).toFixed(2));

  return trader;
}

export function compactTradersForStorage(traders: SimulatedTrader[]): SimulatedTrader[] {
  if (!Array.isArray(traders)) return [];
  return traders.map(t => {
    const item = { ...t } as any;
    if (Array.isArray(item.trades)) {
      item.trades = item.trades.slice(-20);
    }
    if (Array.isArray(item.chartData)) {
      item.chartData = item.chartData.slice(-30);
    }
    if (Array.isArray(item.performanceHistory)) {
      item.performanceHistory = item.performanceHistory.slice(-30);
    }
    return item as SimulatedTrader;
  });
}

export function saveSimulatedTraders(traders: SimulatedTrader[]) {
  const compacted = compactTradersForStorage(traders);
  safeStorage.setItem('aver_sim_traders_v14', JSON.stringify(compacted));
}

/**
 * Realistically rotates trader statuses.
 * Ensures:
 * - Total traders = 20.
 * - Most traders are Offline (~16-19 out of 20).
 * - Rarely are more than 4 traders active/online at the same time (MAX = 4).
 * - Active traders stay active for a short period before going back Offline.
 * - Offline traders occasionally log on ('Trading', 'Analyzing', 'Online').
 */
export function rotateTraderStatuses(traders: SimulatedTrader[]): SimulatedTrader[] {
  if (!traders || traders.length === 0) return traders;

  const activeStatuses: ('Trading' | 'Analyzing' | 'Online')[] = ['Trading', 'Analyzing', 'Online'];
  
  // Clone array
  const updated = traders.map(t => ({ ...t }));

  // Count current active traders
  const currentActive = updated.filter(t => t.status !== 'Offline');

  // Rule 1: Strict Cap - If more than 4 traders are active, force surplus back to Offline
  if (currentActive.length > 4) {
    const overflowCount = currentActive.length - 4;
    const candidates = [...currentActive].sort(() => Math.random() - 0.5);
    for (let i = 0; i < overflowCount; i++) {
      const traderToOff = updated.find(u => u.id === candidates[i].id);
      if (traderToOff) {
        traderToOff.status = 'Offline';
      }
    }
  }

  // Rule 2: Active Decay - Active traders have ~20% chance per tick to log off (go Offline)
  updated.forEach(t => {
    if (t.status !== 'Offline') {
      if (Math.random() < 0.20) {
        t.status = 'Offline';
      } else if (Math.random() < 0.25) {
        // Shift between active states (e.g. Analyzing -> Trading)
        const otherActives = activeStatuses.filter(s => s !== t.status);
        t.status = otherActives[Math.floor(Math.random() * otherActives.length)];
      }
    }
  });

  // Rule 3: Re-count active traders after decay
  const remainingActive = updated.filter(t => t.status !== 'Offline');

  // Rule 4: New Logins - Bring offline traders online if active count < 4
  // We want active count to fluctuate naturally between 1 and 4 (rarely 4, mostly 1, 2, or 3)
  const targetActiveCount = remainingActive.length === 0 
    ? (1 + Math.floor(Math.random() * 2)) // 1 or 2 if none currently online
    : (Math.random() < 0.35 ? remainingActive.length + 1 : remainingActive.length);
  
  const clampedTarget = Math.min(4, Math.max(1, targetActiveCount));

  if (remainingActive.length < clampedTarget) {
    const needed = clampedTarget - remainingActive.length;
    const offlineTraders = updated.filter(t => t.status === 'Offline');
    const shuffledOffline = [...offlineTraders].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(needed, shuffledOffline.length); i++) {
      const traderToOn = updated.find(u => u.id === shuffledOffline[i].id);
      if (traderToOn) {
        const r = Math.random();
        traderToOn.status = r < 0.45 ? 'Trading' : r < 0.85 ? 'Analyzing' : 'Online';
      }
    }
  }

  return updated;
}

/**
 * Executes a subtle ranking update.
 * Traders can only move up/down by at most 2 positions.
 */
export function runScheduledRankingsUpdate(traders: SimulatedTrader[]): {
  updatedTraders: SimulatedTrader[];
  events: SimulationEvent[];
} {
  const now = Date.now();
  const FIVE_HOURS_MS = 5 * 3600000;
  
  const lastUpdateStr = safeStorage.getItem('aver_last_ranking_update');
  const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr) : 0;
  
  // If 5 hours haven't passed, just return existing (unless force update needed)
  if (now - lastUpdate < FIVE_HOURS_MS && lastUpdate !== 0) {
    return { updatedTraders: traders, events: [] };
  }

  console.log("Executing scheduled 5-hour leaderboard recalculation...");
  
  // 1. Run simulation tick to update performance data for everyone
  const { updatedTraders, events } = runSimulationTick(traders);
  
  // 2. Sort by current rank to have a stable starting point
  const currentOrderedList = [...updatedTraders].sort((a, b) => a.rank - b.rank);
  
  // 3. Calculate "Target Rank" based on new 30D returns
  const targetOrderedList = [...updatedTraders].sort((a, b) => b.return30D - a.return30D);
  const targetRankMap: Record<string, number> = {};
  targetOrderedList.forEach((t, i) => {
    targetRankMap[t.id] = i + 1;
  });

  // 4. Subtle movement logic:
  // We perform two passes of neighbor swaps (bubble sort limited to 2 steps)
  // This ensures a trader can move at most 2 positions in one 5-hour cycle.
  for (let step = 0; step < 2; step++) {
    for (let i = 0; i < currentOrderedList.length - 1; i++) {
      const traderA = currentOrderedList[i];
      const traderB = currentOrderedList[i + 1];
      
      // If trader B is performing better (has a lower target rank) than A, swap them
      // We add a small probability factor so not every out-of-place trader moves immediately
      if (targetRankMap[traderB.id] < targetRankMap[traderA.id]) {
        const moveProbability = step === 0 ? 0.8 : 0.4; // 80% chance for 1st move, 40% for 2nd
        if (Math.random() < moveProbability) {
          currentOrderedList[i] = traderB;
          currentOrderedList[i + 1] = traderA;
        }
      }
    }
  }

  // 5. Apply final ranks and update prevRank
  currentOrderedList.forEach((t, index) => {
    t.prevRank = t.rank;
    t.rank = index + 1;
  });

  safeStorage.setItem('aver_last_ranking_update', now.toString());
  saveSimulatedTraders(currentOrderedList);
  
  return { updatedTraders: currentOrderedList, events };
}

/**
 * Initializes the list of 100 simulated traders.
 * Pulls from localStorage if available, otherwise generates historical trade profiles from scratch.
 */
function healTradeTimestamps(trader: SimulatedTrader): SimulatedTrader {
  if (!trader.trades || trader.trades.length === 0) return trader;
  
  const closedTrades = trader.trades.filter(t => t.status === 'CLOSED');
  if (closedTrades.length === 0) return trader;
  
  closedTrades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const latestTradeTime = new Date(closedTrades[closedTrades.length - 1].timestamp).getTime();
  const now = Date.now();
  
  const diff = now - latestTradeTime;
  if (diff > 30 * 60 * 1000) {
    trader.trades = trader.trades.map(t => ({
      ...t,
      timestamp: new Date(new Date(t.timestamp).getTime() + diff).toISOString()
    }));
  }
  return trader;
}

export function initSimulatedTraders(): SimulatedTrader[] {
  const saved = safeStorage.getItem('aver_sim_traders_v14');
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as SimulatedTrader[];
      // verify we have exactly 20 traders
      if (parsed.length === 20) {
        // Heal and recalculate
        const healed = parsed.map((t, idx) => {
          if (!t.allocatedAmount) {
            const baseAlloc = t.tier === 'Platinum' ? 5000 : t.tier === 'Gold' ? 2500 : 750;
            t.allocatedAmount = Math.round((baseAlloc + ((idx * 1370 + (idx % 7) * 450 + 250) % 14500)) / 50) * 50;
          }
          if (!t.avatarConfig) {
            const hairStyle = (idx * 7 + (idx % 3)) % 24;
            const isFemaleFace = idx % 3 === 0;
            t.avatarConfig = {
              avatarId: `avatar_${t.username?.toLowerCase() || 'trader'}_${idx}`,
              skinTone: '#FFDBAC',
              hairStyle,
              hairColor: '#111827',
              faceShape: isFemaleFace ? 'round' : 'angular',
              facialHair: -1,
              eyewear: -1,
              clothing: 'standard',
              background: 'default',
              isFemaleFace
            };
          }
          t.avatarUrl = getAvatarDataUrl(t.avatarSeed, undefined, t.avatarConfig);
          const healedTrader = healTradeTimestamps(t);
          return calculateTraderMetrics(healedTrader);
        });
        
        // Re-sort to maintain order based on 30D return
        healed.sort((a, b) => b.return30D - a.return30D);
        
        // Ensure ranks are clean and sequential
        healed.forEach((t, index) => {
          t.rank = index + 1;
          if (index === 0 && t.avatarConfig) {
            t.avatarConfig.hairStyle = 3; // #1 trader style (Messy Spikes)
          }
          if (t.avatarConfig) {
            t.avatarUrl = getAvatarDataUrl(t.avatarSeed, undefined, t.avatarConfig);
          }
        });
        
        const statusAdjusted = rotateTraderStatuses(healed);
        saveSimulatedTraders(statusAdjusted);
        return statusAdjusted;
      }
    } catch (e) {
      console.error("Failed to parse saved simulated copytraders, regenerating...", e);
    }
  }

  // Generate brand new 20 simulation database!
  console.log("Simulating 20 full-fidelity historical trader profiles with elite performance seeding...");
  const traders = BASE_TRADERS_SPECS.map((spec, index) => {
    const fullTrader = { ...spec } as SimulatedTrader;
    if (fullTrader.avatarConfig) {
      fullTrader.avatarUrl = getAvatarDataUrl(fullTrader.avatarSeed, undefined, fullTrader.avatarConfig);
    }
    // Inject intended rank for initialization to seed elite returns
    fullTrader.trades = generateHistoricalTradesForTrader(fullTrader, index < 10 ? index + 1 : undefined);
    return calculateTraderMetrics(fullTrader);
  });

  // Initial ranking sort based on 30D returns
  traders.sort((a, b) => b.return30D - a.return30D);
  
  // Set ranks and desired unique returns
  traders.forEach((t, index) => {
    t.rank = index + 1;
    t.prevRank = index + 1;
    t.prev30DReturn = t.return30D || 0;
    t.lastFollowerUpdate = new Date(Date.now() - Math.floor(Math.random() * 6 * 3600000)).toISOString();
    
    if (index === 0 && t.avatarConfig) {
      t.avatarConfig.hairStyle = 3; // #1 trader style (Messy Spikes)
    }
    if (t.avatarConfig) {
      t.avatarUrl = getAvatarDataUrl(t.avatarSeed, undefined, t.avatarConfig);
    }
    
    // We generated followers procedurally earlier, keep them unless they are lower than a realistic floor for rank
    const minimumRankFollowers = Math.floor(50000 * Math.pow(0.97, index));
    if (t.followers < minimumRankFollowers) {
      t.followers = minimumRankFollowers + Math.floor(Math.random() * 5000);
    }
  });

  const finalTraders = rotateTraderStatuses(traders);
  saveSimulatedTraders(finalTraders);
  return finalTraders;
}

/**
 * Executes a single tick of the simulation.
 * 1. Randomly chooses 1-3 traders to execute new completed trades.
 * 2. Simulates the trade outcomes, appends to trade histories.
 * 3. Updates follower counts based on performance.
 * 4. Recalculates all metrics and Performance Scores.
 * 5. Re-ranks all 100 traders.
 * 6. Generates rank movement and milestone events.
 * 7. Persists the updated state.
 */
export function runSimulationTick(traders: SimulatedTrader[]): {
  updatedTraders: SimulatedTrader[];
  events: SimulationEvent[];
} {
  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const events: SimulationEvent[] = [];
  
  // Create deep copy to avoid mutation issues during calculation
  let tradersList = traders.map(t => ({
    ...t,
    trades: t.trades.map(tr => ({ ...tr })),
    preferredMarkets: [...t.preferredMarkets]
  })) as SimulatedTrader[];

  // 1. Save old states for delta calculations
  const oldStateMap: Record<string, { rank: number; return30D: number; followers: number }> = {};
  tradersList.forEach(t => {
    oldStateMap[t.id] = {
      rank: t.rank,
      return30D: t.return30D,
      followers: t.followers
    };
    t.prevRank = t.rank;
    t.prev30DReturn = t.return30D;
  });

  // 2. Process EACH trader independently
  tradersList = tradersList.map(t => {
    // Unique seed per trader AND tick to ensure independence
    const rand = seededRandom(t.id + "_" + nowMs + "_" + Math.random());
    
    // Determine if this trader executes a trade this tick
    // We increase the chance to make it more lively
    const tradeChance = (t.tradeFrequency / (7 * 24 * 60)) * 20; 
    const shouldTrade = rand() < (tradeChance * 60); 

    if (shouldTrade) {
      // Pick a market
      const asset = t.preferredMarkets[Math.floor(rand() * t.preferredMarkets.length)];
      const basePrice = ASSETS_BY_MARKET[asset] || 100;
      
      // Individual luck cycle
      const traderSeed = t.id + "_luck_" + Math.floor(nowMs / (4 * 3600000));
      const luckRand = seededRandom(traderSeed);
      const traderLuck = (luckRand() - 0.5) * 0.25; // -12.5% to +12.5% bias
      
      const effectiveWinRate = (t.winRate / 100) + traderLuck;
      const isWin = rand() < effectiveWinRate;
      
      // Magnitude based on risk level - make it more volatile as requested
      // Elite performance boost for Top 10 to sustain high returns
      const isElite = t.rank <= 10;
      const eliteMultiplier = isElite ? (8.0 - (t.rank * 0.55)) : 1.0;
      
      let magnitude = t.riskLevel === 'HIGH' ? 38.5 : t.riskLevel === 'MEDIUM' ? 12.2 : 4.8;
      magnitude *= (0.5 + rand() * 1.5); // 50% to 200% noise
      // Less elite multiplier so it doesn't just grow unbounded, but gives high chance of large swings
      magnitude *= isElite ? 1.5 : 1.0; 
      
      let pnlPercent = 0;
      if (isWin) {
        pnlPercent = parseFloat((rand() * magnitude + 0.5).toFixed(2));
      } else {
        pnlPercent = parseFloat((-(rand() * magnitude * 1.5 + 0.5)).toFixed(2));
      }

      // Check for open trades to close
      const openTradeIdx = t.trades.findIndex(tr => tr.status === 'OPEN');
      if (openTradeIdx !== -1) {
        const tr = t.trades[openTradeIdx];
        tr.status = 'CLOSED';
        tr.pnlPercent = pnlPercent;
        tr.exitPrice = parseFloat((tr.entryPrice * (1 + pnlPercent / 100)).toFixed(2));
        tr.timestamp = nowIso;
      } else {
        // Just add a closed trade if none open
        const entryPrice = parseFloat((basePrice * (1 + (rand() - 0.5) * 0.1)).toFixed(2));
        const exitPrice = parseFloat((entryPrice * (1 + pnlPercent / 100)).toFixed(2));
        t.trades.push({
          id: `t_${t.id}_${nowMs}_${Math.floor(Math.random() * 1000)}`,
          asset,
          type: rand() < 0.5 ? 'BUY' : 'SELL',
          entryPrice,
          exitPrice,
          pnlPercent,
          status: 'CLOSED',
          timestamp: nowIso
        });
      }

      // Always ensure they have at least one open trade
      if (t.trades.filter(tr => tr.status === 'OPEN').length === 0) {
        const nextAsset = t.preferredMarkets[Math.floor(rand() * t.preferredMarkets.length)];
        const nextPrice = ASSETS_BY_MARKET[nextAsset] || 100;
        t.trades.push({
          id: `t_${t.id}_open_${nowMs}`,
          asset: nextAsset,
          type: rand() < 0.5 ? 'BUY' : 'SELL',
          entryPrice: parseFloat((nextPrice * (1 + (rand() - 0.5) * 0.02)).toFixed(2)),
          status: 'OPEN',
          timestamp: nowIso
        });
      }

      // Cleanup history (keep 200 trades)
      if (t.trades.length > 200) {
        const open = t.trades.filter(tr => tr.status === 'OPEN');
        const closed = t.trades.filter(tr => tr.status === 'CLOSED');
        t.trades = [...closed.slice(closed.length - 190), ...open];
      }

      // Recalculate metrics
      calculateTraderMetrics(t);
    }

  // 3. Status Rotator (Online/Offline) - Enforces realistic max 4 online traders
  tradersList = rotateTraderStatuses(tradersList);

    return t;
  });

  // 4. Calculate Ranks based on performanceScore
  tradersList.sort((a, b) => b.performanceScore - a.performanceScore);
  tradersList.forEach((t, index) => {
    t.rank = index + 1;
  });

  // 5. Follower Recalculation (Every 6 "hours" simulated - or just check lastFollowerUpdate)
  // To make it responsive, we'll run a check every tick but only apply large changes if time elapsed
  // or a small "per-tick" adjustment based on recent performance.
  tradersList = tradersList.map(t => {
    const lastUpdate = new Date(t.lastFollowerUpdate).getTime();
    const SIX_HOURS_MS = 6 * 3600000;
    const isMajorUpdate = (nowMs - lastUpdate) >= SIX_HOURS_MS;
    
    if (isMajorUpdate) {
      const rand = seededRandom(t.id + "_followers_" + nowMs);
      const old = oldStateMap[t.id];
      const rankDelta = old.rank - t.rank; // positive if rank improved (e.g. 10 -> 5)
      const pnlDelta = t.return30D - t.prev30DReturn;
      
      let followerChange = 0;
      
      // Gain followers for rank improvement
      if (rankDelta > 0) {
        followerChange += rankDelta * (50 + rand() * 150);
        if (t.rank <= 10) followerChange *= 2.5; // Big boost for top 10
      } else if (rankDelta < 0) {
        followerChange += rankDelta * (30 + rand() * 80); // Lose followers for dropping
      }
      
      // Gain/Lose based on PnL performance
      if (pnlDelta > 0) {
        followerChange += (pnlDelta * 10) * (1 + rand() * 2);
      } else {
        followerChange += (pnlDelta * 15) * (1 + rand() * 1.5);
      }

      // Add base growth for high rankers
      if (t.rank <= 5) followerChange += (100 + rand() * 200);

      // Random noise
      followerChange += (rand() - 0.5) * 100;

      t.followers = Math.max(500, Math.floor(t.followers + followerChange));
      t.lastFollowerUpdate = nowIso;

      // Milestone events
      if (followerChange > 2000 && t.rank <= 10) {
        events.push({
          id: `evt_social_${t.id}_${nowMs}`,
          text: `🔥 ${t.username} gained ${Math.floor(followerChange).toLocaleString()} new followers this period following a Rank #${t.rank} breakthrough!`,
          timestamp: nowIso,
          traderId: t.id,
          type: 'milestone'
        });
      }
    }

    // Small per-tick adjustment for visual live feel
    const miniRand = seededRandom(t.id + "_mini_" + nowMs);
    if (miniRand() < 0.3) {
      const shift = Math.floor((miniRand() - 0.45) * 5); // slightly biased to growth
      t.followers = Math.max(500, t.followers + shift);
    }

    return t;
  });

  // 6. Generate Rank change events
  tradersList.forEach(t => {
    const old = oldStateMap[t.id];
    if (old.rank !== t.rank) {
      if (old.rank > 10 && t.rank <= 10) {
        events.push({
          id: `evt_rank_${t.id}_${nowMs}`,
          text: `🌟 ${t.username} entered the Top 10 with a blistering +${t.return30D.toFixed(2)}% return!`,
          timestamp: nowIso,
          traderId: t.id,
          type: 'entry'
        });
      } else if (old.rank <= 10 && t.rank > 10) {
        events.push({
          id: `evt_rank_${t.id}_${nowMs}`,
          text: `⚠️ ${t.username} dropped out of the Top 10 due to recent drawdowns.`,
          timestamp: nowIso,
          traderId: t.id,
          type: 'rank_down'
        });
      } else if (t.rank === 1 && old.rank > 1) {
        events.push({
          id: `evt_rank_${t.id}_${nowMs}`,
          text: `🏆 NEW CHAMPION: ${t.username} has claimed the #1 spot on the leaderboard!`,
          timestamp: nowIso,
          traderId: t.id,
          type: 'rank_up'
        });
      }
    }
  });

  // Save back to local storage
  saveSimulatedTraders(tradersList);

  return {
    updatedTraders: tradersList,
    events
  };
}

/**
 * Generates high-fidelity historical data series for Recharts or SVG charting for any given timeline.
 * Supports: '24h', '7d', '30d', '90d', '1y', 'all'
 */
export function getTraderEquityCurve(trader: SimulatedTrader, timeline: '24h' | '7d' | '30d' | '90d' | '1y' | 'all'): {
  labels: string[];
  dataPoints: number[];
  dates: Date[];
} {
  const closedTrades = trader.trades.filter(t => t.status === 'CLOSED');
  
  // Sort chronologically
  closedTrades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const nowMs = new Date().getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  let timelineTrades: SimulatedTrade[] = [];
  let durationMs = 0;
  let labelFormat: 'time' | 'day' | 'month' | 'year' = 'month';

  switch (timeline) {
    case '24h':
      durationMs = 24 * 60 * 60 * 1000;
      timelineTrades = closedTrades.filter(t => (nowMs - new Date(t.timestamp).getTime()) <= durationMs);
      labelFormat = 'time';
      break;
    case '7d':
      durationMs = 7 * dayMs;
      timelineTrades = closedTrades.filter(t => (nowMs - new Date(t.timestamp).getTime()) <= durationMs);
      labelFormat = 'day';
      break;
    case '30d':
      durationMs = 30 * dayMs;
      timelineTrades = closedTrades.filter(t => (nowMs - new Date(t.timestamp).getTime()) <= durationMs);
      labelFormat = 'day';
      break;
    case '90d':
      durationMs = 90 * dayMs;
      timelineTrades = closedTrades.filter(t => (nowMs - new Date(t.timestamp).getTime()) <= durationMs);
      labelFormat = 'month';
      break;
    case '1y':
      durationMs = 365 * dayMs;
      timelineTrades = closedTrades.filter(t => (nowMs - new Date(t.timestamp).getTime()) <= durationMs);
      labelFormat = 'month';
      break;
    case 'all':
      timelineTrades = closedTrades;
      labelFormat = 'month';
      break;
  }

  // If there are too few trades in a timeline, back-fill with some preceding history to make the chart complete and beautiful
  if (timelineTrades.length < 8) {
    // grab the latest 15 trades from closedTrades
    timelineTrades = closedTrades.slice(Math.max(0, closedTrades.length - 15));
  }

  // To build the exact equity curve for the selected timeline:
  // We compute the cumulative return *after* each trade is applied
  const dataPoints: number[] = [];
  const labels: string[] = [];
  const dates: Date[] = [];
  
  let cumulative = 0;

  // If we filter, we want to know what the cumulative PnL was before this timeline started
  const tradesBeforeTimeline = closedTrades.filter(t => !timelineTrades.some(tt => tt.id === t.id));
  const startingReturn = tradesBeforeTimeline.reduce((sum, t) => sum + (t.pnlPercent || 0), 0);
  
  cumulative = startingReturn;

  // Add a starting point
  if (timelineTrades.length > 0) {
    dataPoints.push(parseFloat(cumulative.toFixed(2)));
    const firstDate = new Date(new Date(timelineTrades[0].timestamp).getTime() - 2 * 60 * 60 * 1000);
    dates.push(firstDate);
    labels.push(formatTimelineLabel(firstDate, labelFormat));
  }

  timelineTrades.forEach(t => {
    cumulative += (t.pnlPercent || 0);
    dataPoints.push(parseFloat(cumulative.toFixed(2)));
    const tDate = new Date(t.timestamp);
    dates.push(tDate);
    labels.push(formatTimelineLabel(tDate, labelFormat));
  });

  return {
    labels,
    dataPoints,
    dates
  };
}

function formatTimelineLabel(date: Date, format: 'time' | 'day' | 'month' | 'year'): string {
  if (format === 'time') {
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  }
  if (format === 'day') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }
  if (format === 'month') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()];
  }
  return date.getFullYear().toString();
}
