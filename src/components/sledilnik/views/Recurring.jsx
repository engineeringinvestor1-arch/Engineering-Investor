import { useState } from 'react';
import { Card, Button, Input, Select, Field, Modal, SectionHeader, Empty, Tag } from '../ui.jsx';
import { blockedRecurring, fmtEur, fmtDate, isoDay, nextOccurrence, todayIso, uid } from '../store.js';

const FREQS = [
  { id: 'monthly', label: 'Mesečno' },
  { id: 'weekly',  label: 'Tedensko' },
  { id: 'yearly',  label: 'Letno' },
];

// Začetek pravila sme biti največ leto dni nazaj: toliko zamujenih vpisov je še smiselno nadoknaditi,
// napačno vpisano leto pa ne zasuje sledilnika (store.js, MAX_CATCH_UP).
function earliestStart() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return isoDay(d);
}

function emptyRule(accountId = '') {
  return {
    id: '',
    name: '',
    type: 'expense',
    amount: '',
    accountId,
    categoryId: '',
    frequency: 'monthly',
    nextDate: todayIso(),
    active: true,
    notes: '',
  };
}

/**
 * Redni stroški in prihodki. Vpišejo se sami (avtor, 3. 10. 2026): ob odprtju sledilnika se vpiše vse,
 * kar je zapadlo, pravilo pa se premakne na naslednji datum (MoneyTracker.jsx, store.js postDueRecurring).
 */
export default function Recurring({ state, dispatch }) {
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const accounts = state.accounts.filter((a) => !a.archived);
  const cats = state.categories.filter((c) => !c.archived);
  const today = todayIso();

  function open(rule) {
    setError('');
    setEditing(rule);
  }

  function save(e) {
    e.preventDefault();
    const amount = Math.abs(Number(String(editing.amount).replace(',', '.'))) || 0;
    if (!editing.name.trim()) return setError('Vpiši ime.');
    if (!(amount > 0)) return setError('Vpiši znesek, večji od nič.');
    if (!editing.accountId) return setError('Izberi račun.');
    if (!editing.nextDate) return setError('Izberi datum.');
    if (editing.nextDate < earliestStart()) return setError('Datum je lahko največ leto dni nazaj.');
    const rule = {
      ...editing,
      id: editing.id || uid(),
      name: editing.name.trim(),
      amount,
      // Dan, ki se ga pravilo drži: 31. gre februarja na 28., marca nazaj na 31.
      anchorDay: Number(editing.nextDate.slice(8, 10)),
    };
    if (editing.id) dispatch({ type: 'recurring/update', rule });
    else dispatch({ type: 'recurring/add', rule });
    setEditing(null);
  }

  function remove(id) {
    if (!confirm('Izbrišem to pravilo? Že vpisane transakcije ostanejo.')) return;
    dispatch({ type: 'recurring/remove', id });
    setEditing(null);
  }

  // Preskoči naslednji vpis, na primer ko je mesec brez najemnine. Ne vpiše ničesar.
  function skipNext(rule) {
    dispatch({ type: 'recurring/update', rule: { ...rule, amount: Number(rule.amount) || 0, nextDate: nextOccurrence(rule, rule.nextDate) } });
    setEditing(null);
  }

  const blocked = blockedRecurring(state, today);
  const monthlyTotal = state.recurring
    .filter((r) => r.active)
    .reduce((s, r) => {
      const mult = r.frequency === 'monthly' ? 1 : r.frequency === 'weekly' ? 4.33 : 1 / 12;
      return s + (r.type === 'expense' ? r.amount * mult : r.type === 'income' ? -r.amount * mult : 0);
    }, 0);
  const rules = [...state.recurring].sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionHeader
        title="Redni stroški in prihodki"
        subtitle={`${state.recurring.length} pravil · mesečno neto: ${fmtEur(-monthlyTotal)} · vpišejo se sami na svoj dan`}
        action={<Button onClick={() => open(emptyRule(accounts[0]?.id))}>+ Novo pravilo</Button>}
      />

      {blocked.length > 0 && (
        <Card style={{ borderLeft: '3px solid #d97706' }}>
          <strong style={{ fontSize: '0.95rem' }}>Teh pravil ni bilo mogoče vpisati ({blocked.length})</strong>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {blocked.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: '0.9rem' }}>
                  <strong>{r.name}</strong>{' '}
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    ({fmtDate(r.nextDate)}): {Number(r.amount) > 0 ? 'račun ne obstaja več' : 'znesek ni vpisan'}
                  </span>
                </div>
                <Button size="sm" onClick={() => open({ ...r, amount: String(r.amount) })}>Uredi</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {state.recurring.length === 0 ? (
        <Empty
          title="Še ni rednih stroškov"
          description="Najemnina, naročnine, zavarovanje, kredit, plača: vpišeš enkrat, potem se vpisujejo sami na svoj dan."
          action={<Button onClick={() => open(emptyRule(accounts[0]?.id))}>+ Novo pravilo</Button>}
        />
      ) : (
        <Card padding="0">
          {rules.map((r, i) => {
            const acc = state.accounts.find((a) => a.id === r.accountId);
            const cat = state.categories.find((c) => c.id === r.categoryId);
            return (
              <button key={r.id} onClick={() => open({ ...r, amount: String(r.amount) })}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.85rem',
                  width: '100%', padding: '0.85rem 1.25rem',
                  background: 'transparent', border: 'none',
                  borderBottom: i < rules.length - 1 ? '1px solid var(--color-border)' : 'none',
                  color: 'inherit', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit', alignItems: 'center',
                  opacity: r.active ? 1 : 0.5,
                }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{r.name}</strong>
                    <Tag color={cat?.color}>{FREQS.find((f) => f.id === r.frequency)?.label}</Tag>
                    {!r.active && <Tag>Pavza</Tag>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>
                    {r.active ? `Naslednjič: ${fmtDate(r.nextDate)}` : 'Se ne vpisuje'} · {acc?.name || 'brez računa'} {cat ? `· ${cat.name}` : ''}
                  </div>
                </div>
                <div style={{
                  fontWeight: 700, fontSize: '0.95rem',
                  color: r.type === 'income' ? '#059669' : '#dc2626',
                }}>
                  {r.type === 'income' ? '+' : '−'}{fmtEur(r.amount, true)}
                </div>
              </button>
            );
          })}
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Uredi pravilo' : 'Nov redni strošek ali prihodek'}>
        {editing && (
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <Field label="Ime">
              <Input required autoFocus={!editing.id} value={editing.name} placeholder="npr. Najemnina, Plača, Spotify"
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Vrsta">
                <Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value, categoryId: '' })}>
                  <option value="expense">Odhodek</option>
                  <option value="income">Prihodek</option>
                </Select>
              </Field>
              <Field label="Znesek (€)">
                <Input type="number" step="0.01" min="0" required value={editing.amount}
                  onChange={(e) => setEditing({ ...editing, amount: e.target.value })} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Kako pogosto">
                <Select value={editing.frequency} onChange={(e) => setEditing({ ...editing, frequency: e.target.value })}>
                  {FREQS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </Select>
              </Field>
              <Field label="Naslednji vpis">
                <Input type="date" required value={editing.nextDate} min={earliestStart()}
                  onChange={(e) => setEditing({ ...editing, nextDate: e.target.value })} />
              </Field>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)', lineHeight: 1.5, marginTop: -4 }}>
              Na ta dan se vpiše samo, potem po izbranem ritmu. Če izbereš datum v preteklosti, se vpišejo tudi zamujeni, največ za leto nazaj.
            </div>
            <Field label="Račun">
              <Select required value={editing.accountId}
                onChange={(e) => setEditing({ ...editing, accountId: e.target.value })}>
                <option value="">Izberi</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Field label="Kategorija">
              <Select value={editing.categoryId || ''}
                onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>
                <option value="">Brez</option>
                {cats.filter((c) => c.type === editing.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
              <input type="checkbox" checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
              Aktivno (odkljukaj za pavzo)
            </label>
            {error && <div role="alert" style={{ color: '#d97706', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {editing.id ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="button" variant="danger" onClick={() => remove(editing.id)}>Izbriši</Button>
                  <Button type="button" variant="ghost" onClick={() => skipNext(editing)}>Preskoči naslednji vpis</Button>
                </div>
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
