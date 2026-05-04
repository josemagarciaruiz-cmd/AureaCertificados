import { useState } from 'react'
import { AEAT_MODELS } from '@data/aeat-models'
import { TGSS_TRAMITES } from '@data/tgss-tramites'

interface Cert {
  id: number
  alias: string
  client_name: string
  serial_number: string
}

interface Props {
  certs: Cert[]
  onClose: () => void
}

interface TramiteOption {
  label: string
  sublabel: string
  url: string
  group: string
}

const ALL_TRAMITES: TramiteOption[] = [
  ...AEAT_MODELS.map((m) => ({
    label: `${m.model} — ${m.name}`,
    sublabel: m.periodicity,
    url: m.portal_url,
    group: 'AEAT',
  })),
  ...TGSS_TRAMITES.map((t) => ({
    label: t.name,
    sublabel: t.system,
    url: t.portal_url,
    group: t.block,
  })),
]

export default function BatchPortalModal({ certs, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [launching, setLaunching] = useState(false)
  const [done, setDone] = useState(false)

  const filtered = ALL_TRAMITES.filter((t) => {
    const q = search.toLowerCase()
    return t.label.toLowerCase().includes(q) || t.group.toLowerCase().includes(q) || t.sublabel.toLowerCase().includes(q)
  })

  const effectiveUrl = selectedUrl ?? (customUrl.trim() || null)

  const handleLaunch = async () => {
    if (!effectiveUrl) return
    setLaunching(true)
    await window.api.certificates.openBatchPortal({
      certs: certs.map((c) => ({ id: c.id, serialNumber: c.serial_number, alias: c.alias })),
      url: effectiveUrl,
    })
    setLaunching(false)
    setDone(true)
  }

  const handleSelect = (t: TramiteOption, i: number) => {
    const key = `${t.url}-${i}`
    if (selectedUrl === t.url && selectedLabel === t.label) {
      setSelectedUrl(null)
      setSelectedLabel('')
    } else {
      setSelectedUrl(t.url)
      setSelectedLabel(t.label)
      setCustomUrl('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-2xl p-0" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}>
          <div>
            <div className="kicker mb-1">Acceso múltiple con certificado</div>
            <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
              Selecciona el portal
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Certs summary */}
        <div style={{ padding: '0.875rem 1.5rem', flexShrink: 0, borderBottom: '1px solid var(--color-border)' }}>
          <div className="kicker mb-2" style={{ fontSize: '9px' }}>
            Se abrirá una ventana por cada certificado seleccionado
          </div>
          <div className="flex flex-wrap gap-2">
            {certs.map((c) => (
              <span key={c.id} className="badge badge-pending" style={{ fontSize: '11px' }}>
                {c.alias}{c.client_name ? ` · ${c.client_name}` : ''}
              </span>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0.875rem 1.5rem 0.5rem', flexShrink: 0 }}>
          <input
            className="field-input"
            placeholder="Buscar trámite de AEAT o Seguridad Social..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedUrl(null); setSelectedLabel('') }}
            autoFocus
          />
        </div>

        {/* Tramite list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 1rem 0.5rem' }}>
          {filtered.length === 0 && search && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem', fontSize: '13px' }}>
              Sin resultados para "{search}"
            </p>
          )}
          {filtered.map((t, i) => {
            const isSelected = selectedUrl === t.url && selectedLabel === t.label
            return (
              <button
                key={`${t.url}-${i}`}
                className="w-full flex items-center justify-between px-4 py-2 mb-1 border transition-all"
                style={{
                  background: isSelected ? 'var(--color-accent-dim)' : 'var(--color-bg-secondary)',
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                  textAlign: 'left',
                }}
                onClick={() => handleSelect(t, i)}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
                    <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', marginRight: '0.5rem' }}>{t.group}</span>
                    {t.sublabel}
                  </div>
                </div>
                {isSelected && (
                  <span style={{ fontSize: '12px', color: 'var(--color-accent)', flexShrink: 0, marginLeft: '0.75rem' }}>✓</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Custom URL */}
        <div style={{ padding: '0.75rem 1.5rem', flexShrink: 0, borderTop: '1px solid var(--color-border)' }}>
          <div className="kicker mb-1" style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>
            O introduce una URL directamente
          </div>
          <input
            className="field-input"
            placeholder="https://..."
            value={customUrl}
            onChange={(e) => { setCustomUrl(e.target.value); setSelectedUrl(null); setSelectedLabel('') }}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}>
          {done ? (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              ✓ {certs.length} ventana{certs.length !== 1 ? 's' : ''} abiertas. El certificado debería seleccionarse automáticamente si el portal lo solicita.
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {effectiveUrl
                ? `Portal: ${effectiveUrl.replace('https://', '').split('/')[0]}`
                : 'Selecciona un trámite o introduce una URL'}
            </p>
          )}
          <div className="flex gap-2" style={{ flexShrink: 0, marginLeft: '1rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              {done ? 'Cerrar' : 'Cancelar'}
            </button>
            {!done && (
              <button
                className="btn-primary"
                onClick={handleLaunch}
                disabled={!effectiveUrl || launching}
              >
                {launching ? 'Abriendo...' : `Abrir ${certs.length} ventana${certs.length !== 1 ? 's' : ''} →`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
