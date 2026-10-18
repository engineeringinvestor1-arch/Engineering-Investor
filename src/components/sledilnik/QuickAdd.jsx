import { useMemo, useRef, useState } from 'react';
import { Button, Field, Input, Modal } from './ui.jsx';
import { CatIcon } from './ikone.jsx';
import { cistoIme, fmtEur, findPayee, PALETTE, parseAmount, payeeKey, suggestPayees, todayIso, topPayees, uid, yesterdayIso } from './store.js';

/**
 * Hiter vnos: znesek in en klik.
 *
 * Avtor, 3. 10. 2026: vnašanje mora biti čim hitrejše, trgovina naj se zapomni ("Hofer je za hrano").
 *  - znana trgovina: vpišeš znesek in klikneš trgovino, kategorija in račun sta že znana
 *  - nova trgovina: znesek, ime, klik na kategorijo; naslednjič je med pogostimi
 *  - brez trgovine (gotovina, kava): znesek in klik na kategorijo
 * Klik na trgovino ali kategorijo ob veljavnem znesku shrani takoj; zadnji vnos se da razveljaviti.
 *
 * Postopek je v useVnos; prikaza sta dva: kartica na računalniku (QuickAdd) in na telefonu okno
 * s številčnico, ki ga odpre gumb + v spodnji vrstici (VnosList, avtor 18. 10. 2026).
 */
const TELEFON = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

function useVnos({ state, dispatch, onAdded, focusAmount = () => {} }) {
  const accounts = state.accounts.filter((a) => !a.archived);
  const lastTx = state.transactions[state.transactions.length - 1];

  const [type, setType] = useState('expense');
  const [amountText, setAmountText] = useState('');
  const [payeeText, setPayeeText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(() => (accounts.some((a) => a.id === lastTx?.accountId) ? lastTx.accountId : accounts[0]?.id || ''));
  const [date, setDate] = useState(todayIso());
  const [hint, setHint] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [newCat, setNewCat] = useState(null);

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
      categoryId: catId, payee: cistoIme(payee), notes: '', tags: [],
    };
    dispatch({ type: 'tx/add', tx });
    setAccountId(accId);
    setAmountText('');
    setPayeeText('');
    setCategoryId('');
    setHint('');
    setSuggestOpen(false);
    setActiveIdx(-1);
    onAdded?.(tx);
    focusAmount();
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
    if (!amount) focusAmount();
  }

  function pickCategory(c) {
    if (amount && accountId) return commit({ payee: payeeText, catId: c.id, accId: accountId });
    setCategoryId(c.id);
    setHint('Vpiši znesek.');
    focusAmount();
  }

  function submit(e) {
    e?.preventDefault();
    if (!amount) {
      setHint(amountText.trim() ? 'Znesek ni veljaven. Primer: 12,50' : 'Vpiši znesek.');
      focusAmount();
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
    const name = cistoIme(newCat.name);
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
    focusAmount();
  }

  function switchType(next) {
    setType(next);
    setCategoryId('');
    setPayeeText('');
    setHint('');
  }

  function typePayee(text) {
    setPayeeText(text);
    setSuggestOpen(true);
    setActiveIdx(-1);
    setHint('');
  }

  return {
    accounts, type, switchType, amountText, setAmountText, amount, payeeText, typePayee, setSuggestOpen, activeIdx,
    accountId, setAccountId, date, setDate, hint, setHint, newCat, setNewCat, cats, catById, known, shownCategoryId,
    top, suggestions, pickPayee, pickCategory, submit, onPayeeKey, openNewCategory, saveNewCategory,
  };
}

// Polje za trgovino s predlogi med tipkanjem.
function PayeeInput({ v }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        className="sl-input" autoComplete="off" aria-label={v.type === 'expense' ? 'Trgovina ali storitev' : 'Plačnik'}
        placeholder={v.type === 'expense' ? 'Trgovina (ni obvezno)' : 'Plačnik (ni obvezno)'}
        value={v.payeeText}
        onChange={(e) => v.typePayee(e.target.value)}
        onFocus={() => v.setSuggestOpen(true)}
        onBlur={() => setTimeout(() => v.setSuggestOpen(false), 150)}
        onKeyDown={v.onPayeeKey}
      />
      {v.suggestions.length > 0 && (
        <div role="listbox" className="sl-suggest">
          {v.suggestions.map((p, i) => (
            <button key={p.id} type="button" role="option" aria-selected={i === v.activeIdx}
              onMouseDown={(e) => { e.preventDefault(); v.pickPayee(p); }}>
              <span>{p.name}</span>
              <span className="sl-subtle" style={{ fontSize: '0.8rem' }}>{v.catById[p.categoryId]?.name || ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PayeeChips({ v, withAmount = false }) {
  if (!v.top.length) return null;
  return (
    <div className="sl-scrollrow">
      {v.top.map((p) => (
        <button key={p.id} type="button" onClick={() => v.pickPayee(p)} data-payee={p.name} className="sl-chip sl-chip--plain"
          aria-pressed={v.known?.id === p.id}
          aria-label={`${p.name}, ${v.catById[p.categoryId]?.name || 'brez kategorije'}`}
          title={`${v.catById[p.categoryId]?.name || 'Brez kategorije'}, zadnjič ${fmtEur(p.lastAmount, true)}`}>
          <span className="sl-dot" style={{ background: v.catById[p.categoryId]?.color || 'var(--sl-subtle)' }} />
          {p.name}
          {withAmount && <span className="sl-subtle sl-num" style={{ fontSize: '0.78rem' }}>{fmtEur(p.lastAmount, true)}</span>}
        </button>
      ))}
    </div>
  );
}

function NovaKategorija({ v, amount }) {
  return (
    <Modal open={!!v.newCat} onClose={() => v.setNewCat(null)} title={v.type === 'expense' ? 'Nova kategorija odhodkov' : 'Nova kategorija prihodkov'} width={420}>
      {v.newCat && (
        <form onSubmit={v.saveNewCategory} className="sl-form">
          <Field label="Ime">
            <Input required autoFocus value={v.newCat.name} placeholder="npr. Hišni ljubljenčki"
              onChange={(e) => v.setNewCat({ ...v.newCat, name: e.target.value })} />
          </Field>
          <Field label="Barva">
            <Swatches value={v.newCat.color} onChange={(color) => v.setNewCat({ ...v.newCat, color })} />
          </Field>
          <div className="sl-form-actions">
            <span />
            <div>
              <Button type="button" variant="secondary" onClick={() => v.setNewCat(null)}>Prekliči</Button>
              <Button type="submit">{amount ? 'Dodaj in shrani vnos' : 'Dodaj'}</Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

const dayLabel = (iso) => (iso === todayIso() ? 'danes' : iso === yesterdayIso() ? 'včeraj' : `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`);

// Kartica na računalniku. Na telefonu je skrita (sledilnik.css, .sl-qa-inline), tam vnos odpre gumb +.
export default function QuickAdd({ state, dispatch, autoFocus = !TELEFON }) {
  const amountRef = useRef(null);
  const [added, setAdded] = useState(null);
  const v = useVnos({ state, dispatch, onAdded: setAdded, focusAmount: () => amountRef.current?.focus() });
  const today = todayIso();
  const yesterday = yesterdayIso();

  return (
    <>
    <form onSubmit={v.submit} className="sl-card sl-qa sl-qa-inline" data-quick-add>
      <div className="sl-qa-head">
        <span className="sl-qa-title">Hiter vnos</span>
        <div className="sl-seg" role="group" aria-label="Vrsta vnosa">
          <button type="button" aria-pressed={v.type === 'expense'} onClick={() => v.switchType('expense')}>Odhodek</button>
          <button type="button" aria-pressed={v.type === 'income'} onClick={() => v.switchType('income')}>Prihodek</button>
        </div>
      </div>

      <div className="sl-qa-amount">
        <input
          ref={amountRef} autoFocus={autoFocus} inputMode="decimal" autoComplete="off" aria-label="Znesek v evrih" placeholder="0,00"
          value={v.amountText} onChange={(e) => { v.setAmountText(e.target.value); v.setHint(''); }}
        />
        <span aria-hidden="true">€</span>
      </div>

      <div className="sl-qa-payee">
        <PayeeInput v={v} />
        <Button type="submit" style={{ height: 44, padding: '0 1.2rem' }}>Dodaj</Button>
      </div>

      {v.top.length > 0 && (
        <div className="sl-field">
          <span className="sl-label">{v.type === 'expense' ? 'Pogoste trgovine in storitve' : 'Pogosti plačniki'}</span>
          <PayeeChips v={v} />
        </div>
      )}

      <div className="sl-field">
        <span className="sl-label">Kategorija</span>
        <div className="sl-chiprow">
          {v.cats.map((c) => (
            <button key={c.id} type="button" onClick={() => v.pickCategory(c)} data-category={c.name} className="sl-chip" aria-pressed={v.shownCategoryId === c.id}>
              <CatIcon category={c} size={24} />
              {c.name}
            </button>
          ))}
          <button type="button" onClick={v.openNewCategory} aria-label="Dodaj novo kategorijo" title="Dodaj novo kategorijo" className="sl-chip sl-chip--dashed">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            Nova
          </button>
        </div>
      </div>

      <div className="sl-qa-meta">
        <div className="sl-seg" role="group" aria-label="Datum">
          <button type="button" aria-pressed={v.date === today} onClick={() => v.setDate(today)}>Danes</button>
          <button type="button" aria-pressed={v.date === yesterday} onClick={() => v.setDate(yesterday)}>Včeraj</button>
        </div>
        <input type="date" className="sl-input" aria-label="Datum" value={v.date} max={today} onChange={(e) => e.target.value && v.setDate(e.target.value)}
          style={v.date !== today ? { borderColor: 'var(--sl-warn)' } : undefined} />
        <select className="sl-select" aria-label="Račun" value={v.accountId} onChange={(e) => v.setAccountId(e.target.value)}>
          {v.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div aria-live="polite" className="sl-qa-msg">
        {v.hint ? (
          <span style={{ color: 'var(--sl-warn)', fontWeight: 600 }}>{v.hint}</span>
        ) : added ? (
          <span className="sl-muted">
            <span className="sl-in" style={{ fontWeight: 600 }}>Dodano:</span>{' '}
            {[added.payee, v.catById[added.categoryId]?.name, fmtEur(added.amount, true)].filter(Boolean).join(' · ')}
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
    <NovaKategorija v={v} amount={v.amount} />
    </>
  );
}

const TIPKE = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'briši'];

// Znesek se piše s številčnico: največ dve decimalki, ena vejica, do sedem mest pred vejico.
function pritisni(text, k) {
  if (k === 'briši') return text.slice(0, -1);
  if (k === ',') return text.includes(',') ? text : `${text || '0'},`;
  const [cela, dec] = text.split(',');
  if (dec !== undefined && dec.length >= 2) return text;
  if (dec === undefined && cela.length >= 7) return text;
  if (text === '0') return k;
  return text + k;
}

// Kratko ime za ploščico: del pred "&" ali "/" ("Hrana & gospodinjstvo" -> "Hrana").
const kratko = (name) => name.split(/\s*[&/]\s*/)[0];

const BRISI = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7z" /><path d="m12.5 9.5 5 5" /><path d="m17.5 9.5-5 5" /></svg>;
const KOLEDAR = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17" /><path d="M8 3v4M16 3v4" /></svg>;

// Vnos na telefonu: okno od spodaj z znesekom, trgovinami, kategorijami in številčnico (avtor, 18. 10. 2026).
// Tipkovnica telefona se odpre samo, kadar uporabnik tipka ime nove trgovine.
export function VnosList({ state, dispatch, onClose, onAdded }) {
  const v = useVnos({ state, dispatch, onAdded: (tx) => { onAdded?.(tx); onClose(); } });
  const today = todayIso();
  const yesterday = yesterdayIso();
  const account = v.accounts.find((a) => a.id === v.accountId);

  function tipka(k) {
    v.setHint('');
    v.setAmountText((t) => pritisni(t, k));
    navigator.vibrate?.(8);
  }

  return (
    <>
    <div className="sl-overlay" onClick={onClose}>
      <div className="sl-dialog sl-vnos" role="dialog" aria-modal="true" aria-label="Nov vnos" onClick={(e) => e.stopPropagation()}>
        <div className="sl-dialog-handle" aria-hidden="true" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="sl-seg" role="group" aria-label="Vrsta vnosa" style={{ display: 'flex', flex: 1 }}>
            <button type="button" aria-pressed={v.type === 'expense'} onClick={() => v.switchType('expense')}>Odhodek</button>
            <button type="button" aria-pressed={v.type === 'income'} onClick={() => v.switchType('income')}>Prihodek</button>
          </div>
          <button type="button" className="sl-iconbtn" onClick={onClose} aria-label="Zapri">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="sl-vnos-amount" aria-live="polite" aria-label={`Znesek ${v.amountText || '0'} evrov`}>
          <span className={v.amountText ? undefined : 'sl-subtle'}>{v.amountText || '0'}</span>
          <span className="sl-vnos-eur">€</span>
        </div>

        <PayeeInput v={v} />
        <PayeeChips v={v} withAmount />

        <div className="sl-vnos-cats">
          {v.cats.map((c) => (
            <button key={c.id} type="button" className="sl-tile" onClick={() => v.pickCategory(c)} data-category={c.name}
              aria-pressed={v.shownCategoryId === c.id} aria-label={c.name} title={c.name}>
              <CatIcon category={c} size={28} />
              <span>{kratko(c.name)}</span>
            </button>
          ))}
          <button type="button" className="sl-tile sl-tile--dashed" onClick={v.openNewCategory} aria-label="Dodaj novo kategorijo">
            <span className="sl-ico" style={{ width: 28, height: 28 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            </span>
            <span>Nova</span>
          </button>
        </div>

        <div className="sl-keypad">
          {TIPKE.map((k) => (
            <button key={k} type="button" className="sl-key" onClick={() => tipka(k)} aria-label={k === 'briši' ? 'Briši zadnjo številko' : k}>
              {k === 'briši' ? BRISI : k}
            </button>
          ))}
        </div>

        <div className="sl-vnos-meta">
          <div className="sl-seg" role="group" aria-label="Datum">
            <button type="button" aria-pressed={v.date === today} onClick={() => v.setDate(today)}>Danes</button>
            <button type="button" aria-pressed={v.date === yesterday} onClick={() => v.setDate(yesterday)}>Včeraj</button>
          </div>
          {/* Drug dan: izbirnik datuma telefona se odpre ob dotiku ikone. */}
          <label className="sl-iconbtn" style={{ position: 'relative', color: v.date !== today && v.date !== yesterday ? 'var(--sl-accent)' : undefined }} aria-label="Drug datum">
            {KOLEDAR}
            <input type="date" value={v.date} max={today} onChange={(e) => e.target.value && v.setDate(e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%' }} />
          </label>
          <select className="sl-select" aria-label="Račun" value={v.accountId} onChange={(e) => v.setAccountId(e.target.value)} style={{ height: 38, width: 'auto', marginLeft: 'auto', fontSize: '0.86rem' }}>
            {v.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {v.hint && <div role="alert" style={{ color: 'var(--sl-warn)', fontWeight: 600, fontSize: '0.86rem', textAlign: 'center' }}>{v.hint}</div>}

        <Button size="lg" onClick={v.submit} style={{ width: '100%', height: 52 }}>
          Shrani · {dayLabel(v.date)}{account ? `, ${account.name}` : ''}
        </Button>
      </div>
    </div>
    <NovaKategorija v={v} amount={v.amount} />
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
