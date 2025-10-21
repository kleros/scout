import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import ReactMarkdown from 'react-markdown'
import { useSearchParams } from 'react-router-dom'
import { SubmitButton } from '../../../Registries/SubmitEntries/AddEntryModal'
import AttachmentIcon from 'assets/svgs/icons/attachment.svg'
import KlerosIcon from 'assets/svgs/icons/kleros.svg'
import { formatTimestamp } from 'utils/formatTimestamp'
import SubmittedByLink from 'components/SubmittedByLink'
import { useScrollTop } from 'hooks/useScrollTop'

const EvidenceSection = styled.div<{ hasEvidence?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  min-height: 500px;
  align-items: ${({ hasEvidence }) => (hasEvidence ? 'stretch' : 'center')};
  justify-content: ${({ hasEvidence }) => (hasEvidence ? 'flex-start' : 'center')};
  width: 100%;
`

const EvidenceSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`

const EvidenceHeader = styled.h2`
  font-size: 20px;
  margin: 0;
`

const KlerosWatermark = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.03;
  pointer-events: none;
  width: 500px;
  height: 500px;
  z-index: 0;

  svg {
    width: 100%;
    height: 100%;
  }
`

const Evidence = styled.div`
  position: relative;
  padding: 24px;
  border-radius: 12px;
  font-family: "Open Sans", sans-serif;
  margin-bottom: 20px;
  background: transparent;
  transition: all 0.2s ease;
  overflow: visible;
  border: 1px solid ${({ theme }) => theme.stroke};

  &:hover {
    border-color: ${({ theme }) => theme.primaryText};
  }
`

const EvidenceTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(113, 134, 255, 0.2);
  position: relative;
  z-index: 1;
`

const EvidenceDescription = styled.div`
  flex-direction: column;
  word-break: break-word;
  gap: 4px;
  margin: 16px 0;
  padding: 12px;
  background: transparent;
  border-radius: 8px;
  border-left: 3px solid rgba(113, 134, 255, 0.4);
  font-size: 14px;
  line-height: 1.5;
  position: relative;
  z-index: 1;
`

const EvidenceMetadata = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryText};
  position: relative;
  z-index: 1;
`

const EvidenceMetadataItem = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;

  strong {
    color: ${({ theme }) => theme.primaryText};
    font-weight: 500;
  }

  > div {
    margin-bottom: 0;
  }
`

const NoEvidenceText = styled.div`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 16px;
  text-align: center;
  position: relative;
  z-index: 1;
`

const StyledReactMarkdown = styled(ReactMarkdown)`
  p {
    margin: 4px 0;
  }
`

const StyledButton = styled.button`
  height: fit-content;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: ${({ theme }) => theme.primaryText};
  background: transparent;
  border: 1px solid rgba(113, 134, 255, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  gap: ${responsiveSize(6, 8)};
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
  margin: 8px 0;

  &:hover {
    border-color: rgba(113, 134, 255, 0.8);
    transform: translateY(-1px);
  }

  ${landscapeStyle(
    () => css`
      > svg {
        width: 16px;
        fill: ${({ theme }) => theme.primaryText};
      }
    `,
  )}
`

interface EvidenceTabProps {
  evidences: any[]
  setIsConfirmationOpen: (open: boolean) => void
  setEvidenceConfirmationType: (type: string) => void
}

const EvidenceTab: React.FC<EvidenceTabProps> = ({
  evidences,
  setIsConfirmationOpen,
  setEvidenceConfirmationType,
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const scrollTop = useScrollTop()

  return (
    <>
      <EvidenceSectionHeader>
        <EvidenceHeader>Evidence</EvidenceHeader>
        <SubmitButton
          onClick={() => {
            setIsConfirmationOpen(true)
            setEvidenceConfirmationType('Evidence')
          }}
        >
          Submit Evidence
        </SubmitButton>
      </EvidenceSectionHeader>

      <EvidenceSection hasEvidence={evidences.length > 0}>
        <KlerosWatermark>
          <KlerosIcon />
        </KlerosWatermark>
        {evidences.length > 0 ? (
          evidences.map((evidence, idx) => (
            <Evidence key={idx}>
              <EvidenceTitle>{evidence?.title}</EvidenceTitle>
              <EvidenceDescription>
                <StyledReactMarkdown>
                  {evidence?.description || ''}
                </StyledReactMarkdown>
              </EvidenceDescription>
              {evidence?.fileURI ? (
                <StyledButton
                  onClick={() => {
                    if (evidence?.fileURI) {
                      setSearchParams({
                        attachment: `https://cdn.kleros.link${evidence.fileURI}`,
                      })
                      scrollTop()
                    }
                  }}
                >
                  <AttachmentIcon />
                  View Attached File
                </StyledButton>
              ) : null}
              <EvidenceMetadata>
                <EvidenceMetadataItem>
                  <strong>Time:</strong>
                  {formatTimestamp(Number(evidence.timestamp), true)}
                </EvidenceMetadataItem>
                <EvidenceMetadataItem>
                  <strong>Party:</strong>
                  <SubmittedByLink address={evidence.party} />
                </EvidenceMetadataItem>
              </EvidenceMetadata>
            </Evidence>
          ))
        ) : (
          <NoEvidenceText>No evidence submitted yet...</NoEvidenceText>
        )}
      </EvidenceSection>
    </>
  )
}

export default EvidenceTab
