const CACHE_NAME = 'relatorio-v1';
const ASSETS = [
    '/', // Cache da raiz
    '/index.html',
    '/app.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    // Arquivos do CodeMirror (ajuste os caminhos conforme sua estrutura de pastas)
    '/lib/codemirror/codemirror.css',
    '/lib/codemirror/codemirror.js',
    '/lib/codemirror/mode/javascript/javascript.js'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => {
            return res || fetch(e.request);
        })
    );
});