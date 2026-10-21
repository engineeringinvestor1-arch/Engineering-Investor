/**
 * Money tracker — local storage store, types and helpers.
 * All amounts are EUR, stored as numbers (use cents-precision when needed).
 */

const STORAGE_KEY = 'ei-tracker-v1';

export const ACCOUNT_TYPES = [
  { id: 'checking',   label: 'TRR / tekoči račun' },
  { id: 'savings',    label: 'Varčevalni račun' },
  { id: 'cash',       label: 'Gotovina' },
  { id: 'card',       label: 'Kreditna kartica' },
  { id: 'investment', label: 'Naložbeni račun' },
  { id: 'loan',       label: 'Posojilo / hipoteka' },
];

export const ACCOUNT_TYPE_LABEL = Object.fromEntries(ACCOUNT_TYPES.map((t) => [t.id, t.label]));

export const PALETTE = [
  '#2563eb', '#059669', '#d97706', '#db2777', '#a855f7',
  '#0891b2', '#dc2626', '#65a30d', '#ea580c', '#7c3aed',
  '#0d9488', '#ca8a04', '#e11d48', '#16a34a', '#4f46e5',
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Plača', color: '#059669' },
  { name: 'Honorar / s.p.', color: '#16a34a' },
  { name: 'Dividende & obresti', color: '#65a30d' },
  { name: 'Najemnina', color: '#0d9488' },
  { name: 'Drugi prihodki', color: '#0891b2' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Stanovanje',         color: '#2563eb' },
  { name: 'Hrana & gospodinjstvo', color: '#d97706' },
  { name: 'Promet',             color: '#dc2626' },
  { name: 'Računi & naročnine', color: '#7c3aed' },
  { name: 'Zdravje',            color: '#db2777' },
  { name: 'Prosti čas',         color: '#a855f7' },
  { name: 'Oblačila',           color: '#ea580c' },
  { name: 'Izobraževanje',      color: '#4f46e5' },
  { name: 'Davki & prispevki',  color: '#e11d48' },
  { name: 'Naložbe',            color: '#059669' },
  { name: 'Drugo',              color: '#64748b' },
];

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function freshState() {
  const today = new Date().toISOString().slice(0, 10);
  const accounts = [
    { id: uid(), name: 'TRR',       type: 'checking', startingBalance: 0, color: '#2563eb', archived: false, createdAt: today },
    { id: uid(), name: 'Varčevanje', type: 'savings',  startingBalance: 0, color: '#059669', archived: false, createdAt: today },
    { id: uid(), name: 'Gotovina',  type: 'cash',     startingBalance: 0, color: '#d97706', archived: false, createdAt: today },
  ];
  const categories = [
    ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ id: uid(), type: 'income',  archived: false, ...c })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ id: uid(), type: 'expense', archived: false, ...c })),
  ];
  return {
    version: 1,
    accounts,
    categories,
    transactions: [],
    payees: [],
    budgets: [],
    goals: [],
    recurring: [],
    settings: {
      currency: 'EUR',
      locale: 'sl-SI',
      firstDayOfMonth: 1,
      onboarded: false,
    },
  };
}

export function loadState() {
  if (typeof window === 'undefined') return freshState();
  try {
    return stanjeIzShrambe(localStorage.getItem(STORAGE_KEY));
  } catch {
    return freshState();
  }
}

// Shranjeni zapis v stanje. Nova polja dobijo privzete vrednosti, obstoječi vnosi ostanejo, kot so bili
// (avtor, 19. 10. 2026: posodobitev aplikacije ne sme izbrisati vpisanega). Preizkus v store.test.js.
export function stanjeIzShrambe(raw) {
  if (!raw) return freshState();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return freshState(); }
  if (!parsed || parsed.version !== 1) return freshState();
  return withPayees({
    ...freshState(),
    ...parsed,
    settings: { ...freshState().settings, ...(parsed.settings || {}) },
  }, parsed.payees);
}

// Pripomočki na pregledu (avtor, 19. 10. 2026: "kot widgeti na Androidu"). Vrstni red na pregledu je ta;
// prvih šest je dosedanji pregled in so izbrani, dokler uporabnik izbire ne spremeni (settings.pregled).
export const PRIPOMOCKI = ['poraba', 'stevilke', 'skozi-mesec', 'kategorije', 'trgovine', 'zadnji', 'koledar', 'tedni', 'meseci', 'razporeditev', 'proracun', 'cilji', 'redni', 'racuni'];
export const PRIVZETI_PREGLED = PRIPOMOCKI.slice(0, 6);

export function pregledPripomockov(settings) {
  const izbira = settings?.pregled;
  if (!Array.isArray(izbira)) return PRIVZETI_PREGLED;
  return PRIPOMOCKI.filter((id) => izbira.includes(id));
}

// Tema aplikacije (avtor, 19. 10. 2026): svetla, temna ali sistemska (kot telefon). Dokler je uporabnik ne
// izbere, velja kot doslej tema strani, sicer telefon. Ista pravila ima zagonski skript v aplikacija/index.astro.
export function temaZaPrikaz(izbira, temaStrani, sistemTemna) {
  if (izbira === 'light' || izbira === 'dark') return izbira;
  if (izbira !== 'system' && (temaStrani === 'light' || temaStrani === 'dark')) return temaStrani;
  return sistemTemna ? 'dark' : 'light';
}

// Barva podlage v vsaki temi: vrstica telefona nad aplikacijo (tema.js) in zaslon ob zagonu (manifest).
// Svetla je bela, ne kremasta kot stran (avtor, 21. 10. 2026: "ko dam na svetlo temo je aplikacija sivkasta").
export const BARVA_TEME = { light: '#FFFFFF', dark: '#0E0E0E' };

export function preklopiPripomocek(izbira, id) {
  const nova = izbira.includes(id) ? izbira.filter((x) => x !== id) : [...izbira, id];
  return PRIPOMOCKI.filter((x) => nova.includes(x));
}

export function saveState(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('saveState failed', e);
  }
}

// Listi za izvoz v Excel kot navadni podatki, da jih preverjajo preizkusi brez brskalnika.
// Do 3. 10. 2026 je izvoz bral polja, ki ne obstajajo: opombo iz t.note (pravilno t.notes) in mejo proračuna
// iz b.limit (pravilno b.monthlyLimit), zato sta bila stolpca prazna; trgovine sploh ni izvozil.
export function excelSheets(state) {
  const catById = Object.fromEntries(state.categories.map((c) => [c.id, c]));
  const accById = Object.fromEntries(state.accounts.map((a) => [a.id, a.name]));
  const vrsta = (type) => (type === 'income' ? 'Prihodek' : type === 'expense' ? 'Odhodek' : 'Prenos');
  const pogostost = { monthly: 'Mesečno', weekly: 'Tedensko', yearly: 'Letno' };

  const transakcije = [...state.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => ({
      Datum: t.date,
      Vrsta: vrsta(t.type),
      'Trgovina ali plačnik': t.payee ?? '',
      Kategorija: catById[t.categoryId]?.name ?? '',
      Račun: t.type === 'transfer' ? `${accById[t.accountId] ?? ''} → ${accById[t.transferToAccountId] ?? ''}` : accById[t.accountId] ?? '',
      'Znesek (EUR)': t.type === 'expense' ? -Math.abs(Number(t.amount)) : Number(t.amount),
      Opomba: t.notes ?? '',
    }));

  const racuni = state.accounts
    .filter((a) => !a.archived)
    .map((a) => ({
      Račun: a.name,
      Vrsta: ACCOUNT_TYPE_LABEL[a.type] ?? a.type,
      'Začetno stanje (EUR)': Number(a.startingBalance) || 0,
      'Trenutno stanje (EUR)': Math.round(accountBalance(state, a.id) * 100) / 100,
    }));

  const proracun = state.budgets.map((b) => ({
    Kategorija: catById[b.categoryId]?.name ?? '',
    'Mesečna meja (EUR)': Number(b.monthlyLimit) || 0,
  }));

  const redni = (state.recurring ?? []).map((r) => ({
    Ime: r.name,
    Vrsta: vrsta(r.type),
    'Znesek (EUR)': Number(r.amount) || 0,
    Pogostost: pogostost[r.frequency] ?? r.frequency,
    'Naslednji vpis': r.nextDate ?? '',
    Kategorija: catById[r.categoryId]?.name ?? '',
    Račun: accById[r.accountId] ?? '',
    Stanje: r.active ? 'Aktivno' : 'Pavza',
  }));

  return [
    { name: 'Transakcije', rows: transakcije },
    { name: 'Računi', rows: racuni },
    { name: 'Proračun', rows: proracun },
    { name: 'Redni stroški', rows: redni },
  ].filter((sheet) => sheet.rows.length > 0);
}

// Izvoz za Excel kot CSV (aplikacija na telefonu, 18. 10. 2026). Prej je bila to datoteka .xlsx s knjižnico xlsx,
// ki je v različici z npm imela znane ranljivosti in je za izvoz ene preglednice odveč. Slovenski Excel pričakuje
// podpičje in decimalno vejico; oznaka BOM na začetku poskrbi, da Excel prav prebere šumnike.
const celica = (v) => {
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function transactionsCsv(state) {
  const sheet = excelSheets(state).find((s) => s.name === 'Transakcije');
  if (!sheet) return null;
  const glava = Object.keys(sheet.rows[0]);
  return [glava, ...sheet.rows.map((r) => glava.map((h) => r[h]))].map((vrstica) => vrstica.map(celica).join(';')).join('\r\n');
}

function prenesi(blob, ime) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ime;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

// Vrne null ob uspehu ali sporočilo napake.
export function exportCsv(state) {
  const csv = transactionsCsv(state);
  if (!csv) return 'Ni še nobenega vnosa za izvoz.';
  prenesi(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `sledilnik-${todayIso()}.csv`);
  return null;
}

export function exportJson(state) {
  prenesi(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), `sledilnik-${todayIso()}.json`);
  zapisiKopijo();
}

// Varnostna kopija. V aplikaciji na telefonu so podatki samo na napravi: izbrisani podatki brskalnika ali
// izgubljen telefon pomenijo izgubljene vnose. Opomnik se pokaže, ko kopije ni bilo že teden dni.
const KOPIJA_KEY = 'sledilnik-zadnja-kopija';
export const DNI_DO_OPOMNIKA = 7;

export function zadnjaKopija() {
  try { return localStorage.getItem(KOPIJA_KEY); } catch { return null; }
}

export function zapisiKopijo(iso = todayIso()) {
  try { localStorage.setItem(KOPIJA_KEY, iso); } catch { /* zasebno okno: opomnik ostane */ }
}

// Ali je čas za kopijo: vnosi obstajajo, kopije pa ni ali je starejša od DNI_DO_OPOMNIKA dni.
export function potrebnaKopija(state, zadnja, danes = todayIso()) {
  if (!state.transactions.some((t) => !t.demo)) return false;
  if (!zadnja) return true;
  const dni = Math.round((Date.parse(`${danes}T00:00:00Z`) - Date.parse(`${zadnja}T00:00:00Z`)) / 86_400_000);
  return dni >= DNI_DO_OPOMNIKA;
}

export function importJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || data.version !== 1) throw new Error('Nezdružljiva datoteka');
        resolve(data);
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/* ---------- trgovine in storitve ---------- */

// Avtor, 3. 10. 2026: "ko enkrat dodaš trgovino ali storitev vse ti shrani in naslednjič jo lahko kar izbereš
// in takoj ve da npr. Hofer je za hrano". Trgovina se zapomni ob prvi transakciji; naslednjič zadošča
// znesek in en klik nanjo. Velja zadnja izbrana kategorija: če jo uporabnik popravi, se popravi tudi spomin.

// "  HOFER " in "Hofer" sta ista trgovina.
export const payeeKey = (name) => String(name ?? '').trim().toLocaleLowerCase('sl-SI').replace(/\s+/g, ' ');

// Ime, kot se shrani: brez presledkov na robovih, notranji strnjeni v enega.
export const cistoIme = (name) => String(name ?? '').trim().replace(/\s+/g, ' ');

export function findPayee(payees, name, type = 'expense') {
  const key = payeeKey(name);
  if (!key) return null;
  return (payees ?? []).find((p) => p.type === type && payeeKey(p.name) === key) ?? null;
}

// Vrne nov seznam trgovin po shranjeni transakciji. Prenos med računi ni nakup in se ne zapomni.
// count: false pri popravku obstoječe transakcije, da se ista ne šteje dvakrat.
export function rememberPayee(payees, tx, { count = true } = {}) {
  const list = payees ?? [];
  const name = String(tx?.payee ?? '').trim().replace(/\s+/g, ' ');
  // Samodejno vpisan redni strošek (najemnina) ni trgovina, ki bi jo izbirali pri hitrem vnosu.
  if (!name || tx.recurringId || (tx.type !== 'expense' && tx.type !== 'income')) return list;
  const known = findPayee(list, name, tx.type);
  if (!known) {
    return [...list, {
      id: uid(), name, type: tx.type,
      categoryId: tx.categoryId || null, accountId: tx.accountId || null,
      count: 1, lastUsed: tx.date, lastAmount: Number(tx.amount) || 0,
    }];
  }
  const newer = !known.lastUsed || tx.date >= known.lastUsed;
  const { demo: _testna, ...mine } = known;
  const base = tx.demo ? known : mine;
  return list.map((p) => (p.id !== known.id ? p : {
    ...base,
    categoryId: newer && tx.categoryId ? tx.categoryId : p.categoryId,
    accountId: newer && tx.accountId ? tx.accountId : p.accountId,
    count: p.count + (count ? 1 : 0),
    lastUsed: newer ? tx.date : p.lastUsed,
    lastAmount: newer ? Number(tx.amount) || 0 : p.lastAmount,
  }));
}

// Za podatke iz časa pred spominom trgovin: seznam se sestavi iz zgodovine transakcij.
export function payeesFromTransactions(transactions) {
  return [...(transactions ?? [])]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .reduce((list, tx) => rememberPayee(list, tx), []);
}

export function withPayees(state, payees) {
  return { ...state, payees: Array.isArray(payees) ? payees : payeesFromTransactions(state.transactions) };
}

// Najpogostejše najprej; pri enakem številu tista, ki je bila uporabljena nazadnje.
const byUse = (a, b) => b.count - a.count || String(b.lastUsed).localeCompare(String(a.lastUsed)) || a.name.localeCompare(b.name, 'sl');

export function topPayees(payees, type = 'expense', limit = 8) {
  return (payees ?? []).filter((p) => p.type === type).sort(byUse).slice(0, limit);
}

// Predlogi med tipkanjem: najprej imena, ki se začnejo z vpisanim, nato tista, ki ga vsebujejo.
export function suggestPayees(payees, type, query, limit = 6) {
  const q = payeeKey(query);
  if (!q) return [];
  const all = (payees ?? []).filter((p) => p.type === type);
  const starts = all.filter((p) => payeeKey(p.name).startsWith(q)).sort(byUse);
  const contains = all.filter((p) => !payeeKey(p.name).startsWith(q) && payeeKey(p.name).includes(q)).sort(byUse);
  return [...starts, ...contains].slice(0, limit);
}

// "12,5" -> 12.5; "1.234,56" -> 1234.56; "12.50" -> 12.5. Neveljaven vnos, nič ali negativno število da null.
// Dvoumnega "1.234" ne ugibamo (tisoč dvesto ali ena cela dve): raje null kot napačen znesek.
export function parseAmount(text) {
  let t = String(text ?? '').replace(/[\s€]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

/* ---------- redni stroški in prihodki ---------- */

// Avtor, 3. 10. 2026: redni stroški (najemnina, naročnine) naj se vpišejo sami. Do zdaj je bilo treba pri
// vsakem zapadlem pravilu klikniti "Knjiži". Zdaj se ob odprtju sledilnika vpiše vse, kar je zapadlo.

const pad2 = (n) => String(n).padStart(2, '0');
const daysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m: 1-12

// Naslednji datum pravila. Mesečno in letno pravilo se drži svojega dne (anchorDay): pravilo z 31. v mesecu
// gre februarja na 28., marca pa nazaj na 31. Brez tega bi po februarju za vedno ostalo na 28.
export function nextOccurrence(rule, fromIso) {
  const [y, m, d] = fromIso.split('-').map(Number);
  if (rule.frequency === 'weekly') return isoDay(new Date(y, m - 1, d + 7));
  const anchor = rule.anchorDay ?? d;
  if (rule.frequency === 'yearly') return `${y + 1}-${pad2(m)}-${pad2(Math.min(anchor, daysInMonth(y + 1, m)))}`;
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1];
  return `${ny}-${pad2(nm)}-${pad2(Math.min(anchor, daysInMonth(ny, nm)))}`;
}

// Varovalo pred napačno vpisanim letom: eno pravilo za nazaj vpiše največ toliko transakcij, starejše preskoči.
// Obrazec dovoli začetek največ leto dni nazaj (tedensko pravilo: 53 vpisov), zato se meja običajno ne doseže.
export const MAX_CATCH_UP = 60;

// Vpiše vse zapadle redne stroške in prihodke do vključno danes in pravila premakne naprej.
// Vrne isti objekt stanja, kadar ni kaj vpisati. Pravilo brez veljavnega računa ali zneska ostane zapadlo,
// da ga pogled pokaže; neaktivno pravilo (pavza) se ne vpisuje.
export function postDueRecurring(state, today) {
  const posted = [];
  const accountIds = new Set((state.accounts ?? []).map((acc) => acc.id));
  const recurring = (state.recurring ?? []).map((rule) => {
    if (!rule.active || !rule.nextDate || rule.nextDate > today) return rule;
    if (!accountIds.has(rule.accountId) || !(Number(rule.amount) > 0)) return rule;
    const r = { ...rule, anchorDay: rule.anchorDay ?? Number(rule.nextDate.slice(8, 10)) };
    let next = r.nextDate;
    for (let n = 0; next <= today && n < MAX_CATCH_UP; n++) {
      posted.push({
        id: uid(), date: next, type: r.type, amount: Number(r.amount),
        accountId: r.accountId, transferToAccountId: '', categoryId: r.categoryId || null,
        payee: r.name, notes: 'Vpisano samodejno (redno)', tags: ['recurring'], recurringId: r.id,
        ...(r.demo ? { demo: true } : {}),
      });
      next = nextOccurrence(r, next);
    }
    while (next <= today) next = nextOccurrence(r, next);
    return { ...r, nextDate: next };
  });
  if (!posted.length) return { state, posted };
  return { state: { ...state, recurring, transactions: [...state.transactions, ...posted] }, posted };
}

// Pravila, ki so zapadla, a jih ni mogoče vpisati (račun izbrisan, znesek nič). Pogled jih pokaže z razlogom.
export function blockedRecurring(state, today) {
  const accountIds = new Set((state.accounts ?? []).map((acc) => acc.id));
  return (state.recurring ?? []).filter((r) => r.active && r.nextDate && r.nextDate <= today
    && (!accountIds.has(r.accountId) || !(Number(r.amount) > 0)));
}

/* ---------- pregled meseca ---------- */

// Avtor, 3. 10. 2026: sledilnik naj "vse, kar potrebuješ, dobro prikazuje" in bo enostaven. Pregled zato
// odgovori na štiri vprašanja po vrsti: koliko sem ta mesec porabil, za kaj, kje in koliko mi ostane.
// Vsi izračuni so tukaj, brez Reacta, da jih preverjajo preizkusi.

export const MONTHS_SL = {
  nom: ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september', 'oktober', 'november', 'december'],
  gen: ['januarja', 'februarja', 'marca', 'aprila', 'maja', 'junija', 'julija', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'],
  loc: ['januarju', 'februarju', 'marcu', 'aprilu', 'maju', 'juniju', 'juliju', 'avgustu', 'septembru', 'oktobru', 'novembru', 'decembru'],
};
export const monthName = (ym, form = 'nom') => MONTHS_SL[form][Number(ym.slice(5, 7)) - 1];

export function shiftMonth(ym, by) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
export const daysInMonthKey = (ym) => daysInMonth(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)));

const amountOf = (t) => Number(t.amount) || 0;
const inMonth = (t, ym, uptoDay = 31) => t.date.slice(0, 7) === ym && Number(t.date.slice(8, 10)) <= uptoDay;

// Vsota odhodkov in prihodkov v mesecu do vključno danega dne. Prenosi med računi niso ne eno ne drugo.
export function monthTotals(transactions, ym, uptoDay = 31) {
  let expense = 0, income = 0;
  for (const t of transactions) {
    if (!inMonth(t, ym, uptoDay)) continue;
    if (t.type === 'expense') expense += amountOf(t);
    else if (t.type === 'income') income += amountOf(t);
  }
  return { expense, income };
}

// Poraba od prvega v mesecu, seštevek po dnevih: [po 1. dnevu, po 2. dnevu, ...] do lastDay.
export function cumulativeSpend(transactions, ym, lastDay = daysInMonthKey(ym)) {
  const perDay = new Array(lastDay).fill(0);
  for (const t of transactions) {
    if (t.type !== 'expense' || t.date.slice(0, 7) !== ym) continue;
    const day = Number(t.date.slice(8, 10));
    if (day <= lastDay) perDay[day - 1] += amountOf(t);
  }
  let sum = 0;
  return perDay.map((v) => (sum += v));
}

// Odhodki meseca po kategorijah, največja najprej, z deležem in mesečno mejo iz proračuna, če je nastavljena.
export function categoryBreakdown(state, ym) {
  const byCat = new Map();
  for (const t of state.transactions) {
    if (t.type !== 'expense' || !inMonth(t, ym)) continue;
    const key = t.categoryId || '';
    const row = byCat.get(key) ?? { value: 0, count: 0 };
    row.value += amountOf(t);
    row.count += 1;
    byCat.set(key, row);
  }
  const total = [...byCat.values()].reduce((sum, r) => sum + r.value, 0);
  return [...byCat.entries()].map(([id, r]) => {
    const cat = state.categories.find((c) => c.id === id);
    const limit = Number(state.budgets.find((b) => b.categoryId === id)?.monthlyLimit) || 0;
    return { id, name: cat?.name ?? 'Brez kategorije', color: cat?.color ?? '#64748b', value: r.value, count: r.count, share: total > 0 ? r.value / total : 0, limit };
  }).sort((x, y) => y.value - x.value || x.name.localeCompare(y.name, 'sl'));
}

// Kje je šel denar: trgovine in storitve meseca. Redni stroški (najemnina) niso trgovina in so izpuščeni.
export function payeeBreakdown(transactions, ym, limit = 5) {
  const by = new Map();
  for (const t of transactions) {
    if (t.type !== 'expense' || t.recurringId || !inMonth(t, ym)) continue;
    const name = String(t.payee ?? '').trim();
    if (!name) continue;
    const key = payeeKey(name);
    const row = by.get(key) ?? { name, value: 0, count: 0 };
    row.value += amountOf(t);
    row.count += 1;
    by.set(key, row);
  }
  return [...by.values()].sort((x, y) => y.value - x.value || x.name.localeCompare(y.name, 'sl')).slice(0, limit);
}

// Redni stroški in prihodki, ki pridejo po današnjem dnevu do vključno untilIso (konec meseca).
export function upcomingRecurring(state, today, untilIso) {
  const out = [];
  for (const rule of state.recurring ?? []) {
    if (!rule.active || !rule.nextDate || !(Number(rule.amount) > 0)) continue;
    const r = { ...rule, anchorDay: rule.anchorDay ?? Number(rule.nextDate.slice(8, 10)) };
    let next = r.nextDate;
    for (let n = 0; next <= untilIso && n < MAX_CATCH_UP; n++) {
      if (next > today) out.push({ id: r.id, name: r.name, type: r.type, amount: Number(r.amount), date: next });
      next = nextOccurrence(r, next);
    }
  }
  return out.sort((x, y) => x.date.localeCompare(y.date) || x.name.localeCompare(y.name, 'sl'));
}

// Vse, kar Pregled pokaže za izbrani mesec. today: današnji dan (LLLL-MM-DD).
// Tekoči mesec se primerja s prejšnjim do istega dne, pretekli mesec s celim mesecem prej: primerjava
// 3. oktobra s celim septembrom bi vedno kazala, da je poraba majhna.
export function monthOverview(state, ym, today) {
  const currentYm = today.slice(0, 7);
  const isCurrent = ym === currentYm;
  const isFuture = ym > currentYm;
  const days = daysInMonthKey(ym);
  const lastDay = isCurrent ? Number(today.slice(8, 10)) : isFuture ? 0 : days;
  const { expense, income } = monthTotals(state.transactions, ym);
  const prevYm = shiftMonth(ym, -1);
  const prevDays = daysInMonthKey(prevYm);
  const compareDay = isCurrent ? Math.min(lastDay, prevDays) : prevDays;
  const toDate = monthTotals(state.transactions, ym, isCurrent ? lastDay : 31).expense;
  const prevExpense = monthTotals(state.transactions, prevYm, compareDay).expense;
  const upcoming = isCurrent ? upcomingRecurring(state, today, `${ym}-${pad2(days)}`) : [];
  const upcomingExpense = upcoming.filter((u) => u.type === 'expense').reduce((sum, u) => sum + u.amount, 0);
  const upcomingIncome = upcoming.filter((u) => u.type === 'income').reduce((sum, u) => sum + u.amount, 0);
  const totalBudget = state.budgets.reduce((sum, b) => sum + (Number(b.monthlyLimit) || 0), 0);
  return {
    ym, isCurrent, isFuture, days, lastDay,
    expense, income, net: income - expense,
    compare: { prevYm, basis: isCurrent ? 'toDate' : 'full', day: compareDay, expense: toDate, prevExpense, diff: toDate - prevExpense, pct: prevExpense > 0 ? ((toDate - prevExpense) / prevExpense) * 100 : null },
    current: cumulativeSpend(state.transactions, ym, lastDay),
    previous: cumulativeSpend(state.transactions, prevYm, prevDays),
    categories: categoryBreakdown(state, ym),
    payees: payeeBreakdown(state.transactions, ym),
    upcoming, upcomingExpense, upcomingIncome,
    totalBudget,
    count: state.transactions.filter((t) => t.type !== 'transfer' && t.date.slice(0, 7) === ym).length,
  };
}

/* ---------- analiza: koledar porabe, tedni, meseci (avtor, 18. 10. 2026) ---------- */

const round2 = (v) => Math.round(v * 100) / 100;

// Odhodki po dnevih izbranega meseca: [1. dan, 2. dan, ...]. Prihodki in prenosi niso poraba.
export function dnevnaPoraba(transactions, ym) {
  const dni = new Array(daysInMonthKey(ym)).fill(0);
  for (const t of transactions) {
    if (t.type !== 'expense' || !inMonth(t, ym)) continue;
    dni[Number(t.date.slice(8, 10)) - 1] += amountOf(t);
  }
  return dni.map(round2);
}

// Stopnja barve v koledarju: 0 za dan brez porabe, 1 do 4 po četrtinah dni s porabo istega meseca.
// Meje iz četrtin namesto deleža največjega dne: sicer bi najemnina vse druge dni obarvala najsvetleje.
// Kadar so vsi zneski enaki, med njimi ni razlike in dobijo srednjo stopnjo.
export function stopnjePorabe(values) {
  const pos = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!pos.length) return values.map(() => 0);
  if (pos[0] === pos[pos.length - 1]) return values.map((v) => (v > 0 ? 2 : 0));
  const q = (p) => pos[Math.floor(p * (pos.length - 1))];
  const [a, b, c] = [q(0.25), q(0.5), q(0.75)];
  return values.map((v) => (v <= 0 ? 0 : v <= a ? 1 : v <= b ? 2 : v <= c ? 3 : 4));
}

// Tedni od ponedeljka do nedelje, ki sežejo v mesec, obrezani na mesec: [{ od, do, dni, value }].
export function tedenskaPoraba(transactions, ym) {
  const dni = dnevnaPoraba(transactions, ym);
  const [y, m] = ym.split('-').map(Number);
  const tedni = [];
  for (let d = 1; d <= dni.length; d++) {
    const ponedeljek = new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1;
    if (d === 1 || ponedeljek) tedni.push({ od: d, do: d, value: 0 });
    const t = tedni[tedni.length - 1];
    t.do = d;
    t.value += dni[d - 1];
  }
  return tedni.map((t) => ({ ...t, dni: t.do - t.od + 1, value: round2(t.value) }));
}

// Odhodki zadnjih n mesecev do vključno ym, od najstarejšega: [{ ym, value }].
export function mesecnaPoraba(transactions, ym, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const k = shiftMonth(ym, i - n + 1);
    return { ym: k, value: round2(monthTotals(transactions, k).expense) };
  });
}

/* ---------- formatters ---------- */

const eurFmt = new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eurFmtPrecise = new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' });

export function fmtEur(n, precise = false) {
  const v = Number.isFinite(n) ? n : 0;
  return (precise ? eurFmtPrecise : eurFmt).format(v);
}
export function fmtDate(iso) {
  if (!iso) return '';
  try { return dateFmt.format(new Date(iso)); } catch { return iso; }
}
export function fmtMonth(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
}
// Dan po uri uporabnika. toISOString() da dan po UTC, zato je bil med polnočjo in 2.00 "danes" še včerajšnji datum.
export function isoDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function todayIso() { return isoDay(); }
export function yesterdayIso() { const d = new Date(); d.setDate(d.getDate() - 1); return isoDay(d); }
export function monthKey(iso) { return iso.slice(0, 7); }

/* ---------- selectors / derived ---------- */

export function accountBalance(state, accountId) {
  const acc = state.accounts.find((a) => a.id === accountId);
  if (!acc) return 0;
  let bal = Number(acc.startingBalance) || 0;
  for (const t of state.transactions) {
    if (t.type === 'income' && t.accountId === accountId) bal += Number(t.amount) || 0;
    else if (t.type === 'expense' && t.accountId === accountId) bal -= Number(t.amount) || 0;
    else if (t.type === 'transfer') {
      if (t.accountId === accountId) bal -= Number(t.amount) || 0;
      if (t.transferToAccountId === accountId) bal += Number(t.amount) || 0;
    }
  }
  return bal;
}

export function totalBalance(state) {
  return state.accounts
    .filter((a) => !a.archived && a.type !== 'loan' && a.type !== 'card')
    .reduce((sum, a) => sum + accountBalance(state, a.id), 0);
}

export function totalDebt(state) {
  return state.accounts
    .filter((a) => !a.archived && (a.type === 'loan' || a.type === 'card'))
    .reduce((sum, a) => sum + Math.abs(accountBalance(state, a.id)), 0);
}

export function txInRange(state, fromIso, toIso) {
  return state.transactions.filter((t) => t.date >= fromIso && t.date <= toIso);
}

export function sumByType(transactions, type) {
  return transactions
    .filter((t) => t.type === type)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

export function sumByCategory(transactions, type) {
  const m = new Map();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const key = t.categoryId || 'unkat';
    m.set(key, (m.get(key) || 0) + (Number(t.amount) || 0));
  }
  return m;
}

export function monthRange(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const from = `${yyyymm}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${yyyymm}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

export function lastNMonths(n, anchor = todayIso()) {
  const out = [];
  const d = new Date(anchor);
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
