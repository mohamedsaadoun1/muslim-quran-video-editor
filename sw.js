// sw.js

const CACHE_NAME = 'muslim-quran-video-editor-v1.2'; // غيّر هذا عند تحديث الأصول الرئيسية
const urlsToCache = [
  './', // index.html
  './index.html',
  './index.html?launcher=true', // للتأكد من التوافق مع start_url
  './css/style.css',
  './manifest.json',
  // أضف هنا الأيقونات الرئيسية التي تريد تخزينها دائمًا
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  // يمكنك إضافة ملفات JS الرئيسية إذا أردت ضمان عمل الواجهة الأساسية offline
  // ولكن كن حذرًا، تحديثها يتطلب تحديث SW.
  // './js/main.js', // مثال، قد لا يكون ضروريًا دائمًا
  // './js/core/state-store.js', // مثال

  // Font Awesome (من CDN، قد يفشل إذا لم يكن هناك اتصال ولكن على الأقل لن يعطل التطبيق)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  // Google Fonts (مثل Font Awesome)
  'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Noto+Naskh+Arabic:wght@400;500;700&family=Tajawal:wght@400;500;700&display=swap',
  'https://fonts.gstatic.com/s/amiriquran/v7/GFxXPickerDialogEngV-9fAV7fi23pM0ht3_C8.woff2', // مثال على ملف خط قد يُطلب
  'https://fonts.gstatic.com/s/notonaskharabic/v24/oPWQ_RNIjJkUspF2RzN4YNNjT4g4bxD3qj4N1pasGxc.woff2' // مثال آخر
];

// Install event: open cache and add core assets
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        // Use { cache: 'reload' } to ensure fresh resources during install for critical assets
        const cachePromises = urlsToCache.map(urlToCache => {
          const request = new Request(urlToCache, { cache: 'reload' });
          return fetch(request).then(response => {
            if (!response.ok && response.type !== 'opaque') { // Opaque for CDN resources
              console.warn(`[SW] Failed to fetch ${urlToCache} during install. Status: ${response.status}`);
              // Don't fail the entire cache operation if one CDN resource fails initially
              return Promise.resolve();
            }
            // For opaque responses (like CDN fonts without CORS), we can't check status
            // but we can still cache them.
            return cache.put(urlToCache, response);
          }).catch(err => {
            console.error(`[SW] Error fetching and caching ${urlToCache}:`, err);
          });
        });
        return Promise.all(cachePromises);
      })
      .catch(error => {
        console.error('[SW] Failed to open cache during install:', error);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[SW] Clients claimed.');
        return self.clients.claim(); // Ensure new SW takes control immediately
    })
  );
});

// Fetch event: serve assets from cache if available, otherwise fetch from network (Network First for most resources)
// For the app shell (core assets), a Cache First strategy might be better after initial caching.
self.addEventListener('fetch', event => {
  // For navigation requests (HTML), try network first, then cache.
  // This ensures users get the latest HTML if online.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If successful, cache a clone of the response for future offline use
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || caches.match('./index.html'); // Fallback to index.html
          });
        })
    );
    return;
  }

  // For other requests (CSS, JS, images, fonts), use a cache-first strategy or stale-while-revalidate
  // Here's a common cache-first:
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[SW] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
                 // If the request is for a resource we generally cache (e.g., from our domain or common CDNs)
                if (urlsToCache.some(urlPattern => event.request.url.startsWith(urlPattern.split('/').slice(0,3).join('/')) ) ||
                    event.request.url.startsWith(self.location.origin)) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
            }
            return networkResponse;
        }).catch(error => {
            console.warn('[SW] Fetch failed; returning offline page if available or error:', error);
            // You could return a generic offline fallback image/resource here
        });
      })
  );
});
