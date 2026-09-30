/**
 * Realistic Dynamic Event Enrollment Simulator
 * Ensures that newly posted and existing campaigns from Admin never appear stagnant at 0.
 * Generates varied, organic, and realistic participant counts with dynamic growth rates.
 */

// Simple deterministic string hasher
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export interface EventEnrollmentConfig {
  baseParticipants: number;
  incrementAmount: number;     // e.g. 197 or 10000
  cadenceMinutes: number;      // e.g. 20 or 2
  ratePerMinute: number;
  maxCapacity: number;
}

/**
 * Returns deterministic configuration for an event based on its unique identity
 */
export function getEventEnrollmentConfig(event: {
  id?: string;
  title?: string;
  category?: string;
  totalRewardPool?: number;
  participantCount?: number;
  maxParticipants?: number;
}): EventEnrollmentConfig {
  const seedKey = `${event.id || 'event'}_${event.title || 'promo'}_${event.category || 'general'}`;
  const hash = hashString(seedKey);

  // Determine magnitude tier based on hash and reward pool
  const pool = Number(event.totalRewardPool) || 25000;
  const tierSelector = hash % 5;

  let baseParticipants = 0;
  let incrementAmount = 0;
  let cadenceMinutes = 0;

  if (tierSelector === 0) {
    // Mega tier: 900,000 - 1,800,000 (e.g. 1,771,827)
    baseParticipants = 950000 + (hash % 850000);
    incrementAmount = 2500 + (hash % 7500); // 2,500 - 10,000
    cadenceMinutes = 2 + (hash % 3); // every 2-4 mins
  } else if (tierSelector === 1) {
    // High tier: 400,000 - 900,000
    baseParticipants = 420000 + (hash % 480000);
    incrementAmount = 650 + (hash % 1850); // 650 - 2,500
    cadenceMinutes = 4 + (hash % 5); // every 4-8 mins
  } else if (tierSelector === 2) {
    // Medium-high tier: 150,000 - 400,000
    baseParticipants = 160000 + (hash % 240000);
    incrementAmount = 197 + (hash % 600); // 197 - 797
    cadenceMinutes = 12 + (hash % 9); // every 12-20 mins
  } else if (tierSelector === 3) {
    // Standard tier: 65,000 - 150,000
    baseParticipants = 68000 + (hash % 82000);
    incrementAmount = 85 + (hash % 220); // 85 - 305
    cadenceMinutes = 8 + (hash % 12); // every 8-20 mins
  } else {
    // Niche/Sprint tier: 25,000 - 65,000
    baseParticipants = 28000 + (hash % 37000);
    incrementAmount = 45 + (hash % 110); // 45 - 155
    cadenceMinutes = 15 + (hash % 15); // every 15-30 mins
  }

  // If the event was created with an explicit initial count > 0, honor it as minimum base
  if (event.participantCount && event.participantCount > 0) {
    baseParticipants = Math.max(baseParticipants, event.participantCount);
  }

  const ratePerMinute = incrementAmount / Math.max(1, cadenceMinutes);

  // Ensure maxCapacity scales appropriately (roughly 1.25x - 1.6x of base)
  const maxCapacity = event.maxParticipants && event.maxParticipants > baseParticipants
    ? event.maxParticipants
    : Math.round(baseParticipants * (1.28 + ((hash % 35) / 100)));

  return {
    baseParticipants,
    incrementAmount,
    cadenceMinutes,
    ratePerMinute,
    maxCapacity
  };
}

/**
 * Calculates current real-time participant count for an event
 * Accounts for elapsed time from creation/start + organic time jitter
 */
export function getSimulatedParticipants(event: {
  id?: string;
  title?: string;
  category?: string;
  totalRewardPool?: number;
  participantCount?: number;
  maxParticipants?: number;
  createdAt?: any;
  startTime?: any;
}, runtimeTickSeconds = 0): {
  count: number;
  max: number;
  percentage: number;
  formattedCount: string;
  formattedMax: string;
  growthSummary: string;
} {
  const config = getEventEnrollmentConfig(event);
  const hash = hashString((event.id || 'ev') + (event.title || ''));

  // Determine elapsed time
  let eventStartTime = Date.now() - (3600 * 1000 * 24 * 3); // Default 3 days ago
  if (event.createdAt) {
    const t = typeof event.createdAt === 'object' && event.createdAt?.seconds 
      ? event.createdAt.seconds * 1000 
      : new Date(event.createdAt).getTime();
    if (!isNaN(t) && t > 0) eventStartTime = t;
  } else if (event.startTime) {
    const t = new Date(event.startTime).getTime();
    if (!isNaN(t) && t > 0) eventStartTime = t;
  }

  const elapsedMs = Math.max(0, Date.now() - eventStartTime);
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

  // Growth over time
  const accumulatedGrowth = Math.floor(elapsedMinutes * config.ratePerMinute);

  // Deterministic 10-minute cyclic variance so it isn't completely linear
  const cycleSlot = Math.floor(elapsedMinutes / 10);
  const cyclicJitter = ((hash + cycleSlot * 73) % 19) * 3;

  // Real-time live on-screen pulse tick (e.g. +1 user every 4-8 seconds)
  const livePulse = Math.floor(runtimeTickSeconds / (4 + (hash % 5)));

  let currentCount = config.baseParticipants + accumulatedGrowth + cyclicJitter + livePulse;

  // If max is provided, allow natural cap or soft overflow expansion
  let max = config.maxCapacity;
  if (currentCount >= max) {
    max = Math.round(currentCount * 1.25);
  }

  const percentage = Math.min(99, Math.max(12, Math.round((currentCount / max) * 100)));

  return {
    count: currentCount,
    max,
    percentage,
    formattedCount: currentCount.toLocaleString(),
    formattedMax: max.toLocaleString(),
    growthSummary: `+${config.incrementAmount.toLocaleString()} per ${config.cadenceMinutes}m`
  };
}

/**
 * Ensures participant counts are never stagnant at 0 and blends user actions with organic simulation.
 */
export function getEffectiveParticipantCount(event: {
  id?: string;
  title?: string;
  category?: string;
  totalRewardPool?: number;
  participantCount?: number;
  maxParticipants?: number;
  createdAt?: any;
  startTime?: any;
}, runtimeTickSeconds = 0): { count: number; max: number; percentage: number; formattedCount: string; formattedMax: string } {
  const simulated = getSimulatedParticipants(event, runtimeTickSeconds);
  const explicit = event.participantCount || 0;
  const count = explicit > 50000 ? explicit : Math.max(explicit, simulated.count);
  const max = Math.max(simulated.max, event.maxParticipants || Math.round(count * 1.3));
  const percentage = Math.min(99, Math.max(12, Math.round((count / max) * 100)));
  return {
    count,
    max,
    percentage,
    formattedCount: count.toLocaleString(),
    formattedMax: max.toLocaleString()
  };
}

