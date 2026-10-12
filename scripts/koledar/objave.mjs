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
// Robot razpisane objave samo dodaja. Datuma že vpisane razpisane objave ne premika: razhajanje izpiše, popravi ga človek.
//
// Predvideni datumi (avtor, 12. 10. 2026: "investing.com ima vse določene, v mojem koledarju pa manjkajo").
// Koledar pokaže tudi objave, ki jih podjetje še ni razpisalo, z oznako estimated: true, da je poln kot koledarji
// ponudnikov, ocena pa ni videti kot dejstvo. Vir ocene je Yahoo Finance, rezerva Nasdaqova ocena brez ure.
// Meritev 12. 10. 2026 na 20 podjetjih: Yahoojev datum se je pri vseh 13 razpisanih objavah ujemal z Nasdaqovim;
// za Meto je Yahoo navajal 28. 10. (sreda v zadnjem tednu meseca, kot aprila in julija), Nasdaqov algoritem 4. 11.
// Yahoojeva oznaka "ni ocena" (isEarningsDateEstimate: false) NI potrditev: Amazon in Exxon je tisti dan označil
// za potrjena, podjetji pa datuma na svojih straneh za vlagatelje še nista razpisali. Potrditev ostane Nasdaqova ura.
// Ocena se sme premikati; ko podjetje datum razpiše, vpis dobi uradni datum in čas, oznaka pa izgine.

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

// Objave spremljanih podjetij, ki jih Nasdaq navaja brez ure: datum je ocena njegovega algoritma, ne razpis.
export function ocenjeneObjave(rowsByDate, podjetja) {
  const poSimbolu = new Map(podjetja.map((p) => [p.ticker, p]));
  const out = [];
  for (const date of Object.keys(rowsByDate).sort()) {
    for (const row of rowsByDate[date] ?? []) {
      const podjetje = poSimbolu.get(row.symbol);
      if (!podjetje || KDAJ[row.time]) continue;
      out.push({ ticker: podjetje.ticker, name: podjetje.name, date, source: 'Nasdaq', ...(cetrtletje(row.fiscalQuarterEnding) ?? {}) });
    }
  }
  return out;
}

export const VIR_OCENE = 'Yahoo Finance';
const yahooSimbol = (ticker) => ticker.replace('.', '-');
// Dan objave po newyorškem času: objava ob 16.00 v New Yorku je po UTC isti dan zvečer, po polnoči pa že naslednji.
const danNewYork = (sekunde) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(sekunde * 1000));

// quotes: odgovor Yahoojevega quote (quoteResponse.result). Vrne predviden datum naslednje objave za spremljana
// podjetja. Yahoojeve oznake, ali je datum ocena, namenoma ne beremo (glej glavo datoteke).
export function yahooObjave(quotes, podjetja) {
  const poSimbolu = new Map(podjetja.map((p) => [yahooSimbol(p.ticker), p]));
  const out = [];
  for (const q of quotes ?? []) {
    const podjetje = poSimbolu.get(q?.symbol);
    if (!podjetje || !Number.isFinite(q.earningsTimestampStart)) continue;
    out.push({ ticker: podjetje.ticker, name: podjetje.name, date: danNewYork(q.earningsTimestampStart), source: VIR_OCENE });
  }
  return out;
}

// Ena ocena na podjetje: Yahoojeva, če je ni, Nasdaqova. Četrtletje pove samo Nasdaq, zato ga vzamemo od tam,
// kadar gre za isto objavo. Ocene izven okna (minule ali več kot dniNaprej dni naprej) ne gredo v koledar.
export function izberiPredvidene(yahoo, nasdaq, { today, dniNaprej = DNI_NAPREJ }) {
  const vOknu = (o) => dni(o.date, today) >= 0 && dni(o.date, today) <= dniNaprej;
  const out = [];
  for (const o of [...yahoo, ...nasdaq]) {
    if (out.some((x) => x.ticker === o.ticker)) continue;
    const izNasdaqa = nasdaq.find((n) => n.ticker === o.ticker && Math.abs(dni(n.date, o.date)) <= ISTA_OBJAVA_DNI);
    out.push({ ticker: o.ticker, name: o.name, date: o.date, source: o.source, ...(izNasdaqa?.quarter ? { quarter: izNasdaqa.quarter, year: izNasdaqa.year } : {}) });
  }
  return out.filter(vOknu);
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
  const potrjene = [];
  for (const r of razpisane) {
    const ista = out.find((e) => e.ticker === r.ticker && Math.abs(dni(e.date, r.date)) <= ISTA_OBJAVA_DNI);
    if (ista?.estimated) {
      // Predviden datum je podjetje razpisalo: vpis dobi uradni datum in čas, oznaka ocene izgine.
      const { id: staraOznaka, date: prej, ticker, name, estimated, estimateSource, ...ostalo } = ista;
      const drugi = new Set(out.filter((e) => e !== ista).map((e) => e.id));
      const id = staraOznaka.includes('-q') ? staraOznaka : oznaka(r, drugi);
      out[out.indexOf(ista)] = { id, date: r.date, ticker, name, when: r.when, ...ostalo, ...(r.quarter ? { quarter: r.quarter, year: r.year } : {}) };
      potrjene.push({ id, date: r.date, when: r.when, prej });
      continue;
    }
    if (!ista) {
      const nova = { id: oznaka(r, new Set(out.map((e) => e.id))), date: r.date, ticker: r.ticker, name: r.name, when: r.when, ...(r.quarter ? { quarter: r.quarter, year: r.year } : {}) };
      out.push(nova);
      dodane.push(nova);
    } else if (ista.date !== r.date && !ista.actualEps) {
      razhajanja.push({ id: ista.id, na_strani: ista.date, nasdaq: r.date });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return { earnings: out, dodane, razhajanja, potrjene };
}

// Vpiše in posodobi predvidene datume. predvidene: izid izberiPredvidene, največ ena ocena na podjetje.
// Razpisane objave se ne dotakne. earnings se ne spreminja; vrne nov seznam in kaj se je zgodilo.
export function dopolniPredvidene(earnings, predvidene, { today }) {
  const out = earnings.map((e) => ({ ...e }));
  const dodane = [];
  const premaknjene = [];
  const odstranjene = [];
  for (const p of predvidene) {
    const ista = out.find((e) => e.ticker === p.ticker && Math.abs(dni(e.date, p.date)) <= ISTA_OBJAVA_DNI);
    if (!ista) {
      const nova = { id: oznaka(p, new Set(out.map((e) => e.id))), date: p.date, ticker: p.ticker, name: p.name, estimated: true, estimateSource: p.source, ...(p.quarter ? { quarter: p.quarter, year: p.year } : {}) };
      out.push(nova);
      dodane.push(nova);
    } else if (ista.estimated && ista.date !== p.date) {
      // Rezervni vir ne premika ocene glavnega, sicer bi datum skakal vsakič, ko glavni vir ne odgovori.
      if (p.source !== VIR_OCENE && ista.estimateSource === VIR_OCENE) continue;
      premaknjene.push({ id: ista.id, prej: ista.date, zdaj: p.date });
      ista.date = p.date;
      ista.estimateSource = p.source;
    }
  }
  // Ocena, katere dan je minil brez razpisa, ni več napoved in izgine. Če je izid že vpisan, je objava bila:
  // vpis ostane, oznaka ocene pa ne.
  const ostane = [];
  for (const e of out) {
    if (!e.estimated) ostane.push(e);
    else if (e.actualEps) {
      const { estimated, estimateSource, ...objavljena } = e;
      ostane.push(objavljena);
    } else if (e.date >= today) ostane.push(e);
    else odstranjene.push(e);
  }
  ostane.sort((a, b) => a.date.localeCompare(b.date));
  return { earnings: ostane, dodane, premaknjene, odstranjene };
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export async function fetchNasdaqEarningsDay(date) {
  const res = await fetch(`${NASDAQ_EARNINGS_URL}${date}`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Nasdaq, objave rezultatov ${date}: ${res.status}`);
  const json = await res.json();
  // Dan brez objav vrne data.rows = null; to ni napaka.
  return Array.isArray(json?.data?.rows) ? json.data.rows : [];
}

// Yahoo za podatke o tečajih zahteva sejni piškotek in žeton (crumb), ki ju da brez prijave.
export async function fetchYahooEarnings(podjetja) {
  const glave = { 'User-Agent': UA };
  const seja = await fetch('https://fc.yahoo.com', { headers: glave, redirect: 'manual', signal: AbortSignal.timeout(20_000) });
  const piskotek = (seja.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  if (!piskotek) throw new Error('Yahoo: sejnega piškotka ni');
  const zeton = (await (await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { ...glave, Cookie: piskotek }, signal: AbortSignal.timeout(20_000) })).text()).trim();
  if (!zeton || zeton.length > 40 || /[<{\s]/.test(zeton)) throw new Error('Yahoo: žetona ni');
  const url = new URL('https://query1.finance.yahoo.com/v7/finance/quote');
  url.searchParams.set('symbols', podjetja.map((p) => yahooSimbol(p.ticker)).join(','));
  url.searchParams.set('fields', 'earningsTimestampStart,earningsTimestampEnd,isEarningsDateEstimate');
  url.searchParams.set('crumb', zeton);
  const res = await fetch(url, { headers: { ...glave, Cookie: piskotek, Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Yahoo, objave rezultatov: ${res.status}`);
  const json = await res.json();
  const quotes = json?.quoteResponse?.result;
  if (!Array.isArray(quotes)) throw new Error('Yahoo: odgovor nima pričakovane oblike');
  return quotes;
}
