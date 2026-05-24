import { useState } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'

export interface CertForRenewal {
  id: number
  alias: string
  issuer: string
  subject: string
  valid_to: string
  client_name?: string
  client_nif?: string
}

// ─── Renewal detection ────────────────────────────────────────────────────────

type RenewalType = 'fnmt-pf' | 'fnmt-rep-admin' | 'fnmt-rep-juridica' | 'other'

interface RenewalInfo {
  type: RenewalType
  label: string
  renewalUrl: string
  notes: string
  requiresPresence: boolean
  canRenewOnline: boolean
}

function detectRenewal(issuer: string, subject: string): RenewalInfo {
  const iss = (issuer || '').toLowerCase()
  const sub = (subject || '').toLowerCase()

  const isFNMT =
    iss.includes('fnmt') ||
    iss.includes('fábrica nacional') ||
    iss.includes('fabrica nacional') ||
    iss.includes('fnmt-rcm')

  if (isFNMT) {
    // "AC FNMT Representacion" / "representac" in issuer → representante cert
    const isRep =
      iss.includes('representac') ||
      sub.includes('representac') ||
      // Representante certs have O= (org) in subject; PF certs do not
      /,\s*o=/i.test(subject)

    if (isRep) {
      // Distinguish admin único vs. other representation types by subject
      const isAdminUnico =
        sub.includes('admin') ||
        sub.includes('apoderado') ||
        sub.includes('administrador')

      if (isAdminUnico) {
        return {
          type: 'fnmt-rep-admin',
          label: 'FNMT — Representante / Administrador único o solidario',
          renewalUrl:
            'https://www.sede.fnmt.gob.es/certificados/certificado-de-representante/administrador-unico-o-solidario/renovar',
          notes:
            'Renovación online disponible si el cargo de administrador único o solidario sigue vigente en el Registro Mercantil. ' +
            'Si ha cambiado la representación, se requerirá presencia física ante un Notario u Oficina de Registro.',
          requiresPresence: false,
          canRenewOnline: true,
        }
      } else {
        return {
          type: 'fnmt-rep-juridica',
          label: 'FNMT — Representante de persona jurídica',
          renewalUrl:
            'https://www.sede.fnmt.gob.es/certificados/certificado-de-representante/persona-juridica/renovar',
          notes:
            'El proceso de renovación para otros tipos de representación puede requerir acreditación ante una Oficina de Registro o Notaría. ' +
            'Comprueba si tu representación está inscrita en el Registro para la renovación online.',
          requiresPresence: true,
          canRenewOnline: false,
        }
      }
    }

    // Persona física
    return {
      type: 'fnmt-pf',
      label: 'FNMT — Persona física',
      renewalUrl: 'https://www.sede.fnmt.gob.es/certificados/persona-fisica/renovar',
      notes:
        'Proceso 100% online. La FNMT identificará al titular automáticamente con el certificado vigente, ' +
        'enviará un código al correo registrado y el nuevo certificado estará disponible en minutos.',
      requiresPresence: false,
      canRenewOnline: true,
    }
  }

  // Other CA — generic
  const caMatch = issuer?.match(/CN=([^,]+)/)
  const caName = caMatch?.[1]?.trim() || 'la autoridad emisora'
  return {
    type: 'other',
    label: `Otro emisor — ${caName}`,
    renewalUrl: `https://www.google.com/search?q=renovar+certificado+digital+${encodeURIComponent(caName)}`,
    notes:
      `Este certificado no fue emitido por la FNMT. Consulta con ${caName} el proceso de renovación. ` +
      'Normalmente requiere acceder a su sede con el certificado vigente.',
    requiresPresence: true,
    canRenewOnline: false,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'info' | 'launch' | 'done'

interface Props {
  cert: CertForRenewal
  onClose: () => void
  onImport: () => void   // opens import form so user can import the new .p12
}

export default function RenewalModal({ cert, onClose, onImport }: Props) {
  const [step, setStep] = useState<Step>('info')
  const [masterPassword, setMasterPassword] = useState('')
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')

  const days = differenceInDays(parseISO(cert.valid_to), new Date())
  const expired = days < 0
  const urgent = days >= 0 && days <= 30
  const info = detectRenewal(cert.issuer, cert.subject)

  const expiryLabel = expired
    ? `Caducó el ${format(parseISO(cert.valid_to), "d 'de' MMMM 'de' yyyy", { locale: es })}`
    : `Caduca el ${format(parseISO(cert.valid_to), "d 'de' MMMM 'de' yyyy", { locale: es })} · ${days} día${days !== 1 ? 's' : ''}`

  const expiryColor = expired
    ? 'var(--color-danger)'
    : urgent
    ? '#fb923c'
    : '#facc15'

  const handleLaunchRenewal = async () => {
    if (!masterPassword.trim()) { setError('Introduce la contraseña maestra.'); return }
    setError('')
    setLaunching(true)
    try {
      await window.api.certificates.openPortalWithCert({
        certId: cert.id,
        url: info.renewalUrl,
        masterPassword: masterPassword.trim(),
      })
      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.82)' }}>
      <div className="card w-full max-w-lg p-0">

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'var(--color-border)', borderLeft: `3px solid ${expiryColor}` }}
        >
          <div>
            <div className="kicker mb-1">
              {expired ? 'Certificado caducado' : urgent ? 'Renovación urgente' : 'Renovación de certificado'}
            </div>
            <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {cert.alias}
            </h2>
            {cert.client_name && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {cert.client_name}{cert.client_nif && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', marginLeft: '0.5rem' }}>{cert.client_nif}</span>}
              </div>
            )}
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '1.5rem' }}>

          {/* Expiry status */}
          <div
            className="flex items-center gap-3 mb-4"
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-secondary)',
              border: `1px solid ${expiryColor}40`,
              fontSize: '13px',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{expired ? '🔴' : urgent ? '🟠' : '🟡'}</span>
            <span style={{ color: expiryColor, fontWeight: 600 }}>{expiryLabel}</span>
          </div>

          {/* Issuer info */}
          <div className="mb-4">
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tipo detectado
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
              {info.label}
            </div>
          </div>

          {/* Expired path */}
          {expired && (
            <div style={{
              padding: '1rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-danger)', marginBottom: '1rem', fontSize: '13px', lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 600, color: 'var(--color-danger)', marginBottom: '0.5rem' }}>
                ⚠ El certificado ya ha caducado — no es posible renovarlo online.
              </div>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Para obtener un nuevo certificado es necesario seguir el proceso de solicitud desde cero.
                {info.type === 'fnmt-pf' && ' Para persona física FNMT puedes hacerlo en la Sede de la FNMT o en la Sede Electrónica con un método alternativo de acreditación (vídeo-llamada o comparecencia).'}
              </p>
              <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '12px' }}
                  onClick={() => window.api.app.openExternal(
                    info.type === 'fnmt-pf'
                      ? 'https://www.sede.fnmt.gob.es/certificados/persona-fisica/obtener-certificado-software'
                      : 'https://www.sede.fnmt.gob.es/certificados/certificado-de-representante'
                  )}
                >
                  Solicitar certificado nuevo →
                </button>
                <button className="btn-primary" style={{ fontSize: '12px' }} onClick={onImport}>
                  Importar nuevo .p12 →
                </button>
              </div>
            </div>
          )}

          {/* Online renewal path */}
          {!expired && step === 'info' && (
            <>
              <div style={{
                padding: '0.85rem 1rem',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.7,
                marginBottom: '1.25rem',
              }}>
                {info.notes}
              </div>

              {info.canRenewOnline ? (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                    La aplicación abrirá la sede de la FNMT con este certificado ya cargado, de modo que la FNMT identificará
                    al titular automáticamente sin tener que buscarlo manualmente.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button
                      className="btn-primary"
                      onClick={() => setStep('launch')}
                    >
                      Iniciar renovación online →
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
                    Este tipo de certificado puede requerir presencia física o acreditación especial. Puedes iniciar el trámite
                    igualmente online para verificar si es posible en tu caso concreto.
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost" style={{ fontSize: '12px' }}
                      onClick={() => window.api.app.openExternal(info.renewalUrl || 'https://www.sede.fnmt.gob.es/')}>
                      Abrir en navegador externo →
                    </button>
                    <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                    <button className="btn-primary" onClick={() => setStep('launch')}>
                      Intentar renovar con cert. →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: password + launch */}
          {!expired && step === 'launch' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', marginBottom: '0.75rem' }}>
                  → {info.renewalUrl}
                </div>
                <label className="field-label">Contraseña maestra</label>
                <input
                  className="field-input"
                  type="password"
                  value={masterPassword}
                  onChange={(e) => { setMasterPassword(e.target.value); setError('') }}
                  placeholder="Contraseña maestra del despacho..."
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLaunchRenewal() }}
                />
                {error && (
                  <p style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                    {error}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setStep('info')}>← Atrás</button>
                <button
                  className="btn-primary"
                  onClick={handleLaunchRenewal}
                  disabled={launching || !masterPassword.trim()}
                >
                  {launching ? 'Abriendo sede FNMT...' : 'Abrir renovación →'}
                </button>
              </div>
            </>
          )}

          {/* Step 3: done — guidance to import new cert */}
          {step === 'done' && (
            <div>
              <div style={{
                padding: '1rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                marginBottom: '1.25rem', fontSize: '13px', lineHeight: 1.7,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                  ✓ Sede abierta con el certificado precargado.
                </div>
                <ol style={{ paddingLeft: '1.1rem', margin: 0, color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  <li style={{ marginBottom: '0.35rem' }}>Sigue los pasos en la ventana de la FNMT que acaba de abrirse.</li>
                  <li style={{ marginBottom: '0.35rem' }}>La FNMT enviará un código a tu correo electrónico registrado.</li>
                  <li style={{ marginBottom: '0.35rem' }}>Con el código, podrás descargar el nuevo certificado (.p12 o .pfx).</li>
                  <li>Una vez descargado, impórtalo en ÁureaCert para actualizar el almacén.</li>
                </ol>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                <button className="btn-primary" onClick={() => { onClose(); onImport() }}>
                  Importar nuevo certificado →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
