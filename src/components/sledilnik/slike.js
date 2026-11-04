/**
 * Slike računov na telefonu (avtor, 4. 11. 2026: "sliko računa za pomembne nakupe tako da imam račun vedno
 * shranjen za npr uveljavljanje garancije"). Slike so v IndexedDB brskalnika, ne v localStorage z vnosi, ki
 * ima prostora le za nekaj MB. Transakcija hrani samo oznake svojih slik (t.slike). Varnostna kopija (.json)
 * vsebuje tudi slike, zapisane kot besedilo, in uvoz jih vrne v to shrambo. Izračuni s preizkusi so v store.js.
 */

import { nepotrebneSlike, oznakeSlik, velikostSlike } from './store.js';

const BAZA = 'sledilnik-slike';
const SHRAMBA = 'slike';

function odpri() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(BAZA, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(SHRAMBA);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

// Eno opravilo v shrambi; vrne rezultat zadnje zahteve, ko je opravilo zaključeno.
async function opravilo(nacin, delo) {
  const db = await odpri();
  return new Promise((resolve, reject) => {
    const t = db.transaction(SHRAMBA, nacin);
    const zahteva = delo(t.objectStore(SHRAMBA));
    t.oncomplete = () => { db.close(); resolve(zahteva?.result); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error); };
  });
}

export const shraniSliko = (id, blob) => opravilo('readwrite', (s) => s.put(blob, id));
export const preberiSliko = (id) => opravilo('readonly', (s) => s.get(id));
const vseOznake = () => opravilo('readonly', (s) => s.getAllKeys());
const izbrisiSlike = (oznake) => opravilo('readwrite', (s) => { oznake.forEach((id) => s.delete(id)); });

// Fotografijo pomanjša na velikost iz velikostSlike in shrani kot JPEG (račun ostane berljiv, datoteka majhna).
export async function pomanjsaj(file) {
  const slika = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { w, h } = velikostSlike(slika.width, slika.height);
  const platno = document.createElement('canvas');
  platno.width = w;
  platno.height = h;
  platno.getContext('2d').drawImage(slika, 0, 0, w, h);
  slika.close?.();
  return new Promise((resolve, reject) => {
    platno.toBlob((b) => (b ? resolve(b) : reject(new Error('Slike ni bilo mogoče pripraviti.'))), 'image/jpeg', 0.82);
  });
}

const vBesedilo = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

// Za varnostno kopijo: { oznaka: slika kot besedilo } za vse slike, ki jih uporabljajo transakcije.
export async function slikeZaKopijo(state) {
  const out = {};
  for (const id of oznakeSlik(state)) {
    const blob = await preberiSliko(id);
    if (blob) out[id] = await vBesedilo(blob);
  }
  return out;
}

// Ob uvozu kopije: slike nazaj v shrambo na tem telefonu.
export async function obnoviSlike(slike) {
  for (const [id, besedilo] of Object.entries(slike)) {
    await shraniSliko(id, await (await fetch(besedilo)).blob());
  }
}

// Ob odprtju aplikacije pobriše slike, ki jih ne uporablja nobena transakcija. Brez vnosov ne briše ničesar,
// da prazno ali nenaložljivo stanje ne bi izbrisalo slik.
export async function pocistiSlike(state) {
  if (!state.transactions.length) return;
  const odvec = nepotrebneSlike(await vseOznake(), state.transactions);
  if (odvec.length) await izbrisiSlike(odvec);
}
