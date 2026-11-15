// The Kleros Scout Snap shows Scout's contract insights in MetaMask's transaction confirmation window.
const SNAP_ID = 'npm:@kleros/scout-snap'
const SNAP_VERSION = '1.4.1'

export const SNAP_DIRECTORY_URL = 'https://snaps.metamask.io/snap/npm/kleros/scout-snap/'
export const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/'

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>
  isMetaMask?: boolean
}

// EIP-6963: MetaMask announces itself even when another wallet extension owns window.ethereum.
let announcedMetaMask: Eip1193Provider | undefined
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    const { info, provider } = (event as CustomEvent).detail ?? {}
    if (typeof info?.rdns === 'string' && info.rdns.startsWith('io.metamask') && provider) {
      announcedMetaMask = provider
    }
  })
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

export const getMetaMaskProvider = (): Eip1193Provider | undefined => {
  if (announcedMetaMask) return announcedMetaMask
  const injected = typeof window !== 'undefined' ? (window.ethereum as Eip1193Provider | undefined) : undefined
  return injected?.isMetaMask ? injected : undefined
}

/**
 * installed: MetaMask installed (or already had) the Snap.
 * rejected: the visitor declined in MetaMask.
 * pending: MetaMask already shows a request from this site.
 * no-metamask: no MetaMask in this browser.
 * failed: the wallet could not install it (no Snaps support, or an install error).
 */
export type SnapInstallResult = 'installed' | 'rejected' | 'pending' | 'no-metamask' | 'failed'

export const installScoutSnap = async (): Promise<SnapInstallResult> => {
  const provider = getMetaMaskProvider()
  if (!provider) return 'no-metamask'
  try {
    // wallet_requestSnaps installs the Snap and connects it to this site in one request; no account
    // access is needed (MetaMask Snaps docs, "Connect to a Snap").
    const result = (await provider.request({
      method: 'wallet_requestSnaps',
      params: { [SNAP_ID]: { version: SNAP_VERSION } },
    })) as Record<string, { error?: unknown } | undefined> | undefined
    const snapError = result?.[SNAP_ID]?.error
    if (snapError) throw snapError
    return 'installed'
  } catch (error) {
    const code = (error as { code?: unknown } | undefined)?.code
    if (code === 4001) return 'rejected'
    if (code === -32002) return 'pending'
    console.error('Could not install the Kleros Scout Snap:', error)
    return 'failed'
  }
}
