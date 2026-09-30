import React, { useState, useEffect } from 'react';
import { Save, Shield, Sliders, CheckCircle2, RefreshCw, AlertCircle, Target, Globe } from 'lucide-react';
import { aiTradingService } from '../../services/aiTradingService';
import { useAuth } from '../../contexts/AuthContext';
import { AiConfiguration, RiskRating } from '../../types/aiTrading';
import CoinLogo from '../CoinLogo';

interface AiSettingsViewProps {
  config: AiConfiguration | null;
  onSaveConfig: (config: AiConfiguration) => Promise<void>;
  isDark: boolean;
}

export default function AiSettingsView({ config, onSaveConfig, isDark }: AiSettingsViewProps) {
  const { user, addNotification } = useAuth();

  // Local state for editable risk settings
  const [maxPositionSize, setMaxPositionSize] = useState<number>(config?.profitRiskManagement?.maxPositionSize ?? 50);
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState<number>(config?.profitRiskManagement?.maxRiskPerTrade ?? 1);
  const [minConfidence, setMinConfidence] = useState<number>(config?.aiTradingRules?.minConfidence ?? 85);
  const [exposureLimit, setExposureLimit] = useState<number>(500); // Fixed or derived if needed
  const [maxSimultaneousPositions, setMaxSimultaneousPositions] = useState<number>(config?.aiTradingRules?.maxSimultaneousPositions ?? 3);
  const [positionSizingPreference, setPositionSizingPreference] = useState<'FIXED' | 'PERCENTAGE'>('PERCENTAGE');
  const [preferredMarkets, setPreferredMarkets] = useState<string[]>(() => {
    const raw = config?.aiTradingRules?.assetSelection;
    if (Array.isArray(raw) && raw.length === 22 && raw.includes('ARKK') && raw.includes('GLD')) {
      return ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'];
    }
    return (raw && raw.length > 0) ? raw : ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'];
  });
  const [riskProfile, setRiskProfile] = useState<RiskRating>('MEDIUM');
  const [tradingStyle, setTradingStyle] = useState<'SCALPING' | 'DAY_TRADING' | 'SWING_TRADING'>('DAY_TRADING');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [hasLoadedFromFirestore, setHasLoadedFromFirestore] = useState<boolean>(false);

  // Styling helpers
  const cardClasses = isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';

  // 1. Fetch saved settings directly from 'aiPreferences/{userId}' in Firestore on mount/load
  useEffect(() => {
    if (!user?.uid) return;

    let isMounted = true;
    async function fetchSavedSettings() {
      setLoading(true);
      try {
        const saved = await aiTradingService.getPreferences(user!.uid);
        if (saved && isMounted) {
          if (saved.maxPositionSize !== undefined) setMaxPositionSize(saved.maxPositionSize);
          if (saved.lossLimit !== undefined) setMaxRiskPerTrade(saved.lossLimit);
          else if (saved.maxRiskPerTrade !== undefined) setMaxRiskPerTrade(saved.maxRiskPerTrade);
          if (saved.minConfidence !== undefined) setMinConfidence(saved.minConfidence);
          else if (saved.minimumConfidenceScore !== undefined) setMinConfidence(saved.minimumConfidenceScore);
          if (saved.exposureLimit !== undefined) setExposureLimit(saved.exposureLimit);
          if (saved.maxSimultaneousPositions !== undefined) setMaxSimultaneousPositions(saved.maxSimultaneousPositions);
          if (saved.defaultPositionSizing !== undefined) setPositionSizingPreference(saved.defaultPositionSizing);
          if (saved.preferredMarkets && Array.isArray(saved.preferredMarkets) && saved.preferredMarkets.length > 0) {
            const isOld22 = saved.preferredMarkets.length === 22 && saved.preferredMarkets.includes('ARKK');
            setPreferredMarkets(isOld22 ? ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'] : saved.preferredMarkets);
          }
          if (saved.riskProfile) setRiskProfile(saved.riskProfile);
          if (saved.tradingStyle) setTradingStyle(saved.tradingStyle);
          setHasLoadedFromFirestore(true);
        }
      } catch (err) {
        console.warn('Error loading preferences from Firestore:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSavedSettings();
    return () => { isMounted = false; };
  }, [user?.uid]);

  // Sync with active config ONLY if preferences were NOT found in Firestore
  useEffect(() => {
    if (config && !loading && !hasLoadedFromFirestore) {
      if (config.profitRiskManagement?.maxPositionSize) {
        setMaxPositionSize(config.profitRiskManagement.maxPositionSize);
      }
      if (config.profitRiskManagement?.maxRiskPerTrade) {
        setMaxRiskPerTrade(config.profitRiskManagement.maxRiskPerTrade);
      }
      if (config.aiTradingRules?.minConfidence) {
        setMinConfidence(config.aiTradingRules.minConfidence);
      }
      // exposureLimit derived from sessionSetup or similar if needed
    }
  }, [config, loading, hasLoadedFromFirestore]);

  // 2. Save settings directly to Firestore 'aiPreferences/{userId}'
  const handleSave = async () => {
    if (!user?.uid) return;

    if (maxPositionSize <= 0) {
      alert('Max Position Size must be greater than 0.');
      return;
    }
    if (maxRiskPerTrade <= 0 || maxRiskPerTrade > 100) {
      alert('Max Risk Per Trade must be between 0.1% and 100%.');
      return;
    }
    if (minConfidence < 0 || minConfidence > 100) {
      alert('Minimum Confidence Score must be between 0% and 100%.');
      return;
    }

    setSaving(true);
    setSavedSuccess(false);

    const updatedPrefs = {
      maxPositionSize,
      maxRiskPerTrade,
      lossLimit: maxRiskPerTrade,
      minConfidence,
      minimumConfidenceScore: minConfidence,
      exposureLimit,
      maxSimultaneousPositions,
      defaultPositionSizing: positionSizingPreference,
      preferredMarkets,
      riskProfile,
      tradingStyle,
      updatedAt: new Date().toISOString()
    };

    try {
      // Direct Firestore write to 'aiPreferences/{userId}'
      await aiTradingService.savePreferences(user.uid, updatedPrefs);

      // Sync active configuration if present
      if (config) {
        const updatedConfig: AiConfiguration = {
          ...config,
          aiTradingRules: {
            ...config.aiTradingRules,
            assetSelection: preferredMarkets,
            minConfidence,
            maxSimultaneousPositions
          },
          profitRiskManagement: {
            ...config.profitRiskManagement,
            maxPositionSize,
            maxRiskPerTrade
          }
        };
        await onSaveConfig(updatedConfig);
      }

      setSavedSuccess(true);
      addNotification('trading', 'medium', 'Settings Saved', 'AI Risk controls updated directly in Firestore (aiPreferences).');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings to Firestore:', error);
      addNotification('trading', 'high', 'Save Error', 'Failed to save settings to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const toggleMarket = (market: string) => {
    setPreferredMarkets(prev => 
      prev.includes(market) ? prev.filter(m => m !== market) : [...prev, market]
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-black ${textPrimary} flex items-center gap-2`}>
            <Shield className="w-5 h-5 text-[#00D09C]" />
            <span>AI Risk Configuration & Preferences</span>
          </h2>
          <p className={`text-xs ${textSecondary} mt-1`}>
            Risk settings are stored in <code className="text-[#00D09C] font-mono">aiPreferences/{user?.uid || 'userId'}</code> on Firestore.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg ${
            savedSuccess 
              ? 'bg-emerald-500 text-white' 
              : 'bg-[#00D09C] hover:bg-[#00B585] text-black shadow-[#00D09C]/10'
          }`}
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : savedSuccess ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Saving to Firestore...' : savedSuccess ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      {loading ? (
        <div className={`p-8 rounded-2xl border ${cardClasses} flex items-center justify-center gap-3 text-xs ${textSecondary}`}>
          <RefreshCw className="w-4 h-4 animate-spin text-[#00D09C]" />
          <span>Fetching configuration from Firestore...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Core Risk Settings */}
          <div className={`rounded-2xl border ${cardClasses} p-6 space-y-5`}>
            <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
              <Shield className="w-4 h-4 text-[#00D09C]" /> Core Risk Parameters
            </h3>

            {/* Max Position Size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className={`text-xs font-bold ${textPrimary}`}>Max Position Size ($)</label>
                <span className="text-[10px] text-[#00D09C] font-mono font-bold">${maxPositionSize}</span>
              </div>
              <input
                type="number"
                min="1"
                value={maxPositionSize}
                onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                className={`w-full p-3 rounded-xl border text-xs font-bold outline-none focus:border-[#00D09C] ${inputBg}`}
                placeholder="e.g. 50"
              />
              <p className={`text-[10px] ${textSecondary}`}>Maximum capital allocated to any single trade.</p>
            </div>

            {/* Max Risk Per Trade */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className={`text-xs font-bold ${textPrimary}`}>Max Risk Per Trade (%)</label>
                <span className="text-[10px] text-rose-400 font-mono font-bold">{maxRiskPerTrade}%</span>
              </div>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={maxRiskPerTrade}
                onChange={(e) => setMaxRiskPerTrade(Number(e.target.value))}
                className={`w-full p-3 rounded-xl border text-xs font-bold outline-none focus:border-[#00D09C] ${inputBg}`}
                placeholder="e.g. 2.0"
              />
              <p className={`text-[10px] ${textSecondary}`}>Maximum loss allowed per trade before hard exit trigger.</p>
            </div>

            {/* Minimum Confidence Score */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className={`text-xs font-bold ${textPrimary}`}>Minimum Confidence Score (%)</label>
                <span className="text-[10px] text-[#00D09C] font-mono font-bold">{minConfidence}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00D09C]"
                />
                <input
                  type="number"
                  min="50"
                  max="99"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className={`w-16 p-2 rounded-xl border text-xs text-center font-bold outline-none focus:border-[#00D09C] ${inputBg}`}
                />
              </div>
              <p className={`text-[10px] ${textSecondary}`}>The AI will discard trade signals below this confidence threshold.</p>
            </div>

            {/* Exposure Limit */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className={`text-xs font-bold ${textPrimary}`}>Exposure Limit ($)</label>
                <span className="text-[10px] text-[#00D09C] font-mono font-bold">${exposureLimit}</span>
              </div>
              <input
                type="number"
                min="1"
                value={exposureLimit}
                onChange={(e) => setExposureLimit(Number(e.target.value))}
                className={`w-full p-3 rounded-xl border text-xs font-bold outline-none focus:border-[#00D09C] ${inputBg}`}
                placeholder="e.g. 500"
              />
              <p className={`text-[10px] ${textSecondary}`}>Cap on total combined active capital open at once.</p>
            </div>
          </div>

          {/* Strategy & Market Execution */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className={`rounded-2xl border ${cardClasses} p-6 space-y-5`}>
              <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
                <Sliders className="w-4 h-4 text-[#00D09C]" /> Execution Profile
              </h3>

              {/* Max Simultaneous Positions */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className={`text-xs font-bold ${textPrimary}`}>Max Simultaneous Positions</label>
                  <span className="text-[10px] text-[#00D09C] font-mono font-bold">{maxSimultaneousPositions}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxSimultaneousPositions}
                  onChange={(e) => setMaxSimultaneousPositions(Number(e.target.value))}
                  className={`w-full p-3 rounded-xl border text-xs font-bold outline-none focus:border-[#00D09C] ${inputBg}`}
                />
              </div>

              {/* Position Sizing Strategy */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className={`text-xs font-bold ${textPrimary}`}>Position Sizing Preference</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPositionSizingPreference('FIXED')}
                    className={`py-2.5 rounded-xl border text-[10px] font-black transition-all ${
                      positionSizingPreference === 'FIXED'
                        ? 'bg-[#00D09C]/10 border-[#00D09C] text-[#00D09C]'
                        : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    FIXED USD AMOUNT
                  </button>
                  <button
                    type="button"
                    onClick={() => setPositionSizingPreference('PERCENTAGE')}
                    className={`py-2.5 rounded-xl border text-[10px] font-black transition-all ${
                      positionSizingPreference === 'PERCENTAGE'
                        ? 'bg-[#00D09C]/10 border-[#00D09C] text-[#00D09C]'
                        : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    PORTFOLIO %
                  </button>
                </div>
              </div>

              {/* Risk Rating */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className={`text-xs font-bold ${textPrimary}`}>Risk Profile</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as RiskRating[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRiskProfile(r)}
                      className={`py-2 rounded-xl border text-[10px] font-black transition-all ${
                        riskProfile === r
                          ? r === 'HIGH' 
                            ? 'bg-rose-500/10 border-rose-500 text-rose-500' 
                            : r === 'MEDIUM' 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                            : 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                          : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Markets */}
            <div className={`rounded-2xl border ${cardClasses} p-6 space-y-4`}>
              <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} flex items-center gap-2`}>
                <Globe className="w-4 h-4 text-[#00D09C]" /> Target Assets
              </h3>
              <div className="flex flex-wrap gap-2">
                {['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'DOGE', 'SHIB', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX', 'SPY', 'GLD'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMarket(m)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2 ${
                      preferredMarkets.includes(m)
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
          </div>
        </div>
      )}
    </div>
  );
}
