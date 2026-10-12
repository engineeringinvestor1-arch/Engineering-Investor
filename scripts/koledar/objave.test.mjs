// Preizkus samodejnega dodajanja objav rezultatov. Vrstice so resnični odgovori Nasdaqovega koledarja z 10. 10. 2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dopolniObjave, dopolniPredvidene, izberiPredvidene, ocenjeneObjave, razpisaneObjave, yahooObjave } from './objave.mjs';

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

// ---------- predvideni datumi (avtor, 12. 10. 2026) ----------

// Resnični odgovori 12. 10. 2026: Nasdaqov koledar in Yahoo Finance (ure v UTC, sekunde od 1970).
// Izjemi sta vrstici MU (sestavljena za preizkus časovnega pasu) in TSLA (odgovor brez datuma).
const nasdaq12 = {
  '2026-10-27': [vrstica('V', 'time-after-hours')],
  '2026-10-29': [vrstica('AMZN', 'time-not-supplied'), vrstica('MA', 'time-pre-market')],
  '2026-10-30': [vrstica('XOM', 'time-not-supplied')],
  '2026-11-04': [vrstica('META', 'time-not-supplied')],
  '2026-11-06': [vrstica('BRK.B', 'time-not-supplied')],
  '2026-11-18': [vrstica('NVDA', 'time-not-supplied', 'Oct/2026')],
};
const ts = (iso) => Date.parse(iso) / 1000;
const yahoo12 = [
  { symbol: 'META', earningsTimestampStart: ts('2026-10-28T20:00:00Z'), earningsTimestampEnd: ts('2026-10-28T20:00:00Z'), isEarningsDateEstimate: true },
  { symbol: 'AMZN', earningsTimestampStart: ts('2026-10-29T20:00:00Z'), earningsTimestampEnd: ts('2026-10-29T20:00:00Z'), isEarningsDateEstimate: false },
  { symbol: 'XOM', earningsTimestampStart: ts('2026-10-30T12:30:00Z'), earningsTimestampEnd: ts('2026-10-30T12:30:00Z'), isEarningsDateEstimate: false },
  { symbol: 'V', earningsTimestampStart: ts('2026-10-27T20:00:00Z'), earningsTimestampEnd: ts('2026-10-27T20:00:00Z'), isEarningsDateEstimate: false },
  { symbol: 'BRK-B', earningsTimestampStart: ts('2026-11-07T20:00:00Z'), earningsTimestampEnd: ts('2026-11-07T20:00:00Z'), isEarningsDateEstimate: true },
  { symbol: 'AVGO', earningsTimestampStart: ts('2026-12-09T21:00:00Z'), earningsTimestampEnd: ts('2026-12-09T21:00:00Z'), isEarningsDateEstimate: false },
  // Objava po polnoči po UTC je v New Yorku še prejšnji dan.
  { symbol: 'MU', earningsTimestampStart: ts('2026-10-21T01:00:00Z'), earningsTimestampEnd: ts('2026-10-21T01:00:00Z'), isEarningsDateEstimate: true },
  { symbol: 'TSLA' },
];
const DANES = '2026-10-12';

test('ocene: Yahoo da datum po newyorškem času, Nasdaq objave brez ure; razpisane niso ocena', () => {
  const yahoo = yahooObjave(yahoo12, podjetja);
  assert.deepEqual(yahoo.map((o) => `${o.ticker} ${o.date}`), ['META 2026-10-28', 'AMZN 2026-10-29', 'XOM 2026-10-30', 'V 2026-10-27', 'BRK.B 2026-11-07', 'AVGO 2026-12-09', 'MU 2026-10-20']);
  assert.ok(yahoo.every((o) => o.source === 'Yahoo Finance'));
  const nasdaqOcene = ocenjeneObjave(nasdaq12, podjetja);
  assert.deepEqual(nasdaqOcene.map((o) => `${o.ticker} ${o.date}`), ['AMZN 2026-10-29', 'XOM 2026-10-30', 'META 2026-11-04', 'BRK.B 2026-11-06', 'NVDA 2026-11-18']);
  assert.deepEqual({ quarter: nasdaqOcene[2].quarter, year: nasdaqOcene[2].year, source: nasdaqOcene[2].source }, { quarter: 3, year: 2026, source: 'Nasdaq' });
});

test('ocene: prednost ima Yahoo, Nasdaq je rezerva in da četrtletje; predaleč v prihodnosti ne gre v koledar', () => {
  const izbrane = izberiPredvidene(yahooObjave(yahoo12, podjetja), ocenjeneObjave(nasdaq12, podjetja), { today: DANES });
  const po = Object.fromEntries(izbrane.map((o) => [o.ticker, o]));
  // Meta: Yahoo 28. 10. (sreda v zadnjem tednu meseca, kot aprila in julija), Nasdaqov algoritem 4. 11.
  assert.deepEqual(po.META, { ticker: 'META', name: 'Meta Platforms', date: '2026-10-28', source: 'Yahoo Finance', quarter: 3, year: 2026 });
  assert.equal(po['BRK.B'].date, '2026-11-07');
  // NVIDIA pri Yahooju tisti dan manjka v odgovoru: velja Nasdaqova ocena, a je 37 dni naprej, čez mejo 35 dni.
  assert.equal(po.NVDA, undefined);
  assert.equal(po.AVGO, undefined, 'december je čez mejo');
  assert.deepEqual(izbrane.map((o) => o.ticker).sort(), ['AMZN', 'BRK.B', 'META', 'MU', 'V', 'XOM']);
  // Brez Yahooja ostane Nasdaqova ocena.
  const rezerva = izberiPredvidene([], ocenjeneObjave(nasdaq12, podjetja), { today: DANES });
  assert.deepEqual(rezerva.map((o) => `${o.ticker} ${o.date} ${o.source}`), ['AMZN 2026-10-29 Nasdaq', 'XOM 2026-10-30 Nasdaq', 'META 2026-11-04 Nasdaq', 'BRK.B 2026-11-06 Nasdaq']);
});

test('predviden datum se vpiše z oznako; razpisane objave ocena ne spremeni', () => {
  const razpisane = razpisaneObjave(nasdaq12, podjetja);
  const potrjeno = dopolniObjave(naStrani, razpisane);
  assert.deepEqual(potrjeno.dodane.map((e) => `${e.id} ${e.date}`), ['v-q3-26 2026-10-27', 'ma-q3-26 2026-10-29']);
  const izbrane = izberiPredvidene(yahooObjave(yahoo12, podjetja), ocenjeneObjave(nasdaq12, podjetja), { today: DANES });
  const { earnings, dodane, premaknjene, odstranjene } = dopolniPredvidene(potrjeno.earnings, izbrane, { today: DANES });
  assert.deepEqual(dodane.map((e) => `${e.id} ${e.date}`).sort(), ['amzn-q3-26 2026-10-29', 'brkb-q3-26 2026-11-07', 'meta-q3-26 2026-10-28', 'mu-2026-10-20 2026-10-20', 'xom-q3-26 2026-10-30']);
  assert.deepEqual([premaknjene, odstranjene], [[], []]);
  const meta = earnings.find((e) => e.ticker === 'META');
  assert.deepEqual(meta, { id: 'meta-q3-26', date: '2026-10-28', ticker: 'META', name: 'Meta Platforms', estimated: true, estimateSource: 'Yahoo Finance', quarter: 3, year: 2026 });
  assert.equal(meta.when, undefined, 'ura ocene se ne vpiše');
  // Visa je razpisana: ostane brez oznake, čeprav jo Yahoo tudi navaja.
  const visa = earnings.filter((e) => e.ticker === 'V');
  assert.equal(visa.length, 1);
  assert.equal(visa[0].estimated, undefined);
  assert.deepEqual(earnings.map((e) => e.date), [...earnings.map((e) => e.date)].sort());
  // Drugi zagon z istimi podatki ne spremeni ničesar.
  const drugi = dopolniPredvidene(earnings, izbrane, { today: DANES });
  assert.deepEqual([drugi.dodane, drugi.premaknjene, drugi.odstranjene], [[], [], []]);
  assert.deepEqual(drugi.earnings, earnings);
});

test('ko podjetje datum razpiše, vpis dobi uradni datum in čas, oznaka izgine', () => {
  const zOceno = [{ id: 'meta-q3-26', date: '2026-10-28', ticker: 'META', name: 'Meta Platforms', estimated: true, estimateSource: 'Yahoo Finance', quarter: 3, year: 2026 }];
  const razpis = razpisaneObjave({ '2026-10-29': [vrstica('META', 'time-after-hours')] }, podjetja);
  const { earnings, dodane, razhajanja, potrjene } = dopolniObjave(zOceno, razpis);
  assert.deepEqual(earnings, [{ id: 'meta-q3-26', date: '2026-10-29', ticker: 'META', name: 'Meta Platforms', when: 'po zaprtju', quarter: 3, year: 2026 }]);
  assert.deepEqual([dodane, razhajanja], [[], []], 'premik ocene ni razhajanje');
  assert.deepEqual(potrjene, [{ id: 'meta-q3-26', date: '2026-10-29', when: 'po zaprtju', prej: '2026-10-28' }]);
  // Vpis brez četrtletja dobi ob potrditvi oznako po četrtletju.
  const brez = dopolniObjave([{ id: 'mu-2026-10-20', date: '2026-10-20', ticker: 'MU', name: 'Micron', estimated: true, estimateSource: 'Yahoo Finance' }], razpisaneObjave({ '2026-10-21': [vrstica('MU', 'time-after-hours', 'Aug/2026')] }, podjetja));
  assert.equal(brez.earnings[0].id, 'mu-q3-26');
  assert.equal(brez.earnings[0].estimated, undefined);
});

test('ocena se premakne z virom; rezerva ne premika Yahoojeve; minula ocena brez razpisa izgine', () => {
  const zOceno = [
    { id: 'meta-q3-26', date: '2026-10-28', ticker: 'META', name: 'Meta Platforms', estimated: true, estimateSource: 'Yahoo Finance', quarter: 3, year: 2026 },
    { id: 'jpm-q3-26', date: '2026-10-13', ticker: 'JPM', name: 'JPMorgan Chase', when: 'pred odprtjem', quarter: 3, year: 2026 },
  ];
  const yahooNov = [{ ticker: 'META', name: 'Meta Platforms', date: '2026-10-29', source: 'Yahoo Finance' }];
  const premik = dopolniPredvidene(zOceno, yahooNov, { today: DANES });
  assert.deepEqual(premik.premaknjene, [{ id: 'meta-q3-26', prej: '2026-10-28', zdaj: '2026-10-29' }]);
  assert.equal(premik.earnings.find((e) => e.ticker === 'META').date, '2026-10-29');
  // Yahoo tisti dan ne odgovori: Nasdaqova ocena 4. 11. Yahoojeve ne zamenja, sicer bi datum skakal sem in tja.
  const rezerva = dopolniPredvidene(zOceno, [{ ticker: 'META', name: 'Meta Platforms', date: '2026-11-04', source: 'Nasdaq', quarter: 3, year: 2026 }], { today: DANES });
  assert.deepEqual(rezerva.premaknjene, []);
  assert.equal(rezerva.earnings.find((e) => e.ticker === 'META').date, '2026-10-28');
  // Razpisane objave ocena nikoli ne premakne.
  const jpm = dopolniPredvidene(zOceno, [{ ticker: 'JPM', name: 'JPMorgan Chase', date: '2026-10-14', source: 'Yahoo Finance' }], { today: DANES });
  assert.equal(jpm.earnings.find((e) => e.ticker === 'JPM').date, '2026-10-13');
  // 29. 10.: predvideni dan je minil, podjetje ni razpisalo, vir nove ocene nima. Vpis izgine.
  const minulo = dopolniPredvidene(zOceno, [], { today: '2026-10-29' });
  assert.deepEqual(minulo.odstranjene.map((e) => e.id), ['meta-q3-26']);
  assert.deepEqual(minulo.earnings.map((e) => e.id), ['jpm-q3-26']);
  // Če je izid že vpisan, je objava bila: vpis ostane, oznaka ocene izgine.
  const zIzidom = dopolniPredvidene([{ ...zOceno[0], actualEps: '6,50 USD' }], [], { today: '2026-10-29' });
  assert.deepEqual(zIzidom.earnings, [{ id: 'meta-q3-26', date: '2026-10-28', ticker: 'META', name: 'Meta Platforms', quarter: 3, year: 2026, actualEps: '6,50 USD' }]);
});

test('koledar v podatkih: predviden datum nima ure, razpisan nima oznake ocene', () => {
  const { earnings } = JSON.parse(readFileSync(new URL('../../src/data/koledar-events.json', import.meta.url), 'utf8'));
  for (const e of earnings) {
    if (e.estimated) assert.ok(!e.when && e.estimateSource, `${e.id}: predviden datum mora imeti vir ocene in ne sme imeti ure`);
    else assert.ok(e.when && !e.estimateSource, `${e.id}: razpisana objava mora imeti čas objave in ne sme imeti vira ocene`);
  }
});
