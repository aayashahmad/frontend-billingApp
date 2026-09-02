/**
 * Environment-driven configuration.
 *
 * Expo inlines any `EXPO_PUBLIC_*` variable from `.env` at build time, so no
 * extra dotenv dependency is needed. The fallback points at the Android
 * emulator loopback alias for the host machine (10.0.2.2); on a physical
 * device set EXPO_PUBLIC_API_BASE_URL to your machine's LAN IP.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8000';

export const API_URL = `${API_BASE_URL}/api`;

/**
 * The free hosting tier spins the server down when idle, and a cold start
 * takes the better part of a minute. At 15s every first request after a
 * quiet period failed, which read as the whole app being broken.
 */
export const API_TIMEOUT_MS = 30000;

/**
 * A cold start can outlast even that, so a timed-out read is retried once.
 * Reads only — replaying a bill or a payment could record it twice.
 */
export const API_COLD_START_RETRIES = 1;

export const SEARCH_DEBOUNCE_MS = 300;

export const MIN_SEARCH_LENGTH = 2;

/**
 * The API returns screenshot paths relative to the server root
 * (e.g. "uploads/txn_123.jpg"), which FastAPI serves as static files.
 */
export const buildUploadUrl = (relativePath) => {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  return `${API_BASE_URL}/${relativePath.replace(/^\/+/, '')}`;
};
