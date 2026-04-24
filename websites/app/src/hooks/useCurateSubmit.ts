import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Address } from 'viem'
import { useCurateInteractions } from './contracts/useCurateInteractions'
import { useItemCountsQuery } from './queries'
import { clearLocalStorage } from './useLocalStorage'
import { publishAndAddItem } from 'utils/publishAndAddItem'
import { infoToast, errorToast } from 'utils/wrapWithToast'
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
        navigate(`/tx/${result.result.transactionHash}`)
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
