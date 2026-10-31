// Oznake grafov v besedilu: [1] odpre graf, bralec pa ostane, kjer je bral.
//
// Avtor 31. 10. 2026: "pri analizah na koncu dodaš slike vseh glavnih kazalnikov ... v analizi ko omeniš npr rast
// revenueja skozi leta samo označiš [1] na katero lahko pritisneš in ti prikaže graf ... tako da ne boš izgubil kje
// si ostal z branjem in da ne bo cela analiza polna slik".
//
// V Markdownu je oznaka navadna povezava na graf po imenu datoteke: `[graf](#graf-prihodki)` kaže na
// `![...](/images/articles/.../prihodki.svg)`, ki stoji kjerkoli v članku, običajno v razdelku z grafi na koncu.
// Ta vtičnik:
// 1. vsakemu grafu .svg da oznako `graf-<ime datoteke>` (vtičnik remark-inline-svg jo zapiše kot id slike);
// 2. grafe, na katere kaže vsaj ena oznaka, oštevilči po vrstnem redu v članku;
// 3. povezavo zamenja z gumbom "[n]", ki ga skripta v ArticleLayout odpre v oknu nad besedilom.
//    Brez skripte povezava skoči na graf.
// Oznaka brez grafa ustavi gradnjo, da se pokvarjena povezava ne objavi.

const PREDPONA = '#graf-';

export const idGrafa = (url) => `graf-${url.split('/').pop().replace(/\.svg$/i, '')}`;

const jeGraf = (node) => node?.type === 'image' && typeof node.url === 'string' && node.url.startsWith('/') && node.url.endsWith('.svg');
const jeOznaka = (node) => node?.type === 'link' && typeof node.url === 'string' && node.url.startsWith(PREDPONA);

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function obisci(node, fn) {
  if (!Array.isArray(node.children)) return;
  node.children.forEach((child, i) => {
    fn(child, i, node);
    obisci(child, fn);
  });
}

export function remarkGrafi() {
  return (tree, file) => {
    const pot = String(file?.path ?? '');
    const beseda = /[\\/]analize-en[\\/]/.test(pot) ? 'Chart' : 'Graf';

    const grafi = new Map();
    const oznake = [];
    obisci(tree, (node) => {
      if (jeGraf(node)) grafi.set(idGrafa(node.url), node);
      else if (jeOznaka(node)) oznake.push(node);
    });
    if (!oznake.length) return;

    const iskani = new Set();
    for (const o of oznake) {
      const id = o.url.slice(1);
      if (!grafi.has(id)) throw new Error(`Oznaka ${o.url} nima grafa ${id.slice(5)}.svg v članku ${pot}`);
      iskani.add(id);
    }

    // Številke po vrstnem redu grafov v članku, ne po vrstnem redu oznak.
    let n = 0;
    for (const [id, slika] of grafi) {
      if (!iskani.has(id)) continue;
      slika.data = { ...slika.data, stevilka: ++n, oznaka: `[${n}]` };
    }

    obisci(tree, (node, i, stars) => {
      if (!jeOznaka(node)) return;
      const id = node.url.slice(1);
      const slika = grafi.get(id);
      const opis = `${beseda} ${slika.data.stevilka}: ${slika.alt ?? ''}`.trim();
      stars.children[i] = {
        type: 'html',
        value: `<a class="graf-ref" href="#${id}" data-graf="${id}" aria-label="${escAttr(opis)}" title="${escAttr(slika.alt ?? '')}">${slika.data.oznaka}</a>`,
      };
    });
  };
}
