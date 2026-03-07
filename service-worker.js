const CACHE_NAME = 'relatorio-v2'; // Mude o nome para forçar a atualização
const FALLBACK_URL = './offline.html';

const ASSETS = [
    './',
    './index.html',
    './offline.html',
    './main.js',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './lib/codemirror/codemirror.css',
    './lib/codemirror/theme/dracula.css',
    './lib/codemirror/codemirror.js',
    './lib/codemirror/mode/javascript/javascript.js',
    './lib/lucide/lucide.min.js'
];

// Instalação: Adiciona tudo ao cache
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const url of ASSETS) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.error('Falha ao cachear:', url, err);
                }
            }
        })
    );
});

// Fetch: Lógica inteligente
self.addEventListener('fetch', e => {
    // Apenas navegação e métodos GET
    if (e.request.mode !== 'navigate' || e.request.method !== 'GET') return;

    e.respondWith(
        fetch(e.request).catch(() => {
            // Se a rede falhar, busca o fallback no cache
            return caches.match(FALLBACK_URL);
        })
    );
});