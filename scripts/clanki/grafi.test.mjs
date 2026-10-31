// Oznake [n], ki odprejo graf (avtor 31. 10. 2026 ob Alphabetovi analizi: "samo označiš [1] na katero lahko pritisneš
// in ti prikaže graf"). Preizkus varuje številčenje, povezavo med oznako in grafom ter ustavitev gradnje,
// če oznaka kaže na graf, ki ga v članku ni.
import test from 'node:test';
import assert from 'node:assert/strict';
import { remarkGrafi } from '../../src/plugins/remark-grafi.mjs';
import { remarkInlineSvg } from '../../src/plugins/remark-inline-svg.mjs';

const besedilo = (value) => ({ type: 'text', value });
const odstavek = (...children) => ({ type: 'paragraph', children });
const slika = (ime, alt = ime) => odstavek({ type: 'image', url: `/images/articles/alphabet-analiza-2026-10-29/${ime}.svg`, alt });
const oznaka = (ime) => ({ type: 'link', url: `#graf-${ime}`, children: [besedilo('graf')] });
const obdelaj = (pot, ...children) => {
  const drevo = { type: 'root', children };
  remarkGrafi()(drevo, { path: pot });
  return drevo;
};
const SL = 'src/content/analize/alphabet-analiza-2026-10-29.md';
const EN = 'src/content/analize-en/alphabet-analysis-2026-10-29.md';

test('oznaka postane gumb [n], ki kaže na graf po imenu datoteke', () => {
  const drevo = obdelaj(SL, odstavek(besedilo('Prihodki rastejo '), oznaka('prihodki')), slika('prihodki', 'Prihodki po četrtletjih'));
  const html = drevo.children[0].children[1];
  assert.equal(html.type, 'html');
  assert.match(html.value, /class="graf-ref"/);
  assert.match(html.value, /href="#graf-prihodki"/);
  assert.match(html.value, />\[1\]<\/a>$/);
  assert.match(html.value, /aria-label="Graf 1: Prihodki po četrtletjih"/);
});

test('številke sledijo vrstnemu redu grafov v članku, ne vrstnemu redu oznak', () => {
  const drevo = obdelaj(SL,
    odstavek(oznaka('fcf'), oznaka('prihodki'), oznaka('fcf')),
    slika('prihodki'), slika('fcf'));
  const [fcf, prihodki, fcf2] = drevo.children[0].children.map((n) => n.value);
  assert.match(prihodki, />\[1\]</);
  assert.match(fcf, />\[2\]</);
  assert.equal(fcf, fcf2);
});

test('graf brez oznake ostane brez številke', () => {
  const drevo = obdelaj(SL, odstavek(oznaka('fcf')), slika('iskanje'), slika('fcf'));
  assert.equal(drevo.children[1].children[0].data?.stevilka, undefined);
  assert.equal(drevo.children[2].children[0].data.stevilka, 1);
});

test('oznaka brez grafa ustavi gradnjo', () => {
  assert.throws(() => obdelaj(SL, odstavek(oznaka('ni-ga')), slika('prihodki')), /graf-ni-ga.*ni-ga\.svg/);
});

test('v angleškem članku je opis oznake "Chart"', () => {
  const drevo = obdelaj(EN, odstavek(oznaka('prihodki')), slika('prihodki', 'Revenue by quarter'));
  assert.match(drevo.children[0].children[0].value, /aria-label="Chart 1: Revenue by quarter"/);
});

test('vstavljeni graf dobi id in vidno številko, na katero kaže oznaka', () => {
  const drevo = obdelaj(SL, odstavek(oznaka('iskanje-kliki')), slika('iskanje-kliki', 'Plačani kliki'));
  remarkInlineSvg()(drevo);
  const figura = drevo.children[1].value;
  assert.match(figura, /^<figure class="chart" id="graf-iskanje-kliki"><span class="chart__oznaka" aria-hidden="true">\[1\]<\/span><svg/);
});
