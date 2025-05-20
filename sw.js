/**
 * @fileoverview Service Worker للتطبيق مع دعم PWA الأساسي
 * @module service-worker
 */

// --- إعدادات الكاش ---
const CACHE_NAME = 'muslim-quran-video-editor-v1.3';
const urlsToCache = [
  './', 
  './index.html',
  './index.html?launcher=true', 
  './css/style.css',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css ',
  'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Noto+Naskh+Arabic :wght@400;500;700&family=Tajawal:wght@400;500;700&display=swap'
];

// --- أحداث التثبيت ---
self.addEventListener('install', event => {
  console.log('[SW] تثبيت الخدمة بدأ');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] فتح كاش جديد');
        return Promise.all(
          urlsToCache.map(url => {
            return fetch(url).then(response => {
              if (!response.ok) throw new Error(`فشل في تحميل ${url}`);
              cache.put(url, response);
            }).catch(err => {
              console.warn(`[SW] لم يتم تخزين ${url} في الكاش`, err);
            });
          })
        );
      })
      .catch(err => {
        console.error('[SW] فشل في تهيئة الكاش:', err);
      })
  );
});

// --- تنظيف الكاش القديم ---
self.addEventListener('activate', event => {
  console.log('[SW] تفعيل الخدمة بدأ');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
                 .map(cacheName => {
                   console.log('[SW] حذف الكاش القديم:', cacheName);
                   return caches.delete(cacheName);
                 })
      );
    }).then(() => self.clients.claim())
  );
});

// --- استراتيجيات الكاش ---
function isExternalResource(url) {
  return url.startsWith('http') && !url.includes(self.location.origin);
}

self.addEventListener('fetch', event => {
  const request = event.request;

  // --- استبعاد طلبات POST ---
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // --- تحديث الكاش في الخلفية ---
        if (!isExternalResource(request.url)) {
          fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, networkResponse.clone());
              });
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      // --- جلب من الشبكة إذا لم يكن موجودًا في الكاش ---
      return fetch(request).then(networkResponse => {
        if (!networkResponse || !networkResponse.ok) return networkResponse;

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(error => {
        console.error('[SW] فشل في الطلب:', error);
        return getFallbackResponse(request);
      });
    })
  );
});

// --- استجابة افتراضية عند الفشل ---
function getFallbackResponse(request) {
  if (request.url.includes('/icon-')) {
    return caches.match('./icons/icon-192x192.png');
  } else if (request.url.includes('.css') || request.url.includes('.js')) {
    return new Response('', { headers: { 'Content-Type': 'text/plain' } });
  } else {
    return new Response('<html><body><h1>لا يوجد اتصال</h1></body></html>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// --- تحديث المشروع ---
self.addEventListener('message', event => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  } else if (event.data.type === 'UPDATE_PROJECT') {
    const { projectId, projectData } = event.data.payload;
    updateProjectInLocalStorage(projectId, projectData);
  } else if (event.data.type === 'SYNC_PROJECT') {
    const { projectId } = event.data.payload;
    scheduleProjectSync(projectId, 0);
  } else if (event.data.type === 'CLEAR_CACHE') {
    clearAppCache();
  }
});

// --- التحقق من التحديثات ---
async function checkForUpdates() {
  try {
    const response = await fetch('./manifest.json');
    const manifest = await response.json();
    
    if (manifest.version !== APP_VERSION) {
      console.log(`[SW] تم العثور على تحديث جديد: ${manifest.version}`);
      sendNotification('تحديث متوفر لمحرر القرآن');
    }
  } catch (error) {
    console.error('[SW] فشل في التحقق من التحديثات:', error);
  }
}

// --- دعم الإشعارات ---
function sendNotification(message) {
  const options = {
    body: message,
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'quran-editor-notification',
    renotify: true
  };
  
  self.registration.showNotification('محرر القرآن', options);
}

// --- دعم التزامن ---
self.addEventListener('sync', event => {
  if (!event.tag.startsWith('project-sync-')) return;

  const projectId = event.tag.replace('project-sync-', '');
  event.waitUntil(syncProject(projectId));
});

// --- التزامن ---
async function syncProject(projectId) {
  try {
    const project = await getProjectFromLocalStorage(projectId);
    const response = await fetch(`https://api.quran.editor/projects/ ${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    });

    if (response.ok) {
      console.log(`[SW] المشروع ${projectId} تم التزامنه بنجاح`);
      return new Response('project-sync-success');
    }

    console.warn(`[SW] إعادة جدولة مزامنة المشروع ${projectId}`);
    const retryCount = await getSyncRetryCount(projectId);

    if (retryCount >= 3) {
      console.error(`[SW] تجاوز عدد المحاولات لمشروع ${projectId}`);
      await notifyUserOfSyncFailure(projectId);
      return new Response('project-sync-failed - max retries reached');
    }

    await scheduleProjectSync(projectId, retryCount + 1);
  } catch (error) {
    console.error(`[SW] فشل في التزامن للمشروع ${projectId}:`, error);
    return new Response('project-sync-failed');
  }
}

// --- دعم الموارد ---
async function getProjectFromLocalStorage(projectId) {
  const projectsResponse = await caches.match(`./localStorage/savedProjects`);
  const projects = projectsResponse ? await projectsResponse.json() : [];
  return projects.find(p => p.id === projectId) || null;
}

async function updateProjectInLocalStorage(projectId, projectData) {
  const cache = await caches.open(CACHE_NAME);
  const projectsResponse = await cache.match(`./localStorage/savedProjects`);
  let projects = projectsResponse ? await projectsResponse.json() : [];

  projects = projects.filter(p => p.id !== projectId);
  if (projectData) {
    projects.push(projectData);
  }

  cache.put(`./localStorage/savedProjects`, new Response(JSON.stringify(projects)));
}

// --- دعم التحديثات ---
function scheduleProjectSync(projectId, retryCount) {
  console.log(`[SW] جارٍ إعادة جدولة مزامنة المشروع ${projectId}`);
  // يمكن استخدام Background Sync هنا لإعادة الجدولة
}

function getSyncRetryCount(projectId) {
  // الحصول على عدد محاولات التزامن من localStorage أو الكاش
  return 0;
}

function notifyUserOfSyncFailure(projectId) {
  // إرسال إشعار للمستخدم عن فشل التزامن
}

// --- تنظيف الكاش ---
function clearAppCache() {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
}
