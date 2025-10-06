// Service Worker for Tabsy Customer PWA
// This is a basic service worker that will be enhanced with Workbox

// IMPORTANT: Increment version to force cache update on all devices
const CACHE_NAME = 'tabsy-customer-v2'
const urlsToCache = [
  '/',
  '/manifest.json'
]

// Install event - force immediate activation
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache:', CACHE_NAME)
        return cache.addAll(urlsToCache)
      })
  )
})

// Fetch event - Network First strategy for CSS/JS to always get latest
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Network-first for CSS and JS files to ensure fresh styles
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      url.pathname.includes('/_next/') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh response
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request)
        })
    )
    return
  }

  // Cache-first for everything else (images, fonts, etc.)
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response
        }
        return fetch(request).then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
      })
  )
})

// Activate event - claim clients immediately and delete old caches
self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(
    Promise.all([
      // Delete all old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Claim all clients immediately (take control of open pages)
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service worker activated and claimed clients')
    })
  )
})

// Handle skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
