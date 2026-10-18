import { useMemo, useState } from 'react';
import { Card, SectionHeader, Empty, Button } from '../ui.jsx';
import { CumulativeChart } from '../charts.jsx';
import QuickAdd from '../QuickAdd.jsx';
import { fmtEur, monthName, monthOverview, shiftMonth, todayIso, totalBalance } from '../store.js';

/**
 * Pregled meseca (avtor, 3. 10. 2026: sledilnik naj bo enostaven in naj dobro pokaže vse, kar potrebuješ).
 * Stran odgovori po vrsti: koliko sem porabil, kako je to v primerjavi s prejšnjim mesecem, koliko mi ostane,
 * za kaj je šel denar in kje. Izračuni so v store.js (monthOverview) in imajo preizkuse.
 * Šestmesečni grafi, denarni tok in trend stanja so v pogledu Poročila.
 */

const GOOD = '#059669';
const WARN = '#d97706';

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
const label = { fontSize: '0.72rem', color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' };

function Tile({ title, value, sub, action }) {
  return (
    <Card padding="1rem 1.15rem">
      <div style={label}>{title}</div>
      <div style={{ fontSize: '1.45rem', fontWeight: 700, marginTop: 4, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>{sub}</div>}
      {action}
    </Card>
  );
}

// Vodoravni stolpec: tanek, zaobljen na koncu podatka in raven ob izhodišču, brez okvirja in brez ozadja.
function Bar({ share, color }) {
  return (
    <div style={{ height: 8, marginTop: 6 }}>
      <div style={{ width: `${Math.max(1.5, share * 100)}%`, height: '100%', background: color, borderRadius: '0 4px 4px 0', transition: 'width 0.25s ease' }} />
    </div>
  );
}

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

  if (state.transactions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {quick}
        <Empty
          title="Začni s prvim nakupom"
          description="Zgoraj vpiši znesek in klikni kategorijo. Če dodaš še trgovino, si jo sledilnik zapomni in jo naslednjič izbereš z enim klikom."
          action={<Button variant="secondary" onClick={() => dispatch({ type: 'demo/load', today })}>Poglej s testnimi podatki</Button>}
        />
      </div>
    );
  }

  const inMonth = `v ${monthName(ym, 'loc')}`;
  const prevGen = monthName(o.compare.prevYm, 'gen');

  // Primerjava s prejšnjim mesecem. Pri porabi je manj dobro, več pa opozorilo: barvo nosi samo znak,
  // besedilo ostane v barvi besedila in pove isto z besedami.
  let delta = null;
  if (o.compare.prevExpense > 0 && !o.isFuture) {
    const less = o.compare.diff < 0;
    const same = Math.abs(o.compare.diff) < 0.005;
    const basis = o.compare.basis === 'toDate' ? ` do ${o.compare.day}. dne` : '';
    delta = (
      <span>
        {!same && <span aria-hidden="true" style={{ color: less ? GOOD : WARN, marginRight: 6 }}>{less ? '▼' : '▲'}</span>}
        {same
          ? `Enako kot ${prevGen}${basis}`
          : `${fmtEur(Math.abs(o.compare.diff))} ${less ? 'manj' : 'več'} kot ${prevGen}${basis} (${Math.abs(o.compare.pct).toFixed(0)} %)`}
        <span style={{ color: 'var(--color-text-subtle)' }}> · takrat {fmtEur(o.compare.prevExpense)}</span>
      </span>
    );
  } else if (!o.isFuture) {
    delta = <span style={{ color: 'var(--color-text-subtle)' }}>Za {monthName(o.compare.prevYm)} ni vnosov za primerjavo.</span>;
  }

  // Koliko ostane: od prihodkov, če so vneseni; sicer do meje proračuna; sicer povemo, kaj manjka.
  let left;
  if (o.income > 0) {
    const afterUpcoming = o.net - o.upcomingExpense + o.upcomingIncome;
    left = {
      title: 'Ostane od prihodkov',
      value: fmtEur(o.net),
      sub: (
        <>
          {o.net < 0 && <><span aria-hidden="true" style={{ color: WARN }}>▲ </span>Porabljeno več, kot je bilo prihodkov. </>}
          {o.isCurrent && o.upcomingExpense > 0 && <>Po rednih stroških, ki še pridejo: <strong style={{ color: 'var(--color-text)' }}>{fmtEur(afterUpcoming)}</strong></>}
          {!(o.isCurrent && o.upcomingExpense > 0) && o.net >= 0 && `Prihodki ${fmtEur(o.income)} manj odhodki ${fmtEur(o.expense)}`}
        </>
      ),
    };
  } else if (o.totalBudget > 0) {
    const room = o.totalBudget - o.expense;
    left = {
      title: 'Do meje proračuna',
      value: fmtEur(room),
      sub: room < 0
        ? <><span aria-hidden="true" style={{ color: WARN }}>▲ </span>Proračun {fmtEur(o.totalBudget)} je presežen.</>
        : `Mesečni proračun ${fmtEur(o.totalBudget)}`,
    };
  } else {
    left = {
      title: 'Ostane',
      value: <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>ni podatka</span>,
      sub: 'Vnesi prihodek ali nastavi proračun, pa vidiš, koliko ti ostane.',
    };
  }

  const hasBalance = state.accounts.some((a) => !a.archived && Number(a.startingBalance));
  const maxCat = o.categories[0]?.value || 1;
  const maxPayee = o.payees[0]?.value || 1;
  const nextUp = o.upcoming.find((u) => u.type === 'expense');
  const navBtn = (disabled) => ({
    width: 34, height: 34, borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent',
    color: disabled ? 'var(--color-text-subtle)' : 'var(--color-text)', cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', fontSize: '1.1rem', lineHeight: 1, opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {quick}

      {/* Izbira meseca: velja za vse spodaj. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" aria-label="Prejšnji mesec" style={navBtn(false)} onClick={() => { setYm(shiftMonth(ym, -1)); setOpenCat(null); }}>‹</button>
        <strong style={{ fontSize: '1.05rem', minWidth: 140, textAlign: 'center', color: 'var(--color-text)' }}>{cap(monthName(ym))} {ym.slice(0, 4)}</strong>
        <button type="button" aria-label="Naslednji mesec" disabled={ym >= currentYm} style={navBtn(ym >= currentYm)} onClick={() => { setYm(shiftMonth(ym, 1)); setOpenCat(null); }}>›</button>
        {ym !== currentYm && <Button variant="ghost" size="sm" onClick={() => { setYm(currentYm); setOpenCat(null); }}>Ta mesec</Button>}
      </div>

      {/* Glavna številka in tri spremljevalne. */}
      <Card padding="1.1rem 1.25rem">
        <div style={label}>Porabljeno {inMonth}</div>
        <div data-hero style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1.1, marginTop: 4, color: 'var(--color-text)', letterSpacing: '-0.03em' }}>{fmtEur(o.expense)}</div>
        {delta && <div style={{ marginTop: 6, fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>{delta}</div>}
      </Card>

      {/* Ploščice se raztegnejo čez vso širino: glavna številka je zunaj mreže, sicer ostane prazen stolpec. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>

        <Tile title={`Prihodki ${inMonth}`} value={fmtEur(o.income)} sub={o.income > 0 ? null : 'Prihodek vneseš pri hitrem vnosu z gumbom Prihodek.'} />
        <Tile title={left.title} value={left.value} sub={left.sub} />
        {o.isCurrent && (
          <Tile
            title="Še pride ta mesec"
            value={fmtEur(o.upcomingExpense)}
            sub={nextUp
              ? `${redniStroski(o.upcoming.filter((u) => u.type === 'expense').length)}, naslednji ${nextUp.name} ${dayMonth(nextUp.date)}`
              : 'Do konca meseca ni rednih stroškov.'}
            action={!nextUp && state.recurring.length === 0 && (
              <button type="button" onClick={() => onNav('ponavljajoce')} style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, color: 'var(--color-accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', textDecoration: 'underline' }}>
                Dodaj najemnino ali naročnino
              </button>
            )}
          />
        )}
        {hasBalance && <Tile title="Stanje na računih" value={fmtEur(totalBalance(state))} sub="Vsi računi skupaj, danes" />}
      </div>

      {o.count === 0 ? (
        <Card><div style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>{cap(inMonth)} še ni vnosov.</div></Card>
      ) : (
        <>
          <Card>
            <SectionHeader title="Poraba skozi mesec" subtitle={`Seštevek odhodkov od prvega v mesecu, v primerjavi z mesecem prej`} />
            <CumulativeChart
              current={o.current} previous={o.previous} days={Math.max(o.days, o.previous.length)}
              currentLabel={`${cap(monthName(ym))} ${ym.slice(0, 4)}`}
              previousLabel={`${cap(monthName(o.compare.prevYm))} ${o.compare.prevYm.slice(0, 4)}`}
              format={(v) => fmtEur(v)}
            />
            <details style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              <summary style={{ cursor: 'pointer' }}>Prikaži številke</summary>
              <table style={{ marginTop: 8, borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', alignItems: 'start' }}>
            <Card>
              <SectionHeader title="Za kaj" subtitle="Odhodki po kategorijah. Klikni kategorijo za njene vnose." />
              {o.categories.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{cap(inMonth)} ni odhodkov.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {o.categories.map((c) => {
                    const open = openCat === c.id;
                    const over = c.limit > 0 && c.value > c.limit;
                    return (
                      <div key={c.id || 'brez'} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <button type="button" aria-expanded={open} onClick={() => setOpenCat(open ? null : c.id)}
                          style={{ display: 'block', width: '100%', padding: '0.6rem 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'inherit' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.92rem', color: 'var(--color-text)', minWidth: 0 }}>
                              <span style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flex: 'none' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                            </span>
                            <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--color-text)' }}>{fmtEur(c.value)}</strong>
                              <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>{(c.share * 100).toFixed(0)} %</span>
                            </span>
                          </div>
                          <Bar share={c.value / maxCat} color={c.color} />
                          {c.limit > 0 && (
                            <div style={{ marginTop: 4, fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                              {over
                                ? <><span aria-hidden="true" style={{ color: WARN }}>▲ </span>Meja {fmtEur(c.limit)} je presežena za {fmtEur(c.value - c.limit)}</>
                                : <>Meja {fmtEur(c.limit)}, ostane {fmtEur(c.limit - c.value)}</>}
                            </div>
                          )}
                        </button>
                        {open && (
                          <div style={{ padding: '0 0 0.6rem 17px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {catTx.map((t) => (
                              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dayMonth(t.date)} {t.payee || t.notes || 'brez opisa'}</span>
                                <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{fmtEur(t.amount, true)}</span>
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
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                    Pri vnosu vpiši še trgovino, pa bo tu vidno, kje pustiš največ.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {o.payees.map((p) => (
                      <div key={p.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                          <span style={{ fontSize: '0.92rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name} <span style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>{p.count}×</span>
                          </span>
                          <strong style={{ fontSize: '0.92rem', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtEur(p.value)}</strong>
                        </div>
                        <Bar share={p.value / maxPayee} color="var(--color-accent)" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <SectionHeader title="Zadnji vnosi" action={<Button variant="ghost" size="sm" onClick={() => onNav('transakcije')}>Vsi vnosi</Button>} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recent.map((t, i) => {
                    const cat = catById[t.categoryId];
                    return (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '0.5rem 0', borderBottom: i < recent.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: cat?.color || 'var(--color-text-subtle)', flex: 'none' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.payee || cat?.name || 'Vnos'}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginLeft: 15 }}>{dayMonth(t.date)}{cat && t.payee ? ` · ${cat.name}` : ''}</div>
                        </div>
                        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
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
