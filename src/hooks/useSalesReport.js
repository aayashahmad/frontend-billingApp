import { useCallback, useEffect, useRef, useState } from 'react';

import { isCancelled } from '../services/api';
import { getSalesSummary } from '../services/reportService';

/** Sales figures for one period, refetched when the period changes. */
export const useSalesReport = (period) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchReport = useCallback(
    async (controller) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSalesSummary(period, { signal: controller?.signal });
        if (!mountedRef.current || controller?.signal.aborted) return;
        setReport(data);
      } catch (err) {
        if (!mountedRef.current || isCancelled(err)) return;
        setError(err.message);
      } finally {
        if (mountedRef.current && !controller?.signal.aborted) setLoading(false);
      }
    },
    [period],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchReport(controller);
    return () => controller.abort();
  }, [fetchReport]);

  const refresh = useCallback(() => {
    const controller = new AbortController();
    return fetchReport(controller);
  }, [fetchReport]);

  return { report, loading, error, refresh };
};

export default useSalesReport;
