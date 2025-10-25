import React, { useState } from 'react'
import styled, { css } from 'styled-components'
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
import UploadIcon from 'assets/svgs/icons/upload.svg'

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
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
  backdrop-filter: blur(50px);
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.4);
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
  font-family: "Open Sans", sans-serif;
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
  justify-content: center;
  width: 100%;

  button {
    width: auto;
    max-width: 200px;
  }
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
    border-color: rgba(113, 134, 255, 0.5);
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
}

const ConfirmationBox: React.FC<IConfirmationBox> = ({
  evidenceConfirmationType,
  isConfirmationOpen,
  setIsConfirmationOpen,
  detailsData,
  deposits,
  arbitrationCostData,
}) => {
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceText, setEvidenceText] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [isLocalLoading, setIsLocalLoading] = useState(false)
  const { submitEvidence, challengeRequest, removeItem, isLoading: isContractLoading } = useCurateInteractions()

  // Combined loading state for both IPFS upload and contract interaction
  const isLoading = isLocalLoading || isContractLoading

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachedFile(file)
    }
  }

  const handleRemoveFile = () => {
    setAttachedFile(null)
  }

  return (
    <ModalOverlay>
      <Container>
        <InnerContainer>
          <ConfirmationTitle>
            <div>
              {(() => {
                switch (evidenceConfirmationType) {
                  case 'Evidence':
                    return 'Submit Evidence'
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
              onClick={() => !isLoading && setIsConfirmationOpen(false)}
              style={{ cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
            >
              <StyledCloseButton />
            </ClosedButtonContainer>
          </ConfirmationTitle>
          {evidenceConfirmationType === 'Evidence' && (
            <>
              <FieldLabel>Title</FieldLabel>
              <TextArea
                rows={1}
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
              ></TextArea>
            </>
          )}
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
          <ButtonWrapper>
            <EnsureChain>
              <TransactionButton
                isLoading={isLoading}
                loadingText="Processing..."
                disabled={
                  evidenceConfirmationType === 'Evidence'
                    ? !evidenceTitle.trim() || !evidenceText.trim()
                    : !evidenceText.trim()
                }
                onClick={async () => {
                  // Set loading state immediately
                  setIsLocalLoading(true)

                  try {
                    // Auto-generate title for challenge/removal requests
                    const finalTitle = evidenceConfirmationType === 'Evidence'
                      ? evidenceTitle
                      : (() => {
                          switch (evidenceConfirmationType) {
                            case 'RegistrationRequested':
                              return 'Challenge Justification'
                            case 'Registered':
                              return 'Removal Justification'
                            case 'ClearingRequested':
                              return 'Challenge Removal Justification'
                            default:
                              return evidenceTitle
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

                    let result: { status: boolean } | undefined
                    switch (evidenceConfirmationType) {
                      case 'Evidence':
                        result = await submitEvidence(registryAddress, itemId, ipfsPath)
                        break
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
                      setEvidenceTitle('')
                      setEvidenceText('')
                      setAttachedFile(null)
                      setIsConfirmationOpen(false)
                    }
                  } catch (error) {
                    console.error('Error performing action:', error)
                    errorToast(error instanceof Error ? error.message : 'Failed to perform action')
                  } finally {
                    setIsLocalLoading(false)
                  }
                }}
              >
                Submit
              </TransactionButton>
            </EnsureChain>
          </ButtonWrapper>
        </InnerContainer>
      </Container>
    </ModalOverlay>
  )
}
export default ConfirmationBox
