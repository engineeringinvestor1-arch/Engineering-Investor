import { pot, type Lang, type Stran } from './i18n';
import { slovar } from './i18n/slovar';

// Slogan in opis strani sta v slovarju (src/i18n), ker se razlikujeta po jezikih; tu ostaneta
// slovenska za vir RSS, ki je samo v slovenščini.
export const SITE = {
  name: 'Engineering Investor',
  tagline: slovar('sl').site.tagline,
  description: slovar('sl').site.description,
  url: 'https://engineering-investor.com',
  twitterHandle: '@engineering_inv',
  twitterUrl: 'https://x.com/engineering_inv',
};

// Povezave v meniju in nogi v izbranem jeziku.
export function navLinks(lang: Lang): { stran: Stran; label: string; href: string }[] {
  const t = slovar(lang).nav;
  return [
    { stran: 'analize', label: t.analize, href: pot('analize', lang) },
    { stran: 'koledar', label: t.koledar, href: pot('koledar', lang) },
    { stran: 'kalkulatorji', label: t.kalkulatorji, href: pot('kalkulatorji', lang) },
  ];
}

// Kategorije so zapisane v člankih (frontmatter) v slovenščini; prikazano ime je v slovarju.
export const CATEGORIES = [
  'Makro',
  'Geopolitika',
  'Trgi',
  'Bitcoin',
  'Delnice',
] as const;

export type Category = (typeof CATEGORIES)[number];
