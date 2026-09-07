import {
  PAYMENT_REFERENCE_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPES,
} from '../../constants/paymentTypes';
import {
  aggregateBillTotals,
  billItems,
  calculateBillTotal,
  hasPaymentReference,
  outstandingAfterPayments,
  sumPayments,
  summariseBill,
} from '../../utils/billing';
import { formatDateTime } from '../../utils/date';
import { formatCompactCurrency, formatCurrency } from '../../utils/money';
import { buildUpiUri, formatWhatsAppNumber } from '../../utils/upi';
import { qrSvg } from './qr';

/** Values are interpolated into HTML, so every one must be escaped. */
export const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const BASE_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #0F172A;
    margin: 0;
    padding: 32px;
    font-size: 13px;
  }
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #2563EB;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .shop-name { font-size: 22px; font-weight: 700; margin: 0; }
  .shop-meta { color: #64748B; font-size: 11px; margin-top: 4px; line-height: 1.5; }
  .pay-block {
    margin-top: 20px;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 14px 16px;
    page-break-inside: avoid;
  }
  .pay-body { display: flex; align-items: flex-start; gap: 20px; margin-top: 8px; }
  .pay-qr { text-align: center; }
  .pay-qr-caption { font-size: 10px; color: #0F172A; font-weight: 700; margin-top: 6px; }
  .pay-qr-vpa { font-size: 10px; color: #64748B; margin-top: 2px; }
  .pay-table { border-collapse: collapse; }
  .chart-legend { font-size: 10px; color: #64748B; margin-top: 6px; }
  .chart-legend .swatch {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 2px;
    margin: 0 4px 0 12px;
  }
  .chart-legend .swatch.collected { background: #2563EB; }
  .chart-legend .swatch.due { background: #DC2626; }
  .pay-label { color: #64748B; font-size: 11px; padding: 3px 16px 3px 0; }
  .pay-value { font-size: 11px; font-weight: 600; padding: 3px 0; }
  .doc-type {
    text-align: right;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #2563EB;
    font-weight: 700;
  }
  .doc-date { color: #64748B; font-size: 11px; margin-top: 4px; }
  .section-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748B;
    margin: 20px 0 8px;
  }
  .party { font-size: 15px; font-weight: 700; margin: 0; }
  .party-meta { color: #64748B; font-size: 12px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748B;
    border-bottom: 1px solid #E2E8F0;
    padding: 8px 6px;
  }
  td { padding: 8px 6px; border-bottom: 1px solid #F1F5F9; }
  .num { text-align: right; white-space: nowrap; }
  tfoot td {
    border-top: 1px solid #0F172A;
    border-bottom: none;
    font-weight: 700;
  }
  tfoot .label { color: #64748B; text-align: right; }
  /* Each line of a multi-item bill, inside the statement's Item cell. */
  .line { margin-bottom: 2px; }
  .line:last-child { margin-bottom: 0; }
  .line-name { display: block; }
  .line-meta { display: block; color: #64748B; font-size: 10px; }
  .totals { margin-top: 20px; margin-left: auto; width: 260px; }
  .totals tr td { border: none; padding: 5px 6px; }
  .totals .label { color: #64748B; }
  .totals .grand td {
    border-top: 2px solid #0F172A;
    font-weight: 700;
    font-size: 15px;
    padding-top: 8px;
  }
  .due { color: #DC2626; font-weight: 700; }
  .settled { color: #16A34A; font-weight: 700; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    background: #DBEAFE;
    color: #1D4ED8;
  }
  .badge.cash { background: #DCFCE7; color: #16A34A; }
  .badge.cheque { background: #FEF3C7; color: #B45309; }
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #E2E8F0;
    color: #94A3B8;
    font-size: 10px;
    text-align: center;
  }
  .empty { color: #94A3B8; font-style: italic; padding: 16px 6px; }
`;

/**
 * Letterhead lines, in print order.
 *
 * Each business field falls back to the account detail so a document is never
 * blank before the owner fills in the Bill Details screen. Blank lines are
 * dropped rather than printed as gaps.
 */
export const buildLetterhead = (owner) => {
  const phones = [owner?.business_phone || owner?.phone, owner?.business_alt_phone]
    .map((value) => (value ? String(value).trim() : ''))
    .filter(Boolean);

  return {
    name: owner?.business_name || owner?.username || 'Billing',
    // Address is free text; each typed line becomes its own printed line.
    addressLines: String(owner?.business_address || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    email: owner?.business_email || owner?.email || '',
    phones: [...new Set(phones)],
    registrationNumber: owner?.registration_number || '',
    gstin: owner?.gstin || '',
    upiId: owner?.upi_id || '',
    bankAccountName: owner?.bank_account_name || '',
    bankAccountNumber: owner?.bank_account_number || '',
    bankIfsc: owner?.bank_ifsc || '',
    whatsappNumber: owner?.whatsapp_number || '',
    footerNote: owner?.bill_footer_note || '',
  };
};

const shopHeader = (owner, docType, issuedAt) => {
  const head = buildLetterhead(owner);
  const lines = [
    ...head.addressLines,
    head.email,
    head.phones.join(' · '),
    head.registrationNumber ? `Reg. No: ${head.registrationNumber}` : '',
    // A GSTIN identifies the shop for tax; it is the line a business customer
    // looks for first, so it sits directly under the address.
    head.gstin ? `GSTIN: ${head.gstin}` : '',
    head.whatsappNumber
      ? `WhatsApp: ${formatWhatsAppNumber(head.whatsappNumber)}`
      : '',
  ].filter(Boolean);

  return `
  <div class="doc-header">
    <div>
      <p class="shop-name">${escapeHtml(head.name)}</p>
      <div class="shop-meta">
        ${lines.map((line) => escapeHtml(line)).join('<br/>')}
      </div>
    </div>
    <div>
      <div class="doc-type">${escapeHtml(docType)}</div>
      <div class="doc-date">${escapeHtml(issuedAt)}</div>
    </div>
  </div>
`;
};

const partyBlock = (customer) => `
  <div class="section-title">Billed to</div>
  <p class="party">${escapeHtml(customer?.name || 'Walk-in customer')}</p>
  <div class="party-meta">${escapeHtml(customer?.phone || '')}</div>
`;

const BADGE_CLASSES = {
  [PAYMENT_TYPES.CASH]: 'badge cash',
  [PAYMENT_TYPES.ONLINE]: 'badge',
  [PAYMENT_TYPES.CHEQUE]: 'badge cheque',
};

const paymentBadge = (paymentType) => {
  const label = PAYMENT_TYPE_LABELS[paymentType] ?? paymentType ?? '';
  const cls = BADGE_CLASSES[paymentType] ?? 'badge';
  return `<span class="${cls}">${escapeHtml(label)}</span>`;
};

const wrap = (title, body) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${BASE_STYLES}</style>
  </head>
  <body>${body}</body>
</html>`;

/** Single-bill receipt. */
/**
 * How to pay what is still owed.
 *
 * Only rendered when something is actually outstanding — a settled bill does
 * not need a QR — and only for the details the shop has filled in, so a shop
 * with no bank account does not print an empty box.
 *
 * The QR encodes the amount due, so the customer scans and confirms rather
 * than typing a figure they might get wrong.
 */
const paymentDetailsBlock = (owner, { amountDue, reference } = {}) => {
  // Nothing owed, nothing to collect. Without this the QR still renders (a
  // payee address alone makes a valid UPI link), telling a customer who has
  // already paid in full how to pay again.
  if (!(Number(amountDue) > 0)) return '';

  const head = buildLetterhead(owner);
  const hasBank = Boolean(head.bankAccountNumber && head.bankIfsc);
  const upiUri = buildUpiUri({
    upiId: head.upiId,
    payeeName: head.name,
    amount: amountDue,
    note: reference,
  });

  if (!upiUri && !hasBank) return '';

  const qr = upiUri ? qrSvg(upiUri, { size: 132 }) : '';

  const bankRows = [
    ['Account name', head.bankAccountName],
    ['Account number', head.bankAccountNumber],
    ['IFSC', head.bankIfsc],
  ]
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) => `
        <tr>
          <td class="pay-label">${escapeHtml(label)}</td>
          <td class="pay-value">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  return `
    <div class="pay-block">
      <div class="section-title">How to pay</div>
      <div class="pay-body">
        ${
          qr
            ? `<div class="pay-qr">
                 ${qr}
                 <div class="pay-qr-caption">Scan to pay by UPI</div>
                 <div class="pay-qr-vpa">${escapeHtml(head.upiId)}</div>
               </div>`
            : ''
        }
        ${
          bankRows
            ? `<table class="pay-table">${bankRows}</table>`
            : ''
        }
      </div>
    </div>
  `;
};

export const buildBillReceiptHtml = ({ bill, customer, owner }) => {
  const { billTotal, amountPaid, unbalance } = summariseBill(bill);
  const issuedAt = formatDateTime(bill?.created_at);

  // Online transfers and cheques both carry a reference; the label differs.
  const referenceLabel =
    PAYMENT_REFERENCE_LABELS[bill?.payment_type]?.numberShort;
  const referenceRow = hasPaymentReference(bill?.payment_type)
    ? `
        <tr>
          <td class="label">${escapeHtml(referenceLabel ?? 'Reference')}</td>
          <td class="num">${escapeHtml(bill.transaction_number || '—')}</td>
        </tr>`
    : '';

  const body = `
    ${shopHeader(owner, 'Receipt', issuedAt)}
    ${partyBlock(customer)}

    <div class="section-title">Bill #${escapeHtml(bill?.id)}</div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Rate</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${billItems(bill)
          .map(
            (item) => `
        <tr>
          <td>${escapeHtml(item.item_name)}</td>
          <td class="num">${escapeHtml(item.qty)}</td>
          <td class="num">${formatCurrency(item.rate)}</td>
          <td class="num">${formatCurrency(
            item.line_total ?? calculateBillTotal(item.qty, item.rate),
          )}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="label">Total</td>
          <td class="num">${formatCurrency(billTotal)}</td>
        </tr>
      </tfoot>
    </table>

    <table class="totals">
      <tr>
        <td class="label">Payment</td>
        <td class="num">${paymentBadge(bill?.payment_type)}</td>
      </tr>
      ${referenceRow}
      <tr>
        <td class="label">Amount paid</td>
        <td class="num">${formatCurrency(amountPaid)}</td>
      </tr>
      <tr class="grand">
        <td>Balance due</td>
        <td class="num ${unbalance > 0 ? 'due' : 'settled'}">
          ${formatCurrency(unbalance)}
        </td>
      </tr>
    </table>

    ${paymentDetailsBlock(owner, {
      amountDue: unbalance,
      reference: bill?.id ? `Bill #${bill.id}` : '',
    })}

    <div class="footer">
      ${escapeHtml(buildLetterhead(owner).footerNote || 'Thank you for your business.')}
    </div>
  `;

  return wrap(`Receipt ${bill?.id ?? ''}`, body);
};

/** Full account statement covering every bill for one customer. */
export const buildCustomerStatementHtml = ({
  customer,
  bills = [],
  owner,
  issuedAt,
  payments = [],
  // The server's outstanding figure, when the caller has it. An overpayment
  // on a later bill settles earlier dues without touching any bill row, so
  // the sum derived below can overstate what is owed — it stays only as the
  // fallback for callers without the live figure.
  outstanding: outstandingOverride,
}) => {
  const { totalAmount, totalUnpaid } = aggregateBillTotals(bills);
  // Payments settle dues without touching any bill, so a statement that
  // ignored them would bill the customer for money already handed over.
  const paymentsTotal = sumPayments(payments);
  const outstanding =
    outstandingOverride ?? outstandingAfterPayments(totalUnpaid, payments);

  const rows = bills.length
    ? bills
        .map((bill) => {
          const { billTotal, amountPaid, unbalance } = summariseBill(bill);
          return `
            <tr>
              <td>${escapeHtml(formatDateTime(bill.created_at))}</td>
              <td>${billItems(bill)
                .map(
                  (item) => `
                <div class="line">
                  <span class="line-name">${escapeHtml(item.item_name)}</span>
                  <span class="line-meta">${escapeHtml(item.qty)} × ${formatCurrency(
                    item.rate,
                  )} = ${formatCurrency(
                    item.line_total ?? calculateBillTotal(item.qty, item.rate),
                  )}</span>
                </div>`,
                )
                .join('')}</td>
              <td class="num">${escapeHtml(
                billItems(bill).reduce(
                  (sum, item) => sum + Number(item.qty || 0),
                  0,
                ),
              )}</td>
              <td>${paymentBadge(bill.payment_type)}</td>
              <td class="num">${formatCurrency(billTotal)}</td>
              <td class="num">${formatCurrency(amountPaid)}</td>
              <td class="num ${unbalance > 0 ? 'due' : ''}">${formatCurrency(unbalance)}</td>
            </tr>`;
        })
        .join('')
    : `<tr><td class="empty" colspan="7">No bills recorded for this customer yet.</td></tr>`;

  const body = `
    ${shopHeader(owner, 'Customer statement', issuedAt || '')}
    ${partyBlock(customer)}

    <div class="section-title">Bill history (${bills.length})</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Item</th>
          <th class="num">Qty</th>
          <th>Payment</th>
          <th class="num">Total</th>
          <th class="num">Paid</th>
          <th class="num">Balance</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    ${
      payments.length
        ? `
    <div class="section-title">Payments received (${payments.length})</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Method</th>
          <th>Reference</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${payments
          .map(
            (payment) => `
        <tr>
          <td>${escapeHtml(formatDateTime(payment.created_at))}</td>
          <td>${paymentBadge(payment.payment_type)}</td>
          <td>${escapeHtml(payment.transaction_number || '—')}</td>
          <td class="num">${formatCurrency(payment.amount)}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>`
        : ''
    }

    <table class="totals">
      <tr>
        <td class="label">Total billed</td>
        <td class="num">${formatCurrency(totalAmount)}</td>
      </tr>
      ${
        payments.length
          ? `
      <tr>
        <td class="label">Payments received</td>
        <td class="num">−${formatCurrency(paymentsTotal)}</td>
      </tr>`
          : ''
      }
      <tr class="grand">
        <td>Outstanding</td>
        <td class="num ${outstanding > 0 ? 'due' : 'settled'}">
          ${formatCurrency(outstanding)}
        </td>
      </tr>
    </table>

    ${paymentDetailsBlock(owner, {
      // The statement's whole point is the running balance, so the QR carries
      // the total owed rather than any single bill's share of it.
      amountDue: outstanding,
      // ASCII only: the note travels in the UPI URI, and some apps balk at
      // multi-byte characters there. An em dash would arrive as %E2%80%94.
      reference: customer?.name ? `Dues ${customer.name}` : 'Dues',
    })}

    <div class="footer">
      ${escapeHtml(
        buildLetterhead(owner).footerNote ||
          `Statement issued by ${buildLetterhead(owner).name}.`,
      )}
    </div>
  `;

  return wrap(`Statement — ${customer?.name ?? ''}`, body);
};

/**
 * A period's sales as a printable page.
 *
 * The on-screen chart is built from views, which cannot travel into HTML, so
 * the bars are re-drawn here as SVG rectangles. Same shape, same colours, and
 * it scales to whatever resolution the printer runs at.
 */
export const buildSalesReportHtml = ({ report, owner }) => {
  const buckets = report?.buckets ?? [];
  const totals = report?.totals ?? {
    bills: 0,
    billed: 0,
    collected: 0,
    outstanding: 0,
  };

  const periodLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  const periodLabel = periodLabels[report?.period] ?? '';

  // Same axis rounding as the on-screen chart, so the printed page and the
  // phone do not disagree about where the top of the scale is.
  const peak = Math.max(...buckets.map((b) => Number(b.billed) || 0), 0);
  const magnitude = peak > 0 ? 10 ** Math.floor(Math.log10(peak)) : 0;
  const axisMax = peak > 0
    ? ([1, 2, 2.5, 5, 10].find((c) => peak / magnitude <= c) ?? 10) * magnitude
    : 0;

  const chartHeight = 150;
  const barWidth = 26;
  const gap = 12;
  const axisGutter = 46;
  const plotWidth = Math.max(buckets.length * (barWidth + gap), 1);
  const chartWidth = plotWidth + axisGutter;

  const tickCount = 4;
  const grid = axisMax > 0
    ? Array.from({ length: tickCount + 1 }, (_, index) => {
        const value = (axisMax / tickCount) * index;
        const y = chartHeight - (value / axisMax) * chartHeight;
        return `
        <line x1="${axisGutter}" y1="${y}" x2="${chartWidth}" y2="${y}"
              stroke="${value === 0 ? '#94A3B8' : '#E2E8F0'}" stroke-width="1" />
        <text x="${axisGutter - 6}" y="${y + 3}" font-size="9" fill="#94A3B8"
              text-anchor="end">${escapeHtml(formatCompactCurrency(value))}</text>`;
      }).join('')
    : '';

  const bars = buckets
    .map((bucket, index) => {
      const billed = Number(bucket.billed) || 0;
      const collected = Math.min(Number(bucket.collected) || 0, billed);
      const due = Math.max(billed - collected, 0);
      const total = axisMax > 0 ? (billed / axisMax) * chartHeight : 0;
      const dueHeight = billed > 0 ? (due / billed) * total : 0;
      const collectedHeight = total - dueHeight;
      const x = axisGutter + index * (barWidth + gap);
      const top = chartHeight - total;

      return `
        <rect x="${x}" y="${top}" width="${barWidth}" height="${dueHeight}" fill="#DC2626" />
        <rect x="${x}" y="${top + dueHeight}" width="${barWidth}" height="${collectedHeight}" fill="#2563EB" />
        <text x="${x + barWidth / 2}" y="${chartHeight + 14}" font-size="9" fill="#64748B" text-anchor="middle">${escapeHtml(bucket.label)}</text>`;
    })
    .join('');

  const rows = buckets
    .map(
      (bucket) => `
      <tr>
        <td>${escapeHtml(bucket.label)}</td>
        <td class="num">${bucket.bills}</td>
        <td class="num">${formatCurrency(bucket.billed)}</td>
        <td class="num">${formatCurrency(bucket.collected)}</td>
        <td class="num ${Number(bucket.outstanding) > 0 ? 'due' : ''}">${formatCurrency(bucket.outstanding)}</td>
      </tr>`,
    )
    .join('');

  const body = `
    ${shopHeader(owner, `${periodLabel} sales report`, formatDateTime(new Date().toISOString()))}

    <table class="totals">
      <tr>
        <td class="label">Bills</td>
        <td class="num">${totals.bills}</td>
      </tr>
      <tr>
        <td class="label">Sold</td>
        <td class="num">${formatCurrency(totals.billed)}</td>
      </tr>
      <tr>
        <td class="label">Collected</td>
        <td class="num">${formatCurrency(totals.collected)}</td>
      </tr>
      <tr class="grand">
        <td>Went on the book</td>
        <td class="num ${Number(totals.outstanding) > 0 ? 'due' : 'settled'}">
          ${formatCurrency(totals.outstanding)}
        </td>
      </tr>
    </table>

    <div class="section-title">Trend</div>
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${chartWidth} ${chartHeight + 20}" preserveAspectRatio="xMinYMin meet">
      ${grid}
      ${bars}
    </svg>
    <div class="chart-legend">
      <span class="swatch collected"></span> Collected
      <span class="swatch due"></span> On the book
    </div>

    <div class="section-title">Breakdown</div>
    <table class="items">
      <thead>
        <tr>
          <th>Period</th>
          <th class="num">Bills</th>
          <th class="num">Sold</th>
          <th class="num">Collected</th>
          <th class="num">On the book</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="footer">
      Sales, not profit — this report shows turnover, not margin.
    </div>
  `;

  return wrap(`${periodLabel} sales report`, body);
};
