import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Preferences, Language, Currency, Theme } from '../types';
import { translations } from '../i18n/translations';

interface PreferencesContextType {
  preferences: Preferences;
  updatePreference: (key: keyof Preferences, value: any) => void;
  t: (key: string, variables?: Record<string, any>) => string;
  formatCurrency: (amount: number, overrideCurrency?: Currency) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const saved = localStorage.getItem('aver_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          language: 'EN',
          theme: 'dark',
          currency: 'USD',
          ...parsed
        };
      }
    } catch (e) {}
    return {
      language: 'EN',
      theme: 'dark',
      currency: 'USD',
      notifications: {
        master: true,
        security: true,
        profile: true,
        deposits: true,
        withdrawals: true,
        trading: true,
        signals: true,
        system: true,
        referrals: true,
        marketing: true,
        rewards: true,
        criticalAlertsSound: true
      }
    };
  });

  const updatePreference = useCallback((key: keyof Preferences, value: any) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('aver_preferences', JSON.stringify(next));
      return next;
    });
  }, []);

  const t = useCallback((key: string, variables?: Record<string, any>) => {
    const lang = preferences.language || 'EN';
    let text = translations[lang]?.[key] || translations['EN']?.[key] || key;
    
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
    }
    return text;
  }, [preferences.language]);

  const formatCurrency = useCallback((amount: number, overrideCurrency?: Currency) => {
    const currency = overrideCurrency || preferences.currency || 'USD';
    const formatter = new Intl.NumberFormat(preferences.language === 'ZH' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency === 'USDT' || currency === 'BTC' ? 'USD' : currency,
      minimumFractionDigits: currency === 'BTC' ? 8 : 2,
      maximumFractionDigits: currency === 'BTC' ? 8 : 2,
    });

    let formatted = formatter.format(amount);
    if (currency === 'USDT') {
      formatted = formatted.replace('$', '') + ' USDT';
    } else if (currency === 'BTC') {
      formatted = '₿' + formatted.replace('$', '');
    }
    return formatted;
  }, [preferences.currency, preferences.language]);

  const value = useMemo(() => ({
    preferences,
    updatePreference,
    t,
    formatCurrency
  }), [preferences, updatePreference, t, formatCurrency]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within a PreferencesProvider');
  return context;
};
