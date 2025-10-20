import React, { useMemo, useState } from 'react'
import styled, { css } from 'styled-components'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { formatEther } from 'ethers'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import ReactMarkdown from 'react-markdown'
import { renderValue, StyledWebsiteAnchor } from 'utils/renderValue'
import { useItemDetailsQuery } from 'hooks/queries'
import { formatTimestamp } from 'utils/formatTimestamp'
import { getStatusLabel } from 'utils/getStatusLabel'
import LoadingItems from '../Registries/LoadingItems'
import ConfirmationBox from 'components/ConfirmationBox'
import { SubmitButton } from '../Registries/SubmitEntries/AddEntryModal'
import AttachmentIcon from 'assets/svgs/icons/attachment.svg'
import useHumanizedCountdown, {
  useChallengeRemainingTime,
} from 'hooks/countdown'
import AddressDisplay from 'components/AddressDisplay'
import SubmittedByLink from 'components/SubmittedByLink'
import { useScrollTop } from 'hooks/useScrollTop'
import ArrowLeftIcon from 'assets/svgs/icons/arrow-left.svg'
import NewTabIcon from 'assets/svgs/icons/new-tab.svg'
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay'
import CrowdfundingCard from 'components/CrowdfundingCard'
import useAppealCost from 'hooks/useAppealCost'
import useRegistryParameters from 'hooks/useRegistryParameters'
import { itemToStatusCode, STATUS_CODE, SUBGRAPH_RULING } from 'utils/itemStatus'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  min-height: 100vh;
  padding: 32px 16px 64px;
  font-family: "Open Sans", sans-serif;
  background: ${({ theme }) => theme.lightBackground};

  ${landscapeStyle(
    () => css`
      padding: 48px ${responsiveSize(0, 48)} 60px;
    `,
  )}
`

const Header = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
`

const BackButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primaryText};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
  flex: 1;
`

const TabsWrapper = styled.div`
  display: flex;
  gap: 40px;
  border-bottom: 1px solid ${({ theme }) => theme.lightGrey};
  margin-bottom: 24px;
`

const TabButton = styled.button<{ selected: boolean }>`
  background: none;
  border: none;
  padding: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme, selected }) =>
    selected ? theme.primaryText : theme.secondaryText};
  border-bottom: 3px solid
    ${({ theme, selected }) => (selected ? theme.primaryText : 'transparent')};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 12px;
  padding: ${responsiveSize(16, 24)};
  word-break: break-word;
`

const StatusButton = styled.button<{ status?: string }>`
  background-color: #FFFFFF;
  color: #000000;
  padding: 12px 24px;
  font-family: "Open Sans", sans-serif;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 9999px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: #F0F0F0;
  }

  &:disabled {
    background-color: #666666;
    color: #999999;
    cursor: not-allowed;
  }

  ${landscapeStyle(
    () => css`
      padding: 12px 20px;
    `,
  )}
`

const StatusSpan = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ status }) => {
    const colors = {
      Registered: '#48BB78',
      RegistrationRequested: '#ED8936',
      ClearingRequested: '#D69E2E',
      Absent: '#718096',
    }
    return colors[status] || '#718096'
  }};
  border-radius: 20px;
  border: 2px solid
    ${({ status }) => {
      const colors = {
        Registered: '#48BB78',
        RegistrationRequested: '#ED8936',
        ClearingRequested: '#D69E2E',
        Absent: '#718096',
      }
      return colors[status] || '#718096'
    }};
  background: transparent;

  &:after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${({ status }) => {
      const colors = {
        Registered: '#48BB78',
        RegistrationRequested: '#ED8936',
        ClearingRequested: '#D69E2E',
        Absent: '#718096',
      }
      return colors[status] || '#718096'
    }};
  }
`

const ItemHeader = styled.div`
  display: flex;
  font-size: 20px;
  font-weight: 600;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${responsiveSize(32, 16)};
`

const EntryDetailsContainer = styled.div`
  display: flex;
  padding: 20px 0;
  flex-direction: row;
  margin-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.lightGrey};
  gap: 16px;
  flex-wrap: wrap;

  button img,
  img {
    width: 100px !important;
    cursor: pointer;
  }

  button {
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }
`

const AppealInfoBox = styled.div`
  background: rgba(205, 157, 255, 0.05);
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 12px;
  padding: 20px 24px;
  margin: 16px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 48px;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    padding: 16px 20px;
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
  color: #cd9dff;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    fill: #cd9dff;
    width: 14px;
    height: 14px;
  }

  &:hover {
    text-decoration: underline;
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
  background: ${({ funded }) => (funded ? 'rgba(72, 187, 120, 0.1)' : 'rgba(205, 157, 255, 0.1)')};
  color: ${({ funded }) => (funded ? '#48BB78' : '#CD9DFF')};
  border: 1px solid ${({ funded }) => (funded ? '#48BB78' : '#CD9DFF')};
  width: fit-content;
`

const RulingBadge = styled.span<{ ruling: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  width: fit-content;
  text-align: center;
  line-height: 1.3;
  background: ${({ ruling }) => {
    if (ruling === 'Accept') return 'rgba(72, 187, 120, 0.2)'
    if (ruling === 'Reject') return 'rgba(245, 101, 101, 0.2)'
    if (ruling === 'Refuse') return 'rgba(160, 174, 192, 0.2)'
    return 'rgba(237, 137, 54, 0.2)'
  }};
  color: ${({ ruling }) => {
    if (ruling === 'Accept') return '#48BB78'
    if (ruling === 'Reject') return '#F56565'
    if (ruling === 'Refuse') return '#A0AEC0'
    return '#ED8936'
  }};
  border: 1px solid ${({ ruling }) => {
    if (ruling === 'Accept') return '#48BB78'
    if (ruling === 'Reject') return '#F56565'
    if (ruling === 'Refuse') return '#A0AEC0'
    return '#ED8936'
  }};
`

const Skeleton = styled.div<{ width?: string; height?: string }>`
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  height: ${({ height }) => height || '20px'};
  width: ${({ width }) => width || '100%'};

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`

const LabelAndValue = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: 100%;
`

const EvidenceSection = styled.div`
  gap: 16px;
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

const Evidence = styled.div`
  position: relative;
  padding: 24px;
  border-radius: 12px;
  font-family: "Open Sans", sans-serif;
  margin-bottom: 20px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.06) 0%,
    rgba(153, 153, 153, 0.06) 100%
  );
  transition: all 0.2s ease;
  overflow: visible;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(113, 134, 255, 0.3) 0%, rgba(190, 190, 197, 0.2) 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  &:hover {
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(153, 153, 153, 0.08) 100%
    );

    &:before {
      background: linear-gradient(180deg, rgba(113, 134, 255, 0.5) 0%, rgba(190, 190, 197, 0.3) 100%);
    }
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
  background: rgba(0, 0, 0, 0.15);
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
  font-style: italic;
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
  background: rgba(113, 134, 255, 0.15);
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
    background: rgba(113, 134, 255, 0.25);
    border-color: rgba(113, 134, 255, 0.5);
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

export const StyledGitpodLink = styled.a`
  color: ${({ theme }) => theme.primaryText};
  text-decoration: none;
  background-color: dimgrey;
  padding: 2px 6px;
  border-radius: 6px;

  &:hover {
    text-decoration: underline;
  }
`

const ItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [currentTab, setCurrentTab] = useState(0)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [evidenceConfirmationType, setEvidenceConfirmationType] = useState('')

  const scrollTop = useScrollTop()

  const isAttachmentOpen = useMemo(
    () => !!searchParams.get('attachment'),
    [searchParams],
  )

  const { isLoading: detailsLoading, data: detailsData } = useItemDetailsQuery({
    itemId: itemId || '',
    enabled: !!itemId,
  })

  const registryParsedFromItemId = useMemo(
    () => (itemId ? itemId.split('@')[1] : ''),
    [itemId],
  )

  // Fetch registry parameters for crowdfunding calculations
  const { data: registryParameters, isError: registryParametersError, isLoading: registryParametersLoading } = useRegistryParameters(registryParsedFromItemId)

  const challengePeriodDuration = useMemo(() => {
    return registryParameters ? Number(registryParameters.challengePeriodDuration) : null
  }, [registryParameters])

  const challengeRemainingTime = useChallengeRemainingTime(
    detailsData?.requests[0]?.submissionTime,
    detailsData?.disputed,
    challengePeriodDuration,
  )
  const formattedChallengeRemainingTime = useHumanizedCountdown(
    challengeRemainingTime,
    2,
  )

  const arbitrationCostData = useMemo(() => {
    return registryParameters?.arbitrationCost
  }, [registryParameters])

  const deposits = useMemo(() => {
    if (!registryParameters) return undefined
    return {
      submissionBaseDeposit: registryParameters.submissionBaseDeposit,
      removalBaseDeposit: registryParameters.removalBaseDeposit,
      submissionChallengeBaseDeposit: registryParameters.submissionChallengeBaseDeposit,
      removalChallengeBaseDeposit: registryParameters.removalChallengeBaseDeposit,
    }
  }, [registryParameters])

  // Fetch appeal cost for disputed items
  const { data: appealCost, isError: appealCostError, isLoading: appealCostLoading } = useAppealCost(
    detailsData?.requests?.[0]?.arbitrator,
    detailsData?.requests?.[0]?.disputeID,
    detailsData?.requests?.[0]?.arbitratorExtraData,
    detailsData?.requests?.[0]?.disputed,
    detailsData?.requests?.[0]?.resolved,
    detailsData?.requests?.[0]?.rounds?.length,
  )

  const evidences = useMemo(() => {
    if (!detailsData) return []
    return detailsData.requests
      .map((r) => r.evidenceGroup.evidences)
      .flat(1)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  }, [detailsData])

  const formattedDepositCost = useMemo(() => {
    if (!detailsData || !deposits || arbitrationCostData === undefined)
      return '??? xDAI'
    let sum = 0n
    if (detailsData.status === 'Registered') {
      sum = arbitrationCostData + deposits.removalBaseDeposit
    } else if (detailsData.status === 'RegistrationRequested') {
      sum = arbitrationCostData + deposits.submissionChallengeBaseDeposit
    } else if (detailsData.status === 'ClearingRequested') {
      sum = arbitrationCostData + deposits.removalChallengeBaseDeposit
    }
    return `${Number(formatEther(sum))} xDAI`
  }, [detailsData, deposits, arbitrationCostData])

  // Calculate the current status code for appeal/crowdfunding logic
  const statusCode = useMemo(() => {
    if (!detailsData || !challengePeriodDuration) return null
    const timestamp = Math.floor(Date.now() / 1000)
    return itemToStatusCode(detailsData as any, timestamp, challengePeriodDuration)
  }, [detailsData, challengePeriodDuration])

  // Check if we should show crowdfunding section
  // Hide it if loser appeal time is over and loser hasn't funded
  const shouldShowCrowdfunding = useMemo(() => {
    if (!detailsData?.disputed || detailsData.requests[0].resolved) return false
    if (statusCode !== STATUS_CODE.CROWDFUNDING && statusCode !== STATUS_CODE.CROWDFUNDING_WINNER) return false

    const round = detailsData.requests[0]?.rounds?.[0]
    if (!round) return false

    const { ruling, appealPeriodStart, appealPeriodEnd, hasPaidRequester, hasPaidChallenger } = round
    const timestamp = Math.floor(Date.now() / 1000)

    // If we have a ruling and are in crowdfunding period
    if (ruling && ruling !== SUBGRAPH_RULING.NONE && appealPeriodStart && appealPeriodEnd) {
      const start = Number(appealPeriodStart)
      const end = Number(appealPeriodEnd)
      const halfwayPoint = start + (end - start) / 2

      // If we're past halfway point (loser appeal time is over)
      if (timestamp > halfwayPoint) {
        // Determine loser: REJECT ruling means requester loses, ACCEPT means challenger loses
        const loserIsRequester = ruling === SUBGRAPH_RULING.REJECT || ruling === SUBGRAPH_RULING.REJECT_NUM || ruling === 'Reject'
        const loserHasPaid = loserIsRequester ? hasPaidRequester : hasPaidChallenger

        // If loser hasn't funded, hide crowdfunding section
        if (!loserHasPaid) {
          return false
        }
      }
    }

    return true
  }, [detailsData, statusCode])

  // Get the current round with a ruling (the most recent round that has been ruled on)
  const currentRulingRound = useMemo(() => {
    if (!detailsData?.requests[0]?.rounds) return null
    // Find the first round that has a ruling (ruling is not null/undefined)
    return detailsData.requests[0].rounds.find(round => round.ruling != null) || null
  }, [detailsData])

  // Calculate appeal period remaining time (in milliseconds for useHumanizedCountdown)
  const appealRemainingTime = useMemo(() => {
    if (!shouldShowCrowdfunding || !currentRulingRound) return null

    const { appealPeriodStart, appealPeriodEnd, ruling, hasPaidRequester, hasPaidChallenger } = currentRulingRound
    if (!appealPeriodStart || !appealPeriodEnd) return null

    const now = Date.now()
    const start = Number(appealPeriodStart) * 1000
    const end = Number(appealPeriodEnd) * 1000
    const halfwayPoint = start + (end - start) / 2

    // Determine loser: REJECT ruling means requester loses, ACCEPT means challenger loses
    const loserIsRequester = ruling === SUBGRAPH_RULING.REJECT || ruling === SUBGRAPH_RULING.REJECT_NUM || ruling === 'Reject'

    // Check which period we're in
    if (now < halfwayPoint) {
      // Loser appeal period
      return {
        loserTimeLeft: halfwayPoint - now,
        winnerTimeLeft: null,
        isLoserPeriod: true,
        loserIsRequester,
      }
    } else {
      // Winner appeal period (only if loser has funded)
      const loserHasPaid = loserIsRequester ? hasPaidRequester : hasPaidChallenger
      if (loserHasPaid) {
        return {
          loserTimeLeft: null,
          winnerTimeLeft: end - now,
          isLoserPeriod: false,
          loserIsRequester,
        }
      }
    }

    return null
  }, [shouldShowCrowdfunding, currentRulingRound])

  const formattedLoserTimeLeft = useHumanizedCountdown(appealRemainingTime?.loserTimeLeft || null, 2)
  const formattedWinnerTimeLeft = useHumanizedCountdown(appealRemainingTime?.winnerTimeLeft || null, 2)


  const isTagsQueries = useMemo(() => {
    const registry = searchParams.get('registry')
    return registry === 'Tags_Queries'
  }, [searchParams])

  const getPropValue = (label: string) => {
    return detailsData?.props?.find((prop) => prop.label === label)?.value || ''
  }

  const tabs = [
    { key: 'details', label: 'Item Details' },
    { key: 'evidence', label: 'Evidence' },
  ]

  const handleBackClick = () => {
    navigate(-1)
  }

  if (detailsLoading || !detailsData) {
    return (
      <Container>
        <LoadingItems />
      </Container>
    )
  }

  return (
    <Container>
      {isAttachmentOpen ? (
        <EvidenceAttachmentDisplay />
      ) : (
        <>
          {isConfirmationOpen && (
            <ConfirmationBox
              {...{
                evidenceConfirmationType,
                isConfirmationOpen,
                setIsConfirmationOpen,
                detailsData,
                deposits,
                arbitrationCostData,
              }}
            />
          )}

          <Header>
            <BackButton onClick={handleBackClick}>
              <ArrowLeftIcon />
              Return
            </BackButton>
            <Title>
              {detailsData?.props?.find((p) => p.label === 'Name')?.value ||
                detailsData?.props?.find((p) => p.label === 'Description')
                  ?.value ||
                'Item Details'}
            </Title>
          </Header>

          <TabsWrapper>
            {tabs.map((tab, i) => (
              <TabButton
                key={tab.key}
                selected={i === currentTab}
                onClick={() => setCurrentTab(i)}
              >
                {tab.label}
              </TabButton>
            ))}
          </TabsWrapper>

          <ContentWrapper>
            {currentTab === 0 ? (
              // Item Details Tab
              <>
                <ItemHeader>
                  <span>Entry Details</span>
                  <StatusSpan status={detailsData.status}>
                    {detailsData?.disputed
                      ? (shouldShowCrowdfunding
                          ? 'Challenged - Appealable'
                          : 'Challenged')
                      : getStatusLabel(detailsData.status)}
                  </StatusSpan>
                  {!detailsData.disputed && (
                    <StatusButton
                      onClick={() => {
                        setIsConfirmationOpen(true)
                        setEvidenceConfirmationType(detailsData.status)
                      }}
                      status={detailsData.status}
                    >
                      {detailsData.status === 'Registered' && `Remove entry`}
                      {detailsData.status === 'RegistrationRequested' &&
                        'Challenge entry'}
                      {detailsData.status === 'ClearingRequested' &&
                        'Challenge removal'}
                      {' — ' + formattedDepositCost}
                    </StatusButton>
                  )}
                </ItemHeader>

                {/* Dispute Information - Show for all active disputes */}
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
                        {/* Show appeal status skeleton only during appeal period */}
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
                      // Show ruling for all disputes, show appeal info only during crowdfunding
                      <AppealInfoBox>
                        <AppealInfoItem>
                          <AppealInfoLabel>Current Ruling</AppealInfoLabel>
                          {(() => {
                            const ruling = currentRulingRound?.ruling

                            let badgeType = 'None'
                            let badgeText = 'No Ruling Yet'

                            // The API returns string values like "Accept", "Reject", "None" or "Refuse"
                            // NOT the numeric codes '0', '1', '2'
                            if (ruling === 'Accept') {
                              badgeType = 'Accept'
                              badgeText = 'Accept Entry'
                            } else if (ruling === 'Reject') {
                              badgeType = 'Reject'
                              badgeText = 'Reject Entry'
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
                        {/* Only show appeal status and funding info during crowdfunding and if meaningful */}
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
                        {/* Track Case link - always at the end */}
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

                {/* Crowdfunding Card - show skeleton or actual data only during appeal period and if meaningful */}
                {detailsData.disputed && !detailsData.requests[0].resolved && shouldShowCrowdfunding && (
                  <>
                    {/* Show skeleton only if we're loading AND it might be in appeal period */}
                    {(!registryParameters || !appealCost || appealCostLoading || registryParametersLoading) && challengePeriodDuration !== null && statusCode !== STATUS_CODE.WAITING_ARBITRATOR ? (
                      // Loading skeleton for crowdfunding card
                      <ContentWrapper style={{ marginTop: '16px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                          <Skeleton width="200px" height="28px" style={{ margin: '0 auto 8px' }} />
                          <Skeleton width="400px" height="16px" style={{ margin: '0 auto' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                          <div style={{ padding: '20px', background: 'rgba(205, 157, 255, 0.05)', borderRadius: '8px' }}>
                            <Skeleton width="100px" height="20px" style={{ marginBottom: '12px' }} />
                            <Skeleton width="100%" height="6px" style={{ marginBottom: '12px' }} />
                            <Skeleton width="100%" height="16px" style={{ marginBottom: '16px' }} />
                            <Skeleton width="100%" height="40px" />
                          </div>
                          <div style={{ padding: '20px', background: 'rgba(205, 157, 255, 0.05)', borderRadius: '8px' }}>
                            <Skeleton width="100px" height="20px" style={{ marginBottom: '12px' }} />
                            <Skeleton width="100%" height="6px" style={{ marginBottom: '12px' }} />
                            <Skeleton width="100%" height="16px" style={{ marginBottom: '16px' }} />
                            <Skeleton width="100%" height="40px" />
                          </div>
                        </div>
                      </ContentWrapper>
                    ) : (
                      // Show crowdfunding card
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

                <EntryDetailsContainer>
                  {detailsData?.props &&
                    !isTagsQueries &&
                    detailsData?.props.map(({ label, value }) => (
                      <LabelAndValue key={label}>
                        <strong>{label}:</strong> {renderValue(label, value)}
                      </LabelAndValue>
                    ))}
                  {isTagsQueries && (
                    <>
                      <LabelAndValue>
                        <strong>Description:</strong>{' '}
                        {getPropValue('Description')}
                      </LabelAndValue>
                      <LabelAndValue>
                        <strong>Github Repository URL:</strong>
                        <StyledWebsiteAnchor
                          href={`${getPropValue('Github Repository URL').replace('.git', '')}/commit/${getPropValue('Commit hash')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {getPropValue('Github Repository URL')}
                        </StyledWebsiteAnchor>
                        <StyledGitpodLink
                          href="https://gitpod.io/#https://github.com/gmkung/kleros-atq-trustless-retrieval.git"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Test on Gitpod
                        </StyledGitpodLink>
                      </LabelAndValue>
                      <LabelAndValue>
                        <strong>Commit hash:</strong>{' '}
                        {getPropValue('Commit hash')}
                      </LabelAndValue>
                      <LabelAndValue>
                        <strong>EVM Chain ID:</strong>{' '}
                        {getPropValue('EVM Chain ID')}{' '}
                        <AddressDisplay
                          address={`eip155:${getPropValue('EVM Chain ID')}`}
                        />
                      </LabelAndValue>
                    </>
                  )}
                  <LabelAndValue style={{ color: '#CD9DFF' }}>
                    <strong>Submitted by:</strong>{' '}
                    <SubmittedByLink
                      address={detailsData?.requests[0].requester}
                    />
                  </LabelAndValue>
                  <LabelAndValue style={{ color: '#CD9DFF' }}>
                    <strong>Submitted on:</strong>{' '}
                    {formatTimestamp(
                      Number(detailsData?.requests[0].submissionTime),
                      true,
                    )}
                  </LabelAndValue>
                  {detailsData?.status === 'Registered' ? (
                    <LabelAndValue style={{ color: '#CD9DFF' }}>
                      <strong>Included on:</strong>{' '}
                      {formatTimestamp(
                        Number(detailsData?.requests[0].resolutionTime),
                        true,
                      )}
                    </LabelAndValue>
                  ) : null}
                  {formattedChallengeRemainingTime && (
                    <LabelAndValue style={{ color: '#CD9DFF' }}>
                      <strong>Challenge Period ends in:</strong>{' '}
                      {formattedChallengeRemainingTime}
                    </LabelAndValue>
                  )}
                </EntryDetailsContainer>
              </>
            ) : (
              // Evidence Tab
              <EvidenceSection>
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
            )}
          </ContentWrapper>
        </>
      )}
    </Container>
  )
}

export default ItemDetails
