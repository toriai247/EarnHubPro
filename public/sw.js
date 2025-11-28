
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  // Placeholder for future Web Push integration
  // Currently, notifications are triggered via client-side Supabase Realtime
  // triggering 'showNotification' from the main thread.
});
