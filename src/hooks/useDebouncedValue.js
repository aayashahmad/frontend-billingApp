import { useEffect, useState } from 'react';

/** Returns `value` only after it has stopped changing for `delay` ms. */
export const useDebouncedValue = (value, delay) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
