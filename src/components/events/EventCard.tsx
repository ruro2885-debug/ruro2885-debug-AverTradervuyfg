import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Clock, 
  Trophy, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Flame, 
  Zap, 
  Gift 
} from 'lucide-react';
import { EventItem } from '../../types/events';
import { getEffectiveParticipantCount } from '../../utils/eventEnrollmentSimulator';


interface EventCardProps {
  key?: string | number;
  event: EventItem;
  onSelect: (event: EventItem) => void;
  onJoin?: (event: EventItem, e: React.MouseEvent) => void;
  onClaim?: (event: EventItem, e: React.MouseEvent) => void;
  theme?: 'light' | 'dark';
}

function formatCountdown(targetTimeStr: string): string {
  const target = new Date(targetTimeStr).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return '00d 00h 00m 00s';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
}

export default function EventCard({
  event,
  onSelect,
  onJoin,
  onClaim,
  theme = 'dark'
}: EventCardProps) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState<string>('');

  const targetDate = event.status === 'UPCOMING' ? event.startTime : event.endTime;

  useEffect(() => {
    setTimeLeft(formatCountdown(targetDate));
    const timer = setInterval(() => {
      setTimeLeft(formatCountdown(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate, event.status]);

  const isJoined = event.userProgress?.joined || event.userProgress?.status === 'REGISTERED' || event.userProgress?.status === 'IN_PROGRESS';
  const isClaimed = event.userProgress?.status === 'CLAIMED';
  const hasEnded = event.status === 'COMPLETED' || (event.endTime && new Date(event.endTime).getTime() <= Date.now());

  const [runtimeTick, setRuntimeTick] = useState(0);
  useEffect(() => {
    const ticker = setInterval(() => setRuntimeTick(t => t + 1), 6000);
    return () => clearInterval(ticker);
  }, []);

  const simulatedParts = getEffectiveParticipantCount(event, runtimeTick);
  const progressPercent = simulatedParts.percentage;

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={() => onSelect(event)}
      className={`group relative flex flex-col rounded-3xl border overflow-hidden cursor-pointer transition-all ${
        isDark 
          ? 'bg-[#0E121B]/90 border-gray-800/80 hover:border-purple-500/50 hover:shadow-[0_12px_40px_rgba(139,92,246,0.15)]' 
          : 'bg-white border-gray-200/80 hover:border-purple-300 hover:shadow-2xl'
      }`}
    >
      {/* Top Banner & Artwork */}
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          src={event.bannerUrl} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${event.heroGradient || 'from-[#0E121B] via-[#0E121B]/40 to-transparent'}`} />

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          {/* Category Pill */}
          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5 shadow-lg">
            {event.category}
          </span>

          {/* Dynamic Status Badge */}
          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase backdrop-blur-md flex items-center gap-1.5 shadow-lg border ${
            event.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
            event.status === 'ENDING_SOON' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' :
            event.status === 'UPCOMING' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
            event.status === 'PAUSED' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
            'bg-gray-800/80 text-gray-400 border-gray-700'
          }`}>
            {event.status === 'LIVE' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
            {event.status === 'ENDING_SOON' && <Flame className="w-3 h-3 text-amber-400" />}
            {event.status === 'LIVE' ? 'LIVE NOW' : (event.status ? event.status.replace(/_/g, ' ') : 'UPCOMING')}
          </span>
        </div>

        {/* Prize Pool Tag on Banner */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-300 block">
              Total Prize Pool
            </span>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1 text-shadow">
              ${(event?.totalRewardPool || 0).toLocaleString()}
              <span className="text-xs font-extrabold text-amber-400">{event?.rewardToken || 'USDT'}</span>
            </span>
          </div>

          {/* Live Timer Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-right">
            <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 block flex items-center justify-end gap-1">
              <Clock className="w-2.5 h-2.5 text-purple-400" />
              {event.status === 'UPCOMING' ? 'Starts In' : 'Ends In'}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {timeLeft || '00:00:00'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className={`text-base font-black tracking-tight group-hover:text-purple-400 transition-colors line-clamp-1 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {event.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed font-medium">
            {event.subtitle}
          </p>
        </div>

        {/* Key Reward Cards Snippet */}
        {event.rewardCards && event.rewardCards.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {event.rewardCards.slice(0, 2).map((rc, idx) => (
              <div 
                key={idx}
                className={`p-2.5 rounded-2xl border ${
                  isDark ? 'bg-gray-900/50 border-gray-800/80' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 truncate">
                    {rc.title}
                  </span>
                </div>
                <div className={`text-xs font-black mt-0.5 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {rc.amount}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Participant Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
            <span className="text-gray-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              {simulatedParts.formattedCount} Joined
            </span>
            <span className="text-gray-400">
              {progressPercent}% Cap
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-800/80 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Interactive Functional CTA Button */}
        <div className="pt-2 border-t border-gray-800/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {event.tags && event.tags.slice(0, 2).map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-800/60 text-gray-300">
                #{tag}
              </span>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasEnded) return;
              if (isClaimed) {
                onSelect(event);
              } else if (isJoined && onClaim) {
                onClaim(event, e);
              } else if (!isJoined && onJoin) {
                onJoin(event, e);
              } else {
                onSelect(event);
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md ${
              isClaimed 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' :
              hasEnded
                ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed' :
              isJoined 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-amber-500/20' :
              event.status === 'LIVE' || event.status === 'ENDING_SOON'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30' :
              event.status === 'UPCOMING'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30' :
                'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {isClaimed ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Claimed
              </>
            ) : hasEnded ? (
              <>
                Ended
              </>
            ) : isJoined ? (
              <>
                <Gift className="w-3.5 h-3.5" />
                Claim Reward
              </>
            ) : event.status === 'UPCOMING' ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                Pre-Register
              </>
            ) : (
              <>
                Join Now
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
