import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ─── Push: recebe notificação do servidor ────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, url, tag, icon, badge } = event.data.json()

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:    icon  || '/pwa-192.png',
      badge:   badge || '/pwa-192.png',
      tag:     tag   || 'helena',
      vibrate: [100, 50, 100],
      data:    { url: url || '/' },
    })
  )
})

// ─── Clique na notificação: abre/foca o app ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      if (windowClients.length > 0) {
        const client = windowClients[0]
        // navigate() garante que a URL correta é carregada antes de focar
        if ('navigate' in client) {
          await client.navigate(targetUrl)
        } else {
          client.postMessage({ type: 'NAVIGATE', url: targetUrl })
        }
        return client.focus()
      }
      // App fechado — abre na URL correta
      return clients.openWindow(targetUrl)
    })
  )
})
