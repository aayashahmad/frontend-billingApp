import * as Yup from 'yup';

import {
  PAYMENT_TYPES,
  PHONE_MAX_LENGTH,
  PHONE_MIN_LENGTH,
} from '../../constants/paymentTypes';
import { calculateBillTotal } from '../../utils/billing';

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

    paymentType: Yup.string()
      .required('Payment type is required')
      .oneOf(Object.values(PAYMENT_TYPES), 'Select a valid payment type'),

    amountPaid: Yup.number()
      .transform(emptyStringToUndefined)
      .when('paymentType', {
        is: PAYMENT_TYPES.CASH,
        then: (schema) =>
          schema
            .typeError('Amount paid must be a number')
            .required('Amount paid is required')
            .min(0, 'Amount paid cannot be negative')
            .test(
              'within-bill-total',
              'Amount paid cannot exceed the bill total',
              function validateAgainstTotal(value) {
                if (allowOverpayment || value === undefined) return true;
                const { qty, rate } = this.parent;
                const billTotal = calculateBillTotal(qty, rate);
                // Skip until qty/rate are themselves valid — their own rules
                // will surface the error rather than this one.
                if (billTotal <= 0) return true;
                return value <= billTotal;
              },
            ),
        otherwise: (schema) => schema.notRequired(),
      }),

    transactionNumber: Yup.string().when('paymentType', {
      is: PAYMENT_TYPES.ONLINE,
      then: (schema) =>
        schema.trim().required('Transaction number is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

    transactionScreenshot: Yup.mixed().when('paymentType', {
      is: PAYMENT_TYPES.ONLINE,
      then: (schema) =>
        schema
          .required('Transaction screenshot is required')
          .test(
            'is-image-asset',
            'Attach a valid image',
            (value) => Boolean(value?.uri),
          ),
      otherwise: (schema) => schema.notRequired(),
    }),
  });

export const billValidationSchema = createBillValidationSchema();

export const INITIAL_BILL_VALUES = Object.freeze({
  phone: '',
  customerName: '',
  itemName: '',
  qty: '',
  rate: '',
  paymentType: PAYMENT_TYPES.CASH,
  amountPaid: '',
  transactionNumber: '',
  transactionScreenshot: null,
});

export default billValidationSchema;
