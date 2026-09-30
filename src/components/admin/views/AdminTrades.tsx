import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Search, Filter, ShieldCheck, Clock, ExternalLink, 
  ArrowUpRight, ArrowDownRight, DollarSign, User, AlertCircle, CheckCircle2,
  Activity, Play, Square, Zap, RefreshCw, Layers, ShieldAlert, ChevronRight,
  Sliders, Trash2, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, getDocs, doc, getDoc, updateDoc, Timestamp, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { aiTradingService } from '../../../services/aiTradingService';
import { walletService } from '../../../services/walletService';
import { portfolioPersistenceService } from '../../../services/portfolioPersistenceService';
import AdminSessionControlModal from './AdminSessionControlModal';
import { SessionAdminControl } from '../../../types/aiTrading';
import { useAuth } from '../../../contexts/AuthContext';

interface ActiveSessionRecord {
  id: string;
  userId: string;
  userEmail: string;
  status: 'ACTIVE' | 'INACTIVE';
  startTime: string | number | any;
  tradingCapital: number;
  initialCapital: number;
  openPositionsCount: number;
  totalProfit: number;
  totalLoss: number;
  activeConfigId?: string;
  strategyName?: string;
  adminControl?: SessionAdminControl;
  isDeleted?: boolean;
}

interface TradeRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  symbol: string;
  type: 'buy' | 'sell' | 'long' | 'short';
  amount: number;
  entryPrice: number;
  currentPrice?: number;
  leverage?: number;
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
  timestamp: string;
  sessionId?: string;
}

const formatSessionStartTime = (ts: any): string => {
  if (!ts) return 'Just now';
  try {
    if (typeof ts === 'object' && ts !== null) {
      if (typeof ts.toDate === 'function') {
        return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (typeof ts.seconds === 'number') {
        return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) {}
  return 'Just now';
};

export default function AdminTrades({ theme }: { theme: 'light' | 'dark' }) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionRecord[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { email: string }>>({});
  const [search, setSearch] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedControlSession, setSelectedControlSession] = useState<ActiveSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const latestFirestoreDocsRef = useRef<any[]>([]);
  const latestUsersDocsRef = useRef<any[]>([]);
  const userMapRef = useRef<Record<string, { email: string }>>({});
  const syncSessionsRef = useRef<(firestoreDocs?: any[]) => ActiveSessionRecord[]>(() => []);

  const isDark = theme === 'dark';

  // 1. Listen to users collection in real time to resolve emails accurately
  useEffect(() => {
    let unsubUsers: (() => void) | null = null;
    try {
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        latestUsersDocsRef.current = snap.docs;
        const newUserMap: Record<string, { email: string }> = {};
        snap.forEach(uDoc => {
          const d = uDoc.data();
          newUserMap[uDoc.id] = { email: d.email || 'user@example.com' };
        });
        userMapRef.current = newUserMap;
        setUserMap(newUserMap);
        if (syncSessionsRef.current) {
          syncSessionsRef.current();
        }
      }, (err) => {
        console.warn("[AdminTrades] User map listener error:", err);
      });
    } catch (e) {}

    return () => {
      if (unsubUsers) unsubUsers();
    };
  }, []);

  // 2. Real-time listener for active aiSessions (authoritative source of truth)
  useEffect(() => {
    let unsubSessions: (() => void) | null = null;
    let unsubTradesList: (() => void)[] = [];

    console.log("[ADMIN] Initializing live active sessions listener");

    const isSessionStopped = (id: string) => {
      if (!id) return true;
      try {
        if (localStorage.getItem(`aver_stopped_session_${id}`) === 'true') return true;
        if (sessionStorage.getItem(`aver_stopped_session_${id}`) === 'true') return true;
      } catch (e) {}
      return false;
    };

    const syncSessions = (firestoreDocs?: any[]) => {
      if (firestoreDocs) {
        latestFirestoreDocsRef.current = firestoreDocs;
      }
      const docsToProcess = firestoreDocs || latestFirestoreDocsRef.current || [];
      const currentUsersMap = userMapRef.current || userMap;
      const sessionsMap = new Map<string, ActiveSessionRecord>();

      // ONLY process Firestore 'aiSessions' collection documents (authoritative active sessions)
      if (docsToProcess && docsToProcess.length > 0) {
        docsToProcess.forEach(sDoc => {
          const data = typeof sDoc.data === 'function' ? sDoc.data() : sDoc;
          const docId = sDoc.id || data.id;
          const statusVal = String(data.status || '').toUpperCase();

          const isStatusActive = (statusVal === 'ACTIVE' || statusVal === 'RUNNING');
          const isDocValid = isStatusActive && data.isDeleted !== true && !data.endTime && docId && !isSessionStopped(docId);

          if (!isDocValid) {
            // Asynchronously prune inactive or stopped documents from Firestore so they do not linger
            if (docId && (data.isDeleted === true || statusVal === 'INACTIVE' || statusVal === 'STOPPED' || data.endTime || isSessionStopped(docId))) {
              deleteDoc(doc(db, 'aiSessions', docId)).catch(() => {});
            }
            return;
          }

          const uId = data.userId || 'unknown';

          // Verify with latest user doc in Firestore: if the user document shows 0 active trading capital
          // and no active session, then this session document is an orphan and must be purged
          if (latestUsersDocsRef.current && latestUsersDocsRef.current.length > 0) {
            const uDoc = latestUsersDocsRef.current.find(u => u.id === uId);
            if (uDoc) {
              const uData = typeof uDoc.data === 'function' ? uDoc.data() : uDoc;
              const hasCap = Number(uData.aiTradingCapital || 0) > 0;
              const hasActiveSession = Boolean(uData.aiSession || uData.activeSession);
              if (!hasCap && !hasActiveSession) {
                // Orphan session doc in Firestore - delete it
                deleteDoc(doc(db, 'aiSessions', docId)).catch(() => {});
                return;
              }
            }
          }

          const userEmail = data.userEmail || currentUsersMap[uId]?.email || (data.userId === user?.uid ? user?.email : undefined) || 'trader@example.com';
          
          const sessionRecord: ActiveSessionRecord = {
            id: docId,
            userId: uId,
            userEmail: userEmail,
            status: 'ACTIVE',
            startTime: data.startTime || new Date().toISOString(),
            tradingCapital: data.tradingCapital ?? data.initialCapital ?? 0,
            initialCapital: data.initialCapital ?? data.tradingCapital ?? 1000,
            openPositionsCount: data.openPositionsCount || 0,
            totalProfit: data.totalProfit || 0,
            totalLoss: data.totalLoss || 0,
            activeConfigId: data.activeConfigId,
            strategyName: data.strategyName || 'Algorithmic Strategy',
            adminControl: data.adminControl || { mode: 'NORMAL', forceNextTrade: 'AUTO' }
          };

          // Strictly enforce at most ONE active session per user.
          // If duplicate session documents exist for the same userId, keep only the latest one
          // and delete the older duplicate from Firestore immediately.
          const existingForUser = Array.from(sessionsMap.values()).find(s => s.userId === uId);
          if (existingForUser) {
            const getMs = (t: any) => {
              if (!t) return 0;
              if (typeof t.toDate === 'function') return t.toDate().getTime();
              if (typeof t.seconds === 'number') return t.seconds * 1000;
              const parsed = new Date(t).getTime();
              return isNaN(parsed) ? 0 : parsed;
            };
            if (getMs(sessionRecord.startTime) > getMs(existingForUser.startTime)) {
              deleteDoc(doc(db, 'aiSessions', existingForUser.id)).catch(() => {});
              sessionsMap.delete(existingForUser.id);
              sessionsMap.set(docId, sessionRecord);
            } else {
              deleteDoc(doc(db, 'aiSessions', docId)).catch(() => {});
            }
          } else {
            sessionsMap.set(docId, sessionRecord);
          }
        });
      }

      // Clean up any stale local registry keys that are not active in database
      try {
        const regRaw = localStorage.getItem('aver_active_sessions_registry');
        if (regRaw) {
          const reg = JSON.parse(regRaw);
          let changed = false;
          for (const k of Object.keys(reg)) {
            if (!sessionsMap.has(k)) {
              delete reg[k];
              changed = true;
            }
          }
          if (changed) {
            if (Object.keys(reg).length === 0) {
              localStorage.removeItem('aver_active_sessions_registry');
            } else {
              localStorage.setItem('aver_active_sessions_registry', JSON.stringify(reg));
            }
          }
        }
      } catch (e) {}

      const sessionsList = Array.from(sessionsMap.values());

      // Sort by start time descending
      sessionsList.sort((a, b) => {
        const getMs = (t: any) => {
          if (!t) return 0;
          if (typeof t.toDate === 'function') return t.toDate().getTime();
          if (typeof t.seconds === 'number') return t.seconds * 1000;
          const parsed = new Date(t).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };
        return getMs(b.startTime) - getMs(a.startTime);
      });

      setActiveSessions(sessionsList);
      setLoading(false);

      // Keep selectedControlSession continuously updated with live mirror
      setSelectedControlSession(prev => {
        if (!prev) return null;
        const updated = sessionsList.find(s => s.id === prev.id);
        return updated || null;
      });

      return sessionsList;
    };

    syncSessionsRef.current = syncSessions;

    // Real-time listener for active aiSessions
    try {
      unsubSessions = onSnapshot(collection(db, 'aiSessions'), (snapshot) => {
        const sessionsList = syncSessions(snapshot.docs);

        // Subscribe to real-time trades for all active session users
        unsubTradesList.forEach(unsub => unsub());
        unsubTradesList = [];

        const activeUserIds = Array.from(new Set(sessionsList.map(s => s.userId).filter(uid => uid && !uid.startsWith('local-'))));
        if (activeUserIds.length > 0) {
          activeUserIds.forEach(uId => {
            try {
              const uTrades = onSnapshot(collection(db, 'users', uId, 'trades'), (tSnap) => {
                const userTrades: TradeRecord[] = [];
                tSnap.forEach(tDoc => {
                  const tData = tDoc.data();
                  userTrades.push({
                    id: tDoc.id,
                    userId: uId,
                    userEmail: (userMapRef.current && userMapRef.current[uId]?.email) || userMap[uId]?.email || 'trader@example.com',
                    symbol: tData.symbol || 'BTC/USDT',
                    type: tData.type || 'long',
                    amount: tData.amount || tData.size || 0,
                    entryPrice: tData.entryPrice || 0,
                    currentPrice: tData.currentPrice || tData.entryPrice || 0,
                    leverage: tData.leverage || 1,
                    pnl: tData.pnl || 0,
                    status: tData.status || 'OPEN',
                    timestamp: tData.timestamp || new Date().toISOString(),
                    sessionId: tData.sessionId
                  });
                });

                setTrades(prev => {
                  const otherTrades = prev.filter(t => t.userId !== uId);
                  const combined = [...otherTrades, ...userTrades];
                  combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  return combined;
                });
              }, () => {});
              unsubTradesList.push(uTrades);
            } catch (e) {}
          });
        } else {
          setTrades([]);
        }
      }, (err) => {
        console.warn("[AdminTrades] Error in aiSessions onSnapshot:", err);
        syncSessions();
        setLoading(false);
      });
    } catch (e) {
      syncSessions();
      setLoading(false);
    }

    const handleStorageUpdate = () => {
      syncSessions();
    };

    const handleSessionTerminated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const termId = customEvent.detail?.sessionId;
      const termUserId = customEvent.detail?.userId;

      if (termId) {
        try {
          localStorage.setItem(`aver_stopped_session_${termId}`, 'true');
          sessionStorage.setItem(`aver_stopped_session_${termId}`, 'true');
          localStorage.removeItem(`aver_session_${termId}`);
          localStorage.removeItem(`aver_active_session_${termId}`);
          localStorage.removeItem(`aver_session_control_${termId}`);
          if (termUserId) {
            localStorage.removeItem(`aver_session_${termUserId}`);
          }
          const regRaw = localStorage.getItem('aver_active_sessions_registry');
          if (regRaw) {
            const reg = JSON.parse(regRaw);
            delete reg[termId];
            localStorage.setItem('aver_active_sessions_registry', JSON.stringify(reg));
          }
        } catch (err) {}

        // Immediately purge from latestFirestoreDocsRef
        latestFirestoreDocsRef.current = latestFirestoreDocsRef.current.filter(d => {
          const docId = d.id || (typeof d.data === 'function' ? d.data()?.id : d.id);
          return docId !== termId;
        });

        // Immediately purge from activeSessions state
        setActiveSessions(prev => prev.filter(s => s.id !== termId));
        setSelectedControlSession(prev => (prev?.id === termId ? null : prev));
      }

      syncSessions();
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('aver_sessions_registry_updated', handleStorageUpdate);
    window.addEventListener('aver_session_updated', handleStorageUpdate);
    window.addEventListener('aver_session_launched', handleStorageUpdate);
    window.addEventListener('aver_session_terminated', handleSessionTerminated);
    window.addEventListener('aver_admin_control_updated', handleStorageUpdate);

    return () => {
      if (unsubSessions) unsubSessions();
      unsubTradesList.forEach(unsub => unsub());
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('aver_sessions_registry_updated', handleStorageUpdate);
      window.removeEventListener('aver_session_updated', handleStorageUpdate);
      window.removeEventListener('aver_session_launched', handleStorageUpdate);
      window.removeEventListener('aver_session_terminated', handleSessionTerminated);
      window.removeEventListener('aver_admin_control_updated', handleStorageUpdate);
    };
  }, [user?.uid, user?.email]);

  const handleEndSession = async (session: ActiveSessionRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to stop and delete the active trading session for ${session.userEmail}?`)) {
      return;
    }

    setActionLoading(session.id);
    try {
      // 1. Delete session from Firestore aiSessions collection immediately
      await deleteDoc(doc(db, 'aiSessions', session.id)).catch(() => {});
      if (session.userId) {
        try {
          const extraDocsSnap = await getDocs(query(collection(db, 'aiSessions'), where('userId', '==', session.userId))).catch(() => null);
          if (extraDocsSnap && !extraDocsSnap.empty) {
            for (const ed of extraDocsSnap.docs) {
              await deleteDoc(doc(db, 'aiSessions', ed.id)).catch(() => {});
            }
          }
        } catch (e) {}
      }

      // 2. Refund balance and update user profile in Firestore
      if (session.userId && !session.userId.startsWith('local-') && session.userId !== 'guest_user') {
        try {
          const uDocRef = doc(db, 'users', session.userId);
          const uDocSnap = await getDoc(uDocRef).catch(() => null);
          const userData = uDocSnap?.exists() ? uDocSnap.data() : null;
          
          const returnCapital = Number(session.tradingCapital || session.initialCapital || 1000);
          const currentTokenBal = Number(userData?.tokenBalance ?? userData?.availableBalance ?? 0);
          const newTokenBal = currentTokenBal + returnCapital;
          const currentPortfolio = Number(userData?.portfolioBalance ?? newTokenBal);
          const newPortfolio = Math.max(newTokenBal, currentPortfolio);

          await updateDoc(uDocRef, {
            tokenBalance: newTokenBal,
            availableBalance: newTokenBal,
            portfolioBalance: newPortfolio,
            aiTradingCapital: 0,
            aiSession: null,
            activeSession: null,
            lastUpdated: serverTimestamp()
          }).catch(() => {});

          await walletService.updateWallet(session.userId, {
            tokenBalance: newTokenBal,
            availableBalance: newTokenBal,
            portfolioBalance: newPortfolio,
            aiTradingCapital: 0,
            portfolioValue: newPortfolio
          }).catch(() => {});

          await portfolioPersistenceService.updateSessionDetails(session.userId, {
            sessionId: null,
            status: 'INACTIVE',
            engineState: 'IDLE'
          }).catch(() => {});

          await portfolioPersistenceService.updateWalletState(session.userId, {
            tokenBalance: newTokenBal,
            availableBalance: newTokenBal,
            portfolioBalance: newPortfolio,
            aiTradingCapital: 0
          }).catch(() => {});
        } catch (uErr) {
          console.warn("[AdminTrades] Error reconciling user balance on session stop:", uErr);
        }
      }

      // 3. Clear local storage for user and specific session instance
      localStorage.removeItem(`aver_session_${session.id}`);
      localStorage.removeItem(`aver_active_session_${session.id}`);
      localStorage.removeItem(`aver_session_${session.userId}`);
      localStorage.removeItem(`aver_session_control_${session.id}`);
      localStorage.removeItem(`aver_session_control_${session.userId}`);
      localStorage.setItem(`aver_stopped_session_${session.id}`, 'true');
      sessionStorage.setItem(`aver_stopped_session_${session.id}`, 'true');
      
      try {
        const regRaw = localStorage.getItem('aver_active_sessions_registry');
        if (regRaw) {
          const reg = JSON.parse(regRaw);
          delete reg[session.id];
          localStorage.setItem('aver_active_sessions_registry', JSON.stringify(reg));
          window.dispatchEvent(new CustomEvent('aver_sessions_registry_updated', { detail: reg }));
        }
      } catch (e) {}

      latestFirestoreDocsRef.current = latestFirestoreDocsRef.current.filter(d => (d.id || d.data?.()?.id) !== session.id);
      
      window.dispatchEvent(new CustomEvent('aver_session_terminated', { detail: { sessionId: session.id, userId: session.userId } }));

      // 4. Update state immediately
      setActiveSessions(prev => prev.filter(s => s.id !== session.id));
      if (selectedControlSession?.id === session.id) {
        setSelectedControlSession(null);
      }
    } catch (e) {
      console.error("Failed to end session:", e);
      alert("Failed to terminate session. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSessionTab = async (session: ActiveSessionRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete tab for ${session.userEmail}? This will immediately remove this session record from the database.`)) {
      return;
    }

    setActionLoading(session.id);
    try {
      await deleteDoc(doc(db, 'aiSessions', session.id)).catch(() => {});
      if (session.userId) {
        try {
          const extraDocsSnap = await getDocs(query(collection(db, 'aiSessions'), where('userId', '==', session.userId))).catch(() => null);
          if (extraDocsSnap && !extraDocsSnap.empty) {
            for (const ed of extraDocsSnap.docs) {
              await deleteDoc(doc(db, 'aiSessions', ed.id)).catch(() => {});
            }
          }
        } catch (e) {}

        if (!session.userId.startsWith('local-') && session.userId !== 'guest_user') {
          await updateDoc(doc(db, 'users', session.userId), {
            aiSession: null,
            activeSession: null,
            aiTradingCapital: 0,
            lastUpdated: serverTimestamp()
          }).catch(() => {});
        }
      }
      localStorage.removeItem(`aver_session_${session.id}`);
      localStorage.removeItem(`aver_active_session_${session.id}`);
      localStorage.removeItem(`aver_session_${session.userId}`);
      localStorage.removeItem(`aver_session_control_${session.id}`);
      localStorage.removeItem(`aver_session_control_${session.userId}`);
      localStorage.setItem(`aver_stopped_session_${session.id}`, 'true');
      sessionStorage.setItem(`aver_stopped_session_${session.id}`, 'true');
      
      try {
        const regRaw = localStorage.getItem('aver_active_sessions_registry');
        if (regRaw) {
          const reg = JSON.parse(regRaw);
          delete reg[session.id];
          localStorage.setItem('aver_active_sessions_registry', JSON.stringify(reg));
          window.dispatchEvent(new CustomEvent('aver_sessions_registry_updated', { detail: reg }));
        }
      } catch (e) {}

      latestFirestoreDocsRef.current = latestFirestoreDocsRef.current.filter(d => (d.id || d.data?.()?.id) !== session.id);

      setActiveSessions(prev => prev.filter(s => s.id !== session.id));
      if (selectedControlSession?.id === session.id) {
        setSelectedControlSession(null);
      }
      window.dispatchEvent(new CustomEvent('aver_session_terminated', { detail: { sessionId: session.id, userId: session.userId } }));
    } catch (e) {
      console.error("Failed to delete session tab:", e);
    } finally {
      setActionLoading(null);
    }
  };

  // Purge stale or orphan sessions from Firestore with 1 click
  const handlePurgeStaleSessions = async () => {
    if (!window.confirm("Do you want to scan and purge all inactive or orphan session documents from the database?")) {
      return;
    }

    setIsPurging(true);
    try {
      const snap = await getDocs(collection(db, 'aiSessions'));
      let count = 0;
      for (const sDoc of snap.docs) {
        const data = sDoc.data();
        if (data.status !== 'ACTIVE' || data.isDeleted === true) {
          await deleteDoc(doc(db, 'aiSessions', sDoc.id)).catch(() => {});
          count++;
        }
      }
      // Also check local storage for stale sessions
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('aver_session_')) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const parsed = JSON.parse(val);
              if (parsed.status !== 'ACTIVE') {
                localStorage.removeItem(key);
              }
            } catch (e) {}
          }
        }
      }
      setActiveSessions(prev => prev.filter(s => s.status === 'ACTIVE' && !s.isDeleted));
      alert(`Purge complete: Cleaned up ${count} inactive session documents.`);
    } catch (err) {
      console.error("Purge error:", err);
    } finally {
      setIsPurging(false);
    }
  };

  const filteredSessions = activeSessions.filter(s => 
    s.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    s.userId.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalActiveCapital = activeSessions.reduce((sum, s) => sum + (s.tradingCapital || 0), 0);
  const openPositionsCount = trades.filter(t => t.status === 'OPEN').length;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto notranslate" translate="no">
      {/* Fullscreen Session Control Modal Overlay */}
      {selectedControlSession && (
        <AdminSessionControlModal
          session={selectedControlSession}
          allActiveSessions={activeSessions}
          theme={theme}
          onClose={() => setSelectedControlSession(null)}
          onSelectSession={(sess) => setSelectedControlSession(sess)}
          onSessionTerminated={(sId) => {
            setActiveSessions(prev => prev.filter(s => s.id !== sId));
            setSelectedControlSession(null);
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight flex items-center gap-3`}>
            <TrendingUp className="w-7 h-7 text-emerald-500" />
            Live Trading Sessions
          </h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-1`}>
            Real-time oversight and outcome command center. Tap any active session to open fullscreen controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {activeSessions.length} Active Sessions
          </div>
          <div className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            {openPositionsCount} Open Positions
          </div>

          <button
            onClick={handlePurgeStaleSessions}
            disabled={isPurging}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            title="Purge inactive session documents from database"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            {isPurging ? 'Purging...' : 'Clean Stale Docs'}
          </button>
        </div>
      </div>

      {/* ACTIVE SESSIONS INDEPENDENT TABS BAR */}
      {activeSessions.length > 0 && (
        <div className={`p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Session Tabs ({activeSessions.length})
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Every active user session has its own independent tab & trade outcome control
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {activeSessions.map((sess) => {
              const isSelected = selectedControlSession?.id === sess.id;
              const mode = sess.adminControl?.mode || 'NORMAL';
              const displayName = sess.userEmail?.split('@')[0] || sess.userEmail || sess.userId;
              
              return (
                <button
                  key={sess.id}
                  onClick={() => setSelectedControlSession(sess)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                      : isDark
                        ? 'bg-slate-950 border-white/10 text-slate-300 hover:border-emerald-500/40 hover:bg-slate-850 hover:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    mode === 'FORCE_PROFIT' ? 'bg-emerald-400' : mode === 'FORCE_LOSS' ? 'bg-rose-400' : 'bg-slate-400'
                  }`}></span>
                  <span className="font-bold">{displayName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-400'
                  }`}>
                    {mode === 'FORCE_PROFIT' ? 'PROFIT' : mode === 'FORCE_LOSS' ? 'DRAWDOWN' : 'NORMAL'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Overview Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active sessions by email, UID..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              isDark 
                ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' 
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {activeSessions.length > 0 && (
          <div className={`px-4 py-2 rounded-xl border text-xs font-medium ${
            isDark ? 'bg-white/[0.02] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            Total Allocated Capital: <span className="font-mono text-emerald-400 font-black ml-1">${totalActiveCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {/* ACTIVE TRADING SESSIONS GRID */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
            Loading active trading sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className={`p-12 rounded-2xl border text-center ${
            isDark ? 'bg-slate-900/40 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <Zap className="w-10 h-10 mx-auto text-slate-600 mb-3 opacity-50" />
            <p className="text-base font-bold text-slate-300">
              {search ? 'No active sessions match your search' : 'No active trading sessions currently running'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Real active trading sessions will appear here as soon as any user begins automated trading. Tap any active session to open the fullscreen outcome control center.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSessions.map((sess) => {
              const sessionTrades = trades.filter(t => t.userId === sess.userId && t.status === 'OPEN');
              const sessionPnl = (sess.totalProfit || 0) - (sess.totalLoss || 0);
              const isPnlPositive = sessionPnl >= 0;
              const isExpanded = expandedSessionId === sess.id;
              const activeControl = sess.adminControl?.mode || 'NORMAL';

              return (
                <div 
                  key={sess.id}
                  onClick={() => setSelectedControlSession(sess)}
                  className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:scale-[1.01] hover:border-emerald-500/60 ${
                    isDark 
                      ? 'bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-emerald-500/30 shadow-xl shadow-emerald-950/20' 
                      : 'bg-white border-emerald-500/30 shadow-md shadow-emerald-500/5'
                  }`}
                >
                  {/* Top glowing edge */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

                  <div className="space-y-4">
                    {/* Status & User */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            TRADING LIVE
                          </span>
                          {activeControl !== 'NORMAL' && (
                            <span className="text-[9px] font-black tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
                              OVERRIDE: {activeControl}
                            </span>
                          )}
                        </div>
                        <h3 className={`font-bold text-sm truncate max-w-[200px] ${isDark ? 'text-white' : 'text-slate-900'} mt-1 group-hover:text-emerald-400 transition-colors`}>
                          {sess.userEmail}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono truncate">UID: {sess.userId}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Allocated</span>
                        <span className="font-mono text-base font-black text-white">
                          ${(sess.tradingCapital || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className={`grid grid-cols-2 gap-2 p-3 rounded-xl ${isDark ? 'bg-white/[0.03] border border-white/5' : 'bg-slate-50 border border-slate-200'}`}>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">Session P&L</span>
                        <span className={`text-xs font-mono font-black flex items-center gap-0.5 ${isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPnlPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isPnlPositive ? '+' : ''}${sessionPnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block font-medium">Active Positions</span>
                        <span className="text-xs font-mono font-bold text-blue-400">
                          {sessionTrades.length} open
                        </span>
                      </div>
                    </div>

                    {/* Expandable Open Positions List */}
                    {isExpanded && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className={`p-3 rounded-xl space-y-2 text-xs border ${
                          isDark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="font-bold text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                          Open Session Positions ({sessionTrades.length})
                        </div>
                        {sessionTrades.length === 0 ? (
                          <div className="text-slate-500 text-[11px] py-1">Scanning markets • No open orders right now</div>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {sessionTrades.map(trade => (
                              <div key={trade.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1">
                                    <span className={trade.type === 'buy' || trade.type === 'long' ? 'text-emerald-400' : 'text-rose-400'}>
                                      {trade.type?.toUpperCase()}
                                    </span>
                                    {trade.symbol}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Entry: ${Number(trade.entryPrice || 0).toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-right font-mono">
                                  <div className="font-bold text-white">${Number(trade.amount || 0).toFixed(2)}</div>
                                  <div className={`text-[10px] ${((trade.pnl || 0) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {((trade.pnl || 0) >= 0 ? '+' : '')}${Number(trade.pnl || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Started {formatSessionStartTime(sess.startTime)}
                      </span>
                      <span className="font-mono text-[10px] opacity-75">#{sess.id.slice(-8)}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 mt-3 border-t border-white/5 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedControlSession(sess);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/10"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Control Outcomes
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedSessionId(isExpanded ? null : sess.id);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isExpanded
                          ? 'bg-white/20 text-white'
                          : isDark
                            ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                            : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Quick preview open orders"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      {sessionTrades.length}
                    </button>

                    <button
                      onClick={(e) => handleEndSession(sess, e)}
                      disabled={actionLoading === sess.id}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isDark 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' 
                          : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                      }`}
                      title="Stop and terminate active session"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop
                    </button>

                    <button
                      onClick={(e) => handleDeleteSessionTab(sess, e)}
                      disabled={actionLoading === sess.id}
                      className="p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20"
                      title="Delete and remove this session tab permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


