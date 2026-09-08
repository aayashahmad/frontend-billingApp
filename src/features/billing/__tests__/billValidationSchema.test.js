import { PAYMENT_TYPES } from '../../../constants/paymentTypes';
import {
  INITIAL_BILL_VALUES,
  billValidationSchema,
  createBillValidationSchema,
} from '../billValidationSchema';

const validCashBill = {
  ...INITIAL_BILL_VALUES,
  phone: '9876543210',
  customerName: 'Asha Traders',
  items: [{ itemName: 'Cement bag', qty: '10', rate: '400' }],
  paymentType: PAYMENT_TYPES.CASH,
  amountPaid: '2000',
};

const validOnlineBill = {
  ...INITIAL_BILL_VALUES,
  phone: '9876543210',
  customerName: 'Asha Traders',
  items: [{ itemName: 'Cement bag', qty: '2', rate: '400' }],
  paymentType: PAYMENT_TYPES.ONLINE,
  transactionNumber: 'UTR123456',
  transactionScreenshot: { uri: 'file:///tmp/txn.jpg', mimeType: 'image/jpeg' },
};

/** Collect every failing field so assertions read as a set, not first-error. */
const errorPaths = async (values, schema = billValidationSchema) => {
  try {
    await schema.validate(values, { abortEarly: false });
    return [];
  } catch (error) {
    return error.inner.map((issue) => issue.path).sort();
  }
};

describe('billValidationSchema — shared fields', () => {
  it('accepts a fully valid cash bill', async () => {
    await expect(errorPaths(validCashBill)).resolves.toEqual([]);
  });

  it('accepts a fully valid online bill', async () => {
    await expect(errorPaths(validOnlineBill)).resolves.toEqual([]);
  });

  it('rejects the untouched initial values', async () => {
    const paths = await errorPaths(INITIAL_BILL_VALUES);
    expect(paths).toEqual(
      expect.arrayContaining([
        'phone',
        'customerName',
        'items[0].itemName',
        // Quantity is absent: it starts at 1, which is what a shopkeeper
        // ringing up a single item would have typed anyway.
        'items[0].rate',
        'amountPaid',
      ]),
    );
  });

  it.each([
    ['empty', ''],
    ['too short', '12345'],
    ['non-numeric', '98765abcde'],
  ])('rejects a %s phone number', async (_label, phone) => {
    const paths = await errorPaths({ ...validCashBill, phone });
    expect(paths).toContain('phone');
  });

  it('requires an item name', async () => {
    const paths = await errorPaths({
      ...validCashBill,
      items: [{ itemName: '   ', qty: '10', rate: '400' }],
    });
    expect(paths).toContain('items[0].itemName');
  });

  it('requires at least one item', async () => {
    const paths = await errorPaths({ ...validCashBill, items: [] });
    expect(paths).toContain('items');
  });

  it('validates every item, not just the first', async () => {
    const paths = await errorPaths({
      ...validCashBill,
      items: [
        { itemName: 'Cement bag', qty: '10', rate: '400' },
        { itemName: '', qty: '0', rate: '' },
      ],
      amountPaid: '0',
    });
    expect(paths).toEqual(
      expect.arrayContaining([
        'items[1].itemName',
        'items[1].qty',
        'items[1].rate',
      ]),
    );
  });

  it('accepts a bill with several valid items', async () => {
    await expect(
      errorPaths({
        ...validCashBill,
        items: [
          { itemName: 'Cement bag', qty: '10', rate: '400' },
          { itemName: 'Steel rod', qty: '2', rate: '250' },
        ],
        // 10x400 + 2x250 = 4500
        amountPaid: '4500',
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['zero', '0'],
    ['negative', '-3'],
    ['fractional', '1.5'],
    ['blank', ''],
  ])('rejects a %s quantity', async (_label, qty) => {
    const paths = await errorPaths({
      ...validCashBill,
      items: [{ itemName: 'Cement bag', qty, rate: '400' }],
      amountPaid: '0',
    });
    expect(paths).toContain('items[0].qty');
  });

  it('rejects an unknown payment type', async () => {
    // 'cheque' used to stand in for an invalid type here; it is a supported
    // type now, so this needs a value that genuinely is not one.
    const paths = await errorPaths({
      ...validCashBill,
      paymentType: 'barter',
    });
    expect(paths).toContain('paymentType');
  });
});

describe('billValidationSchema — cash bills', () => {
  it('requires amountPaid', async () => {
    const paths = await errorPaths({ ...validCashBill, amountPaid: '' });
    expect(paths).toContain('amountPaid');
  });

  it('allows a zero payment (fully unpaid bill)', async () => {
    await expect(
      errorPaths({ ...validCashBill, amountPaid: '0' }),
    ).resolves.toEqual([]);
  });

  it('rejects a negative payment', async () => {
    const paths = await errorPaths({ ...validCashBill, amountPaid: '-1' });
    expect(paths).toContain('amountPaid');
  });

  it('accepts a payment larger than the bill, which becomes advance', async () => {
    // qty 10 × rate 400 = 4000, summed across the item list. Handing over
    // more than the bill is ordinary — the surplus settles old dues and then
    // becomes credit, and the server decides where it lands.
    await expect(
      errorPaths({ ...validCashBill, amountPaid: '4001' }),
    ).resolves.toEqual([]);
  });

  it('accepts a payment exactly equal to the bill total', async () => {
    await expect(
      errorPaths({ ...validCashBill, amountPaid: '4000' }),
    ).resolves.toEqual([]);
  });

  it('allows paying more than the bill when the customer owes more', async () => {
    // Owes 900, buys 100 more, hands over 1000 to settle everything.
    await expect(
      errorPaths({
        ...validCashBill,
        items: [{ itemName: 'It1', qty: '1', rate: '100' }],
        outstandingBalance: 900,
        amountPaid: '1000',
      }),
    ).resolves.toEqual([]);
  });

  it('accepts more than the bill and every due — the rest is advance', async () => {
    await expect(
      errorPaths({
        ...validCashBill,
        items: [{ itemName: 'It1', qty: '1', rate: '100' }],
        outstandingBalance: 900,
        amountPaid: '1001',
      }),
    ).resolves.toEqual([]);
  });

  it('does not demand an amount when the advance covers the bill', async () => {
    // Typing 0 to say "their own credit paid for it" is friction for the
    // commonest use of an advance.
    await expect(
      errorPaths({
        ...validCashBill,
        items: [{ itemName: 'It1', qty: '1', rate: '100' }],
        advanceBalance: 500,
        amountPaid: '',
      }),
    ).resolves.toEqual([]);
  });

  it('still demands an amount when the advance falls short', async () => {
    const paths = await errorPaths({
      ...validCashBill,
      items: [{ itemName: 'It1', qty: '1', rate: '500' }],
      advanceBalance: 100,
      amountPaid: '',
    });
    expect(paths).toContain('amountPaid');
  });

  it('allows overpayment when the schema is built with allowOverpayment', async () => {
    const schema = createBillValidationSchema({ allowOverpayment: true });
    await expect(
      errorPaths({ ...validCashBill, amountPaid: '5000' }, schema),
    ).resolves.toEqual([]);
  });

  it('ignores online-only fields', async () => {
    const paths = await errorPaths({
      ...validCashBill,
      transactionNumber: '',
      transactionScreenshot: null,
    });
    expect(paths).toEqual([]);
  });
});

describe('billValidationSchema — online bills', () => {
  it('requires a transaction number', async () => {
    const paths = await errorPaths({
      ...validOnlineBill,
      transactionNumber: '',
    });
    expect(paths).toContain('transactionNumber');
  });

  it('requires a transaction screenshot', async () => {
    const paths = await errorPaths({
      ...validOnlineBill,
      transactionScreenshot: null,
    });
    expect(paths).toContain('transactionScreenshot');
  });

  it('rejects a screenshot without a uri', async () => {
    const paths = await errorPaths({
      ...validOnlineBill,
      transactionScreenshot: { fileName: 'txn.jpg' },
    });
    expect(paths).toContain('transactionScreenshot');
  });

  it('blocks submission when both online fields are missing', async () => {
    const paths = await errorPaths({
      ...validOnlineBill,
      transactionNumber: '',
      transactionScreenshot: null,
    });
    expect(paths).toEqual(
      expect.arrayContaining(['transactionNumber', 'transactionScreenshot']),
    );
  });

  it('does not require amountPaid', async () => {
    const paths = await errorPaths({ ...validOnlineBill, amountPaid: '' });
    expect(paths).not.toContain('amountPaid');
  });
});

describe('cheque payments', () => {
  const chequeBill = {
    phone: '9876543210',
    customerName: 'Asha Traders',
    items: [{ itemName: 'Cement', qty: '2', rate: '500' }],
    paymentType: PAYMENT_TYPES.CHEQUE,
    amountPaid: '600',
    transactionNumber: 'CHQ-100234',
    transactionScreenshot: { uri: 'file://cheque.jpg' },
  };

  const paths = async (values) => {
    try {
      await billValidationSchema.validate(values, { abortEarly: false });
      return [];
    } catch (error) {
      return [...new Set(error.inner.map((issue) => issue.path))].sort();
    }
  };

  it('accepts a complete cheque bill', async () => {
    await expect(paths(chequeBill)).resolves.toEqual([]);
  });

  it('requires the cheque number', async () => {
    const result = await paths({ ...chequeBill, transactionNumber: '' });
    expect(result).toContain('transactionNumber');
  });

  it('requires the cheque image', async () => {
    const result = await paths({ ...chequeBill, transactionScreenshot: null });
    expect(result).toContain('transactionScreenshot');
  });

  it('requires an amount paid, unlike an online transfer', async () => {
    const result = await paths({ ...chequeBill, amountPaid: '' });
    expect(result).toContain('amountPaid');
  });

  it('allows a partial cheque amount', async () => {
    // 2 x 500 = 1000 billed, cheque written for 600.
    await expect(paths({ ...chequeBill, amountPaid: '600' })).resolves.toEqual([]);
  });

  it('accepts a cheque above the bill total — the rest is advance', async () => {
    // Cheques are written for round figures all the time; the surplus is
    // credit, not an error.
    await expect(
      paths({ ...chequeBill, amountPaid: '1500' }),
    ).resolves.toEqual([]);
  });
});
