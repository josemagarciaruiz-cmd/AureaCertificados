import { useEffect, useState } from 'react'
import { useCertPicker } from '@contexts/CertPickerContext'
import InlineUrlEdit from '@components/InlineUrlEdit'

interface CustomTramite {
  id: number
  name: string
  category: string
  subcategory: string
  portal_url: string
  description: string
}

export interface Block {
  id: string
  label: string
  color?: string
}

interface Props {
  category: 'aeat' | 'tgss'
  blocks: Block[]
}

const emptyForm = { name: '', description: '', portal_url: '', subcategory: '', customSubcategory: '' }
const NEW_CATEGORY = '__nueva__'

export default function CustomTramitesSection({ category, blocks }: Props) {
  const [tramites, setTramites] = useState<CustomTramite[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CustomTramite | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { openCertPicker } = useCertPicker()

  const load = () =>
    window.api.customTramites.getByCategory(category).then((data) => setTramites(data as CustomTramite[]))

  useEffect(() => { load() }, [category])

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowForm(true) }

  const openEdit = (t: CustomTramite) => {
    const isExistingBlock = blocks.some((b) => b.label === t.subcategory)
    setForm({
      name: t.name,
      description: t.description,
      portal_url: t.portal_url,
      subcategory: isExistingBlock ? t.subcategory : (t.subcategory ? NEW_CATEGORY : ''),
      customSubcategory: isExistingBlock ? '' : t.subcategory,
    })
    setEditing(t)
    setShowForm(true)
  }

  const cancel = () => { setShowForm(false); setEditing(null) }

  const getEffectiveSubcategory = () =>
    form.subcategory === NEW_CATEGORY ? form.customSubcategory.trim() : form.subcategory

  const isSaveDisabled =
    saving ||
    !form.name.trim() ||
    !form.portal_url.trim() ||
    (form.subcategory === NEW_CATEGORY && !form.customSubcategory.trim())

  const handleSave = async () => {
    if (isSaveDisabled) return
    setSaving(true)
    const subcategory = getEffectiveSubcategory()
    if (editing) {
      await window.api.customTramites.update(editing.id, {
        name: form.name, description: form.description,
        portal_url: form.portal_url, subcategory,
      })
    } else {
      await window.api.customTramites.create({
        category, name: form.name, description: form.description,
        portal_url: form.portal_url, subcategory,
      })
    }
    setSaving(false)
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este trámite personalizado?')) return
    await window.api.customTramites.delete(id)
    load()
  }

  const handleUrlSave = async (id: string, url: string) => {
    await window.api.customTramites.update(Number(id), { portal_url: url })
    load()
  }

  // Group by subcategory, preserving insertion order
  const grouped: { subcat: string; items: CustomTramite[] }[] = []
  const seen = new Map<string, CustomTramite[]>()
  for (const t of tramites) {
    const key = t.subcategory || ''
    if (!seen.has(key)) { seen.set(key, []); grouped.push({ subcat: key, items: seen.get(key)! }) }
    seen.get(key)!.push(t)
  }

  const getColor = (subcat: string) => {
    const block = blocks.find((b) => b.label === subcat)
    return block?.color || 'var(--color-accent)'
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            Trámites personalizados
          </div>
          {tramites.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-muted)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '1px 5px' }}>
              {tramites.length}
            </span>
          )}
        </div>
        {!showForm && (
          <button
            className="btn-secondary"
            style={{ fontSize: '10px', padding: '0.35rem 0.75rem' }}
            onClick={openAdd}
          >
            + Añadir trámite
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
          <div className="flex flex-wrap gap-3 mb-3">
            {/* Nombre */}
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Nombre *</label>
              <input
                className="field-input"
                placeholder="Nombre del trámite"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>

            {/* Categoría */}
            <div style={{ flex: '1 1 190px' }}>
              <label style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Categoría</label>
              <select
                className="field-select"
                value={form.subcategory}
                onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value, customSubcategory: '' }))}
              >
                <option value="">— Sin categoría —</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.label}>{b.label}</option>
                ))}
                <option value={NEW_CATEGORY}>+ Nueva categoría...</option>
              </select>
            </div>

            {/* Nueva categoría (condicional) */}
            {form.subcategory === NEW_CATEGORY && (
              <div style={{ flex: '1 1 190px' }}>
                <label style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Nombre de la categoría *</label>
                <input
                  className="field-input"
                  placeholder="Ej: DGT, Mutua, Registro..."
                  value={form.customSubcategory}
                  onChange={(e) => setForm((f) => ({ ...f, customSubcategory: e.target.value }))}
                />
              </div>
            )}

            {/* URL */}
            <div style={{ flex: '2 1 260px' }}>
              <label style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>URL *</label>
              <input
                className="field-input"
                placeholder="https://..."
                value={form.portal_url}
                onChange={(e) => setForm((f) => ({ ...f, portal_url: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancel() }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              />
            </div>

            {/* Descripción */}
            <div style={{ flex: '2 1 180px' }}>
              <label style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Descripción</label>
              <input
                className="field-input"
                placeholder="Descripción opcional"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancel() }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="btn-primary"
              style={{ fontSize: '11px' }}
              onClick={handleSave}
              disabled={isSaveDisabled}
            >
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Añadir trámite'}
            </button>
            <button className="btn-ghost" style={{ fontSize: '11px' }} onClick={cancel}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {tramites.length === 0 && !showForm && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '0.75rem 0' }}>
          No hay trámites personalizados. Pulsa «+ Añadir trámite» para crear uno.
        </div>
      )}

      {/* Table grouped by subcategory */}
      {tramites.length > 0 && (
        <div className="card p-0">
          <table className="table-aurea">
            <tbody>
              {grouped.map(({ subcat, items }) => (
                <>
                  {subcat && (
                    <tr key={`grp-${subcat}`}>
                      <td
                        colSpan={3}
                        style={{
                          paddingTop: '0.6rem',
                          paddingBottom: '0.3rem',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: getColor(subcat),
                          borderBottom: `1px solid ${getColor(subcat)}30`,
                        }}
                      >
                        {subcat}
                      </td>
                    </tr>
                  )}
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '13px', maxWidth: '220px' }}>
                        {t.name}
                        {!subcat && (
                          <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                            sin categoría
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '300px' }}>
                        {t.description || '—'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '11px' }}
                            onClick={() => window.api.app.openExternal(t.portal_url)}
                          >
                            Sede →
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '11px', color: 'var(--color-accent)' }}
                            onClick={() => openCertPicker(t.name, t.portal_url)}
                          >
                            Con cert. →
                          </button>
                          <InlineUrlEdit
                            id={String(t.id)}
                            defaultUrl={t.portal_url}
                            isOverridden={false}
                            onSave={handleUrlSave}
                            onReset={() => {}}
                          />
                          <button
                            title="Editar"
                            style={{ fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0 2px' }}
                            onClick={() => openEdit(t)}
                          >
                            ⋯
                          </button>
                          <button
                            title="Eliminar trámite"
                            style={{ fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '0 2px' }}
                            onClick={() => handleDelete(t.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
