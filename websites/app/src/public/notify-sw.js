/* Kleros Scout notifications: shows push messages and opens the item on click. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
)

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kleros Scout', {
      body: data.body || '',
      tag: data.tag,
      data: { url: data.url || '/' },
      // Urgent items (e.g. an appeal you must fund) stay until dismissed.
      requireInteraction: data.urgency === 'urgent',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const requested = new URL(
    event.notification.data?.url || '/',
    self.location.origin,
  )
  // Only ever open pages of this site.
  const target =
    requested.origin === self.location.origin
      ? requested.href
      : new URL(requested.pathname + requested.search, self.location.origin)
          .href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const existing = windows.find((client) =>
        client.url.startsWith(self.location.origin),
      )
      if (existing) {
        await existing.navigate(target)
        return existing.focus()
      }
      return self.clients.openWindow(target)
    })(),
  )
})
