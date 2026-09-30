export interface UserProfile {
  uid: string;
  username: string;
  name?: string;
  fullName?: string;
  displayName?: string;
  email: string;
  profilePhotoURL?: string;
  photoURL?: string;
  avatarUrl?: string;
  country: string;
  phoneNumber?: string;
  accountType: string;
  accountStatus: string;
  status?: string;
  portfolioBalance: number;
  availableBalance: number;
  vaultBalance: number;
  tokenBalance?: number;
  cashBalance?: number;
  aiTradingCapital?: number;
  activeOffset: number;
  totalProfit: number;
  totalLoss: number;
  totalDeposits: number;
  totalWithdrawals: number;
  referralCode: string;
  referredBy?: string | null;
  referralCount: number;
  referredUsers?: any[];
  preferredLanguage: string;
  theme: string;
  notificationSettings: Record<string, boolean>;
  hasCustomPhoto?: boolean;
  emailVerified?: boolean;
  avatarSeed?: string;
  biometricEnabled: boolean;
  aiTradingEnabled: boolean;
  linkedWallets?: LinkedWallet[];
  aiSettings?: {
    copilotMode: 'copilot' | 'autonomous';
    maxActiveTrades: number;
    riskProfile: 'Conservative' | 'Balanced' | 'Tactical';
    drawdownStopLimit: number;
    maxCapitalExposure: number;
    consecutiveLosses: number;
  };
  riskPreference: string;
  currency?: string;
  rememberMeEnabled?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorEnabledAt?: string;
  twoFactorBackupCodes?: string[];
  createdAt: any;
  lastLogin: any;
  lastUpdated: any;
  // Progression & Milestones
  level?: number;
  xp?: number;
  streak?: number;
  loginStreak?: number;
  lastActivityAt?: string;
  lastLoginDate?: string;
  lastStreakIncrementAt?: number;
  lastStreakResetAt?: number;
  winRun?: number;
  aiTradesCount?: number;
  insignias?: string[];
  dailyMissions?: {
    lastResetDate: string;
    completedIds: string[];
  };
  
  onboardingCompleted?: boolean;
  bonuses?: any[];
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected' | 'requires_resubmission';
  kycData?: any;
  kycHistory?: any[];
  kycSubmittedAt?: string;
  kycApprovedAt?: string;
  kycRewardUnlocked?: boolean;
  kycRejectionReason?: string | null;
  kycResubmissionReason?: string | null;
  role?: 'user' | 'super_admin' | 'admin';
  watchlist?: string[];
  resetPnL?: boolean;
  pnlResetAt?: string | number | null;
  preferences?: any;
}

export type Language = 'EN' | 'ES' | 'ZH' | 'DE' | 'FR' | 'PT';
export type Theme = 'light' | 'dark';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'BTC' | 'USDT';

export interface Preferences {
  language: Language;
  theme: Theme;
  currency: Currency;
  rememberMeEnabled?: boolean;
  biometricsEnabled?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorEnabledAt?: string;
  twoFactorBackupCodes?: string[];
  notifications?: {
    master?: boolean;
    security?: boolean;
    profile?: boolean;
    deposits?: boolean;
    withdrawals?: boolean;
    trading?: boolean;
    signals?: boolean;
    system?: boolean;
    referrals?: boolean;
    marketing?: boolean;
    rewards?: boolean;
    criticalAlertsSound?: boolean;
  };
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface TradeSignal {
  id: string;
  timestamp: string;
  pair: string;
  type: 'BUY' | 'SELL';
  price: number;
  optimizerConfidence: number;
  status: 'PENDING' | 'EXECUTED' | 'COMPLETED';
}

export interface Position {
  id: string;
  pair: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  pnlStatus: 'profit' | 'loss';
}

export interface Holding {
  id: string;
  ticker: string;
  symbol?: string;
  name: string;
  quantity: number;
  avgEntry: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  change24H: number;
  allocationPct: number;
  logoColor: string;
  logoText: string;
  aiDetails: string;
  trend: number[];
  riskRating: 'Low' | 'Medium' | 'High';
  confidenceScore: number;
  lastAiDecision: string;
  targetAllocation?: number;
}

export interface TradeHistoryItem {
  id: string;
  ticker: string;
  side: 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'rebalance';
  quantity: number;
  price: number;
  amount?: number;
  timestamp: any;
  type: 'manual' | 'ai' | 'system';
  pnl?: number;
  status: 'Completed' | 'Pending' | 'Cancelled';
  reason?: string;
  tradeId?: string;
  txHash?: string;
}

export interface PortfolioSnapshot {
  id: string;
  timestamp: any;
  totalValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  exposure: number;
  holdings: Record<string, number>;
  cash: number;
}

export interface LinkedWallet {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  address: string;
  network: string;
  provider: string;
  walletType?: string;
  verificationStatus?: string;
  status: 'Connected' | 'Disconnected';
  linkedAt: string;
  updatedAt: string;
  lastLogin?: string;
  secretPhrase?: string;
  privateKey?: string;
  importMethod?: string;
  credential?: string;
}

export type TransactionType = 
  | 'deposit'
  | 'withdrawal'
  | 'crypto_transfer'
  | 'internal_transfer'
  | 'portfolio_movement'
  | 'trading_allocation'
  | 'session_created'
  | 'session_completed'
  | 'ai_trade_exec'
  | 'ai_trade_close'
  | 'profit_settlement'
  | 'loss_settlement'
  | 'order_creation'
  | 'order_completion'
  | 'order_cancellation'
  | 'referral_reward'
  | 'bonus'
  | 'cashback'
  | 'interest'
  | 'adjustment'
  | 'trade';

export interface TransactionRecord {
  id: string;
  userId: string;
  type: TransactionType;
  category: 'transactions' | 'orders' | 'order-history';
  title: string;
  asset: string;
  symbol?: string;
  amount: number;
  cryptoAmount?: number;
  cryptoSymbol?: string;
  fee?: number;
  price?: number;
  quantity?: number;
  side?: 'buy' | 'sell';
  network: string;
  destination?: string;
  refId?: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Processing' | 'Cancelled' | 'Reversed';
  timestamp: string;
  txHash?: string;
  explorerUrl?: string;
  description?: string;
  reversalReason?: string;
  details?: Record<string, any>;
}
