import { useEffect, useState } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import ImportCertForm from './ImportCertForm'
import AuditLogPanel from './AuditLogPanel'

interface Certificate {
  id: number
  alias: string
  client_name: string
  client_nif: string
  issuer: string
  subject: string
  valid_from: string
  valid_to: string
  fingerprint: string
  source: string
}

export default function Certificates() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired'>('all')

  const load = () => window.api.certificates.getAll().then((data) => setCerts(data as Certificate[]))
  useEffect(() => { load() }, [])

  const getDaysLeft = (validTo: string) => differenceInDays(parseISO(validTo), new Date())

  const filtered = certs.filter((c) => {
    const matchSearch =
      c.alias.toLowerCase().includes(search.toLowerCase()) ||
      c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.client_nif?.toLowerCase().includes(search.toLowerCase()) ||
      c.issuer?.toLowerCase().includes(search.toLowerCase())

    if (!matchSearch) return false
    if (filter === 'expiring') return getDaysLeft(c.valid_to) <= 60 && getDaysLeft(c.valid_to) >= 0
    if (filter === 'expired') return getDaysLeft(c.valid_to) < 0
    return true
  })

  const handleDelete = async (id: number, alias: string) => {
    if (!confirm(`¿Eliminar el certificado "${alias}"? Esta acción no se puede deshacer.`)) return
    await window.api.certificates.delete(id)
    load()
  }

  const getStatusBadge = (validTo: string) => {
    const days = getDaysLeft(validTo)
    if (days < 0) return <span className="badge badge-critical">Caducado</span>
    if (days <= 15) return <span className="badge badge-critical">{days}d</span>
    if (days <= 60) return <span className="badge badge-warning">{days}d</span>
    return <span className="badge badge-ok">{days}d</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Almacén seguro</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {certs.length} certificados · cifrados AES-256-GCM
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowAudit(true)}>
            Registro de uso
          </button>
          <button className="btn-primary" onClick={() => setShowImport(true)}>
            + Importar certificado
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-5">
        <input
          className="field-input"
          style={{ maxWidth: '320px' }}
          placeholder="Buscar por alias, cliente, NIF, emisor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {(['all', 'expiring', 'expired'] as const).map((f) => (
            <button
              key={f}
              className={filter === f ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem', fontSize: '10px' }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : f === 'expiring' ? 'Próx. caducidad' : 'Caducados'}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0">
        <table className="table-aurea">
          <thead>
            <tr>
              <th>Alias</th>
              <th>Cliente</th>
              <th>Emisor</th>
              <th>Válido desde</th>
              <th>Caduca</th>
              <th>Estado</th>
              <th>Origen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  {search ? 'Sin resultados' : 'No hay certificados. Importa el primero.'}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '13px' }}>{c.alias}</div>
                  {c.fingerprint && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      {c.fingerprint.slice(0, 29)}...
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ fontSize: '13px' }}>{c.client_name || '—'}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-accent)' }}>{c.client_nif}</div>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {c.issuer?.split(',')[0]?.replace('CN=', '') || '—'}
                </td>
                <td style={{ fontSize: '12px' }}>
                  {c.valid_from ? format(parseISO(c.valid_from), 'dd/MM/yyyy', { locale: es }) : '—'}
                </td>
                <td style={{ fontSize: '12px' }}>
                  {c.valid_to ? format(parseISO(c.valid_to), 'dd/MM/yyyy', { locale: es }) : '—'}
                </td>
                <td>{c.valid_to ? getStatusBadge(c.valid_to) : '—'}</td>
                <td>
                  <span className="badge badge-pending">{c.source}</span>
                </td>
                <td>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: '11px', color: 'var(--color-danger)' }}
                    onClick={() => handleDelete(c.id, c.alias)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && (
        <ImportCertForm
          onClose={() => setShowImport(false)}
          onImported={() => { load(); setShowImport(false) }}
        />
      )}
      {showAudit && <AuditLogPanel onClose={() => setShowAudit(false)} />}
    </div>
  )
}
