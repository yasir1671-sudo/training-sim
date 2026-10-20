/* عامل الخدمة: يجعل المحاكي تطبيقاً قابلاً للتثبيت ويعمل دون إنترنت (بالتخزين المحلي).
   index.html وfirebase-config.js من الشبكة أولاً (لتصل التحديثات فوراً)، ومن النسخة المحفوظة عند انقطاع الإنترنت.
   الخطوط ومكتبة Firebase تُحفظ عند أول تحميل. رقم النسخة يضعه build.py. */
const VERSION = 'sim-bd0492123e';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // قاعدة البيانات نفسها لا تُحفظ هنا (Firebase يتولاها)
  if (/firebaseio\.com|firebasedatabase\.app|googleapis\.com\/identitytoolkit|securetoken/.test(url.href)) return;
  const sameOrigin = url.origin === location.origin;
  const page = sameOrigin && (req.mode === 'navigate' || /\/(index\.html|firebase-config\.js)?$/.test(url.pathname) || url.pathname.endsWith('firebase-config.js'));
  if (page) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // الباقي: من المحفوظ أولاً، ويُحدَّث في الخلفية
  if (sameOrigin || /fonts\.(googleapis|gstatic)\.com|www\.gstatic\.com\/firebasejs/.test(url.href)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
