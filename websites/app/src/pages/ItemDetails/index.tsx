import React, { useMemo, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { formatEther } from 'ethers'
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useItemDetailsQuery } from 'hooks/queries'
import LoadingItems from '../Registries/LoadingItems'
import ConfirmationBox from 'components/ConfirmationBox'
import ErrorState from 'components/ErrorState'
import { useClockAt } from 'hooks/countdown'
import { useDocumentTitle } from 'hooks/useDocumentTitle'
import ScrollTop from 'components/ScrollTop'
import ArrowLeftIcon from 'assets/svgs/icons/arrow-left.svg'
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay'
import useAppealCost from 'hooks/useAppealCost'
import useRegistryParameters from 'hooks/useRegistryParameters'
import { itemToStatusCode, STATUS_CODE } from 'utils/itemStatus'
import { registryMap, revRegistryMap, registryDisplayNames, getItemDisplayStatus } from 'utils/items'
import { getAppealInfo, isRemovalRequest } from 'utils/itemDetails'
import Item from '../Registries/ItemsList/Item'
import Breadcrumb from './components/Breadcrumb'
import Deadline from './components/Deadline'
import ItemDetailsContent from './components/ItemDetailsContent'
import ItemUnavailable from './components/ItemUnavailable'
import WithdrawRewards from './components/WithdrawRewards'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'
import { formatTimestamp } from 'utils/formatTimestamp'
import ArrowIcon from 'assets/svgs/icons/arrow.svg'
import { errorToast, infoToast } from 'utils/wrapWithToast'
import { isUserRejection, parseWagmiError } from 'utils/parseWagmiError'
import { useCurateInteractions } from 'hooks/contracts/useCurateInteractions'
import { KLEROS_CDN_BASE } from 'consts/index'

/** An item ID is a 32-byte hash: 0x and 64 hex characters. */
const ITEM_ID_PATTERN = /^0x[0-9a-fA-F]{64}$/

/** The tab title keeps a long name (a Tag Query's description) short. */
const shortName = (name: string, max = 60) =>
  name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  padding: 32px 16px 64px;
  font-family: "Manrope", sans-serif;
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

const IpfsWarning = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: ${({ theme }) => theme.lightBackground};
  border: 1px solid ${({ theme }) => theme.warning};
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.warning};
  word-break: break-word;
`

const IpfsActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;

  button,
  a {
    min-height: 24px;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 600;
    color: ${({ theme }) => theme.primaryText};
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
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
  text-align: center;
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

const SubmissionDate = styled(Link)`
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
  // A raw registry address in the link still names its registry, and links back to its list.
  const registrySlug = registryMap[registryNameParam]
    ? registryNameParam
    : revRegistryMap[registryNameParam.toLowerCase()] ?? registryNameParam
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isConnected } = useAccount()
  const { open: openWalletModal } = useAppKit()
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [evidenceConfirmationType, setEvidenceConfirmationType] = useState('')

  const isValidItemId = ITEM_ID_PATTERN.test(itemID)

  // Reconstruct composite ID for GraphQL query (subgraph format: itemID@registryAddress).
  // The indexer stores both in lower case, so a link typed in mixed case still finds the item.
  const itemId = registryAddress && isValidItemId ? `${itemID}@${registryAddress}`.toLowerCase() : ''

  const isAttachmentOpen = useMemo(
    () => !!searchParams.get('attachment'),
    [searchParams],
  )

  const {
    data: detailsData,
    isError: detailsFailed,
    isFetching: detailsFetching,
    refetch: refetchDetails,
  } = useItemDetailsQuery({
    itemId: itemId,
    enabled: !!itemId,
  })

  const { executeRequest, isLoading: isExecuting } = useCurateInteractions()

  const registryName = registryDisplayNames[registrySlug] || registrySlug || 'Unknown'

  const displayName = useMemo(() => {
    if (!detailsData) return ''
    const name = detailsData.props?.find((prop) => prop.label === 'Name')?.value
    const symbol = detailsData.props?.find((prop) => prop.label === 'Symbol')?.value
    const domain = detailsData.props?.find((prop) => prop.label === 'Domain name')?.value
    const tag = detailsData.props?.find((prop) => prop.label === 'Public Name Tag')?.value
    const desc = detailsData.props?.find((prop) => prop.label === 'Description')?.value
    return name || symbol || domain || tag || desc || 'Item'
  }, [detailsData])

  useDocumentTitle(
    !isValidItemId || detailsData === null
      ? `Item not found · ${registryName}`
      : detailsData
        ? `${shortName(displayName)} · ${registryName}`
        : detailsFailed
          ? `Item did not load · ${registryName}`
          : undefined,
  )

  // Fetch registry parameters
  const {
    data: registryParameters,
    isLoading: registryParametersLoading,
    isError: registryParametersError,
    isFetching: registryParametersFetching,
    refetch: refetchRegistryParameters,
  } = useRegistryParameters(registryAddress)
  // Deposits and the challenge period are read from Gnosis; with no copy cached, a failed read is an error.
  const registryParametersFailed = registryParametersError && !registryParameters

  const challengePeriodDuration = useMemo(() => {
    return registryParameters ? Number(registryParameters.challengePeriodDuration) : null
  }, [registryParameters])

  const latestRequest = detailsData?.requests?.[0]
  const appeal = useMemo(() => getAppealInfo(detailsData), [detailsData])

  // The end of the challenge period of a pending, unchallenged request.
  const challengeDeadline =
    latestRequest &&
    challengePeriodDuration !== null &&
    !detailsData?.disputed &&
    (detailsData?.status === 'RegistrationRequested' || detailsData?.status === 'ClearingRequested')
      ? Number(latestRequest.submissionTime) + challengePeriodDuration
      : null

  // The status changes at known moments (end of the challenge period, half and end of an appeal
  // period): re-evaluate it then, instead of keeping the state the page was loaded in.
  const now = useClockAt([
    challengeDeadline,
    appeal?.hasRuling ? appeal.half : null,
    appeal?.hasRuling ? appeal.end : null,
  ])

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
      // Show loading indicator if registry parameters are being fetched; nothing when they failed
      // (the error under the card says so and offers to try again).
      return registryParametersLoading ? 'Loading...' : undefined
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
  const {
    data: appealCost,
    isError: appealCostError,
    isFetching: appealCostFetching,
    refetch: refetchAppealCost,
  } = useAppealCost(
    detailsData?.requests?.[0]?.arbitrator,
    detailsData?.requests?.[0]?.disputeID,
    detailsData?.requests?.[0]?.arbitratorExtraData,
    detailsData?.requests?.[0]?.disputed,
    detailsData?.requests?.[0]?.resolved,
    detailsData?.requests?.[0]?.rounds?.length,
  )
  const appealCostFailed = appealCostError && !appealCost

  // Each piece of evidence with the role of its author in the request it belongs to.
  const evidences = useMemo(() => {
    if (!detailsData) return []
    return detailsData.requests
      .flatMap((request) => {
        const requester = request.requester?.toLowerCase()
        const challenger = request.challenger?.toLowerCase()
        return request.evidenceGroup.evidences.map((evidence) => {
          const party = evidence.party?.toLowerCase()
          const partyRole =
            party && party === requester
              ? isRemovalRequest(request) ? 'Remover' : 'Submitter'
              : party && party === challenger
                ? 'Challenger'
                : undefined
          return { ...evidence, partyRole }
        })
      })
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  }, [detailsData])

  const statusCode = useMemo(() => {
    if (!detailsData) return null
    // A dispute's state does not depend on the challenge period; a pending request's does.
    if (!detailsData.requests?.[0]?.disputed && !challengePeriodDuration) return null
    return itemToStatusCode(detailsData as any, now, challengePeriodDuration ?? 0)
  }, [detailsData, challengePeriodDuration, now])

  const shouldShowCrowdfunding =
    !!detailsData?.disputed &&
    !latestRequest?.resolved &&
    (statusCode === STATUS_CODE.CROWDFUNDING || statusCode === STATUS_CODE.CROWDFUNDING_WINNER)

  // A fresh object when the status changes, so the card re-reads it too (it memoises on the item):
  // at the end of the challenge period "Challenge Item" becomes "Execute Submission" in place.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cardItem = useMemo(() => (detailsData ? { ...detailsData } : detailsData), [detailsData, statusCode])

  const appealDataFailed = shouldShowCrowdfunding && (registryParametersFailed || appealCostFailed)
  const retryAppealData = () => {
    if (registryParametersFailed) refetchRegistryParameters()
    if (appealCostFailed) refetchAppealCost()
  }

  // Capture navigation state on first render. location.state is set only by
  // in-app navigation and can be wiped by setSearchParams (e.g. opening an
  // attachment), so we snapshot it in a ref to keep it stable.
  // profileSearch: the profile's query string ("?address=0x…&page=2"), so Return goes back to the
  // same profile, tab and page.
  type NavState = { fromApp?: boolean; from?: string; profileTab?: string; profileSearch?: string }
  const navStateRef = useRef<NavState | null>(location.state as NavState | null)
  const navState = navStateRef.current
  const cameFromApp = !!navState?.fromApp

  const { registryUrl, breadcrumbName } = useMemo(() => {
    if (navState?.from === 'home') {
      return { registryUrl: '/', breadcrumbName: 'Home' }
    }

    if (navState?.from === 'profile' && navState.profileTab) {
      const search =
        typeof navState.profileSearch === 'string' && navState.profileSearch.startsWith('?')
          ? navState.profileSearch
          : ''
      return { registryUrl: `/profile/${navState.profileTab}${search}`, breadcrumbName: 'Profile' }
    }

    return { registryUrl: `/${registrySlug}`, breadcrumbName: registryName }
  }, [navState, registryName, registrySlug])

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) return

    e.preventDefault()
    if (cameFromApp) navigate(-1)
    else navigate(registryUrl)
  }

  const handleExecuteRequest = async () => {
    if (!detailsData || isExecuting) return
    // Executing sends a transaction: connect first.
    if (!isConnected) {
      openWalletModal({ view: 'Connect' })
      return
    }

    try {
      const result = await executeRequest(
        registryAddress as `0x${string}`,
        detailsData.itemID
      )
      if (result?.status && result.result) {
        navigate(`/tx/${result.result.transactionHash}`)
      }
    } catch (error) {
      console.error('Error executing request:', error)
      // Declining in the wallet is a choice; anything else says what went wrong.
      if (!isUserRejection(error)) errorToast(parseWagmiError(error) || 'Failed to execute request. Please try again.')
    }
  }

  // A registry address no registry has leads back home rather than to a "Page not found".
  const knownRegistry = !!registryMap[registrySlug]
  const backUrl = knownRegistry ? `/${registrySlug}` : '/home'
  const backLabel = knownRegistry ? `Back to ${registryName}` : 'Go to Home'
  if (!isValidItemId) {
    return (
      <Container>
        <ItemUnavailable kind="invalid" registryName={registryName} backUrl={backUrl} backLabel={backLabel} />
      </Container>
    )
  }

  if (detailsData === undefined) {
    return (
      <Container>
        {detailsFailed ? (
          <ItemUnavailable
            kind="error"
            registryName={registryName}
            backUrl={backUrl}
            backLabel={backLabel}
            onRetry={() => refetchDetails()}
            retrying={detailsFetching}
          />
        ) : (
          <LoadingItems label="Loading the item" />
        )}
      </Container>
    )
  }

  if (detailsData === null) {
    return (
      <Container>
        <ItemUnavailable kind="not-found" registryName={registryName} backUrl={backUrl} backLabel={backLabel} />
      </Container>
    )
  }

  const isPendingRequest =
    !detailsData.disputed && (detailsData.status === 'RegistrationRequested' || detailsData.status === 'ClearingRequested')
  const isRemoval = isRemovalRequest(latestRequest, detailsData.status)
  // Deposits matter wherever the card offers to challenge or remove.
  const showParametersError =
    registryParametersFailed && !detailsData.disputed && detailsData.status !== 'Absent'

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
                registryName: registrySlug,
                challengePeriodDuration,
              }}
            />
          )}

          {/* The page's heading for screen readers; the name is shown in the breadcrumb and the card. */}
          <h1 className="visually-hidden">
            {displayName} · {registryName}
          </h1>
          <TopBar>
            <Breadcrumb registryName={breadcrumbName} itemName={displayName} registryUrl={registryUrl} useHistoryBack={cameFromApp} />
            <ReturnButton to={registryUrl} onClick={handleBackClick}>
              <ArrowLeftIcon aria-hidden="true" />
              Return
            </ReturnButton>
          </TopBar>

          <MainCard>
            <RightSection>
              <ItemDetailsContent
                detailsData={detailsData}
                statusCode={statusCode}
                now={now}
                challengePeriodDuration={challengePeriodDuration}
                shouldShowCrowdfunding={shouldShowCrowdfunding}
                appeal={appeal}
                appealCost={appealCost}
                registryParameters={registryParameters}
                registryAddress={registryAddress}
                appealDataFailed={appealDataFailed}
                retryingAppealData={registryParametersFetching || appealCostFetching}
                onRetryAppealData={retryAppealData}
                evidences={evidences}
                itemID={itemID}
                compositeItemId={itemId}
              />
            </RightSection>

            <LeftSection>
              <ItemCardWrapper>
                <Item
                  item={cardItem ?? detailsData}
                  challengePeriodDuration={challengePeriodDuration}
                  showActionButtons={true}
                  onActionButtonClick={(actionType) => {
                    // The dialog needs the deposit: say why it cannot open yet.
                    if (!deposits || arbitrationCostData === undefined) {
                      if (registryParametersFailed) {
                        refetchRegistryParameters()
                        infoToast('Loading the deposit from Gnosis again. Try again in a moment.')
                      } else {
                        infoToast('The deposit is still loading. Try again in a moment.')
                      }
                      return
                    }
                    setIsConfirmationOpen(true)
                    setEvidenceConfirmationType(actionType)
                    // The page is no longer polled every few seconds: read the item again as the
                    // dialog opens, so it acts on the item as it is now.
                    refetchDetails()
                  }}
                  onExecuteButtonClick={handleExecuteRequest}
                  isExecuting={isExecuting}
                  actionButtonCost={formattedDepositCost}
                  hideBottomTimers={true}
                  seamlessBottom={true}
                />
              </ItemCardWrapper>

              {(!detailsData.props || detailsData.props.length === 0) && detailsData.data && (
                <IpfsWarning role="alert">
                  <span>This item&apos;s data could not be loaded from IPFS.</span>
                  <IpfsActions>
                    <button type="button" onClick={() => refetchDetails()} disabled={detailsFetching}>
                      {detailsFetching ? 'Trying again...' : 'Try again'}
                    </button>
                    <a href={`${KLEROS_CDN_BASE}${detailsData.data}`} target="_blank" rel="noopener noreferrer">
                      Open the raw file
                    </a>
                  </IpfsActions>
                </IpfsWarning>
              )}

              <SubmissionDetailsSection>
                <DetailRow>
                  Submitted on:
                  <SubmissionDate
                    to={`/tx/${detailsData.requests[detailsData.requests.length - 1].creationTx}`}
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
                {showParametersError && (
                  // In place of the deadline row: what failed, and a way to try again.
                  <ErrorState
                    compact
                    title="The deposit and the challenge period did not load."
                    message="Scout reads them from Gnosis, which did not answer. Check your connection and try again."
                    onRetry={() => refetchRegistryParameters()}
                    retrying={registryParametersFetching}
                  />
                )}
                {isPendingRequest && challengeDeadline !== null && (
                  now <= challengeDeadline ? (
                    <DetailRow>
                      Challenge period ends in <Deadline at={challengeDeadline} />
                    </DetailRow>
                  ) : (
                    <DetailRow>
                      Challenge period over with no challenge. Anyone can now execute the request to{' '}
                      {isRemoval ? 'remove the item' : 'include the item'}, and the{' '}
                      {isRemoval ? 'remover' : 'submitter'} gets the deposit back.
                    </DetailRow>
                  )
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
                    {/* A rejected submission was never in the registry, so it was not "removed". */}
                    {getItemDisplayStatus(detailsData) === 'Rejected' ? 'Rejected on:' : 'Removed on:'}{' '}
                    {formatTimestamp(Number(detailsData.requests[0].resolutionTime), true)}
                  </DetailRow>
                )}
              </SubmissionDetailsSection>

              <WithdrawRewards item={detailsData} registryAddress={registryAddress} />
            </LeftSection>
          </MainCard>
        </>
      )}
    </Container>
  )
}

export default ItemDetails
