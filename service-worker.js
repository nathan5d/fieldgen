const VERSION = 'v1.0.8'; // <--- Mude aqui e o PWA detecta a mudança
const CACHE_NAME = `fieldgen-${VERSION}`;
const urlsToCache = [
    "/fieldgen/",
    "/fieldgen/index.html",
    "/fieldgen/offline.html",
    "/fieldgen/main.js",
    "/fieldgen/app.js",
    "/fieldgen/manifest.json",
    "/fieldgen/style.css",
    "/fieldgen/icons/icon-192.png",
    "/fieldgen/icons/icon-512.png",
    "/fieldgen/lib/codemirror/codemirror.css",
    "/fieldgen/lib/codemirror/theme/dracula.css",
    "/fieldgen/lib/codemirror/codemirror.js",
    "/fieldgen/lib/codemirror/mode/javascript/javascript.js",
    "/fieldgen/lib/lucide/lucide.min.js"
];

// Instalação: Cacheia arquivos críticos
self.addEventListener("install", (event) => {
    self.skipWaiting(); // Força a ativação imediata
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

// Ativação: Limpa caches antigos
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Se o nome do cache mudou, tchau cache antigo!
                    if (cacheName !== CACHE_NAME) {
                        console.log("Limpando cache antigo:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Estratégia Stale-While-Revalidate: Serve do cache, mas atualiza por trás
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((response) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => caches.match('/fieldgen/offline.html'));

                return response || fetchPromise;
            });
        })
    );
});


// Responder ao pedido de versão do HTML
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: VERSION });
    }
});