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
