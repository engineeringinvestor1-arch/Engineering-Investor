// Delovanje aplikacije Sledilnik financ brez povezave (18. 10. 2026).
//
// Podatki so v brskalniku telefona in jih ta datoteka ne prenaša nikamor. Shrani samo stran aplikacije in
// njene datoteke, da se aplikacija odpre tudi brez interneta.
// - Stran: najprej omrežje, da se popravki pokažejo takoj; brez povezave shranjena kopija.
// - Datoteke /_astro/ imajo v imenu zgoščeno oznako in se ne spreminjajo: najprej shranjena kopija.
// Ob novi različici aplikacije se številka v CACHE poveča in stare kopije se izbrišejo.

const CACHE = 'sledilnik-2';
const OBMOCJE = '/aplikacija/';
const STALNE = [OBMOCJE, `${OBMOCJE}manifest.webmanifest`, `${OBMOCJE}ikona-192.png`, `${OBMOCJE}ikona-512.png`];

// Ob namestitvi shranimo stran in vse datoteke, ki jih stran naloži, da aplikacija deluje brez povezave
// že po prvem odprtju, ne šele po drugem.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shramba = await caches.open(CACHE);
    await shramba.addAll(STALNE);
    const html = await (await fetch(OBMOCJE, { cache: 'no-store' })).text();
    // Datoteke so v src, href ali v atributih otoka React (component-url, renderer-url).
    const datoteke = [...new Set([...html.matchAll(/["'(](\/_astro\/[^"')\s]+)/g)].map((m) => m[1]))];
    await shramba.addAll(datoteke);
    await self.skipWaiting();
  })());
});

// Stran po prvem odprtju sporoči vse datoteke /_astro/, ki jih je naložila, tudi tiste, ki jih React
// naloži sproti in jih v strani ni. Brez tega bi aplikacija brez povezave delovala šele po drugem odprtju.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'shrani' || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((u) => new URL(u, self.location.origin).pathname.startsWith('/_astro/'));
  event.waitUntil(caches.open(CACHE).then(async (shramba) => {
    for (const u of urls) if (!(await shramba.match(u))) await shramba.add(u).catch(() => {});
  }));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const ime of await caches.keys()) if (ime !== CACHE) await caches.delete(ime);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const zahteva = event.request;
  const url = new URL(zahteva.url);
  if (zahteva.method !== 'GET' || url.origin !== self.location.origin) return;

  if (zahteva.mode === 'navigate' && url.pathname.startsWith(OBMOCJE)) {
    event.respondWith((async () => {
      try {
        const odgovor = await fetch(zahteva);
        if (odgovor.ok) (await caches.open(CACHE)).put(OBMOCJE, odgovor.clone());
        return odgovor;
      } catch {
        return (await caches.match(OBMOCJE)) ?? Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/_astro/') || url.pathname.startsWith(OBMOCJE)) {
    event.respondWith((async () => {
      const shranjeno = await caches.match(zahteva);
      if (shranjeno) return shranjeno;
      const odgovor = await fetch(zahteva);
      if (odgovor.ok) (await caches.open(CACHE)).put(zahteva, odgovor.clone());
      return odgovor;
    })());
  }
});
