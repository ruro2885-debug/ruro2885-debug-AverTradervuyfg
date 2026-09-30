import { EventItem, computeRealtimeEventStatus } from '../types/events';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  increment, 
  updateDoc 
} from 'firebase/firestore';

export const INITIAL_DYNAMIC_EVENTS: EventItem[] = [
  {
    id: 'world_trading_championship_2026',
    title: 'World Trading Championship 2026',
    subtitle: 'Battle global quant traders for a monumental $500,000 USDT prize pool and exclusive VIP Tier 5 status.',
    category: 'Trading Competition',
    status: 'LIVE',
    featured: true,
    bannerUrl: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1600&auto=format&fit=crop',
    heroGradient: 'from-amber-500/30 via-purple-600/20 to-[#03060D]',
    accentColor: '#F59E0B',
    totalRewardPool: 500000,
    rewardToken: 'USDT',
    rewardCards: [
      { title: '1st Place Champion', amount: '$150,000 USDT', subtext: '+ Diamond Trophy & VIP 5', iconName: 'trophy' },
      { title: 'Top 10 Leaderboard', amount: '$180,000 USDT', subtext: 'Distributed by PnL %', iconName: 'award' },
      { title: 'Guaranteed Volume Pool', amount: '$170,000 USDT', subtext: 'Shared among traders > $50k Vol', iconName: 'coins' }
    ],
    startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    participantCount: 14280,
    maxParticipants: 50000,
    overview: `Welcome to the premier global crypto trading tournament of 2026! Compete against institutional quant funds and retail algorithmic traders across spot and futures markets. Participants are ranked by total Profit and Loss percentage (PnL %) as well as cumulative trading volume. Top traders gain instant access to Aver Institutional Copy-Trading allocation.`,
    eligibilityRequirements: [
      { id: 'kyc', title: 'Complete Level 1 KYC Verification', completed: true, actionType: 'kyc' },
      { id: 'min_balance', title: 'Maintain minimum $100 net equity', completed: true, actionType: 'deposit' },
      { id: 'min_vol', title: 'Reach $10,000 minimum competition volume', completed: false, requiredAction: 'Trade $10k', actionType: 'trade' }
    ],
    stepGuide: [
      { stepNumber: 1, title: 'Register Competition Account', description: 'Click "Join Championship" to register your portfolio in the global leaderboard index.', actionLabel: 'Register' },
      { stepNumber: 2, title: 'Deposit or Transfer Funds', description: 'Ensure your active trading balance contains at least 100 USDT equity.' },
      { stepNumber: 3, title: 'Execute Spot & Futures Trades', description: 'Trade any supported pair or activate AI Copilot to generate cumulative volume.' },
      { stepNumber: 4, title: 'Claim Prize Pool Shares', description: 'Upon competition closing, rewards settle automatically to your wallet.' }
    ],
    prizeBreakdown: [
      { rankRange: '1st Place', reward: '$150,000 USDT', percentage: '30%', badge: 'gold' },
      { rankRange: '2nd Place', reward: '$80,000 USDT', percentage: '16%', badge: 'platinum' },
      { rankRange: '3rd Place', reward: '$50,000 USDT', percentage: '10%', badge: 'bronze' },
      { rankRange: 'Ranks 4 - 10', reward: '$50,000 USDT (Shared)', percentage: '10%', badge: 'diamond' },
      { rankRange: 'Ranks 11 - 100', reward: '$100,000 USDT (Shared)', percentage: '20%', badge: 'vip' },
      { rankRange: 'Participation Pool', reward: '$70,000 USDT (Shared)', percentage: '14%' }
    ],
    timeline: [
      { title: 'Early Registration', dateRange: 'Jul 15 - Jul 20, 2026', status: 'COMPLETED', description: 'Early bird registration and bonus 5% PnL multiplier.' },
      { title: 'Trading Tournament Live', dateRange: 'Jul 21 - Jul 30, 2026', status: 'ACTIVE', description: 'Official trading period. PnL % tracked live on dynamic leaderboard.' },
      { title: 'Audit & Final Ranking', dateRange: 'Jul 31, 2026', status: 'UPCOMING', description: 'Anti-wash trading review and final PnL audit.' },
      { title: 'Prize Settlement', dateRange: 'Aug 01, 2026', status: 'UPCOMING', description: 'Direct wallet payout and VIP tier distribution.' }
    ],
    terms: [
      'All trades executed on spot, futures, and AI copy-trading count toward competition volume.',
      'Sub-accounts and main accounts share the same PnL calculation.',
      'Market manipulation, wash trading, and self-hedging between accounts are strictly prohibited.',
      'Rewards will be credited directly to user wallet balances within 24 hours of event conclusion.'
    ],
    faqs: [
      { question: 'How is PnL % calculated for the championship?', answer: 'PnL % = [Final Equity - (Initial Equity + Deposits) + Withdrawals] / (Initial Equity + Deposits) * 100.' },
      { question: 'Is there a minimum volume required to receive prize money?', answer: 'Yes, participants must reach at least $10,000 USDT in total volume during the tournament period to qualify for prize pool shares.' },
      { question: 'Can I use AI Copilot during the competition?', answer: 'Yes! Automated trades executed by AI Copilot qualify 100% toward volume and PnL rankings.' }
    ],
    tags: ['Hot', 'Championship', '$500K Pool', 'Leaderboard']
  },
  {
    id: 'neural_ai_copilot_airdrop',
    title: 'Neural AI Copilot Genesis Airdrop',
    subtitle: 'Claim your share of 5,000,000 $AVR neural protocol tokens by configuring and deploying AI trading strategies.',
    category: 'Airdrop Sprint',
    status: 'LIVE',
    featured: true,
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop',
    heroGradient: 'from-purple-600/30 via-indigo-600/20 to-[#03060D]',
    accentColor: '#8B5CF6',
    totalRewardPool: 250000,
    rewardToken: 'AVR',
    rewardCards: [
      { title: 'Genesis Airdrop Pool', amount: '5,000,000 AVR', subtext: 'Valued at ~$250,000 USDT', iconName: 'sparkles' },
      { title: 'Guaranteed Allocation', amount: '250 AVR / User', subtext: 'For all active AI strategists', iconName: 'gift' },
      { title: 'Yield Multiplier Badge', amount: '2.5x APY Boost', subtext: 'Permanent protocol badge', iconName: 'zap' }
    ],
    startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    participantCount: 22450,
    maxParticipants: 100000,
    overview: `The Aver AI Copilot Genesis Airdrop rewards early adopters who initialize and backtest neural copilot bots. By completing 3 simple configuration steps, users unlock guaranteed $AVR token allocations and a permanent 2.5x staking boost.`,
    eligibilityRequirements: [
      { id: 'ai_config', title: 'Configure AI Risk Weights & Allocations', completed: false, requiredAction: 'Set AI Weights', actionType: 'quiz' },
      { id: 'ai_run', title: 'Run AI Copilot for 24 Consecutive Hours', completed: false, requiredAction: 'Enable AI Bot', actionType: 'trade' },
      { id: 'social_share', title: 'Share AI Copilot Card on X / Telegram', completed: false, requiredAction: 'Share Card', actionType: 'referral' }
    ],
    stepGuide: [
      { stepNumber: 1, title: 'Opt-in to Genesis Sprint', description: 'Click "Register Airdrop" to bind your profile address to the token snapshot.' },
      { stepNumber: 2, title: 'Setup Copilot Parameters', description: 'Define leverage limits, stop-loss ratios, and pair preferences in AI Studio.' },
      { stepNumber: 3, title: 'Execute First Copilot Order', description: 'Allow the neural engine to open and settle at least 1 automated trade.' },
      { stepNumber: 4, title: 'Claim $AVR Tokens', description: 'Unlock your 250 AVR welcome pack and yield boost badge instantly.' }
    ],
    prizeBreakdown: [
      { rankRange: 'Starter Pack', reward: '250 AVR ($12.50)', percentage: '30%', badge: 'bronze' },
      { rankRange: 'Top 100 Strategists', reward: '10,000 AVR ($500)', percentage: '40%', badge: 'gold' },
      { rankRange: 'Referral Leaders', reward: '5,000 AVR ($250)', percentage: '30%', badge: 'vip' }
    ],
    timeline: [
      { title: 'Snapshot Phase 1', dateRange: 'Jul 22, 2026', status: 'COMPLETED', description: 'Wallet eligibility snapshot taken.' },
      { title: 'Copilot Quest Active', dateRange: 'Jul 23 - Aug 03, 2026', status: 'ACTIVE', description: 'Perform tasks to accumulate Airdrop Points.' },
      { title: 'Token Claim Launch', dateRange: 'Aug 04, 2026', status: 'UPCOMING', description: 'Token distribution to all qualified participants.' }
    ],
    terms: [
      'Each verified user account is eligible for one Genesis Airdrop allocation.',
      'Tokens are non-transferable until official DEX listing on Aug 05, 2026.',
      'Sybil attacks and automated bot registrations will result in blacklisting.'
    ],
    faqs: [
      { question: 'What is the utility of $AVR token?', answer: '$AVR is the native governance and gas-offset token for Aver Neural Network, giving holders reduced fees and higher copilot returns.' },
      { question: 'When will I receive my $AVR tokens?', answer: 'Tokens will be claimable directly from this event page as soon as you complete the 3 setup steps.' }
    ],
    tags: ['Airdrop', 'AI Copilot', 'Guaranteed', '$AVR Token']
  },
  {
    id: 'solana_yield_carnival',
    title: 'Solana Ecosystem Yield Carnival',
    subtitle: 'Trade SOL pairs with 0% maker fees, earn up to 38.5% APY on SOL vault deposits, and win SOL rewards.',
    category: 'Staking & Yield',
    status: 'ENDING_SOON',
    featured: true,
    bannerUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1600&auto=format&fit=crop',
    heroGradient: 'from-emerald-500/30 via-teal-600/20 to-[#03060D]',
    accentColor: '#00D09C',
    totalRewardPool: 150000,
    rewardToken: 'SOL',
    rewardCards: [
      { title: 'SOL Deposit Bonus', amount: '1,000 SOL Pool', subtext: 'Bonus SOL credited on vault lock', iconName: 'coins' },
      { title: 'Zero Trading Fees', amount: '0% Maker / Taker', subtext: 'For all SOL/USDT spot trades', iconName: 'zap' },
      { title: 'Boosted Vault APY', amount: '38.5% APY', subtext: '7-day flexible SOL vault', iconName: 'trophy' }
    ],
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 60 * 60 * 1000 + 42 * 60 * 1000).toISOString(), // ~5 hours left
    participantCount: 18920,
    maxParticipants: 25000,
    overview: `Celebrate Solana high-throughput liquidity on Aver. Stake SOL in high-yield neural vaults, enjoy zero gas/maker fees across all SOL spot and futures pairs, and win a portion of 1,000 SOL in prize pools.`,
    eligibilityRequirements: [
      { id: 'deposit_sol', title: 'Deposit or hold at least 1.0 SOL', completed: false, requiredAction: 'Deposit SOL', actionType: 'deposit' },
      { id: 'trade_sol', title: 'Trade $500 volume in SOL/USDT', completed: false, requiredAction: 'Trade SOL', actionType: 'trade' }
    ],
    stepGuide: [
      { stepNumber: 1, title: 'Join Solana Carnival', description: 'Activate your SOL yield pass to unlock zero-fee trading benefits.' },
      { stepNumber: 2, title: 'Deposit SOL to Vault', description: 'Lock SOL into flexible neural vaults for 38.5% APY yield payouts.' },
      { stepNumber: 3, title: 'Trade SOL Pairs', description: 'Execute SOL/USDT trades with zero maker fees.' }
    ],
    prizeBreakdown: [
      { rankRange: 'Top Deposit Vaults', reward: '400 SOL', percentage: '40%', badge: 'gold' },
      { rankRange: 'Volume Sprint Leaders', reward: '350 SOL', percentage: '35%', badge: 'platinum' },
      { rankRange: 'Flexible Vault Stakers', reward: '250 SOL', percentage: '25%', badge: 'bronze' }
    ],
    timeline: [
      { title: 'Zero-Fee Trading Live', dateRange: 'Jul 21 - Jul 28, 2026', status: 'ACTIVE', description: 'Enjoy 0% fees on all SOL pairs.' },
      { title: 'Yield Distribution', dateRange: 'Jul 29, 2026', status: 'UPCOMING', description: '38.5% APY rewards disbursed daily.' }
    ],
    terms: [
      'Zero-fee promotion applies automatically to all SOL/USDT trades during campaign hours.',
      'Vault withdrawals are available at any time without locking penalties.'
    ],
    faqs: [
      { question: 'Is my SOL vault deposit locked?', answer: 'No! The Solana Yield Vault is 100% flexible. You can withdraw your SOL and accrued yield anytime.' }
    ],
    tags: ['Ending Soon', '38.5% APY', 'Zero Fee', 'SOL']
  },
  {
    id: 'vip_pioneer_referral_quest',
    title: 'VIP Pioneer Referral Quest',
    subtitle: 'Invite trader friends to Aver. Earn up to $500 USDT per referral plus 40% lifetime commission.',
    category: 'VIP Quest',
    status: 'LIVE',
    featured: false,
    bannerUrl: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?q=80&w=1600&auto=format&fit=crop',
    heroGradient: 'from-blue-600/30 via-indigo-700/20 to-[#03060D]',
    accentColor: '#3B82F6',
    totalRewardPool: 100000,
    rewardToken: 'USDT',
    rewardCards: [
      { title: 'Instant Referral Cash', amount: '$50 USDT / Friend', subtext: 'Paid as soon as referee trades $100', iconName: 'gift' },
      { title: 'Lifetime Rebate', amount: '40% Commission', subtext: 'On all referee trading fees', iconName: 'award' },
      { title: 'Pioneer Badge', amount: 'VIP Tier 3 Boost', subtext: 'Unlocks custom copilot parameters', iconName: 'sparkles' }
    ],
    startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    participantCount: 9410,
    maxParticipants: 20000,
    overview: `Expand the Aver trading ecosystem. Share your tracking link with trader groups, quant communities, or friends. For every active trader who joins, both you and your friend receive $50 USDT cash plus 40% commission splits.`,
    eligibilityRequirements: [
      { id: 'share_code', title: 'Copy and share your unique tracking link', completed: false, requiredAction: 'Copy Link', actionType: 'referral' },
      { id: 'refer_friend', title: 'Invite at least 1 active trader', completed: false, requiredAction: 'Invite Friend', actionType: 'referral' }
    ],
    stepGuide: [
      { stepNumber: 1, title: 'Generate VIP Link', description: 'Copy your unique invite link with 40% fee rebate embed.' },
      { stepNumber: 2, title: 'Share with Network', description: 'Post on X, Telegram, Discord, or send directly to trading partners.' },
      { stepNumber: 3, title: 'Friend Trades $100', description: 'When your friend completes their first $100 trade, $50 USDT is unlocked for both of you!' }
    ],
    prizeBreakdown: [
      { rankRange: '1 - 3 Invites', reward: '$50 USDT / Invite', percentage: 'Fixed', badge: 'bronze' },
      { rankRange: '4 - 10 Invites', reward: '$75 USDT / Invite + VIP 2', percentage: 'Fixed', badge: 'platinum' },
      { rankRange: '10+ Invites', reward: '$100 USDT / Invite + VIP 3', percentage: 'Fixed', badge: 'gold' }
    ],
    timeline: [
      { title: 'Referral Quest Active', dateRange: 'Jul 19 - Aug 05, 2026', status: 'ACTIVE', description: 'Invite tracking live.' }
    ],
    terms: [
      'Referees must complete Level 1 KYC and trade at least $100 USDT volume.',
      'Commissions settle instantly to available wallet balance.'
    ],
    faqs: [
      { question: 'Where do I find my referral link?', answer: 'Your link is generated automatically when you tap "Register Quest" on this page.' }
    ],
    tags: ['Referral', '40% Rebate', 'VIP 3', 'USDT']
  },
  {
    id: 'bitcoin_halving_gala',
    title: 'Bitcoin Era Spot & Futures Gala',
    subtitle: 'Celebrate institutional BTC milestones with $300,000 in BTC airdrops and zero liquidation fees.',
    category: 'New Listing',
    status: 'UPCOMING',
    featured: true,
    bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop',
    heroGradient: 'from-orange-500/30 via-amber-600/20 to-[#03060D]',
    accentColor: '#F97316',
    totalRewardPool: 300000,
    rewardToken: 'BTC',
    rewardCards: [
      { title: 'BTC Airdrop Pool', amount: '4.50 BTC', subtext: 'Valued at ~$300,000', iconName: 'coins' },
      { title: 'Zero Liquidation Fee', amount: '100% Protection', subtext: 'For all BTC/USDT futures positions', iconName: 'zap' }
    ],
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    participantCount: 31200,
    maxParticipants: 50000,
    overview: `Prepare for the Bitcoin Gala! Register early to secure priority access to zero-fee BTC derivatives and a share of 4.5 BTC in prize pools.`,
    eligibilityRequirements: [
      { id: 'pre_reg', title: 'Pre-register before event launch', completed: false, requiredAction: 'Pre-Register', actionType: 'quiz' }
    ],
    stepGuide: [
      { stepNumber: 1, title: 'Pre-Register', description: 'Click "Pre-Register" to lock in early bird rewards.' },
      { stepNumber: 2, title: 'Trade BTC/USDT', description: 'Trade BTC during gala hours to earn BTC drop tickets.' }
    ],
    prizeBreakdown: [
      { rankRange: 'Top BTC Trader', reward: '1.0 BTC ($65,000)', percentage: '22%', badge: 'gold' },
      { rankRange: 'Ranks 2-10', reward: '1.5 BTC (Shared)', percentage: '33%', badge: 'platinum' },
      { rankRange: 'All Pre-Registers', reward: '2.0 BTC (Shared Pool)', percentage: '45%', badge: 'bronze' }
    ],
    timeline: [
      { title: 'Pre-Registration', dateRange: 'Jul 24 - Jul 25, 2026', status: 'ACTIVE', description: 'Pre-registration phase.' },
      { title: 'Gala Trading Starts', dateRange: 'Jul 26, 2026', status: 'UPCOMING', description: 'Tournament kicks off.' }
    ],
    terms: ['Pre-registered users receive 1.5x ticket multipliers.'],
    faqs: [{ question: 'When does BTC Gala start?', answer: 'Event starts in 48 hours. Pre-register now!' }],
    tags: ['Bitcoin', 'BTC', 'Gala', 'Upcoming']
  },
  {
    id: 'ethereum_layer2_staking_odyssey',
    title: 'Ethereum Layer-2 Staking Odyssey',
    subtitle: 'Lock stETH and ETH L2 liquid staking derivatives for 28% boosted APR and zero unstaking queue delays.',
    category: 'Staking & Yield',
    status: 'UPCOMING',
    featured: false,
    bannerUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?q=80&w=1600&auto=format&fit=crop',
    heroGradient: 'from-cyan-500/30 via-blue-600/20 to-[#03060D]',
    accentColor: '#06B6D4',
    totalRewardPool: 180000,
    rewardToken: 'ETH',
    rewardCards: [
      { title: 'Boosted Staking Pool', amount: '50 ETH Pool', subtext: 'Distributed across L2 stakers', iconName: 'coins' },
      { title: 'Instant Liquidity', amount: '0 Unstaking Lock', subtext: 'Instant swap back to native ETH', iconName: 'zap' }
    ],
    startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    participantCount: 12840,
    maxParticipants: 30000,
    overview: `Experience instant Ethereum liquid staking on Arbitrum, Optimism, and Base. Earn 28% boosted APR without locking capital.`,
    eligibilityRequirements: [
      { id: 'pre_reg_eth', title: 'Pre-register for ETH Odyssey', completed: false, requiredAction: 'Pre-Register', actionType: 'quiz' }
    ],
    stepGuide: [
      { stepNumber: 1, title: 'Pre-Register', description: 'Lock in your 28% yield boost slot before cap is reached.' },
      { stepNumber: 2, title: 'Deposit ETH', description: 'Deposit ETH or stETH into liquid vault.' }
    ],
    prizeBreakdown: [
      { rankRange: 'Top Stakers', reward: '20 ETH', percentage: '40%', badge: 'gold' },
      { rankRange: 'All Qualifiers', reward: '30 ETH', percentage: '60%', badge: 'platinum' }
    ],
    timeline: [
      { title: 'Pre-Registration', dateRange: 'Jul 24 - Jul 27, 2026', status: 'ACTIVE', description: 'Whitelist open.' },
      { title: 'Staking Vault Launch', dateRange: 'Jul 28, 2026', status: 'UPCOMING', description: 'Vault opens.' }
    ],
    terms: ['Liquid staking rewards compound automatically every 8 hours.'],
    faqs: [{ question: 'Can I withdraw my ETH anytime?', answer: 'Yes, liquid vault shares are fully tradable with zero lockup.' }],
    tags: ['Ethereum', 'Layer 2', '28% APR', 'Staking']
  },
  {
    id: 'alpha_quant_algo_sprint_2026',
    title: 'Alpha Quant HFT Trading Sprint',
    subtitle: 'Historical high-frequency algorithmic tournament. $200,000 USDT settled directly to winning quant vaults.',
    category: 'Trading Competition',
    status: 'COMPLETED',
    featured: false,
    bannerUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1600&auto=format&fit=crop',
    heroGradient: 'from-emerald-600/20 via-slate-800/20 to-[#03060D]',
    accentColor: '#10B981',
    totalRewardPool: 200000,
    rewardToken: 'USDT',
    rewardCards: [
      { title: 'Settled Prize Pool', amount: '$200,000 USDT', subtext: 'Fully distributed on Jul 14, 2026', iconName: 'trophy' },
      { title: 'Winner PnL Record', amount: '+1,420% PnL', subtext: 'Achieved by Algo Vault #09', iconName: 'award' }
    ],
    startTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    participantCount: 45200,
    maxParticipants: 50000,
    overview: `The Alpha Quant HFT Sprint was successfully completed. Over $200,000 in rewards were settled directly to 1,200 top quant traders and AI copilot users.`,
    eligibilityRequirements: [],
    stepGuide: [],
    prizeBreakdown: [
      { rankRange: '1st Place Winner', reward: '$60,000 USDT', percentage: '30%', badge: 'gold' },
      { rankRange: 'Top 10 Qualifiers', reward: '$80,000 USDT', percentage: '40%', badge: 'platinum' },
      { rankRange: 'Community Pool', reward: '$60,000 USDT', percentage: '30%', badge: 'bronze' }
    ],
    timeline: [
      { title: 'Tournament Concluded', dateRange: 'Jul 14, 2026', status: 'COMPLETED', description: 'Final payouts verified on-chain.' }
    ],
    terms: ['Event completed. All prizes paid.'],
    faqs: [{ question: 'Where can I see the final leaderboard?', answer: 'Leaderboard records are permanently stored in Aver Vault History.' }],
    tags: ['Completed', 'Verified', '$200K Settled']
  }
];

const LOCAL_PARTICIPATION_KEY = 'aver_events_user_participations_v2';

export function getLocalParticipations(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LOCAL_PARTICIPATION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalParticipation(eventId: string, data: any) {
  try {
    const current = getLocalParticipations();
    current[eventId] = { ...current[eventId], ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(LOCAL_PARTICIPATION_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed writing local event participation", e);
  }
}

function filterEventsOlderThanThirteenHours(list: EventItem[]): EventItem[] {
  const now = Date.now();
  const thirteenHoursInMs = 13 * 60 * 60 * 1000;
  return list.filter((item) => {
    if (!item.endTime) return true;
    const end = new Date(item.endTime).getTime();
    return (now - end) < thirteenHoursInMs;
  });
}

/**
 * Seed initial dataset to Firestore if events_hub collection is empty
 */
async function seedInitialEventsIfNeeded() {
  const path = 'events_hub';
  try {
    const seedRef = doc(db, 'system_config', 'events_seed');
    const seedSnap = await getDoc(seedRef);
    if (seedSnap.exists() && seedSnap.data()?.seeded) {
      return;
    }

    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      console.log("Seeding initial dynamic events to Firestore events_hub...");
      for (const item of INITIAL_DYNAMIC_EVENTS) {
        await setDoc(doc(db, path, item.id), {
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    }
    await setDoc(seedRef, { seeded: true, seededAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Subscribe to real-time events stream from Firestore with fallback & auto-seed
 */
export function subscribeToEvents(
  onData: (events: EventItem[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'events_hub';
  
  // First attempt seed if needed
  seedInitialEventsIfNeeded();

  const unsubscribe = onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (snapshot.empty) {
        onData(filterEventsOlderThanThirteenHours(INITIAL_DYNAMIC_EVENTS.map(ev => ({
          ...ev,
          status: computeRealtimeEventStatus(ev)
        }))));
        return;
      }

      const localParts = getLocalParticipations();
      const eventsList: EventItem[] = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data() as EventItem;
        const computedStatus = computeRealtimeEventStatus(raw);
        const userProg = localParts[raw.id] || raw.userProgress;

        return {
          ...raw,
          id: docSnap.id,
          status: computedStatus,
          userProgress: userProg
        };
      });

      onData(filterEventsOlderThanThirteenHours(eventsList));
    },
    (error) => {
      console.warn("Firestore events stream error, falling back to cached local dataset:", error);
      handleFirestoreError(error, OperationType.LIST, path);
      onData(filterEventsOlderThanThirteenHours(INITIAL_DYNAMIC_EVENTS.map(ev => ({
        ...ev,
        status: computeRealtimeEventStatus(ev)
      }))));
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Admin: Create a new promotion campaign in Firestore
 */
export async function createBackendPromotion(eventData: Partial<EventItem>): Promise<EventItem> {
  const newId = eventData.id || `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const fullEvent: EventItem = {
    id: newId,
    title: eventData.title || 'New Exclusive Promotion',
    subtitle: eventData.subtitle || 'Participate and earn dynamic rewards on Aver Exchange.',
    category: eventData.category || 'Trading Competition',
    status: eventData.status || 'LIVE',
    featured: eventData.featured ?? false,
    bannerUrl: eventData.bannerUrl || 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1200&auto=format&fit=crop',
    heroGradient: eventData.heroGradient || 'from-purple-600/30 via-indigo-600/20 to-[#07090E]',
    accentColor: eventData.accentColor || '#8B5CF6',
    totalRewardPool: eventData.totalRewardPool || 50000,
    rewardToken: eventData.rewardToken || 'USDT',
    rewardCards: eventData.rewardCards || [
      { title: 'Top Reward Pool', amount: `${eventData.totalRewardPool || 50000} ${eventData.rewardToken || 'USDT'}`, subtext: 'Grand Prize Share', iconName: 'trophy' }
    ],
    startTime: eventData.startTime || new Date().toISOString(),
    endTime: eventData.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    participantCount: eventData.participantCount || 1,
    maxParticipants: eventData.maxParticipants || 10000,
    overview: eventData.overview || 'Exclusive Aver promotional campaign. Complete requirements to unlock prize shares.',
    eligibilityRequirements: eventData.eligibilityRequirements || [
      { id: 'kyc', title: 'Level 1 KYC Verification', completed: true, actionType: 'kyc' },
      { id: 'trade', title: 'Complete minimum trade activity', completed: false, requiredAction: 'Trade $1,000', actionType: 'trade' }
    ],
    stepGuide: eventData.stepGuide || [
      { stepNumber: 1, title: 'Opt-in to Campaign', description: 'Tap Join Now to enroll your account.' },
      { stepNumber: 2, title: 'Complete Tasks', description: 'Execute qualified trades or deposits.' },
      { stepNumber: 3, title: 'Claim Prize', description: 'Receive rewards credited to your portfolio.' }
    ],
    prizeBreakdown: eventData.prizeBreakdown || [
      { rankRange: 'Top Rankers', reward: '50% Pool Share', percentage: '50%', badge: 'gold' },
      { rankRange: 'All Qualifiers', reward: '50% Pool Share', percentage: '50%', badge: 'bronze' }
    ],
    timeline: eventData.timeline || [
      { title: 'Campaign Start', dateRange: 'Current Phase', status: 'ACTIVE', description: 'Tasks open.' },
      { title: 'Distribution', dateRange: 'Post Closing', status: 'UPCOMING', description: 'Prize payout.' }
    ],
    terms: eventData.terms || ['Aver reserves the right to final interpretation of rules.'],
    faqs: eventData.faqs || [{ question: 'How do I participate?', answer: 'Tap Join Now and follow the step guide.' }],
    tags: eventData.tags || ['New', 'Promotion'],
    createdAt: now,
    updatedAt: now
  };

  const path = `events_hub/${newId}`;
  try {
    await setDoc(doc(db, 'events_hub', newId), fullEvent, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }

  return fullEvent;
}

/**
 * Admin: Update an existing promotion
 */
export async function updateBackendPromotion(eventId: string, updates: Partial<EventItem>): Promise<void> {
  const path = `events_hub/${eventId}`;
  try {
    await updateDoc(doc(db, 'events_hub', eventId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Admin: Delete a promotion
 */
export async function deleteBackendPromotion(eventId: string): Promise<void> {
  const path = `events_hub/${eventId}`;
  try {
    await deleteDoc(doc(db, 'events_hub', eventId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * User: Join an event with payout wallet address
 */
export async function joinEventService(
  userId: string | undefined, 
  eventId: string,
  options?: {
    walletAddress?: string;
    network?: string;
    registeredToken?: string;
  }
): Promise<any> {
  const now = new Date().toISOString();
  const newParticipation = {
    joined: true,
    registeredAt: now,
    walletAddress: options?.walletAddress || '',
    network: options?.network || '',
    registeredToken: options?.registeredToken || '',
    completedPercentage: 25,
    currentVolume: 0,
    targetVolume: 10000,
    status: 'REGISTERED' as const,
    claimedAmount: 0
  };

  saveLocalParticipation(eventId, newParticipation);

  if (userId) {
    try {
      const userPartRef = doc(db, 'users', userId, 'event_participations', eventId);
      await setDoc(userPartRef, newParticipation, { merge: true });

      const eventRef = doc(db, 'events_hub', eventId);
      await setDoc(eventRef, { participantCount: increment(1) }, { merge: true });
    } catch (err) {
      console.warn("Firestore event join fallback:", err);
    }
  }

  return newParticipation;
}

/**
 * User: Claim event reward
 */
export async function claimEventRewardService(
  userId: string | undefined, 
  event: EventItem,
  onCreditWallet?: (amount: number, title: string) => Promise<void>
): Promise<any> {
  const rewardAmt = event.totalRewardPool > 1000 ? (event.totalRewardPool > 100000 ? 500 : 250) : 100;

  const updatedParticipation = {
    joined: true,
    status: 'CLAIMED' as const,
    completedPercentage: 100,
    claimedAmount: rewardAmt
  };

  saveLocalParticipation(event.id, updatedParticipation);

  if (userId) {
    try {
      const userPartRef = doc(db, 'users', userId, 'event_participations', event.id);
      await setDoc(userPartRef, updatedParticipation, { merge: true });
    } catch (err) {
      console.warn("Firestore reward claim fallback:", err);
    }
  }

  if (onCreditWallet) {
    await onCreditWallet(rewardAmt, event.title);
  }

  return updatedParticipation;
}
