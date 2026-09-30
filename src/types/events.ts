export type EventCategory = 
  | 'Trading Competition' 
  | 'Airdrop Sprint' 
  | 'Staking & Yield' 
  | 'VIP Quest' 
  | 'New Listing'
  | 'Special Event';

export type EventStatus = 'LIVE' | 'UPCOMING' | 'ENDING_SOON' | 'COMPLETED' | 'PAUSED' | 'ARCHIVED';

export type UserParticipationStatus = 'NOT_JOINED' | 'REGISTERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED';

export interface RewardCard {
  title: string;
  amount: string;
  subtext: string;
  iconName: 'trophy' | 'coins' | 'sparkles' | 'award' | 'zap' | 'gift';
}

export interface EligibilityRequirement {
  id: string;
  title: string;
  completed: boolean;
  requiredAction?: string;
  actionType?: 'kyc' | 'deposit' | 'trade' | 'quiz' | 'referral';
}

export interface StepGuideItem {
  stepNumber: number;
  title: string;
  description: string;
  actionLabel?: string;
}

export interface PrizeTier {
  rankRange: string;
  reward: string;
  percentage: string;
  badge?: 'gold' | 'platinum' | 'bronze' | 'diamond' | 'vip';
}

export interface TimelineStage {
  title: string;
  dateRange: string;
  status: 'COMPLETED' | 'ACTIVE' | 'UPCOMING';
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface UserEventProgress {
  joined: boolean;
  registeredAt?: string;
  walletAddress?: string;
  network?: string;
  registeredToken?: string;
  completedPercentage: number;
  currentVolume: number;
  targetVolume: number;
  rank?: number;
  claimedAmount?: number;
  status: UserParticipationStatus;
}

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  category: EventCategory;
  status: EventStatus;
  bannerUrl: string;
  heroGradient: string;
  accentColor: string;
  totalRewardPool: number;
  rewardToken: string;
  featured?: boolean;
  rewardCards: RewardCard[];
  startTime: string; // ISO String
  endTime: string;   // ISO String
  participantCount: number;
  maxParticipants?: number;
  overview: string;
  eligibilityRequirements: EligibilityRequirement[];
  stepGuide: StepGuideItem[];
  prizeBreakdown: PrizeTier[];
  timeline: TimelineStage[];
  terms: string[];
  faqs: FAQItem[];
  tags: string[];
  coverImageUrl?: string;
  desktopBannerUrl?: string;
  mobileBannerUrl?: string;
  logoUrl?: string;
  promoVideoUrl?: string;
  galleryImages?: string[];
  brandColor?: string;
  ctaText?: string;
  ctaLink?: string;
  targetAudience?: string;
  timezone?: string;
  sendPush?: boolean;
  sendEmail?: boolean;
  inAppBanner?: boolean;
  notificationMessage?: string;
  userProgress?: UserEventProgress;
  createdAt?: string;
  updatedAt?: string;
}

export function computeRealtimeEventStatus(event: Partial<EventItem>): EventStatus {
  if (event.status === 'PAUSED') return 'PAUSED';
  if (event.status === 'ARCHIVED') return 'ARCHIVED';

  if (!event.startTime || !event.endTime) {
    return event.status || 'LIVE';
  }

  const now = Date.now();
  const start = new Date(event.startTime).getTime();
  const end = new Date(event.endTime).getTime();

  if (now < start) {
    return 'UPCOMING';
  } else if (now >= start && now <= end) {
    const hoursLeft = (end - now) / (1000 * 60 * 60);
    if (hoursLeft <= 24 && hoursLeft > 0) {
      return 'ENDING_SOON';
    }
    return 'LIVE';
  } else {
    return 'COMPLETED';
  }
}
