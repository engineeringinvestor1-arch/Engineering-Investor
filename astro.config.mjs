// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { remarkInlineSvg } from './src/plugins/remark-inline-svg.mjs';
import { remarkNelomljivo } from './src/plugins/remark-nelomljivo.mjs';
import { remarkGrafi } from './src/plugins/remark-grafi.mjs';
import { remarkViri } from './src/plugins/remark-viri.mjs';

// Predogled na računalniku (astro dev) pokaže vire označene, objavljena stran jih nima (src/plugins/remark-viri.mjs).
// Možnost je v nastavitvah, zato Astro ob prehodu med predogledom in gradnjo zavrže shranjene izrise člankov.
const predogled = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
  site: 'https://engineering-investor.com',
  // Aplikacija Sledilnik financ (/aplikacija/) in osnutki analiz (/osnutek/) so skriti in ne gredo v zemljevid strani.
  integrations: [sitemap({ filter: (stran) => !stran.includes('/aplikacija/') && !stran.includes('/osnutek/') }), react()],
  // Grafi .svg se vstavijo naravnost v stran, da sledijo gumbu za svetlo/temno temo.
  // Oznake [n] v besedilu odprejo graf; remarkGrafi teče pred remarkInlineSvg, ker potrebuje slike.
  // Vrednosti v preglednicah in znak % ob številu se ne lomijo v novo vrstico.
  // Viri se odstranijo za remarkInlineSvg, ker so zapisani tudi v grafih.
  markdown: { remarkPlugins: [remarkGrafi, remarkInlineSvg, [remarkViri, { prikazi: predogled }], remarkNelomljivo] },
});
