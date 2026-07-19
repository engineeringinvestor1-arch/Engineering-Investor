import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const analize = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/analize' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.enum(['Makro', 'Geopolitika', 'Trgi', 'Bitcoin', 'Delnice']),
    readingTime: z.number(),
    featured: z.boolean().default(false),
    image: z.string().optional(),
  }),
});

export const collections = { analize };
