import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp,
  onSnapshot,
  setDoc,
  doc
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { EquityHistoryRecord, SessionEquityPoint, CompletedSessionData } from '../types/aiTrading';

const COLLECTION_NAME = 'equityHistory';
const SESSION_POINTS_COLLECTION = 'sessionEquityPoints';
const COMPLETED_SESSIONS_COLLECTION = 'completedSessions';

export const equityService = {
  async recordEquity(record: Omit<EquityHistoryRecord, 'id'>): Promise<void> {
    try {
      const cacheKey = `aver_equity_history_${record.userId}`;
      const existingStr = localStorage.getItem(cacheKey);
      const existing: EquityHistoryRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const newRec = { id: `eq-${Date.now()}`, ...record };
      const updated = [...existing, newRec].slice(-200);
      localStorage.setItem(cacheKey, JSON.stringify(updated));

      if (record.userId.startsWith('local-')) {
        return;
      }
      const colRef = collection(db, 'users', record.userId, COLLECTION_NAME);
      await addDoc(colRef, {
        ...record,
        timestamp: record.timestamp || Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${record.userId}/${COLLECTION_NAME}`);
    }
  },

  getHistoryLocally(userId: string): EquityHistoryRecord[] {
    try {
      const cacheKey = `aver_equity_history_${userId}`;
      const existingStr = localStorage.getItem(cacheKey);
      return existingStr ? JSON.parse(existingStr) : [];
    } catch {
      return [];
    }
  },

  async recordSessionPoint(userId: string, point: SessionEquityPoint): Promise<void> {
    try {
      // LocalStorage caching
      const cacheKey = `aver_session_points_${userId}_${point.sessionId}`;
      const existingStr = localStorage.getItem(cacheKey);
      const existing: SessionEquityPoint[] = existingStr ? JSON.parse(existingStr) : [];
      existing.push(point);
      localStorage.setItem(cacheKey, JSON.stringify(existing));
      
      // Removed Firestore addDoc to save quota. State is kept in UI/localStorage.
    } catch (error) {
      console.warn('[equityService] Error recording session point:', error);
    }
  },

  getSessionPointsLocally(userId: string, sessionId: string): SessionEquityPoint[] {
    try {
      const cacheKey = `aver_session_points_${userId}_${sessionId}`;
      const existingStr = localStorage.getItem(cacheKey);
      return existingStr ? JSON.parse(existingStr) : [];
    } catch {
      return [];
    }
  },

  async saveCompletedSession(userId: string, sessionData: CompletedSessionData): Promise<void> {
    try {
      const cacheKey = `aver_completed_sessions_${userId}`;
      const existingStr = localStorage.getItem(cacheKey);
      const existing: CompletedSessionData[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [sessionData, ...existing.filter(s => s.sessionId !== sessionData.sessionId)];
      localStorage.setItem(cacheKey, JSON.stringify(updated));

      if (!userId.startsWith('local-')) {
        const docRef = doc(db, 'users', userId, COMPLETED_SESSIONS_COLLECTION, sessionData.sessionId);
        await setDoc(docRef, {
          ...sessionData,
          savedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.warn('[equityService] Error saving completed session:', error);
    }
  },

  getCompletedSessionsLocally(userId: string): CompletedSessionData[] {
    try {
      const cacheKey = `aver_completed_sessions_${userId}`;
      const existingStr = localStorage.getItem(cacheKey);
      return existingStr ? JSON.parse(existingStr) : [];
    } catch {
      return [];
    }
  },

  async getHistory(userId: string, range: '1D' | '1W' | '1M'): Promise<EquityHistoryRecord[]> {
    try {
      if (userId.startsWith('local-')) return [];

      const now = new Date();
      let startTime = new Date();
      if (range === '1D') startTime.setDate(now.getDate() - 1);
      else if (range === '1W') startTime.setDate(now.getDate() - 7);
      else if (range === '1M') startTime.setMonth(now.getMonth() - 1);

      const q = query(
        collection(db, 'users', userId, COLLECTION_NAME),
        where('timestamp', '>=', Timestamp.fromDate(startTime)),
        orderBy('timestamp', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EquityHistoryRecord[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/${COLLECTION_NAME}`);
      return [];
    }
  },

  subscribeHistory(userId: string, callback: (records: EquityHistoryRecord[]) => void) {
    const localRecords = equityService.getHistoryLocally(userId);
    if (userId.startsWith('local-')) {
      callback(localRecords);
      return () => {};
    }

    const q = query(
      collection(db, 'users', userId, COLLECTION_NAME),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EquityHistoryRecord[];

      // Merge with localRecords to ensure complete master history persistence
      const mergedMap = new Map<string, EquityHistoryRecord>();
      localRecords.forEach(r => { if (r.id) mergedMap.set(r.id, r); });
      records.forEach(r => { if (r.id) mergedMap.set(r.id, r); });
      const combined = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (typeof a.timestamp === 'number' ? a.timestamp : 0));
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (typeof b.timestamp === 'number' ? b.timestamp : 0));
        return timeA - timeB;
      });

      try {
        const cacheKey = `aver_equity_history_${userId}`;
        localStorage.setItem(cacheKey, JSON.stringify(combined));
      } catch {}

      callback(combined);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/${COLLECTION_NAME}`);
      callback(localRecords);
    });
  }
};
