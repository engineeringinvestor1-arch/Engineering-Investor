// Preizkus pravil za skrite osnutke analiz (scripts/clanki/preveri-osnutke.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { najdbeOsnutka, omenjaOsnutek } from './preveri-osnutke.mjs';

const NOINDEX = '<head><meta name="robots" content="noindex, nofollow"></head>';

test('osnutek z noindex in dolgim naključnim delom je v redu', () => {
  assert.deepEqual(najdbeOsnutka('uber-analiza-2026-11-04-xnmtlxq4dmz4k5uqg7s', NOINDEX), []);
});

test('osnutek brez noindex je napaka', () => {
  assert.deepEqual(najdbeOsnutka('uber-analiza-2026-11-04-xnmtlxq4dmz4k5uqg7s', '<head></head>'), ['manjka noindex']);
});

test('osnutek s kratkim naključnim delom je napaka', () => {
  assert.equal(najdbeOsnutka('uber-analiza-2026-11-04-abc123', NOINDEX).length, 1);
});

test('povezava na osnutek v zemljevidu strani ali na drugi strani je napaka', () => {
  assert.equal(omenjaOsnutek('<loc>https://engineering-investor.com/osnutek/x/</loc>'), true);
  assert.equal(omenjaOsnutek('<a href="/analize/uber-analiza-2026-09-23/">'), false);
});
