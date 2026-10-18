import { useMemo, useState } from 'react';
import { Card, SectionHeader, PageHeader, Button } from '../ui.jsx';
import { CatIcon } from '../ikone.jsx';
import { dnevnaPoraba, fmtEur, mesecnaPoraba, monthName, monthOverview, shiftMonth, stopnjePorabe, tedenskaPoraba, todayIso } from '../store.js';

/**
 * Analiza (avtor, 18. 10. 2026: "koledar za hiter pregled, kateri dan si največ zapravil, in primerjava
 * tednov in mesecev"). Izračuni so v store.js (dnevnaPoraba, stopnjePorabe, tedenskaPoraba, mesecnaPoraba)
 * in imajo preizkuse; tu je samo prikaz.
 */

const DNEVI = ['P', 'T', 'S', 'Č', 'P', 'S', 'N'];
// Ena barva od svetle do temne: več porabe, temnejši dan.
const STOPNJE = [
  'var(--sl-field)',
  'color-mix(in srgb, var(--sl-accent) 20%, var(--sl-card))',
  'color-mix(in srgb, var(--sl-accent) 42%, var(--sl-card))',
  'color-mix(in srgb, var(--sl-accent) 70%, var(--sl-card))',
  'var(--sl-accent)',
];
const dnevFmt = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' });
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const pad2 = (n) => String(n).padStart(2, '0');
const imeDne = (ym, d) => cap(dnevFmt.format(new Date(`${ym}-${pad2(d)}T12:00:00`)));

const Chevron = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'} />
  </svg>
);

export default function Analysis({ state }) {
  const today = todayIso();
  const currentYm = today.slice(0, 7);
  const [ym, setYm] = useState(currentYm);
  const [izbran, setIzbran] = useState(null);

  const dni = useMemo(() => dnevnaPoraba(state.transactions, ym), [state.transactions, ym]);
  const stopnje = useMemo(() => stopnjePorabe(dni), [dni]);
  const tedni = useMemo(() => tedenskaPoraba(state.transactions, ym), [state.transactions, ym]);
  const meseci = useMemo(() => mesecnaPoraba(state.transactions, ym, 6), [state.transactions, ym]);
  const o = useMemo(() => monthOverview(state, ym, today), [state, ym, today]);

  const [y, m] = ym.split('-').map(Number);
  // Zamik prvega dne: koledar se začne s ponedeljkom.
  const zamik = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  // Do katerega dne je mesec že minil: tekoči do danes, pretekli ves, prihodnji nič.
  const minilo = ym === currentYm ? Number(today.slice(8, 10)) : ym < currentYm ? dni.length : 0;
  const danes = ym === currentYm ? Number(today.slice(8, 10)) : null;
  const skupaj = dni.reduce((s, v) => s + v, 0);
  const najvec = dni.reduce((best, v, i) => (v > (dni[best] ?? 0) ? i : best), 0);
  const brezPorabe = dni.slice(0, minilo).filter((v) => v === 0).length;
  const maxTeden = Math.max(1, ...tedni.map((t) => t.value));
  const maxMesec = Math.max(1, ...meseci.map((x) => x.value));
  const tekociTeden = danes ? tedni.find((t) => danes >= t.od && danes <= t.do) : null;

  const izbraniVnosi = useMemo(() => {
    if (!izbran) return [];
    const datum = `${ym}-${pad2(izbran)}`;
    return state.transactions.filter((t) => t.date === datum && t.type !== 'transfer');
  }, [state.transactions, ym, izbran]);
  const catById = useMemo(() => Object.fromEntries(state.categories.map((c) => [c.id, c])), [state.categories]);

  const changeMonth = (next) => { setYm(next); setIzbran(null); };
  const mesecNaslov = `${cap(monthName(ym))} ${y}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PageHeader
        title="Analiza"
        subtitle={mesecNaslov}
        action={(
          <div className="sl-monthbar-nav">
            {ym !== currentYm && <Button variant="ghost" size="sm" onClick={() => changeMonth(currentYm)}>Ta mesec</Button>}
            <button type="button" className="sl-iconbtn" aria-label="Prejšnji mesec" onClick={() => changeMonth(shiftMonth(ym, -1))}><Chevron dir="left" /></button>
            <button type="button" className="sl-iconbtn" aria-label="Naslednji mesec" disabled={ym >= currentYm} onClick={() => changeMonth(shiftMonth(ym, 1))}><Chevron /></button>
          </div>
        )}
      />

      <Card>
        <SectionHeader title="Poraba po dnevih" subtitle="Temnejši dan, več porabe. Izberi dan za njegove vnose." />
        <div className="sl-cal" role="group" aria-label={`Poraba po dnevih, ${mesecNaslov}`}>
          {DNEVI.map((d, i) => <div key={i} className="sl-cal-head" aria-hidden="true">{d}</div>)}
          {Array.from({ length: zamik }, (_, i) => <div key={`z${i}`} />)}
          {dni.map((v, i) => {
            const d = i + 1;
            const prihodnji = d > minilo;
            const stopnja = stopnje[i];
            const cls = ['sl-cal-day', prihodnji && 'sl-cal-day--future', !prihodnji && stopnja >= 3 && 'sl-cal-day--dark', d === danes && 'sl-cal-day--today'].filter(Boolean).join(' ');
            return (
              <button key={d} type="button" className={cls} disabled={prihodnji} aria-pressed={izbran === d}
                aria-label={`${imeDne(ym, d)}: ${prihodnji ? 'še ni' : fmtEur(v)}`}
                style={prihodnji ? undefined : { background: STOPNJE[stopnja] }}
                onClick={() => setIzbran(izbran === d ? null : d)}>
                {d}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="sl-hint">{minilo > 0 && skupaj > 0 ? `Dni brez porabe: ${brezPorabe}` : ''}</span>
          <span className="sl-legend" aria-hidden="true">manj {STOPNJE.map((c, i) => <i key={i} style={{ background: c }} />)} več</span>
        </div>

        {izbran ? (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--sl-line)', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
              <strong style={{ fontSize: '0.92rem', fontWeight: 600 }}>{imeDne(ym, izbran)}</strong>
              <span className="sl-row-amount">{fmtEur(dni[izbran - 1], true)}</span>
            </div>
            {izbraniVnosi.length === 0 ? (
              <div className="sl-hint">Ta dan ni vnosov.</div>
            ) : (
              <div className="sl-list" style={{ margin: '0 -1.15rem -0.4rem' }}>
                {izbraniVnosi.map((t) => {
                  const cat = catById[t.categoryId];
                  return (
                    <div key={t.id} className="sl-row" style={{ padding: '0.55rem 1.15rem' }}>
                      <CatIcon category={cat} type={t.type} size={30} />
                      <div style={{ minWidth: 0 }}>
                        <div className="sl-row-title" style={{ fontSize: '0.88rem' }}>{t.payee || cat?.name || 'Vnos'}</div>
                        {cat && t.payee && <div className="sl-row-sub">{cat.name}</div>}
                      </div>
                      <span className={`sl-row-amount${t.type === 'income' ? ' sl-in' : ''}`} style={{ fontSize: '0.88rem' }}>
                        {t.type === 'income' ? '+' : '−'}{fmtEur(t.amount, true)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : skupaj > 0 && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--sl-line)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: '0.86rem' }}>
            <span className="sl-muted">Največ: <button type="button" className="sl-link" onClick={() => setIzbran(najvec + 1)}>{imeDne(ym, najvec + 1)}</button></span>
            <span className="sl-row-amount">{fmtEur(dni[najvec], true)}</span>
          </div>
        )}
      </Card>

      <div className="sl-grid2">
        <Card>
          <SectionHeader title={`Tedni v ${monthName(ym, 'loc')}`} subtitle="Od ponedeljka do nedelje" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tedni.map((t) => {
              const tekoci = tekociTeden === t;
              const prihodnji = t.od > minilo;
              // Povprečje samo čez dni, ki so že minili: tekoči teden v sredo deli s tremi dnevi, ne s sedmimi.
              const minuli = Math.max(0, Math.min(t.do, minilo) - t.od + 1);
              return (
                <div key={t.od} style={{ opacity: prihodnji ? 0.45 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: tekoci ? 600 : 500 }}>
                      {t.od}.–{t.do}. {m}.{tekoci && <span className="sl-tag" style={{ marginLeft: 8 }}>ta teden</span>}
                    </span>
                    <span className="sl-row-amount">{fmtEur(t.value)}</span>
                  </div>
                  <div className="sl-bar"><div style={{ width: `${Math.max(t.value > 0 ? 2 : 0, (t.value / maxTeden) * 100)}%`, background: tekoci ? 'var(--sl-accent)' : 'var(--sl-out)' }} /></div>
                  <div className="sl-row-sub">
                    {prihodnji
                      ? 'še pride'
                      : `${t.dni < 7 ? `${t.dni} dni v mesecu · ` : ''}povprečno ${fmtEur(t.value / minuli)} na dan${minuli < t.dni ? ' do danes' : ''}`}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Meseci" subtitle="Odhodki zadnjih šestih mesecev. Izberi mesec za njegov koledar." />
          <div className="sl-months">
            {meseci.map((x) => {
              const izbranMesec = x.ym === ym;
              return (
                <button key={x.ym} type="button" className="sl-month" onClick={() => changeMonth(x.ym)} aria-pressed={izbranMesec}
                  aria-label={`${cap(monthName(x.ym))} ${x.ym.slice(0, 4)}: ${fmtEur(x.value)}`}>
                  <span className="sl-month-val" style={izbranMesec ? { color: 'var(--sl-ink)' } : undefined}>{fmtEur(x.value)}</span>
                  <span className="sl-month-bar" style={{ height: `${Math.max(2, (x.value / maxMesec) * 110)}px`, background: izbranMesec ? 'var(--sl-accent)' : 'color-mix(in srgb, var(--sl-ink) 18%, transparent)' }} />
                  <span className="sl-month-lbl" style={izbranMesec ? { color: 'var(--sl-ink)', fontWeight: 600 } : undefined}>{monthName(x.ym).slice(0, 3)}</span>
                </button>
              );
            })}
          </div>
          {o.compare.prevExpense > 0 && !o.isFuture && (
            <div className="sl-hint" style={{ marginTop: 12, fontSize: '0.8rem' }}>
              {o.compare.basis === 'toDate' ? `Do ${o.compare.day}. dne` : 'Ves mesec'}: {fmtEur(o.compare.expense)}, {monthName(o.compare.prevYm)} v enakem obdobju {fmtEur(o.compare.prevExpense)}
              {o.compare.pct != null && ` (${o.compare.pct > 0 ? '+' : '−'}${Math.abs(o.compare.pct).toFixed(0)} %)`}.
              {ym === currentYm && ' Tekoči mesec je še v teku.'}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
