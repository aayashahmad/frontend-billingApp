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

/**
 * A single bill, for sending right after the sale.
 *
 * Says how the bill was actually settled, not merely whether anything is
 * still owed on it. A bill covered by the customer's own credit leaves
 * nothing outstanding but nothing was paid either, and telling somebody
 * they "paid in full" when they handed over no money is the kind of wrong
 * that gets argued about at the counter.
 *
 * The account position is a separate sentence, because a bill settled in
 * full says nothing about what earlier bills left owing.
 */
export const buildBillMessage = ({ customer, bill, shopName } = {}) => {
  const name = customer?.name?.trim() || 'Customer';
  const shop = shopName?.trim() || 'our shop';
  const total = formatCurrency(toNumber(bill?.bill_total));

  const paid = toNumber(bill?.amount_paid);
  const fromAdvance = toNumber(bill?.advance_applied);
  const owedOnBill = toNumber(bill?.unbalance);
  // What the shop received beyond this bill became credit, so it is not
  // money the customer is out of pocket for this sale.
  const toAdvance = toNumber(bill?.advance_added);
  const received = Math.max(paid - toAdvance, 0);

  let settlement;
  if (owedOnBill > 0) {
    settlement =
      received > 0 || fromAdvance > 0
        ? `Part-paid; ${formatCurrency(owedOnBill)} still due on this bill.`
        : `Added to your account — ${formatCurrency(owedOnBill)} due.`;
  } else if (fromAdvance > 0 && received > 0) {
    settlement =
      `${formatCurrency(received)} paid and ` +
      `${formatCurrency(fromAdvance)} taken from your advance.`;
  } else if (fromAdvance > 0) {
    settlement = `Settled from your advance balance — nothing to pay.`;
  } else {
    settlement = 'Paid in full — thank you!';
  }

  // Where the account stands now. Omitted when it is square both ways,
  // which is the only case where the bill line already says everything.
  const outstanding = toNumber(customer?.total_unpaid);
  const advanceLeft = toNumber(customer?.advance_balance);
  let account = '';
  if (outstanding > 0) {
    account = ` Total outstanding on your account: ${formatCurrency(outstanding)}.`;
  } else if (advanceLeft > 0) {
    account = ` Advance remaining: ${formatCurrency(advanceLeft)}.`;
  }

  return `Hello ${name}, your bill from ${shop} is ${total}. ${settlement}${account}`;
};
