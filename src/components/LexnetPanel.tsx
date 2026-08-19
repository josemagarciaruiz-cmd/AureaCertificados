import { useEffect, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import CertPickerModal from '@components/CertPickerModal'
import { JUSTICIA_TRAMITES } from '@data/justicia-tramites'

interface AuditEntry {
  id: number
  certificate_alias: string
  client_name: string | null
  action: string
  url: string
  timestamp: string
}

const LEXNET_URL =
  JUSTICIA_TRAMITES.find((t) => t.id === 'lexnet')?.portal_url ?? 'https://lexnet.justicia.es/'

/** Judicial notifications are deemed served if not accessed within 3 days (art. 151.2 LEC). */
const LEGAL_GRACE_DAYS = 3

export default function LexnetPanel() {
  const [history, setHistory] = useState<AuditEntry[]>([])
  const [certPicker, setCertPicker] = useState(false)

  const load = () =>
    window.api.certificates.getAuditLog().then((data) => {
      const entries = (data as AuditEntry[]).filter((e) => e.url?.toLowerCase().includes('lexnet'))
      setHistory(entries.slice(0, 15))
    })

  useEffect(() => { load() }, [])

  const lastAccess = history[0]
  const daysSince = lastAccess ? differenceInCalendarDays(new Date(), parseISO(lastAccess.timestamp)) : null
  const overdue = daysSince !== null && daysSince > LEGAL_GRACE_DAYS

  return (
    <div>
      {/* Estado de consulta */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          borderLeft: `3px solid ${
            daysSince === null ? 'var(--color-text-muted)' : overdue ? 'var(--color-danger)' : 'var(--color-ok, #34d399)'
          }`,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div style={{ flex: '1 1 340px' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.25em',
                textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem',
              }}
            >
              Última consulta
            </div>

            {daysSince === null ? (
              <div className="font-serif font-bold text-lg" style={{ color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
                Sin consultas registradas
              </div>
            ) : (
              <div className="font-serif font-bold text-lg" style={{ color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
                {daysSince === 0 ? 'Hoy' : daysSince === 1 ? 'Ayer' : `Hace ${daysSince} días`}
                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                  · {lastAccess!.certificate_alias}
                </span>
              </div>
            )}

            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              La comunicación se entiende notificada el <strong>día hábil siguiente</strong> al envío del juzgado
              (si se envía después de las 15:00, cuenta como enviada a primera hora del siguiente día hábil).
              Transcurridos <strong>{LEGAL_GRACE_DAYS} días</strong> sin acceder, se tiene por efectuada aunque no
              se haya abierto (art. 151.2 LEC). Conviene revisar el buzón a diario.
            </p>

            {overdue && (
              <p style={{ fontSize: '11px', color: 'var(--color-danger)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
                ⚠ Han pasado más de {LEGAL_GRACE_DAYS} días desde la última consulta registrada.
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap" style={{ alignSelf: 'center' }}>
            <button className="btn-primary" style={{ fontSize: '11px' }} onClick={() => setCertPicker(true)}>
              Abrir LexNET con certificado →
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: '11px' }}
              onClick={() => window.api.app.openExternal(LEXNET_URL)}
            >
              Abrir sin certificado →
            </button>
          </div>
        </div>
      </div>

      {/* Aviso sobre certificado y Autofirma */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', background: 'var(--color-bg-secondary)' }}>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.6rem' }}>
          LexNET es el buzón del <strong>profesional colegiado</strong>, no del cliente: se accede con el certificado
          del graduado social, abogado o procurador, y desde ahí se ven las notificaciones de todos sus procedimientos.
          No basta con tener certificado — el <strong>Colegio debe haber dado de alta ese NIF en LexNET</strong> con su rol.
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.6rem' }}>
          Para <strong>firmar y presentar escritos</strong> hace falta tener <strong>Autofirma</strong> instalado en el
          equipo; ÁureaCert se lo cede al sistema operativo automáticamente cuando LexNET lo solicita.
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>
          El graduado social actúa solo en la <strong>jurisdicción social</strong>. La{' '}
          <strong>papeleta de conciliación</strong> (SMAC/CMAC) y la reclamación administrativa previa no se presentan
          por LexNET: van por la sede autonómica de trabajo.
        </p>
      </div>

      {/* Historial de accesos */}
      <div className="card p-0">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="kicker" style={{ fontSize: '9px' }}>Historial</div>
          <div className="font-serif font-bold" style={{ color: 'var(--color-text-primary)', fontSize: '15px' }}>
            Accesos a LexNET
          </div>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Todavía no se ha abierto LexNET desde ÁureaCert.
          </div>
        ) : (
          <table className="table-aurea">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Certificado</th>
                <th>Titular</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                    {format(parseISO(h.timestamp), "d MMM yyyy · HH:mm", { locale: es })}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {h.certificate_alias}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {h.client_name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {certPicker && (
        <CertPickerModal
          tramiteName="LexNET — Buzón judicial"
          portalUrl={LEXNET_URL}
          onClose={() => { setCertPicker(false); load() }}
        />
      )}
    </div>
  )
}
