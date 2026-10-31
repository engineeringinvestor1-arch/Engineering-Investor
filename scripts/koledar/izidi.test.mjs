// Preizkus izidov objav rezultatov v koledarju. Do 31. 10. 2026 robot ni vpisal izida pri nobeni od 11 objav
// od 21. do 30. 10. 2026. Nasdaqove vrstice so resnični odgovori njegovega koledarja z 31. 10. 2026, Finnhubove
// vrednosti so tiste, ki jih je za iste objave zajel agent (data/daily, 21. in 28. 10. 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { izberiFinnhub, izidRezultata, konecCetrtletja, nasdaqEps } from './izidi.mjs';

const finnhubTesla = [
  { actual: 0.48, estimate: 0.4358, period: '2026-09-30', quarter: 3, year: 2026, symbol: 'TSLA' },
  { actual: 0.33, estimate: 0.53, period: '2026-06-30', quarter: 2, year: 2026, symbol: 'TSLA' },
];
const nasdaqTesla = { eps: '$0.20', surprise: '-9.09', time: 'time-not-supplied', symbol: 'TSLA', fiscalQuarterEnding: 'Sep/2026', epsForecast: '$0.22', noOfEsts: '9' };
const nasdaqMicrosoft = { eps: '$4.89', surprise: '3.82', time: 'time-not-supplied', symbol: 'MSFT', fiscalQuarterEnding: 'Sep/2026', epsForecast: '$4.71', noOfEsts: '14' };
const tesla = { id: 'tsla-q3-26', date: '2026-10-21', ticker: 'TSLA', quarter: 3, year: 2026 };

test('31. 10. 2026: Finnhubova vrstica se izbere po koncu četrtletja, ne po oknu zadnjih dni', () => {
  // Finnhub v polje period vpiše konec četrtletja, objava pa je tedne kasneje. Robot je iskal period v zadnjih
  // štirih dneh in ni našel nobene vrstice.
  assert.equal(konecCetrtletja(3, 2026), '2026-09-30');
  assert.equal(konecCetrtletja(4, 2026), '2026-12-31');
  assert.equal(izberiFinnhub(finnhubTesla, tesla)?.actual, 0.48);
  // Brez četrtletja velja zadnje četrtletje, ki se je končalo pred objavo.
  assert.equal(izberiFinnhub(finnhubTesla, { date: '2026-10-21' })?.actual, 0.48);
  assert.equal(izberiFinnhub([], tesla), null);
});

test('31. 10. 2026: Nasdaqov zapis dobička na delnico', () => {
  assert.equal(nasdaqEps('$4.89'), 4.89);
  assert.equal(nasdaqEps('($0.41)'), -0.41);
  assert.equal(nasdaqEps(''), null);
  assert.equal(nasdaqEps('N/A'), null);
  assert.equal(nasdaqEps(undefined), null);
});

test('31. 10. 2026: vira se ujemata, v koledar gre ena številka in ocena', () => {
  const izid = izidRezultata({ finnhub: { actual: 4.89, estimate: 4.8165 }, nasdaq: nasdaqMicrosoft });
  assert.deepEqual(izid, { actualEps: '4,89 USD', actualNote: 'presegel pričakovanja (ocena 4,82 USD)' });
  // Razlika enega centa je zaokrožitev.
  assert.equal(izidRezultata({ finnhub: { actual: 1.88, estimate: 2.001 }, nasdaq: { eps: '$1.89' } }).actualEps, '1,88 USD');
});

test('31. 10. 2026: vira se razlikujeta, v koledar gresta obe številki z virom (avtor: "napiši obe števili")', () => {
  const izid = izidRezultata({ finnhub: finnhubTesla[0], nasdaq: nasdaqTesla });
  assert.deepEqual(izid, { actualEps: '0,48 USD (Finnhub), 0,20 USD (Nasdaq)', actualNote: 'ocena 0,44 USD (Finnhub)' });
});

test('31. 10. 2026: en sam vir je naveden z imenom, brez vira ni izida', () => {
  assert.deepEqual(izidRezultata({ finnhub: null, nasdaq: { eps: '$0.41' } }), { actualEps: '0,41 USD (Nasdaq)' });
  assert.deepEqual(izidRezultata({ finnhub: { actual: 0.52, estimate: null }, nasdaq: null }), { actualEps: '0,52 USD (Finnhub)' });
  assert.equal(izidRezultata({ finnhub: null, nasdaq: { eps: '' } }), null);
  assert.equal(izidRezultata({ finnhub: null, nasdaq: null }), null);
});
