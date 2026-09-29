import React from 'react'
import styled, { css } from 'styled-components'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useAttention, useNow } from 'hooks/useAttention'
import { useSeenEvidence } from 'hooks/useSeenEvidence'
import { timeLeft } from 'utils/timeLeft'
import { unreadEvidence, type AttentionLevel } from 'utils/cases/attention'
import { describeAttention } from './describe'

const Pill = styled(Link)<{ $new: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  ${({ theme, $new }) =>
    $new
      ? css`
          background: ${theme.warning}30;
          color: ${theme.warning};
        `
      : css`
          background: ${theme.subtleBackground};
          color: ${theme.secondaryText};
        `}

  &:hover {
    filter: brightness(1.15);
  }
`

/**
 * Evidence on a request, with how much of it the connected wallet hasn't
 * read yet (open requests only). Links to the item's Evidence tab.
 */
export const EvidenceCount: React.FC<{
  itemId: string
  itemPath: string
  evidences?: { party: string; timestamp: string }[] | null
  /** Whether the request is still open; closed ones show totals only. */
  active: boolean
}> = ({ itemId, itemPath, evidences, active }) => {
  const { address } = useAccount()
  const seen = useSeenEvidence(address)
  const total = evidences?.length ?? 0
  if (total === 0) return null
  const unread =
    active && address
      ? unreadEvidence(
          evidences ?? [],
          address,
          seen[itemId.toLowerCase()] ?? 0,
        ).length
      : 0
  return (
    <Pill
      to={`${itemPath}?tab=evidence`}
      $new={unread > 0}
      title={
        unread > 0
          ? `${unread} piece${unread === 1 ? '' : 's'} of evidence you haven't read`
          : 'Evidence'
      }
    >
      Evidence {total}
      {unread > 0 ? ` · ${unread} new` : null}
    </Pill>
  )
}

const Line = styled.div<{ $level: AttentionLevel }>`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};

  span:first-child {
    padding: 2px 8px;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: ${({ theme, $level }) =>
      $level === 'urgent'
        ? theme.error
        : $level === 'action'
          ? theme.warning
          : theme.secondaryText};
  }
`

const TAG: Record<AttentionLevel, string> = {
  urgent: 'Act or lose',
  action: 'Your call',
  waiting: 'In progress',
}

/** What the connected wallet has to do about an item, in one line, if anything. */
export const CaseStatusLine: React.FC<{ itemId: string }> = ({ itemId }) => {
  const { address } = useAccount()
  const { entries } = useAttention(address)
  const now = useNow()
  const entry = entries.find(
    (e) => e.item.id.toLowerCase() === itemId.toLowerCase(),
  )
  if (!entry || entry.level === 'waiting') return null
  const left = entry.deadline ? timeLeft(entry.deadline, now) : null
  return (
    <Line $level={entry.level}>
      <span>{entry.newEvidence ? 'New evidence' : TAG[entry.level]}</span>
      <span>
        {describeAttention(entry).title}
        {left ? ` · ${left} left` : ''}
      </span>
    </Line>
  )
}
