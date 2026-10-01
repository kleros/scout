import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCalendar } from './calendar'

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
})
