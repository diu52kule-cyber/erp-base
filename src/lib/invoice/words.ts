import { CURRENCY_NAMES } from './format';

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigit(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}

function threeDigit(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = '';
  if (h) out += ONES[h] + ' Hundred';
  if (rest) out += (out ? ' ' : '') + twoDigit(rest);
  return out;
}

// Indian numbering: crore / lakh / thousand / hundred.
function indianWords(num: number): string {
  if (num === 0) return 'Zero';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const parts: string[] = [];
  if (crore) parts.push(twoDigit(crore) + ' Crore');
  if (lakh) parts.push(twoDigit(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigit(thousand) + ' Thousand');
  if (num) parts.push(threeDigit(num));
  return parts.join(' ');
}

// International numbering: billion / million / thousand.
function internationalWords(num: number): string {
  if (num === 0) return 'Zero';
  const scales = [
    [1_000_000_000, 'Billion'],
    [1_000_000, 'Million'],
    [1_000, 'Thousand'],
  ] as const;
  const parts: string[] = [];
  for (const [value, name] of scales) {
    if (num >= value) {
      parts.push(threeDigit(Math.floor(num / value)) + ' ' + name);
      num %= value;
    }
  }
  if (num) parts.push(threeDigit(num));
  return parts.join(' ');
}

// "Rupees Five Thousand Nine Hundred and Fifty Paise only"
export function amountInWords(amount: number, currency = 'INR'): string {
  const names = CURRENCY_NAMES[currency] ?? { major: currency, minor: 'Cents' };
  const value = Math.max(0, Number(amount) || 0);
  const major = Math.floor(value);
  const minor = Math.round((value - major) * 100);
  const toWords = currency === 'INR' ? indianWords : internationalWords;

  let out = `${names.major} ${toWords(major)}`;
  if (minor > 0) out += ` and ${twoDigit(minor)} ${names.minor}`;
  return out + ' only';
}
