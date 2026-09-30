import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ShieldCheck, CheckCircle2, Clock, Upload, Camera, FileText, 
  User, MapPin, Calendar, Globe, Phone, AlertCircle, Check, X, ChevronRight, Edit3, XCircle,
  ScanFace, BookOpen, CreditCard, Car, RefreshCw
} from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, onSnapshot, limit, arrayUnion } from 'firebase/firestore';
import { db, safeSetDoc } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import PRESTIGIOUS_COUNTRIES from '../data/prestigiousCountries';

interface KycVerificationPageProps {
  theme: 'light' | 'dark';
  onBack: () => void;
  onComplete: () => void;
}

const downscaleImage = (dataUrl: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

// Robust timestamp extractor for any KYC submission record
export function getKycTimestamp(sub: any): number {
  if (!sub) return 0;
  const timeVal = sub.submittedAt || sub.createdAt || sub.timestamp || sub.reviewedAt;
  if (typeof timeVal === 'number' && !isNaN(timeVal)) return timeVal;
  if (typeof timeVal === 'string') {
    const parsed = new Date(timeVal).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (sub.id && typeof sub.id === 'string') {
    const parts = sub.id.split('_');
    const num = Number(parts[parts.length - 1]);
    if (!isNaN(num) && num > 1000000000) return num;
  }
  return 0;
}

// Consolidates all candidate KYC records across memory, user profile, kycHistory, localStorage, and Firestore
export function resolveUserSubmissions(user: any, extraDocs?: any[]): any[] {
  const map = new Map<string, any>();

  // 1. Load from user.kycData (the active submission on active user profile)
  if (user?.kycData && typeof user.kycData === 'object' && Object.keys(user.kycData).length > 0) {
    const kData = user.kycData;
    const id = kData.id || `kyc_${user?.uid || 'user'}_active`;
    const resolvedStatus = (user?.kycStatus && user.kycStatus !== 'unverified') ? user.kycStatus : (kData.status || 'pending');
    map.set(id, { 
      ...kData, 
      id, 
      status: resolvedStatus, 
      rejectionReason: user?.kycRejectionReason || kData.rejectionReason || null,
      userId: user?.uid || kData.userId 
    });
  }

  // 2. Load from user.kycHistory (array of past and current submissions on user profile)
  if (Array.isArray(user?.kycHistory)) {
    user.kycHistory.forEach((h: any, idx: number) => {
      if (h && typeof h === 'object') {
        const id = h.id || `hist_${user?.uid || 'user'}_${idx}_${getKycTimestamp(h)}`;
        if (!map.has(id)) {
          map.set(id, { ...h, id, userId: user?.uid || h.userId });
        }
      }
    });
  }

  // 3. Load from user_profile_${uid} cached profile in localStorage
  if (user?.uid) {
    try {
      const cached = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
      if (cached.kycStatus !== 'unverified') {
        if (cached.kycData && typeof cached.kycData === 'object') {
          const id = cached.kycData.id || `cached_${user.uid}`;
          if (!map.has(id)) {
            map.set(id, { ...cached.kycData, id, userId: user.uid });
          }
        }
        if (Array.isArray(cached.kycHistory)) {
          cached.kycHistory.forEach((h: any, idx: number) => {
            if (h && typeof h === 'object') {
              const id = h.id || `cached_hist_${idx}`;
              if (!map.has(id)) {
                map.set(id, { ...h, id, userId: user.uid });
              }
            }
          });
        }
      }
    } catch (e) {}
  }

  // 4. Load from aver_admin_kyc_local in localStorage
  try {
    const locals = JSON.parse(localStorage.getItem('aver_admin_kyc_local') || '[]');
    if (Array.isArray(locals)) {
      locals.forEach((item: any) => {
        if (item && typeof item === 'object') {
          const isUserMatch = !user?.uid || item.userId === user.uid || item.userId === 'guest_user';
          const isEmailMatch = user?.email && item.email && item.email.toLowerCase() === user.email.toLowerCase();
          if (isUserMatch || isEmailMatch) {
            const id = item.id || `local_${getKycTimestamp(item)}`;
            if (!map.has(id)) {
              map.set(id, { ...item, id, userId: user?.uid || item.userId });
            }
          }
        }
      });
    }
  } catch (e) {}

  // 5. Load from extraDocs (e.g. from Firestore admin_kyc snapshot)
  if (Array.isArray(extraDocs)) {
    extraDocs.forEach((d: any) => {
      const raw = typeof d.data === 'function' ? d.data() : d;
      if (raw && typeof raw === 'object') {
        const id = d.id || raw.id || `firestore_${getKycTimestamp(raw)}`;
        map.set(id, { ...raw, id, userId: user?.uid || raw.userId });
      }
    });
  }

  const list = Array.from(map.values());
  // Sort strictly by timestamp descending: newest submission is index 0
  list.sort((a, b) => getKycTimestamp(b) - getKycTimestamp(a));
  return list;
}

export default function KycVerificationPage({ theme, onBack, onComplete }: KycVerificationPageProps) {
  const isDark = theme === 'dark';
  const { user, updateProfile } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);

  // Synchronous resolution of the newest submission from all available sources
  const [latestSubmission, setLatestSubmission] = useState<any>(() => {
    // Try to get cached status from localStorage first to avoid flash of Step 1
    const cachedProfile = JSON.parse(user?.uid ? (localStorage.getItem(`user_profile_${user.uid}`) || '{}') : '{}');
    const initialList = resolveUserSubmissions(user || cachedProfile);
    // CRITICAL: Ensure we keep pending status if it exists in local storage even if Firestore user isn't synced
    const localPending = initialList.find(s => s.status === 'pending');
    return localPending || (initialList.length > 0 ? initialList[0] : null);
  });
  const [loadingSubmission, setLoadingSubmission] = useState(false);

  // Derive effective status to avoid Step 1 flicker during reload and preserve pending status across sessions
  const effectiveStatus = useMemo(() => {
    // 1. Check latestSubmission status first as it's the most specific and includes recent local submissions
    if (latestSubmission && latestSubmission.status && latestSubmission.status !== 'unverified') {
      return latestSubmission.status;
    }

    // 2. Check user.kycStatus (instant from auth/profile)
    if (user?.kycStatus && user.kycStatus !== 'unverified') return user.kycStatus;
    
    // 3. Check cached profile if Firestore user is still loading or doesn't have status
    try {
      const cached = JSON.parse(user?.uid ? (localStorage.getItem(`user_profile_${user.uid}`) || '{}') : '{}');
      if (cached.kycStatus && cached.kycStatus !== 'unverified') return cached.kycStatus;
      if (cached.kycData?.status && cached.kycData.status !== 'unverified') return cached.kycData.status;
    } catch (e) {}

    // 4. Check aver_admin_kyc_local in localStorage
    try {
      const locals = JSON.parse(localStorage.getItem('aver_admin_kyc_local') || '[]');
      if (Array.isArray(locals) && locals.length > 0) {
        const userLocal = locals.find((item: any) => !user?.uid || item.userId === user.uid || item.userId === 'guest_user' || (user?.email && item.email && item.email.toLowerCase() === user.email.toLowerCase()));
        if (userLocal?.status && userLocal.status !== 'unverified') return userLocal.status;
      }
    } catch (e) {}

    if (submittedSuccess) return 'pending';
    
    // Fallback: If we have ANY submission record that isn't 'unverified', use its status
    const allSubs = resolveUserSubmissions(user);
    const newestSub = allSubs[0];
    if (newestSub && newestSub.status && newestSub.status !== 'unverified') {
      return newestSub.status;
    }

    return 'unverified';
  }, [user?.kycStatus, submittedSuccess, user?.uid, user?.email, latestSubmission]);

  useEffect(() => {
    // If status is verified, show it briefly then complete
    if (effectiveStatus === 'verified' && !submittedSuccess) {
      const timer = setTimeout(() => {
        onComplete();
      }, 4000); // 4 seconds of "brief moment"
      return () => clearTimeout(timer);
    }
  }, [effectiveStatus, submittedSuccess, onComplete]);

  useEffect(() => {
    // Real-time listener for local storage and window submission events
    const handleSync = (e?: any) => {
      // If a specific kyc status change was broadcast
      if (e?.type === 'aver_kyc_status_changed' && e.detail) {
        const detail = e.detail;
        const isMatch = !user?.uid || detail.userId === user.uid || (user?.email && detail.email?.toLowerCase() === user.email.toLowerCase());
        if (isMatch) {
          setLatestSubmission((prev: any) => ({
            ...(prev || {}),
            status: detail.status,
            rejectionReason: detail.reason,
            reviewedAt: new Date().toISOString()
          }));
        }
      }

      const updatedList = resolveUserSubmissions(user);
      if (updatedList.length > 0) {
        setLatestSubmission(updatedList[0]);
      } else if (user?.kycStatus === 'unverified') {
        setLatestSubmission(null);
      }
    };

    // Initial sync
    handleSync();

    window.addEventListener('storage', handleSync);
    window.addEventListener('aver_kyc_submitted', handleSync);
    window.addEventListener('aver_user_updated', handleSync);
    window.addEventListener('aver_kyc_status_changed', handleSync);

    // Real-time listener for admin_kyc collection
    let unsub: (() => void) | null = null;
    if (user?.uid) {
      const q = query(
        collection(db, 'admin_kyc'),
        where('userId', '==', user.uid)
      );

      unsub = onSnapshot(q, (snap) => {
        const firestoreDocs = snap.empty ? [] : snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const updatedList = resolveUserSubmissions(user, firestoreDocs);
        if (updatedList.length > 0) {
          setLatestSubmission(updatedList[0]);
        }
      }, (err) => {
        console.warn("[KYC] Failed to listen to admin_kyc:", err);
        const fallbackList = resolveUserSubmissions(user);
        if (fallbackList.length > 0) {
          setLatestSubmission(fallbackList[0]);
        }
      });
    }

    return () => {
      if (unsub) unsub();
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('aver_kyc_submitted', handleSync);
      window.removeEventListener('aver_user_updated', handleSync);
      window.removeEventListener('aver_kyc_status_changed', handleSync);
    };
  }, [user?.uid, user?.email, user?.kycStatus, user?.kycData, user?.kycHistory]);

  // Form Data
  const [formData, setFormData] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    dob: '',
    nationality: 'United States',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    idType: 'Passport', // 'Passport' | 'National ID' | "Driver's License"
    frontIdUrl: '',
    frontIdOriginalUrl: '',
    backIdUrl: '',
    backIdOriginalUrl: '',
    selfieUrl: '',
    selfieOriginalUrl: ''
  });

  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'frontIdUrl' | 'backIdUrl' | 'selfieUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        const compressed = await downscaleImage(result, 800, 800, 0.7);
        const originalField = field === 'frontIdUrl' ? 'frontIdOriginalUrl' : field === 'backIdUrl' ? 'backIdOriginalUrl' : 'selfieOriginalUrl';
        setFormData(prev => ({ 
          ...prev, 
          [field]: compressed,
          [originalField]: compressed
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep = () => {
    setError('');
    if (step === 2) {
      if (!formData.firstName || !formData.lastName || !formData.dob || !formData.address || !formData.city) {
        setError('Please fill in all required personal information fields.');
        return;
      }
    } else if (step === 4) {
      if (!formData.frontIdUrl) {
        setError('Please upload the front of your ID document.');
        return;
      }
    } else if (step === 5) {
      if (!formData.selfieUrl) {
        setError('Please take or upload a clear selfie verification photo.');
        return;
      }
    }
    setStep(prev => Math.min(prev + 1, 7));
  };

  const handlePrevStep = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmitKYC = async () => {
    console.log("[KYC TRACE 1] Submit button clicked. Entering handleSubmitKYC...");
    try {
      setSubmitting(true);
      setError('');

      const submissionId = `kyc_${user?.uid || 'guest'}_${Date.now()}`;
      const nowIso = new Date().toISOString();
      console.log("[KYC TRACE 2] Generated submission ID:", submissionId);

      console.log("[KYC TRACE 2.1] Compressing image uploads to safe payload size (<60KB per image)...");
      const compressedFront = await downscaleImage(formData.frontIdUrl, 600, 600, 0.5);
      const compressedBack = formData.backIdUrl ? await downscaleImage(formData.backIdUrl, 600, 600, 0.5) : '';
      const compressedSelfie = await downscaleImage(formData.selfieUrl, 600, 600, 0.5);

      const submissionPayload = {
        id: submissionId,
        userId: user?.uid || 'guest_user',
        name: `${formData.firstName} ${formData.lastName}`.trim() || user?.name || 'Verified User',
        email: user?.email || 'user@aver.platform',
        profilePhoto: compressedSelfie, // use compressed selfie as profile photo to save space
        tier: 'Tier 1',
        idType: formData.idType,
        personalInfo: {
          dob: formData.dob,
          nationality: formData.nationality,
          phone: formData.phone
        },
        address: {
          street: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode
        },
        // CRITICAL: Remove duplicates to stay under 1MB Firestore limit
        frontIdUrl: compressedFront,
        backIdUrl: compressedBack,
        selfieUrl: compressedSelfie,
        status: 'pending',
        submittedAt: nowIso,
        createdAt: nowIso
      };

      console.log("[KYC TRACE 3] Constructed payload successfully.");

      // Set newest submission immediately in local React state so Pending view is instant & guaranteed
      setLatestSubmission(submissionPayload);

      // 1. Save to admin_kyc collection for real-time admin review
      console.log("[KYC TRACE 4] Writing to admin_kyc document:", submissionId);
      await safeSetDoc(doc(db, 'admin_kyc', submissionId), submissionPayload);
      console.log("[KYC TRACE 4 COMPLETED] admin_kyc document written.");

      // 2. Local storage fallback so Admin and User can see it across all views/sessions
      console.log("[KYC TRACE 5] Updating local storage fallback...");
      try {
        const locals = JSON.parse(localStorage.getItem('aver_admin_kyc_local') || '[]');
        const filtered = Array.isArray(locals) ? locals.filter((item: any) => item.id !== submissionId) : [];
        filtered.unshift(submissionPayload);
        try {
          localStorage.setItem('aver_admin_kyc_local', JSON.stringify(filtered));
        } catch (storageErr) {
          const trimmed = filtered.slice(0, 10);
          localStorage.setItem('aver_admin_kyc_local', JSON.stringify(trimmed));
        }
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('aver_kyc_submitted', { detail: submissionPayload }));
        console.log("[KYC TRACE 5 COMPLETED] Local storage aver_admin_kyc_local updated.");
      } catch (e) {
        console.warn("[KYC TRACE 5 NOTICE] Local storage sync notice:", e);
      }

      // 3. Update user document with kycStatus, full kycData and append to kycHistory
      if (user?.uid) {
        console.log("[KYC TRACE 6] Updating user document in users collection...");
        
        // 3.1 Update AuthContext state immediately for instant UI feedback
        await updateProfile({
          kycStatus: 'pending',
          kycData: submissionPayload,
          kycHistory: [submissionPayload, ...(user.kycHistory || [])]
        }, undefined, undefined, true);

        // 3.2 Update Firestore user document
        await safeSetDoc(doc(db, 'users', user.uid), {
          kycStatus: 'pending',
          kycSubmittedAt: nowIso,
          kycData: submissionPayload,
          kycHistory: arrayUnion(submissionPayload),
          lastUpdated: serverTimestamp()
        }, { merge: true });
        console.log("[KYC TRACE 6 COMPLETED] User document updated.");

        // Update cached profile in localStorage
        try {
          const uKey = `user_profile_${user.uid}`;
          const cachedUser = JSON.parse(localStorage.getItem(uKey) || '{}');
          const existingHistory = Array.isArray(cachedUser.kycHistory) ? cachedUser.kycHistory : [];
          const updatedUser = {
            ...cachedUser,
            kycStatus: 'pending',
            kycData: submissionPayload,
            kycHistory: [submissionPayload, ...existingHistory.filter((h: any) => h.id !== submissionId)]
          };
          localStorage.setItem(uKey, JSON.stringify(updatedUser));
          if (user?.uid) {
            localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(updatedUser));
          }
          window.dispatchEvent(new Event('aver_user_updated'));
          console.log("[KYC TRACE 6.1 COMPLETED] Local user profile updated.");
        } catch (e) {}
      }

      console.log("[KYC TRACE 7] Setting step=7 and submittedSuccess=true...");
      setSubmittedSuccess(true);
      setStep(7);
      console.log("[KYC TRACE 8] Submission flow completed successfully.");
    } catch (err: any) {
      console.error("[KYC TRACE EXCEPTION] Exception caught during submission:", err);
      setError(err?.message || 'Failed to submit KYC. Please try again.');
    } finally {
      console.log("[KYC TRACE FINALLY] Clearing submitting state (setSubmitting(false)).");
      setSubmitting(false);
    }
  };

  const handleRestartVerification = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      const active = latestSubmission || (resolveUserSubmissions(user)[0]) || null;
      // Pre-fill personal info from active submission if available, but ALWAYS clear image documents for fresh upload
      if (active) {
        setFormData({
          firstName: active.name?.split(' ')[0] || user?.name?.split(' ')[0] || '',
          lastName: active.name?.split(' ').slice(1).join(' ') || user?.name?.split(' ').slice(1).join(' ') || '',
          dob: active.personalInfo?.dob || '',
          nationality: active.personalInfo?.nationality || 'United States',
          phone: active.personalInfo?.phone || '',
          address: active.address?.street || '',
          city: active.address?.city || '',
          state: active.address?.state || '',
          postalCode: active.address?.postalCode || '',
          idType: active.idType || 'Passport',
          frontIdUrl: '',
          frontIdOriginalUrl: '',
          backIdUrl: '',
          backIdOriginalUrl: '',
          selfieUrl: '',
          selfieOriginalUrl: ''
        });
      } else {
        setFormData(prev => ({
          ...prev,
          frontIdUrl: '',
          frontIdOriginalUrl: '',
          backIdUrl: '',
          backIdOriginalUrl: '',
          selfieUrl: '',
          selfieOriginalUrl: ''
        }));
      }

      // 1. Clear component states immediately so effectiveStatus turns 'unverified'
      setLatestSubmission(null);
      setSubmittedSuccess(false);

      // 2. Clear localStorage caches
      if (user?.uid) {
        try {
          // Also update the scoped user profile if it's the current user
          const profKey = `user_profile_${user.uid}`;
          const cached = JSON.parse(localStorage.getItem(profKey) || '{}');
          if (cached && cached.uid === user.uid) {
            delete cached.kycData;
            cached.kycStatus = 'unverified';
            delete cached.kycRejectionReason;
            delete cached.kycResubmissionReason;
            localStorage.setItem(profKey, JSON.stringify(cached));
          }

          // Remove or archive this user's active submission from aver_admin_kyc_local
          const locals = JSON.parse(localStorage.getItem('aver_admin_kyc_local') || '[]');
          if (Array.isArray(locals)) {
            const updatedLocals = locals.filter((k: any) => k.userId !== user.uid && (!user.email || k.email?.toLowerCase() !== user.email.toLowerCase()));
            localStorage.setItem('aver_admin_kyc_local', JSON.stringify(updatedLocals));
          }
        } catch (e) {}

        // 3. Update AuthContext profile
        await updateProfile({
          kycStatus: 'unverified',
          kycData: null,
          kycRejectionReason: null,
          kycResubmissionReason: null
        }, undefined, undefined, true);

        // 4. Update Firestore user doc explicitly
        await safeSetDoc(doc(db, 'users', user.uid), {
          kycStatus: 'unverified',
          kycData: null,
          kycRejectionReason: null,
          kycResubmissionReason: null,
          lastUpdated: serverTimestamp()
        }, { merge: true });
      }

      // 5. Broadcast update events
      window.dispatchEvent(new Event('aver_user_updated'));
      window.dispatchEvent(new Event('aver_kyc_submitted'));
      window.dispatchEvent(new Event('storage'));

      setStep(1);
    } catch (err: any) {
      console.error("Failed to restart KYC:", err);
      setError(err.message || "Failed to reset verification. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Active submission strictly prioritizes the newest resolved submission record
  const activeSubmission = latestSubmission || (resolveUserSubmissions(user)[0]) || null;

  const displayData = activeSubmission ? {
    firstName: activeSubmission.name?.split(' ')[0] || user?.name?.split(' ')[0] || '',
    lastName: activeSubmission.name?.split(' ').slice(1).join(' ') || user?.name?.split(' ').slice(1).join(' ') || '',
    dob: activeSubmission.personalInfo?.dob || '',
    nationality: activeSubmission.personalInfo?.nationality || 'United States',
    phone: activeSubmission.personalInfo?.phone || '',
    address: activeSubmission.address?.street || '',
    city: activeSubmission.address?.city || '',
    state: activeSubmission.address?.state || '',
    postalCode: activeSubmission.address?.postalCode || '',
    idType: activeSubmission.idType || 'Passport',
    frontIdUrl: activeSubmission.frontIdUrl || activeSubmission.frontIdOriginalUrl || activeSubmission.documents?.[0] || '',
    backIdUrl: activeSubmission.backIdUrl || activeSubmission.backIdOriginalUrl || activeSubmission.documents?.[1] || '',
    selfieUrl: activeSubmission.selfieUrl || activeSubmission.selfieOriginalUrl || activeSubmission.documents?.[2] || '',
    status: activeSubmission.status || user?.kycStatus || 'pending',
    rejectionReason: activeSubmission.rejectionReason || ''
  } : {
    firstName: formData.firstName || user?.name?.split(' ')[0] || '',
    lastName: formData.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
    dob: formData.dob || '',
    nationality: formData.nationality || 'United States',
    phone: formData.phone || '',
    address: formData.address || '',
    city: formData.city || '',
    state: formData.state || '',
    postalCode: formData.postalCode || '',
    idType: formData.idType || 'Passport',
    frontIdUrl: formData.frontIdUrl || formData.frontIdOriginalUrl || '',
    backIdUrl: formData.backIdUrl || formData.backIdOriginalUrl || '',
    selfieUrl: formData.selfieUrl || formData.selfieOriginalUrl || '',
    status: user?.kycStatus || 'pending',
    rejectionReason: ''
  };

  if (!user && (typeof window !== 'undefined' && !localStorage.getItem('aver_last_active_uid'))) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Verification Status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-black text-slate-100' : 'bg-slate-50 text-slate-950'}`}>
      {/* Full-Screen Header */}
      <header className={`px-6 py-4 border-b flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl ${
        isDark ? 'bg-black/80 border-white/10' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className={`p-2.5 rounded-2xl border transition-all ${
              isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight">Identity Verification</h1>
          </div>
        </div>

        {/* Step Progress Bar Header */}
        {!['pending', 'verified', 'rejected', 'requires_resubmission'].includes(effectiveStatus || '') && (
          <div className="hidden md:flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div 
                key={s} 
                className={`h-2 rounded-full transition-all ${
                  step === s ? 'w-8 bg-emerald-500' : step > s ? 'w-3 bg-emerald-500/50' : 'w-3 bg-slate-600/30'
                }`}
              />
            ))}
            <span className="text-xs font-bold text-slate-400 ml-2">Step {step} of 7</span>
          </div>
        )}
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-10 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {['pending', 'verified', 'rejected', 'requires_resubmission'].includes(effectiveStatus || '') && !submittedSuccess ? (
            <motion.div 
              key="kyc-status-dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Status Banner */}
              {effectiveStatus === 'pending' && (
                <div className={`p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 text-amber-500 flex flex-col md:flex-row items-start md:items-center gap-4`}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 border border-amber-500/20 animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black tracking-tight">Verification Pending</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Your identity verification application is currently under review by our compliance desk. 
                      This standard audit is completed within 24–48 hours. No action is required.
                    </p>
                  </div>
                </div>
              )}

              {effectiveStatus === 'verified' && (
                <div className={`p-8 rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/5 text-emerald-500 flex flex-col items-center text-center gap-6 shadow-2xl shadow-emerald-500/10`}>
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30 animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black tracking-tight">Verification Approved!</h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} max-w-sm mx-auto leading-relaxed`}>
                      Your identity has been verified successfully. Your high-limit access and premium features are now active.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500/60">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Redirecting to Bonus Center...
                  </div>
                </div>
              )}

              {effectiveStatus === 'rejected' && (
                <div className={`p-6 rounded-3xl border border-rose-500/20 bg-rose-500/5 text-rose-500 flex flex-col md:flex-row items-start md:items-center gap-4`}>
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 border border-rose-500/20">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-lg font-black tracking-tight">Verification Rejected</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-2`}>
                      Your identity verification application was rejected by our compliance team. 
                      Please correct the issues and submit a new application.
                    </p>
                    {displayData.rejectionReason && (
                      <div className="p-3 rounded-xl bg-rose-500/10 text-xs font-bold border border-rose-500/20">
                        Reason: {displayData.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {effectiveStatus === 'requires_resubmission' && (
                <div className={`p-6 rounded-3xl border border-blue-500/20 bg-blue-500/5 text-blue-400 flex flex-col md:flex-row items-start md:items-center gap-4`}>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-lg font-black tracking-tight">Resubmission Requested</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-2`}>
                      Our compliance desk requires you to re-upload your document or correct your information.
                    </p>
                    {displayData.rejectionReason && (
                      <div className="p-3 rounded-xl bg-blue-500/10 text-xs font-bold border border-blue-500/20 text-blue-300">
                        Compliance Note: {displayData.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submitted Information Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase">Submitted Information</h3>
                
                {/* Details Grid */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-3xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Full Legal Name</span>
                      <span className="text-sm font-black mt-0.5">{displayData.firstName} {displayData.lastName}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Date of Birth</span>
                      <span className="text-sm font-semibold mt-0.5">{displayData.dob || '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Nationality</span>
                      <span className="text-sm font-semibold mt-0.5">{displayData.nationality}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Phone Number</span>
                      <span className="text-sm font-semibold mt-0.5">{displayData.phone || '—'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Selected ID Type</span>
                      <span className="text-sm font-black text-emerald-400 mt-0.5">{displayData.idType || '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Residential Address</span>
                      <span className="text-sm font-semibold mt-0.5">{displayData.address || '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">City / State / Zip</span>
                      <span className="text-sm font-semibold mt-0.5">
                        {displayData.city ? `${displayData.city}, ${displayData.state || ''} ${displayData.postalCode || ''}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submitted Images */}
              <div className="space-y-4">
                <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase">Uploaded Documentation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-3xl border flex flex-col items-center justify-center text-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Front ID</span>
                    <div className="w-full h-32 rounded-2xl overflow-hidden border border-white/10 relative bg-black/40">
                      {displayData.frontIdUrl ? (
                        <img src={displayData.frontIdUrl} alt="Front ID" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Not Uploaded</div>
                      )}
                    </div>
                  </div>

                  <div className={`p-4 rounded-3xl border flex flex-col items-center justify-center text-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Back ID</span>
                    <div className="w-full h-32 rounded-2xl overflow-hidden border border-white/10 relative bg-black/40">
                      {displayData.backIdUrl ? (
                        <img src={displayData.backIdUrl} alt="Back ID" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 bg-white/5">No Back ID Required / Provided</div>
                      )}
                    </div>
                  </div>

                  <div className={`p-4 rounded-3xl border flex flex-col items-center justify-center text-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Selfie Photo</span>
                    <div className="w-full h-32 rounded-2xl overflow-hidden border border-white/10 relative bg-black/40">
                      {displayData.selfieUrl ? (
                        <img src={displayData.selfieUrl} alt="Selfie" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Not Uploaded</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
                {['rejected', 'requires_resubmission'].includes(effectiveStatus || '') && (
                  <button 
                    id="resubmit-kyc-btn"
                    onClick={handleRestartVerification}
                    disabled={submitting}
                    className="w-full md:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/10 flex-1 text-center"
                  >
                    {submitting ? 'Resetting...' : 'Resubmit & Restart Verification'}
                  </button>
                )}

                {effectiveStatus === 'pending' && (
                  <button 
                    id="restart-pending-kyc-btn"
                    onClick={handleRestartVerification}
                    disabled={submitting}
                    className="w-full md:w-auto px-6 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 font-bold text-sm transition-all flex-1 text-center"
                  >
                    {submitting ? 'Resetting...' : 'Cancel & Submit New Application'}
                  </button>
                )}

                <button 
                  id="refresh-kyc-status-btn"
                  onClick={() => {
                    const list = resolveUserSubmissions(user);
                    if (list.length > 0) setLatestSubmission(list[0]);
                    window.dispatchEvent(new Event('aver_user_updated'));
                  }}
                  className="w-full md:w-auto px-6 py-4 rounded-2xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-bold text-sm text-center flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Status
                </button>

                <button 
                  id="close-kyc-status-btn"
                  onClick={onBack}
                  className={`w-full md:w-auto px-8 py-4 rounded-2xl border font-bold text-sm text-center ${
                    ['rejected', 'requires_resubmission', 'pending'].includes(effectiveStatus || '') 
                      ? 'border-slate-300 hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-300 md:flex-initial'
                      : 'bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 flex-1'
                  }`}
                >
                  {['rejected', 'requires_resubmission'].includes(effectiveStatus || '') ? 'Close' : effectiveStatus === 'pending' ? 'Back to App' : 'Return to Bonus Center'}
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* STEP 1: WELCOME */}
              {(!effectiveStatus || effectiveStatus === 'unverified') && step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-3 text-center md:text-left">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto md:mx-0 font-black mb-4 border border-emerald-500/20">
                  <ScanFace className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">Verify Your Identity</h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Complete identity verification to activate your account, increase transaction limits, and unlock premium platform features.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-emerald-400">
                    <Clock className="w-4 h-4" />
                    <span>Review Process</span>
                  </h4>
                  <p className="text-xs text-slate-400">Verification requests are typically reviewed within 24–48 hours. You'll receive a notification once your application has been reviewed and a decision has been made.</p>
                </div>
                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Privacy & Data Protection</span>
                  </h4>
                  <p className="text-xs text-slate-400">Your personal information is encrypted, handled securely, and reviewed only by authorised compliance specialists for identity verification and regulatory compliance.</p>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-100 border-slate-200'} space-y-4`}>
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Accepted Identity Documents</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { name: 'Passport', icon: BookOpen, desc: 'International travel document' },
                    { name: 'National ID', icon: CreditCard, desc: 'Government issued card' },
                    { name: "Driver's License", icon: Car, desc: 'Valid driving permit' }
                  ].map((docItem) => {
                    const IconComponent = docItem.icon;
                    return (
                      <motion.div 
                        key={docItem.name} 
                        whileHover={{ y: -3, scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className={`p-5 rounded-2xl border flex flex-col items-center text-center gap-3 ${
                          isDark ? 'bg-white/5 border-white/10 hover:border-emerald-500/40' : 'bg-white border-slate-200 hover:border-emerald-500/40 shadow-sm'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-black text-sm">{docItem.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{docItem.desc}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowConsentModal(true)}
                  className="px-8 py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
                >
                  <span>Start Verification</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Consent Dialog Modal */}
              <AnimatePresence>
                {showConsentModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className={`max-w-md w-full p-6 md:p-8 rounded-3xl border shadow-2xl space-y-6 ${
                        isDark ? 'bg-slate-900 border-white/15 text-slate-100' : 'bg-white border-slate-200 text-slate-950'
                      }`}
                    >
                      <div className="space-y-2">
                        <h3 className="text-xl font-black tracking-tight">Consent to Identity Verification</h3>
                        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          To comply with regulatory requirements, we'll collect and process your identity documents to verify your account. Your information will be handled securely and used only for identity verification and compliance purposes.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => setShowConsentModal(false)}
                          className={`flex-1 py-3.5 px-4 rounded-2xl border font-bold text-xs transition-all ${
                            isDark ? 'border-white/15 hover:bg-white/5 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setConsentTimestamp(new Date().toISOString());
                            setShowConsentModal(false);
                            setStep(2);
                          }}
                          className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
                        >
                          Continue
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STEP 2: PERSONAL INFORMATION */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-black tracking-tight mb-1">Personal Information</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Enter your legal identity details as shown on your official document.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">First Name *</label>
                  <input 
                    type="text" 
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    placeholder="e.g. Alexander"
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-white'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Last Name *</label>
                  <input 
                    type="text" 
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    placeholder="e.g. Hamilton"
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-white'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 max-w-[280px]">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Date of Birth *</label>
                  <input 
                    type="date" 
                    value={formData.dob}
                    onChange={e => setFormData({...formData, dob: e.target.value})}
                    className={`w-full p-3.5 rounded-2xl border text-sm font-semibold bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-white'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nationality *</label>
                  <select 
                    value={formData.nationality}
                    onChange={e => setFormData({...formData, nationality: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent appearance-none cursor-pointer ${isDark ? 'border-white/10 bg-[#0E131F]' : 'border-slate-300 bg-white'}`}
                  >
                    {PRESTIGIOUS_COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="+1 (555) 019-2834"
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-white'}`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Residential Address *</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Wall Street, Suite 400"
                  className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-white'}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">City *</label>
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="New York"
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-white'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">State / Province</label>
                  <input 
                    type="text" 
                    value={formData.state}
                    onChange={e => setFormData({...formData, state: e.target.value})}
                    placeholder="NY"
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-white'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Postal Code</label>
                  <input 
                    type="text" 
                    value={formData.postalCode}
                    onChange={e => setFormData({...formData, postalCode: e.target.value})}
                    placeholder="10005"
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-white'}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button 
                  onClick={handlePrevStep}
                  className={`px-6 py-3.5 rounded-2xl border font-bold text-xs ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-100'}`}
                >
                  ← Back
                </button>
                <button 
                  onClick={handleNextStep}
                  className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SELECT ID TYPE */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-black tracking-tight mb-1">Select Identity Document</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Choose the type of government-issued document you wish to upload.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'Passport', title: 'Passport', desc: 'Global travel document' },
                  { id: 'National ID', title: 'National ID Card', desc: 'Government issued card' },
                  { id: "Driver's License", title: "Driver's License", desc: 'State or federal license' }
                ].map(item => {
                  const isSelected = formData.idType === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setFormData({...formData, idType: item.id})}
                      className={`p-6 rounded-[2rem] border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-400' 
                          : isDark ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <FileText className={`w-8 h-8 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-black' : 'border-slate-500'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-base mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button 
                  onClick={handlePrevStep}
                  className={`px-6 py-3.5 rounded-2xl border font-bold text-xs ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-100'}`}
                >
                  ← Back
                </button>
                <button 
                  onClick={handleNextStep}
                  className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: UPLOAD DOCUMENTS */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-black tracking-tight mb-1">Upload Document Photos</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Upload clear, uncropped photos of the front and back of your {formData.idType}.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Front of {formData.idType} *</label>
                  <label className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all h-52 relative overflow-hidden ${
                    formData.frontIdUrl ? 'border-emerald-500/50 bg-emerald-500/5' : isDark ? 'border-white/10 hover:border-white/30 bg-white/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                  }`}>
                    {formData.frontIdUrl ? (
                      <img src={formData.frontIdUrl} alt="Front ID" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-emerald-400 mb-2" />
                        <span className="text-xs font-bold mb-1">Click to upload or drag & drop</span>
                        <span className="text-[10px] text-slate-400">PNG, JPG, or PDF (Max 10MB)</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'frontIdUrl')} className="hidden" />
                  </label>
                  {formData.frontIdUrl && (
                    <button onClick={() => setFormData({...formData, frontIdUrl: ''})} className="text-xs text-rose-400 font-bold hover:underline">Remove / Replace</button>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Back of {formData.idType} (Optional)</label>
                  <label className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all h-52 relative overflow-hidden ${
                    formData.backIdUrl ? 'border-emerald-500/50 bg-emerald-500/5' : isDark ? 'border-white/10 hover:border-white/30 bg-white/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                  }`}>
                    {formData.backIdUrl ? (
                      <img src={formData.backIdUrl} alt="Back ID" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-emerald-400 mb-2" />
                        <span className="text-xs font-bold mb-1">Click to upload or drag & drop</span>
                        <span className="text-[10px] text-slate-400">PNG, JPG, or PDF (Max 10MB)</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'backIdUrl')} className="hidden" />
                  </label>
                  {formData.backIdUrl && (
                    <button onClick={() => setFormData({...formData, backIdUrl: ''})} className="text-xs text-rose-400 font-bold hover:underline">Remove / Replace</button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button 
                  onClick={handlePrevStep}
                  className={`px-6 py-3.5 rounded-2xl border font-bold text-xs ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-100'}`}
                >
                  ← Back
                </button>
                <button 
                  onClick={handleNextStep}
                  className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: SELFIE VERIFICATION */}
          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-xl mx-auto text-center"
            >
              <div>
                <h2 className="text-2xl font-black tracking-tight mb-1">Selfie Verification</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Take a clear selfie to match against your identity document.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left p-4 rounded-2xl border bg-white/5 border-white/10 text-xs">
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /><span>Face clearly visible</span></div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /><span>Good lighting</span></div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /><span>No sunglasses</span></div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /><span>No face covering</span></div>
              </div>

              <div className="flex justify-center">
                <label className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all w-72 h-72 relative overflow-hidden ${
                  formData.selfieUrl ? 'border-emerald-500/50 bg-emerald-500/5' : isDark ? 'border-white/10 hover:border-white/30 bg-white/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}>
                  {formData.selfieUrl ? (
                    <img src={formData.selfieUrl} alt="Selfie" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-12 h-12 text-emerald-400 mb-3" />
                      <span className="text-xs font-bold mb-1">Take or Upload Selfie</span>
                      <span className="text-[10px] text-slate-400">Camera / Photo Library</span>
                    </>
                  )}
                  <input type="file" accept="image/*" capture="user" onChange={e => handleFileUpload(e, 'selfieUrl')} className="hidden" />
                </label>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button 
                  onClick={handlePrevStep}
                  className={`px-6 py-3.5 rounded-2xl border font-bold text-xs ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-100'}`}
                >
                  ← Back
                </button>
                <button 
                  onClick={handleNextStep}
                  className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: REVIEW */}
          {step === 6 && (
            <motion.div 
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10 pb-8"
            >
              <div className="mb-2">
                <h2 className="text-3xl font-black tracking-tight mb-2">Review & Submit</h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>Please review your information carefully. Ensure all details match your official documents before final submission.</p>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Information Summary */}
              <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-[#080B11]/50 border-white/[0.05]' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`px-6 py-4 border-b text-xs font-bold uppercase tracking-widest ${isDark ? 'border-white/[0.05] text-slate-500 bg-white/[0.02]' : 'border-slate-100 text-slate-400 bg-slate-50'}`}>
                  Applicant Details
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Legal Name</span>
                    <span className={`font-medium text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.firstName} {formData.lastName}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Date of Birth</span>
                    <span className={`font-medium text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.dob}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nationality</span>
                    <span className={`font-medium text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.nationality}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Residential Address</span>
                    <span className={`font-medium text-base leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.address}, {formData.city} {formData.state} {formData.postalCode}</span>
                  </div>
                </div>
              </div>

              {/* Document Previews */}
              <div className="space-y-4">
                <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Submitted Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div className={`p-4 rounded-3xl border flex flex-col space-y-3 ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center px-1">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formData.idType} (Front)</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="h-32 w-full rounded-2xl overflow-hidden bg-black/20 border border-white/5">
                      <img src={formData.frontIdUrl} alt="Front ID" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className={`p-4 rounded-3xl border flex flex-col space-y-3 ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center px-1">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formData.idType} (Back)</span>
                      {formData.backIdUrl ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
                    </div>
                    <div className="h-32 w-full rounded-2xl overflow-hidden bg-black/20 border border-white/5 flex items-center justify-center">
                      {formData.backIdUrl ? <img src={formData.backIdUrl} alt="Back ID" className="w-full h-full object-cover" /> : <span className="text-[11px] text-slate-500 font-medium">Not Required</span>}
                    </div>
                  </div>

                  <div className={`p-4 rounded-3xl border flex flex-col space-y-3 ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center px-1">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Facial Verification</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="h-32 w-full rounded-2xl overflow-hidden bg-black/20 border border-white/5">
                      <img src={formData.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/[0.05] gap-3">
                <button 
                  onClick={handlePrevStep}
                  className={`px-5 py-3 rounded-xl border font-bold text-xs transition-all ${isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-900'}`}
                >
                  Back to Edit
                </button>
                <button 
                  onClick={handleSubmitKYC}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-[#00D09C] text-slate-950 font-black text-xs hover:bg-[#00e6ad] transition-all shadow-lg shadow-[#00D09C]/20 flex items-center justify-center"
                >
                  <span>{submitting ? 'Submitting Application...' : 'Submit Application'}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 7: SUBMISSION COMPLETE */}
          {step === 7 && (
            <motion.div 
              key="step7"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center max-w-lg mx-auto py-8"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight">Verification Submitted</h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Your documents have been securely submitted to our compliance team for review.
                </p>
              </div>

              <div className={`p-6 rounded-3xl border space-y-3 text-left ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-bold uppercase">Status</span>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Pending Review
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-bold uppercase">Estimated Review Time</span>
                  <span className="font-black text-sm">24–48 hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-bold uppercase">Submitted ID</span>
                  <span className="font-black text-sm">{formData.idType}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSubmittedSuccess(false);
                  onComplete();
                }}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
              >
                Return to Bonus Center
              </button>
            </motion.div>
          )}
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
