import { useMemo, useState } from 'react';
import { Empty, Button, Modal } from '../ui.jsx';
import QuickAdd from '../QuickAdd.jsx';
import { KATALOG } from '../pripomocki.jsx';
import { monthName, monthOverview, PRIPOMOCKI, PRIVZETI_PREGLED, pregledPripomockov, preklopiPripomocek, shiftMonth, todayIso } from '../store.js';

/**
 * Pregled meseca (avtor, 3. 10. 2026: sledilnik naj bo enostaven in naj dobro pokaže vse, kar potrebuješ).
 * Od 19. 10. 2026 si ga uporabnik sestavi sam iz pripomočkov (pripomocki.jsx), "podobno kot widgeti na
 * Androidu": v oknu Prilagodi pregled vidi vsakega s svojimi podatki in ga obkljuka. Izbira je v
 * settings.pregled in gre z varnostno kopijo. Izračuni so v store.js (monthOverview) in imajo preizkuse.
 */

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const Chevron = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'} />
  </svg>
);
const PRILAGODI = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><path d="M17 14v6M14 17h6" />
  </svg>
);
const KLJUKICA = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

export default function Dashboard({ state, dispatch, onNav, quickAdd = true }) {
  const today = todayIso();
  const currentYm = today.slice(0, 7);
  const [ym, setYm] = useState(currentYm);
  const [prilagodi, setPrilagodi] = useState(false);
  const o = useMemo(() => monthOverview(state, ym, today), [state, ym, today]);
  const izbira = pregledPripomockov(state.settings);
  const quick = quickAdd && <QuickAdd state={state} dispatch={dispatch} />;

  const changeMonth = (next) => setYm(next > currentYm ? currentYm : next);
  const shrani = (pregled) => dispatch({ type: 'settings/update', settings: { pregled } });
  const p = { state, o, ym, today, onNav, onMonth: changeMonth };

  const monthBar = (
    <div className="sl-monthbar">
      <h1 className="sl-pagetitle">{cap(monthName(ym))} <span className="sl-subtle" style={{ fontWeight: 500 }}>{ym.slice(0, 4)}</span></h1>
      <div className="sl-monthbar-nav">
        {ym !== currentYm && <Button variant="ghost" size="sm" onClick={() => changeMonth(currentYm)}>Ta mesec</Button>}
        <button type="button" className="sl-iconbtn" aria-label="Prejšnji mesec" onClick={() => changeMonth(shiftMonth(ym, -1))}><Chevron dir="left" /></button>
        <button type="button" className="sl-iconbtn" aria-label="Naslednji mesec" disabled={ym >= currentYm} onClick={() => changeMonth(shiftMonth(ym, 1))}><Chevron /></button>
        {state.transactions.length > 0 && <button type="button" className="sl-iconbtn" aria-label="Prilagodi pregled" title="Prilagodi pregled" onClick={() => setPrilagodi(true)}>{PRILAGODI}</button>}
      </div>
    </div>
  );

  if (state.transactions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {monthBar}
        {quick}
        <Empty
          title="Začni s prvim nakupom"
          description="Na telefonu pritisni gumb + spodaj, na računalniku vpiši znesek zgoraj, nato izberi kategorijo. Če dodaš še trgovino, si jo sledilnik zapomni in jo naslednjič izbereš z enim dotikom."
          action={<Button variant="secondary" onClick={() => dispatch({ type: 'demo/load', today })}>Poglej s testnimi podatki</Button>}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {monthBar}
      {quick}

      {izbira.length === 0 ? (
        <Empty title="Pregled je prazen" description="Izberi, kaj želiš videti takoj ob odprtju aplikacije." action={<Button onClick={() => setPrilagodi(true)}>Prilagodi pregled</Button>} />
      ) : (
        <div key={ym} className="sl-widgets sl-fadein">
          {izbira.map((id) => {
            const w = KATALOG[id];
            return <div key={id} className={w.wide ? 'sl-widget sl-widget--wide' : 'sl-widget'}><w.C {...p} /></div>;
          })}
        </div>
      )}

      {izbira.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="secondary" size="sm" onClick={() => setPrilagodi(true)}>{PRILAGODI} Prilagodi pregled</Button>
        </div>
      )}

      <Modal open={prilagodi} onClose={() => setPrilagodi(false)} title="Prilagodi pregled" width={760}>
        <div className="sl-hint" style={{ marginBottom: 12, fontSize: '0.82rem' }}>
          Obkljukaj, kaj želiš videti na pregledu. Vsak pripomoček je prikazan s tvojimi podatki, tak kot bo na pregledu.
        </div>
        <div className="sl-katalog">
          {PRIPOMOCKI.map((id) => {
            const w = KATALOG[id];
            const on = izbira.includes(id);
            const preklopi = () => shrani(preklopiPripomocek(izbira, id));
            return (
              <div key={id} className="sl-kat" role="checkbox" aria-checked={on} aria-label={w.naslov} tabIndex={0}
                onClick={preklopi} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); preklopi(); } }}>
                <div className="sl-kat-head">
                  <div style={{ minWidth: 0 }}>
                    <div className="sl-kat-title">{w.naslov}</div>
                    <div className="sl-kat-sub">{w.opis}</div>
                  </div>
                  <span className="sl-check" aria-hidden="true">{on && KLJUKICA}</span>
                </div>
                <div className="sl-kat-preview" aria-hidden="true" inert>
                  <div className="sl-kat-scale"><w.C {...p} onNav={undefined} onMonth={undefined} /></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="sl-form-actions" style={{ marginTop: 14 }}>
          <Button variant="ghost" onClick={() => shrani(PRIVZETI_PREGLED)}>Privzeta izbira</Button>
          <div><Button onClick={() => setPrilagodi(false)}>Končano</Button></div>
        </div>
      </Modal>
    </div>
  );
}
