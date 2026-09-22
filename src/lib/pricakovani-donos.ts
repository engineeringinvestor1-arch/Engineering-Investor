// Račun kalkulatorja pričakovanega donosa (avtor, 21. 9. 2026: nadomešča kalkulator vrednotenja).
// Vrednotenje z večkratnikom dobička: dobiček zraste, trg ga ob koncu obdobja plača po izhodnem P/E.
// Vsi deleži so decimalni (0,08 = 8 %).

export interface Podjetje {
  cena: number; // današnja cena delnice
  eps: number; // dobiček na delnico, zadnjih 12 mesecev
}

export interface Cilj {
  donos: number; // želeni letni donos
  leta: number; // obdobje v letih
}

export interface Scenarij {
  rast: number; // letna rast dobička na delnico
  pe: number; // P/E ob koncu obdobja
}

export interface Izid {
  epsKonec: number;
  cenaKonec: number;
  letniDonos: number;
  najvisjaCena: number; // cena, ki jo smeš plačati danes za želeni donos
  izRasti: number; // letni prispevek rasti dobička
  izPe: number; // letni prispevek spremembe P/E; (1 + letniDonos) = (1 + izRasti) * (1 + izPe)
}

export function napaka(p: Podjetje, c: Cilj, scenariji: Scenarij[]): string | null {
  if (!(p.cena > 0)) return 'Vpiši ceno delnice, večjo od 0.';
  if (!(p.eps > 0)) return 'Kalkulator potrebuje pozitiven dobiček na delnico. Pri podjetju z izgubo P/E ne obstaja.';
  if (!(Number.isInteger(c.leta) && c.leta >= 1 && c.leta <= 30)) return 'Obdobje mora biti celo število let med 1 in 30.';
  if (!(c.donos > -1)) return 'Želeni donos mora biti večji od -100 %.';
  for (const s of scenariji) {
    if (!(s.rast > -1)) return 'Rast dobička mora biti večja od -100 %.';
    if (!(s.pe > 0)) return 'P/E ob koncu obdobja mora biti večji od 0.';
  }
  return null;
}

export const peDanes = (p: Podjetje) => p.cena / p.eps;

export function izracun(p: Podjetje, c: Cilj, s: Scenarij): Izid {
  const epsKonec = p.eps * (1 + s.rast) ** c.leta;
  const cenaKonec = epsKonec * s.pe;
  return {
    epsKonec,
    cenaKonec,
    letniDonos: (cenaKonec / p.cena) ** (1 / c.leta) - 1,
    najvisjaCena: cenaKonec / (1 + c.donos) ** c.leta,
    izRasti: s.rast,
    izPe: (s.pe / peDanes(p)) ** (1 / c.leta) - 1,
  };
}

// Obratni izračun: kolikšno letno rast dobička predvideva današnja cena, da dobiš želeni donos pri danem izhodnem P/E.
export function potrebnaRast(p: Podjetje, c: Cilj, pe: number): number {
  return ((p.cena * (1 + c.donos) ** c.leta) / (p.eps * pe)) ** (1 / c.leta) - 1;
}

// Pot cene za graf: enakomeren letni donos od današnje cene do cene ob koncu. Ponazoritev, ne napoved.
export function pot(p: Podjetje, c: Cilj, s: Scenarij): number[] {
  const r = izracun(p, c, s).letniDonos;
  return Array.from({ length: c.leta + 1 }, (_, t) => p.cena * (1 + r) ** t);
}

// Zapis števil je skupen obema kalkulatorjema (src/lib/stevilke.ts); tu ga samo posredujemo naprej,
// da uvozi v komponenti ostanejo nespremenjeni.
export { fmt, fmtPct, fmtVnos, pctVnos, let_ } from './stevilke.ts';
