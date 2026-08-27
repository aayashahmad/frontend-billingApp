import { useCallback, useEffect, useRef, useState } from 'react';

import { isCancelled } from '../services/api';
import { getCustomerById } from '../services/customerService';
import { useBillingContext } from '../store/BillingContext';

/**
 * Full customer profile with bill history.
 *
 * Refetches whenever a bill is created anywhere in the app (`lastBilledAt`)
 * so the totals shown here never go stale behind a new bill.
 */
export const useCustomerDetail = (customerId) => {
  const { lastBilledAt } = useBillingContext();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchCustomer = useCallback(
    async (controller, { isRefresh = false } = {}) => {
      if (!customerId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await getCustomerById(customerId, {
          signal: controller?.signal,
        });
        if (!mountedRef.current || controller?.signal.aborted) return;
        setCustomer(data);
      } catch (err) {
        if (!mountedRef.current || isCancelled(err)) return;
        setError(err.message);
      } finally {
        if (mountedRef.current && !controller?.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [customerId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomer(controller);
    return () => controller.abort();
  }, [fetchCustomer, lastBilledAt]);

  const refresh = useCallback(() => {
    const controller = new AbortController();
    return fetchCustomer(controller, { isRefresh: true });
  }, [fetchCustomer]);

  return { customer, loading, refreshing, error, refresh };
};

export default useCustomerDetail;
