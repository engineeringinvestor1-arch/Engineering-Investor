// Preizkusi testnih podatkov. Poženi: node --test src/components/tracker/

import test from 'node:test';
import assert from 'node:assert/strict';
import { demoData, hasDemo, removeDemo } from './demo.js';
import { reducer } from './reducer.js';
import { freshState, monthOverview, postDueRecurring } from './store.js';

const TODAY = '2026-10-03';
// Uporabnik z enim svojim vnosom in svojo trgovino, kot ga je imel avtor 3. 10. 2026.
const own = () => {
  const s = freshState();
  const hrana = s.categories.find((c) => c.name.startsWith('Hrana')).id;
  return {
    ...s,
    transactions: [{ id: 'moj', date: TODAY, type: 'expense', amount: 20, accountId: s.accounts[0].id, transferToAccountId: '', categoryId: hrana, payee: 'Hofer', notes: '', tags: [] }],
    payees: [{ id: 'p1', name: 'Hofer', type: 'expense', categoryId: hrana, accountId: s.accounts[0].id, count: 1, lastUsed: TODAY, lastAmount: 20 }],
  };
};

test('testni podatki pokrijejo tekoči mesec do danes in dva meseca prej', () => {
  const s = demoData(own(), TODAY);
  const demo = s.transactions.filter((t) => t.demo);
  assert.equal(hasDemo(s), true);
  assert.ok(demo.length > 80, `premalo vnosov: ${demo.length}`);
  assert.ok(demo.every((t) => t.date <= TODAY), 'vnos v prihodnosti');
  assert.deepEqual([...new Set(demo.map((t) => t.date.slice(0, 7)))].sort(), ['2026-08', '2026-09', '2026-10']);
  assert.ok(demo.every((t) => t.categoryId && t.accountId && t.amount > 0));

  // Pregled ima kaj pokazati: prihodek, več kategorij, pet trgovin, mejo proračuna in prihajajoče redne stroške.
  const sept = monthOverview(s, '2026-09', TODAY);
  assert.equal(sept.income, 2150);
  assert.ok(sept.expense > 1200 && sept.expense < 2600, `nenavadna poraba: ${sept.expense}`);
  assert.ok(sept.categories.length >= 6);
  assert.equal(sept.payees.length, 5);
  const okt = monthOverview(s, '2026-10', TODAY);
  assert.ok(okt.compare.prevExpense > 0);
  assert.deepEqual(okt.upcoming.map((u) => u.name), ['Fitnes', 'Telefon in internet', 'Plača', 'Spotify']);
  assert.ok(okt.totalBudget > 0);
});

test('testni podatki so vedno enaki in se ne naložijo dvakrat', () => {
  const a = demoData(own(), TODAY);
  assert.deepEqual(demoData(own(), TODAY).transactions.map((t) => [t.date, t.payee, t.amount]), a.transactions.map((t) => [t.date, t.payee, t.amount]));
  assert.equal(demoData(a, TODAY), a);
});

test('odstranitev testnih podatkov pusti uporabnikove vnose natanko take, kot so bili', () => {
  const before = own();
  const loaded = reducer(before, { type: 'demo/load', today: TODAY });
  // Uporabnikova trgovina ostane njegova, testna Hofer se ne podvoji.
  assert.equal(loaded.payees.filter((p) => p.name === 'Hofer').length, 1);
  assert.equal(loaded.payees.find((p) => p.name === 'Hofer').count, 1);
  assert.deepEqual(reducer(loaded, { type: 'demo/remove' }), before);
});

test('vnos, dodan med preizkusom, po odstranitvi ostane', () => {
  let s = reducer(own(), { type: 'demo/load', today: TODAY });
  const lidl = s.payees.find((p) => p.name === 'Lidl');
  assert.equal(lidl.demo, true);
  s = reducer(s, { type: 'tx/add', tx: { id: 'nov', date: TODAY, type: 'expense', amount: 12, accountId: s.accounts[0].id, categoryId: lidl.categoryId, payee: 'Lidl', notes: '', tags: [] } });
  const after = reducer(s, { type: 'demo/remove' });
  assert.deepEqual(after.transactions.map((t) => t.id), ['moj', 'nov']);
  // Trgovina, v kateri je uporabnik res kupil, ni več samo testna.
  assert.ok(after.payees.some((p) => p.name === 'Lidl'));
  assert.equal(hasDemo(after), false);
});

test('redni strošek iz testnega pravila je tudi sam testni in izgine z njim', () => {
  const s = demoData(own(), TODAY);
  const { state, posted } = postDueRecurring(s, '2026-10-06');
  assert.deepEqual(posted.map((t) => [t.payee, t.demo]), [['Fitnes', true]]);
  assert.deepEqual(removeDemo(state).transactions.map((t) => t.id), ['moj']);
});
