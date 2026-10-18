import { useMemo, useState } from 'react';
import { Card, Button, Input, Select, Field, Modal, SectionHeader, Empty } from '../ui.jsx';
import { ProgressBar } from '../charts.jsx';
import { fmtEur, monthRange, todayIso, uid, monthKey } from '../store.js';

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
      <SectionHeader
        title="Proračun"
        subtitle="Mesečni limiti per kategorija. Sledi opozorilom, ko se bližaš limitu."
        action={
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 'auto' }} />
        }
      />

      {totalBudget > 0 && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: '1rem' }}>Skupaj</strong>
            <span style={{ fontSize: '0.95rem' }}>
              {fmtEur(totalSpent)} / <strong>{fmtEur(totalBudget)}</strong>
              <span style={{ marginLeft: 8, color: overall > 100 ? '#dc2626' : overall > 80 ? '#d97706' : '#059669', fontWeight: 700 }}>
                {overall.toFixed(0)}%
              </span>
            </span>
          </div>
          <ProgressBar value={Math.min(totalSpent, totalBudget)} max={totalBudget} color={overall > 100 ? '#dc2626' : overall > 80 ? '#d97706' : '#059669'} height={10} />
          {overall > 100 && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#dc2626' }}>
              Prekoračitev: {fmtEur(totalSpent - totalBudget)}
            </div>
          )}
        </Card>
      )}

      {expenseCats.length === 0 ? (
        <Empty title="Najprej dodaj kategorije" description="V Nastavitvah dodaj kategorije odhodkov." />
      ) : (
        <Card padding="0">
          {rows.map((r, i) => {
            const c = r.category;
            const color = r.pct > 100 ? '#dc2626' : r.pct > 80 ? '#d97706' : c.color;
            return (
              <div key={c.id} style={{
                padding: '1rem 1.25rem',
                borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '1rem',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                      <strong style={{ fontSize: '0.95rem' }}>{c.name}</strong>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {fmtEur(r.spent)} {r.limit > 0 && <>/ <strong style={{ color: 'var(--color-text)' }}>{fmtEur(r.limit)}</strong></>}
                    </span>
                  </div>
                  {r.limit > 0 ? (
                    <ProgressBar value={Math.min(r.spent, r.limit)} max={r.limit} color={color} height={6} />
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>Brez limita</div>
                  )}
                  {r.limit > 0 && r.pct > 100 && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 4 }}>Prekoračeno za {fmtEur(r.spent - r.limit)}</div>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setEditing({ categoryId: c.id, limit: String(r.limit || '') })}>
                  {r.limit > 0 ? 'Uredi' : '+ Limit'}
                </Button>
              </div>
            );
          })}
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Mesečni limit">
        {editing && (
          <form onSubmit={saveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Kategorija: <strong style={{ color: 'var(--color-text)' }}>{state.categories.find((c) => c.id === editing.categoryId)?.name}</strong>
            </div>
            <Field label="Mesečni limit (€)" hint="0 = brez limita">
              <Input type="number" step="0.01" min="0" value={editing.limit}
                onChange={(e) => setEditing({ ...editing, limit: e.target.value })} autoFocus />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Prekliči</Button>
              <Button type="submit">Shrani</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
