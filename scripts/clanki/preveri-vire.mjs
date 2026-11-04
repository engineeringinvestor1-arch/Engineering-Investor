// Preverjanje po gradnji: na objavljeni strani ne sme ostati noben vir (avtor, 31. 10. 2026: viri so samo za
// urednika). Viri se odstranijo v src/plugins/remark-viri.mjs; ta preizkus ujame obliko, ki je vtičnik ne pozna,
// in izris, ki ga je Astro shranil iz predogleda (tam so viri vidni). Teče v `npm run build`, zato neuspeh
// ustavi tudi objavo na GitHub Pages.
//
// Na straneh člankov preveri:
// - zunanje povezave, ki jih ni na naslovni strani (tam so samo povezave ogrodja strani, na primer na X), razen
//   gumba za deljenje članka na X;
// - oznake virov v besedilu (Viri:, Vir:, Sources:, Številke:, Figures:);
// - oznako predogleda (razred ei-viri).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const MAPE = ['analize', 'en/analysis', 'osnutek'];
const OZNAKA = /(?:^|[\s>(.;])((?:Viri|Vir|Sources|Source|Številke|Figures)(?:\s+\p{L}+)?\s*:)/u;
const DELJENJE = /^https:\/\/x\.com\/intent\//;
// Shranjeni izrisi člankov: Astro jih ne izriše znova, dokler se članek ne spremeni, tudi če se je spremenil vtičnik.
const SHRAMBA = 'node_modules/.astro/data-store.json';

const povezave = (html) => new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]));
const besedilo = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|\s+/g, ' ');

export function najdbe(html, ogrodje) {
  const izid = [];
  if (/class="ei-viri"/.test(html)) izid.push('oznaka predogleda ei-viri (izris iz astro dev)');
  for (const url of povezave(html)) {
    if (url.startsWith('https://engineering-investor.com') || ogrodje.has(url) || DELJENJE.test(url)) continue;
    izid.push(`zunanja povezava ${url}`);
  }
  const m = besedilo(html).match(OZNAKA);
  if (m) izid.push(`oznaka vira "${m[1]}"`);
  return izid;
}

function main() {
  const naslovna = join(DIST, 'index.html');
  if (!existsSync(naslovna)) {
    console.error('Mape dist ni: najprej zaženi astro build.');
    process.exit(1);
  }
  const ogrodje = povezave(readFileSync(naslovna, 'utf8'));
  const napake = [];
  let strani = 0;
  for (const mapa of MAPE) {
    const pot = join(DIST, mapa);
    if (!existsSync(pot)) continue;
    for (const ime of readdirSync(pot)) {
      const datoteka = join(pot, ime, 'index.html');
      if (!existsSync(datoteka)) continue;
      strani++;
      for (const n of najdbe(readFileSync(datoteka, 'utf8'), ogrodje)) napake.push(`${mapa}/${ime}: ${n}`);
    }
  }
  if (napake.length) {
    console.error(`Na objavljeni strani so ostali viri (${napake.length}):`);
    for (const n of napake) console.error(`  ${n}`);
    console.error(`Viri so samo za urednika. Če se je vtičnik src/plugins/remark-viri.mjs spremenil, izbriši ${SHRAMBA}`);
    console.error('in zgradi znova; če ne, ga dopolni z novo obliko vira.');
    process.exit(1);
  }
  console.log(`Viri: na ${strani} straneh člankov ni nobenega vira.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
