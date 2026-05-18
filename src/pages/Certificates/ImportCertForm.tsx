import { useEffect, useState } from 'react'

interface Client { id: number; name: string; nif_cif: string }

interface FileEntry {
  path: string
  name: string
  password: string
  status: 'pending' | 'importing' | 'done' | 'error'
  errorMsg?: string
}

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function ImportCertForm({ onClose, onImported }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [files, setFiles] = useState<FileEntry[]>([])
  const [clientId, setClientId] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    window.api.clients.getAll().then((data) => setClients(data as Client[]))
  }, [])

  const selectFiles = async () => {
    const result = await window.api.dialog.openFile({
      title: 'Seleccionar certificados digitales',
      filters: [{ name: 'Certificados', extensions: ['p12', 'pfx'] }],
      properties: ['openFile', 'multiSelections'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const newEntries: FileEntry[] = result.filePaths.map((p) => ({
        path: p,
        name: p.split(/[/\\]/).pop()?.replace(/\.(p12|pfx)$/i, '') ?? p,
        password: '',
        status: 'pending',
      }))
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => f.path))
        return [...prev, ...newEntries.filter((e) => !existing.has(e.path))]
      })
    }
  }

  const removeFile = (path: string) => {
    setFiles((prev) => prev.filter((f) => f.path !== path))
  }

  const updatePassword = (path: string, password: string) => {
    setFiles((prev) => prev.map((f) => f.path === path ? { ...f, password } : f))
  }

  const handleImport = async () => {
    if (files.length === 0) { setGlobalError('Selecciona al menos un archivo'); return }
    if (!masterPassword) { setGlobalError('La contraseña maestra es obligatoria'); return }
    const missingPwd = files.find((f) => f.status !== 'done' && !f.password)
    if (missingPwd) { setGlobalError(`Falta la contraseña para: ${missingPwd.name}`); return }

    setLoading(true)
    setGlobalError('')
    let anyError = false

    for (const file of files) {
      if (file.status === 'done') continue
      setFiles((prev) => prev.map((f) => f.path === file.path ? { ...f, status: 'importing' } : f))
      try {
        await window.api.certificates.import({
          filePath: file.path,
          password: file.password,
          alias: file.name,
          clientId: clientId ? parseInt(clientId) : null,
          masterPassword,
        })
        setFiles((prev) => prev.map((f) => f.path === file.path ? { ...f, status: 'done' } : f))
      } catch (err) {
        anyError = true
        setFiles((prev) => prev.map((f) => f.path === file.path ? {
          ...f,
          status: 'error',
          errorMsg: err instanceof Error ? err.message : 'Error al importar. Verifica la contraseña.',
        } : f))
      }
    }

    setLoading(false)
    if (!anyError) {
      onImported()
    } else {
      setDone(true)
    }
  }

  const importedCount = files.filter((f) => f.status === 'done').length
  const errorCount = files.filter((f) => f.status === 'error').length
  const pendingCount = files.filter((f) => f.status === 'pending' || f.status === 'importing').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-2xl p-0" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="kicker mb-1">Importación de certificados</div>
            <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
              Importar .p12 / .pfx
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>✕</button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {globalError && (
            <div className="badge badge-critical p-3 w-full justify-center" style={{ fontSize: '12px' }}>
              {globalError}
            </div>
          )}

          {done && (
            <div className="p-4 border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                Importación completada: <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{importedCount} correcto{importedCount !== 1 ? 's' : ''}</span>
                {errorCount > 0 && (
                  <span style={{ color: 'var(--color-danger)' }}> · {errorCount} con error (revisa la contraseña y vuelve a intentarlo)</span>
                )}
              </div>
            </div>
          )}

          {/* File list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="field-label" style={{ margin: 0 }}>
                Archivos{files.length > 0 ? ` (${files.length})` : ''}
              </label>
              <button
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '0.3rem 0.8rem' }}
                onClick={selectFiles}
                disabled={loading}
              >
                + Añadir archivos
              </button>
            </div>

            {files.length === 0 ? (
              <div
                className="border-2 border-dashed flex flex-col items-center justify-center py-10 cursor-pointer"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                  fontSize: '13px',
                  gap: '0.5rem',
                  borderRadius: '4px',
                }}
                onClick={selectFiles}
              >
                <div style={{ fontSize: '28px' }}>📁</div>
                <div>Haz clic para seleccionar certificados</div>
                <div style={{ fontSize: '11px' }}>Puedes seleccionar varios archivos a la vez</div>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((f) => (
                  <div
                    key={f.path}
                    className="flex items-center gap-3 p-3 border"
                    style={{
                      borderColor:
                        f.status === 'error' ? 'var(--color-danger)' :
                        f.status === 'done' ? 'var(--color-accent)' :
                        'var(--color-border)',
                      background: 'var(--color-bg-secondary)',
                      opacity: f.status === 'done' ? 0.65 : 1,
                    }}
                  >
                    <div style={{ fontSize: '18px', flexShrink: 0 }}>
                      {f.status === 'done' ? '✅' :
                       f.status === 'error' ? '❌' :
                       f.status === 'importing' ? '⏳' : '🔐'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </div>
                      {f.errorMsg && (
                        <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '2px' }}>{f.errorMsg}</div>
                      )}
                    </div>
                    <input
                      className="field-input"
                      type="password"
                      value={f.password}
                      onChange={(e) => updatePassword(f.path, e.target.value)}
                      placeholder="Contraseña del .p12"
                      disabled={loading || f.status === 'done'}
                      style={{ maxWidth: '190px', fontSize: '12px' }}
                    />
                    {!loading && f.status !== 'done' && (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: '11px', color: 'var(--color-danger)', flexShrink: 0 }}
                        onClick={() => removeFile(f.path)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Common settings — only shown once files are selected */}
          {files.length > 0 && (
            <>
              <div>
                <label className="field-label">Cliente (opcional)</label>
                <select
                  className="field-select"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">— Sin asignar —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.nif_cif})</option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                  Se aplicará a todos los certificados importados. Puedes asignarlo más tarde desde la ficha del cliente.
                </div>
              </div>

              <div>
                <label className="field-label">Contraseña maestra del despacho *</label>
                <input
                  className="field-input"
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Clave de cifrado de certificados"
                  disabled={loading}
                />
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                  Todos los certificados se cifrarán con esta clave maestra.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={loading && !done}>
            {done && errorCount === 0 ? 'Cerrar' : 'Cancelar'}
          </button>
          <div className="flex gap-2">
            {done && errorCount > 0 && pendingCount === 0 && (
              <button className="btn-primary" style={{ fontSize: '12px' }} onClick={() => { onImported(); }}>
                Aceptar y cerrar
              </button>
            )}
            {!done && (
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={loading || files.length === 0}
              >
                {loading
                  ? `Importando ${importedCount + 1} / ${files.length}...`
                  : files.length > 1
                    ? `Importar ${files.length} certificados`
                    : 'Importar certificado'}
              </button>
            )}
            {done && errorCount > 0 && (
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={loading}
              >
                Reintentar errores
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
