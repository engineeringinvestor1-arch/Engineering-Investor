// Izidi objav rezultatov za koledar: dobiček na delnico iz dveh brezplačnih virov, primerjan med seboj.
//
// Avtor 31. 10. 2026: "primerjaj podatke in če se razlikujejo za veliko napiši obe števili in tudi napiši od kje
// sta bili vzeti". Vira sta Finnhub (brezplačen ključ) in Nasdaqov javni koledar objav (brez ključa); modela robot
// ne kliče.
//
// Meritev 31. 10. 2026 na 11 objavah od 21. do 30. 10. 2026: pri 9 sta se vira ujemala na cent in s številko v
// naslovu sporočila podjetja, pri Tesli (Finnhub in podjetje 0,48, Nasdaq 0,20 USD) in Intelu (podjetje 0,52,
// Nasdaq 0,41 USD) se Nasdaq ni. Razlika do enega centa je zaokrožitev; večja pomeni, da vira štejeta drugače,
// zato gresta v koledar obe številki z imenom vira.

export const PRAG_RAZLIKE = 0.01;

const fmt = (v) => v.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dni = (a, b) => (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;

// Zadnji dan četrtletja, kot ga Finnhub vpiše v polje period: (3, 2026) -> "2026-09-30".
export function konecCetrtletja(quarter, year) {
  return new Date(Date.UTC(year, quarter * 3, 0)).toISOString().slice(0, 10);
}

// Finnhubova vrstica za objavo v koledarju. Do 31. 10. 2026 je robot iskal vrstico, katere period je v zadnjih
// štirih dneh, period pa je konec četrtletja, objava tedne kasneje, zato ni našel nobene. Četrtletje vpisa je
// koledarsko (Nasdaqov "Sep/2026"), tako kot Finnhubov period, tudi pri podjetjih z zamaknjenim poslovnim letom.
export function izberiFinnhub(rows, evt) {
  const zIzidom = (rows ?? []).filter((r) => typeof r?.actual === 'number' && r.period);
  if (evt.quarter && evt.year) return zIzidom.find((r) => r.period === konecCetrtletja(evt.quarter, evt.year)) ?? null;
  // Vpis brez četrtletja: zadnje četrtletje, ki se je končalo največ 100 dni pred objavo.
  const pred = zIzidom.filter((r) => dni(evt.date, r.period) >= 0 && dni(evt.date, r.period) <= 100);
  return pred.sort((a, b) => b.period.localeCompare(a.period))[0] ?? null;
}

// Nasdaqov zapis: "$4.89" -> 4.89, "($0.41)" -> -0.41, prazno ali "N/A" -> null.
export function nasdaqEps(text) {
  const t = String(text ?? '').trim();
  const m = t.match(/^(\()?-?\$?(\d+(?:\.\d+)?)\)?$/);
  if (!m) return null;
  const v = Number(m[2]);
  return m[1] || t.startsWith('-') ? -v : v;
}

// finnhub: izbrana Finnhubova vrstica ali null; nasdaq: Nasdaqova vrstica za dan objave ali null.
// Vrne polja za vpis v koledar ali null, kadar izida še ni pri nobenem viru.
export function izidRezultata({ finnhub, nasdaq }) {
  const f = typeof finnhub?.actual === 'number' ? finnhub.actual : null;
  const n = nasdaqEps(nasdaq?.eps);
  const ocena = typeof finnhub?.estimate === 'number' ? finnhub.estimate : null;
  if (f !== null && n !== null && Math.abs(f - n) <= PRAG_RAZLIKE + 1e-9) {
    if (ocena === null) return { actualEps: `${fmt(f)} USD` };
    const smer = f >= ocena ? 'presegel pričakovanja' : 'zaostal za pričakovanji';
    return { actualEps: `${fmt(f)} USD`, actualNote: `${smer} (ocena ${fmt(ocena)} USD)` };
  }
  const deli = [];
  if (f !== null) deli.push(`${fmt(f)} USD (Finnhub)`);
  if (n !== null) deli.push(`${fmt(n)} USD (Nasdaq)`);
  if (!deli.length) return null;
  return { actualEps: deli.join(', '), ...(f !== null && ocena !== null ? { actualNote: `ocena ${fmt(ocena)} USD (Finnhub)` } : {}) };
}

export async function fetchFinnhubEarnings(apiKey, ticker) {
  const res = await fetch(`https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Finnhub ${ticker} ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}
