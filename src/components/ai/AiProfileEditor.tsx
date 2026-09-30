import React, { useState } from 'react';
import { Settings, Save, Shield, Target, Globe, Sliders, Bell, RefreshCw } from 'lucide-react';
import { AiPreferenceProfile, RiskRating } from '../../types/aiTrading';
import { aiTradingService } from '../../services/aiTradingService';
import { useAuth } from '../../contexts/AuthContext';
import CoinLogo from '../CoinLogo';

interface AiProfileEditorProps {
  initialPrefs: AiPreferenceProfile | null;
  onSave: (prefs: AiPreferenceProfile) => void;
  isDark: boolean;
}

const defaultPrefs: AiPreferenceProfile = {
  preferredMarkets: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'],
  assetClasses: ['CRYPTO'],
  riskProfile: 'MEDIUM',
  tradingStyle: 'DAY_TRADING',
  maxSimultaneousRecommendations: 5,
  defaultPositionSizing: 'PERCENTAGE',
  defaultPositionSize: 10,
  marketScanFrequency: 5,
  notificationPreferences: {
    newRecommendations: true,
    tradeExecutions: true,
    marketAlerts: false
  }
};

export default function AiProfileEditor({ initialPrefs, onSave, isDark }: AiProfileEditorProps) {
  const { user, addNotification } = useAuth();
  const [prefs, setPrefs] = useState<AiPreferenceProfile>(initialPrefs || defaultPrefs);
  const [saving, setSaving] = useState(false);

  const cardClasses = isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await aiTradingService.savePreferences(user.uid, prefs);
      onSave(prefs);
      addNotification('trading', 'medium', 'Profile Updated', 'AI Configuration has been synchronized.');
    } catch (error) {
      addNotification('trading', 'high', 'Error', 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const toggleMarket = (market: string) => {
    setPrefs(prev => ({
      ...prev,
      preferredMarkets: prev.preferredMarkets.includes(market)
        ? prev.preferredMarkets.filter(m => m !== market)
        : [...prev.preferredMarkets, market]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-black ${textPrimary}`}>AI Intelligence Profile</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-[#00D09C] hover:bg-[#00B585] text-black rounded-xl text-xs font-black transition-all shadow-lg shadow-[#00D09C]/10"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Synchronizing...' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Market Scope */}
        <div className={`rounded-2xl border ${cardClasses} p-6 space-y-6`}>
          <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
            <Globe className="w-4 h-4" /> Market Analysis Scope
          </h3>
          
          <div className="space-y-4">
            <p className={`text-xs font-bold ${textSecondary}`}>Preferred Markets</p>
            <div className="flex flex-wrap gap-2">
              {['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'DOGE', 'SHIB', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX', 'SPY', 'GLD'].map(m => (
                <button
                  key={m}
                  onClick={() => toggleMarket(m)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2 ${
                    prefs.preferredMarkets.includes(m)
                      ? 'bg-[#00D09C]/10 border-[#00D09C] text-[#00D09C]'
                      : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <CoinLogo symbol={m} size={20} />
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className={`text-xs font-bold ${textSecondary}`}>Trading Style</p>
            <select 
              value={prefs.tradingStyle}
              onChange={(e) => setPrefs(prev => ({ ...prev, tradingStyle: e.target.value as any }))}
              className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
            >
              <option value="SCALPING">Scalping (Ultra-Fast)</option>
              <option value="DAY_TRADING">Day Trading (Intraday)</option>
              <option value="SWING_TRADING">Swing Trading (Multi-Day)</option>
            </select>
          </div>
        </div>

        {/* Risk Profile */}
        <div className={`rounded-2xl border ${cardClasses} p-6 space-y-6`}>
          <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
            <Shield className="w-4 h-4" /> Neural Risk Constraints
          </h3>

          <div className="space-y-4">
            <p className={`text-xs font-bold ${textSecondary}`}>Risk Aggression</p>
            <div className="grid grid-cols-3 gap-3">
              {(['LOW', 'MEDIUM', 'HIGH'] as RiskRating[]).map(r => (
                <button
                  key={r}
                  onClick={() => setPrefs(prev => ({ ...prev, riskProfile: r }))}
                  className={`py-3 rounded-xl border transition-all text-[10px] font-black ${
                    prefs.riskProfile === r
                      ? 'bg-rose-500/10 border-rose-500 text-rose-500'
                      : 'bg-white/5 border-white/5 text-slate-500'
                  }`}
                >
                  {r} RISK
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className={`text-xs font-bold ${textSecondary}`}>Position Sizing Strategy</p>
            <div className="grid grid-cols-2 gap-3">
               <button
                  onClick={() => setPrefs(prev => ({ ...prev, defaultPositionSizing: 'FIXED' }))}
                  className={`py-3 rounded-xl border transition-all text-[10px] font-black ${
                    prefs.defaultPositionSizing === 'FIXED'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                      : 'bg-white/5 border-white/5 text-slate-500'
                  }`}
                >
                  FIXED AMOUNT
                </button>
                <button
                  onClick={() => setPrefs(prev => ({ ...prev, defaultPositionSizing: 'PERCENTAGE' }))}
                  className={`py-3 rounded-xl border transition-all text-[10px] font-black ${
                    prefs.defaultPositionSizing === 'PERCENTAGE'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                      : 'bg-white/5 border-white/5 text-slate-500'
                  }`}
                >
                  PORTFOLIO %
                </button>
            </div>
          </div>
        </div>

        {/* System Behavior */}
        <div className={`rounded-2xl border ${cardClasses} p-6 space-y-6`}>
          <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
            <Sliders className="w-4 h-4" /> System Parameters
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className={`text-xs font-bold ${textSecondary}`}>Market Scan Frequency</label>
              <span className={`text-xs font-mono font-bold text-[#00D09C]`}>{prefs.marketScanFrequency}m</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="60" 
              value={prefs.marketScanFrequency}
              onChange={(e) => setPrefs(prev => ({ ...prev, marketScanFrequency: Number(e.target.value) }))}
              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00D09C]"
            />
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center">
              <label className={`text-xs font-bold ${textSecondary}`}>Max Active Positions</label>
              <span className={`text-xs font-mono font-bold text-[#00D09C]`}>{prefs.maxSimultaneousRecommendations}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={prefs.maxSimultaneousRecommendations}
              onChange={(e) => setPrefs(prev => ({ ...prev, maxSimultaneousRecommendations: Number(e.target.value) }))}
              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00D09C]"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className={`rounded-2xl border ${cardClasses} p-6 space-y-6`}>
          <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
            <Bell className="w-4 h-4" /> Communication
          </h3>

          <div className="space-y-4">
            <NotificationToggle 
              label="New Recommendations" 
              active={prefs.notificationPreferences.newRecommendations} 
              onToggle={(val) => setPrefs(prev => ({ ...prev, notificationPreferences: { ...prev.notificationPreferences, newRecommendations: val } }))}
              isDark={isDark}
            />
            <NotificationToggle 
              label="Order Executions" 
              active={prefs.notificationPreferences.tradeExecutions} 
              onToggle={(val) => setPrefs(prev => ({ ...prev, notificationPreferences: { ...prev.notificationPreferences, tradeExecutions: val } }))}
              isDark={isDark}
            />
            <NotificationToggle 
              label="Volatility Alerts" 
              active={prefs.notificationPreferences.marketAlerts} 
              onToggle={(val) => setPrefs(prev => ({ ...prev, notificationPreferences: { ...prev.notificationPreferences, marketAlerts: val } }))}
              isDark={isDark}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({ label, active, onToggle, isDark }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
      <button 
        onClick={() => onToggle(!active)}
        className={`w-10 h-5 rounded-full relative transition-all ${active ? 'bg-[#00D09C]' : 'bg-white/10'}`}
      >
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );
}
