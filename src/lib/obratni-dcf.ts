// Račun obratnega DCF (avtor, 30. 10. 2026: "naprednega objavi na spletni strani ampak brez primerov podjetij").
// Jedro med JEDRO-ZACETEK in JEDRO-KONEC je enako modelu scripts/company/obratni-dcf.mjs v repozitoriju agenta,
// s katerim računajo analize podjetij. Če se model spremeni, se mora tudi jedro tu; preizkus je
// scripts/kalkulatorji/obratni-dcf.test.mjs.
//
// - Deset let: prvih pet let rast, ki jo iščemo, naslednjih pet let se enakomerno spusti na dolgoročno rast.
// - Denarni tok je poslovni izid po davku minus vlaganja za rast (poslovni izid po davku × rast ÷ ROIC).
// - Vrednost podjetja minus neto dolg je vrednost lastnikov, ki se primerja s tržno vrednostjo.
// Odstotki so v odstotkih (9 = 9 %), zneski v milijardah.

export interface Vhod {
  prihodki0: number; // prihodki zadnjih 12 mesecev ali letos
  marza0: number; // današnja poslovna marža
  ciljnaMarza?: number; // poslovna marža čez letaRasti let; do tja se spreminja enakomerno
  davek: number;
  roic: number; // donosnost vloženega kapitala: koliko stane rast
  gT: number; // dolgoročna rast po letaRasti + letaPrehoda letih
  r: number; // zahtevani donos
  rast: number; // rast prihodkov v prvih letaRasti letih
  letaRasti?: number;
  letaPrehoda?: number;
  netoDolg?: number; // neto denar z minusom
}

export interface Leto { t: number; g: number; prihodki: number; m: number; nopat: number; fcff: number }

// JEDRO-ZACETEK (enako kot scripts/company/obratni-dcf.mjs v repozitoriju agenta)
// Vlaganje v letu t financira rast v letu t + 1 (NOPAT_t × g_t+1 / ROIC). Pri ROIC, enakem zahtevanemu donosu, je
// zato vrednost NOPAT prvega leta, deljen z donosom, ne glede na kasnejšo rast. Širjenje marže je brez vlaganja.
export function vrednost({ prihodki0, marza0, ciljnaMarza = marza0, davek, roic, gT, r, rast, letaRasti = 5, letaPrehoda = 5, netoDolg = 0 }: Vhod) {
  const N = letaRasti + letaPrehoda, d = r / 100;
  const rastLeta = (t: number) => (t <= letaRasti ? rast : t > N ? gT : rast - ((rast - gT) * (t - letaRasti)) / letaPrehoda);
  let prihodki = prihodki0, ev = 0, nopat = 0;
  const leta: Leto[] = [];
  for (let t = 1; t <= N; t++) {
    const g = rastLeta(t);
    prihodki *= 1 + g / 100;
    const m = t <= letaRasti ? marza0 + ((ciljnaMarza - marza0) * t) / letaRasti : ciljnaMarza;
    nopat = ((prihodki * m) / 100) * (1 - davek / 100);
    const fcff = nopat * (1 - rastLeta(t + 1) / roic);
    ev += fcff / (1 + d) ** t;
    leta.push({ t, g, prihodki, m, nopat, fcff });
  }
  const koncna = (nopat * (1 + gT / 100) * (1 - gT / roic)) / (d - gT / 100);
  const pvKoncna = koncna / (1 + d) ** N;
  ev += pvKoncna;
  return { ev, kapital: ev - netoDolg, delezKoncne: pvKoncna / ev, leta };
}

function bisekcija(f: (x: number) => number, lo: number, hi: number, narasca: boolean): number | null {
  if (narasca ? f(hi) < 0 || f(lo) > 0 : f(lo) < 0 || f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if ((f(mid) < 0) === narasca) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Rast prihodkov v prvih letih, pri kateri je vrednost lastnikov enaka tržni vrednosti. Če je ROIC nižji od
// zahtevanega donosa, rast vrednost uničuje in rešitve ni (null).
export function potrebnaRast({ trzna, ...p }: Omit<Vhod, 'rast'> & { trzna: number }): number | null {
  return bisekcija((x) => vrednost({ ...p, rast: x }).kapital - trzna, -30, 150, true);
}

// Letni donos, ki ga da scenarij pri današnji tržni vrednosti (diskontna stopnja, pri kateri je vrednost enaka ceni).
export function donosScenarija({ trzna, ...p }: Omit<Vhod, 'r'> & { trzna: number }): number | null {
  return bisekcija((x) => vrednost({ ...p, r: x }).kapital - trzna, p.gT + 0.5, 60, false);
}
// JEDRO-KONEC

// Barva primerja potrebno rast z rastjo doslej: pod njo, do 3 odstotne točke nad njo, več kot 3 točke nad njo.
export type Razred = 'ok' | 'mid' | 'hi' | 'na';
export const razred = (g: number | null, preteklo: number): Razred =>
  g == null ? 'na' : g <= preteklo ? 'ok' : g <= preteklo + 3 ? 'mid' : 'hi';

export interface Vnosi {
  trzna: number; netoDolg: number; prihodki0: number; marza0: number; davek: number;
  roic: number; preteklo: number; r: number; ciljnaMarza: number; gT: number;
}

// Oznaka napake vnosa ali null. Besedilo je v slovarju (src/i18n, ključ od.napake).
export type NapakaVnosa = 'prazno' | 'pozitivno' | 'roic' | 'donos' | 'davek';

export function napaka(v: Vnosi): NapakaVnosa | null {
  if (Object.values(v).some((x) => !Number.isFinite(x))) return 'prazno';
  if (!(v.trzna > 0 && v.prihodki0 > 0)) return 'pozitivno';
  if (!(v.roic > 0)) return 'roic';
  if (!(v.r > v.gT)) return 'donos';
  if (!(v.davek >= 0 && v.davek < 100)) return 'davek';
  return null;
}
