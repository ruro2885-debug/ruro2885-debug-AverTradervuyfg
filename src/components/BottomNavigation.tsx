import React from 'react';
import { Sliders, User } from 'lucide-react';
import { motion } from 'motion/react';
import { usePreferences } from '../contexts/PreferencesContext';
import { DashboardIcon, WalletIcon, TradesIcon, AnalyticsIcon } from './CustomIcons';

interface NavItem {
  name: string;
  icon: React.ElementType;
  id: string;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const { t } = usePreferences();
  const navItems: NavItem[] = [
    { name: t('common.home') || 'Home', icon: DashboardIcon, id: 'home' },
    { name: t('common.market') || 'Market', icon: TradesIcon, id: 'markets' },
    { name: t('common.ai') || 'AI', icon: Sliders, id: 'ai' },
    { name: t('common.portfolio') || 'Accounts', icon: WalletIcon, id: 'portfolio' },
    { name: 'Profile', icon: User, id: 'profile' },
  ];

  return (
    <div className="fixed bottom-[12px] left-[10px] right-[10px] z-50 flex lg:hidden justify-center pointer-events-none">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          backgroundColor: 'rgba(15, 20, 28, 0.85)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderTop: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 10px 24px rgba(0, 0, 0, 0.6)'
        }}
        className="relative w-full max-w-lg h-[52px] rounded-[26px] flex items-center justify-around px-2 pointer-events-auto"
      >
        

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          if (item.id === 'ai') {
            return (
              <div key={item.id} className="relative flex justify-center items-center w-12 h-12">
                {/* Tiny green light/ambient glow beneath */}
                <div className="absolute bottom-[-16px] w-6 h-[4px] bg-emerald-500/40 blur-[3px] rounded-full pointer-events-none" />

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onTabChange(item.id)}
                  style={{
                    backgroundColor: 'rgba(18, 22, 28, 0.85)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderTopColor: 'rgba(255, 255, 255, 0.6)', // very bright rim highlight
                    boxShadow: `
                      0 4px 12px rgba(0, 0, 0, 0.40),
                      0 2px 6px rgba(16, 185, 129, 0.30),
                      inset 0 1px 0.5px rgba(255, 255, 255, 0.50),
                      inset 0 -1px 1px rgba(0, 0, 0, 0.5),
                      inset 0 3px 6px rgba(16, 185, 129, 0.25)
                    `
                  }}
                  className="absolute -top-[14px] w-[38px] h-[38px] rounded-full flex items-center justify-center z-20 cursor-pointer border focus:outline-none backdrop-blur-xl touch-manipulation pointer-events-auto"
                >
                  {/* Frosted emerald breathing core */}
                  <motion.div
                    animate={{
                      opacity: [0.35, 0.65, 0.35],
                      scale: [0.95, 1.05, 0.95]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.2,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0.5 rounded-full bg-emerald-500/20 pointer-events-none blur-[1px]"
                  />

                  {/* Glass thickness internal reflection highlight */}
                  <div className="absolute top-0.5 left-1 w-2.5 h-1 bg-white/25 rounded-full filter blur-[0.5px] rotate-[15deg] pointer-events-none" />

                  {/* Only the icon glows brightly */}
                  <item.icon className="relative w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.95)]" />
                </motion.button>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center justify-center w-[54px] h-[44px] cursor-pointer group focus:outline-none select-none touch-manipulation pointer-events-auto"
            >
              {/* Active Glass lens reflection */}
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 12px rgba(16, 185, 129, 0.25)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 28
                  }}
                  className="absolute inset-0 rounded-2xl border backdrop-blur-md"
                />
              )}

              {/* Icon & Label Container */}
              <motion.div
                animate={{
                  scale: isActive ? 1.05 : 1,
                  y: isActive ? -1 : 0
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                className="relative flex flex-col items-center justify-center z-10 pointer-events-none"
              >
                <item.icon 
                  className={`w-[20px] h-[20px] transition-all duration-220 ${
                    isActive 
                      ? 'text-white drop-shadow-[0_0_8px_rgba(52,211,153,0.85)]' 
                      : 'text-white/80 group-hover:text-white group-active:text-white'
                  }`} 
                />
                <span
                  className={`text-[11px] font-extrabold mt-0.5 tracking-wide transition-colors duration-220 truncate max-w-[58px] text-center ${
                    isActive 
                      ? 'text-emerald-400 font-black drop-shadow-[0_0_6px_rgba(16,185,129,0.35)]' 
                      : 'text-white/80 group-hover:text-white group-active:text-white'
                  }`}
                >
                  {item.name}
                </span>
              </motion.div>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
