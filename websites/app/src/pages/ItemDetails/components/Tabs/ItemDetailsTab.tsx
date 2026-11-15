import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import Skeleton from 'react-loading-skeleton'
import { responsiveSize } from 'styles/responsiveSize'
import NewTabIcon from 'assets/svgs/icons/new-tab.svg'
import CrowdfundingCard from 'components/CrowdfundingCard'
import ErrorState from 'components/ErrorState'
import { PARTY, STATUS_CODE } from 'utils/itemStatus'
import { AppealInfo, appealDeadlineFor, partyLabel, rulingLabel } from 'utils/itemDetails'
import { formatTimestamp } from 'utils/formatTimestamp'
import ItemTimeline from '../ItemTimeline'
import ItemFieldsDisplay from '../ItemFieldsDisplay'
import Deadline from '../Deadline'
import ScoutBigLogo from 'assets/svgs/backgrounds/scout-big-logo.svg'

const AppealInfoBox = styled.div`
  background: transparent;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 0;
  position: relative;
  z-index: 1;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
      flex-wrap: wrap;
      gap: 24px 48px;
      align-items: center;
      padding: 20px 0;
    `
  )}
`

const AppealInfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const AppealInfoLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryText};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

/* The appeal state in a sentence: it wraps, so it takes the whole row. */
const AppealStatusItem = styled(AppealInfoItem)`
  flex-basis: 100%;
`

const AppealStatusText = styled.p`
  margin: 0;
  max-width: 640px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.primaryText};
`

const SideDeadline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryPurple};

  small {
    font-size: 12px;
    font-weight: 400;
    color: ${({ theme }) => theme.secondaryText};
  }
`

const CaseLink = styled.a`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryBlue};
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    fill: ${({ theme }) => theme.secondaryBlue};
    width: 14px;
    height: 14px;
  }

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
    text-decoration: underline;

    svg {
      fill: ${({ theme }) => theme.primaryBlue};
    }
  }
`

const FundingStatus = styled.span<{ funded: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  background: ${({ theme }) => theme.whiteBackground};
  color: ${({ funded, theme }) => (funded ? theme.success : theme.secondaryPurple)};
  border: 1px solid ${({ funded, theme }) => (funded ? theme.success : theme.secondaryPurple)};
  width: fit-content;
  position: relative;
  z-index: 1;
`

const RulingBadge = styled.span<{ ruling: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
  text-align: center;
  line-height: 1.3;
  position: relative;
  z-index: 1;
  background: ${({ theme, ruling }) => {
    const baseColor = theme.whiteBackground
    const overlayColor =
      ruling === 'Accept'
        ? `${theme.success}1F`
        : ruling === 'Reject'
        ? `${theme.error}1F`
        : ruling === 'Refuse'
        ? `${theme.tertiaryText}1F`
        : `${theme.orange}1F`
    return `linear-gradient(${overlayColor}, ${overlayColor}), ${baseColor}`
  }};
  color: ${({ theme, ruling }) => {
    if (ruling === 'Accept') return theme.success
    if (ruling === 'Reject') return theme.error
    if (ruling === 'Refuse') return theme.tertiaryText
    return theme.orange
  }};
  border: 1px solid ${({ theme }) => theme.stroke};
  box-shadow: none;
`

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: transparent;
  padding: ${responsiveSize(16, 24)};
  word-break: break-word;
`

const PaddedContent = styled.div`
  padding: 8px 0 ${responsiveSize(16, 24)} 0;
  position: relative;
  min-height: 500px;
`

const ScoutWatermark = styled.div`
  position: absolute;
  top: 0;
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

interface ItemDetailsTabProps {
  detailsData: any
  statusCode: number | null
  /** The current time (unix seconds) the status code was computed with. */
  now: number
  challengePeriodDuration: number | null
  shouldShowCrowdfunding: boolean
  appeal: AppealInfo | null
  appealCost: bigint | null | undefined
  registryParameters: any
  registryAddress: string
  /** The appeal fees (registry multipliers or the court's appeal cost) could not be read. */
  appealDataFailed: boolean
  retryingAppealData: boolean
  onRetryAppealData: () => void
}

const sideName = (appeal: AppealInfo, party: PARTY) => partyLabel(appeal, party).toLowerCase()

/**
 * The state of the appeal in one sentence, as the contract applies it (LightGeneralizedTCR
 * fundAppeal and rule): who has to fund, until when, and what happens otherwise.
 */
const AppealStatus: React.FC<{
  appeal: AppealInfo
  statusCode: number | null
  now: number
  crowdfunding: boolean
}> = ({ appeal, statusCode, now, crowdfunding }) => {
  const { hasPaidRequester, hasPaidChallenger, decisive, winner, loser, half, end } = appeal
  const fundedAlone =
    hasPaidRequester === hasPaidChallenger ? null : hasPaidRequester ? PARTY.REQUESTER : PARTY.CHALLENGER
  const otherSide = (party: PARTY) => (party === PARTY.REQUESTER ? PARTY.CHALLENGER : PARTY.REQUESTER)

  let content: React.ReactNode = null
  if (crowdfunding) {
    if (!decisive) {
      content = fundedAlone ? (
        <>
          The {sideName(appeal, fundedAlone)} is fully funded. The {sideName(appeal, otherSide(fundedAlone))} has
          until <Deadline at={end} variant="until" /> to be fully funded too, or loses.
        </>
      ) : (
        <>
          Jurors gave no decisive ruling. Either side can be funded until{' '}
          <Deadline at={end} variant="until" />. If only one side is fully funded, it wins.
        </>
      )
    } else if (loser === PARTY.REQUESTER ? hasPaidRequester : hasPaidChallenger) {
      content = (
        <>
          The {sideName(appeal, loser)} funded the appeal. The {sideName(appeal, winner)} has until{' '}
          <Deadline at={end} variant="until" /> to be fully funded too, or loses.
        </>
      )
    } else {
      content = (
        <>
          The {sideName(appeal, loser)} has until <Deadline at={half} variant="until" /> to fund an appeal, or the
          ruling stands.
        </>
      )
    }
  } else if (statusCode === STATUS_CODE.WAITING_ENFORCEMENT) {
    content = (
      <>
        The {sideName(appeal, loser)} did not fund an appeal in time, so the ruling stands. It can be enforced once
        the appeal period ends ({formatTimestamp(end, true)}).
      </>
    )
  } else if (statusCode === STATUS_CODE.WAITING_ARBITRATOR && appeal.hasRuling && now > end) {
    if (fundedAlone) {
      const name = sideName(appeal, fundedAlone)
      content = `Appeal period over. The ${name} funded the appeal alone, so the ${name} wins when the ruling is enforced.`
    } else if (!decisive) {
      content = `Appeal period over with no decisive ruling. When it is enforced, ${
        appeal.isRemoval ? 'the item stays in the registry' : 'the item is not included'
      } and the deposits are split between the ${sideName(appeal, PARTY.REQUESTER)} and the challenger.`
    } else {
      content = 'Appeal period over. The ruling is final and will be enforced.'
    }
  }

  if (!content) return null
  return (
    <AppealStatusItem>
      <AppealInfoLabel>Appeal Status</AppealInfoLabel>
      <AppealStatusText>{content}</AppealStatusText>
    </AppealStatusItem>
  )
}

/** One side of an open appeal: funded or not, and until when it can be funded. */
const AppealSide: React.FC<{ appeal: AppealInfo; party: PARTY }> = ({ appeal, party }) => {
  const funded = party === PARTY.REQUESTER ? appeal.hasPaidRequester : appeal.hasPaidChallenger
  const role = appeal.decisive ? (party === appeal.winner ? ' (Winner)' : ' (Loser)') : ''
  const deadline = appealDeadlineFor(appeal, party)
  return (
    <AppealInfoItem>
      <AppealInfoLabel>
        {partyLabel(appeal, party)}
        {role}
      </AppealInfoLabel>
      <FundingStatus funded={funded}>{funded ? '✓ Funded' : 'Funding'}</FundingStatus>
      {!funded && (
        <SideDeadline>
          <Deadline at={deadline} variant="left" />
          <small>until {formatTimestamp(deadline, true)}</small>
        </SideDeadline>
      )}
    </AppealInfoItem>
  )
}

const ItemDetailsTab: React.FC<ItemDetailsTabProps> = ({
  detailsData,
  statusCode,
  now,
  challengePeriodDuration,
  shouldShowCrowdfunding,
  appeal,
  appealCost,
  registryParameters,
  registryAddress,
  appealDataFailed,
  retryingAppealData,
  onRetryAppealData,
}) => {
  const latestRequest = detailsData.requests[0]
  const resolved = !!latestRequest?.resolved

  return (
    <PaddedContent>
      <ScoutWatermark>
        <ScoutBigLogo />
      </ScoutWatermark>
      <ItemFieldsDisplay
        detailsData={detailsData}
        registryAddress={registryAddress}
      />
      <ItemTimeline detailsData={detailsData} />

      {/* Appeal Info Box - show for any disputed item (active or resolved) */}
      {/* Check if the current request OR the item itself was ever disputed */}
      {(detailsData.disputed || latestRequest.disputed) && (
        <>
          {/* Skeleton only while the status cannot be computed yet */}
          {!resolved && statusCode === null ? (
            <AppealInfoBox>
              <AppealInfoItem>
                <AppealInfoLabel>Current Ruling</AppealInfoLabel>
                <Skeleton width="100px" height="32px" />
              </AppealInfoItem>
              <AppealInfoItem>
                <AppealInfoLabel>Track Case</AppealInfoLabel>
                <Skeleton width="150px" height="20px" />
              </AppealInfoItem>
            </AppealInfoBox>
          ) : (
            <AppealInfoBox>
              {/* Only show current ruling if dispute is not resolved yet */}
              {!resolved && (
                <AppealInfoItem>
                  <AppealInfoLabel>Current Ruling</AppealInfoLabel>
                  {/* Before jurors vote, the indexer reports the ruling "None" with no appeal period:
                      that is "no ruling yet", not a refusal to arbitrate. */}
                  {appeal?.hasRuling ? (
                    <RulingBadge ruling={appeal.ruling === 'None' ? 'Refuse' : appeal.ruling}>
                      {rulingLabel(appeal.ruling, appeal.isRemoval)}
                    </RulingBadge>
                  ) : (
                    <RulingBadge ruling="Pending">No Ruling Yet</RulingBadge>
                  )}
                </AppealInfoItem>
              )}
              {!resolved && appeal && (
                <AppealStatus
                  appeal={appeal}
                  statusCode={statusCode}
                  now={now}
                  crowdfunding={shouldShowCrowdfunding}
                />
              )}
              {!resolved && shouldShowCrowdfunding && appeal && (
                <>
                  <AppealSide appeal={appeal} party={PARTY.REQUESTER} />
                  <AppealSide appeal={appeal} party={PARTY.CHALLENGER} />
                </>
              )}
              {/* Always show Klerosboard link for disputed items (even after resolved) */}
              <AppealInfoItem>
                <AppealInfoLabel>Track Case</AppealInfoLabel>
                <CaseLink
                  href={`https://klerosboard.com/100/cases/${latestRequest.disputeID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Klerosboard <NewTabIcon />
                </CaseLink>
              </AppealInfoItem>
            </AppealInfoBox>
          )}
        </>
      )}

      {detailsData.disputed && !resolved && shouldShowCrowdfunding && (
        <>
          {appealDataFailed ? (
            <ContentWrapper style={{ marginTop: '16px' }}>
              <ErrorState
                compact
                title="The appeal fees did not load."
                message="Scout reads them from Gnosis, which did not answer. Check your connection and try again."
                onRetry={onRetryAppealData}
                retrying={retryingAppealData}
              />
            </ContentWrapper>
          ) : !registryParameters || !appealCost ? (
            <ContentWrapper style={{ marginTop: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Skeleton width="200px" height="28px" style={{ margin: '0 auto 8px' }} />
                <Skeleton width="400px" height="16px" style={{ margin: '0 auto' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                <div style={{ padding: '20px', background: 'transparent', borderRadius: '8px' }}>
                  <Skeleton width="100px" height="20px" style={{ marginBottom: '12px' }} />
                  <Skeleton width="100%" height="6px" style={{ marginBottom: '12px' }} />
                  <Skeleton width="100%" height="16px" style={{ marginBottom: '16px' }} />
                  <Skeleton width="100%" height="40px" />
                </div>
                <div style={{ padding: '20px', background: 'transparent', borderRadius: '8px' }}>
                  <Skeleton width="100px" height="20px" style={{ marginBottom: '12px' }} />
                  <Skeleton width="100%" height="6px" style={{ marginBottom: '12px' }} />
                  <Skeleton width="100%" height="16px" style={{ marginBottom: '16px' }} />
                  <Skeleton width="100%" height="40px" />
                </div>
              </div>
            </ContentWrapper>
          ) : (
            <CrowdfundingCard
              item={detailsData}
              timestamp={now}
              challengePeriodDuration={challengePeriodDuration}
              appealCost={appealCost}
              sharedStakeMultiplier={registryParameters.sharedStakeMultiplier}
              winnerStakeMultiplier={registryParameters.winnerStakeMultiplier}
              loserStakeMultiplier={registryParameters.loserStakeMultiplier}
              MULTIPLIER_DIVISOR={registryParameters.MULTIPLIER_DIVISOR}
              registryAddress={registryAddress}
            />
          )}
        </>
      )}
    </PaddedContent>
  )
}

export default ItemDetailsTab
