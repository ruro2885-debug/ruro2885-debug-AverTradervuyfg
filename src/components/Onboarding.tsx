import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronRight, User, Shield, Bell, Zap, Palette, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingProps {
  theme: 'light' | 'dark';
}

export default function Onboarding({ theme }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const { updateOnboarding, user } = useAuth();
  const isDark = theme === 'dark';

  const steps = [
    {
      title: 'Welcome to AverNoxTrader',
      description: 'Your account has been successfully created. We are now preparing your premium trading environment.',
      icon: User,
      details: [
        'Creating your secure wallet...',
        'Provisioning your initial portfolio...',
        'Generating your default avatar...',
      ]
    },
    {
      title: 'Security & Preferences',
      description: 'Your safety is our priority. We are configuring your account with industry-leading defaults.',
      icon: Shield,
      details: [
        'Enabling default security settings...',
        'Setting up notification preferences...',
        'Securing communication channels...',
      ]
    },
    {
      title: 'Dashboard Personalization',
      description: 'Tailoring the interface to provide you with the most relevant market insights and AI signals.',
      icon: Zap,
      details: [
        'Initializing AI models...',
        'Loading real-time market data...',
        'Finalizing dashboard preferences...',
      ]
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      updateOnboarding(true);
    }
  };

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-[#050505]/60 border-white/10" : "bg-white/60 border-slate-200/50";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex items-center justify-center p-6 relative z-10"
    >
      <div className={`w-full max-w-lg backdrop-blur-xl border rounded-[32px] overflow-hidden shadow-2xl ${cardBg}`}>
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/10">
          <motion.div 
            className="h-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        <div className="p-8 sm:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              {(() => {
                const Icon = steps[step].icon;
                return (
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-lg ${
                    isDark ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border border-emerald-500/30 text-emerald-400' 
                           : 'bg-gradient-to-br from-emerald-100 to-emerald-200 border border-emerald-300 text-emerald-700'
                  }`}>
                    <Icon className="w-10 h-10" />
                  </div>
                );
              })()}

              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight mb-4 text-center ${textPrimary}`}>
                {steps[step].title}
              </h2>
              
              <p className={`text-sm sm:text-base leading-relaxed text-center ${textSecondary} mb-8`}>
                {steps[step].description}
              </p>

              {/* Animated Checklist for Premium Feel */}
              <div className="w-full space-y-4 mb-10">
                {steps[step].details.map((detail, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + (idx * 0.15) }}
                    className={`flex items-center space-x-3 p-3 rounded-xl border ${
                      isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      <Check className="w-4 h-4 stroke-[3px]" />
                    </div>
                    <span className={`text-sm font-medium ${textPrimary}`}>{detail}</span>
                  </motion.div>
                ))}
              </div>

              {/* Step Indicators */}
              <div className="flex items-center justify-center space-x-2 mb-10">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      i === step 
                        ? 'w-8 bg-emerald-500' 
                        : i < step 
                          ? `w-2 ${isDark ? 'bg-emerald-500/50' : 'bg-emerald-300'}` 
                          : `w-2 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`
                    }`} 
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-[0_4px_20px_rgba(16,185,129,0.3)] ${
                  isDark ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                <span>{step === steps.length - 1 ? 'Go to Dashboard' : 'Continue'}</span>
                {step === steps.length - 1 ? <ArrowRight className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
