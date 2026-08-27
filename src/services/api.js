import axios from 'axios';

import { API_TIMEOUT_MS, API_URL } from '../constants/config';

export const HTTP_STATUS = Object.freeze({
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

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
);

export const isCancelled = (error) => Boolean(error?.isCancelled);

export default api;
