import { useEffect, useState } from 'react'

interface Client { id: number; name: string; nif_cif: string }

interface Props {
  model?: string
  modelName?: string
  category: 'aeat' | 'tgss' | 'other'
  portalUrl?: string
  onClose: () => void
  onSaved: () => void
}

export default function ProcedureForm({ model, modelName, category, portalUrl, onClose, onSaved }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState({
    client_id: '',
    name: modelName ? `Modelo ${model} — ${modelName}` : '',
    model_number: model ?? '',
    category,
    organism: category === 'aeat' ? 'AEAT' : category === 'tgss' ? 'TGSS' : '',
    description: '',
    status: 'pending',
    due_date: '',
    notes: '',
    portal_url: portalUrl ?? '',
    alert_days: '7',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.clients.getAll().then((data) => setClients(data as Client[]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_id || !form.name) { setError('Cliente y nombre son obligatorios'); return }
    setSaving(true)
    try {
      await window.api.procedures.create({ ...form, client_id: parseInt(form.client_id), alert_days: parseInt(form.alert_days) })
      onSaved()
    } catch {
      setError('Error al crear el trámite')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-xl p-0">
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="kicker mb-1">Nuevo trámite</div>
            <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
              {model ? `Modelo ${model}` : 'Nuevo trámite'}
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="badge badge-critical p-3 w-full justify-center">{error}</div>}

          <div>
            <label className="field-label">Cliente *</label>
            <select className="field-select" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
              <option value="">— Seleccionar cliente —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.nif_cif})</option>)}
            </select>
          </div>

          <div>
            <label className="field-label">Nombre del trámite *</label>
            <input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Fecha límite</label>
              <input className="field-input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Estado</label>
              <select className="field-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En curso</option>
                <option value="presented">Presentado</option>
                <option value="resolved">Resuelto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Alertar (días antes del vencimiento)</label>
            <input className="field-input" type="number" min="1" max="60" value={form.alert_days} onChange={(e) => setForm({ ...form, alert_days: e.target.value })} />
          </div>

          <div>
            <label className="field-label">Notas</label>
            <textarea className="field-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear trámite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
