import api from './api';

/**
 * Look up a customer by phone.
 *
 * The API answers 404 for an unknown phone, which is a normal "new customer"
 * outcome rather than a failure — so it is folded into a null result and only
 * genuine errors propagate.
 */
export const getCustomerByPhone = async (phone, { signal } = {}) => {
  try {
    const { data } = await api.get(
      `/customers/by-phone/${encodeURIComponent(phone)}`,
      { signal },
    );
    return data;
  } catch (error) {
    if (error?.isNotFound) return null;
    throw error;
  }
};

/**
 * Every customer belonging to the signed-in owner.
 *
 * Scoping happens server-side from the bearer token — there is no owner id to
 * pass, and none should be passable.
 */
export const listCustomers = async ({ signal } = {}) => {
  const { data } = await api.get('/customers', { signal });
  return Array.isArray(data) ? data : [];
};

export const searchCustomers = async (query, { signal } = {}) => {
  const { data } = await api.get('/customers/search', {
    params: { q: query },
    signal,
  });
  return Array.isArray(data) ? data : [];
};

export const getCustomerById = async (customerId, { signal } = {}) => {
  const { data } = await api.get(`/customers/${customerId}`, { signal });
  return data;
};
