import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const clanek = z.object({
  title: z.string(),
  description: z.string().optional(),
  pubDate: z.coerce.date(),
  category: z.enum(['Makro', 'Geopolitika', 'Trgi', 'Bitcoin', 'Delnice']),
  readingTime: z.number(),
  featured: z.boolean().default(false),
  image: z.string().optional(),
});

// Slovenski članki: izvirniki.
const analize = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/analize' }),
  schema: clanek,
});

// Angleški prevodi. Ime datoteke je angleški naslov strani, polje `izvirnik` pa ime slovenske
// datoteke brez končnice; po njem gumb za jezik najde isti članek v drugem jeziku.
// Nov jezik dobi svojo mapo (analize-de ...) in vnos v src/i18n/clanki.ts.
const analizeEn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/analize-en' }),
  schema: clanek.extend({ izvirnik: z.string() }),
});

export const collections = { analize, 'analize-en': analizeEn };
