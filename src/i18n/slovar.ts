// Dostop do slovarja po jeziku. Na strežniku (v predlogah .astro) jezik pride iz naslova strani,
// v brskalniku (skripte kalkulatorjev in koledarja) iz oznake <html lang>.

import { DEFAULT_LANG, LOCALES, type Lang } from './index.ts';
import { sl, type Slovar } from './sl.ts';
import { en } from './en.ts';

const SLOVARJI: Record<Lang, Slovar> = { sl, en };

export const slovar = (lang: Lang): Slovar => SLOVARJI[lang] ?? SLOVARJI[DEFAULT_LANG];

// Jezik odprte strani v brskalniku.
export function jezikStrani(): Lang {
  const oznaka = document.documentElement.lang;
  return (LOCALES as readonly string[]).includes(oznaka) ? (oznaka as Lang) : DEFAULT_LANG;
}

export type { Slovar };
