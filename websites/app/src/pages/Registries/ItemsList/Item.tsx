import React, { useState } from 'react'
import styled from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import { Link } from 'react-router-dom'
import { formatEther } from 'ethers'
import { GraphItem, registryMap, buildItemPath, statusDescriptionMap, bountyDescriptionMap, getPropValue as getItemProp, getItemDisplayStatus } from 'utils/items'
import Tooltip from 'components/Tooltip'
import { GraphItemDetails } from 'utils/itemDetails'
import { StyledWebsiteAnchor } from 'utils/renderValue'
import AddressDisplay from 'components/AddressDisplay'
import { useAttachment } from 'hooks/useAttachment'
import { formatTimestamp } from 'utils/formatTimestamp'
import useHumanizedCountdown, {
  useChallengeRemainingTime,
} from 'hooks/countdown'
import { Divider } from 'components/Divider'
import {
  hoverLongTransitionTiming,
  hoverShortTransitionTiming,
} from 'styles/commonStyles'
import { StyledButton } from 'components/Button'
import { EnsureChain } from 'components/EnsureChain'
import HourglassIcon from 'svgs/icons/hourglass.svg'
import CalendarIcon from 'svgs/icons/calendar.svg'
import { itemToStatusCode, STATUS_CODE } from 'utils/itemStatus'
import { useMemo } from 'react'
import { getChainName } from 'utils/chains'
import { toIsoString } from './itemEvent'

const Card = styled.div<{ seamlessBottom?: boolean }>`
  color: ${({ theme }) => theme.primaryText};
  font-family: "Manrope", sans-serif;
  box-sizing: border-box;
  word-break: break-word;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  ${({ seamlessBottom }) => seamlessBottom && `
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  `}

  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const CardStatus = styled.div<{ status: string }>`
  text-align: center;
  font-weight: 400;
  padding: 14px 12px 16px;
  background-color: transparent;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  position: relative;

  &:before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-bottom: 0px;
    background-color: ${({ status, theme }) =>
      ({
        Included: theme.statusIncluded,
        'Registration Requested': theme.statusRegistrationRequested,
        'Removal Requested': theme.statusClearingRequested,
        'Challenged Submission': theme.statusChallenged,
        'Challenged Removal': theme.statusChallenged,
        Removed: theme.statusAbsent,
        Rejected: theme.statusRejected,
      })[status] || theme.statusGray};
    border-radius: 50%;
    margin-right: 10px;
  }

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 12px;
    right: 12px;
    height: 1px;
    background: ${({ theme }) => theme.stroke};
  }
`

const BountyText = styled.span`
  color: ${({ theme }) => theme.tintYellow};
  font-weight: 600;
  font-size: 11px;
  margin-left: 4px;
  vertical-align: baseline;
  position: relative;
  top: -1px;
`

const CardContent = styled.div`
  flex: 1;
  justify-content: space-between;

  background: transparent;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 0 16px;
  align-items: center;

  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
`

const UpperCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 0 16px;
`

const BottomCardContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
  gap: 8px;
`

const TokenLogoWrapper = styled.div`
  ${hoverShortTransitionTiming}
  display: flex;
  height: 100px;
  justify-content: center;

  &:hover {
    filter: brightness(0.8);
  }
`

const VisualProofWrapper = styled.img`
  ${hoverShortTransitionTiming}
  object-fit: cover;
  align-self: stretch;
  max-width: min(240px, 100%);
  max-height: 160px;
  margin-top: 8px;
  cursor: pointer;

  &:hover {
    filter: brightness(0.8);
  }
`

const DetailsButton = styled(Link)`
  ${hoverLongTransitionTiming}
  margin: 8px 0;
  min-width: 100px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.buttonSecondaryBorder};
  color: ${({ theme }) => theme.primaryText};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.primaryText};
  }
`

const ActionButton = styled(StyledButton).attrs({ variant: 'primary', size: 'medium' })`
  ${hoverLongTransitionTiming}
  margin: 8px 0;
  line-height: 1.2;
`

/* Connect / "Switch to Gnosis" in place of Execute: spaced like the card's buttons. */
const ExecuteChainGate = styled(EnsureChain)`
  margin: 8px 0;
`

const TransparentButton = styled.button`
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  max-width: 100%;
`

/* In place of a logo or visual proof that did not load: same size, says so (instead of a shimmer). */
const ImageUnavailable = styled.span<{ $round?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: ${({ $round }) => ($round ? '100px' : '240px')};
  max-width: 100%;
  height: ${({ $round }) => ($round ? '100px' : '140px')};
  margin-top: ${({ $round }) => ($round ? '0' : '8px')};
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: ${({ $round }) => ($round ? '50%' : '8px')};
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.secondaryText};
  text-align: center;
`

const LabelAndValue = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
`

const ChainIdLabel = styled.label`
  margin-bottom: 8px;
`

const SymbolLabel = styled.label`
  color: ${({ theme }) => theme.primaryText};
  font-weight: 600;
  font-size: 16px;
  margin-top: 4px;
`

const NameLabel = styled.label`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 16px;
`

const SubmittedLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.secondaryText};
  }
`

const StyledDivider = styled(Divider)`
  margin-bottom: 8px;
  margin-left: 12px;
  margin-right: 12px;
  width: calc(100% - 24px);
`

const TimersContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 8px;
  gap: 8px;
`

const WrappedWebsiteContainer = styled.div`
  margin-top: -8px;
`


interface StatusProps {
  status:
    | 'Registered'
    | 'Absent'
    | 'RegistrationRequested'
    | 'ClearingRequested'
  disputed: boolean
  bounty: string
  requests?: Array<{ requestType?: string }>
  /** The challenge period is over: the request can no longer be challenged, so no bounty. */
  challengeClosed?: boolean
}

const Status = React.memo(({ status, disputed, bounty, requests, challengeClosed = false }: StatusProps) => {
  const label = getItemDisplayStatus({ status, disputed, requests })

  const readableBounty =
    (status === 'ClearingRequested' || status === 'RegistrationRequested') &&
    !disputed &&
    !challengeClosed
      ? Number(formatEther(bounty))
      : null

  return (
    <CardStatus status={label}>
      <Tooltip data-tooltip={statusDescriptionMap[label] || ''}>{label}</Tooltip>
      {readableBounty ? (
        <Tooltip data-tooltip={bountyDescriptionMap[status] || ''}>
          <BountyText>{readableBounty} xDAI</BountyText>
        </Tooltip>
      ) : null}
    </CardStatus>
  )
})

interface ItemProps {
  item: GraphItem | GraphItemDetails
  challengePeriodDuration: number | null
  showActionButtons?: boolean
  onActionButtonClick?: (actionType: string) => void
  onExecuteButtonClick?: () => void
  /** The execute transaction is being prepared or sent: the button waits ("Executing..."). */
  isExecuting?: boolean
  actionButtonCost?: string
  hideBottomTimers?: boolean
  seamlessBottom?: boolean
}

const Item = React.memo(
  ({
    item,
    challengePeriodDuration,
    showActionButtons = false,
    onActionButtonClick,
    onExecuteButtonClick,
    isExecuting = false,
    actionButtonCost,
    hideBottomTimers = false,
    seamlessBottom = false,
  }: ItemProps) => {
    // The card shows one image (a token logo or a CDN visual proof): which source loaded or failed.
    const [loadedSrc, setLoadedSrc] = useState<string>()
    const [failedSrc, setFailedSrc] = useState<string>()
    const openAttachment = useAttachment()
    const itemUrl = buildItemPath(item.id || item.itemID, item.registryAddress)

    const challengeRemainingTime = useChallengeRemainingTime(
      item.requests?.[0]?.submissionTime,
      item.disputed,
      challengePeriodDuration,
    )
    const formattedChallengeRemainingTime = useHumanizedCountdown(
      challengeRemainingTime,
      2,
    )
    const isCountdownLoading = challengePeriodDuration === null && item.status !== 'Registered' && !item.disputed

    // Calculate status code to determine if item is in pending execution state
    const statusCode = useMemo(() => {
      if (!challengePeriodDuration) return null
      const timestamp = Math.floor(Date.now() / 1000)
      return itemToStatusCode(item as any, timestamp, challengePeriodDuration)
    }, [item, challengePeriodDuration])

    const isPendingExecution = statusCode === STATUS_CODE.PENDING_SUBMISSION || statusCode === STATUS_CODE.PENDING_REMOVAL

    // The date the card's bottom line names: inclusion, removal or rejection, else submission.
    const cardDate = item?.status === 'Registered'
      ? Number((item.requests || []).find(req => req.requestType?.toLowerCase() === 'registrationrequested' && req.resolved)?.resolutionTime || 0)
      : item?.status === 'Absent'
        ? Number(item.requests?.[0]?.resolutionTime || 0)
        : Number(item?.requests?.[0]?.submissionTime || 0)
    const challengeDeadline = challengePeriodDuration && item.requests?.[0]?.submissionTime
      ? Number(item.requests[0].submissionTime) + challengePeriodDuration
      : null

    const getPropValue = (label: string) => getItemProp(item, label)
    const logoPath = getPropValue('Logo')
    const visualProofPath = getPropValue('Visual proof')
    const imagePath = item.registryAddress === registryMap['tokens'] ? logoPath : visualProofPath
    const imageSrc = imagePath ? `https://cdn.kleros.link${imagePath}` : undefined
    const imgLoaded = !!imageSrc && loadedSrc === imageSrc
    const imgFailed = !!imageSrc && failedSrc === imageSrc
    const chainId = getPropValue('EVM Chain ID')
    const repositoryUrl = getPropValue('Github Repository URL')

    return (
      <Card seamlessBottom={seamlessBottom}>
        <Status
          status={item.status}
          disputed={item.disputed}
          bounty={item.requests?.[0]?.deposit || '0'}
          requests={item.requests}
          challengeClosed={isPendingExecution}
        />
        <CardContent>
          <UpperCardContent>
            {item.registryAddress === registryMap['tags-queries'] && (
              <>
                {/* Nothing in place of a value the item's data did not provide (no empty chip). */}
                {chainId && (
                  <LabelAndValue>
                    <ChainIdLabel>
                      Chain: {getChainName(chainId) ?? chainId}{' '}
                    </ChainIdLabel>
                    <AddressDisplay address={`eip155:${chainId}`} />
                  </LabelAndValue>
                )}
                <div>
                  <>{getPropValue('Description')}</>
                </div>
                {repositoryUrl && (
                  <b>
                    <StyledWebsiteAnchor
                      url={`${repositoryUrl.replace('.git', '')}/commit/${getPropValue('Commit hash')}`}
                    >
                      {repositoryUrl}
                    </StyledWebsiteAnchor>
                  </b>
                )}
              </>
            )}
            {item.registryAddress === registryMap['single-tags'] && (
              <>
                {getPropValue('Contract Address') && (
                  <strong>
                    <AddressDisplay address={getPropValue('Contract Address')} />
                  </strong>
                )}
                <div>{getPropValue('Project Name')}</div>
                <div>{getPropValue('Public Name Tag')}</div>
                <StyledWebsiteAnchor url={getPropValue('UI/Website Link')}>
                  {getPropValue('UI/Website Link')}
                </StyledWebsiteAnchor>
              </>
            )}
            {item.registryAddress === registryMap['tokens'] && (
              <>
                {getPropValue('Address') && <AddressDisplay address={getPropValue('Address')} />}
                {logoPath && imageSrc && (
                  <TransparentButton
                    type="button"
                    onClick={() => openAttachment(imageSrc)}
                  >
                    <TokenLogoWrapper>
                      {imgFailed ? (
                        // The viewer can still try to open the file.
                        <ImageUnavailable $round>
                          <span className="visually-hidden">Logo: </span>Image unavailable
                        </ImageUnavailable>
                      ) : (
                        <>
                          {!imgLoaded && <Skeleton circle height={100} width={100} />}
                          <img
                            src={imageSrc}
                            alt="Logo"
                            onLoad={() => setLoadedSrc(imageSrc)}
                            onError={() => setFailedSrc(imageSrc)}
                            style={{ display: imgLoaded ? 'block' : 'none' }}
                          />
                        </>
                      )}
                    </TokenLogoWrapper>
                  </TransparentButton>
                )}
                <SymbolLabel>{getPropValue('Symbol')}</SymbolLabel>
                <NameLabel>{getPropValue('Name')}</NameLabel>
                {getPropValue('Website') ? (
                  <StyledWebsiteAnchor url={getPropValue('Website')}>
                    {getPropValue('Website')}
                  </StyledWebsiteAnchor>
                ) : null}
              </>
            )}
            {item.registryAddress === registryMap['cdn'] && (
              <>
                {getPropValue('Contract address') && <AddressDisplay address={getPropValue('Contract address')} />}
                <WrappedWebsiteContainer>
                  <StyledWebsiteAnchor url={getPropValue('Domain name')}>
                    {getPropValue('Domain name')}
                  </StyledWebsiteAnchor>
                </WrappedWebsiteContainer>
                {visualProofPath && imageSrc && (
                  <TransparentButton
                    type="button"
                    onClick={() => openAttachment(imageSrc)}
                  >
                    {imgFailed ? (
                      // The viewer can still try to open the file.
                      <ImageUnavailable>
                        <span className="visually-hidden">Visual proof: </span>Image unavailable
                      </ImageUnavailable>
                    ) : (
                      <>
                        {!imgLoaded && <Skeleton height={140} width={240} />}
                        <VisualProofWrapper
                          src={imageSrc}
                          alt="Visual proof"
                          onLoad={() => setLoadedSrc(imageSrc)}
                          onError={() => setFailedSrc(imageSrc)}
                          style={{ display: imgLoaded ? '' : 'none' }}
                        />
                      </>
                    )}
                  </TransparentButton>
                )}
              </>
            )}
          </UpperCardContent>
          <BottomCardContent>
            {showActionButtons && isPendingExecution && onExecuteButtonClick ? (
              // Executing sends a transaction on Gnosis: without a wallet there, Connect or Switch instead.
              <ExecuteChainGate>
                <ActionButton
                  type="button"
                  onClick={onExecuteButtonClick}
                  disabled={isExecuting}
                >
                  {isExecuting
                    ? 'Executing...'
                    : statusCode === STATUS_CODE.PENDING_SUBMISSION
                      ? 'Execute Submission'
                      : 'Execute Removal'}
                </ActionButton>
              </ExecuteChainGate>
            ) : showActionButtons && !item.disputed && item.status !== 'Absent' ? (
              <ActionButton
                onClick={() => {
                  if (onActionButtonClick) {
                    onActionButtonClick(item.status)
                  }
                }}
              >
                {item.status === 'Registered' && 'Remove Item'}
                {item.status === 'RegistrationRequested' && 'Challenge Item'}
                {item.status === 'ClearingRequested' && 'Challenge Removal'}
                {actionButtonCost ? ` — ${actionButtonCost}` : ''}
              </ActionButton>
            ) : !showActionButtons ? (
              <DetailsButton to={itemUrl} state={{ fromApp: true }}>
                Details
              </DetailsButton>
            ) : null}
            {!hideBottomTimers && (
              <>
                <StyledDivider />
                <TimersContainer>
                  <SubmittedLabel>
                    <CalendarIcon />
                    {item?.status === 'Absent'
                      ? `${getItemDisplayStatus(item) === 'Rejected' ? 'Rejected' : 'Removed'} on: `
                      : item?.status === 'Registered' ? 'Included on: ' : 'Submitted on: '}
                    <time dateTime={toIsoString(cardDate)} title={formatTimestamp(cardDate, true)}>
                      {formatTimestamp(cardDate, false)}
                    </time>
                  </SubmittedLabel>
                  {(isCountdownLoading || formattedChallengeRemainingTime) && (
                    <SubmittedLabel>
                      <HourglassIcon />
                      {item.status === 'ClearingRequested' ? 'Will be removed in' : 'Will be included in'}:{' '}
                      {isCountdownLoading ? (
                        <Skeleton width={60} />
                      ) : challengeDeadline ? (
                        <time
                          dateTime={toIsoString(challengeDeadline)}
                          title={`Challenge period ends ${formatTimestamp(challengeDeadline, true)}`}
                        >
                          {formattedChallengeRemainingTime}
                        </time>
                      ) : (
                        formattedChallengeRemainingTime
                      )}
                    </SubmittedLabel>
                  )}
                </TimersContainer>
              </>
            )}
          </BottomCardContent>
        </CardContent>
      </Card>
    )
  },
)

export default Item
