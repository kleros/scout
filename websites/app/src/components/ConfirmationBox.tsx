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
import { errorToast } from 'utils/wrapWithToast'
import TransactionButton from 'components/TransactionButton'

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
  z-index: 50;
`

const Container = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
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
  const { submitEvidence, challengeRequest, removeItem, isLoading } = useCurateInteractions()

  return (
    <ModalOverlay>
      <Container>
        <InnerContainer>
          <ConfirmationTitle>
            <div>
              {(() => {
                switch (evidenceConfirmationType) {
                  case 'Evidence':
                    return 'Enter the evidence message you want to submit'
                  case 'RegistrationRequested':
                    return 'Provide a reason for challenging this item'
                  case 'Registered':
                    return 'Provide a reason for removing this item'
                  case 'ClearingRequested':
                    return 'Provide a reason for challenging this removal request'
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
          <label>Message title</label>
          <TextArea
            rows={1}
            value={evidenceTitle}
            onChange={(e) => setEvidenceTitle(e.target.value)}
          ></TextArea>
          <label>Evidence message</label>
          <TextArea
            rows={3}
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
          ></TextArea>
          <ButtonWrapper>
            <EnsureChain>
              <TransactionButton
                isLoading={isLoading}
                loadingText="Processing..."
                disabled={!evidenceTitle.trim() || !evidenceText.trim()}
                onClick={async () => {
                  try {
                    const evidenceObject = {
                      title: evidenceTitle,
                      description: evidenceText,
                    }
                    const enc = new TextEncoder()
                    const fileData = enc.encode(JSON.stringify(evidenceObject))
                    const ipfsObject = await ipfsPublish('evidence.json', fileData)
                    const ipfsPath = getIPFSPath(ipfsObject)

                    let result = false
                    const registryAddress = detailsData.registryAddress as Address
                    const itemId = detailsData.itemID
                    const arbitrationCost = arbitrationCostData as bigint

                    switch (evidenceConfirmationType) {
                      case 'Evidence':
                        await submitEvidence(registryAddress, itemId, ipfsPath)
                        result = true
                        break
                      case 'RegistrationRequested':
                        if (deposits?.submissionChallengeBaseDeposit) {
                          await challengeRequest(
                            registryAddress,
                            itemId,
                            ipfsPath,
                            BigInt(deposits.submissionChallengeBaseDeposit),
                            arbitrationCost
                          )
                          result = true
                        } else {
                          errorToast('Missing deposit parameters for challenging submission')
                          return
                        }
                        break
                      case 'Registered':
                        if (deposits?.removalBaseDeposit) {
                          await removeItem(
                            registryAddress,
                            itemId,
                            ipfsPath,
                            deposits,
                            arbitrationCost
                          )
                          result = true
                        } else {
                          errorToast('Missing deposit parameters for removing item')
                          return
                        }
                        break
                      case 'ClearingRequested':
                        if (deposits?.removalChallengeBaseDeposit) {
                          await challengeRequest(
                            registryAddress,
                            itemId,
                            ipfsPath,
                            BigInt(deposits.removalChallengeBaseDeposit),
                            arbitrationCost
                          )
                          result = true
                        } else {
                          errorToast('Missing deposit parameters for challenging removal')
                          return
                        }
                        break
                    }

                    if (result) {
                      setEvidenceTitle('')
                      setEvidenceText('')
                      setIsConfirmationOpen(false)
                    }
                  } catch (error) {
                    console.error('Error performing action:', error)
                    errorToast(error instanceof Error ? error.message : 'Failed to perform action')
                  }
                }}
              >
                Confirm
              </TransactionButton>
            </EnsureChain>
          </ButtonWrapper>
        </InnerContainer>
      </Container>
    </ModalOverlay>
  )
}
export default ConfirmationBox
