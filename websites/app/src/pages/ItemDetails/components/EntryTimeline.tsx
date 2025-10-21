import React, { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { Link } from 'react-router-dom'
import { CustomTimeline, _TimelineItem1 } from '@kleros/ui-components-library'
import { formatTimestamp } from 'utils/formatTimestamp'
import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'
import ArrowIcon from 'assets/svgs/icons/arrow.svg'
import NewTabIcon from 'assets/svgs/icons/new-tab.svg'
import { hoverShortTransitionTiming } from 'styles/commonStyles'

const Container = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
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

interface EntryTimelineProps {
  detailsData: any
}

const EntryTimeline: React.FC<EntryTimelineProps> = ({ detailsData }) => {
  const theme = useTheme()

  const timelineItems = useMemo<[_TimelineItem1, ..._TimelineItem1[]] | undefined>(() => {
    if (!detailsData) return undefined

    const items: _TimelineItem1[] = []

    // Submission - always present
    const creationTx = detailsData.requests[0]?.creationTx
    items.push({
      title: 'Item Submitted',
      party: detailsData.requests[0]?.requester ? (
        <PartyWrapper>
          <ByText>by </ByText>
          <AddressLink to={`/activity/ongoing?userAddress=${detailsData.requests[0].requester}`}>
            <IdenticonOrAvatar size="20" address={detailsData.requests[0].requester as `0x${string}`} />
            <AddressOrName address={detailsData.requests[0].requester as `0x${string}`} smallDisplay />
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
          {formatTimestamp(Number(detailsData.requests[0]?.submissionTime), true)}
        </DateLink>
      ) : (
        formatTimestamp(Number(detailsData.requests[0]?.submissionTime), true)
      ),
      rightSided: true,
      variant: theme.secondaryPurple,
    })

    // Challenge - only if actually disputed
    if (detailsData.disputed && detailsData.requests[0]?.challenger) {
      items.push({
        title: 'Item Challenged',
        party: (
          <PartyWrapper>
            <ByText>by </ByText>
            <AddressLink to={`/activity/ongoing?userAddress=${detailsData.requests[0].challenger}`}>
              <IdenticonOrAvatar size="20" address={detailsData.requests[0].challenger as `0x${string}`} />
              <AddressOrName address={detailsData.requests[0].challenger as `0x${string}`} smallDisplay />
              <ArrowIcon />
            </AddressLink>
          </PartyWrapper>
        ),
        subtitle: detailsData.requests[0]?.submissionTime ? formatTimestamp(Number(detailsData.requests[0].submissionTime), true) : '',
        rightSided: true,
        variant: theme.secondaryPurple,
      })
    }

    // Jury decisions and appeals - only if there are actual rounds with rulings
    if (detailsData.requests[0]?.rounds && detailsData.requests[0].rounds.length > 0) {
      detailsData.requests[0].rounds.forEach((round: any, index: number) => {
        // Only show jury decision if there's an actual ruling (not "None" or empty)
        if (round.ruling && round.ruling !== 'None' && round.appealPeriodStart && Number(round.appealPeriodStart) > 0) {
          const rulingText = round.ruling === 'Accept' ? 'Accept Entry' :
                           round.ruling === 'Reject' ? 'Reject Entry' :
                           'Refuse to Arbitrate'
          const txHashAppealPossible = round.txHashAppealPossible

          items.push({
            title: `Jury Decision - Round ${index + 1}`,
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

        // Appeal - only if there's another round after this one AND appeal was actually made
        if (index < detailsData.requests[0].rounds.length - 1 && round.appealPeriodEnd && Number(round.appealPeriodEnd) > 0) {
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
            variant: theme.secondaryPurple,
          })
        }
      })
    }

    // Resolution - only if actually resolved
    if (detailsData.requests[0]?.resolved && detailsData.requests[0]?.resolutionTime && Number(detailsData.requests[0].resolutionTime) > 0) {
      const finalStatus = detailsData.status === 'Registered' ? 'Item Included' : 'Item Removed'
      const resolutionTx = detailsData.requests[0]?.resolutionTx
      items.push({
        title: 'Resolved',
        party: finalStatus,
        subtitle: resolutionTx ? (
          <DateLink
            href={`https://gnosisscan.io/tx/${resolutionTx}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {formatTimestamp(Number(detailsData.requests[0].resolutionTime), true)}
          </DateLink>
        ) : (
          formatTimestamp(Number(detailsData.requests[0].resolutionTime), true)
        ),
        rightSided: true,
        variant: theme.primaryBlue,
      })
    }

    return items.length > 0 ? items as [_TimelineItem1, ..._TimelineItem1[]] : undefined
  }, [detailsData, theme])

  if (!timelineItems) return null

  return (
    <Container>
      <StyledTimeline items={timelineItems} />
    </Container>
  )
}

export default EntryTimeline
