import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ArrowLeft, ArrowRight, Eye, EyeOff, Check, X, Bell, TrendingUp, Monitor as MonitorIcon, Tablet as TabletIcon, Phone as PhoneIcon, Cpu, Zap, Lock, DollarSign, Globe, Camera, ZoomIn, ZoomOut, Mail } from 'lucide-react';
import AverLogo from './AverLogo';
import PolicyReader from './PolicyReader';
import AuthChoice from './AuthChoice';
import WelcomeBonusCard from './WelcomeBonusCard';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ClipboardPaste, UserPlus } from 'lucide-react';
import { PRESTIGIOUS_COUNTRIES } from '../data/prestigiousCountries';


interface AuthPageProps {
  theme: 'light' | 'dark';
  onBack: () => void;
  onSuccess: () => void;
  key?: string;
}

export default function AuthPage({ theme, onBack, onSuccess }: AuthPageProps) {
  const isDark = theme === 'dark';
  const { signUp, signIn, forgotPassword } = useAuth();
  const { t } = usePreferences();

  const [view, setView] = useState<'choice' | 'register' | 'login' | 'forgot-password' | 'forgot-password-success'>('choice');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Registration Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('United States');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  // Login Form Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Active policy reader state
  const [activePolicyId, setActivePolicyId] = useState<string | null>(null);

  // Success screen state after creating account or logging in
  const [authSuccess, setAuthSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Simulated live-updating statistics inside Device Mockups
  const [btcPrice, setBtcPrice] = useState(84291.45);
  const [pnl, setPnl] = useState(14820.24);
  const [pnlPct, setPnlPct] = useState(12.45);
  const [chartPoints, setChartPoints] = useState([45, 55, 48, 62, 58, 70, 64, 82, 78, 88, 84, 94]);
  const [notifications, setNotifications] = useState<string[]>([
    "Signal Detected: BTC/USDT Long entry confirmed by PEO™ (94.8% Confidence)",
    "Position Executed: Bought 0.45 BTC at $84,120.00",
    "Smart Contract Audit: Security Vault nodes validated"
  ]);
  const [activeNotifyIdx, setActiveNotifyIdx] = useState(0);

  // Effects and Memos that depend on hooks above
  useEffect(() => {
    if (view !== 'register') return;
    if (!referralCode.trim()) {
      setReferralStatus('idle');
      return;
    }

    const checkReferral = async () => {
      setReferralStatus('checking');
      try {
        const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.trim()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setReferralStatus('valid');
        } else {
          setReferralStatus('invalid');
        }
      } catch (error) {
        console.warn("Notice validating referral code:", error);
        setReferralStatus('idle'); // fail silently
      }
    };

    const timer = setTimeout(checkReferral, 500);
    return () => clearTimeout(timer);
  }, [referralCode, view]);

  // Password validation state
  const pwdCriteria = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [password]);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, text: 'No Password', color: 'bg-gray-500' };
    const score = Object.values(pwdCriteria).filter(Boolean).length;
    if (score <= 1) return { score, text: 'Weak', color: 'bg-red-500 shadow-red-500/30' };
    if (score === 2) return { score, text: 'Fair', color: 'bg-amber-500 shadow-amber-500/30' };
    if (score === 3) return { score, text: 'Good', color: 'bg-blue-500 shadow-blue-500/30' };
    if (score === 4) return { score, text: 'Strong', color: 'bg-emerald-400 shadow-emerald-400/30' };
    return { score, text: 'Very Strong', color: 'bg-emerald-500 shadow-emerald-500/50 animate-pulse' };
  }, [password, pwdCriteria]);

  const isFormValid = useMemo(() => {
    return (
      username.trim() !== '' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      Object.values(pwdCriteria).every(Boolean) &&
      password === confirmPassword &&
      password !== '' &&
      referralStatus !== 'invalid' &&
      referralStatus !== 'checking'
    );
  }, [username, email, pwdCriteria, password, confirmPassword, referralStatus]);

  const isLoginFormValid = useMemo(() => {
    return (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim()) &&
      loginPassword.length >= 6
    );
  }, [loginEmail, loginPassword]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handlePasteReferral = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setReferralCode(text.trim().toUpperCase());
      }
    } catch (e) {
      console.warn("Notice reading clipboard");
    }
  };

  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleCtaClick = () => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  const countries = PRESTIGIOUS_COUNTRIES;

  // Handle Register Form Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setErrorMsg('');
    try {
      // Proceed with Firebase Auth signup
      await signUp({
        username,
        email: email.trim(),
        password,
        country,
        phoneNumber,
        referralCode
      });
      onSuccess();
    } catch (error: any) {
      console.warn("Registration note:", error?.message || error);

      let displayError = '';
      
      if (error.code === 'auth/email-already-in-use') {
        displayError = 'This email is already registered. Try logging in instead.';
      } else if (error.code === 'auth/weak-password') {
        displayError = 'The password is too weak.';
      } else if (error.code === 'auth/invalid-email') {
        displayError = 'The email address is invalid.';
      } else {
        displayError = error.message;
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) displayError = parsed.error;
        } catch (e) { }
      }
      
      setErrorMsg(displayError || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Login Form Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoginFormValid) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await signIn(loginEmail.trim(), loginPassword, rememberMe);
      onSuccess();
    } catch (error: any) {
      console.warn("Login note:", error?.message || error);
      let displayError = '';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        displayError = 'Incorrect email or password. Please try again.';
      } else if (error.code === 'auth/user-disabled') {
        displayError = 'This account has been disabled. Please contact support.';
      } else if (error.code === 'auth/too-many-requests') {
        displayError = 'Too many failed login attempts. Please try again later.';
      } else {
        displayError = error.message;
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) displayError = parsed.error;
        } catch (e) { }
      }
      
      setErrorMsg(displayError || 'Password or Email Incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    try {
      await forgotPassword(forgotEmail);
      setView('forgot-password-success');
      setResendCountdown(60);
    } catch (error: any) {
      setErrorMsg(error.message || "Unable to send the reset email right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      // Small randomized fluctuations for premium realism
      setBtcPrice(prev => {
        const delta = (Math.random() - 0.48) * 12.5;
        return Number((prev + delta).toFixed(2));
      });
      setPnl(prev => {
        const delta = (Math.random() - 0.46) * 5.2;
        return Number((prev + delta).toFixed(2));
      });
      setPnlPct(prev => {
        const delta = (Math.random() - 0.46) * 0.02;
        return Number((prev + delta).toFixed(2));
      });
      setChartPoints(prev => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.42) * 8;
        next.push(Math.max(20, Math.min(100, Math.round(last + change))));
        return next;
      });
    }, 1500);

    const notifyTimer = setInterval(() => {
      setActiveNotifyIdx(prev => (prev + 1) % notifications.length);
    }, 4500);

    return () => {
      clearInterval(timer);
      clearInterval(notifyTimer);
    };
  }, [notifications.length]);

  if (view === 'choice') {
    return <AuthChoice theme={theme} onBack={onBack} onSelect={(v) => setView(v)} />;
  }

  if (activePolicyId) {
    return (
      <PolicyReader 
        initialPolicyId={activePolicyId} 
        theme={theme} 
        onClose={() => setActivePolicyId(null)} 
      />
    );
  }

  return (
    <div className={`min-h-screen grid grid-cols-1 lg:grid-cols-12 overflow-x-hidden relative ${
      isDark ? 'bg-[#000000] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Background premium glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[35%] h-[35%] bg-blue-900/5 rounded-full blur-[120px]" />
      </div>

      {/* LEFT SIDE: Beautiful Authentication Console */}
      <div className="lg:col-span-6 flex flex-col justify-between px-6 sm:px-12 py-10 relative z-10 max-w-2xl mx-auto lg:mx-0 w-full lg:max-w-none border-r border-white/5 bg-[#050505]/40 backdrop-blur-md">
        
        {/* Top bar with back option and logo */}
        <div className="flex items-center justify-between w-full mb-10">
          <button 
            onClick={onBack}
            className={`flex items-center space-x-2 text-xs font-bold font-mono tracking-wider uppercase py-2 px-3 rounded-lg border transition-all cursor-pointer ${
              isDark 
                ? 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5' 
                : 'border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.back')}</span>
          </button>
          
        </div>

        {/* Main interactive cards area */}
        <div className="my-auto py-4">
          <AnimatePresence mode="wait">
            {authSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className={`p-8 rounded-3xl border text-center space-y-6 ${
                  isDark ? 'bg-gradient-to-b from-[#0a0f12] to-black border-emerald-500/30' : 'bg-white border-emerald-500/20 shadow-xl'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto animate-bounce">
                  <Shield className="w-8 h-8 filter drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
                  Authorization Confirmed
                </h3>
                <p className={`text-sm sm:text-base font-sans font-medium leading-relaxed max-w-md mx-auto ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                  {successMsg}
                </p>
                <button
                  onClick={onBack}
                  className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center space-x-2 mx-auto cursor-pointer"
                >
                  <span>Launch Aver Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (view as any) === 'choice' ? (
              <motion.div
                key="choice"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <h2 className="text-4xl sm:text-5xl font-display font-black tracking-tighter">
                  Welcome to Aver
                </h2>
                <div className="space-y-4">
                  <button
                    onClick={() => setView('register')}
                    className="w-full py-4 bg-[#10b981] hover:bg-[#059669] text-black font-extrabold text-base rounded-xl transition-all shadow-[0_4px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.5)] transform active:scale-95 cursor-pointer"
                  >
                    Create Account
                  </button>
                  <button
                    onClick={() => setView('login')}
                    className={`w-full py-4 font-extrabold text-base rounded-xl transition-all border ${
                      isDark 
                        ? 'bg-[#1f2937] hover:bg-[#374151] text-white border-slate-700 hover:border-slate-600 shadow-[0_4px_15px_rgba(0,0,0,0.4)]' 
                        : 'bg-white hover:bg-slate-100 text-black border-slate-200 shadow-[0_4px_15px_rgba(0,0,0,0.05)]'
                    } transform active:scale-95 cursor-pointer`}
                  >
                    Log In
                  </button>
                </div>
              </motion.div>
            ) : view === 'register' ? (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                {/* Welcome headings */}
                <div className="space-y-2">
                  <h2 className="text-4xl sm:text-5xl font-display font-black tracking-tighter">
                    {t('auth.create_account')}
                  </h2>
                </div>

                {/* Mobile Welcome Bonus Promo Card (Teaser) Removed */}




                {/* Email Registration Form */}
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  
                  {/* Profile Photo Upload Removed */}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Username</label>
                    <input 
                      type="text" 
                      required
                      ref={nameInputRef}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. aver_trader" 
                      className={`w-full px-4 py-3 rounded-xl text-sm font-sans font-medium border focus:outline-none transition-all ${
                        isDark 
                          ? 'bg-[#08090e]/90 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/40' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/40'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Country</label>
                      <select 
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-sans font-medium border focus:outline-none transition-all appearance-none cursor-pointer ${
                          isDark 
                            ? 'bg-[#08090e]/90 border-white/10 text-white focus:border-emerald-500/40' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500/40'
                        }`}
                      >
                        {PRESTIGIOUS_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Phone Number (Optional)</label>
                      <input 
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 234 567 890" 
                        className={`w-full px-4 py-3 rounded-xl text-sm font-sans font-medium border focus:outline-none transition-all ${
                          isDark 
                            ? 'bg-[#08090e]/90 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/40' 
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/40'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">{t('auth.email')}</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com" 
                      className={`w-full px-4 py-3 rounded-xl text-sm font-sans font-medium border focus:outline-none transition-all ${
                        isDark 
                          ? 'bg-[#08090e]/90 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/40' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/40'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">{t('auth.password')}</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••" 
                        className={`w-full px-4 py-3 rounded-xl text-sm font-sans font-medium border pr-12 focus:outline-none transition-all ${
                          isDark 
                            ? 'bg-[#08090e]/90 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/40' 
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/40'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Live Password Strength Monitor */}
                    {password && (
                      <div className="space-y-2.5 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500">
                            Security Rating:
                          </span>
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                            passwordStrength.score <= 1 
                              ? 'text-red-400' 
                              : passwordStrength.score === 2 
                                ? 'text-amber-500' 
                                : passwordStrength.score === 3 
                                  ? 'text-blue-400' 
                                  : passwordStrength.score === 4 
                                    ? 'text-emerald-400' 
                                    : 'text-emerald-500 animate-pulse'
                          }`}>
                            {passwordStrength.text}
                          </span>
                        </div>
                        
                        {/* Progressive multi-bar layout */}
                        <div className="grid grid-cols-5 gap-1.5 h-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div 
                              key={i} 
                              className={`h-full rounded-full transition-all duration-300 ${
                                i <= passwordStrength.score 
                                  ? passwordStrength.color 
                                  : isDark ? 'bg-white/5' : 'bg-slate-200'
                              }`} 
                            />
                          ))}
                        </div>

                        {/* Staggered requirements checklists */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-white/5">
                          {/* Requirement 1 */}
                          <div className="flex items-center space-x-2">
                            <div className="relative w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                              <AnimatePresence mode="wait">
                                {pwdCriteria.length ? (
                                  <motion.div
                                    key="check-len"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="dot-len"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-1.5 h-1.5 rounded-full bg-gray-500 absolute"
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                            <span className={`text-[10px] font-medium font-sans transition-colors duration-300 ${pwdCriteria.length ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>At least 8 characters</span>
                          </div>

                          {/* Requirement 2 */}
                          <div className="flex items-center space-x-2">
                            <div className="relative w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                              <AnimatePresence mode="wait">
                                {pwdCriteria.uppercase ? (
                                  <motion.div
                                    key="check-up"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="dot-up"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-1.5 h-1.5 rounded-full bg-gray-500 absolute"
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                            <span className={`text-[10px] font-medium font-sans transition-colors duration-300 ${pwdCriteria.uppercase ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>At least one uppercase letter</span>
                          </div>

                          {/* Requirement 3 */}
                          <div className="flex items-center space-x-2">
                            <div className="relative w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                              <AnimatePresence mode="wait">
                                {pwdCriteria.lowercase ? (
                                  <motion.div
                                    key="check-low"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="dot-low"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-1.5 h-1.5 rounded-full bg-gray-500 absolute"
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                            <span className={`text-[10px] font-medium font-sans transition-colors duration-300 ${pwdCriteria.lowercase ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>At least one lowercase letter</span>
                          </div>

                          {/* Requirement 4 */}
                          <div className="flex items-center space-x-2">
                            <div className="relative w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                              <AnimatePresence mode="wait">
                                {pwdCriteria.number ? (
                                  <motion.div
                                    key="check-num"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="dot-num"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-1.5 h-1.5 rounded-full bg-gray-500 absolute"
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                            <span className={`text-[10px] font-medium font-sans transition-colors duration-300 ${pwdCriteria.number ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>At least one number</span>
                          </div>

                          {/* Requirement 5 */}
                          <div className="flex items-center space-x-2 col-span-1 sm:col-span-2">
                            <div className="relative w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                              <AnimatePresence mode="wait">
                                {pwdCriteria.special ? (
                                  <motion.div
                                    key="check-spec"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="dot-spec"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.6, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-1.5 h-1.5 rounded-full bg-gray-500 absolute"
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                            <span className={`text-[10px] font-medium font-sans transition-colors duration-300 ${pwdCriteria.special ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>At least one special character</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">{t('auth.confirm_password')}</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••" 
                        className={`w-full px-4 py-3 rounded-xl text-sm font-sans font-medium border pr-12 focus:outline-none transition-all ${
                          isDark 
                            ? 'bg-[#08090e]/90 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/40' 
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/40'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Live Password Matching Confirmation Indicator */}
                    {confirmPassword && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-1 flex items-center"
                      >
                        {password === confirmPassword ? (
                          <div className="flex items-center space-x-1.5 text-emerald-400 text-[10px] font-bold font-mono uppercase tracking-wider">
                            <Check className="w-3.5 h-3.5" />
                            <span>✓ Passwords match</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-red-400 text-[10px] font-bold font-mono uppercase tracking-wider">
                            <X className="w-3.5 h-3.5" />
                            <span>✕ Passwords do not match</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Referral Code (Optional) Field */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Referral Code (Optional)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <UserPlus className={`w-4 h-4 transition-colors ${
                          referralStatus === 'valid' ? 'text-emerald-500' :
                          referralStatus === 'invalid' ? 'text-red-500' :
                          'text-gray-500 group-focus-within:text-emerald-400'
                        }`} />
                      </div>
                      <input 
                        type="text" 
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.trim().toUpperCase())}
                        placeholder="Enter code" 
                        className={`w-full pl-10 pr-12 py-3 rounded-xl text-sm font-sans font-medium border focus:outline-none transition-all uppercase ${
                          referralStatus === 'valid'
                            ? 'border-emerald-500/50 bg-emerald-500/5 focus:border-emerald-500 text-emerald-400'
                            : referralStatus === 'invalid'
                            ? 'border-red-500/50 bg-red-500/5 focus:border-red-500 text-red-400'
                            : isDark 
                              ? 'bg-[#08090e]/90 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/40' 
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/40'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handlePasteReferral}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer"
                        title="Paste"
                      >
                        {referralStatus === 'checking' ? (
                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : referralStatus === 'valid' ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : referralStatus === 'invalid' ? (
                          <X className="w-4 h-4 text-red-500" />
                        ) : (
                          <ClipboardPaste className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <AnimatePresence mode="wait">
                      {referralStatus === 'valid' && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-[10px] font-sans font-bold text-emerald-500 absolute -bottom-5 left-0"
                        >
                          Referral code verified
                        </motion.p>
                      )}
                      {referralStatus === 'invalid' && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-[10px] font-sans font-bold text-red-500 absolute -bottom-5 left-0"
                        >
                          Invalid referral code
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div className="space-y-4 pt-8 pb-4">
                    <motion.div 
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-3 cursor-pointer group select-none"
                      onClick={() => setAcceptTerms(!acceptTerms)}
                    >
                      <div className="w-9 h-6 flex items-center justify-center shrink-0">
                        <div className={`w-5 h-5 rounded-lg border-[1.5px] transition-colors duration-200 flex items-center justify-center overflow-hidden ${
                          acceptTerms 
                            ? 'border-emerald-500 bg-emerald-500' 
                            : isDark ? 'border-white/20 bg-white/5 group-hover:border-white/40' : 'border-slate-300 bg-white group-hover:border-slate-400'
                        }`}>
                          <AnimatePresence>
                            {acceptTerms && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                              >
                                <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className={`text-sm font-medium font-sans leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        I agree to the{' '}
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setActivePolicyId('terms'); }} 
                          className="text-emerald-500 hover:text-emerald-400 font-bold transition-colors"
                        >
                          Terms of Service
                        </motion.button>{' '}
                        and{' '}
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setActivePolicyId('privacy'); }} 
                          className="text-emerald-500 hover:text-emerald-400 font-bold transition-colors"
                        >
                          Privacy Policy
                        </motion.button>
                      </div>
                    </motion.div>

                    {/* Remember Me Checkbox */}
                    <motion.div 
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-3 cursor-pointer group select-none"
                      onClick={() => setRememberMe(!rememberMe)}
                    >
                      <div className="w-9 h-6 flex items-center justify-center shrink-0">
                        <div className={`w-5 h-5 rounded-lg border-[1.5px] transition-colors duration-200 flex items-center justify-center overflow-hidden ${
                          rememberMe 
                            ? 'border-emerald-500 bg-emerald-500' 
                            : isDark ? 'border-white/20 bg-white/5 group-hover:border-white/40' : 'border-slate-300 bg-white group-hover:border-slate-400'
                        }`}>
                          <AnimatePresence>
                            {rememberMe && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                              >
                                <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className={`text-sm font-medium font-sans leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Remember Me
                      </div>
                    </motion.div>
                  </div>


                  {errorMsg && (
                    <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-sans font-medium text-center">
                      {errorMsg}
                    </div>
                  )}
                  
                  {/* Create Account Button */}
                  <button 
                    type="submit"
                    disabled={!isFormValid || !acceptTerms || loading}
                    className={`w-full py-4 rounded-xl font-sans font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center space-x-2 mt-6 cursor-pointer ${
                      (isFormValid && acceptTerms) && !loading 
                        ? 'bg-[#10b981] hover:bg-[#059669] text-black shadow-emerald-500/25 active:scale-[0.99] font-extrabold' 
                        : isDark
                          ? 'bg-slate-800 text-gray-500 border border-white/5 cursor-not-allowed'
                          : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="font-extrabold text-base">{t('auth.create_account')}</span>
                        <ArrowRight className="w-4.5 h-4.5" />
                      </>
                    )}
                  </button>

                  {/* Legal disclosures */}
                  <p className="text-[10px] leading-relaxed text-gray-500 font-medium text-center pt-2 max-w-lg mx-auto">
                    By continuing, you agree to Aver's{' '}
                    <button type="button" onClick={() => setActivePolicyId('terms')} className="text-emerald-400 font-bold hover:underline">Terms of Service</button>{' '}
                    and acknowledge our{' '}
                    <button type="button" onClick={() => setActivePolicyId('privacy')} className="text-emerald-400 font-bold hover:underline">Privacy Policy</button>.
                    Additional legal information is available in the{' '}
                    <button type="button" onClick={() => setActivePolicyId('legal-center')} className="text-gray-400 hover:text-gray-300 hover:underline">Legal Center</button>.
                  </p>
                </form>

                {/* Switch view footer */}
                <div className="text-center pt-4 border-t border-white/5">
                  <p className="text-xs font-sans font-bold text-gray-500">
                    {t('auth.already_account')}{' '}
                    <button 
                      onClick={() => {
                        setView('login');
                        setPassword('');
                        setConfirmPassword('');
                      }} 
                      className="text-emerald-400 hover:text-emerald-300 font-extrabold focus:outline-none cursor-pointer"
                    >
                      {t('auth.sign_in')}
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : view === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                {/* Welcome headings */}
                <div className="space-y-2">
                  <h2 className="text-4xl sm:text-5xl font-display font-black tracking-tighter">
                    {t('auth.welcome_back')}
                  </h2>
                </div>

                {/* Email Login Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">{t('auth.email')}</label>
                    <input 
                      type="email" 
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="user@example.com" 
                      className={`w-full px-4 py-3 rounded-xl text-sm font-sans font-medium border focus:outline-none transition-all ${
                        isDark 
                          ? 'bg-[#08090e]/90 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/40' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/40'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">{t('auth.password').replace('Secure', 'Security')}</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••" 
                        className={`w-full px-4 py-3 rounded-xl text-sm font-sans font-medium border pr-12 focus:outline-none transition-all ${
                          isDark 
                            ? 'bg-[#08090e]/90 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/40' 
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/40'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button 
                        type="button" 
                        onClick={() => setView('forgot-password')}
                        className="text-xs font-sans font-medium text-emerald-500 hover:text-emerald-400 hover:underline transition-all cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>


                  {errorMsg && (
                    <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-sans font-medium text-center">
                      {errorMsg}
                    </div>
                  )}
                  {/* Continue Button */}
                  <button 
                    type="submit"
                    disabled={!isLoginFormValid || loading}
                    className={`w-full py-4 rounded-xl font-sans font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center space-x-2 mt-6 cursor-pointer ${
                      isLoginFormValid && !loading 
                        ? 'bg-[#10b981] hover:bg-[#059669] text-black shadow-emerald-500/25 active:scale-[0.99] font-extrabold' 
                        : isDark
                          ? 'bg-slate-800 text-gray-500 border border-white/5 cursor-not-allowed'
                          : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="font-extrabold text-base">{t('auth.sign_in')}</span>
                        <ArrowRight className="w-4.5 h-4.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch view footer */}
                <div className="text-center pt-4 border-t border-white/5">
                  <p className="text-xs font-sans font-bold text-gray-500">
                    {t('auth.no_account')}{' '}
                    <button 
                      onClick={() => {
                        setView('register');
                        if (loginEmail) setEmail(loginEmail);
                        if (loginPassword) {
                          setPassword(loginPassword);
                          setConfirmPassword(loginPassword);
                        }
                      }} 
                      className="text-emerald-400 hover:text-emerald-300 font-extrabold focus:outline-none cursor-pointer"
                    >
                      {t('auth.create_account')}
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : view === 'forgot-password' ? (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-4xl font-display font-black tracking-tighter text-white">Recover Your Account</h2>
                  <p className={`text-base font-sans font-semibold leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    Enter the email address associated with your AverNoxTrader account. We’ll send you a secure password reset link.
                  </p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="w-4 h-4 text-gray-500" />
                      </div>
                      <input 
                        type="email" 
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="user@example.com" 
                        className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm font-sans font-medium border focus:outline-none transition-all ${
                          isDark 
                            ? 'bg-[#08090e]/90 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/40' 
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/40'
                        }`}
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-sans font-medium text-center animate-shake">
                      {errorMsg}
                    </div>
                  )}
                  
                  <div className="space-y-3 pt-2">
                    <button 
                      type="submit"
                      disabled={loading || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)}
                      className={`w-full py-4 rounded-xl font-sans font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center space-x-2 ${
                        loading || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)
                          ? 'bg-slate-800 text-gray-500 cursor-not-allowed border border-white/5 shadow-none'
                          : 'bg-[#10b981] hover:bg-[#059669] text-black cursor-pointer font-extrabold shadow-emerald-500/25'
                      }`}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight className="w-4.5 h-4.5" />
                        </>
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setView('login');
                        setErrorMsg('');
                        setForgotEmail('');
                      }}
                      className="w-full py-4 rounded-xl font-sans font-bold text-sm tracking-wide transition-all bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                  
                  {/* Having trouble support link */}
                  <div className="text-center pt-4 border-t border-white/5 mt-4">
                    <p className="text-[11px] font-sans font-medium text-gray-500">
                      Having trouble retrieving your account?{' '}
                      <a 
                        href="https://t.me/AverAssistancebot" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-emerald-400 font-bold hover:underline"
                      >
                        Contact Support
                      </a>
                    </p>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="forgot-password-success"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6 text-center py-6"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center border-2 border-emerald-500/30 text-emerald-500 mx-auto mb-4">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tighter text-white">Password Reset Email Sent</h2>
                  <p className={`text-sm sm:text-base font-sans leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'} max-w-sm mx-auto`}>
                    If an AverNoxTrader account exists for this email address, we’ve sent a secure password reset link. Please check your inbox and spam folder.
                  </p>
                </div>
                
                <div className="space-y-3 pt-6 max-w-sm mx-auto">
                  <button 
                    type="button"
                    onClick={() => {
                      // Attempt to open email client based on domain or just generic mailto
                      const domain = forgotEmail.split('@')[1];
                      if (domain === 'gmail.com') {
                        window.open('https://mail.google.com/', '_blank');
                      } else if (domain === 'yahoo.com') {
                        window.open('https://mail.yahoo.com/', '_blank');
                      } else if (domain === 'outlook.com' || domain === 'hotmail.com') {
                        window.open('https://outlook.live.com/', '_blank');
                      } else {
                        window.location.href = `mailto:${forgotEmail}`;
                      }
                    }}
                    className="w-full py-4 rounded-xl font-sans font-bold text-sm tracking-wide transition-all shadow-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black cursor-pointer font-extrabold"
                  >
                    Open Email App
                  </button>
                  <button 
                    type="button"
                    disabled={resendCountdown > 0 || loading}
                    onClick={handleForgotPassword}
                    className={`w-full py-4 rounded-xl font-sans font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                      resendCountdown > 0 || loading
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5' 
                        : 'bg-white/10 text-white hover:bg-white/20 cursor-pointer border border-white/10'
                    }`}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>Resend Email</span>
                        {resendCountdown > 0 && <span>({resendCountdown}s)</span>}
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setView('login');
                      setForgotEmail('');
                    }}
                    className="w-full py-4 mt-2 rounded-xl font-sans font-bold text-sm tracking-wide transition-colors text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom secure footnote */}
        <div className="flex items-center justify-center space-x-2 text-[9px] font-mono font-bold tracking-wider text-gray-500 uppercase mt-10">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>AES-256 Client-Side Cryptographic Isolation Enabled</span>
        </div>
      </div>

      {/* RIGHT SIDE: Dynamic contextual presentation pane */}
      <div className="lg:col-span-6 hidden lg:flex flex-col items-center justify-center relative bg-gradient-to-br from-[#020508] via-slate-950 to-black overflow-hidden px-8 select-none border-l border-white/5 py-12">
        
        {/* Dynamic backdrop grid */}
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1640340434855-6084b1f4901c?q=80&w=1200&auto=format&fit=crop" alt="Trading Background" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
        </div>
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#020508]/60 to-[#020508] z-0" />
        <div className="absolute bottom-[20%] right-[10%] w-64 h-64 bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />

        <AnimatePresence mode="wait">
          {(view as any) === 'choice' ? (
            <motion.div
              key="choice"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.45 }}
              className="z-10 relative w-full flex justify-center items-center"
            >
              <AuthChoice theme={theme} onBack={() => setView('register')} onSelect={(v) => setView(v)} />
            </motion.div>
          ) : view === 'register' ? (
            <motion.div
              key="register-welcome"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.45 }}
              className="z-10 relative w-full flex justify-center items-center text-center"
            >
              <div className="text-gray-400 font-mono text-sm">Welcome to Aver. Please complete your registration.</div>
            </motion.div>
          ) : (
            <motion.div
              key="mockups"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.45 }}
              className="w-full max-w-xl flex flex-col space-y-10 z-10 relative items-center"
            >
          
          {/* TITLE BADGE FOR THE PREVIEW SECTION */}
          <div className="text-center space-y-1 max-w-md animate-fade-in">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full border border-emerald-500/15 bg-emerald-500/5 text-emerald-400 text-[10px] font-bold font-mono tracking-wider uppercase">
              <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>AverCore Active Ecosystem</span>
            </span>
            <p className="text-xs font-sans text-gray-400 font-medium leading-relaxed">
              Real-time neural feedback displaying current telemetry feeds and autonomous execution patterns.
            </p>
          </div>

          <div className="relative w-full h-[480px] flex items-center justify-center">
            
            {/* 1. PREMIUM DESKTOP MONITOR (Back Layer, gently floating) */}
            <motion.div 
              animate={{ 
                y: [0, -10, 0],
                rotateX: [12, 10, 12],
                rotateY: [-16, -14, -16],
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              style={{ perspective: 1000 }}
              className="absolute top-0 w-[420px] h-[250px] rounded-2xl border border-white/10 bg-slate-950/90 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-10 hover:border-emerald-500/30 transition-colors"
            >
              {/* Glass Reflection effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08] pointer-events-none z-20" />
              
              {/* Monitor bezel top bar */}
              <div className="px-3.5 py-2.5 border-b border-white/5 bg-black/40 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/30" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/30" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                  <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest pl-2">AverCore Trading Terminal v4.8</span>
                </div>
                <div className="flex items-center space-x-2 text-[8px] font-mono font-bold">
                  <span className="text-emerald-400 animate-pulse">● FEED ONLINE</span>
                </div>
              </div>

              {/* Monitor Main Panel Content */}
              <div className="flex-1 p-3 grid grid-cols-12 gap-3 bg-[#04060a]">
                
                {/* Visual Chart area (Col-span 8) */}
                <div className="col-span-8 flex flex-col justify-between border border-white/5 bg-slate-950/60 p-2.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-gray-400 uppercase font-bold tracking-wider">BTC / USDT Perpetual</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-extrabold">${btcPrice.toLocaleString()}</span>
                  </div>
                  
                  {/* Glowing custom dynamic Sparkline SVG representation */}
                  <div className="flex-1 h-20 flex items-end relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 200 80">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line x1="0" y1="20" x2="200" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="40" x2="200" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="60" x2="200" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      
                      {/* Filled path */}
                      <path 
                        d={`M 0,80 ${chartPoints.map((p, idx) => `L ${(idx / (chartPoints.length - 1)) * 200},${80 - p}`).join(' ')} L 200,80 Z`} 
                        fill="url(#chartGrad)"
                      />
                      {/* Glowing Line */}
                      <path 
                        d={chartPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / (chartPoints.length - 1)) * 200},${80 - p}`).join(' ')} 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                      {/* Pulsing indicator dot */}
                      <circle 
                        cx="200" 
                        cy={80 - chartPoints[chartPoints.length - 1]} 
                        r="3" 
                        fill="#34d399" 
                        className="animate-ping" 
                      />
                    </svg>
                  </div>

                  <div className="flex justify-between items-center text-[7px] font-mono text-gray-500 font-bold border-t border-white/5 pt-1.5">
                    <span>EMA 12/26 CROSS</span>
                    <span>VOL: 284K BTC</span>
                    <span className="text-emerald-400 font-extrabold">+14.28%</span>
                  </div>
                </div>

                {/* Live orders pane (Col-span 4) */}
                <div className="col-span-4 flex flex-col justify-between border border-white/5 bg-slate-950/60 p-2 rounded-xl text-[7px] font-mono text-gray-400 font-bold">
                  <div className="border-b border-white/5 pb-1 flex justify-between">
                    <span>LIVE EXECUTIONS</span>
                    <span className="text-emerald-400">99.98%</span>
                  </div>
                  <div className="space-y-1.5 py-1 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded">
                      <span>BUY BTC</span>
                      <span>$84,120</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded">
                      <span>BUY ETH</span>
                      <span>$3,425</span>
                    </div>
                    <div className="flex justify-between text-red-400 bg-red-500/5 px-1 py-0.5 rounded">
                      <span>SELL SOL</span>
                      <span>$138.45</span>
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-1 text-center text-gray-500 text-[6px]">
                    AUTONOMOUS TELEMETRY ENABLED
                  </div>
                </div>

              </div>

              {/* Sub-monitor logo stand overlay mock */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-black border border-white/10 text-[6px] font-mono text-gray-500 font-bold">
                AVERCORE™ MODULE
              </div>
            </motion.div>

            {/* 2. REALISTIC TABLET (Middle Layer, overlapping right/bottom) */}
            <motion.div 
              animate={{ 
                y: [0, 8, 0],
                rotateX: [6, 4, 6],
                rotateY: [15, 17, 15],
              }}
              transition={{ 
                duration: 5.2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              style={{ perspective: 1000 }}
              className="absolute bottom-6 left-[-10px] w-[260px] h-[190px] rounded-3xl border-2 border-white/10 bg-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-20 hover:border-emerald-500/30 transition-colors"
            >
              {/* Screen gloss */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.06] pointer-events-none z-20" />
              
              {/* Tablet Header */}
              <div className="px-3.5 py-2 border-b border-white/5 bg-slate-900/80 flex justify-between items-center text-[7px] font-mono text-gray-400">
                <span className="font-bold">Aver Analytics Terminal</span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                  <span>PEO™ CALIBRATED</span>
                </span>
              </div>

              {/* Tablet Content */}
              <div className="flex-1 p-3 bg-[#05070c] flex flex-col justify-between space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-1.5 border border-white/5 bg-slate-950 rounded-lg text-center">
                    <p className="text-[6px] font-mono text-gray-500 uppercase">Aver AI Portfolio Balance</p>
                    <p className="text-xs font-mono font-bold text-white">${pnl.toLocaleString()}</p>
                    <p className="text-[6px] font-mono text-emerald-400">+{pnlPct}% (Today)</p>
                  </div>
                  <div className="p-1.5 border border-white/5 bg-slate-950 rounded-lg text-center">
                    <p className="text-[6px] font-mono text-gray-500 uppercase">Active Risk Factor</p>
                    <p className="text-xs font-mono font-bold text-emerald-400">Low-Risk (0.24)</p>
                    <p className="text-[6px] font-mono text-gray-400">Vault Shields: 100%</p>
                  </div>
                </div>

                <div className="p-2 border border-white/5 bg-slate-950 rounded-lg flex-1 flex flex-col justify-between text-[7px] font-mono text-gray-400 font-bold">
                  <span className="text-gray-500 uppercase tracking-widest text-[6px]">AverCore AI™ Active State</span>
                  <div className="space-y-1 pt-1.5">
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>✓ Neural Pattern Scanned</span>
                      <span>100%</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>✓ Decentralized Ledger Connect</span>
                      <span>Connected</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>✓ PEO™ Execution Ready</span>
                      <span>Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3. FLAGSHIP SMARTPHONE (Front Layer, overlapping right/bottom) */}
            <motion.div 
              animate={{ 
                y: [0, -12, 0],
                rotateX: [10, 12, 10],
                rotateY: [-8, -6, -8],
              }}
              transition={{ 
                duration: 4.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              style={{ perspective: 1000 }}
              className="absolute bottom-2 right-[-20px] w-[145px] h-[260px] rounded-[32px] border-4 border-white/10 bg-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-30 hover:border-emerald-500/30 transition-colors"
            >
              {/* Dynamic Island phone speaker mockup */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-4 rounded-full bg-black z-30 border border-white/5 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30 animate-pulse" />
              </div>

              {/* Smartphone layout */}
              <div className="flex-1 p-3 pt-8 bg-[#030508] flex flex-col justify-between space-y-2">
                
                {/* Mobile app header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-[7px] font-mono text-gray-400 font-bold uppercase tracking-wider">AverMobile</span>
                  <div className="flex items-center space-x-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span className="text-[6px] font-mono text-emerald-400">SECURE</span>
                  </div>
                </div>

                {/* Mobile stats panel */}
                <div className="p-1.5 border border-white/5 bg-slate-950 rounded-xl text-center">
                  <p className="text-[6px] font-mono text-gray-500 uppercase">BTC Price</p>
                  <p className="text-[11px] font-mono font-bold text-emerald-400">${btcPrice.toLocaleString()}</p>
                </div>

                {/* iOS-Style Push Notification Popup */}
                <div className="flex-1 flex items-center justify-center py-2">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeNotifyIdx}
                      initial={{ opacity: 0, y: 15, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.9 }}
                      transition={{ duration: 0.4 }}
                      className="p-2 border border-emerald-500/20 bg-emerald-950/40 backdrop-blur-md rounded-xl space-y-1.5 shadow-[0_5px_15px_rgba(16,185,129,0.15)] w-full"
                    >
                      <div className="flex items-center justify-between text-emerald-400">
                        <div className="flex items-center space-x-1">
                          <Bell className="w-2.5 h-2.5 animate-bounce" />
                          <span className="text-[6px] font-mono font-bold uppercase tracking-wider">Aver Alert</span>
                        </div>
                        <span className="text-[5px] font-mono text-gray-500">NOW</span>
                      </div>
                      <p className="text-[7px] font-sans font-bold leading-normal text-gray-200">
                        {notifications[activeNotifyIdx]}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Bottom button indicator */}
                <div className="py-1 bg-emerald-500 text-black text-center text-[7px] font-mono font-extrabold rounded-lg uppercase tracking-wider shadow-lg shadow-emerald-500/10">
                  TAP TO ACTIVATE BOT
                </div>

              </div>
            </motion.div>

          </div>

          {/* SECURITY TRUST BADGES */}
          <div className="flex items-center justify-center space-x-6 text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>SOC2 CERTIFIED</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>256-BIT CRYPTO</span>
            </span>
          </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
