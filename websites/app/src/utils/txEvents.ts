/**
 * A confirmed transaction changes what the indexer reports a few seconds later. Pages subscribe
 * here (see components/RefreshAfterTransactions) so the entry, list or profile in view picks up
 * the change without a reload.
 */
type Listener = () => void

const listeners = new Set<Listener>()

export const onTxConfirmed = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const emitTxConfirmed = (): void => {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch (error) {
      console.error('tx-confirmed listener failed', error)
    }
  })
}
