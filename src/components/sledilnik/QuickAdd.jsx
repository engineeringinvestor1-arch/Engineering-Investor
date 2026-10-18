import { useMemo, useRef, useState } from 'react';
import { Button, Field, Input, Modal } from './ui.jsx';
import { CatIcon } from './ikone.jsx';
import { fmtEur, findPayee, PALETTE, parseAmount, payeeKey, suggestPayees, todayIso, topPayees, uid, yesterdayIso } from './store.js';

/**
 * Hiter vnos: znesek in en klik.
 *
 * Avtor, 3. 10. 2026: vnašanje mora biti čim hitrejše, trgovina naj se zapomni ("Hofer je za hrano").
 *  - znana trgovina: vpišeš znesek in klikneš trgovino, kategorija in račun sta že znana
 *  - nova trgovina: znesek, ime, klik na kategorijo; naslednjič je med pogostimi
 *  - brez trgovine (gotovina, kava): znesek in klik na kategorijo
 * Klik na trgovino ali kategorijo ob veljavnem znesku shrani takoj; zadnji vnos se da razveljaviti.
 *
 * Na telefonu (prst namesto miške) polje za znesek ni samodejno izbrano, da tipkovnica ne prekrije
 * zaslona, še preden uporabnik kaj pritisne.
 */
const TELEFON = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export default function QuickAdd({ state, dispatch, autoFocus = !TELEFON }) {
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

  return (
    <>
    <form onSubmit={submit} className="sl-card sl-qa" data-quick-add>
      <div className="sl-qa-head">
        <span className="sl-qa-title">Hiter vnos</span>
        <div className="sl-seg" role="group" aria-label="Vrsta vnosa">
          <button type="button" aria-pressed={type === 'expense'} onClick={() => switchType('expense')}>Odhodek</button>
          <button type="button" aria-pressed={type === 'income'} onClick={() => switchType('income')}>Prihodek</button>
        </div>
      </div>

      <div className="sl-qa-amount">
        <input
          ref={amountRef} autoFocus={autoFocus} inputMode="decimal" autoComplete="off" aria-label="Znesek v evrih" placeholder="0,00"
          value={amountText} onChange={(e) => { setAmountText(e.target.value); setHint(''); }}
        />
        <span aria-hidden="true">€</span>
      </div>

      <div className="sl-qa-payee">
        <div>
          <input
            className="sl-input" autoComplete="off" aria-label={type === 'expense' ? 'Trgovina ali storitev' : 'Plačnik'}
            placeholder={type === 'expense' ? 'Trgovina (ni obvezno)' : 'Plačnik (ni obvezno)'}
            value={payeeText}
            onChange={(e) => { setPayeeText(e.target.value); setSuggestOpen(true); setActiveIdx(-1); setHint(''); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            onKeyDown={onPayeeKey}
          />
          {suggestions.length > 0 && (
            <div role="listbox" className="sl-suggest">
              {suggestions.map((p, i) => (
                <button key={p.id} type="button" role="option" aria-selected={i === activeIdx}
                  onMouseDown={(e) => { e.preventDefault(); pickPayee(p); }}>
                  <span>{p.name}</span>
                  <span className="sl-subtle" style={{ fontSize: '0.8rem' }}>{catById[p.categoryId]?.name || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" style={{ height: 44, padding: '0 1.2rem' }}>Dodaj</Button>
      </div>

      {top.length > 0 && (
        <div className="sl-field">
          <span className="sl-label">{type === 'expense' ? 'Pogoste trgovine in storitve' : 'Pogosti plačniki'}</span>
          <div className="sl-scrollrow">
            {top.map((p) => (
              <button key={p.id} type="button" onClick={() => pickPayee(p)} data-payee={p.name} className="sl-chip sl-chip--plain"
                aria-pressed={known?.id === p.id}
                aria-label={`${p.name}, ${catById[p.categoryId]?.name || 'brez kategorije'}`}
                title={`${catById[p.categoryId]?.name || 'Brez kategorije'}, zadnjič ${fmtEur(p.lastAmount, true)}`}>
                <span className="sl-dot" style={{ background: catById[p.categoryId]?.color || 'var(--sl-subtle)' }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sl-field">
        <span className="sl-label">Kategorija</span>
        <div className="sl-chiprow">
          {cats.map((c) => (
            <button key={c.id} type="button" onClick={() => pickCategory(c)} data-category={c.name} className="sl-chip" aria-pressed={shownCategoryId === c.id}>
              <CatIcon category={c} size={24} />
              {c.name}
            </button>
          ))}
          <button type="button" onClick={openNewCategory} aria-label="Dodaj novo kategorijo" title="Dodaj novo kategorijo" className="sl-chip sl-chip--dashed">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            Nova
          </button>
        </div>
      </div>

      <div className="sl-qa-meta">
        <div className="sl-seg" role="group" aria-label="Datum">
          <button type="button" aria-pressed={date === today} onClick={() => setDate(today)}>Danes</button>
          <button type="button" aria-pressed={date === yesterday} onClick={() => setDate(yesterday)}>Včeraj</button>
        </div>
        <input type="date" className="sl-input" aria-label="Datum" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)}
          style={date !== today ? { borderColor: 'var(--sl-warn)' } : undefined} />
        <select className="sl-select" aria-label="Račun" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div aria-live="polite" className="sl-qa-msg">
        {hint ? (
          <span style={{ color: 'var(--sl-warn)', fontWeight: 600 }}>{hint}</span>
        ) : added ? (
          <span className="sl-muted">
            <span className="sl-in" style={{ fontWeight: 600 }}>Dodano:</span>{' '}
            {[added.payee, catById[added.categoryId]?.name, fmtEur(added.amount, true)].filter(Boolean).join(' · ')}
            {added.date !== today && ` · ${added.date.slice(8, 10)}. ${Number(added.date.slice(5, 7))}.`}{' '}
            <button type="button" className="sl-link" onClick={() => { dispatch({ type: 'tx/remove', id: added.id }); setAdded(null); }}>
              Razveljavi
            </button>
          </span>
        ) : (
          <span className="sl-subtle">Vpiši znesek, nato izberi trgovino ali kategorijo. Nova trgovina se zapomni sama.</span>
        )}
      </div>
    </form>

    {/* Zunaj obrazca hitrega vnosa: obrazec v obrazcu ni veljaven. */}
    <Modal open={!!newCat} onClose={() => setNewCat(null)} title={type === 'expense' ? 'Nova kategorija odhodkov' : 'Nova kategorija prihodkov'} width={420}>
      {newCat && (
        <form onSubmit={saveNewCategory} className="sl-form">
          <Field label="Ime">
            <Input required autoFocus value={newCat.name} placeholder="npr. Hišni ljubljenčki"
              onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          </Field>
          <Field label="Barva">
            <Swatches value={newCat.color} onChange={(color) => setNewCat({ ...newCat, color })} />
          </Field>
          <div className="sl-form-actions">
            <span />
            <div>
              <Button type="button" variant="secondary" onClick={() => setNewCat(null)}>Prekliči</Button>
              <Button type="submit">{amount ? 'Dodaj in shrani vnos' : 'Dodaj'}</Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
    </>
  );
}

// Izbira barve: okrogli vzorci, izbrani ima obroč.
export function Swatches({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {PALETTE.map((c) => (
        <button key={c} type="button" aria-label={`Barva ${c}`} aria-pressed={value === c} onClick={() => onChange(c)}
          style={{
            width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer', border: 'none',
            boxShadow: value === c ? `0 0 0 2px var(--sl-card), 0 0 0 4px ${c}` : 'none',
          }} />
      ))}
    </div>
  );
}
