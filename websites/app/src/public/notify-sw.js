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

// Only ever pages of this site. Links are built from the site's canonical
// URL, which may be another of its hosts, so their path is kept on this
// origin. Anything else (a path starting with //, which would lead to
// another site, or a javascript: or data: URL) opens the home page.
const pageFor = (url) => {
  try {
    const { pathname, search, hash } = new URL(url || '/', self.location.origin)
    if (pathname.startsWith('/') && !pathname.startsWith('//'))
      return `${self.location.origin}${pathname}${search}${hash}`
  } catch {
    // Not a URL.
  }
  return `${self.location.origin}/`
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = pageFor(event.notification.data?.url)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      // A tab already on that page comes forward; otherwise a new one opens.
      // Navigating some other tab could throw away what is being typed there.
      const existing = windows.find((client) => client.url === target)
      if (existing) return existing.focus()
      return self.clients.openWindow(target)
    })(),
  )
})
