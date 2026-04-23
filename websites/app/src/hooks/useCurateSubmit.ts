import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Address } from 'viem'
import { useCurateInteractions } from './contracts/useCurateInteractions'
import { useItemCountsQuery } from './queries'
import { clearLocalStorage } from './useLocalStorage'
import { publishAndAddItem } from 'utils/publishAndAddItem'
import { infoToast, errorToast } from 'utils/wrapWithToast'
import { useTxResultModal } from 'context/TxResultContext'
import {
  registryMap,
  registryDisplayNames,
  type Column,
  type RegistryKey,
} from 'utils/items'

interface Options {
  registryKey: RegistryKey
  localStorageKey: string
  columns: Column[]
  onResetForm: () => void
}

export const useCurateSubmit = ({
  registryKey,
  localStorageKey,
  columns,
  onResetForm,
}: Options) => {
  const [isLocalLoading, setIsLocalLoading] = useState(false)
  const { addItem, isLoading: isContractLoading } = useCurateInteractions()
  const { data: countsData } = useItemCountsQuery()
  const navigate = useNavigate()
  const { show: showTxResult } = useTxResultModal()

  const deposits = countsData?.[registryKey]?.deposits
  const isSubmitting = isLocalLoading || isContractLoading

  const submit = async (values: Record<string, string>) => {
    if (!deposits) return

    setIsLocalLoading(true)
    try {
      infoToast('Uploading item to IPFS...')
      const registryAddress = registryMap[registryKey] as Address
      const result = await publishAndAddItem({
        addItem,
        registryAddress,
        columns,
        values,
        deposits,
      })

      if (result?.status && result.result) {
        onResetForm()
        clearLocalStorage(localStorageKey)
        navigate(`/${registryKey}`)
        const receipt = result.result
        showTxResult({
          hash: receipt.transactionHash,
          from: receipt.from,
          to: (receipt.to ?? registryAddress) as Address,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.effectiveGasPrice,
          operationType: 'Item Submission',
          deposit: BigInt(deposits.arbitrationCost) + BigInt(deposits.submissionBaseDeposit),
          periodSeconds: Number(deposits.challengePeriodDuration),
          periodLabel: 'Challenge period',
          registryName: registryDisplayNames[registryKey],
        })
      }
    } catch (error) {
      console.error(`Error submitting ${registryKey}:`, error)
      errorToast(
        error instanceof Error
          ? error.message
          : `Failed to submit ${registryDisplayNames[registryKey]}`,
      )
    } finally {
      setIsLocalLoading(false)
    }
  }

  return { submit, isSubmitting, deposits }
}
