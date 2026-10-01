import React, { useEffect, useState } from 'react'
import styled, { css } from 'styled-components'
import { formatDistanceToNowStrict } from 'date-fns'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import PayoutWarning from 'components/PayoutWarning'
import { useNotifyConfig, useNotifyProfile } from 'hooks/useNotifications'
import {
  useAppealFunding,
  useAttention,
  useDisputePeriod,
  useNow,
} from 'hooks/useAttention'
import { localDeadline, timeLeft } from 'utils/timeLeft'
import type {
  Attention,
  AttentionLevel,
  AttentionWithEvidence,
} from 'utils/cases/attention'
import { registryKeyOf } from 'utils/cases/indexer'
import { itemLabel, xdai } from 'utils/cases/labels'
import { describeAttention, evidenceAuthor, evidenceSnippet } from './describe'

const levelColor = css<{ $level: AttentionLevel }>`
  color: ${({ theme, $level }) =>
    $level === 'urgent'
      ? theme.error
      : $level === 'action'
        ? theme.warning
        : theme.secondaryText};
`

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 16px;
  background: ${({ theme }) => theme.modalBackground};
`

const PanelHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  flex-wrap: wrap;
`

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const Muted = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
`

const Cards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Card = styled.article<{ $level: AttentionLevel }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid
    ${({ theme, $level }) =>
      $level === 'urgent'
        ? theme.error
        : $level === 'action'
          ? theme.warning
          : theme.stroke};
  background: ${({ theme }) => theme.subtleBackground};
`

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
`

const Tag = styled.span<{ $level: AttentionLevel }>`
  ${levelColor}
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`

const ItemLink = styled(Link)`
  color: ${({ theme }) => theme.secondaryBlue};
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: ${({ theme }) => theme.primaryText};
`

const CardBody = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
`

const Deadline = styled.div<{ $level: AttentionLevel }>`
  ${levelColor}
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`

const Cta = styled(Link)`
  align-self: flex-start;
  margin-top: 4px;
  padding: 8px 16px;
  border-radius: 999px;
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.buttonWhiteHover};
  }
`

const Waiting = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => theme.stroke};
`

const WaitingRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 16px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};

  span:last-child {
    color: ${({ theme }) => theme.secondaryText};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
`

const TextButton = styled.button`
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
`

const EvidenceLine = styled.div`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
  overflow-wrap: anywhere;

  strong {
    color: ${({ theme }) => theme.warning};
    font-weight: 600;
  }
`

const InlineLink = styled(Link)`
  margin-left: 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryBlue};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
`

const itemPath = (entry: Attention) =>
  `/${registryKeyOf(entry.item.registryAddress) ?? entry.item.registryAddress}/${entry.item.itemID}`

const CTA: Partial<Record<Attention['kind'], string>> = {
  defend: 'Fund your side',
  appeal: 'Appeal',
  'fund-undecided': 'Fund your side',
  challenged: 'Add evidence',
  'removal-requested': 'Review the removal',
}

const PERIOD_ENDS: Record<string, string> = {
  evidence: 'Evidence period ends',
  commit: 'Commit period ends',
  vote: 'Voting ends',
  appeal: 'Appeal period ends',
}

const TAG: Record<AttentionLevel, string> = {
  urgent: 'Act or lose',
  action: 'Your call',
  waiting: 'In progress',
}

const useDescription = (entry: Attention) => {
  const funding = useAppealFunding(entry)
  const period = useDisputePeriod(entry)
  const fundingData = funding.data
  // Only disputes before a ruling have a court period that matters here.
  const periodData =
    entry.kind === 'challenged' || entry.kind === 'dispute'
      ? period.data
      : undefined
  const total = entry.required ? fundingData?.[entry.required] : undefined
  const missing =
    total !== undefined
      ? xdai(total > (entry.raised ?? 0n) ? total - (entry.raised ?? 0n) : 0n)
      : undefined
  return {
    ...describeAttention(entry, { missing, period: periodData?.period }),
    // Before a ruling, the deadline that matters is the court period's.
    deadline: entry.deadline ?? periodData?.deadline,
    deadlineLabel:
      entry.deadline === undefined && periodData
        ? (PERIOD_ENDS[periodData.period] ?? 'Period ends')
        : 'Deadline',
  }
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

const AttentionCard: React.FC<{
  entry: AttentionWithEvidence
  /** On the item page itself: no item link, and evidence links switch tabs. */
  onItemPage?: boolean
}> = ({ entry, onItemPage = false }) => {
  const now = useNow()
  const { title, body, deadline, deadlineLabel } = useDescription(entry)
  const left = deadline ? timeLeft(deadline, now) : null
  const href = itemPath(entry)
  const evidenceHref = onItemPage
    ? { search: '?tab=evidence' }
    : `${href}?tab=evidence`
  const { total, unread, latest } = entry.evidence
  // Evidence to read, or to add, happens on the Evidence tab.
  const toEvidence = entry.newEvidence || entry.kind === 'challenged'
  const cta = entry.newEvidence ? 'Read the evidence' : CTA[entry.kind]
  const showCta = cta && (!onItemPage || toEvidence)
  return (
    <Card $level={entry.level}>
      <CardTop>
        <Tag $level={entry.level}>
          {entry.newEvidence ? 'New evidence' : TAG[entry.level]}
        </Tag>
        {onItemPage ? null : (
          <ItemLink to={href}>{itemLabel(entry.item)}</ItemLink>
        )}
      </CardTop>
      <CardTitle>{title}</CardTitle>
      <CardBody>{body}</CardBody>
      {total > 0 ? (
        <EvidenceLine>
          {plural(total, 'piece', 'pieces')} of evidence
          {unread > 0 ? (
            <>
              {', '}
              <strong>{unread} new</strong>
              {latest
                ? `. Latest from ${evidenceAuthor(entry, latest.party)}, ${formatDistanceToNowStrict(new Date(Number(latest.timestamp) * 1000), { addSuffix: true })}: ${evidenceSnippet(latest)}`
                : ''}
            </>
          ) : null}
          {unread > 0 && !(showCta && toEvidence) ? (
            <InlineLink to={evidenceHref}>Read</InlineLink>
          ) : null}
        </EvidenceLine>
      ) : null}
      {deadline && left ? (
        <Deadline $level={entry.level}>
          {deadlineLabel} {localDeadline(deadline)} · {left} left
        </Deadline>
      ) : null}
      {showCta ? <Cta to={toEvidence ? evidenceHref : href}>{cta}</Cta> : null}
    </Card>
  )
}

const WaitingEntry: React.FC<{ entry: AttentionWithEvidence }> = ({
  entry,
}) => {
  const now = useNow()
  const { title, deadline } = useDescription(entry)
  const left = deadline ? timeLeft(deadline, now) : null
  return (
    <WaitingRow>
      <span>
        {title} ·{' '}
        <ItemLink to={itemPath(entry)}>{itemLabel(entry.item)}</ItemLink>
      </span>
      <span>{left ? `${left} left` : ''}</span>
    </WaitingRow>
  )
}

const NotifyHint: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const config = useNotifyConfig()
  const profile = useNotifyProfile()
  if (!config.data || profile.data?.signedIn) return null
  return (
    <Muted>
      Want a heads-up when something lands here?{' '}
      <TextButton
        type="button"
        onClick={() =>
          navigate(`${location.pathname}${location.search}#notifications`)
        }
      >
        Set up notifications
      </TextButton>
    </Muted>
  )
}

const WAITING_PREVIEW = 3

/**
 * Everything the connected wallet has at stake in open requests, on its own
 * profile. It reflects the registries' current state, so a case stays here
 * until it is resolved, however long ago the alert about it was.
 */
export const AttentionPanel: React.FC<{ address: string }> = ({ address }) => {
  const { entries, isLoading, error, refetch } = useAttention(address)
  const [showAll, setShowAll] = useState(false)
  const pressing = entries.filter((e) => e.level !== 'waiting')
  const waiting = entries.filter((e) => e.level === 'waiting')
  const shown = showAll ? waiting : waiting.slice(0, WAITING_PREVIEW)
  return (
    <Panel aria-labelledby="attention-title">
      <PanelHeader>
        <PanelTitle id="attention-title">Needs your attention</PanelTitle>
        <Muted>Live from the registries, until each case is resolved.</Muted>
      </PanelHeader>
      <PayoutWarning address={address} />
      {error ? (
        <Muted>
          Couldn't load your open cases.{' '}
          <TextButton type="button" onClick={() => refetch()}>
            Try again
          </TextButton>
        </Muted>
      ) : isLoading ? (
        <Muted>Checking your open cases…</Muted>
      ) : entries.length === 0 ? (
        <Muted>
          Nothing right now. Challenges, new evidence, rulings and appeal
          deadlines on your items show up here until they are resolved.
        </Muted>
      ) : (
        <>
          {pressing.length > 0 ? (
            <Cards>
              {pressing.map((entry) => (
                <AttentionCard key={entry.key} entry={entry} />
              ))}
            </Cards>
          ) : (
            <Muted>Nothing to do right now.</Muted>
          )}
          {waiting.length > 0 ? (
            <>
              <Waiting aria-label="In progress">
                {shown.map((entry) => (
                  <WaitingEntry key={entry.key} entry={entry} />
                ))}
              </Waiting>
              {waiting.length > WAITING_PREVIEW ? (
                <TextButton type="button" onClick={() => setShowAll((v) => !v)}>
                  {showAll
                    ? 'Show fewer'
                    : `Show all ${waiting.length} in progress`}
                </TextButton>
              ) : null}
            </>
          ) : null}
        </>
      )}
      <NotifyHint />
    </Panel>
  )
}

/**
 * On an item page: what the connected wallet has to do about this item.
 * `refreshKey` changes with the page's own (faster) data, so the banner
 * clears as soon as, say, the appeal gets funded.
 */
export const AttentionBanner: React.FC<{
  itemId: string
  refreshKey?: string
}> = ({ itemId, refreshKey }) => {
  const { address } = useAccount()
  const { entries, refetch } = useAttention(address)
  const enabled = Boolean(address)
  useEffect(() => {
    if (enabled && refreshKey !== undefined) refetch()
  }, [enabled, refreshKey, refetch])
  const mine = entries.filter(
    (e) =>
      e.level !== 'waiting' && e.item.id.toLowerCase() === itemId.toLowerCase(),
  )
  if (mine.length === 0) return null
  return (
    <Cards aria-label="Needs your attention">
      {mine.map((entry) => (
        <AttentionCard key={entry.key} entry={entry} onItemPage />
      ))}
    </Cards>
  )
}

const Badge = styled.span<{ $urgent: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  margin-left: 6px;
  border-radius: 999px;
  background: ${({ theme, $urgent }) =>
    $urgent ? theme.error : theme.warning};
  color: ${({ theme }) => theme.black};
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
`

/** Count of cases the connected wallet has to act on, for navigation links. */
export const useAttentionCount = () => {
  const { address } = useAccount()
  const { entries } = useAttention(address)
  const pressing = entries.filter((e) => e.level !== 'waiting')
  return {
    count: pressing.length,
    urgent: pressing.some((e) => e.level === 'urgent'),
  }
}

export const AttentionBadge: React.FC = () => {
  const { count, urgent } = useAttentionCount()
  if (count === 0) return null
  return (
    <Badge
      $urgent={urgent}
      aria-label={`${count} case${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} your attention`}
    >
      {count > 9 ? '9+' : count}
    </Badge>
  )
}

const Dot = styled.span<{ $urgent: boolean }>`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ theme, $urgent }) =>
    $urgent ? theme.error : theme.warning};
  pointer-events: none;
`

/** A dot for places without room for a count, like the mobile menu button. */
export const AttentionDot: React.FC = () => {
  const { count, urgent } = useAttentionCount()
  if (count === 0) return null
  return <Dot $urgent={urgent} aria-hidden />
}
