import { useCallback, useEffect, useRef, useState } from 'react';

import { isCancelled } from '../services/api';
import {
  deleteProduct,
  listProducts,
  saveProduct,
  updateProduct,
} from '../services/productService';

/**
 * The owner's product catalogue, with the writes the products screen needs.
 *
 * Mutations refresh from the server rather than patching local state, so the
 * list can never drift from what a second device has written.
 */
export const useProducts = (query = '') => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const abortRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const load = useCallback(
    async (search, { background = false } = {}) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (background) setRefreshing(true);
      setError(null);

      try {
        const data = await listProducts(search, { signal: controller.signal });
        if (!mountedRef.current || controller.signal.aborted) return;
        setProducts(data);
      } catch (err) {
        if (!mountedRef.current || isCancelled(err)) return;
        setError(err.message);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    load(query);
  }, [load, query]);

  const refresh = useCallback(
    () => load(query, { background: true }),
    [load, query],
  );

  /** Wraps a write so every one reports the same way and reloads on success. */
  const runWrite = useCallback(
    async (write) => {
      setSaving(true);
      setError(null);
      try {
        await write();
        if (!mountedRef.current) return false;
        await load(query);
        return true;
      } catch (err) {
        if (!mountedRef.current || isCancelled(err)) return false;
        setError(err.message);
        return false;
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [load, query],
  );

  const create = useCallback(
    (values) => runWrite(() => saveProduct(values)),
    [runWrite],
  );

  const edit = useCallback(
    (id, changes) => runWrite(() => updateProduct(id, changes)),
    [runWrite],
  );

  const remove = useCallback(
    (id) => runWrite(() => deleteProduct(id)),
    [runWrite],
  );

  return {
    products,
    loading,
    refreshing,
    saving,
    error,
    refresh,
    create,
    edit,
    remove,
  };
};

export default useProducts;
