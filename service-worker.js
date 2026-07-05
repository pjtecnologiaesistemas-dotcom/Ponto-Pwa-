// Service Worker — Ponto Eletrônico PJ Tecnologia
// Estratégia: network-first para o HTML (garante que você sempre pegue a versão nova
// quando publicar no GitHub Pages) + cache-first para ícones/estáticos (rápido e offline).
// IMPORTANTE: sempre que fizer deploy de uma mudança relevante, suba o número da versão abaixo.

const SW_VERSION = "v1.0.0";
const CACHE_NAME = `ponto-pj-${SW_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
];

// Instala e já pré-carrega o essencial
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // ativa a nova versão imediatamente, sem esperar todas as abas fecharem
});

// Ativa e limpa caches antigos (de versões anteriores do SW)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("ponto-pj-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // assume o controle das páginas abertas na hora
});

// Estratégia de busca
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isHTML = request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");

  if (isHTML) {
    // NETWORK-FIRST: tenta buscar a versão mais nova; se falhar (offline), usa o cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
  } else {
    // CACHE-FIRST: ícones, manifest e outros estáticos
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
  }
});

// Permite forçar atualização a partir da página (opcional, veja instruções)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

