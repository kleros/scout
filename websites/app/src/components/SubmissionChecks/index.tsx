import React, { useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import type { CheckResult } from 'utils/checks'

type Tone = 'error' | 'warning' | 'muted' | 'success'

const toneOf = (result: CheckResult): Tone => {
  if (result.outcome === 'pass') return 'success'
  if (result.outcome === 'fail')
    return result.severity === 'violation' ? 'error' : 'warning'
  return 'muted'
}

const toneColor = css<{ $tone: Tone }>`
  color: ${({ theme, $tone }) =>
    $tone === 'error'
      ? theme.error
      : $tone === 'warning'
        ? theme.warning
        : $tone === 'success'
          ? theme.success
          : theme.secondaryText};
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Spinner = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid ${({ theme }) => theme.stroke};
  border-top-color: ${({ theme }) => theme.secondaryText};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`

const FixButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  margin-left: 6px;
  font: inherit;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
`

const shorten = (value: string) =>
  value.length > 48 ? `${value.slice(0, 45)}…` : value

const Fix: React.FC<{
  result: CheckResult
  onApplyFix?: (field: string, value: string) => void
}> = ({ result, onApplyFix }) =>
  result.fix !== undefined && result.field && onApplyFix ? (
    <FixButton
      type="button"
      onClick={() => onApplyFix(result.field as string, result.fix as string)}
    >
      Use “{shorten(result.fixLabel ?? result.fix)}”
    </FixButton>
  ) : null

// ---------------------------------------------------------------------------
// Inline messages under a form field
// ---------------------------------------------------------------------------

const FieldMessage = styled.div<{ $tone: Tone }>`
  ${toneColor}
  margin-top: -6px;
  font-size: 14px;
  line-height: 1.45;
`

/** Problems, open questions and suggestions for one column, shown under its input. */
export const FieldChecks: React.FC<{
  results: CheckResult[]
  field: string
  onApplyFix?: (field: string, value: string) => void
}> = ({ results, field, onApplyFix }) => {
  const relevant = results.filter(
    (r) =>
      r.field === field &&
      (r.outcome === 'fail' ||
        r.outcome === 'inconclusive' ||
        (r.outcome === 'pending' && r.message)),
  )
  if (relevant.length === 0) return null
  return (
    <>
      {relevant.map((result) => (
        <FieldMessage
          key={result.id}
          $tone={toneOf(result)}
          role={result.outcome === 'fail' ? 'alert' : undefined}
        >
          {result.outcome === 'inconclusive' ? "Couldn't verify: " : null}
          {result.message ?? result.title}
          <Fix result={result} onApplyFix={onApplyFix} />
        </FieldMessage>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Checklist panel above the submit button
// ---------------------------------------------------------------------------

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  background: ${({ theme }) => theme.subtleBackground};
`

const PanelHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const Summary = styled.span<{ $tone: Tone }>`
  ${toneColor}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
`

const Explainer = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 8px;
  font-size: 14px;
  line-height: 1.45;
  color: ${({ theme }) => theme.primaryText};
`

const Icon = styled.span<{ $tone: Tone }>`
  ${toneColor}
  display: inline-flex;
  justify-content: center;
  font-weight: 700;
`

const Detail = styled.div<{ $tone: Tone }>`
  ${toneColor}
  font-size: 13px;
`

const TextButton = styled.button`
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
`

const ICONS: Record<Tone, string> = {
  error: '✕',
  warning: '!',
  muted: '?',
  success: '✓',
}

const CheckRow: React.FC<{
  result: CheckResult
  onApplyFix?: (field: string, value: string) => void
}> = ({ result, onApplyFix }) => {
  const tone = toneOf(result)
  return (
    <Row>
      <Icon $tone={tone} aria-hidden>
        {result.outcome === 'pending' ? (
          result.message ? (
            '○'
          ) : (
            <Spinner />
          )
        ) : (
          ICONS[tone]
        )}
      </Icon>
      <div>
        {result.title}
        {result.outcome !== 'pass' && result.message ? (
          <Detail $tone={tone}>
            {result.outcome === 'inconclusive' ? "Couldn't verify: " : null}
            {result.message}
            <Fix result={result} onApplyFix={onApplyFix} />
          </Detail>
        ) : null}
      </div>
    </Row>
  )
}

const rank = (result: CheckResult) => {
  if (result.outcome === 'fail') return result.severity === 'violation' ? 0 : 1
  if (result.outcome === 'inconclusive') return 2
  if (result.outcome === 'pending') return 3
  return 4
}

interface ChecksPanelProps {
  results: CheckResult[]
  checking: boolean
  onRetry?: () => void
  onApplyFix?: (field: string, value: string) => void
}

/**
 * Summary of every pre-submission check. Failing `violation` rules mirror the
 * automated checks that challenge new submissions, so they block submission.
 */
export const ChecksPanel: React.FC<ChecksPanelProps> = ({
  results,
  checking,
  onRetry,
  onApplyFix,
}) => {
  const [showPassed, setShowPassed] = useState(false)
  const sorted = [...results].sort((a, b) => rank(a) - rank(b))
  const open = sorted.filter((r) => r.outcome !== 'pass')
  const passed = sorted.filter((r) => r.outcome === 'pass')
  const violations = results.filter(
    (r) => r.outcome === 'fail' && r.severity === 'violation',
  ).length
  const warnings = results.filter(
    (r) => r.outcome === 'fail' && r.severity === 'warning',
  ).length
  const inconclusive = results.filter(
    (r) => r.outcome === 'inconclusive',
  ).length

  let summary: { tone: Tone; text: string }
  if (violations > 0) {
    summary = {
      tone: 'error',
      text: `${violations} problem${violations === 1 ? '' : 's'} would get this challenged`,
    }
  } else if (checking) summary = { tone: 'muted', text: 'Checking…' }
  else if (warnings > 0)
    summary = {
      tone: 'warning',
      text: `${warnings} warning${warnings === 1 ? '' : 's'} to review`,
    }
  else if (inconclusive > 0)
    summary = {
      tone: 'muted',
      text: `${inconclusive} check${inconclusive === 1 ? '' : 's'} could not run`,
    }
  else if (open.some((r) => r.outcome === 'pending'))
    summary = { tone: 'muted', text: 'Waiting for input' }
  else summary = { tone: 'success', text: `All ${passed.length} checks passed` }

  return (
    <Panel aria-live="polite">
      <PanelHeader>
        <PanelTitle>Pre-submission checks</PanelTitle>
        <Summary $tone={summary.tone}>
          {checking && violations === 0 ? <Spinner /> : null}
          {summary.text}
        </Summary>
      </PanelHeader>
      <Explainer>
        These are the mechanical policy checks run on every new submission.
        Items that fail them get challenged and lose their deposit, so you can’t
        submit until the red ones are fixed. Passing them doesn’t guarantee
        acceptance: jurors still review the item against the full policy.
      </Explainer>
      {open.length > 0 ? (
        <List>
          {open.map((result) => (
            <CheckRow key={result.id} result={result} onApplyFix={onApplyFix} />
          ))}
        </List>
      ) : null}
      {inconclusive > 0 && onRetry ? (
        <TextButton type="button" onClick={onRetry}>
          Retry checks that could not run
        </TextButton>
      ) : null}
      {passed.length > 0 ? (
        <>
          <TextButton
            type="button"
            onClick={() => setShowPassed((v) => !v)}
            aria-expanded={showPassed}
          >
            {showPassed ? 'Hide' : 'Show'} {passed.length} passed check
            {passed.length === 1 ? '' : 's'}
          </TextButton>
          {showPassed ? (
            <List>
              {passed.map((result) => (
                <CheckRow key={result.id} result={result} />
              ))}
            </List>
          ) : null}
        </>
      ) : null}
    </Panel>
  )
}
