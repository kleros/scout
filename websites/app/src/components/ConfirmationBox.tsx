import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { formatEther, parseEther } from 'viem'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { DepositParams } from 'utils/fetchRegistryDeposits'
import CloseIcon from 'svgs/icons/close.svg'
import { GraphItemDetails } from 'utils/itemDetails'
import { useCurateInteractions } from 'hooks/contracts/useCurateInteractions'
import { useDialog } from 'hooks/useDialog'
import { EnsureChain } from 'components/EnsureChain'
import EnsureAuth from 'components/EnsureAuth'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
import { Address } from 'viem'
import { errorToast, progressToast } from 'utils/wrapWithToast'
import { isUserRejection, parseWagmiError } from 'utils/parseWagmiError'
import { formatTimeLeft } from 'hooks/countdown'
import TransactionButton from 'components/TransactionButton'
import PolicyAcknowledgement from 'components/PolicyAcknowledgement'
import UploadIcon from 'assets/svgs/icons/upload.svg'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useLockOverlayScroll } from 'hooks/useLockOverlayScroll'
import useNativeBalance from 'hooks/useNativeBalance'
import { JSON_UPLOAD_ROLE } from 'utils/atlasRoles'
import { assertIpfsFileAvailable } from 'utils/ipfs'
import {
  getRoleRestriction,
  validateFileAgainstRestriction,
} from 'utils/atlasUploadRestrictions'
import { formatValue } from 'utils/formatValue'
import type { WrapWithToastReturnType } from 'utils/wrapWithToast'

/*
 * What comes back, per LightGeneralizedTCR: a challenger who wins gets the request's whole deposit
 * pot, that is their own deposit back plus the requester's base deposit (the bounty); one who loses
 * leaves it to the requester. An unchallenged removal is executed after the challenge period and
 * the remover's deposit is returned.
 */
const buildChallengeWarning = (bounty: string, opposingParty: string) =>
  `If the jurors rule for you, you get your deposit back plus a bounty of ${bounty}. If they rule for the ${opposingParty}, you lose your deposit. Read the Policy below before you challenge.`

const buildRemovalWarning = (challengePeriod: string | null) =>
  `If nobody challenges your request within the challenge period${
    challengePeriod ? ` (${challengePeriod})` : ''
  }, anyone can then execute it: the item is removed and your deposit is returned. If someone challenges it and the jurors rule against you, you lose your deposit. Read the Policy below before you request the removal.`

/**
 * The network fee is paid on top of the deposit. On Gnosis it is a fraction of a cent, so 0.01 xDAI
 * is ample: a balance between the deposit and the deposit plus this margin is warned about (the
 * wallet would refuse the transaction after the uploads), without blocking the button. Same rule
 * as the submit forms (pages/Registries/SubmitItems/SubmitFooter.tsx).
 */
const FEE_MARGIN = parseEther('0.01')

/** What the dialog's button does, for "before you ..." sentences. */
const ACTION_VERBS: Record<string, string> = {
  RegistrationRequested: 'challenge',
  Registered: 'request the removal',
  ClearingRequested: 'challenge the removal',
}

/** "3 days 12 hours" for the removal sentence (the challenge period is set per registry). */
const formatPeriod = (seconds: number): string =>
  formatTimeLeft(seconds * 1000, 2)
    .replace(/(\d+)d/, (_, n) => `${n} day${n === '1' ? '' : 's'}`)
    .replace(/(\d+)h/, (_, n) => `${n} hour${n === '1' ? '' : 's'}`)
    .replace(/(\d+)min/, (_, n) => `${n} minute${n === '1' ? '' : 's'}`)

/**
 * The title repeats the page button that opened the dialog (in every registry it said "Token",
 * "Tag" or "Query" here but "Item" on the page); the submit button says what it does.
 */
const ACTION_LABELS: Record<string, { title: string; submit: string; evidenceTitle: string }> = {
  RegistrationRequested: { title: 'Challenge item', submit: 'Challenge item', evidenceTitle: 'Challenge Justification' },
  Registered: { title: 'Remove item', submit: 'Request removal', evidenceTitle: 'Removal Justification' },
  ClearingRequested: { title: 'Challenge removal', submit: 'Challenge removal', evidenceTitle: 'Challenge Removal Justification' },
}

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.modalOverlay};
  display: ${({ $isOpen }) => ($isOpen ? 'flex' : 'none')};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`

const Container = styled.div`
  position: relative;
  width: 90vw;
  max-width: 900px;
  background: ${({ theme }) => theme.modalBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 20px;
  color: ${({ theme }) => theme.primaryText};
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadowModal};
  max-height: 90vh;
  overflow-y: auto;

  ${landscapeStyle(
    () => css`
      width: 70%;
    `
  )}
`

const InnerContainer = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
  padding: ${responsiveSize(16, 24)};
  gap: 16px;
`

const TitleRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
`

const ConfirmationTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
`

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin: -4px -4px 0 0;
  padding: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;

  svg {
    width: 24px;
    height: 24px;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.hoverBackground};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

const FieldLabel = styled.label`
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
`

const MissingStep = styled.p`
  width: 100%;
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryText};
`

const TextArea = styled.textarea`
  width: 93%;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  overflow: auto;
  border-radius: 8px;
  background: ${({ theme }) => theme.modalInputBackground};
  color: ${({ theme }) => theme.primaryText};
  font-family: "Manrope", sans-serif;
  font-size: 16px;
  resize: vertical;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.backgroundFour};
  }

  &:focus {
    background: ${({ theme }) => theme.backgroundFour};
  }

  &::placeholder {
    color: ${({ theme }) => theme.secondaryText};
  }

  ${landscapeStyle(
    () => css`
      width: 97%;
    `
  )}
`

const ButtonWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
  flex-wrap: wrap;

  button {
    width: auto;
    max-width: 200px;
  }
`

const DepositText = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.primaryText};
  opacity: 0.9;
`

const InsufficientBalanceText = styled.div`
  color: ${({ theme }) => theme.error};
  font-size: 13px;
  font-weight: 500;
  width: 100%;
`

const FileUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FileUploadButton = styled.label`
  cursor: pointer;
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${({ theme }) => theme.modalInputBackground};
  color: ${({ theme }) => theme.primaryText};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.backgroundFour};
    border-color: ${({ theme }) => theme.secondaryBlue}80;
  }

  /* The file input inside is visually hidden: show its keyboard focus on the button. */
  &:has(input:focus-visible) {
    outline: 2px solid ${({ theme }) => theme.primaryBlue};
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;

    path {
      fill: ${({ theme }) => theme.primaryText};
    }
  }
`

const HiddenFileInput = styled.input`
  opacity: 0;
  width: 0.1px;
  height: 0.1px;
  position: absolute;
`

const FilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.backgroundThree};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryText};
  width: fit-content;
`

const RemoveFileButton = styled.button`
  min-width: 24px;
  min-height: 24px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.error};
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.7;
  }
`

/** The base deposits the dialog needs (the item page reads them with the registry parameters). */
type DepositAmounts = Pick<
  DepositParams,
  'submissionBaseDeposit' | 'removalBaseDeposit' | 'submissionChallengeBaseDeposit' | 'removalChallengeBaseDeposit'
>

interface IConfirmationBox {
  evidenceConfirmationType: string;
  isConfirmationOpen: boolean;
  setIsConfirmationOpen: (isOpen: boolean) => void;
  detailsData: GraphItemDetails;
  deposits: DepositAmounts | undefined;
  arbitrationCostData: bigint | undefined;
  registryName?: string;
  /** The registry's challenge period in seconds, to say when an unchallenged removal goes through. */
  challengePeriodDuration?: number | null;
}

const ConfirmationBox: React.FC<IConfirmationBox> = ({
  evidenceConfirmationType,
  isConfirmationOpen,
  setIsConfirmationOpen,
  detailsData,
  deposits,
  arbitrationCostData,
  registryName,
  challengePeriodDuration,
}) => {
  const cacheKey = `confirmationBox:${detailsData.registryAddress}:${detailsData.itemID}:${evidenceConfirmationType}`

  const [formData, setFormData] = useLocalStorage(cacheKey, {
    evidenceText: '',
    attachedFileBase64: null as string | null,
    attachedFileName: null as string | null,
  })

  const [evidenceText, setEvidenceText] = useState<string>(formData.evidenceText)
  const [attachedFileBase64, setAttachedFileBase64] = useState<string | null>(formData.attachedFileBase64)
  const [attachedFileName, setAttachedFileName] = useState<string | null>(formData.attachedFileName)
  const [isLocalLoading, setIsLocalLoading] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const idPrefix = useId()
  const titleId = `${idPrefix}-title`
  const descriptionId = `${idPrefix}-description`
  const missingStepId = `${idPrefix}-missing`
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  useLockOverlayScroll(isConfirmationOpen)

  const labels = ACTION_LABELS[evidenceConfirmationType] ?? {
    title: 'Submit',
    submit: 'Submit',
    evidenceTitle: '',
  }

  const bountyDisplay = useMemo(() => {
    const raw = detailsData?.requests?.[0]?.deposit
    if (!raw) return null
    try {
      return `${Number(formatEther(BigInt(raw)))} xDAI`
    } catch {
      return null
    }
  }, [detailsData])

  const warningText = (() => {
    if (evidenceConfirmationType === 'Registered') {
      return buildRemovalWarning(challengePeriodDuration ? formatPeriod(challengePeriodDuration) : null)
    }
    const opposingParty =
      evidenceConfirmationType === 'ClearingRequested' ? 'remover' : 'submitter'
    const bountyFallback = `the ${opposingParty}'s base deposit`
    return buildChallengeWarning(bountyDisplay ?? bountyFallback, opposingParty)
  })()

  const { challengeRequest, removeItem, isLoading: isContractLoading } = useCurateInteractions()
  const { uploadFile, roleRestrictions } = useAtlasProvider()
  const evidenceRestriction = getRoleRestriction(Roles.Evidence, roleRestrictions)
  const navigate = useNavigate()

  // Combined loading state for both IPFS upload and contract interaction
  const isLoading = isLocalLoading || isContractLoading

  // Sync to localStorage - EXACT same pattern as AddToken
  useEffect(() => {
    setFormData({ evidenceText, attachedFileBase64, attachedFileName })
  }, [evidenceText, attachedFileBase64, attachedFileName, setFormData])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const error = validateFileAgainstRestriction(file, evidenceRestriction)
    if (error) {
      errorToast(error)
      e.target.value = ''
      return
    }
    setAttachedFileName(file.name)
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result?.toString()
      if (result) {
        setAttachedFileBase64(result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setAttachedFileBase64(null)
    setAttachedFileName(null)
  }

  // Convert base64 back to File object when needed
  const attachedFile = attachedFileBase64 && attachedFileName ? (() => {
    try {
      const arr = attachedFileBase64.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream'
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      return new File([u8arr], attachedFileName, { type: mime })
    } catch (error) {
      console.error('Error converting base64 to file:', error)
      return null
    }
  })() : null

  const handleClose = () => {
    if (!isLoading) {
      // Just close the modal - preserve the draft in localStorage for retry
      setIsConfirmationOpen(false)
    }
  }

  // A real dialog: focus moves to the description, Tab stays inside, Escape closes (not while
  // sending), and focus returns to the button that opened it.
  const { dialogProps } = useDialog(isConfirmationOpen, handleClose, { initialFocus: descriptionRef })

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  // The base deposit of this action (the arbitration cost is added to it).
  const baseDeposit = useMemo(() => {
    if (!deposits) return undefined
    switch (evidenceConfirmationType) {
      case 'RegistrationRequested':
        return deposits.submissionChallengeBaseDeposit
      case 'Registered':
        return deposits.removalBaseDeposit
      case 'ClearingRequested':
        return deposits.removalChallengeBaseDeposit
      default:
        return undefined
    }
  }, [deposits, evidenceConfirmationType])

  const depositValue = useMemo(() => {
    if (!deposits || arbitrationCostData === undefined) return undefined
    switch (evidenceConfirmationType) {
      case 'RegistrationRequested':
        return deposits.submissionChallengeBaseDeposit + arbitrationCostData
      case 'Registered':
        return deposits.removalBaseDeposit + arbitrationCostData
      case 'ClearingRequested':
        return deposits.removalChallengeBaseDeposit + arbitrationCostData
      default:
        return undefined
    }
  }, [deposits, arbitrationCostData, evidenceConfirmationType])

  // What the deposit is made of, shown before anything is signed.
  const depositBreakdown = (() => {
    if (baseDeposit === undefined || arbitrationCostData === undefined) return null
    const baseName = evidenceConfirmationType === 'Registered' ? 'removal deposit' : 'challenge deposit'
    if (BigInt(baseDeposit) === 0n) return `the arbitration cost`
    return `${formatEther(BigInt(baseDeposit))} xDAI ${baseName} + ${formatEther(arbitrationCostData)} xDAI arbitration cost`
  })()

  const { balance: nativeBalance } = useNativeBalance()
  const insufficientBalance =
    nativeBalance !== undefined &&
    depositValue !== undefined &&
    nativeBalance < depositValue
  const feeMayNotBeCovered =
    nativeBalance !== undefined &&
    depositValue !== undefined &&
    nativeBalance >= depositValue &&
    nativeBalance < depositValue + FEE_MARGIN

  const missingDescription = !evidenceText.trim()
  const missingStep =
    missingDescription && !acknowledged
      ? 'Add a description and confirm that you have read the Policy to continue.'
      : missingDescription
        ? 'Add a description to continue.'
        : !acknowledged
          ? 'Confirm that you have read the Policy to continue.'
          : null

  const handleSubmit = async () => {
    if (isLoading) return
    const registryAddress = detailsData.registryAddress as Address
    const itemId = detailsData.itemID
    // Refuse before uploading anything: the deposit must be known.
    if (!deposits || baseDeposit === undefined || arbitrationCostData === undefined) {
      errorToast('The deposit has not loaded yet. Close this dialog and try again in a moment.')
      return
    }
    const arbitrationCost = arbitrationCostData as bigint

    // Set loading state immediately
    setIsLocalLoading(true)
    // One toast follows the uploads and then the transaction.
    const toastId = progressToast.start(
      attachedFile ? 'Uploading your file to IPFS...' : 'Uploading your evidence to IPFS...',
    )

    try {
      // Upload attached file to IPFS if present
      let fileURI: string | null = null
      let fileTypeExtension: string | null = null

      if (attachedFile) {
        const uploadedPath = await uploadFile(attachedFile, Roles.Evidence)
        if (!uploadedPath) throw new Error('Failed to upload attachment to IPFS.')
        await assertIpfsFileAvailable(uploadedPath, 'attachment')
        fileURI = uploadedPath
        const extension = attachedFile.name.split('.').pop()
        fileTypeExtension = extension ? `.${extension}` : null
        progressToast.step(toastId, 'Uploading your evidence to IPFS...')
      }

      // Construct evidence object with optional file attachment
      const evidenceObject: {
        title: string
        description: string
        fileURI?: string
        fileTypeExtension?: string
      } = {
        title: labels.evidenceTitle,
        description: evidenceText,
      }

      if (fileURI) {
        evidenceObject.fileURI = fileURI
      }
      if (fileTypeExtension) {
        evidenceObject.fileTypeExtension = fileTypeExtension
      }

      const evidenceFile = new File(
        [JSON.stringify(evidenceObject)],
        'evidence.json',
        { type: 'application/json' },
      )
      const ipfsPath = await uploadFile(evidenceFile, JSON_UPLOAD_ROLE)
      if (!ipfsPath) throw new Error('Failed to upload evidence to IPFS.')
      progressToast.step(toastId, 'Checking that your evidence can be read back from IPFS...')
      await assertIpfsFileAvailable(ipfsPath, 'evidence')

      let result: WrapWithToastReturnType | undefined
      switch (evidenceConfirmationType) {
        case 'RegistrationRequested':
          result = await challengeRequest(
            registryAddress,
            itemId,
            ipfsPath,
            BigInt(deposits.submissionChallengeBaseDeposit),
            arbitrationCost,
            { toastId }
          )
          break
        case 'Registered':
          result = await removeItem(
            registryAddress,
            itemId,
            ipfsPath,
            // removeItem reads only removalBaseDeposit from it (type-only cast, same object as before).
            deposits as DepositParams,
            arbitrationCost,
            { toastId }
          )
          break
        case 'ClearingRequested':
          result = await challengeRequest(
            registryAddress,
            itemId,
            ipfsPath,
            BigInt(deposits.removalChallengeBaseDeposit),
            arbitrationCost,
            { toastId }
          )
          break
        default:
          throw new Error('Invalid evidence confirmation type')
      }

      if (result?.status) {
        // Reset form state before closing to prevent the useEffect from saving it again
        setEvidenceText('')
        setAttachedFileBase64(null)
        setAttachedFileName(null)
        // Clear localStorage after state is reset
        localStorage.removeItem(cacheKey)
        setIsConfirmationOpen(false)

        if (result.result) {
          navigate(`/tx/${result.result.transactionHash}`)
        }
      }
    } catch (error) {
      console.error('Error performing action:', error)
      // Declining a request in the wallet is a choice: close the toast quietly.
      if (isUserRejection(error)) progressToast.dismiss(toastId)
      else progressToast.fail(toastId, parseWagmiError(error) || 'Failed to perform action')
    } finally {
      setIsLocalLoading(false)
    }
  }

  return (
    <ModalOverlay $isOpen={isConfirmationOpen} onClick={handleOverlayClick}>
      <Container {...dialogProps} aria-labelledby={titleId}>
        <InnerContainer>
          <TitleRow>
            <ConfirmationTitle id={titleId}>{labels.title}</ConfirmationTitle>
            <CloseButton type="button" aria-label="Close" onClick={handleClose} disabled={isLoading}>
              <CloseIcon aria-hidden="true" />
            </CloseButton>
          </TitleRow>
          <FieldLabel htmlFor={descriptionId}>Description (required)</FieldLabel>
          <TextArea
            id={descriptionId}
            ref={descriptionRef}
            rows={3}
            required
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
          ></TextArea>
          <FileUploadContainer>
            <FieldLabel as="span">Attach file (Optional)</FieldLabel>
            {!attachedFile ? (
              <FileUploadButton>
                <UploadIcon aria-hidden="true" />
                Choose File
                <HiddenFileInput
                  type="file"
                  onChange={handleFileChange}
                  accept={evidenceRestriction?.allowedMimeTypes.join(',')}
                  disabled={isLoading}
                />
              </FileUploadButton>
            ) : (
              <FilePreview>
                <span>{attachedFile.name}</span>
                <RemoveFileButton
                  type="button"
                  aria-label={`Remove ${attachedFile.name}`}
                  onClick={handleRemoveFile}
                  disabled={isLoading}
                >
                  ×
                </RemoveFileButton>
              </FilePreview>
            )}
          </FileUploadContainer>
          <PolicyAcknowledgement
            registryName={registryName}
            warningText={warningText}
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
          />
          <ButtonWrapper>
            <EnsureChain>
              <EnsureAuth>
              <TransactionButton
                isLoading={isLoading}
                loadingText="Processing..."
                disabled={!!missingStep || insufficientBalance}
                aria-describedby={missingStep ? missingStepId : undefined}
                onClick={handleSubmit}
              >
                {labels.submit}
              </TransactionButton>
              </EnsureAuth>
            </EnsureChain>
            {depositValue !== undefined && (
              <DepositText>
                Deposit: {formatEther(depositValue)} xDAI
                {depositBreakdown ? ` (${depositBreakdown})` : ''}
              </DepositText>
            )}
            {missingStep && !isLoading && (
              <MissingStep id={missingStepId}>{missingStep}</MissingStep>
            )}
            {insufficientBalance && (
              <InsufficientBalanceText>
                Insufficient balance. You have {formatValue(nativeBalance!)} xDAI but need {formatValue(depositValue!)} xDAI.
              </InsufficientBalanceText>
            )}
            {feeMayNotBeCovered && (
              <InsufficientBalanceText role="status">
                Your {formatValue(nativeBalance!)} xDAI covers the deposit but may not cover the network fee. Add a
                little xDAI (0.01 is plenty) before you {ACTION_VERBS[evidenceConfirmationType] ?? 'continue'}.
              </InsufficientBalanceText>
            )}
          </ButtonWrapper>
        </InnerContainer>
      </Container>
    </ModalOverlay>
  )
}
export default ConfirmationBox
