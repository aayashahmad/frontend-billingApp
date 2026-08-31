import { useCallback, useEffect, useRef, useState } from 'react';

import { isCancelled } from '../services/api';
import { recordPayment } from '../services/paymentService';
import { useBillingContext } from '../store/BillingContext';

/**
 * Records a payment against a customer's dues.
 *
 * Publishes the customer summary the same way a new bill does, so the lists
 * showing a running balance pick up the settlement without a manual refresh.
 */
export const useRecordPayment = () => {
  const { publishCustomerSummary } = useBillingContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const submitPayment = useCallback(
    async (customer, values) => {
      setSubmitting(true);
      setError(null);

      try {
        const payment = await recordPayment(customer.id, values);
        if (!mountedRef.current) return null;

        // The API returns the payment, not the customer, so the new balance
        // is derived here rather than guessed by each caller.
        const remaining = Math.max(
          Number(customer.total_unpaid || 0) - Number(values.amount || 0),
          0,
        );
        publishCustomerSummary({ ...customer, total_unpaid: remaining });

        return payment;
      } catch (err) {
        if (!mountedRef.current || isCancelled(err)) return null;
        setError(err.message);
        return null;
      } finally {
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [publishCustomerSummary],
  );

  return { submitPayment, submitting, error, clearError };
};

export default useRecordPayment;
