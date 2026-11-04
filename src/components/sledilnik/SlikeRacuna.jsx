import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from './ui.jsx';
import { uid } from './store.js';
import { pomanjsaj, preberiSliko, shraniSliko } from './slike.js';

const FOTO = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

// Ime prenesene slike: racun-trgovina-datum.jpg, brez znakov, ki jih telefon v imenu datoteke ne mara.
const imeDatoteke = (ime, datum) => `racun-${String(ime || 'slika').toLocaleLowerCase('sl-SI').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}-${datum || ''}.jpg`;

/**
 * Slike računa pri transakciji (avtor, 4. 11. 2026: "dodaj še ikono za dodajanje slik kjer bi lahko dodal
 * sliko računa za pomembne nakupe"). Slika se doda s kamero ali iz galerije, pomanjša in shrani na telefon
 * (slike.js); dotik jo odpre, od tam se prenese (na primer za garancijo) ali odstrani. Odstranjena slika
 * se iz shrambe izbriše ob naslednjem odprtju aplikacije, da preklic urejanja ne izgubi ničesar.
 */
export default function SlikeRacuna({ oznake, onChange, ime, datum }) {
  const vhod = useRef(null);
  const [naslovi, setNaslovi] = useState({});
  const [ogled, setOgled] = useState(null);
  const [delam, setDelam] = useState(false);
  const [napaka, setNapaka] = useState('');
  const nasloviRef = useRef(naslovi);
  nasloviRef.current = naslovi;

  // Predogledi iz shrambe; ob zaprtju okna se sprostijo.
  useEffect(() => {
    let zivo = true;
    (async () => {
      const novi = {};
      for (const id of oznake) {
        if (nasloviRef.current[id]) continue;
        const blob = await preberiSliko(id).catch(() => null);
        if (blob) novi[id] = URL.createObjectURL(blob);
      }
      if (zivo) setNaslovi((n) => ({ ...n, ...novi }));
      else Object.values(novi).forEach((u) => URL.revokeObjectURL(u));
    })();
    return () => { zivo = false; };
  }, [oznake.join(',')]);
  useEffect(() => () => Object.values(nasloviRef.current).forEach((u) => URL.revokeObjectURL(u)), []);

  async function dodaj(e) {
    const datoteke = [...(e.target.files || [])];
    e.target.value = '';
    if (!datoteke.length) return;
    setDelam(true);
    setNapaka('');
    const nove = [];
    try {
      for (const f of datoteke) {
        const blob = await pomanjsaj(f);
        const id = uid();
        await shraniSliko(id, blob);
        setNaslovi((n) => ({ ...n, [id]: URL.createObjectURL(blob) }));
        nove.push(id);
      }
    } catch {
      setNapaka('Slike ni bilo mogoče shraniti. Poskusi znova.');
    }
    if (nove.length) onChange([...oznake, ...nove]);
    setDelam(false);
  }

  return (
    <>
      <div className="sl-slike">
        {oznake.map((id) => (
          <button key={id} type="button" className="sl-slika" onClick={() => setOgled(id)} aria-label="Odpri sliko računa">
            {naslovi[id] ? <img src={naslovi[id]} alt="" /> : null}
          </button>
        ))}
        <button type="button" className="sl-slika sl-slika--dodaj" onClick={() => vhod.current?.click()} disabled={delam}>
          {FOTO}<span>{delam ? 'Shranjujem' : 'Dodaj sliko'}</span>
        </button>
        <input ref={vhod} type="file" accept="image/*" multiple hidden onChange={dodaj} />
      </div>
      {napaka && <div className="sl-hint" style={{ color: 'var(--sl-bad)' }}>{napaka}</div>}

      <Modal open={!!ogled} onClose={() => setOgled(null)} title="Slika računa">
        {ogled && naslovi[ogled] && <img src={naslovi[ogled]} alt="Slika računa" style={{ display: 'block', width: '100%', borderRadius: 12 }} />}
        <div className="sl-form-actions" style={{ marginTop: '0.9rem' }}>
          <Button type="button" variant="danger" onClick={() => { onChange(oznake.filter((x) => x !== ogled)); setOgled(null); }}>Odstrani</Button>
          <div>
            <a className="sl-btn sl-btn--primary sl-btn--md" href={naslovi[ogled] || undefined} download={imeDatoteke(ime, datum)} style={{ textDecoration: 'none' }}>Prenesi</a>
          </div>
        </div>
      </Modal>
    </>
  );
}
