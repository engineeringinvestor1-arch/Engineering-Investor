// Grafi v člankih morajo slediti temi, ki jo ima bralec izbrano (svetla/temna).
//
// Slika (`<img src="...svg">`) je za brskalnik samostojen dokument in ne vidi spremenljivk strani,
// zato gumba za temo ne more upoštevati. Ta vtičnik pri gradnji zamenja sliko .svg z njeno vsebino,
// vstavljeno naravnost v stran. Tako graf uporabi iste spremenljivke `--color-*` kot vse ostalo
// in se ob pritisku na gumb prebarva takoj, brez ponovnega nalaganja.
//
// Velja samo za .svg v mapi public/. Datoteke .png in zunanje slike ostanejo slike, kot so bile.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PUBLIC = new URL('../../public/', import.meta.url);

const isInlinableImage = (node) =>
  node?.type === 'image' && typeof node.url === 'string' && node.url.startsWith('/') && node.url.endsWith('.svg');

// Graf naj se razteza po širini besedila; velikost iz datoteke bi ga zaklenila na 720 slikovnih točk.
const responsive = (svg, alt) =>
  svg
    .replace(/<\?xml[^>]*\?>\s*/i, '')
    .replace(/^<svg([^>]*?)\s+width="[^"]*"\s+height="[^"]*"/i, '<svg$1')
    .replace(/^<svg/i, `<svg style="width:100%;height:auto;display:block"${alt ? ` aria-label="${alt.replace(/"/g, '&quot;')}"` : ''}`)
    .trim();

export function remarkInlineSvg() {
  return (tree) => {
    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children.forEach((child, i) => {
        // Zamenjamo cel odstavek, ker <figure> ne sme stati znotraj <p>.
        const image = child.type === 'paragraph' && child.children?.length === 1 && isInlinableImage(child.children[0])
          ? child.children[0]
          : null;
        if (image) {
          const file = fileURLToPath(new URL(`.${image.url}`, PUBLIC));
          if (existsSync(file)) {
            const svg = responsive(readFileSync(file, 'utf8'), image.alt ?? '');
            node.children[i] = { type: 'html', value: `<figure class="chart">${svg}</figure>` };
            return;
          }
        }
        walk(child);
      });
    };
    walk(tree);
  };
}
