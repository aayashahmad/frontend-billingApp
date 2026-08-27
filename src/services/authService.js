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
