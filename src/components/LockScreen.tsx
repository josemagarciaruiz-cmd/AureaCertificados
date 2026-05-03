import { useEffect, useRef, useState } from 'react'

interface Props {
  onUnlock: () => void
}

export default function LockScreen({ onUnlock }: Props) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.settings.get('lock_password_hash').then((h) => {
      setHasPassword(!!h)
      setTimeout(() => inputRef.current?.focus(), 50)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    const ok = await window.api.settings.verifyLockPassword(password) as boolean
    if (ok) {
      onUnlock()
    } else {
      setError('Contraseña incorrecta')
      setPassword('')
      inputRef.current?.focus()
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'var(--color-bg-primary)', zIndex: 100 }}
    >
      <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
          FAMILIA ÁUREA
        </div>
        <h1 className="font-serif" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
          Áurea<span style={{ color: 'var(--color-accent)' }}>Cert</span>
        </h1>
        <div className="divider-gold-thin" style={{ width: '40px', margin: '1rem auto 2.5rem' }} />

        {hasPassword === null && (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Cargando...</p>
        )}

        {hasPassword === true && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Sesión bloqueada. Introduce tu contraseña para continuar.
            </p>
            <input
              ref={inputRef}
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Contraseña de acceso"
              style={{ textAlign: 'center' }}
              autoComplete="off"
            />
            {error && (
              <p style={{ fontSize: '12px', color: 'var(--color-danger, #ef4444)' }}>{error}</p>
            )}
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading || !password}>
              {loading ? 'Verificando...' : 'Desbloquear'}
            </button>
          </form>
        )}

        {hasPassword === false && (
          <div className="space-y-3">
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Sesión bloqueada.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              No hay contraseña configurada. Ve a Configuración → Seguridad para establecer una.
            </p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={onUnlock}>
              Desbloquear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
