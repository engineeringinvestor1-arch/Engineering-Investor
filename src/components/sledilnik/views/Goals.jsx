import { useState } from 'react';
import { Card, Button, Input, Field, Modal, PageHeader, Empty } from '../ui.jsx';
import { ProgressBar } from '../charts.jsx';
import { Swatches } from '../QuickAdd.jsx';
import { fmtEur, fmtDate, todayIso, uid, PALETTE } from '../store.js';

function emptyGoal() {
  return {
    id: '',
    name: '',
    targetAmount: '',
    currentAmount: '0',
    deadline: '',
    accountId: '',
    color: PALETTE[1],
    notes: '',
  };
}

export default function Goals({ state, dispatch }) {
  const [editing, setEditing] = useState(null);

  function save(e) {
    e.preventDefault();
    if (!editing.name || !editing.targetAmount) return;
    const goal = {
      ...editing,
      id: editing.id || uid(),
      targetAmount: Number(editing.targetAmount) || 0,
      currentAmount: Number(editing.currentAmount) || 0,
      createdAt: editing.createdAt || todayIso(),
    };
    if (editing.id) dispatch({ type: 'goal/update', goal });
    else dispatch({ type: 'goal/add', goal });
    setEditing(null);
  }

  function remove(id) {
    if (!confirm('Izbrišem cilj?')) return;
    dispatch({ type: 'goal/remove', id });
    setEditing(null);
  }

  function addToGoal(g, amt) {
    const next = Math.max(0, Number(g.currentAmount || 0) + amt);
    dispatch({ type: 'goal/update', goal: { ...g, currentAmount: next } });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PageHeader
        title="Cilji"
        subtitle="Varčevalni cilji z rokom in napredkom"
        action={<Button size="sm" onClick={() => setEditing(emptyGoal())}>Nov cilj</Button>}
      />

      {state.goals.length === 0 ? (
        <Empty
          title="Še ni ciljev"
          description="Cilji ti pomagajo varčevati za konkretne stvari: rezervni sklad, dopust, stanovanje, upokojitev."
          action={<Button onClick={() => setEditing(emptyGoal())}>Nov cilj</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
          {state.goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null;
            const monthlyNeeded = daysLeft && daysLeft > 0 ? (remaining / (daysLeft / 30)) : null;
            return (
              <Card key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span className="sl-dot" style={{ background: g.color }} />
                    <span className="sl-row-title">{g.name}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ ...g, targetAmount: String(g.targetAmount), currentAmount: String(g.currentAmount) })}>Uredi</Button>
                </div>
                <div className="sl-num" style={{ fontSize: '1.5rem', fontWeight: 500, margin: '6px 0 10px' }}>
                  {fmtEur(g.currentAmount)} <span className="sl-subtle" style={{ fontSize: '0.95rem' }}>/ {fmtEur(g.targetAmount)}</span>
                </div>
                <ProgressBar value={g.currentAmount} max={g.targetAmount} color={g.color} height={6} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.78rem', color: 'var(--sl-muted)' }}>
                  <span>{pct.toFixed(0)} % doseženo</span>
                  <span>še {fmtEur(remaining)}</span>
                </div>
                {g.deadline && (
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: daysLeft < 0 ? 'var(--sl-bad)' : 'var(--sl-subtle)', lineHeight: 1.5 }}>
                    Rok {fmtDate(g.deadline)} {daysLeft != null && (daysLeft < 0 ? `(zamuda ${-daysLeft} dni)` : `(še ${daysLeft} dni)`)}
                    {monthlyNeeded != null && monthlyNeeded > 0 && (
                      <div>Mesečno potrebno: <strong style={{ color: 'var(--sl-ink)' }}>{fmtEur(monthlyNeeded)}</strong></div>
                    )}
                  </div>
                )}
                {g.notes && <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--sl-muted)' }}>{g.notes}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                  <Button variant="secondary" size="sm" onClick={() => addToGoal(g, 50)}>+50 €</Button>
                  <Button variant="secondary" size="sm" onClick={() => addToGoal(g, 100)}>+100 €</Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                    const v = prompt('Znesek (€):');
                    const n = Number(v);
                    if (n) addToGoal(g, n);
                  }}>Drug znesek</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Uredi cilj' : 'Nov cilj'}>
        {editing && (
          <form onSubmit={save} className="sl-form">
            <Field label="Ime cilja">
              <Input required value={editing.name} placeholder="npr. Rezervni sklad, Dopust, Stanovanje"
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <div className="sl-form-2">
              <Field label="Ciljni znesek (€)">
                <Input type="number" step="0.01" min="0" required inputMode="decimal" className="sl-num" value={editing.targetAmount}
                  onChange={(e) => setEditing({ ...editing, targetAmount: e.target.value })} />
              </Field>
              <Field label="Trenutno (€)">
                <Input type="number" step="0.01" min="0" inputMode="decimal" className="sl-num" value={editing.currentAmount}
                  onChange={(e) => setEditing({ ...editing, currentAmount: e.target.value })} />
              </Field>
            </div>
            <Field label="Rok (ni obvezno)">
              <Input type="date" value={editing.deadline}
                onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} />
            </Field>
            <Field label="Barva">
              <Swatches value={editing.color} onChange={(color) => setEditing({ ...editing, color })} />
            </Field>
            <Field label="Opombe">
              <Input value={editing.notes || ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Field>
            <div className="sl-form-actions">
              {editing.id ? (
                <Button type="button" variant="danger" onClick={() => remove(editing.id)}>Izbriši</Button>
              ) : <span />}
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
