import {
  aggregateBillTotals,
  calculateBillTotal,
  calculateUnbalance,
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
