export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ', SGD: 'S$',
  AUD: 'A$', CAD: 'C$', JPY: '¥', CNY: '¥',
};

export const CURRENCY_NAMES: Record<string, { major: string; minor: string }> = {
  INR: { major: 'Rupees', minor: 'Paise' },
  USD: { major: 'Dollars', minor: 'Cents' },
  EUR: { major: 'Euros', minor: 'Cents' },
  GBP: { major: 'Pounds', minor: 'Pence' },
  AED: { major: 'Dirhams', minor: 'Fils' },
  SGD: { major: 'Singapore Dollars', minor: 'Cents' },
  AUD: { major: 'Australian Dollars', minor: 'Cents' },
  CAD: { major: 'Canadian Dollars', minor: 'Cents' },
  JPY: { major: 'Yen', minor: 'Sen' },
  CNY: { major: 'Yuan', minor: 'Fen' },
};

// Currency-aware money formatter. Falls back to a symbol + fixed decimals if
// Intl can't resolve the currency on the runtime.
export function fmtMoney(n: number, currency = 'INR'): string {
  const value = Number(n) || 0;
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return (CURRENCY_SYMBOLS[currency] ?? `${currency} `) + value.toFixed(2);
  }
}
