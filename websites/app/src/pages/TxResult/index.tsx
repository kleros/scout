import React, { useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { formatEther } from 'ethers'
import humanizeDuration from 'humanize-duration'
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import { useTxResultQuery, isTxHashValid, isTxNotFoundError } from 'hooks/queries/useTxResultQuery'
import { useDocumentTitle } from 'hooks/useDocumentTitle'
import { shortenAddress } from 'utils/shortenAddress'
import { formatTimestamp } from 'utils/formatTimestamp'
import { GNOSIS_CHAIN_ID, getAddressExplorerUrl, getTxExplorerUrl } from 'utils/chains'
import Copyable from 'components/Copyable'
import ErrorState from 'components/ErrorState'
import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'
import LoadingGif from 'gifs/loading-icosahedron.gif'
import ArrowLeftIcon from 'assets/svgs/icons/arrow-left.svg'
import ArrowIcon from 'assets/svgs/icons/arrow.svg'
import GnosisIcon from 'assets/svgs/chains/gnosis.svg'

// The tx page queries Gnosis exclusively (the registries live only there), so all
// chain-identifying strings are resolved here once, not spread around.
// Scout's branded forms are "Gnosis Chain" and "xDAI".
const CHAIN_NAME = 'Gnosis Chain'
const NATIVE_SYMBOL = 'xDAI'
const explorerTxUrl = (hash: string) => getTxExplorerUrl(GNOSIS_CHAIN_ID, hash)
const explorerAddrUrl = (addr: string) => getAddressExplorerUrl(GNOSIS_CHAIN_ID, addr)

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  padding: 32px 16px 64px;
  font-family: 'Manrope', sans-serif;
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

const Inner = styled.div`
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
`

const TopBar = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  margin-bottom: 16px;
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
  padding: 8px 0;
  border-radius: 8px;
  text-decoration: none;
  align-self: flex-start;
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

const Card = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.modalBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 20px;
  color: ${({ theme }) => theme.primaryText};
  box-shadow: ${({ theme }) => theme.shadowModal};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Hero = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 20px;
  flex-wrap: wrap;
`

const HeroText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
`

const HeroTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  color: ${({ theme }) => theme.primaryText};
`

const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryText};
  // Equal-width digits so the date string's numerals don't visually shift
  // between renders / different transactions. Manrope supports it natively.
  font-variant-numeric: tabular-nums;
`

const StatusChip = styled.span<{ $tone: 'success' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 9999px;
  background: ${({ theme, $tone }) =>
    $tone === 'success' ? `${theme.success}1F` : `${theme.error}1F`};
  color: ${({ theme, $tone }) => ($tone === 'success' ? theme.success : theme.error)};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;

  // Icon at 14px optically matches the cap height of 12px uppercase text;
  // 12px would size the icon to the font's x-height and look shy next to
  // "CONFIRMED" / "REVERTED" all-caps.
  svg {
    width: 14px;
    height: 14px;
  }
`

const PrimaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  font-size: 14px;
  font-weight: 600;
  border-radius: 9999px;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.3s ease;

  svg {
    width: 14px;
    height: 14px;
    path {
      fill: ${({ theme }) => theme.black};
    }
  }

  &:hover {
    background: ${({ theme }) => theme.buttonWhiteHover};
    transform: translateY(-1px);
  }

  &:active {
    background: ${({ theme }) => theme.buttonWhiteActive};
    transform: translateY(0);
  }
`

const Divider = styled.hr`
  margin: 0;
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.stroke};
`

const DetailsList = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px 24px 20px;
`

const DetailRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
  font-size: 13px;

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
    gap: 4px;
    align-items: flex-start;
  }
`

const DetailLabel = styled.div`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
`

const DetailValue = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: ${({ theme }) => theme.primaryText};
  font-size: 13px;
  word-break: break-all;
  // Tabular figures give addresses, amounts, durations, and fees a consistent
  // digit rhythm without changing the font — the polish that fintech dashboards
  // (Stripe, Linear, etc.) use to keep numeric columns visually steady.
  font-variant-numeric: tabular-nums;
`

const SubLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.tertiaryText};
`

const ChainIconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
  }
`

const ExternalLink = styled.a`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.secondaryText};
  padding: 4px;
  border-radius: 6px;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.secondaryBlue};
  }

  svg {
    width: 14px;
    height: 14px;
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
    // Override the global StyledSmallLabel's 14px so the From address
    // matches the 13px row hierarchy used by the hash and contract values.
    font-size: 13px !important;
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
    label {
      color: ${({ theme }) => theme.primaryText};
    }
    svg path {
      fill: ${({ theme }) => theme.primaryText};
    }
  }
`

const InfoBanner = styled.div`
  padding: 12px 24px;
  /* stroke is already #RRGGBBAA: appending another alpha made the colour invalid (no background). */
  background: ${({ theme }) => theme.subtleBackground};
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  line-height: 1.5;
`

const Message = styled.div`
  padding: 40px 24px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  line-height: 1.6;
`

const MessageTitle = styled.div`
  color: ${({ theme }) => theme.primaryText};
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
`

const LoadingBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 24px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  line-height: 1.6;
`

const LoadingImage = styled.img`
  height: 90px;
  margin-bottom: 8px;
`

const ExplorerFallback = styled.div`
  display: flex;
  justify-content: center;
  padding: 0 24px 32px;
  margin-top: -24px;

  a {
    gap: 6px;
    font-size: 14px;
  }
`

// The row values break anywhere (hashes); sentences and dates wrap between words.
const ValueText = styled.span`
  word-break: normal;
  overflow-wrap: break-word;
`

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm3.7 6.3-4.2 4.2a.8.8 0 0 1-1.2 0L4.3 8.5a.8.8 0 1 1 1.2-1.2l1.4 1.4 3.6-3.6a.8.8 0 1 1 1.2 1.2Z" />
  </svg>
)

const CrossIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm3.1 10L10 11.1 8 9.1 6 11.1 4.9 10l2-2-2-2L6 4.9l2 2 2-2L11.1 6l-2 2 2 2Z" />
  </svg>
)

const OpenIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10 2h4v4M14 2 7.5 8.5M12 9v3.5A1.5 1.5 0 0 1 10.5 14h-7A1.5 1.5 0 0 1 2 12.5v-7A1.5 1.5 0 0 1 3.5 4H7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const shortHumanizer = humanizeDuration.humanizer({
  largest: 2,
  round: true,
  units: ['d', 'h', 'm'],
  spacer: '',
  delimiter: ' ',
  language: 'shortEn',
  languages: {
    shortEn: {
      y: () => 'y',
      mo: () => 'mo',
      w: () => 'w',
      d: () => 'd',
      h: () => 'h',
      m: () => 'min',
      s: () => 's',
      ms: () => 'ms',
    },
  },
})

const formatAmount = (wei: bigint): string => {
  const asNum = Number(formatEther(wei))
  if (asNum === 0) return '0'
  if (asNum < 0.0001) return '<0.0001'
  return asNum.toFixed(6).replace(/\.?0+$/, '')
}

const shortenHash = (hash: string): string =>
  hash.length > 12 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash

const isoFromSeconds = (seconds: number): string => new Date(seconds * 1000).toISOString()

/** What the row of the amount is called: the registry keeps a deposit, or an appeal contribution. */
const amountLabelFor = (operationType: string, isDirectRegistryCall: boolean): string => {
  if (!isDirectRegistryCall) return 'Value'
  switch (operationType) {
    case 'Item Submission':
    case 'Removal Request':
    case 'Request Challenge':
      return 'Deposit'
    case 'Appeal Contribution':
      return 'Contribution'
    default:
      return 'Value'
  }
}

interface NextStepsInput {
  operationType: string
  /** e.g. "51.6 xDAI", or undefined when the amount is unknown. */
  amount?: string
  /** Unix seconds when the challenge period ends, when known. */
  periodEnd?: number
  periodOver: boolean
}

/**
 * What happens next, in the item page's words and as LightGeneralizedTCR does it: an unchallenged
 * request is executed after the challenge period and the requester gets the whole deposit back; a
 * challenged one goes to Kleros jurors, and the winner gets both deposits (a winning challenger
 * gets theirs back plus the requester's base deposit). The sentences stay true for an old
 * transaction opened from an item's history.
 */
const nextStepsFor = ({ operationType, amount, periodEnd, periodOver }: NextStepsInput): string | null => {
  // No line break inside an amount ("51.6 xDAI") or a date.
  const deposit = amount ? `the ${amount.replace(/ /g, ' ')} deposit` : 'the deposit'
  const before =
    periodEnd !== undefined
      ? `before ${formatTimestamp(periodEnd, true).replace(/ /g, ' ')}`
      : 'during the challenge period'
  switch (operationType) {
    case 'Item Submission':
      return periodOver
        ? 'The challenge period is over. Go to the item to see its current status.'
        : `If nobody challenges this submission ${before}, anyone can execute the request to include the item, and the submitter gets ${deposit} back. If it is challenged, Kleros jurors decide, and the submitter loses the deposit if they rule against the item.`
    case 'Removal Request':
      return periodOver
        ? 'The challenge period is over. Go to the item to see its current status.'
        : `If nobody challenges this removal request ${before}, anyone can execute the request to remove the item, and the remover gets ${deposit} back. If it is challenged, Kleros jurors decide, and the remover loses the deposit if they rule to keep the item.`
    case 'Request Challenge':
      return `This challenge sent the request to Kleros jurors. Follow the case and add evidence on the item page. If the jurors rule for the challenger, the challenger gets ${deposit} back plus the requester's base deposit as a bounty. If they rule for the requester, the challenger loses it.`
    case 'Appeal Contribution':
      return "If the funded side wins the dispute, the contributor gets this contribution back plus a share of the other side's fees. If it loses, the contribution is lost."
    case 'Request Execution':
      return 'The request was executed after its challenge period: the item has its new status, and the requester got the deposit back.'
    case 'Evidence Submission':
      return "The evidence is part of the item's record. It shows in the item's Evidence tab once Scout's indexer has picked it up."
    default:
      return null
  }
}

/**
 * Per-operation action sentence for the hero title. Falls back to a neutral "Transaction"
 * for txs we don't recognize (e.g. ones not sent to a Scout registry, or using an unmapped
 * function on one) — honest, doesn't pretend to understand what happened.
 */
const titleFor = (
  operationType: string,
  registryDisplayName: string | undefined,
  isKnownRegistry: boolean,
): string => {
  if (!isKnownRegistry) return 'Transaction'
  const target = registryDisplayName ?? 'registry'
  switch (operationType) {
    case 'Item Submission':
      return `Item submitted to ${target}`
    case 'Removal Request':
      return `Removal requested on ${target}`
    case 'Request Challenge':
      return `Request challenged on ${target}`
    case 'Evidence Submission':
      return `Evidence submitted to ${target}`
    case 'Appeal Contribution':
      return `Appeal contribution to ${target}`
    case 'Request Execution':
      return `Request executed on ${target}`
    case 'Item Resolution':
      return `Item resolved on ${target}`
    case 'Jury Decision':
      return `Jury ruling on ${target}`
    case 'Appeal Decision':
      return `Appeal proceeded on ${target}`
    default:
      // Known registry but unmapped function (e.g. governance). Still informative.
      return `${operationType} · ${target}`
  }
}

const TxResult: React.FC = () => {
  const { txHash } = useParams<{ txHash: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const valid = isTxHashValid(txHash)
  const { data, isError, error, failureCount, failureReason, refetch } =
    useTxResultQuery(valid ? txHash : undefined)
  useDocumentTitle(
    valid && txHash ? `Transaction ${txHash.slice(0, 6)}…${txHash.slice(-4)}` : 'Invalid transaction hash',
  )
  // While "Try again" runs, the query has no error (react-query resets it), but the panel and its
  // button stay in place, so the page does not jump and the last answer stays readable.
  const [retrying, setRetrying] = useState(false)
  const lastError = useRef<unknown>(null)
  if (error) lastError.current = error
  const showError = !data && (isError || retrying)
  const handleRetry = () => {
    setRetrying(true)
    refetch().finally(() => setRetrying(false))
  }
  // Gnosis answered "no such transaction" (wrong hash, or not mined yet), as opposed to not answering.
  const notFound = showError && isTxNotFoundError(lastError.current)
  const loading = valid && !data && !showError
  // A lookup normally takes about a second: after 8 seconds, say that the chain is slow to answer.
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    setSlow(false)
    if (!loading) return
    const timer = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(timer)
  }, [loading])

  const registryKey = data?.operation.registryKey
  const registryDisplayName = data?.operation.registryDisplayName

  // location.key === 'default' on the very first navigation entry of a tab (cold load,
  // deep link, or page refresh). Any in-app navigation after that gets a fresh key, which
  // means there's something to navigate(-1) back to.
  const cameFromApp = location.key !== 'default'
  const fallbackTo = registryKey ? `/${registryKey}` : '/home'
  const fallbackLabel = registryDisplayName ?? 'Home'
  const returnLabel = cameFromApp ? 'Return' : fallbackLabel

  // Default click → back-in-history if possible, else fallback. Modifier-clicks (cmd/ctrl/
  // middle) keep the default Link behaviour so users can still open the fallback in a new tab.
  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return
    if (cameFromApp) {
      e.preventDefault()
      navigate(-1)
    }
  }

  return (
    <Container>
      <Inner>
        <TopBar>
          <ReturnButton to={fallbackTo} onClick={handleBack}>
            <ArrowLeftIcon />
            {returnLabel}
          </ReturnButton>
        </TopBar>

        <Card>
          {!valid ? (
            <Message>
              <MessageTitle>Invalid transaction hash</MessageTitle>
              The URL must contain a 32-byte (0x-prefixed, 64 hex characters) transaction hash.
            </Message>
          ) : data ? (
            <SuccessBody data={data} />
          ) : showError ? (
            <>
              <ErrorState
                title={notFound ? 'Transaction not found' : 'The transaction did not load'}
                message={
                  notFound
                    ? `We couldn't find this transaction on ${CHAIN_NAME}. If it was sent a moment ago, it may still be pending: try again in a few seconds. Otherwise, check that the hash in the link is correct.`
                    : `${CHAIN_NAME} did not answer. Check your connection and try again.`
                }
                onRetry={handleRetry}
                retrying={retrying}
              />
              <ExplorerFallback>
                <ExternalLink
                  href={explorerTxUrl(txHash ?? '')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Blockscout
                  <span className="visually-hidden"> (opens in a new tab)</span>
                  <OpenIcon />
                </ExternalLink>
              </ExplorerFallback>
            </>
          ) : (
            <LoadingBlock role="status">
              <LoadingImage src={LoadingGif} alt="" />
              <span>Looking up this transaction on {CHAIN_NAME}...</span>
              {failureCount > 0 && isTxNotFoundError(failureReason) ? (
                <span>Still looking: a transaction sent a moment ago can take a few seconds to appear.</span>
              ) : slow ? (
                <span>{CHAIN_NAME} is slow to answer. Still trying...</span>
              ) : null}
            </LoadingBlock>
          )}
        </Card>
      </Inner>
    </Container>
  )
}

interface BodyProps {
  data: NonNullable<ReturnType<typeof useTxResultQuery>['data']>
}

const SuccessBody: React.FC<BodyProps> = ({ data }) => {
  const {
    hash,
    from,
    to,
    status,
    gasUsed,
    effectiveGasPrice,
    value,
    accepted,
    confirmedAt,
    operation,
    challengePeriodSeconds,
    itemID,
  } = data

  const reverted = status === 'reverted'
  const txFeeWei = gasUsed * effectiveGasPrice
  const toAddr = to ?? ('0x0000000000000000000000000000000000000000' as const)
  // Only label tx.to as "{X} Registry" when tx.to actually IS the registry. For the
  // resolution-via-arbitrator case the address is the arbitrator's, so labeling it as the
  // registry would be wrong. The headline + Go-to-Item already convey the registry context.
  const registryFullLabel =
    operation.isDirectRegistryCall && operation.registryDisplayName
      ? `${operation.registryDisplayName} Registry`
      : undefined
  // The registry keeps the deposit (or, for an appeal, what the side still needed) and sends any
  // excess back in the same transaction, so the amount kept can be less than the amount sent.
  const kept = accepted ?? value
  const refunded = accepted !== undefined && value > accepted ? value - accepted : 0n
  const hasAmount = !reverted && kept > 0n
  const amountLabel = amountLabelFor(operation.operationType, operation.isDirectRegistryCall)
  const confirmedAtSeconds = Math.floor(confirmedAt / 1000)
  const hasPeriod =
    !reverted &&
    operation.showPeriod &&
    challengePeriodSeconds !== undefined &&
    challengePeriodSeconds > 0
  // LightGeneralizedTCR accepts a challenge until submission time + challenge period (inclusive).
  const periodEnd = hasPeriod ? confirmedAtSeconds + (challengePeriodSeconds as number) : undefined
  const periodOver = periodEnd !== undefined && Date.now() / 1000 > periodEnd
  const title = reverted
    ? 'Transaction reverted'
    : titleFor(operation.operationType, operation.registryDisplayName, operation.isKnownRegistry)
  const canGoToItem = !reverted && itemID && operation.registryKey
  const showUnrelatedBanner = !reverted && !operation.isKnownRegistry
  const nextSteps = reverted
    ? `The transaction failed, so nothing changed. Only the network fee was spent: any ${NATIVE_SYMBOL} sent with it stayed in the wallet.`
    : operation.isKnownRegistry
      ? nextStepsFor({
          operationType: operation.operationType,
          amount: hasAmount && amountLabel === 'Deposit' ? `${formatAmount(kept)} ${NATIVE_SYMBOL}` : undefined,
          periodEnd,
          periodOver,
        })
      : null

  return (
    <>
      <Hero>
        <HeroText>
          <HeroTitle>{title}</HeroTitle>
          <HeroMeta>
            <StatusChip $tone={reverted ? 'error' : 'success'}>
              {reverted ? <CrossIcon /> : <CheckIcon />}
              {reverted ? 'Reverted' : 'Confirmed'}
            </StatusChip>
            <time dateTime={isoFromSeconds(confirmedAtSeconds)}>
              {formatTimestamp(confirmedAtSeconds, true)}
            </time>
          </HeroMeta>
        </HeroText>
        {canGoToItem && (
          <PrimaryButton to={`/${operation.registryKey}/${itemID}`}>
            Go to Item
            <ArrowIcon />
          </PrimaryButton>
        )}
      </Hero>

      {showUnrelatedBanner && (
        <InfoBanner>
          This transaction isn't recognized as a Scout action. It was sent to a contract
          outside the indexed registries. Raw details are shown below.
        </InfoBanner>
      )}

      {nextSteps && <InfoBanner>{nextSteps}</InfoBanner>}

      <Divider />

      <DetailsList>
        {hasAmount && (
          <DetailRow>
            <DetailLabel>{amountLabel}</DetailLabel>
            <DetailValue>
              {formatAmount(kept)} {NATIVE_SYMBOL}
              {refunded > 0n && (
                <SubLabel>
                  {formatAmount(value)} {NATIVE_SYMBOL} sent, {formatAmount(refunded)} {NATIVE_SYMBOL}{' '}
                  refunded in the same transaction
                </SubLabel>
              )}
            </DetailValue>
          </DetailRow>
        )}

        <DetailRow>
          <DetailLabel>Transaction hash</DetailLabel>
          <DetailValue>
            <Copyable copyableContent={hash} info="Copy hash">
              {shortenHash(hash)}
            </Copyable>
            <ExternalLink
              href={explorerTxUrl(hash)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on block explorer"
            >
              <OpenIcon />
            </ExternalLink>
          </DetailValue>
        </DetailRow>

        <DetailRow>
          <DetailLabel>From</DetailLabel>
          <DetailValue>
            {/* The name keeps the visible address (WCAG 2.5.3): "View profile of 0x7E41...C3D4". */}
            <AddressLink to={`/profile/pending?address=${from.toLowerCase()}`}>
              <span className="visually-hidden">View profile of </span>
              <IdenticonOrAvatar size="20" address={from} />
              <AddressOrName address={from} smallDisplay />
              <ArrowIcon aria-hidden="true" />
            </AddressLink>
            <Copyable copyableContent={from} info="Copy address">{null}</Copyable>
            <ExternalLink
              href={explorerAddrUrl(from)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View address on block explorer"
            >
              <OpenIcon />
            </ExternalLink>
          </DetailValue>
        </DetailRow>

        {to && (
          <DetailRow>
            <DetailLabel>Contract</DetailLabel>
            <DetailValue>
              <Copyable copyableContent={toAddr} info="Copy address">
                {shortenAddress(toAddr)}
              </Copyable>
              <ExternalLink
                href={explorerAddrUrl(toAddr)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View contract on block explorer"
              >
                <OpenIcon />
              </ExternalLink>
              {registryFullLabel && <SubLabel>{registryFullLabel}</SubLabel>}
            </DetailValue>
          </DetailRow>
        )}

        {hasPeriod && periodEnd !== undefined && (
          <DetailRow>
            <DetailLabel>Challenge period</DetailLabel>
            <DetailValue>
              <ValueText>
                {shortHumanizer((challengePeriodSeconds as number) * 1000)}, {periodOver ? 'ended' : 'ends'}{' '}
                <time dateTime={isoFromSeconds(periodEnd)}>{formatTimestamp(periodEnd, true)}</time>
              </ValueText>
            </DetailValue>
          </DetailRow>
        )}

        <DetailRow>
          <DetailLabel>Network</DetailLabel>
          <DetailValue>
            <ChainIconWrapper>
              <GnosisIcon />
            </ChainIconWrapper>
            {CHAIN_NAME}
          </DetailValue>
        </DetailRow>

        <DetailRow>
          <DetailLabel>Transaction fee</DetailLabel>
          <DetailValue>{formatAmount(txFeeWei)} {NATIVE_SYMBOL}</DetailValue>
        </DetailRow>
      </DetailsList>
    </>
  )
}

export default TxResult
