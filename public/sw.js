// The app's only service worker. No HTML caching: keeps static-export updates safe.
self.addEventListener('install', (event) => { event.waitUntil(self.skipWaiting()) })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() }
  catch { payload = { notification: { title: 'Ayet Rehberi', body: event.data.text() } } }
  const n = payload.notification || {}
  const type = String(payload.data?.kind || 'reminder').slice(0, 30)
  event.waitUntil(self.registration.showNotification(n.title || 'Ayet Rehberi', {
    body: n.body || '',
    icon: '/icons/ayet-192.png',
    badge: '/icons/ayet-192.png',
    tag: 'ayet-rehberi-' + type,
    data: { link: payload.data?.link || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = String(event.notification.data?.link || '/')
  let target
  try {
    target = new URL(raw, self.location.origin)
    if (target.origin !== self.location.origin) target = new URL('/', self.location.origin)
  } catch { target = new URL('/', self.location.origin) }
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find(client => client.url.startsWith(self.location.origin))
    if (existing) {
      await existing.navigate(target.href)
      return existing.focus()
    }
    return self.clients.openWindow(target.href)
  }))
})
