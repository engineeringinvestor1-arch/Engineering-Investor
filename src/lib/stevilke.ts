// Zapis števil kot drugod na strani. Skupno za oba kalkulatorja (pričakovani donos in investicijski).
//
// Slovenščina: pika za tisočice, decimalna vejica, presledek pred %, znak € za zneskom (1.234,50 €).
// Angleščina: vejica za tisočice, decimalna pika, % brez presledka, znak € pred zneskom (€1,234.50).
// Jezik nastavi skripta kalkulatorja ob zagonu (nastaviJezik); privzeta je slovenščina.

import { DEFAULT_LANG, type Lang } from '../i18n/index.ts';

let jezik: Lang = DEFAULT_LANG;

export function nastaviJezik(l: Lang): void {
  jezik = l;
}

const ZAPIS: Record<Lang, { tisocice: string; decimalka: string }> = {
  sl: { tisocice: '.', decimalka: ',' },
  en: { tisocice: ',', decimalka: '.' },
};

export function fmt(v: number, dec = 2): string {
  if (!Number.isFinite(v)) return '–';
  const { tisocice, decimalka } = ZAPIS[jezik];
  const fixed = Math.abs(v).toFixed(dec);
  const [int, frac] = fixed.split('.');
  const body = `${int.replace(/\B(?=(\d{3})+(?!\d))/g, tisocice)}${frac ? `${decimalka}${frac}` : ''}`;
  return v < 0 && Number(fixed) !== 0 ? `-${body}` : body;
}

const odstotek = (stevilo: string) => (jezik === 'sl' ? `${stevilo} %` : `${stevilo}%`);

export const fmtPct = (v: number, dec = 1, sign = false) => odstotek(`${sign && v > 0 ? '+' : ''}${fmt(v * 100, dec)}`);

// Vnos izpišemo tako, kot ga je vpisal bralec: 10 in ne 10,0; 12,5 in ne 12,50.
export function fmtVnos(v: number, dec = 2): string {
  const zapisano = fmt(v, dec);
  const { decimalka } = ZAPIS[jezik];
  if (!zapisano.includes(decimalka)) return zapisano;
  const brezNicel = zapisano.replace(/0+$/, '');
  return brezNicel.endsWith(decimalka) ? brezNicel.slice(0, -1) : brezNicel;
}
export const pctVnos = (v: number) => odstotek(fmtVnos(v * 100));

// Znesek v evrih; nad 100.000 brez centov, da so velike številke berljive.
export function evro(v: number, dec?: number): string {
  const znesek = fmt(v, dec ?? (Math.abs(v) >= 100000 ? 0 : 2));
  if (jezik === 'sl') return `${znesek} €`;
  return znesek.startsWith('-') ? `-€${znesek.slice(1)}` : `€${znesek}`;
}

// "čez 1 leto, 2 leti, 3 leta, 5 let": dvojina in množina po zadnjih dveh števkah.
export function let_(n: number): string {
  if (jezik !== 'sl') return `${n} ${n === 1 ? 'year' : 'years'}`;
  const d = n % 100;
  return `${n} ${d === 1 ? 'leto' : d === 2 ? 'leti' : d === 3 || d === 4 ? 'leta' : 'let'}`;
}

// Mestnik za besedilo "po 10 letih", "v 2 letih", "po 1 letu". Angleščina sklonov nima.
export function letih(n: number): string {
  if (jezik !== 'sl') return let_(n);
  return `${n} ${n % 100 === 1 ? 'letu' : 'letih'}`;
}

export function mesecev(n: number): string {
  if (jezik !== 'sl') return `${n} ${n === 1 ? 'month' : 'months'}`;
  const d = n % 100;
  return `${n} ${d === 1 ? 'mesec' : d === 2 ? 'meseca' : d === 3 || d === 4 ? 'mesece' : 'mesecev'}`;
}

// Slovenščina: sprejme "12,5", "12.5" in "1.234,5". Vejica je decimalna; če je ni, je pika decimalna.
// Angleščina: sprejme "12.5" in "1,234.5"; vejica je ločilo tisočic, kadar stoji pred trojicami števk,
// sicer jo beremo kot decimalno ("12,5"), ker tako piše večina evropskih bralcev.
export function parseStevilo(raw: string): number {
  const t = String(raw).trim().replace(/\s/g, '');
  if (!t) return Number.NaN;
  let n: string;
  if (jezik === 'sl') n = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  else n = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
  return /^[-+]?\d*\.?\d+$/.test(n) ? Number(n) : Number.NaN;
}
