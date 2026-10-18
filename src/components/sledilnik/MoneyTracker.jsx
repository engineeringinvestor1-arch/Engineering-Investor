import { useEffect, useReducer, useState } from 'react';
import { loadState, saveState, fmtEur, postDueRecurring, todayIso, exportJson, zadnjaKopija, potrebnaKopija, fmtDate } from './store.js';
import { reducer } from './reducer.js';
import QuickAdd from './QuickAdd.jsx';
import { hasDemo } from './demo.js';
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
// devet enakovrednih pogledov je bilo preveč). Nič ni odstranjeno, samo razvrščeno.
const NAV = [
  { id: 'pregled',     label: 'Pregled',     icon: 'dashboard' },
  { id: 'transakcije', label: 'Transakcije', icon: 'list' },
  { id: 'ponavljajoce', label: 'Redni stroški', icon: 'repeat' },
  { id: 'proracun',    label: 'Proračun',    icon: 'budget' },
  { id: 'porocila',    label: 'Poročila',    icon: 'chart',     more: true },
  { id: 'racuni',      label: 'Računi',      icon: 'card',      more: true },
  { id: 'cilji',       label: 'Cilji',       icon: 'target',    more: true },
  { id: 'vpogledi',    label: 'Vpogledi',    icon: 'lightbulb', more: true },
  { id: 'nastavitve',  label: 'Nastavitve',  icon: 'settings',  more: true },
];

const ICONS = {
  dashboard: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />,
  list:      <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><circle cx="3.5" cy="6" r="1.5" /><circle cx="3.5" cy="12" r="1.5" /><circle cx="3.5" cy="18" r="1.5" /></>,
  card:      <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  budget:    <><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  target:    <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  chart:     <><path d="M3 3v18h18" /><path d="M7 14l3-3 4 4 5-5" /></>,
  repeat:    <><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
  lightbulb: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7 4 4 0 0 1 1.5 3.3h5a4 4 0 0 1 1.5-3.3A7 7 0 0 0 12 2z" /></>,
  settings:  <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
};

function NavIcon({ name }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

// Aplikacija na telefonu za avtorjev poskusni mesec (18. 10. 2026): brez prijave, podatki samo na napravi.
// Prijava, sinhronizacija in premium iz stare strani (veja arhiv-2026-10-10) pridejo, ko gre izdelek na trg.
export default function MoneyTracker() {
  return <MoneyTrackerInner />;
}

// Telefon: ista meja kot v slogu spodaj. Komponenta teče samo v brskalniku (client:only), zato je okno vedno na voljo.
const MOBILE_QUERY = '(max-width: 760px)';
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

function MoneyTrackerInner() {
  const [state, dispatch] = useReducer(reducer, null, () => loadState());
  const [view, setView] = useState('pregled');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [autoPosted, setAutoPosted] = useState([]);
  const [kopija, setKopija] = useState(() => zadnjaKopija());
  const isMobile = useIsMobile();

  // Brskalnik sme podatke spletne strani ob pomanjkanju prostora izbrisati; trajna shramba to prepreči.
  // Nameščena aplikacija jo na Androidu običajno dobi brez vprašanja.
  useEffect(() => { navigator.storage?.persist?.().catch(() => {}); }, []);

  function shraniKopijo() {
    exportJson(state);
    setKopija(zadnjaKopija());
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
      // Na telefonu je hiter vnos čisto na vrhu strani (spodaj), zato ga pogleda ne ponovita.
      case 'pregled':      return <Dashboard state={state} dispatch={dispatch} onNav={setView} quickAdd={!isMobile} />;
      case 'transakcije':  return <Transactions state={state} dispatch={dispatch} quickAdd={!isMobile} />;
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Telefon: hiter vnos pred vsem drugim (avtor, 3. 10. 2026). Brez samodejnega fokusa, da tipkovnica
          ne prekrije zaslona, še preden uporabnik kaj pritisne. */}
      {isMobile && (
        <div style={{ padding: '0.75rem 1rem 0' }}>
          <QuickAdd state={state} dispatch={dispatch} autoFocus={false} />
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 230px) 1fr',
        maxWidth: 1400,
        margin: '0 auto',
        gap: 0,
      }} className="tracker-shell">
        {/* Sidebar */}
        <aside style={{
          padding: '2rem 1rem',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          minHeight: '85vh',
        }} className="tracker-sidebar">
          <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }} className="tracker-sidebar-title">
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Sledilnik
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, marginTop: 2, letterSpacing: '-0.015em', color: 'var(--color-text)' }}>Osebne finance</div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map((n, i) => {
              const active = view === n.id;
              const firstMore = n.more && !NAV[i - 1]?.more;
              return (
                <button key={n.id} onClick={() => { setView(n.id); setMobileNavOpen(false); }}
                  className={firstMore ? 'tracker-nav-more' : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.55rem 0.8rem', borderRadius: 6,
                    fontSize: '0.88rem', fontWeight: 500,
                    background: active ? 'var(--color-accent-bg)' : 'transparent',
                    color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left',
                    transition: 'all 0.12s',
                  }}>
                  <NavIcon name={n.icon} />
                  {n.label}
                </button>
              );
            })}
          </nav>
          <div className="tracker-sync" style={{
            marginTop: '2rem',
            padding: '0.85rem',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            fontSize: '0.76rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.55,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Samo na tej napravi
            </div>
            <span>Zadnja varnostna kopija: {kopija ? fmtDate(kopija) : 'še nobene'}. </span>
            <button onClick={shraniKopijo} style={{ color: 'var(--color-accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>Shrani kopijo</button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ padding: '2.5rem 2rem', minWidth: 0 }} className="tracker-main">
          {potrebnaKopija(state, kopija) && (
            <div role="status" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              marginBottom: '1rem', padding: '0.65rem 1rem', borderRadius: 8,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid #d97706',
              fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.5,
            }}>
              <span><strong>Podatki so samo na tem telefonu.</strong> {kopija ? `Zadnja varnostna kopija je bila ${fmtDate(kopija)}.` : 'Varnostne kopije še nisi shranil.'}</span>
              <button onClick={shraniKopijo} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 6, padding: '0.35rem 0.75rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Shrani kopijo
              </button>
            </div>
          )}
          {hasDemo(state) && (
            <div role="status" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              marginBottom: '1rem', padding: '0.65rem 1rem', borderRadius: 8,
              background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-border)',
              fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.5,
            }}>
              <span><strong>Prikazani so testni podatki.</strong> Tvoji vnosi so med njimi in ostanejo, ko testne odstraniš.</span>
              <button onClick={() => dispatch({ type: 'demo/remove' })} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 6, padding: '0.35rem 0.75rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Odstrani testne podatke
              </button>
            </div>
          )}
          {autoPosted.length > 0 && (
            <div role="status" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
              marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 8,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid #059669',
              fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.55,
            }}>
              <div>
                <strong style={{ color: 'var(--color-text)' }}>Redni stroški so vpisani sami ({autoPosted.length}):</strong>{' '}
                {autoPosted.slice(0, 6).map((t) => `${t.payee} ${fmtEur(t.amount, true)} (${Number(t.date.slice(8, 10))}. ${Number(t.date.slice(5, 7))}.)`).join(', ')}
                {autoPosted.length > 6 && ` in še ${autoPosted.length - 6}`}.{' '}
                <button onClick={() => { setView('ponavljajoce'); setAutoPosted([]); }} style={{ color: 'var(--color-accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>Uredi pravila</button>
              </div>
              <button onClick={() => setAutoPosted([])} aria-label="Zapri obvestilo" style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 2 }}>×</button>
            </div>
          )}
          {renderView()}
        </main>
      </div>

      <style>{`
        /* Ločnica pred redkeje rabljenimi pogledi: napis "Več" na širokem zaslonu, tanka črta na telefonu. */
        .tracker-nav-more { margin-top: 1.4rem; position: relative; }
        .tracker-nav-more::before {
          content: 'Več'; position: absolute; top: -1.15rem; left: 0.8rem;
          font-size: 0.66rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-subtle);
        }
        @media (max-width: 760px) {
          .tracker-nav-more { margin-top: 0; margin-left: 10px; }
          .tracker-nav-more::before { content: ''; top: 20%; bottom: 20%; left: -6px; width: 1px; background: var(--color-border-strong); }
          /* minmax(0, ...): brez tega meni v eni vrstici razširi stolpec čez rob zaslona in vsebina je odrezana. */
          .tracker-shell { grid-template-columns: minmax(0, 1fr) !important; }
          .tracker-sidebar {
            min-height: 0 !important;
            border-right: none !important;
            border-bottom: 1px solid var(--color-border);
            padding: 1rem !important;
          }
          /* Meni v eni vrstici, ki se pomika vstran: na telefonu naj prostor dobi vsebina, ne meni. */
          .tracker-sidebar { padding: 0.5rem 1rem !important; }
          .tracker-sidebar-title, .tracker-sync { display: none !important; }
          .tracker-sidebar nav { flex-direction: row !important; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
          .tracker-sidebar nav::-webkit-scrollbar { display: none; }
          .tracker-sidebar nav button { padding: 0.45rem 0.7rem !important; font-size: 0.82rem !important; white-space: nowrap; flex: 0 0 auto; }
          .tracker-main { padding: 1.25rem 1rem !important; }
        }
      `}</style>
    </div>
  );
}
