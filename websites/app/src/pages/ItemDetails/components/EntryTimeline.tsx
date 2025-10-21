import React, { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { _TimelineItem1, CustomTimeline } from '@kleros/ui-components-library'
import { formatTimestamp } from 'utils/formatTimestamp'
import NewTabIcon from 'assets/svgs/icons/new-tab.svg'

const TimelineWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  > div {
    width: 100%;
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

interface EntryTimelineProps {
  detailsData: any
}

const EntryTimeline: React.FC<EntryTimelineProps> = ({ detailsData }) => {
  const theme = useTheme()

  const timelineItems = useMemo<[_TimelineItem1, ..._TimelineItem1[]] | undefined>(() => {
    if (!detailsData) return undefined

    const items: _TimelineItem1[] = []

    // Submission - always present
    items.push({
      title: 'Item Submitted',
      party: (
        <a
          href={`https://gnosisscan.io/tx/${detailsData.requests[0]?.creationTx}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
        >
          <StyledNewTabIcon />
        </a>
      ),
      subtitle: formatTimestamp(Number(detailsData.requests[0]?.submissionTime), true),
      rightSided: true,
      variant: theme.secondaryPurple,
    })

    // Challenge - only if actually disputed
    if (detailsData.disputed && detailsData.requests[0]?.challenger) {
      items.push({
        title: 'Item Challenged',
        party: detailsData.requests[0].challenger,
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

          items.push({
            title: `Jury Decision - Round ${index + 1}`,
            party: rulingText,
            subtitle: formatTimestamp(Number(round.appealPeriodStart), true),
            rightSided: true,
            variant: theme.secondaryPurple,
          })
        }

        // Appeal - only if there's another round after this one AND appeal was actually made
        if (index < detailsData.requests[0].rounds.length - 1 && round.appealPeriodEnd && Number(round.appealPeriodEnd) > 0) {
          items.push({
            title: 'Appealed',
            party: '',
            subtitle: formatTimestamp(Number(round.appealPeriodEnd), true),
            rightSided: true,
            variant: theme.secondaryPurple,
          })
        }
      })
    }

    // Resolution - only if actually resolved
    if (detailsData.requests[0]?.resolved && detailsData.requests[0]?.resolutionTime && Number(detailsData.requests[0].resolutionTime) > 0) {
      const finalStatus = detailsData.status === 'Registered' ? 'Item Included' : 'Item Removed'
      items.push({
        title: 'Resolved',
        party: finalStatus,
        subtitle: formatTimestamp(Number(detailsData.requests[0].resolutionTime), true),
        rightSided: true,
        variant: theme.primaryBlue,
      })
    }

    return items.length > 0 ? items as [_TimelineItem1, ..._TimelineItem1[]] : undefined
  }, [detailsData, theme])

  if (!timelineItems) return null

  return (
    <TimelineWrapper>
      <CustomTimeline items={timelineItems} />
    </TimelineWrapper>
  )
}

export default EntryTimeline
