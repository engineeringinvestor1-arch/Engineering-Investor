// Investicijski kalkulator (avtor, 22. 9. 2026: "naredi vse tako, kot ima ta investment calculator",
// calculator.net/investment-calculator.html). Vsi zneski v evrih.
//
// Model je preverjen neposredno pri viru 22. 9. 2026 (trije primeri, razlike so največ nekaj centov,
// ker calculator.net zaokrožuje po obdobjih):
//   20.000, 10 let, 6 %, mesečno obrestovanje, 1.000 na koncu meseca  -> 200.267,28
//   20.000, 10 let, 6 %, zvezno obrestovanje, 1.000 na začetku leta   ->  50.559,53
//   20.000, 10 let, 6 %, četrtletno obrestovanje, 1.000 na koncu mes. -> 199.895,38
//
// Pravilo: donosnost je nominalna letna. Obrestovanje m-krat na leto da letni faktor (1 + r/m)^m,
// zvezno pa e^r. Vplačila rastejo po enakovredni mesečni (ali letni) stopnji iz tega letnega faktorja.

export type Pogostost = 'letno' | 'polletno' | 'cetrtletno' | 'mesecno' | 'polmesecno' | 'dvotedensko' | 'tedensko' | 'dnevno' | 'zvezno';

export const POGOSTOSTI: { id: Pogostost; ime: string; m: number | null }[] = [
  { id: 'letno', ime: 'letno', m: 1 },
  { id: 'polletno', ime: 'polletno', m: 2 },
  { id: 'cetrtletno', ime: 'četrtletno', m: 4 },
  { id: 'mesecno', ime: 'mesečno', m: 12 },
  { id: 'polmesecno', ime: 'polmesečno', m: 24 },
  { id: 'dvotedensko', ime: 'na dva tedna', m: 26 },
  { id: 'tedensko', ime: 'tedensko', m: 52 },
  { id: 'dnevno', ime: 'dnevno', m: 365 },
  { id: 'zvezno', ime: 'zvezno', m: null },
];

export interface Vhod {
  zacetni: number; // začetni znesek
  leta: number;
  stopnja: number; // nominalna letna donosnost, delež (0,06 = 6 %)
  pogostost: Pogostost;
  prispevek: number; // redno vplačilo
  ritem: 'mesecno' | 'letno'; // vsak mesec ali vsako leto
  kdaj: 'zacetek' | 'konec'; // na začetku ali na koncu obdobja
}

export interface Izid {
  koncni: number;
  zacetni: number;
  vlozki: number; // vsa redna vplačila skupaj
  obresti: number;
}

export interface Vrstica {
  obdobje: number; // leto ali mesec
  vlozek: number; // vplačila v tem obdobju (v prvem obdobju tudi začetni znesek)
  obresti: number;
  stanje: number;
}

// Letni faktor rasti iz nominalne stopnje in pogostosti obrestovanja.
export function letniFaktor(stopnja: number, pogostost: Pogostost): number {
  // Pozor: pri zveznem obrestovanju je m namenoma null. Zapis "?? 1" bi ga zamenjal z letnim
  // obrestovanjem (22. 9. 2026: 770 € razlike proti viru), zato ločimo "ni najdeno" od "zvezno".
  const najden = POGOSTOSTI.find((p) => p.id === pogostost);
  const m = najden ? najden.m : 1;
  return m === null ? Math.exp(stopnja) : (1 + stopnja / m) ** m;
}

const mesecnaStopnja = (v: Vhod) => letniFaktor(v.stopnja, v.pogostost) ** (1 / 12) - 1;

// Simulacija po mesecih. Vplačila mesečno ali enkrat na leto, na začetku ali na koncu obdobja.
// Ista pot da tabelo po mesecih, tabelo po letih in končni znesek, zato se ne morejo razhajati.
export function poMesecih(v: Vhod, mesecevSkupaj = Math.round(v.leta * 12)): Vrstica[] {
  const r = mesecnaStopnja(v);
  const vrstice: Vrstica[] = [];
  let stanje = v.zacetni;
  for (let i = 1; i <= mesecevSkupaj; i++) {
    const zacetekLeta = (i - 1) % 12 === 0;
    const konecLeta = i % 12 === 0;
    const vplacilo = v.prispevek > 0 && (v.ritem === 'mesecno' || (v.kdaj === 'zacetek' ? zacetekLeta : konecLeta)) ? v.prispevek : 0;
    let vlozek = i === 1 ? v.zacetni : 0;
    if (vplacilo && v.kdaj === 'zacetek') { stanje += vplacilo; vlozek += vplacilo; }
    const obresti = stanje * r;
    stanje += obresti;
    if (vplacilo && v.kdaj === 'konec') { stanje += vplacilo; vlozek += vplacilo; }
    vrstice.push({ obdobje: i, vlozek, obresti, stanje });
  }
  return vrstice;
}

// Preračun v današnji denar (avtor, 22. 9. 2026: inflacija kot izbira s kljukico).
// Vsak znesek delimo z rastjo cen do njegovega meseca; začetni znesek je že v današnjem denarju.
// Tako pove, kolikšno kupno moč bo imel prihranek, ne le kolikšno številko.
// Donos v vrstici je razlika med stanjema, zmanjšana za vplačilo. Tako se deli seštejejo v stanje
// (če bi le delili nominalne obresti, se ne bi), obenem pa pokaže resnico: kadar je inflacija večja
// od donosa, je realni donos negativen.
export function vDanasnjemDenarju(meseci: Vrstica[], zacetni: number, inflacija: number): { meseci: Vrstica[]; izid: Izid } {
  const delitelj = (m: number) => (1 + inflacija) ** (m / 12);
  let prej = 0; // v prvi vrstici je začetni znesek del vplačila, zato začnemo pri nič
  const vrstice = meseci.map((r, i) => {
    const vplacila = (r.vlozek - (i === 0 ? zacetni : 0)) / delitelj(r.obdobje);
    const vlozek = (i === 0 ? zacetni : 0) + vplacila;
    const stanje = r.stanje / delitelj(r.obdobje);
    const obresti = stanje - prej - vlozek;
    prej = stanje;
    return { obdobje: r.obdobje, vlozek, obresti, stanje };
  });
  const koncni = vrstice.at(-1)?.stanje ?? zacetni;
  const vlozki = vrstice.reduce((n, r) => n + r.vlozek, 0) - zacetni;
  return { meseci: vrstice, izid: { koncni, zacetni, vlozki, obresti: koncni - zacetni - vlozki } };
}

// Doba do cilja, izraženega v današnjem denarju: cilj z leti raste, zato primerjamo preračunano stanje.
export function resiMeseceRealno(v: Vhod, cilj: number, inflacija: number, najvec = 100 * 12): number {
  if (v.zacetni >= cilj) return 0;
  const vrstice = vDanasnjemDenarju(poMesecih(v, najvec), v.zacetni, inflacija).meseci;
  const zadeto = vrstice.findIndex((m) => m.stanje >= cilj);
  return zadeto === -1 ? Number.NaN : zadeto + 1;
}

// Skupine mesecev v leta; zadnje leto je lahko nepopolno.
export function poLetihIz(meseci: Vrstica[]): Vrstica[] {
  const vrstice: Vrstica[] = [];
  for (let leto = 1; (leto - 1) * 12 < meseci.length; leto++) {
    const kos = meseci.slice((leto - 1) * 12, leto * 12);
    vrstice.push({
      obdobje: leto,
      vlozek: kos.reduce((n, m) => n + m.vlozek, 0),
      obresti: kos.reduce((n, m) => n + m.obresti, 0),
      stanje: kos.at(-1)!.stanje,
    });
  }
  return vrstice;
}

// Zadnje leto je lahko nepopolno (pri iskanju dobe, npr. 28 let in 5 mesecev), zato se vzame, kar je.
export function poLetih(v: Vhod, mesecevSkupaj = Math.round(v.leta * 12)): Vrstica[] {
  const meseci = poMesecih(v, mesecevSkupaj);
  const vrstice: Vrstica[] = [];
  for (let leto = 1; (leto - 1) * 12 < meseci.length; leto++) {
    const kos = meseci.slice((leto - 1) * 12, leto * 12);
    vrstice.push({
      obdobje: leto,
      vlozek: kos.reduce((n, m) => n + m.vlozek, 0),
      obresti: kos.reduce((n, m) => n + m.obresti, 0),
      stanje: kos.at(-1)!.stanje,
    });
  }
  return vrstice;
}

export function izracunaj(v: Vhod): Izid {
  const meseci = poMesecih(v);
  const koncni = meseci.length ? meseci.at(-1)!.stanje : v.zacetni;
  const vlozki = meseci.reduce((n, m) => n + m.vlozek, 0) - v.zacetni;
  return { koncni, zacetni: v.zacetni, vlozki, obresti: koncni - v.zacetni - vlozki };
}

// ---------- iskanje manjkajoče vrednosti ----------
// Končni znesek je linearen v začetnem znesku in v vplačilu, zato ju dobimo iz dveh izračunov.
// Donosnost in doba pa se iščeta z bisekcijo, ker sta v formuli v eksponentu.

export function resiPrispevek(v: Vhod, cilj: number): number {
  const brez = izracunaj({ ...v, prispevek: 0 }).koncni;
  const zEnim = izracunaj({ ...v, prispevek: 1 }).koncni;
  return zEnim === brez ? Number.NaN : (cilj - brez) / (zEnim - brez);
}

export function resiZacetni(v: Vhod, cilj: number): number {
  const brez = izracunaj({ ...v, zacetni: 0 }).koncni;
  const zEnim = izracunaj({ ...v, zacetni: 1 }).koncni;
  return zEnim === brez ? Number.NaN : (cilj - brez) / (zEnim - brez);
}

function bisekcija(f: (x: number) => number, lo: number, hi: number, korakov = 200): number {
  let a = lo, b = hi;
  if (f(a) > 0 || f(b) < 0) return Number.NaN;
  for (let i = 0; i < korakov; i++) {
    const s = (a + b) / 2;
    if (f(s) < 0) a = s; else b = s;
  }
  return (a + b) / 2;
}

export function resiStopnjo(v: Vhod, cilj: number): number {
  return bisekcija((x) => izracunaj({ ...v, stopnja: x }).koncni - cilj, -0.95, 3);
}

// Doba v mesecih: simuliramo, dokler stanje ne doseže cilja. Vrne število mesecev ali NaN.
export function resiMesece(v: Vhod, cilj: number, najvec = 100 * 12): number {
  if (v.zacetni >= cilj) return 0;
  const vrstice = poMesecih(v, najvec);
  const zadeto = vrstice.findIndex((m) => m.stanje >= cilj);
  return zadeto === -1 ? Number.NaN : zadeto + 1;
}

// "10 let in 3 mesece" iz števila mesecev.
export function dobaBesedilo(mesecevSkupaj: number, let_: (n: number) => string, mesecev: (n: number) => string): string {
  const leta = Math.floor(mesecevSkupaj / 12);
  const ostanek = mesecevSkupaj % 12;
  if (!leta) return mesecev(ostanek);
  return ostanek ? `${let_(leta)} in ${mesecev(ostanek)}` : let_(leta);
}

export function napaka(v: Vhod, cilj: number | null): string | null {
  if (!Number.isFinite(v.zacetni) || v.zacetni < 0) return 'Začetni znesek mora biti 0 ali več.';
  if (!Number.isFinite(v.prispevek) || v.prispevek < 0) return 'Redno vplačilo mora biti 0 ali več.';
  if (!Number.isFinite(v.stopnja) || v.stopnja <= -1) return 'Donosnost mora biti večja od -100 %.';
  if (!Number.isFinite(v.leta) || v.leta <= 0 || v.leta > 100) return 'Doba mora biti med 1 mesecem in 100 leti.';
  if (cilj !== null && (!Number.isFinite(cilj) || cilj <= 0)) return 'Cilj mora biti večji od 0.';
  return null;
}
