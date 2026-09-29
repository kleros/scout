import type { RegistryKey } from 'utils/items'

/**
 * Outcome of a single pre-submission check.
 *
 * - `pass`: the rule was evaluated and the value complies.
 * - `fail`: the rule was evaluated and the value breaks it.
 * - `inconclusive`: the rule could not be evaluated (network failure, rate
 *   limit, providers disagreeing). Never treated as a pass or a fail.
 * - `pending`: waiting for input or for a network answer.
 * - `skipped`: the rule does not apply to this draft (e.g. non-EVM chain for a
 *   bytecode rule). Not shown to the user.
 */
export type CheckOutcome =
  | 'pass'
  | 'fail'
  | 'inconclusive'
  | 'pending'
  | 'skipped'

/**
 * `violation`: a deterministic policy breach that gets the submission
 * challenged (and the deposit lost); blocks submission when it fails.
 * `warning`: surfaced but does not block (rules a human reviewer may apply,
 * or rules the automated checks can only flag for review).
 */
export type CheckSeverity = 'violation' | 'warning'

export interface CheckResult {
  /** Stable rule identifier, e.g. `tokens.decimals-onchain`. */
  id: string
  /** Column label the result refers to, when it is about a single field. */
  field?: string
  outcome: CheckOutcome
  severity: CheckSeverity
  /** What the rule checks, phrased as the passing condition. */
  title: string
  /** Explanation shown when the outcome is not `pass`. */
  message?: string
  /** Replacement value for `field` that resolves the problem, when mechanical. */
  fix?: string
  /** How to show `fix` when it differs from what the user types (e.g. the account part of a CAIP-10 value). */
  fixLabel?: string
}

/** The values a submission form is about to publish, keyed by column label. */
export interface SubmissionDraft {
  registry: RegistryKey
  values: Record<string, string>
  /** Images picked in the form (not uploaded yet), keyed by column label. */
  files?: Record<string, File | null | undefined>
}

export const isBlocking = (result: CheckResult) =>
  result.outcome === 'fail' && result.severity === 'violation'
