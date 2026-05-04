import { useEffect, useState } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import ImportCertForm from './ImportCertForm'
import AuditLogPanel from './AuditLogPanel'
import ImportFromOsStoreModal from './ImportFromOsStoreModal'
import BatchPortalModal from './BatchPortalModal'

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
  serial_number: string
  source: string
}

export default function Certificates() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showOsStore, setShowOsStore] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired'>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())

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

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))
    )
  }

  const handleDelete = async (id: number, alias: string) => {
    if (!confirm(`¿Eliminar el certificado "${alias}"? Esta acción no se puede deshacer.`)) return
    await window.api.certificates.delete(id)
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next })
    load()
  }

  const getStatusBadge = (validTo: string) => {
    const days = getDaysLeft(validTo)
    if (days < 0) return <span className="badge badge-critical">Caducado</span>
    if (days <= 15) return <span className="badge badge-critical">{days}d</span>
    if (days <= 60) return <span className="badge badge-warning">{days}d</span>
    return <span className="badge badge-ok">{days}d</span>
  }

  const selectedCerts = certs.filter((c) => selected.has(c.id))

  return (
    <div style={{ paddingBottom: selected.size > 0 ? '5rem' : 0 }}>
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
          <button className="btn-secondary" onClick={() => setShowOsStore(true)}>
            Importar desde Windows
          </button>
          <button className="btn-primary" onClick={() => setShowImport(true)}>
            + Importar .p12 / .pfx
          </button>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
        Marca varios certificados con las casillas de la izquierda para acceder al mismo portal con todos ellos a la vez.
      </p>

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
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length }}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
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
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  {search ? 'Sin resultados' : 'No hay certificados. Importa el primero.'}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr
                key={c.id}
                style={{ background: selected.has(c.id) ? 'var(--color-accent-dim)' : undefined }}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
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

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-0 left-56 right-0 flex items-center justify-between px-8 py-3"
          style={{
            background: 'var(--color-bg-secondary)',
            borderTop: '1px solid var(--color-accent)',
            zIndex: 40,
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{selected.size}</span>
            {' '}certificado{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button className="btn-ghost" style={{ fontSize: '12px' }} onClick={() => setSelected(new Set())}>
              Deseleccionar
            </button>
            <button className="btn-primary" style={{ fontSize: '12px' }} onClick={() => setShowBatch(true)}>
              Acceder al portal con {selected.size} certificado{selected.size !== 1 ? 's' : ''} →
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <ImportCertForm
          onClose={() => setShowImport(false)}
          onImported={() => { load(); setShowImport(false) }}
        />
      )}
      {showOsStore && (
        <ImportFromOsStoreModal
          onClose={() => setShowOsStore(false)}
          onImported={() => { load(); setShowOsStore(false) }}
        />
      )}
      {showBatch && (
        <BatchPortalModal
          certs={selectedCerts}
          onClose={() => setShowBatch(false)}
        />
      )}
      {showAudit && <AuditLogPanel onClose={() => setShowAudit(false)} />}
    </div>
  )
}
