import { PAYMENT_TYPES } from '../../../constants/paymentTypes';
import {
  buildBillReceiptHtml,
  buildCustomerStatementHtml,
  buildLetterhead,
  escapeHtml,
} from '../documentTemplates';

const owner = {
  username: 'Demo Shop',
  email: 'demo@shop.com',
  phone: '9000000001',
};

const customer = { id: 1, name: 'Asha Traders', phone: '9876543210' };

const cashBill = {
  id: 7,
  item_name: 'Cement bag',
  qty: 4,
  rate: 250,
  bill_total: 1000,
  payment_type: PAYMENT_TYPES.CASH,
  amount_paid: 400,
  unbalance: 600,
  created_at: '2026-08-25T10:00:00',
};

const onlineBill = {
  id: 8,
  item_name: 'Steel rod',
  qty: 2,
  rate: 300,
  bill_total: 600,
  payment_type: PAYMENT_TYPES.ONLINE,
  amount_paid: null,
  unbalance: null,
  transaction_number: 'UTR-9001',
  created_at: '2026-08-25T11:00:00',
};

/** Three lines on one bill, as the API returns them post-migration. */
const multiItemBill = {
  id: 9,
  // The flat columns mirror the first line, exactly as the API writes them.
  item_name: 'Cement bag',
  qty: 10,
  rate: 400,
  bill_total: 4950,
  payment_type: PAYMENT_TYPES.CASH,
  amount_paid: 1000,
  unbalance: 3950,
  created_at: '2026-08-25T12:00:00',
  items: [
    { id: 1, item_name: 'Cement bag', qty: 10, rate: 400, line_total: 4000, position: 0 },
    { id: 2, item_name: 'Steel rod', qty: 2, rate: 250, line_total: 500, position: 1 },
    { id: 3, item_name: 'Paint tin', qty: 3, rate: 150, line_total: 450, position: 2 },
  ],
};

const business = {
  username: 'Demo Shop',
  email: 'demo@shop.com',
  phone: '9000000001',
  business_name: 'Demo Hardware & Paints',
  business_address: '14 Market Road, Lal Chowk\nSrinagar, J&K 190001',
  business_email: 'billing@demohardware.in',
  business_phone: '+91 194 2345678',
  business_alt_phone: '+91 98765 43210',
  registration_number: 'GSTIN 01ABCDE1234F1Z5',
  bill_footer_note: 'Goods once sold will not be taken back.',
};

describe('buildLetterhead', () => {
  it('prefers business fields over account fields', () => {
    const head = buildLetterhead(business);
    expect(head.name).toBe('Demo Hardware & Paints');
    expect(head.email).toBe('billing@demohardware.in');
    expect(head.phones).toEqual(['+91 194 2345678', '+91 98765 43210']);
    expect(head.registrationNumber).toBe('GSTIN 01ABCDE1234F1Z5');
  });

  it('falls back to account details when unset', () => {
    const head = buildLetterhead(owner);
    expect(head.name).toBe('Demo Shop');
    expect(head.email).toBe('demo@shop.com');
    expect(head.phones).toEqual(['9000000001']);
    expect(head.addressLines).toEqual([]);
  });

  it('splits the address into printable lines and drops blanks', () => {
    const head = buildLetterhead({
      ...business,
      business_address: 'Line A\n\n  Line B  \n',
    });
    expect(head.addressLines).toEqual(['Line A', 'Line B']);
  });

  it('de-duplicates a repeated contact number', () => {
    const head = buildLetterhead({
      ...business,
      business_alt_phone: '+91 194 2345678',
    });
    expect(head.phones).toEqual(['+91 194 2345678']);
  });

  it('handles a completely empty owner', () => {
    const head = buildLetterhead(null);
    expect(head.name).toBe('Billing');
    expect(head.phones).toEqual([]);
    expect(head.addressLines).toEqual([]);
  });
});

describe('business details on documents', () => {
  it('prints the full letterhead on a receipt', () => {
    const html = buildBillReceiptHtml({ bill: cashBill, customer, owner: business });
    expect(html).toContain('Demo Hardware &amp; Paints');
    expect(html).toContain('14 Market Road, Lal Chowk');
    expect(html).toContain('Srinagar, J&amp;K 190001');
    expect(html).toContain('billing@demohardware.in');
    expect(html).toContain('+91 194 2345678');
    expect(html).toContain('Reg. No: GSTIN 01ABCDE1234F1Z5');
  });

  it('prints the custom footer note on a receipt', () => {
    const html = buildBillReceiptHtml({ bill: cashBill, customer, owner: business });
    expect(html).toContain('Goods once sold will not be taken back.');
    expect(html).not.toContain('Thank you for your business.');
  });

  it('prints the full letterhead on a statement', () => {
    const html = buildCustomerStatementHtml({
      customer,
      bills: [cashBill],
      owner: business,
    });
    expect(html).toContain('Demo Hardware &amp; Paints');
    expect(html).toContain('Reg. No: GSTIN 01ABCDE1234F1Z5');
    expect(html).toContain('Goods once sold will not be taken back.');
  });

  it('falls back to a default footer when no note is set', () => {
    const html = buildBillReceiptHtml({ bill: cashBill, customer, owner });
    expect(html).toContain('Thank you for your business.');
  });

  it('omits the Reg. No line entirely when unset', () => {
    const html = buildBillReceiptHtml({ bill: cashBill, customer, owner });
    expect(html).not.toContain('Reg. No');
  });
});

describe('escapeHtml', () => {
  it('escapes every HTML-significant character', () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe(
      '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;',
    );
  });

  it('renders null and undefined as an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('keeps ordinary text intact', () => {
    expect(escapeHtml('Asha Traders')).toBe('Asha Traders');
  });
});

describe('buildBillReceiptHtml', () => {
  it('produces a complete HTML document', () => {
    const html = buildBillReceiptHtml({ bill: cashBill, customer, owner });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('</html>');
  });

  it('includes the shop, customer and item details', () => {
    const html = buildBillReceiptHtml({ bill: cashBill, customer, owner });
    expect(html).toContain('Demo Shop');
    expect(html).toContain('demo@shop.com');
    expect(html).toContain('Asha Traders');
    expect(html).toContain('9876543210');
    expect(html).toContain('Cement bag');
  });

  it('shows the outstanding balance for a partly paid cash bill', () => {
    const html = buildBillReceiptHtml({ bill: cashBill, customer, owner });
    expect(html).toContain('600.00');
    expect(html).toContain('class="num due"');
  });

  it('treats an online bill as settled and shows its reference', () => {
    const html = buildBillReceiptHtml({ bill: onlineBill, customer, owner });
    expect(html).toContain('UTR-9001');
    expect(html).toContain('class="num settled"');
  });

  it('omits the transaction row for a cash bill', () => {
    const html = buildBillReceiptHtml({ bill: cashBill, customer, owner });
    expect(html).not.toContain('Transaction ref');
  });

  it('escapes injected markup in customer names', () => {
    const html = buildBillReceiptHtml({
      bill: cashBill,
      customer: { ...customer, name: '<img src=x onerror=alert(1)>' },
      owner,
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});

describe('buildCustomerStatementHtml', () => {
  const bills = [onlineBill, cashBill];

  it('lists every bill', () => {
    const html = buildCustomerStatementHtml({ customer, bills, owner });
    expect(html).toContain('Cement bag');
    expect(html).toContain('Steel rod');
    expect(html).toContain('Bill history (2)');
  });

  it('totals billed and outstanding across the bills', () => {
    const html = buildCustomerStatementHtml({ customer, bills, owner });
    // 1000 + 600 billed, only the cash bill's 600 outstanding.
    expect(html).toContain('1,600.00');
    expect(html).toContain('600.00');
  });

  it('renders an empty state when the customer has no bills', () => {
    const html = buildCustomerStatementHtml({ customer, bills: [], owner });
    expect(html).toContain('No bills recorded for this customer yet.');
    expect(html).toContain('Bill history (0)');
  });

  it('defaults bills to an empty list', () => {
    const html = buildCustomerStatementHtml({ customer, owner });
    expect(html).toContain('Bill history (0)');
  });

  it('escapes injected markup in the owner name', () => {
    const html = buildCustomerStatementHtml({
      customer,
      bills,
      owner: { ...owner, username: '<b>x</b>' },
    });
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('multi-item bills', () => {
  it('prints a receipt row for every line, with its qty and rate', () => {
    const html = buildBillReceiptHtml({
      bill: multiItemBill,
      customer,
      owner,
    });

    for (const name of ['Cement bag', 'Steel rod', 'Paint tin']) {
      expect(html).toContain(name);
    }
    // Each line's own rate and amount, not just the bill total.
    expect(html).toContain('₹250.00');
    expect(html).toContain('₹450.00');
    expect(html).toContain('₹4,950.00');
  });

  it('falls back to the flat columns for a bill written before line items', () => {
    const html = buildBillReceiptHtml({ bill: cashBill, customer, owner });
    expect(html).toContain('Cement bag');
    expect(html).toContain('₹1,000.00');
  });

  it('breaks every line out in the statement with its qty and rate', () => {
    const html = buildCustomerStatementHtml({
      customer,
      bills: [multiItemBill],
      owner,
      issuedAt: 'Aug 25, 2026',
    });

    for (const name of ['Cement bag', 'Steel rod', 'Paint tin']) {
      expect(html).toContain(name);
    }
    expect(html).toContain('2 × ₹250.00 = ₹500.00');
    expect(html).toContain('3 × ₹150.00 = ₹450.00');
  });

  it('sums the quantity column across the lines', () => {
    const html = buildCustomerStatementHtml({
      customer,
      bills: [multiItemBill],
      owner,
      issuedAt: 'Aug 25, 2026',
    });
    // 10 + 2 + 3
    expect(html).toContain('>15</td>');
  });
});

describe('bill payment details', () => {
  const owner = {
    business_name: 'Ashu Kirana Store',
    business_address: '12 Market Road\nSrinagar, JK 190001',
    business_phone: '9906123456',
    gstin: '01AAPFU0939F1ZV',
    upi_id: 'ashubhat@okaxis',
    bank_account_name: 'Ashu Bhat',
    bank_account_number: '50100123456789',
    bank_ifsc: 'HDFC0001234',
    whatsapp_number: '9906123456',
    bill_footer_note: 'Goods once sold will not be taken back.',
  };

  const bill = {
    id: 12,
    payment_type: 'cash',
    amount_paid: 500,
    bill_total: 835,
    unbalance: 335,
    created_at: '2026-09-03T10:00:00',
    items: [
      { item_name: 'Rice 5kg', qty: 2, rate: 350, line_total: 700, position: 0 },
      { item_name: 'Sugar 1kg', qty: 3, rate: 45, line_total: 135, position: 1 },
    ],
  };

  const customer = { name: 'Ravi Kumar', phone: '9811100003' };

  it('prints GSTIN and WhatsApp in the letterhead', () => {
    const html = buildBillReceiptHtml({ bill, customer, owner });
    expect(html).toContain('GSTIN: 01AAPFU0939F1ZV');
    expect(html).toContain('WhatsApp: 99061 23456');
  });

  it('prints a scannable UPI QR carrying the amount still due', () => {
    const html = buildBillReceiptHtml({ bill, customer, owner });
    expect(html).toContain('How to pay');
    expect(html).toContain('Scan to pay by UPI');
    expect(html).toContain('<svg');
    expect(html).toContain('ashubhat@okaxis');
    // Write the rendered bill out so the layout can be eyeballed.
    require('fs').writeFileSync('/tmp/bill-preview.html', html);
  });

  it('prints the bank account and IFSC together', () => {
    const html = buildBillReceiptHtml({ bill, customer, owner });
    expect(html).toContain('50100123456789');
    expect(html).toContain('HDFC0001234');
    expect(html).toContain('Ashu Bhat');
  });

  it('omits the whole block once the bill is settled', () => {
    const settled = { ...bill, amount_paid: 835, unbalance: 0 };
    const html = buildBillReceiptHtml({ bill: settled, customer, owner });
    expect(html).not.toContain('How to pay');
    expect(html).not.toContain('Scan to pay by UPI');
  });

  it('omits bank rows when the shop has given no account', () => {
    const noBank = { ...owner, bank_account_number: '', bank_ifsc: '' };
    const html = buildBillReceiptHtml({ bill, customer, owner: noBank });
    // The UPI half still stands on its own.
    expect(html).toContain('Scan to pay by UPI');
    expect(html).not.toContain('IFSC');
  });

  it('prints nothing extra for a shop that filled in neither', () => {
    const bare = { business_name: 'Corner Shop' };
    const html = buildBillReceiptHtml({ bill, customer, owner: bare });
    expect(html).not.toContain('How to pay');
    expect(html).not.toContain('GSTIN');
  });
});
