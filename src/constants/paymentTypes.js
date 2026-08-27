export const PAYMENT_TYPES = Object.freeze({
  CASH: 'cash',
  ONLINE: 'online',
  CHEQUE: 'cheque',
});

export const PAYMENT_TYPE_OPTIONS = Object.freeze([
  { value: PAYMENT_TYPES.CASH, label: 'Cash' },
  { value: PAYMENT_TYPES.ONLINE, label: 'Online' },
  { value: PAYMENT_TYPES.CHEQUE, label: 'Cheque' },
]);

export const PAYMENT_TYPE_LABELS = Object.freeze({
  [PAYMENT_TYPES.CASH]: 'Cash',
  [PAYMENT_TYPES.ONLINE]: 'Online',
  [PAYMENT_TYPES.CHEQUE]: 'Cheque',
});

/**
 * Online transfers and cheques both carry a reference number and a supporting
 * image, but the wording on screen and on printed bills differs.
 */
export const PAYMENT_REFERENCE_LABELS = Object.freeze({
  [PAYMENT_TYPES.ONLINE]: {
    number: 'Transaction number (UTR / reference)',
    numberShort: 'Transaction ref',
    numberPlaceholder: 'Enter reference number',
    image: 'Transaction screenshot',
    imageEmpty: 'No screenshot attached',
  },
  [PAYMENT_TYPES.CHEQUE]: {
    number: 'Cheque number',
    numberShort: 'Cheque no',
    numberPlaceholder: 'Enter cheque number',
    image: 'Cheque image',
    imageEmpty: 'No cheque photo attached',
  },
});

export const PHONE_MIN_LENGTH = 10;
export const PHONE_MAX_LENGTH = 15;

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_LOCALE = 'en-IN';
