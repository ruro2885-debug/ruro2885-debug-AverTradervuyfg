import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Pause, 
  Play, 
  Archive, 
  CheckCircle, 
  Sparkles, 
  Image as ImageIcon, 
  Calendar, 
  Coins, 
  ShieldAlert, 
  Layers 
} from 'lucide-react';
import { EventItem, EventCategory, EventStatus } from '../../types/events';
import { createBackendPromotion, updateBackendPromotion, deleteBackendPromotion } from '../../services/eventsService';

interface EventAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  theme?: 'light' | 'dark';
}

const CATEGORY_OPTIONS: EventCategory[] = [
  'Trading Competition',
  'Airdrop Sprint',
  'Staking & Yield',
  'VIP Quest',
  'New Listing',
  'Special Event'
];

const ARTWORK_PRESETS = [
  'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop'
];

export default function EventAdminModal({
  isOpen,
  onClose,
  events,
  theme = 'dark'
}: EventAdminModalProps) {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Trading Competition');
  const [rewardPool, setRewardPool] = useState<number>(100000);
  const [rewardToken, setRewardToken] = useState('USDT');
  const [bannerUrl, setBannerUrl] = useState(ARTWORK_PRESETS[0]);
  const [accentColor, setAccentColor] = useState('#8B5CF6');
  const [featured, setFeatured] = useState(false);
  const [overview, setOverview] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));

  const isDark = theme === 'dark';

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setCategory('Trading Competition');
    setRewardPool(100000);
    setRewardToken('USDT');
    setBannerUrl(ARTWORK_PRESETS[0]);
    setAccentColor('#8B5CF6');
    setFeatured(false);
    setOverview('');
    setStartDate(new Date().toISOString().slice(0, 16));
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setEditingEventId(null);
  };

  const handleStartEdit = (event: EventItem) => {
    setEditingEventId(event.id);
    setTitle(event.title);
    setSubtitle(event.subtitle);
    setCategory(event.category);
    setRewardPool(event.totalRewardPool);
    setRewardToken(event.rewardToken);
    setBannerUrl(event.bannerUrl);
    setAccentColor(event.accentColor || '#8B5CF6');
    setFeatured(!!event.featured);
    setOverview(event.overview);
    setStartDate(new Date(event.startTime).toISOString().slice(0, 16));
    setEndDate(new Date(event.endTime).toISOString().slice(0, 16));
    setActiveTab('EDIT');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<EventItem> = {
        title,
        subtitle,
        category,
        totalRewardPool: Number(rewardPool),
        rewardToken,
        bannerUrl,
        accentColor,
        featured,
        overview,
        startTime: new Date(startDate).toISOString(),
        endTime: new Date(endDate).toISOString(),
      };

      if (activeTab === 'EDIT' && editingEventId) {
        await updateBackendPromotion(editingEventId, payload);
        setSuccessMsg("Promotion updated successfully!");
      } else {
        await createBackendPromotion(payload);
        setSuccessMsg("New promotion created and published!");
      }

      setTimeout(() => {
        setSuccessMsg(null);
        resetForm();
        setActiveTab('LIST');
      }, 1200);
    } catch (err) {
      console.error("Failed saving promotion:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async (event: EventItem) => {
    const newStatus: EventStatus = event.status === 'PAUSED' ? 'LIVE' : 'PAUSED';
    await updateBackendPromotion(event.id, { status: newStatus });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this promotion from the backend?")) {
      await deleteBackendPromotion(id);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border ${
            isDark 
              ? 'bg-[#0B0E17]/95 border-gray-800 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)]' 
              : 'bg-white border-gray-200 text-gray-900 shadow-2xl'
          } overflow-hidden`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800/60 bg-gradient-to-r from-purple-900/20 via-transparent to-blue-900/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  Admin Campaign Console
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
                    Backend Live Sync
                  </span>
                </h2>
                <p className="text-xs text-gray-400 font-medium">Manage, schedule, and configure dynamic promotional events</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-gray-800/40 bg-gray-900/30">
            <button
              onClick={() => { setActiveTab('LIST'); resetForm(); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'LIST' 
                  ? 'border-purple-500 text-purple-400 bg-purple-500/10' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Campaign Index ({events.length})
            </button>
            <button
              onClick={() => { setActiveTab('CREATE'); resetForm(); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'CREATE' || activeTab === 'EDIT'
                  ? 'border-purple-500 text-purple-400 bg-purple-500/10' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'EDIT' ? 'Edit Campaign' : 'Create New Event'}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center gap-3">
                <CheckCircle className="w-5 h-5" />
                {successMsg}
              </div>
            )}

            {/* TAB: LIST */}
            {activeTab === 'LIST' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-400 font-bold px-1">
                  <span>ACTIVE & SCHEDULED PROMOTIONS</span>
                  <span>ACTIONS</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {events.map((ev) => (
                    <div 
                      key={ev.id}
                      className="p-4 rounded-2xl border border-gray-800 bg-gray-900/40 hover:border-gray-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <img 
                          src={ev.bannerUrl} 
                          alt={ev.title} 
                          className="w-16 h-12 rounded-xl object-cover border border-gray-800"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{ev.title}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              ev.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              ev.status === 'UPCOMING' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              ev.status === 'PAUSED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}>
                              {ev.status}
                            </span>
                            {ev.featured && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Featured
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {ev.category} • Pool: <span className="font-bold text-white">${ev.totalRewardPool.toLocaleString()} {ev.rewardToken}</span> • Participants: {ev.participantCount}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePause(ev)}
                          className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors flex items-center gap-1 text-xs font-semibold"
                          title={ev.status === 'PAUSED' ? 'Resume Event' : 'Pause Event'}
                        >
                          {ev.status === 'PAUSED' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                        </button>
                        <button
                          onClick={() => handleStartEdit(ev)}
                          className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-purple-400 transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(ev.id)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CREATE OR EDIT */}
            {(activeTab === 'CREATE' || activeTab === 'EDIT') && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Campaign Title *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. World Trading Championship 2026"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as EventCategory)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    >
                      {CATEGORY_OPTIONS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Short catching tagline describing the event rewards..."
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Reward Pool */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Total Reward Pool ($)</label>
                    <input
                      type="number"
                      value={rewardPool}
                      onChange={(e) => setRewardPool(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Reward Token */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Token Ticker</label>
                    <input
                      type="text"
                      value={rewardToken}
                      onChange={(e) => setRewardToken(e.target.value.toUpperCase())}
                      placeholder="USDT, SOL, AVR, BTC"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Accent Color */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Accent Brand Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Banner URL & Presets */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center justify-between">
                    <span>Banner Artwork Image URL</span>
                    <span className="text-[10px] text-gray-400 font-normal">Choose preset or enter custom URL</span>
                  </label>
                  <input
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 mb-2"
                  />
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {ARTWORK_PRESETS.map((p, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setBannerUrl(p)}
                        className={`w-16 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                          bannerUrl === p ? 'border-purple-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={p} alt="Preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overview Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Full Campaign Description / Overview</label>
                  <textarea
                    rows={4}
                    value={overview}
                    onChange={(e) => setOverview(e.target.value)}
                    placeholder="Provide full details about eligibility rules, scoring, and distribution process..."
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-medium focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Featured Toggle */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-900/60 border border-gray-800">
                  <input
                    type="checkbox"
                    id="featured-toggle"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-700 bg-gray-800"
                  />
                  <label htmlFor="featured-toggle" className="text-xs font-bold text-gray-200 cursor-pointer select-none">
                    Feature on top hero carousel (High Priority Promotion)
                  </label>
                </div>

                {/* Submit Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800/60">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('LIST'); resetForm(); }}
                    className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-black text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {activeTab === 'EDIT' ? 'Save Campaign Changes' : 'Publish New Campaign'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
