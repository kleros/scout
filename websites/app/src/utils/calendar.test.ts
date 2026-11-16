import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { appealDeadlineEvents, buildCalendar } from './calendar'

describe('calendar export', () => {
  it('builds a valid VEVENT with alarms, escaping and folding', () => {
    const ics = buildCalendar([
      {
        uid: 'x@scout.kleros.io',
        title:
          'Scout: appeal deadline for the challenger side (Router; v2, “quoted”)',
        description: 'Line one\nLine two',
        url: 'https://scout-app.kleros.io/single-tags/0xabc',
        at: Date.UTC(2026, 8, 28, 9, 15),
        alarmsHoursBefore: [12, 1],
      },
    ])
    const lines = ics.split('\r\n')
    const unfolded = ics.replace(/\r\n /g, '')
    assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0'))
    assert.ok(lines.includes('DTSTART:20260928T091500Z'))
    assert.deepEqual(
      lines.filter((l) => l.startsWith('TRIGGER')),
      ['TRIGGER:-PT12H', 'TRIGGER:-PT1H'],
    )
    assert.ok(unfolded.includes('Router\\; v2\\, “quoted”'))
    assert.ok(unfolded.includes('Line one\\nLine two'))
    assert.ok(
      lines.every((line) => new TextEncoder().encode(line).length <= 75),
    )
  })

  it('keeps text from an item name inside its property', () => {
    const ics = buildCalendar([
      {
        uid: 'x@scout.kleros.io',
        title: 'Router\rDTSTART:19700101T000000Z\r\nATTACH:https://evil.example\u0007',
        description: 'One\rTwo',
        url: 'https://scout-app.kleros.io/x\r\nATTACH:y',
        at: Date.UTC(2026, 8, 28, 9, 15),
        alarmsHoursBefore: [1],
      },
    ])
    const lines = ics.replace(/\r\n /g, '').split('\r\n')
    assert.ok(!ics.replace(/\r\n/g, '').includes('\r'))
    assert.ok(!lines.some((l) => /^(DTSTART:1970|ATTACH)/.test(l)))
    assert.ok(lines.includes('SUMMARY:Router\\nDTSTART:19700101T000000Z\\nATTACH:https://evil.example'))
    assert.ok(lines.some((l) => l.startsWith('DESCRIPTION:One\\nTwo')))
    assert.ok(lines.includes('URL:https://scout-app.kleros.io/xATTACH:y'))
  })
})

describe('appeal deadlines in the calendar', () => {
  const START = 1_800_000_000
  // An odd length: the contract's midpoint rounds down to the second.
  const round = (ruling: string) => ({
    appealPeriodStart: String(START),
    appealPeriodEnd: String(START + 194_401),
    ruling,
  })
  const events = (ruling: string, removal = false, now = 0) =>
    appealDeadlineEvents({
      itemID: '0xab',
      name: 'Router',
      url: 'https://scout.test/single-tags/0xab',
      round: round(ruling),
      removal,
      now,
    })

  it('puts the losing side first, at the floored midpoint, then the winner at the end', () => {
    const [loser, winner] = events('Reject')
    assert.equal(loser.at, (START + 97_200) * 1000)
    assert.equal(winner.at, (START + 194_401) * 1000)
    assert.match(loser.title, /the submitter side/)
    assert.match(winner.title, /for the challenger side/)
  })

  it('calls the requester of a removal the removal requester', () => {
    const [loser, winner] = events('Reject', true)
    assert.match(loser.title, /the removal requester side/)
    assert.match(winner.title, /for the challenger side/)
    const [, defend] = events('Accept', true)
    assert.match(defend.title, /for the removal requester side/)
    assert.doesNotMatch(
      events('Accept', true).map((e) => `${e.title} ${e.description}`).join(),
      /submitter/,
    )
  })

  it('has one deadline without a ruling, and leaves out the past ones', () => {
    assert.deepEqual(
      events('None').map((e) => e.at),
      [(START + 194_401) * 1000],
    )
    assert.deepEqual(
      events('Reject', false, (START + 100_000) * 1000).map((e) => e.uid),
      [`0xab-${START}-winner@scout.kleros.io`],
    )
  })
})
