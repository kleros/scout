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

const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, (c) => `\\${c}`)

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
      fold(`DESCRIPTION:${escapeText(`${event.description}\n\n${event.url}`)}`),
      fold(`URL:${event.url}`),
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
