/**
 * UPI payment links, per NPCI's deep-linking specification.
 *
 * A `upi://pay?...` string is all a UPI app needs: printed as a QR on the
 * bill, the customer scans it and the payee, amount and reference are already
 * filled in. Nothing is registered with anyone and no fee is charged — the
 * string *is* the integration.
 */

/**
 * Virtual Payment Address, e.g. `shop@okaxis`.
 *
 * Handles are issued by banks and PSPs and vary widely, so this checks the
 * shape rather than a list that would go stale.
 */
export const UPI_ID_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export const isValidUpiId = (value) => UPI_ID_PATTERN.test(String(value || '').trim());

/** Indian Financial System Code: four letters, a zero, then six characters. */
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const isValidIfsc = (value) =>
  IFSC_PATTERN.test(String(value || '').trim().toUpperCase());

/**
 * GSTIN: two state digits, a ten-character PAN, an entity digit, a literal
 * 'Z', then a checksum character.
 */
export const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const isValidGstin = (value) =>
  GSTIN_PATTERN.test(String(value || '').trim().toUpperCase());

/**
 * Builds the payment URI.
 *
 * `pa` and `pn` are the only required parameters; `cu` accepts INR alone.
 * The amount is fixed to two decimals because UPI apps reject values with
 * more, and a bill total that ends in a third decimal is a rounding artefact
 * rather than money anyone can pay.
 */
export const buildUpiUri = ({ upiId, payeeName, amount, note } = {}) => {
  const vpa = String(upiId || '').trim();
  if (!isValidUpiId(vpa)) return null;

  const params = [
    ['pa', vpa],
    ['pn', String(payeeName || '').trim() || 'Merchant'],
    ['cu', 'INR'],
  ];

  const value = Number(amount);
  // Zero is omitted deliberately: a QR carrying am=0 is rejected by some
  // apps, and a settled bill needs no amount anyway.
  if (Number.isFinite(value) && value > 0) {
    params.push(['am', value.toFixed(2)]);
  }

  const cleanNote = String(note || '').trim();
  if (cleanNote) params.push(['tn', cleanNote.slice(0, 50)]);

  return `upi://pay?${params
    .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
    .join('&')}`;
};

/**
 * A wa.me link that opens a chat with the shop.
 *
 * WhatsApp wants a bare international number — no plus, spaces or dashes —
 * and assumes nothing about country, so a ten-digit Indian number is given
 * the 91 prefix rather than silently failing to open.
 */
export const buildWhatsAppLink = (number, message = '') => {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length < 10) return null;

  const international = digits.length === 10 ? `91${digits}` : digits;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${international}${text}`;
};

/** Display form of a WhatsApp/phone number, grouped for readability. */
export const formatWhatsAppNumber = (number) => {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return String(number || '').trim();
};
