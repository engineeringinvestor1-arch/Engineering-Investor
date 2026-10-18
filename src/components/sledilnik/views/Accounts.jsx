import { useState } from 'react';
import { Card, Button, Input, Select, Field, Modal, PageHeader, Empty } from '../ui.jsx';
import { Swatches } from '../QuickAdd.jsx';
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

// Ikona vrste računa v barvi računa.
const VRSTA = {
  checking:   <><rect x="2.75" y="5.5" width="18.5" height="13" rx="2.5" /><path d="M2.75 10h18.5" /><path d="M6.5 15h3" /></>,
  savings:    <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="12" cy="12" r="3.2" /><path d="M12 8.8V7.3M12 16.7v-1.5M15.2 12h1.5M7.3 12h1.5" /></>,
  cash:       <><rect x="2.75" y="6" width="18.5" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v5M18 9.5v5" /></>,
  card:       <><rect x="2.75" y="5.5" width="18.5" height="13" rx="2.5" /><path d="M2.75 9.5h18.5" /><path d="M2.75 12.5h18.5" /></>,
  investment: <><path d="m3.5 16.5 5.5-5.5 4 4 7.5-7.5" /><path d="M15 7.5h5.5V13" /></>,
  loan:       <><path d="M4 20.5h16" /><path d="M5 10h14" /><path d="M12 3.5 19.5 8h-15z" /><path d="M7 10v7.5M10.3 10v7.5M13.7 10v7.5M17 10v7.5" /></>,
};

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
      <PageHeader
        title="Računi"
        subtitle={`${aliveAccounts.length} aktivnih · skupaj ${fmtEur(aliveAccounts.reduce((s, a) => s + accountBalance(state, a.id), 0))}`}
        action={<Button size="sm" onClick={() => setEditing(emptyAccount())}>Nov račun</Button>}
      />

      {aliveAccounts.length === 0 && (
        <Empty title="Še ni računov" description="Dodaj svoj prvi račun: tekoči, varčevalni, gotovina, kreditna kartica ali posojilo." action={<Button onClick={() => setEditing(emptyAccount())}>Nov račun</Button>} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
        {aliveAccounts.map((a) => {
          const bal = accountBalance(state, a.id);
          const txCount = state.transactions.filter((t) => t.accountId === a.id || t.transferToAccountId === a.id).length;
          const isDebt = a.type === 'loan' || a.type === 'card';
          return (
            <button key={a.id} type="button" className="sl-card" onClick={() => setEditing({ ...a, startingBalance: String(a.startingBalance) })}
              style={{ padding: '1.05rem', textAlign: 'left', cursor: 'pointer', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="sl-ico sl-ico--tint" style={{ '--c': a.color }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{VRSTA[a.type] || VRSTA.checking}</svg>
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="sl-row-title">{a.name}</div>
                  <div className="sl-row-sub">{ACCOUNT_TYPE_LABEL[a.type]}</div>
                </div>
              </div>
              <div>
                <div className="sl-num" style={{ fontSize: '1.5rem', fontWeight: 500, color: isDebt ? 'var(--sl-warn)' : bal >= 0 ? 'var(--sl-ink)' : 'var(--sl-bad)' }}>
                  {fmtEur(isDebt ? -Math.abs(bal) : bal)}
                </div>
                <div className="sl-row-sub">{txCount} transakcij · začetno stanje {fmtEur(a.startingBalance || 0)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {archivedAccounts.length > 0 && (
        <details>
          <summary className="sl-label" style={{ cursor: 'pointer' }}>
            Arhivirani ({archivedAccounts.length})
          </summary>
          <Card padding="0" style={{ marginTop: '0.75rem', overflow: 'hidden' }}>
            <div className="sl-list">
              {archivedAccounts.map((a) => (
                <div key={a.id} className="sl-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                  <span className="sl-muted">{a.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'account/update', account: { ...a, archived: false } })}>
                    Obnovi
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </details>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Uredi račun' : 'Nov račun'}>
        {editing && (
          <form onSubmit={save} className="sl-form">
            <Field label="Ime">
              <Input required value={editing.name} placeholder="npr. NLB tekoči"
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <div className="sl-form-2">
              <Field label="Vrsta">
                <Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                  {ACCOUNT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Začetno stanje (€)" hint="Stanje na dan začetka uporabe">
                <Input type="number" step="0.01" inputMode="decimal" className="sl-num" value={editing.startingBalance}
                  onChange={(e) => setEditing({ ...editing, startingBalance: e.target.value })} />
              </Field>
            </div>
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
