import {
  netBalance,
  settleWithAdvance,
  aggregateBillTotals,
  billItems,
  calculateBillTotal,
  calculateItemsTotal,
  calculateUnbalance,
  outstandingAfterPayments,
  sumPayments,
} from '../billing';
import { PAYMENT_TYPES } from '../../constants/paymentTypes';

describe('calculateBillTotal', () => {
  it('multiplies quantity by rate', () => {
    expect(calculateBillTotal(3, 250)).toBe(750);
  });

  it('accepts numeric strings from text inputs', () => {
    expect(calculateBillTotal('4', '12.50')).toBe(50);
  });

  it('rounds to two decimals without float drift', () => {
    expect(calculateBillTotal(3, 0.1)).toBe(0.3);
  });

  it('treats blank and non-numeric input as zero', () => {
    expect(calculateBillTotal('', 100)).toBe(0);
    expect(calculateBillTotal('abc', 100)).toBe(0);
  });
});

describe('calculateUnbalance', () => {
  it('returns the outstanding amount on a partial payment', () => {
    expect(calculateUnbalance(1000, 400)).toBe(600);
  });

  it('returns 0 when the bill is paid in full', () => {
    expect(calculateUnbalance(1000, 1000)).toBe(0);
  });

  it('returns the full total when nothing was paid', () => {
    expect(calculateUnbalance(1000, 0)).toBe(1000);
    expect(calculateUnbalance(1000, '')).toBe(1000);
    expect(calculateUnbalance(1000, null)).toBe(1000);
  });

  it('clamps overpayment to 0 instead of a negative balance', () => {
    expect(calculateUnbalance(1000, 1200)).toBe(0);
  });

  it('handles decimal amounts without float drift', () => {
    expect(calculateUnbalance(0.3, 0.1)).toBe(0.2);
    expect(calculateUnbalance(99.99, 49.99)).toBe(50);
  });

  it('accepts numeric strings', () => {
    expect(calculateUnbalance('1000', '250.5')).toBe(749.5);
  });
});

describe('aggregateBillTotals', () => {
  const cashBill = (billTotal, amountPaid) => ({
    bill_total: billTotal,
    amount_paid: amountPaid,
    payment_type: PAYMENT_TYPES.CASH,
  });

  it('returns zeroes for an empty history', () => {
    expect(aggregateBillTotals([])).toEqual({ totalAmount: 0, totalUnpaid: 0 });
    expect(aggregateBillTotals()).toEqual({ totalAmount: 0, totalUnpaid: 0 });
  });

  it('sums totals and outstanding balances across cash bills', () => {
    expect(aggregateBillTotals([cashBill(1000, 400), cashBill(500, 500)])).toEqual({
      totalAmount: 1500,
      totalUnpaid: 600,
    });
  });

  it('counts online bills as settled in full', () => {
    const bills = [
      { bill_total: 800, payment_type: PAYMENT_TYPES.ONLINE, amount_paid: null, unbalance: null },
      cashBill(200, 50),
    ];
    expect(aggregateBillTotals(bills)).toEqual({
      totalAmount: 1000,
      totalUnpaid: 150,
    });
  });
});

describe('calculateItemsTotal', () => {
  it('sums every line', () => {
    expect(
      calculateItemsTotal([
        { qty: '10', rate: '400' },
        { qty: '2', rate: '250' },
      ]),
    ).toBe(4500);
  });

  it('rounds to currency precision', () => {
    expect(calculateItemsTotal([{ qty: '3', rate: '10.335' }])).toBe(31.01);
  });

  it('treats a missing or empty list as zero', () => {
    expect(calculateItemsTotal(undefined)).toBe(0);
    expect(calculateItemsTotal([])).toBe(0);
  });
});

describe('billItems', () => {
  it('returns the line items when the bill has them', () => {
    const items = [{ id: 7, item_name: 'Cement', qty: 2, rate: 500, line_total: 1000 }];
    expect(billItems({ id: 1, items })).toBe(items);
  });

  it('synthesises a line from the flat columns of a pre-multi-item bill', () => {
    expect(billItems({ id: 4, item_name: 'Cement', qty: 2, rate: 500 })).toEqual([
      {
        id: '4-0',
        item_name: 'Cement',
        qty: 2,
        rate: 500,
        line_total: 1000,
        position: 0,
      },
    ]);
  });

  it('returns nothing for a bill with neither', () => {
    expect(billItems({ id: 9 })).toEqual([]);
    expect(billItems(null)).toEqual([]);
  });
});

describe('payments against dues', () => {
  const payments = [{ amount: 400 }, { amount: '600.50' }];

  it('sums what has been received', () => {
    expect(sumPayments(payments)).toBe(1000.5);
    expect(sumPayments([])).toBe(0);
    expect(sumPayments(undefined)).toBe(0);
  });

  it('takes payments off the balance derived from bills', () => {
    expect(outstandingAfterPayments(1000, [{ amount: 400 }])).toBe(600);
  });

  it('never reports a negative balance', () => {
    expect(outstandingAfterPayments(100, [{ amount: 500 }])).toBe(0);
  });

  it('leaves the balance alone when nothing has been paid', () => {
    expect(outstandingAfterPayments(750, [])).toBe(750);
  });
});

describe('settleWithAdvance', () => {
  it('lets credit settle the bill before the customer is asked for anything', () => {
    const result = settleWithAdvance({
      billTotal: 400,
      amountPaid: 0,
      advanceBalance: 650,
    });
    expect(result.advanceApplied).toBe(400);
    expect(result.balanceDue).toBe(0);
    // The rest stays as credit rather than being swallowed by this bill.
    expect(result.advanceRemaining).toBe(250);
  });

  it('covers what it can when the advance is smaller than the bill', () => {
    const result = settleWithAdvance({
      billTotal: 500,
      amountPaid: 0,
      advanceBalance: 350,
    });
    expect(result.advanceApplied).toBe(350);
    expect(result.balanceDue).toBe(150);
    expect(result.advanceRemaining).toBe(0);
  });

  it('counts cash handed over alongside the advance', () => {
    const result = settleWithAdvance({
      billTotal: 1000,
      amountPaid: 400,
      advanceBalance: 300,
    });
    expect(result.balanceDue).toBe(300);
  });

  it('never returns a negative balance when both together exceed the bill', () => {
    const result = settleWithAdvance({
      billTotal: 200,
      amountPaid: 500,
      advanceBalance: 900,
    });
    expect(result.balanceDue).toBe(0);
  });

  it('behaves like an ordinary bill when there is no advance', () => {
    expect(
      settleWithAdvance({ billTotal: 800, amountPaid: 500 }),
    ).toEqual({ advanceApplied: 0, balanceDue: 300, advanceRemaining: 0 });
  });

  it('ignores rubbish input rather than producing NaN money', () => {
    const result = settleWithAdvance({
      billTotal: '400',
      amountPaid: null,
      advanceBalance: undefined,
    });
    expect(result.balanceDue).toBe(400);
    expect(Number.isNaN(result.advanceApplied)).toBe(false);
  });
});

describe('netBalance', () => {
  it('is negative when the customer owes the shop', () => {
    expect(netBalance({ total_unpaid: 1000, advance_balance: 0 })).toBe(-1000);
  });

  it('is positive when the shop holds their money', () => {
    expect(netBalance({ total_unpaid: 0, advance_balance: 300 })).toBe(300);
  });

  it('is zero for a settled customer', () => {
    expect(netBalance({ total_unpaid: 0, advance_balance: 0 })).toBe(0);
    expect(netBalance({})).toBe(0);
    expect(netBalance(null)).toBe(0);
  });

  it('ignores negative stored values rather than compounding them', () => {
    expect(netBalance({ total_unpaid: -50, advance_balance: 100 })).toBe(100);
  });
});

describe('settleWithAdvance — pay later', () => {
  it('puts the bill on the account after credit covers what it can', () => {
    // The case that showed nothing on screen: a large bill, a small credit.
    const result = settleWithAdvance({
      billTotal: 77600,
      amountPaid: 0,
      advanceBalance: 650,
    });
    expect(result.advanceApplied).toBe(650);
    expect(result.balanceDue).toBe(76950);
  });

  it('leaves nothing owing when credit covers the whole bill', () => {
    const result = settleWithAdvance({
      billTotal: 500,
      amountPaid: 0,
      advanceBalance: 500,
    });
    expect(result.balanceDue).toBe(0);
    expect(result.advanceRemaining).toBe(0);
  });
});
