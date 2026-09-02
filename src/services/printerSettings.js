import * as SecureStore from 'expo-secure-store';

import { DEFAULT_PAPER_WIDTH, PAPER_WIDTHS } from '../features/printing/escpos';

const KEY = 'billing.printer';

/**
 * The chosen printer, remembered between sessions.
 *
 * SecureStore rather than a new storage dependency — the app already relies
 * on it for the session, and this is one small record. Every accessor
 * degrades to "no printer configured" rather than throwing, matching how
 * tokenStorage handles a locked keychain.
 */
export const loadPrinter = async () => {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw);
    if (!saved?.address) return null;

    return {
      address: saved.address,
      name: saved.name || saved.address,
      // A width written by an older build, or edited by hand, must not put
      // the receipt layout into an unknown column count.
      paperWidth: PAPER_WIDTHS[saved.paperWidth]
        ? saved.paperWidth
        : DEFAULT_PAPER_WIDTH,
    };
  } catch {
    return null;
  }
};

export const savePrinter = async (printer) => {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(printer));
    return true;
  } catch {
    return false;
  }
};

export const clearPrinter = async () => {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing stored.
  }
};
