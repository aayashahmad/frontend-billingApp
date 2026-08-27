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

export const API_TIMEOUT_MS = 15000;

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
