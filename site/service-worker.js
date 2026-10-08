const CACHE_NAME = 'royal-image-pages-v11';
const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './pwa.js',
    './supabase-config.js',
    './manifest.webmanifest',
    './offline.html',
    './icons/app-icon.svg',
    './icons/app-icon-192.png',
    './icons/app-icon-512.png',
    './pic/pc1.jpg',
    './pic/pc2.jpg',
    './pic/pc3.jpg',
    './pic/pc4.jpg',
    './pic/pc5.jpg',
    './pic/pc6.jpg',
    './pic/pc7.jpg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key.startsWith('royal-image-pages-') && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('./offline.html'))
        );
        return;
    }

    if (APP_SHELL.some(path => new URL(path, self.registration.scope).href === url.href)) {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, response.clone());
                }
                return response;
            } catch (error) {
                const cached = await caches.match(request);
                if (cached) return cached;
                throw error;
            }
        })());
    }
});
