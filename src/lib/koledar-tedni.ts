// Tedni v ekonomskem koledarju: kateremu tednu pripada dogodek in kako se teden izpiše v naslovu.
// Teden teče od ponedeljka do nedelje. Vse računamo s krajevnimi deli datuma (leto, mesec, dan),
// ker so datumi dogodkov v podatkih zapisani kot koledarski dnevi (2026-10-14) brez ure.
//
// Modul nima odvisnosti od brskalnika, da ga lahko preizkusi Node (scripts/koledar/tedni.test.mjs).

export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Ključ tedna je datum njegovega ponedeljka (2026-10-14 -> 2026-10-12). Do 6. 10. 2026 je šel skozi
// toISOString(), ki datum zapiše v UTC: krajevna polnoč v Ljubljani je v UTC še prejšnji dan, zato je
// bil ključ nedelja in naslov tedna "11. okt. – 17. okt." namesto "12. okt. – 18. okt.".
export function weekKey(dateStr: string): string {
  const d = parseDate(dateStr);
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateKey(mon);
}

// Naslov tedna v seznamu: "12. okt. – 18. okt." (sl-SI) ali "12 Oct – 18 Oct" (en-GB).
export function weekLabel(mondayStr: string, locale: string): string {
  const start = parseDate(mondayStr);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmtDay = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return `${fmtDay(start)} – ${fmtDay(end)}`;
}
