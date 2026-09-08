import { useCallback, useEffect, useRef, useState } from 'react';

import { loadPrinter } from '../services/printerSettings';
import { printHtml, sharePdf } from '../services/printService';
import { printBytes } from '../services/thermalPrinterService';

/**
 * Wraps print / share-as-PDF with a single busy flag and error state.
 *
 * `busy` names the action in flight ('print' | 'pdf' | null) so each button
 * can show its own spinner without a second piece of state.
 */
export const useDocumentActions = () => {
  const [busy, setBusy] = useState(null);
  // Which document is working, when one hook serves a whole list. Without
  // it every row shares the single busy flag, so printing one bill spins
  // the buttons on all of them.
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(async (action, fn, key = null) => {
    setBusy(action);
    setBusyKey(key);
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
      if (mountedRef.current) {
        setBusy(null);
        setBusyKey(null);
      }
    }
  }, []);

  const print = useCallback(
    (html, key) => run('print', () => printHtml(html), key),
    [run],
  );

  const shareAsPdf = useCallback(
    (html, label, key) => run('pdf', () => sharePdf(html, label), key),
    [run],
  );

  /**
   * Sends a receipt straight to the configured Bluetooth printer.
   *
   * `buildReceipt` is a thunk taking the saved paper width, so the layout is
   * only rendered once a printer is known to be set up — and rendered for the
   * width that printer actually has.
   */
  const printToThermal = useCallback(
    (buildReceipt, key) =>
      run('thermal', async () => {
        const printer = await loadPrinter();
        if (!printer) {
          throw new Error(
            'No Bluetooth printer set up yet. Choose one under Printer in the menu.',
          );
        }
        const receipt = buildReceipt(printer.paperWidth);
        await printBytes(printer.address, receipt.toBase64());
      }, key),
    [run],
  );

  return { print, shareAsPdf, printToThermal, busy, busyKey, error, clearError };
};

export default useDocumentActions;
