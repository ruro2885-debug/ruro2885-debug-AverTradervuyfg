import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { safeStorage } from '../../utils/storage';
import { 
  ArrowLeft, Shield, Lock, Unlock, Landmark, ArrowUpRight, 
  ArrowDownRight, History, Sliders, Settings, KeyRound, AlertCircle,
  TrendingUp, Sparkles, CheckCircle2, ChevronRight
} from 'lucide-react';
import CoinLogo from '../CoinLogo';
import { useAuth } from '../../contexts/AuthContext';
import { transactionService } from '../../services/transactionService';
import { useFinancials } from '../../hooks/useFinancials';

interface VaultScreenProps {
  key?: React.Key;
  theme: 'light' | 'dark';
  onBack: () => void;
  activeTradingBalance: number;
  showNotification: (msg: string) => void;
  vaultBalance: number;
  setVaultBalance: React.Dispatch<React.SetStateAction<number>>;
  activeBalanceOffset: number;
  setActiveBalanceOffset: React.Dispatch<React.SetStateAction<number>>;
}

export default function VaultScreen({
  theme,
  onBack,
  activeTradingBalance,
  showNotification,
  vaultBalance,
  setVaultBalance,
  activeBalanceOffset,
  setActiveBalanceOffset,
}: VaultScreenProps) {
  const isDark = theme === 'dark';

  // State Management
  const [isVaultOnboarded, setIsVaultOnboarded] = useState<boolean>(() => {
    return safeStorage.getItem('vault_onboarded') === 'true';
  });
  const [vaultPasscode, setVaultPasscode] = useState<string>(() => {
    return safeStorage.getItem('vault_passcode') || '';
  });
  const [vaultState, setVaultState] = useState<'setup' | 'locked' | 'unlocked'>(
    isVaultOnboarded ? 'locked' : 'setup'
  );
  
  // Authentication PIN states
  const [vaultSetupStep, setVaultSetupStep] = useState<number>(1);
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [passcodeConfirm, setPasscodeConfirm] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isPasscodeConfirming, setIsPasscodeConfirming] = useState<boolean>(false);
  const [shakeTrigger, setShakeTrigger] = useState<boolean>(false);

  // Sub-screens for Deposit / Withdraw / Settings
  const [activeSubScreen, setActiveSubScreen] = useState<'dashboard' | 'deposit' | 'withdraw' | 'settings'>('dashboard');
  
  const { user, updateProfile } = useAuth();
  const { addFundsToActiveBalance, updateVaultBalance, executeVaultTransfer } = useFinancials();

  // Target lock state (Target can only be configured ONCE)
  const [isTargetConfigured, setIsTargetConfigured] = useState<boolean>(() => {
    const configured = safeStorage.getItem('vault_target_configured');
    if (configured === 'true') return true;
    if ((user as any)?.isVaultTargetConfigured) return true;
    const existingTarget = Number(safeStorage.getItem('vault_target')) || (user as any)?.vaultTarget || 0;
    return existingTarget > 0;
  });

  const [vaultTarget, setVaultTarget] = useState<number>(() => {
    return Number(safeStorage.getItem('vault_target')) || (user as any)?.vaultTarget || 0;
  });
  const [showTargetPopup, setShowTargetPopup] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<string>(vaultTarget.toString());

  // Vault assets state breakdown
  const [vaultAssets, setVaultAssets] = useState<{ BTC: number; ETH: number; USDT: number }>(() => {
    const stored = safeStorage.getItem('vault_assets');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.BTC === 'number' && typeof parsed.ETH === 'number' && typeof parsed.USDT === 'number') {
          return parsed;
        }
      } catch (e) {}
    }
    const currentBal = vaultBalance || Number(safeStorage.getItem('portfolio_vault_balance')) || 0;
    if (currentBal > 0) {
      return {
        BTC: currentBal * 0.45,
        ETH: currentBal * 0.35,
        USDT: currentBal * 0.20
      };
    }
    return { BTC: 0, ETH: 0, USDT: 0 };
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync vault assets with vault balance safely
  useEffect(() => {
    const sum = (vaultAssets.BTC || 0) + (vaultAssets.ETH || 0) + (vaultAssets.USDT || 0);
    if (vaultBalance > 0 && sum === 0) {
      const seedAssets = {
        BTC: vaultBalance * 0.45,
        ETH: vaultBalance * 0.35,
        USDT: vaultBalance * 0.20
      };
      setVaultAssets(seedAssets);
      safeStorage.setItem('vault_assets', JSON.stringify(seedAssets));
    }
  }, [vaultAssets, vaultBalance]);

  // Passive Income Yield Accrual (10% APY compounded hourly)
  useEffect(() => {
    if (vaultBalance > 0) {
      const lastYield = parseInt(safeStorage.getItem('vault_last_yield') || '0');
      const now = Date.now();
      if (now - lastYield > 3600000) {
        const passiveAmt = Math.max(0.50, vaultBalance * 0.0001);
        const nextBal = vaultBalance + passiveAmt;
        setVaultBalance(nextBal);
        safeStorage.setItem('portfolio_vault_balance', nextBal.toString());
        safeStorage.setItem('vault_last_yield', now.toString());
        if (user?.uid) {
          transactionService.recordTransaction({
            userId: user.uid,
            type: 'interest',
            category: 'transactions',
            title: 'Passive Vault Yield (10% APY)',
            amount: passiveAmt,
            asset: 'USDT',
            network: 'Secure Vault',
            status: 'Completed',
            description: 'Auto-compounding passive yield earned in secure savings vault'
          }).catch(() => {});
        }
        showNotification(`Passive Vault Yield: +$${passiveAmt.toFixed(2)} earned in secure savings!`);
      }
    }
  }, [vaultBalance, user?.uid]);
  
  // Deposit/Withdraw form state
  const [actionAsset, setActionAsset] = useState<'BTC' | 'ETH' | 'USDT'>('USDT');
  const [actionAmount, setActionAmount] = useState<string>('');
  const [goalName, setGoalName] = useState<string>('Emergency Reserve');
  const [withdrawPINInput, setWithdrawPINInput] = useState<string>('');
  const [withdrawPINError, setWithdrawPINError] = useState<string | null>(null);

  // Auto save state settings
  const [autoSaveGainPercent, setAutoSaveGainPercent] = useState<number>(10);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const [volatilityReserveEnabled, setVolatilityReserveEnabled] = useState<boolean>(false);

  const activeCapital = Math.max(0, activeTradingBalance);

  // Protected assets breakdown dynamically computed from vaultAssets
  const protectedAssets = [
    { ticker: 'BTC', name: 'Bitcoin Reserves', qty: `${((vaultAssets.BTC || 0) / 64000).toFixed(5)} BTC`, value: vaultAssets.BTC || 0, color: '#f59e0b' },
    { ticker: 'ETH', name: 'Ethereum Collateral', qty: `${((vaultAssets.ETH || 0) / 3450).toFixed(4)} ETH`, value: vaultAssets.ETH || 0, color: '#6366f1' },
    { ticker: 'USDT', name: 'Tether USD', qty: `$${(vaultAssets.USDT || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT`, value: vaultAssets.USDT || 0, color: '#10b981' },
  ];

  // Simulated Protection History OR real database-backed logs
  const [vaultHistory, setVaultHistory] = useState<{ id: string; type: string; asset: string; amount: number; date: string; status: string }[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = transactionService.subscribeUserTransactions(user.uid, (txs) => {
      // Filter for vault-related transactions
      const vaultTxs = txs.filter(tx => 
        tx.network === 'Secure Vault' || 
        tx.title?.toLowerCase().includes('vault') ||
        tx.description?.toLowerCase().includes('vault')
      ).map(tx => {
        let dateStr = 'Just now';
        if (tx.timestamp) {
          try {
            const dateObj = new Date(tx.timestamp);
            dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) + ', ' + dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
          } catch (e) {}
        }
        return {
          id: tx.id,
          type: tx.title?.toLowerCase().includes('withdrawal') ? 'Withdrawal' : 'Deposit',
          asset: tx.asset || 'USDT',
          amount: tx.amount,
          date: dateStr,
          status: tx.status || 'Completed'
        };
      });
      setVaultHistory(vaultTxs);
    });
    return unsub;
  }, [user?.uid]);

  // Handle number click on PIN Pad
  const handlePinClick = (num: number) => {
    setPasscodeError(null);
    if (!isPasscodeConfirming) {
      if (passcodeInput.length < 6) {
        const next = passcodeInput + num;
        setPasscodeInput(next);
        if (next.length === 6) {
          if (vaultState === 'setup') {
            setIsPasscodeConfirming(true);
          } else {
            // Verify PIN for unlocking
            if (next === vaultPasscode) {
              setVaultState('unlocked');
              setActiveSubScreen('dashboard');
              showNotification("Vault unlocked successfully.");
            } else {
              triggerShake();
              setPasscodeInput('');
              setPasscodeError("Invalid security PIN. Please try again.");
            }
          }
        }
      }
    } else {
      if (passcodeConfirm.length < 6) {
        const next = passcodeConfirm + num;
        setPasscodeConfirm(next);
        if (next.length === 6) {
          if (next === passcodeInput) {
            safeStorage.setItem('vault_passcode', passcodeInput);
            safeStorage.setItem('vault_onboarded', 'true');
            setVaultPasscode(passcodeInput);
            setIsVaultOnboarded(true);
            setVaultState('unlocked');
            setActiveSubScreen('dashboard');
            showNotification("Secure Vault Activated.");
          } else {
            triggerShake();
            setPasscodeConfirm('');
            setPasscodeError("PIN code mismatch. Let's try again.");
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (!isPasscodeConfirming) {
      setPasscodeInput(prev => prev.slice(0, -1));
    } else {
      setPasscodeConfirm(prev => prev.slice(0, -1));
    }
  };

  const triggerShake = () => {
    setShakeTrigger(true);
    setTimeout(() => setShakeTrigger(false), 500);
  };

  // Reset/Reset Onboarding
  const handleResetVault = () => {
    if (window.confirm("Are you sure you want to completely reset your Vault? This will clear your passcode and restore default savings balance.")) {
      safeStorage.removeItem('vault_passcode');
      safeStorage.removeItem('vault_onboarded');
      safeStorage.removeItem('portfolio_vault_balance');
      setIsVaultOnboarded(false);
      setVaultPasscode('');
      setVaultBalance(0);
      setVaultState('setup');
      setVaultSetupStep(1);
      setPasscodeInput('');
      setPasscodeConfirm('');
      setIsPasscodeConfirming(false);
      setActiveSubScreen('dashboard');
      showNotification("Vault reset completed.");
    }
  };

  // Execute Deposit
  const handleConfirmDeposit = async () => {
    const amt = parseFloat(actionAmount);
    if (isNaN(amt) || amt <= 0) {
      showNotification("Please enter a valid amount.");
      return;
    }
    if (amt > activeCapital) {
      showNotification("Inadequate Active Trading Capital to protect this amount.");
      return;
    }

    const success = await executeVaultTransfer(amt, 'deposit');
    if (!success) {
      showNotification("Deposit failed. Insufficient active capital.");
      return;
    }

    const nextBal = vaultBalance + amt;
    const selectedAssetKey = (actionAsset as 'BTC' | 'ETH' | 'USDT') || 'USDT';
    const nextVaultAssets = {
      ...vaultAssets,
      [selectedAssetKey]: (vaultAssets[selectedAssetKey] || 0) + amt
    };

    setVaultAssets(nextVaultAssets);
    safeStorage.setItem('vault_assets', JSON.stringify(nextVaultAssets));
    setVaultBalance(nextBal);

    setActionAmount('');
    setActiveSubScreen('dashboard');
    showNotification(`Protected $${amt.toLocaleString()} inside your secure Vault.`);
  };

  // Execute Withdrawal
  const handleConfirmWithdrawal = async () => {
    const amt = parseFloat(actionAmount);
    if (isNaN(amt) || amt <= 0) {
      showNotification("Please enter a valid amount.");
      return;
    }
    if (vaultTarget > 0 && vaultBalance < vaultTarget) {
      showNotification(`Withdrawal locked: You cannot withdraw until you reach your savings target of $${vaultTarget.toLocaleString()} (Current balance: $${vaultBalance.toLocaleString()}).`);
      return;
    }
    if (amt > vaultBalance) {
      showNotification("Withdrawal exceeds currently protected Vault balance.");
      return;
    }

    // Verify PIN for withdraw
    if (withdrawPINInput !== vaultPasscode) {
      setWithdrawPINError("Incorrect Security PIN. Authorization denied.");
      triggerShake();
      return;
    }

    const success = await executeVaultTransfer(amt, 'withdraw');
    if (!success) {
      showNotification("Withdrawal failed. Check vault balance.");
      return;
    }

    const nextBal = Math.max(0, vaultBalance - amt);
    const selectedAssetKey = (actionAsset as 'BTC' | 'ETH' | 'USDT') || 'USDT';
    const currentAssetVal = vaultAssets[selectedAssetKey] || 0;
    
    let nextVaultAssets = { ...vaultAssets };
    if (currentAssetVal >= amt) {
      nextVaultAssets[selectedAssetKey] = currentAssetVal - amt;
    } else {
      const remainingToDeduct = amt - currentAssetVal;
      nextVaultAssets[selectedAssetKey] = 0;
      const otherKeys = (['BTC', 'ETH', 'USDT'] as const).filter(k => k !== selectedAssetKey);
      const otherSum = (nextVaultAssets[otherKeys[0]] || 0) + (nextVaultAssets[otherKeys[1]] || 0);
      if (otherSum > 0) {
        nextVaultAssets[otherKeys[0]] = Math.max(0, nextVaultAssets[otherKeys[0]] - (remainingToDeduct * (nextVaultAssets[otherKeys[0]] / otherSum)));
        nextVaultAssets[otherKeys[1]] = Math.max(0, nextVaultAssets[otherKeys[1]] - (remainingToDeduct * (nextVaultAssets[otherKeys[1]] / otherSum)));
      }
    }

    setVaultAssets(nextVaultAssets);
    safeStorage.setItem('vault_assets', JSON.stringify(nextVaultAssets));
    setVaultBalance(nextBal);

    setActionAmount('');
    setWithdrawPINInput('');
    setWithdrawPINError(null);
    setActiveSubScreen('dashboard');
    showNotification(`Unlocked $${amt.toLocaleString()} back to Active Trading Capital.`);
  };

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardClasses = isDark 
    ? "bg-[#0E1320] border border-white/[0.05]" 
    : "bg-white border border-slate-200/60";

  return (
    <motion.div 
      layoutId="vault-card-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`h-screen pt-[73px] ${isDark ? 'bg-[#000000]' : 'bg-slate-50'} ${isDark ? 'text-slate-100' : 'text-slate-800'} font-sans relative flex flex-col justify-start overflow-hidden`}
    >
      {/* HEADER BAR */}
      <header className={`fixed top-0 left-0 right-0 h-[60px] z-40 backdrop-blur-md border-b ${isDark ? 'bg-[#000000]/80 border-white/5' : 'bg-slate-50/80 border-slate-200'} px-4 lg:px-8 flex justify-between items-center box-border`}>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              if (activeSubScreen !== 'dashboard' && vaultState === 'unlocked') {
                setActiveSubScreen('dashboard');
                setActionAmount('');
                setWithdrawPINInput('');
                setWithdrawPINError(null);
              } else {
                onBack();
              }
            }}
            className={`p-1.5 bg-white/[0.02] hover:bg-white/[0.06] border ${isDark ? 'border-white/[0.05]' : 'border-slate-200'} text-slate-300 rounded-xl transition-all cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]`}
          >
            <ArrowLeft className={`w-4 h-4 ${isDark ? 'text-slate-200' : 'text-slate-700'}`} />
          </button>
          <div>
            <motion.h1 
              layoutId="vault-title"
              className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}
            >
              <Shield className="w-4 h-4 text-[#00D09C]" />
              Aver Private Vault
            </motion.h1>
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest block leading-none">
              Sovereign Savings System
            </span>
          </div>
        </div>
        {vaultState === 'unlocked' && activeSubScreen === 'dashboard' && (
          <button 
            onClick={() => {
              setVaultState('locked');
              setPasscodeInput('');
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isDark ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-[#FF6B6B]" />
            Lock Vault
          </button>
        )}
      </header>

      {/* BODY WORKSPACE */}
      <main className="w-full flex-grow flex flex-col px-4 sm:px-6 lg:max-w-5xl lg:mx-auto overflow-y-auto">
        <div className="w-full py-5 flex flex-col justify-start">
        
        {/* 1. SETUP FLOW SCREEN */}
        {vaultState === 'setup' && (
          <div className="flex-1 flex flex-col justify-center py-6">
            {vaultSetupStep === 1 ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 text-center"
              >
                <div className="w-18 h-18 bg-[#00D09C]/10 rounded-3xl flex items-center justify-center mx-auto border border-[#00D09C]/20 shadow-lg">
                  <Shield className="w-8 h-8 text-[#00D09C]" />
                </div>
                
                <div className="space-y-2">
                  <h2 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Secure Your Capital Offline
                  </h2>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                    The Aver Savings Vault excludes your capital from active AI automated rotation. Assets protected inside are locked, isolated, and completely decoupled from market volatility.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border text-left space-y-3 ${cardClasses}`}>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Anti-Volatility Shield</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">Assets are secured in cold stable stores excluded from active leveraged operations.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Sovereign Encryption PIN</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">Requires high-entropy 6-digit passcode to decrypt, access, or withdraw.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Instant Unlocking</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">No lockup durations. Instantly sweep funds back into Active Trading when needed.</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setVaultSetupStep(2)}
                  className="w-full bg-[#00D09C] hover:bg-[#00b084] text-black font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs cursor-pointer transition-all shadow-md mt-4"
                >
                  Create Security Passcode
                </button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center"
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                    {!isPasscodeConfirming ? 'Create 6-Digit PIN' : 'Verify Security PIN'}
                  </h3>
                  <p className="text-slate-400 text-xs">
                    {!isPasscodeConfirming 
                      ? 'Secure your offline assets with a private PIN.' 
                      : 'Re-enter your passcode to register encryption key.'}
                  </p>
                </div>

                {/* Dot Pin indicators */}
                <div className={`flex justify-center space-x-3.5 py-4 ${shakeTrigger ? 'animate-bounce' : ''}`}>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const digits = !isPasscodeConfirming ? passcodeInput : passcodeConfirm;
                    const isActive = digits.length > idx;
                    return (
                      <div 
                        key={idx}
                        className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                          isActive 
                            ? 'bg-[#00D09C] border-[#00D09C] scale-110 shadow-[0_0_8px_rgba(0,208,156,0.5)]' 
                            : 'border-white/10 bg-transparent'
                        }`}
                      />
                    );
                  })}
                </div>

                {passcodeError && (
                  <p className="text-xs font-semibold text-[#FF6B6B] animate-pulse flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    {passcodeError}
                  </p>
                )}

                {/* PIN PAD */}
                <div className="max-w-[280px] mx-auto grid grid-cols-3 gap-3.5 pt-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => handlePinClick(num)}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold hover:bg-white/5 border border-white/[0.03] bg-[#0E1320]/45 text-white active:scale-95 transition-all cursor-pointer`}
                    >
                      {num}
                    </button>
                  ))}
                  <button 
                    onClick={() => {
                      if (isPasscodeConfirming) {
                        setIsPasscodeConfirming(false);
                        setPasscodeConfirm('');
                        setPasscodeInput('');
                        setPasscodeError(null);
                      } else {
                        setVaultSetupStep(1);
                        setPasscodeInput('');
                      }
                    }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-xs font-semibold text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => handlePinClick(0)}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold hover:bg-white/5 border border-white/[0.03] bg-[#0E1320]/45 text-white active:scale-95 transition-all cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    onClick={handleBackspace}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-xs font-semibold text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* 2. LOCKED SCREEN */}
        {vaultState === 'locked' && (
          <div className="flex-1 flex flex-col justify-center py-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 text-center"
            >
              <div className="w-18 h-18 bg-[#FF6B6B]/10 rounded-3xl flex items-center justify-center mx-auto border border-[#FF6B6B]/20 shadow-lg">
                <Lock className="w-8 h-8 text-[#FF6B6B]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                  Vault Locked
                </h3>
                <p className="text-slate-400 text-xs">
                  Enter your 6-digit passcode to decrypt savings.
                </p>
              </div>

              {/* Dot indicators */}
              <div className={`flex justify-center space-x-3.5 py-2 ${shakeTrigger ? 'animate-bounce' : ''}`}>
                {Array.from({ length: 6 }).map((_, idx) => {
                  const isActive = passcodeInput.length > idx;
                  return (
                    <div 
                      key={idx}
                      className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                        isActive 
                          ? 'bg-[#FF6B6B] border-[#FF6B6B] scale-110 shadow-[0_0_8px_rgba(255,107,107,0.5)]' 
                          : 'border-white/10 bg-transparent'
                      }`}
                    />
                  );
                })}
              </div>

              {passcodeError && (
                <p className="text-xs font-semibold text-[#FF6B6B] animate-pulse flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {passcodeError}
                </p>
              )}

              {/* PIN PAD */}
              <div className="max-w-[280px] mx-auto grid grid-cols-3 gap-3.5 pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => handlePinClick(num)}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold hover:bg-white/5 border border-white/[0.03] bg-[#0E1320]/45 text-white active:scale-95 transition-all cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  onClick={handleResetVault}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-[10px] font-bold text-[#FF6B6B] hover:opacity-80 cursor-pointer active:scale-95 transition-all leading-snug p-1"
                >
                  Reset Vault
                </button>
                <button
                  onClick={() => handlePinClick(0)}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold hover:bg-white/5 border border-white/[0.03] bg-[#0E1320]/45 text-white active:scale-95 transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xs font-semibold text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. UNLOCKED SUB-SCREENS */}
        {vaultState === 'unlocked' && (
          <div className="flex-1 flex flex-col space-y-5">
            
            {/* SUB-SCREEN: DASHBOARD */}
            {activeSubScreen === 'dashboard' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5 flex-grow"
              >
                {/* VAULT BALANCE BLOCK */}
                <div className={`p-6 rounded-[24px] border ${cardClasses} space-y-4 text-center relative overflow-hidden`}>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block flex items-center justify-center gap-1.5">
                      <Unlock className="w-3.5 h-3.5 text-[#00D09C]" />
                      Decrypted Vault Balance
                    </span>
                    <div className="flex items-baseline justify-center space-x-1.5">
                      <span className="text-3.5xl font-extrabold text-white tracking-tight">
                        ${vaultBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-bold text-slate-400 font-mono">USD</span>
                    </div>
                  </div>

                  {/* Savings Goals Target Progress */}
                  <div className="pt-4 border-t border-white/[0.04] space-y-2 text-left">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400 uppercase tracking-wider">Goal: {goalName}</span>
                      {isTargetConfigured ? (
                        <span className="text-slate-400 font-mono">
                          Target: ${vaultTarget.toLocaleString()} <span className="text-slate-500 text-[9px]">(Locked)</span>
                        </span>
                      ) : (
                        <button 
                          onClick={() => {
                            setTargetInput(vaultTarget.toString());
                            setShowTargetPopup(true);
                          }}
                          className="text-[#00D09C] font-mono hover:underline cursor-pointer"
                        >
                          Target: ${vaultTarget.toLocaleString()} (Set Target)
                        </button>
                      )}
                    </div>
                    <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-[#00D09C] rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (vaultBalance / (vaultTarget || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold font-mono leading-none">
                      <span>{Math.round((vaultBalance / (vaultTarget || 1)) * 100)}% Completed</span>
                      <span>Remaining: ${(vaultTarget - vaultBalance > 0 ? vaultTarget - vaultBalance : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  {/* ACTION GRID */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => {
                        setActionAmount('');
                        setActiveSubScreen('deposit');
                      }}
                      className="py-3 bg-[#00D09C] hover:bg-[#00b084] text-black font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Deposit Capital
                    </button>
                    <button 
                      onClick={() => {
                        if (vaultBalance < vaultTarget) {
                          showNotification(`Vault Locked: Savings target of $${vaultTarget.toLocaleString()} has not been reached yet! Current balance: $${vaultBalance.toLocaleString()}. The vault cannot be opened until your target is fully reached.`);
                          return;
                        }
                        setActionAmount('');
                        setActiveSubScreen('withdraw');
                      }}
                      className="py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-slate-200 hover:text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      Unlock Savings
                    </button>
                  </div>
                </div>

                {/* PROTECTED ASSETS LIST */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Protected Reserve Assets
                  </span>
                  <div className="space-y-2">
                    {protectedAssets.map(asset => (
                      <div 
                        key={asset.ticker}
                        className={`p-3.5 border ${isDark ? 'bg-slate-900/60 border-white/[0.04]' : 'bg-white/70 border-slate-200'} rounded-2xl flex justify-between items-center`}
                      >
                        <div className="flex items-center space-x-3">
                          <CoinLogo symbol={asset.ticker} size={32} className="rounded-full border border-white/10" />
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight">{asset.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {asset.qty}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-white block font-mono">
                            ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AUTO SAVE CONFIGURATION SETTINGS */}
                <div className={`p-4 rounded-[20px] border ${cardClasses} space-y-3.5 shadow-sm`}>
                  <div className="flex justify-between items-center border-b border-white/[0.03] pb-2">
                    <div className="flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-[#00D09C]" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Auto-Save Integration</h4>
                    </div>
                    <span className="text-[9px] bg-[#00D09C]/15 text-[#00D09C] px-2 py-0.5 rounded-md font-semibold font-mono">AI Active</span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-semibold">
                    <div className="space-y-0.5">
                      <span className="text-slate-200 block">AI Profit Sweeper</span>
                      <p className="text-[10px] text-slate-400 leading-none">Sweeps percentage of active daily trading profits</p>
                    </div>
                    <button 
                      onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                      className={`w-10 h-6 rounded-full p-1 transition-all ${autoSaveEnabled ? 'bg-[#00D09C]' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black transition-all ${autoSaveEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {autoSaveEnabled && (
                    <div className="p-3 bg-black/40 border border-white/[0.04] rounded-xl space-y-2">
                      <div className="flex justify-between text-[10px] font-bold font-mono">
                        <span className="text-slate-400">Profit Sweeping Rate</span>
                        <span className="text-[#00D09C]">{autoSaveGainPercent}% of gains</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="50" 
                        value={autoSaveGainPercent}
                        onChange={(e) => setAutoSaveGainPercent(parseInt(e.target.value))}
                        className="w-full accent-[#00D09C]"
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs font-semibold pt-1">
                    <div className="space-y-0.5">
                      <span className="text-slate-200 block">Systemic Volatility Guard</span>
                      <p className="text-[10px] text-slate-400 leading-none">Instantly protects 5% of trading capital during spikes</p>
                    </div>
                    <button 
                      onClick={() => setVolatilityReserveEnabled(!volatilityReserveEnabled)}
                      className={`w-10 h-6 rounded-full p-1 transition-all ${volatilityReserveEnabled ? 'bg-[#00D09C]' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black transition-all ${volatilityReserveEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* SAVINGS PROTECTION LOGS */}
                <div className={`p-4 rounded-[20px] border ${cardClasses} space-y-3 shadow-sm`}>
                  <div className="flex items-center space-x-2 border-b border-white/[0.03] pb-2">
                    <History className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Vault Protection Logs</h4>
                  </div>
                  <div className="space-y-3 pr-1">
                    {vaultHistory.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No vault protection logs yet. Secure your capital above.
                      </div>
                    ) : (
                      vaultHistory.map(log => (
                        <div key={log.id} className="flex justify-between items-center text-xs font-medium">
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-1.5 rounded-lg ${log.type === 'Withdrawal' ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]' : 'bg-[#00D09C]/10 text-[#00D09C]'}`}>
                              {log.type === 'Withdrawal' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <span className="text-slate-200 block font-semibold">{log.type} ({log.asset})</span>
                              <span className="text-[9px] text-slate-500 font-sans block leading-tight">{log.date}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono font-bold ${log.type === 'Withdrawal' ? 'text-[#FF6B6B]' : 'text-[#00D09C]'}`}>
                              {log.type === 'Withdrawal' ? '-' : '+'}${log.amount.toLocaleString()}
                            </span>
                            <span className="text-[8px] uppercase tracking-wider text-slate-500 font-semibold block leading-none">{log.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* SECURITY BUTTONS BOTTOM */}
                <div className="pt-2 flex justify-between gap-3 text-xs font-semibold">
                  <button 
                    onClick={() => setActiveSubScreen('settings')}
                    className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Vault Settings
                  </button>
                  <button 
                    onClick={() => {
                      setVaultState('locked');
                      setPasscodeInput('');
                      showNotification("Vault Locked securely.");
                    }}
                    className="flex-1 py-3 bg-[#FF6B6B]/10 hover:bg-[#FF6B6B]/15 border border-[#FF6B6B]/10 text-[#FF6B6B] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Immediate Lock
                  </button>
                </div>

              </motion.div>
            )}

            {/* SUB-SCREEN: DEPOSIT FORM */}
            {activeSubScreen === 'deposit' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 flex-grow"
              >
                <div className={`p-5 rounded-[24px] border ${cardClasses} space-y-4`}>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Protect Trading Capital</h3>
                    <p className="text-slate-400 text-xs leading-normal">
                      Select active assets to deposit into Private Vault and shield from AI automated tactical rotations.
                    </p>
                  </div>

                  {/* Order Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                      <span>Deposit Amount</span>
                      <span className="font-mono text-slate-400 font-medium">Avail: ${activeCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={actionAmount}
                        onChange={(e) => setActionAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-3 pr-12 text-white outline-none font-semibold text-sm focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]/20 transition-all font-mono"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[#00D09C] font-semibold font-mono">USD</span>
                    </div>
                    
                    {/* Fast percentages */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                      {[10, 25, 50, 100].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setActionAmount(Math.round(activeCapital * (pct / 100)).toString())}
                          className="py-1 bg-white/[0.02] border border-white/[0.04] text-slate-400 rounded-lg text-[9px] font-bold font-sans hover:text-white active:bg-white/[0.05]"
                        >
                          {pct}% {pct === 100 ? 'Max' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Goals integration */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Allocate to Savings Goal</label>
                    <input 
                      type="text" 
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder="Goal name (e.g. Retirement, Emergency)"
                      className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-3 text-white outline-none font-semibold text-xs focus:border-[#00D09C] transition-all"
                    />
                  </div>

                  {/* PROJECTION SCREEN */}
                  {actionAmount && !isNaN(parseFloat(actionAmount)) && (
                    <div className="bg-black/40 border border-white/[0.04] p-3.5 rounded-xl text-[10px] font-semibold space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Pool (Trading):</span>
                        <span>${activeCapital.toLocaleString()} ➔ ${(activeCapital - parseFloat(actionAmount)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vault Savings (Secure):</span>
                        <span className="text-[#00D09C]">${vaultBalance.toLocaleString()} ➔ ${(vaultBalance + parseFloat(actionAmount)).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleConfirmDeposit}
                    disabled={!actionAmount || isNaN(parseFloat(actionAmount))}
                    className="w-full bg-[#00D09C] disabled:opacity-50 hover:bg-[#00b084] text-black font-extrabold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer shadow-md text-center"
                  >
                    Confirm Deposit & Sync Vault
                  </button>
                </div>
              </motion.div>
            )}

            {/* SUB-SCREEN: WITHDRAW FORM */}
            {activeSubScreen === 'withdraw' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 flex-grow"
              >
                <div className={`p-5 rounded-[24px] border ${cardClasses} space-y-4`}>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Unlock Savings</h3>
                    <p className="text-slate-400 text-xs leading-normal">
                      Re-allocate protected capital back to active automated trading.
                    </p>
                  </div>

                  {/* Order Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                      <span>Withdraw Amount</span>
                      <span className="font-mono text-[#00D09C] font-medium">Vault Max: ${vaultBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={actionAmount}
                        onChange={(e) => setActionAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-3 pr-12 text-white outline-none font-semibold text-sm focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]/20 transition-all font-mono"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[#00D09C] font-semibold font-mono">USD</span>
                    </div>

                    {/* Fast percentages */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                      {[10, 25, 50, 100].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setActionAmount(Math.round(vaultBalance * (pct / 100)).toString())}
                          className="py-1 bg-white/[0.02] border border-white/[0.04] text-slate-400 rounded-lg text-[9px] font-bold font-sans hover:text-white active:bg-white/[0.05]"
                        >
                          {pct}% {pct === 100 ? 'Max' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AUTHORIZATION PASSCODE */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#FF6B6B] uppercase font-bold tracking-wider flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      Authorize with Security PIN
                    </label>
                    <input 
                      type="password" 
                      maxLength={6}
                      value={withdrawPINInput}
                      onChange={(e) => {
                        setWithdrawPINError(null);
                        setWithdrawPINInput(e.target.value.replace(/\D/g, ''));
                      }}
                      placeholder="6-digit authorization PIN"
                      className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-3 text-center text-white outline-none font-bold text-lg tracking-widest focus:border-[#00D09C] transition-all"
                    />
                    {withdrawPINError && (
                      <p className="text-[10px] font-bold text-[#FF6B6B] leading-none mt-1">{withdrawPINError}</p>
                    )}
                  </div>

                  {/* PROJECTION SCREEN */}
                  {actionAmount && !isNaN(parseFloat(actionAmount)) && (
                    <div className="bg-black/40 border border-white/[0.04] p-3.5 rounded-xl text-[10px] font-semibold space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vault Savings (Secure):</span>
                        <span>${vaultBalance.toLocaleString()} ➔ ${(vaultBalance - parseFloat(actionAmount)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Pool (Trading):</span>
                        <span className="text-[#00D09C]">${activeCapital.toLocaleString()} ➔ ${(activeCapital + parseFloat(actionAmount)).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleConfirmWithdrawal}
                    disabled={!actionAmount || isNaN(parseFloat(actionAmount)) || withdrawPINInput.length !== 6}
                    className="w-full bg-[#FF6B6B] disabled:opacity-50 hover:bg-[#eb5252] text-white font-extrabold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer shadow-md text-center"
                  >
                    Authorize Savings Withdrawal
                  </button>
                </div>
              </motion.div>
            )}

            {/* SUB-SCREEN: SETTINGS */}
            {activeSubScreen === 'settings' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 flex-grow"
              >
                <div className={`p-5 rounded-[24px] border ${cardClasses} space-y-4`}>
                  <div className="border-b border-white/[0.04] pb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vault Settings</h3>
                    <p className="text-slate-400 text-[10px] leading-tight">Configure secure savings preferences and authentication credentials.</p>
                  </div>

                  {/* Goal Configuration */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Savings Goal Settings</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 block font-semibold">Goal Description</span>
                        <input 
                          type="text" 
                          value={goalName}
                          onChange={(e) => setGoalName(e.target.value)}
                          className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reset passcode or clear vault */}
                  <div className="pt-2 space-y-2.5 border-t border-white/[0.04]">
                    <h4 className="text-[11px] font-bold text-[#FF6B6B] uppercase tracking-wider">Danger Zone</h4>
                    <div className="bg-[#FF6B6B]/5 border border-[#FF6B6B]/15 rounded-xl p-3.5 space-y-2">
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Resetting your vault will delete your private decryption passcode, zero out protected capital offsets, and re-initialize setup. Only use if passcode is compromised.
                      </p>
                      <button 
                        onClick={handleResetVault}
                        className="w-full py-2 bg-[#FF6B6B] hover:bg-[#eb5252] text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer"
                      >
                        Reset Private Passcode & Vault
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveSubScreen('dashboard')}
                    className="w-full bg-white/[0.03] hover:bg-white/[0.08] text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-[10px] border border-white/[0.05] transition-all cursor-pointer shadow-sm text-center"
                  >
                    Back to Vault Dashboard
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        )}

        </div>
      </main>

      {/* SAVINGS TARGET POPUP MODAL */}
      {showTargetPopup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-6 rounded-[24px] border ${cardClasses} space-y-4`}>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Set Savings Target</h3>
              <p className="text-slate-400 text-[10px]">The vault remains locked until your savings target is fully reached.</p>
            </div>
            <div className="space-y-2">
              <input 
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Enter target amount (USD)"
                className="w-full bg-[#080B11]/50 border border-white/[0.05] rounded-xl p-3 text-sm text-white font-mono"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const t = parseFloat(targetInput);
                  if (!isNaN(t) && t > 0) {
                    if (isTargetConfigured) {
                      showNotification("Emergency Reserve Target is permanently locked and cannot be edited.");
                      setShowTargetPopup(false);
                      return;
                    }
                    setVaultTarget(t);
                    setIsTargetConfigured(true);
                    safeStorage.setItem('vault_target', t.toString());
                    safeStorage.setItem('vault_target_configured', 'true');
                    if (updateProfile) {
                      updateProfile({ vaultTarget: t, isVaultTargetConfigured: true } as any, undefined, undefined, true).catch(() => {});
                    }
                    setShowTargetPopup(false);
                    showNotification(`Emergency Reserve Target set to $${t.toLocaleString()} and permanently locked.`);
                  } else {
                    showNotification("Please enter a valid target amount.");
                  }
                }}
                className="flex-grow py-3 bg-[#00D09C] hover:bg-[#00b084] text-black font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer"
              >
                Confirm & Lock Target
              </button>
              <button
                onClick={() => setShowTargetPopup(false)}
                className="px-4 py-3 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
