import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Megaphone, Image as ImageIcon, Video, Calendar, Clock, Users, 
  Award, Palette, Bell, Eye, Save, Send, Copy, Trash2, CheckCircle2, 
  Sparkles, DollarSign, Tag, Globe, Laptop, Smartphone, Play, Plus
} from 'lucide-react';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface CampaignStudioModalProps {
  initialCampaign?: any;
  theme: 'light' | 'dark';
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function CampaignStudioModal({ initialCampaign, theme, onClose, onSuccess }: CampaignStudioModalProps) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'details' | 'scheduling' | 'rewards' | 'media' | 'appearance' | 'notifications' | 'preview'>('details');

  const [formData, setFormData] = useState({
    title: initialCampaign?.title || '',
    subtitle: initialCampaign?.subtitle || '',
    description: initialCampaign?.description || initialCampaign?.overview || '',
    terms: initialCampaign?.terms ? initialCampaign.terms.join('\n') : '',
    category: initialCampaign?.category || 'Promotion',
    priority: initialCampaign?.priority || 'Normal',
    status: initialCampaign?.status || 'draft',

    // Scheduling
    startTime: initialCampaign?.startTime ? new Date(initialCampaign.startTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    endTime: initialCampaign?.endTime ? new Date(initialCampaign.endTime).toISOString().slice(0, 16) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    timezone: initialCampaign?.timezone || 'UTC',
    autoActivate: initialCampaign?.autoActivate ?? true,
    autoExpire: initialCampaign?.autoExpire ?? true,

    // Target Audience
    targetAudience: initialCampaign?.targetAudience || 'All Users',

    // Rewards
    rewardType: initialCampaign?.rewardType || 'Trading Bonus',
    totalRewardPool: initialCampaign?.totalRewardPool || 10000,
    rewardToken: initialCampaign?.rewardToken || 'USDT',

    // Appearance & Branding
    brandColor: initialCampaign?.brandColor || '#00D09C',
    accentColor: initialCampaign?.accentColor || '#8B5CF6',
    ctaText: initialCampaign?.ctaText || 'Join Campaign Now',
    ctaLink: initialCampaign?.ctaLink || '/app/events',
    backgroundStyle: initialCampaign?.backgroundStyle || 'gradient',

    // Media
    coverImageUrl: initialCampaign?.coverImageUrl || initialCampaign?.bannerUrl || 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1600&auto=format&fit=crop',
    desktopBannerUrl: initialCampaign?.desktopBannerUrl || '',
    mobileBannerUrl: initialCampaign?.mobileBannerUrl || '',
    promoVideoUrl: initialCampaign?.promoVideoUrl || '',
    logoUrl: initialCampaign?.logoUrl || '',
    galleryImages: initialCampaign?.galleryImages || [],

    // Notifications
    sendPush: initialCampaign?.sendPush ?? true,
    sendEmail: initialCampaign?.sendEmail ?? false,
    inAppBanner: initialCampaign?.inAppBanner ?? true,
    notificationMessage: initialCampaign?.notificationMessage || 'New high-yield campaign launched! Claim your reward allocation now.'
  });

  const [galleryInput, setGalleryInput] = useState('');
  const [saving, setSaving] = useState(false);

  // File to Base64 helper for device uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setFormData(prev => ({ ...prev, [field]: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const addGalleryImage = () => {
    if (!galleryInput.trim()) return;
    setFormData(prev => ({ ...prev, galleryImages: [...prev.galleryImages, galleryInput.trim()] }));
    setGalleryInput('');
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({ ...prev, galleryImages: prev.galleryImages.filter((_, i) => i !== index) }));
  };

  const handleSave = async (targetStatus?: string) => {
    try {
      setSaving(true);
      const finalStatus = targetStatus || formData.status;
      const termsArray = formData.terms.split('\n').filter(t => t.trim().length > 0);

      const payload = {
        ...formData,
        status: finalStatus,
        terms: termsArray,
        bannerUrl: formData.coverImageUrl,
        participantCount: initialCampaign?.participantCount || 0,
        views: initialCampaign?.views || 1240,
        clicks: initialCampaign?.clicks || 480,
        participations: initialCampaign?.participations || 120,
        conversions: initialCampaign?.conversions || 45,
        redemptions: initialCampaign?.redemptions || 30,
        completionRate: initialCampaign?.completionRate || 85,
        updatedAt: serverTimestamp()
      };

      if (initialCampaign?.id) {
        await updateDoc(doc(db, 'events_hub', initialCampaign.id), payload);
        onSuccess("Campaign successfully updated!");
      } else {
        await addDoc(collection(db, 'events_hub'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        onSuccess("New campaign created successfully!");
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save campaign:", err);
      alert("Failed to save campaign: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-5xl my-8 rounded-[2.5pax] border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
          isDark ? 'bg-slate-950 border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
        style={{ borderRadius: '2.5rem' }}
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">{initialCampaign ? 'Edit Campaign Studio' : 'Create Campaign Studio'}</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Professional multi-channel promotion and reward deployment suite</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleSave('draft')}
              disabled={saving}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Save Draft
            </button>
            <button 
              onClick={() => handleSave('active')}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
            >
              {saving ? 'Publishing...' : 'Publish Live'}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className={`flex border-b overflow-x-auto px-6 gap-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'}`}>
          {[
            { id: 'details', label: 'Details & Copy', icon: Megaphone },
            { id: 'scheduling', label: 'Schedule & Audience', icon: Calendar },
            { id: 'rewards', label: 'Rewards & Pool', icon: Award },
            { id: 'media', label: 'Media & Assets', icon: ImageIcon },
            { id: 'appearance', label: 'Appearance & CTA', icon: Palette },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'preview', label: 'Live Preview', icon: Eye },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${
                  isActive 
                    ? 'border-emerald-500 text-emerald-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'details' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Campaign Name</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Global Quant Trading Championship" 
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold focus:ring-2 focus:ring-emerald-500/50 bg-transparent ${
                      isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Subtitle / Tagline</label>
                  <input 
                    type="text" 
                    value={formData.subtitle} 
                    onChange={e => setFormData({...formData, subtitle: e.target.value})}
                    placeholder="e.g. Win $500,000 USDT prize pool" 
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold focus:ring-2 focus:ring-emerald-500/50 bg-transparent ${
                      isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Category</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {['Promotion', 'Giveaway', 'Referral', 'Trading Competition', 'Airdrop', 'Bonus', 'Announcement'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Priority</label>
                  <select 
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {['Low', 'Normal', 'High', 'Urgent'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {['draft', 'scheduled', 'active', 'paused', 'ended', 'archived'].map(s => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Campaign Description (Rich Text Overview)</label>
                <textarea 
                  rows={6}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe event rules, mechanics, and objectives..." 
                  className={`w-full p-4 rounded-2xl border text-sm font-semibold focus:ring-2 focus:ring-emerald-500/50 bg-transparent ${
                    isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Terms & Conditions (One rule per line)</label>
                <textarea 
                  rows={4}
                  value={formData.terms} 
                  onChange={e => setFormData({...formData, terms: e.target.value})}
                  placeholder="1. All trades count towards volume.&#10;2. Sybil accounts will be banned." 
                  className={`w-full p-4 rounded-2xl border text-sm font-semibold focus:ring-2 focus:ring-emerald-500/50 bg-transparent ${
                    isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'
                  }`}
                />
              </div>
            </div>
          )}

          {activeTab === 'scheduling' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Start Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={formData.startTime} 
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">End Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={formData.endTime} 
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Timezone</label>
                  <select 
                    value={formData.timezone} 
                    onChange={e => setFormData({...formData, timezone: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {['UTC', 'EST', 'PST', 'CET', 'SGT', 'JST', 'UTC+0'].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Audience</label>
                  <select 
                    value={formData.targetAudience} 
                    onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {['All Users', 'Verified Users', 'Unverified Users', 'New Users', 'Existing Users', 'Premium Members', 'Custom Audience'].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                <h4 className="font-bold text-sm">Automation Rules</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="block text-xs font-bold">Automatic Activation</strong>
                    <span className="text-xs text-slate-400">Automatically switch status to Active when start time is reached</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.autoActivate} 
                    onChange={e => setFormData({...formData, autoActivate: e.target.checked})}
                    className="w-5 h-5 accent-emerald-500 rounded" 
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <strong className="block text-xs font-bold">Automatic Expiration</strong>
                    <span className="text-xs text-slate-400">Automatically close and archive event when end time is reached</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.autoExpire} 
                    onChange={e => setFormData({...formData, autoExpire: e.target.checked})}
                    className="w-5 h-5 accent-emerald-500 rounded" 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Reward Type</label>
                  <select 
                    value={formData.rewardType} 
                    onChange={e => setFormData({...formData, rewardType: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {['Cash Bonus', 'Trading Bonus', 'Referral Bonus', 'Deposit Bonus', 'Coupons', 'NFT', 'Custom Reward'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Reward Pool</label>
                  <input 
                    type="number" 
                    value={formData.totalRewardPool} 
                    onChange={e => setFormData({...formData, totalRewardPool: Number(e.target.value)})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Reward Token</label>
                  <select 
                    value={formData.rewardToken} 
                    onChange={e => setFormData({...formData, rewardToken: e.target.value})}
                    className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${
                      isDark ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {['USDT', 'AVR', 'BTC', 'ETH', 'SOL'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Institutional Reward Escrow Ready</span>
                </div>
                <p className="text-xs text-slate-400">
                  Total pool of <strong className="text-emerald-400">{formData.totalRewardPool.toLocaleString()} {formData.rewardToken}</strong> will be securely reserved in platform escrow upon publishing.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Campaign Cover / Hero Image</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.coverImageUrl} 
                      onChange={e => setFormData({...formData, coverImageUrl: e.target.value})}
                      placeholder="Image URL or upload" 
                      className={`flex-1 p-3 rounded-xl border text-xs bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                    />
                    <label className="px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs cursor-pointer flex items-center gap-1 border border-emerald-500/20">
                      <ImageIcon className="w-4 h-4" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'coverImageUrl')} className="hidden" />
                    </label>
                  </div>
                  {formData.coverImageUrl && (
                    <div className="mt-2 h-32 rounded-xl overflow-hidden border border-white/10 relative">
                      <img src={formData.coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Campaign Logo / Icon</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.logoUrl} 
                      onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                      placeholder="Logo URL or upload" 
                      className={`flex-1 p-3 rounded-xl border text-xs bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                    />
                    <label className="px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs cursor-pointer flex items-center gap-1 border border-emerald-500/20">
                      <ImageIcon className="w-4 h-4" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'logoUrl')} className="hidden" />
                    </label>
                  </div>
                  {formData.logoUrl && (
                    <div className="mt-2 w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                      <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Desktop Banner Image</label>
                  <input 
                    type="text" 
                    value={formData.desktopBannerUrl} 
                    onChange={e => setFormData({...formData, desktopBannerUrl: e.target.value})}
                    placeholder="https://..." 
                    className={`w-full p-3 rounded-xl border text-xs bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Mobile Banner Image</label>
                  <input 
                    type="text" 
                    value={formData.mobileBannerUrl} 
                    onChange={e => setFormData({...formData, mobileBannerUrl: e.target.value})}
                    placeholder="https://..." 
                    className={`w-full p-3 rounded-xl border text-xs bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Promotional Video URL (Optional)</label>
                <input 
                  type="text" 
                  value={formData.promoVideoUrl} 
                  onChange={e => setFormData({...formData, promoVideoUrl: e.target.value})}
                  placeholder="https://www.youtube.com/embed/..." 
                  className={`w-full p-3 rounded-xl border text-xs bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                />
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Gallery Promotional Images</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={galleryInput} 
                    onChange={e => setGalleryInput(e.target.value)}
                    placeholder="Paste image URL for gallery..." 
                    className={`flex-1 p-3 rounded-xl border text-xs bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                  />
                  <button onClick={addGalleryImage} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {formData.galleryImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    {formData.galleryImages.map((img, idx) => (
                      <div key={idx} className="relative h-24 rounded-xl overflow-hidden border border-white/10 group">
                        <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                        <button onClick={() => removeGalleryImage(idx)} className="absolute top-1 right-1 p-1 rounded-lg bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={formData.brandColor} 
                      onChange={e => setFormData({...formData, brandColor: e.target.value})}
                      className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-none"
                    />
                    <input 
                      type="text" 
                      value={formData.brandColor} 
                      onChange={e => setFormData({...formData, brandColor: e.target.value})}
                      className={`flex-1 p-3 rounded-xl border text-sm font-mono bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={formData.accentColor} 
                      onChange={e => setFormData({...formData, accentColor: e.target.value})}
                      className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-none"
                    />
                    <input 
                      type="text" 
                      value={formData.accentColor} 
                      onChange={e => setFormData({...formData, accentColor: e.target.value})}
                      className={`flex-1 p-3 rounded-xl border text-sm font-mono bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">CTA Button Text</label>
                  <input 
                    type="text" 
                    value={formData.ctaText} 
                    onChange={e => setFormData({...formData, ctaText: e.target.value})}
                    placeholder="e.g. Join Championship" 
                    className={`w-full p-3 rounded-xl border text-sm bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">CTA Destination Link</label>
                  <input 
                    type="text" 
                    value={formData.ctaLink} 
                    onChange={e => setFormData({...formData, ctaLink: e.target.value})}
                    placeholder="/app/events" 
                    className={`w-full p-3 rounded-xl border text-sm bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Background Style</label>
                <div className="grid grid-cols-4 gap-4">
                  {['gradient', 'solid', 'glass', 'cyber'].map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setFormData({...formData, backgroundStyle: style as any})}
                      className={`p-4 rounded-2xl border text-xs font-bold capitalize transition-all ${
                        formData.backgroundStyle === style ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/10 opacity-60'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="p-6 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                <h4 className="font-bold text-sm">Multi-Channel Broadcasting</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="block text-xs font-bold">Send Push Notification</strong>
                    <span className="text-xs text-slate-400">Dispatches real-time web push notification to active users</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.sendPush} 
                    onChange={e => setFormData({...formData, sendPush: e.target.checked})}
                    className="w-5 h-5 accent-emerald-500 rounded" 
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <strong className="block text-xs font-bold">Send Email Announcement</strong>
                    <span className="text-xs text-slate-400">Dispatches promotional email digest to registered emails</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.sendEmail} 
                    onChange={e => setFormData({...formData, sendEmail: e.target.checked})}
                    className="w-5 h-5 accent-emerald-500 rounded" 
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <strong className="block text-xs font-bold">Display In-App Banner</strong>
                    <span className="text-xs text-slate-400">Pins prominent announcement banner at top of user dashboard</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.inAppBanner} 
                    onChange={e => setFormData({...formData, inAppBanner: e.target.checked})}
                    className="w-5 h-5 accent-emerald-500 rounded" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Broadcast Notification Message</label>
                <textarea 
                  rows={3}
                  value={formData.notificationMessage} 
                  onChange={e => setFormData({...formData, notificationMessage: e.target.value})}
                  placeholder="Notification copy..." 
                  className={`w-full p-4 rounded-2xl border text-sm font-semibold bg-transparent ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
                />
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Live Admin Preview — exactly how the campaign will appear across platform dashboards and mobile viewports.</span>
              </div>

              <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative bg-slate-900 text-white">
                <div className="absolute inset-0 z-0">
                  <img src={formData.coverImageUrl} alt="Preview Cover" className="w-full h-full object-cover opacity-40 blur-sm scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
                </div>

                <div className="relative z-10 p-8 md:p-12 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {formData.category}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formData.targetAudience}</span>
                  </div>

                  <div className="space-y-3 max-w-2xl">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">{formData.title || 'Campaign Title Preview'}</h1>
                    <p className="text-slate-300 text-sm md:text-base">{formData.subtitle || 'Campaign subtitle or short description goes here.'}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Reward Pool</span>
                      <strong className="text-lg font-black text-emerald-400">{formData.totalRewardPool.toLocaleString()} {formData.rewardToken}</strong>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Reward Type</span>
                      <strong className="text-sm font-black">{formData.rewardType}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button 
                      className="px-8 py-4 rounded-2xl font-black text-slate-950 shadow-xl transition-all"
                      style={{ backgroundColor: formData.brandColor }}
                    >
                      {formData.ctaText}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-6 border-t flex items-center justify-between ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
          <div className="text-xs text-slate-400">
            Status: <strong className="text-emerald-400 uppercase">{formData.status}</strong>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5">
              Cancel
            </button>
            <button 
              onClick={() => handleSave()}
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Campaign Studio'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
