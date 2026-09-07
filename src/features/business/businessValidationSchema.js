import * as Yup from 'yup';

import { isValidGstin, isValidIfsc, isValidUpiId } from '../../utils/upi';

/**
 * Letterhead validation.
 *
 * Only the business name is required — everything else is optional, but must
 * be well-formed if supplied, since it is printed on documents customers keep.
 */
export const businessValidationSchema = Yup.object({
  businessName: Yup.string()
    .trim()
    .required('Business name is required')
    .max(120, 'Business name is too long for the bill header'),

  businessAddress: Yup.string()
    .trim()
    .max(300, 'Address is too long for the bill header'),

  businessEmail: Yup.string()
    .trim()
    .test('optional-email', 'Enter a valid email address', (value) =>
      !value ? true : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    ),

  businessPhone: Yup.string()
    .trim()
    .test('optional-phone', 'Enter a valid contact number', (value) =>
      !value ? true : /^[\d+()\s-]{6,20}$/.test(value),
    ),

  businessAltPhone: Yup.string()
    .trim()
    .test('optional-phone', 'Enter a valid contact number', (value) =>
      !value ? true : /^[\d+()\s-]{6,20}$/.test(value),
    ),

  registrationNumber: Yup.string()
    .trim()
    .max(60, 'Registration number is too long'),

  // Every one of these is printed on a bill a customer keeps, and three of
  // them are official identifiers — a typo in an IFSC sends money nowhere,
  // and a malformed GSTIN on a tax invoice is a compliance problem.
  gstin: Yup.string()
    .trim()
    .test('optional-gstin', 'Enter a valid 15-character GSTIN', (value) =>
      !value ? true : isValidGstin(value),
    ),

  upiId: Yup.string()
    .trim()
    .test('optional-upi', 'Enter a valid UPI ID, like shop@okaxis', (value) =>
      !value ? true : isValidUpiId(value),
    ),

  bankAccountName: Yup.string()
    .trim()
    .max(150, 'Account holder name is too long'),

  bankAccountNumber: Yup.string()
    .trim()
    .test('optional-account', 'Account number should be 9 to 18 digits', (value) =>
      !value ? true : /^\d{9,18}$/.test(value.replace(/\s/g, '')),
    ),

  bankIfsc: Yup.string()
    .trim()
    .test('optional-ifsc', 'Enter a valid IFSC, like SBIN0125620', (value) =>
      !value ? true : isValidIfsc(value),
    ),

  whatsappNumber: Yup.string()
    .trim()
    .test('optional-whatsapp', 'Enter a valid WhatsApp number', (value) =>
      !value ? true : /^\d{10,15}$/.test(value.replace(/\D/g, '')),
    ),

  billFooterNote: Yup.string()
    .trim()
    .max(200, 'Footer note is too long for the bill'),
});

export const INITIAL_BUSINESS_VALUES = Object.freeze({
  businessName: '',
  businessAddress: '',
  businessEmail: '',
  businessPhone: '',
  businessAltPhone: '',
  registrationNumber: '',
  gstin: '',
  upiId: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  whatsappNumber: '',
  billFooterNote: '',
});

export default businessValidationSchema;
