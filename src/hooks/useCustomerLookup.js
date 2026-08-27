import { useCallback, useEffect, useRef, useState } from 'react';

import { PHONE_MIN_LENGTH } from '../constants/paymentTypes';
import { isCancelled } from '../services/api';
import { getCustomerByPhone } from '../services/customerService';

const IDLE_STATE = {
  customer: null,
  isNewCustomer: false,
  loading: false,
  error: null,
};

/**
 * Looks up a customer by phone as the user types.
 *
 * "Not found" is a first-class outcome (`isNewCustomer`), deliberately kept
 * separate from `error` so a brand-new customer never renders as a failure.
 */
export const useCustomerLookup = () => {
  const [state, setState] = useState(IDLE_STATE);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(IDLE_STATE);
  }, []);

  const lookup = useCallback(async (phone) => {
    const trimmed = String(phone || '').trim();

    // Only hit the API once the phone is plausibly complete.
    if (trimmed.length < PHONE_MIN_LENGTH) {
      abortRef.current?.abort();
      setState(IDLE_STATE);
      return null;
    }

    // Supersede any in-flight lookup for an older phone value.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...IDLE_STATE, loading: true });

    try {
      const customer = await getCustomerByPhone(trimmed, {
        signal: controller.signal,
      });
      if (!mountedRef.current || controller.signal.aborted) return null;

      setState({
        customer,
        isNewCustomer: customer === null,
        loading: false,
        error: null,
      });
      return customer;
    } catch (error) {
      if (!mountedRef.current || isCancelled(error)) return null;
      setState({ ...IDLE_STATE, error: error.message });
      return null;
    }
  }, []);

  return { ...state, lookup, reset };
};

export default useCustomerLookup;
