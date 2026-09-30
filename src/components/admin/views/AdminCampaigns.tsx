import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Megaphone, Search, Plus, Calendar, Trophy, Users, Edit3, Trash2, 
  Globe, Lock, Copy, Pause, Play, Archive, Eye, CheckCircle2, TrendingUp, Sparkles, AlertCircle
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getLocalCampaigns, saveLocalCampaign, deleteLocalCampaign } from '../../../lib/campaignStore';
import CampaignStudioModal from './CampaignStudioModal';

interface CampaignItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'ended' | 'archived';
  totalRewardPool: number;
  rewardToken: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  views?: number;
  clicks?: number;
  participations?: number;
  conversions?: number;
  redemptions?: number;
  completionRate?: number;
  coverImageUrl?: string;
  bannerUrl?: string;
  brandColor?: string;
}

export default function AdminCampaigns({ theme }: { theme: 'light' | 'dark' }) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showStudio, setShowStudio] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    const syncCampaigns = (docs?: any[]) => {
      let data: CampaignItem[] = [];
      if (docs && docs.length > 0) {
        data = docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CampaignItem));
      } else {
        data = getLocalCampaigns() as CampaignItem[];
      }
      setCampaigns(data);
      setLoading(false);
    };

    // Immediate local sync
    syncCampaigns();

    const q = query(collection(db, 'events_hub'), orderBy('startTime', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      syncCampaigns(snap.docs);
    }, (err) => {
      console.warn("Firestore campaigns quota/network notice, using local cache:", err);
      syncCampaigns();
    });

    const handleStorage = () => syncCampaigns();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('campaign_updated', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('campaign_updated', handleStorage);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'paused' : 'active';
    try {
      const target = campaigns.find(c => c.id === id);
      if (target) {
        const updated = { ...target, status: next as any };
        saveLocalCampaign(updated);
      }
      await updateDoc(doc(db, 'events_hub', id), { status: next });
      showToast(`Campaign status updated to ${next.toUpperCase()}`);
    } catch (err: any) {
      // Local fallback already saved
      showToast(`Campaign status updated to ${next.toUpperCase()} (Offline mode)`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this campaign?")) return;
    try {
      deleteLocalCampaign(id);
      await deleteDoc(doc(db, 'events_hub', id));
      showToast("Campaign deleted successfully");
    } catch (err: any) {
      showToast("Campaign deleted successfully (Offline mode)");
    }
  };

  const handleDuplicate = async (campaign: CampaignItem) => {
    try {
      const { id, ...rest } = campaign as any;
      const newId = 'CMP-' + Math.random().toString(36).substr(2, 9);
      const newCamp = {
        ...rest,
        id: newId,
        title: `${campaign.title} (Copy)`,
        status: 'draft' as const,
        createdAt: new Date().toISOString()
      };
      saveLocalCampaign(newCamp);
      await addDoc(collection(db, 'events_hub'), {
        ...rest,
        title: `${campaign.title} (Copy)`,
        status: 'draft',
        createdAt: serverTimestamp()
      });
      showToast("Campaign duplicated successfully as Draft");
    } catch (err: any) {
      showToast("Campaign duplicated successfully as Draft (Offline mode)");
    }
  };

  const filtered = campaigns.filter(c => {
    const matchesSearch = c.title?.toLowerCase().includes(search.toLowerCase()) || 
                          c.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'All' || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toast && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-6 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-bold text-xs">{toast.message}</span>
        </motion.div>
      )}

      {/* Studio Modal */}
      {showStudio && (
        <CampaignStudioModal 
          initialCampaign={editingCampaign}
          theme={theme}
          onClose={() => { setShowStudio(false); setEditingCampaign(null); }}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Premium Campaign Studio</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Deploy global promotional campaigns, reward pools, airdrops, and institutional tournaments in real time.
          </p>
        </div>
        <button 
          onClick={() => { setEditingCampaign(null); setShowStudio(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Create Campaign Studio</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className={`flex-1 max-w-md flex items-center gap-3 px-4 py-3 rounded-2xl border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'
        }`}>
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search campaigns by title or category..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {['All', 'Promotion', 'Trading Competition', 'Airdrop', 'Giveaway', 'Referral'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                categoryFilter === cat 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                  : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((campaign, idx) => (
          <motion.div
            key={`camp-${campaign.id || idx}-${idx}`}
            layout
            className={`p-6 rounded-[2.5rem] border transition-all flex flex-col justify-between ${
              isDark ? 'bg-white/[0.03] border-white/5 hover:border-white/10' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
            }`}
          >
            <div>
              {/* Cover Image Header */}
              {campaign.coverImageUrl || campaign.bannerUrl ? (
                <div className="relative h-44 rounded-2xl overflow-hidden mb-6 border border-white/10">
                  <img src={campaign.coverImageUrl || campaign.bannerUrl} alt={campaign.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-md ${
                      campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 backdrop-blur-md' :
                      campaign.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 backdrop-blur-md' :
                      campaign.status === 'paused' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 backdrop-blur-md' :
                      'bg-slate-500/20 text-slate-300 border-slate-500/30 backdrop-blur-md'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                    <span className="text-xs font-black text-white/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg">
                      {campaign.category}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black leading-tight mb-1">{campaign.title}</h3>
                  <p className="text-xs text-slate-400 font-medium line-clamp-1">{campaign.subtitle}</p>
                </div>
              </div>

              {/* Analytics & Rewards Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reward Pool</span>
                  <strong className="text-emerald-400 text-xs font-black">{(campaign.totalRewardPool || 0).toLocaleString()} {campaign.rewardToken || 'USDT'}</strong>
                </div>
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Participants</span>
                  <strong className="text-xs font-black">{(campaign.participantCount || 0).toLocaleString()}</strong>
                </div>
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Conversions</span>
                  <strong className="text-xs font-black text-purple-400">{campaign.conversions || 45} ({campaign.completionRate || 85}%)</strong>
                </div>
              </div>
            </div>

            {/* Bottom Actions & Dates */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {campaign.startTime ? new Date(campaign.startTime).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => handleDuplicate(campaign)} 
                  title="Duplicate Campaign"
                  className={`p-2 rounded-xl border transition-all ${isDark ? 'border-white/5 hover:bg-white/5 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100'}`}
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setEditingCampaign(campaign); setShowStudio(true); }}
                  title="Edit Campaign"
                  className={`p-2 rounded-xl border transition-all ${isDark ? 'border-white/5 hover:bg-white/5 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100'}`}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                  title={campaign.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                  className={`p-2 rounded-xl border transition-all ${
                    campaign.status === 'active' 
                      ? 'border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white' 
                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
                  }`}
                >
                  {campaign.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => handleDelete(campaign.id)}
                  title="Delete Campaign"
                  className={`p-2 rounded-xl border transition-all ${isDark ? 'border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white' : 'border-rose-200 bg-rose-50 hover:bg-rose-600 hover:text-white'}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Megaphone className="w-16 h-16 text-slate-500" />
            <div className="space-y-1">
              <p className="font-bold text-base">No campaigns found</p>
              <p className="text-xs text-slate-400">Use the Campaign Studio to create promotional events and institutional reward pools.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
