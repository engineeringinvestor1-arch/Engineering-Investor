import { useMemo, useState } from 'react';
import { Card, Button, Input, Select, Field, Modal, SectionHeader, Empty, Tag } from '../ui.jsx';
import { fmtEur, fmtDate, findPayee, todayIso, uid } from '../store.js';
import QuickAdd from '../QuickAdd.jsx';

const TYPES = [
  { id: 'expense',  label: 'Odhodek' },
  { id: 'income',   label: 'Prihodek' },
  { id: 'transfer', label: 'Prenos' },
];

function emptyTx() {
  return {
    id: '',
    date: todayIso(),
    type: 'expense',
    amount: '',
    accountId: '',
    transferToAccountId: '',
    categoryId: '',
    payee: '',
    notes: '',
    tags: [],
  };
}

export default function Transactions({ state, dispatch, quickAdd = true }) {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState({ type: 'all', accountId: 'all', categoryId: 'all', from: '', to: '', search: '' });

  const accountsAlive = state.accounts.filter((a) => !a.archived);
  const cats = state.categories.filter((c) => !c.archived);

  function openNew() {
    setEditing({
      ...emptyTx(),
      accountId: accountsAlive[0]?.id || '',
      categoryId: cats.find((c) => c.type === 'expense')?.id || '',
    });
  }

  function save(e) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.amount || isNaN(Number(editing.amount))) return;
    if (!editing.accountId) return;
    if (editing.type === 'transfer' && !editing.transferToAccountId) return;

    const tx = {
      ...editing,
      id: editing.id || uid(),
      amount: Math.abs(Number(editing.amount)),
      categoryId: editing.type === 'transfer' ? null : editing.categoryId,
    };
    if (editing.id) dispatch({ type: 'tx/update', tx });
    else dispatch({ type: 'tx/add', tx });
    setEditing(null);
  }

  function remove(id) {
    if (!confirm('Izbrišem transakcijo?')) return;
    dispatch({ type: 'tx/remove', id });
    setEditing(null);
  }

  const filtered = useMemo(() => {
    return state.transactions
      .filter((t) => filter.type === 'all' || t.type === filter.type)
      .filter((t) => filter.accountId === 'all' || t.accountId === filter.accountId || t.transferToAccountId === filter.accountId)
      .filter((t) => filter.categoryId === 'all' || t.categoryId === filter.categoryId)
      .filter((t) => !filter.from || t.date >= filter.from)
      .filter((t) => !filter.to || t.date <= filter.to)
      .filter((t) => {
        if (!filter.search) return true;
        const q = filter.search.toLowerCase();
        const cat = state.categories.find((c) => c.id === t.categoryId);
        return (
          (t.payee || '').toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q) ||
          (cat?.name || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [state.transactions, state.categories, filter]);

  const totalIn = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalOut = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionHeader
        title="Transakcije"
        subtitle={`${filtered.length} vnosov · ${fmtEur(totalIn)} prihodki · ${fmtEur(totalOut)} odhodki`}
        action={<Button variant="secondary" onClick={openNew}>Podroben vnos ali prenos</Button>}
      />

      {quickAdd && <QuickAdd state={state} dispatch={dispatch} />}

      <Card padding="0.85rem 1rem">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Filtri
          </div>
          {(filter.search || filter.type !== 'all' || filter.accountId !== 'all' || filter.categoryId !== 'all' || filter.from || filter.to) && (
            <button
              onClick={() => setFilter({ type: 'all', accountId: 'all', categoryId: 'all', from: '', to: '', search: '' })}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Počisti
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
          <Input placeholder="Po plačniku, opombi..." value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
          <Select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
            <option value="all">Vse vrste</option>
            {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
          <Select value={filter.accountId} onChange={(e) => setFilter({ ...filter, accountId: e.target.value })}>
            <option value="all">Vsi računi</option>
            {accountsAlive.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select value={filter.categoryId} onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })}>
            <option value="all">Vse kategorije</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type === 'income' ? 'P' : 'O'})</option>)}
          </Select>
          <Input type="date" value={filter.from} placeholder="Od" onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
          <Input type="date" value={filter.to} placeholder="Do" onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Empty
          title={state.transactions.length === 0 ? 'Še ni transakcij' : 'Ni zadetkov'}
          description={state.transactions.length === 0 ? 'Vnesi prvi prihodek ali odhodek.' : 'Spremeni filtre.'}
          action={state.transactions.length === 0 && <Button onClick={openNew}>+ Nova transakcija</Button>}
        />
      ) : (
        <Card padding="0">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((t, i) => {
              const acc = state.accounts.find((a) => a.id === t.accountId);
              const cat = state.categories.find((c) => c.id === t.categoryId);
              const dst = state.accounts.find((a) => a.id === t.transferToAccountId);
              return (
                <button
                  key={t.id}
                  onClick={() => setEditing({ ...t, amount: String(t.amount) })}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: '0.85rem',
                    padding: '0.85rem 1.1rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    alignItems: 'center',
                  }}
                >
                  <div style={{
                    width: 38, textAlign: 'center',
                    fontSize: '0.7rem', color: 'var(--color-text-muted)',
                    lineHeight: 1.2,
                  }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>
                      {t.date.slice(8, 10)}
                    </div>
                    <div>{t.date.slice(5, 7)}/{t.date.slice(2, 4)}</div>
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{t.payee || cat?.name || (t.type === 'transfer' ? 'Prenos' : 'Transakcija')}</strong>
                      {cat && t.type !== 'transfer' && <Tag color={cat.color}>{cat.name}</Tag>}
                      {t.type === 'transfer' && <Tag>Prenos</Tag>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>
                      {acc?.name || '-'}
                      {t.type === 'transfer' && dst && ` → ${dst.name}`}
                      {t.notes && ` · ${t.notes}`}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap',
                    color: t.type === 'income' ? '#059669' : t.type === 'expense' ? '#dc2626' : 'var(--color-text-muted)',
                  }}>
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '↔'} {fmtEur(t.amount, true)}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Uredi transakcijo' : 'Nova transakcija'}>
        {editing && (
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: 4, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
              {TYPES.map((t) => (
                <button key={t.id} type="button" onClick={() => setEditing({ ...editing, type: t.id, categoryId: '' })}
                  style={{
                    padding: '0.5rem', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: editing.type === t.id ? 'var(--color-surface)' : 'transparent',
                    color: editing.type === t.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                    boxShadow: editing.type === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Znesek (€)">
                <Input type="number" step="0.01" min="0" required value={editing.amount}
                  onChange={(e) => setEditing({ ...editing, amount: e.target.value })} />
              </Field>
              <Field label="Datum">
                <Input type="date" required value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
              </Field>
            </div>

            <Field label={editing.type === 'transfer' ? 'Iz računa' : 'Račun'}>
              <Select required value={editing.accountId}
                onChange={(e) => setEditing({ ...editing, accountId: e.target.value })}>
                <option value="">Izberi račun</option>
                {accountsAlive.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>

            {editing.type === 'transfer' && (
              <Field label="Na račun">
                <Select required value={editing.transferToAccountId}
                  onChange={(e) => setEditing({ ...editing, transferToAccountId: e.target.value })}>
                  <option value="">Izberi račun</option>
                  {accountsAlive.filter((a) => a.id !== editing.accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </Field>
            )}

            {editing.type !== 'transfer' && (
              <Field label="Kategorija">
                <Select value={editing.categoryId}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>
                  <option value="">Brez</option>
                  {cats.filter((c) => c.type === editing.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            )}

            <Field label="Plačnik / prejemnik">
              <Input value={editing.payee} placeholder="npr. Mercator, Plača Acme d.o.o." list="tracker-payees"
                onChange={(e) => {
                  // Znana trgovina prinese svojo kategorijo, enako kot pri hitrem vnosu.
                  const known = findPayee(state.payees, e.target.value, editing.type);
                  const cat = known && cats.some((c) => c.id === known.categoryId) ? known.categoryId : editing.categoryId;
                  setEditing({ ...editing, payee: e.target.value, categoryId: cat });
                }} />
              <datalist id="tracker-payees">
                {(state.payees ?? []).filter((p) => p.type === editing.type).map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
            </Field>

            <Field label="Opombe">
              <Input value={editing.notes}
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
