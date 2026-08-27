/**
 * Trailing-edge debounce. The returned function exposes `cancel()` so callers
 * can drop a pending invocation on unmount.
 */
export const debounce = (fn, delay) => {
  let timeoutId = null;

  const debounced = (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
  };

  return debounced;
};
