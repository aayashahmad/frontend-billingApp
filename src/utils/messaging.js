import { Platform } from 'react-native';

import { formatCurrency, toNumber } from './money';

/**
 * Message links for reaching a customer from their own detail screen.
 *
 * Both WhatsApp and SMS open the customer's own app with the text already
 * written, for the shopkeeper to send. Nothing is sent automatically: doing
 * that needs the WhatsApp Business API, which is paid and requires every
 * template to be approved by Meta, and an SMS gateway, which is also paid.
 * A pre-filled draft costs nothing and works on every phone.
 *
 * Neither link can carry a file. The statement PDF and CSV go through the
 * OS share sheet instead, where WhatsApp appears as one target among many.
 */

/** India's country code, used when a number is stored as 10 local digits. */
const DEFAULT_COUNTRY_CODE = '91';

const toDigits = (value) => String(value || '').replace(/\D/g, '');

/**
 * `sms:` with the body pre-filled.
 *
 * iOS and Android disagree on the separator before the query string — iOS
 * wants `&`, Android wants `?` — and getting it wrong drops the body
 * silently, leaving the shopkeeper with an empty message and no clue why.
 */
export const buildSmsLink = (number, message = '') => {
  const digits = toDigits(number);
  if (digits.length < 10) return null;

  if (!message) return `sms:${digits}`;

  const separator = Platform.OS === 'ios' ? '&' : '?';
  return `sms:${digits}${separator}body=${encodeURIComponent(message)}`;
};

/** International form, assuming India when only the local digits are stored. */
export const toInternational = (number) => {
  const digits = toDigits(number);
  if (digits.length < 10) return null;
  return digits.length === 10 ? `${DEFAULT_COUNTRY_CODE}${digits}` : digits;
};

/**
 * What the shop wants to say to a customer about their account.
 *
 * Three different messages, because the three situations are different: money
 * is owed, credit is held, or everything is square. A single template with a
 * signed number would read as a demand to somebody who has actually paid
 * ahead — the commonest way these messages cause offence.
 */
export const buildBalanceMessage = ({ customer, shopName, dueNote } = {}) => {
  const name = customer?.name?.trim() || 'Customer';
  const shop = shopName?.trim() || 'our shop';
  const outstanding = toNumber(customer?.total_unpaid);
  const advance = toNumber(customer?.advance_balance);

  if (advance > 0) {
    return (
      `Hello ${name}, you have an advance balance of ` +
      `${formatCurrency(advance)} with ${shop}. ` +
      'It will be applied to your next bill. Thank you!'
    );
  }

  if (outstanding > 0) {
    const note = dueNote ? ` ${dueNote.trim()}` : '';
    return (
      `Hello ${name}, your outstanding balance with ${shop} is ` +
      `${formatCurrency(outstanding)}.${note} Thank you!`
    );
  }

  return (
    `Hello ${name}, your account with ${shop} is fully settled. ` +
    'Thank you for your business!'
  );
};

/** A single bill, for sending right after the sale. */
export const buildBillMessage = ({ customer, bill, shopName } = {}) => {
  const name = customer?.name?.trim() || 'Customer';
  const shop = shopName?.trim() || 'our shop';
  const total = formatCurrency(toNumber(bill?.bill_total));
  const owed = toNumber(bill?.unbalance);

  const settlement =
    owed > 0
      ? ` Balance due: ${formatCurrency(owed)}.`
      : ' Paid in full — thank you!';

  return `Hello ${name}, your bill from ${shop} is ${total}.${settlement}`;
};
