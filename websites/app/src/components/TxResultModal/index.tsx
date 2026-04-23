import React from 'react'
import styled from 'styled-components'
import { formatEther } from 'ethers'
import humanizeDuration from 'humanize-duration'
import { useTxResultModal } from 'context/TxResultContext'
import { shortenAddress } from 'utils/shortenAddress'
import { revRegistryMap, registryDisplayNames } from 'utils/items'
import Copyable from 'components/Copyable'

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.modalOverlay};
  display: ${({ $isOpen }) => ($isOpen ? 'flex' : 'none')};
  justify-content: center;
  align-items: center;
  z-index: 1100;
  padding: 16px;
`

const Container = styled.div`
  position: relative;
  width: 100%;
  max-width: 520px;
  background: ${({ theme }) => theme.modalBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 20px;
  color: ${({ theme }) => theme.primaryText};
  box-shadow: ${({ theme }) => theme.shadowModal};
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
`

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryText};
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  padding: 4px;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`

const Body = styled.div`
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const StatusCard = styled.div`
  position: relative;
  border-radius: 14px;
  padding: 18px 18px 16px;
  background: ${({ theme }) => theme.gradientCardSubtle};
  border: 1px solid ${({ theme }) => theme.stroke};
  overflow: hidden;
`

const StatusTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const OperationLabel = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const ConfirmedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.success}1F;
  color: ${({ theme }) => theme.success};
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

const AmountRow = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
`

const AmountValue = styled.span`
  font-size: 22px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const AmountUnit = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
`

const StatusMeta = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};

  @media (max-width: 420px) {
    align-items: flex-start;
  }
`

const DetailsList = styled.div`
  display: flex;
  flex-direction: column;
`

const DetailRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
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
  font-family: "JetBrains Mono", "Menlo", monospace;
  font-size: 13px;
`

const SubLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.tertiaryText};
  width: 100%;
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

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm3.7 6.3-4.2 4.2a.8.8 0 0 1-1.2 0L4.3 8.5a.8.8 0 1 1 1.2-1.2l1.4 1.4 3.6-3.6a.8.8 0 1 1 1.2 1.2Z" />
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
  // Trim trailing zeros up to 6 decimal places.
  return asNum
    .toFixed(6)
    .replace(/\.?0+$/, '')
}

const formatUtcDate = (date: Date): string =>
  date.toUTCString().replace(',', '')

const shortenHash = (hash: string): string =>
  hash.length > 12 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash

const TxResultModal: React.FC = () => {
  const { data, isOpen, hide } = useTxResultModal()

  if (!data) return null

  const {
    hash,
    from,
    to,
    gasUsed,
    effectiveGasPrice,
    operationType,
    deposit,
    periodSeconds,
    periodLabel = 'Challenge period',
    registryName,
    confirmedAt,
  } = data

  const explorerTx = `https://gnosisscan.io/tx/${hash}`
  const explorerAddr = (addr: string) => `https://gnosisscan.io/address/${addr}`
  const txFeeWei = gasUsed * effectiveGasPrice
  const resolvedRegistryName =
    registryName ?? registryDisplayNames[revRegistryMap[to.toLowerCase()]]
  const registryFullLabel = resolvedRegistryName ? `${resolvedRegistryName} Registry` : undefined

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) hide()
  }

  return (
    <Overlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <Container>
        <Header>
          <Title>Transaction Details</Title>
          <CloseButton onClick={hide} aria-label="Close">
            ×
          </CloseButton>
        </Header>
        <Body>
          <StatusCard>
            <StatusTopRow>
              <OperationLabel>
                {operationType}
                {resolvedRegistryName ? ` · ${resolvedRegistryName}` : ''}
              </OperationLabel>
              <ConfirmedBadge>
                <CheckIcon />
                Confirmed
              </ConfirmedBadge>
            </StatusTopRow>
            {deposit !== undefined && deposit > 0n && (
              <AmountRow>
                <AmountValue>{formatAmount(deposit)}</AmountValue>
                <AmountUnit>xDAI deposit</AmountUnit>
              </AmountRow>
            )}
            <StatusMeta>
              <span>{formatUtcDate(new Date(confirmedAt ?? Date.now()))}</span>
              <span>Gnosis Chain</span>
            </StatusMeta>
          </StatusCard>

          <DetailsList>
            <DetailRow>
              <DetailLabel>Transaction hash</DetailLabel>
              <DetailValue>
                <Copyable copyableContent={hash} info="Copy hash">
                  <MonoText>{shortenHash(hash)}</MonoText>
                </Copyable>
                <ExternalLink href={explorerTx} aria-label="View on Gnosisscan">
                  <OpenIcon />
                </ExternalLink>
              </DetailValue>
            </DetailRow>

            <DetailRow>
              <DetailLabel>From</DetailLabel>
              <DetailValue>
                <Copyable copyableContent={from} info="Copy address">
                  <MonoText>{shortenAddress(from)}</MonoText>
                </Copyable>
                <ExternalLink
                  href={explorerAddr(from)}
                  aria-label="View address on Gnosisscan"
                >
                  <OpenIcon />
                </ExternalLink>
                <SubLabel>You</SubLabel>
              </DetailValue>
            </DetailRow>

            <DetailRow>
              <DetailLabel>Interacted with</DetailLabel>
              <DetailValue>
                <Copyable copyableContent={to} info="Copy address">
                  <MonoText>{shortenAddress(to)}</MonoText>
                </Copyable>
                <ExternalLink
                  href={explorerAddr(to)}
                  aria-label="View contract on Gnosisscan"
                >
                  <OpenIcon />
                </ExternalLink>
                {registryFullLabel && <SubLabel>{registryFullLabel}</SubLabel>}
              </DetailValue>
            </DetailRow>

            {periodSeconds !== undefined && periodSeconds > 0 && (
              <DetailRow>
                <DetailLabel>{periodLabel}</DetailLabel>
                <DetailValue>{shortHumanizer(periodSeconds * 1000)}</DetailValue>
              </DetailRow>
            )}

            <DetailRow>
              <DetailLabel>Transaction fee</DetailLabel>
              <DetailValue>{formatAmount(txFeeWei)} xDAI</DetailValue>
            </DetailRow>
          </DetailsList>
        </Body>
      </Container>
    </Overlay>
  )
}

export default TxResultModal
