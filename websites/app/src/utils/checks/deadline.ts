/**
 * Runs `request` with a signal that aborts when the caller cancels or after
 * `ms`, whichever comes first. The caller cancels when the input changes; the
 * deadline moves a check on from a provider that never answers. `request`
 * should also read the response body, so a stalled body times out too.
 */
export const withDeadline = async <T>(
  signal: AbortSignal | undefined,
  ms: number,
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController()
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException(
          `No answer within ${ms / 1000} seconds.`,
          'TimeoutError',
        ),
      ),
    ms,
  )
  const cancel = () => controller.abort(signal?.reason)
  if (signal?.aborted) cancel()
  else signal?.addEventListener('abort', cancel, { once: true })
  try {
    return await request(controller.signal)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}
