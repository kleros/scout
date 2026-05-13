import { useState, useCallback, useRef } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  onWriteError?: (error: unknown) => void,
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const onWriteErrorRef = useRef(onWriteError);
  onWriteErrorRef.current = onWriteError;

  const setValue = useCallback((value: T) => {
    setStoredValue(value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
      onWriteErrorRef.current?.(error);
    }
  }, [key]);

  return [storedValue, setValue];
}

export function clearLocalStorage(key: string) {
  window.localStorage.removeItem(key);
}
