import * as Yup from 'yup';

import {
  PAYMENT_TYPES,
  PHONE_MAX_LENGTH,
  PHONE_MIN_LENGTH,
} from '../../constants/paymentTypes';
import {
  calculateItemsTotal,
  hasPaymentReference,
  usesEnteredAmount,
} from '../../utils/billing';
import { formatCurrency, roundMoney, toNumber } from '../../utils/money';

/** Yup coerces '' to NaN for number fields; map it to undefined instead. */
const emptyStringToUndefined = (value, originalValue) =>
  typeof originalValue === 'string' && originalValue.trim() === ''
    ? undefined
    : value;

export const createBillValidationSchema = ({ allowOverpayment = false } = {}) =>
  Yup.object({
    phone: Yup.string()
      .trim()
      .required('Phone number is required')
      .matches(/^\d+$/, 'Phone number must contain digits only')
      .min(PHONE_MIN_LENGTH, `Phone number must be at least ${PHONE_MIN_LENGTH} digits`)
      .max(PHONE_MAX_LENGTH, `Phone number must be at most ${PHONE_MAX_LENGTH} digits`),

    customerName: Yup.string().trim().required('Customer name is required'),

    // One bill can carry several lines. Every line is validated the same way
    // the single item used to be.
    items: Yup.array()
      .of(
        Yup.object({
          itemName: Yup.string().trim().required('Item name is required'),

          qty: Yup.number()
            .transform(emptyStringToUndefined)
            .typeError('Quantity must be a number')
            .required('Quantity is required')
            .integer('Quantity must be a whole number')
            .moreThan(0, 'Quantity must be greater than 0')
            // Beyond this the maths silently loses precision — a 20-digit
            // quantity used to pass validation and corrupt the totals.
            .max(1000000, 'Quantity is too large'),

          rate: Yup.number()
            .transform(emptyStringToUndefined)
            .typeError('Rate must be a number')
            .required('Rate is required')
            .moreThan(0, 'Rate must be greater than 0')
            .max(10000000, 'Rate is too large'),
        }),
      )
      .min(1, 'Add at least one item')
      // Mirrors the server's MAX_BILL_ITEMS, which rejects longer bills.
      .max(50, 'A bill can have at most 50 items')
      .required('Add at least one item'),

    paymentType: Yup.string()
      .required('Payment type is required')
      .oneOf(Object.values(PAYMENT_TYPES), 'Select a valid payment type'),

    amountPaid: Yup.number()
      .transform(emptyStringToUndefined)
      .when('paymentType', {
        // Cash and cheque both record an entered figure; online settles in
        // full and "pay later" receives nothing at all.
        is: (paymentType) => usesEnteredAmount(paymentType),
        then: (schema) =>
          schema
            .typeError('Amount paid must be a number')
            .min(0, 'Amount paid cannot be negative')
            .test(
              'required-unless-covered-by-advance',
              'Amount paid is required',
              function requireUnlessCovered(value) {
                if (value !== undefined) return true;

                // Nothing to hand over when the customer's own credit already
                // covers the bill — asking them to type 0 is friction for the
                // commonest use of an advance.
                const billTotal = calculateItemsTotal(this.parent.items);
                const advance = Math.max(
                  toNumber(this.parent.advanceBalance),
                  0,
                );
                return advance >= billTotal && billTotal > 0;
              },
            ),
        // No ceiling: handing over more than the bill is ordinary, and the
        // surplus settles old dues and then becomes credit. The server is
        // the authority on where it lands.
        otherwise: (schema) => schema.notRequired(),
      }),

    // Shared by online (UTR) and cheque (cheque number); the message names
    // whichever the user actually picked.
    transactionNumber: Yup.string().when('paymentType', {
      is: (paymentType) => hasPaymentReference(paymentType),
      then: (schema) =>
        schema.trim().when('paymentType', {
          is: PAYMENT_TYPES.CHEQUE,
          then: (inner) => inner.required('Cheque number is required'),
          otherwise: (inner) => inner.required('Transaction number is required'),
        }),
      otherwise: (schema) => schema.notRequired(),
    }),

    transactionScreenshot: Yup.mixed().when('paymentType', {
      is: (paymentType) => hasPaymentReference(paymentType),
      then: (schema) =>
        schema
          .required('Attach a photo of the payment')
          .test(
            'is-image-asset',
            'Attach a valid image',
            (value) => Boolean(value?.uri),
          ),
      otherwise: (schema) => schema.notRequired(),
    }),
  });

export const billValidationSchema = createBillValidationSchema();

/** A blank line item — also what the "Add item" button appends. */
/**
 * A fresh line.
 *
 * Quantity starts at 1: a shopkeeper ringing up a single item should not have
 * to type the most common answer, and an empty box invites a bill of zero.
 */
export const createEmptyItem = () => ({
  itemName: '',
  qty: '1',
  rate: '',
  // Set when the line was scanned. `isNewProduct` marks a barcode the
  // catalogue did not know, which is what the form saves after the sale.
  barcode: '',
  isNewProduct: false,
});

export const INITIAL_BILL_VALUES = Object.freeze({
  phone: '',
  customerName: '',
  items: [createEmptyItem()],
  paymentType: PAYMENT_TYPES.CASH,
  // Filled in from the customer lookup. Not sent to the API — it only raises
  // the ceiling on what the customer is allowed to hand over.
  outstandingBalance: 0,
  // Credit the customer already holds, filled in from the lookup. Not sent
  // to the API — the server reads it from the customer record — but it
  // decides whether an amount has to be entered at all.
  advanceBalance: 0,
  amountPaid: '',
  transactionNumber: '',
  transactionScreenshot: null,
});

export default billValidationSchema;
