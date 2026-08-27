import { useEffect, useRef, useState } from 'react';

import { MIN_SEARCH_LENGTH, SEARCH_DEBOUNCE_MS } from '../constants/config';
import { isCancelled } from '../services/api';
import { searchCustomers } from '../services/customerService';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Debounced search over name or phone.
 *
 * `hasSearched` lets the screen tell "nothing typed yet" apart from
 * "searched and genuinely found nothing", which are different empty states.
 */
export const useCustomerSearch = (query) => {
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const trimmed = String(debouncedQuery || '').trim();

    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setError(null);
      setLoading(false);
      setHasSearched(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const data = await searchCustomers(trimmed, {
          signal: controller.signal,
        });
        if (!mountedRef.current || controller.signal.aborted) return;
        setResults(data);
        setHasSearched(true);
      } catch (err) {
        if (!mountedRef.current || isCancelled(err)) return;
        setResults([]);
        setError(err.message);
        setHasSearched(true);
      } finally {
        if (mountedRef.current && !controller.signal.aborted) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [debouncedQuery]);

  return { results, loading, error, hasSearched };
};

export default useCustomerSearch;
