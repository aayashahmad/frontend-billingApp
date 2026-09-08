import {
  billItems,
  calculateBillTotal,
  hasPaymentReference,
  summariseBill,
} from '../../utils/billing';
import { formatDateTime } from '../../utils/date';
import { roundMoney, toNumber } from '../../utils/money';
import { EscPosBuilder, DEFAULT_PAPER_WIDTH } from './escpos';
import { buildLetterhead } from './documentTemplates';
import { buildUpiUri, formatWhatsAppNumber } from '../../utils/upi';

/**
 * Money for a thermal printer.
 *
 * The rupee sign is absent from the printer's Latin-1 code page and prints as
 * a stray glyph, so receipts say "Rs" — the same reason the grouping is done
 * by hand rather than with Intl, which is not guaranteed on every device.
 */
export const printAmount = (value) => {
  const amount = roundMoney(toNumber(value));
  const [whole, fraction] = amount.toFixed(2).split('.');
  // Indian grouping: last three digits, then pairs (12,34,567.00).
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`
    : last3;
  return `Rs ${grouped}.${fraction}`;
};

const PAYMENT_LABELS = { cash: 'Cash', online: 'Online', cheque: 'Cheque' };

/**
 * A bill as a thermal receipt.
 *
 * Deliberately mirrors the PDF's information rather than its layout — 32
 * columns cannot hold a four-column table, so each item takes two lines: the
 * name, then quantity, rate and amount beneath it.
 */
export const buildBillReceipt = ({
  bill,
  customer,
  owner,
  paperWidth = DEFAULT_PAPER_WIDTH,
  issuedAt,
}) => {
  const head = buildLetterhead(owner);
  const { billTotal, amountPaid, unbalance } = summariseBill(bill);
  const items = billItems(bill);
  const b = new EscPosBuilder(paperWidth);

  b.init().align('center').bold(true).size({ width: 2, height: 2 });
  b.wrap(head.name);
  b.size().bold(false);

  head.addressLines.forEach((line) => b.wrap(line));
  if (head.phones.length) b.wrap(head.phones.join(' / '));
  if (head.registrationNumber) b.wrap(`Reg: ${head.registrationNumber}`);
  if (head.gstin) b.wrap(`GSTIN: ${head.gstin}`);

  b.feed(1).align('left').rule();
  b.row('Bill', `#${bill?.id ?? ''}`);
  b.row('Date', formatDateTime(bill?.created_at) || issuedAt || '');
  if (customer?.name) b.row('Customer', customer.name);
  if (customer?.phone) b.row('Phone', customer.phone);
  b.rule();

  items.forEach((item) => {
    b.wrap(item.item_name);
    const amount = item.line_total ?? calculateBillTotal(item.qty, item.rate);
    b.row(`  ${item.qty} x ${printAmount(item.rate)}`, printAmount(amount));
  });

  b.rule();
  b.bold(true).row('TOTAL', printAmount(billTotal)).bold(false);
  b.row('Paid', printAmount(amountPaid));
  b.row(
    'Balance due',
    printAmount(unbalance),
  );
  b.rule();

  b.row('Payment', PAYMENT_LABELS[bill?.payment_type] ?? bill?.payment_type ?? '');
  if (hasPaymentReference(bill?.payment_type) && bill?.transaction_number) {
    b.row('Ref', bill.transaction_number);
  }

  // The settlement, from what the bill recorded. Money received and the bill
  // value stay separate lines: ₹1,200 handed over against a ₹1,000 bill must
  // never print as a ₹1,200 bill.
  const advanceApplied = toNumber(bill?.advance_applied);
  const advanceAdded = toNumber(bill?.advance_added);
  const advanceAfter = toNumber(bill?.advance_balance_after);

  if (advanceApplied > 0) b.row('Advance used', printAmount(advanceApplied));
  if (advanceAdded > 0) b.row('Excess to adv', printAmount(advanceAdded));
  if (advanceAfter > 0) b.row('Advance bal', printAmount(advanceAfter));

  // How to settle what is left. Skipped entirely on a paid-up bill: paper is
  // the one resource a thermal receipt cannot get back.
  const upiUri =
    unbalance > 0
      ? buildUpiUri({
          upiId: head.upiId,
          payeeName: head.name,
          amount: unbalance,
          note: bill?.id ? `Bill #${bill.id}` : '',
        })
      : null;
  const hasBank = unbalance > 0 && head.bankAccountNumber && head.bankIfsc;

  if (upiUri || hasBank) {
    b.feed(1).rule();
    b.align('center').bold(true).line('HOW TO PAY').bold(false);

    if (upiUri) {
      // Drawn by the printer from the text itself — sending a bitmap would
      // push thousands of pixel bytes over Bluetooth for the same picture.
      b.feed(1).qr(upiUri, { size: 6 });
      b.line('Scan to pay by UPI');
      if (head.upiId) b.wrap(head.upiId);
    }

    if (hasBank) {
      b.align('left').feed(1);
      if (head.bankAccountName) b.row('A/c name', head.bankAccountName);
      b.row('A/c no', head.bankAccountNumber);
      b.row('IFSC', head.bankIfsc);
    }
  }

  b.feed(1).align('center');
  if (head.whatsappNumber) {
    b.wrap(`WhatsApp: ${formatWhatsAppNumber(head.whatsappNumber)}`);
  }
  b.wrap(head.footerNote || 'Thank you for your business.');
  b.cut();

  return b;
};

/** A short page proving the printer is connected and the width is right. */
export const buildTestReceipt = ({ owner, paperWidth = DEFAULT_PAPER_WIDTH }) => {
  const head = buildLetterhead(owner);
  const b = new EscPosBuilder(paperWidth);

  b.init().align('center').bold(true).size({ width: 2, height: 2 });
  b.wrap(head.name);
  b.size().bold(false).feed(1);

  b.align('left').rule();
  b.line('Printer test');
  // The ruler makes a wrong paper-width setting obvious at a glance: the row
  // of dashes should exactly span the paper.
  b.row('Paper', `${paperWidth} mm`);
  b.row('Columns', String(b.columns));
  b.row('Sample amount', printAmount(1234.5));
  b.rule();
  b.wrap('If this line reaches both edges without wrapping, the width is set correctly.');
  b.cut();

  return b;
};

export default buildBillReceipt;
