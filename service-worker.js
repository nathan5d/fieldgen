const CACHE_NAME = 'fieldgen-v2'; // Mude o nome para forçar a atualização
const CACHE_TIME = 5 * 24 * 60 * 60 * 1000; // 5 dias em milissegundos


const urlsToCache = [
    "/fieldgen/",
     '/fieldgen/index.html',
    '/fieldgen/offline.html',
    '/fieldgen/main.js',
    '/fieldgen/app.js',
    '/fieldgen/manifest.json',
    '/fieldgen/icons/icon-192.png',
    '/fieldgen/icons/icon-512.png',
    '/fieldgen/lib/codemirror/codemirror.css',
    '/fieldgen/lib/codemirror/theme/dracula.css',
    '/fieldgen/lib/codemirror/codemirror.js',
    '/fieldgen/lib/codemirror/mode/javascript/javascript.js',
    '/fieldgen/lib/lucide/lucide.min.js'
    // Adicione outros recursos que deseja cachear aqui
];


self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }

            return fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const cacheCopy = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, cacheCopy);
                            });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Aqui, você pode retornar um fallback do cache ou uma mensagem de erro
                    return caches.match('/fieldgen/oflline.html'); // Certifique-se de ter um arquivo fallback.html no cache
                });
        })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return (
                            cacheName.startsWith("fieldgen-") &&
                            cacheName !== CACHE_NAME
                        );
                    })
                    .map((cacheName) => {
                        return caches.delete(cacheName);
                    })
            );
        })
    );
});