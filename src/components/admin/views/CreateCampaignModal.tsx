import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { saveLocalCampaign } from '../../../lib/campaignStore';

export default function CreateCampaignModal({ onClose, theme }: { onClose: () => void, theme: 'light' | 'dark' }) {
  const [formData, setFormData] = useState({
    title: '', subtitle: '', category: '', totalRewardPool: 0, rewardToken: 'USDT', startTime: '', endTime: ''
  });
  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = 'CMP-' + Math.random().toString(36).substr(2, 9);
    const newCamp = {
      id: newId,
      ...formData,
      status: 'active' as const,
      participantCount: 0,
      createdAt: new Date().toISOString()
    };
    saveLocalCampaign(newCamp);
    try {
      await addDoc(collection(db, 'events_hub'), {
        ...formData,
        status: 'active',
        participantCount: 0,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Firestore campaign add notice:", err);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.form 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={handleSubmit}
        className={`w-full max-w-lg p-8 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black">Create Campaign</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <input className="w-full p-3 rounded-xl border bg-transparent" placeholder="Title" onChange={e => setFormData({...formData, title: e.target.value})} />
          <input className="w-full p-3 rounded-xl border bg-transparent" placeholder="Subtitle" onChange={e => setFormData({...formData, subtitle: e.target.value})} />
          <input className="w-full p-3 rounded-xl border bg-transparent" placeholder="Category" onChange={e => setFormData({...formData, category: e.target.value})} />
          <input className="w-full p-3 rounded-xl border bg-transparent" type="number" placeholder="Reward Pool" onChange={e => setFormData({...formData, totalRewardPool: Number(e.target.value)})} />
          <div className="flex gap-4">
            <input className="w-full p-3 rounded-xl border bg-transparent" type="date" onChange={e => setFormData({...formData, startTime: e.target.value})} />
            <input className="w-full p-3 rounded-xl border bg-transparent" type="date" onChange={e => setFormData({...formData, endTime: e.target.value})} />
          </div>
          <button type="submit" className="w-full py-3 bg-emerald-500 rounded-xl font-bold">Submit</button>
        </div>
      </motion.form>
    </div>
  );
}
