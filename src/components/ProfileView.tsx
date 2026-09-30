import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useAppNavigation } from '../contexts/NavigationContext';
import { multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { QRCodeSVG } from 'qrcode.react';
import { authenticator } from '@otplib/preset-default';
import { safeStorage } from '../utils/storage';
import { getTierState } from '../utils/tierManager';
import UserAvatar from './UserAvatar';
import { getAvatarDataUrl } from '../utils/avatarGenerator';
import { linkedWalletService } from '../services/linkedWalletService';
import { LinkedWallet } from '../types';
import { copyToClipboard } from '../lib/clipboard';
import { 
  User, Mail, Edit3, Key, ShieldCheck, 
  Bell, Share2, Wallet, Settings, HelpCircle, 
  FileText, LogOut, ChevronRight, Camera, X, Check, Copy, AlertTriangle, Medal,
  Volume2, Shield, TrendingUp, ArrowDownCircle, ArrowUpCircle, Gift, Cpu, Megaphone, Zap,
  RefreshCw, MessageSquare
} from 'lucide-react';

const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-[#10b981]' : 'bg-white/10'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export default function ProfileView({ 
  theme, 
  onOpenBonusCenter, 
  onOpenReferralCentre, 
  onOpenPreferences,
  onOpenSupportCenter 
}: { 
  theme: 'light' | 'dark', 
  onOpenBonusCenter?: () => void, 
  onOpenReferralCentre?: () => void, 
  onOpenPreferences?: () => void,
  onOpenSupportCenter?: () => void
}) {
  const { 
    user, 
    signOutUser, 
    updateProfilePhoto,
    updateProfile,
    changePassword,
    updateUserPreferences,
    addNotification,
    verifyCurrentPassword
  } = useAuth();
  const { preferences, updatePreference, t } = usePreferences();
  const { navigateView } = useAppNavigation();

  const handleLogout = async () => {
    try {
      await signOutUser();
    } finally {
      navigateView('home', {}, { replace: true });
      if (typeof window !== 'undefined' && window.history) {
        try {
          window.history.replaceState({ id: 'root-home', view: 'home', tab: 'home' }, '', '/');
        } catch (e) {}
      }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  const tierState = getTierState(user);
  const activeTier = tierState.currentTier;

  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Cropper states removed (immediate save/upload enabled)

  // Form States
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user?.displayName, user?.username, user?.email, activeModal]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password interactive states
  const [shakeCurrentPassword, setShakeCurrentPassword] = useState(false);
  const [currentPasswordIncorrect, setCurrentPasswordIncorrect] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);
  const [profileToast, setProfileToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (profileToast?.show) {
      const timer = setTimeout(() => {
        setProfileToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [profileToast]);

  useEffect(() => {
    if (safeStorage.getItem('aver_auto_open_2fa') === 'true') {
      safeStorage.removeItem('aver_auto_open_2fa');
      setActiveModal('2fa');
    }
    if (safeStorage.getItem('aver_auto_open_referral') === 'true') {
      safeStorage.removeItem('aver_auto_open_referral');
      setActiveModal('referral');
    }
  }, []);

  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorOtpAuthUrl, setTwoFactorOtpAuthUrl] = useState('');
  const [twoFactorBackupCodesList, setTwoFactorBackupCodesList] = useState<string[]>([]);
  const [twoFactorFlowStep, setTwoFactorFlowStep] = useState<'intro' | 'confirm_identity' | 'sending' | 'enter_code' | 'verified'>('intro');
  const [twoFactorFlowType, setTwoFactorFlowType] = useState<'activate' | 'deactivate'>('activate');
  const isEmailVerified = !!(user as any)?.emailVerified || safeStorage.getItem('aver_email_verified') === 'true';
  const [twoFactorEnteredCode, setTwoFactorEnteredCode] = useState<string[]>(['', '', '', '', '', '']);
  const [twoFactorResendCountdown, setTwoFactorResendCountdown] = useState(0);
  const [twoFactorFailedAttempts, setTwoFactorFailedAttempts] = useState(0);
  const [twoFactorDisabledUntil, setTwoFactorDisabledUntil] = useState<number | null>(null);
  const [twoFactorShakeInputs, setTwoFactorShakeInputs] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const twoFactorInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: any;
    if (twoFactorResendCountdown > 0) {
      interval = setInterval(() => {
        setTwoFactorResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [twoFactorResendCountdown]);

  const handleStart2FASetup = () => {
    if (twoFactorDisabledUntil && Date.now() < twoFactorDisabledUntil) {
      const timeLeft = Math.ceil((twoFactorDisabledUntil - Date.now()) / 1000);
      const minLeft = Math.floor(timeLeft / 60);
      const secLeft = timeLeft % 60;
      setErrorMsg(`Too many failed attempts. Verification is temporarily disabled. Please try again in ${minLeft}m ${secLeft}s.`);
      return;
    }

    setErrorMsg('');
    setIsSendingCode(true);
    setTwoFactorFlowStep('sending');

    setTimeout(() => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23457';
      let secret = '';
      const randomValues = new Uint8Array(20);
      window.crypto.getRandomValues(randomValues);
      for (let i = 0; i < randomValues.length; i++) {
        secret += chars[randomValues[i] % chars.length];
      }
      const email = user?.email || 'user@avertox.com';
      const otpauth = authenticator.keyuri(email, 'Avertox Fintech', secret);
      
      setTwoFactorSecret(secret);
      setTwoFactorOtpAuthUrl(otpauth);
      setTwoFactorEnteredCode(['', '', '', '', '', '']);
      setIsSendingCode(false);
      setTwoFactorFlowStep('enter_code');
      setSuccessMsg('✅ TOTP secret generated successfully.');
    }, 1200);
  };

  const handleVerify2FACode = async (codeArray: string[]) => {
    const fullCode = codeArray.join('');
    if (fullCode.length < 6) return;

    if (twoFactorDisabledUntil && Date.now() < twoFactorDisabledUntil) {
      const timeLeft = Math.ceil((twoFactorDisabledUntil - Date.now()) / 1000);
      const minLeft = Math.floor(timeLeft / 60);
      const secLeft = timeLeft % 60;
      setErrorMsg(`Verification is temporarily disabled. Please try again in ${minLeft}m ${secLeft}s.`);
      return;
    }

    let isValid = false;
    try {
      if (twoFactorFlowType === 'activate') {
        isValid = authenticator.verify({ token: fullCode, secret: twoFactorSecret });
      } else {
        const savedSecret = (user as any)?.twoFactorSecret || (preferences as any)?.twoFactorSecret;
        if (savedSecret) {
          isValid = authenticator.verify({ token: fullCode, secret: savedSecret });
        } else {
          isValid = fullCode.length === 6;
        }
      }
    } catch (e) {
      isValid = false;
    }

    if (isValid) {
      setErrorMsg('');
      const backupCodes = [
        Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      ];
      setTwoFactorBackupCodesList(backupCodes);

      try {
        if (twoFactorFlowType === 'activate') {
          const enabledAt = new Date().toISOString();
          await updateUserPreferences({ 
            twoFactorEnabled: true, 
            twoFactorSecret: twoFactorSecret,
            twoFactorEnabledAt: enabledAt,
            twoFactorBackupCodes: backupCodes
          });
          updatePreference('twoFactorEnabled', true);
        } else {
          await updateUserPreferences({ 
            twoFactorEnabled: false, 
            twoFactorSecret: '',
            twoFactorEnabledAt: '',
            twoFactorBackupCodes: []
          });
          updatePreference('twoFactorEnabled', false);
        }
      } catch (err) {
        console.error("Failed to save 2FA state", err);
      }

      setTwoFactorFlowStep('verified');
      setTwoFactorFailedAttempts(0);
      setTwoFactorDisabledUntil(null);
    } else {
      setTwoFactorShakeInputs(true);
      setTimeout(() => setTwoFactorShakeInputs(false), 500);

      const nextAttempts = twoFactorFailedAttempts + 1;
      setTwoFactorFailedAttempts(nextAttempts);

      if (nextAttempts >= 5) {
        const lockTime = Date.now() + 5 * 60 * 1000;
        setTwoFactorDisabledUntil(lockTime);
        setErrorMsg('❌ Too many failed attempts. Verification is temporarily disabled for 5 minutes.');
        setTwoFactorEnteredCode(['', '', '', '', '', '']);
      } else {
        setErrorMsg(`❌ Incorrect verification code. Please try again. (${5 - nextAttempts} attempts remaining)`);
        setTwoFactorEnteredCode(['', '', '', '', '', '']);
        setTimeout(() => {
          twoFactorInputRefs.current[0]?.focus();
        }, 50);
      }
    }
  };

  const handleFinish2FA = async () => {
    try {
      if (twoFactorFlowType === 'activate') {
        setProfileToast({ show: true, message: 'Security upgraded successfully with TOTP 2FA.', type: 'success' });
        if (addNotification) {
          await addNotification(
            'security',
            'high',
            'Two-Factor Auth Enabled',
            'Two-Factor Authentication was enabled for your account.'
          );
        }
      } else {
        setProfileToast({ show: true, message: 'Security downgraded. Two-Factor Authentication disabled.', type: 'success' });
        if (addNotification) {
          await addNotification(
            'security',
            'high',
            'Two-Factor Auth Disabled',
            'Two-Factor Authentication was disabled for your account.'
          );
        }
      }
      closeModal();
    } catch (err: any) {
      setErrorMsg('Failed to update 2FA configuration.');
    }
  };

  const handleInputChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newCode = [...twoFactorEnteredCode];
      newCode[index] = '';
      setTwoFactorEnteredCode(newCode);
      return;
    }

    const char = cleanVal[cleanVal.length - 1];
    const newCode = [...twoFactorEnteredCode];
    newCode[index] = char;
    setTwoFactorEnteredCode(newCode);

    if (index < 5 && char) {
      twoFactorInputRefs.current[index + 1]?.focus();
    }

    const completeCode = [...newCode];
    completeCode[index] = char;
    if (completeCode.every(c => c !== '')) {
      handleVerify2FACode(completeCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!twoFactorEnteredCode[index] && index > 0) {
        const newCode = [...twoFactorEnteredCode];
        newCode[index - 1] = '';
        setTwoFactorEnteredCode(newCode);
        twoFactorInputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...twoFactorEnteredCode];
        newCode[index] = '';
        setTwoFactorEnteredCode(newCode);
      }
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordIncorrect(false);
    setShakeCurrentPassword(false);
    setIsUpdatingPassword(false);
    setPasswordUpdateSuccess(false);
    setErrorMsg('');
    setSuccessMsg('');
    
    // 2FA Reset
    setTwoFactorFlowStep('intro');
    setTwoFactorEnteredCode(['', '', '', '', '', '']);
    setTwoFactorResendCountdown(0);
    setTwoFactorShakeInputs(false);
  };

  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);

  const fetchWallets = async () => {
    if (!user?.uid || user.uid.startsWith('local-')) {
      setLinkedWallets(user?.linkedWallets || []);
      setIsLoadingWallets(false);
      return;
    }
    try {
      const data = await linkedWalletService.getLinkedWallets(user.uid);
      const combinedMap = new Map<string, LinkedWallet>();
      (user?.linkedWallets || []).forEach(w => {
        if (w.address) combinedMap.set(w.address.toLowerCase(), w);
      });
      data.forEach(w => {
        if (w.address) combinedMap.set(w.address.toLowerCase(), w);
      });
      const finalWallets = Array.from(combinedMap.values()).sort((a, b) => new Date(b.linkedAt || 0).getTime() - new Date(a.linkedAt || 0).getTime());
      setLinkedWallets(finalWallets);
    } catch (err) {
      console.error('Failed to fetch linked wallets:', err);
      setLinkedWallets(user?.linkedWallets || []);
    } finally {
      setIsLoadingWallets(false);
    }
  };

  useEffect(() => {
    if (!user?.uid || user.uid.startsWith('local-')) {
      setLinkedWallets(user?.linkedWallets || []);
      setIsLoadingWallets(false);
      return;
    }

    setIsLoadingWallets(true);
    fetchWallets();

    const unsub = linkedWalletService.subscribeUserWallets(user.uid, (firestoreWallets) => {
      const combinedMap = new Map<string, LinkedWallet>();
      (user?.linkedWallets || []).forEach(w => {
        if (w.address) combinedMap.set(w.address.toLowerCase(), w);
      });
      firestoreWallets.forEach(w => {
        if (w.address) combinedMap.set(w.address.toLowerCase(), w);
      });
      const finalWallets = Array.from(combinedMap.values()).sort((a, b) => new Date(b.linkedAt || 0).getTime() - new Date(a.linkedAt || 0).getTime());
      setLinkedWallets(finalWallets);
      setIsLoadingWallets(false);
    });

    return () => unsub();
  }, [user?.uid]);

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardClasses = isDark
    ? "bg-slate-900/40 backdrop-blur-md border border-white/5"
    : "bg-white/60 backdrop-blur-md border border-slate-200/50";
  const modalBgClasses = isDark
    ? "bg-[#000000] border border-white/10 shadow-2xl text-white"
    : "bg-white border border-slate-200 shadow-2xl text-slate-950";
  const itemHover = isDark ? "hover:bg-white/5" : "hover:bg-slate-50";

  const resizeImage = (dataUrl: string, maxWidth = 450, maxHeight = 450): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
    });
  };

  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  const handleRemovePhoto = async () => {
    if (window.confirm("Are you sure you want to remove your profile photo?")) {
      setIsPhotoLoading(true);
      try {
        await updateProfilePhoto(null);
        setIsPhotoLoading(false);
        setErrorMsg('');
      } catch (err) {
        console.error("Error removing profile photo:", err);
        setErrorMsg("Failed to remove profile photo.");
        setIsPhotoLoading(false);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg("Image size exceeds the 8 MB limit.");
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
      
      const isAllowed = allowedTypes.includes(file.type) || allowedExts.includes(fileExt);
      
      if (!isAllowed) {
        setErrorMsg("Unsupported image format. Allowed formats: JPG, JPEG, PNG, WEBP.");
        return;
      }

      setIsPhotoLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read image file."));
          reader.readAsDataURL(file);
        });

        const optimizedUrl = await new Promise<string>((resolve) => {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 400; // Optimal performance & high quality
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              resolve(dataUrl);
            }
          };
          img.onerror = () => resolve(dataUrl);
        });

        await updateProfilePhoto(optimizedUrl);
        setSuccessMsg('Profile photo updated successfully.');
      } catch (err: any) {
        console.error("Error uploading profile photo:", err);
        setErrorMsg(err?.message || "Failed to upload profile photo.");
      } finally {
        setIsPhotoLoading(false);
        e.target.value = '';
      }
    }
  };

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!username.trim() || !email.trim()) {
      setErrorMsg('All fields are required.');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateProfile(displayName.trim() || user?.displayName || '', username.trim().toLowerCase().replace(/\s+/g, ''), email.trim());
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setActiveModal(null), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const ruleLength = newPassword.length >= 8;
  const ruleUppercase = /[A-Z]/.test(newPassword);
  const ruleLowercase = /[a-z]/.test(newPassword);
  const ruleNumber = /[0-9]/.test(newPassword);
  const ruleSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const allRulesSatisfied = ruleLength && ruleUppercase && ruleLowercase && ruleNumber && ruleSpecial;

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setCurrentPasswordIncorrect(false);

    if (!navigator.onLine) {
      setErrorMsg("Unable to update password. Please check your connection.");
      return;
    }

    if (!currentPassword) {
      setErrorMsg('Current password is required.');
      setCurrentPasswordIncorrect(true);
      setShakeCurrentPassword(true);
      setTimeout(() => setShakeCurrentPassword(false), 500);
      return;
    }

    const isCurrentPasswordCorrect = await verifyCurrentPassword(currentPassword);
    if (!isCurrentPasswordCorrect) {
      setCurrentPasswordIncorrect(true);
      setShakeCurrentPassword(true);
      setTimeout(() => setShakeCurrentPassword(false), 500);
      setErrorMsg('Current password is incorrect.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (!allRulesSatisfied) {
      setErrorMsg('New password does not meet security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!navigator.onLine) {
            reject(new Error("Unable to update password. Please check your connection."));
          } else {
            resolve(true);
          }
        }, 1100);
      });

      await changePassword(newPassword);

      setPasswordUpdateSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to update password. Please check your connection.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Re-authentication for security sensitive action
      // In a real Firebase app, we'd use reauthenticateWithCredential here
      // For this implementation, we proceed to MFA if authorized
      
      if (!mfaSecret) {
        // Start enrollment
        const fbUser = auth.currentUser;
        if (!fbUser) return;
        const mfa = multiFactor(fbUser);
        const session = await mfa.getSession();
        const secret = await TotpMultiFactorGenerator.generateSecret(session);
        setMfaSecret(secret);
        setTwoFactorFlowStep('enter_code'); // Ensure we move to code entry
        return;
      }

      // Verify and finalize enrollment
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
        mfaSecret,
        twoFactorCode
      );
      
      const fbUser = auth.currentUser;
      if (!fbUser) return;
      const mfa = multiFactor(fbUser);
      await mfa.enroll(multiFactorAssertion, 'My 2FA Device');

      // Update Firestore preference for persistent state
      await updateUserPreferences({ twoFactorEnabled: true });
      updatePreference('twoFactorEnabled', true);
      
      setSuccessMsg('2FA Enabled Successfully!');
      setMfaSecret(null);
      setTwoFactorCode('');
      setTwoFactorFlowStep('verified');
      setTimeout(() => setActiveModal(null), 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to enable 2FA: ' + err.message);
    }
  };

  const handleConnectWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    
    const trimmedAddress = walletAddress.trim();
    const isEth = ethRegex.test(trimmedAddress);
    const isSol = solRegex.test(trimmedAddress);

    if (!isEth && !isSol) {
      setErrorMsg('Please enter a valid Ethereum (0x...) or Solana wallet address.');
      return;
    }
    
    if (linkedWallets.some(w => w.address.toLowerCase() === trimmedAddress.toLowerCase()) || 
        user?.linkedWallets?.some(w => w.address.toLowerCase() === trimmedAddress.toLowerCase())) {
      setErrorMsg('This wallet is already linked to your account.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const walletId = Math.random().toString(36).substring(2, 11);
      const newWalletData = {
          userId: user?.uid || 'guest',
          userName: user?.displayName || user?.username || 'Trader',
          userEmail: user?.email || '',
          address: trimmedAddress,
          network: isEth ? 'Ethereum' : 'Solana',
          provider: 'Manual Connection'
      };

      const newWallet: LinkedWallet = {
        ...newWalletData,
        id: walletId,
        status: 'Connected',
        linkedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      // 1. Instantly update local state for immediate UI feedback
      setLinkedWallets(prev => [newWallet, ...prev.filter(w => w.address.toLowerCase() !== trimmedAddress.toLowerCase())]);
      setWalletAddress('');

      // 2. Save to Firestore linked_wallets collection so Admin Dashboard sees it instantly
      try {
        const firestoreId = await linkedWalletService.linkWallet(newWalletData);
        if (firestoreId) {
          newWallet.id = firestoreId;
        }
      } catch (fErr) {
        console.warn('linkedWalletService.linkWallet write notice:', fErr);
      }

      // 3. Update User Profile document
      const updatedWallets = [...(user?.linkedWallets || []).filter(w => w.address.toLowerCase() !== trimmedAddress.toLowerCase()), newWallet];
      await updateProfile({ linkedWallets: updatedWallets });

      // Dispatch custom event for real-time local sync across admin views
      window.dispatchEvent(new CustomEvent('aver_wallet_updated'));

      setSuccessMsg('Wallet linked successfully.');
      if (addNotification) {
        await addNotification(
          'security',
          'high',
          'Cryptocurrency Wallet Linked',
          `Your ${isEth ? 'Ethereum' : 'Solana'} wallet (${trimmedAddress.substring(0, 6)}...${trimmedAddress.substring(trimmedAddress.length - 4)}) has been securely linked.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to link wallet. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);

  const handleUnlinkWallet = async (walletId: string) => {
    setIsUnlinking(walletId);
    setErrorMsg('');
    try {
        // 1. Instantly remove from local component state for immediate UI update
        setLinkedWallets(prev => prev.filter(w => w.id !== walletId));

        // 2. Remove from user profile document in Firestore/Auth state
        const updatedWallets = (user?.linkedWallets || []).filter(w => w.id !== walletId);
        await updateProfile({ linkedWallets: updatedWallets });

        // 3. Remove from linked_wallets collection
        try {
          await linkedWalletService.unlinkWallet(walletId);
        } catch (uErr) {
          console.warn('linkedWalletService.unlinkWallet notice:', uErr);
        }

        window.dispatchEvent(new CustomEvent('aver_wallet_updated'));
        
        if (addNotification) {
          await addNotification(
            'security',
            'medium',
            'Wallet Unlinked',
            'The selected cryptocurrency wallet has been successfully removed from your profile.'
          );
        }
        
        setSuccessMsg('Wallet unlinked successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
        console.error('Failed to unlink wallet:', err);
        setErrorMsg(`Failed to unlink wallet: ${err.message || 'Unknown error'}`);
        if (addNotification) {
          await addNotification('security', 'high', 'Unlink Failed', 'Could not remove the wallet at this time.');
        }
    } finally {
        setIsUnlinking(null);
    }
  };

  const handleCopyReferral = async () => {
    const success = await copyToClipboard(user?.referralCode || '');
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const menuSections = [
    {
      title: 'Account Settings',
      items: [
        { icon: Edit3, label: t('common.edit_profile'), id: 'edit' },
        { icon: Key, label: t('common.change_password'), id: 'password' },
        { icon: ShieldCheck, label: `Two-Factor Auth (${preferences?.twoFactorEnabled ? 'On' : 'Off'})`, id: '2fa' },
        { icon: Bell, label: t('common.notification_settings'), id: 'notifications' },
      ]
    },
    {
      title: 'Network & Assets',
      items: [
        { icon: Share2, label: t('common.referral_program'), id: 'referral' },
        { icon: Wallet, label: t('common.linked_wallets'), id: 'wallets' },
      ]
    },
    {
      title: 'App Settings',
      items: [
        { icon: Settings, label: t('common.preferences'), id: 'preferences' }
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Header Profile Info */}
      <div className={`rounded-[24px] p-6 ${cardClasses} flex flex-col items-center text-center relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
        
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 p-1 mb-2 relative group shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center relative ${isDark ? 'bg-black' : 'bg-white'}`}>
            <UserAvatar user={user} sizeClass="w-full h-full" fontSizeClass="text-3xl" isDark={isDark} />
            {isPhotoLoading && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center space-y-1 backdrop-blur-[1px]">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[8px] font-extrabold text-emerald-400 uppercase tracking-wider">{t('common.saving').replace('...', '')}</span>
              </div>
            )}
          </div>
          
          {/* Enhanced Camera Button */}
          <button 
            disabled={isPhotoLoading}
            onClick={() => fileInputRef.current?.click()}
            className={`absolute -bottom-1 -right-1 p-2 bg-emerald-500 text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl cursor-pointer z-10 group/cam ${isPhotoLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Camera className="w-4 h-4" />
            
            {!isPhotoLoading && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover/cam:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                {t('common.edit_profile').replace('Profile', 'Photo')}
              </div>
            )}
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePhotoUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {user?.hasCustomPhoto && !user?.avatarUrl?.startsWith('data:image/svg+xml') ? null : (
          <button
            type="button"
            disabled={isPhotoLoading}
            onClick={async () => {
              setIsPhotoLoading(true);
              try {
                const newSeed = Math.random().toString(36).substring(2, 15);
                const newDataUrl = getAvatarDataUrl(newSeed);
                await updateProfile({ 
                  avatarSeed: newSeed, 
                  avatarUrl: newDataUrl, 
                  profilePhotoURL: newDataUrl,
                  hasCustomPhoto: true 
                });
                if (addNotification) {
                  await addNotification(
                    'account',
                    'low',
                    'Avatar Randomised',
                    'Your procedurally unique cartoon avatar has been successfully updated.'
                  );
                }
              } catch (err) {
                console.error("Error regenerating avatar:", err);
              } finally {
                setIsPhotoLoading(false);
              }
            }}
            className="mb-4 px-3 py-1.5 text-[11px] font-bold rounded-full border border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
          >
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
            <span>Randomise Avatar</span>
          </button>
        )}
        
        {errorMsg && !activeModal && (
          <div className="mb-4 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono rounded-xl max-w-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-white/5 rounded-lg ml-2 cursor-pointer text-gray-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        <h2 className={`text-2xl font-bold tracking-tight mb-1 ${textPrimary}`}>
          @{user?.username || user?.email?.split('@')[0] || 'user'}
        </h2>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 w-full mt-2">
          <div className={`flex items-center text-sm ${textSecondary}`}>
            <Mail className="w-4 h-4 mr-2 opacity-70" />
            {user?.email || 'user@example.com'}
          </div>
        </div>

        {/* Membership Tier Badge */}
        <div className="mt-4 flex justify-center">
          <button 
            onClick={() => {
              if (onOpenBonusCenter) onOpenBonusCenter();
            }}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border ${activeTier.badgeBorder} ${activeTier.badgeBg} ${activeTier.badgeGlow} transition-all cursor-pointer backdrop-blur-sm active:scale-95`}
          >
            <span className="text-lg">{activeTier.badge}</span>
            <span className={`text-xs font-bold ${activeTier.badgeText} uppercase tracking-wider`}>
              {activeTier.name}
            </span>
          </button>
        </div>
      </div>

      {/* Settings Menu List */}
      <div className="space-y-6">
        {menuSections.map((section, idx) => (
          <div key={idx}>
            <h3 className={`text-xs font-bold ml-4 mb-3 uppercase tracking-wider text-gray-500`}>
              {section.title}
            </h3>
            <div className={`rounded-[24px] overflow-hidden ${cardClasses}`}>
              {section.items.map((item, i) => (
                <button 
                  key={item.id} 
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    if (item.id === 'referral') {
                      if (onOpenReferralCentre) {
                        onOpenReferralCentre();
                      } else {
                        setActiveModal('referral');
                      }
                    } else if (item.id === 'preferences' && onOpenPreferences) {
                      onOpenPreferences();
                    } else {
                      setActiveModal(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 transition-all cursor-pointer touch-manipulation select-none active:scale-[0.99] ${itemHover} ${
                    i !== section.items.length - 1 ? (isDark ? 'border-b border-white/5' : 'border-b border-slate-100') : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className={`font-medium text-sm ${textPrimary}`}>{item.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Log Out button */}
      <div className={`rounded-[24px] overflow-hidden ${cardClasses} mt-8`}>
        <button 
          type="button"
          onClick={handleLogout}
          className={`w-full flex items-center justify-between p-4 transition-all cursor-pointer touch-manipulation select-none active:scale-[0.99] ${
            isDark ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center space-x-4 text-rose-500">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isDark ? 'bg-rose-500/10' : 'bg-rose-100'
            }`}>
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm">{t('common.logout')}</span>
          </div>
        </button>
      </div>

      {/* Interactive Modals Backdrop */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeModal();
              }}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.95, y: 20 }}
                className={`w-full ${activeModal === 'notifications' ? 'max-w-xl md:max-w-2xl' : 'max-w-md'} rounded-[28px] p-6 max-h-[85vh] overflow-y-auto flex flex-col transition-all duration-300 relative z-[10000] my-auto ${modalBgClasses}`}
                onClick={(e) => e.stopPropagation()}
              >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black tracking-tight flex items-center">
                  {activeModal === 'edit' && <Edit3 className="w-5 h-5 mr-2 text-emerald-500" />}
                  {activeModal === 'password' && <Key className="w-5 h-5 mr-2 text-emerald-500" />}
                  {activeModal === '2fa' && <ShieldCheck className="w-5 h-5 mr-2 text-emerald-500" />}
                  {activeModal === 'referral' && <Share2 className="w-5 h-5 mr-2 text-emerald-500" />}
                  {activeModal === 'wallets' && <Wallet className="w-5 h-5 mr-2 text-emerald-500" />}
                  {activeModal === 'notifications' && <Bell className="w-5 h-5 mr-2 text-emerald-500" />}
                  {activeModal === 'preferences' && <Settings className="w-5 h-5 mr-2 text-emerald-500" />}
                  
                  {activeModal === 'edit' && t('common.edit_profile')}
                  {activeModal === 'password' && t('common.change_password')}
                  {activeModal === '2fa' && (
                    twoFactorFlowStep === 'confirm_identity' ? (twoFactorFlowType === 'activate' ? 'Confirm Your Identity' : 'Disable Two-Factor Auth') :
                    twoFactorFlowStep === 'enter_code' ? 'Verify Code' :
                    twoFactorFlowStep === 'verified' ? 'Identity Verified' :
                    'Two-Factor Auth'
                  )}
                  {activeModal === 'referral' && t('common.referral_program')}
                  {activeModal === 'wallets' && t('common.linked_wallets')}
                  {activeModal === 'notifications' && t('common.notification_settings')}
                </h3>
                <button 
                  onClick={closeModal} 
                  className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-slate-100 text-gray-500'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status alerts */}
              {errorMsg && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono rounded-xl flex items-start">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono rounded-xl flex items-start">
                  <Check className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Edit Profile Modal Content */}
              {activeModal === 'edit' && (
                <form onSubmit={handleProfileUpdateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Full Name</label>
                    <input 
                      type="text" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your full name"
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                        isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-500 font-bold">@</span>
                      <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        className={`w-full pl-8 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                          isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                        isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full py-3 bg-emerald-500 text-black font-bold rounded-xl mt-6 hover:scale-[1.02] transition-transform active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isUpdatingProfile ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Save Profile Changes</span>
                    )}
                  </button>
                </form>
              )}

              {/* Change Password Content */}
              {activeModal === 'password' && (
                passwordUpdateSuccess ? (
                  <div className="text-center py-6 space-y-5">
                    <div className="flex justify-center">
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20"
                      >
                        <Check className="w-8 h-8" />
                      </motion.div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-base font-extrabold tracking-tight text-white flex items-center justify-center space-x-1.5">
                        <span>✅</span>
                        <span>Password Updated Successfully</span>
                      </h4>
                      <p className={`text-xs leading-relaxed ${textSecondary}`}>
                        Your account password has been changed successfully.
                      </p>
                    </div>
                    <button 
                      onClick={closeModal}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Current Password</label>
                      <motion.input 
                        type="password" 
                        placeholder="••••••••"
                        value={currentPassword} 
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setCurrentPasswordIncorrect(false);
                          setErrorMsg('');
                        }}
                        animate={shakeCurrentPassword ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                          isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
                        } ${
                          currentPasswordIncorrect 
                            ? 'border-rose-500 ring-2 ring-rose-500/20' 
                            : isDark ? 'border-white/10' : 'border-slate-200'
                        }`}
                      />
                      {currentPasswordIncorrect && (
                        <p className="text-rose-400 text-[11px] font-semibold mt-1 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Current password is incorrect.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={newPassword} 
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setErrorMsg('');
                        }}
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                          isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
                        } ${isDark ? 'border-white/10' : 'border-slate-200'}`}
                      />
                      
                      {/* Live Password Rules Checklist */}
                      <div className={`mt-2.5 space-y-1.5 p-3 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-950/50 border-white/5' : 'bg-slate-100/50 border-slate-200'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Check className={`w-3.5 h-3.5 transition-colors ${ruleLength ? 'text-emerald-400' : 'text-gray-500'}`} />
                          <span className={ruleLength ? 'text-emerald-400 font-medium' : 'text-gray-400'}>✓ 8+ characters</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Check className={`w-3.5 h-3.5 transition-colors ${ruleUppercase ? 'text-emerald-400' : 'text-gray-500'}`} />
                          <span className={ruleUppercase ? 'text-emerald-400 font-medium' : 'text-gray-400'}>✓ Uppercase letter</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Check className={`w-3.5 h-3.5 transition-colors ${ruleLowercase ? 'text-emerald-400' : 'text-gray-500'}`} />
                          <span className={ruleLowercase ? 'text-emerald-400 font-medium' : 'text-gray-400'}>✓ Lowercase letter</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Check className={`w-3.5 h-3.5 transition-colors ${ruleNumber ? 'text-emerald-400' : 'text-gray-500'}`} />
                          <span className={ruleNumber ? 'text-emerald-400 font-medium' : 'text-gray-400'}>✓ Number</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Check className={`w-3.5 h-3.5 transition-colors ${ruleSpecial ? 'text-emerald-400' : 'text-gray-500'}`} />
                          <span className={ruleSpecial ? 'text-emerald-400 font-medium' : 'text-gray-400'}>✓ Special character</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={confirmPassword} 
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setErrorMsg('');
                        }}
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                          isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
                        } ${
                          confirmPassword && confirmPassword !== newPassword 
                            ? 'border-rose-500 ring-2 ring-rose-500/20' 
                            : isDark ? 'border-white/10' : 'border-slate-200'
                        }`}
                      />
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-rose-400 text-[11px] font-semibold mt-1 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Passwords do not match.
                        </p>
                      )}
                    </div>

                    <button 
                      type="submit"
                      disabled={isUpdatingPassword || !currentPassword || !allRulesSatisfied || newPassword !== confirmPassword}
                      className={`w-full py-3 font-bold rounded-xl mt-6 transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                        isUpdatingPassword || !currentPassword || !allRulesSatisfied || newPassword !== confirmPassword
                          ? 'bg-slate-800 text-gray-500 cursor-not-allowed opacity-50 border border-white/5'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/15'
                      }`}
                    >
                      {isUpdatingPassword ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Saving Securely...</span>
                        </>
                      ) : (
                        <span>Update Secure Password</span>
                      )}
                    </button>
                  </form>
                )
              )}

              {/* Two-Factor Auth Configuration */}
              {activeModal === '2fa' && (
                <div className="space-y-5">
                  {/* STEP 1: intro */}
                  {twoFactorFlowStep === 'intro' && (
                    <div className="space-y-4 text-center">
                      <div className="flex justify-center mb-2">
                        {preferences.twoFactorEnabled ? (
                          <div className="flex justify-center">
                            <div className={`p-4 rounded-full relative ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                              <ShieldCheck className="w-10 h-10 animate-pulse" />
                              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full animate-ping" />
                              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                            </div>
                          </div>
                        ) : (
                          <div className={`p-4 rounded-full ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            <ShieldCheck className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-center">
                          {preferences.twoFactorEnabled ? (
                            <div className="flex items-center space-x-1.5 py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>2FA ENABLED</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5 py-1 px-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>2FA DISABLED</span>
                            </div>
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed ${textSecondary}`}>
                          {preferences.twoFactorEnabled 
                            ? 'Your account is fully secured. Two-Factor Authentication is currently active, safeguarding your transactions and personal details.'
                            : 'Two-Factor Authentication adds an extra layer of protection by requiring a 6-character verification code sent to your email whenever you log in or change settings.'
                          }
                        </p>
                      </div>

                      <button 
                        onClick={() => {
                          setErrorMsg('');
                          setSuccessMsg('');
                          if (preferences.twoFactorEnabled) {
                            setTwoFactorFlowType('deactivate');
                          } else {
                            setTwoFactorFlowType('activate');
                          }
                          setTwoFactorFlowStep('confirm_identity');
                        }}
                        className={`w-full py-3 font-extrabold rounded-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg ${
                          preferences.twoFactorEnabled 
                            ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20' 
                            : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                        }`}
                      >
                        {preferences.twoFactorEnabled ? 'Disable 2FA Security' : 'Activate 2FA Security'}
                      </button>
                    </div>
                  )}

                  {/* STEP 2: confirm_identity */}
                  {twoFactorFlowStep === 'confirm_identity' && (
                    <div className="space-y-5 text-left">
                      {twoFactorFlowType === 'activate' ? (
                        <>
                          <p className={`text-xs leading-relaxed ${textSecondary}`}>
                            Before enabling Two-Factor Authentication, please verify that you are the owner of this account.
                          </p>
                          
                          {/* User Info Card */}
                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-100'} space-y-2.5 text-xs font-mono`}>
                            <div className="flex justify-between">
                              <span className={textSecondary}>• Username</span>
                              <span className={`${textPrimary} font-bold`}>@{user?.username || 'user'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`${textSecondary} whitespace-nowrap`}>• Email</span>
                              <span className={`${textPrimary} font-bold truncate ml-2`}>{user?.email || 'user@example.com'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={textSecondary}>• Member Tier</span>
                              <span className="text-[#e6a865] font-extrabold flex items-center space-x-1">
                                <span>🥉</span>
                                <span>Bronze Member</span>
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 pt-1">
                            <h4 className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Verification Method</h4>
                            <div className={`p-4 rounded-2xl border flex items-start space-x-3 bg-emerald-500/5 border-emerald-500/20`}>
                              <span className="text-xl mt-0.5">🔒</span>
                              <div>
                                <span className={`block text-xs font-bold ${textPrimary}`}>Authenticator App (TOTP)</span>
                                <span className={`block text-[10px] leading-normal ${textSecondary} mt-0.5`}>
                                  Use Google Authenticator, Authy, or any TOTP authenticator app to scan setup key and generate 6-digit codes.
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-center my-2">
                            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">
                              <AlertTriangle className="w-8 h-8" />
                            </div>
                          </div>
                          <div className="text-center space-y-2">
                            <p className={`text-xs leading-relaxed ${textSecondary}`}>
                              Disabling Two-Factor Authentication will reduce the security of your account. To continue, verify your identity.
                            </p>
                          </div>
                          
                          <div className={`p-3.5 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-100'} text-xs font-mono`}>
                            <span className={textSecondary}>Security Method: </span>
                            <span className={`${textPrimary} font-bold`}>Authenticator App</span>
                          </div>
                        </>
                      )}

                      <button 
                        onClick={handleStart2FASetup}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 mt-4"
                      >
                        <span>Configure Authenticator App</span>
                      </button>
                    </div>
                  )}

                  {/* STEP 3: sending */}
                  {twoFactorFlowStep === 'sending' && (
                    <div className="text-center py-8 space-y-6">
                      <div className="flex justify-center">
                        <div className="relative w-16 h-16">
                          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/10 animate-ping" />
                          <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className={`text-base font-extrabold tracking-tight ${textPrimary}`}>
                          Generating TOTP Secret Key...
                        </h4>
                        <p className={`text-xs ${textSecondary}`}>
                          Establishing secure cryptographic parameters for your authenticator app...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: enter_code */}
                  {twoFactorFlowStep === 'enter_code' && (
                    <div className="space-y-4 text-center">
                      {/* Real QR Code & Setup Key */}
                      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                        <div className="flex justify-center">
                          <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-300 flex items-center justify-center shadow-inner">
                            {twoFactorOtpAuthUrl && (
                              <QRCodeSVG 
                                value={twoFactorOtpAuthUrl} 
                                size={128} 
                                bgColor="#ffffff" 
                                fgColor="#000000" 
                                level="M"
                              />
                            )}
                          </div>
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold tracking-wider ${textSecondary}`}>Setup Key (Manual Entry)</p>
                          <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5 tracking-widest bg-emerald-500/10 py-1.5 px-3 rounded-lg border border-emerald-500/25 inline-block select-all">
                            {twoFactorSecret ? twoFactorSecret.match(/.{1,4}/g)?.join(' ') : '---'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className={`text-xs leading-relaxed ${textSecondary}`}>
                          Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator) or enter the setup key manually. Then enter the 6-digit verification code below.
                        </p>
                      </div>

                      {/* Six Numeric Inputs */}
                      <motion.div 
                        animate={twoFactorShakeInputs ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        className="flex justify-center space-x-2.5 py-1"
                      >
                        {twoFactorEnteredCode.map((char, index) => (
                          <input 
                            key={index}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={char}
                            ref={(el) => { twoFactorInputRefs.current[index] = el; }}
                            onChange={(e) => handleInputChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            disabled={!!(twoFactorDisabledUntil && Date.now() < twoFactorDisabledUntil)}
                            className={`w-11 h-13 text-center text-lg font-black font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                              isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                            } ${
                              twoFactorDisabledUntil && Date.now() < twoFactorDisabledUntil ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                          />
                        ))}
                      </motion.div>
                    </div>
                  )}

                  {/* STEP 5: verified */}
                  {twoFactorFlowStep === 'verified' && (
                    <div className="text-center py-4 space-y-6">
                      <div className="flex justify-center">
                        <motion.div 
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                          className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20 relative"
                        >
                          <ShieldCheck className="w-8 h-8 text-emerald-400" />
                          <motion.div 
                            initial={{ scale: 1, opacity: 0.4 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                            className="absolute inset-0 bg-emerald-500/20 rounded-full"
                          />
                        </motion.div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className={`text-base font-extrabold tracking-tight ${textPrimary}`}>
                          Two-Factor Authentication Enabled
                        </h4>
                        <p className={`text-xs leading-relaxed ${textSecondary} max-w-sm mx-auto`}>
                          {twoFactorFlowType === 'activate' 
                            ? "Your account is now fully secured with TOTP Two-Factor Authentication." 
                            : "Two-Factor Authentication has been successfully disabled for your account."}
                        </p>
                      </div>

                      {twoFactorFlowType === 'activate' && twoFactorBackupCodesList.length > 0 && (
                        <div className={`p-4 rounded-xl border text-left ${isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center space-x-1">
                            <span>⚠️</span>
                            <span>Backup Recovery Codes (Save These)</span>
                          </p>
                          <div className="grid grid-cols-2 gap-2 font-mono text-xs font-bold">
                            {twoFactorBackupCodesList.map((code, idx) => (
                              <div key={idx} className={`p-2 rounded border ${isDark ? 'bg-black/40 border-white/5 text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'}`}>
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={handleFinish2FA}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        Finish
                      </button>
                    </div>
                  )}

                  {/* Extra Polish Security Summary Footer */}
                  {['intro', 'confirm_identity', 'enter_code'].includes(twoFactorFlowStep) && (
                    <div className={`mt-4 pt-4 border-t text-left ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                      <h4 className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1.5 mb-2.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>🟢 Security Status</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs font-mono">
                        <li className="flex justify-between items-center">
                          <span className={`${textSecondary} text-[11px]`}>• Email Verified</span>
                          {isEmailVerified ? (
                            <span className="text-emerald-400 font-extrabold">✓</span>
                          ) : (
                            <span className="text-rose-400 font-extrabold">✗</span>
                          )}
                        </li>
                        <li className="flex justify-between items-center">
                          <span className={`${textSecondary} text-[11px]`}>• Password Protected</span>
                          <span className="text-emerald-400 font-extrabold">✓</span>
                        </li>
                        <li className="flex justify-between items-center">
                          <span className={`${textSecondary} text-[11px] whitespace-nowrap`}>• 2FA Security</span>
                          {preferences.twoFactorEnabled || (user as any)?.twoFactorEnabled ? (
                            <span className="text-emerald-400 font-extrabold">✓</span>
                          ) : (
                            <span className="text-rose-400 font-extrabold">✗</span>
                          )}
                        </li>
                        {(preferences.twoFactorEnabled || (user as any)?.twoFactorEnabled) && (
                          <>
                            <li className="flex justify-between items-center">
                              <span className={`${textSecondary} text-[11px]`}>• Method</span>
                              <span className="text-emerald-400 font-bold">Authenticator App (TOTP)</span>
                            </li>
                            <li className="flex justify-between items-center">
                              <span className={`${textSecondary} text-[11px]`}>• Enabled At</span>
                              <span className={`${textPrimary} text-[11px]`}>
                                {(user as any)?.twoFactorEnabledAt ? new Date((user as any).twoFactorEnabledAt).toLocaleString() : 'Active'}
                              </span>
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Referral Program */}
              {activeModal === 'referral' && (
                <div className="space-y-4 text-center">
                  <div className="flex justify-center mb-2">
                    <div className={`p-4 rounded-full ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Share2 className="w-10 h-10" />
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed ${textSecondary}`}>
                    Invite your friends and earn 10% of their staking and AI trading optimizer fees forever.
                  </p>

                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className={`p-3 rounded-2xl border text-center ${isDark ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                      <p className="text-lg font-black text-emerald-500">3</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">Invites Joined</p>
                    </div>
                    <div className={`p-3 rounded-2xl border text-center ${isDark ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                      <p className="text-lg font-black text-emerald-500">$75.00</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">Total Earned</p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border text-left ${isDark ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Your Referral Code</p>
                    <div className="flex justify-between items-center bg-black/10 px-3 py-2.5 rounded-xl border border-white/5">
                      <span className="font-mono text-sm font-bold text-emerald-400">{user?.referralCode || ''}</span>
                      <button 
                        onClick={handleCopyReferral} 
                        className={`flex items-center space-x-1 text-xs font-bold font-mono uppercase tracking-wider px-2 py-1 rounded-md transition-all ${
                          copied ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Crypto Wallets */}
              {activeModal === 'wallets' && (
                <div className="space-y-4">
                  <p className={`text-xs leading-relaxed text-center ${textSecondary}`}>
                    Connect external Web3 wallet addresses to synchronize token balances and secure transaction histories.
                  </p>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-500/10'}`}>
                    <p className={`text-xs font-bold flex items-center ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      <ShieldCheck className="w-4 h-4 mr-1.5" />
                      Multichain Support
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                      We support MetaMask, WalletConnect, Phantom, and Ledger secure addresses on Ethereum, Solana, and BSC networks.
                    </p>
                  </div>

                  {isLoadingWallets ? (
                    <div className="py-12 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-3" />
                      <p className="text-xs text-slate-500">Retrieving linked wallets from the network...</p>
                    </div>
                  ) : linkedWallets.length > 0 ? (
                    <div className="space-y-3 mt-4">
                      {linkedWallets.map(wallet => (
                        <div key={wallet.id} className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}
                              </span>
                              <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold">
                                {wallet.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                              {wallet.network} • {wallet.provider}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isUnlinking === wallet.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUnlinkWallet(wallet.id);
                            }}
                            className={`p-2 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center min-w-[70px] ${
                              isDark 
                                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' 
                                : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                            } ${isUnlinking === wallet.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isUnlinking === wallet.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              'Unlink'
                            )}
                          </button>
                        </div>
                      ))}
                      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/10">
                        <p className={`text-xs font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Link Another Wallet</p>
                        <form onSubmit={(e) => handleConnectWallet(e)} className="space-y-4">
                          <div>
                            <input 
                              type="text" 
                              placeholder="0x... or Solana Key Address"
                              value={walletAddress} 
                              onChange={(e) => setWalletAddress(e.target.value)}
                              className={`w-full px-4 py-3 rounded-xl border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                                isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                              }`}
                            />
                          </div>
                          <button 
                            type="submit"
                            className="w-full py-3 bg-emerald-500 text-black font-bold rounded-xl hover:scale-[1.02] transition-transform active:scale-95 cursor-pointer"
                          >
                            Establish Secure Connection
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleConnectWallet(e)} className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Wallet Public Key Address</label>
                        <input 
                          type="text" 
                          placeholder="0x... or Solana Key Address"
                          value={walletAddress} 
                          onChange={(e) => setWalletAddress(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                            isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-3 bg-emerald-500 text-black font-bold rounded-xl mt-4 hover:scale-[1.02] transition-transform active:scale-95 cursor-pointer"
                      >
                        Establish Secure Connection
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Notification Toggles */}
              {activeModal === 'notifications' && (
                <div className="space-y-6 pt-2">
                  {/* Master Switch Card */}
                  <div className={`p-5 rounded-3xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className={`text-base font-black ${textPrimary}`}>Notifications</h4>
                        <p className="text-xs text-gray-400 mt-0.5">Choose how Aver communicates with you.</p>
                      </div>
                      <ToggleSwitch 
                        checked={preferences.notifications?.master ?? true}
                        onChange={(val) => {
                          updatePreference('notifications', {
                            ...preferences.notifications,
                            master: val
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Settings Sections */}
                  <div className={`space-y-4 ${(preferences.notifications?.master ?? true) ? '' : 'opacity-50 pointer-events-none'}`}>
                    
                    {/* Security Alerts */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg"><Shield className="w-5 h-5 text-emerald-500" /></div>
                          <div>
                            <p className={`text-sm font-bold ${textPrimary}`}>Security Alerts</p>
                            <p className="text-[10px] text-gray-500">Receive notifications for important security events.</p>
                          </div>
                        </div>
                        <ToggleSwitch 
                          checked={preferences.notifications?.security ?? true}
                          onChange={(val) => updatePreference('notifications', { ...preferences.notifications, security: val })}
                        />
                      </div>
                    </div>

                    {/* Account Activity */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg"><User className="w-5 h-5 text-emerald-500" /></div>
                          <div>
                            <p className={`text-sm font-bold ${textPrimary}`}>Account Activity</p>
                            <p className="text-[10px] text-gray-500">Notifications for profile and account changes.</p>
                          </div>
                        </div>
                        <ToggleSwitch 
                          checked={preferences.notifications?.profile ?? true}
                          onChange={(val) => updatePreference('notifications', { ...preferences.notifications, profile: val })}
                        />
                      </div>
                    </div>

                    {/* Trading Activity */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-500" /></div>
                          <div>
                            <p className={`text-sm font-bold ${textPrimary}`}>Trading Activity</p>
                            <p className="text-[10px] text-gray-500">Updates on your trades and portfolio.</p>
                          </div>
                        </div>
                        <ToggleSwitch 
                          checked={preferences.notifications?.trading ?? true}
                          onChange={(val) => updatePreference('notifications', { ...preferences.notifications, trading: val })}
                        />
                      </div>
                    </div>

                    {/* Deposits & Withdrawals */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg"><ArrowDownCircle className="w-5 h-5 text-emerald-500" /></div>
                          <div>
                            <p className={`text-sm font-bold ${textPrimary}`}>Deposits</p>
                            <p className="text-[10px] text-gray-500">Funds arrival alerts.</p>
                          </div>
                        </div>
                        <ToggleSwitch 
                          checked={preferences.notifications?.deposits ?? true}
                          onChange={(val) => updatePreference('notifications', { ...preferences.notifications, deposits: val })}
                        />
                      </div>
                    </div>
                    
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg"><ArrowUpCircle className="w-5 h-5 text-emerald-500" /></div>
                          <div>
                            <p className={`text-sm font-bold ${textPrimary}`}>Withdrawals</p>
                            <p className="text-[10px] text-gray-500">Status updates.</p>
                          </div>
                        </div>
                        <ToggleSwitch 
                          checked={preferences.notifications?.withdrawals ?? true}
                          onChange={(val) => updatePreference('notifications', { ...preferences.notifications, withdrawals: val })}
                        />
                      </div>
                    </div>

                    {/* Rewards */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg"><Gift className="w-5 h-5 text-emerald-500" /></div>
                          <div>
                            <p className={`text-sm font-bold ${textPrimary}`}>Rewards</p>
                            <p className="text-[10px] text-gray-500">Updates on bonuses and referral rewards.</p>
                          </div>
                        </div>
                        <ToggleSwitch 
                          checked={preferences.notifications?.rewards ?? true}
                          onChange={(val) => updatePreference('notifications', { ...preferences.notifications, rewards: val })}
                        />
                      </div>
                    </div>

                    {/* System Updates */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg"><Cpu className="w-5 h-5 text-emerald-500" /></div>
                          <div>
                            <p className={`text-sm font-bold ${textPrimary}`}>System Updates</p>
                            <p className="text-[10px] text-gray-500">Maintenance and new features.</p>
                          </div>
                        </div>
                        <ToggleSwitch 
                          checked={preferences.notifications?.system ?? true}
                          onChange={(val) => updatePreference('notifications', { ...preferences.notifications, system: val })}
                        />
                      </div>
                    </div>

                    {/* Marketing */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg"><Megaphone className="w-5 h-5 text-emerald-500" /></div>
                          <div>
                            <p className={`text-sm font-bold ${textPrimary}`}>Marketing</p>
                            <p className="text-[10px] text-gray-500">Promotions and newsletters.</p>
                          </div>
                        </div>
                        <ToggleSwitch 
                          checked={preferences.notifications?.marketing ?? true}
                          onChange={(val) => updatePreference('notifications', { ...preferences.notifications, marketing: val })}
                        />
                      </div>
                    </div>

                  </div>
                  
                  <p className="text-center text-[10px] text-gray-500 pt-4">All changes are saved automatically.</p>
                </div>
              )}

              {/* Preferences Modal */}
              {activeModal === 'preferences' && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Display Currency</p>
                      <div className="grid grid-cols-4 gap-2">
                        {['USD', 'EUR', 'GBP', 'BTC'].map((curr) => (
                          <button 
                            key={curr} 
                            onClick={async () => {
                              updatePreference('currency', curr);
                            }}
                            className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              preferences.currency === curr 
                                ? 'bg-emerald-500 text-black' 
                                : (isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                            }`}
                          >
                            {curr}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Interface Language</p>
                      <div className="grid grid-cols-5 gap-2">
                        {['EN', 'ES', 'ZH', 'DE', 'FR'].map((lang) => (
                          <button 
                            key={lang} 
                            onClick={async () => {
                              updatePreference('language', lang);
                            }}
                            className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              preferences.language === lang 
                                ? 'bg-emerald-500 text-black' 
                                : (isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Remember Me Security</p>
                      <div className="flex justify-between items-center bg-black/5 px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-xs text-gray-400">Save login credentials locally</span>
                        <input 
                          type="checkbox" 
                          checked={preferences.rememberMeEnabled ?? false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            updatePreference('rememberMeEnabled', val);
                            if (addNotification) {
                              addNotification(
                                'security',
                                'low',
                                val ? 'Remember Me Enabled' : 'Remember Me Disabled',
                                val ? 'Your session will persist until you manually log out.' : 'You will be logged out when your session expires.'
                              );
                            }
                          }}
                          className="w-8 h-4 accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Biometrics Recognition</p>
                      <div className="flex justify-between items-center bg-black/5 px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-xs text-gray-400">Unlock with biometric sensors</span>
                        <input 
                          type="checkbox" 
                          checked={preferences.biometricsEnabled ?? false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            updatePreference('biometricsEnabled', val);
                            if (addNotification) {
                              addNotification(
                                'security',
                                'low',
                                val ? 'Biometric Login Enabled' : 'Biometric Login Disabled',
                                val ? 'You can now use Face ID/Touch ID to unlock.' : 'Biometric login has been deactivated.'
                              );
                            }
                          }}
                          className="w-8 h-4 accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}



      {/* Floating Application Success Toast */}
      <AnimatePresence>
        {profileToast?.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 left-6 z-50 max-w-sm w-full p-4 rounded-2xl shadow-2xl flex items-center space-x-3 border ${
              isDark 
                ? 'bg-[#0f172a] border-white/10 text-white shadow-emerald-500/5' 
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
            }`}
          >
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-500/10 text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-wider">System Update</p>
              <p className="text-xs font-medium mt-0.5 leading-snug">{profileToast.message}</p>
            </div>
            <button 
              onClick={() => setProfileToast(null)}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Animated Support Message Button - Only rendered on Profile page */}
      <button
        onClick={() => {
          if (onOpenSupportCenter) {
            onOpenSupportCenter();
          }
        }}
        className="floating-message-btn"
        title="Open Support Center & Live Chat"
      >
        <MessageSquare className="w-5 h-5 text-[#00e599]" />
      </button>

      {/* Interactive Crop Modal Removed */}
    </div>
  );
}
