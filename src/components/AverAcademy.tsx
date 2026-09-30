import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, BookOpen, Award } from 'lucide-react';

const MODULES = [
  { id: 1, title: 'Intro to Algorithmic Trading', progress: 85, icon: BookOpen },
  { id: 2, title: 'Risk Management 101', progress: 40, icon: Award },
];

export default function AverAcademy({ theme }: { theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  
  return (
    <div className={`p-6 rounded-[24px] ${isDark ? 'bg-slate-900/40 border border-white/5' : 'bg-white border border-slate-200'}`}>
      <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Aver Academy</h2>

      {/* Progress Modules */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {MODULES.map(module => (
          <div key={module.id} className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <div className="relative w-16 h-16 mx-auto mb-3">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className={isDark ? 'text-slate-700' : 'text-slate-200'} />
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="176" strokeDashoffset={176 - (176 * module.progress) / 100} className="text-purple-500 transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <module.icon className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <p className={`text-xs font-medium text-center ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{module.title}</p>
          </div>
        ))}
      </div>

      {/* Video Preview */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-6">
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
          <Play className="w-12 h-12 text-white fill-white" />
        </div>
      </div>

      {/* Live Ticker */}
      <div className="overflow-hidden whitespace-nowrap">
        <motion.div 
          animate={{ x: ['100%', '-100%'] }}
          transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
          className={`text-sm font-medium ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
        >
          User77 completed: Intro to Algorithmic Trading • User99 started: Risk Management • User12 finished: Advanced Strategy
        </motion.div>
      </div>
    </div>
  );
}
