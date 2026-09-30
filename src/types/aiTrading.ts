import { Timestamp } from 'firebase/firestore';

export type AiSessionStatus = 'ACTIVE' | 'INACTIVE' | 'STOPPED' | 'PAUSED' | 'RUNNING' | 'COMPLETED';
export type RecommendationStatus = 'PENDING' | 'EXECUTED' | 'DISMISSED' | 'EXPIRED';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type RiskRating = 'LOW' | 'MEDIUM' | 'HIGH';

export type MarketCategory = 'Crypto' | 'Stocks' | 'Forex' | 'Indices' | 'Commodities';

export interface OperatingWindow {
  id: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  days: string[] | 'Every Day';
  markets: MarketCategory[] | 'All Markets';
  timezone: string;
  enabled: boolean;
}

export interface CoolingBreak {
  id: string;
  startTime: string;
  endTime: string;
  days: string[] | 'Every Day';
  enabled: boolean;
}

export interface TradingSchedule {
  enabled: boolean; // If false, AI operates continuously (24/7)
  manualOverride?: boolean; // Force AI trading regardless of operating windows
  operatingWindows: OperatingWindow[];
  coolingBreaks: CoolingBreak[];
  marketCalendar: Record<string, { excludeHolidays: boolean }>;
  monitorOutsideWindow?: boolean;
  pauseTrading?: boolean;
  emergencyStop?: boolean;
  
  // Legacy fields preserved for backward compatibility during migration
  sessions?: { start: string; end: string }[];
  weekdays?: boolean;
  weekends?: boolean;
  timezone?: string;
  breakPeriods?: { start: string; end: string }[];
  excludeHolidays?: boolean;
}

export interface RiskControls {
  maxPositionSize: number;
  maxSimultaneousPositions: number;
  exposureLimit: number;
  positionSizingPreference: 'FIXED' | 'PERCENTAGE';
  lossLimit: number;
  sessionTakeProfit?: number;
}

export interface RecommendationRules {
  minConfidence: number;
  allowedAssetClasses: ('CRYPTO' | 'STOCKS' | 'FOREX')[];
  indicators: string[];
}

export interface AiPreferenceProfile {
  preferredMarkets: string[]; // e.g. ['BTC', 'ETH', 'SOL']
  assetClasses: ('CRYPTO' | 'STOCKS' | 'FOREX')[];
  riskProfile: RiskRating;
  tradingStyle: 'SCALPING' | 'DAY_TRADING' | 'SWING_TRADING';
  maxSimultaneousRecommendations: number;
  defaultPositionSizing: 'FIXED' | 'PERCENTAGE';
  defaultPositionSize: number; // Amount or %
  marketScanFrequency: number; // in minutes
  // Risk Controls & Settings
  maxPositionSize?: number;
  maxRiskPerTrade?: number;
  lossLimit?: number;
  minConfidence?: number;
  minimumConfidenceScore?: number;
  exposureLimit?: number;
  maxSimultaneousPositions?: number;
  updatedAt?: string;
  notificationPreferences: {
    newRecommendations: boolean;
    tradeExecutions: boolean;
    marketAlerts: boolean;
  };
}

export interface AiConfiguration {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Timestamp;
  lastModified: Timestamp;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  
  // Section 1: Session Setup
  sessionSetup: {
    amountToAllocate: number;
    fundingSource: 'WALLET' | 'VAULT';
    sessionDuration: number; // in hours
  };

  // Section 2: Profit & Risk Management
  profitRiskManagement: {
    sessionTakeProfit: number; // %
    sessionStopLoss: number; // %
    maxRiskPerTrade: number; // %
    maxPositionSize: number; // amount in USD
  };

  // Section 3: AI Trading Rules
  aiTradingRules: {
    minConfidence: number; // 0-100
    maxSimultaneousPositions: number;
    assetSelection: string[];
    tradingStrategy: 'NEURAL_MOMENTUM' | 'VOLATILITY_BREAKOUT' | 'MEAN_REVERSION' | 'QUANT_GRID';
  };

  schedule?: TradingSchedule;
  strategy?: string;
  markets?: string[];

  // Section 4: Configuration Details
  configurationDetails: {
    description: string;
    category: string;
    version: string;
  };

  // Section 5: Configuration Analytics & Notes
  analyticsAndNotes: {
    riskScore: number; // 0-100
    strategyNotes: string;
    performanceStats?: {
      winRate: number;
      totalReturn: number;
      drawdown: number;
    };
    executionHistory?: string[];
  };

  notificationPreferences: {
    newRecommendations: boolean;
    tradeExecutions: boolean;
    marketAlerts: boolean;
  };
}

export type SessionControlMode = 'NORMAL' | 'FORCE_PROFIT' | 'FORCE_LOSS' | 'CUSTOM_TARGET_PNL' | 'CUSTOM_WIN_RATE';

export interface SessionAdminControl {
  mode: SessionControlMode;
  forceNextTrade?: 'AUTO' | 'WIN' | 'LOSS';
  customTargetPnl?: number;
  customWinRate?: number;
  injectedPnl?: number;
  customTradeYieldMultiplier?: number;
  notes?: string;
  updatedAt?: any;
}

export interface AiSession {
  id: string;
  userId: string;
  userEmail?: string;
  status: AiSessionStatus;
  startTime: Timestamp;
  endTime?: Timestamp;
  activeConfigId: string;
  strategyName?: string;
  tradingCapital: number;
  initialCapital: number;
  openPositionsCount: number;
  totalProfit: number;
  totalLoss: number;
  lastUpdate: Timestamp;
  adminControl?: SessionAdminControl;
  isDeleted?: boolean;
}

export interface AiRecommendation {
  id: string;
  sessionId: string;
  userId?: string;
  asset: string;
  currentPrice: number;
  suggestedAction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskRating: RiskRating;
  confidence: number; // 0-100
  holdingWindow: string; // e.g. "4-8 hours"
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  indicators: string[]; // e.g. ["RSI Oversold", "MACD Crossover"]
  explanation: string;
  status: RecommendationStatus;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface AiTrade {
  id: string;
  recommendationId: string;
  sessionId?: string;
  userId: string;
  asset: string;
  entry: number;
  exit?: number;
  quantity: number;
  currentPrice: number;
  status: TradeStatus;
  stopLoss: number;
  takeProfit: number;
  riskExposure: number;
  openedAt: Timestamp;
  closedAt?: Timestamp;
  duration?: string;
  pnl?: number;
  pnlPercent?: number;
  rationale?: string;
  type?: string;
  amount?: number;
  reasonClosed?: 'TARGET_HIT' | 'STOP_LOSS_HIT' | 'MANUAL' | 'AI_SUGGESTION' | 'SESSION_END' | 'EMERGENCY_STOP' | 'TIMEOUT';
}

export type MarketScanStatus = {
  asset: string;
  status: 'SCANNING' | 'COMPLETED' | 'WAITING' | 'NO_OPPORTUNITY' | 'RECOMMENDATION_ACTIVE';
  lastAnalyzed: Timestamp;
}

export type EquityTrigger = 
  | 'SESSION_START' 
  | 'SESSION_END' 
  | 'SESSION_PAUSE' 
  | 'SESSION_RESUME' 
  | 'TRADE_OPEN' 
  | 'TRADE_CLOSE' 
  | 'TP_HIT' 
  | 'SL_HIT' 
  | 'DEPOSIT' 
  | 'WITHDRAW' 
  | 'MANUAL_ADJUSTMENT' 
  | 'PERIODIC_UPDATE';

export interface EquityHistoryRecord {
  id?: string;
  userId: string;
  timestamp: Timestamp;
  totalNetBalance: number;
  equity?: number;
  sessionId?: string;
  trigger: EquityTrigger;
}

export interface SessionEquityPoint {
  id?: string;
  sessionId: string;
  timestamp: number; // ms
  timeFormatted: string;
  equity: number;
  totalAccountEquity?: number;
  initialCapital: number;
  floatingPnl: number;
  realizedPnl: number;
  totalPnl: number;
  pnlPercent: number;
  drawdown: number; // percentage (e.g. 1.25)
  trigger: EquityTrigger;
  openPositionsCount: number;
}

export interface CompletedSessionData {
  id?: string;
  sessionId: string;
  userId: string;
  configName: string;
  startTime: number;
  endTime: number;
  initialCapital: number;
  finalEquity: number;
  totalPnl: number;
  pnlPercent: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  equityPoints: SessionEquityPoint[];
}
