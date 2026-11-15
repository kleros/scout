import React from 'react'
import { useTimeLeft } from 'hooks/countdown'
import { formatTimestamp } from 'utils/formatTimestamp'

interface DeadlineProps {
  /** The deadline, in unix seconds. */
  at: number
  /**
   * "in": "1d 7h (Nov 17, 2026, 02:39 UTC)", after "ends in".
   * "until": "Nov 17, 2026, 02:39 UTC (1d 7h left)", after "until".
   * "left": "1d 7h left", the date only on hover (for compact places).
   */
  variant?: 'in' | 'until' | 'left'
  className?: string
}

/**
 * A deadline read both ways: the time left (updated every second, floored so it never looks later
 * than it is) and the absolute date, which is also in the hover title.
 */
const Deadline: React.FC<DeadlineProps> = ({ at, variant = 'in', className }) => {
  const left = useTimeLeft(at)
  const absolute = formatTimestamp(at, true)
  const passed = left === 'Ended' || left === null

  let text: string
  if (variant === 'until') text = passed ? `${absolute} (passed)` : `${absolute} (${left} left)`
  else if (variant === 'left') text = passed ? 'Time is up' : `${left} left`
  else text = passed ? `${absolute} (passed)` : `${left} (${absolute})`

  return (
    <time dateTime={new Date(at * 1000).toISOString()} title={absolute} className={className}>
      {text}
    </time>
  )
}

export default Deadline
