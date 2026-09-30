import React, { useState } from 'react';

interface WalletLogoProps {
  name: string;
  className?: string;
  isLoading?: boolean;
  isConnecting?: boolean;
}

export function WalletLogo({ name, className = "w-6 h-6", isLoading, isConnecting }: WalletLogoProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedName = name.trim().toLowerCase();

  const isCircle = isLoading || isConnecting || className.includes('rounded-full');
  const roundedClass = isCircle ? 'rounded-full' : (className.includes('rounded-') ? '' : 'rounded-lg');

  const hasWidth = /\bw-\S+/.test(className);
  const hasHeight = /\bh-\S+/.test(className);
  const widthClass = hasWidth ? '' : 'w-full';
  const heightClass = hasHeight ? '' : 'h-full';
  const objectFitClass = className.includes('object-') ? '' : 'object-cover';

  const imgClass = `${className} ${widthClass} ${heightClass} ${objectFitClass} ${roundedClass} transition-all duration-200`.trim().replace(/\s+/g, ' ');

  if (normalizedName.includes('metamask')) {
    return (
      <img 
        src="https://api.iconify.design/logos:metamask-icon.svg" 
        alt="MetaMask" 
        className={imgClass} 
      />
    );
  }

  if (normalizedName.includes('walletconnect')) {
    return (
      <img 
        src={hasError ? "https://api.iconify.design/simple-icons:walletconnect.svg" : "/icons/walletconnect.svg"} 
        alt="WalletConnect" 
        className={imgClass} 
        onError={() => setHasError(true)}
      />
    );
  }

  if (normalizedName.includes('coinbase')) {
    return (
      <img 
        src={hasError ? "https://api.iconify.design/simple-icons:coinbase.svg" : "/icons/coinbase.svg"} 
        alt="Coinbase Wallet" 
        className={imgClass} 
        onError={() => setHasError(true)}
      />
    );
  }

  if (normalizedName.includes('phantom')) {
    return (
      <img 
        src={hasError ? "https://api.iconify.design/simple-icons:phantom.svg" : "/icons/phantom.svg"} 
        alt="Phantom" 
        className={imgClass} 
        onError={() => setHasError(true)}
      />
    );
  }

  if (normalizedName.includes('trust')) {
    return (
      <img 
        src={hasError ? "https://api.iconify.design/simple-icons:trustwallet.svg" : "/icons/trustwallet.svg"} 
        alt="Trust Wallet" 
        className={imgClass} 
        onError={() => setHasError(true)}
      />
    );
  }

  if (normalizedName.includes('rabby')) {
    return (
      <img 
        src={hasError ? "https://api.iconify.design/simple-icons:rabby.svg" : "/icons/rabby.svg"} 
        alt="Rabby Wallet" 
        className={imgClass} 
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`w-10 h-10 ${roundedClass || 'rounded-xl'} bg-white/5 border border-white/10 flex items-center justify-center shrink-0`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="15.5" r="5.5"/>
        <path d="m21 2-9.6 9.6"/>
        <path d="m15.5 7.5 3 3"/>
        <path d="m18 5 3 3"/>
      </svg>
    </div>
  );
}

