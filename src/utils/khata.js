/**
 * Which book, and which page in it.
 *
 * Stored as one free-text string rather than two columns, because shops
 * number their books however they like — "3", "3A", "Red one", "2019-20" —
 * and a schema that insists on an integer would refuse the reference the
 * shopkeeper actually wrote on the cover. The app offers a tidy picker for
 * the common case and keeps whatever it is given.
 */

/** How many books the picker offers before the owner has to type one. */
export const KHATA_CHOICES = Array.from({ length: 12 }, (_, i) => String(i + 1));

/** "Khata 3, page 47" — the form a shopkeeper would say out loud. */
export const formatKhataRef = ({ khata, page } = {}) => {
  const book = String(khata ?? '').trim();
  const leaf = String(page ?? '').trim();

  if (book && leaf) return `Khata ${book}, page ${leaf}`;
  if (book) return `Khata ${book}`;
  if (leaf) return `Page ${leaf}`;
  return '';
};

/**
 * Reads a stored reference back into its parts, so reopening a customer
 * shows the picker on the book they were already filed under rather than
 * blank. Anything it cannot parse comes back as a free-text book, which is
 * how a hand-typed "Red ledger" survives a round trip.
 */
export const parseKhataRef = (reference) => {
  const text = String(reference ?? '').trim();
  if (!text) return { khata: '', page: '' };

  const both = /^khata\s+(.+?),\s*page\s+(.+)$/i.exec(text);
  if (both) return { khata: both[1].trim(), page: both[2].trim() };

  const bookOnly = /^khata\s+(.+)$/i.exec(text);
  if (bookOnly) return { khata: bookOnly[1].trim(), page: '' };

  const pageOnly = /^page\s+(.+)$/i.exec(text);
  if (pageOnly) return { khata: '', page: pageOnly[1].trim() };

  return { khata: text, page: '' };
};
