/**
 * Testni podatki za sledilnik (avtor, 3. 10. 2026: "dodaj testne podatke, da vidim, kako zgleda").
 *
 * Naložijo se k obstoječim vnosom in so označeni z demo: true, zato jih je mogoče odstraniti, ne da bi se
 * uporabnikovi vnosi spremenili. Podatki so vedno enaki za isti dan (generator s stalnim semenom), da jih
 * lahko preverjajo preizkusi: tekoči mesec do danes in dva polna meseca prej.
 */

import { findPayee, isoDay, payeesFromTransactions } from './store.js';

const pad2 = (n) => String(n).padStart(2, '0');

// Majhen generator psevdonaključnih števil s semenom (mulberry32): isti vhod, isti podatki.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Redni stroški in prihodek: dan v mesecu, ime, znesek, kategorija.
const FIXED = [
  { key: 'najemnina', day: 1, name: 'Najemnina', amount: 650, cat: 'Stanovanje', type: 'expense' },
  { key: 'fitnes', day: 5, name: 'Fitnes', amount: 35, cat: 'Zdravje', type: 'expense' },
  { key: 'telefon', day: 8, name: 'Telefon in internet', amount: 39.9, cat: 'Računi', type: 'expense' },
  { key: 'placa', day: 10, name: 'Plača', amount: 2150, cat: 'Plača', type: 'income' },
  { key: 'spotify', day: 15, name: 'Spotify', amount: 11.99, cat: 'Računi', type: 'expense' },
];

const GROCERIES = ['Hofer', 'Lidl', 'Mercator', 'Spar', 'Hofer', 'Tuš'];
const FUEL = ['Petrol', 'OMV'];
const OUT = [
  { name: 'Kavarna', min: 3.2, max: 6.5 },
  { name: 'Wolt', min: 11, max: 24 },
  { name: 'Gostilna', min: 18, max: 46 },
  { name: 'Pekarna', min: 2, max: 6 },
];
const MONTHLY = [
  { name: 'Elektro energija', cat: 'Stanovanje', day: 12, min: 62, max: 94 },
  { name: 'Lekarna', cat: 'Zdravje', day: 17, min: 8, max: 30 },
  { name: 'DM', cat: 'Hrana', day: 9, min: 12, max: 35 },
  { name: 'Zara', cat: 'Oblačila', day: 20, min: 30, max: 120 },
  { name: 'Kino', cat: 'Prosti', day: 23, min: 9, max: 18 },
  { name: 'Amazon', cat: 'Drugo', day: 26, min: 15, max: 90 },
  { name: 'Parkirnina', cat: 'Promet', day: 14, min: 2, max: 9 },
];
const BUDGETS = [['Hrana', 450], ['Prosti', 200], ['Promet', 160], ['Oblačila', 80]];

export const hasDemo = (state) => Boolean(state.settings?.demo);

export function demoData(state, today = isoDay()) {
  if (hasDemo(state)) return state;
  const account = state.accounts.find((a) => !a.archived)?.id ?? '';
  const cats = state.categories.filter((c) => !c.archived);
  // Kategorija po začetku imena; če je uporabnik svojo preimenoval ali izbrisal, prva kategorija iste vrste.
  const cat = (prefix, type = 'expense') => (cats.find((c) => c.type === type && c.name.startsWith(prefix)) ?? cats.find((c) => c.type === type))?.id ?? null;

  const [ty, tm] = today.split('-').map(Number);
  const tx = [];
  const add = (date, type, amount, payee, categoryId, extra = {}) => {
    if (date > today) return;
    tx.push({ id: `demo-${tx.length}-${date}`, date, type, amount: Math.round(amount * 100) / 100, accountId: account, transferToAccountId: '', categoryId, payee, notes: '', tags: [], demo: true, ...extra });
  };

  for (const offset of [-2, -1, 0]) {
    const first = new Date(ty, tm - 1 + offset, 1);
    const y = first.getFullYear(), m = first.getMonth() + 1;
    const days = new Date(y, m, 0).getDate();
    const ym = `${y}-${pad2(m)}`;
    const date = (d) => `${ym}-${pad2(Math.min(d, days))}`;
    const rand = rng(y * 100 + m);
    const between = (min, max) => min + rand() * (max - min);

    for (const f of FIXED) add(date(f.day), f.type, f.amount, f.name, cat(f.cat, f.type), { recurringId: `demo-pravilo-${f.key}` });
    for (const item of MONTHLY) add(date(item.day), 'expense', between(item.min, item.max), item.name, cat(item.cat));

    for (let d = 2, i = 0; d <= days; d += 2 + Math.floor(rand() * 3), i++) add(date(d), 'expense', between(12, 78), GROCERIES[i % GROCERIES.length], cat('Hrana'));
    for (let d = 4, i = 0; d <= days; d += 9 + Math.floor(rand() * 4), i++) add(date(d), 'expense', between(48, 66), FUEL[i % FUEL.length], cat('Promet'));
    for (let d = 1; d <= days; d += 2 + Math.floor(rand() * 2)) {
      const place = OUT[Math.floor(rand() * OUT.length)];
      add(date(d), 'expense', between(place.min, place.max), place.name, cat('Prosti'));
    }
    // Nekaj gotovinskih vnosov brez trgovine, kot jih prinese hiter vnos z enim klikom na kategorijo.
    for (let d = 6; d <= days; d += 11) add(date(d), 'expense', between(5, 22), '', cat('Hrana'));
  }

  // Pravila za naprej: naslednji datum je prvi tak dan po današnjem.
  const nextOn = (day) => {
    const thisMonth = `${ty}-${pad2(tm)}-${pad2(Math.min(day, new Date(ty, tm, 0).getDate()))}`;
    if (thisMonth > today) return thisMonth;
    const next = new Date(ty, tm, 1);
    return `${next.getFullYear()}-${pad2(next.getMonth() + 1)}-${pad2(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))}`;
  };
  const recurring = FIXED.map((f) => ({
    id: `demo-pravilo-${f.key}`, name: f.name, type: f.type, amount: f.amount, accountId: account, categoryId: cat(f.cat, f.type),
    frequency: 'monthly', nextDate: nextOn(f.day), anchorDay: f.day, active: true, notes: '', demo: true,
  }));

  const budgets = BUDGETS
    .map(([prefix, limit]) => ({ id: `demo-meja-${prefix}`, categoryId: cat(prefix), monthlyLimit: limit, period: 'monthly', demo: true }))
    .filter((b) => b.categoryId && !state.budgets.some((own) => own.categoryId === b.categoryId));

  // Trgovine, ki jih uporabnik še nima; njegove ostanejo nedotaknjene.
  const payees = payeesFromTransactions(tx)
    .filter((p) => !findPayee(state.payees, p.name, p.type))
    .map((p) => ({ ...p, id: `demo-trgovina-${p.type}-${p.name}`, demo: true }));

  return {
    ...state,
    transactions: [...state.transactions, ...tx],
    recurring: [...(state.recurring ?? []), ...recurring],
    budgets: [...state.budgets, ...budgets],
    payees: [...(state.payees ?? []), ...payees],
    settings: { ...state.settings, demo: true },
  };
}

// Odstrani vse testno; uporabnikovi vnosi, tudi tisti, dodani med preizkusom, ostanejo.
export function removeDemo(state) {
  const own = (list) => (list ?? []).filter((x) => !x.demo);
  const { demo: _demo, ...settings } = state.settings ?? {};
  return {
    ...state,
    transactions: own(state.transactions),
    recurring: own(state.recurring),
    budgets: own(state.budgets),
    payees: own(state.payees),
    settings,
  };
}
