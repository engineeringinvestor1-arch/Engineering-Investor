// Samodejno dodajanje objav rezultatov v koledar (avtor, 10. 10. 2026: "avtomatiziraj, da se koledar
// posodablja z dogodki").
//
// Pravilo koledarja ostaja: v koledar gre samo objava z razpisanim datumom, ocena ponudnika podatkov ni razpis.
// Razpis prepoznamo po Nasdaqovem koledarju objav rezultatov: ko podjetje datum objavi, Nasdaq ob njem navede
// tudi čas objave (pred odprtjem ali po zaprtju); dokler je datum samo ocena, časa ni ("time-not-supplied").
//
// Meritev 10. 10. 2026 na devetih podjetjih, preverjeno pri objavah podjetij: s časom je bilo navedenih šest
// (JPMorgan in Johnson & Johnson 13. 10., Tesla 21. 10., Microsoft 28. 10., Intel 29. 10., Apple 2. 11.) in vseh
// šest je datum uradno razpisalo; brez časa so bili Mastercard, Exxon Mobil in Amazon, ki datuma še niso
// razpisali. Finnhub je za Teslo navajal 20. 10., za Mastercard 22. 10. in za Exxon 23. 10.
//
// Robot objave samo dodaja. Datuma že vpisane objave ne premika: razhajanje izpiše, popravi ga človek.

export const NASDAQ_EARNINGS_URL = 'https://api.nasdaq.com/api/calendar/earnings?date=';
export const DNI_NAPREJ = 35;
// Koliko dni narazen sta lahko vpis na strani in Nasdaqov datum, da gre še za isto četrtletno objavo.
const ISTA_OBJAVA_DNI = 45;

const KDAJ = { 'time-pre-market': 'pred odprtjem', 'time-after-hours': 'po zaprtju' };
const MESECI = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const dni = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

// Četrtletje, na katerega se objava nanaša, iz Nasdaqovega zapisa "Sep/2026".
const cetrtletje = (fiscalQuarterEnding) => {
  const [mesec, leto] = String(fiscalQuarterEnding ?? '').split('/');
  return MESECI[mesec] && /^\d{4}$/.test(leto) ? { quarter: Math.ceil(MESECI[mesec] / 3), year: Number(leto) } : null;
};

// rowsByDate: { 'LLLL-MM-DD': vrstice Nasdaqovega koledarja za ta dan }. podjetja: [{ ticker, name }].
// Vrne objave spremljanih podjetij, ki imajo naveden čas objave, torej razpisan datum.
export function razpisaneObjave(rowsByDate, podjetja) {
  const poSimbolu = new Map(podjetja.map((p) => [p.ticker, p]));
  const out = [];
  for (const date of Object.keys(rowsByDate).sort()) {
    for (const row of rowsByDate[date] ?? []) {
      const podjetje = poSimbolu.get(row.symbol);
      const when = KDAJ[row.time];
      if (!podjetje || !when) continue;
      out.push({ ticker: podjetje.ticker, name: podjetje.name, date, when, ...(cetrtletje(row.fiscalQuarterEnding) ?? {}) });
    }
  }
  return out;
}

const oznaka = (r, obstojece) => {
  const osnova = `${r.ticker.toLowerCase().replace(/[^a-z0-9]/g, '')}-${r.quarter ? `q${r.quarter}-${String(r.year).slice(2)}` : r.date}`;
  return obstojece.has(osnova) ? `${osnova}-${r.date}` : osnova;
};

// Doda razpisane objave, ki jih v koledarju še ni. earnings se ne spreminja; vrne nov seznam in kaj se je zgodilo.
export function dopolniObjave(earnings, razpisane) {
  const out = earnings.map((e) => ({ ...e }));
  const dodane = [];
  const razhajanja = [];
  for (const r of razpisane) {
    const ista = out.find((e) => e.ticker === r.ticker && Math.abs(dni(e.date, r.date)) <= ISTA_OBJAVA_DNI);
    if (!ista) {
      const nova = { id: oznaka(r, new Set(out.map((e) => e.id))), date: r.date, ticker: r.ticker, name: r.name, when: r.when, ...(r.quarter ? { quarter: r.quarter, year: r.year } : {}) };
      out.push(nova);
      dodane.push(nova);
    } else if (ista.date !== r.date && !ista.actualEps) {
      razhajanja.push({ id: ista.id, na_strani: ista.date, nasdaq: r.date });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return { earnings: out, dodane, razhajanja };
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export async function fetchNasdaqEarningsDay(date) {
  const res = await fetch(`${NASDAQ_EARNINGS_URL}${date}`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Nasdaq, objave rezultatov ${date}: ${res.status}`);
  const json = await res.json();
  // Dan brez objav vrne data.rows = null; to ni napaka.
  return Array.isArray(json?.data?.rows) ? json.data.rows : [];
}
