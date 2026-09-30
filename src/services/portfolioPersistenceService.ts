import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth, safeSetDoc } from '../lib/firebase';
import { safeStorage } from '../utils/storage';
import { walletService } from './walletService';

export interface PortfolioMetricsState {
  totalValue: number;
  todayPnL: number;
  todayPnLPercent: number;
  overallReturn: number;
  realizedPnL: number;
  unrealizedPnL: number;
  healthScore: number;
  diversificationScore: number;
  volatility: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  recoveryFactor: number;
  riskAdjustedReturn: number;
}

export interface WalletState {
  portfolioBalance: number;
  availableBalance: number;
  vaultBalance: number;
  activeOffset: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalProfit: number;
  totalLoss: number;
  tokenBalance: number;
  aiTradingCapital?: number;
}

export interface SessionDetailsState {
  sessionId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'IDLE';
  marketsScanned: string[];
  activeConfigId: string | null;
  startTime: string | null;
  engineState: string;
  cpuUsage: number;
  memoryUsage: number;
  latencyMs: number;
}

export interface CommandCenterState {
  activeConfigId: string | null;
  aiSettings: any;
  riskProfile: string;
  copilotMode: string;
  maxActiveTrades: number;
  drawdownStopLimit: number;
  maxCapitalExposure: number;
}

export interface PartialPortfolioCurrentState {
  portfolioMetrics?: Partial<PortfolioMetricsState>;
  walletState?: Partial<WalletState>;
  sessionDetails?: Partial<SessionDetailsState>;
  commandCenter?: Partial<CommandCenterState>;
  lastUpdated?: string;
}

export interface PortfolioCurrentState {
  portfolioMetrics: PortfolioMetricsState;
  walletState: WalletState;
  sessionDetails: SessionDetailsState;
  commandCenter: CommandCenterState;
  lastUpdated: string;
}

const DEFAULT_PORTFOLIO_CURRENT: PortfolioCurrentState = {
  portfolioMetrics: {
    totalValue: 0,
    todayPnL: 0,
    todayPnLPercent: 0,
    overallReturn: 0,
    realizedPnL: 0,
    unrealizedPnL: 0,
    healthScore: 98,
    diversificationScore: 85,
    volatility: 1.2,
    sharpeRatio: 2.4,
    winRate: 78.5,
    maxDrawdown: 3.2,
    recoveryFactor: 4.1,
    riskAdjustedReturn: 18.4
  },
  walletState: {
    portfolioBalance: 0,
    availableBalance: 0,
    vaultBalance: 0,
    activeOffset: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalProfit: 0,
    totalLoss: 0,
    tokenBalance: 0
  },
  sessionDetails: {
    sessionId: null,
    status: 'INACTIVE',
    marketsScanned: ['BTC', 'ETH', 'SOL'],
    activeConfigId: null,
    startTime: null,
    engineState: 'IDLE',
    cpuUsage: 0,
    memoryUsage: 0,
    latencyMs: 12
  },
  commandCenter: {
    activeConfigId: 'cfg_default',
    aiSettings: {
      copilotMode: 'copilot',
      maxActiveTrades: 3,
      riskProfile: 'Balanced',
      drawdownStopLimit: 2.5,
      maxCapitalExposure: 40,
      consecutiveLosses: 0
    },
    riskProfile: 'Balanced',
    copilotMode: 'copilot',
    maxActiveTrades: 3,
    drawdownStopLimit: 2.5,
    maxCapitalExposure: 40
  },
  lastUpdated: new Date().toISOString()
};

function getStorageKey(userId: string) {
  return `aver_portfolio_current_${userId}`;
}

export const portfolioPersistenceService = {
  getLocalStorageState(userId: string): PortfolioCurrentState | null {
    try {
      const raw = safeStorage.getItem(getStorageKey(userId));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setLocalStorageState(userId: string, state: PortfolioCurrentState): void {
    try {
      safeStorage.setItem(getStorageKey(userId), JSON.stringify(state));
    } catch (e) {
      console.warn('[portfolioPersistenceService] localStorage set error:', e);
    }
  },

  async getPortfolioCurrent(userId: string): Promise<PortfolioCurrentState> {
    const cached = this.getLocalStorageState(userId);
    if (userId.startsWith('local-')) {
      return cached || DEFAULT_PORTFOLIO_CURRENT;
    }

    try {
      const docRef = doc(db, 'users', userId, 'portfolio', 'current');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as PortfolioCurrentState;
        const merged: PortfolioCurrentState = {
          ...DEFAULT_PORTFOLIO_CURRENT,
          ...data,
          portfolioMetrics: { ...DEFAULT_PORTFOLIO_CURRENT.portfolioMetrics, ...data.portfolioMetrics },
          walletState: { ...DEFAULT_PORTFOLIO_CURRENT.walletState, ...data.walletState },
          sessionDetails: { ...DEFAULT_PORTFOLIO_CURRENT.sessionDetails, ...data.sessionDetails },
          commandCenter: { ...DEFAULT_PORTFOLIO_CURRENT.commandCenter, ...data.commandCenter }
        };
        this.setLocalStorageState(userId, merged);
        return merged;
      }
    } catch (error) {
      console.warn('[portfolioPersistenceService] getDoc failed or restricted, falling back to local cache:', error);
    }

    return cached || DEFAULT_PORTFOLIO_CURRENT;
  },

  async savePortfolioCurrent(userId: string, state: PartialPortfolioCurrentState): Promise<PortfolioCurrentState> {
    const existing = (await this.getPortfolioCurrent(userId)) || DEFAULT_PORTFOLIO_CURRENT;
    
    const updated: PortfolioCurrentState = {
      portfolioMetrics: {
        ...existing.portfolioMetrics,
        ...(state.portfolioMetrics || {})
      },
      walletState: {
        ...existing.walletState,
        ...(state.walletState || {})
      },
      sessionDetails: {
        ...existing.sessionDetails,
        ...(state.sessionDetails || {})
      },
      commandCenter: {
        ...existing.commandCenter,
        ...(state.commandCenter || {})
      },
      lastUpdated: new Date().toISOString()
    };

    // Save to local storage cache immediately
    this.setLocalStorageState(userId, updated);

    // Dispatch event for real-time local subscription updates!
    window.dispatchEvent(new Event('aver_user_updated'));

    // Save to Firestore write-through if authenticated user
    if (!userId.startsWith('local-')) {
      try {
        const docRef = doc(db, 'users', userId, 'portfolio', 'current');
        await safeSetDoc(docRef, {
          ...updated,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Note: Removed redundant top-level user doc and dedicated wallet doc updates 
        // to conserve Firestore write quota. These are updated by dedicated service calls
        // when actual core data (like balance) changes.
      } catch (error) {
        console.warn('[portfolioPersistenceService] Firestore write failed:', error);
      }
    }

    return updated;
  },

  async updateWalletState(userId: string, walletUpdates: Partial<WalletState>): Promise<PortfolioCurrentState> {
    return this.savePortfolioCurrent(userId, { walletState: walletUpdates as WalletState });
  },

  async updatePortfolioMetrics(userId: string, metricsUpdates: Partial<PortfolioMetricsState>): Promise<PortfolioCurrentState> {
    return this.savePortfolioCurrent(userId, { portfolioMetrics: metricsUpdates as PortfolioMetricsState });
  },

  async updateSessionDetails(userId: string, sessionUpdates: Partial<SessionDetailsState>): Promise<PortfolioCurrentState> {
    return this.savePortfolioCurrent(userId, { sessionDetails: sessionUpdates as SessionDetailsState });
  },

  async updateCommandCenter(userId: string, commandCenterUpdates: Partial<CommandCenterState>): Promise<PortfolioCurrentState> {
    return this.savePortfolioCurrent(userId, { commandCenter: commandCenterUpdates as CommandCenterState });
  },

  subscribePortfolioCurrent(userId: string, callback: (state: PortfolioCurrentState) => void): () => void {
    if (userId.startsWith('local-')) {
      const state = this.getLocalStorageState(userId) || DEFAULT_PORTFOLIO_CURRENT;
      callback(state);
      
      const handleUpdate = () => {
        const fresh = this.getLocalStorageState(userId) || DEFAULT_PORTFOLIO_CURRENT;
        callback(fresh);
      };
      window.addEventListener('aver_user_updated', handleUpdate);
      window.addEventListener('storage', handleUpdate);
      return () => {
        window.removeEventListener('aver_user_updated', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      };
    }

    const docRef = doc(db, 'users', userId, 'portfolio', 'current');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PortfolioCurrentState;
        const merged: PortfolioCurrentState = {
          ...DEFAULT_PORTFOLIO_CURRENT,
          ...data,
          portfolioMetrics: { ...DEFAULT_PORTFOLIO_CURRENT.portfolioMetrics, ...data.portfolioMetrics },
          walletState: { ...DEFAULT_PORTFOLIO_CURRENT.walletState, ...data.walletState },
          sessionDetails: { ...DEFAULT_PORTFOLIO_CURRENT.sessionDetails, ...data.sessionDetails },
          commandCenter: { ...DEFAULT_PORTFOLIO_CURRENT.commandCenter, ...data.commandCenter }
        };
        this.setLocalStorageState(userId, merged);
        callback(merged);
      } else {
        const cached = this.getLocalStorageState(userId) || DEFAULT_PORTFOLIO_CURRENT;
        callback(cached);
      }
    }, (error) => {
      console.warn('[portfolioPersistenceService] Snapshot error, using local state:', error);
      const cached = this.getLocalStorageState(userId) || DEFAULT_PORTFOLIO_CURRENT;
      callback(cached);
    });
  }
};
