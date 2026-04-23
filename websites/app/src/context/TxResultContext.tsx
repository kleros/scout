import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { Address } from 'viem'
import TxResultModal from 'components/TxResultModal'

export interface TxResultData {
  hash: `0x${string}`
  from: Address
  to: Address
  gasUsed: bigint
  effectiveGasPrice: bigint
  /** Human-readable operation label, e.g. "Item Submission". */
  operationType: string
  /** Total deposit paid with the tx, in wei. Omit for operations without a deposit. */
  deposit?: bigint
  /** Challenge/waiting period duration in seconds. Only shown when relevant. */
  periodSeconds?: number
  /** Label for the period field, e.g. "Challenge period". */
  periodLabel?: string
  /** Short registry name, e.g. "Tokens" (no " Registry" suffix). The modal appends " Registry" itself. */
  registryName?: string
  /** Unix ms timestamp when the tx was confirmed. Set automatically by the provider. */
  confirmedAt?: number
}

interface TxResultContextValue {
  data: TxResultData | null
  isOpen: boolean
  show: (data: TxResultData) => void
  hide: () => void
}

const TxResultContext = createContext<TxResultContextValue | null>(null)

export const TxResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<TxResultData | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const show = useCallback((d: TxResultData) => {
    setData({ ...d, confirmedAt: d.confirmedAt ?? Date.now() })
    setIsOpen(true)
  }, [])

  const hide = useCallback(() => setIsOpen(false), [])

  const value = useMemo(() => ({ data, isOpen, show, hide }), [data, isOpen, show, hide])

  return (
    <TxResultContext.Provider value={value}>
      {children}
      <TxResultModal />
    </TxResultContext.Provider>
  )
}

export const useTxResultModal = (): TxResultContextValue => {
  const ctx = useContext(TxResultContext)
  if (!ctx) throw new Error('useTxResultModal must be used within a TxResultProvider')
  return ctx
}
