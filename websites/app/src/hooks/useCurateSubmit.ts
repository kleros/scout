import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Address } from 'viem'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
import { useCurateInteractions } from './contracts/useCurateInteractions'
import { useItemCountsQuery } from './queries'
import { clearLocalStorage } from './useLocalStorage'
import { publishAndAddItem } from 'utils/publishAndAddItem'
import { assertIpfsFileAvailable } from 'utils/ipfs'
import { infoToast, errorToast } from 'utils/wrapWithToast'
import { parseWagmiError } from 'utils/parseWagmiError'
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

export interface SubmitFileUpload {
  file: File
  role: Roles
}

export const useCurateSubmit = ({
  registryKey,
  localStorageKey,
  columns,
  onResetForm,
}: Options) => {
  const [isLocalLoading, setIsLocalLoading] = useState(false)
  const { addItem, isLoading: isContractLoading } = useCurateInteractions()
  const { uploadFile } = useAtlasProvider()
  const { data: countsData } = useItemCountsQuery()
  const navigate = useNavigate()

  const deposits = countsData?.[registryKey]?.deposits
  const isSubmitting = isLocalLoading || isContractLoading

  const submit = async (
    values: Record<string, string>,
    files?: Record<string, SubmitFileUpload>,
  ) => {
    if (!deposits) return

    setIsLocalLoading(true)
    try {
      const resolvedValues = { ...values }

      if (files) {
        for (const [label, { file, role }] of Object.entries(files)) {
          infoToast(`Uploading ${label.toLowerCase()} to IPFS...`)
          const path = await uploadFile(file, role)
          if (!path) throw new Error(`Failed to upload ${label} to IPFS.`)
          await assertIpfsFileAvailable(path, label.toLowerCase())
          resolvedValues[label] = path
        }
      }

      infoToast('Uploading item to IPFS...')
      const registryAddress = registryMap[registryKey] as Address
      const result = await publishAndAddItem({
        addItem,
        uploadFile,
        registryAddress,
        columns,
        values: resolvedValues,
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
        parseWagmiError(error) ||
          `Failed to submit ${registryDisplayNames[registryKey]}`,
      )
    } finally {
      setIsLocalLoading(false)
    }
  }

  return { submit, isSubmitting, deposits }
}
