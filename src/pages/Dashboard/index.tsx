import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface UpcomingDeadline {
  id: number
  name: string
  model_number: string
  due_date: string
  category: string
}

interface UpcomingProcedure {
  id: number
  name: string
  client_name: string
  due_date: string
  status: string
  category: string
}

interface ExpiringCert {
  id: number
  alias: string
  client_name: string
  valid_to: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([])
  const [procedures, setProcedures] = useState<UpcomingProcedure[]>([])
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCert[]>([])
  const [stats, setStats] = useState({ clients: 0, certs: 0, procedures: 0, notifications: 0 })

  useEffect(() => {
    Promise.all([
      window.api.calendar.getUpcoming(30),
      window.api.procedures.getUpcoming(30),
      window.api.clients.getAll(),
      window.api.certificates.getAll(),
      window.api.procedures.getAll(),
      window.api.notifications.getAll(),
    ]).then(([dl, proc, clients, certs, allProc, notifs]) => {
      setDeadlines((dl as UpcomingDeadline[]).slice(0, 8))
      setProcedures((proc as UpcomingProcedure[]).slice(0, 6))
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
        procedures: (allProc as { status: string }[]).filter((p) => p.status === 'pending' || p.status === 'in_progress').length,
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
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Clientes activos', value: stats.clients, icon: '👥', path: '/clients' },
          { label: 'Certificados', value: stats.certs, icon: '🔐', path: '/certificates' },
          { label: 'Trámites activos', value: stats.procedures, icon: '📋', path: '/tramites/aeat' },
          { label: 'Notificaciones nuevas', value: stats.notifications, icon: '🔔', path: '/notifications' },
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

        {/* Columna derecha */}
        <div className="space-y-4">
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

          {/* Trámites activos */}
          <div className="card p-0">
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="kicker" style={{ fontSize: '9px' }}>Pendientes</div>
              <div className="font-serif font-bold" style={{ color: 'var(--color-text-primary)', fontSize: '15px' }}>
                Trámites
              </div>
            </div>
            <div>
              {procedures.length === 0 ? (
                <div className="px-4 py-4 text-center" style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  Sin trámites urgentes
                </div>
              ) : (
                procedures.map((p) => (
                  <div key={p.id} className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{p.client_name}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
