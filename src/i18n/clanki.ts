// Članki po jezikih. Slovenski so izvirniki, prevod je ločena datoteka z lastnim naslovom strani,
// ki s poljem `izvirnik` pokaže na slovenski članek. Starejši tedenski pregledi prevoda nimajo.

import { getCollection, type CollectionEntry } from 'astro:content';
import { potClanka, type Lang } from './index';

type Izvirnik = CollectionEntry<'analize'>;
type Prevod = CollectionEntry<'analize-en'>;
export type Clanek = Izvirnik | Prevod;

// Članki v danem jeziku, najnovejši najprej.
export async function clankiV(lang: Lang): Promise<Clanek[]> {
  const vsi: Clanek[] = lang === 'en' ? await getCollection('analize-en') : await getCollection('analize');
  return vsi.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

// Naslovi istega članka v vseh jezikih, v katerih obstaja (vključno s trenutnim).
export async function jezikiClanka(lang: Lang, clanek: Clanek): Promise<Partial<Record<Lang, string>>> {
  const prevodi = await getCollection('analize-en');
  const slId = lang === 'sl' ? clanek.id : (clanek as Prevod).data.izvirnik;
  const en = prevodi.find((p) => p.data.izvirnik === slId);
  const izvirniki = await getCollection('analize');
  const poti: Partial<Record<Lang, string>> = {};
  if (izvirniki.some((c) => c.id === slId)) poti.sl = potClanka(slId, 'sl');
  if (en) poti.en = potClanka(en.id, 'en');
  return poti;
}
