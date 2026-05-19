import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { differenceInDays } from 'date-fns'

interface OsCert {
  Thumbprint: string
  Subject: string
  Issuer: string
  NotBefore: string
  NotAfter: string
  HasPrivateKey: boolean
  Exportable: boolean | string
}

interface Client {
  id: number
  name: string
  nif_cif: string
}

interface CertRow {
  thumbprint: string
  subject: string
  notAfter: string
  exportable: boolean | string
  selected: boolean
  alias: string
  clientId: string
  password: string
  status: 'pending' | 'importing' | 'ok' | 'error'
  error?: string
}

interface Props {
  onClose: () => void
  onImported: () => void
}

function extractCN(subject: string): string {
  const match = subject.match(/CN=([^,]+)/)
  return match ? match[1].trim() : subject
}

export default function ImportFromOsStoreModal({ onClose, onImported }: Props) {
  const [scanning, setScanning] = useState(true)
  const [rows, setRows] = useState<CertRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [masterPassword, setMasterPassword] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.certificates.scanOsStore(),
      window.api.clients.getAll(),
    ]).then(([certs, cls]) => {
      setClients(cls as Client[])
      setRows(
        (certs as OsCert[])
          .filter((c) => c.HasPrivateKey)
          .map((c) => ({
            thumbprint: c.Thumbprint,
            subject: c.Subject,
            notAfter: c.NotAfter,
            exportable: c.Exportable,
            selected: c.Exportable !== false,
            alias: extractCN(c.Subject),
            clientId: '',
            password: '',
            status: 'pending' as const,
          }))
      )
      setScanning(false)
    })
  }, [])

  const allSelected = rows.length > 0 && rows.filter(r => r.exportable !== false).every(r => r.selected)
  const someSelected = rows.some(r => r.selected) && !allSelected

  const toggle = (thumbprint: string) =>
    setRows((r) => r.map((row) => row.thumbprint === thumbprint ? { ...row, selected: !row.selected } : row))

  const toggleAll = () => {
    const next = !allSelected
    setRows((r) => r.map((row) => row.exportable !== false ? { ...row, selected: next } : row))
  }

  const updateRow = (thumbprint: string, field: 'alias' | 'clientId' | 'password', value: string) =>
    setRows((r) => r.map((row) => row.thumbprint === thumbprint ? { ...row, [field]: value } : row))

  const selectedRows = rows.filter((r) => r.selected)

  const handleImport = async () => {
    if (!masterPassword) return
    setImporting(true)

    for (const row of selectedRows) {
      setRows((r) => r.map((x) => x.thumbprint === row.thumbprint ? { ...x, status: 'importing' } : x))
      try {
        await window.api.certificates.importFromOsStore({
          thumbprint: row.thumbprint,
          alias: row.alias || extractCN(row.subject),
          clientId: row.clientId ? parseInt(row.clientId) : null,
          masterPassword,
          password: row.password || undefined,
        })
        setRows((r) => r.map((x) => x.thumbprint === row.thumbprint ? { ...x, status: 'ok' } : x))
      } catch (e) {
        setRows((r) => r.map((x) =>
          x.thumbprint === row.thumbprint
            ? { ...x, status: 'error', error: e instanceof Error ? e.message : 'Error al exportar' }
            : x
        ))
      }
    }

    setImporting(false)
    setDone(true)
    onImported()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-4xl p-0" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}>
          <div>
            <div className="kicker mb-1">Almacén de Windows</div>
            <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
              Importar desde el sistema
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {scanning ? (
            <div className="flex items-center justify-center p-12" style={{ color: 'var(--color-text-muted)' }}>
              Escaneando almacén de certificados...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center p-12" style={{ color: 'var(--color-text-muted)' }}>
              No se encontraron certificados con clave privada en el almacén de Windows.
            </div>
          ) : (
            <table className="table-aurea">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleAll}
                      disabled={importing}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Certificado</th>
                  <th>Caduca</th>
                  <th>Alias</th>
                  <th style={{ width: 150 }}>Contraseña exp.</th>
                  <th>Cliente</th>
                  <th style={{ width: 100 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const days = differenceInDays(new Date(row.notAfter), new Date())
                  return (
                    <tr key={row.thumbprint} style={{ opacity: row.selected ? 1 : 0.45 }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggle(row.thumbprint)}
                          disabled={importing}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {extractCN(row.subject)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                          {row.thumbprint.slice(0, 24)}...
                        </div>
                        {row.exportable === false && (
                          <span className="badge badge-warning" style={{ fontSize: '9px', marginTop: '2px' }}>
                            ⚠ No exportable
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          {format(new Date(row.notAfter), 'dd/MM/yyyy', { locale: es })}
                        </div>
                        {days < 0
                          ? <span className="badge badge-critical" style={{ fontSize: '9px' }}>Caducado</span>
                          : days <= 60
                          ? <span className="badge badge-warning" style={{ fontSize: '9px' }}>{days}d</span>
                          : <span className="badge badge-ok" style={{ fontSize: '9px' }}>{days}d</span>
                        }
                      </td>
                      <td>
                        <input
                          className="field-input"
                          style={{ fontSize: '12px', padding: '0.3rem 0.5rem' }}
                          value={row.alias}
                          onChange={(e) => updateRow(row.thumbprint, 'alias', e.target.value)}
                          disabled={!row.selected || importing}
                          placeholder="Alias..."
                        />
                      </td>
                      <td>
                        <input
                          className="field-input"
                          type="password"
                          style={{ fontSize: '12px', padding: '0.3rem 0.5rem', maxWidth: '140px' }}
                          value={row.password}
                          onChange={(e) => updateRow(row.thumbprint, 'password', e.target.value)}
                          disabled={!row.selected || importing || row.status === 'ok'}
                          placeholder="Opcional"
                        />
                      </td>
                      <td>
                        <select
                          className="field-select"
                          style={{ fontSize: '12px', padding: '0.3rem 0.5rem' }}
                          value={row.clientId}
                          onChange={(e) => updateRow(row.thumbprint, 'clientId', e.target.value)}
                          disabled={!row.selected || importing}
                        >
                          <option value="">— Sin cliente —</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.nif_cif})</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {row.status === 'importing' && (
                          <span style={{ fontSize: '11px', color: 'var(--color-accent)' }}>Importando...</span>
                        )}
                        {row.status === 'ok' && (
                          <span className="badge badge-ok" style={{ fontSize: '10px' }}>✓ Listo</span>
                        )}
                        {row.status === 'error' && (
                          <span className="badge badge-critical" style={{ fontSize: '10px' }} title={row.error}>
                            Error
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {!scanning && rows.length > 0 && (
          <div
            className="flex items-center justify-between gap-4 px-6 py-4 border-t"
            style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}
          >
            <div className="flex items-center gap-3" style={{ flex: 1 }}>
              <label className="field-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                Contraseña maestra *
              </label>
              <input
                className="field-input"
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Clave de cifrado del despacho"
                disabled={importing || done}
                style={{ maxWidth: '280px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Los certificados seleccionados se cifrarán y guardarán en el almacén seguro.
              </span>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={onClose} disabled={importing}>
                {done ? 'Cerrar' : 'Cancelar'}
              </button>
              {!done && (
                <button
                  className="btn-primary"
                  onClick={handleImport}
                  disabled={importing || selectedRows.length === 0 || !masterPassword}
                >
                  {importing
                    ? 'Importando...'
                    : `Importar ${selectedRows.length} certificado${selectedRows.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
