import React, { useState, useEffect } from 'react';
import AverLogo from './AverLogo';
import { assetLogoService } from '../services/assetLogoService';

interface CoinLogoProps {
  symbol: string;
  size?: number;
  className?: string;
  imgClassName?: string;
  isLoading?: boolean;
  isConnecting?: boolean;
}

const logoUrls: Record<string, string> = {
  // Crypto
  BTC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
  ETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  SOL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
  BNB: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
  XRP: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png',
  ADA: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png',
  DOGE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png',
  USDT: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
  USDC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
  SHIB: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5994.png',
  DOT: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6636.png',
  LINK: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png',
  AVAX: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png',
  TRX: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png',
  MATIC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png',
  AAVE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7278.png',
  LTC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2.png',
  BCH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1831.png',
  TON: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11419.png',
  NEAR: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6535.png',
  UNI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png',
  ATOM: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3794.png',
  XLM: 'https://s2.coinmarketcap.com/static/img/coins/64x64/512.png',
  ALGO: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4030.png',
  FIL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2280.png',
  ETC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1321.png',
  ICP: 'https://s2.coinmarketcap.com/static/img/coins/64x64/8916.png',
  HBAR: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4642.png',
  SUI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/20947.png',
  PEPE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/24478.png',
  ARB: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11841.png',
  OP: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png',
  INJ: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7226.png',
  RENDER: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5690.png',
  FET: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3773.png',
  TIA: 'https://s2.coinmarketcap.com/static/img/coins/64x64/22861.png',
  KAS: 'https://s2.coinmarketcap.com/static/img/coins/64x64/20396.png',

  // Stocks
  AAPL: '/icons/apple.svg',
  NVDA: '/icons/nvda.svg',
  MSFT: 'https://api.iconify.design/logos:microsoft-icon.svg',
  META: '/icons/meta.svg',
  NFLX: 'https://api.iconify.design/logos:netflix-icon.svg',
  AMD: '/icons/amd.svg',
  INTC: '/icons/intc.svg',
  AVGO: 'https://s3-symbol-logo.tradingview.com/broadcom--big.svg',
  ORCL: 'https://s3-symbol-logo.tradingview.com/oracle--big.svg',
  CRM: 'https://s3-symbol-logo.tradingview.com/salesforce--big.svg',
  ADBE: 'https://s3-symbol-logo.tradingview.com/adobe--big.svg',
  QCOM: 'https://s3-symbol-logo.tradingview.com/qualcomm--big.svg',
  MU: 'https://s3-symbol-logo.tradingview.com/micron-technology--big.svg',
  COST: 'https://s3-symbol-logo.tradingview.com/costco-wholesale--big.svg',
  WMT: 'https://s3-symbol-logo.tradingview.com/walmart--big.svg',
  JPM: 'https://s3-symbol-logo.tradingview.com/jpmorgan-chase--big.svg',
  BAC: 'https://s3-symbol-logo.tradingview.com/bank-of-america--big.svg',
  GS: 'https://s3-symbol-logo.tradingview.com/goldman-sachs--big.svg',
  V: 'https://s3-symbol-logo.tradingview.com/visa--big.svg',
  MA: 'https://api.iconify.design/logos:mastercard.svg',
  KO: 'https://s3-symbol-logo.tradingview.com/coca-cola--big.svg',
  PEP: 'https://s3-symbol-logo.tradingview.com/pepsico--big.svg',
  MCD: 'https://s3-symbol-logo.tradingview.com/mcdonalds--big.svg',
  DIS: 'https://api.iconify.design/logos:disney.svg',
  NKE: 'https://s3-symbol-logo.tradingview.com/nike--big.svg',
  XOM: 'https://s3-symbol-logo.tradingview.com/exxon-mobil--big.svg',
  CVX: 'https://s3-symbol-logo.tradingview.com/chevron--big.svg',
  PLTR: 'https://s3-symbol-logo.tradingview.com/palantir--big.svg',
  UBER: 'https://s3-symbol-logo.tradingview.com/uber--big.svg',
  PYPL: 'https://api.iconify.design/logos:paypal.svg',
  COIN: 'https://s3-symbol-logo.tradingview.com/coinbase--big.svg',

  // Indices & ETFs
  ARKK: '/icons/arkk.svg',
  QQQ: '/icons/qqq.svg',
  SPY: '/icons/spy.svg',
  DIA: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  IWM: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  IVV: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  IJR: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  IJH: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  VOO: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  VTI: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  VO: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  XLK: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  VGT: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  SMH: 'https://s3-symbol-logo.tradingview.com/vaneck--big.svg',
  SOXX: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  XLF: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  VFH: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  KRE: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  XLV: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  VHT: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  IBB: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  XLE: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  VDE: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  XOP: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  XLI: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  VIS: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  XLP: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  XLY: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  XLU: 'https://s3-symbol-logo.tradingview.com/state-street--big.svg',
  VNQ: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  IYR: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  VEA: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  EFA: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  VXUS: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  VWO: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  EEM: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  IEMG: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  TLT: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  IEF: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  SHY: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  BND: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  AGG: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  HYG: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  LQD: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  TIP: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  SLV: 'https://s3-symbol-logo.tradingview.com/silver--big.svg',
  USO: 'https://s3-symbol-logo.tradingview.com/crude-oil--big.svg',
  UNG: 'https://s3-symbol-logo.tradingview.com/natural-gas--big.svg',
  DBC: 'https://s3-symbol-logo.tradingview.com/invesco--big.svg',
  SCHD: 'https://s3-symbol-logo.tradingview.com/schwab--big.svg',
  VIG: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  VYM: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  VUG: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  VTV: 'https://s3-symbol-logo.tradingview.com/vanguard--big.svg',
  IWF: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
  IWD: 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',

  // Major Global Indices
  'S&P 500': '/icons/spy.svg',
  SPX: '/icons/spy.svg',
  'NASDAQ 100': '/icons/qqq.svg',
  NDX: '/icons/qqq.svg',
  'DOW JONES': 'https://s3-symbol-logo.tradingview.com/country/US--big.svg',
  DJI: 'https://s3-symbol-logo.tradingview.com/country/US--big.svg',
  'RUSSELL 2000': 'https://s3-symbol-logo.tradingview.com/country/US--big.svg',
  RUT: 'https://s3-symbol-logo.tradingview.com/country/US--big.svg',
  'NYSE COMPOSITE': 'https://s3-symbol-logo.tradingview.com/country/US--big.svg',
  NYA: 'https://s3-symbol-logo.tradingview.com/country/US--big.svg',
  VIX: 'https://s3-symbol-logo.tradingview.com/country/US--big.svg',
  'FTSE 100': 'https://s3-symbol-logo.tradingview.com/country/GB--big.svg',
  DAX: 'https://s3-symbol-logo.tradingview.com/country/DE--big.svg',
  'CAC 40': 'https://s3-symbol-logo.tradingview.com/country/FR--big.svg',
  'EURO STOXX 50': 'https://s3-symbol-logo.tradingview.com/country/EU--big.svg',
  'IBEX 35': 'https://s3-symbol-logo.tradingview.com/country/ES--big.svg',
  'FTSE MIB': 'https://s3-symbol-logo.tradingview.com/country/IT--big.svg',
  'NIKKEI 225': 'https://s3-symbol-logo.tradingview.com/country/JP--big.svg',
  TOPIX: 'https://s3-symbol-logo.tradingview.com/country/JP--big.svg',
  'HANG SENG': 'https://s3-symbol-logo.tradingview.com/country/HK--big.svg',
  'SHANGHAI COMPOSITE': 'https://s3-symbol-logo.tradingview.com/country/CN--big.svg',
  KOSPI: 'https://s3-symbol-logo.tradingview.com/country/KR--big.svg',
  'ASX 200': 'https://s3-symbol-logo.tradingview.com/country/AU--big.svg',
  'NIFTY 50': 'https://s3-symbol-logo.tradingview.com/country/IN--big.svg',
  SENSEX: 'https://s3-symbol-logo.tradingview.com/country/IN--big.svg',
  'TSX COMPOSITE': 'https://s3-symbol-logo.tradingview.com/country/CA--big.svg',
  SMI: 'https://s3-symbol-logo.tradingview.com/country/CH--big.svg',

  // Commodities
  SILVER: 'https://s3-symbol-logo.tradingview.com/silver--big.svg',
  'CRUDE OIL': 'https://s3-symbol-logo.tradingview.com/crude-oil--big.svg',
  'BRENT CRUDE': 'https://s3-symbol-logo.tradingview.com/crude-oil--big.svg',
  'NATURAL GAS': 'https://s3-symbol-logo.tradingview.com/natural-gas--big.svg',
  PLATINUM: 'https://s3-symbol-logo.tradingview.com/silver--big.svg',
  PALLADIUM: 'https://s3-symbol-logo.tradingview.com/silver--big.svg',
  COPPER: 'https://s3-symbol-logo.tradingview.com/silver--big.svg',
  WHEAT: 'https://s3-symbol-logo.tradingview.com/wheat--big.svg',
  CORN: 'https://s3-symbol-logo.tradingview.com/corn--big.svg',
  SOYBEANS: 'https://s3-symbol-logo.tradingview.com/soybean--big.svg',
  COFFEE: 'https://s3-symbol-logo.tradingview.com/coffee--big.svg',
  SUGAR: 'https://s3-symbol-logo.tradingview.com/sugar--big.svg',
  COTTON: 'https://s3-symbol-logo.tradingview.com/cotton--big.svg',
  COCOA: 'https://s3-symbol-logo.tradingview.com/cocoa--big.svg',
  GASOLINE: 'https://s3-symbol-logo.tradingview.com/gasoline--big.svg'
};

const fallbacks: Record<string, { char: string; gradient: string }> = {
  BTC: { char: '₿', gradient: 'from-amber-400 to-orange-500' },
  ETH: { char: 'Ξ', gradient: 'from-blue-500 to-indigo-600' },
  SOL: { char: '🆂', gradient: 'from-emerald-400 to-teal-500' },
  BNB: { char: '🅑', gradient: 'from-yellow-400 to-amber-500' },
  XRP: { char: '✕', gradient: 'from-sky-400 to-blue-500' },
  ADA: { char: '₳', gradient: 'from-blue-600 to-indigo-700' },
  DOGE: { char: 'Ð', gradient: 'from-yellow-500 to-yellow-600' },
  SHIB: { char: '🐕', gradient: 'from-orange-500 to-amber-600' },
  AVR: { char: 'A', gradient: 'from-emerald-400 to-teal-400' },
  USDT: { char: '₮', gradient: 'from-teal-400 to-emerald-600' },
  USDC: { char: 'C', gradient: 'from-blue-400 to-blue-600' },
  USD: { char: '$', gradient: 'from-emerald-500 to-green-600' },
  GLD: { char: 'Au', gradient: 'from-amber-300 via-yellow-400 to-amber-600' },
};

export default function CoinLogo({ symbol, size = 24, className = '', imgClassName = '', isLoading, isConnecting }: CoinLogoProps) {
  const [hasError, setHasError] = useState(false);
  let normalizedSymbol = (symbol || '').toUpperCase().trim();

  // Determine shape: circular only when loading/connecting or explicitly requested via className
  const isCircle = isLoading || isConnecting || className.includes('rounded-full');
  const shapeClass = isCircle ? 'rounded-full' : (className.includes('rounded-') ? '' : 'rounded-xl');

  // Normalize network/protocol specific suffix symbols
  if (normalizedSymbol.startsWith('USDT')) {
    normalizedSymbol = 'USDT';
  } else if (normalizedSymbol.startsWith('USDC')) {
    normalizedSymbol = 'USDC';
  }

  // For AVR (Aver Token), render our custom brand 3D logo
  if (normalizedSymbol === 'AVR') {
    return (
      <div className={`shrink-0 flex items-center justify-center ${className}`} style={{ width: size, height: size, minWidth: size, minHeight: size }}>
        <AverLogo size={size} showText={false} />
      </div>
    );
  }

  // Authentic dual flag pair for Forex currency pairs (e.g. EUR/USD, GBP/USD)
  if (normalizedSymbol.includes('/')) {
    const [base, quote] = normalizedSymbol.split('/');
    const countryMap: Record<string, string> = {
      EUR: 'EU',
      USD: 'US',
      GBP: 'GB',
      JPY: 'JP',
      CHF: 'CH',
      AUD: 'AU',
      CAD: 'CA',
      NZD: 'NZ'
    };
    const baseCode = countryMap[base];
    const quoteCode = countryMap[quote];

    if (baseCode && quoteCode) {
      const subSize = Math.max(Math.round(size * 0.65), 12);
      return (
        <div 
          className={`shrink-0 relative flex items-center justify-center select-none ${className}`}
          style={{ width: size, height: size, minWidth: size, minHeight: size }}
          title={symbol}
        >
          {/* Base Currency Flag */}
          <div 
            className="absolute top-0 left-0 rounded-full overflow-hidden border border-black/40 shadow-sm z-10"
            style={{ width: subSize, height: subSize }}
          >
            <img 
              src={`https://s3-symbol-logo.tradingview.com/country/${baseCode}--big.svg`}
              alt={base}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Quote Currency Flag */}
          <div 
            className="absolute bottom-0 right-0 rounded-full overflow-hidden border border-black/40 shadow-sm"
            style={{ width: subSize, height: subSize }}
          >
            <img 
              src={`https://s3-symbol-logo.tradingview.com/country/${quoteCode}--big.svg`}
              alt={quote}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      );
    }
  }

  // Alias commodity Gold to GLD authentic bullion asset
  if (normalizedSymbol === 'GOLD') {
    normalizedSymbol = 'GLD';
  }

  // Dedicated custom SVG logo for Tesla (TSLA)
  if (normalizedSymbol === 'TSLA') {
    return (
      <div 
        className={`shrink-0 flex items-center justify-center ${shapeClass} bg-[#E82127] shadow-sm select-none ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 100 100" fill="white">
          <path d="M50 24.3c-11.8 0-21.7 3.3-27.5 8.4l2.4 4.8c4.6-4 13.5-6.8 25.1-6.8 11.6 0 20.5 2.8 25.1 6.8l2.4-4.8C71.7 27.6 61.8 24.3 50 24.3z" />
          <path d="M50 36.3c-7.3 0-14.2 1.3-18.7 3.6l1.2 5.5c3.6-1.8 9.8-2.9 17.5-2.9 7.7 0 13.9 1.1 17.5 2.9l1.2-5.5C64.2 37.6 57.3 36.3 50 36.3z" />
          <path d="M44.5 45.3v30.4h11V45.3c-1.8.3-3.6.5-5.5.5-1.9 0-3.7-.2-5.5-.5z" />
        </svg>
      </div>
    );
  }

  // Dedicated custom SVG logo for Amazon (AMZN)
  if (normalizedSymbol === 'AMZN') {
    return (
      <div 
        className={`shrink-0 flex items-center justify-center ${shapeClass} bg-[#131921] border border-white/10 shadow-sm select-none ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
          <text x="50%" y="42%" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="42" fontWeight="900" fontFamily="sans-serif">a</text>
          <path d="M25 65 Q50 82 75 62" fill="none" stroke="#FF9900" strokeWidth="7" strokeLinecap="round" />
          <path d="M71 58 L77 62 L73 69 Z" fill="#FF9900" />
        </svg>
      </div>
    );
  }

  // Dedicated custom SVG logo for Google (GOOGL)
  if (normalizedSymbol === 'GOOGL' || normalizedSymbol === 'GOOGLE') {
    return (
      <div 
        className={`shrink-0 flex items-center justify-center ${shapeClass} bg-white shadow-sm select-none ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <svg width={size * 0.75} height={size * 0.75} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      </div>
    );
  }

  // Dedicated custom logo for Apple (AAPL) using authentic Apple logo asset
  if (normalizedSymbol === 'AAPL') {
    return (
      <div 
        className={`shrink-0 flex items-center justify-center ${shapeClass} bg-[#111111] border border-white/10 shadow-sm select-none ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <img
          src="/icons/apple.svg"
          alt="Apple"
          className="object-contain"
          style={{ width: size * 0.58, height: size * 0.58 }}
        />
      </div>
    );
  }


  // Dedicated custom SVG logo for Microsoft (MSFT)
  if (normalizedSymbol === 'MSFT') {
    return (
      <div 
        className={`shrink-0 flex items-center justify-center ${shapeClass} bg-[#111111] border border-white/10 shadow-sm select-none ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24">
          <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
          <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
          <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
          <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
        </svg>
      </div>
    );
  }


  // Dedicated custom SVG logo for Netflix (NFLX)
  if (normalizedSymbol === 'NFLX') {
    return (
      <div 
        className={`shrink-0 flex items-center justify-center ${shapeClass} bg-black border border-[#E50914]/40 shadow-sm select-none ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="#E50914">
          <path d="M5.5 2h3.2l6.8 14.5V2h3.2v20h-3.2L8.7 7.5V22H5.5z"/>
        </svg>
      </div>
    );
  }


  // Dedicated custom SVG logo for Gold (GLD)
  if (normalizedSymbol === 'GLD' || normalizedSymbol === 'GOLD') {
    return (
      <div 
        className={`shrink-0 flex items-center justify-center ${shapeClass} bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-slate-950 font-black shadow-md select-none border border-yellow-200/50 ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    );
  }


  const logoUrl = logoUrls[normalizedSymbol];
  const shortChar = normalizedSymbol.length > 3 ? normalizedSymbol.slice(0, 3) : (normalizedSymbol || '?');
  const fallback = fallbacks[normalizedSymbol] || { char: shortChar, gradient: 'from-slate-600 to-slate-800' };

  useEffect(() => {
    if (logoUrl) {
      if (assetLogoService.isLoaded(logoUrl)) {
        setHasError(false);
      } else if (assetLogoService.isFailed(logoUrl)) {
        setHasError(true);
      } else {
        assetLogoService.preload(logoUrl).then((success) => {
          if (!success) {
            setHasError(true);
          } else {
            setHasError(false);
          }
        });
      }
    }
  }, [logoUrl]);

  if (logoUrl && !hasError) {
    return (
      <div 
        className={`shrink-0 relative flex items-center justify-center ${shapeClass} bg-white/5 select-none overflow-hidden ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <img
          src={logoUrl}
          alt={`${symbol} logo`}
          className={`w-full h-full object-contain p-0.5 ${shapeClass} ${imgClassName}`}
          referrerPolicy="no-referrer"
          onError={() => {
            assetLogoService.markFailed(logoUrl);
            setHasError(true);
          }}
          onLoad={() => {
            assetLogoService.markLoaded(logoUrl);
          }}
        />
      </div>
    );
  }

  // Fallback rendering using clean CSS gradient square and character
  return (
    <div
      className={`shrink-0 flex items-center justify-center ${shapeClass} bg-gradient-to-br ${fallback.gradient} text-white font-bold select-none shadow-sm ${className}`}
      style={{ 
        width: size, 
        height: size,
        minWidth: size,
        minHeight: size,
        fontSize: Math.min(size * 0.45, 14),
      }}
    >
      <span className="notranslate uppercase" translate="no">{fallback.char}</span>
    </div>
  );
}

