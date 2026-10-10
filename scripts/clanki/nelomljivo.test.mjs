// Preizkus za napako iz Netflixove analize (6. 10. 2026): v preglednici regij se je "+14 %" prelomilo
// tako, da je znak % ostal sam v naslednji vrstici, v preglednici P/E pa se je prelomilo "okoli 18,5".
import test from 'node:test';
import assert from 'node:assert/strict';
import { remarkNelomljivo, KRATKA_CELICA } from '../../src/plugins/remark-nelomljivo.mjs';

const besedilo = (value) => ({ type: 'text', value });
const krepko = (value) => ({ type: 'strong', children: [besedilo(value)] });
const celica = (...children) => ({ type: 'tableCell', children });
const vrstica = (...children) => ({ type: 'tableRow', children });
const preglednica = (...children) => ({ type: 'table', children });
const odstavek = (...children) => ({ type: 'paragraph', children });
const obdelaj = (...children) => {
  const drevo = { type: 'root', children };
  remarkNelomljivo()(drevo);
  return drevo;
};
const seNeLomi = (c) => (c.data?.hProperties?.className ?? []).includes('nowrap');

test('kratka vrednost v telesu preglednice ostane v eni vrstici', () => {
  const vrednosti = [celica(besedilo('+14 %')), celica(besedilo('okoli 18,5')), celica(besedilo('5,43 mrd USD')), celica(krepko('okoli 18,5'))];
  obdelaj(preglednica(vrstica(celica(besedilo('Rast'))), vrstica(...vrednosti)));
  for (const c of vrednosti) assert.ok(seNeLomi(c), JSON.stringify(c.children));
});

test('daljši opis v celici se sme lomiti', () => {
  const opis = celica(besedilo('Dobiček vključuje odstopnino'));
  obdelaj(preglednica(vrstica(celica(besedilo('Opomba'))), vrstica(opis)));
  assert.equal(seNeLomi(opis), false);
});

test('glava preglednice se sme lomiti, da stolpci ostanejo ozki', () => {
  const glava = celica(besedilo('Prihodki Q2 2026'));
  obdelaj(preglednica(vrstica(glava), vrstica(celica(besedilo('5,43 mrd USD')))));
  assert.equal(seNeLomi(glava), false);
});

test('meja je najdaljša izmerjena vrednost v člankih', () => {
  const najdaljsa = '200,6 mrd USD (+20 %)';
  assert.equal(najdaljsa.length, KRATKA_CELICA);
  const naMeji = celica(besedilo(najdaljsa));
  const cezMejo = celica(besedilo(najdaljsa + '1'));
  obdelaj(preglednica(vrstica(celica(besedilo('Prihodki'))), vrstica(naMeji, cezMejo)));
  assert.equal(seNeLomi(naMeji), true);
  assert.equal(seNeLomi(cezMejo), false);
});

test('znak % ostane ob številu tudi v besedilu in v dolgi celici', () => {
  const stavek = besedilo('prihodki so zrasli za 52 %, strošek vsebin za 34 %');
  const poudarek = krepko('+34 %');
  const dolga = celica(besedilo('Povprečni cilj 92,82 USD (+37,5 %)'));
  obdelaj(odstavek(stavek, poudarek), preglednica(vrstica(celica(besedilo('Kaj pove'))), vrstica(dolga)));
  assert.equal(stavek.value, 'prihodki so zrasli za 52 %, strošek vsebin za 34 %');
  assert.equal(poudarek.children[0].value, '+34 %');
  assert.equal(dolga.children[0].value, 'Povprečni cilj 92,82 USD (+37,5 %)');
});

test('angleški zapis in koda ostaneta nespremenjena', () => {
  const en = besedilo('revenue grew 52%, content cost 34%');
  const koda = { type: 'inlineCode', value: '10 % 3' };
  obdelaj(odstavek(en, koda));
  assert.equal(en.value, 'revenue grew 52%, content cost 34%');
  assert.equal(koda.value, '10 % 3');
});
