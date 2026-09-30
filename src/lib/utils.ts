
// Exchange rates relative to USD
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  BTC: 0.000014,
  USDT: 1,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BTC: '₿',
  USDT: '₮',
};

export const formatCurrency = (amount: number | undefined, currency: string = 'USD'): string => {
  if (amount === undefined || isNaN(amount)) return `$0.00`;
  
  // Force standard dollar-first ($) formatting for all users across all locales as requested
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
