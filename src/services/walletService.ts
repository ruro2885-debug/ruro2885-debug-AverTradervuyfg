import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth, safeSetDoc } from '../lib/firebase';
import { safeStorage } from '../utils/storage';

export interface WalletData {
  userId: string;
  portfolioBalance: number;
  availableBalance: number;
  vaultBalance: number;
  aiTradingCapital: number;
  portfolioValue: number;
  totalDeposits: number;
  totalWithdrawals: number;
  cashBalance?: number;
  tokenBalance?: number;
  updatedAt?: any;
}

const DEFAULT_WALLET_VALUES: Omit<WalletData, 'userId'> = {
  portfolioBalance: 0,
  availableBalance: 0,
  vaultBalance: 0,
  aiTradingCapital: 0,
  portfolioValue: 0,
  totalDeposits: 0,
  totalWithdrawals: 0,
  cashBalance: 0,
  tokenBalance: 0
};

const inFlightWalletFetches = new Map<string, Promise<WalletData>>();
const createdWalletIds = new Set<string>();

export const walletService = {
  async getOrCreateWallet(userId: string, initialDefaults?: Partial<WalletData>): Promise<WalletData> {
    if (!userId || userId.startsWith('local-')) {
      const localKey = `aver_wallet_${userId}`;
      const cached = safeStorage.getItem(localKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      const newLocalWallet: WalletData = {
        userId,
        ...DEFAULT_WALLET_VALUES,
        ...(initialDefaults || {})
      };
      safeStorage.setItem(localKey, JSON.stringify(newLocalWallet));
      return newLocalWallet;
    }

    if (inFlightWalletFetches.has(userId)) {
      return inFlightWalletFetches.get(userId)!;
    }

    const fetchPromise = (async () => {
      try {
        const walletRef = doc(db, 'wallets', userId);
        const snap = await getDoc(walletRef);

        if (snap.exists()) {
          const data = snap.data() as WalletData;
          const pBalance = typeof data.portfolioBalance === 'number' ? data.portfolioBalance : 0;
          const aiTradingCapital = typeof data.aiTradingCapital === 'number' ? data.aiTradingCapital : 0;
          const vaultBalance = typeof data.vaultBalance === 'number' ? data.vaultBalance : 0;
          
          // Unallocated liquid cash in wallet = portfolioBalance - vaultBalance - aiTradingCapital
          const computedUnallocated = Math.max(0, pBalance - vaultBalance - aiTradingCapital);
          const availableBalance = typeof data.availableBalance === 'number' ? Math.min(data.availableBalance, computedUnallocated) : computedUnallocated;
          const tokenBalance = typeof data.tokenBalance === 'number' ? Math.min(data.tokenBalance, computedUnallocated) : availableBalance;

          const walletData: WalletData = {
            userId,
            portfolioBalance: pBalance,
            availableBalance,
            vaultBalance,
            aiTradingCapital,
            portfolioValue: typeof data.portfolioValue === 'number' ? data.portfolioValue : pBalance,
            totalDeposits: data.totalDeposits ?? 0,
            totalWithdrawals: data.totalWithdrawals ?? 0,
            cashBalance: tokenBalance,
            tokenBalance,
            updatedAt: data.updatedAt
          };
          safeStorage.setItem(`aver_wallet_${userId}`, JSON.stringify(walletData));
          return walletData;
        } else {
          // Document does not exist yet -> check cached user profile or use default starting capital
          let initialBalance = 0;
          let initialVault = 0;
          if (initialDefaults?.portfolioBalance !== undefined) {
            initialBalance = initialDefaults.portfolioBalance;
          }
          if (initialDefaults?.vaultBalance !== undefined) {
            initialVault = initialDefaults.vaultBalance;
          }

          const newWallet: WalletData = {
            userId,
            portfolioBalance: initialBalance,
            availableBalance: initialBalance,
            vaultBalance: initialVault,
            aiTradingCapital: 0,
            portfolioValue: initialBalance,
            totalDeposits: 0,
            totalWithdrawals: 0,
            cashBalance: initialBalance,
            tokenBalance: initialBalance,
            ...(initialDefaults || {})
          };
          createdWalletIds.add(userId);
          await safeSetDoc(walletRef, {
            ...newWallet,
            updatedAt: serverTimestamp()
          }, { merge: true });
          safeStorage.setItem(`aver_wallet_${userId}`, JSON.stringify(newWallet));
          return newWallet;
        }
      } catch (error) {
        console.warn('[walletService] Failed to fetch or create wallet document in Firestore, using cached/local:', error);
        const cached = safeStorage.getItem(`aver_wallet_${userId}`);
        if (cached) {
          try { return JSON.parse(cached); } catch {}
        }
        return {
          userId,
          ...DEFAULT_WALLET_VALUES,
          ...(initialDefaults || {})
        };
      } finally {
        inFlightWalletFetches.delete(userId);
      }
    })();

    inFlightWalletFetches.set(userId, fetchPromise);
    return fetchPromise;
  },

  async updateWallet(userId: string, updates: Partial<WalletData>): Promise<WalletData> {
    const current = await this.getOrCreateWallet(userId);
    const updated: WalletData = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    safeStorage.setItem(`aver_wallet_${userId}`, JSON.stringify(updated));

    if (userId && !userId.startsWith('local-')) {
      try {
        const walletRef = doc(db, 'wallets', userId);
        await safeSetDoc(walletRef, {
          ...updated,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.warn('[walletService] Failed to update wallet document in Firestore:', error);
      }
    }

    // Dispatch event for real-time local subscription updates!
    window.dispatchEvent(new Event('aver_user_updated'));

    return updated;
  },

  subscribeWallet(userId: string, callback: (wallet: WalletData) => void): () => void {
    if (!userId || userId.startsWith('local-')) {
      this.getOrCreateWallet(userId).then(callback);
      
      const handleUpdate = () => {
        this.getOrCreateWallet(userId).then(callback);
      };
      window.addEventListener('aver_user_updated', handleUpdate);
      window.addEventListener('storage', handleUpdate);
      return () => {
        window.removeEventListener('aver_user_updated', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      };
    }

    let isCreating = false;
    const walletRef = doc(db, 'wallets', userId);

    return onSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as WalletData;
        const pBal = data.portfolioBalance ?? DEFAULT_WALLET_VALUES.portfolioBalance;
        const vaultBal = data.vaultBalance ?? DEFAULT_WALLET_VALUES.vaultBalance;
        const aiTradingCapital = data.aiTradingCapital ?? 0;
        const computedUnallocated = Math.max(0, pBal - vaultBal - aiTradingCapital);
        const availableBalance = typeof data.availableBalance === 'number' ? Math.min(data.availableBalance, computedUnallocated) : computedUnallocated;
        const tokenBalance = typeof data.tokenBalance === 'number' ? Math.min(data.tokenBalance, computedUnallocated) : availableBalance;

        const walletData: WalletData = {
          userId,
          portfolioBalance: pBal,
          availableBalance,
          vaultBalance: vaultBal,
          aiTradingCapital,
          portfolioValue: data.portfolioValue ?? pBal,
          totalDeposits: data.totalDeposits ?? 0,
          totalWithdrawals: data.totalWithdrawals ?? DEFAULT_WALLET_VALUES.totalWithdrawals,
          cashBalance: tokenBalance,
          tokenBalance,
          updatedAt: data.updatedAt
        };
        safeStorage.setItem(`aver_wallet_${userId}`, JSON.stringify(walletData));
        callback(walletData);
      } else {
        if (!isCreating && !createdWalletIds.has(userId)) {
          isCreating = true;
          this.getOrCreateWallet(userId).then((wallet) => {
            isCreating = false;
            callback(wallet);
          }).catch(() => {
            isCreating = false;
          });
        }
      }
    }, (error) => {
      console.warn('[walletService] Snapshot error for wallets collection:', error);
      this.getOrCreateWallet(userId).then(callback).catch(() => {});
    });
  }
};
