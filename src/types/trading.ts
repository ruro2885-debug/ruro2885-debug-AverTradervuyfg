
export interface TradingEngineConfig {
  userId: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  maxAllocation: number;
  leverage: number;
  takeProfitPct: number;
  stopLossPct: number;
  rebalanceFrequency: 'Daily' | 'Weekly' | 'Monthly';
  autoCompound: boolean;
  trailingStop: boolean;
  assetPreference: string[];
  tradingSchedule: string;
  maxConcurrentTrades: number;
  newsFilter: boolean;
  volatilityFilter: boolean;
  copyTradingSource: string;
  status: 'Idle' | 'Configuration Missing' | 'Ready' | 'Analyzing' | 'Opening Position' | 'Monitoring Position' | 'Rebalancing' | 'Taking Profit' | 'Stop Loss Triggered' | 'Closing Position' | 'Paused' | 'Maintenance' | 'Disconnected' | 'Completed Cycle';
  lastUpdated: string;
  version: string;
}

export interface Position {
  id: string;
  userId: string;
  ticker: string;
  entryPrice: number;
  quantity: number;
  status: 'Open' | 'Closed';
  side: 'Buy' | 'Sell';
  createdAt: string;
}

export interface Trade {
  id: string;
  userId: string;
  ticker: string;
  side: 'Buy' | 'Sell';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  status: 'Open' | 'Closed' | 'TakeProfit' | 'StopLoss';
  createdAt: string;
  closedAt?: string;
  pnl?: number;
  type?: string; // Rebalance, etc
}

export interface ActivityEvent {
  id: string;
  userId: string;
  type: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TraderProfile {
  id: string;
  rank: number;
  username: string;
  avatar: string;
  return30d: number;
  overallReturn: number;
  winRate: number;
  lossRate: number;
  strategy: string;
  verified: boolean;
  followers: number;
  riskRating: 'Low' | 'Medium' | 'High';
  equityCurve: number[];
}
