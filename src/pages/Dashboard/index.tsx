import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AEAT_MODELS } from '@data/aeat-models'
import { TGSS_TRAMITES } from '@data/tgss-tramites'
import CertPickerModal from '@components/CertPickerModal'

interface UpcomingDeadline {
  id: number
  name: string
  model_number: string
  due_date: string
  category: string
}

interface ExpiringCert {
  id: number
  alias: string
  client_name: string
  valid_to: string
}

interface QuickAccess {
  label: string
  sublabel: string
  color: string
  portalUrl: string
}

const aeat = (model: string): QuickAccess | null => {
  const m = AEAT_MODELS.find((x) => x.model === model)
  if (!m) return null
  return { label: `Modelo ${m.model}`, sublabel: m.name, color: '#c9a84c', portalUrl: m.portal_url }
}

const tgss = (id: string): QuickAccess | null => {
  const t = TGSS_TRAMITES.find((x) => x.id === id)
  if (!t) return null
  return { label: t.name, sublabel: t.system, color: '#60a5fa', portalUrl: t.portal_url }
}

const QUICK_ACCESS: QuickAccess[] = [
  tgss('vida-laboral')!,
  tgss('jubilacion')!,
  tgss('idc-reta')!,
  tgss('alta-reta')!,
  tgss('baja-reta')!,
  tgss('cambio-base-reta')!,
  aeat('111')!,
  aeat('190')!,
  { label: 'DEHU', sublabel: 'Notificaciones electrónicas', color: '#06b6d4', portalUrl: 'https://dehu.redsara.es/' },
  { label: 'IMPORTASS', sublabel: 'Portal autónomos Seg. Social', color: '#34d399', portalUrl: 'https://portal.seg-social.gob.es/wps/portal/importass/importass' },
].filter(Boolean)

export default function Dashboard() {
  const navigate = useNavigate()
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([])
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCert[]>([])
  const [stats, setStats] = useState({ clients: 0, certs: 0, notifications: 0 })
  const [certPicker, setCertPicker] = useState<QuickAccess | null>(null)

  useEffect(() => {
    Promise.all([
      window.api.calendar.getUpcoming(30),
      window.api.clients.getAll(),
      window.api.certificates.getAll(),
      window.api.notifications.getAll(),
    ]).then(([dl, clients, certs, notifs]) => {
      setDeadlines((dl as UpcomingDeadline[]).slice(0, 8))
      const today = new Date()
      const expiring = (certs as ExpiringCert[]).filter((c) => {
        if (!c.valid_to) return false
        const days = differenceInDays(parseISO(c.valid_to), today)
        return days <= 60 && days >= 0
      })
      setExpiringCerts(expiring.slice(0, 5))
      setStats({
        clients: (clients as unknown[]).length,
        certs: (certs as unknown[]).length,
        notifications: (notifs as { status: string }[]).filter((n) => n.status === 'unread').length,
      })
    })
  }, [])

  const categoryColor: Record<string, string> = {
    irpf: '#60a5fa',
    iva: '#a78bfa',
    sociedades: '#fb923c',
    retenciones: '#34d399',
    informativas: '#f472b6',
    ss: '#facc15',
    otros: 'var(--color-text-muted)',
  }

  const daysUntil = (date: string) => differenceInDays(parseISO(date), new Date())

  return (
    <div className="space-y-6">

      {/* Accesos rápidos */}
      <div>
        <div className="kicker mb-1">Accesos rápidos</div>
        <div className="divider-gold-thin mb-4" style={{ width: '40px' }} />
        <div className="grid grid-cols-4 gap-3">
          {QUICK_ACCESS.map((q) => (
            <div
              key={q.label}
              className="card p-0"
              style={{ borderTop: `2px solid ${q.color}` }}
            >
              <div style={{ padding: '0.875rem 1rem 0.625rem' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px', lineHeight: 1.3 }}>
                  {q.label}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: 1.3, minHeight: '2.2em' }}>
                  {q.sublabel}
                </div>
              </div>
              <div
                className="flex gap-1"
                style={{ padding: '0 0.625rem 0.625rem' }}
              >
                <button
                  className="btn-ghost"
                  style={{ fontSize: '10px', flex: 1, justifyContent: 'center' }}
                  onClick={() => window.api.app.openExternal(q.portalUrl)}
                >
                  Sede →
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '10px', flex: 1, justifyContent: 'center', color: 'var(--color-accent)' }}
                  onClick={() => setCertPicker(q)}
                >
                  Con cert. →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Clientes activos', value: stats.clients, path: '/clients' },
          { label: 'Certificados', value: stats.certs, path: '/certificates' },
          { label: 'Notificaciones nuevas', value: stats.notifications, path: '/notifications' },
        ].map((s) => (
          <div
            key={s.label}
            className="card card-accent p-5 interactive"
            onClick={() => navigate(s.path)}
          >
            <div className="kicker mb-3">{s.label}</div>
            <div
              className="font-serif font-bold text-4xl"
              style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Plazos fiscales próximos */}
        <div className="card p-0 col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <div className="kicker">Próximos 30 días</div>
              <div className="font-serif font-bold text-lg mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                Calendario fiscal
              </div>
            </div>
            <button className="btn-ghost text-xs" onClick={() => navigate('/calendar')}>
              Ver todo →
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {deadlines.length === 0 && (
              <div className="px-5 py-8 text-center" style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                No hay vencimientos en los próximos 30 días
              </div>
            )}
            {deadlines.map((d) => {
              const days = daysUntil(d.due_date)
              return (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1 h-8 flex-shrink-0"
                      style={{ background: categoryColor[d.category] ?? 'var(--color-text-muted)' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                        {d.model_number && (
                          <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginRight: '0.5rem' }}>
                            M-{d.model_number}
                          </span>
                        )}
                        {d.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {format(parseISO(d.due_date), "d 'de' MMMM", { locale: es })}
                      </div>
                    </div>
                  </div>
                  <div>
                    {days <= 7 ? (
                      <span className="badge badge-critical">{days}d</span>
                    ) : days <= 15 ? (
                      <span className="badge badge-warning">{days}d</span>
                    ) : (
                      <span className="badge badge-pending">{days}d</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Certificados próximos a caducar */}
        <div className="card p-0">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="kicker" style={{ fontSize: '9px' }}>Alerta</div>
            <div className="font-serif font-bold" style={{ color: 'var(--color-text-primary)', fontSize: '15px' }}>
              Certificados
            </div>
          </div>
          <div>
            {expiringCerts.length === 0 ? (
              <div className="px-4 py-4 text-center" style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                Sin alertas de caducidad
              </div>
            ) : (
              expiringCerts.map((c) => {
                const days = daysUntil(c.valid_to)
                return (
                  <div key={c.id} className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{c.alias}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{c.client_name}</div>
                    </div>
                    <span className={`badge ${days <= 15 ? 'badge-critical' : 'badge-warning'}`}>
                      {days}d
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {certPicker && (
        <CertPickerModal
          tramiteName={certPicker.label}
          portalUrl={certPicker.portalUrl}
          onClose={() => setCertPicker(null)}
        />
      )}
    </div>
  )
}
