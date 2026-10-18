import { useMemo, useState } from 'react';
import { Card, SectionHeader, Empty, Button, Stats } from '../ui.jsx';
import { CumulativeChart } from '../charts.jsx';
import { CatIcon } from '../ikone.jsx';
import QuickAdd from '../QuickAdd.jsx';
import { fmtEur, monthName, monthOverview, shiftMonth, todayIso, totalBalance } from '../store.js';

/**
 * Pregled meseca (avtor, 3. 10. 2026: sledilnik naj bo enostaven in naj dobro pokaže vse, kar potrebuješ).
 * Stran odgovori po vrsti: koliko sem porabil, kako je to v primerjavi s prejšnjim mesecem, koliko mi ostane,
 * za kaj je šel denar in kje. Izračuni so v store.js (monthOverview) in imajo preizkuse.
 * Šestmesečni grafi, denarni tok in trend stanja so v pogledu Poročila.
 */

const dayMonth = (iso) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;
// Slovenska množina: 1 redni strošek, 2 redna stroška, 3 redni stroški, 5 rednih stroškov.
const redniStroski = (n) => {
  const r = n % 100;
  if (r === 1) return `${n} redni strošek`;
  if (r === 2) return `${n} redna stroška`;
  if (r === 3 || r === 4) return `${n} redni stroški`;
  return `${n} rednih stroškov`;
};
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const Chevron = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'} />
  </svg>
);

// Znak za smer primerjave: barvo nosi samo znak, besedilo ostane v barvi besedila in pove isto z besedami.
const Znak = ({ good }) => <span aria-hidden="true" style={{ color: good ? 'var(--sl-in)' : 'var(--sl-warn)', marginRight: 6 }}>{good ? '▼' : '▲'}</span>;

export default function Dashboard({ state, dispatch, onNav, quickAdd = true }) {
  const today = todayIso();
  const currentYm = today.slice(0, 7);
  const [ym, setYm] = useState(currentYm);
  const [openCat, setOpenCat] = useState(null);
  const o = useMemo(() => monthOverview(state, ym, today), [state, ym, today]);

  const catTx = useMemo(() => {
    if (openCat === null) return [];
    return state.transactions
      .filter((t) => t.type === 'expense' && t.date.slice(0, 7) === ym && (t.categoryId || '') === openCat)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, ym, openCat]);

  const recent = useMemo(() => state.transactions
    .filter((t) => t.type !== 'transfer' && t.date.slice(0, 7) === ym)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6), [state.transactions, ym]);

  const catById = useMemo(() => Object.fromEntries(state.categories.map((c) => [c.id, c])), [state.categories]);
  const quick = quickAdd && <QuickAdd state={state} dispatch={dispatch} />;

  const changeMonth = (next) => { setYm(next); setOpenCat(null); };
  const monthBar = (
    <div className="sl-monthbar">
      <h1 className="sl-pagetitle">{cap(monthName(ym))} <span className="sl-subtle" style={{ fontWeight: 500 }}>{ym.slice(0, 4)}</span></h1>
      <div className="sl-monthbar-nav">
        {ym !== currentYm && <Button variant="ghost" size="sm" onClick={() => changeMonth(currentYm)}>Ta mesec</Button>}
        <button type="button" className="sl-iconbtn" aria-label="Prejšnji mesec" onClick={() => changeMonth(shiftMonth(ym, -1))}><Chevron dir="left" /></button>
        <button type="button" className="sl-iconbtn" aria-label="Naslednji mesec" disabled={ym >= currentYm} onClick={() => changeMonth(shiftMonth(ym, 1))}><Chevron /></button>
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

  const inMonth = `v ${monthName(ym, 'loc')}`;
  const prevGen = monthName(o.compare.prevYm, 'gen');

  // Primerjava s prejšnjim mesecem. Pri porabi je manj dobro, več pa opozorilo.
  let delta = null;
  if (o.compare.prevExpense > 0 && !o.isFuture) {
    const less = o.compare.diff < 0;
    const same = Math.abs(o.compare.diff) < 0.005;
    const basis = o.compare.basis === 'toDate' ? ` do ${o.compare.day}. dne` : '';
    delta = (
      <span>
        {!same && <Znak good={less} />}
        {same
          ? `Enako kot ${prevGen}${basis}`
          : `${fmtEur(Math.abs(o.compare.diff))} ${less ? 'manj' : 'več'} kot ${prevGen}${basis} (${Math.abs(o.compare.pct).toFixed(0)} %)`}
        <span className="sl-subtle"> · takrat {fmtEur(o.compare.prevExpense)}</span>
      </span>
    );
  } else if (!o.isFuture) {
    delta = <span className="sl-subtle">Za {monthName(o.compare.prevYm)} ni vnosov za primerjavo.</span>;
  }

  // Koliko ostane: od prihodkov, če so vneseni; sicer do meje proračuna; sicer povemo, kaj manjka.
  let left;
  if (o.income > 0) {
    const afterUpcoming = o.net - o.upcomingExpense + o.upcomingIncome;
    left = {
      label: 'Ostane od prihodkov',
      value: fmtEur(o.net),
      color: o.net >= 0 ? 'var(--sl-in)' : 'var(--sl-warn)',
      sub: (
        <>
          {o.net < 0 && 'Porabljeno več, kot je bilo prihodkov. '}
          {o.isCurrent && o.upcomingExpense > 0 && <>Po rednih stroških, ki še pridejo: <strong style={{ color: 'var(--sl-ink)' }}>{fmtEur(afterUpcoming)}</strong></>}
          {!(o.isCurrent && o.upcomingExpense > 0) && o.net >= 0 && `Prihodki ${fmtEur(o.income)} manj odhodki ${fmtEur(o.expense)}`}
        </>
      ),
    };
  } else if (o.totalBudget > 0) {
    const room = o.totalBudget - o.expense;
    left = {
      label: 'Do meje proračuna',
      value: fmtEur(room),
      color: room < 0 ? 'var(--sl-warn)' : undefined,
      sub: room < 0 ? `Proračun ${fmtEur(o.totalBudget)} je presežen.` : `Mesečni proračun ${fmtEur(o.totalBudget)}`,
    };
  } else {
    left = {
      label: 'Ostane',
      value: <span style={{ fontFamily: 'inherit', fontSize: '0.95rem', color: 'var(--sl-muted)' }}>ni podatka</span>,
      sub: 'Vnesi prihodek ali nastavi proračun, pa vidiš, koliko ti ostane.',
    };
  }

  const hasBalance = state.accounts.some((a) => !a.archived && Number(a.startingBalance));
  const maxCat = o.categories[0]?.value || 1;
  const maxPayee = o.payees[0]?.value || 1;
  const nextUp = o.upcoming.find((u) => u.type === 'expense');
  // Seznam v ploskvi sega do njenih robov, zato vrstice odmaknemo za njen notranji rob.
  const bleed = { margin: '0 -1.15rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {monthBar}
      {quick}

      <div className="sl-hero">
        <div className="sl-label">Porabljeno {inMonth}</div>
        <div data-hero className="sl-hero-value">{fmtEur(o.expense)}</div>
        {delta && <div className="sl-hero-delta">{delta}</div>}
      </div>

      <Stats items={[
        { label: `Prihodki ${inMonth}`, value: fmtEur(o.income), sub: o.income > 0 ? null : 'Prihodek vneseš pri hitrem vnosu z gumbom Prihodek.' },
        left,
        o.isCurrent && {
          label: 'Še pride ta mesec',
          value: fmtEur(o.upcomingExpense),
          sub: nextUp
            ? `${redniStroski(o.upcoming.filter((u) => u.type === 'expense').length)}, naslednji ${nextUp.name} ${dayMonth(nextUp.date)}`
            : (
              <>
                Do konca meseca ni rednih stroškov.
                {state.recurring.length === 0 && <> <button type="button" className="sl-link" onClick={() => onNav('ponavljajoce')}>Dodaj najemnino ali naročnino</button></>}
              </>
            ),
        },
        hasBalance && { label: 'Stanje na računih', value: fmtEur(totalBalance(state)), sub: 'Vsi računi skupaj, danes' },
      ]} />

      {o.count === 0 ? (
        <Card><div className="sl-muted" style={{ fontSize: '0.92rem' }}>{cap(inMonth)} še ni vnosov.</div></Card>
      ) : (
        <>
          <Card>
            <SectionHeader title="Poraba skozi mesec" subtitle="Seštevek odhodkov od prvega v mesecu, v primerjavi z mesecem prej" />
            <CumulativeChart
              current={o.current} previous={o.previous} days={Math.max(o.days, o.previous.length)}
              currentLabel={`${cap(monthName(ym))} ${ym.slice(0, 4)}`}
              previousLabel={`${cap(monthName(o.compare.prevYm))} ${o.compare.prevYm.slice(0, 4)}`}
              format={(v) => fmtEur(v)}
            />
            <details style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--sl-muted)' }}>
              <summary style={{ cursor: 'pointer' }}>Prikaži številke</summary>
              <table className="sl-num" style={{ marginTop: 8, borderCollapse: 'collapse', letterSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '2px 16px 2px 0', fontWeight: 600 }}>Do dne</th>
                    <th style={{ textAlign: 'right', padding: '2px 16px 2px 0', fontWeight: 600 }}>{cap(monthName(ym))}</th>
                    <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 600 }}>{cap(monthName(o.compare.prevYm))}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(o.current.length, o.previous.length) }, (_, i) => (
                    <tr key={i}>
                      <td style={{ padding: '1px 16px 1px 0' }}>{i + 1}.</td>
                      <td style={{ textAlign: 'right', padding: '1px 16px 1px 0' }}>{i < o.current.length ? fmtEur(o.current[i]) : ''}</td>
                      <td style={{ textAlign: 'right' }}>{i < o.previous.length ? fmtEur(o.previous[i]) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Card>

          <div className="sl-grid2">
            <Card padding="1.15rem 1.15rem 0.3rem">
              <SectionHeader title="Za kaj" subtitle="Odhodki po kategorijah. Izberi kategorijo za njene vnose." />
              {o.categories.length === 0 ? (
                <div className="sl-muted" style={{ fontSize: '0.9rem', paddingBottom: '0.9rem' }}>{cap(inMonth)} ni odhodkov.</div>
              ) : (
                <div className="sl-list" style={bleed}>
                  {o.categories.map((c) => {
                    const open = openCat === c.id;
                    const over = c.limit > 0 && c.value > c.limit;
                    return (
                      <div key={c.id || 'brez'} className="sl-row-wrap">
                        <button type="button" className="sl-row" aria-expanded={open} onClick={() => setOpenCat(open ? null : c.id)}>
                          <CatIcon category={catById[c.id] || { name: c.name, color: c.color }} />
                          <div style={{ minWidth: 0 }}>
                            <div className="sl-row-title">{c.name}</div>
                            <div className="sl-bar"><div style={{ width: `${Math.max(2, (c.value / maxCat) * 100)}%`, background: c.color }} /></div>
                            {c.limit > 0 && (
                              <div className="sl-row-sub" style={{ whiteSpace: 'normal' }}>
                                {over
                                  ? <><span aria-hidden="true" style={{ color: 'var(--sl-warn)' }}>▲ </span>Meja {fmtEur(c.limit)} je presežena za {fmtEur(c.value - c.limit)}</>
                                  : <>Meja {fmtEur(c.limit)}, ostane {fmtEur(c.limit - c.value)}</>}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="sl-row-amount">{fmtEur(c.value)}</div>
                            <div className="sl-row-sub">{(c.share * 100).toFixed(0)} %</div>
                          </div>
                        </button>
                        {open && (
                          <div style={{ padding: '0 1rem 0.8rem 64px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {catTx.map((t) => (
                              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.84rem', color: 'var(--sl-muted)' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dayMonth(t.date)} {t.payee || t.notes || 'brez opisa'}</span>
                                <span className="sl-row-amount" style={{ color: 'var(--sl-ink)', fontSize: '0.84rem' }}>{fmtEur(t.amount, true)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Card>
                <SectionHeader title="Kje" subtitle="Trgovine in storitve z največ porabe" />
                {o.payees.length === 0 ? (
                  <div className="sl-muted" style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
                    Pri vnosu vpiši še trgovino, pa bo tu vidno, kje pustiš največ.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {o.payees.map((p) => (
                      <div key={p.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                          <span className="sl-row-title" style={{ fontSize: '0.92rem' }}>
                            {p.name} <span className="sl-subtle" style={{ fontSize: '0.78rem', fontWeight: 400 }}>{p.count}×</span>
                          </span>
                          <span className="sl-row-amount">{fmtEur(p.value)}</span>
                        </div>
                        <div className="sl-bar"><div style={{ width: `${Math.max(2, (p.value / maxPayee) * 100)}%`, background: 'var(--sl-accent)' }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card padding="1.15rem 1.15rem 0.3rem">
                <SectionHeader title="Zadnji vnosi" action={<Button variant="ghost" size="sm" onClick={() => onNav('transakcije')}>Vsi vnosi</Button>} />
                <div className="sl-list" style={bleed}>
                  {recent.map((t) => {
                    const cat = catById[t.categoryId];
                    return (
                      <div key={t.id} className="sl-row">
                        <CatIcon category={cat} type={t.type} />
                        <div style={{ minWidth: 0 }}>
                          <div className="sl-row-title">{t.payee || cat?.name || 'Vnos'}</div>
                          <div className="sl-row-sub">{dayMonth(t.date)}{cat && t.payee ? ` · ${cat.name}` : ''}</div>
                        </div>
                        <span className={`sl-row-amount${t.type === 'income' ? ' sl-in' : ''}`}>
                          {t.type === 'income' ? '+' : '−'}{fmtEur(t.amount, true)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
