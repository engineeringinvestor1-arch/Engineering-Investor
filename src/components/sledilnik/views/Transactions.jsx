import { Fragment, useMemo, useState } from 'react';
import { Card, Button, Input, Select, Field, Modal, PageHeader, Empty } from '../ui.jsx';
import { CatIcon } from '../ikone.jsx';
import { fmtEur, findPayee, todayIso, uid } from '../store.js';
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

// Naslov skupine vnosov enega dne: "Sobota, 17. oktober" (leto samo, če ni letošnje).
const dnevFmt = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' });
const dnevLetoFmt = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
function dan(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const text = (iso.slice(0, 4) === todayIso().slice(0, 4) ? dnevFmt : dnevLetoFmt).format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const PRAZEN_FILTER = { type: 'all', accountId: 'all', categoryId: 'all', from: '', to: '', search: '' };

export default function Transactions({ state, dispatch, quickAdd = true }) {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState(PRAZEN_FILTER);

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
  const moreFilters = filter.type !== 'all' || filter.accountId !== 'all' || filter.categoryId !== 'all' || filter.from || filter.to;
  const anyFilter = filter.search || moreFilters;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PageHeader
        title="Transakcije"
        subtitle={`${filtered.length} vnosov · prihodki ${fmtEur(totalIn)} · odhodki ${fmtEur(totalOut)}`}
        action={<Button variant="secondary" size="sm" onClick={openNew}>Podroben vnos ali prenos</Button>}
      />

      {quickAdd && <QuickAdd state={state} dispatch={dispatch} />}

      <Card padding="0.75rem">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input type="search" placeholder="Išči po vnosih" aria-label="Iskanje po trgovini, opombi ali kategoriji" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
          {anyFilter && <Button variant="ghost" size="sm" onClick={() => setFilter(PRAZEN_FILTER)}>Počisti</Button>}
        </div>
        <details open={moreFilters || undefined} style={{ marginTop: 8 }}>
          <summary className="sl-label" style={{ cursor: 'pointer', padding: '0.2rem 0.25rem' }}>Več filtrov</summary>
          <div className="sl-filters">
            <Select value={filter.type} aria-label="Vrsta" onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
              <option value="all">Vse vrste</option>
              {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
            <Select value={filter.accountId} aria-label="Račun" onChange={(e) => setFilter({ ...filter, accountId: e.target.value })}>
              <option value="all">Vsi računi</option>
              {accountsAlive.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
            <Select className="sl-span" value={filter.categoryId} aria-label="Kategorija" onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })}>
              <option value="all">Vse kategorije</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type === 'income' ? 'P' : 'O'})</option>)}
            </Select>
            {/* Obdobje v svoji vrstici z napisoma (avtor, 19. 10. 2026): prazno polje za datum na telefonu ne pokaže ničesar. */}
            <div className="sl-od-do">
              <span>Od</span>
              <Input type="date" value={filter.from} aria-label="Od datuma" max={filter.to || undefined} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
              <span>do</span>
              <Input type="date" value={filter.to} aria-label="Do datuma" min={filter.from || undefined} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
            </div>
          </div>
        </details>
      </Card>

      {filtered.length === 0 ? (
        <Empty
          title={state.transactions.length === 0 ? 'Še ni transakcij' : 'Ni zadetkov'}
          description={state.transactions.length === 0 ? 'Vnesi prvi prihodek ali odhodek.' : 'Spremeni iskanje ali filtre.'}
          action={state.transactions.length === 0 && <Button onClick={openNew}>Nova transakcija</Button>}
        />
      ) : (
        <Card padding="0" style={{ overflow: 'hidden' }}>
          <div className="sl-list">
            {filtered.map((t, i) => {
              const acc = state.accounts.find((a) => a.id === t.accountId);
              const cat = state.categories.find((c) => c.id === t.categoryId);
              const dst = state.accounts.find((a) => a.id === t.transferToAccountId);
              const newDay = i === 0 || filtered[i - 1].date !== t.date;
              const sub = [
                t.type === 'transfer' ? 'Prenos' : cat && t.payee ? cat.name : null,
                `${acc?.name || '-'}${t.type === 'transfer' && dst ? ` → ${dst.name}` : ''}`,
                t.notes || null,
              ].filter(Boolean).join(' · ');
              return (
                <Fragment key={t.id}>
                  {newDay && <div className="sl-daygroup" style={i === 0 ? { paddingTop: '0.75rem' } : undefined}>{dan(t.date)}</div>}
                  <button type="button" className="sl-row" onClick={() => setEditing({ ...t, amount: String(t.amount) })}>
                    <CatIcon category={cat} type={t.type} kind={t.type === 'transfer' ? 'transfer' : undefined} />
                    <div style={{ minWidth: 0 }}>
                      <div className="sl-row-title">{t.payee || cat?.name || (t.type === 'transfer' ? 'Prenos' : 'Transakcija')}</div>
                      <div className="sl-row-sub">{sub}</div>
                    </div>
                    <span className={`sl-row-amount${t.type === 'income' ? ' sl-in' : ''}`} style={t.type === 'transfer' ? { color: 'var(--sl-muted)' } : undefined}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '↔ '}{fmtEur(t.amount, true)}
                    </span>
                  </button>
                </Fragment>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Uredi transakcijo' : 'Nova transakcija'}>
        {editing && (
          <form onSubmit={save} className="sl-form">
            <div className="sl-seg" role="group" aria-label="Vrsta" style={{ display: 'flex' }}>
              {TYPES.map((t) => (
                <button key={t.id} type="button" aria-pressed={editing.type === t.id} onClick={() => setEditing({ ...editing, type: t.id, categoryId: '' })}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="sl-form-2">
              <Field label="Znesek (€)">
                <Input type="number" step="0.01" min="0" required inputMode="decimal" value={editing.amount} className="sl-num"
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

            <Field label="Plačnik ali prejemnik">
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
