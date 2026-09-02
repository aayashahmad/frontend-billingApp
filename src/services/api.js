import axios from 'axios';

import {
  API_COLD_START_RETRIES,
  API_TIMEOUT_MS,
  API_URL,
} from '../constants/config';

export const HTTP_STATUS = Object.freeze({
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  UNPROCESSABLE: 422,
});

const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

/** FastAPI validation errors arrive as `detail: [{loc, msg}]`. */
const readDetail = (detail) => {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => entry?.msg)
      .filter(Boolean)
      .join(', ');
  }
  return null;
};

/**
 * Auth token holder.
 *
 * Kept as module state rather than read from AuthContext so the axios
 * instance never imports React state — the context pushes the token down,
 * which also avoids a circular import between api.js and AuthContext.
 */
let authToken = null;
let onUnauthorized = null;

export const setAuthToken = (token) => {
  authToken = token || null;
};

/** Registered by AuthContext so an expired token logs the user out. */
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

/**
 * Auth headers for consumers that bypass axios.
 *
 * React Native's <Image> fetches its own URL, so it never passes through the
 * request interceptor — it needs the bearer token handed to it directly.
 */
export const getAuthHeaders = () =>
  authToken ? { Authorization: `Bearer ${authToken}` } : undefined;

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export class ApiError extends Error {
  constructor(message, { status = null, isNetworkError = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }

  get isNotFound() {
    return this.status === HTTP_STATUS.NOT_FOUND;
  }

  get isUnauthorized() {
    return this.status === HTTP_STATUS.UNAUTHORIZED;
  }
}

/**
 * Normalise every axios failure into a single ApiError shape so screens render
 * one consistent error state instead of digging through axios internals.
 */
export const toApiError = (error) => {
  if (error instanceof ApiError) return error;

  if (axios.isCancel?.(error) || error?.code === 'ERR_CANCELED') {
    const cancelled = new ApiError('Request cancelled');
    cancelled.isCancelled = true;
    return cancelled;
  }

  if (error?.response) {
    const { status, data } = error.response;
    const message =
      readDetail(data?.detail) ||
      data?.message ||
      `Request failed (${status}). Please try again.`;
    return new ApiError(message, { status });
  }

  if (error?.request) {
    return new ApiError(
      'Cannot reach the server. Check your connection and try again.',
      { isNetworkError: true },
    );
  }

  return new ApiError(error?.message || 'Something went wrong.');
};

/**
 * Whether a failure is worth one more attempt.
 *
 * Only timeouts and connection failures, and only on reads. A POST that
 * timed out may well have been received and applied, so replaying it could
 * write a second bill or take a payment twice.
 */
const isRetryableColdStart = (error, config) => {
  const method = String(config?.method || 'get').toLowerCase();
  if (method !== 'get') return false;
  if (config?.signal?.aborted) return false;

  return (
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    (!error?.response && Boolean(error?.request))
  );
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;

    if (
      config &&
      !axios.isCancel?.(error) &&
      error?.code !== 'ERR_CANCELED' &&
      isRetryableColdStart(error, config)
    ) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < API_COLD_START_RETRIES) {
        config.__retryCount += 1;
        // The first attempt is what wakes a sleeping instance; by the time
        // this one lands it is usually serving.
        return api.request(config);
      }
    }

    const apiError = toApiError(error);
    // A rejected token means the stored session is dead — drop it so the app
    // returns to the login screen instead of retrying with a stale token.
    if (apiError.isUnauthorized) onUnauthorized?.();
    return Promise.reject(apiError);
  },
);

export const isCancelled = (error) => Boolean(error?.isCancelled);

export default api;
