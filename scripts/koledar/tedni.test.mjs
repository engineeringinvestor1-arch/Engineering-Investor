// Tedni v koledarju tečejo od ponedeljka do nedelje, tudi pri bralcu v Sloveniji.
// Napaka, najdena 6. 10. 2026: ključ tedna je šel skozi toISOString(), ki datum zapiše v UTC. Krajevna
// polnoč v Ljubljani je v UTC še prejšnji dan, zato je naslov tedna kazal "11. okt. – 17. okt."
// (nedelja do sobote) namesto "12. okt. – 18. okt.". Zagon: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

// Časovni pas mora biti nastavljen pred uvozom; na računalniku v UTC se napaka sicer ne pokaže.
process.env.TZ = 'Europe/Ljubljana';
const { parseDate, toDateKey, weekKey, weekLabel } = await import('../../src/lib/koledar-tedni.ts');

test('preizkus teče v ljubljanskem času', () => {
  assert.equal(new Date(2026, 9, 12).getTimezoneOffset(), -120, 'oktobra je Ljubljana na UTC+2');
  assert.equal(new Date(2026, 11, 7).getTimezoneOffset(), -60, 'decembra je Ljubljana na UTC+1');
});

test('ključ tedna je datum ponedeljka', () => {
  const primeri = {
    '2026-10-12': '2026-10-12', // ponedeljek ostane ponedeljek
    '2026-10-14': '2026-10-12', // sreda
    '2026-10-18': '2026-10-12', // nedelja še spada v isti teden
    '2026-10-19': '2026-10-19', // naslednji ponedeljek odpre nov teden
    '2026-12-09': '2026-12-07', // zimski čas (UTC+1)
  };
  for (const [dan, ponedeljek] of Object.entries(primeri)) assert.equal(weekKey(dan), ponedeljek, dan);
});

test('ključ tedna čez mejo meseca in leta', () => {
  assert.equal(weekKey('2026-10-01'), '2026-09-28');
  assert.equal(weekKey('2026-11-01'), '2026-10-26');
  assert.equal(weekKey('2027-01-01'), '2026-12-28');
  assert.equal(weekKey('2027-01-03'), '2026-12-28');
});

test('ključ tedna v tednih, ko se premakne ura', () => {
  // 25. 10. 2026 na zimski čas, 28. 3. 2027 na poletnega; obakrat v nedeljo.
  assert.equal(weekKey('2026-10-25'), '2026-10-19');
  assert.equal(weekKey('2026-10-26'), '2026-10-26');
  assert.equal(weekKey('2027-03-28'), '2027-03-22');
  assert.equal(weekKey('2027-03-29'), '2027-03-29');
});

test('naslov tedna kaže razpon od ponedeljka do nedelje', () => {
  const kljuc = weekKey('2026-10-14');
  assert.match(weekLabel(kljuc, 'sl-SI'), /^12\. okt\.? – 18\. okt\.?$/);
  assert.match(weekLabel(kljuc, 'en-GB'), /^12 Oct – 18 Oct$/);
  // Teden čez mejo meseca in teden, v katerem se premakne ura (nedelja ima 25 ur).
  assert.match(weekLabel(weekKey('2026-10-01'), 'sl-SI'), /^28\. sep\.? – 4\. okt\.?$/);
  assert.match(weekLabel(weekKey('2026-10-22'), 'en-GB'), /^19 Oct – 25 Oct$/);
});

test('ključ dneva se bere nazaj v isti dan', () => {
  for (const dan of ['2026-10-12', '2026-10-25', '2026-12-31', '2027-03-28']) {
    assert.equal(toDateKey(parseDate(dan)), dan);
  }
});
