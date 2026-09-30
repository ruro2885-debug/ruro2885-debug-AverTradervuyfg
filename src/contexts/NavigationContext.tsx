import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { safeStorage } from '../utils/storage';

export interface NavigationLocation {
  id: string;
  view: string; // 'home' | 'dashboard' | 'preferences' | 'bonus-center' | 'kyc-verification' | 'history' | 'referral-centre' | 'market-highlights' | 'events-promos' | 'showcase' | 'admin' | 'auth' | 'not-found'
  tab?: string; // inside dashboard: 'home', 'markets', 'coin-details', 'discover', 'ai', 'portfolio', 'profile', 'events', 'support', 'copy-trading'
  subView?: string; // 'portfolio' | 'vault' | 'asset-stats' | trader profile | event details | task details | trade details
  aiView?: string; // 'HOME' | 'CONFIGS' | 'SCANNER' | 'RECOMMENDATIONS' | 'TRADES' | 'HISTORY' | 'PERFORMANCE' | 'NOTIFICATIONS'
  asset?: any; // For coin-details or asset views
  modal?: string | null; // 'deposit' | 'withdraw' | 'transfer' | 'notifications' | 'strategies' | etc.
  params?: Record<string, any>;
}

export type Location = NavigationLocation;

export interface NavigateOptions {
  replace?: boolean;
}

interface OverlayEntry {
  id: string;
  onClose: () => boolean | void;
}

export function parsePathToLocation(pathname: string): NavigationLocation | null {
  if (!pathname) return null;
  const clean = pathname.replace(/\/+$/, '') || '/';
  const lower = clean.toLowerCase();

  // Root / or empty
  if (lower === '/' || lower === '') {
    return {
      id: `nav-root`,
      view: 'home',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Explicit Home landing page (/home)
  if (lower === '/home') {
    return {
      id: `nav-root-home`,
      view: 'home',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Dedicated Deposit route: e.g. /deposit
  if (lower === '/deposit') {
    return {
      id: `nav-route-deposit`,
      view: 'dashboard',
      tab: 'home',
      modal: 'deposit',
      aiView: 'HOME',
    };
  }

  // Dedicated Withdraw route: e.g. /withdraw or /withdrawal
  if (lower === '/withdraw' || lower === '/withdrawal') {
    return {
      id: `nav-route-withdraw`,
      view: 'dashboard',
      tab: 'home',
      modal: 'withdraw',
      aiView: 'HOME',
    };
  }

  // Dashboard root
  if (lower === '/dashboard') {
    return {
      id: `nav-route-dashboard`,
      view: 'dashboard',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Markets
  if (lower === '/markets' || lower === '/market') {
    return {
      id: `nav-route-markets`,
      view: 'dashboard',
      tab: 'markets',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Coin details / Markets with ticker symbol, e.g. /markets/btc or /market/eth
  const coinMatch = clean.match(/^\/(?:markets|market|coin)\/([a-zA-Z0-9_-]+)$/i);
  if (coinMatch) {
    const symbol = coinMatch[1].toUpperCase();
    return {
      id: `nav-route-coin-${symbol}`,
      view: 'dashboard',
      tab: 'coin-details',
      asset: { symbol, name: symbol },
      aiView: 'HOME',
      modal: null,
    };
  }

  // AI Quantitative Trading Engine
  if (lower === '/ai' || lower === '/ai-trading') {
    return {
      id: `nav-route-ai`,
      view: 'dashboard',
      tab: 'ai',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Portfolio
  if (lower === '/portfolio') {
    return {
      id: `nav-route-portfolio`,
      view: 'dashboard',
      tab: 'portfolio',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Discover & Strategies
  if (lower === '/discover') {
    return {
      id: `nav-route-discover`,
      view: 'dashboard',
      tab: 'discover',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Support Center
  if (lower === '/support' || lower === '/support-center') {
    return {
      id: `nav-route-support`,
      view: 'dashboard',
      tab: 'support',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Profile
  if (lower === '/profile') {
    return {
      id: `nav-route-profile`,
      view: 'dashboard',
      tab: 'profile',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Copy Trading
  if (lower === '/copy-trading' || lower === '/copy') {
    return {
      id: `nav-route-copy`,
      view: 'dashboard',
      tab: 'copy-trading',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Events & Promotions
  if (lower === '/events' || lower === '/events-promos') {
    return {
      id: `nav-route-events`,
      view: 'events-promos',
      tab: 'events',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Referral Centre
  if (lower === '/referrals' || lower === '/referral-centre' || lower === '/referral-center') {
    return {
      id: `nav-route-referrals`,
      view: 'referral-centre',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Bonus Center
  if (lower === '/bonus' || lower === '/bonus-center' || lower === '/bonus-centre') {
    return {
      id: `nav-route-bonus`,
      view: 'bonus-center',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Preferences & Settings
  if (lower === '/preferences' || lower === '/settings') {
    return {
      id: `nav-route-preferences`,
      view: 'preferences',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Transaction History
  if (lower === '/history' || lower === '/transactions') {
    return {
      id: `nav-route-history`,
      view: 'history',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // KYC Verification
  if (lower === '/kyc' || lower === '/kyc-verification') {
    return {
      id: `nav-route-kyc`,
      view: 'kyc-verification',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Market Highlights
  if (lower === '/market-highlights' || lower === '/highlights') {
    return {
      id: `nav-route-highlights`,
      view: 'market-highlights',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Auth / Login
  if (lower === '/auth' || lower === '/login' || lower === '/register' || lower === '/signup') {
    return {
      id: `nav-route-auth`,
      view: 'auth',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Admin Terminal
  if (lower === '/admin' || lower.startsWith('/admin/')) {
    return {
      id: `nav-route-admin`,
      view: 'admin',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  // Platform Showcase
  if (lower === '/showcase') {
    return {
      id: `nav-route-showcase`,
      view: 'showcase',
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    };
  }

  return null;
}

export function locationToPath(loc: NavigationLocation): string {
  if (!loc) return '/';

  // 1. Modals with independent dedicated top-level routes
  if (loc.modal === 'deposit' || loc.view === 'deposit') {
    return '/deposit';
  }
  if (loc.modal === 'withdraw' || loc.view === 'withdraw' || loc.view === 'withdrawal') {
    return '/withdraw';
  }

  // 2. Distinct standalone views
  if (loc.view === 'admin') return '/admin';
  if (loc.view === 'auth') return '/auth';
  if (loc.view === 'preferences') return '/preferences';
  if (loc.view === 'bonus-center') return '/bonus-center';
  if (loc.view === 'kyc-verification') return '/kyc-verification';
  if (loc.view === 'history') return '/history';
  if (loc.view === 'referral-centre') return '/referral-centre';
  if (loc.view === 'market-highlights') return '/market-highlights';
  if (loc.view === 'events-promos') return '/events-promos';
  if (loc.view === 'showcase') return '/showcase';
  if (loc.view === 'not-found') return '/404';

  // 3. Dashboard sub-tabs
  if (loc.view === 'dashboard') {
    if (loc.tab === 'markets') return '/markets';
    if (loc.tab === 'coin-details' && loc.asset?.symbol) {
      return `/markets/${loc.asset.symbol.toLowerCase()}`;
    }
    if (loc.tab === 'ai') return '/ai';
    if (loc.tab === 'portfolio') return '/portfolio';
    if (loc.tab === 'discover') return '/discover';
    if (loc.tab === 'support') return '/support';
    if (loc.tab === 'profile') return '/profile';
    if (loc.tab === 'copy-trading') return '/copy-trading';
    if (loc.tab === 'events') return '/events-promos';
    return '/dashboard';
  }

  // 4. Landing home page
  if (loc.view === 'home' || loc.view === 'hero') {
    return '/';
  }

  return `/${loc.view}`;
}

export interface NavigationContextType {
  currentLocation: NavigationLocation;
  stack: NavigationLocation[];
  navigate: (to: Partial<NavigationLocation> | string, options?: NavigateOptions) => void;
  navigateTab: (tab: string, extra?: Partial<NavigationLocation>, options?: NavigateOptions) => void;
  navigateView: (view: string, extra?: Partial<NavigationLocation>, options?: NavigateOptions) => void;
  navigateSubView: (subView: string, extra?: Partial<NavigationLocation>, options?: NavigateOptions) => void;
  navigateAiView: (aiView: string) => void;
  openModal: (modal: string, params?: any) => void;
  closeModal: () => void;
  goBack: (fallback?: Partial<NavigationLocation>) => void;
  close: () => void;
  registerOverlay: (id: string, onClose: () => boolean | void) => () => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

const STORAGE_STACK_KEY = 'aver_real_nav_stack_v2';

const DEFAULT_LOCATION: NavigationLocation = {
  id: 'root-home',
  view: 'home',
  tab: 'home',
  subView: undefined,
  aiView: 'HOME',
  modal: null,
};

function getInitialStack(initialView?: string): NavigationLocation[] {
  const isExplicitlyLoggedOut = safeStorage.getItem('aver_logged_out') === 'true';
  const hasActiveUser = !isExplicitlyLoggedOut && !!safeStorage.getItem('aver_active_user');
  const protectedViews = ['dashboard', 'deposit', 'withdraw', 'history', 'referral-centre', 'preferences', 'bonus-center', 'kyc-verification', 'admin', 'auth'];

  // If user is explicitly logged out or unauthenticated on cold boot, guarantee fresh start on the landing page
  if (isExplicitlyLoggedOut) {
    return [DEFAULT_LOCATION];
  }

  // 1. Direct browser address bar path (e.g. https://www.avertrader.space/deposit)
  if (typeof window !== 'undefined' && window.location) {
    const fromUrl = parsePathToLocation(window.location.pathname);
    if (fromUrl) {
      if (!hasActiveUser && protectedViews.includes(fromUrl.view)) {
        return [DEFAULT_LOCATION];
      }
      return [fromUrl];
    }
  }

  // 2. Persisted navigation stack in sessionStorage
  try {
    const raw = safeStorage.getItem(STORAGE_STACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const topView = parsed[parsed.length - 1]?.view;
        if (!hasActiveUser && protectedViews.includes(topView)) {
          return [DEFAULT_LOCATION];
        }
        return parsed;
      }
    }
  } catch (e) {
    // Ignore parse errors and use default
  }

  const initV = initialView || (hasActiveUser ? 'dashboard' : 'home');
  return [
    {
      id: `root-${Date.now()}`,
      view: initV,
      tab: 'home',
      aiView: 'HOME',
      modal: null,
    },
  ];
}

export function NavigationProvider({
  children,
  initialView,
}: {
  children: React.ReactNode;
  initialView?: string;
}) {
  const [stack, setStack] = useState<NavigationLocation[]>(() => getInitialStack(initialView));

  const currentLocation = stack[stack.length - 1] || DEFAULT_LOCATION;
  const isNavigatingBackRef = useRef(false);
  const overlaysRef = useRef<OverlayEntry[]>([]);

  // Persist stack to sessionStorage so refreshes preserve actual history
  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_STACK_KEY, JSON.stringify(stack));
    } catch (e) {}
  }, [stack]);

  // Synchronize browser history URL and dynamic document title on current route change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const targetPath = locationToPath(currentLocation);
    if (window.location.pathname !== targetPath) {
      try {
        window.history.replaceState(currentLocation, '', targetPath);
      } catch (e) {}
    } else if (!window.history.state || !window.history.state.id) {
      try {
        window.history.replaceState(currentLocation, '', targetPath);
      } catch (e) {}
    }

    // Dynamic Title per Route
    let title = 'Aver | Institutional AI Trading Platform';
    if (currentLocation.modal === 'deposit' || currentLocation.view === 'deposit') {
      title = 'Aver | Institutional Deposit';
    } else if (currentLocation.modal === 'withdraw' || currentLocation.view === 'withdraw' || currentLocation.view === 'withdrawal') {
      title = 'Aver | Institutional Withdrawal';
    } else if (currentLocation.view === 'admin') {
      title = 'Aver | Executive Command Console';
    } else if (currentLocation.view === 'auth') {
      title = 'Aver | Secure Access Terminal';
    } else if (currentLocation.view === 'dashboard') {
      if (currentLocation.tab === 'markets') title = 'Aver | Global Asset Markets';
      else if (currentLocation.tab === 'coin-details') title = `Aver | Market Overview ${currentLocation.asset?.symbol || ''}`;
      else if (currentLocation.tab === 'ai') title = 'Aver | AI Quantitative Engine';
      else if (currentLocation.tab === 'portfolio') title = 'Aver | Portfolio & Asset Vault';
      else if (currentLocation.tab === 'discover') title = 'Aver | Discover Strategies & Ecosystem';
      else if (currentLocation.tab === 'support') title = 'Aver | Specialist Support Center';
      else if (currentLocation.tab === 'profile') title = 'Aver | Trader Profile & Security';
      else if (currentLocation.tab === 'copy-trading') title = 'Aver | Quantitative Copy Trading';
      else title = 'Aver | Terminal Dashboard';
    } else if (currentLocation.view === 'referral-centre') {
      title = 'Aver | Institutional Referral Programme';
    } else if (currentLocation.view === 'bonus-center') {
      title = 'Aver | Rewards & Bonus Center';
    } else if (currentLocation.view === 'preferences') {
      title = 'Aver | System Preferences';
    } else if (currentLocation.view === 'history') {
      title = 'Aver | Transaction & Trade History';
    } else if (currentLocation.view === 'kyc-verification') {
      title = 'Aver | Institutional KYC Verification';
    } else if (currentLocation.view === 'market-highlights') {
      title = 'Aver | Global Market Highlights';
    } else if (currentLocation.view === 'events-promos') {
      title = 'Aver | Special Events & Promotions';
    } else if (currentLocation.view === 'showcase') {
      title = 'Aver | Platform Showcase';
    }

    document.title = title;
  }, [currentLocation]);

  // Listen to browser / hardware popstate
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      isNavigatingBackRef.current = true;

      // First check if any active overlay / modal registered a close handler
      if (overlaysRef.current.length > 0) {
        const topOverlay = overlaysRef.current.pop();
        if (topOverlay) {
          const handled = topOverlay.onClose();
          if (handled !== false) {
            setTimeout(() => {
              isNavigatingBackRef.current = false;
            }, 50);
            return;
          }
        }
      }

      if (e.state && e.state.id) {
        const targetState = e.state as NavigationLocation;
        setStack(prev => {
          const existingIdx = prev.findIndex(item => item.id === targetState.id);
          if (existingIdx !== -1) {
            return prev.slice(0, existingIdx + 1);
          }
          if (prev.length > 1) {
            return prev.slice(0, -1);
          }
          return [targetState];
        });
      } else {
        const parsedFromPath = parsePathToLocation(window.location.pathname);
        if (parsedFromPath) {
          setStack(prev => (prev.length > 1 ? [...prev.slice(0, -1), parsedFromPath] : [parsedFromPath]));
        } else {
          setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
        }
      }

      setTimeout(() => {
        isNavigatingBackRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to navigation reset events (e.g. on logout) to instantly navigate to landing page
  useEffect(() => {
    const handleNavReset = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetView = customEvent?.detail?.view || 'home';
      const rootLocation: NavigationLocation = {
        id: `root-${Date.now()}`,
        view: targetView,
        tab: 'home',
        aiView: 'HOME',
        modal: null,
      };
      setStack([rootLocation]);
      try {
        safeStorage.removeItem(STORAGE_STACK_KEY);
        safeStorage.setItem(STORAGE_STACK_KEY, JSON.stringify([rootLocation]));
      } catch (err) {}
      if (typeof window !== 'undefined' && window.history) {
        try {
          window.history.replaceState(rootLocation, '', '/');
        } catch (e) {}
      }
    };

    window.addEventListener('aver_nav_reset', handleNavReset);
    return () => window.removeEventListener('aver_nav_reset', handleNavReset);
  }, []);

  const registerOverlay = useCallback((id: string, onClose: () => boolean | void) => {
    overlaysRef.current = overlaysRef.current.filter(o => o.id !== id);
    overlaysRef.current.push({ id, onClose });
    return () => {
      overlaysRef.current = overlaysRef.current.filter(o => o.id !== id);
    };
  }, []);

  const navigate = useCallback(
    (to: Partial<NavigationLocation> | string, options?: NavigateOptions) => {
      let toObj: Partial<NavigationLocation>;
      if (typeof to === 'string') {
        if (to.startsWith('/')) {
          const parsed = parsePathToLocation(to);
          toObj = parsed || { view: to.replace(/^\//, '') };
        } else {
          toObj = { view: to };
        }
      } else {
        toObj = to;
      }

      setStack(prev => {
        const current = prev[prev.length - 1] || DEFAULT_LOCATION;

        const nextView = toObj.view !== undefined ? toObj.view : current.view;
        const nextTab =
          toObj.tab !== undefined
            ? toObj.tab
            : nextView === 'dashboard'
            ? current.tab || 'home'
            : undefined;
        const nextSubView = toObj.subView !== undefined ? toObj.subView : undefined;
        const nextAiView =
          toObj.aiView !== undefined
            ? toObj.aiView
            : nextTab === 'ai'
            ? current.aiView || 'HOME'
            : 'HOME';
        const nextModal = toObj.modal !== undefined ? toObj.modal : null;
        const nextAsset =
          toObj.asset !== undefined
            ? toObj.asset
            : nextTab === 'coin-details'
            ? current.asset
            : undefined;
        const nextParams = toObj.params !== undefined ? toObj.params : current.params;

        // Duplicate prevention: If identical to current top of stack, do not push duplicate
        if (
          !options?.replace &&
          nextView === current.view &&
          nextTab === current.tab &&
          nextSubView === current.subView &&
          nextAiView === current.aiView &&
          nextModal === current.modal &&
          JSON.stringify(nextAsset) === JSON.stringify(current.asset) &&
          JSON.stringify(nextParams) === JSON.stringify(current.params)
        ) {
          return prev;
        }

        const newEntry: NavigationLocation = {
          id: `nav-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          view: nextView,
          tab: nextTab,
          subView: nextSubView,
          aiView: nextAiView,
          modal: nextModal,
          asset: nextAsset,
          params: nextParams,
        };

        const targetPath = locationToPath(newEntry);
        try {
          if (options?.replace) {
            window.history.replaceState(newEntry, '', targetPath);
          } else {
            window.history.pushState(newEntry, '', targetPath);
          }
        } catch (e) {}

        if (options?.replace) {
          return [...prev.slice(0, -1), newEntry];
        }

        return [...prev, newEntry];
      });
    },
    []
  );

  const goBack = useCallback((fallback?: Partial<NavigationLocation>) => {
    // If an overlay is registered (e.g. popup/drawer), close it first without navigating away
    if (overlaysRef.current.length > 0) {
      const topOverlay = overlaysRef.current.pop();
      if (topOverlay) {
        const handled = topOverlay.onClose();
        if (handled !== false) {
          return;
        }
      }
    }

    setStack(prev => {
      let isAuthenticated = false;
      try {
        const u1 = safeStorage.getItem('aver_user_session');
        const u2 = safeStorage.getItem('aver_user');
        const u3 = localStorage.getItem('aver_user') || sessionStorage.getItem('aver_user');
        if (u1 || u2 || u3) isAuthenticated = true;
      } catch (e) {}

      if (prev.length > 1) {
        let targetIdx = prev.length - 2;

        // Skip unauthenticated screens if user is authenticated
        if (isAuthenticated) {
          while (targetIdx >= 0 && (prev[targetIdx].view === 'auth' || prev[targetIdx].view === 'home')) {
            targetIdx--;
          }
        }

        if (targetIdx >= 0) {
          const nextStack = prev.slice(0, targetIdx + 1);
          const prevTop = nextStack[nextStack.length - 1];
          const targetPath = locationToPath(prevTop);

          try {
            window.history.replaceState(prevTop, '', targetPath);
          } catch (e) {}

          return nextStack;
        }
      }

      // No previous valid stack item exists — route to fallback or dashboard
      if (isAuthenticated) {
        const rootDashboard: NavigationLocation = {
          id: `root-${Date.now()}`,
          view: fallback?.view || 'dashboard',
          tab: fallback?.tab || 'home',
          subView: fallback?.subView,
          aiView: fallback?.aiView || 'HOME',
          modal: null,
          asset: fallback?.asset,
          params: fallback?.params,
        };
        const targetPath = locationToPath(rootDashboard);
        try {
          window.history.replaceState(rootDashboard, '', targetPath);
        } catch (e) {}
        return [rootDashboard];
      }

      if (fallback) {
        const fallbackEntry: NavigationLocation = {
          id: `root-${Date.now()}`,
          view: fallback.view || 'dashboard',
          tab: fallback.tab || 'home',
          subView: fallback.subView,
          aiView: fallback.aiView || 'HOME',
          modal: null,
          asset: fallback.asset,
          params: fallback.params,
        };
        const targetPath = locationToPath(fallbackEntry);
        try {
          window.history.replaceState(fallbackEntry, '', targetPath);
        } catch (e) {}
        return [fallbackEntry];
      }

      const rootEntry: NavigationLocation = {
        id: `root-${Date.now()}`,
        view: 'home',
        tab: 'home',
        aiView: 'HOME',
        modal: null,
      };
      const targetPath = locationToPath(rootEntry);
      try {
        window.history.replaceState(rootEntry, '', targetPath);
      } catch (e) {}
      return [rootEntry];
    });
  }, []);

  const close = useCallback(() => {
    // 1. Close overlay / popup / drawer first if open
    if (overlaysRef.current.length > 0) {
      const topOverlay = overlaysRef.current.pop();
      if (topOverlay) {
        const handled = topOverlay.onClose();
        if (handled !== false) {
          return;
        }
      }
    }

    // 2. If top of stack is a modal, pop it
    if (currentLocation.modal) {
      goBack();
      return;
    }

    // 3. Otherwise navigate to immediate previous page in history
    goBack();
  }, [currentLocation.modal, goBack]);

  const navigateTab = useCallback(
    (tab: string, extra?: Partial<NavigationLocation>, options?: NavigateOptions) => {
      navigate({ view: 'dashboard', tab, ...extra }, options);
    },
    [navigate]
  );

  const navigateView = useCallback(
    (view: string, extra?: Partial<NavigationLocation>, options?: NavigateOptions) => {
      navigate({ view, ...extra }, options);
    },
    [navigate]
  );

  const navigateSubView = useCallback(
    (subView: string, extra?: Partial<NavigationLocation>, options?: NavigateOptions) => {
      navigate({ subView, ...extra }, options);
    },
    [navigate]
  );

  const navigateAiView = useCallback(
    (aiView: string) => {
      navigate({ view: 'dashboard', tab: 'ai', aiView });
    },
    [navigate]
  );

  const openModal = useCallback(
    (modal: string, params?: any) => {
      navigate({ modal, params });
    },
    [navigate]
  );

  const closeModal = useCallback(() => {
    if (currentLocation.modal) {
      goBack();
    } else {
      navigate({ modal: null });
    }
  }, [currentLocation.modal, goBack, navigate]);

  return (
    <NavigationContext.Provider
      value={{
        currentLocation,
        stack,
        navigate,
        navigateTab,
        navigateView,
        navigateSubView,
        navigateAiView,
        openModal,
        closeModal,
        goBack,
        close,
        registerOverlay,
        canGoBack: stack.length > 1,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useAppNavigation must be used within a NavigationProvider');
  }
  return context;
}
