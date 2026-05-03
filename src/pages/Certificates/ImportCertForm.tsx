import { useEffect, useState } from 'react'

interface Client { id: number; name: string; nif_cif: string }

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function ImportCertForm({ onClose, onImported }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [filePath, setFilePath] = useState('')
  const [certPassword, setCertPassword] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [alias, setAlias] = useState('')
  const [clientId, setClientId] = useState('')
  const [certInfo, setCertInfo] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'file' | 'details'>('file')

  useEffect(() => {
    window.api.clients.getAll().then((data) => setClients(data as Client[]))
  }, [])

  const selectFile = async () => {
    const result = await window.api.dialog.openFile({
      title: 'Seleccionar certificado digital',
      filters: [{ name: 'Certificados', extensions: ['p12', 'pfx'] }],
      properties: ['openFile'],
    })
    if (!result.canceled && result.filePaths[0]) {
      setFilePath(result.filePaths[0])
      setError('')
    }
  }

  const parseFile = async () => {
    if (!filePath || !certPassword) { setError('Selecciona un archivo e introduce la contraseña'); return }
    setLoading(true)
    setError('')
    try {
      const info = await window.api.certificates.parseP12(filePath, certPassword) as Record<string, string>
      setCertInfo(info)
      if (!alias && info.subject) {
        const cn = info.subject.split(',').find((p: string) => p.includes('CN='))?.replace('CN=', '').trim()
        if (cn) setAlias(cn)
      }
      setStep('details')
    } catch {
      setError('No se pudo leer el certificado. Verifica la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alias || !clientId || !masterPassword) { setError('Completa todos los campos obligatorios'); return }
    setLoading(true)
    setError('')
    try {
      await window.api.certificates.import({
        filePath,
        password: certPassword,
        alias,
        clientId: parseInt(clientId),
        masterPassword,
      })
      onImported()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-xl p-0">
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="kicker mb-1">Paso {step === 'file' ? '1/2' : '2/2'}</div>
            <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
              Importar certificado
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="p-6">
          {error && (
            <div className="badge badge-critical mb-4 p-3 w-full justify-center" style={{ fontSize: '12px' }}>
              {error}
            </div>
          )}

          {step === 'file' && (
            <div className="space-y-4">
              <div>
                <label className="field-label">Archivo .p12 / .pfx</label>
                <div className="flex gap-2">
                  <input className="field-input flex-1" value={filePath} readOnly placeholder="Sin archivo seleccionado" />
                  <button className="btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={selectFile}>
                    Examinar
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label">Contraseña del certificado</label>
                <input
                  className="field-input"
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Contraseña de protección del .p12"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                <button className="btn-primary" onClick={parseFile} disabled={loading || !filePath}>
                  {loading ? 'Leyendo...' : 'Siguiente →'}
                </button>
              </div>
            </div>
          )}

          {step === 'details' && certInfo && (
            <form onSubmit={handleImport} className="space-y-4">
              <div className="p-4 border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                <div className="kicker mb-2" style={{ fontSize: '9px' }}>Información del certificado</div>
                <div className="space-y-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Sujeto:</span> {certInfo.subject || '—'}</div>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Emisor:</span> {certInfo.issuer?.split(',')[0]?.replace('CN=', '') || '—'}</div>
                  <div><span style={{ color: 'var(--color-accent)' }}>Caduca:</span> {certInfo.validTo ? new Date(certInfo.validTo).toLocaleDateString('es-ES') : '—'}</div>
                </div>
              </div>

              <div>
                <label className="field-label">Alias / Nombre identificativo *</label>
                <input className="field-input" value={alias} onChange={(e) => setAlias(e.target.value)} required />
              </div>

              <div>
                <label className="field-label">Cliente *</label>
                <select className="field-select" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                  <option value="">— Seleccionar cliente —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.nif_cif})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Contraseña maestra del despacho *</label>
                <input
                  className="field-input"
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Clave de cifrado de certificados"
                  required
                />
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                  El certificado se cifrará con esta clave. Necesaria para usarlo.
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button type="button" className="btn-ghost" onClick={() => setStep('file')}>
                  ← Atrás
                </button>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Importando...' : 'Importar certificado'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
