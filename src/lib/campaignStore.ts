export interface CampaignItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'ended' | 'archived';
  totalRewardPool: number;
  rewardToken: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  views?: number;
  clicks?: number;
  participations?: number;
  conversions?: number;
  redemptions?: number;
  completionRate?: number;
  coverImageUrl?: string;
  bannerUrl?: string;
  brandColor?: string;
  createdAt?: string;
}

const CAMPAIGNS_STORAGE_KEY = 'aver_campaigns_store_v1';

export function getLocalCampaigns(): CampaignItem[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse local campaigns:", e);
  }

  const defaultCampaigns: CampaignItem[] = [
    {
      id: 'CMP-2026-01',
      title: 'Institutional Q3 Liquidity Incentive',
      subtitle: 'High-yield tier incentive program for institutional liquidity providers across major spot and derivatives order books.',
      category: 'Institutional',
      status: 'active',
      totalRewardPool: 150000,
      rewardToken: 'USDT',
      startTime: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      endTime: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      participantCount: 1820,
      views: 425000,
      clicks: 34100,
      conversions: 1820,
      completionRate: 94
    },
    {
      id: 'CMP-2026-02',
      title: 'Global VIP Staking & Copy Trading Pass',
      subtitle: 'Zero-fee copy trading pass for top tier retail and semi-institutional stakers depositing over $10k equivalent.',
      category: 'Retail & VIP',
      status: 'active',
      totalRewardPool: 75000,
      rewardToken: 'USDT',
      startTime: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      endTime: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
      participantCount: 4100,
      views: 890000,
      clicks: 65200,
      conversions: 4100,
      completionRate: 88
    }
  ];

  try {
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(defaultCampaigns));
  } catch (e) {}

  return defaultCampaigns;
}

export function saveLocalCampaign(campaign: CampaignItem) {
  try {
    const current = getLocalCampaigns();
    const map = new Map<string, CampaignItem>();
    current.forEach(c => map.set(c.id, c));
    map.set(campaign.id, {
      ...campaign,
      createdAt: campaign.createdAt || new Date().toISOString()
    });
    const updated = Array.from(map.values());
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('campaign_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn("Failed to save local campaign:", e);
  }
}

export function deleteLocalCampaign(id: string) {
  try {
    const current = getLocalCampaigns();
    const updated = current.filter(c => c.id !== id);
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('campaign_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn("Failed to delete local campaign:", e);
  }
}
