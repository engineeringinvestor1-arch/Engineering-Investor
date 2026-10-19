import { useMemo, useState } from 'react';
import { Card, SectionHeader, Button, Stats } from './ui.jsx';
import { CumulativeChart, PieChart, ProgressBar } from './charts.jsx';
import { CatIcon } from './ikone.jsx';
import {
  accountBalance, ACCOUNT_TYPE_LABEL, dnevnaPoraba, fmtDate, fmtEur, mesecnaPoraba, monthName, stopnjePorabe, tedenskaPoraba, totalBalance,
} from './store.js';

/**
 * Pripomočki pregleda (avtor, 19. 10. 2026: pregled naj si uporabnik sestavi sam, "podobno kot widgeti na
 * Androidu"; vsak se v izbiri pokaže tak, kot bo na pregledu). Vsak dobi isti nabor:
 * { state, o (monthOverview izbranega meseca), ym, today, onNav, onMonth }.
 * Seznam in vrstni red sta v store.js (PRIPOMOCKI), privzeta izbira je dosedanji pregled.
 * Koledar, tedni in meseci so isti kot v pogledu Analiza.
 */

const dayMonth = (iso) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const pad2 = (n) => String(n).padStart(2, '0');
const dnevFmt = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' });
const imeDne = (ym, d) => cap(dnevFmt.format(new Date(`${ym}-${pad2(d)}T12:00:00`)));
// Slovenska množina: 1 redni strošek, 2 redna stroška, 3 redni stroški, 5 rednih stroškov.
const redniStroski = (n) => {
  const r = n % 100;
  if (r === 1) return `${n} redni strošek`;
  if (r === 2) return `${n} redna stroška`;
  if (r === 3 || r === 4) return `${n} redni stroški`;
  return `${n} rednih stroškov`;
};
// Seznam v ploskvi sega do njenih robov, zato vrstice odmaknemo za njen notranji rob.
const bleed = { margin: '0 -1rem' };
const Znak = ({ good }) => <span aria-hidden="true" style={{ color: good ? 'var(--sl-in)' : 'var(--sl-warn)', marginRight: 6 }}>{good ? '▼' : '▲'}</span>;

// Do katerega dne je mesec že minil: tekoči do danes, pretekli ves, prihodnji nič.
function minuloDni(ym, today, dni) {
  const currentYm = today.slice(0, 7);
  return ym === currentYm ? Number(today.slice(8, 10)) : ym < currentYm ? dni : 0;
}

/* ---------- koledar, tedni, meseci (tudi v pogledu Analiza) ---------- */

// Ena barva od svetle do temne: več porabe, temnejši dan.
const STOPNJE = [
  'var(--sl-field)',
  'color-mix(in srgb, var(--sl-accent) 20%, var(--sl-card))',
  'color-mix(in srgb, var(--sl-accent) 42%, var(--sl-card))',
  'color-mix(in srgb, var(--sl-accent) 70%, var(--sl-card))',
  'var(--sl-accent)',
];
const DNEVI = ['P', 'T', 'S', 'Č', 'P', 'S', 'N'];

export function KoledarPorabe({ state, ym, today, title = 'Poraba po dnevih', subtitle = 'Temnejši dan, več porabe. Izberi dan za njegove vnose.' }) {
  const [izbran, setIzbran] = useState(null);
  const dni = useMemo(() => dnevnaPoraba(state.transactions, ym), [state.transactions, ym]);
  const stopnje = useMemo(() => stopnjePorabe(dni), [dni]);
  const catById = useMemo(() => Object.fromEntries(state.categories.map((c) => [c.id, c])), [state.categories]);
  const [y, m] = ym.split('-').map(Number);
  const zamik = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const minilo = minuloDni(ym, today, dni.length);
  const danes = ym === today.slice(0, 7) ? Number(today.slice(8, 10)) : null;
  const skupaj = dni.reduce((s, v) => s + v, 0);
  const najvec = dni.reduce((best, v, i) => (v > (dni[best] ?? 0) ? i : best), 0);
  const brezPorabe = dni.slice(0, minilo).filter((v) => v === 0).length;
  const dan = izbran && izbran <= dni.length ? izbran : null;
  const vnosi = dan ? state.transactions.filter((t) => t.date === `${ym}-${pad2(dan)}` && t.type !== 'transfer') : [];

  return (
    <Card>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="sl-cal" role="group" aria-label={`Poraba po dnevih, ${monthName(ym)} ${y}`}>
        {DNEVI.map((d, i) => <div key={i} className="sl-cal-head" aria-hidden="true">{d}</div>)}
        {Array.from({ length: zamik }, (_, i) => <div key={`z${i}`} />)}
        {dni.map((v, i) => {
          const d = i + 1;
          const prihodnji = d > minilo;
          const cls = ['sl-cal-day', prihodnji && 'sl-cal-day--future', !prihodnji && stopnje[i] >= 3 && 'sl-cal-day--dark', d === danes && 'sl-cal-day--today'].filter(Boolean).join(' ');
          return (
            <button key={d} type="button" className={cls} disabled={prihodnji} aria-pressed={dan === d}
              aria-label={`${imeDne(ym, d)}: ${prihodnji ? 'še ni' : fmtEur(v)}`}
              style={prihodnji ? undefined : { background: STOPNJE[stopnje[i]] }}
              onClick={() => setIzbran(dan === d ? null : d)}>
              {d}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <span className="sl-hint">{minilo > 0 && skupaj > 0 ? `Dni brez porabe: ${brezPorabe}` : ''}</span>
        <span className="sl-legend" aria-hidden="true">manj {STOPNJE.map((c, i) => <i key={i} style={{ background: c }} />)} več</span>
      </div>

      {dan ? (
        <div key={dan} className="sl-fadein" style={{ marginTop: 12, borderTop: '1px solid var(--sl-line)', paddingTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
            <strong style={{ fontSize: '0.88rem', fontWeight: 600 }}>{imeDne(ym, dan)}</strong>
            <span className="sl-row-amount">{fmtEur(dni[dan - 1], true)}</span>
          </div>
          {vnosi.length === 0 ? (
            <div className="sl-hint">Ta dan ni vnosov.</div>
          ) : (
            <div className="sl-list" style={{ margin: '0 -1rem -0.35rem' }}>
              {vnosi.map((t) => {
                const cat = catById[t.categoryId];
                return (
                  <div key={t.id} className="sl-row" style={{ padding: '0.5rem 1rem' }}>
                    <CatIcon category={cat} type={t.type} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <div className="sl-row-title">{t.payee || cat?.name || 'Vnos'}</div>
                      {cat && t.payee && <div className="sl-row-sub">{cat.name}</div>}
                    </div>
                    <span className={`sl-row-amount${t.type === 'income' ? ' sl-in' : ''}`}>{t.type === 'income' ? '+' : '−'}{fmtEur(t.amount, true)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : skupaj > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--sl-line)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: '0.84rem' }}>
          <span className="sl-muted">Največ: <button type="button" className="sl-link" onClick={() => setIzbran(najvec + 1)}>{imeDne(ym, najvec + 1)}</button></span>
          <span className="sl-row-amount">{fmtEur(dni[najvec], true)}</span>
        </div>
      )}
    </Card>
  );
}

export function TedniMeseca({ state, ym, today }) {
  const tedni = useMemo(() => tedenskaPoraba(state.transactions, ym), [state.transactions, ym]);
  const m = Number(ym.slice(5, 7));
  const dniVMesecu = tedni.length ? tedni[tedni.length - 1].do : 0;
  const minilo = minuloDni(ym, today, dniVMesecu);
  const danes = ym === today.slice(0, 7) ? Number(today.slice(8, 10)) : null;
  const tekoci = danes ? tedni.find((t) => danes >= t.od && danes <= t.do) : null;
  const max = Math.max(1, ...tedni.map((t) => t.value));
  return (
    <Card>
      <SectionHeader title={`Tedni v ${monthName(ym, 'loc')}`} subtitle="Od ponedeljka do nedelje" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {tedni.map((t) => {
          const prihodnji = t.od > minilo;
          // Povprečje samo čez dni, ki so že minili: tekoči teden v sredo deli s tremi dnevi, ne s sedmimi.
          const minuli = Math.max(0, Math.min(t.do, minilo) - t.od + 1);
          return (
            <div key={t.od} style={{ opacity: prihodnji ? 0.45 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: tekoci === t ? 600 : 500 }}>
                  {t.od}.–{t.do}. {m}.{tekoci === t && <span className="sl-tag" style={{ marginLeft: 8 }}>ta teden</span>}
                </span>
                <span className="sl-row-amount">{fmtEur(t.value)}</span>
              </div>
              <div className="sl-bar"><div style={{ width: `${Math.max(t.value > 0 ? 2 : 0, (t.value / max) * 100)}%`, background: tekoci === t ? 'var(--sl-accent)' : 'var(--sl-out)' }} /></div>
              <div className="sl-row-sub">
                {prihodnji ? 'še pride' : `${t.dni < 7 ? `${t.dni} dni v mesecu · ` : ''}povprečno ${fmtEur(t.value / minuli)} na dan${minuli < t.dni ? ' do danes' : ''}`}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ZadnjiMeseci({ state, ym, o, onPick }) {
  const meseci = useMemo(() => mesecnaPoraba(state.transactions, ym, 6), [state.transactions, ym]);
  const max = Math.max(1, ...meseci.map((x) => x.value));
  return (
    <Card>
      <SectionHeader title="Meseci" subtitle="Odhodki zadnjih šestih mesecev. Izberi mesec za njegov pregled." />
      <div className="sl-months">
        {meseci.map((x) => {
          const izbran = x.ym === ym;
          return (
            <button key={x.ym} type="button" className="sl-month" onClick={() => onPick?.(x.ym)} aria-pressed={izbran}
              aria-label={`${cap(monthName(x.ym))} ${x.ym.slice(0, 4)}: ${fmtEur(x.value)}`}>
              <span className="sl-month-val" style={izbran ? { color: 'var(--sl-ink)' } : undefined}>{fmtEur(x.value)}</span>
              <span className="sl-month-bar" style={{ height: `${Math.max(2, (x.value / max) * 100)}px`, background: izbran ? 'var(--sl-accent)' : 'color-mix(in srgb, var(--sl-ink) 18%, transparent)' }} />
              <span className="sl-month-lbl" style={izbran ? { color: 'var(--sl-ink)', fontWeight: 600 } : undefined}>{monthName(x.ym).slice(0, 3)}</span>
            </button>
          );
        })}
      </div>
      {o && o.compare.prevExpense > 0 && !o.isFuture && (
        <div className="sl-hint" style={{ marginTop: 10 }}>
          {o.compare.basis === 'toDate' ? `Do ${o.compare.day}. dne` : 'Ves mesec'}: {fmtEur(o.compare.expense)}, {monthName(o.compare.prevYm)} v enakem obdobju {fmtEur(o.compare.prevExpense)}
          {o.compare.pct != null && ` (${o.compare.pct > 0 ? '+' : '−'}${Math.abs(o.compare.pct).toFixed(0)} %)`}.
        </div>
      )}
    </Card>
  );
}

/* ---------- pripomočki dosedanjega pregleda ---------- */

function Poraba({ o, ym }) {
  const prevGen = monthName(o.compare.prevYm, 'gen');
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
  return (
    <div className="sl-hero">
      <div className="sl-label">Porabljeno v {monthName(ym, 'loc')}</div>
      <div data-hero className="sl-hero-value">{fmtEur(o.expense)}</div>
      {delta && <div className="sl-hero-delta">{delta}</div>}
    </div>
  );
}

function Stevilke({ state, o, ym, onNav }) {
  const inMonth = `v ${monthName(ym, 'loc')}`;
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
      value: <span style={{ fontFamily: 'inherit', fontSize: '0.92rem', color: 'var(--sl-muted)' }}>ni podatka</span>,
      sub: 'Vnesi prihodek ali nastavi proračun, pa vidiš, koliko ti ostane.',
    };
  }
  const hasBalance = state.accounts.some((a) => !a.archived && Number(a.startingBalance));
  const nextUp = o.upcoming.find((u) => u.type === 'expense');
  return (
    <Stats items={[
      { label: `Prihodki ${inMonth}`, value: fmtEur(o.income), sub: o.income > 0 ? null : 'Prihodek vneseš z gumbom + in izbiro Prihodek.' },
      left,
      o.isCurrent && {
        label: 'Še pride ta mesec',
        value: fmtEur(o.upcomingExpense),
        sub: nextUp
          ? `${redniStroski(o.upcoming.filter((u) => u.type === 'expense').length)}, naslednji ${nextUp.name} ${dayMonth(nextUp.date)}`
          : (
            <>
              Do konca meseca ni rednih stroškov.
              {state.recurring.length === 0 && onNav && <> <button type="button" className="sl-link" onClick={() => onNav('ponavljajoce')}>Dodaj najemnino ali naročnino</button></>}
            </>
          ),
      },
      hasBalance && { label: 'Stanje na računih', value: fmtEur(totalBalance(state)), sub: 'Vsi računi skupaj, danes' },
    ]} />
  );
}

function SkoziMesec({ o, ym }) {
  return (
    <Card>
      <SectionHeader title="Poraba skozi mesec" subtitle="Seštevek odhodkov od prvega v mesecu, v primerjavi z mesecem prej" />
      <CumulativeChart
        current={o.current} previous={o.previous} days={Math.max(o.days, o.previous.length)}
        currentLabel={`${cap(monthName(ym))} ${ym.slice(0, 4)}`}
        previousLabel={`${cap(monthName(o.compare.prevYm))} ${o.compare.prevYm.slice(0, 4)}`}
        format={(v) => fmtEur(v)}
        height={190}
      />
      <details style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--sl-muted)' }}>
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
  );
}

function Kategorije({ state, o, ym }) {
  const [openCat, setOpenCat] = useState(null);
  const catById = useMemo(() => Object.fromEntries(state.categories.map((c) => [c.id, c])), [state.categories]);
  // Vnosi vseh kategorij meseca naenkrat: seznam se razpre in zapre s prehodom, zato mora biti izrisan vedno.
  const poKategoriji = useMemo(() => {
    const out = {};
    for (const t of state.transactions) {
      if (t.type !== 'expense' || t.date.slice(0, 7) !== ym) continue;
      (out[t.categoryId || ''] ||= []).push(t);
    }
    for (const k of Object.keys(out)) out[k].sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }, [state.transactions, ym]);
  const maxCat = o.categories[0]?.value || 1;
  return (
    <Card padding="1rem 1rem 0.25rem">
      <SectionHeader title="Za kaj" subtitle="Odhodki po kategorijah. Izberi kategorijo za njene vnose." />
      {o.categories.length === 0 ? (
        <div className="sl-muted" style={{ fontSize: '0.88rem', paddingBottom: '0.8rem' }}>V {monthName(ym, 'loc')} ni odhodkov.</div>
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
                <div className="sl-expand" data-open={open}>
                  <div>
                    <div style={{ padding: '0 1rem 0.7rem 58px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(poKategoriji[c.id || ''] || []).map((t) => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.82rem', color: 'var(--sl-muted)' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dayMonth(t.date)} {t.payee || t.notes || 'brez opisa'}</span>
                          <span className="sl-row-amount" style={{ color: 'var(--sl-ink)', fontSize: '0.82rem' }}>{fmtEur(t.amount, true)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Trgovine({ o }) {
  const max = o.payees[0]?.value || 1;
  return (
    <Card>
      <SectionHeader title="Kje" subtitle="Trgovine in storitve z največ porabe" />
      {o.payees.length === 0 ? (
        <div className="sl-muted" style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>Pri vnosu vpiši še trgovino, pa bo tu vidno, kje pustiš največ.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {o.payees.map((p) => (
            <div key={p.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <span className="sl-row-title">{p.name} <span className="sl-subtle" style={{ fontSize: '0.76rem', fontWeight: 400 }}>{p.count}×</span></span>
                <span className="sl-row-amount">{fmtEur(p.value)}</span>
              </div>
              <div className="sl-bar"><div style={{ width: `${Math.max(2, (p.value / max) * 100)}%`, background: 'var(--sl-accent)' }} /></div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Zadnji({ state, ym, onNav }) {
  const catById = useMemo(() => Object.fromEntries(state.categories.map((c) => [c.id, c])), [state.categories]);
  const recent = state.transactions
    .filter((t) => t.type !== 'transfer' && t.date.slice(0, 7) === ym)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  return (
    <Card padding="1rem 1rem 0.25rem">
      <SectionHeader title="Zadnji vnosi" action={onNav && <Button variant="ghost" size="sm" onClick={() => onNav('transakcije')}>Vsi vnosi</Button>} />
      {recent.length === 0 ? (
        <div className="sl-muted" style={{ fontSize: '0.88rem', paddingBottom: '0.8rem' }}>V {monthName(ym, 'loc')} še ni vnosov.</div>
      ) : (
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
                <span className={`sl-row-amount${t.type === 'income' ? ' sl-in' : ''}`}>{t.type === 'income' ? '+' : '−'}{fmtEur(t.amount, true)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ---------- dodatni pripomočki ---------- */

function Razporeditev({ o, ym }) {
  const top = o.categories.slice(0, 5);
  const ostalo = o.categories.slice(5).reduce((s, c) => s + c.value, 0);
  const deli = ostalo > 0 ? [...top, { id: 'ostalo', name: 'Ostalo', color: 'var(--sl-subtle)', value: ostalo, share: o.expense > 0 ? ostalo / o.expense : 0 }] : top;
  return (
    <Card>
      <SectionHeader title="Razporeditev odhodkov" subtitle={`Deleži kategorij v ${monthName(ym, 'loc')}`} />
      {deli.length === 0 ? (
        <div className="sl-muted" style={{ fontSize: '0.88rem' }}>Ni odhodkov.</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <PieChart data={deli.map((c) => ({ value: c.value, color: c.color }))} size={140} thickness={18} centerValue={fmtEur(o.expense)} centerLabel="skupaj" />
          <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {deli.map((c) => (
              <div key={c.id || 'brez'} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                <span className="sl-dot" style={{ background: c.color }} />
                <span className="sl-row-title" style={{ flex: 1, fontWeight: 400 }}>{c.name}</span>
                <span className="sl-subtle sl-num">{(c.share * 100).toFixed(0)} %</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Proracun({ state, o, onNav }) {
  const zMejo = o.categories.filter((c) => c.limit > 0).sort((a, b) => b.value / b.limit - a.value / a.limit).slice(0, 4);
  const barva = (pct, color) => (pct > 100 ? 'var(--sl-bad)' : pct > 80 ? 'var(--sl-warn)' : color);
  const skupaj = o.totalBudget > 0 ? (o.expense / o.totalBudget) * 100 : 0;
  return (
    <Card>
      <SectionHeader title="Proračun" subtitle="Kategorije, ki so najbližje meji" action={onNav && <Button variant="ghost" size="sm" onClick={() => onNav('proracun')}>Uredi</Button>} />
      {o.totalBudget === 0 ? (
        <div className="sl-muted" style={{ fontSize: '0.88rem' }}>Meje še niso nastavljene. Nastaviš jih v pogledu Proračun.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
              <span style={{ fontWeight: 500 }}>Skupaj</span>
              <span className="sl-num">{fmtEur(o.expense)} <span className="sl-subtle">/ {fmtEur(o.totalBudget)}</span></span>
            </div>
            <ProgressBar value={Math.min(o.expense, o.totalBudget)} max={o.totalBudget} color={barva(skupaj, 'var(--sl-in)')} height={6} />
          </div>
          {zMejo.map((c) => {
            const pct = (c.value / c.limit) * 100;
            const cat = state.categories.find((x) => x.id === c.id);
            return (
              <div key={c.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 5 }}>
                  <span>{cat?.name || c.name}</span>
                  <span className="sl-num sl-muted">{pct.toFixed(0)} %</span>
                </div>
                <ProgressBar value={Math.min(c.value, c.limit)} max={c.limit} color={barva(pct, c.color)} height={4} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Cilji({ state, onNav }) {
  const cilji = state.goals.slice(0, 4);
  return (
    <Card>
      <SectionHeader title="Cilji" subtitle="Napredek varčevalnih ciljev" action={onNav && <Button variant="ghost" size="sm" onClick={() => onNav('cilji')}>Vsi</Button>} />
      {cilji.length === 0 ? (
        <div className="sl-muted" style={{ fontSize: '0.88rem' }}>Še ni ciljev. Dodaš jih v pogledu Cilji.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {cilji.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            return (
              <div key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.84rem', marginBottom: 5 }}>
                  <span className="sl-row-title" style={{ fontWeight: 500 }}>{g.name}</span>
                  <span className="sl-num sl-muted">{fmtEur(g.currentAmount)} / {fmtEur(g.targetAmount)}</span>
                </div>
                <ProgressBar value={g.currentAmount} max={g.targetAmount} color={g.color} height={5} />
                <div className="sl-row-sub">{pct.toFixed(0)} % doseženo{g.deadline ? ` · rok ${fmtDate(g.deadline)}` : ''}</div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Redni({ o, onNav }) {
  return (
    <Card padding="1rem 1rem 0.25rem">
      <SectionHeader title="Redni stroški, ki še pridejo" subtitle="Do konca meseca" action={onNav && <Button variant="ghost" size="sm" onClick={() => onNav('ponavljajoce')}>Uredi</Button>} />
      {o.upcoming.length === 0 ? (
        <div className="sl-muted" style={{ fontSize: '0.88rem', paddingBottom: '0.8rem' }}>{o.isCurrent ? 'Do konca meseca ni rednih stroškov.' : 'Velja samo za tekoči mesec.'}</div>
      ) : (
        <div className="sl-list" style={bleed}>
          {o.upcoming.map((u, i) => (
            <div key={`${u.name}-${u.date}-${i}`} className="sl-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
              <div style={{ minWidth: 0 }}>
                <div className="sl-row-title">{u.name}</div>
                <div className="sl-row-sub">{dayMonth(u.date)}</div>
              </div>
              <span className={`sl-row-amount${u.type === 'income' ? ' sl-in' : ''}`}>{u.type === 'income' ? '+' : '−'}{fmtEur(u.amount, true)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Racuni({ state, onNav }) {
  const racuni = state.accounts.filter((a) => !a.archived);
  return (
    <Card padding="1rem 1rem 0.25rem">
      <SectionHeader title="Stanje na računih" subtitle={`Skupaj ${fmtEur(totalBalance(state))}`} action={onNav && <Button variant="ghost" size="sm" onClick={() => onNav('racuni')}>Računi</Button>} />
      <div className="sl-list" style={bleed}>
        {racuni.map((a) => {
          const bal = accountBalance(state, a.id);
          return (
            <div key={a.id} className="sl-row">
              <span className="sl-dot" style={{ background: a.color, width: 10, height: 10 }} />
              <div style={{ minWidth: 0 }}>
                <div className="sl-row-title">{a.name}</div>
                <div className="sl-row-sub">{ACCOUNT_TYPE_LABEL[a.type]}</div>
              </div>
              <span className="sl-row-amount" style={bal < 0 ? { color: 'var(--sl-bad)' } : undefined}>{fmtEur(bal)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Opis za izbiro in prikaz. wide: na računalniku čez obe polovici pregleda.
export const KATALOG = {
  'poraba':       { naslov: 'Porabljeno ta mesec', opis: 'Velik znesek porabe in primerjava z mesecem prej', wide: true, C: Poraba },
  'stevilke':     { naslov: 'Prihodki in ostanek', opis: 'Prihodki, koliko ostane in kaj še pride', wide: true, C: Stevilke },
  'skozi-mesec':  { naslov: 'Poraba skozi mesec', opis: 'Črta porabe od prvega v mesecu ob prejšnjem mesecu', wide: true, C: SkoziMesec },
  'kategorije':   { naslov: 'Za kaj', opis: 'Odhodki po kategorijah z mejami proračuna', C: Kategorije },
  'trgovine':     { naslov: 'Kje', opis: 'Trgovine in storitve z največ porabe', C: Trgovine },
  'zadnji':       { naslov: 'Zadnji vnosi', opis: 'Šest zadnjih vnosov meseca', C: Zadnji },
  'koledar':      { naslov: 'Koledar porabe', opis: 'Kateri dan si porabil največ', C: (p) => <KoledarPorabe {...p} /> },
  'tedni':        { naslov: 'Tedni v mesecu', opis: 'Primerjava tednov s povprečjem na dan', C: (p) => <TedniMeseca {...p} /> },
  'meseci':       { naslov: 'Zadnjih šest mesecev', opis: 'Stolpci odhodkov po mesecih', C: (p) => <ZadnjiMeseci {...p} onPick={p.onMonth} /> },
  'razporeditev': { naslov: 'Razporeditev odhodkov', opis: 'Tortni graf deležev kategorij', C: Razporeditev },
  'proracun':     { naslov: 'Proračun', opis: 'Skupna poraba in kategorije najbližje meji', C: Proracun },
  'cilji':        { naslov: 'Cilji', opis: 'Napredek varčevalnih ciljev', C: Cilji },
  'redni':        { naslov: 'Redni stroški, ki še pridejo', opis: 'Najemnina, naročnine in drugo do konca meseca', C: Redni },
  'racuni':       { naslov: 'Stanje na računih', opis: 'Stanje vsakega računa in skupaj', C: Racuni },
};
