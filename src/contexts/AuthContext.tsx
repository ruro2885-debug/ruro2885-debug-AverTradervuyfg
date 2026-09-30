import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  updatePassword as updateFirebasePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, getDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db, safeUpdateDoc } from '../lib/firebase';
import { UserProfile, Preferences } from '../types';
import { NotificationManager } from '../services/NotificationManager';
import { NotificationCategory, NotificationPriority, NotificationItem } from '../types/notifications';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>, displayName?: string, email?: string, isFinancialUpdate?: boolean) => Promise<void>;
  updateProfilePhoto: (url: string | null) => Promise<void>;
  addNotification: (category: NotificationCategory, priority: NotificationPriority, title: string, body: string, actionUrl?: string, action?: string, metadata?: Record<string, any>) => Promise<void>;
  updateUserPreferences: (prefs: Partial<Preferences>) => Promise<void>;
  verifyCurrentPassword: (password: string) => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetAllFinancialData: () => Promise<void>;
  notifications: NotificationItem[];
  markNotificationRead: (id: string, read?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifManager, setNotifManager] = useState<NotificationManager | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Setup notification manager
        const manager = new NotificationManager(firebaseUser.uid);
        setNotifManager(manager);
        manager.subscribe((notifs) => {
          setNotifications(notifs);
        });

        // Sync profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ uid: firebaseUser.uid, ...docSnap.data() } as UserProfile);
          } else {
            // Seed profile if missing
            const newProfile: Partial<UserProfile> = {
              email: firebaseUser.email || '',
              username: firebaseUser.email?.split('@')[0] || 'trader',
              displayName: firebaseUser.displayName || 'Aver Trader',
              accountStatus: 'Active',
              portfolioBalance: 0,
              availableBalance: 0,
              vaultBalance: 0,
              tokenBalance: 0,
              cashBalance: 0,
              totalDeposits: 0,
              totalWithdrawals: 0,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              kycStatus: 'unverified',
              role: 'user'
            };
            setDoc(userDocRef, newProfile);
          }
          setLoading(false);
        });

        return () => {
          unsubProfile();
          manager.unsubscribeAll();
        };
      } else {
        setUser(null);
        setNotifications([]);
        setNotifManager(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (data: any) => {
    const { email, password, username, country, phoneNumber } = data;
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      username,
      country,
      phoneNumber,
      displayName: username,
      accountStatus: 'Active',
      portfolioBalance: 0,
      availableBalance: 0,
      vaultBalance: 0,
      tokenBalance: 0,
      cashBalance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      kycStatus: 'unverified',
      role: 'user'
    });
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const updateProfile = useCallback(async (updates: Partial<UserProfile>, displayName?: string, email?: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    if (displayName) {
      await updateFirebaseProfile(auth.currentUser, { displayName });
    }

    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      ...(displayName ? { displayName } : {}),
      ...(email ? { email } : {}),
      lastUpdated: serverTimestamp()
    });
  }, []);

  const updateProfilePhoto = async (url: string | null) => {
    if (!auth.currentUser) return;
    await updateFirebaseProfile(auth.currentUser, { photoURL: url });
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      avatarUrl: url,
      hasCustomPhoto: !!url
    });
  };

  const addNotification = useCallback(async (category: NotificationCategory, priority: NotificationPriority, title: string, body: string, actionUrl?: string, action?: string, metadata?: Record<string, any>) => {
    if (notifManager) {
      await notifManager.addNotification(category, priority, title, body, actionUrl, action, metadata);
    }
  }, [notifManager]);

  const updateUserPreferences = async (prefs: Partial<Preferences>) => {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      ...prefs
    });
  };

  const verifyCurrentPassword = async (password: string) => {
    if (!auth.currentUser || !auth.currentUser.email) return false;
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    try {
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true;
    } catch {
      return false;
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!auth.currentUser) return;
    await updateFirebasePassword(auth.currentUser, newPassword);
  };

  const forgotPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const markNotificationRead = async (id: string, read?: boolean) => {
    if (notifManager) {
      await notifManager.markAsRead(id, read);
    }
  };

  const resetAllFinancialData = async () => {
    if (!auth.currentUser || user?.role !== 'super_admin') return;

    const usersSnap = await getDocs(collection(db, 'users'));
    const batch = writeBatch(db);

    usersSnap.forEach((userDoc) => {
      batch.update(userDoc.ref, {
        portfolioBalance: 0,
        availableBalance: 0,
        vaultBalance: 0,
        tokenBalance: 0,
        cashBalance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        aiTradingCapital: 0,
        totalProfit: 0,
        totalLoss: 0,
        notificationsList: []
      });
    });

    await batch.commit();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp, 
      signOutUser, 
      updateProfile, 
      updateProfilePhoto, 
      addNotification, 
      updateUserPreferences, 
      verifyCurrentPassword, 
      changePassword, 
      forgotPassword,
      resetAllFinancialData,
      notifications,
      markNotificationRead
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
