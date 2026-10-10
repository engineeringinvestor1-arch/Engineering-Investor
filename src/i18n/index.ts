// Jeziki strani (avtor, 6. 10. 2026: stran naj bo uporabna tudi zunaj Slovenije, prvotni jezik ostane
// slovenščina, drugi jeziki pridejo pozneje).
//
// Kako to deluje:
// - Slovenska stran ostane na dosedanjih naslovih (/analize, /koledar ...).
// - Vsak drug jezik ima svojo predpono (/en/analysis, /en/calendar ...). Strani so zgrajene vnaprej,
//   prevod torej ni strojni in ga vidi tudi iskalnik.
// - Besedila so v slovarjih: src/i18n/sl.ts (izvirnik) in src/i18n/en.ts. Nov jezik pomeni nov slovar
//   z enakimi ključi, vnos v LOCALES in POTI ter mapo strani src/pages/<jezik>/.

export const LOCALES = ['sl', 'en'] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = 'sl';

// Kratka oznaka za gumb in polno ime za bralnike zaslona, vsako v svojem jeziku.
export const LANG_SHORT: Record<Lang, string> = { sl: 'SL', en: 'EN' };
export const LANG_NAME: Record<Lang, string> = { sl: 'Slovenščina', en: 'English' };

// Zapis datumov in števil (Intl) ter oznaka za družbena omrežja.
export const INTL: Record<Lang, string> = { sl: 'sl-SI', en: 'en-GB' };
export const OG_LOCALE: Record<Lang, string> = { sl: 'sl_SI', en: 'en_GB' };

const brezPosevnice = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);

// Jezik iz naslova: /en ali /en/... je angleščina, vse drugo slovenščina.
export function getLang(pathname: string): Lang {
  const prvi = pathname.split('/').filter(Boolean)[0];
  return (LOCALES as readonly string[]).includes(prvi) && prvi !== DEFAULT_LANG ? (prvi as Lang) : DEFAULT_LANG;
}

// Naslovi stalnih strani v vsakem jeziku. Ključ je ime strani, ne njen naslov.
export const POTI = {
  domov: { sl: '/', en: '/en' },
  analize: { sl: '/analize', en: '/en/analysis' },
  koledar: { sl: '/koledar', en: '/en/calendar' },
  kalkulatorji: { sl: '/kalkulatorji', en: '/en/calculators' },
  investicijski: { sl: '/investicijski-kalkulator', en: '/en/investment-calculator' },
  vrednotenje: { sl: '/kalkulator-vrednotenja', en: '/en/valuation-calculator' },
} as const satisfies Record<string, Record<Lang, string>>;

export type Stran = keyof typeof POTI;

export const pot = (stran: Stran, lang: Lang): string => POTI[stran][lang];

// Naslov članka v danem jeziku.
export const potClanka = (slug: string, lang: Lang): string => `${POTI.analize[lang]}/${slug}`;

// Ista stran v vseh jezikih, če je naslov ena od stalnih strani. Za članke jo poda stran sama,
// ker je prevod članka ločena datoteka z lastnim naslovom.
export function drugiJeziki(pathname: string): Record<Lang, string> | null {
  const lang = getLang(pathname);
  const trenutna = brezPosevnice(pathname);
  const stran = (Object.keys(POTI) as Stran[]).find((k) => POTI[k][lang] === trenutna);
  return stran ? { ...POTI[stran] } : null;
}

// Kadar strani v drugem jeziku ni (starejši članki so samo v slovenščini), gumb vodi na seznam analiz.
export function nadomestnaPot(lang: Lang): string {
  return POTI.analize[lang];
}
