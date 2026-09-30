import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Share2, 
  RotateCw, 
  Clock, 
  Users, 
  Trophy, 
  CheckCircle2, 
  Sparkles, 
  Gift, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Award, 
  Coins, 
  Zap, 
  FileText, 
  HelpCircle, 
  Flame, 
  AlertCircle,
  Bookmark,
  Check,
  TrendingUp,
  Layers,
  Activity,
  Play,
  Image as ImageIcon
} from 'lucide-react';
import { EventItem } from '../../types/events';
import { getEffectiveParticipantCount } from '../../utils/eventEnrollmentSimulator';

import { joinEventService, claimEventRewardService, subscribeToEvents } from '../../services/eventsService';
import { useAuth } from '../../contexts/AuthContext';
import CampaignWalletModal from './CampaignWalletModal';

interface EventDetailsPageProps {
  eventId: string;
  onBack: () => void;
  onNavigateToTrading?: () => void;
  theme?: 'light' | 'dark';
}

function formatCountdownDetail(targetTimeStr?: string): { days: number; hours: number; mins: number; secs: number } {
  if (!targetTimeStr) return { days: 0, hours: 0, mins: 0, secs: 0 };
  const target = new Date(targetTimeStr).getTime();
  const diff = Math.max(0, target - Date.now());

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    secs: Math.floor((diff % (1000 * 60)) / 1000)
  };
}

export default function EventDetailsPage({
  eventId,
  onBack,
  onNavigateToTrading,
  theme = 'dark'
}: EventDetailsPageProps) {
  const { user } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ELIGIBILITY' | 'GUIDE' | 'PRIZES' | 'TIMELINE' | 'FAQS'>('OVERVIEW');
  const [isJoining, setIsJoining] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Requirement task toggles
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  // Countdown clock state
  const [countdown, setCountdown] = useState(formatCountdownDetail(event?.endTime));
  const [runtimeTick, setRuntimeTick] = useState(0);

  useEffect(() => {
    const ticker = setInterval(() => setRuntimeTick(t => t + 1), 5000);
    return () => clearInterval(ticker);
  }, []);

  const simulatedParts = event ? getEffectiveParticipantCount(event, runtimeTick) : { count: 0, max: 100000, percentage: 45, formattedCount: '0', formattedMax: '100,000' };

  // Subscribe to real-time event updates
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToEvents(
      (eventsList) => {
        setAllEvents(eventsList);
        const found = eventsList.find(e => e.id === eventId);
        if (found) {
          setEvent(found);
          setError(null);

          // Populate completed tasks from event requirements
          const initialTasks: Record<string, boolean> = {};
          found.eligibilityRequirements?.forEach(req => {
            initialTasks[req.id] = req.completed;
          });
          setCompletedTasks(prev => ({ ...initialTasks, ...prev }));
        } else {
          setError("Event not found or has been removed.");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading event details:", err);
        setError("Unable to sync live event data.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [eventId]);

  // Real-time countdown timer tick
  useEffect(() => {
    if (!event) return;
    const target = event.status === 'UPCOMING' ? event.startTime : event.endTime;
    setCountdown(formatCountdownDetail(target));

    const interval = setInterval(() => {
      setCountdown(formatCountdownDetail(target));
    }, 1000);

    return () => clearInterval(interval);
  }, [event]);

  // Trigger loading state for a moment, then open the Wallet Address Modal
  const handleJoin = async () => {
    if (!event) return;
    setIsJoining(true);
    try {
      // Brief loading indicator to verify account eligibility before prompting address
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowWalletModal(true);
    } catch (e) {
      console.error("Failed preparing registration modal", e);
    } finally {
      setIsJoining(false);
    }
  };

  // Called when user completes and saves their wallet address inside the modal
  const handleSaveWalletAndRegister = async (walletAddress: string, network: string) => {
    if (!event) return;
    try {
      const newPart = await joinEventService(user?.uid, event.id, {
        walletAddress,
        network,
        registeredToken: event.rewardToken
      });

      setEvent(prev => prev ? {
        ...prev,
        userProgress: newPart,
        participantCount: (prev.participantCount || 0) + 1
      } : null);

      setToastMsg(`Successfully registered! Payout wallet saved on ${network}.`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (e) {
      console.error("Failed saving event registration", e);
      throw e;
    }
  };

  const handleClaim = async () => {
    if (!event) return;
    setIsClaiming(true);
    try {
      const res = await claimEventRewardService(user?.uid, event);
      setEvent(prev => prev ? {
        ...prev,
        userProgress: res
      } : null);
      setToastMsg(`Claimed reward successfully! Credited to your wallet balance.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e) {
      console.error("Failed to claim reward", e);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event?.title || 'Aver Promotion',
        text: event?.subtitle || 'Check out this campaign on Aver!',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setToastMsg("Campaign link copied to clipboard!");
      setTimeout(() => setToastMsg(null), 2500);
    }
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] bg-[#03060D] text-white flex flex-col items-center justify-center space-y-4 p-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
          <div className="w-16 h-16 rounded-full border-2 border-t-emerald-400 border-r-cyan-400 border-b-purple-400 border-l-transparent animate-spin" />
        </div>
        <p className="text-sm font-extrabold tracking-widest text-emerald-400 uppercase">Synchronizing Campaign Telemetry...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="fixed inset-0 z-[110] bg-[#03060D] text-white flex flex-col items-center justify-center space-y-6 p-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-xl font-black mb-2">{error || "Campaign Not Found"}</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">The requested campaign does not exist or may have been archived by the system.</p>
          <button 
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all border border-white/10"
          >
            ← Return to Campaign Hub
          </button>
        </div>
      </div>
    );
  }

  const isJoined = event.userProgress?.joined || event.userProgress?.status === 'REGISTERED' || event.userProgress?.status === 'IN_PROGRESS';
  const isClaimed = event.userProgress?.status === 'CLAIMED';
  const userStatus = event.userProgress?.status || 'NOT_JOINED';
  const hasEnded = event.status === 'COMPLETED' || (event.endTime && new Date(event.endTime).getTime() <= Date.now());

  // Calculate requirement completion stats
  const totalTasks = event.eligibilityRequirements?.length || 0;
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 100;

  return (
    <div className="fixed inset-0 z-[110] bg-[#03060D] text-slate-100 overflow-y-auto selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] px-5 py-3 rounded-2xl bg-emerald-500/90 text-white font-black text-xs shadow-2xl backdrop-blur-md border border-emerald-400/40 flex items-center gap-2.5"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FIXED TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#03060D]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all group"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Telemetry
          </span>
          <span className="text-xs font-black text-slate-300 truncate max-w-[160px] sm:max-w-xs">{event.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isBookmarked ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
            }`}
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* HERO BANNER STAGE */}
      <div className="relative w-full min-h-[400px] sm:min-h-[480px] flex items-end overflow-hidden border-b border-white/10">
        
        {/* Background Image with Dark Gradient Vignette */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ backgroundImage: `url('${event.bannerUrl}')` }}
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${event.heroGradient || 'from-[#03060D] via-[#03060D]/80 to-transparent'}`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-transparent via-[#03060D]/60 to-[#03060D]" />

        {/* Hero Content Overlay Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-6">
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {event.category}
            </span>
            <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border ${
              event.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              event.status === 'ENDING_SOON' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
              event.status === 'UPCOMING' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
            }`}>
              {event.status === 'LIVE' ? '🔴 Live Competition' : event.status === 'ENDING_SOON' ? '⚡ Ending Soon' : event.status}
            </span>
            {event.featured && (
              <span className="px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                Featured Flagship
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            
            {/* Title & Narrative (8 Cols) */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center gap-3">
                {event.logoUrl && (
                  <img src={event.logoUrl} alt="Campaign Logo" className="w-12 h-12 rounded-2xl object-cover border border-white/20 shadow-lg bg-slate-800 shrink-0" />
                )}
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  {event.title}
                </h1>
              </div>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl font-medium leading-relaxed">
                {event.subtitle}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {event.tags?.map((tag, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-bold text-slate-400">
                    #{tag}
                  </span>
                ))}
                {event.targetAudience && (
                  <span className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-[11px] font-bold text-purple-300">
                    Audience: {event.targetAudience}
                  </span>
                )}
              </div>
            </div>

            {/* Total Reward Hero Card (4 Cols) */}
            <div className="lg:col-span-4 bg-slate-900/80 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reward Pool</span>
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 tracking-tight">
                  ${(event?.totalRewardPool || 0).toLocaleString()} <span className="text-lg text-amber-200">{event?.rewardToken || 'USDT'}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Guaranteed distribution directly to participant wallets</p>
              </div>

              {/* Countdown Meter */}
              <div className="pt-3 border-t border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>{event.status === 'UPCOMING' ? 'Event Starts In' : 'Event Closes In'}</span>
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white/5 border border-white/10 p-2 rounded-xl">
                    <span className="text-base font-black text-white block">{String(countdown.days).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Days</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2 rounded-xl">
                    <span className="text-base font-black text-white block">{String(countdown.hours).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Hours</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2 rounded-xl">
                    <span className="text-base font-black text-white block">{String(countdown.mins).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Mins</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2 rounded-xl">
                    <span className="text-base font-black text-emerald-400 block">{String(countdown.secs).padStart(2, '0')}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Secs</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* USER PARTICIPATION BAR */}
      <div className="bg-slate-900/90 border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              isClaimed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
              isJoined ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-white/5 text-slate-400 border-white/10'
            }`}>
              {isClaimed ? <CheckCircle2 className="w-6 h-6" /> : isJoined ? <CheckCircle2 className="w-6 h-6" /> : <Flame className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-400">Participation Status</p>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                  isClaimed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  isJoined ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isClaimed ? 'Reward Claimed' : isJoined ? 'Already Registered' : 'Not Registered'}
                </span>
              </div>
              <div className="text-sm font-black text-white mt-0.5">
                {isClaimed ? (
                  `Received ${event.userProgress?.claimedAmount || 250} ${event.rewardToken}`
                ) : isJoined ? (
                  event.userProgress?.walletAddress ? (
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-300 font-medium">Payout Wallet:</span>
                      <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
                        {event.userProgress.walletAddress.slice(0, 6)}...{event.userProgress.walletAddress.slice(-4)}
                      </span>
                      <span className="text-slate-400 text-xs font-normal">({event.userProgress.network || event.rewardToken})</span>
                    </span>
                  ) : (
                    'Registration active. Complete requirements below.'
                  )
                ) : hasEnded ? (
                  'This campaign has ended. Registration is closed.'
                ) : (
                  'Join this campaign to reserve your prize pool allocation.'
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isClaimed ? (
              <button disabled className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-extrabold text-xs border border-emerald-500/30 flex items-center justify-center gap-2 cursor-not-allowed select-none">
                <Check className="w-4 h-4" /> Claimed
              </button>
            ) : isJoined ? (
              completionPercentage >= 100 ? (
                <button 
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isClaiming ? <RotateCw className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  <span>Claim Reward Share</span>
                </button>
              ) : (
                <button 
                  disabled
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 text-slate-400 font-extrabold text-xs border border-white/10 cursor-not-allowed flex items-center justify-center gap-2 select-none"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  <span>Already Registered</span>
                </button>
              )
            ) : hasEnded ? (
              <button disabled className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 text-slate-500 font-extrabold text-xs border border-white/5 flex items-center justify-center gap-2 cursor-not-allowed select-none">
                Ended
              </button>
            ) : (
              <button 
                id="register-for-campaign-btn"
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black text-xs transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
              >
                {isJoining ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Qualification...</span>
                  </>
                ) : (
                  <>
                    <span>{event.status === 'UPCOMING' ? 'Pre-Register for Event' : (event.ctaText || 'Register for Campaign')}</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* MAIN BODY CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 pb-28">
        
        {/* INTERACTIVE NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/10">
          {[
            { id: 'OVERVIEW', label: 'Overview & Rewards', icon: Trophy },
            { id: 'ELIGIBILITY', label: `Eligibility & Tasks (${completedCount}/${totalTasks})`, icon: CheckCircle2 },
            { id: 'GUIDE', label: 'Step Guide', icon: Layers },
            { id: 'PRIZES', label: 'Prize Breakdown', icon: Award },
            { id: 'TIMELINE', label: 'Campaign Timeline', icon: Clock },
            { id: 'FAQS', label: 'FAQs & Rules', icon: HelpCircle }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <AnimatePresence mode="wait">
          {activeTab === 'OVERVIEW' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Reward Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {event.rewardCards?.map((card, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">{card.title}</p>
                    <p className="text-xl font-black text-white">{card.amount}</p>
                    <p className="text-[11px] text-slate-400">{card.subtext}</p>
                  </div>
                ))}
              </div>

              {/* Campaign Narrative */}
              <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Campaign Overview & Rules
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                  {event.overview}
                </p>
              </div>

              {/* Promotional Video if configured */}
              {event.promoVideoUrl && (
                <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Play className="w-5 h-5 text-emerald-400" />
                    Campaign Promotional Video
                  </h3>
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-black/60 border border-white/10">
                    {event.promoVideoUrl.includes('youtube.com') || event.promoVideoUrl.includes('youtu.be') ? (
                      <iframe
                        src={event.promoVideoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                        title="Campaign Promo Video"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={event.promoVideoUrl} controls className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              )}

              {/* Gallery Images if configured */}
              {event.galleryImages && event.galleryImages.length > 0 && (
                <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                    Campaign Media Gallery
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {event.galleryImages.map((imgUrl, idx) => (
                      <div key={idx} className="rounded-2xl overflow-hidden border border-white/10 h-36 bg-slate-800">
                        <img src={imgUrl} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Participant Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-3xl bg-slate-900/40 border border-white/10">
                <div>
                  <p className="text-xs font-bold text-slate-400">Total Participants</p>
                  <p className="text-xl font-black text-white mt-1">{simulatedParts.formattedCount}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">Capacity Limit</p>
                  <p className="text-xl font-black text-white mt-1">{event.maxParticipants ? event.maxParticipants.toLocaleString() : simulatedParts.formattedMax}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">Reward Currency</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">{event.rewardToken}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">Verification Protocol</p>
                  <p className="text-xl font-black text-cyan-400 mt-1">Automated AI</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ELIGIBILITY' && (
            <motion.div
              key="eligibility"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-white">Requirement Verification Checklist</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Complete all requirements to qualify for direct reward settlement.</p>
                  </div>
                  <span className="text-sm font-black text-emerald-400">{completionPercentage}% Completed</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
                </div>

                {/* Requirements list */}
                <div className="space-y-3 pt-2">
                  {event.eligibilityRequirements?.map((req) => {
                    const isDone = completedTasks[req.id];
                    return (
                      <div 
                        key={req.id}
                        onClick={() => toggleTask(req.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isDone 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-white' 
                            : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                            isDone ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'border-slate-500'
                          }`}>
                            {isDone && <Check className="w-4 h-4 font-black" />}
                          </div>
                          <span className="text-xs font-bold">{req.title}</span>
                        </div>

                        {req.requiredAction && onNavigateToTrading && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToTrading();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[11px] font-extrabold border border-emerald-500/30 flex items-center gap-1"
                          >
                            <span>{req.requiredAction}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'GUIDE' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {event.stepGuide?.map((step) => (
                <div key={step.stepNumber} className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                    {step.stepNumber}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{step.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'PRIZES' && (
            <motion.div
              key="prizes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="rounded-3xl overflow-hidden border border-white/10 bg-slate-900/60">
                <div className="grid grid-cols-12 bg-white/5 p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">
                  <div className="col-span-4">Rank Tier</div>
                  <div className="col-span-5">Reward Allocation</div>
                  <div className="col-span-3 text-right">Pool Share</div>
                </div>
                <div className="divide-y divide-white/5">
                  {event.prizeBreakdown?.map((tier, idx) => (
                    <div key={idx} className="grid grid-cols-12 p-4 text-xs font-bold items-center hover:bg-white/[0.02]">
                      <div className="col-span-4 flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          tier.badge === 'gold' ? 'bg-amber-400' :
                          tier.badge === 'platinum' ? 'bg-slate-300' :
                          tier.badge === 'bronze' ? 'bg-amber-700' : 'bg-cyan-400'
                        }`} />
                        <span className="text-white">{tier.rankRange}</span>
                      </div>
                      <div className="col-span-5 text-emerald-400 font-extrabold">{tier.reward}</div>
                      <div className="col-span-3 text-right text-slate-400">{tier.percentage}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'TIMELINE' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {event.timeline?.map((stage, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-start space-x-4">
                  <span className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                    stage.status === 'COMPLETED' ? 'bg-emerald-400' :
                    stage.status === 'ACTIVE' ? 'bg-amber-400 animate-ping' : 'bg-slate-600'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{stage.title}</h4>
                      <span className="text-[10px] font-extrabold text-slate-400">{stage.dateRange}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{stage.description}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'FAQS' && (
            <motion.div
              key="faqs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">Frequently Asked Questions</h3>
                {event.faqs?.map((faq, idx) => {
                  const isOpen = expandedFaqIndex === idx;
                  return (
                    <div key={idx} className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden">
                      <button
                        onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4 text-left font-bold text-xs text-white flex justify-between items-center"
                      >
                        <span>{faq.question}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Terms */}
              <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Terms & Conditions</h3>
                <ul className="space-y-2 list-disc list-inside text-xs text-slate-400 leading-relaxed">
                  {event.terms?.map((term, idx) => (
                    <li key={idx}>{term}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RELATED CAMPAIGNS ROW */}
        {allEvents.filter(e => e.id !== event.id).length > 0 && (
          <div className="pt-8 border-t border-white/10 space-y-4">
            <h3 className="text-lg font-black text-white">Explore Other Active Campaigns</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {allEvents.filter(e => e.id !== event.id).slice(0, 3).map((rel) => (
                <div 
                  key={rel.id}
                  onClick={() => {
                    setEvent(rel);
                    setActiveTab('OVERVIEW');
                  }}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer group"
                >
                  <p className="text-[10px] font-extrabold text-emerald-400 uppercase">{rel.category}</p>
                  <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors mt-0.5 truncate">{rel.title}</h4>
                  <p className="text-xs font-bold text-amber-400 mt-2">${(rel?.totalRewardPool || 0).toLocaleString()} {rel?.rewardToken || 'USDT'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* CAMPAIGN WALLET REGISTRATION POPUP MODAL */}
      {showWalletModal && (
        <CampaignWalletModal 
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          event={event}
          onSave={handleSaveWalletAndRegister}
          savedWallet={event.userProgress?.walletAddress || (user as any)?.walletAddress || ''}
        />
      )}

    </div>
  );
}
