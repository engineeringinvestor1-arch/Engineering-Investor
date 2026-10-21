import { useRef, useState } from 'react';
import { Card, Button, Input, Select, Field, Modal, PageHeader, SectionHeader } from '../ui.jsx';
import { CatIcon } from '../ikone.jsx';
import { Swatches } from '../QuickAdd.jsx';
import { cistoIme, fmtEur, exportJson, exportCsv, importJson, freshState, PALETTE, todayIso, uid } from '../store.js';
import { hasDemo } from '../demo.js';
import { izbranaTema, nastaviTemo } from '../tema.js';

function emptyCategory(type = 'expense') {
  return { id: '', name: '', type, color: PALETTE[0], archived: false };
}

// Različica aplikacije: ob vsaki objavi enaka številki predpomnilnika v public/aplikacija/sw.js.
const RAZLICICA = '7 (21. 10. 2026)';

// Brskalnik, v katerem teče aplikacija. Samsung Internet in Edge se predstavita tudi kot Chrome, zato najprej.
function brskalnik() {
  const ua = navigator.userAgent;
  for (const [vzorec, ime] of [[/SamsungBrowser\/(\d+)/, 'Samsung Internet'], [/EdgA?\/(\d+)/, 'Edge'], [/Firefox\/(\d+)/, 'Firefox'], [/Chrome\/(\d+)/, 'Chrome']]) {
    const m = ua.match(vzorec);
    if (m) return `${ime} ${m[1]}`;
  }
  return 'neznan brskalnik';
}

export default function Settings({ state, dispatch }) {
  const fileRef = useRef(null);
  const [editingCat, setEditingCat] = useState(null);
  const [editingPayee, setEditingPayee] = useState(null);
  const [tema, setTema] = useState(() => izbranaTema());

  function izberiTemo(izbira) {
    nastaviTemo(izbira);
    setTema(izbira);
  }

  function handleExport() {
    exportJson(state);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importJson(file);
      if (!confirm('Uvoz prepiše vse trenutne podatke. Nadaljujem?')) return;
      dispatch({ type: 'state/replace', state: data });
    } catch (err) {
      alert('Napaka pri uvozu: ' + err.message);
    }
    e.target.value = '';
  }

  function handleReset() {
    if (!confirm('Izbrišem VSE podatke (transakcije, računi, kategorije...)? Tega ni mogoče razveljaviti.')) return;
    if (!confirm('Še enkrat: res želiš ponastaviti vse?')) return;
    dispatch({ type: 'state/replace', state: freshState() });
  }

  function saveCategory(e) {
    e.preventDefault();
    if (!editingCat.name) return;
    const cat = { ...editingCat, id: editingCat.id || uid() };
    if (editingCat.id) dispatch({ type: 'category/update', category: cat });
    else dispatch({ type: 'category/add', category: cat });
    setEditingCat(null);
  }

  function removeCategory(id) {
    const used = state.transactions.some((t) => t.categoryId === id);
    if (used) {
      if (!confirm('Kategorija ima transakcije. Arhiviram (transakcije ostanejo).')) return;
      const cat = state.categories.find((c) => c.id === id);
      dispatch({ type: 'category/update', category: { ...cat, archived: true } });
    } else {
      if (!confirm('Izbrišem kategorijo?')) return;
      dispatch({ type: 'category/remove', id });
    }
    setEditingCat(null);
  }

  function savePayee(e) {
    e.preventDefault();
    const name = cistoIme(editingPayee.name);
    if (!name) return;
    dispatch({ type: 'payee/update', payee: { ...editingPayee, name } });
    setEditingPayee(null);
  }

  function removePayee(id) {
    if (!confirm('Pozabim to trgovino? Transakcije ostanejo, samo med predlogi je ne bo več.')) return;
    dispatch({ type: 'payee/remove', id });
    setEditingPayee(null);
  }

  const payees = [...(state.payees ?? [])].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'sl'));
  const catById = Object.fromEntries(state.categories.map((c) => [c.id, c]));

  const incomeCats = state.categories.filter((c) => c.type === 'income' && !c.archived);
  const expenseCats = state.categories.filter((c) => c.type === 'expense' && !c.archived);
  const archived = state.categories.filter((c) => c.archived);

  const catChips = (list) => (
    <div className="sl-chiprow">
      {list.map((c) => (
        <button key={c.id} type="button" className="sl-chip" onClick={() => setEditingCat(c)}>
          <CatIcon category={c} size={24} />{c.name}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PageHeader title="Nastavitve" subtitle="Videz, kategorije, trgovine, varnostna kopija in izvoz" />

      {/* Tema (avtor, 19. 10. 2026): sistemska sledi nastavitvi telefona, tudi ko se ta zvečer sama preklopi. */}
      <Card>
        <SectionHeader title="Videz" subtitle={tema === 'system' ? 'Tema sledi nastavitvi telefona.' : 'Tema ostane taka, ne glede na nastavitev telefona.'} />
        <div className="sl-seg" role="group" aria-label="Tema" style={{ display: 'flex' }}>
          {[['light', 'Svetla'], ['dark', 'Temna'], ['system', 'Sistemska']].map(([id, ime]) => (
            <button key={id} type="button" aria-pressed={tema === id} onClick={() => izberiTemo(id)}>{ime}</button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Podatki" subtitle="Vsi podatki so shranjeni samo na tej napravi. Nič ne pošljemo na strežnik. Redno shrani varnostno kopijo (datoteka JSON): ob brisanju podatkov brskalnika ali na novem telefonu jo uvoziš nazaj." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
          <Button variant="primary" onClick={handleExport}>Shrani varnostno kopijo</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>Uvozi varnostno kopijo</Button>
          <Button variant="secondary" onClick={() => { const napaka = exportCsv(state); if (napaka) alert(napaka); }}>Izvozi za Excel (CSV)</Button>
          {hasDemo(state)
            ? <Button variant="secondary" onClick={() => dispatch({ type: 'demo/remove' })}>Odstrani testne podatke</Button>
            : <Button variant="secondary" onClick={() => dispatch({ type: 'demo/load', today: todayIso() })}>Naloži testne podatke</Button>}
          <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} style={{ display: 'none' }} />
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: '0.8rem', color: 'var(--sl-muted)' }}>
          {[['Računi', state.accounts.length], ['Kategorije', state.categories.length], ['Transakcije', state.transactions.length], ['Cilji', state.goals.length], ['Pravila', state.recurring.length]].map(([k, v]) => (
            <span key={k}>{k} <strong className="sl-num" style={{ color: 'var(--sl-ink)', fontWeight: 500 }}>{v}</strong></span>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title={`Kategorije odhodkov (${expenseCats.length})`} action={<Button size="sm" variant="secondary" onClick={() => setEditingCat(emptyCategory('expense'))}>Dodaj</Button>} />
        {catChips(expenseCats)}
      </Card>

      <Card>
        <SectionHeader title={`Kategorije prihodkov (${incomeCats.length})`} action={<Button size="sm" variant="secondary" onClick={() => setEditingCat(emptyCategory('income'))}>Dodaj</Button>} />
        {catChips(incomeCats)}
      </Card>

      <Card>
        <SectionHeader title={`Trgovine in storitve (${payees.length})`} subtitle="Sledilnik si trgovino zapomni ob prvem vnosu, skupaj s kategorijo. Tu jo lahko preimenuješ, ji spremeniš kategorijo ali jo pozabiš." />
        {payees.length === 0 ? (
          <div className="sl-subtle" style={{ fontSize: '0.85rem' }}>Še ni shranjenih trgovin. Pojavijo se, ko pri vnosu vpišeš, kje si kupil.</div>
        ) : (
          <div className="sl-chiprow">
            {payees.map((p) => {
              const cat = catById[p.categoryId];
              return (
                <button key={p.id} type="button" className="sl-chip sl-chip--plain" onClick={() => setEditingPayee(p)}>
                  <span className="sl-dot" style={{ background: cat?.color || 'var(--sl-subtle)' }} />
                  {p.name}
                  <span className="sl-subtle" style={{ fontWeight: 400 }}>{cat?.name || 'brez kategorije'} · {p.count}×</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {archived.length > 0 && (
        <details>
          <summary className="sl-label" style={{ cursor: 'pointer' }}>
            Arhivirane kategorije ({archived.length})
          </summary>
          <div className="sl-chiprow" style={{ marginTop: 10 }}>
            {archived.map((c) => (
              <button key={c.id} type="button" className="sl-chip sl-chip--plain" style={{ color: 'var(--sl-muted)' }}
                onClick={() => dispatch({ type: 'category/update', category: { ...c, archived: false } })}>
                {c.name} (obnovi)
              </button>
            ))}
          </div>
        </details>
      )}

      <Card>
        <SectionHeader title="Ponastavitev" subtitle="Izbriše vse podatke na tej napravi. Pred tem shrani varnostno kopijo." />
        <Button variant="danger" onClick={handleReset}>Ponastavi vse</Button>
      </Card>

      {/* Za iskanje napak na telefonu (19. 10. 2026): katera različica je naložena in v katerem brskalniku teče. */}
      <div className="sl-hint" style={{ textAlign: 'center', lineHeight: 1.7 }}>
        Različica {RAZLICICA} · {brskalnik()}<br />
        Telefon: {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'temni način' : 'svetli način'} · tema aplikacije: {document.documentElement.dataset.theme === 'dark' ? 'temna' : 'svetla'}
        {window.matchMedia('(display-mode: standalone)').matches ? ' · nameščena' : ' · v brskalniku'}
      </div>

      <Modal open={!!editingPayee} onClose={() => setEditingPayee(null)} title="Trgovina ali storitev">
        {editingPayee && (
          <form onSubmit={savePayee} className="sl-form">
            <Field label="Ime" hint="Sprememba imena velja za nove vnose; stare transakcije ohranijo zapisano ime.">
              <Input required value={editingPayee.name} autoFocus
                onChange={(e) => setEditingPayee({ ...editingPayee, name: e.target.value })} />
            </Field>
            <Field label="Kategorija">
              <Select value={editingPayee.categoryId || ''} onChange={(e) => setEditingPayee({ ...editingPayee, categoryId: e.target.value || null })}>
                <option value="">Brez</option>
                {state.categories.filter((c) => c.type === editingPayee.type && !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <div style={{ fontSize: '0.8rem', color: 'var(--sl-muted)' }}>
              Uporabljeno {editingPayee.count}×, zadnjič {fmtEur(editingPayee.lastAmount, true)}.
            </div>
            <div className="sl-form-actions">
              <Button type="button" variant="danger" onClick={() => removePayee(editingPayee.id)}>Pozabi</Button>
              <div>
                <Button type="button" variant="secondary" onClick={() => setEditingPayee(null)}>Prekliči</Button>
                <Button type="submit">Shrani</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!editingCat} onClose={() => setEditingCat(null)} title={editingCat?.id ? 'Uredi kategorijo' : 'Nova kategorija'}>
        {editingCat && (
          <form onSubmit={saveCategory} className="sl-form">
            <Field label="Ime">
              <Input required value={editingCat.name} autoFocus
                onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} />
            </Field>
            <Field label="Vrsta">
              <Select value={editingCat.type} onChange={(e) => setEditingCat({ ...editingCat, type: e.target.value })}>
                <option value="expense">Odhodek</option>
                <option value="income">Prihodek</option>
              </Select>
            </Field>
            <Field label="Barva">
              <Swatches value={editingCat.color} onChange={(color) => setEditingCat({ ...editingCat, color })} />
            </Field>
            <div className="sl-form-actions">
              {editingCat.id ? (
                <Button type="button" variant="danger" onClick={() => removeCategory(editingCat.id)}>Izbriši</Button>
              ) : <span />}
              <div>
                <Button type="button" variant="secondary" onClick={() => setEditingCat(null)}>Prekliči</Button>
                <Button type="submit">Shrani</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
