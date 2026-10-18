// Vsak članek ima angleški prevod z angleškimi grafi (avtor, 18. 10. 2026: "Ko objavljam članke hočem da
// imajo tudi angleški prevod", prevod piše Claude ob vsakem članku). Tedenski pregled 12. do 16. 10. 2026 je
// šel na stran samo v slovenščini, čeprav je CLAUDE.md prevod že zahteval; ta preizkus tak članek ustavi
// pred objavo. Zagon: npm run test:prevodi
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '../..');
const IZVIRNIKI = join(KOREN, 'src/content/analize');
const PREVODI = join(KOREN, 'src/content/analize-en');

// Članki, objavljeni samo v slovenščini, preden je prevod postal obvezen za vsak članek. Seznam se ne
// daljša: nov članek brez prevoda ne gre na stran. Ko starejši članek dobi prevod, ga s seznama odstrani.
const SAMO_SLOVENSKO = [
  'tedenska-analiza-2026-07-17',
  'tedenska-analiza-2026-07-24',
  'tedenska-analiza-2026-07-31',
  'pregled-tedna-2026-08-07',
  'tedenska-analiza-2026-09-18',
  'tedenska-analiza-2026-09-25',
  'tedenska-analiza-2026-10-02',
  'tedenska-analiza-2026-10-09',
  'tedenska-analiza-2026-10-16',
];

// Glava članka (polja med vrsticama ---) in poti do slik v besedilu.
function preberi(mapa, ime) {
  const besedilo = readFileSync(join(mapa, ime), 'utf8');
  const glava = {};
  const blok = besedilo.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  for (const vrstica of (blok ? blok[1] : '').split(/\r?\n/)) {
    const m = vrstica.match(/^(\w+):\s*(.*)$/);
    if (m) glava[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  const slike = [...besedilo.matchAll(/!\[[^\]]*\]\(([^)\s]+)|src="([^"]+)"/g)].map((m) => m[1] ?? m[2]).filter((p) => p.startsWith('/images/'));
  return { id: ime.replace(/\.md$/, ''), glava, slike };
}

const clanki = (mapa) => readdirSync(mapa).filter((ime) => ime.endsWith('.md')).map((ime) => preberi(mapa, ime));
const izvirniki = clanki(IZVIRNIKI);
const prevodi = clanki(PREVODI);
const prevodOd = (id) => prevodi.find((p) => p.glava.izvirnik === id);

test('18. 10. 2026: vsak članek ima angleški prevod, razen starejših s seznama SAMO_SLOVENSKO', () => {
  const brezPrevoda = izvirniki.filter((c) => !prevodOd(c.id) && !SAMO_SLOVENSKO.includes(c.id)).map((c) => c.id);
  assert.deepEqual(brezPrevoda, [], 'članki brez prevoda v src/content/analize-en/ (polje izvirnik)');
});

test('seznam SAMO_SLOVENSKO našteva obstoječe članke brez prevoda', () => {
  for (const id of SAMO_SLOVENSKO) {
    assert.ok(izvirniki.some((c) => c.id === id), `${id} ni v src/content/analize/`);
    assert.ok(!prevodOd(id), `${id} ima prevod: odstrani ga s seznama SAMO_SLOVENSKO`);
  }
});

test('prevod kaže na obstoječ izvirnik ter ima isti datum in kategorijo', () => {
  for (const p of prevodi) {
    const izvirnik = izvirniki.find((c) => c.id === p.glava.izvirnik);
    assert.ok(izvirnik, `${p.id}: izvirnik "${p.glava.izvirnik}" ne obstaja`);
    assert.equal(p.glava.pubDate, izvirnik.glava.pubDate, `${p.id}: datum objave`);
    assert.equal(p.glava.category, izvirnik.glava.category, `${p.id}: kategorija`);
  }
});

test('prevod ima toliko grafov kot izvirnik, vse v angleščini in na strani', () => {
  for (const p of prevodi) {
    const izvirnik = izvirniki.find((c) => c.id === p.glava.izvirnik);
    if (!izvirnik) continue;
    assert.equal(p.slike.length, izvirnik.slike.length, `${p.id}: število grafov`);
    for (const pot of p.slike) {
      assert.ok(!izvirnik.slike.includes(pot), `${p.id}: ${pot} je slovenski graf`);
      assert.ok(existsSync(join(KOREN, 'public', pot)), `${p.id}: ${pot} ne obstaja v public/`);
    }
  }
});
