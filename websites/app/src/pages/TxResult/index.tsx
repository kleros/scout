import React from 'react'
import styled, { css } from 'styled-components'
import { Link, useParams } from 'react-router-dom'
import { formatEther } from 'ethers'
import humanizeDuration from 'humanize-duration'
import { gnosis } from '@reown/appkit/networks'
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import { useTxResultQuery, isTxHashValid } from 'hooks/queries/useTxResultQuery'
import { shortenAddress } from 'utils/shortenAddress'
import Copyable from 'components/Copyable'
import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'
import LoadingItems from 'pages/Registries/LoadingItems'
import ArrowLeftIcon from 'assets/svgs/icons/arrow-left.svg'
import ArrowIcon from 'assets/svgs/icons/arrow.svg'

// The tx page queries Gnosis exclusively (the registries live only there), so all
// chain-identifying strings are resolved from the chain config once, not spread around.
// viem's gnosis object has `name: 'Gnosis'` and `nativeCurrency.symbol: 'XDAI'`; Scout's
// branded forms are "Gnosis Chain" and "xDAI", so we override those two display strings.
const EXPLORER_URL = gnosis.blockExplorers?.default?.url ?? 'https://gnosisscan.io'
const CHAIN_NAME = 'Gnosis Chain'
const NATIVE_SYMBOL = 'xDAI'
const explorerTxUrl = (hash: string) => `${EXPLORER_URL}/tx/${hash}`
const explorerAddrUrl = (addr: string) => `${EXPLORER_URL}/address/${addr}`

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  padding: 32px 16px 64px;
  font-family: 'Open Sans', sans-serif;
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

  svg {
    width: 12px;
    height: 12px;
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
`

const MonoText = styled.span`
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-size: 13px;
`

const SubLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.tertiaryText};
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
  background: ${({ theme }) => theme.stroke}40;
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

const formatUtcDate = (date: Date): string => date.toUTCString().replace(',', '')

const shortenHash = (hash: string): string =>
  hash.length > 12 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash

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
    default:
      // Known registry but unmapped function (e.g. governance). Still informative.
      return `${operationType} · ${target}`
  }
}

const TxResult: React.FC = () => {
  const { txHash } = useParams<{ txHash: string }>()
  const valid = isTxHashValid(txHash)
  const { data, isLoading, isError } = useTxResultQuery(valid ? txHash : undefined)

  const registryKey = data?.operation.registryKey
  const registryDisplayName = data?.operation.registryDisplayName
  const returnTo = registryKey ? `/${registryKey}` : '/home'
  const returnLabel = registryDisplayName ?? 'Home'

  return (
    <Container>
      <Inner>
        <TopBar>
          <ReturnButton to={returnTo}>
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
          ) : isLoading ? (
            <LoadingItems />
          ) : isError || !data ? (
            <Message>
              <MessageTitle>Transaction not found</MessageTitle>
              We couldn't locate this transaction on {CHAIN_NAME}. It may still be pending,
              or the hash may be incorrect.
              <div style={{ marginTop: 16 }}>
                <ExternalLink
                  href={explorerTxUrl(txHash ?? '')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Gnosisscan <OpenIcon />
                </ExternalLink>
              </div>
            </Message>
          ) : (
            <SuccessBody data={data} />
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
    confirmedAt,
    operation,
    challengePeriodSeconds,
    itemID,
  } = data

  const reverted = status === 'reverted'
  const txFeeWei = gasUsed * effectiveGasPrice
  const toAddr = to ?? ('0x0000000000000000000000000000000000000000' as const)
  const registryFullLabel = operation.registryDisplayName
    ? `${operation.registryDisplayName} Registry`
    : undefined
  const hasDeposit = !reverted && value > 0n
  const title = reverted
    ? 'Transaction reverted'
    : titleFor(operation.operationType, operation.registryDisplayName, operation.isKnownRegistry)
  const canGoToItem = !reverted && itemID && operation.registryKey
  const showUnrelatedBanner = !reverted && !operation.isKnownRegistry

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
            <span>{formatUtcDate(new Date(confirmedAt))}</span>
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

      <Divider />

      <DetailsList>
        {hasDeposit && (
          <DetailRow>
            <DetailLabel>Deposit</DetailLabel>
            <DetailValue>{formatAmount(value)} {NATIVE_SYMBOL}</DetailValue>
          </DetailRow>
        )}

        <DetailRow>
          <DetailLabel>Transaction hash</DetailLabel>
          <DetailValue>
            <Copyable copyableContent={hash} info="Copy hash">
              <MonoText>{shortenHash(hash)}</MonoText>
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
            <AddressLink
              to={`/profile/pending?address=${from.toLowerCase()}`}
              aria-label="View activity for this address"
            >
              <IdenticonOrAvatar size="20" address={from} />
              <AddressOrName address={from} smallDisplay />
              <ArrowIcon />
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
                <MonoText>{shortenAddress(toAddr)}</MonoText>
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

        {!reverted &&
          operation.showPeriod &&
          challengePeriodSeconds !== undefined &&
          challengePeriodSeconds > 0 && (
            <DetailRow>
              <DetailLabel>Challenge period</DetailLabel>
              <DetailValue>{shortHumanizer(challengePeriodSeconds * 1000)}</DetailValue>
            </DetailRow>
          )}

        <DetailRow>
          <DetailLabel>Network</DetailLabel>
          <DetailValue>{CHAIN_NAME}</DetailValue>
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
