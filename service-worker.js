const CACHE_NAME = 'relatorio-v1';
const ASSETS = ['./', './index.html', './app.js', './style.css']; // Adicione seus arquivos aqui

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});