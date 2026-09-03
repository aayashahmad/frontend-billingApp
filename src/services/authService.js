import api from './api';

/** Backend returns `{ token, username }` for both signup and login. */
export const signup = async ({ username, email, phone, password }) => {
  const { data } = await api.post('/auth/signup', {
    username: String(username).trim(),
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim(),
    password,
  });
  return data;
};

/** Signed-in owner's profile — resolved from the bearer token server-side. */
export const getProfile = async ({ signal } = {}) => {
  const { data } = await api.get('/auth/me', { signal });
  return data;
};

/**
 * `login` accepts either an email address or a phone number.
 *
 * Lowercased to match how signup stores emails — otherwise "Owner@Shop.com"
 * would fail against the stored "owner@shop.com". Harmless for phone numbers.
 */
export const login = async ({ login: identifier, password }) => {
  const { data } = await api.post('/auth/login', {
    login: String(identifier).trim().toLowerCase(),
    password,
  });
  return data;
};

/**
 * Starts a password reset for a phone number.
 *
 * Answers the same way whether or not the number is registered, so nothing
 * here can be used to find out who has an account. `email_hint` is the masked
 * address the code was sent to, present only on a hit.
 */
export const requestPasswordReset = async (phone, { signal } = {}) => {
  const { data } = await api.post(
    '/auth/forgot-password',
    { phone: String(phone).trim() },
    { signal },
  );
  return { message: data?.message ?? '', emailHint: data?.email_hint ?? null };
};

/** Finishes the reset. Returns a session, so the owner lands signed in. */
export const resetPassword = async ({ phone, code, newPassword }, { signal } = {}) => {
  const { data } = await api.post(
    '/auth/reset-password',
    {
      phone: String(phone).trim(),
      code: String(code).trim(),
      new_password: newPassword,
    },
    { signal },
  );
  return { token: data.token, username: data.username };
};
