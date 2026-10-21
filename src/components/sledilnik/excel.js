/**
 * Izvoz v Excel kot prava datoteka .xlsx (avtor, 21. 10. 2026: "da lahko podatke exportaš tudi v excel pregledni
 * obliki"). Brez knjižnice: .xlsx je arhiv zip z nekaj datotekami XML. Arhiv je nestisnjen, kar Excel sprejme.
 *
 * Pregledno pomeni: krepka glava, ki ostane na vrhu, datumi kot datumi, zneski kot števila z dvema decimalkama
 * (negativni rdeči), širina stolpcev po vsebini, filter na listu z zastavico filter in vrstica Skupaj s formulo
 * na listu z zastavico skupaj. Liste pripravi excelSheets v store.js; stolpec z "(EUR)" v imenu je znesek.
 */

const enc = new TextEncoder();

// CRC-32, ki ga zip zahteva za vsako datoteko.
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bajti) {
  let c = 0xffffffff;
  for (const b of bajti) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Zaporedje števil po 2 ali 4 bajte (little endian), kot jih imajo glave zip.
function polja(...vrednosti) {
  const velikost = vrednosti.reduce((s, [b]) => s + b, 0);
  const v = new DataView(new ArrayBuffer(velikost));
  let o = 0;
  for (const [bajtov, x] of vrednosti) {
    if (bajtov === 4) v.setUint32(o, x, true); else v.setUint16(o, x, true);
    o += bajtov;
  }
  return new Uint8Array(v.buffer);
}

// Nestisnjen arhiv zip iz [{ ime, vsebina }]. Datum datotek je 1. 1. 1980 (najmanjši, ki ga zip pozna).
export function zip(datoteke) {
  const deli = [];
  const imenik = [];
  let odmik = 0;
  for (const { ime, vsebina } of datoteke) {
    const i = enc.encode(ime);
    const d = enc.encode(vsebina);
    const crc = crc32(d);
    // Zastavica 0x0800: imena v UTF-8. Način 0: brez stiskanja.
    const skupno = [[2, 20], [2, 0x0800], [2, 0], [2, 0], [2, 0x21], [4, crc], [4, d.length], [4, d.length], [2, i.length], [2, 0]];
    const lokalna = polja([4, 0x04034b50], ...skupno);
    deli.push(lokalna, i, d);
    imenik.push(polja([4, 0x02014b50], [2, 20], ...skupno, [2, 0], [2, 0], [2, 0], [4, 0], [4, odmik]), i);
    odmik += lokalna.length + i.length + d.length;
  }
  const velikostImenika = imenik.reduce((s, x) => s + x.length, 0);
  const konec = polja([4, 0x06054b50], [2, 0], [2, 0], [2, datoteke.length], [2, datoteke.length], [4, velikostImenika], [4, odmik], [2, 0]);
  const vse = [...deli, ...imenik, konec];
  const out = new Uint8Array(vse.reduce((s, x) => s + x.length, 0));
  let o = 0;
  for (const x of vse) { out.set(x, o); o += x.length; }
  return out;
}

/* ---------- preglednica ---------- */

const xml = (s) => String(s)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stolpec = (i) => (i >= 26 ? stolpec(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
// Excel šteje dneve od 30. 12. 1899.
const serijska = (iso) => (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86_400_000;

// Slogi celic (vrstni red v styles.xml): 0 navadno, 1 glava, 2 datum, 3 znesek, 4 krepko besedilo, 5 krepak znesek.
const S = { glava: 1, datum: 2, znesek: 3, krepko: 4, krepakZnesek: 5 };

const STILI = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00;[Red]-#,##0.00"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FFBFBFBF"/></top><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function celica(ref, vrednost, znesek, slog) {
  if (vrednost === '' || vrednost == null) return '';
  if (typeof vrednost === 'number') return `<c r="${ref}" s="${slog ?? (znesek ? S.znesek : 0)}"><v>${vrednost}</v></c>`;
  if (DATUM.test(vrednost)) return `<c r="${ref}" s="${S.datum}"><v>${serijska(vrednost)}</v></c>`;
  // Presledek na začetku ali koncu Excel sicer zavrže.
  const ohrani = /^\s|\s$/.test(vrednost) ? ' xml:space="preserve"' : '';
  return `<c r="${ref}"${slog ? ` s="${slog}"` : ''} t="inlineStr"><is><t${ohrani}>${xml(vrednost)}</t></is></c>`;
}

// Približna širina, kot jo vrednost zasede v celici (znesek s ločili tisočic in dvema decimalkama).
function sirina(vrednost, znesek) {
  if (vrednost === '' || vrednost == null) return 0;
  if (typeof vrednost === 'number') {
    const cela = String(Math.trunc(Math.abs(vrednost))).length;
    return znesek ? cela + Math.floor((cela - 1) / 3) + 4 : String(vrednost).length;
  }
  return DATUM.test(vrednost) ? 11 : String(vrednost).length;
}

function list({ rows, filter, skupaj }, prvi) {
  const glava = Object.keys(rows[0]);
  const zneski = glava.map((h) => h.includes('(EUR)'));
  const zadnji = rows.length + 1;
  const vrstice = [
    `<row r="1">${glava.map((h, i) => celica(`${stolpec(i)}1`, h, false, S.glava)).join('')}</row>`,
    ...rows.map((r, n) => `<row r="${n + 2}">${glava.map((h, i) => celica(`${stolpec(i)}${n + 2}`, r[h], zneski[i])).join('')}</row>`),
  ];
  if (skupaj) {
    const z = zadnji + 1;
    const vsota = (h) => Math.round(rows.reduce((s, r) => s + (Number(r[h]) || 0), 0) * 100) / 100;
    vrstice.push(`<row r="${z}">${glava.map((h, i) => {
      const ref = `${stolpec(i)}${z}`;
      if (i === 0) return celica(ref, 'Skupaj', false, S.krepko);
      return zneski[i] ? `<c r="${ref}" s="${S.krepakZnesek}"><f>SUM(${stolpec(i)}2:${stolpec(i)}${zadnji})</f><v>${vsota(h)}</v></c>` : '';
    }).join('')}</row>`);
  }
  const sirine = glava.map((h, i) => Math.min(50, Math.max(9, h.length + 3, ...rows.map((r) => sirina(r[h], zneski[i]) + 2))));
  const obseg = `A1:${stolpec(glava.length - 1)}${zadnji}`;
  return {
    obseg,
    xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"${prvi ? ' tabSelected="1"' : ''}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${sirine.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${vrstice.join('')}</sheetData>${filter ? `\n<autoFilter ref="${obseg}"/>` : ''}
</worksheet>`,
  };
}

// Listi [{ name, rows: [{ stolpec: vrednost }], filter?, skupaj? }] v bajte datoteke .xlsx.
export function xlsx(listi) {
  const izdelani = listi.map((l, i) => list(l, i === 0));
  const imena = (l) => l.name.replace(/'/g, "''");
  const filtri = listi
    .map((l, i) => (l.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xml(imena(l))}'!${izdelani[i].obseg.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>` : ''))
    .join('');
  const glava = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zip([
    { ime: '[Content_Types].xml', vsebina: `${glava}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${listi.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { ime: '_rels/.rels', vsebina: `${glava}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { ime: 'xl/workbook.xml', vsebina: `${glava}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${listi.map((l, i) => `<sheet name="${xml(l.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${filtri ? `<definedNames>${filtri}</definedNames>` : ''}<calcPr calcId="0" fullCalcOnLoad="1"/></workbook>` },
    { ime: 'xl/_rels/workbook.xml.rels', vsebina: `${glava}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${listi.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${listi.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { ime: 'xl/styles.xml', vsebina: STILI },
    ...izdelani.map((l, i) => ({ ime: `xl/worksheets/sheet${i + 1}.xml`, vsebina: l.xml })),
  ]);
}
