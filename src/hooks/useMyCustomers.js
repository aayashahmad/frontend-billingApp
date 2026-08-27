import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isCancelled } from '../services/api';
import { listCustomers } from '../services/customerService';
import { useBillingContext } from '../store/BillingContext';
import { roundMoney, toNumber } from '../utils/money';

/**
 * The signed-in owner's customer book.
 *
 * Refetches whenever a bill is created anywhere in the app (`lastBilledAt`),
 * so a newly billed customer appears without a manual pull-to-refresh.
 */
export const useMyCustomers = () => {
  const { lastBilledAt } = useBillingContext();
  const [customers, setCustomers] = useState([]);
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

  const fetchCustomers = useCallback(async (controller, { isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await listCustomers({ signal: controller?.signal });
      if (!mountedRef.current || controller?.signal.aborted) return;
      setCustomers(data);
    } catch (err) {
      if (!mountedRef.current || isCancelled(err)) return;
      setError(err.message);
    } finally {
      if (mountedRef.current && !controller?.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomers(controller);
    return () => controller.abort();
  }, [fetchCustomers, lastBilledAt]);

  const refresh = useCallback(() => {
    const controller = new AbortController();
    return fetchCustomers(controller, { isRefresh: true });
  }, [fetchCustomers]);

  const totals = useMemo(
    () =>
      customers.reduce(
        (acc, customer) => ({
          billed: roundMoney(acc.billed + toNumber(customer.total_amount)),
          outstanding: roundMoney(
            acc.outstanding + toNumber(customer.total_unpaid),
          ),
          owing: acc.owing + (toNumber(customer.total_unpaid) > 0 ? 1 : 0),
        }),
        { billed: 0, outstanding: 0, owing: 0 },
      ),
    [customers],
  );

  return { customers, totals, loading, refreshing, error, refresh };
};

export default useMyCustomers;
