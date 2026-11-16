// Izid CPI v koledarju. 10. 11. 2026 robot izida za oktober ni vpisal: BLS za oktober 2026 ne objavi medletnih
// stopenj, ker oktobra 2025 zaradi zaprtja zvezne vlade ni zbiral podatkov, FRED pa ima namesto medletne spremembe ".".
// Izid je bil vpisan ročno ob tedenskem pregledu 13. 11. 2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { izidCpi } from './cpi.mjs';

test('CPI z medletno stopnjo ostane v zapisu kot doslej', () => {
  assert.equal(izidCpi({ medletno: 3.42, jedrnaMedletno: 2.55 }), 'CPI 3,4 % medletno; jedrna 2,6 %');
  assert.equal(izidCpi({ medletno: 3.42 }), 'CPI 3,4 % medletno');
});

test('14. 11. 2026: CPI brez medletne stopnje dobi mesečno spremembo, kot jo BLS objavi v naslovu', () => {
  // Oktober 2026 po BLS: +0,4 % mesečno, jedrna +0,3 % (sezonsko prilagojeno).
  assert.equal(izidCpi({ mesecno: 0.39, jedrnaMesecno: 0.27 }), 'CPI +0,4 % mesečno; jedrna +0,3 %; medletne stopnje BLS ni objavil');
  assert.equal(izidCpi({ mesecno: -0.04 }), 'CPI +0,0 % mesečno; medletne stopnje BLS ni objavil');
  assert.equal(izidCpi({ mesecno: -0.21 }), 'CPI -0,2 % mesečno; medletne stopnje BLS ni objavil');
  assert.equal(izidCpi({}), null, 'brez podatkov robot ne vpiše nič');
});
