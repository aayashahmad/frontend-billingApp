import { EscPosBuilder, columnsFor, PAPER_WIDTHS } from '../escpos';
import { buildBillReceipt, buildTestReceipt, printAmount } from '../thermalReceipt';
import { PAYMENT_TYPES } from '../../../constants/paymentTypes';

/** The printable text, with control bytes dropped, for asserting on layout. */
const textOf = (builder) => {
  const bytes = builder.toBytes();
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (b === 0x1b || b === 0x1d) {
      // ESC/GS sequences used here are 2 or 3 bytes long after the marker.
      i += bytes[i + 1] === 0x56 ? 3 : 2;
      continue;
    }
    out += b === 0x0a ? '\n' : String.fromCharCode(b);
  }
  return out;
};

describe('paper widths', () => {
  it('maps width to column count', () => {
    expect(columnsFor('58')).toBe(32);
    expect(columnsFor('80')).toBe(48);
  });

  it('falls back to 58mm for an unknown width', () => {
    expect(columnsFor('99')).toBe(32);
    expect(columnsFor(undefined)).toBe(32);
  });

  it('offers both widths', () => {
    expect(Object.keys(PAPER_WIDTHS)).toEqual(['58', '80']);
  });
});

describe('EscPosBuilder', () => {
  it('rules the full paper width', () => {
    expect(textOf(new EscPosBuilder('58').rule()).trim()).toHaveLength(32);
    expect(textOf(new EscPosBuilder('80').rule()).trim()).toHaveLength(48);
  });

  it('pushes the value hard against the right margin', () => {
    const line = textOf(new EscPosBuilder('58').row('Total', 'Rs 100.00')).trim();
    expect(line).toHaveLength(32);
    expect(line.startsWith('Total')).toBe(true);
    expect(line.endsWith('Rs 100.00')).toBe(true);
  });

  it('truncates the label rather than the amount when space runs out', () => {
    const line = textOf(
      new EscPosBuilder('58').row('A very long label indeed here', 'Rs 1,234.00'),
    );
    expect(line.trim()).toHaveLength(32);
    // The figure survives intact; the label gives way.
    expect(line).toContain('Rs 1,234.00');
  });

  it('wraps on spaces, never mid-word', () => {
    const out = textOf(
      new EscPosBuilder('58').wrap('Sunfeast Moms Magic Cashew and Almond Biscuits 250g'),
    );
    const lines = out.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(32));
    expect(out.replace(/\n/g, ' ')).toContain('Cashew and Almond');
  });

  it('replaces characters the printer cannot render', () => {
    // The rupee sign is outside Latin-1 and would print as a stray glyph.
    expect(textOf(new EscPosBuilder().text('₹100'))).toBe('?100');
  });

  it('encodes to base64', () => {
    expect(typeof new EscPosBuilder().init().toBase64()).toBe('string');
    expect(new EscPosBuilder().init().toBase64().length).toBeGreaterThan(0);
  });
});

describe('printAmount', () => {
  it('uses Rs, not a rupee sign the printer cannot render', () => {
    expect(printAmount(100)).toBe('Rs 100.00');
  });

  it('groups in the Indian style', () => {
    expect(printAmount(1234.5)).toBe('Rs 1,234.50');
    expect(printAmount(1234567)).toBe('Rs 12,34,567.00');
  });

  it('handles zero and strings', () => {
    expect(printAmount(0)).toBe('Rs 0.00');
    expect(printAmount('45.5')).toBe('Rs 45.50');
  });
});

describe('buildBillReceipt', () => {
  const owner = { business_name: 'Ashu Store', business_phone: '9876543210' };
  const customer = { name: 'Asha Traders', phone: '9876543210' };
  const bill = {
    id: 12,
    created_at: '2026-09-02T10:00:00',
    payment_type: PAYMENT_TYPES.CASH,
    bill_total: 4950,
    amount_paid: 1000,
    item_name: 'Cement bag',
    qty: 10,
    rate: 400,
    items: [
      { id: 1, item_name: 'Cement bag', qty: 10, rate: 400, line_total: 4000 },
      { id: 2, item_name: 'Steel rod', qty: 2, rate: 250, line_total: 500 },
      { id: 3, item_name: 'Paint tin', qty: 3, rate: 150, line_total: 450 },
    ],
  };

  it('prints the shop name, every item and the totals', () => {
    const out = textOf(buildBillReceipt({ bill, customer, owner }));
    expect(out).toContain('Ashu Store');
    expect(out).toContain('Cement bag');
    expect(out).toContain('Steel rod');
    expect(out).toContain('Paint tin');
    expect(out).toContain('Rs 4,950.00');
    expect(out).toContain('Asha Traders');
  });

  it('shows quantity and rate under each item', () => {
    const out = textOf(buildBillReceipt({ bill, customer, owner }));
    expect(out).toContain('10 x Rs 400.00');
    expect(out).toContain('2 x Rs 250.00');
  });

  it('never exceeds the paper width', () => {
    ['58', '80'].forEach((width) => {
      const out = textOf(buildBillReceipt({ bill, customer, owner, paperWidth: width }));
      const columns = columnsFor(width);
      out
        .split('\n')
        .forEach((line) => expect(line.length).toBeLessThanOrEqual(columns));
    });
  });

  it('falls back to the flat columns for a pre-multi-item bill', () => {
    const { items, ...flat } = bill;
    const out = textOf(buildBillReceipt({ bill: flat, customer, owner }));
    expect(out).toContain('Cement bag');
  });

  it('prints the reference for an online bill', () => {
    const online = {
      ...bill,
      payment_type: PAYMENT_TYPES.ONLINE,
      transaction_number: 'UTR-9001',
    };
    expect(textOf(buildBillReceipt({ bill: online, customer, owner }))).toContain(
      'UTR-9001',
    );
  });

  it('omits the reference row for a cash bill', () => {
    expect(textOf(buildBillReceipt({ bill, customer, owner }))).not.toContain('Ref');
  });
});

describe('buildTestReceipt', () => {
  it('states the configured width and stays inside it', () => {
    const out = textOf(buildTestReceipt({ owner: { business_name: 'Ashu Store' }, paperWidth: '80' }));
    expect(out).toContain('80 mm');
    expect(out).toContain('48');
    out.split('\n').forEach((line) => expect(line.length).toBeLessThanOrEqual(48));
  });
});

describe('qr', () => {
  const bytesOf = (builder) =>
    Array.from(Buffer.from(builder.toBase64(), 'base64'));

  it('emits the four ESC/POS setup commands then prints', () => {
    const bytes = bytesOf(new EscPosBuilder().qr('upi://pay?pa=shop@ybl'));
    const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');

    // Select model 2, module size, error correction, store, print.
    expect(hex).toContain('1d 28 6b 04 00 31 41 32 00');
    expect(hex).toContain('1d 28 6b 03 00 31 43');
    expect(hex).toContain('1d 28 6b 03 00 31 45 31');
    expect(hex).toContain('1d 28 6b 03 00 31 51 30');
  });

  it('sets the stored length to the payload plus the three header bytes', () => {
    const payload = 'upi://pay?pa=shop@ybl&pn=Shop&cu=INR';
    const bytes = bytesOf(new EscPosBuilder().qr(payload));

    // Find the store command and read its little-endian length.
    let index = -1;
    for (let i = 0; i < bytes.length - 7; i += 1) {
      if (
        bytes[i] === 0x1d && bytes[i + 1] === 0x28 && bytes[i + 2] === 0x6b &&
        bytes[i + 5] === 0x31 && bytes[i + 6] === 0x50
      ) {
        index = i;
        break;
      }
    }
    expect(index).toBeGreaterThan(-1);
    const length = bytes[index + 3] + (bytes[index + 4] << 8);
    expect(length).toBe(payload.length + 3);
  });

  it('clamps the module size to what the command accepts', () => {
    const big = bytesOf(new EscPosBuilder().qr('x', { size: 99 }));
    const sizeIndex = big.findIndex(
      (b, i) => b === 0x31 && big[i + 1] === 0x43,
    );
    expect(big[sizeIndex + 2]).toBe(16);
  });

  it('writes nothing at all for an empty payload', () => {
    expect(new EscPosBuilder().qr('').toBase64()).toBe('');
  });
});
