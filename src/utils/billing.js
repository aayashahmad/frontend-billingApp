import { PAYMENT_TYPES } from '../constants/paymentTypes';
import { roundMoney, toNumber } from './money';

/** billTotal = qty × rate, rounded to currency precision. */
export const calculateBillTotal = (qty, rate) =>
  roundMoney(toNumber(qty) * toNumber(rate));

/**
 * Outstanding amount on a bill.
 *
 * Only cash bills can carry a balance — an online bill is settled in full by
 * definition, so it always returns 0. Overpayment is clamped to 0 rather than
 * returned as a negative balance, since a negative "due" would corrupt the
 * customer's running unpaid total.
 */
export const calculateUnbalance = (billTotal, amountPaid) => {
  const due = roundMoney(toNumber(billTotal) - toNumber(amountPaid));
  return due > 0 ? due : 0;
};

export const isOnlinePayment = (paymentType) =>
  paymentType === PAYMENT_TYPES.ONLINE;

export const isCashPayment = (paymentType) => paymentType === PAYMENT_TYPES.CASH;

export const isChequePayment = (paymentType) =>
  paymentType === PAYMENT_TYPES.CHEQUE;

/**
 * Whether this payment type carries a reference number and supporting image.
 * True for online transfers (UTR + screenshot) and cheques (number + photo).
 */
export const hasPaymentReference = (paymentType) =>
  isOnlinePayment(paymentType) || isChequePayment(paymentType);

/**
 * Whether the amount paid is entered by the user rather than implied.
 *
 * Online transfers settle the bill in full, so the amount is derived. Cash and
 * cheque are both entered — a cheque is frequently written for part of the
 * balance, and it can bounce, so recording the figure is more truthful than
 * assuming full settlement.
 */
export const usesEnteredAmount = (paymentType) =>
  isCashPayment(paymentType) || isChequePayment(paymentType);

/**
 * Per-bill view model. The API stores `amount_paid`/`unbalance` as null for
 * online bills; normalise them here so list items never branch on null.
 */
export const summariseBill = (bill) => {
  const billTotal = toNumber(bill?.bill_total);
  if (isOnlinePayment(bill?.payment_type)) {
    return { billTotal, amountPaid: billTotal, unbalance: 0 };
  }
  const amountPaid = toNumber(bill?.amount_paid);
  return {
    billTotal,
    amountPaid,
    unbalance: calculateUnbalance(billTotal, amountPaid),
  };
};

/** Aggregate totals derived from bills — used to keep the header in sync. */
export const aggregateBillTotals = (bills = []) =>
  bills.reduce(
    (acc, bill) => {
      const { billTotal, unbalance } = summariseBill(bill);
      return {
        totalAmount: roundMoney(acc.totalAmount + billTotal),
        totalUnpaid: roundMoney(acc.totalUnpaid + unbalance),
      };
    },
    { totalAmount: 0, totalUnpaid: 0 },
  );
