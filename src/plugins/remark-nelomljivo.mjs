// Številka in njena enota morata ostati v isti vrstici.
//
// Brskalnik ozke stolpce preglednice stisne, še preden preglednici dovoli drsenje. Pri tem je
// "+14 %" prelomil v "+14" in "%" v naslednji vrstici. Ta vtičnik pri gradnji poskrbi za dvoje:
//
// 1. Kratka celica v telesu preglednice (vrednost, kot je "+14 %" ali "5,43 mrd USD") dobi razred
//    `nowrap` in se ne lomi. Daljši opisi in glava se lomijo naprej, da stolpci ostanejo ozki.
// 2. Presledek med številom in znakom % postane nedeljiv povsod, tudi v odstavkih in dolgih celicah.

// Izmerjeno na vseh člankih 6. 10. 2026: najdaljša vrednost v celici ima 21 znakov
// ("200,6 mrd USD (+20 %)"), daljše celice so stavki.
export const KRATKA_CELICA = 21;

const NEDELJIVI_PRESLEDEK = ' ';

const dolzina = (node) =>
  node.type === 'text' || node.type === 'inlineCode' ? node.value.length : (node.children ?? []).reduce((n, c) => n + dolzina(c), 0);

export function remarkNelomljivo() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'text') node.value = node.value.replace(/(\d) (?=%)/g, `$1${NEDELJIVI_PRESLEDEK}`);
      if (node.type === 'table') {
        // Prva vrstica je glava.
        for (const row of node.children.slice(1)) {
          for (const cell of row.children) {
            const n = dolzina(cell);
            if (n === 0 || n > KRATKA_CELICA) continue;
            cell.data ??= {};
            cell.data.hProperties = { ...cell.data.hProperties, className: ['nowrap'] };
          }
        }
      }
      (node.children ?? []).forEach(walk);
    };
    walk(tree);
  };
}
