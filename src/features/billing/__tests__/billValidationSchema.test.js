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
  itemName: 'Cement bag',
  qty: '10',
  rate: '400',
  paymentType: PAYMENT_TYPES.CASH,
  amountPaid: '2000',
};

const validOnlineBill = {
  ...INITIAL_BILL_VALUES,
  phone: '9876543210',
  customerName: 'Asha Traders',
  itemName: 'Cement bag',
  qty: '2',
  rate: '400',
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
        'itemName',
        'qty',
        'rate',
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
    const paths = await errorPaths({ ...validCashBill, itemName: '   ' });
    expect(paths).toContain('itemName');
  });

  it.each([
    ['zero', '0'],
    ['negative', '-3'],
    ['fractional', '1.5'],
    ['blank', ''],
  ])('rejects a %s quantity', async (_label, qty) => {
    const paths = await errorPaths({ ...validCashBill, qty, amountPaid: '0' });
    expect(paths).toContain('qty');
  });

  it('rejects an unknown payment type', async () => {
    const paths = await errorPaths({
      ...validCashBill,
      paymentType: 'cheque',
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

  it('rejects a payment larger than the bill total', async () => {
    // qty 10 × rate 400 = 4000
    const paths = await errorPaths({ ...validCashBill, amountPaid: '4001' });
    expect(paths).toContain('amountPaid');
  });

  it('accepts a payment exactly equal to the bill total', async () => {
    await expect(
      errorPaths({ ...validCashBill, amountPaid: '4000' }),
    ).resolves.toEqual([]);
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
