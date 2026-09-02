/**
 * Public barcode → product-name lookup, used only when the shop's own
 * catalogue does not know a scanned code.
 *
 * Open Food Facts is the only genuinely free option: its data is released
 * under the Open Database Licence and explicitly permits commercial use,
 * where Go-UPC, Barcode Lookup and EAN-Search are all paid, and UPCitemdb's
 * free tier returned nothing for Indian barcodes.
 *
 * Two limits worth knowing, because they shape how this is used:
 *
 *  - it carries NO price. Prices are per-shop and must come from the owner,
 *    so this fills the item name only and leaves the rate blank.
 *  - it covers food and drink only, and Indian coverage is partial. A miss
 *    is the normal case, not an error.
 */

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';

// Open Food Facts asks every client to identify itself; requests without a
// custom User-Agent risk being treated as a bot and blocked.
// Replace the address with a real contact you are happy to publish.
const USER_AGENT = 'BillingApp/1.0 (support@billingapp.local)';

// The scan should never sit waiting on a third party — the owner can always
// type the name faster than a slow lookup returns.
const TIMEOUT_MS = 4000;

/** Only the fields we use, so the response stays small. */
const FIELDS = 'product_name,brands';

/**
 * Returns `{ name, attribution }` for a known barcode, or null.
 *
 * Never throws: a failed or missing lookup is an ordinary outcome and must
 * not interrupt a sale.
 */
export const lookupPublicProduct = async (barcode) => {
  const code = String(barcode || '').trim();
  if (!code) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `${BASE_URL}/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data?.status !== 1) return null;

    const name = String(data.product?.product_name || '').trim();
    if (!name) return null;

    const brand = String(data.product?.brands || '').split(',')[0].trim();

    return {
      // Brand first reads the way a shopkeeper would say it aloud.
      name: brand && !name.toLowerCase().includes(brand.toLowerCase())
        ? `${brand} ${name}`
        : name,
      attribution: 'Open Food Facts',
    };
  } catch {
    // Offline, timed out, rate-limited — all the same to the caller.
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export default lookupPublicProduct;
