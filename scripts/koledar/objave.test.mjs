// Preizkus samodejnega dodajanja objav rezultatov. Vrstice so resnični odgovori Nasdaqovega koledarja z 10. 10. 2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dopolniObjave, razpisaneObjave } from './objave.mjs';

const vrstica = (symbol, time, fiscalQuarterEnding = 'Sep/2026') => ({ symbol, time, fiscalQuarterEnding, epsForecast: '$1.00', noOfEsts: '10' });
const nasdaq = {
  '2026-10-13': [vrstica('JPM', 'time-pre-market'), vrstica('JNJ', 'time-pre-market')],
  '2026-10-14': [vrstica('BAC', 'time-pre-market')],
  '2026-10-21': [vrstica('TSLA', 'time-after-hours')],
  '2026-10-28': [vrstica('GOOG', 'time-after-hours'), vrstica('GOOGL', 'time-after-hours'), vrstica('MSFT', 'time-after-hours')],
  '2026-10-29': [vrstica('AMZN', 'time-not-supplied'), vrstica('LLY', 'time-pre-market'), vrstica('MA', 'time-not-supplied')],
  '2026-10-30': [vrstica('XOM', 'time-not-supplied')],
};
const podjetja = JSON.parse(readFileSync(new URL('../../src/data/koledar-podjetja.json', import.meta.url), 'utf8')).companies;
const naStrani = [
  { id: 'msft-q2-26', date: '2026-07-29', ticker: 'MSFT', name: 'Microsoft', when: 'po zaprtju', actualEps: '4,10 USD' },
  { id: 'jpm-q3-26', date: '2026-10-13', ticker: 'JPM', name: 'JPMorgan Chase', when: 'pred odprtjem', quarter: 3, year: 2026 },
  { id: 'jnj-q3-26', date: '2026-10-13', ticker: 'JNJ', name: 'Johnson & Johnson', when: 'pred odprtjem', quarter: 3, year: 2026 },
  { id: 'lly-q3-26', date: '2026-10-29', ticker: 'LLY', name: 'Eli Lilly', when: 'pred odprtjem', quarter: 3, year: 2026 },
];

test('seznam spremljanih podjetij: dvajset, brez podvojitev', () => {
  assert.equal(podjetja.length, 20);
  assert.equal(new Set(podjetja.map((p) => p.ticker)).size, 20);
  for (const p of podjetja) assert.ok(p.ticker && p.name, JSON.stringify(p));
});

test('razpisana je samo objava z navedenim časom, pri spremljanem podjetju', () => {
  const razpisane = razpisaneObjave(nasdaq, podjetja);
  assert.deepEqual(razpisane.map((r) => `${r.date} ${r.ticker} ${r.when}`), [
    '2026-10-13 JPM pred odprtjem',
    '2026-10-13 JNJ pred odprtjem',
    '2026-10-21 TSLA po zaprtju',
    '2026-10-28 GOOGL po zaprtju',
    '2026-10-28 MSFT po zaprtju',
    '2026-10-29 LLY pred odprtjem',
  ]);
  // Mastercard, Exxon in Amazon 10. 10. 2026 datuma še niso razpisali; Bank of America ni med dvajsetimi.
  for (const brez of ['MA', 'XOM', 'AMZN', 'BAC', 'GOOG']) assert.ok(!razpisane.some((r) => r.ticker === brez), brez);
  assert.deepEqual({ quarter: razpisane[2].quarter, year: razpisane[2].year }, { quarter: 3, year: 2026 });
});

test('v koledar gredo samo objave, ki jih še ni; vpisane ostanejo nedotaknjene', () => {
  const { earnings, dodane, razhajanja } = dopolniObjave(naStrani, razpisaneObjave(nasdaq, podjetja));
  assert.deepEqual(dodane.map((e) => `${e.id} ${e.date} ${e.when}`), [
    'tsla-q3-26 2026-10-21 po zaprtju',
    'googl-q3-26 2026-10-28 po zaprtju',
    'msft-q3-26 2026-10-28 po zaprtju',
  ]);
  assert.deepEqual(razhajanja, []);
  assert.equal(earnings.length, naStrani.length + 3);
  assert.deepEqual(earnings.map((e) => e.date), [...earnings.map((e) => e.date)].sort(), 'seznam ostane urejen po datumu');
  // Julijska objava Microsofta je druga objava, ne ista: oktobrska se doda, julijska ostane z izidom.
  assert.equal(earnings.find((e) => e.id === 'msft-q2-26').actualEps, '4,10 USD');
  // Drugi zagon ne doda ničesar.
  assert.deepEqual(dopolniObjave(earnings, razpisaneObjave(nasdaq, podjetja)).dodane, []);
  // Vhodni seznam se ne spreminja.
  assert.equal(naStrani.length, 4);
});

test('že vpisanega datuma robot ne premakne, razhajanje pa javi', () => {
  const rocno = [{ id: 'tsla-q3-26', date: '2026-10-20', ticker: 'TSLA', name: 'Tesla', when: 'po zaprtju' }];
  const { earnings, dodane, razhajanja } = dopolniObjave(rocno, razpisaneObjave(nasdaq, podjetja).filter((r) => r.ticker === 'TSLA'));
  assert.deepEqual(dodane, []);
  assert.equal(earnings[0].date, '2026-10-20');
  assert.deepEqual(razhajanja, [{ id: 'tsla-q3-26', na_strani: '2026-10-20', nasdaq: '2026-10-21' }]);
});
