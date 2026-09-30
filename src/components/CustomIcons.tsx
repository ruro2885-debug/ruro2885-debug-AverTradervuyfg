import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

// 1. Dashboard Icon: Modern dashboard grid metric gauge, ultra-clean design
export const DashboardIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`lucide-custom-dashboard ${className}`}
    {...props}
  >
    {/* Clean, high-end rounded bento grid blocks representing structured data metrics */}
    <rect x="3" y="3" width="7" height="9" rx="2" strokeWidth="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="2" strokeWidth="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="2" strokeWidth="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="2" strokeWidth="1.5" />
  </svg>
);

// 2. Wallet Icon: Sleek digital crypto wallet with premium security card concept
export const WalletIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`lucide-custom-wallet ${className}`}
    {...props}
  >
    {/* Base wallet outer wrap */}
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    {/* Nested credit/debit security card fold */}
    <path d="M15 7h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
    {/* Security chip / biometric confirmation point */}
    <circle cx="17.5" cy="12" r="1" fill="currentColor" />
  </svg>
);

// 3. Trades Icon: Double exchange arrows with candlestick style layout
export const TradesIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`lucide-custom-trades ${className}`}
    {...props}
  >
    {/* Swapping / active trade arrows */}
    <path d="M17 3L21 7L17 11" />
    <path d="M3 7H21" />
    <path d="M7 21L3 17L7 13" />
    <path d="M21 17H3" />
    
    {/* Minimalist chart/candlestick stems in background to emphasize trading */}
    <path d="M11 2v4" opacity="0.4" />
    <path d="M13 18v4" opacity="0.4" />
  </svg>
);

// 4. Analytics Icon: Dynamic growing bar charts with ascending trend lines
export const AnalyticsIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`lucide-custom-analytics ${className}`}
    {...props}
  >
    {/* Bar graphs representing historical metrics */}
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20V14" />
    <path d="M3 20h18" />
    {/* Ascending dynamic trendline */}
    <path d="M3 10l6-4 6 8 6-10" strokeWidth="1.8" />
  </svg>
);
