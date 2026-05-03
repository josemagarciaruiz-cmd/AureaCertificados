import { useEffect, useState } from 'react'
import ClientForm from './ClientForm'

interface Client {
  id: number
  name: string
  nif_cif: string
  type: string
  email: string
  phone: string
  city: string
  cert_count: number
  procedure_count: number
}

const TYPE_LABELS: Record<string, string> = {
  autonomo: 'Autónomo',
  empresa: 'Empresa',
  particular: 'Particular',
  sociedad: 'Sociedad',
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

  const load = () => window.api.clients.getAll().then((data) => setClients(data as Client[]))

  useEffect(() => { load() }, [])

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.nif_cif.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este cliente? Sus certificados y trámites también se eliminarán.')) return
    await window.api.clients.delete(id)
    load()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Gestión</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {clients.length} clientes registrados
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
          + Nuevo cliente
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          className="field-input"
          style={{ maxWidth: '360px' }}
          placeholder="Buscar por nombre, NIF/CIF, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card p-0">
        <table className="table-aurea">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>NIF / CIF</th>
              <th>Tipo</th>
              <th>Email</th>
              <th>Ciudad</th>
              <th>Certs</th>
              <th>Trámites</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  {search ? 'Sin resultados' : 'No hay clientes. Crea el primero.'}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{c.name}</span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)' }}>
                    {c.nif_cif}
                  </span>
                </td>
                <td>
                  <span className="badge badge-accent">{TYPE_LABELS[c.type] ?? c.type}</span>
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{c.email || '—'}</td>
                <td style={{ fontSize: '12px' }}>{c.city || '—'}</td>
                <td>
                  <span className="badge badge-pending">{c.cert_count}</span>
                </td>
                <td>
                  <span className="badge badge-pending">{c.procedure_count}</span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn-ghost" style={{ fontSize: '11px' }} onClick={() => { setEditing(c); setShowForm(true) }}>
                      Editar
                    </button>
                    <button className="btn-ghost" style={{ fontSize: '11px', color: 'var(--color-danger)' }} onClick={() => handleDelete(c.id)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ClientForm
          client={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { load(); setShowForm(false) }}
        />
      )}
    </div>
  )
}
