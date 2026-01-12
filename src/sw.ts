
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Force immediate activation
self.skipWaiting()
clientsClaim()

// Listen for messages to skip waiting
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting()
    }
})

self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received:', event)

    const data = event.data ? event.data.json() : {}
    console.log('[Service Worker] Push data:', data)

    const title = data.title || 'FM Logistics'
    const options = {
        body: data.body || 'New Notification',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: data.url || '/',
        vibrate: [100, 50, 100],
        requireInteraction: false,
        tag: 'fm-logistics-notification',
        renotify: true
    }

    console.log('[Service Worker] Showing notification:', title, options)
    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => console.log('[Service Worker] Notification shown successfully'))
            .catch(err => console.error('[Service Worker] Notification failed:', err))
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        self.clients.openWindow(event.notification.data)
    )
})
