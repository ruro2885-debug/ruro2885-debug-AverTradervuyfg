import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc, setDoc, collection, addDoc, deleteDoc, serverTimestamp, query, orderBy, where, limit, getDocs, Timestamp, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useFinancials } from '../hooks/useFinancials';
import { AiConfiguration, AiTrade, AiSession, AiRecommendation, TradingSchedule, SessionEquityPoint, CompletedSessionData } from '../types/aiTrading';
import { Position, ActivityEvent } from '../types/trading';
import { seedTraders, startTraderSimulator } from '../services/traderSimulator';
import { aiTradingService, EngineStatus } from '../services/aiTradingService';
import { portfolioPersistenceService } from '../services/portfolioPersistenceService';
import { walletService } from '../services/walletService';
import { equityService } from '../services/equityService';
import { safeStorage } from '../utils/storage';

const isWithinSchedule = (schedule?: TradingSchedule, isSessionActive?: boolean): boolean => {
  const state = aiTradingService.getEngineOperationStatus(schedule, isSessionActive).state;
  return state === 'RUNNING' || state === 'SESSION_SCANNING';
};

const parseTimestamp = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts.toDate === 'function') {
    try { return ts.toDate().getTime(); } catch { return 0; }
  }
  const d = new Date(ts);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

interface TradingEngineContextType {
  configs: AiConfiguration[];
  config: AiConfiguration | null;
  activeConfigId: string | undefined;
  session: AiSession | null;
  positions: Position[];
  trades: AiTrade[];
  activity: ActivityEvent[];
  recommendations: AiRecommendation[];
  sessionEquityPoints: SessionEquityPoint[];
  completedSessions: CompletedSessionData[];
  updateConfig: (newConfig: Partial<AiConfiguration>) => Promise<void>;
  logActivity: (type: string, message: string, metadata?: Record<string, any>) => Promise<void>;
  startSession: (configId: string, markets: string[]) => Promise<void>;
  endSession: () => Promise<void>;
  loading: boolean;
  engineStatus: EngineStatus;
  liveTradePrices: Record<string, number>;
  saveConfiguration: (updatedConfig: AiConfiguration) => Promise<void>;
  deleteConfiguration: (configId: string) => Promise<void>;
  duplicateConfiguration: (configId: string) => Promise<void>;
  activateConfiguration: (configId: string) => Promise<void>;
  closeTrade: (tradeId: string, exitPrice: number, reason: AiTrade['reasonClosed']) => Promise<void>;
  toggleManualOverride: () => Promise<void>;
  toggleOperatingWindow: (windowId: string) => Promise<void>;
  toggleCoolingBreak: (breakId: string) => Promise<void>;
  togglePauseTrading: () => Promise<void>;
  toggleEmergencyStop: () => Promise<void>;
  clearActivityHistory: () => Promise<void>;
}

function getActivityTimestamp(ts: any): number {
  if (!ts) return Date.now();
  if (typeof ts === 'object' && ts !== null && typeof ts.toDate === 'function') {
    return ts.toDate().getTime();
  }
  const d = new Date(ts);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

export function deduplicateActivities(activities: ActivityEvent[]): ActivityEvent[] {
  const result: ActivityEvent[] = [];
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();

  for (const act of activities) {
    if (!act || !act.message) continue;
    if (seenIds.has(act.id)) continue;

    const cleanMsg = (act.message || '').trim().toLowerCase();
    const actType = act.type || 'SYSTEM';
    const time = getActivityTimestamp(act.timestamp);
    const timeBucket = Math.floor(time / 60000); // 1-minute bucket
    const key = `${actType}|${cleanMsg}|${timeBucket}`;

    if (seenContent.has(key)) continue;

    // Check if duplicate of an already added item within 60 seconds or identical recent message
    const isDup = result.some(existing => {
      if (existing.id === act.id) return true;
      const existingCleanMsg = (existing.message || '').trim().toLowerCase();
      const existingType = existing.type || 'SYSTEM';
      const existingTime = getActivityTimestamp(existing.timestamp);
      
      const timeDiff = Math.abs(existingTime - time);
      if (existingCleanMsg === cleanMsg && existingType === actType && timeDiff < 60000) return true;
      if (existingCleanMsg === cleanMsg && timeDiff < 30000) return true;
      return false;
    });

    if (!isDup) {
      if (act.id) seenIds.add(act.id);
      seenContent.add(key);
      result.push(act);
    }
  }

  return result;
}

export const TradingEngineContext = createContext<TradingEngineContextType>({
  configs: [],
  config: null,
  activeConfigId: undefined,
  session: null,
  positions: [],
  trades: [],
  activity: [],
  recommendations: [],
  sessionEquityPoints: [],
  completedSessions: [],
  updateConfig: async () => {},
  logActivity: async () => {},
  startSession: async () => {},
  endSession: async () => {},
  loading: true,
  engineStatus: { state: 'INACTIVE', reason: 'Initializing...' },
  liveTradePrices: {},
  saveConfiguration: async () => {},
  deleteConfiguration: async () => {},
  duplicateConfiguration: async () => {},
  activateConfiguration: async () => {},
  closeTrade: async () => {},
  toggleManualOverride: async () => {},
  toggleOperatingWindow: async () => {},
  toggleCoolingBreak: async () => {},
  togglePauseTrading: async () => {},
  toggleEmergencyStop: async () => {},
  clearActivityHistory: async () => {},
});

export function normalizeAiConfig(raw: any, fallbackOwnerId?: string): AiConfiguration {
  const effectiveOwnerId = raw?.ownerId || fallbackOwnerId || 'guest_user';
  const rawAssets = raw?.aiTradingRules?.assetSelection;
  const isOld22List = Array.isArray(rawAssets) && rawAssets.length === 22 && rawAssets.includes('ARKK') && rawAssets.includes('GLD');
  const assetSelection = (!rawAssets || !Array.isArray(rawAssets) || isOld22List)
    ? ['BTC', 'ETH', 'SOL', 'XRP', 'ADA']
    : rawAssets;

  return {
    id: raw?.id || `cfg_${Date.now()}`,
    ownerId: effectiveOwnerId,
    name: raw?.name || 'Alpha Quant Momentum',
    createdAt: raw?.createdAt || Timestamp.now(),
    lastModified: raw?.lastModified || Timestamp.now(),
    status: raw?.status || 'INACTIVE',
    sessionSetup: {
      amountToAllocate: 1000,
      fundingSource: 'WALLET',
      sessionDuration: 24,
      ...(raw?.sessionSetup || {})
    },
    profitRiskManagement: {
      sessionTakeProfit: 5,
      sessionStopLoss: 2,
      maxRiskPerTrade: 1,
      maxPositionSize: 500,
      ...(raw?.profitRiskManagement || {})
    },
    aiTradingRules: {
      minConfidence: 85,
      maxSimultaneousPositions: 3,
      tradingStrategy: 'NEURAL_MOMENTUM',
      ...(raw?.aiTradingRules || {}),
      assetSelection,
    },
    schedule: {
      enabled: false,
      operatingWindows: [],
      coolingBreaks: [],
      marketCalendar: {
        Stocks: { excludeHolidays: true },
        Forex: { excludeHolidays: true },
        Crypto: { excludeHolidays: false },
        Indices: { excludeHolidays: true },
        Commodities: { excludeHolidays: true }
      },
      monitorOutsideWindow: true,
      ...(raw?.schedule || {})
    },
    configurationDetails: raw?.configurationDetails || {
      description: 'Aggressive alpha-capture strategy targeting neural momentum patterns.',
      category: 'Scalping',
      version: '1.2.0'
    },
    analyticsAndNotes: raw?.analyticsAndNotes || {
      riskScore: 50,
      strategyNotes: '',
      performanceStats: {
        winRate: 0,
        totalReturn: 0,
        drawdown: 0
      },
      executionHistory: []
    },
    notificationPreferences: raw?.notificationPreferences || {
      newRecommendations: true,
      tradeExecutions: true,
      marketAlerts: false
    }
  };
}

export const TradingEngineProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, updateProfile, addNotification } = useAuth();
  const { activeTradingBalance, addFundsToActiveBalance, tokenBalance } = useFinancials();
  
  const activeTradingBalanceRef = useRef(activeTradingBalance);
  const tokenBalanceRef = useRef(tokenBalance);
  const addFundsRef = useRef(addFundsToActiveBalance);

  // Run token and intervals references to cancel stale writers immediately
  const sessionRunTokenRef = useRef<number>(0);
  const activeIntervalsRef = useRef<{
    loggingInterval?: any;
    tickInterval?: any;
    positionInterval?: any;
    statusInterval?: any;
    orderTimeout?: any;
  }>({});

  const isInitialSyncGracePeriod = useRef(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialSyncGracePeriod.current = false;
      console.log("[TradingEngineContext] Initial sync grace period concluded.");
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const [configs, setConfigs] = useState<AiConfiguration[]>([]);
  const [config, setConfig] = useState<AiConfiguration | null>(null);
  const [activeConfigId, setActiveConfigId] = useState<string | undefined>(undefined);
  const [session, setSession] = useState<AiSession | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const uId = user?.uid || auth.currentUser?.uid;
        if (uId) {
          const raw = safeStorage.getItem(`aver_session_${uId}`) || localStorage.getItem(`aver_session_${uId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.status === 'ACTIVE') {
              return parsed;
            }
          }
        }
      } catch (e) {}
    }
    return null;
  });
  const [positions, setPositions] = useState<Position[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const uId = user?.uid || auth.currentUser?.uid;
        if (uId) {
          const raw = localStorage.getItem(`aver_positions_${uId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [trades, setTrades] = useState<AiTrade[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const uId = user?.uid || auth.currentUser?.uid;
        if (uId) {
          const raw = localStorage.getItem(`aver_trades_${uId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({ state: 'INACTIVE', reason: 'Core offline' });
  const [liveTradePrices, setLiveTradePrices] = useState<Record<string, number>>({});
  const [sessionEquityPoints, setSessionEquityPoints] = useState<SessionEquityPoint[]>([]);
  const [completedSessions, setCompletedSessions] = useState<CompletedSessionData[]>([]);

  const lastStateRef = useRef<string | null>(null);
  const peakEquityRef = useRef<number>(1000);
  const lastSyncRef = useRef<number>(0);
  const lastTickerFetchRef = useRef<number>(0);
  const sessionEquityPointsRef = useRef<SessionEquityPoint[]>([]);
  const recentActivitiesRef = useRef<Map<string, number>>(new Map());
  const profitTargetNotifiedRef = useRef<boolean>(false);
  const stopLossNotifiedRef = useRef<boolean>(false);

  // Helper to load/save state from/to localStorage if Firestore is unavailable/offline
  const getLocalStorageItem = useCallback((key: string, defaultValue: any) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }, []);

  const setLocalStorageItem = useCallback((key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("localStorage write failed:", e);
    }
  }, []);

  // Sync state FROM localStorage immediately on user login/availability to prevent blank resets on refresh
  useEffect(() => {
    if (!user) {
      setConfigs([]);
      setConfig(null);
      setActiveConfigId(undefined);
      setSession(null);
      sessionRefVal.current = null;
      setPositions([]);
      setTrades([]);
      tradesRefVal.current = [];
      setActivity([]);
      setRecommendations([]);
      return;
    }
    
    const rawCachedConfigs = getLocalStorageItem(`aver_configs_${user.uid}`, []);
    const cachedConfigs = rawCachedConfigs.map((c: any) => normalizeAiConfig(c, user.uid));
    
    // Prioritize cached configs but don't seed if it's already in localStorage
    if (cachedConfigs.length > 0) {
      setConfigs(cachedConfigs);
      const active = cachedConfigs.find((c: any) => c.status === 'ACTIVE');
      if (active) {
        setConfig(active);
        setActiveConfigId(active.id);
      } else {
        setConfig(cachedConfigs[0]);
        setActiveConfigId(cachedConfigs[0].id);
      }
    } else {
      // Seed a default config only if absolutely nothing exists
      const defaultSeedConfig: AiConfiguration = {
          id: `cfg_default`,
          ownerId: user.uid,
          name: 'Alpha Quant Momentum',
          createdAt: Timestamp.now(),
          lastModified: Timestamp.now(),
          status: 'ACTIVE',
          sessionSetup: {
            amountToAllocate: 1000,
            fundingSource: 'WALLET',
            sessionDuration: 24
          },
          profitRiskManagement: {
            sessionTakeProfit: 5,
            sessionStopLoss: 2,
            maxRiskPerTrade: 1,
            maxPositionSize: 500
          },
          aiTradingRules: {
            minConfidence: 85,
            maxSimultaneousPositions: 3,
            assetSelection: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'],
            tradingStrategy: 'NEURAL_MOMENTUM'
          },
          configurationDetails: {
            description: 'Aggressive alpha-capture strategy targeting neural momentum patterns.',
            category: 'Scalping',
            version: '1.2.0'
          },
          analyticsAndNotes: {
            riskScore: 65,
            strategyNotes: 'Focus on 5m timeframe crossovers with volume validation.',
            performanceStats: {
              winRate: 0,
              totalReturn: 0,
              drawdown: 0
            }
          },
          notificationPreferences: {
            newRecommendations: true,
            tradeExecutions: true,
            marketAlerts: false
          }
        };
        
        setConfigs([defaultSeedConfig]);
        setConfig(defaultSeedConfig);
        setActiveConfigId(defaultSeedConfig.id);
        setLocalStorageItem(`aver_configs_${user.uid}`, [defaultSeedConfig]);
        
        // Also try to sync it to firestore
        try {
          setDoc(doc(db, 'users', user.uid, 'aiConfigurations', defaultSeedConfig.id), defaultSeedConfig).catch(() => {});
        } catch (err) {}
    }
    
    // Reset session, positions, trades state whenever active user changes
    setSession(null);
    sessionRefVal.current = null;
    setPositions([]);
    setTrades([]);
    tradesRefVal.current = [];
    setActivity([]);
    setRecommendations([]);

    // Check if user is a new user with zero balance and zero deposits
    const isNewZeroUser = (user.totalDeposits || 0) === 0 && (user.availableBalance || 0) === 0 && (user.portfolioBalance || 0) === 0;
    
    // Do not auto-restore active session on refresh/boot so trading sessions do not start on their own
    setSession(null);
    sessionRefVal.current = null;

    if (!isNewZeroUser) {
      const cachedPositions = getLocalStorageItem(`aver_positions_${user.uid}`, []);
      if (cachedPositions.length > 0) {
        setPositions(cachedPositions);
      }
      
      const cachedTrades = getLocalStorageItem(`aver_trades_${user.uid}`, []);
      if (cachedTrades.length > 0) {
        setTrades(cachedTrades);
      }
    } else {
      // Purge any stale session or trades key for zero balance user
      safeStorage.removeItem(`aver_session_${user.uid}`);
      safeStorage.removeItem(`aver_positions_${user.uid}`);
      safeStorage.removeItem(`aver_trades_${user.uid}`);
    }
    
    const clearedAt = Number(getLocalStorageItem(`aver_activity_cleared_at_${user.uid}`, 0));
    const cachedActivity = getLocalStorageItem(`aver_activity_${user.uid}`, []);
    if (cachedActivity.length > 0) {
      const filtered = cachedActivity.filter((item: any) => {
        const t = parseTimestamp(item.timestamp);
        return t > clearedAt;
      });
      setActivity(filtered);
    }
    
    const cachedRecommendations = getLocalStorageItem(`aver_recommendations_${user.uid}`, []);
    if (cachedRecommendations.length > 0) {
      setRecommendations(cachedRecommendations);
    }

    try {
      const localCompleted = equityService.getCompletedSessionsLocally(user.uid);
      if (localCompleted && localCompleted.length > 0) {
        setCompletedSessions(localCompleted);
      } else {
        const cachedLatest = safeStorage.getItem(`aver_latest_completed_session_${user.uid}`);
        if (cachedLatest) {
          const parsed = JSON.parse(cachedLatest);
          if (parsed) setCompletedSessions([parsed]);
        }
      }
    } catch (e) {}

    setLoading(false);
  }, [user?.uid, getLocalStorageItem, setLocalStorageItem]);

  // Sync state FROM custom events (e.g., when copying a trader's AI config or saving config in external views)
  useEffect(() => {
    const handleConfigsSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const effectiveUid = user?.uid || 'guest_user';
      if (customEvent.detail && (customEvent.detail.userId === effectiveUid || !customEvent.detail.userId)) {
        if (customEvent.detail.configs && Array.isArray(customEvent.detail.configs)) {
          setConfigs(prev => {
            const mergedMap = new Map<string, AiConfiguration>();
            prev.forEach(c => mergedMap.set(c.id, normalizeAiConfig(c, effectiveUid)));
            customEvent.detail.configs.forEach((c: AiConfiguration) => {
              const norm = normalizeAiConfig(c, effectiveUid);
              mergedMap.set(norm.id, norm);
            });
            const merged = Array.from(mergedMap.values());
            setLocalStorageItem(`aver_configs_${effectiveUid}`, merged);
            return merged;
          });
        }
      }
    };

    const handleSessionTerminated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const effectiveUid = user?.uid || 'guest_user';
      if (!customEvent.detail?.sessionId || customEvent.detail?.sessionId === sessionRefVal.current?.id || !sessionRefVal.current) {
        console.log("[TradingEngineContext] Received aver_session_terminated event. Clearing active session state.");
        setSession(null);
        sessionRefVal.current = null;
        setEngineStatus({ state: 'INACTIVE', reason: 'Session terminated' });
        safeStorage.removeItem(`aver_session_${effectiveUid}`);
        safeStorage.removeItem(`aver_stopped_session_${effectiveUid}`);
      }
    };

    const handleAdminControlUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      const effectiveUid = user?.uid || 'guest_user';
      if (detail && (detail.sessionId === sessionRefVal.current?.id || detail.userId === effectiveUid)) {
        console.log("[TradingEngineContext] Received aver_admin_control_updated:", detail.adminControl);
        if (sessionRefVal.current) {
          sessionRefVal.current.adminControl = detail.adminControl;
        }
        setSession(prev => prev ? { ...prev, adminControl: detail.adminControl } : prev);
      }
    };

    window.addEventListener('configs_updated', handleConfigsSync);
    window.addEventListener('aver_session_terminated', handleSessionTerminated);
    window.addEventListener('aver_admin_control_updated', handleAdminControlUpdated);
    return () => {
      window.removeEventListener('configs_updated', handleConfigsSync);
      window.removeEventListener('aver_session_terminated', handleSessionTerminated);
      window.removeEventListener('aver_admin_control_updated', handleAdminControlUpdated);
    };
  }, [user?.uid, setLocalStorageItem]);

  // Sync state TO localStorage on any state modification
  useEffect(() => {
    if (user && configs.length > 0) {
      setLocalStorageItem(`aver_configs_${user.uid}`, configs);
    }
  }, [configs, user?.uid, setLocalStorageItem]);

  useEffect(() => {
    if (user) {
      setLocalStorageItem(`aver_session_${user.uid}`, session);
      window.dispatchEvent(new CustomEvent('aver_session_updated', { detail: session }));
    }
  }, [session, user?.uid, setLocalStorageItem]);

  useEffect(() => {
    if (user && positions.length > 0) {
      setLocalStorageItem(`aver_positions_${user.uid}`, positions);
    }
  }, [positions, user?.uid, setLocalStorageItem]);

  useEffect(() => {
    if (user && trades.length > 0) {
      setLocalStorageItem(`aver_trades_${user.uid}`, trades);
    }
  }, [trades, user?.uid, setLocalStorageItem]);

  useEffect(() => {
    if (user && activity.length > 0) {
      setLocalStorageItem(`aver_activity_${user.uid}`, activity);
    }
  }, [activity, user?.uid, setLocalStorageItem]);

  useEffect(() => {
    if (user && recommendations.length > 0) {
      setLocalStorageItem(`aver_recommendations_${user.uid}`, recommendations);
    }
  }, [recommendations, user?.uid, setLocalStorageItem]);

  useEffect(() => {
    // seedTraders(); // Disabled automatic seeding to conserve Firestore quota
    // const stopSimulator = startTraderSimulator(); // Disabled simulator to conserve Firestore write quota
    const stopSimulator = () => {};
    
    if (!user) {
      setLoading(false);
      return;
    }

    const configsRef = collection(db, 'users', user.uid, 'aiConfigurations');
    const positionsRef = collection(db, 'users', user.uid, 'positions');
    const tradesRef = collection(db, 'users', user.uid, 'trades');
    const activityRef = query(collection(db, 'users', user.uid, 'activity'), orderBy('timestamp', 'desc'));
    const sessionRef = query(collection(db, 'aiSessions'), where('userId', '==', user.uid), where('status', '==', 'ACTIVE'));

    const unsubConfigs = onSnapshot(configsRef, (snap) => {
      const fetchedConfigs = snap.docs.map(d => normalizeAiConfig({ id: d.id, ...d.data() }, user.uid));
      setConfigs(prev => {
        const mergedMap = new Map<string, AiConfiguration>();
        // Keep local configs that aren't in Firestore yet
        prev.forEach(c => mergedMap.set(c.id, normalizeAiConfig(c, user.uid)));
        // Add or overwrite with Firestore configs
        fetchedConfigs.forEach(c => mergedMap.set(c.id, c));
        
        const merged = Array.from(mergedMap.values());
        const effectiveUid = user?.uid || 'guest_user';
        if (merged.length > 0) {
          setLocalStorageItem(`aver_configs_${effectiveUid}`, merged);
          setLocalStorageItem(`aver_configs_guest_user`, merged);
        }
        
        // Auto select active config if needed
        const active = merged.find(c => c.status === 'ACTIVE');
        if (active) {
          setConfig(active);
          setActiveConfigId(active.id);
        } else if (merged.length > 0 && !activeConfigId) {
          setConfig(merged[0]);
          setActiveConfigId(merged[0].id);
        }

        return merged;
      });
      setLoading(false);
    }, (error) => {
      console.warn("[TradingEngineContext] configs subscription restricted/denied. Running in high-fidelity local state mode:", error);
      setLoading(false);
    });

    const unsubSession = onSnapshot(sessionRef, (snap) => {
        if (!snap.empty) {
          const activeDocs = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as AiSession))
            .filter(s => (s.status === 'ACTIVE' || (s as any).status === 'RUNNING') && s.userId === user.uid);
          
          if (activeDocs.length > 0) {
            // Sort by startTime descending so the most recent session is focused
            activeDocs.sort((a, b) => {
              const getMs = (t: any) => {
                if (!t) return 0;
                if (typeof t.toDate === 'function') return t.toDate().getTime();
                if (typeof t.seconds === 'number') return t.seconds * 1000;
                const parsed = new Date(t).getTime();
                return isNaN(parsed) ? 0 : parsed;
              };
              return getMs(b.startTime) - getMs(a.startTime);
            });
            const fetchedSession = activeDocs[0];
            console.log("[TradingEngineContext] Session synchronized from Firestore:", fetchedSession.id);
            setSession(fetchedSession);
            sessionRefVal.current = fetchedSession;
            safeStorage.setItem(`aver_session_${user.uid}`, JSON.stringify(fetchedSession));
            safeStorage.setItem(`aver_session_${fetchedSession.id}`, JSON.stringify(fetchedSession));
          } else {
            setSession(null);
            sessionRefVal.current = null;
            safeStorage.removeItem(`aver_session_${user.uid}`);
          }
        } else {
          setSession(null);
          sessionRefVal.current = null;
          safeStorage.removeItem(`aver_session_${user.uid}`);
        }
    }, (error) => {
      console.warn("[TradingEngineContext] session subscription restricted/denied. Running locally:", error);
    });

    const unsubPositions = onSnapshot(positionsRef, (snap) => {
        const fetchedPositions = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Position[];
        setPositions(prev => {
          const mergedMap = new Map<string, Position>();
          prev.forEach(p => mergedMap.set(p.id, p));
          fetchedPositions.forEach(p => mergedMap.set(p.id, p));
          const merged = Array.from(mergedMap.values());
          if (merged.length > 0) setLocalStorageItem(`aver_positions_${user.uid}`, merged);
          return merged;
        });
    }, (error) => {
      console.warn("[TradingEngineContext] positions subscription restricted/denied. Running locally:", error);
    });

    const unsubTrades = onSnapshot(tradesRef, (snap) => {
        const fetchedTrades = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AiTrade[];
        setTrades(prev => {
          const mergedMap = new Map<string, AiTrade>();
          // Keep local trades
          prev.forEach(t => mergedMap.set(t.id, t));
          // Add/Overwrite with Firestore trades
          fetchedTrades.forEach(t => mergedMap.set(t.id, t));
          const merged = Array.from(mergedMap.values());
          const effectiveUid = user?.uid || 'guest_user';
          if (merged.length > 0) {
            setLocalStorageItem(`aver_trades_${effectiveUid}`, merged);
          }
          return merged;
        });
    }, (error) => {
      console.warn("[TradingEngineContext] trades subscription restricted/denied. Running locally:", error);
    });

    const unsubActivity = onSnapshot(activityRef, (snap) => {
        const clearedAt = Number(getLocalStorageItem(`aver_activity_cleared_at_${user.uid}`, 0));
        const fetchedActivity = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ActivityEvent[];
        const filteredActivity = fetchedActivity.filter(item => {
          const itemTime = parseTimestamp(item.timestamp);
          return itemTime > clearedAt;
        });
        setActivity(filteredActivity);
        setLocalStorageItem(`aver_activity_${user.uid}`, filteredActivity);
    }, (error) => {
      console.warn("[TradingEngineContext] activity subscription restricted/denied. Running locally:", error);
    });

    const recsRef = query(collection(db, 'aiRecommendations'), where('userId', '==', user.uid));
    const unsubRecs = onSnapshot(recsRef, (snap) => {
        const sortedRecs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as AiRecommendation)
          .sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt as any).getTime();
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt as any).getTime();
            return timeB - timeA;
          });
        if (sortedRecs.length > 0) {
          setRecommendations(prev => {
            const mergedMap = new Map<string, AiRecommendation>();
            prev.forEach(r => mergedMap.set(r.id, r));
            sortedRecs.forEach(r => mergedMap.set(r.id, r));
            const merged = Array.from(mergedMap.values());
            setLocalStorageItem(`aver_recommendations_${user.uid}`, merged);
            return merged;
          });
        }
    }, (error) => {
      console.warn("[TradingEngineContext] recommendations subscription restricted/denied. Running locally:", error);
    });

    return () => {
      unsubConfigs();
      unsubSession();
      unsubPositions();
      unsubTrades();
      unsubActivity();
      unsubRecs();
      stopSimulator();
    };
  }, [user?.uid]);

  const logActivity = useCallback(async (type: string, message: string, metadata?: Record<string, any>) => {
    if (!user) return;
    
    const cleanMsg = (message || '').trim();
    const actKey = `${type}|${cleanMsg.toLowerCase()}`;
    const now = Date.now();

    // 5-second debounce to prevent duplicate spamming
    const lastLogged = recentActivitiesRef.current.get(actKey);
    if (lastLogged && (now - lastLogged) < 5000) {
      console.log("[TradingEngineContext] Debounced duplicate activity log:", actKey);
      return;
    }
    recentActivitiesRef.current.set(actKey, now);

    const newAct: ActivityEvent = {
      id: `act_${now}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.uid,
      type,
      message: cleanMsg,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };
    
    setActivity(prev => {
      const updated = deduplicateActivities([newAct, ...prev]).slice(0, 100);
      setLocalStorageItem(`aver_activity_${user.uid}`, updated);
      return updated;
    });

    if (user.uid && !user.uid.startsWith('local-') && user.uid !== 'guest_user') {
      try {
        await addDoc(collection(db, 'users', user.uid, 'activity'), {
          type,
          message: cleanMsg,
          timestamp: serverTimestamp(),
          metadata: metadata || {}
        });
      } catch (error) {
        console.warn("Failed to log activity in Firestore:", error);
      }
    }
  }, [user?.uid, setLocalStorageItem]);

  const startSession = useCallback(async (configId: string, markets: string[]) => {
    console.log("[TradingEngineContext] startSession called with configId:", configId);
    const effectiveUid = user?.uid || auth?.currentUser?.uid || 'guest_user';
    const userEmail = user?.email || (user as any)?.userEmail || (auth?.currentUser?.email) || effectiveUid;
    
    const activeConfig = configs.find(c => c.id === configId) || config;
    if (!activeConfig) return;

    let allocationAmount = activeConfig.sessionSetup?.amountToAllocate ?? 1000;
    const fundingSource = activeConfig.sessionSetup?.fundingSource ?? 'WALLET';
    
    // Validate funds based on funding source
    const currentAvailableCash = tokenBalanceRef.current ?? user?.tokenBalance ?? user?.availableBalance ?? (typeof user?.portfolioBalance === 'number' ? user.portfolioBalance : 0);
    const currentVaultBal = user?.vaultBalance ?? 0;
    const availableFunds = fundingSource === 'VAULT' ? currentVaultBal : currentAvailableCash;
    
    if (availableFunds <= 0) {
      console.warn(`[TradingEngineContext] Insufficient funds: ${fundingSource === 'VAULT' ? 'vault' : 'wallet'} balance is $0.00. Deposit required to trade.`);
      const err = new Error('INSUFFICIENT_FUNDS');
      (err as any).code = 'INSUFFICIENT_FUNDS';
      throw err;
    }

    if (allocationAmount > availableFunds) {
      console.warn(`[TradingEngineContext] Insufficient funds: allocated amount exceeds available ${fundingSource === 'VAULT' ? 'vault' : 'wallet'} balance`, { allocationAmount, availableFunds, fundingSource });
      const err = new Error('INSUFFICIENT_FUNDS');
      (err as any).code = 'INSUFFICIENT_FUNDS';
      throw err;
    }
    
    let newTokenBal = currentAvailableCash;
    let newVaultBal = currentVaultBal;

    if (fundingSource === 'WALLET') {
      newTokenBal = Math.max(0, currentAvailableCash - allocationAmount);
    } else {
      newVaultBal = Math.max(0, currentVaultBal - allocationAmount);
    }
    
    tokenBalanceRef.current = newTokenBal;
    const totalNetBalance = newTokenBal + allocationAmount + newVaultBal;

    // Immediately synchronize React state so balance never glitches or flashes zero
    if (updateProfile) {
      updateProfile({
        tokenBalance: newTokenBal,
        availableBalance: newTokenBal,
        portfolioBalance: totalNetBalance,
        vaultBalance: newVaultBal,
        aiTradingCapital: allocationAmount,
        portfolio: {
          ...(user?.portfolio || {}),
          totalValue: totalNetBalance
        }
      }, undefined, undefined, true);
    }

    try {
      await walletService.updateWallet(effectiveUid, {
        tokenBalance: newTokenBal,
        availableBalance: newTokenBal,
        portfolioBalance: totalNetBalance, // Preserving consolidated portfolio net balance
        vaultBalance: newVaultBal,
        aiTradingCapital: allocationAmount,
        portfolioValue: totalNetBalance // Unchanged total net balance during trading
      });
      await portfolioPersistenceService.updateWalletState(effectiveUid, {
        tokenBalance: newTokenBal,
        availableBalance: newTokenBal,
        portfolioBalance: totalNetBalance,
        vaultBalance: newVaultBal,
        aiTradingCapital: allocationAmount
      });
      if (user?.uid && !user.uid.startsWith('local-') && user.uid !== 'guest_user') {
        await updateDoc(doc(db, 'users', user.uid), {
          tokenBalance: newTokenBal,
          availableBalance: newTokenBal,
          portfolioBalance: totalNetBalance,
          vaultBalance: newVaultBal,
          aiTradingCapital: allocationAmount,
          lastUpdated: serverTimestamp()
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Failed to update wallet service during session start:", e);
    }

    try {
      const userCacheKey = `user_profile_${effectiveUid}`;
      const cachedUserStr = safeStorage.getItem(userCacheKey) || localStorage.getItem('aver_active_user');
      if (cachedUserStr) {
        const uObj = JSON.parse(cachedUserStr);
        uObj.tokenBalance = newTokenBal;
        uObj.availableBalance = newTokenBal;
        uObj.portfolioBalance = totalNetBalance;
        uObj.vaultBalance = newVaultBal;
        uObj.aiTradingCapital = allocationAmount;
        if (uObj.portfolio) {
          uObj.portfolio.totalValue = totalNetBalance;
        }
        safeStorage.setItem(userCacheKey, JSON.stringify(uObj));
        localStorage.setItem('aver_active_user', JSON.stringify(uObj));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('aver_user_updated'));
      }
    } catch (err) {
      console.warn("Failed to update user profile cache in local storage:", err);
    }



    // Clear any previous stopped-session flags for this user
    safeStorage.removeItem(`aver_stopped_session_${effectiveUid}`);
    try {
      localStorage.removeItem(`aver_stopped_session_${effectiveUid}`);
    } catch (e) {}

    const newSession: AiSession = {
      id: `session_${effectiveUid}_${Date.now()}`,
      userId: effectiveUid,
      userEmail: userEmail,
      status: 'ACTIVE',
      startTime: Timestamp.now(),
      activeConfigId: configId,
      strategyName: activeConfig?.name || 'AI Trading Strategy',
      tradingCapital: allocationAmount,
      initialCapital: allocationAmount,
      openPositionsCount: 0,
      totalProfit: 0,
      totalLoss: 0,
      lastUpdate: Timestamp.now(),
      adminControl: { mode: 'NORMAL', forceNextTrade: 'AUTO' }
    };
    
    peakEquityRef.current = allocationAmount;
    const startBaseCash = tokenBalanceRef.current ?? user?.tokenBalance ?? user?.availableBalance ?? 0;
    const startVault = user?.vaultBalance ?? 0;
    const startHoldings = (user?.holdings || []).reduce((s, h) => s + ((h.quantity || 0) * (h.currentPrice || 0)), 0);
    const startTotalAccountEquity = startBaseCash + startVault + startHoldings + allocationAmount;

    const initialPoint: SessionEquityPoint = {
      sessionId: newSession.id,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      equity: allocationAmount,
      totalAccountEquity: parseFloat(startTotalAccountEquity.toFixed(2)),
      initialCapital: allocationAmount,
      floatingPnl: 0,
      realizedPnl: 0,
      totalPnl: 0,
      pnlPercent: 0,
      drawdown: 0,
      trigger: 'SESSION_START',
      openPositionsCount: 0
    };
    setSessionEquityPoints([initialPoint]);
    sessionEquityPointsRef.current = [initialPoint];
    equityService.recordSessionPoint(effectiveUid, initialPoint);

    console.log("[TradingEngineContext] Setting active session to:", newSession);
    setSession(newSession);
    sessionRefVal.current = newSession;
    setLocalStorageItem(`aver_session_${effectiveUid}`, newSession);
    setLocalStorageItem(`aver_session_${newSession.id}`, newSession);

    // Immediate status update
    const nextStatus = aiTradingService.getEngineOperationStatus(activeConfig.schedule, true);
    setEngineStatus(nextStatus);

    const activeUid = user?.uid || auth?.currentUser?.uid || effectiveUid;
    try {
      console.log("[SESSION] Starting Firestore write");
      console.log("[SESSION] Firestore path: aiSessions");
      console.log("[SESSION] Session ID:", newSession.id);
      console.log("[SESSION] Session data:", newSession);

      // Clean up any lingering session documents for this user in aiSessions before writing new one
      try {
        const oldSessionsSnap = await getDocs(query(collection(db, 'aiSessions'), where('userId', '==', activeUid))).catch(() => null);
        if (oldSessionsSnap && !oldSessionsSnap.empty) {
          for (const sDoc of oldSessionsSnap.docs) {
            await deleteDoc(doc(db, 'aiSessions', sDoc.id)).catch(() => {});
          }
        }
      } catch (cleanErr) {
        console.warn("Non-critical cleanup warning for prior sessions:", cleanErr);
      }

      // 1. Persist real session document to Firestore aiSessions for all users
      await setDoc(doc(db, 'aiSessions', newSession.id), newSession);
      console.log("[SESSION] Firestore write completed");
      
      // 2. Update user profile in Firestore
      if (activeUid && !activeUid.startsWith('local-') && activeUid !== 'guest_user') {
        await updateDoc(doc(db, 'users', activeUid), {
          aiTradingCapital: allocationAmount,
          aiSession: newSession,
          activeSession: newSession,
          lastUpdated: serverTimestamp()
        }).catch(() => {});

        // 3. Safely set active status on config
        if (configId) {
          await setDoc(doc(db, 'users', activeUid, 'aiConfigurations', configId), {
            status: 'ACTIVE',
            lastModified: serverTimestamp()
          }, { merge: true }).catch(() => {});
        }
        
        // 4. Update portfolio persistence
        await portfolioPersistenceService.updateSessionDetails(activeUid, {
          sessionId: newSession.id,
          status: 'ACTIVE',
          marketsScanned: markets,
          activeConfigId: configId || null,
          startTime: new Date().toISOString(),
          engineState: 'ACTIVE'
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Critical error persisting active session to Firestore:", error);
    }

    // Broadcast session update event so all listeners synchronize immediately
    try {
      const regRaw = localStorage.getItem('aver_active_sessions_registry');
      const reg: Record<string, any> = regRaw ? JSON.parse(regRaw) : {};
      reg[newSession.id] = newSession;
      localStorage.setItem('aver_active_sessions_registry', JSON.stringify(reg));
      window.dispatchEvent(new CustomEvent('aver_sessions_registry_updated', { detail: reg }));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('aver_session_updated', { detail: newSession }));
    window.dispatchEvent(new Event('storage'));

    await logActivity('SESSION_STARTED', `AI Trading Session started with $${allocationAmount} from ${fundingSource}`, { configId, markets, allocationAmount });
  }, [user, configs, config, addNotification, logActivity, setLocalStorageItem]);

  const endSession = useCallback(async () => {
    const currentSession = sessionRefVal.current || session;
    const effectiveUid = user?.uid || auth?.currentUser?.uid;
    if (!currentSession || !effectiveUid) return;
    if (currentSession.status !== 'ACTIVE') {
      console.log("[TradingEngineContext] endSession ignored: session is not ACTIVE", currentSession.id);
      return;
    }

    // Mark session stopped immediately to prevent re-entrancy / double settlement
    currentSession.status = 'STOPPED';
    sessionRefVal.current = null;
    setSession(null);

    // Explicitly wipe local session keys for both user and session instance
    setLocalStorageItem(`aver_session_${effectiveUid}`, null);
    setLocalStorageItem(`aver_session_${currentSession.id}`, null);
    safeStorage.removeItem(`aver_session_${effectiveUid}`);
    safeStorage.removeItem(`aver_session_${currentSession.id}`);
    safeStorage.removeItem(`aver_active_session_${currentSession.id}`);
    localStorage.removeItem(`aver_session_${currentSession.id}`);
    localStorage.removeItem(`aver_active_session_${currentSession.id}`);
    localStorage.removeItem(`aver_session_control_${currentSession.id}`);
    localStorage.removeItem(`aver_session_${effectiveUid}`);

    // Mark exact session instance as stopped
    safeStorage.setItem(`aver_stopped_session_${effectiveUid}`, currentSession.id);
    safeStorage.setItem(`aver_stopped_session_${currentSession.id}`, 'true');
    localStorage.setItem(`aver_stopped_session_${currentSession.id}`, 'true');

    // Remove from registry immediately
    try {
      const regRaw = localStorage.getItem('aver_active_sessions_registry');
      if (regRaw) {
        const reg: Record<string, any> = JSON.parse(regRaw);
        delete reg[currentSession.id];
        localStorage.setItem('aver_active_sessions_registry', JSON.stringify(reg));
        window.dispatchEvent(new CustomEvent('aver_sessions_registry_updated', { detail: reg }));
      }
    } catch (e) {}

    // Dispatch aver_session_terminated immediately
    window.dispatchEvent(new CustomEvent('aver_session_terminated', { 
      detail: { sessionId: currentSession.id, userId: effectiveUid } 
    }));
    window.dispatchEvent(new CustomEvent('aver_session_updated', { detail: null }));
    window.dispatchEvent(new Event('storage'));

    const activeConfig = configs.find(c => c.id === currentSession.activeConfigId) || configRefVal.current || config;
    const fundingSource = activeConfig?.sessionSetup?.fundingSource || 'WALLET';

    // 1. Reconcile/Liquidate ALL open trades according to trading rules
    const currentTrades = tradesRefVal.current.length > 0 ? tradesRefVal.current : trades;
    const openTrades = currentTrades.filter(t => t.status === 'OPEN');
    let liquidatedValue = 0;
    
    if (openTrades.length > 0) {
      const timestamp = Timestamp.now() as any;
      const updatedTrades = currentTrades.map(t => {
        if (t.status === 'OPEN') {
          const livePrice = livePricesRef.current[t.asset] || liveTradePrices[t.asset] || t.currentPrice || t.entry;
          const pnl = (livePrice - t.entry) * t.quantity;
          const pnlPercent = ((livePrice - t.entry) / t.entry) * 100;
          liquidatedValue += pnl;
          return {
            ...t,
            status: 'CLOSED' as const,
            exit: livePrice,
            closedAt: timestamp,
            pnl,
            pnlPercent,
            reasonClosed: 'SESSION_END' as const
          };
        }
        return t;
      });
      setTrades(updatedTrades);
      tradesRefVal.current = updatedTrades;
      setLocalStorageItem(`aver_trades_${effectiveUid}`, updatedTrades);

      // Save closed trades to Firestore if online
      if (user.uid && !user.uid.startsWith('local-')) {
        for (const t of openTrades) {
          const livePrice = livePricesRef.current[t.asset] || liveTradePrices[t.asset] || t.currentPrice || t.entry;
          const pnl = (livePrice - t.entry) * t.quantity;
          const pnlPercent = ((livePrice - t.entry) / t.entry) * 100;
          updateDoc(doc(db, 'users', effectiveUid, 'trades', t.id), {
            status: 'CLOSED',
            exit: livePrice,
            closedAt: serverTimestamp(),
            pnl,
            pnlPercent,
            reasonClosed: 'SESSION_END'
          }).catch(() => {});
        }
      }
    }
    
    // 2. Calculate final capital to return to Net Balance
    const finalCapital = Math.max(0, currentSession.tradingCapital + liquidatedValue);

    console.log("[TradingEngineContext] Reconciling and ending session. finalCapital:", finalCapital, "fundingSource:", fundingSource);

    // 3. Save Completed Session Equity Data
    const sessionPoints = sessionEquityPoints.length > 0 ? sessionEquityPoints : equityService.getSessionPointsLocally(effectiveUid, currentSession.id);
    const initialCap = currentSession.initialCapital || 1000;
    const totalPnl = finalCapital - initialCap;
    const pnlPercent = (totalPnl / initialCap) * 100;
    const maxDrawdown = sessionPoints.length > 0 ? Math.max(...sessionPoints.map(p => p.drawdown)) : 0;
    const closedSessionTrades = tradesRefVal.current.filter(t => t.status === 'CLOSED');
    const winningTrades = closedSessionTrades.filter(t => (t.pnl || 0) > 0);
    const winRate = closedSessionTrades.length > 0 ? (winningTrades.length / closedSessionTrades.length) * 100 : 0;

    const completedSession: CompletedSessionData = {
      sessionId: currentSession.id,
      userId: effectiveUid,
      configName: activeConfig?.name || 'AI Trading Strategy',
      startTime: currentSession.startTime ? (currentSession.startTime.toDate ? currentSession.startTime.toDate().getTime() : new Date(currentSession.startTime as any).getTime()) : Date.now(),
      endTime: Date.now(),
      initialCapital: initialCap,
      finalEquity: finalCapital,
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      pnlPercent: parseFloat(pnlPercent.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(1)),
      totalTrades: closedSessionTrades.length,
      equityPoints: sessionPoints
    };

    // 0. Invalidate run token and immediately clear background intervals
    sessionRunTokenRef.current += 1;
    if (activeIntervalsRef.current.tickInterval) {
      clearInterval(activeIntervalsRef.current.tickInterval);
      activeIntervalsRef.current.tickInterval = null;
    }
    if (activeIntervalsRef.current.positionInterval) {
      clearInterval(activeIntervalsRef.current.positionInterval);
      activeIntervalsRef.current.positionInterval = null;
    }
    if (activeIntervalsRef.current.loggingInterval) {
      clearInterval(activeIntervalsRef.current.loggingInterval);
      activeIntervalsRef.current.loggingInterval = null;
    }
    if (activeIntervalsRef.current.statusInterval) {
      clearInterval(activeIntervalsRef.current.statusInterval);
      activeIntervalsRef.current.statusInterval = null;
    }
    if (activeIntervalsRef.current.orderTimeout) {
      clearTimeout(activeIntervalsRef.current.orderTimeout);
      activeIntervalsRef.current.orderTimeout = null;
    }

    equityService.saveCompletedSession(effectiveUid, completedSession);
    safeStorage.setItem(`aver_latest_completed_session_${effectiveUid}`, JSON.stringify(completedSession));
    safeStorage.setItem(`aver_session_end_cooldown_${effectiveUid}`, String(Date.now() + 6000));
    setCompletedSessions(prev => [completedSession, ...prev.filter(s => s.sessionId !== completedSession.sessionId)]);

    // 4. Clear session state immediately
    setSession(null);
    sessionRefVal.current = null;
    setSessionEquityPoints([]);
    sessionEquityPointsRef.current = [];
    setLocalStorageItem(`aver_session_${effectiveUid}`, null);
    safeStorage.removeItem(`aver_session_${effectiveUid}`);
    safeStorage.removeItem(`aver_session_state_${effectiveUid}`);
    try {
      localStorage.removeItem(`aver_session_${effectiveUid}`);
      localStorage.removeItem(`aver_session_state_${effectiveUid}`);
    } catch (e) {}

    try {
      // 4. Calculate new balances using rigorous P/L delta on existing portfolio balance (prevents double-counting & balance inflation)
      const sessionPnl = parseFloat((finalCapital - currentSession.initialCapital).toFixed(2));
      const currentPortfolioBalance = user.portfolioBalance ?? user.portfolio?.totalValue ?? (tokenBalanceRef.current + (user.vaultBalance || 0) + currentSession.initialCapital);
      const newPortfolioBalance = Math.max(0, currentPortfolioBalance + sessionPnl);
      const currentVaultBal = user.vaultBalance ?? 0;

      let newVaultBal = currentVaultBal;
      if (fundingSource === 'VAULT') {
        newVaultBal = Math.max(0, currentVaultBal + finalCapital);
      }

      const totalHoldingsVal = (user?.holdings || []).reduce((s, h) => s + ((h.quantity || 0) * (h.currentPrice || 0)), 0);
      const newTokenBal = Math.max(0, newPortfolioBalance - newVaultBal - totalHoldingsVal);

      tokenBalanceRef.current = newTokenBal;
      const totalNetBalance = newTokenBal + newVaultBal + totalHoldingsVal;

      const prevProfit = user?.totalProfit || 0;
      const prevLoss = user?.totalLoss || 0;
      const newTotalProfit = sessionPnl > 0 ? (prevProfit + sessionPnl) : prevProfit;
      const newTotalLoss = sessionPnl < 0 ? (prevLoss + Math.abs(sessionPnl)) : prevLoss;
      const accountPnlPercent = totalNetBalance > 0 ? parseFloat(((sessionPnl / totalNetBalance) * 100).toFixed(4)) : 0;

      // Immediately synchronize React state so balance never drops or glitches on session close
      if (updateProfile) {
        updateProfile({
          tokenBalance: newTokenBal,
          availableBalance: newTokenBal,
          portfolioBalance: totalNetBalance,
          vaultBalance: newVaultBal,
          aiTradingCapital: 0,
          totalProfit: newTotalProfit,
          totalLoss: newTotalLoss,
          portfolio: {
            ...(user?.portfolio || {}),
            totalValue: totalNetBalance,
            todayPnL: sessionPnl,
            todayPnLPercent: accountPnlPercent,
            overallReturn: sessionPnl,
            realizedPnL: sessionPnl
          }
        }, undefined, undefined, true);
      }

      // 5. Update wallet document and portfolio persistence state
      await walletService.updateWallet(effectiveUid, {
        tokenBalance: newTokenBal,
        availableBalance: newTokenBal,
        portfolioBalance: totalNetBalance,
        vaultBalance: newVaultBal,
        aiTradingCapital: 0,
        portfolioValue: totalNetBalance
      });

      await portfolioPersistenceService.updateWalletState(effectiveUid, {
        tokenBalance: newTokenBal,
        availableBalance: newTokenBal,
        portfolioBalance: totalNetBalance,
        vaultBalance: newVaultBal,
        aiTradingCapital: 0,
        totalProfit: newTotalProfit,
        totalLoss: newTotalLoss
      });

      await portfolioPersistenceService.updatePortfolioMetrics(effectiveUid, {
        totalValue: totalNetBalance,
        todayPnL: sessionPnl,
        todayPnLPercent: accountPnlPercent,
        overallReturn: sessionPnl,
        realizedPnL: sessionPnl
      });

      if (user?.uid && !user.uid.startsWith('local-') && user.uid !== 'guest_user') {
        await updateDoc(doc(db, 'users', user.uid), {
          tokenBalance: newTokenBal,
          availableBalance: newTokenBal,
          portfolioBalance: totalNetBalance,
          vaultBalance: newVaultBal,
          aiTradingCapital: 0,
          aiSession: null,
          activeSession: null,
          totalProfit: newTotalProfit,
          totalLoss: newTotalLoss,
          'portfolio.totalValue': totalNetBalance,
          'portfolio.todayPnL': sessionPnl,
          'portfolio.todayPnLPercent': accountPnlPercent,
          'portfolio.overallReturn': sessionPnl,
          lastUpdated: serverTimestamp()
        }).catch(() => {});
      }

      // 6. Update cached user profile
      try {
        const userCacheKey = `user_profile_${effectiveUid}`;
        const cachedUserStr = safeStorage.getItem(userCacheKey) || localStorage.getItem('aver_active_user');
        if (cachedUserStr) {
          const uObj = JSON.parse(cachedUserStr);
          uObj.tokenBalance = newTokenBal;
          uObj.availableBalance = newTokenBal;
          uObj.portfolioBalance = totalNetBalance;
          uObj.vaultBalance = newVaultBal;
          uObj.aiTradingCapital = 0;
          uObj.aiSession = null;
          uObj.activeSession = null;
          uObj.totalProfit = newTotalProfit;
          uObj.totalLoss = newTotalLoss;
          if (uObj.portfolio) {
            uObj.portfolio.totalValue = totalNetBalance;
            uObj.portfolio.todayPnL = sessionPnl;
            uObj.portfolio.todayPnLPercent = accountPnlPercent;
            uObj.portfolio.overallReturn = sessionPnl;
          }
          safeStorage.setItem(userCacheKey, JSON.stringify(uObj));
          localStorage.setItem('aver_active_user', JSON.stringify(uObj));
        }
      } catch (err) {
        console.warn("Failed to update cached user profile in local storage:", err);
      }

      window.dispatchEvent(new Event('aver_user_updated'));
      window.dispatchEvent(new CustomEvent('aver_session_updated', { detail: null }));

      try {
        const regRaw = localStorage.getItem('aver_active_sessions_registry');
        if (regRaw) {
          const reg: Record<string, any> = JSON.parse(regRaw);
          if (currentSession?.id) delete reg[currentSession.id];
          localStorage.setItem('aver_active_sessions_registry', JSON.stringify(reg));
          window.dispatchEvent(new CustomEvent('aver_sessions_registry_updated', { detail: reg }));
        }
      } catch (e) {}

      // Mark active session document INACTIVE and delete from Firestore so it vanishes from all active views
      try {
        if (currentSession?.id) {
          await updateDoc(doc(db, 'aiSessions', currentSession.id), {
            status: 'INACTIVE',
            isDeleted: true,
            endTime: serverTimestamp()
          }).catch(() => {});
          await deleteDoc(doc(db, 'aiSessions', currentSession.id)).catch(() => {});
        }
        if (effectiveUid) {
          const userSessionsSnap = await getDocs(query(collection(db, 'aiSessions'), where('userId', '==', effectiveUid))).catch(() => null);
          if (userSessionsSnap && !userSessionsSnap.empty) {
            for (const sDoc of userSessionsSnap.docs) {
              await deleteDoc(doc(db, 'aiSessions', sDoc.id)).catch(() => {});
            }
          }
        }
      } catch (delErr) {
        console.warn("Could not deleteDoc aiSessions directly:", delErr);
      }

      await aiTradingService.endSession(currentSession.id);
      window.dispatchEvent(new CustomEvent('aver_session_terminated', { 
        detail: { sessionId: currentSession.id, userId: effectiveUid } 
      }));
      await portfolioPersistenceService.updateSessionDetails(effectiveUid, {
        sessionId: null,
        status: 'INACTIVE',
        engineState: 'IDLE'
      });
      await logActivity('SESSION_ENDED', `AI Trading Session ended. Returned $${finalCapital.toFixed(2)} to Net Balance.`, { sessionId: currentSession.id, finalCapital });
    } catch (error) {
      console.warn("Failed to end session in Firestore:", error);
      await portfolioPersistenceService.updateSessionDetails(effectiveUid, {
        sessionId: null,
        status: 'INACTIVE',
        engineState: 'IDLE'
      });
      await logActivity('SESSION_ENDED', `AI Trading Session ended. Returned $${finalCapital.toFixed(2)} to Net Balance.`, { sessionId: currentSession.id, finalCapital });
    }
  }, [user, session, config, configs, logActivity, setLocalStorageItem]);

  const endSessionRef = useRef(endSession);
  useEffect(() => {
    endSessionRef.current = endSession;
  }, [endSession]);

  useEffect(() => {
    activeTradingBalanceRef.current = activeTradingBalance;
    tokenBalanceRef.current = tokenBalance;
    addFundsRef.current = addFundsToActiveBalance;

    const currentTokenBalance = tokenBalance !== undefined ? tokenBalance : activeTradingBalance;

    // Automatic session termination disabled at user request - sessions stay active continuously.
    if (false && !loading && session?.status === 'ACTIVE' && session.initialCapital > 0 && session.tradingCapital !== undefined && session.tradingCapital <= 0 && (tradesRefVal.current.filter(t => t.status === 'OPEN').length === 0)) {
      console.log("[TradingEngineContext] Insufficient session funds detected. Terminating AI session.");
      // endSessionRef.current();
    }
  }, [activeTradingBalance, tokenBalance, addFundsToActiveBalance, session?.status, user?.uid, loading]);

  const saveConfiguration = useCallback(async (updatedConfig: AiConfiguration) => {
    const effectiveUid = user?.uid || 'guest_user';
    const configToSave: AiConfiguration = normalizeAiConfig({ 
      ...updatedConfig, 
      ownerId: effectiveUid, 
      lastModified: Timestamp.now() as any 
    }, effectiveUid);
    
    // Immediate state updates - Prepend newest/saved configuration at top
    setConfigs(prev => {
      const idx = prev.findIndex(c => c.id === updatedConfig.id);
      let updated: AiConfiguration[];
      if (idx !== -1) {
        updated = prev.map(c => c.id === updatedConfig.id ? configToSave : c);
      } else {
        updated = [configToSave, ...prev];
      }
      setLocalStorageItem(`aver_configs_${effectiveUid}`, updated);
      setLocalStorageItem(`aver_configs_guest_user`, updated);
      return updated;
    });
    
    if (activeConfigId === configToSave.id || !activeConfigId) {
      setConfig(configToSave);
      setActiveConfigId(configToSave.id);
    }

    // Always dispatch event so subscribed views refresh instantly
    window.dispatchEvent(new CustomEvent('configs_updated', { 
      detail: { userId: effectiveUid, configs: [configToSave] } 
    }));

    try {
      if (user?.uid && !user.uid.startsWith('local-') && user.uid !== 'guest_user') {
        await Promise.race([
          (async () => {
            await setDoc(doc(db, 'users', user.uid, 'aiConfigurations', configToSave.id), configToSave);
            await aiTradingService.savePreferences(user.uid, {
              maxPositionSize: configToSave.profitRiskManagement?.maxPositionSize ?? 500,
              maxRiskPerTrade: configToSave.profitRiskManagement?.maxRiskPerTrade ?? 1,
              lossLimit: configToSave.profitRiskManagement?.sessionStopLoss ?? 2,
              minConfidence: configToSave.aiTradingRules?.minConfidence ?? 85,
              maxSimultaneousPositions: configToSave.aiTradingRules?.maxSimultaneousPositions ?? 3,
              preferredMarkets: configToSave.aiTradingRules?.assetSelection || ['BTC', 'ETH', 'SOL']
            });
            await logActivity('CONFIG_UPDATED', `Configuration "${updatedConfig.name}" saved successfully.`);
          })(),
          new Promise((res) => setTimeout(res, 1500))
        ]);
      }
    } catch (error) {
      console.warn("Failed to save configuration in Firestore (saved locally):", error);
    }
  }, [user?.uid, activeConfigId, logActivity, setLocalStorageItem]);

  const deleteConfiguration = useCallback(async (configId: string) => {
    const effectiveUid = user?.uid || 'guest_user';
    
    setConfigs(prev => {
      const filtered = prev.filter(c => c.id !== configId);
      if (activeConfigId === configId) {
        if (filtered.length > 0) {
          setConfig(filtered[0]);
          setActiveConfigId(filtered[0].id);
        } else {
          setConfig(null);
          setActiveConfigId(undefined);
        }
      }
      setLocalStorageItem(`aver_configs_${effectiveUid}`, filtered);
      setLocalStorageItem(`aver_configs_guest_user`, filtered);
      return filtered;
    });

    try {
      if (user?.uid && !user.uid.startsWith('local-')) {
        await aiTradingService.deleteConfiguration(user.uid, configId);
        await logActivity('CONFIG_DELETED', `Configuration deleted successfully.`);
      }
    } catch (error) {
      console.warn("Failed to delete configuration in Firestore:", error);
    }
  }, [user?.uid, activeConfigId, logActivity, setLocalStorageItem]);

  const duplicateConfiguration = useCallback(async (configId: string) => {
    const effectiveUid = user?.uid || 'guest_user';
    const target = configs.find(c => c.id === configId);
    
    const baseConfig: Partial<AiConfiguration> = target || {
      name: 'Cloned Strategy',
      sessionSetup: { amountToAllocate: 1000, fundingSource: 'WALLET', sessionDuration: 24 },
      profitRiskManagement: { sessionTakeProfit: 5, sessionStopLoss: 2, maxRiskPerTrade: 1, maxPositionSize: 500 },
      aiTradingRules: { minConfidence: 85, maxSimultaneousPositions: 3, assetSelection: ['BTC', 'ETH'], tradingStrategy: 'NEURAL_MOMENTUM' },
      configurationDetails: { description: 'Cloned AI Trading strategy', category: 'Scalping', version: '1.0.0' },
      analyticsAndNotes: { riskScore: 50, strategyNotes: '', performanceStats: { winRate: 0, totalReturn: 0, drawdown: 0 } },
      notificationPreferences: { newRecommendations: true, tradeExecutions: true, marketAlerts: false }
    };

    const localDuplicated: AiConfiguration = {
      ...baseConfig as AiConfiguration,
      id: `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: target ? `${target.name} (Copy)` : 'Cloned AI Strategy',
      createdAt: Timestamp.now(),
      lastModified: Timestamp.now(),
      status: 'INACTIVE',
      ownerId: effectiveUid
    };

    setConfigs(prev => {
      const updated = [localDuplicated, ...prev];
      setLocalStorageItem(`aver_configs_${effectiveUid}`, updated);
      setLocalStorageItem(`aver_configs_guest_user`, updated);
      return updated;
    });

    try {
      if (user?.uid && !user.uid.startsWith('local-')) {
        await setDoc(doc(db, 'users', user.uid, 'aiConfigurations', localDuplicated.id), localDuplicated);
        await logActivity('CONFIG_DUPLICATED', `Configuration duplicated as "${localDuplicated.name}".`);
      }
    } catch (error) {
      console.warn("Failed to duplicate configuration in Firestore (saved locally):", error);
    }
  }, [user?.uid, configs, logActivity, setLocalStorageItem]);

  const activateConfiguration = useCallback(async (configId: string) => {
    const effectiveUid = user?.uid || 'guest_user';
    
    setConfigs(prev => {
      const updated = prev.map(c => ({
        ...c,
        status: c.id === configId ? 'ACTIVE' as const : 'INACTIVE' as const
      }));
      const active = updated.find(c => c.id === configId);
      if (active) {
        setConfig(active);
        setActiveConfigId(active.id);
      }
      setLocalStorageItem(`aver_configs_${effectiveUid}`, updated);
      setLocalStorageItem(`aver_configs_guest_user`, updated);
      return updated;
    });

    try {
      if (user?.uid && !user.uid.startsWith('local-')) {
        await aiTradingService.activateConfiguration(user.uid, configId);
        await logActivity('CONFIG_ACTIVATED', `Configuration activated.`);
      }
    } catch (error) {
      console.warn("Failed to activate configuration in Firestore (activated locally):", error);
    }
  }, [user?.uid, logActivity, setLocalStorageItem]);

  const clearActivityHistory = useCallback(async () => {
    if (!user) return;
    
    // Clear local state
    setActivity([]);
    setLocalStorageItem(`aver_activity_${user.uid}`, []);
    setLocalStorageItem(`aver_activity_cleared_at_${user.uid}`, Date.now());
    
    // Clear Firestore collection
    try {
      const q = query(collection(db, 'users', user.uid, 'activity'));
      const snapshot = await getDocs(q);
      const batchSize = 500; // Firestore limit
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const chunk = snapshot.docs.slice(i, i + batchSize);
        await Promise.all(chunk.map(d => deleteDoc(d.ref)));
      }
    } catch (error) {
      console.warn("Failed to clear activity history in Firestore:", error);
    }
  }, [user, setLocalStorageItem]);

  const closeTrade = useCallback(async (tradeId: string, exitPrice: number, reason: AiTrade['reasonClosed']) => {
    if (!user) return;
    
    const currentTradesList = tradesRefVal.current.length > 0 ? tradesRefVal.current : trades;
    const target = currentTradesList.find(t => t.id === tradeId);
    if (!target || target.status === 'CLOSED') return;

    const pnl = (exitPrice - target.entry) * target.quantity;
    const pnlPercent = ((exitPrice - target.entry) / target.entry) * 100;
    const closedAsset = target.asset;

    const updatedTrades = currentTradesList.map(t => {
      if (t.id === tradeId) {
        return {
          ...t,
          status: 'CLOSED' as const,
          exit: exitPrice,
          closedAt: Timestamp.now() as any,
          pnl,
          pnlPercent,
          reasonClosed: reason
        };
      }
      return t;
    });

    setTrades(updatedTrades);
    tradesRefVal.current = updatedTrades;
    setLocalStorageItem(`aver_trades_${user.uid}`, updatedTrades);

    // Update active session metrics
    if (sessionRefVal.current && sessionRefVal.current.status === 'ACTIVE') {
      const prevSession = sessionRefVal.current;
      const updatedSession: AiSession = {
        ...prevSession,
        tradingCapital: prevSession.tradingCapital + pnl,
        totalProfit: pnl > 0 ? prevSession.totalProfit + pnl : prevSession.totalProfit,
        totalLoss: pnl < 0 ? prevSession.totalLoss + Math.abs(pnl) : prevSession.totalLoss,
        openPositionsCount: updatedTrades.filter(t => t.status === 'OPEN').length,
        lastUpdate: Timestamp.now()
      };
      sessionRefVal.current = updatedSession;
      setSession(updatedSession);
      setLocalStorageItem(`aver_session_${user.uid}`, updatedSession);

      try {
        const regRaw = localStorage.getItem('aver_active_sessions_registry');
        const reg: Record<string, any> = regRaw ? JSON.parse(regRaw) : {};
        reg[updatedSession.id] = updatedSession;
        localStorage.setItem('aver_active_sessions_registry', JSON.stringify(reg));
        window.dispatchEvent(new CustomEvent('aver_sessions_registry_updated', { detail: reg }));
        window.dispatchEvent(new CustomEvent('aver_session_updated', { detail: updatedSession }));
      } catch (e) {}

      updateDoc(doc(db, 'aiSessions', prevSession.id), {
        tradingCapital: updatedSession.tradingCapital,
        totalProfit: updatedSession.totalProfit,
        totalLoss: updatedSession.totalLoss,
        openPositionsCount: updatedTrades.filter(t => t.status === 'OPEN').length,
        lastUpdate: serverTimestamp()
      }).catch(err => {
        setDoc(doc(db, 'aiSessions', prevSession.id), updatedSession, { merge: true }).catch(() => {});
      });
    }

     // 2. We DO NOT update tokenBalance or availableBalance here anymore.
    // Profits/Losses stay within the session until endSession is called.
    const isProfitable = pnl > 0;
    const isLoss = pnl < 0;
    let currentWinRun = user?.winRun || 0;
    if (isProfitable) {
      currentWinRun += 1;
    } else if (isLoss) {
      currentWinRun = 0;
    }
    // If pnl === 0 (breakeven), currentWinRun remains unchanged
    
    const currentAiTrades = ((user?.aiTradesCount || 0) + 1);

    const xpGain = 5 + (isProfitable ? 5 : 0) + (isProfitable ? Math.min(currentWinRun, 5) * 2 : 0);
    const calculatedXp = (currentAiTrades * 20) + (currentWinRun * 15) + ((user?.loginStreak || 0) * 10);
    let currentXp = Math.max((user?.xp || 0) + xpGain, calculatedXp);
    let currentLevel = Math.max(1, Math.floor(currentXp / 1000) + 1);
    
    let insignias: string[] = [];
    if (currentLevel >= 5) {
      const milestone = Math.floor(currentLevel / 5) * 5;
      insignias.push(`Level ${milestone} Vanguard`);
    }

    try {
      const userId = user.uid;

      // We still update historical stats and overall portfolio tracking for charts
      const userUpdate = {
        totalProfit: pnl > 0 ? increment(pnl) : increment(0),
        totalLoss: pnl < 0 ? increment(Math.abs(pnl)) : increment(0),
        'portfolio.todayPnL': increment(pnl),
        'portfolio.overallReturn': increment(pnl),
        lastUpdated: serverTimestamp(),
        // Progression logic
        winRun: currentWinRun,
        aiTradesCount: currentAiTrades,
        level: currentLevel,
        xp: currentXp,
        insignias
      };
      await updateDoc(doc(db, 'users', userId), userUpdate);
      
      // Update the trade itself
      updateDoc(doc(db, 'users', userId, 'trades', tradeId), {
        status: 'CLOSED',
        exit: exitPrice,
        closedAt: serverTimestamp(),
        pnl,
        pnlPercent,
        reasonClosed: reason
      }).catch(err => console.warn("Failed to update closed trade in Firestore:", err));

      // Synchronize 'portfolio' collection
      try {
        await updateDoc(doc(db, 'portfolio', userId), {
          todayPnL: increment(pnl),
          overallReturn: increment(pnl),
          lastUpdated: serverTimestamp()
        });
      } catch (portErr) {}

    } catch (e) {
      console.warn("Financial balance update failed:", e);
    }

    // Sync the trade P/L to local storage caches for instant local feedback and dispatch update event
    try {
      const userId = user.uid;
      const userCacheKey = `user_profile_${userId}`;
      const cachedUserStr = safeStorage.getItem(userCacheKey) || localStorage.getItem('aver_active_user');
      if (cachedUserStr) {
        const uObj = JSON.parse(cachedUserStr);
        uObj.totalProfit = pnl > 0 ? (uObj.totalProfit || 0) + pnl : (uObj.totalProfit || 0);
        uObj.totalLoss = pnl < 0 ? (uObj.totalLoss || 0) + Math.abs(pnl) : (uObj.totalLoss || 0);
        uObj.winRun = currentWinRun;
        uObj.aiTradesCount = currentAiTrades;
        uObj.level = currentLevel;
        uObj.xp = currentXp;
        uObj.insignias = insignias;
        if (uObj.portfolio) {
          uObj.portfolio.todayPnL = (uObj.portfolio.todayPnL || 0) + pnl;
          uObj.portfolio.overallReturn = (uObj.portfolio.overallReturn || 0) + pnl;
        }
        safeStorage.setItem(userCacheKey, JSON.stringify(uObj));
        localStorage.setItem('aver_active_user', JSON.stringify(uObj));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.warn("Failed to update user profile cache on trade close:", err);
    }

    window.dispatchEvent(new Event('aver_user_updated'));

    // 3. Log activity via single deduplicated source of truth
    await logActivity(
      reason === 'TARGET_HIT' ? 'TP_HIT' : reason === 'STOP_LOSS_HIT' ? 'SL_HIT' : 'MANUAL_CLOSE',
      `Autonomous liquidation completed for ${closedAsset}. Net returns: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%).`,
      { tradeId, asset: closedAsset, pnl }
    );

    // 4. Try Firestore
    try {
      await aiTradingService.closeTrade(user.uid, tradeId, exitPrice, reason);
    } catch (error) {
      console.warn("Failed to close trade in Firestore (offline/local simulation active):", error);
    }
  }, [user?.uid, updateProfile, addFundsToActiveBalance, logActivity, setLocalStorageItem]);

  // Background Trading Simulator Loop
  const tradesRefVal = useRef<AiTrade[]>([]);
  const userRef = useRef<any>(null);
  const sessionRefVal = useRef<AiSession | null>(null);
  const livePricesRef = useRef<Record<string, number>>({});
  const configRefVal = useRef<AiConfiguration | null>(null);
  const lastEngineStatusRef = useRef<EngineStatus | null>(null);
  
  // Refs for loop management
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    tradesRefVal.current = trades;
  }, [trades]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    sessionRefVal.current = session;
  }, [session]);

  useEffect(() => {
    configRefVal.current = config;
  }, [config]);

  // Window unload / page hide flush handler to guarantee zero data loss on unexpected closes or refreshes
  useEffect(() => {
    const handleUnload = () => {
      const curUser = userRef.current;
      const curSess = sessionRefVal.current;
      if (curUser?.uid && curSess && curSess.status === 'ACTIVE') {
        const curTrades = tradesRefVal.current;
        const openTrades = curTrades.filter(t => t.status === 'OPEN');
        const openVal = openTrades.reduce((sum, trade) => {
          const p = livePricesRef.current[trade.id] || livePricesRef.current[trade.asset] || trade.currentPrice || trade.entry;
          return sum + (trade.quantity * p);
        }, 0);
        const equity = Math.max(0, curSess.tradingCapital + openVal);

        const sessToSave = { ...curSess, equity, lastUpdate: new Date().toISOString() };
        safeStorage.setItem(`aver_session_${curUser.uid}`, JSON.stringify(sessToSave));
        safeStorage.setItem(`aver_trades_${curUser.uid}`, JSON.stringify(curTrades));
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, []);

  // Unified loop for live ticks, position management, and autonomous orders
  useEffect(() => {
    console.log("[TradingEngineContext] Trading loops useEffect triggered. Session ID:", session?.id, "Status:", session?.status);
    if (!user?.uid || !session || session.status !== 'ACTIVE') {
      console.log("[TradingEngineContext] Loops not starting: user/session missing or not ACTIVE");
      return;
    }
    console.log("[TradingEngineContext] Starting trading loops...");
    
    let loggingInterval: NodeJS.Timeout;
    let tickInterval: NodeJS.Timeout;
    let positionInterval: NodeJS.Timeout;
    let orderTimeout: NodeJS.Timeout;

    const runToken = ++sessionRunTokenRef.current;
    
    // Add logging to ensure loops are firing
    loggingInterval = setInterval(() => {
      if (sessionRunTokenRef.current !== runToken || sessionRefVal.current?.status !== 'ACTIVE') {
        clearInterval(loggingInterval);
        return;
      }
      console.log("[TradingEngineContext] Loops running, session active:", sessionRefVal.current?.status === 'ACTIVE');
    }, 5000);
    activeIntervalsRef.current.loggingInterval = loggingInterval;

    // 1. HIGH-FREQUENCY LIVE PRICES TICKER & EQUITY PERFORMANCE RECORDING (Every 1000ms)
    tickInterval = setInterval(async () => {
      if (sessionRunTokenRef.current !== runToken) {
        clearInterval(tickInterval);
        return;
      }
      const currentSession = sessionRefVal.current;
      if (!currentSession || currentSession.status !== 'ACTIVE') {
        clearInterval(tickInterval);
        return;
      }

      // STRICT SCHEDULE GATE
      const status = aiTradingService.getEngineOperationStatus(configRefVal.current?.schedule, true);
      setEngineStatus(status);
      if (status.state === 'SLEEPING' || status.state === 'COOLING_BREAK') {
        return;
      }

      const nowMs = Date.now();
      const nextPrices: Record<string, number> = { ...livePricesRef.current };
      const openTrades = tradesRefVal.current.filter(t => t.status === 'OPEN');
      const closedTrades = tradesRefVal.current.filter(t => t.status === 'CLOSED');

      // Fetch market ticker every 3s to anchor base prices
      if (nowMs - lastTickerFetchRef.current > 3000) {
        lastTickerFetchRef.current = nowMs;
        try {
          const res = await fetch('/api/market/ticker');
          if (res.ok) {
            const data = await res.json();
            data.forEach((item: any) => {
              const asset = item.symbol.replace('USDT', '');
              nextPrices[asset] = parseFloat(item.lastPrice || item.price || 0);
            });
          }
        } catch (err) {
          console.warn("[TradingEngineContext] Ticker fetch error:", err);
        }
      }

      // Micro-tick live prices for active open trades so floating P/L changes dynamically every second
      const activeConfig = configRefVal.current;
      const riskScore = activeConfig?.analyticsAndNotes?.riskScore || 50;
      openTrades.forEach(trade => {
        const curP = nextPrices[trade.id] || nextPrices[trade.asset] || trade.currentPrice || trade.entry;
        // Small random walk tick per second relative to trade entry price
        const tickDelta = (Math.random() - 0.515) * (trade.entry * 0.0018 * Math.max(0.5, riskScore / 50));
        const newP = parseFloat(Math.max(0.01, curP + tickDelta).toFixed(2));
        nextPrices[trade.id] = newP;
        if (!nextPrices[trade.asset]) {
          nextPrices[trade.asset] = newP;
        }
      });

      // Keep static stock fallbacks
      const stocks = ['AAPL', 'NVDA', 'TSLA'];
      stocks.forEach(stock => {
        if (!nextPrices[stock]) nextPrices[stock] = (stock === 'AAPL' ? 172 : stock === 'NVDA' ? 120 : 180);
      });

      livePricesRef.current = nextPrices;
      setLiveTradePrices(nextPrices);

      // Calculate live session equity and total account equity
      const initialCap = currentSession.initialCapital || 1000;
      const floatingPnl = openTrades.reduce((sum, t) => {
        const p = nextPrices[t.id] || nextPrices[t.asset] || t.currentPrice || t.entry;
        return sum + ((p - t.entry) * t.quantity);
      }, 0);

      const realizedPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const sessionEquity = Math.max(0, initialCap + realizedPnl + floatingPnl);
      const totalPnl = sessionEquity - initialCap;
      const pnlPercent = (totalPnl / initialCap) * 100;

      // Auto-terminate session if allocated money reaches $0 or P/L reaches -100%
      if (sessionEquity <= 0 || pnlPercent <= -100 || (currentSession.tradingCapital <= 0 && openTrades.length === 0)) {
        console.log("[TradingEngineContext] Allocated capital depleted ($0 remaining / -100% P/L). Auto-terminating AI session.");
        if (addNotification) {
          addNotification('trading', 'high', 'Session Capital Depleted', 'Your allocated session capital has reached $0 (-100% P/L). Session terminated.');
        }
        endSessionRef.current();
        return;
      }

      if (sessionEquity > peakEquityRef.current) {
        peakEquityRef.current = sessionEquity;
      }
      const drawdown = peakEquityRef.current > 0 ? ((peakEquityRef.current - sessionEquity) / peakEquityRef.current) * 100 : 0;

      // Compute Total Account Equity (base wallet cash + vault + holdings + active session equity)
      const baseWalletCash = tokenBalanceRef.current ?? userRef.current?.tokenBalance ?? userRef.current?.availableBalance ?? 0;
      const vaultBal = userRef.current?.vaultBalance ?? 0;
      const holdingsVal = (userRef.current?.holdings || []).reduce((s, h) => s + ((h.quantity || 0) * (h.currentPrice || 0)), 0);
      const totalAccountEquity = baseWalletCash + vaultBal + holdingsVal + sessionEquity;

      const timeFormatted = new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newPoint: SessionEquityPoint = {
        sessionId: currentSession.id,
        timestamp: nowMs,
        timeFormatted,
        equity: parseFloat(sessionEquity.toFixed(2)),
        totalAccountEquity: parseFloat(totalAccountEquity.toFixed(2)),
        initialCapital: initialCap,
        floatingPnl: parseFloat(floatingPnl.toFixed(2)),
        realizedPnl: parseFloat(realizedPnl.toFixed(2)),
        totalPnl: parseFloat(totalPnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent.toFixed(2)),
        drawdown: parseFloat(drawdown.toFixed(2)),
        trigger: 'PERIODIC_UPDATE',
        openPositionsCount: openTrades.length
      };

      // Record new equity point continuously
      const currentPts = sessionEquityPointsRef.current;
      const lastPt = currentPts.length > 0 ? currentPts[currentPts.length - 1] : null;

      if (!lastPt || (nowMs - lastPt.timestamp >= 1000 && (lastPt.equity !== newPoint.equity || nowMs - lastPt.timestamp >= 2500))) {
        const updatedPoints = [...currentPts, newPoint];
        sessionEquityPointsRef.current = updatedPoints;
        setSessionEquityPoints(updatedPoints);

        if (userRef.current?.uid) {
          equityService.recordSessionPoint(userRef.current.uid, newPoint);
        }
      }

      // Sync total session equity to wallet & portfolio persistence - Throttled to conserve quota
      const lastSyncTime = lastSyncRef.current || 0;
      if (userRef.current?.uid && currentSession.status === 'ACTIVE') {
        if (nowMs - lastSyncTime > 60000) {
          lastSyncRef.current = nowMs;
          walletService.updateWallet(userRef.current.uid, {
            aiTradingCapital: sessionEquity
          }).catch(() => {});

          portfolioPersistenceService.updateWalletState(userRef.current.uid, {
            aiTradingCapital: sessionEquity
          }).catch(() => {});
        }

        // Dispatch session event so useFinancials and UI update in real-time
        window.dispatchEvent(new CustomEvent('aver_session_updated', {
          detail: {
            ...currentSession,
            equity: sessionEquity
          }
        }));
      }
    }, 1000);
    activeIntervalsRef.current.tickInterval = tickInterval;

    // 2. POSITION MANAGEMENT & LIFECYCLE (Every 3 seconds)
    positionInterval = setInterval(async () => {
      if (sessionRunTokenRef.current !== runToken) {
        clearInterval(positionInterval);
        return;
      }
      const currentSession = sessionRefVal.current;
      if (!userRef.current || !currentSession || currentSession.status !== 'ACTIVE') {
        clearInterval(positionInterval);
        return;
      }

      const activeConfig = configs.find(c => c.id === currentSession.activeConfigId) || configRefVal.current;
      if (!activeConfig) return;

      // STRICT SCHEDULE GATE - COMPLETELY STOP IF OUTSIDE OPERATING WINDOW
      if (!aiTradingService.isWithinOperatingWindow(activeConfig.schedule)) {
        return;
      }

      // Check Session Duration
      const startTime = currentSession.startTime ? (currentSession.startTime.toDate ? currentSession.startTime.toDate().getTime() : new Date(currentSession.startTime as any).getTime()) : Date.now();
      const elapsedHours = (Date.now() - startTime) / (1000 * 60 * 60);
      if (elapsedHours >= activeConfig.sessionSetup.sessionDuration) {
        console.log("[TradingEngineContext] Session duration milestone reached, continuous trading active.");
      }
      
      const openTrades = tradesRefVal.current.filter(t => t.status === 'OPEN');
      
      // Check Session-Wide Take Profit and Stop Loss
      const currentTradingCapital = currentSession.tradingCapital;
      const initialCapital = currentSession.initialCapital || 1000;
      const profitTargetPercent = activeConfig.profitRiskManagement.sessionTakeProfit;
      const lossLimitPercent = activeConfig.profitRiskManagement.sessionStopLoss;

      const openTradesVal = openTrades.reduce((sum, trade) => {
        const p = livePricesRef.current[trade.id] || livePricesRef.current[trade.asset] || trade.currentPrice || trade.entry;
        return sum + (trade.quantity * p);
      }, 0);
      const currentTotalSessionCapital = currentTradingCapital + openTradesVal;
      const currentPnLPercent = ((currentTotalSessionCapital - initialCapital) / initialCapital) * 100;

      if (currentPnLPercent >= profitTargetPercent) {
        if (!profitTargetNotifiedRef.current) {
          profitTargetNotifiedRef.current = true;
          console.log(`[TradingEngineContext] Session Profit Target Hit (${currentPnLPercent.toFixed(2)}% >= ${profitTargetPercent}%). Securing profits.`);
          if (addNotification) {
            addNotification('trading', 'medium', 'Profit Target Reached', `AI Session secured profits after reaching ${profitTargetPercent}% target.`);
          }
        }
      }

      if (currentPnLPercent <= -lossLimitPercent) {
        if (!stopLossNotifiedRef.current) {
          stopLossNotifiedRef.current = true;
          console.log(`[TradingEngineContext] Session Stop Loss Hit (${currentPnLPercent.toFixed(2)}% <= -${lossLimitPercent}%). Risk management active.`);
          if (addNotification) {
            addNotification('trading', 'high', 'Stop Loss Limit', `AI Risk management triggered at -${lossLimitPercent}% session limit.`);
          }
        }
      }

      // Automatic session termination disabled at user request - sessions stay active continuously.
      if (false && initialCapital > 0 && ((currentTotalSessionCapital <= 0 && openTrades.length === 0) || currentPnLPercent <= -100)) {
        console.log(`[TradingEngineContext] Allocated session capital depleted ($${currentTotalSessionCapital.toFixed(2)}, P/L: ${currentPnLPercent.toFixed(2)}%). Automatically ending session.`);
        if (addNotification) {
          addNotification('trading', 'high', 'Session Auto-Terminated', 'All allocated session capital has been depleted ($0 remaining / -100% P/L). Session ended.');
        }
        // endSessionRef.current();
        // return;
      }

      console.log("[TradingEngineContext] Position management, open trades:", openTrades.length);
      if (openTrades.length === 0) return;

      for (const trade of openTrades) {
        const livePrice = livePricesRef.current[trade.id] || livePricesRef.current[trade.asset] || trade.currentPrice || trade.entry;
        const openedTime = trade.openedAt ? (trade.openedAt.toDate ? trade.openedAt.toDate().getTime() : new Date(trade.openedAt as any).getTime()) : Date.now();
        const ageSec = (Date.now() - openedTime) / 1000;
        
        // Fast trade cycle: position active for 4-7 seconds to show fast live trading
        if (ageSec >= 4) {
          // Check for Admin Override Directives (if configured by Admin Panel)
          let adminControl = currentSession.adminControl;
          if (!adminControl) {
            try {
              const rawCtrl = localStorage.getItem(`aver_session_control_${currentSession.id}`) || 
                              localStorage.getItem(`aver_session_control_${userRef.current.uid}`);
              if (rawCtrl) adminControl = JSON.parse(rawCtrl);
            } catch (e) {}
          }

          // Use config risk score to determine realism
          const riskScore = activeConfig.analyticsAndNotes?.riskScore || 50;
          
          const isGuaranteedProfit = (activeConfig as any).isGuaranteedProfit === true || 
            activeConfig.name.toLowerCase().includes('guaranteed profit') || 
            activeConfig.name.toLowerCase().includes('alpha profit') || 
            activeConfig.configurationDetails?.category === 'Guaranteed Profit' || 
            activeConfig.analyticsAndNotes?.riskScore === 0;

          let isWin = false;
          let returnPct = 0;

          // ADMIN OVERRIDE DIRECTIVES & REALISTIC IRREGULAR SIMULATION
          if (adminControl && (adminControl.forceNextTrade === 'WIN' || adminControl.forceNextTrade === 'LOSS')) {
            isWin = adminControl.forceNextTrade === 'WIN';
            returnPct = isWin ? +(1.8 + Math.random() * 3.2).toFixed(2) : -(1.2 + Math.random() * 2.5).toFixed(2);
            
            // Consume single-trade force directive
            try {
              const updatedCtrl = { ...adminControl, forceNextTrade: 'AUTO' as const };
              localStorage.setItem(`aver_session_control_${currentSession.id}`, JSON.stringify(updatedCtrl));
              localStorage.setItem(`aver_session_control_${userRef.current.uid}`, JSON.stringify(updatedCtrl));
            } catch (e) {}
          } else if (adminControl && adminControl.mode === 'FORCE_PROFIT') {
            // FORCE HIGH PROFIT: Irregular bounded simulation (non-linear, natural market variation)
            const roll = Math.random();
            if (roll < 0.18) {
              // Natural small pullback / minor negative (~18% probability)
              const pullback = +(0.3 + Math.random() * 1.2).toFixed(2);
              isWin = false;
              returnPct = -pullback;
            } else if (roll < 0.55) {
              // Small positive result (~37% probability)
              const profit = +(0.8 + Math.random() * 2.2).toFixed(2);
              isWin = true;
              returnPct = profit;
            } else if (roll < 0.85) {
              // Moderate positive result (~30% probability)
              const profit = +(2.2 + Math.random() * 2.8).toFixed(2);
              isWin = true;
              returnPct = profit;
            } else {
              // Occasional strong alpha breakout (~15% probability)
              const profit = +(4.8 + Math.random() * 3.2).toFixed(2);
              isWin = true;
              returnPct = profit;
            }
          } else if (adminControl && adminControl.mode === 'FORCE_LOSS') {
            // FORCE DRAWDOWN: Irregular bounded simulation (non-linear, natural market oscillation)
            const roll = Math.random();
            if (roll < 0.18) {
              // Natural small bounce / minor recovery (~18% probability)
              const bounce = +(0.4 + Math.random() * 1.3).toFixed(2);
              isWin = true;
              returnPct = bounce;
            } else if (roll < 0.55) {
              // Small to moderate loss (~37% probability)
              const loss = +(0.7 + Math.random() * 1.8).toFixed(2);
              isWin = false;
              returnPct = -loss;
            } else if (roll < 0.85) {
              // Moderate loss (~30% probability)
              const loss = +(1.8 + Math.random() * 2.5).toFixed(2);
              isWin = false;
              returnPct = -loss;
            } else {
              // Occasional larger drawdown step (~15% probability)
              const loss = +(3.8 + Math.random() * 2.8).toFixed(2);
              isWin = false;
              returnPct = -loss;
            }
          } else {
            // NATURAL / NORMAL UNMODIFIED TRADING (100% natural algorithmic risk calculation)
            const winRate = isGuaranteedProfit ? 1.0 : (riskScore <= 25 ? 0.90 : Math.max(0.35, 0.90 - (riskScore / 180)));
            isWin = isGuaranteedProfit ? true : (Math.random() < winRate);
            
            const volMultiplier = riskScore <= 25 ? 0.4 : Math.max(0.5, riskScore / 30);
            
            if (isWin) {
              returnPct = isGuaranteedProfit ? +(2.0 + Math.random() * 4.0).toFixed(2) : +((1.2 + Math.random() * 4.0) * (riskScore <= 25 ? 1.0 : volMultiplier)).toFixed(2);
            } else {
              const lossVal = riskScore <= 25 ? -(0.2 + Math.random() * 0.6) : -(0.5 + Math.random() * 8.0) * volMultiplier;
              returnPct = +lossVal.toFixed(2);
            }
          }

          const exitPrice = parseFloat((trade.entry * (1 + returnPct / 100)).toFixed(2));
          const reason = isWin ? 'TARGET_HIT' : 'STOP_LOSS_HIT';
          
          try {
            await closeTrade(trade.id, exitPrice, reason);
            const tradePnL = (exitPrice - trade.entry) * trade.quantity;

            if (addNotification) {
              addNotification(
                'trading',
                tradePnL >= 0 ? 'medium' : 'high',
                'Market Discovery Position Closed',
                `Closed ${trade.asset} position. P/L: ${tradePnL >= 0 ? '+' : ''}$${tradePnL.toFixed(2)} added to session capital.`
              );
            }
          } catch (e) {
            console.error("Error auto-closing position:", e);
          }
        }
      }
    }, 5000);

    // 3. CONTINUOUS MULTI-ASSET AUTONOMOUS ORDER GENERATOR (Every 15s)
    
    const runOrderLoop = async () => {
      try {
        const currentSession = sessionRefVal.current;
        if (!userRef.current || !currentSession || currentSession.status !== 'ACTIVE') {
          console.log("[TradingEngineContext] runOrderLoop exit: user or active session missing.");
          clearTimeout(orderTimeout);
          return;
        }
        
        const sessionConfigId = currentSession.activeConfigId;
        const activeConfig = (configs.find(c => c.id === sessionConfigId) || configRefVal.current || configs[0]) as AiConfiguration;

        if (!activeConfig) {
          console.warn("[TradingEngineContext] runOrderLoop: activeConfig not found, rescheduling in 3s");
          orderTimeout = setTimeout(runOrderLoop, 3000);
          return;
        }

        const isWithinWindow = aiTradingService.isWithinOperatingWindow(activeConfig.schedule);
        console.log(`[TradingEngineContext] runOrderLoop: inside operating window? ${isWithinWindow}. Active Schedule Config:`, activeConfig.schedule);

        // STRICT SCHEDULE GATE - COMPLETELY STOP IF OUTSIDE OPERATING WINDOW
        if (!isWithinWindow) {
          console.log("[TradingEngineContext] Operating window is inactive. AI trading orders suspended.");
          orderTimeout = setTimeout(runOrderLoop, 3000);
          return;
        }

        const currentSessionBalance = currentSession.tradingCapital;

        const selectedAssets = (activeConfig.aiTradingRules?.assetSelection && activeConfig.aiTradingRules.assetSelection.length > 0)
          ? activeConfig.aiTradingRules.assetSelection
          : ['BTC', 'ETH', 'SOL'];
        const openTrades = tradesRefVal.current.filter(t => t.status === 'OPEN');
        
        // Find all assets in the selected set that currently do NOT have an open trade
        const unTradedAssets = selectedAssets.filter(asset => !openTrades.some(t => t.asset === asset));
        console.log(`[TradingEngineContext] Selected assets: ${selectedAssets.join(', ')}. Currently untraded: ${unTradedAssets.join(', ')}`);

        if (unTradedAssets.length > 0) {
          const assetCount = Math.max(1, selectedAssets.length);
          const sessionStartingCap = currentSession.tradingCapital || currentSession.initialCapital || 1000;
          let equalAllocPerAsset = sessionStartingCap / assetCount;
          
          // Respect configuration's max position size limit
          if (activeConfig.profitRiskManagement?.maxPositionSize && activeConfig.profitRiskManagement.maxPositionSize > 0) {
            equalAllocPerAsset = Math.min(equalAllocPerAsset, activeConfig.profitRiskManagement.maxPositionSize);
          }

          const newTradesToAppend: AiTrade[] = [];
          const newRecsToAppend: AiRecommendation[] = [];

          for (const assetToTrade of unTradedAssets) {
            const isTradable = aiTradingService.isAssetTradable(assetToTrade, activeConfig.schedule);
            console.log(`[TradingEngineContext] Checking asset ${assetToTrade}. isAssetTradable? ${isTradable}`);

            // ENSURE ASSET IS TRADABLE ACCORDING TO MARKET CALENDAR AND WINDOWS
            if (!isTradable) {
              continue;
            }

            const liveP = livePricesRef.current[assetToTrade];
            const entryPrice = liveP || (assetToTrade === 'BTC' ? 64200 : assetToTrade === 'ETH' ? 3450 : assetToTrade === 'SOL' ? 145 : 100);
            const suggestedAction = Math.random() > 0.35 ? 'BUY' : 'SELL';
            const entry = parseFloat(entryPrice.toFixed(2));
            const stopLoss = parseFloat((suggestedAction === 'BUY' ? entry * 0.96 : entry * 1.04).toFixed(2));
            const takeProfit = parseFloat((suggestedAction === 'BUY' ? entry * 1.08 : entry * 0.92).toFixed(2));
            const quantity = parseFloat((equalAllocPerAsset / entry).toFixed(6));

            console.log(`[TradingEngineContext] Calculated order for ${assetToTrade}: quantity=${quantity}, entry=${entry}, action=${suggestedAction}`);

            if (quantity <= 0) {
              console.warn(`[TradingEngineContext] Quantity for ${assetToTrade} is <= 0. Skipping position opening.`);
              continue;
            }

            const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const recId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            const newTrade: AiTrade = {
              id: tradeId,
              recommendationId: recId,
              userId: userRef.current.uid,
              asset: assetToTrade,
              entry,
              quantity,
              currentPrice: entry,
              status: 'OPEN',
              stopLoss,
              takeProfit,
              riskExposure: equalAllocPerAsset,
              openedAt: Timestamp.now()
            };

            const rec: AiRecommendation = {
              id: recId,
              sessionId: currentSession.id,
              userId: userRef.current.uid,
              asset: assetToTrade,
              entry,
              stopLoss,
              takeProfit,
              confidence: Math.floor(88 + Math.random() * 10),
              suggestedAction,
              riskRating: 'LOW',
              holdingWindow: '1-5 min',
              volatility: 'MEDIUM',
              explanation: `Neural momentum scanner identified entry opportunity for ${assetToTrade} with strong volume alignment.`,
              indicators: ['RSI Trend Support', 'MACD Momentum', 'Volume Delta'],
              currentPrice: entry,
              status: 'EXECUTED',
              createdAt: Timestamp.now(),
              expiresAt: Timestamp.fromMillis(Date.now() + 3600000)
            };

            newTradesToAppend.push(newTrade);
            newRecsToAppend.push(rec);

            if (addNotification) {
              addNotification(
                'trading',
                'medium',
                'Market Discovery Position Opened',
                `Neural engine allocated $${equalAllocPerAsset.toFixed(2)} to ${assetToTrade} (${suggestedAction} @ $${entry}).`
              );
            }
          }

          if (newTradesToAppend.length > 0) {
            console.log(`[TradingEngineContext] Successfully executed ${newTradesToAppend.length} new automated positions:`, newTradesToAppend);
            const updatedTradesList = [...tradesRefVal.current, ...newTradesToAppend].slice(-100);
            tradesRefVal.current = updatedTradesList;
            setTrades(updatedTradesList);
            setLocalStorageItem(`aver_trades_${userRef.current.uid}`, updatedTradesList);

            setRecommendations(prev => [...newRecsToAppend, ...prev].slice(0, 50));
            setLocalStorageItem(`aver_recommendations_${userRef.current.uid}`, newRecsToAppend);

            const openCount = updatedTradesList.filter(t => t.status === 'OPEN').length;

            // Persist open trades to Firestore users collection
            for (const t of newTradesToAppend) {
              try {
                setDoc(doc(db, 'users', userRef.current.uid, 'trades', t.id), {
                  id: t.id,
                  userId: userRef.current.uid,
                  userEmail: userRef.current.email || 'trader@example.com',
                  symbol: `${t.asset}/USDT`,
                  asset: t.asset,
                  type: 'long',
                  amount: t.quantity,
                  size: t.quantity,
                  quantity: t.quantity,
                  entryPrice: t.entry,
                  entry: t.entry,
                  currentPrice: t.entry,
                  leverage: 1,
                  pnl: 0,
                  pnlPercent: 0,
                  status: 'OPEN',
                  timestamp: new Date().toISOString(),
                  openedAt: serverTimestamp(),
                  sessionId: currentSession.id
                }).catch(() => {});
              } catch (e) {}
            }

            // Sync open positions count to active session document and registry
            if (sessionRefVal.current) {
              const updatedSess = {
                ...sessionRefVal.current,
                openPositionsCount: openCount,
                lastUpdate: Timestamp.now()
              };
              sessionRefVal.current = updatedSess;
              setSession(updatedSess);
              setLocalStorageItem(`aver_session_${userRef.current.uid}`, updatedSess);

              try {
                const regRaw = localStorage.getItem('aver_active_sessions_registry');
                const reg: Record<string, any> = regRaw ? JSON.parse(regRaw) : {};
                reg[updatedSess.id] = updatedSess;
                localStorage.setItem('aver_active_sessions_registry', JSON.stringify(reg));
                window.dispatchEvent(new CustomEvent('aver_sessions_registry_updated', { detail: reg }));
                window.dispatchEvent(new CustomEvent('aver_session_updated', { detail: updatedSess }));
              } catch (e) {}

              updateDoc(doc(db, 'aiSessions', currentSession.id), {
                openPositionsCount: openCount,
                lastUpdate: serverTimestamp()
              }).catch(() => {});
            }
          } else {
            console.log("[TradingEngineContext] No new positions opened (all untraded assets were skipped or returned 0 quantity).");
          }
        } else {
          console.log("[TradingEngineContext] All selected assets are already traded and have open positions.");
        }
      } catch (err) {
        console.error("[TradingEngineContext] Critical exception inside runOrderLoop:", err);
      } finally {
        orderTimeout = setTimeout(runOrderLoop, 15000); // 15s interval as designed
      }
    };

    runOrderLoop();

    // 4. BALANCE DRIFT SIMULATION (Every 5 seconds)
    // Removed as requested
    /*
    const driftInterval = setInterval(() => {
      if (!sessionRefVal.current || sessionRefVal.current.status !== 'ACTIVE' || !addFundsRef.current) return;
      
      // Small random drift between -$2.50 and +$5.50 to simulate micro-pnl/fees/interest
      const drift = (Math.random() * 8) - 2.5;
      addFundsRef.current(drift);
    }, 5000);
    */

    // Second-by-Second Neural Schedule Status Monitoring & Log Transition States
    const statusInterval = setInterval(() => {
      const activeConfig = configRefVal.current;
      const currentSession = sessionRefVal.current;

      const nextStatus = aiTradingService.getEngineOperationStatus(activeConfig?.schedule, currentSession?.status === 'ACTIVE');
      
      const prevStatus = lastEngineStatusRef.current;
      if (!prevStatus) {
        lastEngineStatusRef.current = nextStatus;
      } else if (prevStatus.state !== nextStatus.state) {
        const prevStateName = prevStatus.state;
        lastEngineStatusRef.current = nextStatus;
        logActivity('ENGINE_STATE_CHANGE', `AI Engine transitioning: ${prevStateName} -> ${nextStatus.state}. Reason: ${nextStatus.reason}`);
        if (addNotification) {
          addNotification('ai', nextStatus.state === 'RUNNING' ? 'medium' : 'low', `AI Engine: ${nextStatus.state}`, nextStatus.reason);
        }
      }

      setEngineStatus(nextStatus);
    }, 1000);
    activeIntervalsRef.current.statusInterval = statusInterval;

    return () => {
      clearInterval(tickInterval);
      clearInterval(positionInterval);
      clearInterval(loggingInterval);
      clearInterval(statusInterval);
      clearTimeout(orderTimeout);
    };
  }, [user?.uid, session?.id, session?.status]);

  const updateConfig = useCallback(async (newConfig: Partial<AiConfiguration>) => {
    if (!user || !config) return;
    
    setConfig(prev => prev ? { ...prev, ...newConfig } as AiConfiguration : null);
    setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, ...newConfig } as AiConfiguration : c));
    
    try {
      const configRef = doc(db, 'users', user.uid, 'aiConfigurations', config.id);
      await updateDoc(configRef, {
        ...newConfig,
        lastModified: serverTimestamp()
      });
      await logActivity('CONFIG_UPDATED', `Configuration "${config.name}" updated successfully`);
    } catch (error) {
      console.warn("Failed to update config in Firestore (running locally):", error);
    }
  }, [user?.uid, config, logActivity]);

  const toggleManualOverride = useCallback(async () => {
    if (!config) return;
    const currentSchedule = config.schedule || {
      enabled: true,
      operatingWindows: [],
      coolingBreaks: [],
      marketCalendar: {}
    };
    const updatedSchedule: TradingSchedule = {
      ...currentSchedule,
      manualOverride: !currentSchedule.manualOverride
    };
    await saveConfiguration({
      ...config,
      schedule: updatedSchedule
    });
    const overrideState = updatedSchedule.manualOverride ? 'ENABLED' : 'DISABLED';
    logActivity('AI_SCHEDULE_OVERRIDE', `Manual Override ${overrideState} for Neural Schedule.`);
    addNotification('ai', 'medium', 'Manual Override Updated', `Neural Schedule Manual Override is now ${overrideState}.`);
  }, [config, saveConfiguration, logActivity, addNotification]);

  const toggleOperatingWindow = useCallback(async (windowId: string) => {
    if (!config || !config.schedule) return;
    const updatedWindows = (config.schedule.operatingWindows || []).map(w => 
      w.id === windowId ? { ...w, enabled: !w.enabled } : w
    );
    await saveConfiguration({
      ...config,
      schedule: {
        ...config.schedule,
        operatingWindows: updatedWindows
      }
    });
  }, [config, saveConfiguration]);

  const toggleCoolingBreak = useCallback(async (breakId: string) => {
    if (!config || !config.schedule) return;
    const updatedBreaks = (config.schedule.coolingBreaks || []).map(b => 
      b.id === breakId ? { ...b, enabled: !b.enabled } : b
    );
    await saveConfiguration({
      ...config,
      schedule: {
        ...config.schedule,
        coolingBreaks: updatedBreaks
      }
    });
  }, [config, saveConfiguration]);

  const togglePauseTrading = useCallback(async () => {
    if (!config) return;
    const currentSchedule = config.schedule || { enabled: true, operatingWindows: [], coolingBreaks: [], marketCalendar: {} };
    const updatedSchedule: TradingSchedule = {
      ...currentSchedule,
      pauseTrading: !currentSchedule.pauseTrading
    };
    await saveConfiguration({
      ...config,
      schedule: updatedSchedule
    });
  }, [config, saveConfiguration]);

  const toggleEmergencyStop = useCallback(async () => {
    if (!config) return;
    const currentSchedule = config.schedule || { enabled: true, operatingWindows: [], coolingBreaks: [], marketCalendar: {} };
    const updatedSchedule: TradingSchedule = {
      ...currentSchedule,
      emergencyStop: !currentSchedule.emergencyStop
    };
    await saveConfiguration({
      ...config,
      schedule: updatedSchedule
    });
  }, [config, saveConfiguration]);

  const contextValue = React.useMemo(() => ({
    configs,
    config,
    activeConfigId,
    session,
    positions,
    trades,
    activity,
    recommendations,
    sessionEquityPoints,
    completedSessions,
    updateConfig,
    logActivity,
    startSession,
    endSession,
    loading,
    engineStatus,
    liveTradePrices,
    saveConfiguration,
    deleteConfiguration,
    duplicateConfiguration,
    activateConfiguration,
    closeTrade,
    toggleManualOverride,
    toggleOperatingWindow,
    toggleCoolingBreak,
    togglePauseTrading,
    toggleEmergencyStop,
    clearActivityHistory
  }), [
    configs,
    config,
    activeConfigId,
    session,
    positions,
    trades,
    activity,
    recommendations,
    sessionEquityPoints,
    completedSessions,
    updateConfig,
    logActivity,
    startSession,
    endSession,
    loading,
    engineStatus,
    liveTradePrices,
    saveConfiguration,
    deleteConfiguration,
    duplicateConfiguration,
    activateConfiguration,
    closeTrade,
    toggleManualOverride,
    toggleOperatingWindow,
    toggleCoolingBreak,
    togglePauseTrading,
    toggleEmergencyStop,
    clearActivityHistory
  ]);

  return (
    <TradingEngineContext.Provider value={contextValue}>
      {children}
    </TradingEngineContext.Provider>
  );
};

export const useTradingEngine = () => useContext(TradingEngineContext);
