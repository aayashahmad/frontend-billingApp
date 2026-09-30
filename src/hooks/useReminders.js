import { useCallback, useEffect, useRef, useState } from 'react';

import { isCancelled } from '../services/api';
import {
  getDueCustomers,
  getReminderSettings,
  updateReminderSettings,
} from '../services/reminderService';
import { useBillingContext } from '../store/BillingContext';

/**
 * Who needs chasing, plus the shop's reminder settings.
 *
 * Both come from the server together because the list only makes sense
 * alongside the thresholds that produced it — a shopkeeper looking at an
 * empty list needs to see that the floor is ₹5,000, not wonder whether the
 * screen is broken.
 *
 * Refetches after any bill, since a bill can settle a balance and take
 * somebody off the list.
 */
export const useReminders = () => {
  const { lastBilledAt } = useBillingContext();
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchAll = useCallback(async (controller, { isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [due, current] = await Promise.all([
        getDueCustomers({ signal: controller?.signal }),
        getReminderSettings({ signal: controller?.signal }),
      ]);
      if (!mountedRef.current || controller?.signal.aborted) return;
      setCustomers(due);
      setSettings(current);
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
    fetchAll(controller);
    return () => controller.abort();
  }, [fetchAll, lastBilledAt]);

  const refresh = useCallback(() => {
    const controller = new AbortController();
    fetchAll(controller, { isRefresh: true });
  }, [fetchAll]);

  /**
   * Saves settings and reloads the list, because changing a threshold
   * changes who is on it — leaving the old list on screen would show the
   * owner the answer to the previous question.
   */
  const saveSettings = useCallback(
    async (values) => {
      setSaving(true);
      setError(null);
      try {
        const saved = await updateReminderSettings(values);
        if (!mountedRef.current) return null;
        setSettings(saved);
        const due = await getDueCustomers();
        if (mountedRef.current) setCustomers(due);
        return saved;
      } catch (err) {
        if (mountedRef.current && !isCancelled(err)) setError(err.message);
        return null;
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [],
  );

  /** Drops one customer from the list in place, after chasing them. */
  const dismiss = useCallback((customerId) => {
    setCustomers((current) => current.filter((row) => row.id !== customerId));
  }, []);

  return {
    customers,
    settings,
    loading,
    refreshing,
    saving,
    error,
    refresh,
    saveSettings,
    dismiss,
  };
};

export default useReminders;
