import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LinkedWallet } from '../types';

export const linkedWalletService = {
  /**
   * Links a new wallet to the user's account and saves it to the 'linked_wallets' collection.
   */
  async linkWallet(data: Omit<LinkedWallet, 'id' | 'linkedAt' | 'updatedAt' | 'status'>): Promise<string> {
    const walletsRef = collection(db, 'linked_wallets');
    const normalizedAddress = data.address.trim().toLowerCase();
    const id = `wallet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const walletRecord: LinkedWallet = {
      id,
      walletType: 'Browser Extension',
      verificationStatus: 'Verified',
      ...data,
      status: 'Connected',
      linkedAt: now,
      updatedAt: now,
    };
    
    // 1. Save locally in localStorage for instant offline / quota fallback sync
    try {
      const importedStr = localStorage.getItem('aver_imported_wallets');
      let importedList: any[] = [];
      if (importedStr) {
        try { importedList = JSON.parse(importedStr); } catch (e) {}
      }
      importedList = [walletRecord, ...importedList.filter(w => (w.address || w.publicWalletAddress)?.toLowerCase() !== normalizedAddress)];
      localStorage.setItem('aver_imported_wallets', JSON.stringify(importedList));

      const profileKey = `user_profile_${data.userId}`;
      const profileStr = localStorage.getItem(profileKey);
      if (profileStr) {
        try {
          const uObj = JSON.parse(profileStr);
          const currentWallets = Array.isArray(uObj.linkedWallets) ? uObj.linkedWallets : [];
          uObj.linkedWallets = [walletRecord, ...currentWallets.filter((w: any) => (w.address || w.publicWalletAddress)?.toLowerCase() !== normalizedAddress)];
          localStorage.setItem(profileKey, JSON.stringify(uObj));
          window.dispatchEvent(new Event('aver_user_updated'));
        } catch (e) {}
      }
      window.dispatchEvent(new Event('aver_wallet_updated'));
    } catch (e) {
      console.warn("Failed saving linked wallet locally:", e);
    }

    // 2. Try Firestore write with fallback
    try {
      const q = query(walletsRef, where('userId', '==', data.userId));
      const snap = await getDocs(q);
      const existingDoc = snap.docs.find(d => d.data().address?.toLowerCase() === normalizedAddress);
      if (existingDoc) {
        await updateDoc(doc(db, 'linked_wallets', existingDoc.id), {
          status: 'Connected',
          updatedAt: new Date().toISOString()
        }).catch(() => {});
        return existingDoc.id;
      }

      const newWalletDoc = await addDoc(walletsRef, {
        ...walletRecord,
        serverCreatedAt: serverTimestamp()
      });
      await updateDoc(newWalletDoc, { id: newWalletDoc.id }).catch(() => {});
      return newWalletDoc.id;
    } catch (err) {
      console.warn("Firestore wallet linking notice (operating in local fallback mode):", err);
      return id;
    }
  },

  /**
   * Unlinks a wallet by its ID.
   */
  async unlinkWallet(walletId: string): Promise<void> {
    try {
      const walletRef = doc(db, 'linked_wallets', walletId);
      await deleteDoc(walletRef);
    } catch (err) {
      console.warn('Direct delete failed, searching linked_wallets collection by id field:', err);
    }
    // Also cleanup any document matching id or address matching walletId
    try {
      const walletsRef = collection(db, 'linked_wallets');
      const q = query(walletsRef, where('id', '==', walletId));
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        await deleteDoc(doc(db, 'linked_wallets', d.id));
      });
    } catch (err) {
      console.warn('Secondary delete search error:', err);
    }
  },

  /**
   * Updates the status of a linked wallet (e.g., Enable/Disable).
   */
  async updateWalletStatus(walletId: string, status: 'Connected' | 'Disconnected'): Promise<void> {
    const walletRef = doc(db, 'linked_wallets', walletId);
    await updateDoc(walletRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Fetches all linked wallets for a specific user.
   */
  async getLinkedWallets(userId: string): Promise<LinkedWallet[]> {
    try {
      const walletsRef = collection(db, 'linked_wallets');
      const q = query(
        walletsRef, 
        where('userId', '==', userId)
      );
      
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as LinkedWallet));
      return list.sort((a, b) => new Date(b.linkedAt || 0).getTime() - new Date(a.linkedAt || 0).getTime());
    } catch (err) {
      console.warn("Failed to getLinkedWallets from Firestore:", err);
      return [];
    }
  },

  /**
   * Subscribes to real-time updates for a specific user's linked wallets.
   */
  subscribeUserWallets(userId: string, callback: (wallets: LinkedWallet[]) => void) {
    const walletsRef = collection(db, 'linked_wallets');
    const q = query(walletsRef, where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as LinkedWallet));
      list.sort((a, b) => new Date(b.linkedAt || 0).getTime() - new Date(a.linkedAt || 0).getTime());
      callback(list);
    }, (err) => {
      console.warn("Realtime linked_wallets listener notice:", err);
    });
  },

  /**
   * Fetches all linked wallets across all users (Admin only).
   */
  async getAllLinkedWallets(): Promise<LinkedWallet[]> {
    const walletsRef = collection(db, 'linked_wallets');
    const q = query(walletsRef, orderBy('linkedAt', 'desc'));
    
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as LinkedWallet));
  }
};
