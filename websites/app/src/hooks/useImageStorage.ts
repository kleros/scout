import { useState, useEffect, useCallback, useRef } from 'react'
import { saveImage, loadImage, clearImage } from 'utils/imageStorage'

export function useImageStorage(
  key: string,
  onWriteError?: (error: unknown) => void,
): [File | null, (file: File | null) => void] {
  const [file, setFile] = useState<File | null>(null)
  const userInteractedRef = useRef(false)

  const onWriteErrorRef = useRef(onWriteError)
  onWriteErrorRef.current = onWriteError

  useEffect(() => {
    let cancelled = false
    loadImage(key)
      .then((stored) => {
        if (cancelled || userInteractedRef.current || !stored) return
        setFile(stored)
      })
      .catch((error) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [key])

  const setValue = useCallback(
    (next: File | null) => {
      userInteractedRef.current = true
      setFile(next)
      const op = next ? saveImage(key, next) : clearImage(key)
      op.catch((error) => {
        console.error(error)
        onWriteErrorRef.current?.(error)
      })
    },
    [key],
  )

  return [file, setValue]
}
