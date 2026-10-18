// Ikone aplikacije Sledilnik financ (PNG za namestitev na Android). Brez zunanjih knjižnic: slika se nariše
// v pomnilnik in zapiše z zlib, ki ga ima Node. Zagon: node scripts/aplikacija/ikone.mjs
//
// Oblika: tri naraščajoči stolpci v barvi strani na modri podlagi. Navadna ikona ima zaobljene vogale,
// "maskable" sega do roba, risba pa je v osrednjem krogu, ker Android ikono obreže v svojo obliko.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '../..');
const MAPA = join(KOREN, 'public/aplikacija');
const MODRA = [37, 99, 235]; // --color-accent
const SVETLA = [244, 242, 236]; // --color-bg
const VZOREC = 4; // glajenje robov: vsak piksel je povprečje 4 x 4 vzorcev

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const kos = (tip, podatki) => {
  const dolzina = Buffer.alloc(4);
  dolzina.writeUInt32BE(podatki.length);
  const tipInPodatki = Buffer.concat([Buffer.from(tip, 'ascii'), podatki]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tipInPodatki));
  return Buffer.concat([dolzina, tipInPodatki, crc]);
};

function png(velikost, piksel) {
  const vrstice = Buffer.alloc(velikost * (velikost * 4 + 1));
  for (let y = 0; y < velikost; y++) {
    vrstice[y * (velikost * 4 + 1)] = 0; // brez filtra
    for (let x = 0; x < velikost; x++) {
      const [r, g, b, a] = piksel(x, y);
      const i = y * (velikost * 4 + 1) + 1 + x * 4;
      vrstice[i] = r; vrstice[i + 1] = g; vrstice[i + 2] = b; vrstice[i + 3] = a;
    }
  }
  const glava = Buffer.alloc(13);
  glava.writeUInt32BE(velikost, 0);
  glava.writeUInt32BE(velikost, 4);
  glava[8] = 8; glava[9] = 6; glava[10] = 0; glava[11] = 0; glava[12] = 0; // 8 bitov, RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), kos('IHDR', glava), kos('IDAT', deflateSync(vrstice, { level: 9 })), kos('IEND', Buffer.alloc(0))]);
}

// Lik v enotah 0..1. Vrne barvo [r, g, b, a] ali null (prozorno).
function risba({ maskable }) {
  const polmer = maskable ? 0 : 0.22;
  // Risba v osrednjem delu: pri maskable v krogu s polmerom 0,4 (varno območje), sicer nekoliko večja.
  const m = maskable ? 0.62 : 0.74;
  const zamik = (1 - m) / 2;
  const stolpci = [[0.08, 0.5], [0.38, 0.72], [0.68, 0.95]].map(([x, visina]) => ({ x0: zamik + x * m, x1: zamik + (x + 0.24) * m, y0: zamik + (1 - visina) * m, y1: zamik + m }));
  return (u, v) => {
    if (!maskable) {
      // Zaobljen kvadrat: zunaj vogalnih krogov je prozorno.
      const cx = Math.min(Math.max(u, polmer), 1 - polmer);
      const cy = Math.min(Math.max(v, polmer), 1 - polmer);
      if ((u - cx) ** 2 + (v - cy) ** 2 > polmer ** 2) return null;
    }
    const zaokrozitev = 0.035 * m;
    for (const s of stolpci) {
      if (u < s.x0 || u > s.x1 || v < s.y0 || v > s.y1) continue;
      // Zaobljen vrh stolpca.
      const cx = Math.min(Math.max(u, s.x0 + zaokrozitev), s.x1 - zaokrozitev);
      if (v < s.y0 + zaokrozitev && (u - cx) ** 2 + (v - (s.y0 + zaokrozitev)) ** 2 > zaokrozitev ** 2) continue;
      return [...SVETLA, 255];
    }
    return [...MODRA, 255];
  };
}

function ikona(velikost, moznosti) {
  const lik = risba(moznosti);
  return png(velikost, (x, y) => {
    let r = 0; let g = 0; let b = 0; let a = 0;
    for (let i = 0; i < VZOREC; i++) {
      for (let j = 0; j < VZOREC; j++) {
        const barva = lik((x + (i + 0.5) / VZOREC) / velikost, (y + (j + 0.5) / VZOREC) / velikost);
        if (!barva) continue;
        r += barva[0]; g += barva[1]; b += barva[2]; a += 1;
      }
    }
    const n = VZOREC * VZOREC;
    return a ? [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round((a / n) * 255)] : [0, 0, 0, 0];
  });
}

mkdirSync(MAPA, { recursive: true });
const datoteke = [
  ['ikona-192.png', ikona(192, { maskable: false })],
  ['ikona-512.png', ikona(512, { maskable: false })],
  ['ikona-maskable-512.png', ikona(512, { maskable: true })],
];
for (const [ime, vsebina] of datoteke) writeFileSync(join(MAPA, ime), vsebina);
console.log(datoteke.map(([ime, v]) => `${ime} (${v.length} B)`).join(', '));
