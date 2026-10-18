import { useRef, useState } from 'react';
import { Card, Button, Input, Select, Field, Modal, SectionHeader } from '../ui.jsx';
import { fmtEur, exportJson, exportCsv, importJson, freshState, PALETTE, todayIso, uid } from '../store.js';
import { hasDemo } from '../demo.js';

function emptyCategory(type = 'expense') {
  return { id: '', name: '', type, color: PALETTE[0], archived: false };
}

export default function Settings({ state, dispatch }) {
  const fileRef = useRef(null);
  const [editingCat, setEditingCat] = useState(null);
  const [editingPayee, setEditingPayee] = useState(null);

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
    const name = editingPayee.name.trim().replace(/s+/g, ' ');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionHeader title="Nastavitve" subtitle="Kategorije, trgovine, podatki, izvoz / uvoz" />

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <strong style={{ fontSize: '1rem' }}>Podatki</strong>
            <div style={{ marginTop: 4, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 480 }}>
              Vsi podatki so shranjeni samo na tej napravi. Nič ne pošljemo na strežnik.
              Redno shrani varnostno kopijo (datoteka JSON), da podatkov ne izgubiš: ob brisanju podatkov brskalnika ali novem telefonu jo uvoziš nazaj.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={handleExport}>Shrani varnostno kopijo</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Uvozi varnostno kopijo</Button>
            <Button variant="secondary" onClick={() => { const napaka = exportCsv(state); if (napaka) alert(napaka); }}>Izvozi za Excel (CSV)</Button>
            <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} style={{ display: 'none' }} />
            {hasDemo(state)
              ? <Button variant="secondary" onClick={() => dispatch({ type: 'demo/remove' })}>Odstrani testne podatke</Button>
              : <Button variant="secondary" onClick={() => dispatch({ type: 'demo/load', today: todayIso() })}>Naloži testne podatke</Button>}
            <Button variant="danger" onClick={handleReset}>Ponastavi vse</Button>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <div>Računi: <strong style={{ color: 'var(--color-text)' }}>{state.accounts.length}</strong></div>
          <div>Kategorije: <strong style={{ color: 'var(--color-text)' }}>{state.categories.length}</strong></div>
          <div>Transakcije: <strong style={{ color: 'var(--color-text)' }}>{state.transactions.length}</strong></div>
          <div>Cilji: <strong style={{ color: 'var(--color-text)' }}>{state.goals.length}</strong></div>
          <div>Pravila: <strong style={{ color: 'var(--color-text)' }}>{state.recurring.length}</strong></div>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontSize: '1rem' }}>Kategorije prihodkov ({incomeCats.length})</strong>
          <Button size="sm" variant="secondary" onClick={() => setEditingCat(emptyCategory('income'))}>+ Dodaj</Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {incomeCats.map((c) => (
            <button key={c.id} onClick={() => setEditingCat(c)} style={{
              padding: '6px 12px', borderRadius: 999,
              background: `${c.color}22`, border: `1px solid ${c.color}55`, color: c.color,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600,
            }}>{c.name}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontSize: '1rem' }}>Kategorije odhodkov ({expenseCats.length})</strong>
          <Button size="sm" variant="secondary" onClick={() => setEditingCat(emptyCategory('expense'))}>+ Dodaj</Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {expenseCats.map((c) => (
            <button key={c.id} onClick={() => setEditingCat(c)} style={{
              padding: '6px 12px', borderRadius: 999,
              background: `${c.color}22`, border: `1px solid ${c.color}55`, color: c.color,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600,
            }}>{c.name}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: '1rem' }}>Trgovine in storitve ({payees.length})</strong>
          <div style={{ marginTop: 4, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Sledilnik si trgovino zapomni ob prvem vnosu, skupaj s kategorijo. Tu jo lahko preimenuješ, ji spremeniš kategorijo ali jo pozabiš.
          </div>
        </div>
        {payees.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-subtle)' }}>Še ni shranjenih trgovin. Pojavijo se, ko pri vnosu vpišeš, kje si kupil.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {payees.map((p) => {
              const cat = catById[p.categoryId];
              return (
                <button key={p.id} onClick={() => setEditingPayee(p)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 999,
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat?.color || '#64748b' }} />
                  {p.name}
                  <span style={{ color: 'var(--color-text-subtle)', fontWeight: 500 }}>{cat?.name || 'brez kategorije'} · {p.count}×</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {archived.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Arhivirane kategorije ({archived.length})
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {archived.map((c) => (
              <button key={c.id} onClick={() => dispatch({ type: 'category/update', category: { ...c, archived: false } })}
                style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)', fontSize: '0.8rem', cursor: 'pointer',
                }}>
                {c.name} (obnovi)
              </button>
            ))}
          </div>
        </details>
      )}

      <Modal open={!!editingPayee} onClose={() => setEditingPayee(null)} title="Trgovina ali storitev">
        {editingPayee && (
          <form onSubmit={savePayee} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Uporabljeno {editingPayee.count}×, zadnjič {fmtEur(editingPayee.lastAmount, true)}.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
              <Button type="button" variant="danger" onClick={() => removePayee(editingPayee.id)}>Pozabi</Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="button" variant="secondary" onClick={() => setEditingPayee(null)}>Prekliči</Button>
                <Button type="submit">Shrani</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!editingCat} onClose={() => setEditingCat(null)} title={editingCat?.id ? 'Uredi kategorijo' : 'Nova kategorija'}>
        {editingCat && (
          <form onSubmit={saveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PALETTE.map((c) => (
                  <button key={c} type="button" onClick={() => setEditingCat({ ...editingCat, color: c })}
                    style={{
                      width: 26, height: 26, borderRadius: 6, background: c,
                      border: editingCat.color === c ? '2px solid var(--color-text)' : '2px solid transparent',
                      cursor: 'pointer',
                    }} />
                ))}
              </div>
            </Field>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
              {editingCat.id ? (
                <Button type="button" variant="danger" onClick={() => removeCategory(editingCat.id)}>Izbriši</Button>
              ) : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
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
