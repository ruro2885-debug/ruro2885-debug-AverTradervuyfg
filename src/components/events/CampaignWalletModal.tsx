import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Info,
  Layers,
  Coins
} from 'lucide-react';
import { EventItem } from '../../types/events';

interface CampaignWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  onSave: (walletAddress: string, network: string) => Promise<void>;
  savedWallet?: string;
}

interface NetworkConfig {
  id: string;
  name: string;
  chainName: string;
  badge: string;
  placeholder: string;
  prefixHint: string;
  validate: (address: string) => { isValid: boolean; error?: string };
}

// ---------------------------------------------------------------------------
// REAL CRYPTO ADDRESS VALIDATORS
// ---------------------------------------------------------------------------

function validateEVMAddress(address: string): { isValid: boolean; error?: string } {
  const clean = address.trim();
  if (!clean) return { isValid: false, error: "Please enter your wallet address" };
  if (!clean.startsWith('0x') && !clean.startsWith('0X')) {
    return { isValid: false, error: "EVM address must start with '0x'" };
  }
  if (clean.length !== 42) {
    return { isValid: false, error: `EVM address must be 42 characters (currently ${clean.length})` };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
    return { isValid: false, error: "EVM address contains invalid non-hexadecimal characters" };
  }
  if (/^0x0{40}$/i.test(clean)) {
    return { isValid: false, error: "Zero/null address (0x000...) is not a valid recipient" };
  }
  if (/^0x([a-f0-9])\1{39}$/i.test(clean)) {
    return { isValid: false, error: "Repeating dummy address detected. Please enter a real wallet address." };
  }
  return { isValid: true };
}

function validateTRONAddress(address: string): { isValid: boolean; error?: string } {
  const clean = address.trim();
  if (!clean) return { isValid: false, error: "Please enter your TRON wallet address" };
  if (!clean.startsWith('T')) {
    return { isValid: false, error: "TRON (TRC-20) addresses must start with capital letter 'T'" };
  }
  if (clean.length !== 34) {
    return { isValid: false, error: `TRON address must be exactly 34 characters (currently ${clean.length})` };
  }
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(clean)) {
    return { isValid: false, error: "TRON address contains invalid Base58 characters (0, O, I, l not allowed)" };
  }
  if (/^T([1-9A-HJ-NP-Za-km-z])\1{32}$/.test(clean)) {
    return { isValid: false, error: "Repeating dummy address detected. Please enter a real wallet address." };
  }
  return { isValid: true };
}

function validateSolanaAddress(address: string): { isValid: boolean; error?: string } {
  const clean = address.trim();
  if (!clean) return { isValid: false, error: "Please enter your Solana wallet address" };
  if (clean.length < 32 || clean.length > 44) {
    return { isValid: false, error: `Solana address must be between 32 and 44 characters (currently ${clean.length})` };
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) {
    return { isValid: false, error: "Solana address contains invalid Base58 characters" };
  }
  if (/^([1-9A-HJ-NP-Za-km-z])\1{30,}$/.test(clean)) {
    return { isValid: false, error: "Repeating dummy address detected. Please enter a real wallet address." };
  }
  return { isValid: true };
}

function validateBitcoinAddress(address: string): { isValid: boolean; error?: string } {
  const clean = address.trim();
  if (!clean) return { isValid: false, error: "Please enter your Bitcoin wallet address" };
  if (!/^(1|3|bc1)/.test(clean)) {
    return { isValid: false, error: "Bitcoin address must start with '1' (Legacy), '3' (P2SH), or 'bc1' (SegWit/Taproot)" };
  }
  if (clean.length < 26 || clean.length > 62) {
    return { isValid: false, error: `Bitcoin address length must be between 26 and 62 characters (currently ${clean.length})` };
  }
  if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,59})$/.test(clean)) {
    return { isValid: false, error: "Invalid Bitcoin address characters or format" };
  }
  return { isValid: true };
}

export default function CampaignWalletModal({
  isOpen,
  onClose,
  event,
  onSave,
  savedWallet
}: CampaignWalletModalProps) {
  const token = (event.rewardToken || 'USDT').toUpperCase();

  // Define available networks based on reward token
  const networkOptions: NetworkConfig[] = useMemo(() => {
    if (token === 'USDT') {
      return [
        {
          id: 'TRC20',
          name: 'TRON (TRC-20)',
          chainName: 'TRON Network',
          badge: 'Recommended • Fast & Low Fee',
          placeholder: 'e.g. TYDzsYUEpvnYmQk4zGP9sWWcTEd3ZiPVu5',
          prefixHint: 'Starts with "T", 34 chars',
          validate: validateTRONAddress
        },
        {
          id: 'ERC20',
          name: 'Ethereum (ERC-20)',
          chainName: 'Ethereum Mainnet',
          badge: 'Standard ERC-20',
          placeholder: 'e.g. 0x71C8705E3A88e52F666bc040b2fB856333333333',
          prefixHint: 'Starts with "0x", 42 chars',
          validate: validateEVMAddress
        },
        {
          id: 'BEP20',
          name: 'BNB Smart Chain (BEP-20)',
          chainName: 'BNB Chain',
          badge: 'Low Gas Fees',
          placeholder: 'e.g. 0x71C8705E3A88e52F666bc040b2fB856333333333',
          prefixHint: 'Starts with "0x", 42 chars',
          validate: validateEVMAddress
        },
        {
          id: 'SOL',
          name: 'Solana (SPL)',
          chainName: 'Solana Network',
          badge: 'Instant Settlement',
          placeholder: 'e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          prefixHint: 'Base58 string, 32-44 chars',
          validate: validateSolanaAddress
        }
      ];
    }

    if (token === 'BTC') {
      return [
        {
          id: 'BTC_NATIVE',
          name: 'Bitcoin Native (SegWit / Taproot)',
          chainName: 'Bitcoin Network',
          badge: 'Recommended',
          placeholder: 'e.g. bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          prefixHint: 'Starts with "bc1", "1", or "3"',
          validate: validateBitcoinAddress
        }
      ];
    }

    if (token === 'ETH') {
      return [
        {
          id: 'ETH_ERC20',
          name: 'Ethereum (ERC-20)',
          chainName: 'Ethereum Mainnet',
          badge: 'Mainnet Native',
          placeholder: 'e.g. 0x71C8705E3A88e52F666bc040b2fB856333333333',
          prefixHint: 'Starts with "0x", 42 chars',
          validate: validateEVMAddress
        },
        {
          id: 'ARB_ONE',
          name: 'Arbitrum One (L2)',
          chainName: 'Arbitrum Network',
          badge: 'Low Gas L2',
          placeholder: 'e.g. 0x71C8705E3A88e52F666bc040b2fB856333333333',
          prefixHint: 'Starts with "0x", 42 chars',
          validate: validateEVMAddress
        }
      ];
    }

    if (token === 'SOL') {
      return [
        {
          id: 'SOL_NATIVE',
          name: 'Solana (SPL)',
          chainName: 'Solana Network',
          badge: 'Native SOL',
          placeholder: 'e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          prefixHint: 'Base58 string, 32-44 chars',
          validate: validateSolanaAddress
        }
      ];
    }

    if (token === 'AVR') {
      return [
        {
          id: 'AVR_PROTOCOL',
          name: 'Aver Neural Protocol (Arbitrum / EVM)',
          chainName: 'Aver Protocol L2',
          badge: 'Official AVR Token Payout',
          placeholder: 'e.g. 0x71C8705E3A88e52F666bc040b2fB856333333333',
          prefixHint: 'Starts with "0x", 42 chars',
          validate: validateEVMAddress
        },
        {
          id: 'ETH_MAINNET',
          name: 'Ethereum Mainnet (ERC-20)',
          chainName: 'Ethereum',
          badge: 'ERC-20 AVR',
          placeholder: 'e.g. 0x71C8705E3A88e52F666bc040b2fB856333333333',
          prefixHint: 'Starts with "0x", 42 chars',
          validate: validateEVMAddress
        }
      ];
    }

    if (token === 'TRX') {
      return [
        {
          id: 'TRX_MAINNET',
          name: 'TRON Mainnet (TRC-20)',
          chainName: 'TRON Network',
          badge: 'Native TRX',
          placeholder: 'e.g. TYDzsYUEpvnYmQk4zGP9sWWcTEd3ZiPVu5',
          prefixHint: 'Starts with "T", 34 chars',
          validate: validateTRONAddress
        }
      ];
    }

    // Default Fallback
    return [
      {
        id: 'EVM_DEFAULT',
        name: `${token} (EVM / ERC-20)`,
        chainName: 'EVM Compatible',
        badge: 'Default Network',
        placeholder: 'e.g. 0x71C8705E3A88e52F666bc040b2fB856333333333',
        prefixHint: 'Starts with "0x", 42 chars',
        validate: validateEVMAddress
      },
      {
        id: 'TRON_DEFAULT',
        name: `${token} (TRON / TRC-20)`,
        chainName: 'TRON Network',
        badge: 'TRC-20 Compatible',
        placeholder: 'e.g. TYDzsYUEpvnYmQk4zGP9sWWcTEd3ZiPVu5',
        prefixHint: 'Starts with "T", 34 chars',
        validate: validateTRONAddress
      }
    ];
  }, [token]);

  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(networkOptions[0]?.id || 'TRC20');
  const [addressInput, setAddressInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [touched, setTouched] = useState<boolean>(false);
  const [copiedPaste, setCopiedPaste] = useState<boolean>(false);

  // Sync selected network if options change
  useEffect(() => {
    if (networkOptions.length > 0) {
      setSelectedNetworkId(networkOptions[0].id);
    }
  }, [networkOptions]);

  // Pre-populate if saved wallet exists
  useEffect(() => {
    if (isOpen) {
      if (savedWallet) {
        setAddressInput(savedWallet);
        setTouched(true);
      } else {
        setAddressInput('');
        setTouched(false);
      }
      setIsSaving(false);
    }
  }, [isOpen, savedWallet]);

  const activeNetwork = useMemo(() => {
    return networkOptions.find(n => n.id === selectedNetworkId) || networkOptions[0];
  }, [networkOptions, selectedNetworkId]);

  // Real-time validation computation
  const validationResult = useMemo(() => {
    if (!addressInput.trim()) {
      return { isValid: false, error: "Wallet address is required for reward distribution." };
    }
    return activeNetwork.validate(addressInput);
  }, [addressInput, activeNetwork]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAddressInput(text.trim());
        setTouched(true);
        setCopiedPaste(true);
        setTimeout(() => setCopiedPaste(false), 2000);
      }
    } catch (e) {
      console.warn("Clipboard paste not permitted", e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validationResult.isValid) return;

    setIsSaving(true);
    try {
      await onSave(addressInput.trim(), activeNetwork.name);
      onClose();
    } catch (err) {
      console.error("Failed to save campaign wallet address:", err);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="campaign-wallet-modal-overlay"
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSaving) onClose();
        }}
      >
        <motion.div
          id="campaign-wallet-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-[#070D18] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* TOP HEADER */}
          <div className="p-6 border-b border-white/10 flex items-start justify-between bg-gradient-to-r from-slate-900/90 via-[#070D18] to-slate-900/90">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/10">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Payout Destination
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    {token} Pool
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1 tracking-tight">Register Campaign Payout Wallet</h3>
              </div>
            </div>

            <button
              id="close-wallet-modal-btn"
              onClick={onClose}
              disabled={isSaving}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* MODAL FORM BODY */}
          <form onSubmit={handleSave} className="p-6 space-y-6">
            
            {/* Event Reward Context Banner */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Prize Allocation</p>
                <p className="text-base font-black text-white mt-0.5 truncate max-w-[220px] sm:max-w-xs">{event.title}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase">Pool Currency</span>
                <p className="text-sm font-black text-amber-400">{token}</p>
              </div>
            </div>

            {/* Step 1: Network Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  1. Select Destination Network ({token})
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Match recipient network</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {networkOptions.map((net) => {
                  const isSelected = selectedNetworkId === net.id;
                  return (
                    <button
                      key={net.id}
                      type="button"
                      onClick={() => {
                        setSelectedNetworkId(net.id);
                        setTouched(true);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{net.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium ${isSelected ? 'text-emerald-300' : 'text-slate-500'}`}>
                        {net.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Real Wallet Address Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  2. Enter {token} ({activeNetwork.name}) Address
                </label>
                
                <button
                  type="button"
                  onClick={handlePaste}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
                >
                  {copiedPaste ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPaste ? 'Pasted!' : 'Paste Address'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  id="campaign-wallet-address-input"
                  type="text"
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    if (!touched) setTouched(true);
                  }}
                  onBlur={() => setTouched(true)}
                  placeholder={activeNetwork.placeholder}
                  className={`w-full px-4 py-3.5 rounded-2xl bg-slate-950/90 border font-mono text-xs text-white placeholder-slate-600 focus:outline-none transition-all ${
                    touched && !validationResult.isValid && addressInput.trim()
                      ? 'border-rose-500/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                      : touched && validationResult.isValid
                      ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                      : 'border-white/15 focus:border-emerald-500/60'
                  }`}
                  autoFocus
                />
                
                {addressInput.trim() && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {validationResult.isValid ? (
                      <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400" title="Valid Format">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-full bg-rose-500/20 text-rose-400" title="Invalid Format">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Real-time Address Format Feedback */}
              <div className="min-h-[22px] text-xs">
                {addressInput.trim() ? (
                  validationResult.isValid ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Valid {activeNetwork.name} wallet address format</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{validationResult.error}</span>
                    </div>
                  )
                ) : (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>{activeNetwork.prefixHint}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Protocol Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start space-x-3 text-[11px] text-amber-300/90 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Rewards from this tournament are distributed on-chain directly to this verified destination address upon campaign settlement.
              </span>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs border border-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                id="save-campaign-wallet-btn"
                type="submit"
                disabled={!validationResult.isValid || isSaving}
                className={`px-7 py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                  validationResult.isValid && !isSaving
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white shadow-emerald-500/25 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Saving & Registering...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Wallet & Register</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
