import { useMemo } from 'react';
import { Card, SectionHeader } from '../ui.jsx';
import { ProgressBar } from '../charts.jsx';
import { fmtEur, lastNMonths, monthRange, sumByType, sumByCategory, totalBalance, totalDebt, monthKey, todayIso } from '../store.js';

const TIPS = [
  {
    title: 'Pravilo 50/30/20',
    body: 'Klasična razdelitev neto prihodkov: 50% na nujne potrebe (stanovanje, hrana, računi), 30% na želje (prosti čas, nakupi), 20% na varčevanje in odplačilo dolgov.',
  },
  {
    title: 'Rezervni sklad: 3–6 mesecev',
    body: 'Pred naložbami zgradi rezervni sklad v višini 3–6 mesečnih nujnih stroškov. Hrani ga na ločenem varčevalnem računu, dostopnem v nekaj dneh.',
  },
  {
    title: 'Dolg najprej',
    body: 'Visoke obrestne mere (kreditne kartice 15–25%, potrošniški krediti) odplačaj prednostno. Vlaganje s povprečnim donosom 7% ne premaga 20% obresti na dolg.',
  },
  {
    title: 'Avtomatizacija',
    body: 'Postavi avtomatske prenose na varčevalni in naložbeni račun ob plači. "Pay yourself first", varčevanje se zgodi pred porabo, ne s tem, kar ostane.',
  },
  {
    title: 'Naložbe = čas + stroški',
    body: 'Stroški skladov (TER) in davki imajo eksponenten vpliv na 20–30 let. Široko diverzificiran ETF z TER pod 0.20% je za dolgoročno povprečje težko premagljiv.',
  },
  {
    title: 'Inflacija ti ne odpušča',
    body: 'Denar v predalu izgublja kupno moč. Pri 3% inflaciji se 10.000 € v 20 letih realno zmanjša na ~5.500 €. Naložbe so obramba pred inflacijo, ne luksuz.',
  },
];

function tipsBasedOn(state, monthIncome, monthExpense, savingsRate, debt) {
  const out = [];
  if (savingsRate < 0) {
    out.push({
      severity: 'danger',
      title: 'Negativen denarni tok',
      body: `Ta mesec porabljaš več, kot zaslužiš (razlika ${fmtEur(monthExpense - monthIncome)}). Preglej "Največje odhodke" in postavi proračun za 1–2 največji kategoriji.`,
    });
  } else if (savingsRate < 10 && monthIncome > 0) {
    out.push({
      severity: 'warning',
      title: 'Nizka stopnja varčevanja',
      body: `Trenutno varčuješ ${savingsRate.toFixed(0)}% prihodkov. Cilj za dolgoročno finančno varnost je vsaj 15–20%. Začni z avtomatskim prenosom 10% plače na varčevalni račun.`,
    });
  } else if (savingsRate >= 30) {
    out.push({
      severity: 'success',
      title: 'Visoka stopnja varčevanja',
      body: `Pri ${savingsRate.toFixed(0)}% varčevanja imaš pot do finančne neodvisnosti dosti hitrejšo od povprečja. Preveri, da je presežek razporejen v naložbe in ne zgolj v gotovino.`,
    });
  }

  if (debt > 0 && debt > monthIncome * 12) {
    out.push({
      severity: 'warning',
      title: 'Visok dolg',
      body: `Tvoj dolg (${fmtEur(debt)}) presega 12 mesečnih prihodkov. Preglej obrestne mere in razmisli o refinanciranju ali prednostnem odplačevanju.`,
    });
  }

  const months = lastNMonths(3);
  const expenses3 = months.map((mk) => {
    const { from, to } = monthRange(mk);
    return sumByType(state.transactions.filter((t) => t.date >= from && t.date <= to), 'expense');
  });
  if (expenses3[2] > expenses3[1] * 1.3 && expenses3[1] > 0) {
    out.push({
      severity: 'warning',
      title: 'Skok odhodkov',
      body: `Ta mesec si porabil ${((expenses3[2] / expenses3[1] - 1) * 100).toFixed(0)}% več kot prejšnji. Preveri, ali gre za enkraten dogodek ali nov vzorec.`,
    });
  }

  // Top category share
  const monthTx = state.transactions.filter((t) => t.date.startsWith(monthKey(todayIso())));
  const catSpend = [...sumByCategory(monthTx, 'expense').entries()].sort((a, b) => b[1] - a[1]);
  if (catSpend.length > 0 && monthExpense > 0) {
    const [cid, top] = catSpend[0];
    const cat = state.categories.find((c) => c.id === cid);
    const pct = (top / monthExpense) * 100;
    if (pct > 40 && cat) {
      out.push({
        severity: 'info',
        title: `${cat.name}: ${pct.toFixed(0)}% odhodkov`,
        body: `Ena kategorija pojede skoraj polovico tvojih odhodkov. To samo po sebi ni slabo (npr. najemnina), ampak velja preveriti, ali je v okviru tvojih ciljev.`,
      });
    }
  }

  return out;
}

const SEVERITY_STYLE = {
  danger:  { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)', color: '#fca5a5' },
  warning: { bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.3)', color: '#d97706' },
  success: { bg: 'rgba(5,150,105,0.06)', border: 'rgba(5,150,105,0.3)', color: '#059669' },
  info:    { bg: 'rgba(37,99,235,0.06)', border: 'rgba(37,99,235,0.3)', color: '#2563eb' },
};

export default function Insights({ state }) {
  const today = todayIso();
  const thisMonth = monthKey(today);
  const { from, to } = monthRange(thisMonth);
  const monthTx = state.transactions.filter((t) => t.date >= from && t.date <= to);
  const monthIncome = sumByType(monthTx, 'income');
  const monthExpense = sumByType(monthTx, 'expense');
  const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
  const balance = totalBalance(state);
  const debt = totalDebt(state);

  const personalTips = useMemo(
    () => tipsBasedOn(state, monthIncome, monthExpense, savingsRate, debt),
    [state, monthIncome, monthExpense, savingsRate, debt],
  );

  // 50/30/20 split (rough heuristic)
  const expenseCats = state.categories.filter((c) => c.type === 'expense');
  const NEEDS_HINT = ['stanovanje', 'hrana', 'promet', 'zdravje', 'računi', 'davki'];
  const SAVINGS_HINT = ['naložb', 'varčev'];
  let needs = 0, wants = 0, savings = 0;
  for (const t of monthTx) {
    if (t.type !== 'expense') continue;
    const cat = expenseCats.find((c) => c.id === t.categoryId);
    const name = (cat?.name || '').toLowerCase();
    if (SAVINGS_HINT.some((h) => name.includes(h))) savings += t.amount;
    else if (NEEDS_HINT.some((h) => name.includes(h))) needs += t.amount;
    else wants += t.amount;
  }
  const totalAlloc = Math.max(1, needs + wants + savings);
  const needsPct = (needs / totalAlloc) * 100;
  const wantsPct = (wants / totalAlloc) * 100;
  const savingsPct = (savings / totalAlloc) * 100;

  // FIRE projection (simple)
  const annualSavings = (monthIncome - monthExpense) * 12;
  const annualExpense = monthExpense * 12;
  const fireNumber = annualExpense * 25; // 4% rule
  const yearsToFire = annualSavings > 0 && fireNumber > balance
    ? Math.log((fireNumber * 0.07 / annualSavings) + 1) / Math.log(1.07)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionHeader title="Vpogledi & nasveti" subtitle="Personalizirano glede na tvoje podatke" />

      {personalTips.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
          {personalTips.map((t, i) => {
            const s = SEVERITY_STYLE[t.severity];
            return (
              <div key={i} style={{
                padding: '1rem 1.2rem',
                background: s.bg, border: `1px solid ${s.border}`,
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 8,
              }}>
                <div style={{ fontWeight: 700, color: s.color, marginBottom: 6 }}>{t.title}</div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--color-text-muted)' }}>{t.body}</div>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <SectionHeader title="Pravilo 50/30/20" subtitle="Ocena razdelitve na podlagi imen kategorij ta mesec" />
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ width: 120 }}>Nujne potrebe</strong>
            <ProgressBar value={needsPct} max={100} color="#3b82f6" height={10} />
            <span style={{ width: 90, textAlign: 'right' }}><strong>{needsPct.toFixed(0)}%</strong> <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.78rem' }}>(cilj 50%)</span></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ width: 120 }}>Želje</strong>
            <ProgressBar value={wantsPct} max={100} color="#a855f7" height={10} />
            <span style={{ width: 90, textAlign: 'right' }}><strong>{wantsPct.toFixed(0)}%</strong> <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.78rem' }}>(cilj 30%)</span></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
            <strong style={{ width: 120 }}>Varčevanje</strong>
            <ProgressBar value={savingsPct} max={100} color="#10b981" height={10} />
            <span style={{ width: 90, textAlign: 'right' }}><strong>{savingsPct.toFixed(0)}%</strong> <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.78rem' }}>(cilj 20%)</span></span>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: '0.8rem', color: 'var(--color-text-subtle)', lineHeight: 1.6 }}>
          Razdelitev je groba ocena na podlagi imen kategorij. Za točno sliko razporedi kategorije skladno z razredom (nujno/želje/varčevanje).
        </div>
      </Card>

      <Card>
        <SectionHeader title="FIRE projekcija" subtitle="Financial Independence, predpostavka 7% letni donos, 4% pravilo" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: 10 }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>FIRE številka</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{fmtEur(fireNumber)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>25× letnih odhodkov</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Trenutno</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{fmtEur(balance)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>Vsa sredstva</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Letno varčevanje</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: annualSavings >= 0 ? '#059669' : '#dc2626' }}>{fmtEur(annualSavings)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>(prihodek − odhodek) × 12</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Čas do FIRE</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {yearsToFire == null ? '-' : balance >= fireNumber ? 'Doseženo' : `${yearsToFire.toFixed(0)} let`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>predpostavka 7% donos</div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--color-text-subtle)', lineHeight: 1.6 }}>
          Projekcija je teoretična. Pravi rezultat odvisen od stroškov, davkov, inflacije in volatilnosti trgov.
          Ni finančni nasvet.
        </div>
      </Card>

      <Card>
        <SectionHeader title="Nasveti" subtitle="Splošna pravila zdravih osebnih financ" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {TIPS.map((t) => (
            <div key={t.title} style={{
              padding: '1rem',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.95rem' }}>{t.title}</div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--color-text-muted)' }}>{t.body}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
