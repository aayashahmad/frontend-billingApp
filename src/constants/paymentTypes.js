export const PAYMENT_TYPES = Object.freeze({
  CASH: 'cash',
  ONLINE: 'online',
});

export const PAYMENT_TYPE_OPTIONS = Object.freeze([
  { value: PAYMENT_TYPES.CASH, label: 'Cash' },
  { value: PAYMENT_TYPES.ONLINE, label: 'Online' },
]);

export const PAYMENT_TYPE_LABELS = Object.freeze({
  [PAYMENT_TYPES.CASH]: 'Cash',
  [PAYMENT_TYPES.ONLINE]: 'Online',
});

export const PHONE_MIN_LENGTH = 10;
export const PHONE_MAX_LENGTH = 15;

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_LOCALE = 'en-IN';
