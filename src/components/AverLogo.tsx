import React from 'react';

interface AverLogoProps {
  theme?: 'light' | 'dark';
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function AverLogo({ theme = 'dark', size = 32, showText = true, className = '' }: AverLogoProps) {
  const isDark = theme === 'dark';
  
  return (
    <div className={`flex items-center gap-2.5 font-display select-none ${className}`}>
      {/* Official Aver Emblem */}
      <div 
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <img 
          src="/aver_logo_new.png" 
          alt="Aver Logo" 
          className="w-full h-full object-contain rounded-lg drop-shadow-[0_2px_10px_rgba(16,185,129,0.35)]"
          onError={(e) => {
            // Fallback to official brand SVG if image fails to load
            (e.target as HTMLElement).style.display = 'none';
            const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'block';
          }}
        />
        <svg 
          viewBox="0 0 32 32" 
          className="w-full h-full hidden"
          fill="none"
        >
          <defs>
            <linearGradient id="averLogoGrad" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <path d="M16 4 L28 28 L22 28 L16 16 L10 28 L4 28 Z" fill="url(#averLogoGrad)" />
          <circle cx="16" cy="16" r="2" fill="#10b981" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex items-baseline">
          <span className={`font-black tracking-tight text-xl sm:text-2xl font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
            AVER<span className="text-emerald-400">TRADER</span>
          </span>
        </div>
      )}
    </div>
  );
}
