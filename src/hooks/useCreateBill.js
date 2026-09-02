import { useCallback, useEffect, useRef, useState } from 'react';

import { createBill } from '../services/billService';
import { isCancelled } from '../services/api';
import { useBillingContext } from '../store/BillingContext';

/**
 * Submits a bill and publishes the returned customer summary so other screens
 * pick up the new running totals without a manual refresh.
 */
export const useCreateBill = () => {
  const { publishCustomerSummary } = useBillingContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // A ref, not state: a double-tap fires the second call before the
  // `submitting` re-render commits, and a duplicate POST writes a second
  // bill the server cannot tell apart from the first.
  const inFlightRef = useRef(false);

  const submitBill = useCallback(
    async (values) => {
      if (inFlightRef.current) return null;
      inFlightRef.current = true;
      setSubmitting(true);
      setError(null);

      try {
        const result = await createBill(values);
        if (!mountedRef.current) return null;
        publishCustomerSummary(result?.customer);
        setLastResult(result);
        return result;
      } catch (err) {
        if (!mountedRef.current || isCancelled(err)) return null;
        setError(err.message);
        return null;
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [publishCustomerSummary],
  );

  return { submitBill, submitting, error, clearError, lastResult };
};

export default useCreateBill;
