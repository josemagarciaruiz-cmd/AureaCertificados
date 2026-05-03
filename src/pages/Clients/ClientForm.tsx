import { useState } from 'react'

interface Client {
  id?: number
  name?: string
  nif_cif?: string
  type?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  notes?: string
}

interface Props {
  client: Client | null
  onClose: () => void
  onSaved: () => void
}

export default function ClientForm({ client, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: client?.name ?? '',
    nif_cif: client?.nif_cif ?? '',
    type: client?.type ?? 'autonomo',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    address: client?.address ?? '',
    city: client?.city ?? '',
    postal_code: client?.postal_code ?? '',
    notes: client?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.nif_cif.trim()) {
      setError('Nombre y NIF/CIF son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (client?.id) {
        await window.api.clients.update(client.id, form)
      } else {
        await window.api.clients.create(form)
      }
      onSaved()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('UNIQUE') ? 'Ya existe un cliente con ese NIF/CIF' : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-2xl p-0" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="kicker mb-1">{client?.id ? 'Editar' : 'Nuevo'}</div>
            <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
              {client?.id ? client.name : 'Nuevo cliente'}
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="badge badge-critical p-3 w-full justify-center" style={{ fontSize: '12px' }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nombre / Razón social *</label>
              <input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="field-label">NIF / CIF *</label>
              <input className="field-input" value={form.nif_cif} onChange={(e) => setForm({ ...form, nif_cif: e.target.value.toUpperCase() })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Tipo</label>
              <select className="field-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="autonomo">Autónomo</option>
                <option value="empresa">Empresa</option>
                <option value="sociedad">Sociedad</option>
                <option value="particular">Particular</option>
              </select>
            </div>
            <div>
              <label className="field-label">Email</label>
              <input className="field-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Teléfono</label>
              <input className="field-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Ciudad</label>
              <input className="field-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="field-label">Dirección</label>
              <input className="field-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Código postal</label>
              <input className="field-input" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="field-label">Notas internas</label>
            <textarea className="field-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : client?.id ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
