import { CURRENCY_LOCALE, CURRENCY_SYMBOL } from '../constants/paymentTypes';

/** Coerce anything the API or a text input hands us into a finite number. */
export const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Round to 2 decimals without float drift (0.1 + 0.2 style artefacts). */
export const roundMoney = (value) =>
  Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

export const formatCurrency = (value) => {
  const amount = roundMoney(value);
  return `${CURRENCY_SYMBOL}${amount.toLocaleString(CURRENCY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
