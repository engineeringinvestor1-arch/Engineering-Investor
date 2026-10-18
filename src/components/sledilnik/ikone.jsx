/**
 * Ikone kategorij (18. 10. 2026, prenova videza): kategorija je prepoznavna po ikoni v svoji barvi,
 * namesto po barvni oznaki z napisom. Ikona se izbere po imenu kategorije; kategorija, ki je ne
 * prepozna nobeno pravilo (na primer nova "Hišni ljubljenčki"), dobi začetnico v svoji barvi.
 */

const P = {
  dom: <><path d="M3.5 10.5 12 3.5l8.5 7" /><path d="M5.5 9v11.5h13V9" /><path d="M10 20.5v-5.5h4v5.5" /></>,
  kljuc: <><circle cx="8" cy="15.5" r="4" /><path d="m11 12.5 8.5-8.5" /><path d="m16 7.5 2.5 2.5" /><path d="m18.5 5 2 2" /></>,
  kosarica: <><circle cx="9.5" cy="19.5" r="1.3" /><circle cx="17.5" cy="19.5" r="1.3" /><path d="M3 4h2.4l2.2 11a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.3" /></>,
  avto: <><path d="M5 16.5H4a1 1 0 0 1-1-1v-3a2 2 0 0 1 .6-1.4L5.5 9l1.4-3.2A2 2 0 0 1 8.7 4.5h6.6a2 2 0 0 1 1.8 1.3L18.5 9l1.9 2.1a2 2 0 0 1 .6 1.4v3a1 1 0 0 1-1 1h-1" /><circle cx="7.5" cy="16.5" r="2" /><circle cx="16.5" cy="16.5" r="2" /><path d="M9.5 16.5h5" /><path d="M5.5 9h13" /></>,
  racun: <><path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" /><path d="M9.5 8h5" /><path d="M9.5 12h5" /></>,
  srce: <path d="M12 20s-7.5-4.4-8.6-9.3A4.5 4.5 0 0 1 12 7.4a4.5 4.5 0 0 1 8.6 3.3C19.5 15.6 12 20 12 20z" />,
  vstopnica: <><path d="M4 6.5h16V10a2 2 0 0 0 0 4v3.5H4V14a2 2 0 0 0 0-4z" /><path d="M14.5 6.5v2" /><path d="M14.5 11v2" /><path d="M14.5 15.5v2" /></>,
  majica: <path d="M8.5 3.5 4 5.5l1.5 4.5 2-.7v11.2h9V9.3l2 .7L20 5.5l-4.5-2a3.5 3.5 0 0 1-7 0z" />,
  knjiga: <><path d="M5 5a1.5 1.5 0 0 1 1.5-1.5H19v14H6.5A1.5 1.5 0 0 0 5 19z" /><path d="M5 19a1.5 1.5 0 0 0 1.5 1.5H19" /></>,
  ustanova: <><path d="M4 20.5h16" /><path d="M5 10h14" /><path d="M12 3.5 19.5 8h-15z" /><path d="M7 10v7.5M10.3 10v7.5M13.7 10v7.5M17 10v7.5" /></>,
  rast: <><path d="m3.5 16.5 5.5-5.5 4 4 7.5-7.5" /><path d="M15 7.5h5.5V13" /></>,
  aktovka: <><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M8.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 6v1.5" /><path d="M3.5 12.5h17" /></>,
  kovanci: <><circle cx="9" cy="9" r="5.5" /><path d="M18.3 10.6a5.5 5.5 0 1 1-7.7 7.7" /></>,
  prihodek: <><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>,
  prenos: <><path d="M5 8h13l-3.5-3.5" /><path d="M19 16H6l3.5 3.5" /></>,
  drugo: <><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></>,
};

// Prvo pravilo, ki se ujema z imenom, določi ikono. Prihodki imajo svoja pravila ("Najemnina" kot
// prihodek je ključ, kot odhodek pa dom).
const PRIHODKI = [
  [['plač', 'honorar', 's.p.', 'regres', 'bonus'], 'aktovka'],
  [['dividend', 'obrest', 'kupon'], 'kovanci'],
  [['najem'], 'kljuc'],
];
const ODHODKI = [
  [['stanovan', 'najem', 'dom', 'elektr', 'ogrev', 'komunal'], 'dom'],
  [['hrana', 'gospodinj', 'živil', 'trgovin', 'restavr'], 'kosarica'],
  [['promet', 'gorivo', 'avto', 'prevoz', 'bencin'], 'avto'],
  [['račun', 'naročnin', 'telefon', 'internet'], 'racun'],
  [['zdrav', 'lekarn', 'zdravnik'], 'srce'],
  [['prosti', 'zabav', 'hobi', 'potovan', 'dopust'], 'vstopnica'],
  [['oblačil', 'obutev', 'obleke'], 'majica'],
  [['izobraž', 'šol', 'tečaj', 'knjig'], 'knjiga'],
  [['davk', 'prispev'], 'ustanova'],
  [['naložb', 'varčev', 'invest'], 'rast'],
  [['drugo', 'ostalo', 'razno'], 'drugo'],
];

export function ikonaKategorije(category, type = category?.type) {
  const ime = String(category?.name ?? '').toLocaleLowerCase('sl-SI');
  if (!ime) return null;
  for (const [besede, ikona] of type === 'income' ? [...PRIHODKI, ...ODHODKI] : ODHODKI) {
    if (besede.some((b) => ime.includes(b))) return ikona;
  }
  return type === 'income' ? 'prihodek' : null;
}

// Ikona v zaobljenem kvadratu, obarvana z barvo kategorije. kind: 'transfer' za prenos med računi.
export function CatIcon({ category, type, kind, size = 36 }) {
  const color = kind === 'transfer' ? 'var(--sl-muted)' : category?.color || 'var(--sl-muted)';
  const ikona = kind === 'transfer' ? 'prenos' : ikonaKategorije(category, type);
  // Barva gre v spremenljivko --c; ozadje in odtenek ikone za svetlo in temno temo določi sledilnik.css.
  return (
    <span className="sl-ico sl-ico--tint" aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.31), '--c': color }}>
      {ikona ? (
        <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {P[ikona]}
        </svg>
      ) : (
        <span style={{ fontSize: Math.round(size * 0.4), fontWeight: 650 }}>{String(category?.name || '?').charAt(0).toLocaleUpperCase('sl-SI')}</span>
      )}
    </span>
  );
}
