// Preverjanje po gradnji: osnutki analiz (/osnutek/...) so skriti. Avtor 4. 11. 2026: "objaviš na spletni strani ampak pod
// takšnim linkom da ga bom lahko vedel le jaz ... ko bo dokončana jo objavim na pravo spletno stran in jo izbrišem iz tega linka".
// Teče v `npm run build`, zato neuspeh ustavi tudi objavo na GitHub Pages.
//
// Preveri:
// - vsaka stran osnutka ima <meta name="robots" content="noindex, nofollow">;
// - naslov osnutka ima naključni del z vsaj 16 znaki (osnutek se ne da uganiti);
// - noben zemljevid strani, vir RSS ali druga stran ne vsebuje povezave na /osnutek/.
//
// Opozorilo: repozitorij strani je javen, zato je besedilo osnutka vidno na GitHubu. Avtor je to vedel in izbral (4. 11. 2026).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const MAPA = 'osnutek';

export function najdbeOsnutka(ime, html) {
  const izid = [];
  if (!/<meta name="robots" content="noindex, nofollow"/.test(html)) izid.push('manjka noindex');
  const skrivnost = ime.split('-').at(-1);
  if (!/^[a-z0-9]{16,}$/.test(skrivnost)) izid.push(`naključni del naslova "${skrivnost}" je prekratek`);
  return izid;
}

export function omenjaOsnutek(vsebina) {
  return /\/osnutek\//.test(vsebina);
}

function vseDatoteke(mapa) {
  const izid = [];
  for (const ime of readdirSync(mapa)) {
    const pot = join(mapa, ime);
    if (statSync(pot).isDirectory()) izid.push(...vseDatoteke(pot));
    else izid.push(pot);
  }
  return izid;
}

function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('Mape dist ni: najprej zaženi astro build.');
    process.exit(1);
  }
  const napake = [];
  const osnutki = join(DIST, MAPA);
  let n = 0;
  if (existsSync(osnutki)) {
    for (const ime of readdirSync(osnutki)) {
      const datoteka = join(osnutki, ime, 'index.html');
      if (!existsSync(datoteka)) continue;
      n++;
      for (const x of najdbeOsnutka(ime, readFileSync(datoteka, 'utf8'))) napake.push(`${MAPA}/${ime}: ${x}`);
    }
  }
  for (const pot of vseDatoteke(DIST)) {
    const rel = relative(DIST, pot).replace(/\\/g, '/');
    if (rel.startsWith(`${MAPA}/`) || !/\.(html|xml)$/.test(rel)) continue;
    if (omenjaOsnutek(readFileSync(pot, 'utf8'))) napake.push(`${rel}: vsebuje povezavo na /${MAPA}/`);
  }
  if (napake.length) {
    console.error(`Osnutki niso skriti (${napake.length}):\n  ${napake.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Osnutki: ${n} skritih, nobena druga stran nanje ne kaže.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
