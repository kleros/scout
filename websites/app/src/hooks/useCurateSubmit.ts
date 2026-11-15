import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Address } from 'viem'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
import { useCurateInteractions } from './contracts/useCurateInteractions'
import { useItemCountsQuery } from './queries'
import { clearLocalStorage } from './useLocalStorage'
import { publishAndAddItem } from 'utils/publishAndAddItem'
import { assertIpfsFileAvailable } from 'utils/ipfs'
import { errorToast, progressToast } from 'utils/wrapWithToast'
import {
  isNetworkFailure,
  isUserRejection,
  parseWagmiError,
} from 'utils/parseWagmiError'
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

/** Whether the deposit needed to submit is known yet. */
export type DepositsStatus = 'loading' | 'ready' | 'unavailable'

/**
 * A failed upload, in words a submitter can act on. Nothing is sent to the chain before the
 * uploads finish, so every upload failure also says that no transaction was sent.
 */
const uploadFailureMessage = (error: unknown): string => {
  if ((error as { name?: string })?.name === 'AuthorizationError')
    return 'Your sign-in has expired. Sign in again, then submit. No transaction was sent.'
  if (isNetworkFailure(error))
    return "Couldn't upload your submission to IPFS. No transaction was sent. Check your connection and try again."
  const detail = (error as { message?: string })?.message?.split('\n')[0]
  // assertIpfsFileAvailable already explains itself, including that no transaction was sent.
  if (detail && /no transaction was sent/i.test(detail)) return detail
  return detail
    ? `Couldn't upload your submission to IPFS: ${detail.replace(/\.$/, '')}. No transaction was sent. Try again.`
    : "Couldn't upload your submission to IPFS. No transaction was sent. Try again."
}

export const useCurateSubmit = ({
  registryKey,
  localStorageKey,
  columns,
  onResetForm,
}: Options) => {
  const [isLocalLoading, setIsLocalLoading] = useState(false)
  const [retryingDeposits, setRetryingDeposits] = useState(false)
  const { addItem, isLoading: isContractLoading } = useCurateInteractions()
  const { uploadFile } = useAtlasProvider()
  const {
    data: countsData,
    isSuccess: countsLoaded,
    errorUpdatedAt: countsFailedAt,
    refetch: refetchCounts,
  } = useItemCountsQuery()
  const navigate = useNavigate()

  const deposits = countsData?.[registryKey]?.deposits
  // Unavailable once a read has failed (the query keeps retrying in the background, and a retry
  // must not turn the error back into "loading"), or when the read finished without the deposit.
  const depositsStatus: DepositsStatus = deposits
    ? 'ready'
    : countsLoaded || countsFailedAt > 0
      ? 'unavailable'
      : 'loading'
  const isSubmitting = isLocalLoading || isContractLoading

  const retryDeposits = useCallback(async () => {
    setRetryingDeposits(true)
    try {
      await refetchCounts()
    } finally {
      setRetryingDeposits(false)
    }
  }, [refetchCounts])

  const submit = async (
    values: Record<string, string>,
    files?: Record<string, SubmitFileUpload>,
  ) => {
    if (!deposits) {
      errorToast(
        "The deposit amount hasn't loaded, so nothing was sent. Wait a moment, then submit again.",
      )
      return
    }

    setIsLocalLoading(true)
    const uploads = Object.entries(files ?? {})
    const uploadingMessage = (name: string) => `Uploading the ${name} to IPFS...`
    // One toast follows the whole submission: the uploads, then the transaction (wrapWithToast
    // continues it), so a declined transaction closes it quietly and nothing piles up.
    const toastId = progressToast.start(
      uploadingMessage(uploads.length ? uploads[0][0].toLowerCase() : 'entry'),
    )
    let uploading = true
    try {
      const resolvedValues = { ...values }

      for (const [label, { file, role }] of uploads) {
        const name = label.toLowerCase()
        progressToast.step(toastId, uploadingMessage(name))
        const path = await uploadFile(file, role)
        if (!path)
          throw new Error(
            `Couldn't upload the ${name} to IPFS. No transaction was sent. Try again.`,
          )
        await assertIpfsFileAvailable(path, name)
        resolvedValues[label] = path
      }

      progressToast.step(toastId, uploadingMessage('entry'))
      const registryAddress = registryMap[registryKey] as Address
      const result = await publishAndAddItem({
        addItem,
        uploadFile,
        registryAddress,
        columns,
        values: resolvedValues,
        deposits,
        toastId,
        onUploaded: () => {
          uploading = false
        },
      })

      if (result?.status && result.result) {
        onResetForm()
        clearLocalStorage(localStorageKey)
        navigate(`/tx/${result.result.transactionHash}`)
      }
    } catch (error) {
      console.error(`Error submitting ${registryKey}:`, error)
      if (isUserRejection(error)) progressToast.dismiss(toastId)
      else
        progressToast.fail(
          toastId,
          uploading
            ? uploadFailureMessage(error)
            : parseWagmiError(error) ||
                `Failed to submit to ${registryDisplayNames[registryKey]}.`,
        )
    } finally {
      setIsLocalLoading(false)
    }
  }

  return {
    submit,
    isSubmitting,
    deposits,
    depositsStatus,
    retryDeposits,
    retryingDeposits,
  }
}
