import { useMemo, useState } from 'react';
import { Card, SectionHeader, PageHeader, Select, Stats } from '../ui.jsx';
import { PieChart, BarChart, LineChart, DenarniTok, StackedBar } from '../charts.jsx';
import { CatIcon } from '../ikone.jsx';
import { denarniTok, fmtEur, lastNMonths, monthName, monthRange, sumByCategory, sumByType } from '../store.js';

const RANGE_OPTIONS = [
  { v: 3,  label: 'Zadnji 3 meseci' },
  { v: 6,  label: 'Zadnjih 6 mesecev' },
  { v: 12, label: 'Zadnjih 12 mesecev' },
  { v: 24, label: 'Zadnjih 24 mesecev' },
];

// Prihodki zeleni, odhodki v barvi besedila, neto v poudarjeni barvi (sledilnik.css).
const IN = 'var(--sl-in)';
const OUT = 'var(--sl-out)';
const NET = 'var(--sl-accent)';

function Legend({ items }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '0.78rem', color: 'var(--sl-muted)', flexWrap: 'wrap' }}>
      {items.map(([label, color]) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
        </span>
      ))}
    </div>
  );
}

// Seznam delov ob tortnem grafu: ikona kategorije, ime, znesek in delež.
function Breakdown({ items, total }) {
  return (
    <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((c) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem' }}>
          <CatIcon category={{ name: c.label, color: c.color }} type={c.type} size={28} />
          <span className="sl-row-title" style={{ flex: 1 }}>{c.label}</span>
          <span className="sl-row-amount" style={{ fontSize: '0.86rem' }}>{fmtEur(c.value)}</span>
          <span className="sl-subtle" style={{ width: 38, textAlign: 'right', fontSize: '0.78rem' }}>{total > 0 ? ((c.value / total) * 100).toFixed(0) : 0} %</span>
        </div>
      ))}
    </div>
  );
}

export default function Reports({ state }) {
  const [range, setRange] = useState(6);
  const months = lastNMonths(range);

  const monthlyData = useMemo(() => months.map((mk) => {
    const { from, to } = monthRange(mk);
    const txs = state.transactions.filter((t) => t.date >= from && t.date <= to);
    return {
      key: mk,
      label: mk.slice(2, 4) === mk.slice(0, 4).slice(2) ? `${mk.slice(5)}.` : mk.slice(5),
      income: sumByType(txs, 'income'),
      expense: sumByType(txs, 'expense'),
      net: sumByType(txs, 'income') - sumByType(txs, 'expense'),
    };
  }), [state.transactions, months.join(',')]);

  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0);
  const totalNet = totalIncome - totalExpense;
  const avgIncome = totalIncome / range;
  const avgExpense = totalExpense / range;
  const avgSavingsRate = avgIncome > 0 ? ((avgIncome - avgExpense) / avgIncome) * 100 : 0;

  const allTx = useMemo(() => {
    const startMonth = months[0];
    const { from } = monthRange(startMonth);
    const { to } = monthRange(months[months.length - 1]);
    return state.transactions.filter((t) => t.date >= from && t.date <= to);
  }, [state.transactions, months.join(',')]);

  const categorySpend = useMemo(() => {
    const m = sumByCategory(allTx, 'expense');
    return [...m.entries()]
      .map(([cid, v]) => {
        const cat = state.categories.find((c) => c.id === cid);
        return { id: cid, label: cat?.name || 'Brez kategorije', value: v, color: cat?.color || '#64748b', type: 'expense' };
      })
      .sort((a, b) => b.value - a.value);
  }, [allTx, state.categories]);

  const incomeBreakdown = useMemo(() => {
    const m = sumByCategory(allTx, 'income');
    return [...m.entries()]
      .map(([cid, v]) => {
        const cat = state.categories.find((c) => c.id === cid);
        return { id: cid, label: cat?.name || 'Brez kategorije', value: v, color: cat?.color || '#10b981', type: 'income' };
      })
      .sort((a, b) => b.value - a.value);
  }, [allTx, state.categories]);

  const cumulativeBalance = useMemo(() => {
    let inc = 0, exp = 0, net = 0;
    return monthlyData.map((m) => {
      inc += m.income;
      exp += m.expense;
      net = inc - exp;
      return { incomeY: inc, expenseY: exp, netY: net, label: m.label };
    });
  }, [monthlyData]);

  const header = (
    <PageHeader
      title="Poročila"
      subtitle="Trend, kategorije in denarni tok"
      action={state.transactions.length > 0 && (
        <Select value={range} aria-label="Obdobje" onChange={(e) => setRange(Number(e.target.value))} style={{ width: 'auto', height: 38 }}>
          {RANGE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </Select>
      )}
    />
  );

  if (state.transactions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {header}
        <Card padding="2.75rem 1.5rem" style={{ textAlign: 'center', color: 'var(--sl-muted)' }}>
          Vnesi nekaj transakcij, da vidiš poročila.
        </Card>
      </div>
    );
  }

  const varcevanje = avgSavingsRate >= 20 ? 'Odlično' : avgSavingsRate >= 0 ? 'V redu' : 'Pod ničlo';

  // Denarni tok: bistvo v enem stavku nad grafom.
  const tok = denarniTok(incomeBreakdown, categorySpend);
  const obdobje = `v zadnjih ${range} mesecih`;
  const tokPovzetek = !tok ? '' : tok.prihodki === 0
    ? `V zadnjih ${range} mesecih ni vpisanih prihodkov, odhodkov je bilo ${fmtEur(tok.odhodki)}.`
    : tok.ostane >= 0
      ? `Od ${fmtEur(tok.prihodki)} prihodkov ${obdobje} je ostalo ${fmtEur(tok.ostane)} (${Math.round((tok.ostane / tok.prihodki) * 100)} %).`
      : `Odhodki ${obdobje} so bili za ${fmtEur(-tok.ostane)} višji od prihodkov.`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {header}

      <Stats items={[
        { label: 'Prihodki', value: fmtEur(totalIncome), sub: `${range} mesecev skupaj`, color: IN },
        { label: 'Odhodki', value: fmtEur(totalExpense), sub: `${range} mesecev skupaj` },
        { label: 'Neto', value: fmtEur(totalNet), color: totalNet >= 0 ? IN : 'var(--sl-warn)' },
        { label: 'Povprečno na mesec', value: fmtEur(avgIncome - avgExpense), sub: 'prihodki manj odhodki' },
        { label: 'Stopnja varčevanja', value: `${avgSavingsRate.toFixed(0)} %`, sub: varcevanje, color: avgSavingsRate >= 20 ? IN : avgSavingsRate >= 0 ? undefined : 'var(--sl-warn)' },
      ]} />

      <div className="sl-grid2">
        <Card>
          <SectionHeader title="Prihodki in odhodki po mesecih" />
          <BarChart data={monthlyData} height={200} />
          <Legend items={[['Prihodki', IN], ['Odhodki', OUT]]} />
        </Card>
        <Card>
          <SectionHeader title="Skupaj od začetka obdobja" subtitle="Seštevek prihodkov, odhodkov in neto" />
          <LineChart series={[
            { points: cumulativeBalance.map((c) => ({ y: c.incomeY, label: c.label })), color: IN },
            { points: cumulativeBalance.map((c) => ({ y: c.expenseY, label: c.label })), color: OUT },
            { points: cumulativeBalance.map((c) => ({ y: c.netY, label: c.label })), color: NET, fill: true },
          ]} height={200} />
          <Legend items={[['Prihodki', IN], ['Odhodki', OUT], ['Neto', NET]]} />
        </Card>
      </div>

      {tok && (
        <Card>
          <SectionHeader title="Denarni tok" subtitle={tokPovzetek} />
          <DenarniTok tok={tok} />
        </Card>
      )}

      <div className="sl-grid2">
        <Card>
          <SectionHeader title="Odhodki po kategorijah" />
          {categorySpend.length === 0 ? (
            <div className="sl-muted">Ni podatkov.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <PieChart data={categorySpend.map((c) => ({ value: c.value, color: c.color }))}
                size={180} thickness={22} centerValue={fmtEur(totalExpense)} centerLabel="skupaj" />
              <Breakdown items={categorySpend.slice(0, 10)} total={totalExpense} />
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Viri prihodkov" />
          {incomeBreakdown.length === 0 ? (
            <div className="sl-muted">Ni podatkov.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <PieChart data={incomeBreakdown.map((c) => ({ value: c.value, color: c.color }))}
                size={180} thickness={22} centerValue={fmtEur(totalIncome)} centerLabel="skupaj" />
              <Breakdown items={incomeBreakdown} total={totalIncome} />
            </div>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeader title="Mesečno po kategorijah" subtitle="Sestava odhodkov v vsakem mesecu" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {monthlyData.map((m) => {
            const monthTx = state.transactions.filter((t) => t.date >= monthRange(m.key).from && t.date <= monthRange(m.key).to);
            const segs = [...sumByCategory(monthTx, 'expense').entries()]
              .map(([cid, v]) => {
                const cat = state.categories.find((c) => c.id === cid);
                return { value: v, color: cat?.color || '#64748b', label: cat?.name || 'Brez kat.' };
              })
              .sort((a, b) => b.value - a.value);
            const ime = monthName(m.key);
            return (
              <div key={m.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, fontSize: '0.84rem' }}>
                  <span>{ime.charAt(0).toUpperCase() + ime.slice(1)} {m.key.slice(0, 4)}</span>
                  <span className="sl-num" style={{ fontSize: '0.8rem' }}><span className="sl-in">+{fmtEur(m.income)}</span> <span className="sl-subtle">·</span> −{fmtEur(m.expense)}</span>
                </div>
                <StackedBar segments={segs} height={10} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
