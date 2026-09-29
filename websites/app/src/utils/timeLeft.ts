/**
 * Time left until `deadline` (unix seconds), rounded down like the alerts so
 * it never promises more time than there is: "45 min", "43 h", "3 days".
 */
export const timeLeft = (deadline: number, now = Date.now() / 1000) => {
  const hours = (deadline - now) / 3600
  if (hours <= 0) return null
  if (hours < 1) return `${Math.max(1, Math.floor(hours * 60))} min`
  if (hours < 48) return `${Math.floor(hours)} h`
  return `${Math.floor(hours / 24)} days`
}

/** Local date and time with the time zone, e.g. "Sep 27, 02:43 PM EDT". */
export const localDeadline = (deadline: number) =>
  new Date(deadline * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
