import { useEffect, useRef, useState } from 'react'

interface SettingsMap {
  despacho_name?: string
  despacho_nif?: string
  despacho_email?: string
  despacho_phone?: string
  despacho_address?: string
  smtp_host?: string
  smtp_port?: string
  smtp_user?: string
  smtp_from?: string
  cert_alert_days?: string
  lock_timeout_minutes?: string
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'despacho' | 'smtp' | 'security'>('despacho')

  const [cleaningCache, setCleaningCache] = useState(false)
  const [cleanCacheMsg, setCleanCacheMsg] = useState('')
  const [hasLockPassword, setHasLockPassword] = useState(false)
  const [lockPwdMode, setLockPwdMode] = useState<'idle' | 'set' | 'change' | 'remove'>('idle')
  const [lockPwdFields, setLockPwdFields] = useState({ current: '', new: '', confirm: '' })
  const [lockPwdError, setLockPwdError] = useState('')
  const [lockPwdOk, setLockPwdOk] = useState(false)
  const lockPwdRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.settings.getAll().then((data) => {
      const s = data as SettingsMap & { lock_password_hash?: string }
      setSettings(s)
      setHasLockPassword(!!s.lock_password_hash)
    })
  }, [])

  const set = (key: keyof SettingsMap, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        Object.entries(settings).map(([k, v]) =>
          window.api.settings.set(k, v ?? '')
        )
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleCleanCache = async () => {
    setCleaningCache(true)
    setCleanCacheMsg('')
    try {
      const result = await window.api.certificates.cleanOsStore() as { cleaned: number }
      setCleanCacheMsg(`✓ ${result.cleaned} certificado${result.cleaned !== 1 ? 's' : ''} eliminado${result.cleaned !== 1 ? 's' : ''} del almacén del sistema`)
    } catch {
      setCleanCacheMsg('Error al limpiar el almacén')
    } finally {
      setCleaningCache(false)
      setTimeout(() => setCleanCacheMsg(''), 6000)
    }
  }

  const resetLockPwd = () => {
    setLockPwdMode('idle')
    setLockPwdFields({ current: '', new: '', confirm: '' })
    setLockPwdError('')
    setLockPwdOk(false)
  }

  const handleSetLockPassword = async () => {
    const { current, new: np, confirm } = lockPwdFields
    if (lockPwdMode === 'change') {
      const ok = await window.api.settings.verifyLockPassword(current) as boolean
      if (!ok) { setLockPwdError('La contraseña actual es incorrecta'); return }
    }
    if (lockPwdMode === 'remove') {
      const ok = await window.api.settings.verifyLockPassword(current) as boolean
      if (!ok) { setLockPwdError('Contraseña incorrecta'); return }
      await window.api.settings.removeLockPassword()
      setHasLockPassword(false)
      resetLockPwd()
      return
    }
    if (np.length < 4) { setLockPwdError('La contraseña debe tener al menos 4 caracteres'); return }
    if (np !== confirm) { setLockPwdError('Las contraseñas no coinciden'); return }
    await window.api.settings.setLockPassword(np)
    setHasLockPassword(true)
    setLockPwdOk(true)
    setTimeout(() => resetLockPwd(), 2000)
  }

  const TABS = [
    { id: 'despacho' as const, label: 'Despacho' },
    { id: 'smtp' as const, label: 'Correo / SMTP' },
    { id: 'security' as const, label: 'Seguridad' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Preferencias</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Configuración general de la aplicación
          </p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>

      <div className="flex gap-1 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={activeTab === t.id ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.5rem 0.85rem', fontSize: '10px' }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'despacho' && (
        <div className="card p-6 space-y-5 max-w-2xl">
          <div>
            <div className="kicker mb-3" style={{ fontSize: '9px' }}>Datos del despacho</div>
            <div className="space-y-4">
              <div>
                <label className="field-label">Nombre del despacho</label>
                <input
                  className="field-input"
                  value={settings.despacho_name ?? ''}
                  onChange={(e) => set('despacho_name', e.target.value)}
                  placeholder="Asesoría García & Asociados"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">NIF / CIF</label>
                  <input
                    className="field-input"
                    value={settings.despacho_nif ?? ''}
                    onChange={(e) => set('despacho_nif', e.target.value)}
                    placeholder="B12345678"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div>
                  <label className="field-label">Teléfono</label>
                  <input
                    className="field-input"
                    value={settings.despacho_phone ?? ''}
                    onChange={(e) => set('despacho_phone', e.target.value)}
                    placeholder="+34 91 000 00 00"
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  className="field-input"
                  type="email"
                  value={settings.despacho_email ?? ''}
                  onChange={(e) => set('despacho_email', e.target.value)}
                  placeholder="contacto@asesoriaejemplo.es"
                />
              </div>
              <div>
                <label className="field-label">Dirección</label>
                <textarea
                  className="field-input"
                  rows={2}
                  value={settings.despacho_address ?? ''}
                  onChange={(e) => set('despacho_address', e.target.value)}
                  placeholder="Calle Mayor 1, 28001 Madrid"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'smtp' && (
        <div className="card p-6 space-y-5 max-w-2xl">
          <div>
            <div className="kicker mb-3" style={{ fontSize: '9px' }}>Servidor de correo saliente</div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.7 }}>
              Configura un servidor SMTP para que la aplicación pueda enviar alertas de vencimiento de trámites y certificados.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Servidor SMTP</label>
                  <input
                    className="field-input"
                    value={settings.smtp_host ?? ''}
                    onChange={(e) => set('smtp_host', e.target.value)}
                    placeholder="smtp.gmail.com"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div>
                  <label className="field-label">Puerto</label>
                  <input
                    className="field-input"
                    value={settings.smtp_port ?? ''}
                    onChange={(e) => set('smtp_port', e.target.value)}
                    placeholder="587"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Usuario SMTP</label>
                <input
                  className="field-input"
                  value={settings.smtp_user ?? ''}
                  onChange={(e) => set('smtp_user', e.target.value)}
                  placeholder="usuario@gmail.com"
                />
              </div>
              <div>
                <label className="field-label">Dirección remitente (From)</label>
                <input
                  className="field-input"
                  value={settings.smtp_from ?? ''}
                  onChange={(e) => set('smtp_from', e.target.value)}
                  placeholder="Áurea Cert <alertas@despacho.es>"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4 max-w-2xl">
          <div className="card p-6 space-y-4">
            <div className="kicker mb-1" style={{ fontSize: '9px' }}>Alertas de vencimiento</div>
            <div>
              <label className="field-label">Días de antelación para alertar (certificados y trámites)</label>
              <input
                className="field-input"
                type="number"
                min="1"
                max="90"
                value={settings.cert_alert_days ?? '30'}
                onChange={(e) => set('cert_alert_days', e.target.value)}
                style={{ width: '120px' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                Se usará como valor por defecto al crear nuevos trámites
              </p>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <div className="kicker mb-1" style={{ fontSize: '9px' }}>Bloqueo de sesión</div>

            <div>
              <label className="field-label">Tiempo de inactividad antes de bloquear</label>
              <select
                className="field-select"
                style={{ width: '200px' }}
                value={settings.lock_timeout_minutes ?? '0'}
                onChange={(e) => set('lock_timeout_minutes', e.target.value)}
              >
                <option value="0">Nunca</option>
                <option value="5">5 minutos</option>
                <option value="10">10 minutos</option>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
              </select>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="field-label" style={{ margin: 0 }}>Contraseña de bloqueo</label>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    {hasLockPassword ? '✓ Contraseña configurada' : 'Sin contraseña — cualquiera puede desbloquear'}
                  </p>
                </div>
                {lockPwdMode === 'idle' && (
                  <div className="flex gap-2">
                    {hasLockPassword ? (
                      <>
                        <button className="btn-secondary" style={{ fontSize: '11px' }} onClick={() => { setLockPwdMode('change'); setTimeout(() => lockPwdRef.current?.focus(), 50) }}>
                          Cambiar
                        </button>
                        <button className="btn-ghost" style={{ fontSize: '11px', color: 'var(--color-danger, #ef4444)' }} onClick={() => { setLockPwdMode('remove'); setTimeout(() => lockPwdRef.current?.focus(), 50) }}>
                          Eliminar
                        </button>
                      </>
                    ) : (
                      <button className="btn-secondary" style={{ fontSize: '11px' }} onClick={() => { setLockPwdMode('set'); setTimeout(() => lockPwdRef.current?.focus(), 50) }}>
                        Establecer contraseña
                      </button>
                    )}
                  </div>
                )}
              </div>

              {lockPwdMode !== 'idle' && (
                <div className="space-y-3" style={{ background: 'var(--color-bg-secondary)', padding: '1rem', marginTop: '0.5rem' }}>
                  {lockPwdOk && (
                    <p style={{ fontSize: '12px', color: 'var(--color-success, #34d399)' }}>
                      ✓ {lockPwdMode === 'remove' ? 'Contraseña eliminada' : 'Contraseña guardada'}
                    </p>
                  )}
                  {(lockPwdMode === 'change' || lockPwdMode === 'remove') && (
                    <div>
                      <label className="field-label">Contraseña actual</label>
                      <input
                        ref={lockPwdRef}
                        className="field-input"
                        type="password"
                        value={lockPwdFields.current}
                        onChange={(e) => { setLockPwdFields((f) => ({ ...f, current: e.target.value })); setLockPwdError('') }}
                        placeholder="Contraseña actual"
                        autoComplete="off"
                      />
                    </div>
                  )}
                  {(lockPwdMode === 'set' || lockPwdMode === 'change') && (
                    <>
                      <div>
                        <label className="field-label">Nueva contraseña</label>
                        <input
                          ref={lockPwdMode === 'set' ? lockPwdRef : undefined}
                          className="field-input"
                          type="password"
                          value={lockPwdFields.new}
                          onChange={(e) => { setLockPwdFields((f) => ({ ...f, new: e.target.value })); setLockPwdError('') }}
                          placeholder="Mínimo 4 caracteres"
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <label className="field-label">Confirmar contraseña</label>
                        <input
                          className="field-input"
                          type="password"
                          value={lockPwdFields.confirm}
                          onChange={(e) => { setLockPwdFields((f) => ({ ...f, confirm: e.target.value })); setLockPwdError('') }}
                          placeholder="Repite la contraseña"
                          autoComplete="new-password"
                        />
                      </div>
                    </>
                  )}
                  {lockPwdError && (
                    <p style={{ fontSize: '12px', color: 'var(--color-danger, #ef4444)' }}>{lockPwdError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button className="btn-ghost" style={{ fontSize: '11px' }} onClick={resetLockPwd}>Cancelar</button>
                    <button
                      className={lockPwdMode === 'remove' ? 'btn-ghost' : 'btn-primary'}
                      style={{ fontSize: '11px', ...(lockPwdMode === 'remove' ? { color: 'var(--color-danger, #ef4444)' } : {}) }}
                      onClick={handleSetLockPassword}
                    >
                      {lockPwdMode === 'set' ? 'Guardar contraseña' : lockPwdMode === 'change' ? 'Cambiar contraseña' : 'Confirmar eliminación'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="kicker mb-2" style={{ fontSize: '9px' }}>Almacén del sistema operativo</div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.8, marginBottom: '1rem' }}>
              Al abrir trámites, la app instala el certificado temporalmente en el almacén del sistema (Windows/macOS) y lo elimina al cerrar la ventana.
              Si un trámite se interrumpe o la app se cierra inesperadamente, pueden quedar certificados residuales que interfieran en el siguiente acceso.
              Usa este botón si un acceso directo sigue usando un certificado antiguo o ya eliminado.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                className="btn-secondary"
                style={{ fontSize: '11px' }}
                disabled={cleaningCache}
                onClick={handleCleanCache}
              >
                {cleaningCache ? 'Limpiando...' : '🧹 Limpiar caché de certificados del sistema'}
              </button>
              {cleanCacheMsg && (
                <span style={{
                  fontSize: '11px',
                  color: cleanCacheMsg.startsWith('✓') ? 'var(--color-success, #34d399)' : 'var(--color-danger, #ef4444)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {cleanCacheMsg}
                </span>
              )}
            </div>
          </div>

          <div className="card p-6" style={{ borderColor: 'var(--color-accent)', borderLeft: '2px solid var(--color-accent)' }}>
            <div className="kicker mb-2" style={{ fontSize: '9px' }}>Seguridad de certificados</div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
              Los certificados digitales se cifran con <strong>AES-256-GCM</strong> usando una clave derivada de tu contraseña maestra mediante PBKDF2.<br />
              La contraseña maestra <strong>nunca se almacena</strong> — se solicita cada vez que se accede a un certificado.<br />
              Los datos cifrados se guardan en <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontSize: '11px' }}>aurea.db</span> dentro del directorio de usuario de la aplicación.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
