import { useEffect, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'

interface Certificate {
  id: number
  client_id: number
  alias: string
  client_name: string
  client_nif: string
  serial_number: string
  valid_to: string
}

interface Props {
  tramiteName: string
  portalUrl: string
  filterClientId?: number
  onClose: () => void
}

export default function CertPickerModal({ tramiteName, portalUrl, filterClientId, onClose }: Props) {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [masterPassword, setMasterPassword] = useState('')
  const [launching, setLaunching] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    window.api.certificates.getAll().then((data) => setCerts(data as Certificate[]))
  }, [])

  const visibleCerts = filterClientId ? certs.filter((c) => c.client_id === filterClientId) : certs

  const filtered = visibleCerts.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.alias.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q) ||
      c.client_nif?.toLowerCase().includes(q)
    )
  })

  const getDaysLeft = (validTo: string) => differenceInDays(parseISO(validTo), new Date())

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const valid = filtered.filter((c) => getDaysLeft(c.valid_to) >= 0)
    setSelected((prev) =>
      prev.size === valid.length ? new Set() : new Set(valid.map((c) => c.id))
    )
  }

  const handleOpen = async () => {
    if (!masterPassword.trim()) {
      setError('Introduce la contraseña maestra.')
      return
    }
    if (selected.size === 0) {
      setError('Selecciona al menos un certificado.')
      return
    }
    setError('')
    setLaunching(true)
    setProgress(0)

    const certIds = [...selected]
    for (let i = 0; i < certIds.length; i++) {
      try {
        await window.api.certificates.openPortalWithCert({
          certId: certIds[i],
          url: portalUrl,
          masterPassword: masterPassword.trim(),
        })
        setProgress(i + 1)
        if (i < certIds.length - 1) {
          await new Promise((r) => setTimeout(r, 1500))
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        setLaunching(false)
        return
      }
    }

    setDone(true)
    setLaunching(false)
  }

  const validFiltered = filtered.filter((c) => getDaysLeft(c.valid_to) >= 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-xl p-0" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}>
          <div>
            <div className="kicker mb-1">Seleccionar certificados</div>
            <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {tramiteName}
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Search + password */}
        <div style={{ padding: '1rem 1.5rem 0.75rem', flexShrink: 0 }}>
          <input
            className="field-input"
            placeholder="Buscar por alias, cliente, NIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ marginBottom: '0.6rem' }}
          />
          <input
            className="field-input"
            type="password"
            placeholder="Contraseña maestra..."
            value={masterPassword}
            onChange={(e) => { setMasterPassword(e.target.value); setError('') }}
          />
          {error && (
            <p style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Select all row */}
        {validFiltered.length > 1 && (
          <div
            className="flex items-center gap-2 px-6 py-2 border-b"
            style={{ borderColor: 'var(--color-border)', flexShrink: 0, background: 'var(--color-bg-secondary)' }}
          >
            <input
              type="checkbox"
              checked={selected.size === validFiltered.length && validFiltered.length > 0}
              ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < validFiltered.length }}
              onChange={toggleAll}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Seleccionar todos ({validFiltered.length})
            </span>
          </div>
        )}

        {/* Cert list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0.75rem' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem', fontSize: '13px' }}>
              {certs.length === 0 ? 'No hay certificados importados.' : 'Sin resultados.'}
            </p>
          )}
          {filtered.map((c) => {
            const days = getDaysLeft(c.valid_to)
            const expired = days < 0
            const isSelected = selected.has(c.id)
            return (
              <button
                key={c.id}
                className="w-full flex items-center gap-3 px-4 py-3 mb-1 border transition-all"
                style={{
                  background: isSelected ? 'var(--color-accent-dim)' : 'var(--color-bg-secondary)',
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                  textAlign: 'left',
                  opacity: expired ? 0.5 : 1,
                  cursor: expired ? 'not-allowed' : 'pointer',
                }}
                onClick={() => !expired && toggle(c.id)}
                disabled={expired || launching}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => !expired && toggle(c.id)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={expired}
                  style={{ cursor: expired ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
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
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {expired ? (
                    <span className="badge badge-critical" style={{ fontSize: '9px' }}>Caducado</span>
                  ) : days <= 60 ? (
                    <span className="badge badge-warning" style={{ fontSize: '9px' }}>{days}d</span>
                  ) : (
                    <span className="badge badge-ok" style={{ fontSize: '9px' }}>{days}d</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}>
          {done ? (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              ✓ {progress} ventana{progress !== 1 ? 's' : ''} abiertas con el certificado seleccionado.
            </p>
          ) : launching ? (
            <p style={{ fontSize: '12px', color: 'var(--color-accent)' }}>
              Abriendo {progress}/{selected.size}...
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {selected.size > 0
                ? `${selected.size} certificado${selected.size !== 1 ? 's' : ''} seleccionado${selected.size !== 1 ? 's' : ''}`
                : 'Selecciona uno o varios certificados'}
            </p>
          )}
          <div className="flex gap-2" style={{ flexShrink: 0, marginLeft: '1rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              {done ? 'Cerrar' : 'Cancelar'}
            </button>
            {!done && (
              <button
                className="btn-primary"
                onClick={handleOpen}
                disabled={launching || selected.size === 0 || !masterPassword.trim()}
              >
                {launching
                  ? `Abriendo ${progress}/${selected.size}...`
                  : `Abrir ${selected.size > 0 ? selected.size : ''} ventana${selected.size !== 1 ? 's' : ''} →`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
