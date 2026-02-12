import React, { useMemo, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { formatEther } from 'ethers'
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useItemDetailsQuery } from 'hooks/queries'
import LoadingItems from '../Registries/LoadingItems'
import ConfirmationBox from 'components/ConfirmationBox'
import useHumanizedCountdown, { useChallengeRemainingTime } from 'hooks/countdown'
import ScrollTop from 'components/ScrollTop'
import ArrowLeftIcon from 'assets/svgs/icons/arrow-left.svg'
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay'
import useAppealCost from 'hooks/useAppealCost'
import useRegistryParameters from 'hooks/useRegistryParameters'
import { itemToStatusCode, STATUS_CODE, SUBGRAPH_RULING } from 'utils/itemStatus'
import { registryMap, revRegistryMap, registryDisplayNames } from 'utils/items'
import Item from '../Registries/ItemsList/Item'
import Breadcrumb from './components/Breadcrumb'
import ItemDetailsContent from './components/ItemDetailsContent'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'
import { formatTimestamp } from 'utils/formatTimestamp'
import ArrowIcon from 'assets/svgs/icons/arrow.svg'
import { errorToast, successToast } from 'utils/wrapWithToast'
import { useCurateInteractions } from 'hooks/contracts/useCurateInteractions'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  padding: 32px 16px 64px;
  font-family: "Open Sans", sans-serif;
  background: ${({ theme }) => theme.lightBackground};
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;

  ${landscapeStyle(
    () => css`
      padding: 48px ${responsiveSize(0, 48)} 60px;
    `,
  )}
`

const TopBar = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
`

const ReturnButton = styled(Link)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }

  svg {
    width: 16px;
    height: 16px;

    path {
      fill: ${({ theme }) => theme.secondaryBlue};
      ${hoverShortTransitionTiming}
    }
  }

  &:hover svg path {
    fill: ${({ theme }) => theme.primaryBlue};
  }
`

const MainCard = styled.div`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  padding: 32px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  width: 100%;

  ${landscapeStyle(
    () => css`
      grid-template-columns: 1fr 380px;
      gap: 40px;
    `,
  )}
`

const LeftSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  order: 1;

  ${landscapeStyle(
    () => css`
      order: 2;
    `,
  )}
`

const RightSection = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  order: 2;

  ${landscapeStyle(
    () => css`
      order: 1;
    `,
  )}
`

const ItemCardWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;

  > div {
    margin-bottom: 0;
  }
`

const SubmissionDetailsSection = styled.div`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-top: none;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: -12px;
`

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  row-gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  line-height: 1.5;
`

const SubmitterLink = styled(Link)`
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

const SubmissionDate = styled.a`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;
  font-style: italic;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    text-decoration: underline;
  }
`

const ItemDetails: React.FC = () => {
  const { registryName: registryNameParam = '', itemID = '' } = useParams<{ registryName: string; itemID: string }>()
  const registryAddress = registryMap[registryNameParam] || registryNameParam
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [evidenceConfirmationType, setEvidenceConfirmationType] = useState('')

  // Reconstruct composite ID for GraphQL query (subgraph format: itemID@registryAddress)
  const itemId = registryAddress && itemID ? `${itemID}@${registryAddress}` : ''

  const isAttachmentOpen = useMemo(
    () => !!searchParams.get('attachment'),
    [searchParams],
  )

  const { isLoading: detailsLoading, data: detailsData } = useItemDetailsQuery({
    itemId: itemId,
    enabled: !!itemId,
  })

  const { executeRequest, isLoading: isExecuting } = useCurateInteractions()

  const registryName = registryDisplayNames[registryNameParam] || registryNameParam || 'Unknown'

  const displayName = useMemo(() => {
    if (!detailsData) return ''
    const name = detailsData.props?.find((prop) => prop.label === 'Name')?.value
    const symbol = detailsData.props?.find((prop) => prop.label === 'Symbol')?.value
    const domain = detailsData.props?.find((prop) => prop.label === 'Domain name')?.value
    const tag = detailsData.props?.find((prop) => prop.label === 'Public Name Tag')?.value
    const desc = detailsData.props?.find((prop) => prop.label === 'Description')?.value
    return name || symbol || domain || tag || desc || 'Item'
  }, [detailsData])

  // Fetch registry parameters
  const { data: registryParameters, isLoading: registryParametersLoading } = useRegistryParameters(registryAddress)

  const challengePeriodDuration = useMemo(() => {
    return registryParameters ? Number(registryParameters.challengePeriodDuration) : null
  }, [registryParameters])

  const challengeRemainingTime = useChallengeRemainingTime(
    detailsData?.requests[0]?.submissionTime,
    detailsData?.disputed,
    challengePeriodDuration,
  )
  const formattedChallengeRemainingTime = useHumanizedCountdown(challengeRemainingTime, 2)

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

  const formattedDepositCost = useMemo(() => {
    if (!detailsData || !deposits || arbitrationCostData === undefined) {
      // Show loading indicator if registry parameters are being fetched
      return registryParametersLoading ? 'Loading...' : '??? xDAI'
    }
    let sum = 0n
    if (detailsData.status === 'Registered') {
      sum = arbitrationCostData + deposits.removalBaseDeposit
    } else if (detailsData.status === 'RegistrationRequested') {
      sum = arbitrationCostData + deposits.submissionChallengeBaseDeposit
    } else if (detailsData.status === 'ClearingRequested') {
      sum = arbitrationCostData + deposits.removalChallengeBaseDeposit
    }
    return `${Number(formatEther(sum))} xDAI`
  }, [detailsData, deposits, arbitrationCostData, registryParametersLoading])

  // Fetch appeal cost for disputed items
  const { data: appealCost, isLoading: appealCostLoading } = useAppealCost(
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

  const statusCode = useMemo(() => {
    if (!detailsData || !challengePeriodDuration) return null
    const timestamp = Math.floor(Date.now() / 1000)
    return itemToStatusCode(detailsData as any, timestamp, challengePeriodDuration)
  }, [detailsData, challengePeriodDuration])

  const shouldShowCrowdfunding = useMemo(() => {
    if (!detailsData?.disputed || detailsData.requests[0].resolved) return false
    if (statusCode !== STATUS_CODE.CROWDFUNDING && statusCode !== STATUS_CODE.CROWDFUNDING_WINNER) return false

    const round = detailsData.requests[0]?.rounds?.[0]
    if (!round) return false

    const { ruling, appealPeriodStart, appealPeriodEnd, hasPaidRequester, hasPaidChallenger } = round
    const timestamp = Math.floor(Date.now() / 1000)

    if (ruling && ruling !== SUBGRAPH_RULING.NONE && appealPeriodStart && appealPeriodEnd) {
      const start = Number(appealPeriodStart)
      const end = Number(appealPeriodEnd)
      const halfwayPoint = start + (end - start) / 2

      if (timestamp > halfwayPoint) {
        const loserIsRequester = ruling === SUBGRAPH_RULING.REJECT || ruling === SUBGRAPH_RULING.REJECT_NUM || ruling === 'Reject'
        const loserHasPaid = loserIsRequester ? hasPaidRequester : hasPaidChallenger

        if (!loserHasPaid) {
          return false
        }
      }
    }

    return true
  }, [detailsData, statusCode])

  const currentRulingRound = useMemo(() => {
    if (!detailsData?.requests[0]?.rounds) return null
    return detailsData.requests[0].rounds.find(round => round.ruling != null) || null
  }, [detailsData])

  const appealRemainingTime = useMemo(() => {
    if (!shouldShowCrowdfunding || !currentRulingRound) return null

    const { appealPeriodStart, appealPeriodEnd, ruling, hasPaidRequester, hasPaidChallenger } = currentRulingRound
    if (!appealPeriodStart || !appealPeriodEnd) return null

    const now = Date.now()
    const start = Number(appealPeriodStart) * 1000
    const end = Number(appealPeriodEnd) * 1000
    const halfwayPoint = start + (end - start) / 2

    const loserIsRequester = ruling === SUBGRAPH_RULING.REJECT || ruling === SUBGRAPH_RULING.REJECT_NUM || ruling === 'Reject'

    if (now < halfwayPoint) {
      return {
        loserTimeLeft: halfwayPoint - now,
        winnerTimeLeft: null,
        isLoserPeriod: true,
        loserIsRequester,
      }
    } else {
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

  // Capture navigation state on first render. location.state is set only by
  // in-app navigation and can be wiped by setSearchParams (e.g. opening an
  // attachment), so we snapshot it in a ref to keep it stable.
  type NavState = { fromApp?: boolean; from?: string; profileTab?: string }
  const navStateRef = useRef<NavState | null>(location.state as NavState | null)
  const navState = navStateRef.current
  const cameFromApp = !!navState?.fromApp

  const { registryUrl, breadcrumbName } = useMemo(() => {
    if (navState?.from === 'home') {
      return { registryUrl: '/', breadcrumbName: 'Home' }
    }

    if (navState?.from === 'profile' && navState.profileTab) {
      return { registryUrl: `/profile/${navState.profileTab}`, breadcrumbName: 'Profile' }
    }

    return { registryUrl: `/${registryNameParam}`, breadcrumbName: registryName }
  }, [navState, registryName, registryNameParam])

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) return

    e.preventDefault()
    if (cameFromApp) navigate(-1)
    else navigate(registryUrl)
  }

  const handleExecuteRequest = async () => {
    if (!detailsData || isExecuting) return

    try {
      await executeRequest(
        registryAddress as `0x${string}`,
        detailsData.itemID
      )
      successToast('Request executed successfully!')
    } catch (error) {
      console.error('Error executing request:', error)
      errorToast('Failed to execute request. Please try again.')
    }
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
      <ScrollTop />
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

          <TopBar>
            <Breadcrumb registryName={breadcrumbName} itemName={displayName} registryUrl={registryUrl} useHistoryBack={cameFromApp} />
            <ReturnButton to={registryUrl} onClick={handleBackClick}>
              <ArrowLeftIcon />
              Return
            </ReturnButton>
          </TopBar>

          <MainCard>
            <RightSection>
              <ItemDetailsContent
                detailsData={detailsData}
                deposits={deposits}
                arbitrationCostData={arbitrationCostData}
                statusCode={statusCode}
                registryParametersLoading={registryParametersLoading}
                challengePeriodDuration={challengePeriodDuration}
                shouldShowCrowdfunding={shouldShowCrowdfunding}
                currentRulingRound={currentRulingRound}
                appealRemainingTime={appealRemainingTime}
                formattedLoserTimeLeft={formattedLoserTimeLeft}
                formattedWinnerTimeLeft={formattedWinnerTimeLeft}
                appealCost={appealCost}
                appealCostLoading={appealCostLoading}
                registryParameters={registryParameters}
                registryAddress={registryAddress}
                evidences={evidences}
                setIsConfirmationOpen={setIsConfirmationOpen}
                setEvidenceConfirmationType={setEvidenceConfirmationType}
              />
            </RightSection>

            <LeftSection>
              <ItemCardWrapper>
                <Item
                  item={detailsData}
                  challengePeriodDuration={challengePeriodDuration}
                  showActionButtons={true}
                  onActionButtonClick={(actionType) => {
                    // Check if deposits are loaded before opening modal
                    if (!deposits || !arbitrationCostData) {
                      errorToast('Loading deposit parameters... Please try again in a moment.')
                      return
                    }
                    setIsConfirmationOpen(true)
                    setEvidenceConfirmationType(actionType)
                  }}
                  onExecuteButtonClick={handleExecuteRequest}
                  actionButtonCost={formattedDepositCost}
                  hideBottomTimers={true}
                  seamlessBottom={true}
                />
              </ItemCardWrapper>

              <SubmissionDetailsSection>
                <DetailRow>
                  Submitted on:
                  <SubmissionDate
                    href={`https://gnosisscan.io/tx/${detailsData.requests[detailsData.requests.length - 1].creationTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {formatTimestamp(Number(detailsData.requests[detailsData.requests.length - 1].submissionTime), true)}
                  </SubmissionDate>
                  by
                  <SubmitterLink
                    to={`/profile/pending?address=${detailsData.requests[detailsData.requests.length - 1].requester}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="20" address={detailsData.requests[detailsData.requests.length - 1].requester as `0x${string}`} />
                    <AddressOrName address={detailsData.requests[detailsData.requests.length - 1].requester as `0x${string}`} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                </DetailRow>
                {formattedChallengeRemainingTime && detailsData.status !== 'Registered' && (
                  <DetailRow>
                    Challenge period ends in: {formattedChallengeRemainingTime}
                  </DetailRow>
                )}
                {detailsData.status === 'Registered' && (() => {
                  // Find the successful registration request (may not be requests[0] if a removal was challenged)
                  const registrationRequest = detailsData.requests?.find(
                    req => req.requestType?.toLowerCase() === 'registrationrequested' && req.resolved && req.resolutionTime
                  )
                  return registrationRequest?.resolutionTime ? (
                    <DetailRow>
                      Included on: {formatTimestamp(Number(registrationRequest.resolutionTime), true)}
                    </DetailRow>
                  ) : null
                })()}
                {detailsData.status === 'Absent' && detailsData.requests?.[0]?.resolutionTime && (
                  <DetailRow>
                    Removed on: {formatTimestamp(Number(detailsData.requests[0].resolutionTime), true)}
                  </DetailRow>
                )}
              </SubmissionDetailsSection>
            </LeftSection>
          </MainCard>
        </>
      )}
    </Container>
  )
}

export default ItemDetails
