import React from 'react';
import { motion } from 'motion/react';

interface ProgressionBarProps {
  xp: number;
  level: number;
}

export const ProgressionBar: React.FC<ProgressionBarProps> = ({ xp, level }) => {
  const progress = (xp / 1000) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs font-bold text-slate-400">Level {level}</span>
        <span className="text-xs font-bold text-emerald-500">{xp} / 1000 XP</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};
