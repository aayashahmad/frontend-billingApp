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
            .moreThan(0, 'Quantity must be greater than 0'),

          rate: Yup.number()
            .transform(emptyStringToUndefined)
            .typeError('Rate must be a number')
            .required('Rate is required')
            .moreThan(0, 'Rate must be greater than 0'),
        }),
      )
      .min(1, 'Add at least one item')
      .required('Add at least one item'),

    paymentType: Yup.string()
      .required('Payment type is required')
      .oneOf(Object.values(PAYMENT_TYPES), 'Select a valid payment type'),

    amountPaid: Yup.number()
      .transform(emptyStringToUndefined)
      .when('paymentType', {
        // Cash and cheque both record an entered figure; online settles in full.
        is: (paymentType) => usesEnteredAmount(paymentType),
        then: (schema) =>
          schema
            .typeError('Amount paid must be a number')
            .required('Amount paid is required')
            .min(0, 'Amount paid cannot be negative')
            .test(
              'within-payable',
              // A customer settling old dues alongside a new purchase hands
              // over one amount covering both, so the ceiling is this bill
              // plus whatever they already owe — not the bill alone.
              'payable',
              function validateAgainstTotal(value) {
                if (allowOverpayment || value === undefined) return true;

                const billTotal = calculateItemsTotal(this.parent.items);
                // Skip until the lines are themselves valid — their own rules
                // will surface the error rather than this one.
                if (billTotal <= 0) return true;

                const outstanding = Math.max(
                  toNumber(this.parent.outstandingBalance),
                  0,
                );
                const payable = roundMoney(billTotal + outstanding);
                if (value <= payable) return true;

                return this.createError({
                  message:
                    outstanding > 0
                      ? `Amount paid cannot exceed ${formatCurrency(payable)} — this bill plus ${formatCurrency(outstanding)} already outstanding.`
                      : `Amount paid cannot exceed the bill total of ${formatCurrency(billTotal)}.`,
                });
              },
            ),
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
export const createEmptyItem = () => ({
  itemName: '',
  qty: '',
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
  amountPaid: '',
  transactionNumber: '',
  transactionScreenshot: null,
});

export default billValidationSchema;
