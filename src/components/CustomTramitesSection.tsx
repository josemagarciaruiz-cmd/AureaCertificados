import { useEffect, useState } from 'react'
import { useCertPicker } from '@contexts/CertPickerContext'
import InlineUrlEdit from '@components/InlineUrlEdit'

interface CustomTramite {
  id: number
  name: string
  category: string
  portal_url: string
  description: string
}

interface Props {
  category: 'aeat' | 'tgss'
}

const emptyForm = { name: '', description: '', portal_url: '' }

export default function CustomTramitesSection({ category }: Props) {
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
  const openEdit = (t: CustomTramite) => { setForm({ name: t.name, description: t.description, portal_url: t.portal_url }); setEditing(t); setShowForm(true) }
  const cancel = () => { setShowForm(false); setEditing(null) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.portal_url.trim()) return
    setSaving(true)
    if (editing) {
      await window.api.customTramites.update(editing.id, form)
    } else {
      await window.api.customTramites.create({ ...form, category })
    }
    setSaving(false)
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleDelete = async (id: number) => {
    await window.api.customTramites.delete(id)
    load()
  }

  const handleUrlSave = async (id: string, url: string) => {
    await window.api.customTramites.update(Number(id), { portal_url: url })
    load()
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div className="flex items-center justify-between mb-2">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
          Trámites personalizados
        </div>
        {!showForm && (
          <button className="btn-secondary" style={{ fontSize: '10px', padding: '0.35rem 0.75rem' }} onClick={openAdd}>
            + Añadir trámite
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
          <div className="flex flex-wrap gap-3 mb-3">
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
            <div style={{ flex: '2 1 300px' }}>
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
            <div style={{ flex: '2 1 200px' }}>
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
            <button className="btn-primary" style={{ fontSize: '11px' }} onClick={handleSave} disabled={saving || !form.name.trim() || !form.portal_url.trim()}>
              {editing ? 'Guardar cambios' : 'Añadir trámite'}
            </button>
            <button className="btn-ghost" style={{ fontSize: '11px' }} onClick={cancel}>Cancelar</button>
          </div>
        </div>
      )}

      {tramites.length === 0 && !showForm && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '0.75rem 0' }}>
          No hay trámites personalizados. Pulsa «+ Añadir trámite» para crear uno.
        </div>
      )}

      {tramites.length > 0 && (
        <div className="card p-0">
          <table className="table-aurea">
            <tbody>
              {tramites.map((t) => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '13px', maxWidth: '220px' }}>
                    {t.name}
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
                        title="Editar nombre/descripción"
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
