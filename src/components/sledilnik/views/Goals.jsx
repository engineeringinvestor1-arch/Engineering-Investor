import { useState } from 'react';
import { Card, Button, Input, Field, Modal, SectionHeader, Empty, Select } from '../ui.jsx';
import { ProgressBar } from '../charts.jsx';
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
      <SectionHeader
        title="Cilji"
        subtitle="Varčevalni cilji s časovnim okvirjem in napredkom."
        action={<Button onClick={() => setEditing(emptyGoal())}>+ Nov cilj</Button>}
      />

      {state.goals.length === 0 ? (
        <Empty
          title="Še ni ciljev"
          description="Cilji ti pomagajo varčevati za konkretne stvari: rezervni sklad, dopust, stanovanje, upokojitev."
          action={<Button onClick={() => setEditing(emptyGoal())}>+ Nov cilj</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
          {state.goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null;
            const monthlyNeeded = daysLeft && daysLeft > 0 ? (remaining / (daysLeft / 30)) : null;
            return (
              <Card key={g.id} style={{ borderTop: `3px solid ${g.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: '1rem' }}>{g.name}</strong>
                  <button onClick={() => setEditing({ ...g, targetAmount: String(g.targetAmount), currentAmount: String(g.currentAmount) })}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Uredi
                  </button>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
                  {fmtEur(g.currentAmount)} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {fmtEur(g.targetAmount)}</span>
                </div>
                <ProgressBar value={g.currentAmount} max={g.targetAmount} color={g.color} height={8} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  <span>{pct.toFixed(0)}% doseženo</span>
                  <span>{fmtEur(remaining)} ostalo</span>
                </div>
                {g.deadline && (
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: daysLeft < 0 ? '#dc2626' : 'var(--color-text-subtle)' }}>
                    Rok: {fmtDate(g.deadline)} {daysLeft != null && (daysLeft < 0 ? `(zamuda ${-daysLeft} dni)` : `(še ${daysLeft} dni)`)}
                    {monthlyNeeded != null && monthlyNeeded > 0 && (
                      <div style={{ marginTop: 2 }}>Mesečno potrebno: <strong style={{ color: 'var(--color-text)' }}>{fmtEur(monthlyNeeded)}</strong></div>
                    )}
                  </div>
                )}
                {g.notes && <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{g.notes}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => addToGoal(g, 50)}>+50€</Button>
                  <Button variant="secondary" size="sm" onClick={() => addToGoal(g, 100)}>+100€</Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                    const v = prompt('Znesek (€):');
                    const n = Number(v);
                    if (n) addToGoal(g, n);
                  }}>+ Po meri</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Uredi cilj' : 'Nov cilj'}>
        {editing && (
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <Field label="Ime cilja">
              <Input required value={editing.name} placeholder="npr. Rezervni sklad, Dopust, Stanovanje"
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Ciljni znesek (€)">
                <Input type="number" step="0.01" min="0" required value={editing.targetAmount}
                  onChange={(e) => setEditing({ ...editing, targetAmount: e.target.value })} />
              </Field>
              <Field label="Trenutno (€)">
                <Input type="number" step="0.01" min="0" value={editing.currentAmount}
                  onChange={(e) => setEditing({ ...editing, currentAmount: e.target.value })} />
              </Field>
            </div>
            <Field label="Rok (neobvezno)">
              <Input type="date" value={editing.deadline}
                onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} />
            </Field>
            <Field label="Barva">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PALETTE.map((c) => (
                  <button key={c} type="button" onClick={() => setEditing({ ...editing, color: c })}
                    style={{
                      width: 26, height: 26, borderRadius: 6, background: c,
                      border: editing.color === c ? '2px solid var(--color-text)' : '2px solid transparent',
                      cursor: 'pointer',
                    }} />
                ))}
              </div>
            </Field>
            <Field label="Opombe">
              <Input value={editing.notes || ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
              {editing.id ? (
                <Button type="button" variant="danger" onClick={() => remove(editing.id)}>Izbriši</Button>
              ) : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
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
