/**
 * Tema aplikacije v brskalniku (avtor, 19. 10. 2026: nastavitev svetla, temna ali sistemska).
 * Izbira je v lastnem ključu, da ne spremeni teme strani Engineering Investor. Pravilo je temaZaPrikaz
 * v store.js (s preizkusom); zagonski skript v aplikacija/index.astro ga ponovi, da ob odprtju ni utripa.
 */

import { temaZaPrikaz } from './store.js';

const KLJUC = 'sledilnik-tema';
const BARVA = { light: '#F4F2EC', dark: '#0E0E0E' };

const preberi = (kljuc) => {
  try { return localStorage.getItem(kljuc); } catch { return null; }
};
const sistem = () => window.matchMedia('(prefers-color-scheme: dark)');

// Kaj je izbrano v nastavitvah: izbira aplikacije, sicer tema strani, sicer sistemska.
export function izbranaTema() {
  const izbira = preberi(KLJUC);
  if (izbira === 'light' || izbira === 'dark' || izbira === 'system') return izbira;
  const stran = preberi('theme');
  return stran === 'light' || stran === 'dark' ? stran : 'system';
}

// Nastavi temo strani in barvo vrstice telefona nad aplikacijo.
export function uveljaviTemo() {
  const t = temaZaPrikaz(preberi(KLJUC), preberi('theme'), sistem().matches);
  document.documentElement.setAttribute('data-theme', t);
  const rocna = izbranaTema() !== 'system';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', rocna ? BARVA[t] : String(m.getAttribute('media')).includes('dark') ? BARVA.dark : BARVA.light);
  });
}

export function nastaviTemo(izbira) {
  try { localStorage.setItem(KLJUC, izbira); } catch { /* zasebno okno: tema velja do zaprtja */ }
  uveljaviTemo();
}

// Pri sistemski temi aplikacija sledi telefonu tudi med uporabo (na primer ob nočnem načinu ob sončnem zahodu).
export function spremljajSistem() {
  const m = sistem();
  const ob = () => uveljaviTemo();
  m.addEventListener('change', ob);
  uveljaviTemo();
  return () => m.removeEventListener('change', ob);
}
