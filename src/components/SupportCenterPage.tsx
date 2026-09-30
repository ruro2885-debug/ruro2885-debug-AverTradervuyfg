import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Send, Paperclip, CheckCircle2, Clock, 
  AlertCircle, Plus, MessageSquare, Shield, Check, FileText, 
  Image as ImageIcon, X, RefreshCw, MoreVertical, Mic, Download, 
  Trash2, Settings, Smile, ExternalLink, Search, Filter, Headphones, Sparkles, Volume2, VolumeX
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, safeUpdateDoc } from '../lib/firebase';
import { collection, onSnapshot, updateDoc, doc, setDoc, query, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { saveSupportTicket, mergeTicketsWithLocal, uploadSupportAttachment, SupportTicket as StoreTicket, SupportMessage as StoreMessage } from '../lib/supportStore';
import { compressImageFile } from '../utils/imageCompressor';

export interface SupportMessage {
  isAdmin?: boolean;
  senderRole?: 'user' | 'admin';
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'document';
  reactions?: Record<string, number>;
  status?: 'sending' | 'delivered' | 'read';
  isVoice?: boolean;
}

export interface SupportTicket {
  id: string;
  userId: string;
  title: string;
  category: string;
  description: string;
  status: 'pending' | 'answered' | 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  transactionId?: string;
  tradingSessionId?: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

export default function SupportCenterPage({ theme, onBack }: { theme: 'light' | 'dark', onBack: () => void }) {
  const isDark = theme === 'dark';
  const { user } = useAuth();

  // Navigation State
  const [viewMode, setViewMode] = useState<'chat' | 'tickets'>('tickets');

  // Real-time Firestore Tickets & Active Chat State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(false);

  // UI Menus & Modals
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Settings State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // New Ticket Form State
  const [newCategory, setNewCategory] = useState('Deposits & Wallet');
  const [newSubject, setNewSubject] = useState('');
  const [newPriority, setNewPriority] = useState<SupportTicket['priority']>('medium');
  const [newTransactionId, setNewTransactionId] = useState('');
  const [newTradingSessionId, setNewTradingSessionId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; url: string; type: 'image' | 'document' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter state on Tickets page
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Chat Input State
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<any>(null);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync tickets real-time with Firestore `support_tickets` collection
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let currentFsTickets: any[] = [];

    const syncUserTickets = (snapshotDocs?: any[]) => {
      if (snapshotDocs) {
        currentFsTickets = [];
        snapshotDocs.forEach(docSnap => {
          const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
          const userEmailMatch = user.email && data.userEmail && data.userEmail.toLowerCase() === user.email.toLowerCase();
          if (data.userId === user.uid || userEmailMatch || !data.userId || data.userId === 'guest' || data.userId === 'anonymous') {
            currentFsTickets.push({ id: docSnap.id || data.id, ...data });
          }
        });
      }

      let localTicketIds = new Set<string>();
      try {
        const raw = localStorage.getItem('aver_support_tickets_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((lt: any) => lt?.id && localTicketIds.add(lt.id));
          }
        }
      } catch (e) {}

      const mergedAll = mergeTicketsWithLocal(currentFsTickets);
      const userTickets = mergedAll.filter(t => 
        t.userId === user.uid || 
        (user.email && t.userEmail && t.userEmail.toLowerCase() === user.email.toLowerCase()) ||
        (!t.userId || t.userId === 'guest' || t.userId === 'anonymous') ||
        localTicketIds.has(t.id)
      );
      userTickets.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());

      setTickets(userTickets as any);
      setLoading(false);

      // Keep active ticket in sync
      setActiveTicket(prev => {
        if (prev) {
          const fresh = userTickets.find(t => t.id === prev.id);
          return (fresh as any) || prev;
        } else if (userTickets.length > 0) {
          return userTickets[0] as any;
        }
        return null;
      });
    };

    // Initial load from local store
    syncUserTickets();

    const q = query(collection(db, 'support_tickets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      syncUserTickets(snapshot.docs);
    }, (error) => {
      console.error("Firestore support tickets sync error:", error);
      syncUserTickets();
    });

    const handleCustomSync = () => {
      syncUserTickets();
    };

    window.addEventListener('support_ticket_updated', handleCustomSync);
    window.addEventListener('storage', handleCustomSync);

    return () => {
      unsubscribe();
      window.removeEventListener('support_ticket_updated', handleCustomSync);
      window.removeEventListener('storage', handleCustomSync);
    };
  }, [user?.uid]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (autoScroll) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.messages, activeTicket?.id, isTyping, autoScroll]);

  // Mark support chat as read immediately when user opens support center or switches active ticket
  useEffect(() => {
    if (user?.uid) {
      try {
        localStorage.setItem(`aver_support_last_read_${user.uid}`, String(Date.now()));
        window.dispatchEvent(new CustomEvent('aver_support_read', { detail: { timestamp: Date.now(), userId: user.uid } }));
      } catch (e) {}
    }
  }, [user?.uid, activeTicket?.id]);

  // Handle Starting First Conversation from Empty State
  const handleStartFirstConversation = async () => {
    if (!user) return;
    setSendingMessage(true);

    const ticketId = "TCK-CHAT-" + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    const welcomeMsg: SupportMessage = {
      id: "MSG-" + Math.floor(100000 + Math.random() * 900000),
      sender: "Support Specialist",
      text: "Hello! Welcome to AVER Specialist Support. How can we assist you today with your deposits, withdrawals, trading, or security?",
      timestamp: now,
      status: 'read'
    };

    const newTicket: any = {
      id: ticketId,
      userId: user.uid,
      userEmail: user.email || `${user.uid.slice(0, 8)}@aver.com`,
      userName: user.displayName || (user.email ? user.email.split('@')[0] : 'AVER Trader'),
      title: "Live Support Session",
      category: "General Inquiry",
      description: "Direct live messaging session with AVER specialist team.",
      status: 'open',
      priority: 'medium',
      createdAt: now,
      updatedAt: now,
      messages: [welcomeMsg]
    };

    try {
      await saveSupportTicket(newTicket);
      setActiveTicket(newTicket);
      triggerToast("Live support session initialized", "success");
    } catch (err) {
      console.error("Error initializing conversation:", err);
      triggerToast("Could not start conversation at this time", "error");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Sending a Message in Active Chat
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    if (!messageText.trim() && !attachment && !selectedFile) return;

    const text = messageText.trim();
    setMessageText('');
    setSendingMessage(true);

    const now = new Date().toISOString();
    let finalAttachmentUrl = attachment?.url || '';

    if (finalAttachmentUrl && finalAttachmentUrl.startsWith('data:')) {
      try {
        finalAttachmentUrl = await uploadSupportAttachment(
          finalAttachmentUrl,
          attachment?.name || selectedFile?.name || 'attachment.jpg',
          selectedFile?.type || 'image/jpeg'
        );
      } catch (uploadErr) {
        console.warn("Backend attachment upload failed:", uploadErr);
      }
    } else if (selectedFile) {
      try {
        const storageRef = ref(storage, `support_attachments/chat_${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadPromise = uploadBytes(storageRef, selectedFile).then(res => getDownloadURL(res.ref));
        const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Storage upload timeout')), 3000));
        const firebaseStorageUrl = await Promise.race([uploadPromise, timeoutPromise]);
        if (firebaseStorageUrl) {
          finalAttachmentUrl = firebaseStorageUrl;
        }
      } catch (storageErr) {
        console.warn("[Support] Firebase Storage upload bypassed or timed out, using backend support upload fallback");
        if (attachment?.url && attachment.url.startsWith('data:')) {
          finalAttachmentUrl = await uploadSupportAttachment(
            attachment.url,
            selectedFile.name,
            selectedFile.type
          );
        }
      }
    }

    const newMsg: SupportMessage = {
      id: "MSG-" + Math.floor(100000 + Math.random() * 900000),
      sender: user.displayName || user.email || user.uid,
      senderRole: 'user',
      isAdmin: false,
      text: text || (finalAttachmentUrl ? "Sent an image attachment." : ""),
      timestamp: now,
      status: 'delivered',
      ...(finalAttachmentUrl ? {
        attachmentUrl: finalAttachmentUrl,
        attachmentName: attachment?.name || selectedFile?.name || 'Attachment',
        attachmentType: attachment?.type || (selectedFile?.type.startsWith('image/') ? 'image' : 'document')
      } : {})
    };

    setAttachment(null);
    setSelectedFile(null);

    let targetTicket = activeTicket;

    if (!targetTicket) {
      // Auto create new live support ticket in Firestore if user sends first message without active chat
      const ticketId = "TCK-CHAT-" + Math.floor(100000 + Math.random() * 900000);
      const newTicketData: any = {
        id: ticketId,
        userId: user.uid,
        userEmail: user.email || `${user.uid.slice(0, 8)}@aver.com`,
        userName: user.displayName || (user.email ? user.email.split('@')[0] : 'AVER Trader'),
        title: "Live Support Session",
        category: "General Inquiry",
        description: text || "Direct live messaging session with AVER specialist team.",
        status: 'pending',
        priority: 'medium',
        createdAt: now,
        updatedAt: now,
        messages: [newMsg]
      };

      try {
        await saveSupportTicket(newTicketData);
        setActiveTicket(newTicketData);
      } catch (err) {
        console.error("Error creating initial conversation on send:", err);
        triggerToast("Failed to send message. Please retry.", "error");
      } finally {
        setSendingMessage(false);
      }
      return;
    }

    const updatedMessages = [...(targetTicket.messages || []), newMsg];

    // Optimistic update
    const updatedTicket: any = {
      ...targetTicket,
      updatedAt: now,
      messages: updatedMessages,
      status: 'pending'
    };
    setActiveTicket(updatedTicket);

    try {
      await saveSupportTicket(updatedTicket);
    } catch (err) {
      console.error("Failed to send message:", err);
      triggerToast("Failed to send message. Please retry.", "error");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Real File Attachment Selection with High-Performance Compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) { // 25MB limit
      triggerToast("File size must be under 25MB.", "error");
      return;
    }

    if (file.type.startsWith('image/')) {
      try {
        triggerToast("Processing image...", "info");
        const compressed = await compressImageFile(file, 1200, 1200, 0.78);
        const compressedFile = new File([compressed.blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
        setSelectedFile(compressedFile);
        setAttachment({
          name: file.name,
          url: compressed.dataUrl,
          type: 'image'
        });
        triggerToast(`Image attached (${Math.round(compressed.sizeBytes / 1024)} KB)`, "info");
      } catch (err) {
        console.warn("Image compression fallback:", err);
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = () => {
          setAttachment({
            name: file.name,
            url: reader.result as string,
            type: 'image'
          });
        };
        reader.readAsDataURL(file);
      }
    } else {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAttachment({
          name: file.name,
          url: reader.result as string,
          type: 'document'
        });
        triggerToast(`Attached ${file.name}`, "info");
      };
      reader.onerror = () => {
        triggerToast("Failed to read selected file.", "error");
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
  };

  // Simulated Voice Note Recording
  const startVoiceRecording = () => {
    setIsVoiceRecording(true);
    setRecordingSeconds(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopAndSendVoiceNote = async () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    setIsVoiceRecording(false);

    if (!activeTicket || !user) return;

    const durationStr = `0:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds}`;
    const now = new Date().toISOString();

    const voiceMsg: SupportMessage = {
      id: "MSG-VOICE-" + Math.floor(100000 + Math.random() * 900000),
      sender: user.email || user.uid,
      text: `🎤 Voice note (${durationStr})`,
      timestamp: now,
      status: 'delivered',
      isVoice: true
    };

    const updatedMessages = [...(activeTicket.messages || []), voiceMsg];

    const updatedTicket = {
      ...activeTicket,
      messages: updatedMessages,
      updatedAt: now,
      status: 'pending' as const
    };
    setActiveTicket(updatedTicket);

    try {
      await saveSupportTicket(updatedTicket as any);
      triggerToast("Voice note sent!", "success");
    } catch (err) {
      console.error("Error sending voice note:", err);
    }
  };

  // Add Emoji Reaction to Message
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!activeTicket) return;

    const updatedMsgs = activeTicket.messages.map(m => {
      if (m.id === msgId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    });

    const updatedTicket = { ...activeTicket, messages: updatedMsgs };
    setActiveTicket(updatedTicket);

    try {
      await saveSupportTicket(updatedTicket as any);
    } catch (err) {
      console.error("Failed to add reaction:", err);
    }
  };

  // Handle Clear Conversation
  const handleClearConversation = async () => {
    if (!activeTicket) return;
    const now = new Date().toISOString();
    
    const updatedTicket = {
      ...activeTicket,
      messages: [],
      updatedAt: now
    };
    
    setActiveTicket(updatedTicket);
    setShowMoreMenu(false);

    try {
      await saveSupportTicket(updatedTicket as any);
      triggerToast("Conversation history cleared.", "info");
    } catch (err) {
      console.error("Error clearing conversation:", err);
    }
  };

  // Export Chat Transcript
  const handleExportChat = () => {
    if (!activeTicket) return;
    const lines = activeTicket.messages.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}: ${m.text}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aver_support_transcript_${activeTicket.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("Transcript downloaded successfully.", "success");
    setShowMoreMenu(false);
  };

  // Create New Ticket Submit Handler
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      triggerToast("Please fill in subject and description.", "error");
      return;
    }
    if (!user) {
      triggerToast("You must be logged in to create a support ticket.", "error");
      return;
    }

    setSubmitting(true);
    const ticketId = "TCK-" + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    try {
      let finalAttachmentUrl = attachment?.url || '';

      if (selectedFile) {
        try {
          const storageRef = ref(storage, `support_attachments/${ticketId}/${Date.now()}_${selectedFile.name}`);
          const uploadPromise = uploadBytes(storageRef, selectedFile).then(res => getDownloadURL(res.ref));
          const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Storage upload timeout')), 3500));
          finalAttachmentUrl = await Promise.race([uploadPromise, timeoutPromise]);
        } catch (storageErr) {
          console.warn("[Support] Firebase Storage upload bypassed or timed out, using attachment data URL fallback");
          finalAttachmentUrl = attachment?.url || '';
        }
      }

      const initialMsg: SupportMessage = {
        id: "MSG-" + Math.floor(100000 + Math.random() * 900000),
        sender: user.displayName || user.email || user.uid,
        text: newDescription.trim(),
        timestamp: now,
        status: 'delivered',
        ...(finalAttachmentUrl ? {
          attachmentUrl: finalAttachmentUrl,
          attachmentName: attachment?.name || selectedFile?.name || 'attachment',
          attachmentType: attachment?.type || (selectedFile?.type.startsWith('image/') ? 'image' : 'document')
        } : {})
      };

      const newTicket: SupportTicket & { userEmail?: string; userName?: string; attachmentUrl?: string } = {
        id: ticketId,
        userId: user.uid,
        userEmail: user.email || `${user.uid.slice(0, 8)}@aver.com`,
        userName: user.displayName || (user.email ? user.email.split('@')[0] : 'AVER Trader'),
        title: newSubject.trim(),
        category: newCategory,
        description: newDescription.trim(),
        status: 'open',
        priority: newPriority,
        ...(newTransactionId.trim() ? { transactionId: newTransactionId.trim() } : {}),
        ...(newTradingSessionId.trim() ? { tradingSessionId: newTradingSessionId.trim() } : {}),
        ...(finalAttachmentUrl ? { attachmentUrl: finalAttachmentUrl } : {}),
        createdAt: now,
        updatedAt: now,
        messages: [initialMsg]
      };

      await saveSupportTicket(newTicket as any);
      triggerToast("Support ticket created successfully!", "success");

      // Reset form
      setNewSubject('');
      setNewDescription('');
      setNewTransactionId('');
      setNewTradingSessionId('');
      setAttachment(null);
      setSelectedFile(null);
      setShowCreateModal(false);

      // Open new ticket in Tickets view
      setActiveTicket(newTicket);
      setViewMode('tickets');
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error("Error creating ticket:", err);
      triggerToast(`Failed to create ticket: ${err?.message || 'Unknown error'}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered tickets for Support Tickets page
  const filteredTickets = tickets.filter(t => {
    const q = ticketSearch.toLowerCase();
    const matchesSearch = (t?.title || '').toLowerCase().includes(q) ||
                          (t?.id || '').toLowerCase().includes(q) ||
                          (t?.category || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`flex-1 flex flex-col h-full ${isDark ? 'bg-[#07090E] text-white' : 'bg-slate-50 text-slate-900'} font-sans overflow-hidden relative select-none`}>
      
      {/* Global File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
      />

      {/* Toast Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
          >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-bold pointer-events-auto max-w-sm ${
              toast.type === 'success' 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : toast.type === 'error'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-teal-500/20 border-teal-500/40 text-teal-300'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
              {toast.type === 'info' && <Sparkles className="w-4 h-4 shrink-0 text-teal-300" />}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox for image attachments */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={lightboxImage} alt="Attachment Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10" />
          </div>
        )}
      </AnimatePresence>

      {/* MAIN VIEW MODE: CHAT INTERFACE */}
      {viewMode === 'chat' ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Clean Compact WhatsApp / Intercom Style Header */}
          <header className={`shrink-0 h-14 px-3 sm:px-4 flex items-center justify-between border-b z-20 ${
            isDark ? 'bg-[#0B0E14] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Back Button */}
              <button 
                onClick={() => setViewMode('tickets')}
                className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                  isDark ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Name & Status */}
              <div className="flex flex-col justify-center">
                <h1 className="text-sm font-bold leading-tight tracking-tight">AVER Support</h1>
                <p className="text-[11px] text-emerald-400 font-medium leading-none mt-0.5">
                  Replies in under 5 min
                </p>
              </div>
            </div>

            {/* Three-dot Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`p-2 rounded-full transition-colors ${
                  isDark ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className={`absolute right-0 mt-2 w-56 rounded-2xl border p-1.5 shadow-2xl z-50 ${
                      isDark ? 'bg-[#0E121B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    {activeTicket && (
                      <div className="px-3.5 py-2 mb-1 border-b border-white/5 text-[11px] space-y-0.5">
                        <span className="text-slate-400 font-medium block">Active Case</span>
                        <span className="font-mono text-emerald-400 font-bold block truncate">{activeTicket.id} - {activeTicket.title}</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setViewMode('tickets');
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
                        isDark ? 'hover:bg-white/5 text-emerald-400' : 'hover:bg-slate-100 text-emerald-600'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>View All Tickets</span>
                      {tickets.length > 0 && (
                        <span className="ml-auto bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          {tickets.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowCreateModal(true);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Create New Ticket</span>
                    </button>

                    <button
                      onClick={handleExportChat}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                      }`}
                    >
                      <Download className="w-4 h-4 text-sky-400" />
                      <span>Export Chat Transcript</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowSettingsModal(true);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                      }`}
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Chat Settings</span>
                    </button>

                    <div className="my-1 border-t border-white/5"></div>

                    <button
                      onClick={handleClearConversation}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear Conversation</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>

          {/* Conversation Middle Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 relative">
            
            {(!activeTicket || activeTicket.messages?.length === 0) ? (
              
              /* FIRST TIME / NO CONVERSATION EMPTY STATE */
              <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
                
                {/* Support Illustration */}
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/10">
                    <Headphones className="w-10 h-10 text-emerald-400" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Welcome to AVER Support
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                    Start a conversation with one of our specialists. We’re here to help with deposits, withdrawals, AI trading sessions, account security, verification, technical issues, and more.
                  </p>
                </div>

                <button
                  onClick={handleStartFirstConversation}
                  disabled={sendingMessage}
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:scale-[1.02] text-black font-black text-sm py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5 text-black" />
                  <span>Start Conversation</span>
                </button>

              </div>

            ) : (

              /* ACTIVE LIVE MESSAGES STREAM */
              <div className="space-y-4">
                {activeTicket.messages.map((msg, idx) => {
                  const isAdmin = msg.isAdmin || msg.senderRole === 'admin' || ['Admin Agent', 'Support Specialist', 'Support Team', 'AVER Specialist', 'Admin'].includes(msg.sender);
                  const isUser = !isAdmin;

                  return (
                    <motion.div
                      key={`msg-${msg.id || 'gen'}-${idx}-${msg.timestamp || Date.now()}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender label & Timestamp */}
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          {isUser ? 'You' : 'Support Specialist'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Bubble Card */}
                      <div className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs space-y-2 shadow-xl ${
                        isUser
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-semibold rounded-tr-none'
                          : isDark
                          ? 'bg-[#111622] text-slate-200 border border-white/10 rounded-tl-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                      }`}>
                        {/* Voice Note Badge */}
                        {msg.isVoice ? (
                          <div className="flex items-center gap-3 py-1">
                            <div className="p-2 rounded-xl bg-black/10 flex items-center justify-center">
                              <Volume2 className="w-5 h-5 text-black animate-pulse" />
                            </div>
                            <div>
                              <p className="font-mono text-xs font-bold">{msg.text}</p>
                              <div className="flex items-center gap-1 mt-1">
                                {[...Array(12)].map((_, i) => (
                                  <span key={i} className="w-1 h-3 rounded-full bg-black/30" style={{ height: `${Math.random() * 12 + 4}px` }}></span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                        )}

                        {/* File Attachment Render */}
                        {msg.attachmentUrl && (
                          <div className="pt-2">
                            {msg.attachmentType === 'image' ? (
                              <button
                                onClick={() => setLightboxImage(msg.attachmentUrl!)}
                                className="block rounded-xl overflow-hidden border border-black/10 max-w-xs transition-transform hover:scale-[1.02]"
                              >
                                <img src={msg.attachmentUrl} alt="Attachment" className="max-h-48 object-cover rounded-xl" />
                              </button>
                            ) : (
                              <a
                                href={msg.attachmentUrl}
                                download={msg.attachmentName || 'document'}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-[11px] font-mono transition-all ${
                                  isUser ? 'bg-black/10 border-black/10 text-black hover:bg-black/20' : 'bg-white/5 border-white/10 text-emerald-400 hover:bg-white/10'
                                }`}
                              >
                                <FileText className="w-4 h-4 shrink-0" />
                                <span className="truncate flex-1 font-bold">{msg.attachmentName || 'Document Attachment'}</span>
                                <Download className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            )}
                          </div>
                        )}

                      </div>

                      

                    </motion.div>
                  );
                })}

                {/* Support Agent Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 w-max"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="font-bold">Support specialist is typing...</span>
                  </motion.div>
                )}

                <div ref={chatEndRef} />
              </div>

            )}

          </div>

          {/* Fixed Composer Input Bar */}
          <div className={`shrink-0 p-3 sm:p-4 border-t z-20 ${
            isDark ? 'bg-[#090C12] border-white/5' : 'bg-white border-slate-200 shadow-xl'
          }`}>

            {/* Pending Attachment Chip */}
            {attachment && (
              <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-mono">
                {attachment.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                <span className="truncate max-w-[200px]">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="ml-auto hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              
              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-3 rounded-xl border transition-all ${
                  isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                }`}
                title="Attach image or document (PDF, PNG, JPG, DOC)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Message Input Field */}
              <input
                type="text"
                placeholder={activeTicket ? "Type your message to support specialist..." : "Start a conversation..."}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                className={`flex-1 px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none focus:border-emerald-500 ${
                  isDark ? 'bg-black/40 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!messageText.trim() && !attachment}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 text-black px-5 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>

            </form>
          </div>

        </div>
      ) : (

        /* SECONDARY VIEW MODE: SUPPORT TICKETS PAGE */
        <div className="flex-1 flex flex-col h-full overflow-y-auto relative">
          
          {/* Header */}
          <header className={`shrink-0 h-16 px-6 flex items-center justify-between border-b sticky top-0 backdrop-blur-md z-20 ${
            isDark ? 'bg-[#0E121B]/90 border-white/5' : 'bg-white/90 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack}
                className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-sm font-black tracking-tight">Support Tickets</h1>
                <p className="text-[10px] text-slate-400 font-mono">Formal Support Requests & Case History</p>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
            
            {/* HERO CARD BANNER */}
            <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900/40 via-teal-900/20 to-black border border-emerald-500/30 shadow-2xl">
              <div className="relative z-10 space-y-3 max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Need a dedicated investigation for deposits, withdrawals, or security?
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Create a formal ticket to assign dedicated specialists for financial execution verification, session audits, or compliance reviews.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                  >
                    Create New Ticket
                  </button>
                </div>
              </div>
            </div>

            {/* MY TICKETS SECTION */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-black tracking-tight">My Tickets</h3>
                  <p className="text-xs text-slate-400 font-medium">Manage and track your active support inquiries</p>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-64 ${
                    isDark ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200'
                  }`}>
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search ticket ID or topic..."
                      value={ticketSearch}
                      onChange={e => setTicketSearch(e.target.value)}
                      className="bg-transparent border-none focus:outline-none text-xs w-full"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none ${
                      isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending Response</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Tickets Grid / List */}
              <div className="space-y-3">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        isDark ? 'bg-[#0E121B] border-white/5 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            {ticket.id}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {ticket.category}
                          </span>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            ticket.priority === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' :
                            ticket.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                            'bg-sky-500/20 text-sky-400 border border-sky-500/20'
                          }`}>
                            {ticket.priority} priority
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-100">{ticket.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 font-medium">{ticket.description}</p>

                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono pt-1">
                          <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <span>Updated: {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                          ticket.status === 'resolved' || ticket.status === 'closed'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {ticket.status}
                        </span>

                        <button
                          onClick={() => {
                            setActiveTicket(ticket);
                            setViewMode('chat');
                          }}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                        >
                          <span>Open Ticket</span>
                          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>

                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-500 space-y-3 border border-dashed border-white/10 rounded-3xl">
                    <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                    <p className="text-xs font-bold">No support tickets found.</p>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* CREATE NEW SUPPORT TICKET MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-xl rounded-3xl border p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto ${
                isDark ? 'bg-[#0E121B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight">Create Support Ticket</h3>
                    <p className="text-xs text-slate-400 font-medium">Submit structured inquiry directly to specialist desk</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
                
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category *</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Deposits & Wallet">Deposits & Wallet</option>
                    <option value="Withdrawals">Withdrawals</option>
                    <option value="AI Trading Sessions">AI Trading Sessions</option>
                    <option value="Account & Verification">Account & Verification</option>
                    <option value="Account Security">Account Security</option>
                    <option value="Technical Issues">Technical Issues</option>
                    <option value="General">General Inquiry</option>
                  </select>
                </div>

                {/* Subject / Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject / Issue Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deposit settlement inquiry, AI strategy execution..."
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-black/50 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Optional IDs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. TXN-94021"
                      value={newTransactionId}
                      onChange={e => setNewTransactionId(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-emerald-500 ${
                        isDark ? 'bg-black/50 border-white/10 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trading Session ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. SES-8831"
                      value={newTradingSessionId}
                      onChange={e => setNewTradingSessionId(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-emerald-500 ${
                        isDark ? 'bg-black/50 border-white/10 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority *</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="low">Low - General Question</option>
                    <option value="medium">Medium - Standard Inquiry</option>
                    <option value="high">High - Urgent Assistance Required</option>
                    <option value="critical">Critical - System Error or Financial Block</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message / Details *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide detailed description of your inquiry..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-black/50 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Attachment Upload */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attachment Upload</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Paperclip className="w-4 h-4 text-emerald-400" />
                      <span>Upload Document / Image</span>
                    </button>

                    {attachment ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-mono">
                        {attachment.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        <span className="truncate max-w-[180px]">{attachment.name}</span>
                        <button 
                          type="button" 
                          onClick={() => { setAttachment(null); setSelectedFile(null); }} 
                          className="hover:text-white p-0.5"
                          title="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">Supports PNG, JPG, PDF, DOC, TXT (Max 15MB)</span>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:scale-[1.01] disabled:opacity-40 text-black font-black text-xs py-4 rounded-xl transition-all shadow-xl shadow-emerald-500/20"
                  >
                    {submitting ? "Submitting Ticket..." : "Submit Ticket"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHAT SETTINGS MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl relative ${
                isDark ? 'bg-[#0E121B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black">Chat Preferences</h3>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="p-1 rounded-lg hover:bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-bold">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <span>Message Alert Sounds</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors p-1 flex items-center ${soundEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-black"></span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <span>Auto-scroll to New Messages</span>
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`w-10 h-6 rounded-full transition-colors p-1 flex items-center ${autoScroll ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-black"></span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
