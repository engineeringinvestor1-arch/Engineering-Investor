// Zapis števil kot drugod na strani: pika za tisočice, decimalna vejica, minus pred številom.
// Skupno za oba kalkulatorja (pričakovani donos in investicijski).

export function fmt(v: number, dec = 2): string {
  if (!Number.isFinite(v)) return '–';
  const fixed = Math.abs(v).toFixed(dec);
  const [int, frac] = fixed.split('.');
  const body = `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${frac ? `,${frac}` : ''}`;
  return v < 0 && Number(fixed) !== 0 ? `-${body}` : body;
}

export const fmtPct = (v: number, dec = 1, sign = false) => `${sign && v > 0 ? '+' : ''}${fmt(v * 100, dec)} %`;

// Vnos izpišemo tako, kot ga je vpisal bralec: 10 in ne 10,0; 12,5 in ne 12,50.
export const fmtVnos = (v: number, dec = 2) => fmt(v, dec).replace(/(,\d*?)0+$/, '$1').replace(/,$/, '');
export const pctVnos = (v: number) => `${fmtVnos(v * 100)} %`;

// Znesek v evrih; nad 100.000 brez centov, da so velike številke berljive.
export const evro = (v: number, dec?: number) => `${fmt(v, dec ?? (Math.abs(v) >= 100000 ? 0 : 2))} €`;

// "čez 1 leto, 2 leti, 3 leta, 5 let": dvojina in množina po zadnjih dveh števkah.
export function let_(n: number): string {
  const d = n % 100;
  return `${n} ${d === 1 ? 'leto' : d === 2 ? 'leti' : d === 3 || d === 4 ? 'leta' : 'let'}`;
}

// Mestnik za besedilo "po 10 letih", "v 2 letih", "po 1 letu".
export function letih(n: number): string {
  return `${n} ${n % 100 === 1 ? 'letu' : 'letih'}`;
}

export function mesecev(n: number): string {
  const d = n % 100;
  return `${n} ${d === 1 ? 'mesec' : d === 2 ? 'meseca' : d === 3 || d === 4 ? 'mesece' : 'mesecev'}`;
}

// Sprejme "12,5", "12.5" in "1.234,5". Vejica je decimalna; če je ni, je pika decimalna.
export function parseStevilo(raw: string): number {
  const t = String(raw).trim().replace(/\s/g, '');
  if (!t) return Number.NaN;
  const n = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return /^[-+]?\d*\.?\d+$/.test(n) ? Number(n) : Number.NaN;
}
