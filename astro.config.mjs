// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { remarkInlineSvg } from './src/plugins/remark-inline-svg.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://engineering-investor.com',
  integrations: [sitemap()],
  // Grafi .svg se vstavijo naravnost v stran, da sledijo gumbu za svetlo/temno temo.
  markdown: { remarkPlugins: [remarkInlineSvg] },
});
