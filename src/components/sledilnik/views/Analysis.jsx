import { useMemo, useState } from 'react';
import { PageHeader, Button } from '../ui.jsx';
import { KoledarPorabe, TedniMeseca, ZadnjiMeseci } from '../pripomocki.jsx';
import { monthName, monthOverview, shiftMonth, todayIso } from '../store.js';

/**
 * Analiza (avtor, 18. 10. 2026: "koledar za hiter pregled, kateri dan si največ zapravil, in primerjava
 * tednov in mesecev"). Koledar, tedni in meseci so v pripomocki.jsx, ker jih je mogoče dodati tudi na
 * pregled; izračuni so v store.js (dnevnaPoraba, stopnjePorabe, tedenskaPoraba, mesecnaPoraba) s preizkusi.
 */

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const Chevron = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'} />
  </svg>
);

export default function Analysis({ state }) {
  const today = todayIso();
  const currentYm = today.slice(0, 7);
  const [ym, setYm] = useState(currentYm);
  const o = useMemo(() => monthOverview(state, ym, today), [state, ym, today]);
  const changeMonth = (next) => setYm(next > currentYm ? currentYm : next);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PageHeader
        title="Analiza"
        subtitle={`${cap(monthName(ym))} ${ym.slice(0, 4)}`}
        action={(
          <div className="sl-monthbar-nav">
            {ym !== currentYm && <Button variant="ghost" size="sm" onClick={() => changeMonth(currentYm)}>Ta mesec</Button>}
            <button type="button" className="sl-iconbtn" aria-label="Prejšnji mesec" onClick={() => changeMonth(shiftMonth(ym, -1))}><Chevron dir="left" /></button>
            <button type="button" className="sl-iconbtn" aria-label="Naslednji mesec" disabled={ym >= currentYm} onClick={() => changeMonth(shiftMonth(ym, 1))}><Chevron /></button>
          </div>
        )}
      />
      <div key={`koledar-${ym}`} className="sl-fadein"><KoledarPorabe state={state} ym={ym} today={today} /></div>
      <div key={`tedni-${ym}`} className="sl-grid2 sl-fadein">
        <TedniMeseca state={state} ym={ym} today={today} />
        <ZadnjiMeseci state={state} ym={ym} o={o} onPick={changeMonth} />
      </div>
    </div>
  );
}
