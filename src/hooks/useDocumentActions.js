import { useCallback, useEffect, useRef, useState } from 'react';

import { printHtml, sharePdf } from '../services/printService';

/**
 * Wraps print / share-as-PDF with a single busy flag and error state.
 *
 * `busy` names the action in flight ('print' | 'pdf' | null) so each button
 * can show its own spinner without a second piece of state.
 */
export const useDocumentActions = () => {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(async (action, fn) => {
    setBusy(action);
    setError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      // A cancelled print/share sheet rejects too — not worth surfacing.
      const message = err?.message || '';
      if (!/cancel/i.test(message)) {
        setError(message || 'Could not produce the document.');
      }
      return false;
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  }, []);

  const print = useCallback(
    (html) => run('print', () => printHtml(html)),
    [run],
  );

  const shareAsPdf = useCallback(
    (html, label) => run('pdf', () => sharePdf(html, label)),
    [run],
  );

  return { print, shareAsPdf, busy, error, clearError };
};

export default useDocumentActions;
