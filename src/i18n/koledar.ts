// Prevod vrednosti v ekonomskem koledarju.
//
// Podatki (src/data/koledar-events.json) so en sam vir za vse jezike in so zapisani v slovenščini:
// vrednosti vpisuje robot po stalnih predlogah ("CPI 3,4 % medletno; jedrna 2,5 %"), opombe pa nastanejo
// ročno ob tedenskem pregledu. Zato sta tu dva koraka:
//   1. NATANCNO: ročno napisani stavki, prevedeni v celoti. Nova ročna opomba dobi tu svoj vnos.
//   2. VZORCI: besedišče robotovih predlog in zapis števil. Nova predloga robota potrebuje nov vzorec.
// Česar ne zna prevesti nobeden od korakov, ostane v izvirniku; scripts/i18n/koledar.test.mjs zato
// preveri, da v podatkih ni vrednosti, ki bi v angleščini ostala (delno) slovenska.

import type { Lang } from './index.ts';

const MESECI_EN: Record<string, string> = {
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', maj: 'May', jun: 'Jun',
  jul: 'Jul', avg: 'Aug', sep: 'Sep', okt: 'Oct', nov: 'Nov', dec: 'Dec',
};

// Ročno napisane vrednosti in opombe.
const NATANCNO_EN: Record<string, string> = {
  '-0,4 % mesečno, 3,5 % letno; jedrna 0 % mesečno in 2,6 % letno, pod pričakovanji':
    '-0.4% m/m, 3.5% y/y; core 0% m/m and 2.6% y/y, below expectations',
  '+0,2 % mesečno; brez bencinskih servisov +0,7 %, kontrolna skupina +0,5 %':
    '+0.2% m/m; excluding gas stations +0.7%, control group +0.5%',
  'Depozitna mera nespremenjena pri 2,25 %, odločitev soglasna': 'Deposit rate unchanged at 2.25%, decision unanimous',
  'Poslovna aktivnost je rasla najhitreje v osmih mesecih': 'Business activity grew at the fastest pace in eight months',
  '1,5 % (anualizirano), pod pričakovanji; potrošnja je bila svetla točka':
    '1.5% (annualised), below expectations; consumption was the bright spot',
  'Nespremenjene pri 3,50-3,75 %, glasovanje 9:3 (trije za dvig)': 'Unchanged at 3.50-3.75%, vote 9:3 (three for a hike)',
  'Zaposlovanje 52,8 (najvišje od avgusta 2022), proizvodnja 58,5, cene 71,1':
    'Employment 52.8 (highest since August 2022), production 58.5, prices 71.1',
  '+44.000, pod pričakovanji; junij revidiran navzdol na 95.000': '+44,000, below expectations; June revised down to 95,000',
  '-23.000; revizije za maj in junij skupaj -103.000; brezposelnost 4,1 %, plače +3,2 % letno':
    '-23,000; revisions for May and June total -103,000; unemployment 4.1%, wages +3.2% y/y',
  'nad pričakovanji; vključuje 4,6 mrd USD enkratnega dobička iz Visa delnic, celoletna napoved ni bila zvišana':
    'above expectations; includes a one-off $4.6bn gain from Visa shares, full-year guidance was not raised',
  'prihodki 12,56 mrd USD rahlo pod pričakovanji; napoved za Q3 pod konsenzom, delnica -8,5 %':
    'revenue of $12.56bn slightly below expectations; Q3 guidance below consensus, shares -8.5%',
  'nad pričakovanji, Google Cloud +82 %; EPS izkrivljen zaradi prevrednotenja deleža v Anthropicu, prosti denarni tok negativen, delnica -7 %':
    'above expectations, Google Cloud +82%; EPS distorted by the revaluation of the Anthropic stake, free cash flow negative, shares -7%',
  'zgrešil za skoraj 40 %; prihodki 28,24 mrd USD rekordni, a operativna marža 1,4 %, prosti denarni tok -1,1 mrd USD, delnica -14,5 %':
    'missed by almost 40%; record revenue of $28.24bn, but an operating margin of 1.4%, free cash flow -$1.1bn, shares -14.5%',
  'dvakratnik pričakovanj; prihodki 16,1 mrd USD (+25 %), podatkovni centri in AI +59 %':
    'double the expectations; revenue $16.1bn (+25%), data centres and AI +59%',
  'operativna marža 45 %, Azure +43 %, capex 35,8 mrd USD (41 mrd s finančnimi najemi), delnica +21,75 % tedensko':
    'operating margin 45%, Azure +43%, capex $35.8bn ($41bn including finance leases), shares +21.75% on the week',
  'rast stroškov +55 %, operativna marža 31 %, capex 31,1 mrd USD, delnica -6,5 % tedensko':
    'cost growth +55%, operating margin 31%, capex $31.1bn, shares -6.5% on the week',
  'operativna marža 32,6 %; pomanjkanje pomnilnika je postalo omejitveni dejavnik, delnica -7,24 % tedensko':
    'operating margin 32.6%; the memory shortage has become a limiting factor, shares -7.24% on the week',
  'operativni dobiček +43 %, AWS +37 %, prosti denarni tok -7,6 mrd USD (TTM), delnica +17 % tedensko':
    'operating income +43%, AWS +37%, free cash flow -$7.6bn (TTM), shares +17% on the week',
  'pod pričakovanji analitikov': 'below analysts’ expectations',
  'prihodki 1,94 mrd USD (+93 %), ameriški komercialni +149 %; čisti dobiček 1,07 mrd USD':
    'revenue $1.94bn (+93%), US commercial +149%; net income $1.07bn',
  'prvi rezultati po IPO; prihodki 7,81 mrd USD (+92 %), čista izguba zožena na 541 mio USD':
    'first results since the IPO; revenue $7.81bn (+92%), net loss narrowed to $541m',
  'fiskalni Q3; prihodki 25,25 mrd USD rahlo pod pričakovanji, segment doživetij +10 %':
    'fiscal Q3; revenue of $25.25bn slightly below expectations, Experiences segment +10%',
  'prihodki 3,61 mrd USD (pričakovano 3,58 mrd)': 'revenue $3.61bn (expected $3.58bn)',
  'prihodki 1,84 mrd USD nad pričakovanimi 1,81 mrd': 'revenue of $1.84bn above the expected $1.81bn',
  'prihodki 1,44 mrd USD (pričakovano 1,51 mrd), operativna izguba 68,2 mio USD':
    'revenue $1.44bn (expected $1.51bn), operating loss $68.2m',
  'fiskalni Q4; prilagojeni dobiček in prihodki nad pričakovanji ob dvignjeni napovedi, delnica +35 %':
    'fiscal Q4; adjusted earnings and revenue above expectations with raised guidance, shares +35%',
  'Seja ECB - obrestne mere': 'ECB meeting: interest rates',
  'Seja FOMC - obrestne mere': 'FOMC meeting: interest rates',
};

// Zapis števil: 1.234,5 -> 1,234.5 in "3,4 %" -> "3.4%". Datum "30. 9." in razmerje "9:3" ostaneta.
function stevilaEn(s: string): string {
  return s
    .replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1\u0000')
    .replace(/(\d),(?=\d)/g, '$1.')
    .replace(/\u0000/g, ',')
    .replace(/(\d) %/g, '$1%');
}

// Beseda kot cela beseda, tudi kadar vsebuje šumnike (\b jih v JavaScriptu ne pozna).
const beseda = (b: string) => new RegExp(`(?<![\\p{L}])${b}(?![\\p{L}])`, 'giu');
const STEVILO = '[+\\-−~]?\\d[\\d.,]*(?:-\\d[\\d.,]*)?';

// Besedišče predlog, ki jih piše robot (scripts/update-koledar-actuals.mjs in scripts/koledar/pricakovanja.mjs),
// in pogostih ročnih zapisov. Vrstni red je pomemben: daljši izrazi so pred krajšimi.
const VZORCI_EN: [RegExp, string | ((...m: string[]) => string)][] = [
  [/po reviziji BEA 30\. 9\./g, 'after the BEA revision of 30 Sep'],
  [beseda('letna stopnja rasti'), 'annualised growth rate'],
  [beseda('Fed obrestna mera'), 'Fed funds rate'],
  [beseda('depozitna mera'), 'deposit rate'],
  [beseda('presegel pričakovanja'), 'beat expectations'],
  [beseda('zaostal za pričakovanji'), 'missed expectations'],
  [beseda('pod pričakovanji'), 'below expectations'],
  [beseda('nad pričakovanji'), 'above expectations'],
  [beseda('pričakovano'), 'expected'],
  [beseda('prva objava'), 'first release'],
  [beseda('prva ocena'), 'first estimate'],
  [beseda('revizija'), 'revision'],
  [beseda('delovnih mest'), 'jobs'],
  [beseda('brezposelnost'), 'unemployment'],
  [beseda('anualizirano'), 'annualised'],
  [beseda('medletno'), 'y/y'],
  [beseda('letno'), 'y/y'],
  [beseda('mesečno'), 'm/m'],
  [beseda('jedrn[ai]'), 'core'],
  [beseda('skupni'), 'headline'],
  [beseda('indeks'), 'index'],
  [beseda('prilagojeno'), 'adjusted'],
  [beseda('prihodki'), 'revenue'],
  [beseda('izguba'), 'loss'],
  [beseda('fiskaln[oi]'), 'fiscal'],
  [beseda('ocena'), 'estimate'],
  [beseda('maloprodaja'), 'retail sales'],
  [beseda('predelovalne dejavnosti'), 'Manufacturing'],
  [beseda('zaposlovanje'), 'employment'],
  [beseda('junij'), 'June'],
  [beseda('julij'), 'July'],
  [new RegExp(`(?<![\\p{L}])(jan|feb|mar|apr|maj|jun|jul|avg|sep|okt|nov|dec)(?= \\d{4}|\\))`, 'giu'), (m) => MESECI_EN[m.toLowerCase()]],
  [new RegExp(`(\\d) do (?=[+\\-−]?\\d)`, 'g'), '$1 to '],
  // Zneski: "1,32 mrd USD" -> "$1.32bn", "541 mio USD" -> "$541m", "0,79 USD" -> "$0.79".
  [new RegExp(`(${STEVILO}) mrd USD`, 'g'), (_, n) => `${predznak(n)}bn`],
  [new RegExp(`(${STEVILO}) mio USD`, 'g'), (_, n) => `${predznak(n)}m`],
  [new RegExp(`(${STEVILO}) USD`, 'g'), (_, n) => predznak(n)],
];

// "-1,1" -> "-$1,1", "~0,53" -> "~$0,53": predznak ostane pred znakom za dolar.
function predznak(n: string): string {
  const m = n.match(/^([+\-−~]?)(.*)$/)!;
  return `${m[1]}$${m[2]}`;
}

function poVzorcih(besedilo: string): string {
  let s = besedilo;
  for (const [vzorec, zamenjava] of VZORCI_EN) s = s.replace(vzorec, zamenjava as never);
  s = stevilaEn(s);
  // Velika začetnica izvirnika ostane ("Skupni 3,7 %" -> "Headline 3.7%").
  return /^\p{Lu}/u.test(besedilo) ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Vrednost, opomba ali naslov dogodka v jeziku strani. Slovenščina je izvirnik in ostane nespremenjena.
export function prevediKoledar(besedilo: string, lang: Lang): string;
export function prevediKoledar(besedilo: string | undefined, lang: Lang): string | undefined;
export function prevediKoledar(besedilo: string | undefined, lang: Lang): string | undefined {
  if (!besedilo || lang === 'sl') return besedilo;
  return NATANCNO_EN[besedilo] ?? poVzorcih(besedilo);
}

// Za preizkus: ali je v besedilu po prevodu ostalo kaj slovenskega. Šumniki in nekaj pogostih besed
// so dovolj, da ujamemo neprevedene stavke; imena podjetij jih nimajo.
export function ostaloSlovensko(prevod: string): boolean {
  return /[čšžČŠŽ]/.test(prevod) || /(?<![\p{L}])(je|za|pri|nad|ni|bil[ao]?|skupaj|delnica|napoved|mrd|mio|USD)(?![\p{L}])/iu.test(prevod);
}
