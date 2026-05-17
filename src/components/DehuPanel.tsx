import { useEffect, useState } from 'react'
import CertPickerModal from '@components/CertPickerModal'

const DEHU_URL = 'https://dehu.redsara.es/'

interface Client {
  id: number
  name: string
  nif_cif: string
  type: string
  cert_count: number
}

export default function DehuPanel() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [certPicker, setCertPicker] = useState<Client | null>(null)
  const [globalPicker, setGlobalPicker] = useState(false)

  useEffect(() => {
    window.api.clients.getAll().then((data) => setClients(data as Client[]))
  }, [])

  const withCerts = clients.filter((c) => c.cert_count > 0)
  const noCertsCount = clients.length - withCerts.length

  const filtered = withCerts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.nif_cif.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Explanation card */}
      <div
        className="card"
        style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', background: 'var(--color-bg-secondary)' }}
      >
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          DEHU identifica al usuario por su certificado digital. Selecciona un cliente para abrir su bandeja de notificaciones directamente, autenticado con su propio certificado. Si tienes apoderamiento en el REA, abre DEHU con tu propio certificado de colaborador social.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-secondary"
            style={{ fontSize: '11px' }}
            onClick={() => setGlobalPicker(true)}
          >
            Abrir con mi certificado →
          </button>
          <button
            className="btn-ghost"
            style={{ fontSize: '11px' }}
            onClick={() => window.api.app.openExternal(DEHU_URL)}
          >
            Ir a DEHU sin certificado →
          </button>
        </div>
      </div>

      {/* Empty state — no clients at all */}
      {clients.length === 0 && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            No hay clientes registrados.
          </p>
        </div>
      )}

      {/* Empty state — clients but no certs */}
      {clients.length > 0 && withCerts.length === 0 && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Ningún cliente tiene certificados importados todavía.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Importa los certificados desde la sección <strong>Certificados</strong> para poder abrir DEHU con ellos.
          </p>
        </div>
      )}

      {/* Client list */}
      {withCerts.length > 0 && (
        <>
          {withCerts.length > 5 && (
            <input
              className="field-input"
              style={{ maxWidth: '320px', marginBottom: '1rem' }}
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}

          <div className="card p-0">
            <table className="table-aurea">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>NIF / CIF</th>
                  <th style={{ width: '60px' }}>Certs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {c.name}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)' }}>
                        {c.nif_cif}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-ok">{c.cert_count}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '11px' }}
                          onClick={() => window.api.app.openExternal(DEHU_URL)}
                          title="Abrir DEHU sin autenticación automática"
                        >
                          DEHU →
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '11px', color: 'var(--color-accent)' }}
                          onClick={() => setCertPicker(c)}
                          title="Abrir DEHU autenticado con el certificado de este cliente"
                        >
                          Con certificado →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {noCertsCount > 0 && (
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              {noCertsCount} cliente{noCertsCount !== 1 ? 's' : ''} sin certificados no aparece{noCertsCount !== 1 ? 'n' : ''} en esta lista.
            </p>
          )}
        </>
      )}

      {/* Cert picker — specific client */}
      {certPicker && (
        <CertPickerModal
          tramiteName={`DEHU — ${certPicker.name}`}
          portalUrl={DEHU_URL}
          filterClientId={certPicker.id}
          onClose={() => setCertPicker(null)}
        />
      )}

      {/* Cert picker — any cert (for user's own colaborador social cert) */}
      {globalPicker && (
        <CertPickerModal
          tramiteName="DEHU — Mi certificado"
          portalUrl={DEHU_URL}
          onClose={() => setGlobalPicker(false)}
        />
      )}
    </div>
  )
}
