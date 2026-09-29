import {
  billItems,
  calculateBillTotal,
  summariseBill,
} from '../../utils/billing';
import { formatDateTime } from '../../utils/date';
import { roundMoney, toNumber } from '../../utils/money';

/**
 * The customer statement as a spreadsheet.
 *
 * The PDF is for handing to the customer; this is for the shop's own books —
 * something to open in Excel, sort, and reconcile against a bank statement.
 * So the numbers are written bare (no ₹, no thousands separators): a currency
 * symbol turns the whole column into text and every SUM in the sheet breaks.
 *
 * One row per line item rather than per bill, because a per-bill row cannot
 * answer "how much rice did this customer buy this year", which is the
 * question a spreadsheet gets opened for.
 */

/**
 * RFC 4180 escaping.
 *
 * A customer named `Sharma, R` or an address with a newline in it will
 * otherwise shift every following column, silently and only on some rows.
 */
const cell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const row = (cells) => cells.map(cell).join(',');

/** Money for a spreadsheet: a plain number, always two decimals. */
const amount = (value) => roundMoney(toNumber(value)).toFixed(2);

const BILL_HEADERS = [
  'Date',
  'Bill ID',
  'Item',
  'Quantity',
  'Rate',
  'Line total',
  'Bill total',
  'Payment type',
  'Amount paid',
  'Advance applied',
  'Balance on bill',
];

const PAYMENT_HEADERS = [
  'Date',
  'Payment ID',
  'Payment type',
  'Amount received',
  'Applied to dues',
  'Added to advance',
  'Outstanding after',
  'Reference',
];

export const buildCustomerStatementCsv = ({
  customer,
  bills = [],
  payments = [],
  owner,
  outstanding,
  issuedAt,
} = {}) => {
  const lines = [];

  // A header block above the table: opened months later, a bare grid of
  // numbers gives no clue whose account it is or when it was drawn.
  lines.push(row(['Statement', owner?.business_name || owner?.username || '']));
  lines.push(row(['Customer', customer?.name || '']));
  lines.push(row(['Phone', customer?.phone || '']));
  lines.push(row(['Issued', issuedAt || formatDateTime(new Date().toISOString())]));
  lines.push(row(['Outstanding', amount(outstanding ?? customer?.total_unpaid)]));
  lines.push(row(['Advance held', amount(customer?.advance_balance)]));
  lines.push('');

  lines.push(row(['BILLS']));
  lines.push(row(BILL_HEADERS));

  bills.forEach((bill) => {
    const { billTotal, amountPaid, unbalance } = summariseBill(bill);
    const items = billItems(bill);

    if (!items.length) {
      lines.push(
        row([
          formatDateTime(bill.created_at),
          bill.id,
          '',
          '',
          '',
          '',
          amount(billTotal),
          bill.payment_type || '',
          amount(amountPaid),
          amount(bill.advance_applied),
          amount(unbalance),
        ]),
      );
      return;
    }

    items.forEach((item, index) => {
      // The bill-level figures appear once per bill, on its first line.
      // Repeating them on every line would double-count any SUM down the
      // column, which is exactly what a spreadsheet gets used for.
      const first = index === 0;
      lines.push(
        row([
          first ? formatDateTime(bill.created_at) : '',
          first ? bill.id : '',
          item.item_name || '',
          item.qty ?? '',
          amount(item.rate),
          amount(item.line_total ?? calculateBillTotal(item.qty, item.rate)),
          first ? amount(billTotal) : '',
          first ? bill.payment_type || '' : '',
          first ? amount(amountPaid) : '',
          first ? amount(bill.advance_applied) : '',
          first ? amount(unbalance) : '',
        ]),
      );
    });
  });

  if (payments.length) {
    lines.push('');
    lines.push(row(['PAYMENTS RECEIVED']));
    lines.push(row(PAYMENT_HEADERS));

    payments.forEach((payment) => {
      lines.push(
        row([
          formatDateTime(payment.created_at),
          payment.id,
          payment.payment_type || '',
          amount(payment.amount),
          amount(payment.applied_to_dues),
          amount(payment.advance_added),
          amount(payment.outstanding_after),
          payment.transaction_number || '',
        ]),
      );
    });
  }

  return lines.join('\n');
};

export default buildCustomerStatementCsv;
