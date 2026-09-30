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
/**
 * The server caps a page at 500 rows; without paging, a shop passing that
 * size silently lost every row beyond the first page. The loop stops at the
 * first short page; the ceiling is a runaway guard, not an expected size.
 */
const PAGE_SIZE = 500;
const MAX_PAGES = 20;

export const listCustomers = async ({ signal } = {}) => {
  const all = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await api.get('/customers', {
      params: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      signal,
    });
    const rows = Array.isArray(data) ? data : [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
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

/**
 * Sets or clears how much a customer may owe at once.
 *
 * `limit` of null clears it, which the API needs told explicitly — an absent
 * value means "leave it alone", and the two must not be confused. A limit of
 * 0 is a real setting: cash only.
 */
export const updateCreditLimit = async (customerId, limit, { signal } = {}) => {
  const body =
    limit === null || limit === undefined
      ? { clear_credit_limit: true }
      : { credit_limit: Number(limit) };

  const { data } = await api.put(`/customers/${customerId}`, body, { signal });
  return data;
};


/**
 * What a customer already owed when the shop left its paper book.
 *
 * `amount` of null clears it — which is how a shop undoes a figure typed
 * wrong on migration day. The server applies the change as a difference, so
 * calling this twice does not double the balance.
 */
export const setOpeningBalance = async (
  customerId,
  { amount, balanceType, asOf, reference, note } = {},
  { signal } = {},
) => {
  const { data } = await api.put(
    `/customers/${customerId}/opening-balance`,
    {
      amount: amount === null || amount === undefined ? null : Number(amount),
      balance_type: balanceType ?? null,
      as_of: asOf ?? null,
      reference: reference?.trim() || null,
      note: note?.trim() || null,
    },
    { signal },
  );
  return {
    amount: data?.amount ?? null,
    balanceType: data?.balance_type ?? null,
    asOf: data?.as_of ?? null,
    reference: data?.reference ?? null,
    note: data?.note ?? null,
    totalUnpaid: Number(data?.total_unpaid ?? 0),
    advanceBalance: Number(data?.advance_balance ?? 0),
  };
};

/**
 * A whole khata at once.
 *
 * One request rather than one per customer: a shop migrating two hundred
 * customers over patchy mobile data would otherwise be halfway through when
 * the signal drops, with no way to tell which half. The server commits once.
 */
export const setOpeningBalances = async (entries, { signal } = {}) => {
  const { data } = await api.post(
    '/customers/opening-balances',
    {
      entries: entries.map((entry) => ({
        customer_id: entry.customerId,
        amount:
          entry.amount === null || entry.amount === undefined
            ? null
            : Number(entry.amount),
        balance_type: entry.balanceType ?? null,
        as_of: entry.asOf ?? null,
        reference: entry.reference?.trim() || null,
      })),
    },
    { signal },
  );
  return Number(data?.applied ?? 0);
};
