/** Minimal iCalendar (RFC 5545) export for dispute deadlines. */

export interface CalendarEvent {
  uid: string
  title: string
  description: string
  url: string
  /** Unix milliseconds. */
  at: number
  /** Reminder offsets before `at`, in hours. */
  alarmsHoursBefore: number[]
}

const stamp = (ms: number) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/**
 * RFC 5545 TEXT: backslashes, commas and semicolons escaped, every line
 * break (CR, LF or CRLF) as \n, and other control characters dropped, so
 * text from an item's name can never start a property of its own.
 */
const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n?|\n/g, '\\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[,;]/g, (c) => `\\${c}`)

/** A URL property: no line breaks or control characters either. */
// eslint-disable-next-line no-control-regex
const cleanUrl = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, '')

const encoder = new TextEncoder()

/** Lines longer than 75 octets (UTF-8 bytes) are folded, never inside a character. */
const fold = (line: string) => {
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    // Continuation lines start with a space, so they hold one byte less.
    if (bytes + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export const buildCalendar = (events: CalendarEvent[]) =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kleros//Scout//EN',
    'CALSCALE:GREGORIAN',
    ...events.flatMap((event) => [
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(event.at)}`,
      `DTEND:${stamp(event.at + 15 * 60 * 1000)}`,
      fold(`SUMMARY:${escapeText(event.title)}`),
      fold(
        `DESCRIPTION:${escapeText(`${event.description}\n\n${cleanUrl(event.url)}`)}`,
      ),
      fold(`URL:${cleanUrl(event.url)}`),
      ...event.alarmsHoursBefore.flatMap((hours) => [
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        fold(`DESCRIPTION:${escapeText(event.title)}`),
        `TRIGGER:-PT${hours}H`,
        'END:VALARM',
      ]),
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
    '',
  ].join('\r\n')

/** What the appeal deadlines of a round need: its times (unix seconds) and ruling. */
export interface AppealRound {
  appealPeriodStart: string | number
  appealPeriodEnd: string | number
  ruling: string | number
}

/**
 * Calendar events, with alarms, for an open appeal round's deadlines. Light
 * Curate makes the losing side fund before the period's midpoint (rounded
 * down to the second, as the contract computes it) and the winning side by
 * its end; with no ruling, both by the end. Only deadlines still ahead.
 */
export const appealDeadlineEvents = ({
  itemID,
  name,
  url,
  round,
  removal,
  now = Date.now(),
}: {
  itemID: string
  name: string
  url: string
  round: AppealRound
  /** A removal request: its requester asked to remove the entry. */
  removal: boolean
  now?: number
}): CalendarEvent[] => {
  const start = Number(round.appealPeriodStart)
  const end = Number(round.appealPeriodEnd)
  const uid = `${itemID}-${round.appealPeriodStart}`
  const requester = removal ? 'removal requester' : 'submitter'
  const ruling = String(round.ruling)
  const loser =
    ruling === 'Reject' || ruling === '2'
      ? requester
      : ruling === 'Accept' || ruling === '1'
        ? 'challenger'
        : null
  const winner = loser === 'challenger' ? requester : 'challenger'
  const events: CalendarEvent[] = loser
    ? [
        {
          uid: `${uid}-loser@scout.kleros.io`,
          title: `Scout: last moment for the ${loser} side to fund an appeal (${name})`,
          description: `The side that lost the ruling (the ${loser}) must be fully funded before this time to appeal. Otherwise the ruling stands.`,
          url,
          at: (start + Math.floor((end - start) / 2)) * 1000,
          alarmsHoursBefore: [6, 1],
        },
        {
          uid: `${uid}-winner@scout.kleros.io`,
          title: `Scout: appeal deadline for the ${winner} side (${name})`,
          description: `If the ${loser} side funded its appeal, the side that won the ruling (the ${winner}) must be fully funded before this time or it loses the case.`,
          url,
          at: end * 1000,
          alarmsHoursBefore: [12, 3, 1],
        },
      ]
    : [
        {
          uid: `${uid}-both@scout.kleros.io`,
          title: `Scout: appeal deadline (${name})`,
          description:
            'Jurors did not reach a ruling. If only one side is fully funded at this time, that side wins.',
          url,
          at: end * 1000,
          alarmsHoursBefore: [6, 1],
        },
      ]
  return events.filter((event) => event.at > now)
}

export const downloadCalendar = (filename: string, events: CalendarEvent[]) => {
  const url = URL.createObjectURL(
    new Blob([buildCalendar(events)], { type: 'text/calendar;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
