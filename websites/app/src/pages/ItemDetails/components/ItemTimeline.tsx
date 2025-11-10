import React, { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { Link } from 'react-router-dom'
import { CustomTimeline } from '@kleros/ui-components-library'
import { formatTimestamp } from 'utils/formatTimestamp'
import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'
import ArrowIcon from 'assets/svgs/icons/arrow.svg'
import NewTabIcon from 'assets/svgs/icons/new-tab.svg'
import { hoverShortTransitionTiming } from 'styles/commonStyles'

type TimelineItem = {
  title: string
  party?: string | React.ReactNode
  subtitle?: React.ReactNode
  rightSided?: boolean
  variant?: string
}

const Container = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
  z-index: 1;
`

const StyledTimeline = styled(CustomTimeline)`
  width: 100%;

  li {
    margin-bottom: 0;

    > div:not(:first-child) {
      margin-left: 20px;
      margin-bottom: 18px;
      gap: 2px;

      @media (max-width: 900px) {
        margin-left: 16px;
        margin-bottom: 16px;
        gap: 4px;
      }
    }

    &:last-child > div:not(:first-child) {
      margin-bottom: 0;
    }

    h2 {
      font-size: 14px;
      line-height: 1.5;
      font-weight: 600;
      color: ${({ theme }) => theme.primaryText};
      margin: 0;
    }

    p {
      font-size: 14px;
      line-height: 1.5;
      font-weight: 400;
      color: ${({ theme }) => theme.primaryBlue};
      margin: 0;
    }

    small {
      font-size: 12px;
      line-height: 1.5;
      color: ${({ theme }) => theme.secondaryText};

      a {
        font-size: 12px;
        line-height: 1.5;
        color: ${({ theme }) => theme.secondaryText};
      }
    }

    /* Make bullet circles transparent - target the rounded circle */
    > div:first-child div[class*="rounded"] {
      background: transparent !important;
    }

    /* Override the connecting line color to match theme stroke */
    > div:first-child div[class*="border-l"] {
      border-left-color: ${({ theme }) => theme.stroke} !important;
    }
  }
`

const StyledNewTabIcon = styled(NewTabIcon)`
  margin-bottom: 2px;
  width: 16px;
  height: 16px;
  path {
    fill: ${({ theme }) => theme.primaryBlue};
  }
  :hover {
    path {
      fill: ${({ theme }) => theme.secondaryBlue};
    }
  }
`

const AddressLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  cursor: pointer !important;
  ${hoverShortTransitionTiming}

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

const TxLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  ${hoverShortTransitionTiming}

  svg {
    width: 12px;
    height: 12px;
    path {
      fill: ${({ theme }) => theme.secondaryText};
    }
  }

  &:hover svg path {
    fill: ${({ theme }) => theme.primaryText};
  }
`

const DateLink = styled.a`
  color: ${({ theme }) => theme.secondaryText};
  text-decoration: none;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    text-decoration: underline;
  }
`

const DateText = styled.span`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;
  font-weight: 400;
`

const ByText = styled.span`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  margin-right: 4px;
`

const PartyWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

interface ItemTimelineProps {
  detailsData: any
}

const ItemTimeline: React.FC<ItemTimelineProps> = ({ detailsData }) => {
  const theme = useTheme()

  const timelineItems = useMemo<[TimelineItem, ...TimelineItem[]] | undefined>(() => {
    if (!detailsData) return undefined

    const items: TimelineItem[] = []

    // Sort requests chronologically (oldest first) - requests come from GraphQL ordered by submissionTime desc
    const sortedRequests = [...(detailsData.requests || [])].reverse()

    // Process each request chronologically
    sortedRequests.forEach((request: any, requestIndex: number) => {
      // Submission - always present for each request
      const creationTx = request?.creationTx
      const requestTypeLabel = request.requestType === 'Registration' ? 'Registration Requested' : 'Removal Requested'

      items.push({
        title: requestIndex === 0 ? 'Item Submitted' : requestTypeLabel,
        party: request?.requester ? (
          <PartyWrapper>
            <ByText>by </ByText>
            <AddressLink to={`/activity/ongoing?userAddress=${request.requester}`}>
              <IdenticonOrAvatar size="20" address={request.requester as `0x${string}`} />
              <AddressOrName address={request.requester as `0x${string}`} smallDisplay />
              <ArrowIcon />
            </AddressLink>
          </PartyWrapper>
        ) : (
          <TxLink
            href={`https://gnosisscan.io/tx/${creationTx}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <StyledNewTabIcon />
          </TxLink>
        ),
        subtitle: creationTx ? (
          <DateLink
            href={`https://gnosisscan.io/tx/${creationTx}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {formatTimestamp(Number(request?.submissionTime), true)}
          </DateLink>
        ) : (
          formatTimestamp(Number(request?.submissionTime), true)
        ),
        rightSided: true,
        variant: theme.secondaryPurple,
      })

      // Challenge - only if actually disputed
      if (request.disputed && request?.challenger) {
        items.push({
          title: 'Item Challenged',
          party: (
            <PartyWrapper>
              <ByText>by </ByText>
              <AddressLink to={`/activity/ongoing?userAddress=${request.challenger}`}>
                <IdenticonOrAvatar size="20" address={request.challenger as `0x${string}`} />
                <AddressOrName address={request.challenger as `0x${string}`} smallDisplay />
                <ArrowIcon />
              </AddressLink>
            </PartyWrapper>
          ),
          subtitle: request?.submissionTime ? (
            <DateText>{formatTimestamp(Number(request.submissionTime), true)}</DateText>
          ) : '',
          rightSided: true,
          variant: theme.orange,
        })
      }

      // Jury decisions and appeals - only if there are actual rounds with rulings
      if (request?.rounds && request.rounds.length > 0) {
        // Sort rounds chronologically (oldest first) - rounds come from GraphQL ordered by creationTime desc
        const sortedRounds = [...request.rounds].reverse()

        // Track the actual round number for display (only counting rounds with rulings)
        let displayedRoundNumber = 0

        sortedRounds.forEach((round: any, index: number) => {
          // Only show jury decision if there's an actual ruling (not "None" or empty)
          if (round.ruling && round.ruling !== 'None' && round.appealPeriodStart && Number(round.appealPeriodStart) > 0) {
            displayedRoundNumber++

            const rulingText = round.ruling === 'Accept' ? 'Accept Item' :
                             round.ruling === 'Reject' ? 'Reject Item' :
                             'Refuse to Arbitrate'
            const txHashAppealPossible = round.txHashAppealPossible

            items.push({
              title: `Jury Decision - Round ${displayedRoundNumber}`,
              party: rulingText,
              subtitle: txHashAppealPossible ? (
                <DateLink
                  href={`https://gnosisscan.io/tx/${txHashAppealPossible}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {formatTimestamp(Number(round.appealPeriodStart), true)}
                </DateLink>
              ) : (
                formatTimestamp(Number(round.appealPeriodStart), true)
              ),
              rightSided: true,
              variant: theme.secondaryPurple,
            })
          }

          // Appeal - only if there's another round after this one AND BOTH sides have funded their appeals
          // Check that the appeal period has ended (is in the past) before showing "Appealed"
          if (index < sortedRounds.length - 1 && round.appealPeriodEnd && Number(round.appealPeriodEnd) > 0) {
            const currentTimestamp = Math.floor(Date.now() / 1000)
            const appealPeriodEndTimestamp = Number(round.appealPeriodEnd)

            // Only show "Appealed" if the appeal period has actually ended AND both sides have funded
            if (appealPeriodEndTimestamp < currentTimestamp && round.hasPaidRequester && round.hasPaidChallenger) {
              const txHashAppealDecision = round.txHashAppealDecision

              items.push({
                title: 'Appealed',
                party: '',
                subtitle: txHashAppealDecision ? (
                  <DateLink
                    href={`https://gnosisscan.io/tx/${txHashAppealDecision}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {formatTimestamp(Number(round.appealPeriodEnd), true)}
                  </DateLink>
                ) : (
                  formatTimestamp(Number(round.appealPeriodEnd), true)
                ),
                rightSided: true,
                variant: theme.primaryBlue,
              })
            }
          }
        })
      }

      // Resolution - only if actually resolved
      if (request?.resolved && request?.resolutionTime && Number(request.resolutionTime) > 0) {
        // Determine the outcome based on request type and whether it was accepted
        let resolutionTitle = ''

        // Check if this is the last request to determine final item state
        const isLastRequest = requestIndex === sortedRequests.length - 1

        // Normalize requestType to handle case variations
        const normalizedRequestType = request.requestType?.toLowerCase()

        if (normalizedRequestType === 'registration') {
          // Registration request was resolved
          if (!request.disputed || request.disputeOutcome === 'Accept') {
            resolutionTitle = 'Item Included'
          } else {
            resolutionTitle = 'Registration Rejected'
          }
        } else if (normalizedRequestType === 'clearing') {
          // Removal request was resolved
          if (!request.disputed || request.disputeOutcome === 'Accept') {
            resolutionTitle = 'Item Removed'
          } else {
            resolutionTitle = 'Removal Rejected'
          }
        } else {
          // Fallback - requestType is null/undefined or doesn't match expected values
          // Try to infer from request outcome and position
          if (requestIndex === 0) {
            // This is the first/original request - it was always a registration
            if (!request.disputed || request.disputeOutcome === 'Accept') {
              resolutionTitle = 'Item Included'
            } else {
              resolutionTitle = 'Registration Rejected'
            }
          } else if (isLastRequest) {
            // This is the most recent request - use current item status to infer
            if (detailsData.status === 'Registered') {
              resolutionTitle = 'Item Included'
            } else if (detailsData.status === 'Absent') {
              resolutionTitle = 'Item Removed'
            } else {
              resolutionTitle = 'Request Resolved'
            }
          } else {
            // Middle request - check the disputeOutcome to give better context
            if (request.disputeOutcome === 'Accept') {
              // Request was accepted - determine what it was
              // If previous state was Registered, this was likely a removal
              // If previous state was Absent, this was likely a registration
              // Without that info, we can't be certain, so keep generic
              resolutionTitle = 'Request Accepted'
            } else if (request.disputeOutcome === 'Reject') {
              resolutionTitle = 'Request Rejected'
            } else {
              resolutionTitle = 'Request Resolved'
            }
          }
        }

        const resolutionTx = request?.resolutionTx

        // Set color based on resolution outcome
        let resolutionColor = theme.primaryBlue
        if (resolutionTitle === 'Item Removed') {
          resolutionColor = theme.error || '#FF4D4F' // Red for removals
        } else if (resolutionTitle === 'Item Included') {
          resolutionColor = theme.success || '#52C41A' // Green for inclusions
        }

        items.push({
          title: resolutionTitle,
          party: '',
          subtitle: resolutionTx ? (
            <DateLink
              href={`https://gnosisscan.io/tx/${resolutionTx}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {formatTimestamp(Number(request.resolutionTime), true)}
            </DateLink>
          ) : (
            formatTimestamp(Number(request.resolutionTime), true)
          ),
          rightSided: true,
          variant: resolutionColor,
        })
      }
    })

    return items.length > 0 ? items as [TimelineItem, ...TimelineItem[]] : undefined
  }, [detailsData, theme])

  if (!timelineItems) return null

  return (
    <Container>
      <StyledTimeline items={timelineItems} />
    </Container>
  )
}

export default ItemTimeline
