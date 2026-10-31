// Viri so samo za urednika (avtor, 31. 10. 2026: "skriješ zapisane vire za vse gledalce, te vire lahko pogledam samo
// jaz kot urednik"). Preizkus varuje vse oblike virov, najdene ob pregledu objav, in besedilo okoli njih: naslov teme
// in opomba o urah ostaneta, omembe v besedilu ("po poročanju Bloomberga") tudi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { remarkViri, viriVHtml } from '../../src/plugins/remark-viri.mjs';
import { najdbe } from './preveri-vire.mjs';

const objavljena = await createMarkdownProcessor({ remarkPlugins: [[remarkViri, { prikazi: false }]] });
const predogled = await createMarkdownProcessor({ remarkPlugins: [[remarkViri, { prikazi: true }]] });
const izris = async (md, procesor = objavljena) => (await procesor.render(md)).code;

test('vrstica Viri pod temo izgine, besedilo teme ostane', async () => {
  const html = await izris('Po poročanju Bloomberga je nafta zrasla.\n\n*Viri: [Bloomberg](https://www.bloomberg.com/a), [CNBC](https://www.cnbc.com/b)*');
  assert.match(html, /Po poročanju Bloomberga je nafta zrasla\./);
  assert.doesNotMatch(html, /Viri|bloomberg\.com|cnbc\.com/);
});

test('Viri na koncu analize in angleški Sources izginejo', async () => {
  const sl = await izris('**Viri:** Netflix: [pismo delničarjem](https://www.sec.gov/x) · [10-Q](https://www.sec.gov/y)\n\n**Opombe k podatkom:** Spremembe so izračunane iz nezaokroženih zneskov.');
  assert.doesNotMatch(sl, /Viri|sec\.gov/);
  assert.match(sl, /Opombe k podatkom/);
  const en = await izris('*Sources: [Financial Times](https://www.ft.com/a)*');
  assert.doesNotMatch(en, /Sources|ft\.com/);
});

test('vrstica Številke s povezavami je vir, brez povezav ni', async () => {
  const vir = await izris('*Številke: uradna sporočila podjetij ([Visa](https://www.sec.gov/v), [Intel](https://www.sec.gov/i)); pričakovanja: [Finnhub](https://finnhub.io/)*');
  assert.doesNotMatch(vir, /Številke|sec\.gov|finnhub/);
  const en = await izris('*Figures: official company releases ([Visa](https://www.sec.gov/v))*');
  assert.doesNotMatch(en, /Figures|sec\.gov/);
  assert.match(await izris('Številke: v milijardah USD.'), /Številke: v milijardah USD\./);
});

test('opomba pod koledarjem ostane, Viri na njenem koncu izginejo', async () => {
  const html = await izris('*Ure so po slovenskem času. V koledarju so samo objave z razpisanim datumom, ki redno premaknejo trg. Viri: [koledar objav FRED](https://fred.stlouisfed.org/releases/calendar), [rezultati podjetij: Finnhub](https://finnhub.io/).*');
  assert.match(html, /<em>Ure so po slovenskem času\. V koledarju so samo objave z razpisanim datumom, ki redno premaknejo trg\.<\/em>/);
  assert.doesNotMatch(html, /Viri|fred|finnhub/);
});

test('pri drugih novicah ostane naslov teme, povezave izginejo', async () => {
  const html = await izris([
    '- **Nemiri v Franciji**: [MarketWatch](https://www.marketwatch.com/a), [CNBC](https://www.cnbc.com/b)',
    '- **Moderna in Merck: cepivo proti raku**: [CNBC](https://www.cnbc.com/c)',
    '- **Bank of Japan dvigne obrestne mere** \u2014 [CNBC](https://www.cnbc.com/d), [Financial Times](https://www.ft.com/e)',
  ].join('\n'));
  assert.match(html, /<li><strong>Nemiri v Franciji<\/strong><\/li>/);
  assert.match(html, /<li><strong>Moderna in Merck: cepivo proti raku<\/strong><\/li>/);
  assert.match(html, /<li><strong>Bank of Japan dvigne obrestne mere<\/strong><\/li>/);
  assert.doesNotMatch(html, /href|\u2014/);
});

test('povezava sredi besedila brez dvopičja in notranja povezava ostaneta', async () => {
  const html = await izris('Izračun je v [kalkulatorju](/kalkulator-vrednotenja). Prijava je na [SEC](https://www.sec.gov/s).');
  assert.match(html, /href="\/kalkulator-vrednotenja"/);
  assert.match(html, /href="https:\/\/www\.sec\.gov\/s"/);
});

test('stolpec Vir v preglednici izgine, ostali ostanejo', async () => {
  const html = await izris('| Kazalnik | Zaprtje | Vir |\n|---|---|---|\n| S&P 500 | 7.650,50 | [Yahoo Finance](https://finance.yahoo.com/q) |');
  assert.match(html, /<th>Kazalnik<\/th>\s*<th>Zaprtje<\/th>\s*<\/tr>/);
  assert.match(html, /<td>7\.650,50<\/td>\s*<\/tr>/);
  assert.doesNotMatch(html, /Vir|yahoo/);
});

test('Viri v opisu preglednice izginejo, opis ostane', () => {
  const html = '<figcaption><p>Sprememba v tednu: zaprtje 23. 10. do 30. 10.</p><p>Viri: Yahoo Finance (<a href="https://finance.yahoo.com/q">S&amp;P 500</a>).</p></figcaption>';
  assert.equal(viriVHtml(html), '<figcaption><p>Sprememba v tednu: zaprtje 23. 10. do 30. 10.</p></figcaption>');
});

test('vrstica Vir v grafu izgine, podpis strani ostane', () => {
  const graf = [
    '<text x="24" y="40">Prihodki (mrd USD)</text>',
    '<text x="24" y="418" style="fill:var(--ei-muted)">Vir: Alphabet, sporočila o rezultatih (8-K, SEC).</text>',
    '<text x="24" y="554">Vir: Yahoo Finance (sektorski ETF-ji SPDR), FRED (S&amp;P 500) · engineering-investor.com</text>',
    '<text x="24" y="440">Cena: Yahoo Finance, zaprtje 20. 10. 2026. Vir dobička: pismo delničarjem 20. 10. 2026.</text>',
    '<text x="24" y="430">Sources: Uber, Q2 2026 earnings release.</text>',
  ].join('');
  assert.equal(viriVHtml(graf), '<text x="24" y="40">Prihodki (mrd USD)</text><text x="24" y="554">engineering-investor.com</text>');
});

test('predogled vire pokaže in označi', async () => {
  const html = await izris('*Viri: [CNBC](https://www.cnbc.com/b)*\n\n- **Nemiri v Franciji**: [CNBC](https://www.cnbc.com/c)', predogled);
  assert.equal((html.match(/class="ei-viri"/g) ?? []).length, 2);
  assert.match(html, /cnbc\.com\/b/);
  assert.match(html, /cnbc\.com\/c/);
  assert.match(viriVHtml('<p>Viri: X</p>', true), /<p class="ei-viri"/);
  assert.equal(viriVHtml('<text>Vir: X</text>', true), '<text>Vir: X</text>');
});

test('preverjanje po gradnji najde vir in pusti čisto stran', () => {
  const ogrodje = new Set(['https://x.com/engineering_inv']);
  const cista = '<a href="https://x.com/engineering_inv">X</a><a href="https://x.com/intent/tweet?text=a">Deli</a><p>Po poročanju Bloomberga je nafta zrasla.</p>';
  assert.deepEqual(najdbe(cista, ogrodje), []);
  assert.deepEqual(najdbe('<p><em>Viri: <a href="https://www.ft.com/a">FT</a></em></p>', ogrodje), ['zunanja povezava https://www.ft.com/a', 'oznaka vira "Viri:"']);
  assert.deepEqual(najdbe('<svg><text>Vir: SEC</text></svg>', ogrodje), ['oznaka vira "Vir:"']);
  assert.deepEqual(najdbe('<p class="ei-viri">x</p>', ogrodje), ['oznaka predogleda ei-viri (izris iz astro dev)']);
});
