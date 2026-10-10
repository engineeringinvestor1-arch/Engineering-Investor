// Slovarja morata imeti iste ključe: manjkajoč prevod bi se na strani pokazal kot prazno mesto
// ali kot "undefined". Zagon: npm run test:prevodi
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sl } from '../../src/i18n/sl.ts';
import { en } from '../../src/i18n/en.ts';
import { LOCALES, POTI, getLang, drugiJeziki } from '../../src/i18n/index.ts';

// Vsi ključi slovarja kot poti ("koledar.opisi.us-cpi"), z vrsto vrednosti.
function kljuci(o, pot = '') {
  const out = new Map();
  for (const [k, v] of Object.entries(o)) {
    const p = pot ? `${pot}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [kk, vv] of kljuci(v, p)) out.set(kk, vv);
    else out.set(p, Array.isArray(v) ? `seznam(${v.length})` : typeof v);
  }
  return out;
}

test('angleški slovar ima iste ključe in vrste vrednosti kot slovenski', () => {
  const a = kljuci(sl), b = kljuci(en);
  assert.deepEqual([...b.keys()].filter((k) => !a.has(k)), [], 'ključi, ki jih slovenski slovar nima');
  assert.deepEqual([...a.keys()].filter((k) => !b.has(k)), [], 'ključi, ki v angleškem slovarju manjkajo');
  for (const [k, vrsta] of a) assert.equal(b.get(k), vrsta, `vrsta vrednosti pri ${k}`);
});

test('angleški slovar nima praznih besedil in slovenskih šumnikov', () => {
  const prazni = [], sumniki = [];
  const obisci = (o, pot = '') => {
    for (const [k, v] of Object.entries(o)) {
      const p = pot ? `${pot}.${k}` : k;
      if (typeof v === 'string') {
        if (!v.trim()) prazni.push(p);
        if (/[čšžČŠŽ]/.test(v)) sumniki.push(p);
      } else if (Array.isArray(v)) v.forEach((x, i) => typeof x === 'string' && /[čšžČŠŽ]/.test(x) && sumniki.push(`${p}[${i}]`));
      else if (v && typeof v === 'object') obisci(v, p);
    }
  };
  obisci(en);
  assert.deepEqual(prazni, []);
  assert.deepEqual(sumniki, []);
});

test('besedila s spremenljivkami vrnejo niz v obeh jezikih', () => {
  for (const s of [sl, en]) {
    assert.match(s.clanek.minBranja(7), /7/);
    assert.match(s.ik.koncniOpomba('10 let', '6 %', ''), /6 %/);
    assert.match(s.pd.cenaCez('5 let'), /5 let/);
  }
});

test('vsaka stalna stran ima naslov v vsakem jeziku in ga gumb za jezik najde', () => {
  for (const [stran, poti] of Object.entries(POTI)) {
    for (const l of LOCALES) assert.ok(poti[l], `${stran} nima naslova za ${l}`);
    for (const l of LOCALES) {
      assert.equal(getLang(poti[l]), l, `${poti[l]} ni prepoznan kot ${l}`);
      // Stran je dosegljiva z zaključno poševnico in brez nje (/en/calendar in /en/calendar/).
      const sPosevnico = poti[l] === '/' ? '/' : `${poti[l]}/`;
      assert.deepEqual(drugiJeziki(sPosevnico), { ...poti }, `gumb za jezik na ${sPosevnico}`);
      assert.deepEqual(drugiJeziki(poti[l]), { ...poti }, `gumb za jezik na ${poti[l]}`);
    }
  }
  assert.equal(getLang('/analize/uber-analiza-2026-09-23'), 'sl');
  assert.equal(getLang('/en/analysis/uber-analysis-2026-09-23/'), 'en');
  assert.equal(getLang('/energija'), 'sl', 'naslov, ki se le začne z "en", ni angleški');
  assert.equal(drugiJeziki('/analize/uber-analiza-2026-09-23'), null);
});
