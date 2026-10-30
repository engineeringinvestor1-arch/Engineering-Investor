// Obratni DCF na strani mora računati enako kot model agenta (scripts/company/obratni-dcf.mjs): isti preizkusi
// zaprtih formul in obratnega računa, ter primer, izračunan z modelom agenta 30. 10. 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vrednost, potrebnaRast, donosScenarija, razred, napaka } from '../../src/lib/obratni-dcf.ts';

const p = { prihodki0: 100, marza0: 20, davek: 20, roic: 25, gT: 3, r: 9 };
const blizu = (a, b, dop, opis) => assert.ok(Math.abs(a - b) <= dop, `${opis}: ${a} namesto ${b}`);

test('brez rasti je vrednost NOPAT deljen z zahtevanim donosom', () => {
  const v = vrednost({ ...p, gT: 0, rast: 0 });
  blizu(v.ev, (100 * 0.2 * 0.8) / 0.09, 1e-6, 'vrednost');
});

test('pri stalni rasti je vrednost denarni tok prvega leta deljen z (r - g)', () => {
  const v = vrednost({ ...p, rast: 3 });
  const fcff1 = 100 * 1.03 * 0.2 * 0.8 * (1 - 3 / 25);
  blizu(v.ev, fcff1 / (0.09 - 0.03), 1e-6, 'vrednost');
});

test('rast ni zastonj: pri ROIC enakem zahtevanemu donosu je vrednost NOPAT prvega leta deljen z donosom', () => {
  for (const rast of [3, 15, 40]) {
    const v = vrednost({ ...p, roic: 9, rast });
    blizu(v.ev, v.leta[0].nopat / 0.09, 1e-6, `rast ${rast} %`);
  }
});

test('neto dolg zmanjša vrednost lastnikov', () => {
  const v = vrednost({ ...p, rast: 10, netoDolg: 50 });
  blizu(v.kapital, v.ev - 50, 1e-9, 'kapital');
});

test('obratni račun se vrne na izhodišče: rast in donos', () => {
  const trzna = vrednost({ ...p, rast: 12, ciljnaMarza: 25, netoDolg: 10 }).kapital;
  blizu(potrebnaRast({ ...p, ciljnaMarza: 25, netoDolg: 10, trzna }), 12, 1e-6, 'rast');
  blizu(donosScenarija({ ...p, rast: 12, ciljnaMarza: 25, netoDolg: 10, trzna }), 9, 1e-6, 'donos');
});

test('če ROIC ne doseže zahtevanega donosa in cena zahteva več, rešitve ni', () => {
  assert.equal(potrebnaRast({ ...p, roic: 8, trzna: 10000 }), null);
});

test('enak izid kot model agenta: Netflix iz analize 21. 10. 2026 (10,9 % pri 9 %, scenarij 10 % in 35 % da 9,3 %)', () => {
  const nf = { trzna: 288.2, netoDolg: 7.1, prihodki0: 51.1, marza0: 31.5, davek: 17.3, roic: 37.7, gT: 2.5 };
  blizu(potrebnaRast({ ...nf, ciljnaMarza: 31.5, r: 9 }), 10.9, 0.05, 'potrebna rast');
  blizu(donosScenarija({ ...nf, rast: 10, ciljnaMarza: 35 }), 9.3, 0.05, 'donos scenarija');
});

test('barva: pod rastjo doslej, do 3 točke nad njo, več', () => {
  assert.deepEqual([razred(9, 10), razred(10, 10), razred(13, 10), razred(13.1, 10), razred(null, 10)], ['ok', 'ok', 'mid', 'hi', 'na']);
});

test('napake vnosa', () => {
  const v = { trzna: 100, netoDolg: 0, prihodki0: 20, marza0: 25, davek: 21, roic: 20, preteklo: 10, r: 9, ciljnaMarza: 25, gT: 2.5 };
  assert.equal(napaka(v), null);
  assert.equal(napaka({ ...v, trzna: Number.NaN }), 'prazno');
  assert.equal(napaka({ ...v, prihodki0: 0 }), 'pozitivno');
  assert.equal(napaka({ ...v, roic: 0 }), 'roic');
  assert.equal(napaka({ ...v, r: 2.5 }), 'donos');
  assert.equal(napaka({ ...v, davek: 100 }), 'davek');
});
