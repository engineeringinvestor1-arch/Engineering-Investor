import { useMemo } from 'react';
import { Card, SectionHeader, PageHeader, Notice } from '../ui.jsx';
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

// Resnost nasveta kot ton obvestila (sledilnik.css).
const TONE = { danger: 'bad', warning: 'warn', success: 'good', info: 'info' };

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

  // Ena vrstica razdelitve 50/30/20: ime, črta in delež s ciljem.
  const split = (label, pct, cilj, color) => (
    <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr) 92px', gap: '0.75rem', alignItems: 'center' }}>
      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{label}</span>
      <ProgressBar value={pct} max={100} color={color} height={6} />
      <span style={{ textAlign: 'right', fontSize: '0.84rem' }}>
        <span className="sl-num" style={{ fontWeight: 500 }}>{pct.toFixed(0)} %</span> <span className="sl-subtle" style={{ fontSize: '0.74rem' }}>cilj {cilj}</span>
      </span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PageHeader title="Vpogledi" subtitle="Nasveti glede na tvoje podatke" />

      {personalTips.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {personalTips.map((t, i) => (
            <Notice key={i} tone={TONE[t.severity]}>
              <strong>{t.title}</strong>
              <div style={{ marginTop: 3 }}>{t.body}</div>
            </Notice>
          ))}
        </div>
      )}

      <Card>
        <SectionHeader title="Pravilo 50/30/20" subtitle="Ocena razdelitve na podlagi imen kategorij ta mesec" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {split('Nujne potrebe', needsPct, '50 %', 'var(--sl-accent)')}
          {split('Želje', wantsPct, '30 %', '#a855f7')}
          {split('Varčevanje', savingsPct, '20 %', 'var(--sl-in)')}
        </div>
        <div className="sl-hint" style={{ marginTop: 14 }}>
          Razdelitev je groba ocena na podlagi imen kategorij. Za točno sliko razporedi kategorije skladno z razredom (nujno/želje/varčevanje).
        </div>
      </Card>

      <Card padding="1.15rem 1.15rem 0">
        <SectionHeader title="FIRE projekcija" subtitle="Finančna neodvisnost: predpostavka 7 % letnega donosa in pravilo 4 %" />
        <div style={{ margin: '0 -1.15rem' }}>
          <div className="sl-stats" style={{ borderTop: '1px solid var(--sl-line)' }}>
            {[
              { label: 'FIRE številka', value: fmtEur(fireNumber), sub: '25× letnih odhodkov' },
              { label: 'Trenutno', value: fmtEur(balance), sub: 'Vsa sredstva' },
              { label: 'Letno varčevanje', value: fmtEur(annualSavings), sub: '(prihodek − odhodek) × 12', color: annualSavings >= 0 ? 'var(--sl-in)' : 'var(--sl-bad)' },
              { label: 'Čas do FIRE', value: yearsToFire == null ? '-' : balance >= fireNumber ? 'Doseženo' : `${yearsToFire.toFixed(0)} let`, sub: 'predpostavka 7 % donos' },
            ].map((s) => (
              <div key={s.label} className="sl-stat">
                <div className="sl-stat-label">{s.label}</div>
                <div className="sl-stat-value" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
                <div className="sl-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="sl-hint" style={{ padding: '0.9rem 0 1.1rem', borderTop: '1px solid var(--sl-line)' }}>
          Projekcija je teoretična. Pravi rezultat odvisen od stroškov, davkov, inflacije in volatilnosti trgov.
          Ni finančni nasvet.
        </div>
      </Card>

      <div>
        <SectionHeader title="Nasveti" subtitle="Splošna pravila zdravih osebnih financ" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {TIPS.map((t) => (
            <Card key={t.title} padding="1rem 1.05rem">
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.94rem', letterSpacing: '-0.01em' }}>{t.title}</div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--sl-muted)' }}>{t.body}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
