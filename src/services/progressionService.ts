import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { safeStorage } from '../utils/storage';

export const progressionService = {
  async updateProgress(userId: string, actionType: 'trade' | 'win' | 'loss' | 'login') {
    if (!userId || safeStorage.getItem('aver_logged_out') === 'true') return;

    const profileKey = `user_profile_${userId}`;

    // 1. Get current profile from local storage if available
    let localProfile: UserProfile | null = null;
    try {
      const pStr = safeStorage.getItem(profileKey);
      if (pStr) {
        const parsed = JSON.parse(pStr);
        if (parsed && (!parsed.uid || parsed.uid === userId)) {
          localProfile = parsed;
        }
      }
    } catch (e) {}

    // 2. Fetch from Firestore if possible
    let fsUser: UserProfile | null = null;
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        fsUser = userSnap.data() as UserProfile;
      }
    } catch (err) {}

    const user: UserProfile = fsUser || localProfile || { uid: userId } as UserProfile;

    const now = new Date();
    const lYear = now.getFullYear();
    const lMonth = String(now.getMonth() + 1).padStart(2, '0');
    const lDay = String(now.getDate()).padStart(2, '0');
    const todayLocalStr = `${lYear}-${lMonth}-${lDay}`;
    
    let xpGain = 0;
    let updates: any = {};

    let currentWinRun = user.winRun ?? localProfile?.winRun ?? 0;
    let currentLoginStreak = typeof user.streak === 'number'
      ? user.streak
      : (typeof user.loginStreak === 'number'
        ? user.loginStreak
        : (typeof localProfile?.streak === 'number'
          ? localProfile.streak
          : (typeof localProfile?.loginStreak === 'number' ? localProfile.loginStreak : 0)));
    let currentAiTrades = user.aiTradesCount ?? localProfile?.aiTradesCount ?? 0;
    
    let rawLastActivity = user.lastActivityAt || user.lastLoginDate || localProfile?.lastActivityAt || localProfile?.lastLoginDate || user.lastLogin;
    let lastActivityAt: string | undefined = undefined;
    if (rawLastActivity) {
      if (typeof rawLastActivity === 'string') {
        lastActivityAt = rawLastActivity;
      } else if (typeof rawLastActivity?.toDate === 'function') {
        lastActivityAt = rawLastActivity.toDate().toISOString();
      } else if (rawLastActivity instanceof Date) {
        lastActivityAt = rawLastActivity.toISOString();
      }
    }

    switch (actionType) {
      case 'trade':
        xpGain = 20;
        currentAiTrades += 1;
        updates.aiTradesCount = currentAiTrades;
        updates.lastActivityAt = now.toISOString();
        updates.lastLoginDate = now.toISOString();
        await this.completeDailyMission(userId, 'm2');
        break;
      case 'win':
        xpGain = 40;
        currentWinRun += 1;
        updates.winRun = currentWinRun;
        updates.lastActivityAt = now.toISOString();
        updates.lastLoginDate = now.toISOString();
        break;
      case 'loss':
        currentWinRun = 0;
        updates.winRun = 0;
        updates.lastActivityAt = now.toISOString();
        updates.lastLoginDate = now.toISOString();
        break;
      case 'login': {
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
        const MIN_INCREMENT_INTERVAL_MS = 18 * 60 * 60 * 1000;
        let serverResult: any = null;

        // Attempt server-authoritative streak transaction first
        try {
          const res = await fetch('/api/user/streak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });
          if (res.ok) {
            serverResult = await res.json();
          }
        } catch (e) {
          // Fallback to client-side logic below if network/fetch unavailable
        }

        if (serverResult && typeof serverResult.streak === 'number') {
          currentLoginStreak = serverResult.streak;
          lastActivityAt = serverResult.lastActivityAt;
          updates.streak = serverResult.streak;
          updates.loginStreak = serverResult.streak;
          updates.lastActivityAt = serverResult.lastActivityAt;
          updates.lastLoginDate = serverResult.lastActivityAt;
          xpGain = serverResult.incremented ? 10 : 0;
        } else {
          // Fallback rolling 24-hour inactivity logic
          const nowMs = now.getTime();
          let lastActivityMs: number | null = null;
          if (lastActivityAt) {
            const p = new Date(lastActivityAt).getTime();
            if (!isNaN(p)) lastActivityMs = p;
          }

          let calculatedStreak = typeof user.streak === 'number'
            ? user.streak
            : (typeof currentLoginStreak === 'number' ? currentLoginStreak : 0);

          let incremented = false;

          if (!lastActivityMs) {
            // New user with no prior activity: initialize streak
            calculatedStreak = 1;
            incremented = true;
          } else {
            const elapsed = nowMs - lastActivityMs;
            if (elapsed >= TWENTY_FOUR_HOURS_MS) {
              // Inactive for 24 full hours: reset streak to 0
              calculatedStreak = 0;
              updates.lastStreakResetAt = nowMs;
              updates.lastStreakIncrementAt = 0;
            } else {
              // Under 24 hours: PRESERVE STREAK
              const rawLastInc = (user as any).lastStreakIncrementAt || (localProfile as any)?.lastStreakIncrementAt;
              let lastIncMs = 0;
              if (rawLastInc) {
                const p = typeof rawLastInc === 'number' ? rawLastInc : new Date(rawLastInc).getTime();
                if (!isNaN(p)) lastIncMs = p;
              }

              if (calculatedStreak === 0) {
                const lastReset = (user as any).lastStreakResetAt || (localProfile as any)?.lastStreakResetAt || 0;
                if (!lastReset || (nowMs - lastReset >= 5 * 60 * 1000)) {
                  calculatedStreak = 1;
                  incremented = true;
                }
              } else if (lastIncMs > 0) {
                if (nowMs - lastIncMs >= MIN_INCREMENT_INTERVAL_MS) {
                  calculatedStreak += 1;
                  incremented = true;
                }
              } else {
                lastIncMs = nowMs;
              }
            }
          }

          if (incremented) {
            updates.lastStreakIncrementAt = nowMs;
            xpGain = 10;
          }

          currentLoginStreak = calculatedStreak;
          lastActivityAt = now.toISOString();
          updates.streak = calculatedStreak;
          updates.loginStreak = calculatedStreak;
          updates.lastActivityAt = lastActivityAt;
          updates.lastLoginDate = lastActivityAt;
        }
        break;
      }
    }

    // Leveling logic: 1000 XP per level
    const calculatedXp = (currentAiTrades * 20) + (currentWinRun * 15) + (currentLoginStreak * 10);
    let currentXp = Math.max((user.xp || localProfile?.xp || 0) + xpGain, calculatedXp);
    let currentLevel = Math.max(1, Math.floor(currentXp / 1000) + 1);

    let insignias: string[] = [];
    if (currentLevel >= 5) {
      const milestone = Math.floor(currentLevel / 5) * 5;
      insignias.push(`Level ${milestone} Vanguard`);
    }

    updates.xp = currentXp;
    updates.level = currentLevel;
    updates.insignias = insignias;

    // 3. Update local storage caches for immediate UI update
    const updatedProfile = {
      ...user,
      ...localProfile,
      winRun: currentWinRun,
      streak: currentLoginStreak,
      loginStreak: currentLoginStreak,
      aiTradesCount: currentAiTrades,
      xp: currentXp,
      level: currentLevel,
      insignias,
      lastActivityAt: updates.lastActivityAt || lastActivityAt,
      lastLoginDate: updates.lastLoginDate || lastActivityAt
    };

    try {
      safeStorage.setItem(profileKey, JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event('aver_user_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {}

    // 4. Update Firestore if accessible
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, updates);
    } catch (err) {}
  },

  async completeDailyMission(userId: string, missionId: string) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      
      const user = userSnap.data() as UserProfile;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      let dailyMissions = user.dailyMissions;
      if (!dailyMissions || dailyMissions.lastResetDate !== todayStr) {
        dailyMissions = {
          lastResetDate: todayStr,
          completedIds: []
        };
      }

      if (dailyMissions.completedIds.includes(missionId)) return;

      const updatedCompletedIds = [...dailyMissions.completedIds, missionId];
      
      let progressGain = 0;
      if (missionId === 'm2') progressGain = 1;
      if (missionId === 'm3' || missionId === 'm4') progressGain = 0.3;
      if (missionId === 'm5') progressGain = 0.2;

      const updates: any = {
        'dailyMissions.completedIds': updatedCompletedIds,
        'dailyMissions.lastResetDate': todayStr
      };

      if (progressGain > 0) {
        updates.xp = increment(progressGain * 100);
      }

      await updateDoc(userRef, updates);
    } catch (err) {}
  }
};

