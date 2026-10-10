// Angleški koledar: vsaka vrednost v podatkih mora dobiti čist prevod, sicer tuji bralec vidi
// pol slovensko vrstico. Zagon: npm run test:prevodi
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prevediKoledar, ostaloSlovensko } from '../../src/i18n/koledar.ts';

const podatki = JSON.parse(readFileSync(new URL('../../src/data/koledar-events.json', import.meta.url), 'utf8'));

test('slovenščina ostane nespremenjena', () => {
  assert.equal(prevediKoledar('CPI 3,4 % medletno; jedrna 2,5 %', 'sl'), 'CPI 3,4 % medletno; jedrna 2,5 %');
  assert.equal(prevediKoledar(undefined, 'en'), undefined);
});

test('predloge, ki jih piše robot', () => {
  const primeri = {
    'CPI 3,4 % medletno; jedrna 2,5 %': 'CPI 3.4% y/y; core 2.5%',
    'PCE 3,4 % medletno; jedrni 3,0 %': 'PCE 3.4% y/y; core 3.0%',
    'PPI 4,7 % medletno': 'PPI 4.7% y/y',
    'Fed obrestna mera: 3,50-3,75 %': 'Fed funds rate: 3.50-3.75%',
    '+162.000 delovnih mest': '+162,000 jobs',
    '-1.234.000 delovnih mest': '-1,234,000 jobs',
    '1,5 % (anualizirano)': '1.5% (annualised)',
    '−0,6 % mesečno': '−0.6% m/m',
    'brezposelnost 4,1 %': 'unemployment 4.1%',
    'indeks 49,5': 'index 49.5',
    'depozitna mera 2,25 %': 'deposit rate 2.25%',
    'presegel pričakovanja (ocena 2,13 USD)': 'beat expectations (estimate $2.13)',
    'zaostal za pričakovanji (ocena 32,56 USD)': 'missed expectations (estimate $32.56)',
    '33,42 USD': '$33.42',
    'izguba 0,09 USD': 'loss $0.09',
    '~0,53 USD': '~$0.53',
    'prihodki 1,32 mrd USD': 'revenue $1.32bn',
    '2,08-2,12 USD, fiskalno Q2': '$2.08-2.12, fiscal Q2',
    '+80.000 do +83.000': '+80,000 to +83,000',
    '3,4 % medletno (jul 2026, po reviziji BEA 30. 9.); jedrni 3,0 %': '3.4% y/y (Jul 2026, after the BEA revision of 30 Sep); core 3.0%',
    '4,2 % letno (maj)': '4.2% y/y (May)',
    '+0,2 % mesečno (junij)': '+0.2% m/m (June)',
    'Skupni 3,7 % letno, jedrni 3,3 % letno; jedrni +0,1 % mesečno (pričakovano +0,2 %)': 'Headline 3.7% y/y, core 3.3% y/y; core +0.1% m/m (expected +0.2%)',
  };
  for (const [sl, en] of Object.entries(primeri)) assert.equal(prevediKoledar(sl, 'en'), en);
});

test('naslovi dogodkov', () => {
  const primeri = {
    'US CPI (jun 2026)': 'US CPI (Jun 2026)',
    'US maloprodaja (avg 2026)': 'US retail sales (Aug 2026)',
    'US ISM predelovalne dejavnosti (okt 2026)': 'US ISM Manufacturing (Oct 2026)',
    'US ADP zaposlovanje (jul 2026)': 'US ADP employment (Jul 2026)',
    'US GDP Q3 2026 (prva ocena)': 'US GDP Q3 2026 (first estimate)',
    'US GDP Q2 2026 (revizija)': 'US GDP Q2 2026 (revision)',
    'Seja FOMC - obrestne mere': 'FOMC meeting: interest rates',
    'EU CPI Flash (sep 2026)': 'EU CPI Flash (Sep 2026)',
    'Jackson Hole symposium (Fed)': 'Jackson Hole symposium (Fed)',
  };
  for (const [sl, en] of Object.entries(primeri)) assert.equal(prevediKoledar(sl, 'en'), en);
});

test('v podatkih ni vrednosti, ki bi v angleščini ostala slovenska', () => {
  const polja = [
    ...podatki.macroEvents.flatMap((e) => [e.title, e.previous, e.forecast, e.actual]),
    ...podatki.earnings.flatMap((e) => [e.prevEps, e.estEps, e.actualEps, e.actualNote]),
  ].filter(Boolean);
  const slabi = [...new Set(polja)].map((b) => [b, prevediKoledar(b, 'en')]).filter(([, en]) => ostaloSlovensko(en));
  assert.deepEqual(slabi, [], 'dodaj prevod v NATANCNO_EN ali vzorec v VZORCI_EN (src/i18n/koledar.ts)');
});
