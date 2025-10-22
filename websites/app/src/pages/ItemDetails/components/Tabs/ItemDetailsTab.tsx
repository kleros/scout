import React from 'react'
import styled from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import { responsiveSize } from 'styles/responsiveSize'
import NewTabIcon from 'assets/svgs/icons/new-tab.svg'
import CrowdfundingCard from 'components/CrowdfundingCard'
import { STATUS_CODE } from 'utils/itemStatus'
import ItemTimeline from '../ItemTimeline'
import ItemFieldsDisplay from '../ItemFieldsDisplay'
import ScoutBigLogo from 'assets/svgs/backgrounds/scout-big-logo.svg'

const AppealInfoBox = styled.div`
  background: transparent;
  padding: 20px 0;
  margin: 16px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 48px;
  align-items: center;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    padding: 16px 0;
  }
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

const AppealStatusValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #cd9dff;
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
  color: ${({ funded }) => (funded ? '#48BB78' : '#CD9DFF')};
  border: 1px solid ${({ funded }) => (funded ? '#48BB78' : '#CD9DFF')};
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
        ? 'rgba(72, 187, 120, 0.12)'
        : ruling === 'Reject'
        ? 'rgba(245, 101, 101, 0.12)'
        : ruling === 'Refuse'
        ? 'rgba(160, 174, 192, 0.12)'
        : 'rgba(237, 137, 54, 0.12)'
    return `linear-gradient(${overlayColor}, ${overlayColor}), ${baseColor}`
  }};
  color: ${({ ruling }) => {
    if (ruling === 'Accept') return '#48BB78'
    if (ruling === 'Reject') return '#F56565'
    if (ruling === 'Refuse') return '#D1D5DB'
    return '#ED8936'
  }};
  border: none;
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
  registryParametersLoading: boolean
  challengePeriodDuration: number | null
  shouldShowCrowdfunding: boolean
  currentRulingRound: any
  appealRemainingTime: any
  formattedLoserTimeLeft: string | null
  formattedWinnerTimeLeft: string | null
  appealCost: any
  appealCostLoading: boolean
  registryParameters: any
  registryParsedFromItemId: string
}

const ItemDetailsTab: React.FC<ItemDetailsTabProps> = ({
  detailsData,
  statusCode,
  registryParametersLoading,
  challengePeriodDuration,
  shouldShowCrowdfunding,
  currentRulingRound,
  appealRemainingTime,
  formattedLoserTimeLeft,
  formattedWinnerTimeLeft,
  appealCost,
  appealCostLoading,
  registryParameters,
  registryParsedFromItemId,
}) => {
  return (
    <PaddedContent>
      <ScoutWatermark>
        <ScoutBigLogo />
      </ScoutWatermark>
      <ItemFieldsDisplay
        detailsData={detailsData}
        registryParsedFromItemId={registryParsedFromItemId}
      />
      <ItemTimeline detailsData={detailsData} />

      {/* Crowdfunding Card - show for active appeals */}
      {detailsData.disputed && !detailsData.requests[0].resolved && (
        <>
          {/* Show skeleton only if we're still loading */}
          {(statusCode === null || registryParametersLoading) && challengePeriodDuration !== null ? (
            <AppealInfoBox>
              <AppealInfoItem>
                <AppealInfoLabel>Current Ruling</AppealInfoLabel>
                <Skeleton width="100px" height="32px" />
              </AppealInfoItem>
              <AppealInfoItem>
                <AppealInfoLabel>Track Case</AppealInfoLabel>
                <Skeleton width="150px" height="20px" />
              </AppealInfoItem>
              {statusCode === STATUS_CODE.CROWDFUNDING || statusCode === STATUS_CODE.CROWDFUNDING_WINNER ? (
                <>
                  <AppealInfoItem>
                    <AppealInfoLabel>Appeal Status</AppealInfoLabel>
                    <Skeleton width="150px" height="20px" />
                  </AppealInfoItem>
                  <AppealInfoItem>
                    <AppealInfoLabel>Submitter</AppealInfoLabel>
                    <Skeleton width="80px" height="28px" />
                  </AppealInfoItem>
                  <AppealInfoItem>
                    <AppealInfoLabel>Challenger</AppealInfoLabel>
                    <Skeleton width="80px" height="28px" />
                  </AppealInfoItem>
                </>
              ) : null}
            </AppealInfoBox>
          ) : (
            <AppealInfoBox>
              <AppealInfoItem>
                <AppealInfoLabel>Current Ruling</AppealInfoLabel>
                {(() => {
                  const ruling = currentRulingRound?.ruling

                  let badgeType = 'None'
                  let badgeText = 'No Ruling Yet'

                  if (ruling === 'Accept') {
                    badgeType = 'Accept'
                    badgeText = 'Accept Item'
                  } else if (ruling === 'Reject') {
                    badgeType = 'Reject'
                    badgeText = 'Reject Item'
                  } else if (ruling === 'None' || ruling === 'Refuse') {
                    badgeType = 'Refuse'
                    badgeText = 'Pending / Refused to Arbitrate'
                  }

                  return (
                    <RulingBadge ruling={badgeType}>
                      {badgeText}
                    </RulingBadge>
                  )
                })()}
              </AppealInfoItem>
              {shouldShowCrowdfunding && (
                <>
                  <AppealInfoItem>
                    <AppealInfoLabel>Appeal Status</AppealInfoLabel>
                    <AppealStatusValue>
                      Crowdfunding Active
                    </AppealStatusValue>
                  </AppealInfoItem>
                  {detailsData.requests[0].rounds?.[0] && appealRemainingTime && (
                    <>
                      <AppealInfoItem>
                        <AppealInfoLabel>
                          Submitter {appealRemainingTime.loserIsRequester ? '(Loser)' : '(Winner)'}
                        </AppealInfoLabel>
                        <FundingStatus funded={detailsData.requests[0].rounds[0].hasPaidRequester}>
                          {detailsData.requests[0].rounds[0].hasPaidRequester ? '✓ Funded' : 'Funding'}
                        </FundingStatus>
                        {!detailsData.requests[0].rounds[0].hasPaidRequester && (
                          <AppealStatusValue style={{ fontSize: '12px', marginTop: '4px', color: '#A0AEC0' }}>
                            {appealRemainingTime.loserIsRequester && appealRemainingTime.isLoserPeriod
                              ? `${formattedLoserTimeLeft} left`
                              : !appealRemainingTime.loserIsRequester && !appealRemainingTime.isLoserPeriod
                              ? `${formattedWinnerTimeLeft} left`
                              : `Awaits loser's move`}
                          </AppealStatusValue>
                        )}
                      </AppealInfoItem>
                      <AppealInfoItem>
                        <AppealInfoLabel>
                          Challenger {!appealRemainingTime.loserIsRequester ? '(Loser)' : '(Winner)'}
                        </AppealInfoLabel>
                        <FundingStatus funded={detailsData.requests[0].rounds[0].hasPaidChallenger}>
                          {detailsData.requests[0].rounds[0].hasPaidChallenger ? '✓ Funded' : 'Funding'}
                        </FundingStatus>
                        {!detailsData.requests[0].rounds[0].hasPaidChallenger && (
                          <AppealStatusValue style={{ fontSize: '12px', marginTop: '4px', color: '#A0AEC0' }}>
                            {!appealRemainingTime.loserIsRequester && appealRemainingTime.isLoserPeriod
                              ? `${formattedLoserTimeLeft} left`
                              : appealRemainingTime.loserIsRequester && !appealRemainingTime.isLoserPeriod
                              ? `${formattedWinnerTimeLeft} left`
                              : `Awaits loser's move`}
                          </AppealStatusValue>
                        )}
                      </AppealInfoItem>
                    </>
                  )}
                </>
              )}
              <AppealInfoItem>
                <AppealInfoLabel>Track Case</AppealInfoLabel>
                <CaseLink
                  href={`https://klerosboard.com/100/cases/${detailsData.requests[0].disputeID}`}
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

      {detailsData.disputed && !detailsData.requests[0].resolved && shouldShowCrowdfunding && (
        <>
          {(!registryParameters || !appealCost || appealCostLoading || registryParametersLoading) && challengePeriodDuration !== null && statusCode !== STATUS_CODE.WAITING_ARBITRATOR ? (
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
              timestamp={Math.floor(Date.now() / 1000)}
              challengePeriodDuration={challengePeriodDuration}
              appealCost={appealCost}
              sharedStakeMultiplier={registryParameters.sharedStakeMultiplier}
              winnerStakeMultiplier={registryParameters.winnerStakeMultiplier}
              loserStakeMultiplier={registryParameters.loserStakeMultiplier}
              MULTIPLIER_DIVISOR={registryParameters.MULTIPLIER_DIVISOR}
              registryAddress={registryParsedFromItemId}
            />
          )}
        </>
      )}
    </PaddedContent>
  )
}

export default ItemDetailsTab
