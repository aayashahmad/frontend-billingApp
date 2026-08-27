import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const BillingContext = createContext(null);

/**
 * Holds the customer summaries returned by the most recent lookups and bill
 * submissions, keyed by customer id.
 *
 * Creating a bill mutates the customer's running totals server-side. Rather
 * than have every screen poll, the submitting screen publishes the fresh
 * summary here and the detail/search screens read it as an immediately
 * correct override while their own fetch settles.
 */
export const BillingProvider = ({ children }) => {
  const [customerSummaries, setCustomerSummaries] = useState({});
  const [lastBilledAt, setLastBilledAt] = useState(null);

  const publishCustomerSummary = useCallback((customer) => {
    if (!customer?.id) return;
    setCustomerSummaries((current) => ({ ...current, [customer.id]: customer }));
    setLastBilledAt(Date.now());
  }, []);

  const getCustomerSummary = useCallback(
    (customerId) => customerSummaries[customerId] ?? null,
    [customerSummaries],
  );

  const value = useMemo(
    () => ({
      customerSummaries,
      publishCustomerSummary,
      getCustomerSummary,
      lastBilledAt,
    }),
    [customerSummaries, publishCustomerSummary, getCustomerSummary, lastBilledAt],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
};

export const useBillingContext = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBillingContext must be used inside a BillingProvider');
  }
  return context;
};
