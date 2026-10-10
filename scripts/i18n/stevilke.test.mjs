// Zapis števil v kalkulatorjih v obeh jezikih. Slovenski zapis mora ostati tak, kot je bil pred
// uvedbo angleščine (6. 10. 2026). Zagon: npm run test:prevodi
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { evro, fmt, fmtPct, fmtVnos, let_, letih, mesecev, nastaviJezik, parseStevilo, pctVnos } from '../../src/lib/stevilke.ts';
import { dobaBesedilo, napaka } from '../../src/lib/investicijski.ts';
import { sl } from '../../src/i18n/sl.ts';
import { en } from '../../src/i18n/en.ts';

beforeEach(() => nastaviJezik('sl'));

test('slovenski zapis: pika za tisočice, decimalna vejica, presledek pred %', () => {
  assert.equal(fmt(1234567.891), '1.234.567,89');
  assert.equal(fmt(-0.004), '0,00', 'minus pred ničlo se ne izpiše');
  assert.equal(fmtPct(0.06), '6,0 %');
  assert.equal(fmtPct(0.057, 1, true), '+5,7 %');
  assert.equal(fmtVnos(10), '10');
  assert.equal(fmtVnos(12.5), '12,5');
  assert.equal(fmtVnos(1000.5), '1.000,5');
  assert.equal(pctVnos(0.1), '10 %');
  assert.equal(evro(117054.2), '117.054 €');
  assert.equal(evro(1363.456), '1.363,46 €');
  assert.equal(evro(-250), '-250,00 €');
});

test('slovensko sklanjanje let in mesecev', () => {
  assert.deepEqual([1, 2, 3, 5, 101, 102].map(let_), ['1 leto', '2 leti', '3 leta', '5 let', '101 leto', '102 leti']);
  assert.deepEqual([1, 2, 10].map(letih), ['1 letu', '2 letih', '10 letih']);
  assert.deepEqual([1, 2, 4, 7].map(mesecev), ['1 mesec', '2 meseca', '4 mesece', '7 mesecev']);
  assert.equal(dobaBesedilo(125, let_, mesecev), '10 let in 5 mesecev');
});

test('slovensko branje vnosa', () => {
  assert.equal(parseStevilo('12,5'), 12.5);
  assert.equal(parseStevilo('12.5'), 12.5);
  assert.equal(parseStevilo('1.234,5'), 1234.5);
  assert.ok(Number.isNaN(parseStevilo('abc')));
  assert.ok(Number.isNaN(parseStevilo('')));
});

test('angleški zapis: vejica za tisočice, decimalna pika, % brez presledka, € pred zneskom', () => {
  nastaviJezik('en');
  assert.equal(fmt(1234567.891), '1,234,567.89');
  assert.equal(fmtPct(0.06), '6.0%');
  assert.equal(fmtPct(0.057, 1, true), '+5.7%');
  assert.equal(fmtVnos(10), '10');
  assert.equal(fmtVnos(12.5), '12.5');
  assert.equal(fmtVnos(1000.5), '1,000.5');
  assert.equal(fmtVnos(1000, 0), '1,000', 'ničle v tisočicah niso decimalke');
  assert.equal(pctVnos(0.1), '10%');
  assert.equal(evro(117054.2), '€117,054');
  assert.equal(evro(1363.456), '€1,363.46');
  assert.equal(evro(-250), '-€250.00');
});

test('angleška leta in meseci', () => {
  nastaviJezik('en');
  assert.deepEqual([1, 2, 5].map(let_), ['1 year', '2 years', '5 years']);
  assert.deepEqual([1, 10].map(letih), ['1 year', '10 years']);
  assert.deepEqual([1, 7].map(mesecev), ['1 month', '7 months']);
  assert.equal(dobaBesedilo(125, let_, mesecev, en.ik.in), '10 years and 5 months');
});

test('angleško branje vnosa', () => {
  nastaviJezik('en');
  assert.equal(parseStevilo('12.5'), 12.5);
  assert.equal(parseStevilo('1,234.5'), 1234.5);
  assert.equal(parseStevilo('100,000'), 100000);
  assert.equal(parseStevilo('12,5'), 12.5, 'evropski bralec angleške strani vpiše decimalno vejico');
  assert.ok(Number.isNaN(parseStevilo('abc')));
});

test('vsaka napaka vnosa ima besedilo v obeh jezikih', () => {
  const dober = { zacetni: 1000, leta: 10, stopnja: 0.06, pogostost: 'letno', prispevek: 100, ritem: 'mesecno', kdaj: 'konec' };
  const primeri = [
    [{ ...dober, zacetni: -1 }, null, 'zacetni'],
    [{ ...dober, prispevek: -1 }, null, 'prispevek'],
    [{ ...dober, stopnja: -1 }, null, 'stopnja'],
    [{ ...dober, leta: 0 }, null, 'leta'],
    [dober, 0, 'cilj'],
    [dober, 5000, null],
  ];
  for (const [vhod, cilj, pricakovano] of primeri) {
    const koda = napaka(vhod, cilj);
    assert.equal(koda, pricakovano);
    if (koda) for (const s of [sl, en]) assert.ok(s.ik.napake[koda], `ni besedila za napako ${koda}`);
  }
});
