import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, BellOff, X, Search, Filter, Check, Trash2, 
  Archive, Pin, Clock, ShieldCheck, User as UserIcon, 
  Briefcase, ArrowDownToLine, ArrowUpFromLine, 
  Wallet, RefreshCw, Link2, Settings, Zap,
  MoreVertical, AlertCircle, TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationCategory, NotificationItem } from '../types/notifications';
import { usePreferences } from '../contexts/PreferencesContext';
import { NotificationManager } from '../services/NotificationManager';

interface NotificationCenterProps {
  onClose: () => void;
  isDark: boolean;
}

const getCategoryIcon = (category?: NotificationCategory | string) => {
  switch (category) {
    case 'account': return <UserIcon className="w-4 h-4" />;
    case 'security': return <ShieldCheck className="w-4 h-4" />;
    case 'trading': return <TrendingUp className="w-4 h-4" />;
    case 'portfolio': return <Briefcase className="w-4 h-4" />;
    case 'deposit': return <ArrowDownToLine className="w-4 h-4" />;
    case 'withdrawal': return <ArrowUpFromLine className="w-4 h-4" />;
    case 'vault': return <Wallet className="w-4 h-4" />;
    case 'copy_trading': return <Link2 className="w-4 h-4" />;
    case 'swap': return <RefreshCw className="w-4 h-4" />;
    case 'referral': return <Zap className="w-4 h-4" />;
    case 'system': return <Settings className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
};

const getCategoryStyles = (category?: NotificationCategory | string, isDark?: boolean) => {
  switch (category) {
    case 'account': 
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.12)]',
        color: 'text-emerald-400'
      };
    case 'security':
      return {
        bg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25',
        glow: 'shadow-[0_0_15px_rgba(99,102,241,0.12)]',
        color: 'text-indigo-400'
      };
    case 'trading':
      return {
        bg: 'bg-teal-500/10 text-teal-400 border border-teal-500/25',
        glow: 'shadow-[0_0_15px_rgba(20,184,166,0.12)]',
        color: 'text-teal-400'
      };
    case 'portfolio':
      return {
        bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.12)]',
        color: 'text-amber-400'
      };
    case 'deposit':
      return {
        bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.12)]',
        color: 'text-blue-400'
      };
    case 'withdrawal':
      return {
        bg: 'bg-pink-500/10 text-pink-400 border border-pink-500/25',
        glow: 'shadow-[0_0_15px_rgba(236,72,153,0.12)]',
        color: 'text-pink-400'
      };
    case 'vault':
      return {
        bg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25',
        glow: 'shadow-[0_0_15px_rgba(6,182,212,0.12)]',
        color: 'text-cyan-400'
      };
    case 'copy_trading':
      return {
        bg: 'bg-violet-500/10 text-violet-400 border border-violet-500/25',
        glow: 'shadow-[0_0_15px_rgba(139,92,246,0.12)]',
        color: 'text-violet-400'
      };
    case 'swap':
      return {
        bg: 'bg-orange-500/10 text-orange-400 border border-orange-500/25',
        glow: 'shadow-[0_0_15px_rgba(249,115,22,0.12)]',
        color: 'text-orange-400'
      };
    case 'referral':
      return {
        bg: 'bg-rose-500/10 text-rose-400 border border-rose-500/25',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.12)]',
        color: 'text-rose-400'
      };
    case 'system':
      return {
        bg: 'bg-slate-500/10 text-slate-400 border border-slate-500/25',
        glow: 'shadow-[0_0_15px_rgba(100,116,139,0.12)]',
        color: 'text-slate-400'
      };
    default:
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.12)]',
        color: 'text-emerald-400'
      };
  }
};

const getPriorityColor = (priority: string, isDark: boolean) => {
  switch (priority) {
    case 'critical': return 'text-rose-400 bg-rose-500/10 border border-rose-500/20';
    case 'high': return 'text-orange-400 bg-orange-500/10 border border-orange-500/20';
    case 'medium': return 'text-blue-400 bg-blue-500/10 border border-blue-500/20';
    case 'low': return 'text-gray-400 bg-white/5 border border-white/5';
    default: return 'text-gray-400 bg-white/5';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// Memoized notification row for high 60fps performance
const NotificationRow = React.memo(({ 
  not, 
  isDark, 
  textPrimary, 
  textSecondary, 
  exactTime, 
  onMarkRead, 
  onPin, 
  onArchive, 
  onDelete 
}: { 
  not: NotificationItem, 
  isDark: boolean, 
  textPrimary: string, 
  textSecondary: string, 
  exactTime: string, 
  onMarkRead: (id: string) => void, 
  onPin: (id: string) => void, 
  onArchive: (id: string) => void, 
  onDelete: (id: string) => void 
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const category = not?.category || 'system';
  const priority = not?.priority || 'low';
  const catStyles = getCategoryStyles(category, isDark);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.2 }}
      className={`p-4 rounded-2xl border transition-all relative overflow-visible will-change-transform ${
        not.read 
          ? 'bg-white/[0.015] border-white/5 opacity-80 hover:opacity-100 hover:bg-white/[0.03]'
          : 'bg-white/[0.035] border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.03)] hover:bg-white/[0.05]'
      }`}
      onClick={() => {
        if (!not.read) onMarkRead(not.id);
      }}
    >
      <div className="flex gap-3.5 items-start">
        {/* Category Circular Icon Container with colored Glow */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative ${catStyles.bg} ${catStyles.glow}`}>
          {getCategoryIcon(category)}
          {/* Pulsing Green dot for Unread notifications */}
          {!not.read && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0c0d14] animate-pulse" />
          )}
        </div>

        {/* Text Details Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={`text-sm font-semibold truncate ${textPrimary} ${!not.read ? 'text-white' : 'text-gray-300'}`}>
              {not.title || 'Notification'}
            </h4>
            <span className="text-[11px] font-mono text-gray-500 whitespace-nowrap shrink-0">
              {formatTimeAgo(not.date || new Date().toISOString())}
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed mb-2.5 break-words">
            {not.body || ''}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[9px] font-semibold font-mono tracking-wider uppercase px-2 py-0.5 rounded-md ${getPriorityColor(priority, isDark)}`}>
              {priority}
            </span>
            <span className="text-[9px] font-semibold font-mono tracking-wider uppercase px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-400 border border-white/5">
              {String(category).replace(/_/g, ' ')}
            </span>
            {not.pinned && (
              <span className="flex items-center gap-1 text-[9px] font-semibold font-mono uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Pin className="w-2.5 h-2.5" fill="currentColor" />
                Pinned
              </span>
            )}
          </div>

          {not.archived ? (
            <div className="mt-2.5 flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(not.id);
                }}
                className="text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                id={`restore-btn-${not.id}`}
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restore</span>
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(not.id);
                }}
                className="text-[11px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-full hover:bg-rose-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                id={`delete-btn-${not.id}`}
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          ) : not.actionUrl ? (
            <div className="mt-2.5">
              <button className="text-[11px] font-bold bg-emerald-500 text-black px-3 py-1 rounded-full hover:bg-emerald-400 transition-colors active:scale-95">
                View Details
              </button>
            </div>
          ) : null}
        </div>

        {/* Action Button & Context Popover */}
        <div className="relative shrink-0">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setMenuOpen(!menuOpen); 
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
            title="Notification actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              {/* Event layer to dismiss when clicking anywhere */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setMenuOpen(false); 
                }} 
              />
              <div 
                className="absolute right-0 top-7 w-36 bg-[#000000]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 z-20 overflow-hidden text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => {
                    onMarkRead(not.id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-gray-300 flex items-center gap-2 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{not.read ? 'Mark Unread' : 'Mark Read'}</span>
                </button>
                <button 
                  onClick={() => {
                    onPin(not.id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-gray-300 flex items-center gap-2 transition-colors"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{not.pinned ? 'Unpin' : 'Pin'}</span>
                </button>
                <button 
                  onClick={() => {
                    onArchive(not.id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-gray-300 flex items-center gap-2 transition-colors"
                  id={`dropdown-archive-btn-${not.id}`}
                >
                  <Archive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{not.archived ? 'Restore' : 'Archive'}</span>
                </button>
                <button 
                  onClick={() => {
                    onDelete(not.id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-rose-500/10 text-rose-400 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

NotificationRow.displayName = 'NotificationRow';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose, isDark }) => {
  const { 
    user, 
    notifications: authNotifications,
    markNotificationRead, 
    markAllNotificationsRead, 
    deleteNotification, 
    clearNotifications, 
    pinNotification, 
    archiveNotification 
  } = useAuth();
  const { preferences } = usePreferences();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Optimistic UI updates state
  const [localNotifications, setLocalNotifications] = useState<NotificationItem[]>([]);
  const [isReady, setIsReady] = useState(true);
  const [visibleCount, setVisibleCount] = useState(15);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with context whenever notifications list changes
  useEffect(() => {
    if (authNotifications) {
      setLocalNotifications(NotificationManager.deduplicateList(authNotifications));
    }
  }, [authNotifications]);

  // Mark all as read when opening the notification center
  useEffect(() => {
    const hasUnread = authNotifications && authNotifications.some(n => !n.read);
    if (hasUnread) {
      markAllNotificationsRead().catch(err => console.error("Error marking all read on mount:", err));
    }
  }, []);

  const filteredAndSorted = useMemo(() => {
    const deduplicated = NotificationManager.deduplicateList(localNotifications);
    let result = deduplicated.filter(n => showArchived ? !!n.archived : !n.archived);

    const notifPrefs = preferences?.notifications || {};
    const isMasterOn = notifPrefs.master ?? true;

    if (!isMasterOn) {
      return {
        today: [],
        yesterday: [],
        earlier: []
      };
    }

    result = result.filter(n => {
      const cat = n?.category || 'system';
      if (cat === 'security' && notifPrefs.security === false) return false;
      if (['account', 'profile'].includes(cat) && notifPrefs.profile === false) return false;
      if (cat === 'deposit' && notifPrefs.deposits === false) return false;
      if (cat === 'withdrawal' && notifPrefs.withdrawals === false) return false;
      if (['trading', 'portfolio', 'copy_trading', 'swap', 'ai'].includes(cat) && notifPrefs.trading === false) return false;
      if (['referral', 'vault', 'rewards'].includes(cat) && notifPrefs.rewards === false) return false;
      if (['system'].includes(cat) && notifPrefs.system === false) return false;
      if (['marketing'].includes(cat) && notifPrefs.marketing === false) return false;
      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => (n?.title || '').toLowerCase().includes(q) || (n?.body || '').toLowerCase().includes(q));
    }

    if (categoryFilter !== 'all') {
      result = result.filter(n => (n?.category || 'system') === categoryFilter);
    }

    if (showUnreadOnly) {
      result = result.filter(n => !n.read);
    }

    result.sort((a, b) => {
      // Pinned always top
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    const grouped = {
      today: [] as NotificationItem[],
      yesterday: [] as NotificationItem[],
      earlier: [] as NotificationItem[],
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    result.forEach(n => {
      const date = n.date ? new Date(n.date) : new Date();
      if (date >= today) grouped.today.push(n);
      else if (date >= yesterday) grouped.yesterday.push(n);
      else grouped.earlier.push(n);
    });
    
    return grouped;
  }, [localNotifications, searchQuery, categoryFilter, showUnreadOnly, sortOrder, showArchived, preferences]);

  const totalCount = useMemo(() => {
    return filteredAndSorted.today.length + filteredAndSorted.yesterday.length + filteredAndSorted.earlier.length;
  }, [filteredAndSorted]);

  // Progressive infinite scroll loader
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 150) {
      if (visibleCount < totalCount) {
        setVisibleCount(prev => prev + 15);
      }
    }
  };

  const textPrimary = 'text-white';
  const textSecondary = 'text-gray-400';

  // Instant unread badge count updates
  const unreadCount = useMemo(() => {
    const notifPrefs = preferences?.notifications || {};
    const isMasterOn = notifPrefs.master ?? true;
    if (!isMasterOn) return 0;

    const filtered = localNotifications.filter(n => {
      const cat = n?.category || 'system';
      if (cat === 'security' && notifPrefs.security === false) return false;
      if (['account', 'profile'].includes(cat) && notifPrefs.profile === false) return false;
      if (cat === 'deposit' && notifPrefs.deposits === false) return false;
      if (cat === 'withdrawal' && notifPrefs.withdrawals === false) return false;
      if (['trading', 'portfolio', 'copy_trading', 'swap', 'ai'].includes(cat) && notifPrefs.trading === false) return false;
      if (['referral', 'vault', 'rewards'].includes(cat) && notifPrefs.rewards === false) return false;
      if (['system'].includes(cat) && notifPrefs.system === false) return false;
      if (['marketing'].includes(cat) && notifPrefs.marketing === false) return false;
      return true;
    });

    return filtered.filter(n => !n.read && !n.archived).length;
  }, [localNotifications, preferences]);

  const archivedCount = useMemo(() => {
    return localNotifications.filter(n => !!n.archived).length;
  }, [localNotifications]);

  // Optimistic event handlers
  const handleMarkRead = (id: string) => {
    let toggledRead = true;
    setLocalNotifications(prev => prev.map(n => {
      if (n.id === id) {
        toggledRead = !n.read;
        return { ...n, read: toggledRead };
      }
      return n;
    }));
    markNotificationRead(id, toggledRead).catch(err => console.error("Error marking read", err));
  };

  const handleMarkAllRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAllNotificationsRead().catch(err => console.error("Error marking all read", err));
  };

  const handlePin = (id: string) => {
    setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
    pinNotification(id).catch(err => console.error("Error pinning", err));
  };

  const handleArchive = (id: string) => {
    setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, archived: !n.archived } : n));
    archiveNotification(id).catch(err => console.error("Error archiving", err));
  };

  const handleDelete = (id: string) => {
    const isArchived = localNotifications.find(n => n.id === id)?.archived;
    if (isArchived) {
      setDeleteConfirmId(id);
    } else {
      setLocalNotifications(prev => prev.filter(n => n.id !== id));
      deleteNotification(id).catch(err => console.error("Error deleting", err));
    }
  };

  const handleClearAll = () => {
    setLocalNotifications(prev => prev.filter(n => n.pinned));
    clearNotifications().catch(err => console.error("Error clearing", err));
  };

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'account', label: 'Account' },
    { id: 'security', label: 'Security' },
    { id: 'trading', label: 'Trading' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'deposit', label: 'Deposits' },
    { id: 'withdrawal', label: 'Withdrawals' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[6px] flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 210 }}
        className="w-full md:w-[98%] max-w-4xl h-[92vh] rounded-t-[24px] border-t border-x border-white/[0.12] bg-[#000000]/85 backdrop-blur-2xl flex flex-col overflow-hidden shadow-[0_-15px_50px_-10px_rgba(0,0,0,0.85),0_0_50px_rgba(16,185,129,0.06)] relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient emerald glow decoration */}
        <div className="absolute top-0 left-1/4 right-1/4 h-32 bg-emerald-500/10 blur-[80px] pointer-events-none rounded-full" />

        {/* Header (fixed) */}
        <div className="px-6 pr-[calc(1.5rem+env(safe-area-inset-right,0px))] pl-[calc(1.5rem+env(safe-area-inset-left,0px))] py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0 relative z-10 bg-white/[0.01]">
          <div className="flex items-center space-x-3">
            <div className="relative p-2.5 rounded-full bg-white/[0.04] border border-white/10 shrink-0">
              <Bell className="w-5 h-5 text-emerald-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-tight">Notifications</h2>
              <p className="text-[11px] text-gray-400 flex items-center gap-1 font-medium mt-0.5">
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full inline-block shrink-0 animate-pulse" />
                {unreadCount} unread
              </p>
            </div>
          </div>
          
          {/* Header Quick Controls */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="h-8 px-3 rounded-full text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-1 whitespace-nowrap active:scale-95 cursor-pointer"
                id="mark-all-read-btn"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
            <button 
              onClick={() => setShowConfirmClear(true)}
              className="h-8 w-8 rounded-full bg-white/[0.04] hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 text-gray-400 transition-all flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
              title="Clear all"
              id="clear-all-notifications-btn"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={onClose}
              className="h-11 w-11 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
              title="Close"
              id="close-notifications-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search and Filters (Sticky below header) */}
        <div className="px-6 py-4 space-y-3.5 flex-shrink-0 border-b border-white/[0.06] bg-[#000000]/40 relative z-20">
          {/* Search Bar - Sleek Glass Pill */}
          <div className="relative w-full h-11 rounded-full bg-white/[0.03] border border-white/10 flex items-center px-4 focus-within:border-emerald-500/30 transition-all focus-within:bg-white/[0.05] shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.02)]">
            <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
            <input 
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm placeholder-gray-500 text-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Pill Dropdown */}
            <div className="relative">
              <button
                id="filter-category-btn"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all bg-white/[0.03] border border-white/10 text-gray-300 hover:bg-white/[0.06] cursor-pointer"
              >
                <span>{categoryFilter === 'all' || showArchived ? 'All Categories' : (categoryFilter || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                <span className="text-[9px] opacity-60">▼</span>
              </button>

              {categoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setCategoryDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 w-48 bg-[#000000]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl py-1 z-40 overflow-hidden">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        id={`filter-category-item-${cat.id}`}
                        onClick={() => {
                          setCategoryFilter(cat.id as any);
                          setCategoryDropdownOpen(false);
                          setShowArchived(false); // Hide archived!
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                          categoryFilter === cat.id && !showArchived
                            ? 'bg-emerald-500/10 text-emerald-400 font-semibold' 
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {cat.id !== 'all' && (
                          <span className={categoryFilter === cat.id && !showArchived ? 'text-emerald-400' : 'text-gray-500'}>
                            {getCategoryIcon(cat.id as any)}
                          </span>
                        )}
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Unread Pill Toggle */}
            <button
              id="filter-unread-btn"
              onClick={() => {
                setShowUnreadOnly(!showUnreadOnly);
                setShowArchived(false); // Hide archived!
              }}
              className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showUnreadOnly && !showArchived
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'bg-white/[0.03] border border-white/10 text-gray-300 hover:bg-white/[0.06]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${showUnreadOnly && !showArchived ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              Unread
            </button>

            {/* Sorting Order Toggle Pill */}
            <button
              id="filter-sort-btn"
              onClick={() => {
                setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
                setShowArchived(false); // Hide archived!
              }}
              className="h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all bg-white/[0.03] border border-white/10 text-gray-300 hover:bg-white/[0.06] cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 opacity-60" />
              <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
            </button>

            {/* Archived Pill Toggle */}
            <button
              id="filter-archived-btn"
              onClick={() => {
                const targetState = !showArchived;
                setShowArchived(targetState);
                if (targetState) {
                  // Reset other filters so that user sees all archived notifications on toggle
                  setCategoryFilter('all');
                  setShowUnreadOnly(false);
                }
              }}
              className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showArchived
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'bg-white/[0.03] border border-white/10 text-gray-300 hover:bg-white/[0.06]'
              }`}
            >
              <Archive className="w-3.5 h-3.5 opacity-60" />
              <span>Archived ({archivedCount})</span>
            </button>
          </div>
        </div>

        {/* Content (scrolls independently) */}
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-none"
        >
          <AnimatePresence mode="popLayout">
            {!isReady ? (
              // Sleek high performance shimmer skeleton cards
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/5 rounded w-1/3" />
                        <div className="h-3 bg-white/5 rounded w-3/4" />
                        <div className="h-3 bg-white/5 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : totalCount === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center py-16 px-4"
              >
                {(preferences?.notifications?.master ?? true) === false ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                      <BellOff className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Notifications are paused</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                      You have turned off notifications in your settings. Re-enable them anytime in Notification Settings.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4 text-gray-500">
                      <Bell className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">You’re all caught up.</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed px-4">
                      We’ll notify you about deposits, withdrawals, referrals, membership progress, AI trading updates and important account activity.
                    </p>
                  </>
                )}
              </motion.div>
            ) : (
              <div className="space-y-6">
                {(Object.entries(filteredAndSorted) as [string, NotificationItem[]][]).map(([key, list], gIdx) => {
                  if (list.length === 0) return null;
                  return (
                    <div key={`group-${key}-${gIdx}`}>
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase px-6 py-3 tracking-wider">
                        {key}
                      </h3>
                      <div className="space-y-2.5">
                        {list.slice(0, visibleCount).map((not, idx) => {
                          const dateObj = new Date(not.date);
                          const exactTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          
                          return (
                            <NotificationRow
                              key={`notif-${not.id || 'n'}-${key}-${idx}`}
                              not={not}
                              isDark={isDark}
                              textPrimary={textPrimary}
                              textSecondary={textSecondary}
                              exactTime={exactTime}
                              onMarkRead={handleMarkRead}
                              onPin={handlePin}
                              onArchive={handleArchive}
                              onDelete={handleDelete}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Clear Confirmation Dialog */}
        <AnimatePresence>
          {showConfirmClear && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-[4px]"
            >
              <div className="p-6 rounded-2xl max-w-sm w-full border border-white/10 bg-[#000000] shadow-2xl text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 text-rose-500 mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Clear Activity History?</h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                  This will permanently delete all your activity history except for pinned items. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 py-2.5 rounded-full text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/15 transition-all active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      handleClearAll();
                      setShowConfirmClear(false);
                    }}
                    className="flex-1 py-2.5 rounded-full text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-all active:scale-95 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog for Single Archived Notification */}
        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-[4px]"
            >
              <div className="p-6 rounded-2xl max-w-sm w-full border border-white/10 bg-[#000000] shadow-2xl text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 text-rose-500 mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Delete Permanently?</h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                  This notification will be permanently deleted from your archive. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2.5 rounded-full text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/15 transition-all active:scale-95 cursor-pointer"
                    id="cancel-delete-confirm-btn"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const id = deleteConfirmId;
                      setLocalNotifications(prev => prev.filter(n => n.id !== id));
                      deleteNotification(id).catch(err => console.error("Error deleting", err));
                      setDeleteConfirmId(null);
                    }}
                    className="flex-1 py-2.5 rounded-full text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-all active:scale-95 cursor-pointer"
                    id="confirm-delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
