// Preizkusi spomina trgovin in hitrega vnosa. Poženi: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  blockedRecurring, cistoIme, findPayee, freshState, potrebnaKopija, transactionsCsv, MAX_CATCH_UP, nextOccurrence, parseAmount, payeesFromTransactions,
  postDueRecurring, rememberPayee, suggestPayees, topPayees, temaZaPrikaz, BARVA_TEME, stanjeIzShrambe, pregledPripomockov, preklopiPripomocek, PRIPOMOCKI, PRIVZETI_PREGLED,
  categoryBreakdown, cumulativeSpend, dnevnaPoraba, mesecnaPoraba, stopnjePorabe, tedenskaPoraba, monthName, monthOverview, monthTotals, payeeBreakdown, shiftMonth, upcomingRecurring,
} from './store.js';
import { reducer } from './reducer.js';

const tx = (over) => ({ id: 't', type: 'expense', date: '2026-10-03', amount: 23.4, accountId: 'trr', categoryId: 'hrana', payee: 'Hofer', ...over });

test('trgovina se zapomni ob prvi transakciji in naslednjič ve kategorijo', () => {
  let state = { ...freshState(), payees: [] };
  state = reducer(state, { type: 'tx/add', tx: tx() });
  assert.equal(state.payees.length, 1);
  const hofer = findPayee(state.payees, '  HOFER ');
  assert.equal(hofer.name, 'Hofer');
  assert.equal(hofer.categoryId, 'hrana');
  assert.equal(hofer.accountId, 'trr');
  assert.equal(hofer.count, 1);

  // Drugi nakup v isti trgovini je ne podvoji, samo prišteje.
  state = reducer(state, { type: 'tx/add', tx: tx({ id: 't2', payee: 'hofer', amount: 8, date: '2026-10-04' }) });
  assert.equal(state.payees.length, 1);
  assert.equal(state.payees[0].count, 2);
  assert.equal(state.payees[0].lastAmount, 8);
  assert.equal(state.payees[0].name, 'Hofer', 'ime ostane, kot je bilo vpisano prvič');
});

test('popravek kategorije popravi tudi spomin, a nakupa ne šteje dvakrat', () => {
  let state = reducer({ ...freshState(), payees: [] }, { type: 'tx/add', tx: tx({ payee: 'Petrol', categoryId: 'hrana' }) });
  state = reducer(state, { type: 'tx/update', tx: tx({ payee: 'Petrol', categoryId: 'promet' }) });
  assert.equal(state.payees[0].categoryId, 'promet');
  assert.equal(state.payees[0].count, 1);
});

test('vnos za nazaj ne povozi novejše kategorije', () => {
  let payees = rememberPayee([], tx({ date: '2026-10-03', categoryId: 'hrana' }));
  payees = rememberPayee(payees, tx({ date: '2026-09-01', categoryId: 'drugo' }));
  assert.equal(payees[0].categoryId, 'hrana');
  assert.equal(payees[0].lastUsed, '2026-10-03');
  assert.equal(payees[0].count, 2);
});

test('prenos, redni strošek in transakcija brez trgovine se ne zapomnijo; prihodek je ločen od odhodka', () => {
  let payees = rememberPayee([], tx({ type: 'transfer' }));
  payees = rememberPayee(payees, tx({ payee: '   ' }));
  payees = rememberPayee(payees, tx({ payee: 'Najemnina', recurringId: 'r1' }));
  assert.deepEqual(payees, []);
  payees = rememberPayee(payees, tx({ type: 'income', payee: 'Acme', categoryId: 'placa' }));
  payees = rememberPayee(payees, tx({ payee: 'Acme', categoryId: 'drugo' }));
  assert.equal(payees.length, 2);
  assert.equal(findPayee(payees, 'acme', 'income').categoryId, 'placa');
  assert.equal(findPayee(payees, 'acme', 'expense').categoryId, 'drugo');
});

test('pogoste trgovine in predlogi med tipkanjem', () => {
  const payees = payeesFromTransactions([
    tx({ payee: 'Hofer', date: '2026-09-01' }), tx({ payee: 'Hofer', date: '2026-09-08' }), tx({ payee: 'Hofer', date: '2026-09-15' }),
    tx({ payee: 'Petrol', date: '2026-09-20', categoryId: 'promet' }),
    tx({ payee: 'Lidl', date: '2026-09-25' }),
    tx({ payee: 'Hotel Union', date: '2026-08-01', categoryId: 'prosti' }),
    tx({ payee: 'Plača', type: 'income', date: '2026-09-10', categoryId: 'placa' }),
  ]);
  assert.deepEqual(topPayees(payees, 'expense', 3).map((p) => p.name), ['Hofer', 'Lidl', 'Petrol']);
  assert.deepEqual(topPayees(payees, 'income').map((p) => p.name), ['Plača']);
  assert.deepEqual(suggestPayees(payees, 'expense', 'ho').map((p) => p.name), ['Hofer', 'Hotel Union']);
  assert.deepEqual(suggestPayees(payees, 'expense', 'tro').map((p) => p.name), ['Petrol']);
  assert.deepEqual(suggestPayees(payees, 'expense', ' '), []);
});

test('uvožena kopija brez seznama trgovin ga dobi iz zgodovine', () => {
  const old = { ...freshState(), transactions: [tx(), tx({ id: 't2', payee: 'Lidl' })] };
  delete old.payees;
  const state = reducer(freshState(), { type: 'state/replace', state: old });
  assert.deepEqual(state.payees.map((p) => p.name).sort(), ['Hofer', 'Lidl']);
});

test('znesek: slovenski in angleški zapis, brez ugibanja', () => {
  assert.equal(parseAmount('12,5'), 12.5);
  assert.equal(parseAmount('12.50'), 12.5);
  assert.equal(parseAmount('1.234,56'), 1234.56);
  assert.equal(parseAmount(' 7 € '), 7);
  for (const bad of ['', 'abc', '0', '-5', '12,555', '1.234', '1,2,3']) assert.equal(parseAmount(bad), null, bad);
});

/* ---------- redni stroški ---------- */

const rule = (over) => ({ id: 'r1', name: 'Najemnina', type: 'expense', amount: 500, accountId: 'trr', categoryId: 'stan', frequency: 'monthly', nextDate: '2026-08-01', active: true, ...over });
const withRules = (...rules) => ({ ...freshState(), accounts: [{ id: 'trr', name: 'TRR', type: 'checking', startingBalance: 0 }], payees: [], recurring: rules });

test('naslednji datum: mesečno pravilo se drži svojega dne tudi čez krajše mesece', () => {
  const r = rule({ anchorDay: 31 });
  assert.equal(nextOccurrence(r, '2027-01-31'), '2027-02-28');
  assert.equal(nextOccurrence(r, '2027-02-28'), '2027-03-31');
  assert.equal(nextOccurrence(r, '2027-03-31'), '2027-04-30');
  assert.equal(nextOccurrence(rule({ anchorDay: 15 }), '2026-12-15'), '2027-01-15');
  assert.equal(nextOccurrence(rule({ frequency: 'weekly' }), '2026-12-28'), '2027-01-04');
  assert.equal(nextOccurrence(rule({ frequency: 'yearly', anchorDay: 29 }), '2028-02-29'), '2029-02-28');
});

test('zapadli redni stroški se vpišejo sami, tudi zamujeni meseci, in pravilo se premakne naprej', () => {
  const start = withRules(rule(), rule({ id: 'r2', name: 'Spotify', amount: 9.99, nextDate: '2026-10-03', categoryId: 'narocnine' }));
  const state = reducer(start, { type: 'recurring/run', today: '2026-10-03' });

  assert.deepEqual(state.transactions.map((t) => [t.date, t.payee, t.amount]), [
    ['2026-08-01', 'Najemnina', 500], ['2026-09-01', 'Najemnina', 500], ['2026-10-01', 'Najemnina', 500],
    ['2026-10-03', 'Spotify', 9.99],
  ]);
  assert.ok(state.transactions.every((t) => t.type === 'expense' && t.accountId === 'trr' && t.recurringId));
  assert.deepEqual(state.recurring.map((r) => r.nextDate), ['2026-11-01', '2026-11-03']);
  // Redni stroški ne gredo med pogoste trgovine hitrega vnosa.
  assert.deepEqual(state.payees, []);

  // Drugi zagon isti dan ne vpiše ničesar in vrne isto stanje.
  assert.equal(reducer(state, { type: 'recurring/run', today: '2026-10-03' }), state);
});

test('prihodnje pravilo, pavza in pravilo brez računa se ne vpišejo', () => {
  const start = withRules(
    rule({ nextDate: '2026-11-01' }),
    rule({ id: 'r2', active: false }),
    rule({ id: 'r3', name: 'Zavarovanje', accountId: 'izbrisan' }),
    rule({ id: 'r4', name: 'Nič', amount: 0 }),
  );
  assert.equal(reducer(start, { type: 'recurring/run', today: '2026-10-03' }), start);
  // Kar je zapadlo, a se ne da vpisati, pogled pokaže z razlogom.
  assert.deepEqual(blockedRecurring(start, '2026-10-03').map((r) => r.name), ['Zavarovanje', 'Nič']);
});

test('napačno vpisano leto ne zasuje sledilnika: največ MAX_CATCH_UP vpisov na pravilo', () => {
  const { state, posted } = postDueRecurring(withRules(rule({ frequency: 'weekly', nextDate: '2020-01-06' })), '2026-10-03');
  assert.equal(posted.length, MAX_CATCH_UP);
  assert.ok(state.recurring[0].nextDate > '2026-10-03');
});

/* ---------- pregled meseca ---------- */

const pregled = () => ({
  ...freshState(),
  accounts: [{ id: 'trr', name: 'TRR', type: 'checking', startingBalance: 0 }],
  categories: [
    { id: 'hrana', name: 'Hrana', type: 'expense', color: '#d97706' },
    { id: 'stan', name: 'Stanovanje', type: 'expense', color: '#2563eb' },
    { id: 'placa', name: 'Plača', type: 'income', color: '#059669' },
  ],
  budgets: [{ id: 'b1', categoryId: 'hrana', monthlyLimit: 300 }],
  payees: [],
  transactions: [
    tx({ id: 'a', date: '2026-09-01', amount: 500, payee: 'Najemnina', categoryId: 'stan', recurringId: 'r1' }),
    tx({ id: 'b', date: '2026-09-02', amount: 40, payee: 'Hofer' }),
    tx({ id: 'c', date: '2026-09-20', amount: 60, payee: 'Lidl' }),
    tx({ id: 'd', date: '2026-10-01', amount: 500, payee: 'Najemnina', categoryId: 'stan', recurringId: 'r1' }),
    tx({ id: 'e', date: '2026-10-02', amount: 25, payee: 'Hofer' }),
    tx({ id: 'f', date: '2026-10-03', amount: 15.5, payee: 'hofer' }),
    tx({ id: 'g', date: '2026-10-03', amount: 9, payee: '' }),
    tx({ id: 'h', date: '2026-10-03', amount: 2000, type: 'income', payee: 'Acme', categoryId: 'placa' }),
    tx({ id: 'i', date: '2026-10-03', amount: 300, type: 'transfer', payee: '' }),
  ],
  recurring: [
    rule({ id: 'r1', nextDate: '2026-11-01', anchorDay: 1 }),
    rule({ id: 'r2', name: 'Spotify', amount: 9.99, nextDate: '2026-10-15', anchorDay: 15 }),
    rule({ id: 'r3', name: 'Telovadba', amount: 12, frequency: 'weekly', nextDate: '2026-10-05' }),
    rule({ id: 'r4', name: 'Pavza', amount: 99, nextDate: '2026-10-10', active: false }),
  ],
});

test('mesec: imena, premik in vsote brez prenosov', () => {
  assert.equal(monthName('2026-10'), 'oktober');
  assert.equal(monthName('2026-09', 'gen'), 'septembra');
  assert.equal(monthName('2026-10', 'loc'), 'oktobru');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.deepEqual(monthTotals(pregled().transactions, '2026-10'), { expense: 549.5, income: 2000 });
  assert.deepEqual(monthTotals(pregled().transactions, '2026-10', 2), { expense: 525, income: 0 });
  assert.deepEqual(cumulativeSpend(pregled().transactions, '2026-10', 3), [500, 525, 549.5]);
});

test('pregled tekočega meseca se primerja s prejšnjim do istega dne', () => {
  const o = monthOverview(pregled(), '2026-10', '2026-10-03');
  assert.equal(o.isCurrent, true);
  assert.equal(o.expense, 549.5);
  assert.equal(o.income, 2000);
  assert.equal(o.net, 1450.5);
  // Do 3. septembra je bilo porabljenih 540, ne 600 kot v celem septembru.
  assert.deepEqual([o.compare.basis, o.compare.day, o.compare.prevExpense], ['toDate', 3, 540]);
  assert.equal(Math.round(o.compare.pct * 10) / 10, 1.8);
  assert.equal(o.current.length, 3);
  assert.equal(o.previous.length, 30);
  assert.equal(o.previous.at(-1), 600);
  assert.equal(o.count, 5, 'prenos ni vnos porabe');
});

test('pregled preteklega meseca se primerja s celim mesecem prej in nima prihajajočih stroškov', () => {
  const o = monthOverview(pregled(), '2026-09', '2026-10-03');
  assert.equal(o.isCurrent, false);
  assert.equal(o.lastDay, 30);
  assert.deepEqual([o.compare.basis, o.compare.prevExpense, o.compare.pct], ['full', 0, null]);
  assert.deepEqual(o.upcoming, []);
});

test('za kaj in kje: kategorije z deležem in mejo, trgovine brez rednih stroškov', () => {
  const cats = categoryBreakdown(pregled(), '2026-10');
  assert.deepEqual(cats.map((c) => [c.name, c.value, c.count, c.limit]), [['Stanovanje', 500, 1, 0], ['Hrana', 49.5, 3, 300]]);
  assert.equal(Math.round(cats[0].share * 1000), 910);
  // "Hofer" in "hofer" sta ista trgovina; najemnina je redni strošek, vnos brez trgovine se ne šteje.
  assert.deepEqual(payeeBreakdown(pregled().transactions, '2026-10'), [{ name: 'Hofer', value: 40.5, count: 2 }]);
});

test('še pride ta mesec: redni stroški po današnjem dnevu do konca meseca', () => {
  const up = upcomingRecurring(pregled(), '2026-10-03', '2026-10-31');
  assert.deepEqual(up.map((x) => [x.date, x.name]), [
    ['2026-10-05', 'Telovadba'], ['2026-10-12', 'Telovadba'], ['2026-10-15', 'Spotify'], ['2026-10-19', 'Telovadba'], ['2026-10-26', 'Telovadba'],
  ]);
  const o = monthOverview(pregled(), '2026-10', '2026-10-03');
  assert.equal(Math.round(o.upcomingExpense * 100) / 100, 57.99);
  assert.equal(o.totalBudget, 300);
});

test('izvoz za Excel: podpičje, decimalna vejica, odhodek z minusom, narekovaji okrog podpičja', () => {
  const state = { ...freshState(), transactions: [
    tx({ id: 'a', date: '2026-10-02', amount: 23.4, payee: 'Hofer' }),
    tx({ id: 'b', date: '2026-10-03', type: 'income', amount: 1500, payee: 'Plača', categoryId: 'placa', notes: 'oktober; z dodatkom' }),
  ] };
  const vrstice = transactionsCsv(state).split('\r\n');
  assert.equal(vrstice[0], 'Datum;Vrsta;Trgovina ali plačnik;Kategorija;Račun;Znesek (EUR);Opomba');
  assert.match(vrstice[1], /^2026-10-03;Prihodek;Plača;[^;]*;[^;]*;1500;"oktober; z dodatkom"$/);
  assert.match(vrstice[2], /^2026-10-02;Odhodek;Hofer;[^;]*;[^;]*;-23,4;$/);
  assert.equal(transactionsCsv(freshState()), null);
});

test('opomnik za varnostno kopijo: ob prvem vnosu in po tednu dni brez kopije', () => {
  const prazno = freshState();
  const zVnosom = { ...freshState(), transactions: [tx()] };
  assert.equal(potrebnaKopija(prazno, null, '2026-10-18'), false, 'brez vnosov ni kaj shraniti');
  assert.equal(potrebnaKopija({ ...freshState(), transactions: [tx({ demo: true })] }, null, '2026-10-18'), false, 'testni podatki ne štejejo');
  assert.equal(potrebnaKopija(zVnosom, null, '2026-10-18'), true);
  assert.equal(potrebnaKopija(zVnosom, '2026-10-12', '2026-10-18'), false);
  assert.equal(potrebnaKopija(zVnosom, '2026-10-11', '2026-10-18'), true);
});

// Najdeno 18. 10. 2026: preimenovanje trgovine v Nastavitvah je imelo /s+/g namesto /\s+/g in je vsako
// malo črko "s" zamenjalo s presledkom ("Lekarna Moste" je postala "Lekarna Mo te").
test('18. 10. 2026: čisto ime trgovine ohrani črke s in strne presledke', () => {
  assert.equal(cistoIme('  Lekarna   Moste '), 'Lekarna Moste');
  assert.equal(cistoIme('Spar\tSupermarket'), 'Spar Supermarket');
  assert.equal(cistoIme(''), '');
  assert.equal(cistoIme(undefined), '');
});

test('koledar porabe: odhodki po dnevih meseca, brez prihodkov, prenosov in drugih mesecev', () => {
  const dni = dnevnaPoraba([
    tx({ date: '2026-10-03', amount: 10 }), tx({ date: '2026-10-03', amount: 2.5 }), tx({ date: '2026-10-05', amount: 7 }),
    tx({ date: '2026-10-05', type: 'income', amount: 1000 }), tx({ date: '2026-10-06', type: 'transfer', amount: 300 }),
    tx({ date: '2026-09-30', amount: 99 }),
  ], '2026-10');
  assert.equal(dni.length, 31);
  assert.equal(dni[2], 12.5);
  assert.equal(dni[4], 7);
  assert.equal(dni[5], 0);
  assert.equal(dni.reduce((s, v) => s + v, 0), 19.5);
});

test('stopnje barve v koledarju: četrtine dni s porabo, en velik strošek ne zatemni ostalih', () => {
  assert.deepEqual(stopnjePorabe([0, 10, 20, 30, 40]), [0, 1, 2, 3, 4]);
  assert.deepEqual(stopnjePorabe([650, 10, 12, 15, 0]), [4, 1, 2, 3, 0], 'najemnina je najtemnejša, drugi dnevi ostanejo ločeni');
  assert.deepEqual(stopnjePorabe([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(stopnjePorabe([0, 25, 25]), [0, 2, 2], 'enaki zneski dobijo srednjo stopnjo');
});

test('tedni v mesecu: od ponedeljka do nedelje, robna tedna obrezana na mesec', () => {
  // 1. 10. 2026 je četrtek, 31. 10. 2026 sobota.
  const tedni = tedenskaPoraba([tx({ date: '2026-10-02', amount: 20 }), tx({ date: '2026-10-05', amount: 5 }), tx({ date: '2026-10-31', amount: 8 })], '2026-10');
  assert.deepEqual(tedni.map((t) => [t.od, t.do, t.dni]), [[1, 4, 4], [5, 11, 7], [12, 18, 7], [19, 25, 7], [26, 31, 6]]);
  assert.deepEqual(tedni.map((t) => t.value), [20, 5, 0, 0, 8]);
});

test('meseci za primerjavo: zadnjih n mesecev do izbranega, od najstarejšega', () => {
  const meseci = mesecnaPoraba([tx({ date: '2026-08-10', amount: 100 }), tx({ date: '2026-10-01', amount: 40 }), tx({ date: '2026-10-02', type: 'income', amount: 900 })], '2026-10', 3);
  assert.deepEqual(meseci, [{ ym: '2026-08', value: 100 }, { ym: '2026-09', value: 0 }, { ym: '2026-10', value: 40 }]);
});

// Avtor, 19. 10. 2026: "Ker sem v aplikacijo že vpisoval številke, pri posodobitvi nočem, da se mi vse izbriše."
test('posodobitev ohrani shranjene vnose: stari zapis brez izbire pregleda dobi privzeto izbiro', () => {
  const star = { ...freshState(), transactions: [tx(), tx({ id: 't2', amount: 8 })], settings: { currency: 'EUR', locale: 'sl-SI', firstDayOfMonth: 1, onboarded: true } };
  delete star.payees;
  const nalozen = stanjeIzShrambe(JSON.stringify(star));
  assert.equal(nalozen.transactions.length, 2);
  assert.deepEqual(nalozen.transactions.map((t) => t.id), ['t', 't2']);
  assert.equal(nalozen.settings.onboarded, true, 'obstoječe nastavitve ostanejo');
  assert.deepEqual(pregledPripomockov(nalozen.settings), PRIVZETI_PREGLED);
  assert.equal(nalozen.payees.length, 1, 'trgovine se sestavijo iz vnosov');
  assert.equal(stanjeIzShrambe('ni json').transactions.length, 0, 'pokvarjen zapis da prazno stanje, ne napake');
  assert.equal(stanjeIzShrambe(null).transactions.length, 0);
});

test('pripomočki na pregledu: vklop in izklop v stalnem vrstnem redu, neznani se izpustijo', () => {
  assert.deepEqual(pregledPripomockov({ pregled: ['zadnji', 'neobstojec', 'poraba'] }), ['poraba', 'zadnji']);
  assert.deepEqual(pregledPripomockov({ pregled: [] }), [], 'prazen pregled je dovoljen');
  assert.deepEqual(pregledPripomockov({}), PRIVZETI_PREGLED);
  const z = preklopiPripomocek(['poraba', 'zadnji'], 'koledar');
  assert.deepEqual(z, ['poraba', 'zadnji', 'koledar']);
  assert.deepEqual(preklopiPripomocek(z, 'poraba'), ['zadnji', 'koledar']);
  assert.ok(PRIVZETI_PREGLED.every((id) => PRIPOMOCKI.includes(id)));
});

test('tema aplikacije: svetla in temna veljata vedno, sistemska sledi telefonu, brez izbire velja tema strani', () => {
  assert.equal(temaZaPrikaz('light', 'dark', true), 'light');
  assert.equal(temaZaPrikaz('dark', 'light', false), 'dark');
  assert.equal(temaZaPrikaz('system', 'light', true), 'dark', 'sistemska prezre temo strani');
  assert.equal(temaZaPrikaz('system', null, false), 'light');
  assert.equal(temaZaPrikaz(null, 'dark', false), 'dark', 'brez izbire kot doslej: tema strani');
  assert.equal(temaZaPrikaz(null, null, true), 'dark');
  assert.equal(temaZaPrikaz('neznano', null, false), 'light');
});

test('svetla tema aplikacije je bela, ne kremasta kot stran', () => {
  // Avtor, 21. 10. 2026: "ko dam na svetlo temo je aplikacija sivkasta". Stran ima podlago #F4F2EC.
  const beri = (pot) => readFileSync(new URL(pot, import.meta.url), 'utf8');
  assert.equal(BARVA_TEME.light, '#FFFFFF');
  const css = beri('./sledilnik.css');
  assert.match(css, /html\[data-theme='light'\] \{[^}]*--color-bg: #FFFFFF;/, 'podlaga aplikacije');
  assert.match(css, /html\[data-theme='light'\] \{[^}]*--color-surface: #FFFFFF;/, 'ploskve aplikacije');
  assert.ok(beri('../../pages/aplikacija/index.astro').includes(`<meta name="theme-color" content="${BARVA_TEME.light}" media="(prefers-color-scheme: light)" />`), 'vrstica telefona ob odprtju');
  assert.equal(JSON.parse(beri('../../../public/aplikacija/manifest.webmanifest')).background_color, BARVA_TEME.light, 'zaslon ob zagonu');
});
