// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { remarkInlineSvg } from './src/plugins/remark-inline-svg.mjs';
import { remarkNelomljivo } from './src/plugins/remark-nelomljivo.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://engineering-investor.com',
  integrations: [sitemap()],
  // Grafi .svg se vstavijo naravnost v stran, da sledijo gumbu za svetlo/temno temo.
  // Vrednosti v preglednicah in znak % ob številu se ne lomijo v novo vrstico.
  markdown: { remarkPlugins: [remarkInlineSvg, remarkNelomljivo] },
});
