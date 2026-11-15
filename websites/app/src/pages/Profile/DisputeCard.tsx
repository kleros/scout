import React from 'react'
import styled, { useTheme } from 'styled-components'
import { Link, useLocation } from 'react-router-dom'
import 'react-loading-skeleton/dist/skeleton.css'
import AddressDisplay from 'components/AddressDisplay'
import SubmittedByLink from 'components/SubmittedByLink'
import { revRegistryMap, registryDisplayNames, buildItemPath, getPropValue, getItemAddress } from 'utils/items'
import { formatTimestamp } from 'utils/formatTimestamp'
import { formatValue } from 'utils/formatValue'
import { hoverLongTransitionTiming } from 'styles/commonStyles'
import useRegistryParameters from 'hooks/useRegistryParameters'
import NewTabIcon from 'assets/svgs/icons/new-tab.svg'
import {
  Card, Header, Bullet, Title, Registry, StatusLabel, Divider, Body,
  MetaLine, InfoRow, LabelValue, StyledChainLabel, StyledChainContainer, DateValue, ActionsGroup,
} from './profileCardStyles'

export type DisputeRole = 'requester' | 'challenger' | 'both'

const HeaderLeft = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  flex: 1;
`

const HeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

// Transient prop: a plain `role` would reach the DOM as an (invalid) ARIA role.
const RoleBadge = styled.span<{ $role: DisputeRole }>`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${({ $role, theme }) =>
    $role === 'challenger'
      ? theme.warning + '30'
      : $role === 'requester'
      ? theme.secondaryBlue + '30'
      : theme.primaryPurple + '30'};
  color: ${({ $role, theme }) =>
    $role === 'challenger'
      ? theme.warning
      : $role === 'requester'
      ? theme.secondaryBlue
      : theme.lavenderPurple};
`

const ButtonsContainer = styled(ActionsGroup)`
  gap: 8px;
`

const ViewItemLink = styled(Link)`
  ${hoverLongTransitionTiming}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.secondaryPurple}80;
  color: ${({ theme }) => theme.secondaryPurple};

  &:hover {
    background: ${({ theme }) => theme.secondaryPurple}15;
    border-color: ${({ theme }) => theme.secondaryPurple};
    color: ${({ theme }) => theme.secondaryPurple};
  }
`

const ViewCaseLink = styled.a`
  ${hoverLongTransitionTiming}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.buttonSecondaryBorder};
  color: ${({ theme }) => theme.primaryText};

  svg {
    width: 12px;
    height: 12px;
    fill: ${({ theme }) => theme.primaryText};
    flex-shrink: 0;
  }

  &:hover {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.primaryText};
    color: ${({ theme }) => theme.primaryText};
  }
`

type Outcome = 'active' | 'won' | 'lost' | 'refused' | 'accepted' | 'rejected'

const OUTCOME_TEXT: Record<Outcome, string> = {
  active: 'Active Dispute',
  won: 'Won',
  lost: 'Lost',
  refused: 'Refused to arbitrate',
  accepted: 'Ruled: Accepted',
  rejected: 'Ruled: Rejected',
}

/**
 * The dispute's result for this address. In Light Curate the requester (the submitter of a
 * registration, the remover of a removal) wins on "Accept" and the challenger on "Reject". When
 * the jurors refuse to arbitrate the deposits are split in half and nobody wins. An address that
 * challenged its own request was on both sides: the ruling is shown, not a win or a loss.
 */
const getOutcome = (request: any, role: DisputeRole): Outcome => {
  if (!request?.resolved) return 'active'
  const ruling = String(request.disputeOutcome ?? '')
  const accepted = ruling === 'Accept' || ruling === '1'
  const rejected = ruling === 'Reject' || ruling === '2'
  if (!accepted && !rejected) return 'refused'
  if (role === 'both') return accepted ? 'accepted' : 'rejected'
  if (role === 'requester') return accepted ? 'won' : 'lost'
  return rejected ? 'won' : 'lost'
}

const toBigInt = (value: unknown): bigint | null => {
  try {
    return value == null || value === '' ? null : BigInt(value as string)
  } catch {
    return null
  }
}

interface DisputeCardProps {
  /** A disputed item, with `userRole` and its latest dispute involving the address in `requests[0]`. */
  item: any
}

const DisputeCard: React.FC<DisputeCardProps> = ({ item }) => {
  const theme = useTheme()
  const location = useLocation()

  const registryKey = revRegistryMap[item.registryAddress] ?? 'Unknown'
  const registryName = registryDisplayNames[registryKey] ?? registryKey
  const request = item.requests?.[0]
  const userRole = item.userRole as DisputeRole
  const { data: registryParams } = useRegistryParameters(item.registryAddress)

  const displayName =
    getPropValue(item, 'Name') ||
    getPropValue(item, 'Domain name') ||
    getPropValue(item, 'Public Name Tag') ||
    getPropValue(item, 'Description') ||
    item.itemID

  const isRemoval = request?.requestType === 'ClearingRequested'
  // Who made the request: a submitter asks to add the entry, a remover to remove it.
  const requesterLabel = isRemoval ? 'Remover' : 'Submitter'
  const roleLabel =
    userRole === 'challenger'
      ? 'Challenger'
      : userRole === 'both'
      ? `${requesterLabel} and challenger`
      : requesterLabel

  const outcome = getOutcome(request, userRole)
  const outcomeColors: Record<Outcome, string> = {
    active: theme.statusChallenged,
    won: theme.success,
    lost: theme.error,
    refused: theme.statusGray,
    accepted: theme.statusGray,
    rejected: theme.statusGray,
  }

  // The day the request was challenged (the submission day only for old rows without it).
  const challengeTime = Number(request?.challengeTime ?? request?.submissionTime ?? 0) || null

  // What each side deposited. The requester paid its base deposit plus the arbitration cost
  // (current parameters, as elsewhere on the profile); the challenger's payment is recorded with
  // the request, with the current challenge deposit as a fallback.
  const arbitrationCost = registryParams?.arbitrationCost ?? 0n
  const requesterBase = toBigInt(request?.deposit)
  const requesterDeposit = requesterBase === null ? null : requesterBase + arbitrationCost
  const recordedChallengerDeposit = toBigInt(request?.rounds?.[0]?.amountPaidChallenger)
  const challengerDeposit =
    recordedChallengerDeposit && recordedChallengerDeposit > 0n
      ? recordedChallengerDeposit
      : registryParams
      ? (isRemoval ? registryParams.removalChallengeBaseDeposit : registryParams.submissionChallengeBaseDeposit) +
        registryParams.arbitrationCost
      : null
  const formatDeposit = (value: bigint | null) => (value === null ? '-' : `${formatValue(value, 2)} xDAI`)

  const requester = request?.requester ?? ''
  const challenger = request?.challenger ?? ''
  const disputeID = request?.disputeID

  const chainId = getPropValue(item, 'EVM Chain ID')
  const itemAddr = getItemAddress(item, registryKey)

  const itemUrl = buildItemPath(item.id)

  const requestTypeLabel =
    request?.requestType === 'RegistrationRequested'
      ? 'Registration'
      : request?.requestType === 'ClearingRequested'
      ? 'Removal'
      : 'Request'

  return (
    <Card>
      <Header>
        <HeaderLeft>
          <Title>{displayName}</Title>
          <Registry>({registryName})</Registry>
          <Bullet color={outcomeColors[outcome]} />
          <StatusLabel>{OUTCOME_TEXT[outcome]}</StatusLabel>
        </HeaderLeft>
        <HeaderRight>
          <RoleBadge $role={userRole}>{roleLabel}</RoleBadge>
        </HeaderRight>
      </Header>

      <Divider />

      <Body>
        <MetaLine>
          <InfoRow>
            <LabelValue>
              <span>Dispute Type:</span>
              <span>{requestTypeLabel}</span>
            </LabelValue>

            <LabelValue>
              <span>Challenged on:</span>
              {challengeTime ? (
                <DateValue dateTime={new Date(challengeTime * 1000).toISOString()} title={formatTimestamp(challengeTime, true)}>
                  {formatTimestamp(challengeTime)}
                </DateValue>
              ) : (
                <span>-</span>
              )}
            </LabelValue>

            {disputeID && (
              <LabelValue>
                <span>Case #{disputeID}</span>
              </LabelValue>
            )}

            {userRole === 'both' ? (
              <>
                <LabelValue>
                  <span>{isRemoval ? 'Removal deposit:' : 'Submission deposit:'}</span>
                  <span>{formatDeposit(requesterDeposit)}</span>
                </LabelValue>
                <LabelValue>
                  <span>Challenge deposit:</span>
                  <span>{formatDeposit(challengerDeposit)}</span>
                </LabelValue>
              </>
            ) : (
              <LabelValue>
                <span>Deposit:</span>
                <span>{formatDeposit(userRole === 'challenger' ? challengerDeposit : requesterDeposit)}</span>
              </LabelValue>
            )}

            {userRole === 'requester' && challenger && (
              <LabelValue>
                <span>Challenger:</span>
                <SubmittedByLink address={challenger} />
              </LabelValue>
            )}

            {userRole === 'challenger' && requester && (
              <LabelValue>
                <span>{requesterLabel}:</span>
                <SubmittedByLink address={requester} />
              </LabelValue>
            )}

            {chainId && (
              <StyledChainContainer>
                <StyledChainLabel>Chain:</StyledChainLabel>
                <AddressDisplay address={`eip155:${chainId}`} />
              </StyledChainContainer>
            )}

            {itemAddr && (
              <StyledChainContainer>
                <StyledChainLabel>Address:</StyledChainLabel>
                <AddressDisplay address={itemAddr} />
              </StyledChainContainer>
            )}
          </InfoRow>

          <ButtonsContainer>
            <ViewItemLink
              to={itemUrl}
              state={{ fromApp: true, from: 'profile', profileTab: 'disputes', profileSearch: location.search }}
            >
              View Item
            </ViewItemLink>
            {disputeID && (
              <ViewCaseLink
                href={`https://klerosboard.com/100/cases/${disputeID}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Case
                <NewTabIcon aria-hidden="true" />
              </ViewCaseLink>
            )}
          </ButtonsContainer>
        </MetaLine>
      </Body>
    </Card>
  )
}

export default DisputeCard
