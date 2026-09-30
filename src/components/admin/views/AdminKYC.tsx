import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ShieldCheck, CheckCircle2, XCircle, Clock, FileText, User, 
  AlertTriangle, Eye, Check, X, ArrowLeft, RefreshCcw, MapPin, Calendar, Globe, Phone, Download, Maximize2,
  ZoomIn, ZoomOut, RotateCcw, Filter, ChevronRight
} from 'lucide-react';
import { safeUpdateDoc, safeSetDoc } from '../../../lib/firebase';
import { collection, onSnapshot, doc, getDoc, serverTimestamp, query, where, getDocs, increment, arrayUnion, setDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';

interface KYC {
  id: string;
  userId: string;
  name: string;
  email: string;
  profilePhoto?: string;
  tier: string;
  idType: string;
  personalInfo?: {
    dob?: string;
    nationality?: string;
    phone?: string;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  frontIdUrl?: string;
  frontIdOriginalUrl?: string;
  backIdUrl?: string;
  backIdOriginalUrl?: string;
  selfieUrl?: string;
  selfieOriginalUrl?: string;
  documents: string[];
  status: 'pending' | 'verified' | 'rejected' | 'requires_resubmission';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByAdmin?: string;
}

export default function AdminKYC({ theme }: { theme: 'light' | 'dark' }) {
  const [submissions, setSubmissions] = useState<KYC[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'requires_resubmission'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<KYC | null>(null);
  
  // High-Resolution Image Inspector Modal State
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [actionModal, setActionModal] = useState<'reject' | 'resubmit' | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isDark = theme === 'dark';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const syncKyc = async (docs?: any[]) => {
      console.log("[AdminKYC DEBUG] Starting syncKyc...", { firestoreDocsCount: docs?.length || 0 });
      let dataMap = new Map<string, KYC>();

      // 1. Load from admin_kyc collection snapshot (Primary source for all submissions)
      if (docs) {
        docs.forEach(d => {
          const raw = typeof d.data === 'function' ? d.data() : d;
          const kycObj = { ...raw, id: d.id || raw.id } as KYC;
          if (kycObj.id) {
            dataMap.set(kycObj.id, kycObj);
          }
        });
      }

      // 2. Load from user documents (kycHistory array & kycData)
      try {
        const usersSnap = await getDocs(collection(db, 'users')).catch(() => null);
        if (usersSnap && !usersSnap.empty) {
          usersSnap.docs.forEach(uDoc => {
            const u = uDoc.data();
            // Check kycHistory array for all past submissions
            if (Array.isArray(u.kycHistory)) {
              u.kycHistory.forEach((h: any) => {
                const subId = h.id || `hist-${uDoc.id}-${h.submittedAt || Math.random()}`;
                if (!dataMap.has(subId)) {
                  dataMap.set(subId, {
                    id: subId,
                    userId: uDoc.id,
                    name: h.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email?.split('@')[0] || 'User',
                    email: u.email || h.email || '',
                    profilePhoto: h.profilePhoto || u.profilePhotoURL || h.selfieUrl,
                    tier: h.tier || 'Tier 1',
                    idType: h.idType || 'Passport',
                    personalInfo: h.personalInfo,
                    address: h.address,
                    documents: h.documents || [h.frontIdUrl, h.backIdUrl, h.selfieUrl].filter(Boolean),
                    frontIdUrl: h.frontIdUrl,
                    frontIdOriginalUrl: h.frontIdOriginalUrl || h.frontIdUrl,
                    backIdUrl: h.backIdUrl,
                    backIdOriginalUrl: h.backIdOriginalUrl || h.backIdUrl,
                    selfieUrl: h.selfieUrl,
                    selfieOriginalUrl: h.selfieOriginalUrl || h.selfieUrl,
                    status: h.status || 'pending',
                    rejectionReason: h.rejectionReason,
                    submittedAt: h.submittedAt || new Date().toISOString()
                  });
                }
              });
            }

            // Check single kycData or pending kycStatus if present and not in map
            if ((u.kycData && typeof u.kycData === 'object') || u.kycStatus === 'pending') {
              const kData = u.kycData || {};
              const subId = kData.id || `user-kyc-${uDoc.id}`;
              if (!dataMap.has(subId)) {
                dataMap.set(subId, {
                  ...kData,
                  id: subId,
                  userId: uDoc.id,
                  name: kData.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || u.email?.split('@')[0] || 'User',
                  email: u.email || kData.email || '',
                  profilePhoto: kData.profilePhoto || u.profilePhotoURL || kData.selfieUrl,
                  tier: kData.tier || 'Tier 1',
                  idType: kData.idType || 'Passport',
                  personalInfo: kData.personalInfo || { nationality: u.country || 'United States' },
                  address: kData.address || { country: u.country || 'United States' },
                  documents: kData.documents || [kData.frontIdUrl, kData.backIdUrl, kData.selfieUrl].filter(Boolean),
                  frontIdUrl: kData.frontIdUrl,
                  backIdUrl: kData.backIdUrl,
                  selfieUrl: kData.selfieUrl,
                  status: kData.status || u.kycStatus || 'pending',
                  rejectionReason: kData.rejectionReason || u.kycRejectionReason,
                  submittedAt: u.kycSubmittedAt || kData.submittedAt || new Date().toISOString()
                });
              }
            }
          });
        }
      } catch (e) {}

      // 3. Load from local storage
      try {
        const local = JSON.parse(localStorage.getItem('aver_admin_kyc_local') || '[]');
        if (Array.isArray(local)) {
          console.log("[AdminKYC DEBUG] Loaded local storage submissions:", local.length);
          local.forEach((k: KYC) => {
            if (k.id && !dataMap.has(k.id)) {
              dataMap.set(k.id, k);
            }
          });
        }
      } catch (e) {}

      let data = Array.from(dataMap.values());

      const getTimestamp = (sub: any): number => {
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
      };

      // Memory sort by submittedAt descending (Newest first)
      data.sort((a, b) => getTimestamp(b) - getTimestamp(a));

      console.log("[AdminKYC DEBUG] Total unique KYC submission cards to render:", data.length, data.map(s => ({ id: s.id, status: s.status, user: s.userId })));

      setSubmissions(data);
      setLoading(false);
    };

    const unsub = onSnapshot(collection(db, 'admin_kyc'), (snap) => {
      syncKyc(snap.docs);
    }, (err) => {
      console.error("Error loading KYC submissions:", err);
      syncKyc();
    });

    const handleStorage = () => syncKyc();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('aver_kyc_submitted', handleStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('aver_kyc_submitted', handleStorage);
    };
  }, []);

  // Image Inspector Controls
  const handleOpenInspector = (url: string, title: string) => {
    setPreviewImage({ url, title });
    setZoomScale(1);
    setPanPos({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => {
    setZoomScale(1);
    setPanPos({ x: 0, y: 0 });
  };

  const handleToggleDoubleClickZoom = () => {
    if (zoomScale > 1.2) {
      handleResetZoom();
    } else {
      setZoomScale(2.5);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomScale <= 1) return;
    setPanPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setZoomScale(prev => Math.min(prev + 0.25, 4));
    } else {
      setZoomScale(prev => Math.max(prev - 0.25, 1));
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      let blob: Blob;
      if (url.startsWith('data:')) {
        const parts = url.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        const response = await fetch(url);
        blob = await response.blob();
      }
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn("Blob download failed, opening in new tab:", e);
      window.open(url, '_blank');
    }
  };

  const handleAction = async (id: string, status: 'verified' | 'rejected' | 'requires_resubmission', reason = '') => {
    try {
      const submission = submissions.find(s => s.id === id);
      if (!submission) return;

      setSelectedSubmission(null);
      setActionModal(null);

      const reviewedTimestamp = new Date().toISOString();
      const adminEmail = auth.currentUser?.email || 'admin@aver.io';

      const updatePayload: any = { 
        status,
        reviewedAt: reviewedTimestamp,
        reviewedByAdmin: adminEmail,
        rejectionReason: reason || null
      };

      // 1. Update specific submission doc in admin_kyc using safeSetDoc with merge
      await safeSetDoc(doc(db, 'admin_kyc', id), updatePayload, { merge: true });
      if (submission.id && submission.id !== id) {
        await safeSetDoc(doc(db, 'admin_kyc', submission.id), updatePayload, { merge: true });
      }

      // Resolve user target
      let targetUserId = (submission.userId && submission.userId !== 'guest_user') ? submission.userId : null;
      const targetEmail = submission.email ? submission.email.trim().toLowerCase() : null;

      // If targetUserId is not found or is guest, attempt to find user by email
      if (!targetUserId && targetEmail) {
        try {
          const userQuery = query(collection(db, 'users'), where('email', '==', targetEmail));
          const userSnap = await getDocs(userQuery);
          if (!userSnap.empty) {
            targetUserId = userSnap.docs[0].id;
          }
        } catch (e) {
          console.warn("[AdminKYC] Could not query user by email:", e);
        }
      }

      // Update any other docs in admin_kyc matching targetUserId or targetEmail
      try {
        if (targetUserId) {
          const userKycQ = query(collection(db, 'admin_kyc'), where('userId', '==', targetUserId));
          const snap = await getDocs(userKycQ);
          for (const d of snap.docs) {
            await safeSetDoc(doc(db, 'admin_kyc', d.id), updatePayload, { merge: true });
          }
        }
        if (targetEmail) {
          const emailKycQ = query(collection(db, 'admin_kyc'), where('email', '==', targetEmail));
          const snap = await getDocs(emailKycQ);
          for (const d of snap.docs) {
            await safeSetDoc(doc(db, 'admin_kyc', d.id), updatePayload, { merge: true });
          }
        }
      } catch (err) {
        console.warn("[AdminKYC] Error updating related admin_kyc docs:", err);
      }

      // 2. Local Storage Sync for aver_admin_kyc_local
      try {
        const local = JSON.parse(localStorage.getItem('aver_admin_kyc_local') || '[]');
        if (Array.isArray(local)) {
          const updatedLocal = local.map((item: any) => {
            const matchesId = item.id === id || item.id === submission.id;
            const matchesUser = targetUserId && item.userId === targetUserId;
            const matchesEmail = targetEmail && item.email && item.email.toLowerCase() === targetEmail;
            if (matchesId || matchesUser || matchesEmail) {
              return { 
                ...item, 
                ...updatePayload,
                status,
                rejectionReason: reason || null,
                reviewedAt: reviewedTimestamp
              };
            }
            return item;
          });
          localStorage.setItem('aver_admin_kyc_local', JSON.stringify(updatedLocal));
        }
      } catch (e) {}

      // 3. Update User document in Firestore
      if (targetUserId) {
        const userUpdate: any = {
          kycStatus: status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'requires_resubmission',
          lastUpdated: serverTimestamp()
        };

        // Fetch existing user data to ensure kycData and kycHistory are cleanly updated
        try {
          const userDocSnap = await getDoc(doc(db, 'users', targetUserId));
          const existingUserData = userDocSnap.exists() ? userDocSnap.data() : null;

          const updatedKycData = {
            ...(existingUserData?.kycData || submission),
            status,
            rejectionReason: reason || null,
            reviewedAt: reviewedTimestamp,
            reviewedByAdmin: adminEmail
          };
          userUpdate.kycData = updatedKycData;

          if (Array.isArray(existingUserData?.kycHistory)) {
            const newHistory = existingUserData.kycHistory.map((h: any) => {
              if (h.id === id || h.id === submission.id || (!h.id && h.submittedAt === submission.submittedAt)) {
                return {
                  ...h,
                  status,
                  rejectionReason: reason || null,
                  reviewedAt: reviewedTimestamp
                };
              }
              return h;
            });
            if (!newHistory.some((h: any) => h.id === id || h.id === submission.id)) {
              newHistory.unshift(updatedKycData);
            }
            userUpdate.kycHistory = newHistory;
          } else {
            userUpdate.kycHistory = [updatedKycData];
          }
        } catch (fetchErr) {
          console.warn("[AdminKYC] Could not fetch existing user doc:", fetchErr);
          userUpdate.kycData = {
            ...submission,
            status,
            rejectionReason: reason || null,
            reviewedAt: reviewedTimestamp,
            reviewedByAdmin: adminEmail
          };
          userUpdate.kycHistory = [userUpdate.kycData];
        }

        if (status === 'verified') {
          userUpdate.kycRewardUnlocked = true;
          userUpdate.kycApprovedAt = reviewedTimestamp;
          userUpdate.kycRejectionReason = null;
          userUpdate.kycResubmissionReason = null;
          
          // Auto-fund logic: Find pending deposits and approve them
          try {
            const depositsQ = query(
              collection(db, 'admin_deposits'), 
              where('userId', '==', targetUserId),
              where('status', '==', 'pending')
            );
            const depositSnap = await getDocs(depositsQ);
            
            if (!depositSnap.empty) {
              for (const dDoc of depositSnap.docs) {
                const depData = dDoc.data();
                const amount = Number(depData.amount) || 0;
                
                await safeUpdateDoc(doc(db, 'admin_deposits', dDoc.id), {
                  status: 'completed',
                  approvedAt: serverTimestamp(),
                  processedBy: 'Auto-KYC-Approval'
                });

                const newHistoryItem = {
                  id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  type: 'deposit',
                  amount,
                  valueUsd: amount,
                  date: new Date().toISOString(),
                  status: 'Completed'
                };

                const newDepositItem = {
                  id: `dep-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  amount,
                  txHash: depData.txHash || `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
                  status: 'Completed',
                  date: new Date().toISOString()
                };

                const notifItem = {
                  id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  title: 'Deposit Approved',
                  message: `Your deposit of $${amount.toLocaleString()} has been verified and credited after KYC approval.`,
                  time: 'Just now',
                  timestamp: new Date().toISOString(),
                  unread: true,
                  type: 'success'
                };

                await safeSetDoc(doc(db, 'users', targetUserId), {
                  portfolioBalance: increment(amount),
                  availableBalance: increment(amount),
                  totalDeposits: increment(amount),
                  tokenBalance: increment(amount),
                  'portfolio.totalValue': increment(amount),
                  transactionHistory: arrayUnion(newHistoryItem),
                  depositsHistory: arrayUnion(newDepositItem),
                  notificationsList: arrayUnion(notifItem),
                  lastUpdated: serverTimestamp()
                }, { merge: true });
              }
            }
          } catch (fundErr) {
            console.warn("Auto-funding failed during KYC approval:", fundErr);
          }
        } else if (status === 'rejected') {
          userUpdate.kycRewardUnlocked = false;
          userUpdate.kycRejectionReason = reason;
          userUpdate.kycResubmissionReason = null;
        } else if (status === 'requires_resubmission') {
          userUpdate.kycRewardUnlocked = false;
          userUpdate.kycResubmissionReason = reason;
          userUpdate.kycRejectionReason = reason;
        }

        await safeSetDoc(doc(db, 'users', targetUserId), userUpdate, { merge: true });

        // Update local storage user caches
        try {
          if (targetUserId) {
            localStorage.setItem(`aver_kyc_active_status_${targetUserId}`, status);
          }
          if (targetEmail) {
            localStorage.setItem(`aver_kyc_active_status_${targetEmail}`, status);
          }

          const profKey = `user_profile_${targetUserId}`;
          const cachedProfStr = localStorage.getItem(profKey);
          if (cachedProfStr) {
            const cachedProf = JSON.parse(cachedProfStr);
            cachedProf.kycStatus = userUpdate.kycStatus;
            cachedProf.kycData = userUpdate.kycData;
            cachedProf.kycHistory = userUpdate.kycHistory;
            cachedProf.kycRejectionReason = userUpdate.kycRejectionReason;
            cachedProf.kycResubmissionReason = userUpdate.kycResubmissionReason;
            cachedProf.kycRewardUnlocked = userUpdate.kycRewardUnlocked;
            localStorage.setItem(profKey, JSON.stringify(cachedProf));
          }

          const profileKey = `user_profile_${targetUserId}`;
          const averProfileStr = localStorage.getItem(profileKey);
          if (averProfileStr) {
            const averProfile = JSON.parse(averProfileStr);
            if (averProfile.uid === targetUserId || (targetEmail && averProfile.email?.toLowerCase() === targetEmail)) {
              averProfile.kycStatus = userUpdate.kycStatus;
              averProfile.kycData = userUpdate.kycData;
              averProfile.kycHistory = userUpdate.kycHistory;
              averProfile.kycRejectionReason = userUpdate.kycRejectionReason;
              averProfile.kycResubmissionReason = userUpdate.kycResubmissionReason;
              averProfile.kycRewardUnlocked = userUpdate.kycRewardUnlocked;
              localStorage.setItem(profileKey, JSON.stringify(averProfile));
            }
          }

          const localDbStr = localStorage.getItem('aver_local_db');
          if (localDbStr) {
            const localDb = JSON.parse(localDbStr);
            if (Array.isArray(localDb)) {
              const updatedDb = localDb.map((u: any) => {
                if (u.id === targetUserId || (targetEmail && u.email?.toLowerCase() === targetEmail)) {
                  return {
                    ...u,
                    profile: {
                      ...(u.profile || {}),
                      kycStatus: userUpdate.kycStatus,
                      kycData: userUpdate.kycData,
                      kycHistory: userUpdate.kycHistory,
                      kycRejectionReason: userUpdate.kycRejectionReason,
                      kycResubmissionReason: userUpdate.kycResubmissionReason
                    }
                  };
                }
                return u;
              });
              localStorage.setItem('aver_local_db', JSON.stringify(updatedDb));
            }
          }
        } catch (e) {}

        let notifTitle = '';
        let notifBody = '';
        if (status === 'verified') {
          notifTitle = 'Verification Complete';
          notifBody = 'Your identity verification has been approved. Your account is now fully funded and ready for institutional trading.';
        } else if (status === 'rejected') {
          notifTitle = 'Verification Rejected';
          notifBody = `Your application was rejected. Reason: ${reason || 'Document verification failed.'}`;
        } else {
          notifTitle = 'Resubmission Required';
          notifBody = `Please re-upload your documents. Reason: ${reason || 'Clarity required.'}`;
        }

        await addDoc(collection(db, 'notifications'), {
          userId: targetUserId,
          category: 'security',
          priority: 'high',
          title: notifTitle,
          body: notifBody,
          createdAt: serverTimestamp(),
          read: false
        }).catch(() => {});
      }

      // 4. Dispatch custom sync events so any active user screen updates in real time
      window.dispatchEvent(new CustomEvent('aver_kyc_status_changed', {
        detail: {
          id,
          userId: targetUserId,
          email: targetEmail,
          status,
          reason
        }
      }));
      window.dispatchEvent(new Event('aver_user_updated'));
      window.dispatchEvent(new Event('aver_kyc_submitted'));
      window.dispatchEvent(new Event('storage'));

      // Update local React state instantly in Admin view
      setSubmissions(prev => prev.map(s => (s.id === id || s.id === submission.id) ? { ...s, ...updatePayload } : s));

      showToast(status === 'verified' ? 'Verification Complete & Account Funded' : `KYC submission status updated to ${status}`);
    } catch (err: any) {
      console.error("Failed to update KYC status:", err);
      showToast(err.message || 'Error updating KYC status', 'error');
    }
  };

  const filtered = submissions.filter(s => {
    const matchesSearch = 
      s.email?.toLowerCase().includes(search.toLowerCase()) || 
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.userId?.toLowerCase().includes(search.toLowerCase()) ||
      s.id?.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && s.status === statusFilter;
  });

  const countPending = submissions.filter(s => s.status === 'pending').length;
  const countVerified = submissions.filter(s => s.status === 'verified').length;
  const countRejected = submissions.filter(s => s.status === 'rejected').length;
  const countResubmit = submissions.filter(s => s.status === 'requires_resubmission').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Identity Governance</h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Review and audit all individual KYC verification records for regulatory compliance and platform security.
        </p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
              statusFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : isDark ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Submissions</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-black">{submissions.length}</span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : isDark ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Review</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-black">{countPending}</span>
          </button>

          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
              statusFilter === 'verified'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : isDark ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Approved</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-black">{countVerified}</span>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
              statusFilter === 'rejected'
                ? 'bg-rose-500 text-white shadow-md'
                : isDark ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Rejected</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-black">{countRejected}</span>
          </button>

          <button
            onClick={() => setStatusFilter('requires_resubmission')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
              statusFilter === 'requires_resubmission'
                ? 'bg-blue-500 text-white shadow-md'
                : isDark ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Resubmission Req.</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-black">{countResubmit}</span>
          </button>
        </div>

        <div className={`flex-1 max-w-md flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by name, email, UID or submission ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm w-full"
          />
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[100]"
          >
            <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <p className="font-bold text-sm">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INDIVIDUAL SUBMISSION CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((item, idx) => (
          <motion.div
            key={`kyc-card-${item.id}-${idx}`}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-[2rem] border flex flex-col justify-between transition-all ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            } ${item.status === 'pending' ? 'ring-1 ring-amber-500/30' : ''}`}
          >
            <div>
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-lg ${
                    isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'
                  }`}>
                    {item.profilePhoto || item.selfieUrl ? (
                      <img src={item.selfieUrl || item.profilePhoto} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      item.name?.charAt(0) || <User className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">{item.name || 'Anonymous User'}</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.email}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  item.status === 'verified' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                  item.status === 'rejected' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                  item.status === 'requires_resubmission' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                  'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {(item?.status || 'pending').replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-2 mb-6 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Submission ID</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold">{item.id?.slice(0, 18)}...</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">ID Type</span>
                  <span className="font-bold">{item.idType || 'Passport'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">User UID</span>
                  <span className="font-mono text-[10px] text-slate-400">{item.userId?.slice(0, 10)}...</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Submitted Date</span>
                  <span className="font-semibold">{new Date(item.submittedAt || Date.now()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <button
                onClick={() => setSelectedSubmission(item)}
                className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Review Details</span>
              </button>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-slate-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">No KYC submissions found for selected filter</p>
          </div>
        )}
      </div>

      {/* DETAILED SUBMISSION REVIEW MODAL */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-[2.5rem] border p-8 space-y-6 ${
                isDark ? 'bg-slate-900 border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-950 shadow-2xl'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-xl">
                    {selectedSubmission.selfieUrl ? (
                      <img src={selectedSubmission.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black">{selectedSubmission.name}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedSubmission.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedSubmission.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' :
                        selectedSubmission.status === 'requires_resubmission' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {selectedSubmission.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{selectedSubmission.email} • UID: {selectedSubmission.userId}</p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Submission ID: {selectedSubmission.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Personal Information</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">ID Type:</span> <span className="font-bold">{selectedSubmission.idType}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Date of Birth:</span> <span className="font-bold">{selectedSubmission.personalInfo?.dob || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Nationality:</span> <span className="font-bold">{selectedSubmission.personalInfo?.nationality || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Phone:</span> <span className="font-bold">{selectedSubmission.personalInfo?.phone || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Submitted:</span> <span className="font-semibold">{new Date(selectedSubmission.submittedAt).toLocaleString()}</span></div>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Residential Address</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Street:</span> <span className="font-bold">{selectedSubmission.address?.street || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">City / State:</span> <span className="font-bold">{selectedSubmission.address?.city}, {selectedSubmission.address?.state}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Postal Code:</span> <span className="font-bold">{selectedSubmission.address?.postalCode || 'N/A'}</span></div>
                    {selectedSubmission.rejectionReason && (
                      <div className="pt-2 border-t border-white/10 text-rose-400">
                        <span className="font-bold">Rejection Reason:</span> {selectedSubmission.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Uploaded Verification Documents */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Uploaded High-Resolution Verification Documents (Click to Inspect & Zoom)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {selectedSubmission.frontIdUrl && (
                    <div 
                      onClick={() => handleOpenInspector(selectedSubmission.frontIdOriginalUrl || selectedSubmission.frontIdUrl!, 'Front ID Document')}
                      className="h-40 rounded-2xl overflow-hidden border border-white/10 relative group cursor-pointer bg-slate-950"
                    >
                      <img src={selectedSubmission.frontIdUrl} alt="Front ID" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/80 px-2 py-1 rounded text-white font-bold backdrop-blur-sm">
                        Front ID
                      </span>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Maximize2 className="w-6 h-6 text-white" />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(selectedSubmission.frontIdOriginalUrl || selectedSubmission.frontIdUrl!, `front-id-${selectedSubmission.id}.jpg`); }}
                        className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/80 hover:bg-black text-white transition-all shadow-md flex items-center gap-1 text-[10px] font-bold z-10"
                        title="Download HD Front ID"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {selectedSubmission.backIdUrl && (
                    <div 
                      onClick={() => handleOpenInspector(selectedSubmission.backIdOriginalUrl || selectedSubmission.backIdUrl!, 'Back ID Document')}
                      className="h-40 rounded-2xl overflow-hidden border border-white/10 relative group cursor-pointer bg-slate-950"
                    >
                      <img src={selectedSubmission.backIdUrl} alt="Back ID" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/80 px-2 py-1 rounded text-white font-bold backdrop-blur-sm">
                        Back ID
                      </span>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Maximize2 className="w-6 h-6 text-white" />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(selectedSubmission.backIdOriginalUrl || selectedSubmission.backIdUrl!, `back-id-${selectedSubmission.id}.jpg`); }}
                        className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/80 hover:bg-black text-white transition-all shadow-md flex items-center gap-1 text-[10px] font-bold z-10"
                        title="Download HD Back ID"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {selectedSubmission.selfieUrl && (
                    <div 
                      onClick={() => handleOpenInspector(selectedSubmission.selfieOriginalUrl || selectedSubmission.selfieUrl!, 'Selfie Verification')}
                      className="h-40 rounded-2xl overflow-hidden border border-white/10 relative group cursor-pointer bg-slate-950"
                    >
                      <img src={selectedSubmission.selfieUrl} alt="Selfie" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/80 px-2 py-1 rounded text-white font-bold backdrop-blur-sm">
                        Selfie Verification
                      </span>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Maximize2 className="w-6 h-6 text-white" />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(selectedSubmission.selfieOriginalUrl || selectedSubmission.selfieUrl!, `selfie-${selectedSubmission.id}.jpg`); }}
                        className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/80 hover:bg-black text-white transition-all shadow-md flex items-center gap-1 text-[10px] font-bold z-10"
                        title="Download HD Selfie"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                {actionModal ? (
                  <div className="w-full space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">
                        {actionModal === 'reject' ? 'Rejection Reason *' : 'Resubmission Instructions *'}
                      </label>
                      <input 
                        type="text" 
                        value={reasonText}
                        onChange={e => setReasonText(e.target.value)}
                        placeholder={actionModal === 'reject' ? 'e.g. ID document photo is expired or illegible' : 'e.g. Please upload a clear color photo of your Passport'}
                        className={`w-full p-3 rounded-xl border text-xs bg-transparent ${isDark ? 'border-white/10' : 'border-slate-300'}`}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => { setActionModal(null); setReasonText(''); }}
                        className="px-4 py-2 rounded-xl border text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleAction(
                          selectedSubmission.id, 
                          actionModal === 'reject' ? 'rejected' : 'requires_resubmission', 
                          reasonText
                        )}
                        disabled={!reasonText}
                        className={`px-6 py-2 rounded-xl text-xs font-black text-white ${
                          actionModal === 'reject' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                      >
                        Confirm {actionModal === 'reject' ? 'Rejection' : 'Resubmission Request'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setActionModal('resubmit')}
                      className="px-5 py-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 font-bold text-xs transition-all"
                    >
                      Request Resubmission
                    </button>
                    <button
                      onClick={() => setActionModal('reject')}
                      className="px-5 py-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 font-bold text-xs transition-all"
                    >
                      Reject Submission
                    </button>
                    <button
                      onClick={() => handleAction(selectedSubmission.id, 'verified')}
                      className="px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Submission</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN HD DOCUMENT INSPECTOR MODAL WITH ZOOM & PAN */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl select-none">
            {/* Inspector Navigation Header */}
            <div className="p-4 bg-neutral-900/90 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white">{previewImage.title}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-slate-300 font-mono">
                  {Math.round(zoomScale * 100)}%
                </span>
              </div>

              {/* Inspector Action Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Reset Scale"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(previewImage.url, `kyc-document-hd-${Date.now()}.jpg`)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md ml-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download HD Original</span>
                </button>
                <button 
                  onClick={() => { setPreviewImage(null); handleResetZoom(); }}
                  className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-white transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Inspector Canvas Container */}
            <div 
              className="flex-1 overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing p-4"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheelZoom}
              onDoubleClick={handleToggleDoubleClickZoom}
            >
              <div
                style={{
                  transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomScale})`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                }}
                className="max-w-full max-h-full flex items-center justify-center"
              >
                <img 
                  src={previewImage.url} 
                  alt="Uncompressed HD Document" 
                  className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl pointer-events-none select-none" 
                />
              </div>

              {/* On-screen Zoom Hint Overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 border border-white/10 px-4 py-1.5 rounded-full text-[11px] text-slate-300 pointer-events-none backdrop-blur-md flex items-center gap-2">
                <span>Double-click or pinch to toggle 2.5x zoom</span>
                <span>•</span>
                <span>Drag to pan when zoomed</span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
