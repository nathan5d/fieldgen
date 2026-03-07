const CACHE_NAME = 'relatorio-v1';
const ASSETS = [
    '/', // Cache da raiz
    '/index.html',
    './offline.html',
    '/main.js',
    '/app.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    // Arquivos do CodeMirror (ajuste os caminhos conforme sua estrutura de pastas)
    '/lib/codemirror/codemirror.css',
    '/lib/codemirror/theme/dracula.css',
    '/lib/codemirror/codemirror.js',
    '/lib/codemirror/mode/javascript/javascript.js',
    '/lib/lucide/lucide.min.js'
];

// Instalação: Adiciona tudo ao cache
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

// Fetch: Lógica inteligente
self.addEventListener('fetch', e => {
    if (e.request.mode !== 'navigate') return; // Apenas navegação

    e.respondWith(
        fetch(e.request).catch(() => {
            // Se a rede falhar, retorna o fallback do cache
            return caches.match(FALLBACK_URL);
        })
    );
});