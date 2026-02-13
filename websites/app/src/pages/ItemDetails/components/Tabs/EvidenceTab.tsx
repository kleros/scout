import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import ReactMarkdown from 'react-markdown'
import { useSearchParams, Link } from 'react-router-dom'
import { StyledButton } from 'components/Button'
import { hoverLongTransitionTiming } from 'styles/commonStyles'
import AttachmentIcon from 'assets/svgs/icons/attachment.svg'
import ScoutBigLogo from 'assets/svgs/backgrounds/scout-big-logo.svg'
import { formatTimestamp } from 'utils/formatTimestamp'
import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'
import ArrowIcon from 'assets/svgs/icons/arrow.svg'
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
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
`

const ScoutWatermark = styled.div`
  position: absolute;
  top: -64px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  width: 720px;
  height: 720px;
  z-index: 0;

  svg {
    width: 100%;
    height: 100%;
    fill: ${({ theme }) => theme.watermarkFill};
  }
`

const Evidence = styled.div`
  position: relative;
  padding: 24px;
  border-radius: 12px;
  font-family: "Open Sans", sans-serif;
  margin-bottom: 20px;
  background: ${({ theme }) => theme.backgroundThree};
  transition: all 0.2s ease;
  overflow: visible;
  border: 1px solid ${({ theme }) => theme.stroke};
  box-shadow: ${({ theme }) => theme.cardShadow};
  z-index: 1;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }
`

const EvidenceTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  margin-bottom: 16px;
  padding-bottom: 0;
  border-bottom: none;
  position: relative;
  z-index: 1;
`

const EvidenceNumber = styled.span`
  color: ${({ theme }) => theme.secondaryText};
`

const EvidenceDescription = styled.div`
  flex-direction: column;
  word-break: break-word;
  gap: 4px;
  margin: 16px 0;
  padding: 0;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
  position: relative;
  z-index: 1;
`

const EvidenceMetadata = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 0;
  border-top: none;
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
  z-index: 2;
`

const StyledReactMarkdown = styled(ReactMarkdown)`
  color: ${({ theme }) => theme.secondaryText};

  p {
    margin: 4px 0;
    color: inherit;
  }
`

const SubmitEvidenceButton = styled(StyledButton).attrs({ variant: 'primary', size: 'medium' })`
  ${hoverLongTransitionTiming}
  margin: 0;
  max-width: 152px;
  height: 40px;
`

const AttachmentButton = styled.button`
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

const SubmissionDate = styled.a`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  font-style: italic;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    text-decoration: underline;
  }
`

const PartyLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  cursor: pointer !important;

  label {
    color: ${({ theme }) => theme.secondaryText};
    cursor: pointer;
  }

  svg {
    width: 12px;
    height: 12px;
    path {
      fill: ${({ theme }) => theme.secondaryText};
    }
  }

  &:hover {
    cursor: pointer !important;
    label {
      color: ${({ theme }) => theme.primaryText};
    }

    svg {
      path {
        fill: ${({ theme }) => theme.primaryText};
      }
    }
  }
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
        <SubmitEvidenceButton
          onClick={() => {
            setIsConfirmationOpen(true)
            setEvidenceConfirmationType('Evidence')
          }}
        >
          Submit Evidence
        </SubmitEvidenceButton>
      </EvidenceSectionHeader>

      <EvidenceSection hasEvidence={evidences.length > 0}>
        <ScoutWatermark>
          <ScoutBigLogo />
        </ScoutWatermark>
        {evidences.length > 0 ? (
          evidences.map((evidence, idx) => (
            <Evidence key={idx}>
              <EvidenceTitle>
                <EvidenceNumber>#{idx + 1}. </EvidenceNumber>
                {evidence?.title}
              </EvidenceTitle>
              <EvidenceDescription>
                <StyledReactMarkdown>
                  {evidence?.description || ''}
                </StyledReactMarkdown>
              </EvidenceDescription>
              {evidence?.fileURI ? (
                <AttachmentButton
                  onClick={() => {
                    if (evidence?.fileURI) {
                      setSearchParams({
                        attachment: `https://cdn.kleros.link${evidence.fileURI}`,
                      }, { replace: true })
                      scrollTop()
                    }
                  }}
                >
                  <AttachmentIcon />
                  View Attached File
                </AttachmentButton>
              ) : null}
              <EvidenceMetadata>
                <EvidenceMetadataItem>
                  <strong>Submitted on:</strong>
                  <SubmissionDate
                    href={`https://gnosisscan.io/tx/${evidence.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {formatTimestamp(Number(evidence.timestamp), true)}
                  </SubmissionDate>
                  by
                  <PartyLink
                    to={`/profile/pending?address=${evidence.party}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="20" address={evidence.party as `0x${string}`} />
                    <AddressOrName address={evidence.party as `0x${string}`} smallDisplay />
                    <ArrowIcon />
                  </PartyLink>
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
