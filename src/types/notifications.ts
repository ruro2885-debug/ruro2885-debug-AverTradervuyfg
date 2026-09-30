export type NotificationCategory = 
  | 'account' 
  | 'security' 
  | 'trading' 
  | 'portfolio' 
  | 'deposit' 
  | 'withdrawal' 
  | 'vault' 
  | 'copy_trading' 
  | 'swap' 
  | 'referral' 
  | 'system'
  | 'marketing'
  | 'rewards'
  | 'ai'
  | 'signals';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  createdAtTimestamp: number;
  date: string;
  read: boolean;
  actionUrl?: string;
  action?: string | null;
  metadata?: Record<string, any>;
  pinned?: boolean;
  archived?: boolean;
}
