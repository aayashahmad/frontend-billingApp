import { CURRENCY_LOCALE, CURRENCY_SYMBOL } from '../constants/paymentTypes';

/** Coerce anything the API or a text input hands us into a finite number. */
export const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Round to 2 decimals without float drift (0.1 + 0.2 style artefacts). */
export const roundMoney = (value) => {
  // Number.EPSILON only papers over drift below ~4; 4.005 * 100 is
  // 400.4999… and used to round DOWN. Trimming the product to 12
  // significant digits removes the drift at every magnitude money reaches.
  const cents = Number((toNumber(value) * 100).toPrecision(12));
  return Math.round(cents) / 100;
};

export const formatCurrency = (value) => {
  const amount = roundMoney(value);
  return `${CURRENCY_SYMBOL}${amount.toLocaleString(CURRENCY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Short money for places where the full figure will not fit — chart axes and
 * tick labels, where "₹1,20,000.00" would collide with its neighbour.
 *
 * Uses Indian scale words rather than thousands/millions: a shop owner reads
 * 1.2L faster than 120K, and 12,00,000 is a crore's tenth, not a million.
 */
export const formatCompactCurrency = (value) => {
  const amount = toNumber(value);
  const sign = amount < 0 ? '-' : '';
  const size = Math.abs(amount);

  const trim = (num) => {
    const fixed = num.toFixed(1);
    // 2.0L reads worse than 2L; keep the decimal only when it says something.
    return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  };

  if (size >= 10000000) return `${sign}₹${trim(size / 10000000)}Cr`;
  if (size >= 100000) return `${sign}₹${trim(size / 100000)}L`;
  if (size >= 1000) return `${sign}₹${trim(size / 1000)}K`;
  return `${sign}₹${Math.round(size)}`;
};
