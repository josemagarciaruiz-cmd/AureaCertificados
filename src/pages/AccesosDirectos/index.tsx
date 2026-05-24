import { useEffect, useState } from 'react'

interface Shortcut {
  id: number
  name: string
  url: string
  certificate_id: number | null
  cert_alias: string | null
  cert_valid_to: string | null
  client_name: string | null
  client_nif: string | null
  use_count: number
  last_used: string | null
  color: string
  notes: string | null
}

interface Certificate {
  id: number
  alias: string
  client_name: string
  client_nif: string
  valid_to: string
}

const PALETTE = ['#d4a853', '#60a5fa', '#34d399', '#f472b6', '#fb923c', '#a78bfa', '#facc15', '#06b6d4']

function ShortcutFormModal({
  shortcut,
  certs,
  onSave,
  onClose,
}: {
  shortcut?: Shortcut | null
  certs: Certificate[]
  onSave: (data: { name: string; url: string; certificate_id: number | null; color: string; notes: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState(shortcut?.name ?? '')
  const [url, setUrl] = useState(shortcut?.url ?? '')
  const [certId, setCertId] = useState<string>(shortcut?.certificate_id ? String(shortcut.certificate_id) : '')
  const [color, setColor] = useState(shortcut?.color ?? '#d4a853')
  const [notes, setNotes] = useState(shortcut?.notes ?? '')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!url.trim()) { setError('La URL es obligatoria.'); return }
    let finalUrl = url.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }
    onSave({
      name: name.trim(),
      url: finalUrl,
      certificate_id: certId ? parseInt(certId) : null,
      color,
      notes: notes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="card w-full max-w-lg p-0">
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="kicker mb-1">Accesos directos</div>
            <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {shortcut ? 'Editar acceso' : 'Nuevo acceso directo'}
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div className="mb-4">
            <label className="field-label">Nombre *</label>
            <input
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: DEHU — José García"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="field-label">URL *</label>
            <input
              className="field-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://sede.agenciatributaria.gob.es/..."
              style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            />
          </div>

          <div className="mb-4">
            <label className="field-label">Certificado digital (opcional)</label>
            <select
              className="field-select"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
            >
              <option value="">— Sin certificado (abre en navegador) —</option>
              {certs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.alias}{c.client_name ? ` — ${c.client_name}` : ''}{c.client_nif ? ` (${c.client_nif})` : ''}
                </option>
              ))}
            </select>
            {certId && (
              <p style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                ⚡ Al pulsar se pedirá la contraseña maestra y se abrirá la web con este certificado cargado.
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="field-label">Color de la tarjeta</label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 0, background: c, border: 'none',
                    cursor: 'pointer', outline: color === c ? `2px solid white` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="field-label">Notas (opcional)</label>
            <input
              className="field-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descripción breve..."
            />
          </div>

          {error && (
            <p style={{ fontSize: '11px', color: 'var(--color-danger)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave}>
              {shortcut ? 'Guardar cambios' : 'Crear acceso →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LaunchModal({
  shortcut,
  onClose,
}: {
  shortcut: Shortcut
  onClose: () => void
}) {
  const [masterPassword, setMasterPassword] = useState('')
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleLaunch = async () => {
    if (!masterPassword.trim()) { setError('Introduce la contraseña maestra.'); return }
    setError('')
    setLaunching(true)
    try {
      await window.api.certificates.openPortalWithCert({
        certId: shortcut.certificate_id!,
        url: shortcut.url,
        masterPassword: masterPassword.trim(),
      })
      window.api.shortcuts.recordUse(shortcut.id)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="card w-full max-w-sm p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)', borderLeft: `3px solid ${shortcut.color}` }}>
          <div>
            <div className="kicker mb-0.5">Acceso directo</div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {shortcut.name}
            </h2>
            {shortcut.cert_alias && (
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Certificado: <span style={{ color: 'var(--color-accent)' }}>{shortcut.cert_alias}</span>
                {shortcut.client_name && <span> · {shortcut.client_name}</span>}
              </div>
            )}
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {done ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
              ✓ Ventana abierta con el certificado.
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '0.75rem', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                {shortcut.url}
              </div>
              <label className="field-label">Contraseña maestra</label>
              <input
                className="field-input"
                type="password"
                value={masterPassword}
                onChange={(e) => { setMasterPassword(e.target.value); setError('') }}
                placeholder="Contraseña maestra del despacho..."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleLaunch() }}
              />
              {error && (
                <p style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                  {error}
                </p>
              )}
            </>
          )}

          <div className="flex justify-end gap-2" style={{ marginTop: '1rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              {done ? 'Cerrar' : 'Cancelar'}
            </button>
            {!done && (
              <button className="btn-primary" onClick={handleLaunch} disabled={launching || !masterPassword.trim()}>
                {launching ? 'Abriendo...' : 'Abrir →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AccesosDirectos() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
  const [certs, setCerts] = useState<Certificate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Shortcut | null>(null)
  const [launching, setLaunching] = useState<Shortcut | null>(null)

  const load = async () => {
    const [sc, cs] = await Promise.all([
      window.api.shortcuts.getAll(),
      window.api.certificates.getAll(),
    ])
    setShortcuts(sc as Shortcut[])
    setCerts(cs as Certificate[])
  }

  useEffect(() => { load() }, [])

  const handleSave = async (data: { name: string; url: string; certificate_id: number | null; color: string; notes: string }) => {
    if (editing) {
      await window.api.shortcuts.update(editing.id, data)
    } else {
      await window.api.shortcuts.create(data)
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleDelete = async (sc: Shortcut) => {
    if (!confirm(`¿Eliminar el acceso directo "${sc.name}"?`)) return
    await window.api.shortcuts.delete(sc.id)
    load()
  }

  const handleClick = (sc: Shortcut) => {
    if (sc.certificate_id) {
      setLaunching(sc)
    } else {
      window.api.shortcuts.recordUse(sc.id)
      window.api.app.openExternal(sc.url)
      load() // refresh use_count
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Accesos directos</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {shortcuts.length === 0
              ? 'Crea accesos directos a las sedes electrónicas con el certificado ya cargado.'
              : `${shortcuts.length} acceso${shortcuts.length !== 1 ? 's' : ''} configurado${shortcuts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setEditing(null); setShowForm(true) }}
        >
          + Nuevo acceso
        </button>
      </div>

      {shortcuts.length === 0 ? (
        <div
          className="card flex flex-col items-center justify-center"
          style={{ padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed' }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Sin accesos directos todavía
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '400px', lineHeight: 1.6 }}>
            Crea un acceso directo para ir a cualquier sede electrónica con un certificado ya preseleccionado —
            sin tener que buscarlo cada vez.
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: '1.5rem' }}
            onClick={() => { setEditing(null); setShowForm(true) }}
          >
            Crear el primero →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {shortcuts.map((sc) => (
            <div
              key={sc.id}
              className="card p-0"
              style={{ borderTop: `3px solid ${sc.color}`, cursor: 'pointer', transition: 'border-color 0.2s' }}
            >
              <div style={{ padding: '0.9rem 0.9rem 0.6rem' }}>
                <div className="flex items-start justify-between gap-2">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                      {sc.name}
                    </div>
                    {sc.notes && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                        {sc.notes}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px',
                        fontFamily: 'var(--font-mono)', wordBreak: 'break-all', lineHeight: 1.3,
                      }}
                    >
                      {sc.url.replace(/^https?:\/\//, '').slice(0, 50)}{sc.url.length > 58 ? '…' : ''}
                    </div>
                    {sc.cert_alias ? (
                      <div style={{ fontSize: '10px', color: sc.color, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                        ⚡ {sc.cert_alias}
                        {sc.client_name && <span style={{ color: 'var(--color-text-muted)' }}> · {sc.client_name}</span>}
                      </div>
                    ) : (
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        Sin certificado — abre en navegador
                      </div>
                    )}
                    {sc.use_count > 0 && (
                      <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                        {sc.use_count} uso{sc.use_count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="flex gap-1"
                style={{ padding: '0 0.6rem 0.6rem', borderTop: `1px solid var(--color-border)`, marginTop: '0.4rem' }}
              >
                <button
                  className="btn-primary"
                  style={{ fontSize: '10px', flex: 1, justifyContent: 'center', padding: '0.45rem 0.5rem' }}
                  onClick={() => handleClick(sc)}
                >
                  Abrir →
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '10px', padding: '0.45rem 0.6rem' }}
                  title="Editar"
                  onClick={() => { setEditing(sc); setShowForm(true) }}
                >
                  ✎
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '10px', padding: '0.45rem 0.6rem', color: 'var(--color-danger)' }}
                  title="Eliminar"
                  onClick={() => handleDelete(sc)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* Add card */}
          <div
            className="card flex items-center justify-center"
            style={{
              minHeight: '120px', borderStyle: 'dashed', cursor: 'pointer',
              color: 'var(--color-text-muted)', fontSize: '13px',
            }}
            onClick={() => { setEditing(null); setShowForm(true) }}
          >
            + Añadir acceso
          </div>
        </div>
      )}

      {showForm && (
        <ShortcutFormModal
          shortcut={editing}
          certs={certs}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {launching && (
        <LaunchModal
          shortcut={launching}
          onClose={() => { setLaunching(null); load() }}
        />
      )}
    </div>
  )
}
