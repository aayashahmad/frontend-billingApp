import api from './api';

/**
 * Resolve a scanned barcode to a product in this shop's catalogue.
 *
 * The API answers 404 for a barcode the shop has not recorded yet, which is a
 * normal "new product" outcome rather than a failure — so it is folded into a
 * null result and only genuine errors propagate.
 */
export const getProductByBarcode = async (barcode, { signal } = {}) => {
  try {
    const { data } = await api.get(
      `/products/by-barcode/${encodeURIComponent(barcode)}`,
      { signal },
    );
    return data;
  } catch (error) {
    if (error?.isNotFound) return null;
    throw error;
  }
};

/**
 * The signed-in owner's catalogue. Scoping happens server-side from the
 * bearer token — there is no owner id to pass, and none should be passable.
 */
export const listProducts = async (query, { signal } = {}) => {
  const { data } = await api.get('/products', {
    params: query ? { q: query } : undefined,
    signal,
  });
  return Array.isArray(data) ? data : [];
};

/** Creates the product, or updates it when the barcode is already known. */
export const saveProduct = async ({ barcode, name, rate }, { signal } = {}) => {
  const { data } = await api.post(
    '/products',
    {
      barcode: String(barcode).trim(),
      name: String(name).trim(),
      rate: Number(rate),
    },
    { signal },
  );
  return data;
};

export const updateProduct = async (id, changes, { signal } = {}) => {
  const { data } = await api.put(`/products/${id}`, changes, { signal });
  return data;
};

export const deleteProduct = async (id, { signal } = {}) => {
  await api.delete(`/products/${id}`, { signal });
};

/**
 * Bulk upsert a price list.
 *
 * Sent as JSON rather than the raw file so the CSV quirks — quoting, header
 * aliases, currency symbols — are dealt with on the device, where the errors
 * can be shown against the line the owner can actually see.
 */
export const importProducts = async (rows, { signal } = {}) => {
  const { data } = await api.post('/products/import', { rows }, { signal });
  return data;
};
