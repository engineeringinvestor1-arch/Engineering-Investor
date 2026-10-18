import { useMemo, useRef, useState } from 'react';
import { Card, Button, Field, Input, Modal } from './ui.jsx';
import { fmtEur, findPayee, PALETTE, parseAmount, payeeKey, suggestPayees, todayIso, topPayees, uid, yesterdayIso } from './store.js';

/**
 * Hiter vnos: znesek in en klik.
 *
 * Avtor, 3. 10. 2026: vnašanje mora biti čim hitrejše, trgovina naj se zapomni ("Hofer je za hrano").
 *  - znana trgovina: vpišeš znesek in klikneš trgovino, kategorija in račun sta že znana
 *  - nova trgovina: znesek, ime, klik na kategorijo; naslednjič je med pogostimi
 *  - brez trgovine (gotovina, kava): znesek in klik na kategorijo
 * Klik na trgovino ali kategorijo ob veljavnem znesku shrani takoj; zadnji vnos se da razveljaviti.
 */
export default function QuickAdd({ state, dispatch, autoFocus = true }) {
  const accounts = state.accounts.filter((a) => !a.archived);
  const lastTx = state.transactions[state.transactions.length - 1];

  const [type, setType] = useState('expense');
  const [amountText, setAmountText] = useState('');
  const [payeeText, setPayeeText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(() => (accounts.some((a) => a.id === lastTx?.accountId) ? lastTx.accountId : accounts[0]?.id || ''));
  const [date, setDate] = useState(todayIso());
  const [hint, setHint] = useState('');
  const [added, setAdded] = useState(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [newCat, setNewCat] = useState(null);
  const amountRef = useRef(null);

  const cats = state.categories.filter((c) => c.type === type && !c.archived);
  const catById = useMemo(() => Object.fromEntries(state.categories.map((c) => [c.id, c])), [state.categories]);
  const validCat = (id) => (cats.some((c) => c.id === id) ? id : '');
  const aliveAccount = (id) => (accounts.some((a) => a.id === id) ? id : '');

  const amount = parseAmount(amountText);
  const known = findPayee(state.payees, payeeText, type);
  const shownCategoryId = categoryId || validCat(known?.categoryId);
  const top = topPayees(state.payees, type, 8);
  const suggestions = suggestOpen ? suggestPayees(state.payees, type, payeeText) : [];

  function commit({ payee, catId, accId }) {
    const tx = {
      id: uid(), date, type, amount,
      accountId: accId, transferToAccountId: '',
      categoryId: catId, payee: payee.trim().replace(/\s+/g, ' '), notes: '', tags: [],
    };
    dispatch({ type: 'tx/add', tx });
    setAdded(tx);
    setAccountId(accId);
    setAmountText('');
    setPayeeText('');
    setCategoryId('');
    setHint('');
    setSuggestOpen(false);
    setActiveIdx(-1);
    amountRef.current?.focus();
  }

  // Izbira znane trgovine: s kategorijo in računom, ki ju pozna. Ob veljavnem znesku shrani takoj.
  function pickPayee(p) {
    const catId = validCat(p.categoryId);
    const accId = aliveAccount(p.accountId) || accountId;
    if (amount && catId && accId) return commit({ payee: p.name, catId, accId });
    setPayeeText(p.name);
    setCategoryId(catId);
    setAccountId(accId);
    setSuggestOpen(false);
    setActiveIdx(-1);
    setHint(amount ? 'Izberi kategorijo.' : 'Vpiši znesek.');
    if (!amount) amountRef.current?.focus();
  }

  function pickCategory(c) {
    if (amount && accountId) return commit({ payee: payeeText, catId: c.id, accId: accountId });
    setCategoryId(c.id);
    setHint('Vpiši znesek.');
    amountRef.current?.focus();
  }

  function submit(e) {
    e.preventDefault();
    if (!amount) {
      setHint(amountText.trim() ? 'Znesek ni veljaven. Primer: 12,50' : 'Vpiši znesek.');
      amountRef.current?.focus();
      return;
    }
    if (!accountId) return setHint('Najprej dodaj račun v pogledu Računi.');
    if (!shownCategoryId) return setHint('Izberi kategorijo.');
    commit({ payee: payeeText, catId: shownCategoryId, accId: accountId });
  }

  function onPayeeKey(e) {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0 && suggestions[activeIdx]) {
      e.preventDefault();
      pickPayee(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setSuggestOpen(false);
      setActiveIdx(-1);
    }
  }

  // Nova kategorija kar pri vnosu (avtor, 3. 10. 2026), brez poti v Nastavitve. Prva prosta barva je privzeta.
  function openNewCategory() {
    const used = new Set(state.categories.filter((c) => !c.archived).map((c) => c.color));
    setNewCat({ name: '', color: PALETTE.find((c) => !used.has(c)) || PALETTE[0] });
  }

  function saveNewCategory(e) {
    e.preventDefault();
    const name = newCat.name.trim().replace(/\s+/g, ' ');
    if (!name) return;
    // Enako ime že obstaja: uporabi obstoječo (arhivirano obnovi), ne podvajaj.
    let cat = state.categories.find((c) => c.type === type && payeeKey(c.name) === payeeKey(name));
    if (cat?.archived) {
      cat = { ...cat, archived: false };
      dispatch({ type: 'category/update', category: cat });
    } else if (!cat) {
      cat = { id: uid(), name, type, color: newCat.color, archived: false };
      dispatch({ type: 'category/add', category: cat });
    }
    setNewCat(null);
    // Enako kot klik na kategorijo: ob veljavnem znesku shrani takoj.
    if (amount && accountId) return commit({ payee: payeeText, catId: cat.id, accId: accountId });
    setCategoryId(cat.id);
    setHint('Vpiši znesek.');
    amountRef.current?.focus();
  }

  function switchType(next) {
    setType(next);
    setCategoryId('');
    setPayeeText('');
    setHint('');
  }

  const today = todayIso();
  const yesterday = yesterdayIso();
  const chip = (active, color) => ({
    padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600,
    background: active ? (color || 'var(--color-accent)') : color ? `${color}1f` : 'var(--color-bg)',
    border: `1px solid ${active ? (color || 'var(--color-accent)') : color ? `${color}55` : 'var(--color-border)'}`,
    color: active ? 'white' : color || 'var(--color-text)',
  });
  const small = (active) => ({
    padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
    background: active ? 'var(--color-accent-bg)' : 'transparent',
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
  });
  const label = { fontSize: '0.7rem', color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' };
  const field = {
    padding: '0.6rem 0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6,
    color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none',
  };

  return (
    <>
    <Card padding="1.1rem 1.25rem" data-quick-add>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '1rem', color: 'var(--color-text)' }}>Hiter vnos</strong>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" style={small(type === 'expense')} onClick={() => switchType('expense')}>Odhodek</button>
            <button type="button" style={small(type === 'income')} onClick={() => switchType('income')}>Prihodek</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <div style={{ position: 'relative', flex: '0 1 170px', minWidth: 130 }}>
            <input
              ref={amountRef} autoFocus={autoFocus} inputMode="decimal" autoComplete="off" aria-label="Znesek v evrih" placeholder="0,00"
              value={amountText} onChange={(e) => { setAmountText(e.target.value); setHint(''); }}
              style={{ ...field, width: '100%', fontSize: '1.35rem', fontWeight: 700, paddingRight: '2rem' }}
            />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontWeight: 600 }}>€</span>
          </div>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <input
              autoComplete="off" aria-label={type === 'expense' ? 'Trgovina ali storitev' : 'Plačnik'}
              placeholder={type === 'expense' ? 'Kje? (npr. Hofer), ni obvezno' : 'Od koga? ni obvezno'}
              value={payeeText}
              onChange={(e) => { setPayeeText(e.target.value); setSuggestOpen(true); setActiveIdx(-1); setHint(''); }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              onKeyDown={onPayeeKey}
              style={{ ...field, width: '100%', height: '100%', fontSize: '0.95rem' }}
            />
            {suggestions.length > 0 && (
              <div role="listbox" style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
              }}>
                {suggestions.map((p, i) => (
                  <button key={p.id} type="button" role="option" aria-selected={i === activeIdx}
                    onMouseDown={(e) => { e.preventDefault(); pickPayee(p); }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%', padding: '0.5rem 0.75rem',
                      background: i === activeIdx ? 'var(--color-accent-bg)' : 'transparent', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '0.88rem', color: 'var(--color-text)', textAlign: 'left',
                    }}>
                    <span>{p.name}</span>
                    <span style={{ color: catById[p.categoryId]?.color || 'var(--color-text-muted)', fontSize: '0.8rem' }}>{catById[p.categoryId]?.name || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" size="lg">Dodaj</Button>
        </div>

        {top.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={label}>{type === 'expense' ? 'Pogoste trgovine in storitve' : 'Pogosti plačniki'}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {top.map((p) => (
                <button key={p.id} type="button" onClick={() => pickPayee(p)} data-payee={p.name}
                  aria-label={`${p.name}, ${catById[p.categoryId]?.name || 'brez kategorije'}`}
                  title={`${catById[p.categoryId]?.name || 'Brez kategorije'}, zadnjič ${fmtEur(p.lastAmount, true)}`}
                  style={{ ...chip(known?.id === p.id), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: catById[p.categoryId]?.color || '#64748b' }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={label}>Kategorija</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cats.map((c) => (
              <button key={c.id} type="button" onClick={() => pickCategory(c)} data-category={c.name} style={chip(shownCategoryId === c.id, c.color)}>
                {c.name}
              </button>
            ))}
            <button type="button" onClick={openNewCategory} aria-label="Dodaj novo kategorijo" title="Dodaj novo kategorijo"
              style={{ ...chip(false), display: 'inline-flex', alignItems: 'center', gap: 5, borderStyle: 'dashed', color: 'var(--color-text-muted)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              Nova
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <span style={label}>Datum</span>
          <button type="button" style={small(date === today)} onClick={() => setDate(today)}>Danes</button>
          <button type="button" style={small(date === yesterday)} onClick={() => setDate(yesterday)}>Včeraj</button>
          <input type="date" aria-label="Datum" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)}
            style={{ ...field, padding: '3px 8px', fontSize: '0.8rem', borderColor: date !== today ? '#d97706' : 'var(--color-border)' }} />
          <span style={{ ...label, marginLeft: 8 }}>Račun</span>
          <select aria-label="Račun" value={accountId} onChange={(e) => setAccountId(e.target.value)}
            style={{ ...field, padding: '3px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div aria-live="polite" style={{ minHeight: '1.3rem', fontSize: '0.85rem' }}>
          {hint ? (
            <span style={{ color: '#d97706', fontWeight: 600 }}>{hint}</span>
          ) : added ? (
            <span style={{ color: 'var(--color-text-muted)' }}>
              <span style={{ color: '#059669', fontWeight: 600 }}>Dodano:</span>{' '}
              {[added.payee, catById[added.categoryId]?.name, fmtEur(added.amount, true)].filter(Boolean).join(' · ')}
              {added.date !== today && ` · ${added.date.slice(8, 10)}. ${Number(added.date.slice(5, 7))}.`}{' '}
              <button type="button" onClick={() => { dispatch({ type: 'tx/remove', id: added.id }); setAdded(null); }}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>
                Razveljavi
              </button>
            </span>
          ) : (
            <span style={{ color: 'var(--color-text-subtle)' }}>Vpiši znesek, nato klikni trgovino ali kategorijo. Nova trgovina se zapomni sama.</span>
          )}
        </div>
      </form>
    </Card>

    {/* Zunaj obrazca hitrega vnosa: obrazec v obrazcu ni veljaven. */}
    <Modal open={!!newCat} onClose={() => setNewCat(null)} title={type === 'expense' ? 'Nova kategorija odhodkov' : 'Nova kategorija prihodkov'} width={420}>
      {newCat && (
        <form onSubmit={saveNewCategory} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <Field label="Ime">
            <Input required autoFocus value={newCat.name} placeholder="npr. Hišni ljubljenčki"
              onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          </Field>
          <Field label="Barva">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PALETTE.map((c) => (
                <button key={c} type="button" aria-label={`Barva ${c}`} onClick={() => setNewCat({ ...newCat, color: c })}
                  style={{ width: 26, height: 26, borderRadius: 6, background: c, cursor: 'pointer', border: newCat.color === c ? '2px solid var(--color-text)' : '2px solid transparent' }} />
              ))}
            </div>
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button type="button" variant="secondary" onClick={() => setNewCat(null)}>Prekliči</Button>
            <Button type="submit">{amount ? 'Dodaj in shrani vnos' : 'Dodaj'}</Button>
          </div>
        </form>
      )}
    </Modal>
    </>
  );
}
