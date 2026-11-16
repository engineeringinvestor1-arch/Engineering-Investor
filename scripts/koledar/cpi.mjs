// Izid CPI za koledar.
//
// BLS medletno stopnjo računa iz indeksa pred sezonsko prilagoditvijo (FRED CPIAUCNS, CPILFENS), mesečno spremembo v
// naslovu sporočila pa iz sezonsko prilagojenega (CPIAUCSL, CPILFESL). Za oktober 2026 medletnih stopenj ni: oktobra
// 2025 BLS zaradi zaprtja zvezne vlade ni zbiral podatkov, FRED ima namesto medletne spremembe ".". Robot 10. 11. 2026
// zato izida ni vpisal; ko medletne stopnje ni, zdaj vpiše mesečno spremembo in to tudi pove.

const stevilo = (v) => v.toLocaleString('sl-SI', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const sPredznakom = (v) => {
  const zaokrozeno = Math.round(v * 10) / 10 || 0; // -0,04 je 0,0, ne -0,0
  return `${zaokrozeno >= 0 ? '+' : '-'}${stevilo(Math.abs(zaokrozeno))}`;
};
const koncno = (v) => typeof v === 'number' && Number.isFinite(v);

export function izidCpi({ medletno, jedrnaMedletno, mesecno, jedrnaMesecno } = {}) {
  if (koncno(medletno)) return `CPI ${stevilo(medletno)} % medletno${koncno(jedrnaMedletno) ? `; jedrna ${stevilo(jedrnaMedletno)} %` : ''}`;
  if (koncno(mesecno)) return `CPI ${sPredznakom(mesecno)} % mesečno${koncno(jedrnaMesecno) ? `; jedrna ${sPredznakom(jedrnaMesecno)} %` : ''}; medletne stopnje BLS ni objavil`;
  return null;
}
