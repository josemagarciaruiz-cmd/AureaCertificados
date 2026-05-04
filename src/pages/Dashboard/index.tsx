import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AEAT_MODELS } from '@data/aeat-models'
import { TGSS_TRAMITES } from '@data/tgss-tramites'
import { useCertPicker } from '@contexts/CertPickerContext'

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

type UsageMap = Record<string, { count: number; lastUsed: string }>

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
  const { openCertPicker } = useCertPicker()
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([])
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCert[]>([])
  const [stats, setStats] = useState({ clients: 0, certs: 0, notifications: 0 })
  const [usage, setUsage] = useState<UsageMap>({})
  const [urlOverrides, setUrlOverrides] = useState<Record<string, string>>({})
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  useEffect(() => {
    Promise.all([
      window.api.settings.get('quick_access_usage'),
      window.api.settings.get('quick_access_url_overrides'),
      window.api.calendar.getUpcoming(30),
      window.api.clients.getAll(),
      window.api.certificates.getAll(),
      window.api.notifications.getAll(),
    ]).then(([usageVal, overridesVal, dl, clients, certs, notifs]) => {
      if (usageVal) setUsage(JSON.parse(usageVal as string) as UsageMap)
      if (overridesVal) setUrlOverrides(JSON.parse(overridesVal as string) as Record<string, string>)
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

  const trackUsage = (url: string) => {
    setUsage((prev) => {
      const entry = prev[url] ?? { count: 0, lastUsed: '' }
      const next = { ...prev, [url]: { count: entry.count + 1, lastUsed: new Date().toISOString() } }
      window.api.settings.set('quick_access_usage', JSON.stringify(next))
      return next
    })
  }

  const saveUrlOverride = (label: string, url: string) => {
    setUrlOverrides((prev) => {
      const next = { ...prev, [label]: url }
      window.api.settings.set('quick_access_url_overrides', JSON.stringify(next))
      return next
    })
    setEditingLabel(null)
  }

  const resetUrlOverride = (label: string) => {
    setUrlOverrides((prev) => {
      const next = { ...prev }
      delete next[label]
      window.api.settings.set('quick_access_url_overrides', JSON.stringify(next))
      return next
    })
    setEditingLabel(null)
  }

  const sortedQuickAccess = [...QUICK_ACCESS].sort((a, b) => {
    const ua = usage[a.portalUrl]
    const ub = usage[b.portalUrl]
    if (!ua && !ub) return 0
    if (!ua) return 1
    if (!ub) return -1
    if (ub.count !== ua.count) return ub.count - ua.count
    return ub.lastUsed.localeCompare(ua.lastUsed)
  })

  const categoryColor: Record<string, string> = {
    irpf: '#60a5fa', iva: '#a78bfa', sociedades: '#fb923c',
    retenciones: '#34d399', informativas: '#f472b6', ss: '#facc15',
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
          {sortedQuickAccess.map((q) => {
            const effectiveUrl = urlOverrides[q.label] ?? q.portalUrl
            const uses = usage[q.portalUrl]?.count ?? 0
            const isEditing = editingLabel === q.label
            const isOverridden = !!urlOverrides[q.label]

            return (
              <div key={q.label} className="card p-0" style={{ borderTop: `2px solid ${q.color}` }}>
                <div style={{ padding: '0.75rem 0.75rem 0.5rem' }}>
                  <div className="flex items-start justify-between gap-1">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                        {q.label}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                        {q.sublabel}
                      </div>
                      {uses > 0 && (
                        <div style={{ fontSize: '9px', color: q.color, marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                          {uses} {uses === 1 ? 'uso' : 'usos'}
                        </div>
                      )}
                    </div>
                    <button
                      title="Editar URL"
                      style={{
                        fontSize: '10px', color: isOverridden ? q.color : 'var(--color-text-muted)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', flexShrink: 0,
                      }}
                      onClick={() => { setEditingLabel(q.label); setEditingValue(effectiveUrl) }}
                    >
                      ✎
                    </button>
                  </div>

                  {isEditing && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <input
                        className="field-input"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveUrlOverride(q.label, editingValue)
                          if (e.key === 'Escape') setEditingLabel(null)
                        }}
                      />
                      <div className="flex gap-1">
                        <button className="btn-primary" style={{ fontSize: '9px', padding: '2px 6px' }}
                          onClick={() => saveUrlOverride(q.label, editingValue)}>
                          Guardar
                        </button>
                        {isOverridden && (
                          <button className="btn-ghost" style={{ fontSize: '9px', padding: '2px 6px', color: 'var(--color-danger)' }}
                            onClick={() => resetUrlOverride(q.label)}>
                            Restablecer
                          </button>
                        )}
                        <button className="btn-ghost" style={{ fontSize: '9px', padding: '2px 6px' }}
                          onClick={() => setEditingLabel(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex gap-1" style={{ padding: '0 0.5rem 0.5rem' }}>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '10px', flex: 1, justifyContent: 'center' }}
                      onClick={() => { trackUsage(q.portalUrl); window.api.app.openExternal(effectiveUrl) }}
                    >
                      Sede →
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '10px', flex: 1, justifyContent: 'center', color: 'var(--color-accent)' }}
                      onClick={() => { trackUsage(q.portalUrl); openCertPicker(q.label, effectiveUrl) }}
                    >
                      Con cert. →
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Clientes activos', value: stats.clients, path: '/clients' },
          { label: 'Certificados', value: stats.certs, path: '/certificates' },
          { label: 'Notificaciones nuevas', value: stats.notifications, path: '/notifications' },
        ].map((s) => (
          <div key={s.label} className="card card-accent p-5 interactive" onClick={() => navigate(s.path)}>
            <div className="kicker mb-3">{s.label}</div>
            <div className="font-serif font-bold text-4xl" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
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
            <button className="btn-ghost text-xs" onClick={() => navigate('/calendar')}>Ver todo →</button>
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
                    <div className="w-1 h-8 flex-shrink-0" style={{ background: categoryColor[d.category] ?? 'var(--color-text-muted)' }} />
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
                    {days <= 7 ? <span className="badge badge-critical">{days}d</span>
                      : days <= 15 ? <span className="badge badge-warning">{days}d</span>
                      : <span className="badge badge-pending">{days}d</span>}
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
            <div className="font-serif font-bold" style={{ color: 'var(--color-text-primary)', fontSize: '15px' }}>Certificados</div>
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
                    <span className={`badge ${days <= 15 ? 'badge-critical' : 'badge-warning'}`}>{days}d</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
