import { useEffect, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'

interface Certificate {
  id: number
  alias: string
  client_name: string
  client_nif: string
  serial_number: string
  valid_to: string
}

interface Props {
  tramiteName: string
  portalUrl: string
  onClose: () => void
}

export default function CertPickerModal({ tramiteName, portalUrl, onClose }: Props) {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [search, setSearch] = useState('')
  const [launching, setLaunching] = useState<number | null>(null)

  useEffect(() => {
    window.api.certificates.getAll().then((data) => setCerts(data as Certificate[]))
  }, [])

  const filtered = certs.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.alias.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q) ||
      c.client_nif?.toLowerCase().includes(q)
    )
  })

  const handleOpen = async (cert: Certificate) => {
    setLaunching(cert.id)
    await window.api.certificates.openBatchPortal({
      certs: [{ id: cert.id, serialNumber: cert.serial_number, alias: cert.alias }],
      url: portalUrl,
    })
    onClose()
  }

  const getDaysLeft = (validTo: string) => differenceInDays(parseISO(validTo), new Date())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-xl p-0" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}>
          <div>
            <div className="kicker mb-1">Seleccionar certificado</div>
            <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {tramiteName}
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '1rem 1.5rem 0.75rem', flexShrink: 0 }}>
          <input
            className="field-input"
            placeholder="Buscar por alias, cliente, NIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 0.75rem 1rem' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem', fontSize: '13px' }}>
              {certs.length === 0 ? 'No hay certificados importados.' : 'Sin resultados.'}
            </p>
          )}
          {filtered.map((c) => {
            const days = getDaysLeft(c.valid_to)
            const expired = days < 0
            return (
              <button
                key={c.id}
                className="w-full flex items-center justify-between px-4 py-3 mb-1 border transition-all"
                style={{
                  background: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  textAlign: 'left',
                  opacity: expired ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!expired) e.currentTarget.style.borderColor = 'var(--color-accent)' }}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                onClick={() => !expired && handleOpen(c)}
                disabled={!!launching || expired}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {c.alias}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {c.client_name || '—'}
                    {c.client_nif && (
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', marginLeft: '0.5rem' }}>
                        {c.client_nif}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                  {expired ? (
                    <span className="badge badge-critical" style={{ fontSize: '9px' }}>Caducado</span>
                  ) : days <= 60 ? (
                    <span className="badge badge-warning" style={{ fontSize: '9px' }}>{days}d</span>
                  ) : (
                    <span className="badge badge-ok" style={{ fontSize: '9px' }}>{days}d</span>
                  )}
                  {launching === c.id && (
                    <div style={{ fontSize: '10px', color: 'var(--color-accent)', marginTop: '2px' }}>Abriendo...</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
