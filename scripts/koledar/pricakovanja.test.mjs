// Preizkusi pričakovanj. Vrstice so prave, zajete 2. 10. 2026 iz Nasdaqa in Forex Factoryja.
// Poženi: node --test scripts/koledar/

import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastFor, nasdaqLocalTime, parseNumber, previousParts } from './pricakovanja.mjs';

const row = (gmt, country, eventName, consensus, previous) => ({ gmt, country, eventName, actual: ' ', consensus, previous });
const US = 'United States';
const EZ = 'Euro Zone';
// Nasdaq vrne dogodke dneva pred zahtevanim, zato so vrstice v odgovoru za naslednji dan.
const naslednjiDan = (rows) => ({ nasdaqResponses: [[], rows] });

test('števila iz virov in naše prejšnje vrednosti', () => {
  assert.deepEqual(parseNumber('89K'), { value: 89, unit: 'K' });
  assert.deepEqual(parseNumber('1,701K'), { value: 1701, unit: 'K' });
  assert.deepEqual(parseNumber('-0.2%'), { value: -0.2, unit: '%' });
  assert.deepEqual(parseNumber('54.8'), { value: 54.8, unit: '' });
  assert.equal(parseNumber('&nbsp;'), null);
  assert.equal(parseNumber(' '), null);
  assert.deepEqual(previousParts('3,4 % medletno (jul 2026, po reviziji BEA 30. 9.); jedrni 3,0 %'), [3.4, 3]);
  assert.deepEqual(previousParts('+1,1 % mesečno (avg 2026)'), [1.1]);
  assert.deepEqual(previousParts('−0,6 % mesečno'), [-0.6]);
});

test('ura iz New Yorka v Ljubljano, tudi v tednu, ko je Evropa že na zimskem času', () => {
  assert.equal(nasdaqLocalTime('2026-10-14', '08:30'), '14:30');
  assert.equal(nasdaqLocalTime('2026-10-28', '14:00'), '19:00');
  assert.equal(nasdaqLocalTime('2026-12-09', '14:00'), '20:00');
  assert.equal(nasdaqLocalTime('2026-10-02', 'All Day'), null);
});

const cpiRows = [
  row('08:30', US, 'Core CPI', '0.2%', '0.2%'),
  row('08:30', US, 'Core CPI', '2.4%', '2.5%'),
  row('08:30', US, 'Core CPI Index', ' ', '336.79'),
  row('08:30', US, 'CPI', '0.4%', '0.1%'),
  row('08:30', US, 'CPI', '3.4%', '3.4%'),
  row('08:30', US, 'CPI Index, n.s.a.', '334.85', '333.92'),
];
const cpi = { id: 'us-cpi-sep26', date: '2026-09-11', time: '14:30', previous: '3,4 % medletno (jul 2026); jedrna 2,5 %' };

test('CPI: medletno vrstico z istim imenom prepozna po naši prejšnji vrednosti', () => {
  const out = forecastFor(cpi, naslednjiDan(cpiRows));
  assert.equal(out.text, '3,4 % medletno; jedrna 2,4 %');
  assert.deepEqual(out.sources, ['Nasdaq']);
});

test('CPI brez prejšnje vrednosti in brez drugega vira: ne ugiba med mesečno in medletno', () => {
  const out = forecastFor({ ...cpi, previous: undefined }, naslednjiDan(cpiRows));
  assert.equal(out.text, undefined);
  assert.match(out.problem, /ni mogoče zanesljivo prepoznati/);
});

const nfpRows = [
  row('08:30', US, 'Average Hourly Earnings', '0.3%', '0.3%'),
  row('08:30', US, 'Nonfarm Payrolls', '89K', '133K'),
  row('08:30', US, 'Private Nonfarm Payrolls', '85K', '89K'),
  row('08:30', US, 'U6 Unemployment Rate', ' ', '7.7%'),
  row('08:30', US, 'Unemployment Rate', '4.1%', '4.1%'),
];
const nfp = { id: 'us-nfp-oct26', date: '2026-10-02', time: '14:30' };
const ff = (title, country, date, forecast) => ({ title, country, date, impact: 'High', forecast, previous: '' });
const nfpFF = [
  ff('Non-Farm Employment Change', 'USD', '2026-10-02T08:30:00-04:00', '89K'),
  ff('Unemployment Rate', 'USD', '2026-10-02T08:30:00-04:00', '4.1%'),
];

test('NFP: oba vira se ujemata', () => {
  const out = forecastFor(nfp, { nasdaqResponses: [[], nfpRows], ffItems: nfpFF });
  assert.equal(out.text, '+89.000 delovnih mest; brezposelnost 4,1 %');
  assert.deepEqual(out.sources, ['Nasdaq', 'Forex Factory']);
});

test('NFP: kadar se vira razlikujeta, se ne vpiše nič', () => {
  const out = forecastFor(nfp, { nasdaqResponses: [[], nfpRows], ffItems: [{ ...nfpFF[0], forecast: '90K' }, nfpFF[1]] });
  assert.equal(out.text, undefined);
  assert.match(out.problem, /viri se razlikujejo \(Nasdaq 89K, Forex Factory 90K\)/);
});

test('dogodek v odgovorih za dva dneva: ne vemo, kateri dan je pravi', () => {
  const out = forecastFor(nfp, { nasdaqResponses: [nfpRows, nfpRows] });
  assert.match(out.problem, /več dneh/);
});

const euRows = [
  row('05:00', EZ, 'Core CPI', '2.5%', '2.4%'),
  row('05:00', EZ, 'Core CPI', ' ', '0.2%'),
  row('05:00', EZ, 'CPI', '3.7%', '3.2%'),
  row('05:00', EZ, 'CPI', ' ', '0.4%'),
  row('08:30', US, 'CPI', '0.3%', '0.4%'),
];
const euCpi = { id: 'eu-cpi-sep26', date: '2026-10-02', time: '11:00' };

test('EU CPI: brez prejšnje vrednosti ga razloči Forex Factory z izrecnim imenom', () => {
  const euFF = [
    ff('CPI Flash Estimate y/y', 'EUR', '2026-10-02T05:00:00-04:00', '3.7%'),
    ff('Core CPI Flash Estimate y/y', 'EUR', '2026-10-02T05:00:00-04:00', '2.5%'),
  ];
  const out = forecastFor(euCpi, { nasdaqResponses: [[], euRows], ffItems: euFF });
  assert.equal(out.text, '3,7 % medletno; jedrna 2,5 %');
  assert.deepEqual(out.sources, ['Nasdaq', 'Forex Factory']);
  // Samo Nasdaq: ena vrstica s pričakovanjem bi lahko bila tudi mesečna, zato nič.
  assert.equal(forecastFor(euCpi, naslednjiDan(euRows)).text, undefined);
});

test('seja Feda: razpon iz zgornje meje', () => {
  const rows = [row('14:00', US, 'Fed Interest Rate Decision', '4.00%', '3.75%'), row('12:00', US, 'Atlanta Fed GDPNow', '4.4%', '4.4%')];
  assert.equal(forecastFor({ id: 'fomc-sep26', date: '2026-09-16', time: '20:00' }, naslednjiDan(rows)).text, '3,75-4,00 %');
  // Napačna ura v koledarju pomeni, da to ni isti dogodek.
  assert.equal(forecastFor({ id: 'fomc-sep26', date: '2026-09-16', time: '19:00' }, naslednjiDan(rows)).text, undefined);
});

test('ECB: depozitna mera', () => {
  const rows = [row('08:15', EZ, 'Deposit Facility Rate', '2.50%', '2.25%'), row('08:15', EZ, 'ECB Interest Rate Decision', '2.65%', '2.40%')];
  assert.equal(forecastFor({ id: 'ecb-sep26', date: '2026-09-10', time: '14:15' }, naslednjiDan(rows)).text, 'depozitna mera 2,50 %');
});

test('ISM: indeks, oba vira', () => {
  const rows = [row('10:00', US, 'ISM Manufacturing Employment', '52.0', '51.2'), row('10:00', US, 'ISM Manufacturing PMI', '54.8', '54.6')];
  const out = forecastFor({ id: 'us-ism-oct26', date: '2026-10-01', time: '16:00' }, { nasdaqResponses: [[], rows], ffItems: [ff('ISM Manufacturing PMI', 'USD', '2026-10-01T10:00:00-04:00', '54.8')] });
  assert.equal(out.text, 'indeks 54,8');
});

test('maloprodaja: revidirana prejšnja vrednost, odloči Forex Factory', () => {
  const rows = [row('08:30', US, 'Retail Sales', ' ', '5.03%'), row('08:30', US, 'Retail Sales', '0.8%', '-0.5%'), row('08:30', US, 'Core Retail Sales', '0.6%', '-0.2%')];
  const evt = { id: 'us-retail-sep26', date: '2026-09-16', time: '14:30', previous: '−0,6 % mesečno (jul 2026)' };
  const retailFF = [ff('Retail Sales m/m', 'USD', '2026-09-16T08:30:00-04:00', '0.8%')];
  assert.equal(forecastFor(evt, { nasdaqResponses: [[], rows], ffItems: retailFF }).text, '0,8 % mesečno');
  // Prejšnja vrednost na strani (-0,6) se po reviziji ne ujema z Nasdaqom (-0,5), drugega vira ni: nič.
  assert.equal(forecastFor(evt, naslednjiDan(rows)).text, undefined);
  // Ko se ujema, zadošča Nasdaq.
  assert.equal(forecastFor({ ...evt, previous: '−0,5 % mesečno (jul 2026)' }, naslednjiDan(rows)).text, '0,8 % mesečno');
});

test('dogodek brez pravila ostane brez pričakovanja', () => {
  assert.match(forecastFor({ id: 'us-jackson26', date: '2026-08-27' }, naslednjiDan([])).problem, /ni pravila/);
});
