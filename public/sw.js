// FlashBacon Service Worker — Web Push + notification click
const CACHE_NAME = 'flashbacon-sw-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'FlashBacon', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'FlashBacon — Ripasso'
  const options = {
    body: payload.body || 'È ora del tuo ripasso!',
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || 'ripasso',
    renotify: true,
    requireInteraction: true,
    data: {
      ripassoId: payload.ripassoId || null,
      url: payload.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const target = new URL((data.url || '/') + (data.ripassoId ? `?ripasso=${encodeURIComponent(data.ripassoId)}` : ''), self.location.origin).href

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if ('focus' in c) {
        try {
          await c.navigate(target)
        } catch {}
        return c.focus()
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target)
  })())
})
