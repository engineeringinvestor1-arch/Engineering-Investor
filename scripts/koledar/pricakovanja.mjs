/**
 * Pričakovanja (konsenz analitikov) za prihodnje dogodke v koledarju.
 *
 * Avtor 2. 10. 2026: "robot naj avtomatsko vpisuje pričakovanja". Dnevni potek jih vpiše in objavi sam.
 *
 * Viri, oba brezplačna in brez ključa:
 *   - Nasdaq, gospodarski koledar (api.nasdaq.com/api/calendar/economicevents). Pokriva več tednov naprej,
 *     pričakovanje pa se pojavi šele nekaj dni pred objavo. Mesečna in medletna sprememba imata pogosto
 *     isto ime (dve vrstici "CPI"), zato vrstico prepoznamo po prejšnji vrednosti ali po drugem viru.
 *     Poizvedba za dan X vrne dogodke dneva pred tem (izmerjeno 2. 10. 2026 na šestih dneh), zato
 *     iščemo v odgovoru za dan dogodka in za dan po njem in zahtevamo, da je dogodek v natanko enem.
 *   - Forex Factory (nfs.faireconomy.media/ff_calendar_thisweek.json). Samo tekoči teden, a z
 *     izrecnimi imeni ("CPI y/y"), zato služi kot kontrola in razločevanje.
 *
 * Pravilo: sestavni del pričakovanja se vpiše, kadar ga ima vsaj en vir in mu drugi ne nasprotuje.
 * Kadar se viri razlikujejo, se ne vpiše nič. Brez prepoznane vrstice se ne ugiba.
 * Vsak dogodek mora ujemati tudi uro: ura vira, preračunana v Ljubljano, mora biti ura v koledarju.
 */

export const SITE_TZ = 'Europe/Ljubljana';
export const NASDAQ_URL = 'https://api.nasdaq.com/api/calendar/economicevents?date=';
export const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

/* ---------------- števila in oblika ---------------- */

const fmt = (v, d = 1) => v.toLocaleString('sl-SI', { minimumFractionDigits: d, maximumFractionDigits: d });

// "89K" -> { value: 89, unit: 'K' }; "1,701K" -> 1701; "3.4%" -> 3.4 %; prazno ali "&nbsp;" -> null
export function parseNumber(text) {
  const t = String(text ?? '').replace(/&nbsp;/g, '').trim();
  const m = t.match(/^([-+]?\d[\d,]*(?:\.\d+)?)\s*(%|K|M|B)?$/i);
  if (!m) return null;
  return { value: Number(m[1].replace(/,/g, '')), unit: (m[2] ?? '').toUpperCase() };
}

const enako = (a, b) => a && b && a.unit === b.unit && Math.abs(a.value - b.value) < 1e-9;

// Številke iz naše prejšnje vrednosti po delih: "3,4 % medletno (avg 2026); jedrna 2,4 %" -> [3.4, 2.4]
export function previousParts(text) {
  return String(text ?? '')
    .split(';')
    .map((part) => part.replace(/\([^)]*\)/g, '').match(/[-+−]?\d+(?:,\d+)?/))
    .map((m) => (m ? Number(m[0].replace('−', '-').replace(',', '.')) : null));
}

/* ---------------- časovni pasovi ---------------- */

function zoneParts(ms, tz) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

function wallToUtc(date, time, tz) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const offset = (ms) => {
    const p = zoneParts(ms, tz);
    const [py, pm, pd] = p.date.split('-').map(Number);
    const [ph, pmi] = p.time.split(':').map(Number);
    return Date.UTC(py, pm - 1, pd, ph, pmi) - Math.floor(ms / 60000) * 60000;
  };
  let utc = wall - offset(wall);
  utc = wall - offset(utc);
  return utc;
}

// Nasdaq piše uro po newyorškem času (stolpec se imenuje "gmt", a CPI je ob 08:30).
export const nasdaqLocalTime = (date, time) => (/^\d{1,2}:\d{2}$/.test(time ?? '') ? zoneParts(wallToUtc(date, time.padStart(5, '0'), 'America/New_York'), SITE_TZ).time : null);
export const ffLocal = (iso) => (Number.isFinite(Date.parse(iso)) ? zoneParts(Date.parse(iso), SITE_TZ) : null);

/* ---------------- pravila po dogodkih ---------------- */

// unambiguous: ime je v koledarju vira enkrat, zato zadošča ena sama vrstica.
// prev: kateri del naše prejšnje vrednosti razloči med mesečno in medletno vrstico z istim imenom.
const pct = (label) => (v) => `${fmt(v.value)} % ${label}`;
export const PRAVILA = [
  { key: 'us-cpi', country: 'United States', ff: 'USD', parts: [
    { nasdaq: ['CPI'], ffTitles: ['CPI y/y'], prev: 0, unit: '%', text: pct('medletno') },
    { nasdaq: ['Core CPI'], ffTitles: ['Core CPI y/y'], prev: 1, unit: '%', text: (v) => `jedrna ${fmt(v.value)} %` },
  ] },
  { key: 'us-pce', country: 'United States', ff: 'USD', parts: [
    { nasdaq: ['PCE Price Index'], ffTitles: ['PCE Price Index y/y'], prev: 0, unit: '%', text: pct('medletno') },
    { nasdaq: ['Core PCE Price Index'], ffTitles: ['Core PCE Price Index y/y'], prev: 1, unit: '%', text: (v) => `jedrni ${fmt(v.value)} %` },
  ] },
  { key: 'us-nfp', country: 'United States', ff: 'USD', parts: [
    { nasdaq: ['Nonfarm Payrolls'], ffTitles: ['Non-Farm Employment Change'], unambiguous: true, unit: 'K',
      text: (v) => { const jobs = Math.round(v.value * 1000); return `${jobs >= 0 ? '+' : ''}${jobs.toLocaleString('sl-SI')} delovnih mest`; } },
    { nasdaq: ['Unemployment Rate'], ffTitles: ['Unemployment Rate'], unambiguous: true, unit: '%', text: (v) => `brezposelnost ${fmt(v.value)} %` },
  ] },
  { key: 'us-retail', country: 'United States', ff: 'USD', parts: [
    { nasdaq: ['Retail Sales'], ffTitles: ['Retail Sales m/m'], prev: 0, unit: '%', text: pct('mesečno') },
  ] },
  { key: 'us-gdp', country: 'United States', ff: 'USD', parts: [
    { nasdaq: ['GDP'], ffTitles: ['Advance GDP q/q'], unambiguous: true, unit: '%', text: (v) => `${fmt(v.value)} % (anualizirano)` },
  ] },
  { key: 'us-ism', country: 'United States', ff: 'USD', parts: [
    { nasdaq: ['ISM Manufacturing PMI'], ffTitles: ['ISM Manufacturing PMI'], unambiguous: true, unit: '', text: (v) => `indeks ${fmt(v.value)}` },
  ] },
  { key: 'fomc', country: 'United States', ff: 'USD', parts: [
    // Vira navajata zgornjo mejo razpona; Fed ga drži širokega 0,25 odstotne točke.
    { nasdaq: ['Fed Interest Rate Decision'], ffTitles: ['Federal Funds Rate'], unambiguous: true, unit: '%', text: (v) => `${fmt(v.value - 0.25, 2)}-${fmt(v.value, 2)} %` },
  ] },
  { key: 'ecb', country: 'Euro Zone', ff: 'EUR', parts: [
    { nasdaq: ['Deposit Facility Rate'], ffTitles: ['Deposit Facility Rate'], unambiguous: true, unit: '%', text: (v) => `depozitna mera ${fmt(v.value, 2)} %` },
  ] },
  { key: 'eu-cpi', country: 'Euro Zone', ff: 'EUR', parts: [
    { nasdaq: ['CPI'], ffTitles: ['CPI Flash Estimate y/y'], prev: 0, unit: '%', text: pct('medletno') },
    { nasdaq: ['Core CPI'], ffTitles: ['Core CPI Flash Estimate y/y'], prev: 1, unit: '%', text: (v) => `jedrna ${fmt(v.value)} %` },
  ] },
];

const matchesKey = (evt, key) => evt.id === key || evt.id.startsWith(`${key}-`) || evt.id.startsWith(`${key}2`);
export const ruleFor = (evt) => PRAVILA.find((r) => matchesKey(evt, r.key)) ?? null;

/* ---------------- iskanje v virih ---------------- */

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Vrstice Nasdaqa za dogodek: pravo ime, država in ura. Iz odgovorov za dan dogodka in za dan po njem
// mora dogodek biti v natanko enem; sicer ne vemo, kateri dan je pravi.
export function nasdaqRowsFor(evt, rule, responses) {
  const names = rule.parts.flatMap((p) => p.nasdaq);
  const found = (responses ?? []).map((rows) => (rows ?? []).filter((r) =>
    r.country === rule.country
    && names.some((n) => sameName(n, r.eventName))
    && (!evt.time || nasdaqLocalTime(evt.date, r.gmt) === evt.time)));
  const withRows = found.filter((rows) => rows.length);
  if (withRows.length !== 1) return { rows: [], problem: withRows.length > 1 ? 'Nasdaq: dogodek je v več dneh' : null };
  return { rows: withRows[0], problem: null };
}

export function ffValue(evt, rule, part, items) {
  const hits = (items ?? []).filter((i) => {
    if (i.country !== rule.ff || !part.ffTitles.includes(i.title)) return false;
    const local = ffLocal(i.date);
    return local && local.date === evt.date && (!evt.time || local.time === evt.time);
  });
  if (hits.length !== 1) return null;
  return parseNumber(hits[0].forecast);
}

// Vrednost enega sestavnega dela ali razlog, zakaj je ni.
export function partValue(evt, part, rows, ff) {
  const kandidati = rows.filter((r) => part.nasdaq.some((n) => sameName(n, r.eventName)));
  const sKonsenzom = kandidati.filter((r) => parseNumber(r.consensus));
  const prejsnja = part.prev === undefined ? null : previousParts(evt.previous)[part.prev];

  let prepoznana = null;
  if (part.unambiguous && kandidati.length === 1) prepoznana = kandidati[0];
  else if (Number.isFinite(prejsnja)) {
    const poPrejsnji = kandidati.filter((r) => { const p = parseNumber(r.previous); return p && Math.abs(p.value - prejsnja) < 0.05; });
    if (poPrejsnji.length === 1) prepoznana = poPrejsnji[0];
  }
  const nasdaq = prepoznana ? parseNumber(prepoznana.consensus) : null;

  if (ff) {
    if (nasdaq && !enako(nasdaq, ff)) return { problem: `viri se razlikujejo (Nasdaq ${prepoznana.consensus}, Forex Factory ${ff.value}${ff.unit})` };
    // Vrstice nismo prepoznali, a Nasdaq ima pričakovanja pod tem imenom: eno od njih se mora ujemati.
    if (!nasdaq && sKonsenzom.length && !sKonsenzom.some((r) => enako(parseNumber(r.consensus), ff))) {
      return { problem: `viri se razlikujejo (Nasdaq ${sKonsenzom.map((r) => r.consensus).join(' / ')}, Forex Factory ${ff.value}${ff.unit})` };
    }
    return { value: ff, sources: nasdaq || sKonsenzom.length ? ['Nasdaq', 'Forex Factory'] : ['Forex Factory'] };
  }
  if (nasdaq) return { value: nasdaq, sources: ['Nasdaq'] };
  if (sKonsenzom.length) return { problem: 'Nasdaq ima pričakovanje, a vrstice ni mogoče zanesljivo prepoznati' };
  return { problem: 'pričakovanja še ni' };
}

// Pričakovanje za dogodek: prvi del je obvezen, ostali se dodajo, kadar so znani.
export function forecastFor(evt, { nasdaqResponses, ffItems }) {
  const rule = ruleFor(evt);
  if (!rule) return { problem: 'za dogodek ni pravila' };
  const { rows, problem } = nasdaqRowsFor(evt, rule, nasdaqResponses);
  if (problem) return { problem };
  const parts = rule.parts.map((part) => {
    const out = partValue(evt, part, rows, ffValue(evt, rule, part, ffItems));
    if (out.value && part.unit !== undefined && out.value.unit !== part.unit) return { problem: `nepričakovana enota ${out.value.unit}` };
    return out;
  });
  if (!parts[0].value) return { problem: parts[0].problem };
  const used = parts.filter((p) => p.value);
  return {
    text: rule.parts.map((part, i) => (parts[i].value ? part.text(parts[i].value) : null)).filter(Boolean).join('; '),
    sources: [...new Set(used.flatMap((p) => p.sources))],
    skipped: parts.slice(1).filter((p) => !p.value).map((p) => p.problem),
  };
}

/* ---------------- prenos ---------------- */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export async function fetchNasdaqDay(date) {
  const res = await fetch(`${NASDAQ_URL}${date}`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Nasdaq ${date} ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.data?.rows)) throw new Error(`Nasdaq ${date}: odgovor nima vrstic`);
  return json.data.rows;
}

export async function fetchForexFactory() {
  const res = await fetch(FF_URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Forex Factory ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error('Forex Factory: odgovor ni seznam');
  return json;
}
