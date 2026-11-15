import React, { useLayoutEffect, useRef } from 'react'
import styled, { css } from 'styled-components'
import { Address } from 'viem'
import { Link } from 'react-router-dom'
import { StyledButton } from 'components/Button'
import SafeLink from 'components/SafeLink'
import { hoverLongTransitionTiming } from 'styles/commonStyles'
import { landscapeStyle } from 'styles/landscapeStyle'
import AttachmentIcon from 'assets/svgs/icons/attachment.svg'
import ScoutBigLogo from 'assets/svgs/backgrounds/scout-big-logo.svg'
import { formatTimestamp } from 'utils/formatTimestamp'
import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'
import ArrowIcon from 'assets/svgs/icons/arrow.svg'
import { useAttachment } from 'hooks/useAttachment'
import InlineEvidenceForm from './InlineEvidenceForm'

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
  font-family: "Manrope", sans-serif;
  margin-bottom: 20px;
  background: ${({ theme }) => theme.backgroundThree};
  transition: all 0.2s ease;
  overflow: visible;
  border: 1px solid ${({ theme }) => theme.stroke};
  box-shadow: ${({ theme }) => theme.cardShadow};
  z-index: 1;

  &:hover {
    border-color: ${({ theme }) => theme.borderHover};
  }
`

/* On phones the attachment link goes under the title, so a long title keeps the card's width. */
const EvidenceHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px 16px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;

  ${landscapeStyle(
    () => css`
      flex-wrap: nowrap;
    `
  )}
`

const EvidenceTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  flex: 1 1 100%;
  min-width: 0;

  ${landscapeStyle(
    () => css`
      flex-basis: 0;
    `
  )}
`

const EvidenceNumber = styled.span`
  color: ${({ theme }) => theme.secondaryText};
`

const EvidenceDescription = styled.div`
  white-space: pre-line;
  word-break: break-word;
  margin: 16px 0;
  padding: 0;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: ${({ theme }) => theme.secondaryText};
  position: relative;
  z-index: 1;
`

const DescriptionLink = styled(SafeLink)`
  color: ${({ theme }) => theme.secondaryBlue};
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
`

const PartyRole = styled.span`
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
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

const SubmitEvidenceButton = styled(StyledButton).attrs({ variant: 'primary', size: 'medium' })`
  ${hoverLongTransitionTiming}
  margin: 0;
  max-width: 152px;
  height: 40px;
`

const AttachmentLink = styled.button`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;
  transition: color 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
    fill: ${({ theme }) => theme.secondaryBlue};
    transition: fill 0.2s ease;
  }

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }

  &:hover svg {
    fill: ${({ theme }) => theme.primaryBlue};
  }
`

const SubmissionDate = styled(Link)`
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

const URL_PATTERN = /https:\/\/[^\s<>"'`]+/g

/** Drops what ends a sentence rather than a link: "see https://a.io/x." or "(https://a.io/x)". */
const trimUrl = (url: string): string => {
  let end = url.length
  const count = (text: string, char: string) => text.split(char).length - 1
  while (end > 0) {
    const last = url[end - 1]
    const kept = url.slice(0, end)
    if ('.,;:!?\'"'.includes(last)) end--
    else if (last === ')' && count(kept, '(') < count(kept, ')')) end--
    else if (last === ']' && count(kept, '[') < count(kept, ']')) end--
    else break
  }
  return url.slice(0, end)
}

/**
 * Evidence text with its https links clickable. The full address is the link text, so the
 * destination is always visible; SafeLink opens it in a new tab and refuses anything but https.
 */
const linkify = (text: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0])
    const start = match.index ?? 0
    if (!url || url === 'https://') continue
    if (start > last) nodes.push(text.slice(last, start))
    nodes.push(
      <DescriptionLink key={`${start}-${url}`} url={url}>
        {url}
      </DescriptionLink>,
    )
    last = start + url.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** Where the reader was in the evidence list when they opened an attachment (per item, this tab only). */
const scrollKey = (compositeItemId: string) => `evidenceScroll:${compositeItemId}`

interface EvidenceTabProps {
  evidences: any[]
  registryAddress: Address
  itemID: string
  compositeItemId: string
}

const EvidenceTab: React.FC<EvidenceTabProps> = ({
  evidences,
  registryAddress,
  itemID,
  compositeItemId,
}) => {
  // The shared opener gives the viewer its own history entry: Back (or the viewer's Return) closes it.
  const openAttachment = useAttachment()
  const formRef = useRef<HTMLDivElement>(null)

  // Back from an attachment: return to the evidence the reader was looking at, not the top.
  useLayoutEffect(() => {
    const key = scrollKey(compositeItemId)
    const forget = () => {
      try {
        sessionStorage.removeItem(key)
      } catch {
        // Storage unavailable: nothing to forget.
      }
    }
    let saved: { top?: number; at?: number } | null = null
    try {
      saved = JSON.parse(sessionStorage.getItem(key) || 'null')
    } catch {
      return
    }
    if (!saved) return
    const top = Number(saved.top)
    // Only a recent visit to an attachment counts, not one left hours ago.
    if (!Number.isFinite(top) || Date.now() - Number(saved.at) > 30 * 60 * 1000) {
      forget()
      return
    }
    // The position is forgotten once used (not before: an effect can be cancelled and run again).
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: 'auto' })
      forget()
    })
    return () => cancelAnimationFrame(frame)
  }, [compositeItemId])

  const handleScrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }

  return (
    <>
      <EvidenceSectionHeader>
        <SubmitEvidenceButton type="button" onClick={handleScrollToForm}>
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
              <EvidenceHeader>
                <EvidenceTitle>
                  <EvidenceNumber>#{idx + 1}. </EvidenceNumber>
                  {evidence?.title}
                </EvidenceTitle>
                {evidence?.fileURI ? (
                  <AttachmentLink
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          scrollKey(compositeItemId),
                          JSON.stringify({ top: window.scrollY, at: Date.now() }),
                        )
                      } catch {
                        // Storage unavailable: the reader comes back at the top, as before.
                      }
                      openAttachment(`https://cdn.kleros.link${evidence.fileURI}`)
                    }}
                  >
                    <AttachmentIcon aria-hidden="true" />
                    View attached file
                  </AttachmentLink>
                ) : null}
              </EvidenceHeader>
              <EvidenceDescription>
                {linkify(evidence?.description || '')}
              </EvidenceDescription>
              <EvidenceMetadata>
                <EvidenceMetadataItem>
                  <strong>Submitted on:</strong>
                  <SubmissionDate to={`/tx/${evidence.txHash}`}>
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
                  {evidence.partyRole ? <PartyRole>{evidence.partyRole}</PartyRole> : null}
                </EvidenceMetadataItem>
              </EvidenceMetadata>
            </Evidence>
          ))
        ) : (
          <NoEvidenceText>No evidence submitted yet...</NoEvidenceText>
        )}
      </EvidenceSection>
      <InlineEvidenceForm
        ref={formRef}
        registryAddress={registryAddress}
        itemID={itemID}
        compositeItemId={compositeItemId}
      />
    </>
  )
}

export default EvidenceTab
