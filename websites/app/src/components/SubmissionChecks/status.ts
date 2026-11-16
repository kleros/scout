import type { CheckResult } from 'utils/checks'

export type Tone = 'error' | 'warning' | 'muted' | 'success'

export const toneOf = (result: CheckResult): Tone => {
  if (result.outcome === 'pass') return 'success'
  if (result.outcome === 'fail')
    return result.severity === 'violation' ? 'error' : 'warning'
  return 'muted'
}

/** What a result's icon or colour says, spelled out for screen readers. */
export const statusLabel = (result: CheckResult): string => {
  if (result.outcome === 'pass') return 'Passed: '
  if (result.outcome === 'fail')
    return result.severity === 'violation' ? 'Failed: ' : 'Warning: '
  if (result.outcome === 'inconclusive') return 'Not verified: '
  return 'Pending: '
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`

/** The panel's one-line summary, the only part announced as it changes. */
export const summarize = (
  results: CheckResult[],
  checking: boolean,
): { tone: Tone; text: string } => {
  const count = (outcome: CheckResult['outcome'], severity?: string) =>
    results.filter(
      (r) => r.outcome === outcome && (!severity || r.severity === severity),
    ).length
  const violations = count('fail', 'violation')
  const warnings = count('fail', 'warning')
  const inconclusive = count('inconclusive')
  if (violations > 0)
    return {
      tone: 'error',
      text:
        violations === 1
          ? "1 problem breaks the registry's policy and is very likely to be challenged"
          : `${violations} problems break the registry's policy and are very likely to be challenged`,
    }
  if (checking) return { tone: 'muted', text: 'Checking…' }
  if (warnings > 0)
    return { tone: 'warning', text: `${plural(warnings, 'warning')} to review` }
  if (inconclusive > 0)
    return {
      tone: 'muted',
      text: `${plural(inconclusive, 'check')} could not run`,
    }
  if (results.some((r) => r.outcome === 'pending'))
    return { tone: 'muted', text: 'Waiting for input' }
  return {
    tone: 'success',
    text: `All ${count('pass')} checks passed`,
  }
}
