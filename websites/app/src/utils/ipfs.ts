import { KLEROS_CDN_BASE } from 'consts/index'

/** Normalizes any accepted data format ('/ipfs/x', 'ipfs/x', 'ipfs://x', bare CID) to a '/ipfs/...' path. */
export const normalizeIpfsPath = (path: string): string => {
  if (path.startsWith('/ipfs/')) return path
  if (path.startsWith('ipfs/')) return `/${path}`
  if (path.startsWith('ipfs://')) return path.replace('ipfs://', '/ipfs/')
  return `/ipfs/${path}`
}

/**
 * Checks that a just-uploaded IPFS file is actually retrievable from the
 * public gateway before its URI is committed on-chain. Retries with backoff
 * to tolerate propagation delay right after upload.
 */
export const verifyIpfsFileAvailable = async (
  ipfsPath: string,
  attempts = 3,
): Promise<boolean> => {
  const url = `${KLEROS_CDN_BASE}${normalizeIpfsPath(ipfsPath)}`
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0)
      await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt))
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
      if (response.ok) return true
    } catch {
      // Gateway timeout or network error — retry.
    }
  }
  return false
}

/**
 * Throws a user-facing error if the uploaded file cannot be fetched back from
 * the gateway. Called between IPFS upload and transaction submission so an
 * unretrievable file aborts the flow before any funds are committed.
 */
export const assertIpfsFileAvailable = async (
  ipfsPath: string,
  fileLabel: string,
): Promise<void> => {
  if (await verifyIpfsFileAvailable(ipfsPath)) return
  throw new Error(
    `The uploaded ${fileLabel} is not retrievable from IPFS. No transaction was sent — please try submitting again.`,
  )
}
