import React from 'react';
import { ArrowRight } from 'lucide-react';
import { WalletLogo } from './deposit/WalletLogo';

interface WalletOption {
  id: string;
  name: string;
  subtitle: string;
}

interface WalletSelectorProps {
  onSelectWallet?: (walletId: string) => void;
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({ onSelectWallet }) => {
  const wallets: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      subtitle: 'Connect using browser extension or mobile app'
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      subtitle: 'Connect with 100+ mobile & desktop wallets'
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      subtitle: 'Secure institutional self-custody'
    },
    {
      id: 'phantom',
      name: 'Phantom',
      subtitle: 'High-speed multi-chain connection'
    },
    {
      id: 'trustwallet',
      name: 'Trust Wallet',
      subtitle: 'Decentralized multi-asset vault'
    },
    {
      id: 'rabby',
      name: 'Rabby Wallet',
      subtitle: 'Advanced institutional web3 wallet'
    },
    {
      id: 'import',
      name: 'Import Existing Wallet',
      subtitle: 'Use private key or recovery seed phrase'
    }
  ];

  return (
    <div className="w-full max-w-md mx-auto bg-[#0a0a0c] border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <h3 className="text-[10px] font-mono tracking-widest text-white/70 uppercase">
            Web3 Self-Custody
          </h3>
        </div>
      </div>

      {/* Wallet Options List */}
      <div className="space-y-3">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            onClick={() => onSelectWallet?.(wallet.id)}
            className="group flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-blue-500/40 hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              {/* Brand Logo Container */}
              {wallet.id === 'import' || wallet.name === 'Import Existing Wallet' ? (
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7.5" cy="15.5" r="5.5"/>
                    <path d="m21 2-9.6 9.6"/>
                    <path d="m15.5 7.5 3 3"/>
                    <path d="m18 5 3 3"/>
                  </svg>
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center group-hover:border-blue-500/30 transition-colors shadow-inner overflow-hidden flex-shrink-0">
                  <WalletLogo name={wallet.name} className="w-full h-full rounded-xl object-cover" />
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-white tracking-wide">
                  {wallet.name}
                </h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  {wallet.subtitle}
                </p>
              </div>
            </div>
            
            <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-5 pt-4 border-t border-white/5 text-center">
        <p className="text-[10px] text-neutral-500 tracking-widest uppercase font-mono">
          Secured via end-to-end multi-sig session protocol
        </p>
      </div>
    </div>
  );
};
