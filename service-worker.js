const CACHE_NAME = 'relatorio-v1';
const ASSETS = [
    '/', // Cache da raiz
    '/index.html',
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

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS).catch(err => {
                console.error('Falha no cache.addAll:', err);
                // O console mostrará exatamente qual arquivo falhou
            });
        })
    );
});

self.addEventListener('fetch', e => {
    // Apenas responde a requisições GET
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            // Se encontrar no cache, retorna ele
            if (cachedResponse) {
                return cachedResponse;
            }

            // Se não, tenta buscar na rede
            return fetch(e.request).catch(() => {
                // Se a rede falhar (offline), retorna algo vazio ou um fallback
                // Importante: Não tente buscar recursos dinâmicos se não houver rede
                return new Response('Conteúdo indisponível offline', {
                    status: 404,
                    statusText: 'Not Found'
                });
            });
        })
    );
});