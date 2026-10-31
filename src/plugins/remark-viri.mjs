// Viri člankov so samo za urednika (avtor, 31. 10. 2026: "skriješ zapisane vire za vse gledalce, te vire lahko
// pogledam samo jaz kot urednik"). Viri ostanejo v datotekah člankov, ta vtičnik jih pri gradnji strani odstrani.
// V predogledu na računalniku (astro dev) jih pusti in označi s črtkanim okvirjem, da urednik vidi, česa bralci
// ne vidijo. Omembe v besedilu ("po poročanju Bloomberga") ostanejo, ker bralec mora vedeti, od kod je trditev.
//
// Repozitorij strani je javen, zato so viri na GitHubu še vedno vidni; avtor je izbral, da se skrijejo samo na strani.
// Preizkus po gradnji (scripts/clanki/preveri-vire.mjs) ustavi objavo, če kak vir ostane na strani.
//
// Oblike virov, najdene ob pregledu vseh objav 31. 10. 2026:
// 1. odstavek z oznako na začetku: "*Viri: [CNBC](...)*", "**Viri:** ...", "*Številke: uradna sporočila podjetij ...*";
// 2. oznaka sredi odstavka: "*Ure so po slovenskem času. ... Viri: [koledar objav FRED](...).*";
// 3. povezave za temo med drugimi novicami: "- **Nemiri v Franciji**: [MarketWatch](...), [CNBC](...)", v članku
//    18. 9. 2026 s pomišljajem namesto dvopičja;
// 4. stolpec Vir v preglednici (tedenska analiza 18. 9. 2026);
// 5. "<p>Viri: ...</p>" v opisu preglednice ključnih številk;
// 6. vrstica "Vir: ..." v grafih .svg, ki jih remark-inline-svg vstavi v stran (teče pred tem vtičnikom).
// Angleški članki imajo oznake Sources, Source in Figures.

const OZNAKA = /^(?:Viri|Vir|Sources|Source)\s*:/;
// "Številke: uradna sporočila podjetij (...)" je vir samo, kadar ima povezave.
const OZNAKA_S_POVEZAVAMI = /^(?:Številke|Figures)\s*:/;
const OZNAKA_V_STAVKU = /(?<=[.!?]\s+)(?:Viri|Sources)\s*:/;
const STOLPEC = /^(?:Viri?|Sources?)$/;
// V grafu: "Vir: ...", "Viri: ...", "Source: ...", tudi "Vir dobička: ..." za prvim stavkom.
const OZNAKA_V_GRAFU = /(?:^|[.;]\s+)(?:Viri?|Sources?)(?:\s+\p{L}+)?\s*:/u;
const PODPIS = /\s*·\s*(engineering-investor\.com)\s*$/;
const LOCILA = /^[\s:,;·.()\u2013\u2014-]*$/;
// Pred povezavami stoji dvopičje ali pomišljaj.
const UVOD = /^\s*(?::|\u2014|\u2013|-)/;
const UVOD_NA_KONCU = /\s*(?::|\u2014|\u2013|-)\s*$/;

// Označba v predogledu: rumen črtkan okvir in namig ob kazalcu.
const SLOG = 'outline:1px dashed #b8860b;outline-offset:2px;background:rgba(184,134,11,.08)';
const NAMIG = 'Vir: viden samo v predogledu, na objavljeni strani ga ni';

const besedilo = (node) =>
  node.type === 'text' || node.type === 'inlineCode' ? node.value : (node.children ?? []).map(besedilo).join('');
const zunanja = (node) => node.type === 'link' && /^https?:\/\//.test(node.url);
const imaPovezavo = (node) => zunanja(node) || (node.children ?? []).some(imaPovezavo);

const oznaci = (node) => {
  node.data ??= {};
  node.data.hProperties = { ...node.data.hProperties, className: ['ei-viri'], style: SLOG, title: NAMIG };
};
const ovoj = (children) => {
  const node = { type: 'viri', data: { hName: 'span' }, children };
  oznaci(node);
  return node;
};

// Odstrani (ali v predogledu ovije) otroke od mesta od naprej.
function odrezi(children, od, prikazi) {
  if (od >= children.length) return;
  if (prikazi) children.splice(od, Infinity, ovoj(children.slice(od)));
  else children.splice(od);
}

// 2. Oznaka sredi odstavka: vse od nje do konca odstavka je vir.
function odreziOdOznake(node, prikazi) {
  const children = node.children ?? [];
  for (let i = 0; i < children.length; i++) {
    const otrok = children[i];
    if (otrok.type === 'text') {
      const m = otrok.value.match(OZNAKA_V_STAVKU);
      if (!m) continue;
      const pred = otrok.value.slice(0, m.index).trimEnd();
      const za = otrok.value.slice(m.index);
      if (prikazi) {
        children.splice(i, Infinity, { type: 'text', value: `${pred} ` }, ovoj([{ type: 'text', value: za }, ...children.slice(i + 1)]));
      } else {
        otrok.value = pred;
        children.splice(i + 1);
      }
      return true;
    }
    if (odreziOdOznake(otrok, prikazi)) {
      odrezi(children, i + 1, prikazi);
      return true;
    }
  }
  return false;
}

// 3. Povezave na koncu odstavka za dvopičjem ali pomišljajem: "**Tema**: [vir](...), [vir](...)".
function odreziPovezaveNaKoncu(odstavek, prikazi) {
  const children = odstavek.children;
  let od = children.length;
  while (od > 0 && (zunanja(children[od - 1]) || (children[od - 1].type === 'text' && LOCILA.test(children[od - 1].value)))) od--;
  if (!children.slice(od).some(zunanja)) return;
  // Uvod je lahko v ločilu tik pred povezavami ali na koncu besedila pred njimi.
  const pred = children[od - 1];
  const locilo = children[od];
  if (locilo?.type === 'text' && UVOD.test(locilo.value)) return odrezi(children, od, prikazi);
  if (pred?.type === 'text' && UVOD_NA_KONCU.test(pred.value)) {
    if (prikazi) return odrezi(children, od, prikazi);
    pred.value = pred.value.replace(UVOD_NA_KONCU, '');
    children.splice(od);
  }
}

// 4. Stolpec Vir v preglednici.
function stolpecVir(tabela, prikazi) {
  const glava = tabela.children[0];
  const i = glava?.children.findIndex((celica) => STOLPEC.test(besedilo(celica).trim())) ?? -1;
  if (i < 0) return;
  for (const vrstica of tabela.children) {
    if (!vrstica.children[i]) continue;
    if (prikazi) oznaci(vrstica.children[i]);
    else vrstica.children.splice(i, 1);
  }
  if (!prikazi && Array.isArray(tabela.align)) tabela.align.splice(i, 1);
}

// 5. in 6. Viri v HTML: odstavek v opisu preglednice in vrstica v grafu.
export function viriVHtml(html, prikazi = false) {
  let izid = html.replace(/<p>\s*((?:Viri|Vir|Sources|Source)\s*:[\s\S]*?)<\/p>/g, (_, vsebina) =>
    prikazi ? `<p class="ei-viri" style="${SLOG}" title="${NAMIG}">${vsebina}</p>` : '');
  if (prikazi) return izid;
  izid = izid.replace(/<text([^>]*)>([^<]*)<\/text>/g, (cel, lastnosti, vsebina) => {
    if (!OZNAKA_V_GRAFU.test(vsebina)) return cel;
    const podpis = vsebina.match(PODPIS);
    return podpis ? `<text${lastnosti}>${podpis[1]}</text>` : '';
  });
  return izid;
}

export function remarkViri({ prikazi = false } = {}) {
  return (tree) => {
    const walk = (node) => {
      const children = node.children;
      if (!Array.isArray(children)) return;
      for (let i = 0; i < children.length; i++) {
        const otrok = children[i];
        if (otrok.type === 'html') {
          otrok.value = viriVHtml(otrok.value, prikazi);
          continue;
        }
        if (otrok.type === 'table') {
          stolpecVir(otrok, prikazi);
          continue;
        }
        if (otrok.type === 'paragraph') {
          const zacetek = besedilo(otrok).trimStart();
          // 1. Cel odstavek je vir.
          if (OZNAKA.test(zacetek) || (OZNAKA_S_POVEZAVAMI.test(zacetek) && imaPovezavo(otrok))) {
            if (prikazi) oznaci(otrok);
            else {
              children.splice(i, 1);
              i--;
            }
            continue;
          }
          if (!odreziOdOznake(otrok, prikazi)) odreziPovezaveNaKoncu(otrok, prikazi);
          continue;
        }
        walk(otrok);
      }
    };
    walk(tree);
  };
}
