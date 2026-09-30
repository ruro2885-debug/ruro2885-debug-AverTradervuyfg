import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  Globe, 
  Calendar, 
  ShieldAlert, 
  Download, 
  Upload, 
  HelpCircle, 
  Play, 
  Settings,
  Brain,
  Layers,
  ArrowRight,
  Info,
  Archive,
  RefreshCw,
  Clock,
  Coins,
  Sun,
  Moon,
  Coffee,
  Search,
  Minus,
  Check,
  X as CloseIcon
} from 'lucide-react';
import { AiConfiguration, RiskRating, TradingSchedule, MarketCategory } from '../../types/aiTrading';
import { Timestamp } from 'firebase/firestore';
import { aiTradingService } from '../../services/aiTradingService';
import CoinLogo from '../CoinLogo';
import { AnimatePresence, motion } from 'motion/react';

import { ASSET_UNIVERSE, INITIAL_DEFAULT_ASSET_COLLECTION, UniverseAsset } from '../../data/assetUniverse';

interface AiConfigurationsViewProps {
  configs: AiConfiguration[];
  activeConfigId: string | undefined;
  onSave: (config: AiConfiguration) => Promise<void>;
  onDelete: (configId: string) => Promise<void>;
  onDuplicate: (configId: string) => Promise<void>;
  onActivate: (configId: string) => Promise<void>;
  onStartSession: (configId: string, markets: string[]) => Promise<void>;
  isDark: boolean;
  userId: string;
}

const defaultNewConfig = (userId: string): AiConfiguration => ({
  id: `cfg_${Date.now()}`,
  ownerId: userId,
  name: 'New AI Configuration',
  createdAt: Timestamp.now(),
  lastModified: Timestamp.now(),
  status: 'INACTIVE',
  sessionSetup: {
    amountToAllocate: 1000,
    fundingSource: 'WALLET',
    sessionDuration: 24
  },
  profitRiskManagement: {
    sessionTakeProfit: 5,
    sessionStopLoss: 2,
    maxRiskPerTrade: 1,
    maxPositionSize: 500
  },
  aiTradingRules: {
    minConfidence: 85,
    maxSimultaneousPositions: 3,
    assetSelection: [...INITIAL_DEFAULT_ASSET_COLLECTION],
    tradingStrategy: 'NEURAL_MOMENTUM'
  },
  configurationDetails: {
    description: 'A newly created AI trading configuration.',
    category: 'Scalping',
    version: '1.0.0'
  },
  analyticsAndNotes: {
    riskScore: 50,
    strategyNotes: '',
    performanceStats: {
      winRate: 0,
      totalReturn: 0,
      drawdown: 0
    },
    executionHistory: []
  },
  notificationPreferences: {
    newRecommendations: true,
    tradeExecutions: true,
    marketAlerts: false
  },
  schedule: {
    enabled: false, // Default to 24/7 Mode (Scheduler Disabled)
    operatingWindows: [],
    coolingBreaks: [],
    marketCalendar: {
      'Stocks': { excludeHolidays: true },
      'Forex': { excludeHolidays: true },
      'Crypto': { excludeHolidays: false },
      'Indices': { excludeHolidays: true },
      'Commodities': { excludeHolidays: true }
    },
    monitorOutsideWindow: true
  }
});

export default function AiConfigurationsView({
  configs,
  activeConfigId,
  onSave,
  onDelete,
  onDuplicate,
  onActivate,
  onStartSession,
  isDark,
  userId
}: AiConfigurationsViewProps) {
  const [editingConfig, setEditingConfig] = useState<AiConfiguration | null>(null);
  const [activeStep, setActiveStep] = useState<'setup' | 'risk' | 'rules' | 'details' | 'analytics' | 'schedule'>('setup');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [showAssetSearch, setShowAssetSearch] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'CRYPTO' | 'STOCKS' | 'FOREX' | 'INDICES' | 'ETFs' | 'COMMODITIES'>('ALL');

  const cardClasses = isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const updateEditingSchedule = (updater: (sched: TradingSchedule) => TradingSchedule) => {
    if (!editingConfig) return;
    const currentSchedule = editingConfig.schedule || {
      enabled: false,
      operatingWindows: [],
      coolingBreaks: [],
      marketCalendar: {
        'Stocks': { excludeHolidays: true },
        'Forex': { excludeHolidays: true },
        'Crypto': { excludeHolidays: false },
        'Indices': { excludeHolidays: true },
        'Commodities': { excludeHolidays: true }
      },
      monitorOutsideWindow: true
    };
    const nextSched = updater(currentSchedule);
    setEditingConfig({
      ...editingConfig,
      schedule: nextSched
    });
  };

  const handleCreateNew = () => {
    const fresh = defaultNewConfig(userId || 'guest_user');
    setEditingConfig(fresh);
    setIsCreating(true);
    setActiveStep('setup');
    setIsSaved(false);
  };

  const handleEdit = (cfg: AiConfiguration) => {
    // Migration for old configs
    const rawAssets = cfg.aiTradingRules?.assetSelection;
    const isOld22List = Array.isArray(rawAssets) && rawAssets.length === 22 && rawAssets.includes('ARKK') && rawAssets.includes('GLD');
    const migratedAssets = (!rawAssets || !Array.isArray(rawAssets) || isOld22List)
      ? [...INITIAL_DEFAULT_ASSET_COLLECTION]
      : rawAssets;

    const migrated: AiConfiguration = {
      ...cfg,
      sessionSetup: {
        amountToAllocate: 1000,
        fundingSource: 'WALLET',
        sessionDuration: 24,
        ...(cfg.sessionSetup || {})
      },
      profitRiskManagement: {
        sessionTakeProfit: 5,
        sessionStopLoss: 2,
        maxRiskPerTrade: 1,
        maxPositionSize: 500,
        ...(cfg.profitRiskManagement || {})
      },
      aiTradingRules: {
        minConfidence: 85,
        maxSimultaneousPositions: 3,
        tradingStrategy: 'NEURAL_MOMENTUM',
        ...(cfg.aiTradingRules || {}),
        assetSelection: migratedAssets,
      },
      configurationDetails: cfg.configurationDetails || {
        description: '',
        category: 'Scalping',
        version: '1.0.0'
      },
      analyticsAndNotes: cfg.analyticsAndNotes || {
        riskScore: 50,
        strategyNotes: '',
        performanceStats: {
          winRate: 0,
          totalReturn: 0,
          drawdown: 0
        },
        executionHistory: []
      }
    };
    setEditingConfig(migrated);
    setIsCreating(false);
    setActiveStep('setup');
    setIsSaved(false);
  };

  const handleFieldChange = (section: keyof AiConfiguration | null, field: string, value: any) => {
    if (!editingConfig) return;
    setEditingConfig(prev => {
      if (!prev) return null;
      if (section === null) {
        return { ...prev, [field]: value };
      } else {
        const sectData = (prev[section] || {}) as any;
        return {
          ...prev,
          [section]: {
            ...sectData,
            [field]: value
          }
        };
      }
    });
  };

  const updateAssetSelection = (nextAssets: string[]) => {
    if (!editingConfig) return;
    const updated: AiConfiguration = {
      ...editingConfig,
      aiTradingRules: {
        ...editingConfig.aiTradingRules,
        assetSelection: nextAssets
      }
    };
    setEditingConfig(updated);
    onSave(updated).catch(err => {
      console.warn("Auto-syncing asset collection:", err);
    });
  };

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handleSaveConfig = async () => {
    if (!editingConfig || isSaving) return;
    
    // Simple validation
    if (editingConfig.sessionSetup.amountToAllocate <= 0) {
      alert('Please enter a valid amount to allocate.');
      return;
    }

    setIsSaving(true);

    const configToSave = { 
      ...editingConfig, 
      lastModified: new Date().toISOString() as any 
    };

    try {
      // 1. Save preferences locally and safely attempt remote sync if real user
      if (userId && !userId.startsWith('local-') && userId !== 'guest_user') {
        try {
          await Promise.race([
            aiTradingService.savePreferences(userId, {
              maxPositionSize: configToSave.profitRiskManagement?.maxPositionSize ?? 500,
              maxRiskPerTrade: configToSave.profitRiskManagement?.maxRiskPerTrade ?? 1,
              lossLimit: configToSave.profitRiskManagement?.sessionStopLoss ?? 2,
              minConfidence: configToSave.aiTradingRules?.minConfidence ?? 85,
              maxSimultaneousPositions: configToSave.aiTradingRules?.maxSimultaneousPositions ?? 3,
              preferredMarkets: configToSave.aiTradingRules?.assetSelection || ['BTC', 'ETH', 'SOL']
            }),
            new Promise((res) => setTimeout(res, 1500))
          ]);
        } catch (prefErr) {
          console.warn("Failed to save aiPreferences in Firestore:", prefErr);
        }
      }

      // 2. Call parent onSave which updates TradingEngineContext state & localStorage
      await onSave(configToSave);

      const savedName = configToSave.name;
      setIsSaved(true);
      setEditingConfig(null);
      setSaveSuccessMessage(`Configuration "${savedName}" saved successfully and ready to execute.`);
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("Error saving configuration:", err);
      setIsSaved(true);
      setEditingConfig(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportConfig = async () => {
    try {
      if (!importText.trim()) throw new Error('Empty input');
      const parsed = JSON.parse(importText);
      
      // Strict validation for core fields
      if (!parsed.name || !parsed.sessionSetup || !parsed.profitRiskManagement || !parsed.aiTradingRules) {
        throw new Error('Incomplete configuration structure. Missing critical strategy, setup or risk parameters.');
      }

      const imported: AiConfiguration = {
        ...parsed,
        id: `cfg_import_${Date.now()}`,
        ownerId: userId || 'unknown',
        status: 'INACTIVE',
        createdAt: Timestamp.now(),
        lastModified: Timestamp.now(),
        // Ensure new sections exist even if importing from a slightly older version of the new interface
        configurationDetails: parsed.configurationDetails || {
          description: '',
          category: 'Scalping',
          version: '1.0.0'
        },
        analyticsAndNotes: parsed.analyticsAndNotes || {
          riskScore: 50,
          strategyNotes: '',
          performanceStats: {
            winRate: 0,
            totalReturn: 0,
            drawdown: 0
          },
          executionHistory: []
        },
        notificationPreferences: parsed.notificationPreferences || {
          newRecommendations: true,
          tradeExecutions: true,
          marketAlerts: false
        }
      };
      
      await onSave(imported);
      setShowImportModal(false);
      setImportText('');
      alert('Configuration imported successfully with all sections synchronized.');
    } catch (e: any) {
      alert(`Import Failed: ${e.message || 'Invalid configuration structure'}`);
    }
  };

  const handleExport = (config: AiConfiguration) => {
    try {
      // Create a clean copy of the configuration for export
      const exportData = {
        ...config,
        exportedAt: new Date().toISOString(),
        client: "Aver Project AI Engine"
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Copy to clipboard
      navigator.clipboard.writeText(jsonString).catch(err => {
        console.error('Clipboard failed:', err);
      });

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aver_config_${config.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`"${config.name}" data file has been downloaded and copied to clipboard.`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export configuration.");
    }
  };

  const filteredConfigs = configs.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {!editingConfig ? (
        <>
          {/* Header Dashboard & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className={`text-xl font-black flex items-center gap-2 ${textPrimary}`}>
                <Sliders className="w-5 h-5 text-[#00D09C]" /> Neural Configurations Manager
              </h2>
              <p className={`text-xs ${textSecondary} mt-1`}>
                Design, clone, duplicate, and execute deep-learning configurations across spot and margin indexes.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <button
                onClick={() => setShowImportModal(true)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-black transition-all ${isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <Upload className="w-3.5 h-3.5" /> Import
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00D09C] hover:bg-[#00B585] text-black rounded-xl text-xs font-black transition-all shadow-lg shadow-[#00D09C]/10 ml-auto"
              >
                <Plus className="w-4 h-4" /> Create Configuration
              </button>
            </div>
          </div>

          {saveSuccessMessage && (
            <div className="p-4 rounded-xl bg-[#00D09C]/10 border border-[#00D09C]/30 flex items-center justify-between text-[#00D09C] text-xs font-bold animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C]" />
                <span>{saveSuccessMessage}</span>
              </div>
              <button onClick={() => setSaveSuccessMessage(null)} className="text-slate-400 hover:text-white text-base">
                &times;
              </button>
            </div>
          )}

          <div className="flex items-center gap-4">
            <input 
              type="text"
              placeholder="Search active configurations, risk strategies, or schedules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 text-xs px-4 py-3 bg-black/10 dark:bg-white/5 border border-white/5 rounded-xl outline-none ${textPrimary} focus:border-[#00D09C]`}
            />
          </div>

          {/* Config Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredConfigs.map((cfg, idx) => {
              const isActive = cfg.id === activeConfigId;
              return (
                <div 
                  key={`cfg-${cfg.id || idx}-${idx}`} 
                  className={`rounded-2xl border p-6 transition-all relative overflow-hidden flex flex-col justify-between ${cardClasses} ${isActive ? 'ring-2 ring-[#00D09C]' : ''}`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border ${isActive ? 'border-[#00D09C] text-[#00D09C]' : 'border-white/10 text-slate-400'}`}>
                          <Brain className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className={`text-sm font-black ${textPrimary}`}>{cfg.name}</h3>
                          <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-[#00D09C]' : 'text-slate-500'}`}>
                            {isActive ? 'CURRENTLY ACTIVE' : 'STANDBY MODE'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                          cfg?.aiTradingRules?.tradingStrategy === 'NEURAL_MOMENTUM' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {(cfg?.aiTradingRules?.tradingStrategy || 'QUANT').replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6 border-t border-b border-white/5 py-4">
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${textSecondary}`}>Allocated</p>
                        <p className={`text-xs font-bold ${textPrimary} mt-1`}>
                          ${(cfg?.sessionSetup?.amountToAllocate ?? 1000).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${textSecondary}`}>Risk Limit</p>
                        <p className={`text-xs font-bold ${textPrimary} mt-1`}>
                          {cfg?.profitRiskManagement?.sessionStopLoss ?? 2}% SL
                        </p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${textSecondary}`}>Confidence</p>
                        <p className={`text-xs font-bold text-[#00D09C] mt-1`}>
                          &gt; {cfg?.aiTradingRules?.minConfidence ?? 85}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEdit(cfg)}
                        className={`px-3 py-1.5 border rounded-lg text-[10px] font-black transition-all ${isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                      >
                        Configure
                      </button>
                      <button 
                        onClick={() => onDuplicate(cfg.id)}
                        className={`p-1.5 border rounded-lg text-slate-400 hover:text-white transition-colors ${isDark ? 'border-white/10' : 'border-slate-200'}`}
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleExport(cfg)}
                        className={`p-1.5 border rounded-lg text-slate-400 hover:text-white transition-colors ${isDark ? 'border-white/10' : 'border-slate-200'}`}
                        title="Export Configuration"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {cfg.id !== activeConfigId && (
                        <button
                          onClick={() => onDelete(cfg.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Configuration"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isActive ? (
                        <button
                          onClick={() => onActivate(cfg.id)}
                          className="px-3 py-1.5 bg-[#00D09C] hover:bg-[#00B585] text-black rounded-xl text-[10px] font-black transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-[#00D09C] px-3 py-1.5 bg-[#00D09C]/10 rounded-lg">
                          Active Now
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Configuration Editor UI (Multi-Step Tabs) */
        <div className={`rounded-3xl border ${cardClasses} overflow-hidden`}>
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#00D09C]/10 border border-[#00D09C]/30 rounded-xl">
                <Sliders className="w-5 h-5 text-[#00D09C]" />
              </div>
              <div>
                <h3 className={`text-lg font-black ${textPrimary}`}>
                  {isCreating ? 'Engine Builder' : 'Neural Editor'} &mdash; {editingConfig.name}
                </h3>
                <p className={`text-xs ${textSecondary} mt-0.5`}>
                  Modify analytical rules, risk-protection margins, and execution schedules.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingConfig(null)}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                {isSaved ? 'Back to Configurations' : 'Cancel Changes'}
              </button>
              {isSaved ? (
                <button
                  type="button"
                  onClick={() => onStartSession(editingConfig.id, editingConfig.aiTradingRules?.assetSelection || ['BTC', 'ETH', 'SOL'])}
                  className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00B585] text-black rounded-xl text-xs font-black transition-all shadow-lg shadow-[#00D09C]/20 flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" /> Launch Session
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveConfig}
                  className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00B585] text-black rounded-xl text-xs font-black transition-all shadow-lg shadow-[#00D09C]/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Save Configuration
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/5 min-h-[500px]">
            {/* Steps Left Panel */}
            <div className="p-4 space-y-1 bg-black/5 lg:col-span-1">
              <StepButton active={activeStep === 'setup'} onClick={() => setActiveStep('setup')} label="1. Session Setup" icon={<Layers className="w-4 h-4" />} />
              <StepButton active={activeStep === 'risk'} onClick={() => setActiveStep('risk')} label="2. Profit & Risk Management" icon={<ShieldAlert className="w-4 h-4" />} />
              <StepButton active={activeStep === 'rules'} onClick={() => setActiveStep('rules')} label="3. AI Trading Rules" icon={<Brain className="w-4 h-4" />} />
              <StepButton active={activeStep === 'details'} onClick={() => setActiveStep('details')} label="4. Configuration Details" icon={<Info className="w-4 h-4" />} />
              <StepButton active={activeStep === 'analytics'} onClick={() => setActiveStep('analytics')} label="5. Analytics & Notes" icon={<RefreshCw className="w-4 h-4" />} />
              <StepButton active={activeStep === 'schedule'} onClick={() => setActiveStep('schedule')} label="6. Neural Schedule" icon={<Calendar className="w-4 h-4" />} />
            </div>

            {/* Editing Work Area */}
            <div className="p-8 lg:col-span-3 space-y-6">
              {activeStep === 'setup' && (
                <div className="space-y-6 max-w-2xl">
                  <h4 className={`text-sm font-black uppercase tracking-widest ${textSecondary}`}>Session Setup</h4>
                  
                  <div className="space-y-2">
                    <label className={`block text-xs font-bold ${textSecondary}`}>Configuration Name</label>
                    <input 
                      type="text" 
                      value={editingConfig.name}
                      onChange={(e) => handleFieldChange(null, 'name', e.target.value)}
                      className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                      placeholder="e.g. Scalp High Yield Session"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Amount to Allocate (USD)</label>
                      <input 
                        type="number" 
                        value={editingConfig.sessionSetup.amountToAllocate}
                        onChange={(e) => handleFieldChange('sessionSetup', 'amountToAllocate', Number(e.target.value))}
                        className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Funding Source</label>
                      <select 
                        value={editingConfig.sessionSetup.fundingSource}
                        onChange={(e) => handleFieldChange('sessionSetup', 'fundingSource', e.target.value)}
                        className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                      >
                        <option value="WALLET">Wallet Balance</option>
                        <option value="VAULT">Vault (Safety Stash)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-xs font-bold ${textSecondary}`}>Session Duration (Hours)</label>
                    <input 
                      type="number" 
                      value={editingConfig.sessionSetup.sessionDuration}
                      onChange={(e) => handleFieldChange('sessionSetup', 'sessionDuration', Number(e.target.value))}
                      className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                    />
                    <p className="text-[10px] text-slate-500 font-mono">The AI will automatically shut down after this period expires.</p>
                  </div>
                </div>
              )}

              {activeStep === 'risk' && (
                <div className="space-y-6 max-w-2xl">
                  <h4 className={`text-sm font-black uppercase tracking-widest ${textSecondary}`}>Profit & Risk Management</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Session Take Profit (%)</label>
                      <input 
                        type="number"
                        value={editingConfig.profitRiskManagement.sessionTakeProfit}
                        onChange={(e) => handleFieldChange('profitRiskManagement', 'sessionTakeProfit', Number(e.target.value))}
                        className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-mono font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Session Stop Loss (%)</label>
                      <input 
                        type="number"
                        value={editingConfig.profitRiskManagement.sessionStopLoss}
                        onChange={(e) => handleFieldChange('profitRiskManagement', 'sessionStopLoss', Number(e.target.value))}
                        className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-mono font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Max Risk Per Trade (%)</label>
                      <input 
                        type="number"
                        value={editingConfig.profitRiskManagement.maxRiskPerTrade}
                        onChange={(e) => handleFieldChange('profitRiskManagement', 'maxRiskPerTrade', Number(e.target.value))}
                        className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-mono font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Max Position Size (USD)</label>
                      <input 
                        type="number"
                        value={editingConfig.profitRiskManagement.maxPositionSize}
                        onChange={(e) => handleFieldChange('profitRiskManagement', 'maxPositionSize', Number(e.target.value))}
                        className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-mono font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 'rules' && (
                <div className="space-y-6 max-w-2xl">
                  <h4 className={`text-sm font-black uppercase tracking-widest ${textSecondary}`}>AI Trading Rules</h4>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className={`text-xs font-bold ${textSecondary}`}>Minimum Confidence Score (%)</label>
                      <span className="text-xs font-mono font-bold text-[#00D09C]">{editingConfig.aiTradingRules?.minConfidence ?? 85}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="98"
                      value={editingConfig.aiTradingRules?.minConfidence ?? 85}
                      onChange={(e) => handleFieldChange('aiTradingRules', 'minConfidence', Number(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00D09C]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-xs font-bold ${textSecondary}`}>Maximum Simultaneous Positions</label>
                    <input 
                      type="number"
                      value={editingConfig.aiTradingRules?.maxSimultaneousPositions ?? 3}
                      onChange={(e) => handleFieldChange('aiTradingRules', 'maxSimultaneousPositions', Number(e.target.value))}
                      className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-mono font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Asset Selection</label>
                      <button 
                        type="button"
                        onClick={() => setShowAssetSearch(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-[#00D09C]/30 text-[#00D09C] transition-all flex items-center gap-1.5 text-xs font-bold"
                        title="Search and discover assets"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Discover Assets</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const rawAssets = editingConfig.aiTradingRules?.assetSelection || [];
                        const isOld22List = Array.isArray(rawAssets) && rawAssets.length === 22 && rawAssets.includes('ARKK') && rawAssets.includes('GLD');
                        const currentAssets = isOld22List ? [...INITIAL_DEFAULT_ASSET_COLLECTION] : rawAssets;
                        const ORIGINAL_ASSET_ORDER = [
                          'BTC', 'ETH', 'SOL', 'XRP', 'ADA',
                          'DOT', 'DOGE', 'SHIB', 'AAPL', 'TSLA',
                          'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX',
                          'AMD', 'INTC', 'SPY', 'QQQ', 'ARKK', 'GLD'
                        ];
                        const displayedAssets = [
                          ...ORIGINAL_ASSET_ORDER.filter(m => currentAssets.includes(m)),
                          ...currentAssets.filter(m => !ORIGINAL_ASSET_ORDER.includes(m))
                        ];

                        return displayedAssets.map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              const next = currentAssets.filter(x => x !== m);
                              updateAssetSelection(next);
                            }}
                            className="px-3 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2 bg-[#00D09C]/10 border-[#00D09C] text-[#00D09C]"
                          >
                            <CoinLogo symbol={m} size={20} />
                            {m}
                          </button>
                        ));
                      })()}
                      {(editingConfig.aiTradingRules?.assetSelection || []).length === 0 && (
                        <div className={`w-full py-6 px-4 rounded-2xl border border-dashed border-white/10 text-center ${textSecondary} text-xs flex flex-col items-center justify-center gap-3 bg-black/10`}>
                          <p>No assets in your collection. Click below to explore and add assets.</p>
                          <button
                            type="button"
                            onClick={() => setShowAssetSearch(true)}
                            className="px-4 py-2 rounded-xl bg-[#00D09C]/10 border border-[#00D09C]/30 text-[#00D09C] text-xs font-black flex items-center gap-2 hover:bg-[#00D09C]/20 transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" /> Discover Assets
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-xs font-bold ${textSecondary}`}>Trading Strategy</label>
                    <select 
                      value={editingConfig.aiTradingRules?.tradingStrategy || 'NEURAL_MOMENTUM'}
                      onChange={(e) => handleFieldChange('aiTradingRules', 'tradingStrategy', e.target.value)}
                      className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                    >
                      <option value="NEURAL_MOMENTUM">Neural Momentum (Balanced)</option>
                      <option value="VOLATILITY_BREAKOUT">Volatility Breakout (Aggressive)</option>
                      <option value="MEAN_REVERSION">Mean Reversion (Conservative)</option>
                      <option value="QUANT_GRID">Quant Grid Scalper (High Frequency)</option>
                    </select>
                  </div>
                </div>
              )}

              {activeStep === 'details' && (
                <div className="space-y-6 max-w-2xl">
                  <h4 className={`text-sm font-black uppercase tracking-widest ${textSecondary}`}>Configuration Details</h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Description</label>
                      <textarea 
                        value={editingConfig.configurationDetails?.description || ''}
                        onChange={(e) => handleFieldChange('configurationDetails', 'description', e.target.value)}
                        className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C] h-24`}
                        placeholder="Detailed explanation of this configuration's purpose..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className={`block text-xs font-bold ${textSecondary}`}>Category</label>
                        <select 
                          value={editingConfig.configurationDetails?.category || 'Scalping'}
                          onChange={(e) => handleFieldChange('configurationDetails', 'category', e.target.value)}
                          className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                        >
                          <option value="Scalping">Scalping</option>
                          <option value="Day Trading">Day Trading</option>
                          <option value="Swing Trading">Swing Trading</option>
                          <option value="Long Term">Long Term</option>
                          <option value="Experimental">Experimental</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className={`block text-xs font-bold ${textSecondary}`}>Version</label>
                        <input 
                          type="text" 
                          value={editingConfig.configurationDetails?.version || '1.0.0'}
                          onChange={(e) => handleFieldChange('configurationDetails', 'version', e.target.value)}
                          className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                          placeholder="1.0.0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Status</p>
                        <p className={`text-xs font-bold mt-1 ${editingConfig.status === 'ACTIVE' ? 'text-[#00D09C]' : 'text-slate-400'}`}>
                          {editingConfig.status}
                        </p>
                      </div>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Created</p>
                        <p className={`text-xs font-bold mt-1 ${textPrimary}`}>
                          {editingConfig.createdAt.toDate().toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Modified</p>
                        <p className={`text-xs font-bold mt-1 ${textPrimary}`}>
                          {editingConfig.lastModified.toDate().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 'analytics' && (
                <div className="space-y-6 max-w-2xl">
                  <h4 className={`text-sm font-black uppercase tracking-widest ${textSecondary}`}>Configuration Analytics & Notes</h4>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                      <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Win Rate</p>
                      <p className="text-lg font-black text-[#00D09C] mt-1">{editingConfig.analyticsAndNotes?.performanceStats?.winRate || 0}%</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                      <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Total Return</p>
                      <p className="text-lg font-black text-blue-500 mt-1">+{editingConfig.analyticsAndNotes?.performanceStats?.totalReturn || 0}%</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                      <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Max Drawdown</p>
                      <p className="text-lg font-black text-rose-500 mt-1">-{editingConfig.analyticsAndNotes?.performanceStats?.drawdown || 0}%</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className={`text-xs font-bold ${textSecondary}`}>Aggregated Risk Score</label>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          (editingConfig.analyticsAndNotes?.riskScore || 0) < 40 ? 'bg-[#00D09C]/10 text-[#00D09C]' : 
                          (editingConfig.analyticsAndNotes?.riskScore || 0) < 70 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {editingConfig.analyticsAndNotes?.riskScore || 0}/100
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100"
                        value={editingConfig.analyticsAndNotes?.riskScore || 50}
                        onChange={(e) => handleFieldChange('analyticsAndNotes', 'riskScore', Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00D09C]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Strategy Notes & Post-Session Analysis</label>
                      <textarea 
                        value={editingConfig.analyticsAndNotes?.strategyNotes || ''}
                        onChange={(e) => handleFieldChange('analyticsAndNotes', 'strategyNotes', e.target.value)}
                        className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C] h-32`}
                        placeholder="Log strategy observations, performance insights, and required adjustments..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${textSecondary}`}>Recent Execution History</label>
                      <div className="space-y-2">
                        {editingConfig.analyticsAndNotes.executionHistory && editingConfig.analyticsAndNotes.executionHistory.length > 0 ? (
                          editingConfig.analyticsAndNotes.executionHistory.map((log, idx) => (
                            <div key={idx} className="p-2 bg-white/5 border border-white/5 rounded-lg text-[10px] text-slate-400 font-mono">
                              {log}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                            <p className="text-[10px] text-slate-500 italic">No execution history recorded yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 'schedule' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-sm font-black uppercase tracking-widest ${textPrimary}`}>AI Scheduler & Neural Operating Windows</h4>
                      <p className={`text-xs ${textSecondary} mt-1`}>
                        Authoritative controller of the AI engine. Every subsystem obeys these rules.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-[10px] font-black uppercase tracking-wider ${editingConfig.schedule?.enabled ? 'text-[#00D09C]' : 'text-slate-500'}`}>
                          {editingConfig.schedule?.enabled ? 'Scheduler Active' : 'Scheduler Disabled'}
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono">
                          {editingConfig.schedule?.enabled ? 'Rule-based execution' : 'AI operates continuously (24/7)'}
                        </p>
                      </div>
                      <button
                        onClick={() => updateEditingSchedule(s => ({ ...s, enabled: !s.enabled }))}
                        className={`w-12 h-6 rounded-full p-1 transition-all ${editingConfig.schedule?.enabled ? 'bg-[#00D09C]' : 'bg-white/10'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${editingConfig.schedule?.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {!editingConfig.schedule?.enabled ? (
                    <div className="p-8 rounded-2xl border border-[#00D09C]/30 bg-[#00D09C]/5 text-center space-y-3">
                      <div className="w-12 h-12 bg-[#00D09C]/10 rounded-full flex items-center justify-center mx-auto">
                        <Clock className="w-6 h-6 text-[#00D09C]" />
                      </div>
                      <h5 className="text-[#00D09C] font-black text-sm">Scheduler Disabled • AI operates continuously (24/7)</h5>
                      <p className={`text-xs ${textSecondary} max-w-md mx-auto`}>
                        The AI engine is currently in unrestricted mode. Markets will be scanned and trades executed 24 hours a day, 7 days a week.
                      </p>
                      <button 
                        onClick={() => updateEditingSchedule(s => ({ ...s, enabled: true }))}
                        className="text-xs font-black text-[#00D09C] hover:underline"
                      >
                        Enable Rule-Based Scheduling
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-fadeIn">
                      {/* Operating Windows */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h5 className={`text-xs font-black uppercase tracking-wider ${textSecondary} flex items-center gap-2`}>
                            <Layers className="w-4 h-4 text-[#00D09C]" /> Operating Windows
                          </h5>
                          <button 
                            onClick={() => updateEditingSchedule(s => ({
                              ...s,
                              operatingWindows: [
                                ...s.operatingWindows,
                                {
                                  id: `win_${Date.now()}`,
                                  startTime: '09:00',
                                  endTime: '17:00',
                                  days: 'Every Day',
                                  markets: 'All Markets',
                                  timezone: 'UTC',
                                  enabled: true
                                }
                              ]
                            }))}
                            className="flex items-center gap-1 text-[10px] font-black text-[#00D09C] hover:bg-[#00D09C]/10 px-2 py-1 rounded-lg transition-all"
                          >
                            <Plus className="w-3 h-3" /> Add Window
                          </button>
                        </div>

                        {editingConfig.schedule.operatingWindows.length === 0 ? (
                          <div className="p-6 border border-dashed border-white/10 rounded-2xl text-center">
                            <p className="text-xs text-slate-500 italic">No operating windows defined. AI will enter standby until a window is added.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {editingConfig.schedule.operatingWindows.map((win, idx) => (
                              <div key={`win-${win.id || idx}-${idx}`} className={`p-5 rounded-2xl border ${cardClasses} relative group`}>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Operating Time</label>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="time" 
                                        value={win.startTime}
                                        onChange={(e) => updateEditingSchedule(s => ({
                                          ...s,
                                          operatingWindows: s.operatingWindows.map(w => w.id === win.id ? { ...w, startTime: e.target.value } : w)
                                        }))}
                                        className={`bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                                      />
                                      <span className="text-slate-500 text-xs">to</span>
                                      <input 
                                        type="time" 
                                        value={win.endTime}
                                        onChange={(e) => updateEditingSchedule(s => ({
                                          ...s,
                                          operatingWindows: s.operatingWindows.map(w => w.id === win.id ? { ...w, endTime: e.target.value } : w)
                                        }))}
                                        className={`bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Active Days</label>
                                    <select 
                                      value={win.days === 'Every Day' ? 'Every Day' : Array.isArray(win.days) ? win.days.join(',') : win.days}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateEditingSchedule(s => ({
                                          ...s,
                                          operatingWindows: s.operatingWindows.map(w => w.id === win.id ? { ...w, days: val === 'Every Day' ? 'Every Day' : val.split(',') } : w)
                                        }))
                                      }}
                                      className={`w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                                    >
                                      <option value="Every Day">Every Day</option>
                                      <option value="Mon,Tue,Wed,Thu,Fri">Weekdays (Mon-Fri)</option>
                                      <option value="Sat,Sun">Weekends (Sat-Sun)</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Markets</label>
                                    <select 
                                      value={win.markets === 'All Markets' ? 'All Markets' : Array.isArray(win.markets) ? win.markets.join(',') : win.markets}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateEditingSchedule(s => ({
                                          ...s,
                                          operatingWindows: s.operatingWindows.map(w => w.id === win.id ? { ...w, markets: val === 'All Markets' ? 'All Markets' : val.split(',') as any } : w)
                                        }))
                                      }}
                                      className={`w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-xs font-bold ${textPrimary} outline-none focus:border-[#00D09C]`}
                                    >
                                      <option value="All Markets">All Markets</option>
                                      <option value="Crypto">Crypto Only</option>
                                      <option value="Stocks,Forex,Indices">Equities & Forex</option>
                                      <option value="Commodities">Commodities Only</option>
                                    </select>
                                  </div>

                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => updateEditingSchedule(s => ({
                                        ...s,
                                        operatingWindows: s.operatingWindows.map(w => w.id === win.id ? { ...w, enabled: !w.enabled } : w)
                                      }))}
                                      className={`p-2 rounded-lg border transition-colors ${win.enabled ? 'border-[#00D09C] text-[#00D09C]' : 'border-white/5 text-slate-600'}`}
                                      title={win.enabled ? 'Disable Window' : 'Enable Window'}
                                    >
                                      <Play className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => updateEditingSchedule(s => {
                                        const newWin = { ...win, id: `win_dup_${Date.now()}` };
                                        return { ...s, operatingWindows: [...s.operatingWindows, newWin] };
                                      })}
                                      className={`p-2 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-colors`}
                                      title="Duplicate"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => updateEditingSchedule(s => ({
                                        ...s,
                                        operatingWindows: s.operatingWindows.filter(w => w.id !== win.id)
                                      }))}
                                      className={`p-2 rounded-lg border border-white/5 text-slate-400 hover:text-rose-500 transition-colors`}
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => updateEditingSchedule(s => ({
                                        ...s,
                                        operatingWindows: [...s.operatingWindows, { ...win, id: `win_${Date.now()}` }]
                                      }))}
                                      className={`p-2 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-colors`}
                                      title="Duplicate"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                     <div className="flex items-center gap-1.5">
                                      <Globe className="w-3 h-3 text-slate-500" />
                                      <select 
                                        value={win.timezone}
                                        onChange={(e) => updateEditingSchedule(s => ({
                                          ...s,
                                          operatingWindows: s.operatingWindows.map(w => w.id === win.id ? { ...w, timezone: e.target.value } : w)
                                        }))}
                                        className="bg-transparent border-none text-[10px] font-bold text-slate-400 outline-none p-0 cursor-pointer hover:text-slate-300"
                                      >
                                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                                        <option value="EST">EST (Eastern Time)</option>
                                        <option value="PST">PST (Pacific Time)</option>
                                        <option value="GMT">GMT (London Time)</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Neural Cooling Breaks */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h5 className={`text-xs font-black uppercase tracking-wider ${textSecondary} flex items-center gap-2`}>
                            <Coffee className="w-4 h-4 text-amber-500" /> Neural Cooling Breaks
                          </h5>
                          <button 
                            onClick={() => updateEditingSchedule(s => ({
                              ...s,
                              coolingBreaks: [
                                ...(s.coolingBreaks || []),
                                {
                                  id: `brk_${Date.now()}`,
                                  startTime: '12:00',
                                  endTime: '13:00',
                                  days: 'Every Day',
                                  enabled: true
                                }
                              ]
                            }))}
                            className="flex items-center gap-1 text-[10px] font-black text-amber-500 hover:bg-amber-500/10 px-2 py-1 rounded-lg transition-all"
                          >
                            <Plus className="w-3 h-3" /> Add Break
                          </button>
                        </div>

                        {(editingConfig.schedule.coolingBreaks || []).length === 0 ? (
                          <div className="p-6 border border-dashed border-white/10 rounded-2xl text-center">
                            <p className="text-xs text-slate-500 italic">No cooling breaks defined. AI will operate without scheduled pauses.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {editingConfig.schedule.coolingBreaks.map((brk, idx) => (
                              <div key={`brk-${brk.id || idx}-${idx}`} className={`p-4 rounded-xl border border-white/5 bg-black/20 flex items-center justify-between`}>
                                <div className="flex items-center gap-6">
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="time" 
                                      value={brk.startTime}
                                      onChange={(e) => updateEditingSchedule(s => ({
                                        ...s,
                                        coolingBreaks: s.coolingBreaks.map(b => b.id === brk.id ? { ...b, startTime: e.target.value } : b)
                                      }))}
                                      className="bg-transparent border-none text-xs font-black text-slate-300 outline-none p-0"
                                    />
                                    <span className="text-slate-600 text-xs">-</span>
                                    <input 
                                      type="time" 
                                      value={brk.endTime}
                                      onChange={(e) => updateEditingSchedule(s => ({
                                        ...s,
                                        coolingBreaks: s.coolingBreaks.map(b => b.id === brk.id ? { ...b, endTime: e.target.value } : b)
                                      }))}
                                      className="bg-transparent border-none text-xs font-black text-slate-300 outline-none p-0"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-slate-600" />
                                    <select 
                                      value={brk.days === 'Every Day' ? 'Every Day' : Array.isArray(brk.days) ? brk.days.join(',') : brk.days}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateEditingSchedule(s => ({
                                          ...s,
                                          coolingBreaks: s.coolingBreaks.map(b => b.id === brk.id ? { ...b, days: val === 'Every Day' ? 'Every Day' : val.split(',') } : b)
                                        }))
                                      }}
                                      className="bg-transparent border-none text-[10px] font-black text-slate-500 outline-none p-0 cursor-pointer"
                                    >
                                      <option value="Every Day">Every Day</option>
                                      <option value="Mon,Tue,Wed,Thu,Fri">Weekdays</option>
                                      <option value="Sat,Sun">Weekends</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => updateEditingSchedule(s => ({
                                      ...s,
                                      coolingBreaks: s.coolingBreaks.map(b => b.id === brk.id ? { ...b, enabled: !b.enabled } : b)
                                    }))}
                                    className={`w-8 h-4 rounded-full p-0.5 transition-all ${brk.enabled ? 'bg-amber-500' : 'bg-white/10'}`}
                                  >
                                    <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${brk.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </button>
                                  <button 
                                    onClick={() => updateEditingSchedule(s => ({
                                      ...s,
                                      coolingBreaks: [...s.coolingBreaks, { ...brk, id: `brk_${Date.now()}` }]
                                    }))}
                                    className="p-1.5 text-slate-600 hover:text-white transition-colors"
                                    title="Duplicate"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => updateEditingSchedule(s => ({
                                      ...s,
                                      coolingBreaks: s.coolingBreaks.filter(b => b.id !== brk.id)
                                    }))}
                                    className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Market Calendar & Holiday Rules */}
                      <div className="space-y-4">
                         <h5 className={`text-xs font-black uppercase tracking-wider ${textSecondary} flex items-center gap-2`}>
                            <Calendar className="w-4 h-4 text-blue-500" /> Market Calendar & Holiday Rules
                          </h5>
                          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`}>
                            {(['Crypto', 'Stocks', 'Forex', 'Indices', 'Commodities'] as MarketCategory[]).map(market => {
                              const rules = editingConfig.schedule?.marketCalendar[market] || { excludeHolidays: false };
                              return (
                                <div key={market} className={`p-4 rounded-xl border border-white/5 bg-black/10 flex items-center justify-between`}>
                                  <div>
                                    <p className={`text-[10px] font-black ${textPrimary}`}>{market}</p>
                                    <p className="text-[9px] text-slate-500 mt-0.5">
                                      {rules.excludeHolidays ? 'Excludes Holidays' : 'Ignores Holidays'}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => updateEditingSchedule(s => ({
                                      ...s,
                                      marketCalendar: {
                                        ...s.marketCalendar,
                                        [market]: { excludeHolidays: !rules.excludeHolidays }
                                      }
                                    }))}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black border transition-all ${
                                      rules.excludeHolidays ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-white/5 border-white/10 text-slate-500'
                                    }`}
                                  >
                                    {rules.excludeHolidays ? 'STRICT' : 'CONTINUOUS'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                      </div>

                      {/* Post-Window Behavior */}
                      <div className={`p-5 rounded-2xl border border-white/5 bg-blue-500/5 space-y-3`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-blue-400" />
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-blue-400">Post-Window Position Management</h5>
                          </div>
                          <button
                            onClick={() => updateEditingSchedule(s => ({ ...s, monitorOutsideWindow: !s.monitorOutsideWindow }))}
                            className={`w-10 h-5 rounded-full p-1 transition-all ${editingConfig.schedule?.monitorOutsideWindow ? 'bg-blue-500' : 'bg-white/10'}`}
                          >
                            <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${editingConfig.schedule?.monitorOutsideWindow ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                        <p className={`text-[11px] ${textSecondary} leading-relaxed`}>
                          {editingConfig.schedule?.monitorOutsideWindow 
                            ? 'ON: Open trades will continue to be monitored for SL/TP and risk protection after windows close. No new entries allowed.' 
                            : 'OFF: All AI execution and monitoring stops immediately when window closes. Trades will be left unmanaged until next window.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl p-6 border ${isDark ? 'border-white/10 bg-[#0B0E14]' : 'border-slate-200 bg-white'}`}>
            <h3 className={`text-lg font-black ${textPrimary} mb-4`}>Import Configuration</h3>
            <textarea
              placeholder="Paste configuration content here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-48 bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-mono outline-none text-white mb-4"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowImportModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${textSecondary}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleImportConfig}
                className="px-4 py-2 bg-[#00D09C] hover:bg-[#00B585] text-black rounded-xl text-xs font-black"
              >
                Parse &amp; Import
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAssetSearch && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`w-full max-w-lg rounded-3xl border ${isDark ? 'border-white/10 bg-[#0E131F]' : 'border-slate-200 bg-white'} shadow-2xl flex flex-col max-h-[80vh] overflow-hidden`}
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#00D09C]/10 text-[#00D09C]">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black ${textPrimary}`}>Asset Discovery</h3>
                    <p className={`text-[10px] font-bold ${textSecondary} uppercase tracking-wider`}>Search & Configure Trading Pairs</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowAssetSearch(false);
                    setAssetSearchQuery('');
                  }}
                  className={`p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors ${textSecondary}`}
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 border-b border-white/5 space-y-3">
                <div className="relative">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Search by symbol, company, crypto, forex, index..."
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    className={`w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold ${textPrimary} outline-none focus:border-[#00D09C] transition-all`}
                  />
                  {assetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAssetSearchQuery('')}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white transition-colors`}
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filtering Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                  {(['ALL', 'CRYPTO', 'STOCKS', 'FOREX', 'INDICES', 'ETFs', 'COMMODITIES'] as const).map(cat => {
                    const isCatActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                          isCatActive 
                            ? 'bg-[#00D09C] text-black shadow-md shadow-[#00D09C]/20' 
                            : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {(() => {
                  const currentAssets = editingConfig?.aiTradingRules?.assetSelection || [];
                  const filteredAssets = ASSET_UNIVERSE.filter(asset => {
                    if (selectedCategory !== 'ALL' && asset.category !== selectedCategory) {
                      return false;
                    }
                    if (!assetSearchQuery.trim()) {
                      return true;
                    }
                    const q = assetSearchQuery.toLowerCase().trim();
                    return (
                      asset.symbol.toLowerCase().includes(q) ||
                      asset.name.toLowerCase().includes(q) ||
                      asset.category.toLowerCase().includes(q) ||
                      asset.keywords?.some(k => k.toLowerCase().includes(q))
                    );
                  });

                  if (filteredAssets.length === 0) {
                    return (
                      <div className={`p-12 text-center ${textSecondary} text-xs font-mono opacity-60 italic space-y-2`}>
                        <p>No matching assets found in {selectedCategory} for "{assetSearchQuery}"</p>
                        <button
                          type="button"
                          onClick={() => {
                            setAssetSearchQuery('');
                            setSelectedCategory('ALL');
                          }}
                          className="text-[#00D09C] text-[11px] underline font-bold"
                        >
                          Clear search & filters
                        </button>
                      </div>
                    );
                  }

                  return filteredAssets.map(asset => {
                    const isAdded = currentAssets.includes(asset.symbol);
                    return (
                      <div 
                        key={asset.symbol}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition-all group ${
                          isAdded 
                            ? 'bg-[#00D09C]/5 border-[#00D09C]/20' 
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center border border-white/5 shadow-inner overflow-hidden shrink-0">
                            <CoinLogo symbol={asset.symbol} size={32} className="bg-transparent border-none" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm font-black ${textPrimary}`}>{asset.symbol}</h4>
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                                {asset.category}
                              </span>
                            </div>
                            <p className={`text-[10px] font-bold ${textSecondary}`}>{asset.name}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingConfig) return;
                            const next = isAdded 
                              ? currentAssets.filter(x => x !== asset.symbol)
                              : [...currentAssets, asset.symbol];
                            updateAssetSelection(next);
                          }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isAdded 
                              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                              : 'bg-[#00D09C]/10 text-[#00D09C] hover:bg-[#00D09C]/20 border border-[#00D09C]/20'
                          }`}
                          title={isAdded ? `Remove ${asset.symbol} from collection` : `Add ${asset.symbol} to collection`}
                        >
                          {isAdded ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="p-4 bg-black/20 border-t border-white/5">
                <button 
                  onClick={() => setShowAssetSearch(false)}
                  className="w-full bg-[#00D09C] hover:bg-[#00B585] text-black font-black py-3 rounded-2xl transition-all shadow-lg shadow-[#00D09C]/20"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
        active 
          ? 'bg-[#00D09C]/10 border border-[#00D09C]/30 text-[#00D09C]' 
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ToggleField({ label, description, active, onToggle, isDark }: { label: string; description: string; active: boolean; onToggle: (val: boolean) => void; isDark: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 p-4 rounded-xl bg-white/5 border border-white/5">
      <div className="space-y-1">
        <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{label}</p>
        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>{description}</p>
      </div>
      <button 
        type="button"
        onClick={() => onToggle(!active)}
        className={`w-10 h-5 rounded-full relative transition-all flex-shrink-0 mt-1 ${active ? 'bg-[#00D09C]' : 'bg-white/10'}`}
      >
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );
}
