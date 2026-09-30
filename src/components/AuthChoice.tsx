import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, LogIn, ArrowLeft } from 'lucide-react';
import WelcomeBonusCard from './WelcomeBonusCard';

interface AuthChoiceProps {
  theme: 'light' | 'dark';
  onBack: () => void;
  onSelect: (view: 'register' | 'login') => void;
}

export default function AuthChoice({ theme, onBack, onSelect }: AuthChoiceProps) {
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#030712] text-white relative z-20 isolate">
      {/* Fixed Back Button */}
      <button 
        onClick={onBack}
        className="fixed top-6 left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="w-full max-w-2xl space-y-10">
        
        {/* Hero Section: Welcome Bonus */}
        <div className="transform translate-y-0 opacity-100 transition-all duration-700">
            <WelcomeBonusCard theme="dark" onCtaClick={() => onSelect('register')} />
        </div>

        {/* Premium Buttons (Completely Solid & Isolated) */}
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
            <button
                onClick={() => onSelect('register')}
                className="flex-1 py-4 bg-[#10b981] hover:bg-[#059669] text-black font-extrabold text-base rounded-xl transition-all shadow-[0_4px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
            >
                <span className="tracking-wide">Create Account</span>
                <ArrowRight className="w-5 h-5 text-black" />
            </button>
            <button
                onClick={() => onSelect('login')}
                className="flex-1 py-4 bg-[#1f2937] hover:bg-[#374151] text-white font-extrabold text-base rounded-xl transition-all border border-slate-700 hover:border-slate-600 shadow-[0_4px_15px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
            >
                <span className="tracking-wide">Log In</span>
                <LogIn className="w-5 h-5 text-white" />
            </button>
        </div>

      </div>
    </div>
  );
}
