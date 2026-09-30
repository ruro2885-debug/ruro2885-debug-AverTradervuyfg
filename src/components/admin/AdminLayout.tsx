import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, Wallet, ArrowDownCircle, ArrowUpCircle, 
  ShieldCheck, MessageSquare, Megaphone, TrendingUp,
  LogOut, Menu, X, 
  ChevronRight, Command, Search, Globe, Shield, Layout
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Placeholder views for modules
import AdminDashboard from './views/AdminDashboard';
import AdminUsers from './views/AdminUsers';
import AdminWallets from './views/AdminWallets';
import AdminDeposits from './views/AdminDeposits';
import AdminWithdrawals from './views/AdminWithdrawals';
import AdminKYC from './views/AdminKYC';
import AdminSupport from './views/AdminSupport';
import AdminCampaigns from './views/AdminCampaigns';
import AdminTrades from './views/AdminTrades';

type ViewID = 'dashboard' | 'users' | 'wallets' | 'deposits' | 'withdrawals' | 'kyc' | 'support' | 'campaigns' | 'trades';

interface SidebarItem {
  id: ViewID;
  label: string;
  icon: any;
  category: 'core' | 'finance' | 'ops';
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'core' },
  { id: 'users', label: 'Users', icon: Users, category: 'core' },
  
  { id: 'wallets', label: 'Linked Wallets', icon: Wallet, category: 'finance' },
  { id: 'deposits', label: 'Deposits', icon: ArrowDownCircle, category: 'finance' },
  { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpCircle, category: 'finance' },
  
  { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck, category: 'ops' },
  { id: 'support', label: 'Support Tickets', icon: MessageSquare, category: 'ops' },
  { id: 'campaigns', label: 'Campaigns & Events', icon: Megaphone, category: 'ops' },
  { id: 'trades', label: 'Trades', icon: TrendingUp, category: 'ops' },
];

export default function AdminLayout({ 
  theme, 
  onLogout,
  onReturnToWorkspace 
}: { 
  theme: 'light' | 'dark'; 
  onLogout: () => void;
  onReturnToWorkspace?: () => void;
}) {
  const [activeView, setActiveView] = useState<ViewID>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  
  const isDark = theme === 'dark';

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <AdminDashboard theme={theme} />;
      case 'users': return <AdminUsers theme={theme} />;
      case 'wallets': return <AdminWallets theme={theme} />;
      case 'deposits': return <AdminDeposits theme={theme} />;
      case 'withdrawals': return <AdminWithdrawals theme={theme} />;
      case 'kyc': return <AdminKYC theme={theme} />;
      case 'support': return <AdminSupport theme={theme} />;
      case 'campaigns': return <AdminCampaigns theme={theme} />;
      case 'trades': return <AdminTrades theme={theme} />;
      default: return <AdminDashboard theme={theme} />;
    }
  };

  return (
    <div className={`notranslate min-h-screen flex ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`} translate="no">
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 260 }}
        className={`hidden lg:flex flex-col border-r sticky top-0 h-screen transition-colors ${
          isDark ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-200'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-slate-950" />
          </div>
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <span className="text-sm font-black tracking-tight leading-none">TERMINAL</span>
              <span className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase mt-0.5">Admin Ops</span>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {(['core', 'finance', 'ops'] as const).map(category => (
            <div key={category} className="space-y-1">
              {!isSidebarCollapsed && (
                <h4 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {category}
                </h4>
              )}
              {SIDEBAR_ITEMS.filter(item => item.category === category).map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                    activeView === item.id 
                      ? (isDark ? 'bg-white/10 text-white' : 'bg-slate-900 text-white')
                      : (isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${activeView === item.id ? 'text-emerald-500' : ''}`} />
                  {!isSidebarCollapsed && (
                    <span className="text-sm font-semibold flex-1 text-left">{item.label}</span>
                  )}
                  {!isSidebarCollapsed && activeView === item.id && (
                    <div className="w-1 h-4 rounded-full bg-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 space-y-1">
          {onReturnToWorkspace && (
            <button 
              onClick={onReturnToWorkspace}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
              title="Return to Trader Workspace"
            >
              <Layout className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              {!isSidebarCollapsed && <span className="text-sm font-semibold">Trader Workspace</span>}
            </button>
          )}
          <button 
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              isDark ? 'text-slate-400 hover:bg-rose-500/10 hover:text-rose-500' : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isSidebarCollapsed && <span className="text-sm font-semibold">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Command Bar */}
        <header className={`sticky top-0 z-40 h-16 border-b flex items-center justify-between px-6 transition-colors ${
          isDark ? 'bg-slate-950/80 border-white/5 backdrop-blur-md' : 'bg-white/80 border-slate-200 backdrop-blur-md'
        }`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-2 rounded-lg lg:flex hidden transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-2 rounded-lg lg:hidden flex transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <Command className="w-3.5 h-3.5" />
              <span>Search platform...</span>
              <div className="flex items-center gap-1 ml-2 opacity-50">
                <span className="px-1 py-0.5 rounded border border-current font-mono">⌘</span>
                <span className="px-1 py-0.5 rounded border border-current font-mono">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {onReturnToWorkspace && (
              <button
                onClick={onReturnToWorkspace}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer"
                title="Switch to Trader Dashboard"
              >
                <Layout className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trader Workspace</span>
              </button>
            )}
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-xs font-bold leading-none">{user?.email}</span>
              <span className="text-[10px] text-emerald-500 font-bold uppercase mt-1">Super Admin</span>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20`}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 sm:p-8 max-w-[1600px] mx-auto">
            {renderView()}
          </div>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className={`fixed inset-y-0 left-0 w-[280px] z-[70] lg:hidden flex flex-col ${
                isDark ? 'bg-slate-900' : 'bg-white'
              }`}
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-slate-950" />
                  </div>
                  <span className="font-black">TERMINAL</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 space-y-1.5 pb-12">
                {onReturnToWorkspace && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onReturnToWorkspace();
                    }}
                    className="w-full mb-3 flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold text-sm cursor-pointer"
                  >
                    <Layout className="w-5 h-5 flex-shrink-0" />
                    <span>Trader Workspace</span>
                  </button>
                )}
                {SIDEBAR_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      activeView === item.id 
                        ? (isDark ? 'bg-white/10 text-white font-bold' : 'bg-slate-900 text-white font-bold')
                        : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${activeView === item.id ? 'text-emerald-500' : ''}`} />
                    <span className="font-semibold text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
