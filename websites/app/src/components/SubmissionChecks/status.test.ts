import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { CheckResult } from '../../utils/checks'
import { statusLabel, summarize } from './status'

const result = (
  outcome: CheckResult['outcome'],
  severity: CheckResult['severity'] = 'violation',
): CheckResult => ({
  id: `${outcome}-${severity}`,
  outcome,
  severity,
  title: 'x',
})

describe('checks panel wording', () => {
  it("states problems in terms of the registry's policy", () => {
    assert.deepEqual(summarize([result('fail'), result('pass')], false), {
      tone: 'error',
      text: "1 problem breaks the registry's policy and is very likely to be challenged",
    })
    assert.equal(
      summarize([result('fail'), { ...result('fail'), id: 'other' }], true)
        .text,
      "2 problems break the registry's policy and are very likely to be challenged",
    )
    assert.equal(
      summarize([result('fail', 'warning')], false).text,
      '1 warning to review',
    )
    assert.equal(
      summarize([result('inconclusive')], false).text,
      '1 check could not run',
    )
    assert.equal(summarize([result('pass')], true).text, 'Checking…')
    assert.equal(summarize([result('pass')], false).text, 'All 1 checks passed')
  })

  it('spells out what each icon means for screen readers', () => {
    assert.equal(statusLabel(result('fail')), 'Failed: ')
    assert.equal(statusLabel(result('fail', 'warning')), 'Warning: ')
    assert.equal(statusLabel(result('pass')), 'Passed: ')
    assert.equal(statusLabel(result('inconclusive')), 'Not verified: ')
    assert.equal(statusLabel(result('pending')), 'Pending: ')
  })
})
