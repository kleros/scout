import React, { useEffect, useMemo, useState } from 'react'
import styled, { css } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { formatEther } from 'viem'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { DepositParams } from 'utils/fetchRegistryDeposits'
import { StyledCloseButton, ClosedButtonContainer } from 'pages/Registries'
import { GraphItemDetails } from 'utils/itemDetails'
import { useCurateInteractions } from 'hooks/contracts/useCurateInteractions'
import { EnsureChain } from 'components/EnsureChain'
import ipfsPublish from 'utils/ipfsPublish'
import { getIPFSPath } from 'utils/getIPFSPath'
import { Address } from 'viem'
import { errorToast, infoToast } from 'utils/wrapWithToast'
import TransactionButton from 'components/TransactionButton'
import PolicyAcknowledgement from 'components/PolicyAcknowledgement'
import UploadIcon from 'assets/svgs/icons/upload.svg'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useLockOverlayScroll } from 'hooks/useLockOverlayScroll'
import type { WrapWithToastReturnType } from 'utils/wrapWithToast'

const REGISTRY_SINGULAR: Record<string, string> = {
  tokens: 'Token',
  cdn: 'CDN',
  'single-tags': 'Tag',
  'tags-queries': 'Query',
}

const buildChallengeWarning = (bounty: string, opposingParty: string) =>
  `If the challenge is successful, you will receive 100% of your refund and also a bounty of ${bounty} for spotting the mistake. In case the arbitrator rules in favor of the ${opposingParty}, you are going to lose your deposit. Please ensure you read and understand the rules contained in the Policy below before challenging it.`

const REMOVAL_WARNING =
  'If your removal request is approved, you will receive 100% of your refund. If a challenger contests your removal and the arbitrator rules against you, you will lose your deposit. Please ensure you read and understand the rules contained in the Policy below before requesting removal.'

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

const ConfirmationTitle = styled.h3`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 0;
  gap: 24px;
  font-size: 18px;
  font-weight: 600;
`

const FieldLabel = styled.label`
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
`

const TextArea = styled.textarea`
  width: 93%;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  outline: none;
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

interface IConfirmationBox {
  evidenceConfirmationType: string;
  isConfirmationOpen: boolean;
  setIsConfirmationOpen: (isOpen: boolean) => void;
  detailsData: GraphItemDetails;
  deposits: DepositParams | undefined;
  arbitrationCostData: bigint | undefined;
  registryName?: string;
}

const ConfirmationBox: React.FC<IConfirmationBox> = ({
  evidenceConfirmationType,
  isConfirmationOpen,
  setIsConfirmationOpen,
  detailsData,
  deposits,
  arbitrationCostData,
  registryName,
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

  useLockOverlayScroll(isConfirmationOpen)

  const registrySingular =
    (registryName && REGISTRY_SINGULAR[registryName]) || 'Item'

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
    if (evidenceConfirmationType === 'Registered') return REMOVAL_WARNING
    const opposingParty =
      evidenceConfirmationType === 'ClearingRequested' ? 'remover' : 'submitter'
    const bountyFallback = `the ${opposingParty}'s deposit`
    return buildChallengeWarning(bountyDisplay ?? bountyFallback, opposingParty)
  })()

  const submitLabel = (() => {
    switch (evidenceConfirmationType) {
      case 'RegistrationRequested':
        return `Challenge ${registrySingular}`
      case 'Registered':
        return `Remove ${registrySingular}`
      case 'ClearingRequested':
        return `Challenge Removal`
      default:
        return 'Submit'
    }
  })()
  const { challengeRequest, removeItem, isLoading: isContractLoading } = useCurateInteractions()
  const navigate = useNavigate()

  // Combined loading state for both IPFS upload and contract interaction
  const isLoading = isLocalLoading || isContractLoading

  // Sync to localStorage - EXACT same pattern as AddToken
  useEffect(() => {
    setFormData({ evidenceText, attachedFileBase64, attachedFileName })
  }, [evidenceText, attachedFileBase64, attachedFileName, setFormData])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

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

  return (
    <ModalOverlay $isOpen={isConfirmationOpen} onClick={handleOverlayClick}>
      <Container>
        <InnerContainer>
          <ConfirmationTitle>
            <div>
              {(() => {
                switch (evidenceConfirmationType) {
                  case 'RegistrationRequested':
                    return 'Challenge Item'
                  case 'Registered':
                    return 'Remove Item'
                  case 'ClearingRequested':
                    return 'Challenge Removal Request'
                  default:
                    return 'Default message'
                }
              })()}
            </div>
            <ClosedButtonContainer
              onClick={handleClose}
              style={{ cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
            >
              <StyledCloseButton />
            </ClosedButtonContainer>
          </ConfirmationTitle>
          <FieldLabel>Description</FieldLabel>
          <TextArea
            rows={3}
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
          ></TextArea>
          <FileUploadContainer>
            <FieldLabel>Attach file (Optional)</FieldLabel>
            {!attachedFile ? (
              <FileUploadButton>
                <UploadIcon />
                Choose File
                <HiddenFileInput
                  type="file"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </FileUploadButton>
            ) : (
              <FilePreview>
                <span>{attachedFile.name}</span>
                <RemoveFileButton onClick={handleRemoveFile} disabled={isLoading}>
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
              <TransactionButton
                isLoading={isLoading}
                loadingText="Processing..."
                disabled={!acknowledged || !evidenceText.trim()}
                onClick={async () => {
                  // Set loading state immediately
                  setIsLocalLoading(true)

                  try {
                    const finalTitle = (() => {
                      switch (evidenceConfirmationType) {
                        case 'RegistrationRequested':
                          return 'Challenge Justification'
                        case 'Registered':
                          return 'Removal Justification'
                        case 'ClearingRequested':
                          return 'Challenge Removal Justification'
                        default:
                          return ''
                      }
                    })()
                    // Upload attached file to IPFS if present
                    let fileURI: string | null = null
                    let fileTypeExtension: string | null = null

                    if (attachedFile) {
                      infoToast('Uploading file to IPFS...')
                      const fileData = await attachedFile.arrayBuffer()
                      const fileIpfsObject = await ipfsPublish(attachedFile.name, fileData)
                      fileURI = getIPFSPath(fileIpfsObject)
                      const extension = attachedFile.name.split('.').pop()
                      fileTypeExtension = extension ? `.${extension}` : null
                    }

                    // Construct evidence object with optional file attachment
                    const evidenceObject: {
                      title: string
                      description: string
                      fileURI?: string
                      fileTypeExtension?: string
                    } = {
                      title: finalTitle,
                      description: evidenceText,
                    }

                    if (fileURI) {
                      evidenceObject.fileURI = fileURI
                    }
                    if (fileTypeExtension) {
                      evidenceObject.fileTypeExtension = fileTypeExtension
                    }

                    infoToast('Uploading evidence to IPFS...')
                    const enc = new TextEncoder()
                    const evidenceData = enc.encode(JSON.stringify(evidenceObject))
                    const ipfsObject = await ipfsPublish('evidence.json', evidenceData.buffer)
                    const ipfsPath = getIPFSPath(ipfsObject)

                    const registryAddress = detailsData.registryAddress as Address
                    const itemId = detailsData.itemID
                    const arbitrationCost = arbitrationCostData as bigint

                    let result: WrapWithToastReturnType | undefined
                    switch (evidenceConfirmationType) {
                      case 'RegistrationRequested':
                        if (!deposits || deposits.submissionChallengeBaseDeposit === undefined) {
                          errorToast('Missing deposit parameters for challenging submission. Please try again.')
                          return
                        }
                        result = await challengeRequest(
                          registryAddress,
                          itemId,
                          ipfsPath,
                          BigInt(deposits.submissionChallengeBaseDeposit),
                          arbitrationCost
                        )
                        break
                      case 'Registered':
                        if (!deposits || deposits.removalBaseDeposit === undefined) {
                          errorToast('Missing deposit parameters for removing item. Please try again.')
                          return
                        }
                        result = await removeItem(
                          registryAddress,
                          itemId,
                          ipfsPath,
                          deposits,
                          arbitrationCost
                        )
                        break
                      case 'ClearingRequested':
                        if (!deposits || deposits.removalChallengeBaseDeposit === undefined) {
                          errorToast('Missing deposit parameters for challenging removal. Please try again.')
                          return
                        }
                        result = await challengeRequest(
                          registryAddress,
                          itemId,
                          ipfsPath,
                          BigInt(deposits.removalChallengeBaseDeposit),
                          arbitrationCost
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
                    errorToast(error instanceof Error ? error.message : 'Failed to perform action')
                  } finally {
                    setIsLocalLoading(false)
                  }
                }}
              >
                {submitLabel}
              </TransactionButton>
            </EnsureChain>
            {depositValue !== undefined && (
              <DepositText>
                Deposit: {formatEther(depositValue)} xDAI
              </DepositText>
            )}
          </ButtonWrapper>
        </InnerContainer>
      </Container>
    </ModalOverlay>
  )
}
export default ConfirmationBox
