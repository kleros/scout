import { useState } from 'react'
import { useDebounce } from 'react-use'

export function useDebouncedValue<T>(value: T, ms = 500): T {
  const [debounced, setDebounced] = useState<T>(value)
  useDebounce(() => setDebounced(value), ms, [value])
  return debounced
}
