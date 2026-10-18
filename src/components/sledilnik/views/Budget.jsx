import { useMemo, useState } from 'react';
import { Card, Button, Input, Field, Modal, PageHeader, Empty } from '../ui.jsx';
import { ProgressBar } from '../charts.jsx';
import { CatIcon } from '../ikone.jsx';
import { fmtEur, monthRange, todayIso, uid, monthKey } from '../store.js';

// Barva porabe glede na mejo: do 80 % v barvi kategorije, nad tem opozorilo, nad mejo rdeča.
const barva = (pct, color) => (pct > 100 ? 'var(--sl-bad)' : pct > 80 ? 'var(--sl-warn)' : color);

export default function Budget({ state, dispatch }) {
  const [month, setMonth] = useState(monthKey(todayIso()));
  const [editing, setEditing] = useState(null);

  const { from, to } = monthRange(month);
  const monthTx = useMemo(
    () => state.transactions.filter((t) => t.date >= from && t.date <= to && t.type === 'expense'),
    [state.transactions, from, to],
  );

  const expenseCats = state.categories.filter((c) => !c.archived && c.type === 'expense');

  const rows = useMemo(() => {
    return expenseCats.map((c) => {
      const budget = state.budgets.find((b) => b.categoryId === c.id);
      const spent = monthTx.filter((t) => t.categoryId === c.id).reduce((s, t) => s + (Number(t.amount) || 0), 0);
      return {
        category: c,
        budget,
        limit: budget?.monthlyLimit || 0,
        spent,
        pct: budget?.monthlyLimit ? (spent / budget.monthlyLimit) * 100 : 0,
      };
    }).sort((a, b) => (b.limit > 0 ? 1 : 0) - (a.limit > 0 ? 1 : 0) || b.spent - a.spent);
  }, [expenseCats, state.budgets, monthTx]);

  const totalBudget = rows.reduce((s, r) => s + r.limit, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const overall = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  function saveBudget(e) {
    e.preventDefault();
    if (!editing) return;
    const limit = Number(editing.limit) || 0;
    const existing = state.budgets.find((b) => b.categoryId === editing.categoryId);
    if (existing) {
      if (limit === 0) dispatch({ type: 'budget/remove', id: existing.id });
      else dispatch({ type: 'budget/update', budget: { ...existing, monthlyLimit: limit } });
    } else if (limit > 0) {
      dispatch({ type: 'budget/add', budget: { id: uid(), categoryId: editing.categoryId, monthlyLimit: limit, period: 'monthly' } });
    }
    setEditing(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PageHeader
        title="Proračun"
        subtitle="Mesečne meje po kategorijah. Ob 80 % meje se barva spremeni v opozorilo."
        action={<Input type="month" aria-label="Mesec" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 'auto', height: 38 }} />}
      />

      {totalBudget > 0 && (
        <Card>
          <div className="sl-label">Skupaj porabljeno</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, margin: '4px 0 10px' }}>
            <span className="sl-num" style={{ fontSize: '1.6rem', fontWeight: 500 }}>
              {fmtEur(totalSpent)} <span className="sl-subtle" style={{ fontSize: '1rem' }}>/ {fmtEur(totalBudget)}</span>
            </span>
            <span className="sl-num" style={{ fontWeight: 500, color: barva(overall, 'var(--sl-in)') }}>{overall.toFixed(0)} %</span>
          </div>
          <ProgressBar value={Math.min(totalSpent, totalBudget)} max={totalBudget} color={barva(overall, 'var(--sl-in)')} height={8} />
          {overall > 100 && (
            <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--sl-bad)' }}>
              Prekoračitev: {fmtEur(totalSpent - totalBudget)}
            </div>
          )}
        </Card>
      )}

      {expenseCats.length === 0 ? (
        <Empty title="Najprej dodaj kategorije" description="V Nastavitvah dodaj kategorije odhodkov." />
      ) : (
        <Card padding="0" style={{ overflow: 'hidden' }}>
          <div className="sl-list">
            {rows.map((r) => {
              const c = r.category;
              return (
                <div key={c.id} className="sl-row">
                  <CatIcon category={c} />
                  <div style={{ minWidth: 0 }}>
                    <div className="sl-row-title">{c.name}</div>
                    {r.limit > 0 && (
                      <div style={{ margin: '7px 0 2px' }}><ProgressBar value={Math.min(r.spent, r.limit)} max={r.limit} color={barva(r.pct, c.color)} height={5} /></div>
                    )}
                    <div className="sl-row-sub">
                      <span className="sl-num" style={{ color: 'var(--sl-ink)' }}>{fmtEur(r.spent)}</span>
                      {r.limit > 0 ? <> od <span className="sl-num">{fmtEur(r.limit)}</span></> : ' · brez meje'}
                    </div>
                    {r.limit > 0 && r.pct > 100 && (
                      <div className="sl-row-sub" style={{ color: 'var(--sl-bad)' }}>Prekoračeno za {fmtEur(r.spent - r.limit)}</div>
                    )}
                  </div>
                  <Button variant={r.limit > 0 ? 'ghost' : 'secondary'} size="sm" onClick={() => setEditing({ categoryId: c.id, limit: String(r.limit || '') })}>
                    {r.limit > 0 ? 'Uredi' : 'Dodaj mejo'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Mesečna meja">
        {editing && (
          <form onSubmit={saveBudget} className="sl-form">
            <div style={{ fontSize: '0.9rem', color: 'var(--sl-muted)' }}>
              Kategorija: <strong style={{ color: 'var(--sl-ink)' }}>{state.categories.find((c) => c.id === editing.categoryId)?.name}</strong>
            </div>
            <Field label="Mesečna meja (€)" hint="0 pomeni brez meje">
              <Input type="number" step="0.01" min="0" inputMode="decimal" className="sl-num" value={editing.limit}
                onChange={(e) => setEditing({ ...editing, limit: e.target.value })} autoFocus />
            </Field>
            <div className="sl-form-actions">
              <span />
              <div>
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Prekliči</Button>
                <Button type="submit">Shrani</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
