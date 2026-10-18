import { useMemo, useState } from 'react';
import { Card, SectionHeader, Select, Field, KpiCard } from '../ui.jsx';
import { PieChart, BarChart, LineChart, FlowChart, StackedBar } from '../charts.jsx';
import { fmtEur, lastNMonths, monthRange, sumByCategory, sumByType } from '../store.js';

const RANGE_OPTIONS = [
  { v: 3,  label: 'Zadnji 3 meseci' },
  { v: 6,  label: 'Zadnjih 6 mesecev' },
  { v: 12, label: 'Zadnjih 12 mesecev' },
  { v: 24, label: 'Zadnjih 24 mesecev' },
];

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
        return { id: cid, label: cat?.name || 'Brez kategorije', value: v, color: cat?.color || '#64748b' };
      })
      .sort((a, b) => b.value - a.value);
  }, [allTx, state.categories]);

  const incomeBreakdown = useMemo(() => {
    const m = sumByCategory(allTx, 'income');
    return [...m.entries()]
      .map(([cid, v]) => {
        const cat = state.categories.find((c) => c.id === cid);
        return { id: cid, label: cat?.name || 'Brez kategorije', value: v, color: cat?.color || '#10b981' };
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

  if (state.transactions.length === 0) {
    return (
      <div>
        <SectionHeader title="Poročila" subtitle="Detajlne analize tvojih financ" />
        <Card padding="3rem 2rem" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Vnesi nekaj transakcij, da vidiš poročila.
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionHeader
        title="Poročila"
        subtitle="Trend, kategorije, denarni tok"
        action={
          <Select value={range} onChange={(e) => setRange(Number(e.target.value))} style={{ width: 'auto' }}>
            {RANGE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Select>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
        <KpiCard label="Skupni prihodki" value={fmtEur(totalIncome)} sub={`${range} mes.`} color="#059669" />
        <KpiCard label="Skupni odhodki" value={fmtEur(totalExpense)} sub={`${range} mes.`} color="#dc2626" />
        <KpiCard label="Neto" value={fmtEur(totalNet)} color={totalNet >= 0 ? '#059669' : '#dc2626'} />
        <KpiCard label="Povp. mesečno" value={fmtEur(avgIncome - avgExpense)} sub="prihodek − odhodek" />
        <KpiCard label="Stopnja varčevanja" value={`${avgSavingsRate.toFixed(0)}%`}
          color={avgSavingsRate >= 20 ? '#059669' : avgSavingsRate >= 0 ? '#d97706' : '#dc2626'}
          sub={avgSavingsRate >= 20 ? 'Odlično' : avgSavingsRate >= 0 ? 'OK' : 'Pod ničlo'} />
      </div>

      {/* Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>
        <Card>
          <SectionHeader title="Mesečni prihodki/odhodki" />
          <BarChart data={monthlyData} height={220} />
        </Card>
        <Card>
          <SectionHeader title="Kumulativno" subtitle="Zbir prihodkov, odhodkov in neto" />
          <LineChart series={[
            { points: cumulativeBalance.map((c) => ({ y: c.incomeY, label: c.label })), color: '#10b981' },
            { points: cumulativeBalance.map((c) => ({ y: c.expenseY, label: c.label })), color: '#ef4444' },
            { points: cumulativeBalance.map((c) => ({ y: c.netY, label: c.label })), color: '#3b82f6', fill: true },
          ]} height={220} />
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.8rem', color: 'var(--color-text-muted)', justifyContent: 'center' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: 2, marginRight: 6 }} />Prihodki</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 6 }} />Odhodki</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#3b82f6', borderRadius: 2, marginRight: 6 }} />Neto</span>
          </div>
        </Card>
      </div>

      {/* Sankey */}
      {(incomeBreakdown.length > 0 || categorySpend.length > 0) && (
        <Card>
          <SectionHeader title="Denarni tok" subtitle={`Vsi ${range} meseci skupaj`} />
          <FlowChart incomes={incomeBreakdown} expenses={categorySpend} height={Math.max(280, Math.max(incomeBreakdown.length, categorySpend.length) * 30)} />
        </Card>
      )}

      {/* Category breakdowns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>
        <Card>
          <SectionHeader title="Razporeditev odhodkov" subtitle="Po kategorijah" />
          {categorySpend.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)' }}>Ni podatkov.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <PieChart data={categorySpend.map((c) => ({ value: c.value, color: c.color }))}
                size={200} thickness={32} centerValue={fmtEur(totalExpense)} centerLabel="skupaj" />
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {categorySpend.slice(0, 10).map((c) => {
                  const pct = totalExpense > 0 ? (c.value / totalExpense) * 100 : 0;
                  return (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0' }}>
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                        {c.label}
                      </span>
                      <span><strong>{fmtEur(c.value)}</strong> <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.78rem' }}>{pct.toFixed(0)}%</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Viri prihodkov" />
          {incomeBreakdown.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)' }}>Ni podatkov.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <PieChart data={incomeBreakdown.map((c) => ({ value: c.value, color: c.color }))}
                size={200} thickness={32} centerValue={fmtEur(totalIncome)} centerLabel="skupaj" />
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {incomeBreakdown.map((c) => {
                  const pct = totalIncome > 0 ? (c.value / totalIncome) * 100 : 0;
                  return (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0' }}>
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                        {c.label}
                      </span>
                      <span><strong>{fmtEur(c.value)}</strong> <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.78rem' }}>{pct.toFixed(0)}%</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Monthly stacked breakdown */}
      <Card>
        <SectionHeader title="Mesečno po kategorijah" subtitle="Vsak mesec, struktura odhodkov" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {monthlyData.map((m) => {
            const monthTx = state.transactions.filter((t) => t.date >= monthRange(m.key).from && t.date <= monthRange(m.key).to);
            const segs = [...sumByCategory(monthTx, 'expense').entries()]
              .map(([cid, v]) => {
                const cat = state.categories.find((c) => c.id === cid);
                return { value: v, color: cat?.color || '#64748b', label: cat?.name || 'Brez kat.' };
              })
              .sort((a, b) => b.value - a.value);
            return (
              <div key={m.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                  <span>{m.key}</span>
                  <span><span style={{ color: '#059669' }}>+{fmtEur(m.income)}</span> · <span style={{ color: '#dc2626' }}>−{fmtEur(m.expense)}</span></span>
                </div>
                <StackedBar segments={segs} height={12} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
