const CACHE_NAME = 'relatorio-v1';
const ASSETS = [
    'index.html',
    'app.js',
    'manifest.json', // Adicione o manifesto aqui
    'icons/icon-192.png', // Adicione seus ícones aqui
    'icons/icon-512.png'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => res || fetch(e.request))
    );
});