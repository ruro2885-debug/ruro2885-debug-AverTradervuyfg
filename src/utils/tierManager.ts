import { safeStorage } from './storage';

export type TierId = 'bronze' | 'platinum' | 'gold';

export interface TierInfo {
  id: TierId;
  name: string;
  badge: string; // e.g. '🥉', '🥈', '🥇'
  shortName: string;
  fees: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  badgeGlow: string;
  requirements: string;
  benefits: string[];
}

export interface TaskItem {
  id: string;
  tierId: TierId;
  title: string;
  progress: number;
  increment: number;
  status: 'pending' | 'completed' | 'locked' | 'unlocked';
  iconKey: 'check' | 'shield' | 'wallet' | 'trade' | 'users' | 'copy' | 'cpu' | 'sparkles';
  actionLabel: string;
  customAction?: 'deposit' | 'profile' | 'verify_email' | 'enable_2fa' | 'kyc' | 'deposit_1000' | 'trade_500' | 'copy_10' | 'strat_2' | 'claim_welcome';
  targetTab?: string;
  description: string;
  requirements?: { label: string; done: boolean }[];
  isMission?: boolean;
}

export const TIERS_DATA: Record<TierId, TierInfo> = {
  bronze: {
    id: 'bronze',
    name: 'Bronze Member',
    shortName: 'Bronze',
    badge: '🥉',
    fees: '0.1%',
    color: 'from-orange-700 via-orange-600 to-amber-700',
    badgeBg: 'bg-gradient-to-r from-[#cd7f32]/20 to-[#cd7f32]/5 hover:from-[#cd7f32]/30 hover:to-[#cd7f32]/10',
    badgeText: 'text-[#e6a865]',
    badgeBorder: 'border-[#cd7f32]/30',
    badgeGlow: 'shadow-[0_0_15px_rgba(205,127,50,0.15)]',
    requirements: 'Default Entry Tier',
    benefits: [
      'Beginner trading badge',
      'Small cashback on selected fees',
      'Access to beginner campaigns',
      'Referral rewards',
      'Welcome promotions'
    ]
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum Member',
    shortName: 'Platinum',
    badge: '🥈',
    fees: '0.08%',
    color: 'from-slate-400 via-slate-300 to-zinc-400',
    badgeBg: 'bg-gradient-to-r from-slate-300/20 to-slate-400/5 hover:from-slate-300/30 hover:to-slate-400/10',
    badgeText: 'text-slate-200',
    badgeBorder: 'border-slate-300/40',
    badgeGlow: 'shadow-[0_0_15px_rgba(203,213,225,0.25)]',
    requirements: 'Complete Bronze progression',
    benefits: [
      'Lower trading fees (0.08%)',
      'Faster withdrawals',
      'Priority support queue',
      'Higher referral rewards',
      'Monthly bonus events',
      'Higher daily limits'
    ]
  },
  gold: {
    id: 'gold',
    name: 'Gold Member',
    shortName: 'Gold',
    badge: '🥇',
    fees: '0.05%',
    color: 'from-yellow-500 via-amber-400 to-yellow-600',
    badgeBg: 'bg-gradient-to-r from-amber-400/20 to-yellow-500/5 hover:from-amber-400/30 hover:to-yellow-500/10',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-400/40',
    badgeGlow: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    requirements: 'Complete Platinum progression',
    benefits: [
      'Lowest trading fees (0.05%)',
      'VIP support manager',
      'Exclusive high-yield campaigns',
      'Premium market reports',
      'Highest referral commission',
      'Highest withdrawal limits',
      'Early access to new features'
    ]
  }
};

export function getTierState(user: any, session?: any) {
  const uid = user?.uid || '';
  // 1. Evaluate Bronze Tasks
  const isEmailVerified = !!user?.emailVerified || 
    (uid ? safeStorage.getItem(`aver_email_verified_${uid}`) === 'true' : false);

  const isTwoFactorEnabled = (uid ? safeStorage.getItem(`aver_twoFactorEnabled_${uid}`) === 'true' : false) || 
    !!user?.preferences?.twoFactorEnabled || 
    !!user?.twoFactorEnabled;

  const isDeposited = (user?.totalDeposits || 0) > 0 || (user?.deposits?.length || 0) > 0;
  const isKycVerified = user?.kycStatus === 'verified' || 
    (uid ? safeStorage.getItem(`aver_kyc_verified_${uid}`) === 'true' : false);
  const isKycPending = user?.kycStatus === 'pending' ||
    (uid ? safeStorage.getItem(`aver_kyc_active_status_${uid}`) === 'pending' : false);

  const tradesCount = user?.trades?.length || user?.aiTradesCount || 0;
  const isTraded = (tradesCount > 0 || (session?.status === 'ACTIVE' && (session?.tradingCapital || 0) > 0)) && isDeposited;
  const referralCount = user?.referralCount || 0;

  let bronzeXP = 0;
  if (isEmailVerified) bronzeXP += 20;
  if (isTwoFactorEnabled) bronzeXP += 25;
  if (isDeposited) bronzeXP += 25;
  if (isKycVerified) bronzeXP += 35;
  if (isTraded) bronzeXP += 15;
  if (referralCount > 0) bronzeXP += 15;

  const isBronzeComplete = bronzeXP >= 100 || 
    (uid ? safeStorage.getItem(`aver_bronze_completed_${uid}`) === 'true' : false) || 
    user?.membershipTier === 'platinum' || 
    user?.membershipTier === 'gold';

  // 2. Evaluate Platinum Tasks
  const deposit1000Done = (user?.totalDeposits || 0) >= 1000 || 
    user?.deposits?.some((d: any) => d.amount >= 1000) || 
    (uid ? safeStorage.getItem(`aver_task_deposit_1000_${uid}`) === 'true' : false);

  const trade500Done = (((session?.initialCapital || 0) >= 500 || (session?.tradingCapital || 0) >= 500) && isDeposited) || 
    user?.trades?.some((t: any) => (t.amountUsd || t.quantity * (t.entry || 1)) >= 500) || 
    (uid ? safeStorage.getItem(`aver_task_trade_500_${uid}`) === 'true' : false);

  const copyTradingCount = (user?.copyTradingCount || 0) + parseInt(uid ? (safeStorage.getItem(`aver_copy_trades_count_${uid}`) || '0') : '0', 10);
  const copy10Done = copyTradingCount >= 10 || 
    (uid ? safeStorage.getItem(`aver_task_copy_10_${uid}`) === 'true' : false);

  const usedStrategiesCount = (user?.usedStrategiesCount || 0) + parseInt(uid ? (safeStorage.getItem(`aver_used_strategies_count_${uid}`) || '0') : '0', 10);
  const strat2Done = usedStrategiesCount >= 2 || 
    (uid ? safeStorage.getItem(`aver_task_strat_2_${uid}`) === 'true' : false);

  let platinumXP = 0;
  if (deposit1000Done) platinumXP += 25;
  if (trade500Done) platinumXP += 25;
  if (copy10Done) platinumXP += 25;
  if (strat2Done) platinumXP += 25;

  const isPlatinumComplete = platinumXP >= 100 || 
    (uid ? safeStorage.getItem(`aver_platinum_completed_${uid}`) === 'true' : false) || 
    user?.membershipTier === 'gold';

  // Determine current active tier
  let currentTierId: TierId = 'bronze';
  let progress = Math.min(100, Math.floor((bronzeXP / 100) * 100));

  if (isPlatinumComplete) {
    currentTierId = 'gold';
    progress = 100;
  } else if (isBronzeComplete) {
    currentTierId = 'platinum';
    // Strictly calculate progress from completed Platinum tasks ONLY
    progress = Math.min(100, platinumXP);
  }

  const currentTier = TIERS_DATA[currentTierId];
  const nextTierId: TierId | null = currentTierId === 'bronze' ? 'platinum' : currentTierId === 'platinum' ? 'gold' : null;
  const nextTier = nextTierId ? TIERS_DATA[nextTierId] : null;

  // Candidate Bronze Tasks
  const bronzeTasks: TaskItem[] = [
    {
      id: 'email_verify',
      tierId: 'bronze',
      title: 'Verify Email Address',
      progress: isEmailVerified ? 100 : 0,
      increment: 20,
      status: isEmailVerified ? 'completed' : 'pending',
      iconKey: 'check',
      actionLabel: isEmailVerified ? 'Verified' : 'Verify Email',
      customAction: 'verify_email',
      description: 'Verify your email address to secure your account and unlock trading notifications and bonus rewards.'
    },
    {
      id: '2fa',
      tierId: 'bronze',
      title: 'Enable 2FA Authenticator',
      progress: isTwoFactorEnabled ? 100 : 0,
      increment: 25,
      status: isTwoFactorEnabled ? 'completed' : 'pending',
      iconKey: 'shield',
      actionLabel: isTwoFactorEnabled ? 'Enabled' : 'Enable 2FA',
      customAction: 'enable_2fa',
      description: 'Secure your account with an Authenticator app. Enter a 6-character code.'
    },
    {
      id: 'deposit',
      tierId: 'bronze',
      title: 'First Deposit',
      progress: isDeposited ? 100 : 0,
      increment: 25,
      status: isDeposited ? 'completed' : 'pending',
      iconKey: 'wallet',
      actionLabel: isDeposited ? 'Deposited' : 'Deposit',
      customAction: 'deposit',
      description: 'Fund your trading wallet with cryptocurrency or fiat.'
    },
    {
      id: 'kyc',
      tierId: 'bronze',
      title: 'Identity Verification (KYC)',
      progress: isKycVerified ? 100 : 0,
      increment: 35,
      status: isKycVerified ? 'completed' : isKycPending ? 'pending' : 'unlocked',
      iconKey: 'shield',
      actionLabel: isKycVerified ? 'Verified' : isKycPending ? 'Under Review' : 'Verify ID',
      customAction: 'kyc',
      description: isKycPending 
        ? 'Your KYC documents are currently being audited by compliance (24–48 hours).' 
        : 'Complete KYC Tier-1 verification to unlock high limit withdrawals.'
    },
    {
      id: 'trade',
      tierId: 'bronze',
      title: 'First Trade',
      progress: isTraded ? 100 : 0,
      increment: 15,
      status: isTraded ? 'completed' : 'pending',
      iconKey: 'trade',
      actionLabel: isTraded ? 'Traded' : 'Trade',
      targetTab: 'ai',
      description: 'Execute your first crypto trade on our trading engine.'
    },
    {
      id: 'referral',
      tierId: 'bronze',
      title: 'Invite Friends',
      progress: referralCount > 0 ? 100 : 0,
      increment: 15,
      status: referralCount > 0 ? 'completed' : 'pending',
      iconKey: 'users',
      actionLabel: referralCount > 0 ? 'Invited' : 'Invite',
      customAction: 'profile',
      description: 'Share your referral code to earn commission and progress bonuses.'
    }
  ];

  // Candidate Platinum Tasks
  const platinumTasks: TaskItem[] = [
    {
      id: 'deposit_1000',
      tierId: 'platinum',
      title: 'Deposit $1000',
      progress: deposit1000Done ? 100 : 0,
      increment: 25,
      status: deposit1000Done ? 'completed' : 'pending',
      iconKey: 'wallet',
      actionLabel: deposit1000Done ? 'Completed' : 'Deposit $1000',
      customAction: 'deposit_1000',
      description: 'Deposit $1,000 or more into your account to qualify for Platinum rewards.'
    },
    {
      id: 'trade_500',
      tierId: 'platinum',
      title: 'Trade $500 in one session',
      progress: trade500Done ? 100 : 0,
      increment: 25,
      status: trade500Done ? 'completed' : 'pending',
      iconKey: 'trade',
      actionLabel: trade500Done ? 'Completed' : 'Trade $500',
      customAction: 'trade_500',
      targetTab: 'ai',
      description: 'Allocate or trade at least $500 in a single trading session or transaction.'
    },
    {
      id: 'copy_10',
      tierId: 'platinum',
      title: 'Copy trade 10 traders',
      progress: copy10Done ? 100 : Math.min(100, Math.floor((copyTradingCount / 10) * 100)),
      increment: 25,
      status: copy10Done ? 'completed' : 'pending',
      iconKey: 'copy',
      actionLabel: copy10Done ? 'Completed' : `Copy Trade (${Math.min(copyTradingCount, 10)}/10)`,
      customAction: 'copy_10',
      targetTab: 'copy-trading',
      description: 'Follow and copy trade 10 strategy traders in the Copy Trading market.'
    },
    {
      id: 'strat_2',
      tierId: 'platinum',
      title: 'Use 2 strategies from strategy engine',
      progress: strat2Done ? 100 : Math.min(100, Math.floor((usedStrategiesCount / 2) * 100)),
      increment: 25,
      status: strat2Done ? 'completed' : 'pending',
      iconKey: 'cpu',
      actionLabel: strat2Done ? 'Completed' : `Deploy (${Math.min(usedStrategiesCount, 2)}/2)`,
      customAction: 'strat_2',
      targetTab: 'ai',
      description: 'Deploy or configure at least 2 distinct AI strategies from the Strategy Engine.'
    }
  ];

  // Active Tasks: NEVER remove uncompleted tasks regardless of tier!
  let activeTasks: TaskItem[] = [];

  if (currentTierId === 'bronze') {
    activeTasks = bronzeTasks.filter(t => t.status !== 'completed');
  } else if (currentTierId === 'platinum') {
    const uncompletedBronze = bronzeTasks.filter(t => t.status !== 'completed');
    const uncompletedPlatinum = platinumTasks.filter(t => t.status !== 'completed');
    activeTasks = [...uncompletedBronze, ...uncompletedPlatinum];
  } else {
    // Gold tier
    const uncompletedBronze = bronzeTasks.filter(t => t.status !== 'completed');
    const uncompletedPlatinum = platinumTasks.filter(t => t.status !== 'completed');
    const goldTasks: TaskItem[] = [
      {
        id: 'referral_gold',
        tierId: 'gold',
        title: 'Invite Friends & VIP Partners',
        progress: referralCount >= 5 ? 100 : Math.min(100, Math.floor((referralCount / 5) * 100)),
        increment: 20,
        status: referralCount >= 5 ? 'completed' : 'pending',
        iconKey: 'users',
        actionLabel: referralCount >= 5 ? 'Completed' : 'Invite VIPs',
        customAction: 'profile',
        description: 'Invite new traders to receive highest referral tier commissions.'
      }
    ];
    activeTasks = [...uncompletedBronze, ...uncompletedPlatinum, ...goldTasks.filter(t => t.status !== 'completed')];
  }

  return {
    currentTier,
    nextTier,
    progress,
    activeTasks,
    isBronzeComplete,
    isPlatinumComplete,
    platinumTaskStates: {
      deposit1000Done,
      trade500Done,
      copy10Done,
      strat2Done,
      copyTradingCount,
      usedStrategiesCount
    }
  };
}

export function completePlatinumTask(taskId: string, uid?: string) {
  if (uid) {
    safeStorage.setItem(`aver_task_${taskId}_${uid}`, 'true');
  }
}
