import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, MessageCircle } from 'lucide-react';
import Loader from './components/Loader';
import Navbar from './components/Navbar';
import CryptoTicker from './components/CryptoTicker';
import Hero from './components/Hero';
import CoinLogo from './components/CoinLogo';
import TechInnovations from './components/TechInnovations';
import Features from './components/Features';
import Stats from './components/Stats';
import QuickHub from './components/QuickHub';
import Footer from './components/Footer';
import PlatformShowcase from './components/PlatformShowcase';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import Preferences from './components/Preferences';
import BonusCenter from './components/BonusCenter';
import ReferralCenter from './components/ReferralCenter';
import MarketHighlightsPage from './components/MarketHighlightsPage';
import EventsPromosPage from './components/EventsPromosPage';
import TransactionHistory from './components/TransactionHistory';
import AdminRoot from './components/admin/AdminRoot';
import KycVerificationPage from './components/KycVerificationPage';
import NotFound from './components/NotFound';
import { NavigationProvider, useAppNavigation, parsePathToLocation, locationToPath } from './contexts/NavigationContext';
import { usePreferences } from './contexts/PreferencesContext';
import { useAuth } from './contexts/AuthContext';
import { TradingEngineProvider } from './contexts/TradingEngineContext';
import { safeStorage } from './utils/storage';
import { useDynamicCanonical } from './utils/useDynamicCanonical';

export default function App() {
  return (
    <NavigationProvider>
      <TradingEngineProvider>
        <AppContent />
      </TradingEngineProvider>
    </NavigationProvider>
  );
}

function AppContent() {
  const { user, loading: authLoading, signOutUser } = useAuth();
  const { currentLocation, navigate, navigateView, navigateTab, goBack } = useAppNavigation();
  const currentView = currentLocation.view || 'home';
  const [isReady, setIsReady] = useState(false);

  // Synchronize dynamic canonical URL tag with custom domain (https://www.avertrader.space)
  useDynamicCanonical(currentLocation);

  // Ready state logic: Wait for auth and a minimum splash duration
  useEffect(() => {
    if (!authLoading) {
      // Small additional delay if user is present to allow Dashboard components to pre-initialize
      const settleDelay = user ? 3200 : 2800;
      const timer = setTimeout(() => {
        setIsReady(true);
      }, settleDelay);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user?.uid]);

  const navigateToView = (view: string) => {
    navigateView(view);
  };

  const goBackView = () => {
    goBack();
  };

  const { preferences, updatePreference } = usePreferences();
  const { theme, language, currency } = preferences;

  // Navigation section tracker
  const [activeSection, setActiveSection] = useState('hero');

  // Route detection on initial load (e.g. cold load of /admin or /404 or /auth)
  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    
    // Check if we are at an admin-related URL
    const isAtAdminUrl = path === '/admin' || search.includes('admin=true') || path.toLowerCase().includes('admin');
    
    if (isAtAdminUrl) {
      if (currentView !== 'admin') {
        console.log("[App] Explicit admin route detected. Rendering Admin Terminal.");
        navigateToView('admin');
      }
    } else if (path === '/404' || search.includes('404=true')) {
      if (currentView !== 'not-found') navigateView('not-found', {}, { replace: true });
    } else if (path === '/auth' || path === '/login' || path === '/register') {
      if (user && !authLoading) {
        const savedRedirect = safeStorage.getItem('aver_redirect_after_login');
        if (savedRedirect) {
          safeStorage.removeItem('aver_redirect_after_login');
          const targetLoc = parsePathToLocation(savedRedirect);
          if (targetLoc) {
            navigate(targetLoc, { replace: true });
            return;
          }
        }
        navigate({ view: 'dashboard', tab: 'home' }, { replace: true });
      } else if (!user && !authLoading) {
        // External entry or search link to /auth or /login: redirect guest visitors to marketing landing page
        navigateView('home', {}, { replace: true });
        if (typeof window !== 'undefined' && window.history) {
          try {
            window.history.replaceState({ id: 'root-home', view: 'home', tab: 'home' }, '', '/');
          } catch (e) {}
        }
      }
    }
  }, [user?.uid, authLoading]);

  // Unified startup and session management
  useEffect(() => {
    if (authLoading) return;

    // Handle session restoration and view management
    if (user) {
      const isAdminAuthorized = localStorage.getItem('admin_session_active') === 'true' || 
                               user.role === 'super_admin' || 
                               user.role === 'admin' || 
                               user.email === 'ruro2885@gmail.com' ||
                               (user as any).isAdmin === true;

      const path = window.location.pathname;
      const isAtAdminUrl = path === '/admin' || path.toLowerCase().includes('admin');

      if (currentView === 'auth' || currentView === 'home') {
        const savedRedirect = safeStorage.getItem('aver_redirect_after_login');
        if (savedRedirect) {
          safeStorage.removeItem('aver_redirect_after_login');
          const targetLoc = parsePathToLocation(savedRedirect);
          if (targetLoc) {
            navigate(targetLoc, { replace: true });
            safeStorage.setItem('aver_session_initialized', 'true');
            return;
          }
        }
        console.log("[App] Logged in, moving from auth/home to dashboard.");
        navigate({ view: 'dashboard', tab: currentLocation.tab || 'home' }, { replace: true });
        safeStorage.setItem('aver_session_initialized', 'true');
      } else if (currentView === 'admin' && !isAdminAuthorized && !isAtAdminUrl) {
        console.warn("[App] Admin view active but not authorized, redirecting to dashboard.");
        navigate({ view: 'dashboard', tab: 'home' }, { replace: true });
        safeStorage.setItem('aver_session_initialized', 'true');
      }
    } else {
      // Access control enforcement: send anonymous/logged-out sessions on protected views to the landing page
      const protectedViews = ['dashboard', 'deposit', 'withdraw', 'history', 'referral-centre', 'preferences', 'bonus-center', 'kyc-verification'];
      if (protectedViews.includes(currentView)) {
        console.log(`[App] Access denied or session signed out on view ${currentView}. Redirecting to Landing Page.`);
        navigateView('home', {}, { replace: true });
      }
    }
  }, [user?.uid, authLoading, currentView]);

  // Preference Toggle callback
  useEffect(() => {
    // ... (rest of favicon code remains the same)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 32, 32);
      
      // Draw premium emerald green triangle representing "A" logo
      const grad = ctx.createLinearGradient(16, 4, 16, 28);
      grad.addColorStop(0, '#34d399');
      grad.addColorStop(1, '#059669');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(16, 4);
      ctx.lineTo(28, 28);
      ctx.lineTo(22, 28);
      ctx.lineTo(16, 16);
      ctx.lineTo(10, 28);
      ctx.lineTo(4, 28);
      ctx.closePath();
      ctx.fill();

      // Node marker dot
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(16, 16, 2, 0, Math.PI * 2);
      ctx.fill();

      const dataUrl = canvas.toDataURL();
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = dataUrl;
    }
  }, []);

  // Handle intersection observer to highlight active navbar item on scroll
  useEffect(() => {
    if (authLoading) return;

    const sections = ['hero', 'tech', 'features', 'stats', 'preview', 'dashboard'];
    const observers = sections.map((secId) => {
      const el = document.getElementById(secId);
      if (!el) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setActiveSection(secId);
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach((obs) => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, [authLoading]);

  // Preference Toggle callback
  const handlePreferenceChange = (key: 'theme' | 'language' | 'currency', value: any) => {
    updatePreference(key, value);
  };

  // Navigation click routing
  const handleNavigate = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // Account status enforcement
  const userAccountStatus = (user?.accountStatus || user?.status || 'Active').toLowerCase();
  const isAccountBlocked = user && (userAccountStatus === 'suspended' || userAccountStatus === 'deactivated');

  const containerBg = theme === 'dark' 
    ? 'bg-[#000000] text-slate-200' 
    : 'bg-slate-50 text-slate-900';

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${containerBg}`} data-version="1.0.7-system-reset">
      <AnimatePresence mode="wait">
        {!isReady ? (
          <Loader onComplete={() => {}} />
        ) : isAccountBlocked ? (
          <motion.div
            key="blocked-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-radial-gradient-dark opacity-80 pointer-events-none" />
            <div className="max-w-md w-full p-8 rounded-[2.5rem] border border-rose-500/30 bg-slate-900/90 backdrop-blur-2xl text-center space-y-6 shadow-2xl relative z-10">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/20">
                <Lock className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Access Revoked
                </span>
                <h1 className="text-2xl font-black tracking-tight">
                  Account {userAccountStatus === 'suspended' ? 'Suspended' : 'Deactivated'}
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your platform access has been {userAccountStatus === 'suspended' ? 'suspended' : 'deactivated'}. You will not be able to navigate the platform until your account is reactivated.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>UID:</span>
                  <span className="font-mono text-slate-200">{user?.uid}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Email:</span>
                  <span className="text-slate-200">{user?.email}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => window.open('https://t.me/AverAssistancebot', '_blank')}
                  className="w-full py-3.5 rounded-2xl bg-white/5 text-white border border-white/10 font-bold text-sm hover:bg-white/10 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  Contact Support
                </button>
                <button
                  onClick={async () => {
                    await signOutUser();
                    navigateView('home', {}, { replace: true });
                  }}
                  className="w-full py-3.5 rounded-2xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="app-main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Premium fixed trading background image with high-end overlay blending */}
            {currentView !== 'dashboard' && currentView !== 'strategies' && currentView !== 'kyc-verification' && (
              <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0 select-none">
                <img 
                  src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2000&auto=format&fit=crop" 
                  alt="Aver Premium Background" 
                  className={`w-full h-full object-cover object-center transition-opacity duration-700 ${
                    theme === 'dark' ? 'opacity-[0.65] mix-blend-lighten' : 'opacity-[0.42] mix-blend-multiply'
                  }`}
                  referrerPolicy="no-referrer"
                />
                {/* Ambient radial vignette overlay to keep contrast around active panels */}
                <div 
                  className={`absolute inset-0 ${
                    theme === 'dark' ? 'bg-radial-gradient-dark' : 'bg-radial-gradient-light'
                  }`} 
                />

                {/* Premium floating glassmorphic cryptocurrency background tokens */}
                <div className="absolute inset-0 w-full h-full overflow-hidden hidden lg:block">
                  {/* Bitcoin (₿) Floating Token */}
                  <div className="absolute top-[18%] left-[5%] w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/10 to-orange-500/5 border border-amber-500/20 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.08)] animate-float-1">
                    <CoinLogo symbol="BTC" size={32} imgClassName="opacity-30 mix-blend-luminosity hover:opacity-80 transition-opacity duration-300" />
                  </div>

                  {/* Ethereum (Ξ) Floating Token */}
                  <div className="absolute top-[42%] right-[4%] w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-600/5 border border-indigo-500/20 backdrop-blur-sm flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.08)] animate-float-2">
                    <CoinLogo symbol="ETH" size={40} imgClassName="opacity-30 mix-blend-luminosity hover:opacity-80 transition-opacity duration-300" />
                  </div>

                  {/* Solana (🆂) Floating Token */}
                  <div className="absolute bottom-[22%] left-[6%] w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400/10 to-teal-500/5 border border-emerald-500/20 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.08)] animate-float-3">
                    <CoinLogo symbol="SOL" size={26} imgClassName="opacity-30 mix-blend-luminosity hover:opacity-80 transition-opacity duration-300" />
                  </div>

                  {/* Aver Platform Token (AVR) */}
                  <div className="absolute top-[28%] right-[18%] w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/15 to-teal-400/5 border border-emerald-400/25 backdrop-blur-md flex flex-col items-center justify-center shadow-[0_0_50px_rgba(52,211,153,0.15)] animate-float-1">
                    <CoinLogo symbol="AVR" size={48} className="opacity-40 hover:opacity-90 transition-opacity duration-300" />
                    <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400/50 mt-1">AVR</span>
                  </div>

                  {/* Ripple / XRP Floating Token */}
                  <div className="absolute top-[68%] left-[15%] w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400/10 to-blue-500/5 border border-sky-500/20 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.08)] animate-float-2">
                    <CoinLogo symbol="XRP" size={32} imgClassName="opacity-30 mix-blend-luminosity hover:opacity-80 transition-opacity duration-300" />
                  </div>

                  {/* Cardano (₳) Floating Token */}
                  <div className="absolute bottom-[16%] right-[14%] w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-600/5 border border-blue-500/20 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.08)] animate-float-3">
                    <CoinLogo symbol="ADA" size={32} imgClassName="opacity-30 mix-blend-luminosity hover:opacity-80 transition-opacity duration-300" />
                  </div>
                </div>
              </div>
            )}

            {/* Background visual light leak for premium depth */}
            {currentView !== 'dashboard' && currentView !== 'strategies' && currentView !== 'kyc-verification' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />
              </div>
            )}

            <AnimatePresence mode="wait">
              {currentView === 'admin' ? (
                <AdminRoot theme={theme} />
              ) : currentView === 'dashboard' || currentView === 'deposit' || currentView === 'withdraw' ? (
                <Dashboard theme={theme} onNavigate={(view) => navigateToView(view)} />
              ) : currentView === 'preferences' ? (
                <Preferences theme={theme} onBack={goBackView} />
              ) : currentView === 'bonus-center' ? (
                <BonusCenter 
                  theme={theme} 
                  onBack={goBackView} 
                  onNavigate={(tab) => { 
                    if (tab === 'preferences') {
                      navigateToView('preferences');
                    } else if (tab === 'market-highlights') {
                      navigateToView('market-highlights');
                    } else if (tab === 'events-promos') {
                      navigateToView('events-promos');
                    } else if (tab === 'referral-centre') {
                      navigateToView('referral-centre');
                    } else if (tab === 'kyc-verification') {
                      navigateToView('kyc-verification');
                    } else {
                      navigate({ view: 'dashboard', tab });
                    }
                  }}
                />
              ) : currentView === 'kyc-verification' ? (
                <KycVerificationPage
                  theme={theme}
                  onBack={goBackView}
                  onComplete={goBackView}
                />
              ) : currentView === 'history' ? (
                <TransactionHistory 
                  onBack={goBackView} 
                  onOpenSupport={() => {
                    navigate({ view: 'dashboard', tab: 'support' });
                  }}
                />
              ) : currentView === 'referral-centre' ? (
                <ReferralCenter
                  theme={theme}
                  onBack={goBackView}
                />
              ) : currentView === 'market-highlights' ? (
                <MarketHighlightsPage 
                  theme={theme} 
                  onBack={goBackView} 
                />
              ) : currentView === 'events-promos' ? (
                <EventsPromosPage 
                  theme={theme} 
                  onBack={goBackView} 
                />
              ) : currentView === 'showcase' ? (
                <PlatformShowcase
                  key="showcase"
                  theme={theme}
                  onBack={goBackView}
                  onGetStarted={() => navigateToView('auth')}
                />
              ) : currentView === 'not-found' ? (
                <NotFound 
                  theme={theme} 
                  onBack={goBackView} 
                  onAdminAccess={() => navigateToView('admin')}
                />
              ) : currentView === 'auth' ? (
                <AuthPage
                  theme={theme}
                  onBack={goBackView}
                  onSuccess={() => {
                    navigateToView('dashboard');
                  }}
                />
              ) : (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Top Live Crypto Ticker */}
                  <CryptoTicker />

                  {/* Navigation */}
                  <Navbar
                    theme={theme}
                    onNavigate={handleNavigate}
                    activeSection={activeSection}
                    onShowcase={() => navigateToView('showcase')}
                    onAdminAccess={() => navigateToView('admin')}
                  />

                  {/* Main Page Layout Flow */}
                  <main className="relative z-10">
                    {/* Hero Section */}
                    <Hero
                      theme={theme}
                      onShowcase={() => navigateToView('showcase')}
                      onGetStarted={() => navigateToView('auth')}
                    />

                    {/* Technology Innovations */}
                    <TechInnovations theme={theme} />
                    
                    {/* Features Showcase */}
                    <Features theme={theme} />

                    {/* Statistics count up metrics */}
                    <Stats theme={theme} />
                  </main>

                  {/* Detailed Footer */}
                  <Footer theme={theme} onNavigate={handleNavigate} />
                  
                  {/* Floating Preferences & FAQ Quick Hub Console */}
                  <QuickHub
                    theme={theme}
                    language={language}
                    currency={currency}
                    onPreferenceChange={handlePreferenceChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
