import { useEffect, useReducer, useState } from 'react';
import './sledilnik.css';
import { loadState, saveState, fmtEur, postDueRecurring, todayIso, exportJson, zadnjaKopija, potrebnaKopija, fmtDate } from './store.js';
import { reducer } from './reducer.js';
import { hasDemo } from './demo.js';
import { Button, Modal, Notice } from './ui.jsx';
import Dashboard from './views/Dashboard.jsx';
import Transactions from './views/Transactions.jsx';
import Accounts from './views/Accounts.jsx';
import Budget from './views/Budget.jsx';
import Goals from './views/Goals.jsx';
import Reports from './views/Reports.jsx';
import Recurring from './views/Recurring.jsx';
import Insights from './views/Insights.jsx';
import Settings from './views/Settings.jsx';

// Vsakdanji pogledi so spredaj, redkeje rabljeni pod "Več" (avtor, 3. 10. 2026: sledilnik naj bo enostaven;
// devet enakovrednih pogledov je bilo preveč). Nič ni odstranjeno, samo razvrščeno. Na telefonu so
// vsakdanji v spodnji vrstici (prenova videza 18. 10. 2026), short je njihov napis tam.
const NAV = [
  { id: 'pregled',     label: 'Pregled',     icon: 'dashboard' },
  { id: 'transakcije', label: 'Transakcije', icon: 'list' },
  { id: 'ponavljajoce', label: 'Redni stroški', short: 'Redni', icon: 'repeat' },
  { id: 'proracun',    label: 'Proračun',    icon: 'budget' },
  { id: 'porocila',    label: 'Poročila',    icon: 'chart',     more: true },
  { id: 'racuni',      label: 'Računi',      icon: 'card',      more: true },
  { id: 'cilji',       label: 'Cilji',       icon: 'target',    more: true },
  { id: 'vpogledi',    label: 'Vpogledi',    icon: 'lightbulb', more: true },
  { id: 'nastavitve',  label: 'Nastavitve',  icon: 'settings',  more: true },
];

const ICONS = {
  dashboard: <><rect x="3.5" y="3.5" width="7" height="8.5" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="5" rx="1.8" /><rect x="13.5" y="11.5" width="7" height="9" rx="1.8" /><rect x="3.5" y="15" width="7" height="5.5" rx="1.8" /></>,
  list:      <><path d="M9 6.5h11" /><path d="M9 12h11" /><path d="M9 17.5h11" /><circle cx="4.75" cy="6.5" r="1.1" /><circle cx="4.75" cy="12" r="1.1" /><circle cx="4.75" cy="17.5" r="1.1" /></>,
  card:      <><rect x="2.75" y="5.5" width="18.5" height="13" rx="2.5" /><path d="M2.75 10h18.5" /><path d="M6.5 15h3" /></>,
  budget:    <><circle cx="12" cy="12" r="8.75" /><path d="M12 3.25V12l6.2 6.2" /></>,
  target:    <><circle cx="12" cy="12" r="8.75" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.25" /></>,
  chart:     <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M21 20H3" /></>,
  repeat:    <><path d="M17 2.5 20.5 6 17 9.5" /><path d="M3.5 11.5V10A4 4 0 0 1 7.5 6h13" /><path d="M7 21.5 3.5 18 7 14.5" /><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13" /></>,
  lightbulb: <><path d="M9 18h6" /><path d="M10 21.5h4" /><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.8.6 1.3 1.5 1.3 2.5v1.2h5v-1.2c0-1 .5-1.9 1.3-2.5A6.5 6.5 0 0 0 12 2.5z" /></>,
  settings:  <><path d="M4 6.5h9" /><path d="M17 6.5h3" /><circle cx="15" cy="6.5" r="2" /><path d="M4 12h3" /><path d="M11 12h9" /><circle cx="9" cy="12" r="2" /><path d="M4 17.5h11" /><path d="M19 17.5h1" /><circle cx="17" cy="17.5" r="2" /></>,
  more:      <><circle cx="6" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18" cy="12" r="1.4" /></>,
  lock:      <><rect x="5" y="10.5" width="14" height="10" rx="2.2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></>,
  chevron:   <path d="m9.5 6 6 6-6 6" />,
};

function NavIcon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

// Aplikacija na telefonu za avtorjev poskusni mesec (18. 10. 2026): brez prijave, podatki samo na napravi.
// Prijava, sinhronizacija in premium iz stare strani (veja arhiv-2026-10-10) pridejo, ko gre izdelek na trg.
export default function MoneyTracker() {
  return <MoneyTrackerInner />;
}

function MoneyTrackerInner() {
  const [state, dispatch] = useReducer(reducer, null, () => loadState());
  const [view, setView] = useState('pregled');
  const [moreOpen, setMoreOpen] = useState(false);
  const [autoPosted, setAutoPosted] = useState([]);
  const [kopija, setKopija] = useState(() => zadnjaKopija());

  // Brskalnik sme podatke spletne strani ob pomanjkanju prostora izbrisati; trajna shramba to prepreči.
  // Nameščena aplikacija jo na Androidu običajno dobi brez vprašanja.
  useEffect(() => { navigator.storage?.persist?.().catch(() => {}); }, []);

  function shraniKopijo() {
    exportJson(state);
    setKopija(zadnjaKopija());
  }

  // Nov pogled se odpre na vrhu, kot v aplikaciji; brez tega bi ostal na višini prejšnjega.
  function go(id) {
    setView(id);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  }

  // Redni stroški se vpišejo sami: ob odprtju in ob vsaki spremembi pravil (avtor, 3. 10. 2026).
  // Kaj je bilo vpisano, pove obvestilo, da se nič ne zgodi potiho.
  useEffect(() => {
    const today = todayIso();
    const { posted } = postDueRecurring(state, today);
    if (!posted.length) return;
    setAutoPosted((prev) => [...prev, ...posted]);
    dispatch({ type: 'recurring/run', today });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.recurring, state.accounts]);

  // Vsaka sprememba se takoj shrani na napravo.
  useEffect(() => { saveState(state); }, [state]);

  function renderView() {
    switch (view) {
      // Hiter vnos je na vrhu pregleda in transakcij (avtor, 3. 10. 2026: na telefonu pred vsem drugim).
      case 'pregled':      return <Dashboard state={state} dispatch={dispatch} onNav={go} />;
      case 'transakcije':  return <Transactions state={state} dispatch={dispatch} />;
      case 'racuni':       return <Accounts state={state} dispatch={dispatch} />;
      case 'proracun':     return <Budget state={state} dispatch={dispatch} />;
      case 'cilji':        return <Goals state={state} dispatch={dispatch} />;
      case 'porocila':     return <Reports state={state} />;
      case 'ponavljajoce': return <Recurring state={state} dispatch={dispatch} />;
      case 'vpogledi':     return <Insights state={state} />;
      case 'nastavitve':   return <Settings state={state} dispatch={dispatch} />;
      default: return null;
    }
  }

  const daily = NAV.filter((n) => !n.more);
  const more = NAV.filter((n) => n.more);
  const inMore = more.some((n) => n.id === view);
  const kopijaBesedilo = `Zadnja varnostna kopija: ${kopija ? fmtDate(kopija) : 'še nobene'}.`;

  return (
    <div className="sl">
      <div className="sl-shell">
        <aside className="sl-side">
          <div className="sl-brand">
            <span className="sl-brand-mark"><NavIcon name="chart" size={18} /></span>
            <div>
              <div className="sl-brand-name">Sledilnik financ</div>
              <div className="sl-brand-sub">Engineering Investor</div>
            </div>
          </div>
          <nav aria-label="Pogledi">
            {daily.map((n) => (
              <button key={n.id} className="sl-side-link" aria-current={view === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
                <NavIcon name={n.icon} />{n.label}
              </button>
            ))}
            <div className="sl-side-group">Več</div>
            {more.map((n) => (
              <button key={n.id} className="sl-side-link" aria-current={view === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
                <NavIcon name={n.icon} />{n.label}
              </button>
            ))}
          </nav>
          <div className="sl-side-foot sl-card" style={{ padding: '0.8rem 0.85rem', fontSize: '0.78rem', color: 'var(--sl-muted)', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--sl-ink)', marginBottom: 2 }}>
              <NavIcon name="lock" size={15} />Samo na tej napravi
            </div>
            {kopijaBesedilo}{' '}
            <button className="sl-link" onClick={shraniKopijo}>Shrani kopijo</button>
          </div>
        </aside>

        <main className="sl-main">
          <div className="sl-content">
            {potrebnaKopija(state, kopija) && (
              <Notice tone="warn" action={<Button variant="secondary" size="sm" onClick={shraniKopijo}>Shrani kopijo</Button>}>
                <strong>Podatki so samo na tem telefonu.</strong> {kopija ? `Zadnja varnostna kopija je bila ${fmtDate(kopija)}.` : 'Varnostne kopije še nisi shranil.'}
              </Notice>
            )}
            {hasDemo(state) && (
              <Notice tone="info" action={<Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'demo/remove' })}>Odstrani</Button>}>
                <strong>Prikazani so testni podatki.</strong> Tvoji vnosi so med njimi in ostanejo, ko testne odstraniš.
              </Notice>
            )}
            {autoPosted.length > 0 && (
              <Notice tone="good" onClose={() => setAutoPosted([])}>
                <strong>Redni stroški so vpisani sami ({autoPosted.length}):</strong>{' '}
                {autoPosted.slice(0, 6).map((t) => `${t.payee} ${fmtEur(t.amount, true)} (${Number(t.date.slice(8, 10))}. ${Number(t.date.slice(5, 7))}.)`).join(', ')}
                {autoPosted.length > 6 && ` in še ${autoPosted.length - 6}`}.{' '}
                <button className="sl-link" onClick={() => { go('ponavljajoce'); setAutoPosted([]); }}>Uredi pravila</button>
              </Notice>
            )}
            {renderView()}
          </div>
        </main>
      </div>

      <nav className="sl-tabs" aria-label="Pogledi">
        {daily.map((n) => (
          <button key={n.id} className="sl-tab" aria-current={view === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
            <NavIcon name={n.icon} size={22} />{n.short || n.label}
          </button>
        ))}
        <button className="sl-tab" aria-current={inMore ? 'page' : undefined} aria-haspopup="dialog" onClick={() => setMoreOpen(true)}>
          <NavIcon name="more" size={22} />Več
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Več">
        <div className="sl-card sl-list">
          {more.map((n) => (
            <button key={n.id} className="sl-row" onClick={() => go(n.id)} style={view === n.id ? { color: 'var(--sl-accent)' } : undefined}>
              <span className="sl-ico" style={{ background: 'var(--sl-field)', color: view === n.id ? 'var(--sl-accent)' : 'var(--sl-ink)' }}><NavIcon name={n.icon} /></span>
              <span className="sl-row-title" style={{ color: 'inherit' }}>{n.label}</span>
              <span className="sl-subtle"><NavIcon name="chevron" size={18} /></span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '0.9rem', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--sl-muted)', lineHeight: 1.5 }}>
          <NavIcon name="lock" size={16} />
          <span style={{ flex: 1 }}>Podatki so samo na tej napravi. {kopijaBesedilo}</span>
          <Button variant="secondary" size="sm" onClick={shraniKopijo}>Shrani kopijo</Button>
        </div>
      </Modal>
    </div>
  );
}
