/**
 * Backend timestamps are naive UTC — no offset suffix. `new Date` would read
 * them as local time, shifting every bill and payment by the timezone offset
 * (5h30 in India). Tag them as UTC before parsing; strings that already carry
 * an offset are left alone.
 */
const NAIVE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export const ensureUtc = (value) =>
  typeof value === 'string' && NAIVE_ISO.test(value) ? `${value}Z` : value;

export const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(ensureUtc(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
