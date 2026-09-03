import * as Yup from 'yup';

import {
  PHONE_MAX_LENGTH,
  PHONE_MIN_LENGTH,
} from '../../constants/paymentTypes';

export const PASSWORD_MIN_LENGTH = 6;

/** The backend accepts either an email address or a phone number here. */
export const loginValidationSchema = Yup.object({
  login: Yup.string()
    .trim()
    .required('Email or phone number is required')
    .test(
      'email-or-phone',
      'Enter a valid email address or phone number',
      (value) => {
        if (!value) return false;
        const isPhone = /^\d{10,15}$/.test(value);
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return isPhone || isEmail;
      },
    ),
  password: Yup.string().required('Password is required'),
});

export const signupValidationSchema = Yup.object({
  username: Yup.string().trim().required('Name is required'),
  email: Yup.string()
    .trim()
    .required('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'),
  phone: Yup.string()
    .trim()
    .required('Phone number is required')
    .matches(/^\d+$/, 'Phone number must contain digits only')
    .min(PHONE_MIN_LENGTH, `Phone number must be at least ${PHONE_MIN_LENGTH} digits`)
    .max(PHONE_MAX_LENGTH, `Phone number must be at most ${PHONE_MAX_LENGTH} digits`),
  password: Yup.string()
    .required('Password is required')
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    ),
  confirmPassword: Yup.string()
    .required('Confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords do not match'),
});

export const RESET_CODE_LENGTH = 6;

/** Step one: which account is being recovered. */
export const forgotPasswordValidationSchema = Yup.object({
  phone: Yup.string()
    .trim()
    .required('Phone number is required')
    .matches(/^\d+$/, 'Phone number must contain digits only')
    .min(PHONE_MIN_LENGTH, `Phone number must be at least ${PHONE_MIN_LENGTH} digits`)
    .max(PHONE_MAX_LENGTH, `Phone number must be at most ${PHONE_MAX_LENGTH} digits`),
});

/** Step two: the emailed code, plus the password replacing the old one. */
export const resetPasswordValidationSchema = Yup.object({
  code: Yup.string()
    .trim()
    .required('Enter the code from your email')
    .matches(/^\d+$/, 'The code is digits only')
    .length(RESET_CODE_LENGTH, `The code is ${RESET_CODE_LENGTH} digits`),
  password: Yup.string()
    .required('Password is required')
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    ),
  confirmPassword: Yup.string()
    .required('Confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords do not match'),
});

/**
 * Account details form.
 *
 * `requiresPassword` is decided by the caller from whether the email or phone
 * has actually been edited — mirroring the server, which only demands the
 * password for those two fields.
 */
export const createAccountValidationSchema = ({ requiresPassword = false } = {}) =>
  Yup.object({
    username: Yup.string().trim().required('Name is required'),
    email: Yup.string()
      .trim()
      .required('Email is required')
      .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'),
    phone: Yup.string()
      .trim()
      .required('Phone number is required')
      .matches(/^\d+$/, 'Phone number must contain digits only')
      .min(PHONE_MIN_LENGTH, `Phone number must be at least ${PHONE_MIN_LENGTH} digits`)
      .max(PHONE_MAX_LENGTH, `Phone number must be at most ${PHONE_MAX_LENGTH} digits`),
    currentPassword: requiresPassword
      ? Yup.string().required('Confirm your password to change email or phone')
      : Yup.string(),
  });

export const INITIAL_FORGOT_VALUES = Object.freeze({ phone: '' });

export const INITIAL_RESET_VALUES = Object.freeze({
  code: '',
  password: '',
  confirmPassword: '',
});

export const INITIAL_LOGIN_VALUES = Object.freeze({
  login: '',
  password: '',
});

export const INITIAL_SIGNUP_VALUES = Object.freeze({
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
});
