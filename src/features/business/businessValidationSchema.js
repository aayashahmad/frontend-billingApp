import * as Yup from 'yup';

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
  billFooterNote: '',
});

export default businessValidationSchema;
