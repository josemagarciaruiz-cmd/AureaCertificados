import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface AuditEntry {
  id: number
  certificate_alias: string
  client_name: string
  action: string
  url: string
  user_name: string
  timestamp: string
}

const ACTION_LABELS: Record<string, string> = {
  import: 'Importación',
  delete: 'Eliminación',
  portal_access: 'Acceso portal',
  export: 'Exportación',
}

export default function AuditLogPanel({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<AuditEntry[]>([])

  useEffect(() => {
    window.api.certificates.getAuditLog().then((data) => setEntries(data as AuditEntry[]))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-4xl p-0" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="kicker mb-1">Trazabilidad</div>
            <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
              Registro de uso de certificados
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="table-aurea">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Certificado</th>
                <th>Cliente</th>
                <th>Acción</th>
                <th>URL / Detalle</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>Sin registros</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {format(parseISO(e.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{e.certificate_alias || '—'}</td>
                  <td style={{ fontSize: '12px' }}>{e.client_name || '—'}</td>
                  <td>
                    <span className={`badge ${e.action === 'delete' ? 'badge-critical' : e.action === 'portal_access' ? 'badge-ok' : 'badge-accent'}`}>
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {e.url ? <a href="#" onClick={() => window.api.app.openExternal(e.url)} style={{ color: 'var(--color-accent)' }}>{e.url.slice(0, 60)}{e.url.length > 60 ? '...' : ''}</a> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
