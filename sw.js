// Guarda a página no celular para abrir mesmo sem internet durante a viagem.
// Os dados (checklist, hotéis, agenda) ficam no cache do Firestore, não aqui.
// Ao publicar mudanças importantes, aumente o número da versão abaixo.
const VERSION = "europa-a-dois-v2";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "js/sync.js",
  "js/extras.js",
  "js/firebase-config.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Banco e login: sempre direto na rede (o Firestore cuida do próprio cache).
  if (url.hostname.endsWith("googleapis.com") && !url.hostname.startsWith("fonts.")) return;
  if (url.hostname.endsWith("firebaseapp.com") || url.hostname.endsWith("google.com")) return;

  // Página: tenta a rede primeiro para pegar a versão nova; sem internet, usa a cópia guardada.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("index.html", copy)); return res; })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  // Arquivos da página, bibliotecas do Firebase e fontes: usa a cópia e atualiza em segundo plano.
  const cacheable = url.origin === self.location.origin
    || url.hostname === "www.gstatic.com"
    || url.hostname === "cdnjs.cloudflare.com"
    || url.hostname === "upload.wikimedia.org"
    || url.hostname === "fonts.googleapis.com"
    || url.hostname === "fonts.gstatic.com";
  if (!cacheable) return;

  event.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      })
    )
  );
});
