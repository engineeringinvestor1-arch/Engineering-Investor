// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { remarkInlineSvg } from './src/plugins/remark-inline-svg.mjs';
import { remarkNelomljivo } from './src/plugins/remark-nelomljivo.mjs';
import { remarkGrafi } from './src/plugins/remark-grafi.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://engineering-investor.com',
  // Aplikacija Sledilnik financ (/aplikacija/) je skrita in ne gre v zemljevid strani; teče na Reactu.
  integrations: [sitemap({ filter: (stran) => !stran.includes('/aplikacija/') }), react()],
  // Grafi .svg se vstavijo naravnost v stran, da sledijo gumbu za svetlo/temno temo.
  // Oznake [n] v besedilu odprejo graf; remarkGrafi teče pred remarkInlineSvg, ker potrebuje slike.
  // Vrednosti v preglednicah in znak % ob številu se ne lomijo v novo vrstico.
  markdown: { remarkPlugins: [remarkGrafi, remarkInlineSvg, remarkNelomljivo] },
});
