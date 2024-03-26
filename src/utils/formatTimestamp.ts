export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp * 1000)
  const year = date.getUTCFullYear()
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
  const day = date.getUTCDate().toString().padStart(2, '0')
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  const seconds = date.getUTCSeconds().toString().padStart(2, '0')

  return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} UTC`
}
