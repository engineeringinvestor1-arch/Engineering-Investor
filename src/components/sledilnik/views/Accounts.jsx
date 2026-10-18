import { useState } from 'react';
import { Card, Button, Input, Select, Field, Modal, SectionHeader, Empty } from '../ui.jsx';
import { fmtEur, accountBalance, ACCOUNT_TYPES, ACCOUNT_TYPE_LABEL, PALETTE, uid, todayIso } from '../store.js';

function emptyAccount() {
  return {
    id: '',
    name: '',
    type: 'checking',
    startingBalance: '0',
    color: PALETTE[0],
    archived: false,
    notes: '',
  };
}

export default function Accounts({ state, dispatch }) {
  const [editing, setEditing] = useState(null);

  function save(e) {
    e.preventDefault();
    if (!editing.name) return;
    const acc = {
      ...editing,
      id: editing.id || uid(),
      startingBalance: Number(editing.startingBalance) || 0,
      createdAt: editing.createdAt || todayIso(),
    };
    if (editing.id) dispatch({ type: 'account/update', account: acc });
    else dispatch({ type: 'account/add', account: acc });
    setEditing(null);
  }

  function remove(id) {
    const used = state.transactions.some((t) => t.accountId === id || t.transferToAccountId === id);
    if (used) {
      if (!confirm('Račun je vezan na obstoječe transakcije. Arhiviram ga (transakcije ostanejo).')) return;
      dispatch({ type: 'account/update', account: { ...state.accounts.find((a) => a.id === id), archived: true } });
    } else {
      if (!confirm('Izbrišem račun?')) return;
      dispatch({ type: 'account/remove', id });
    }
    setEditing(null);
  }

  const aliveAccounts = state.accounts.filter((a) => !a.archived);
  const archivedAccounts = state.accounts.filter((a) => a.archived);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionHeader
        title="Računi"
        subtitle={`${aliveAccounts.length} aktivnih · ${fmtEur(aliveAccounts.reduce((s, a) => s + accountBalance(state, a.id), 0))} skupno`}
        action={<Button onClick={() => setEditing(emptyAccount())}>+ Nov račun</Button>}
      />

      {aliveAccounts.length === 0 && (
        <Empty title="Še ni računov" description="Dodaj svoj prvi račun (TRR, varčevalni, gotovina, kreditna kartica, posojilo...)." action={<Button onClick={() => setEditing(emptyAccount())}>+ Nov račun</Button>} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
        {aliveAccounts.map((a) => {
          const bal = accountBalance(state, a.id);
          const txCount = state.transactions.filter((t) => t.accountId === a.id || t.transferToAccountId === a.id).length;
          const isDebt = a.type === 'loan' || a.type === 'card';
          return (
            <button key={a.id} onClick={() => setEditing({ ...a, startingBalance: String(a.startingBalance) })}
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8,
                padding: '1.1rem 1.25rem', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit',
                borderTop: `3px solid ${a.color}`,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    {ACCOUNT_TYPE_LABEL[a.type]}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 2 }}>{a.name}</div>
                </div>
              </div>
              <div style={{
                fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em',
                color: isDebt ? '#d97706' : bal >= 0 ? 'var(--color-text)' : '#dc2626',
              }}>
                {fmtEur(isDebt ? -Math.abs(bal) : bal)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                {txCount} transakcij · začetno: {fmtEur(a.startingBalance || 0)}
              </div>
            </button>
          );
        })}
      </div>

      {archivedAccounts.length > 0 && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Arhivirani ({archivedAccounts.length})
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
            {archivedAccounts.map((a) => (
              <Card key={a.id} padding="0.75rem 1rem">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{a.name}</span>
                  <Button variant="ghost" size="sm"
                    onClick={() => dispatch({ type: 'account/update', account: { ...a, archived: false } })}>
                    Obnovi
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </details>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Uredi račun' : 'Nov račun'}>
        {editing && (
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <Field label="Ime">
              <Input required value={editing.name} placeholder="npr. NLB tekoči"
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Vrsta">
                <Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                  {ACCOUNT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Začetno stanje (€)" hint="Stanje na dan začetka uporabe">
                <Input type="number" step="0.01" value={editing.startingBalance}
                  onChange={(e) => setEditing({ ...editing, startingBalance: e.target.value })} />
              </Field>
            </div>
            <Field label="Barva">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PALETTE.map((c) => (
                  <button key={c} type="button" onClick={() => setEditing({ ...editing, color: c })}
                    style={{
                      width: 26, height: 26, borderRadius: 6, background: c,
                      border: editing.color === c ? '2px solid var(--color-text)' : '2px solid transparent',
                      cursor: 'pointer',
                    }} aria-label={c} />
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
