import { useEffect, useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import DehuPanel from '@components/DehuPanel'
import LexnetPanel from '@components/LexnetPanel'

interface Notification {
  id: number
  client_name: string
  nif_cif: string
  organism: string
  subject: string
  received_at: string
  deadline: string
  status: string
  urgency: string
  source_key: string
}

const STATUS_LABELS: Record<string, string> = {
  unread: 'Nueva',
  read: 'Leída',
  managed: 'Gestionada',
  archived: 'Archivada',
}

const URGENCY_LABELS: Record<string, string> = {
  critical: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
}

const URGENCY_BADGE: Record<string, string> = {
  critical: 'badge-critical',
  high: 'badge-warning',
  normal: 'badge-pending',
  low: 'badge-pending',
}

function isSystemAlert(n: Notification) {
  return n.source_key?.startsWith('cert_expiry_') || n.source_key?.startsWith('fiscal_')
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'alerts' | 'dehu' | 'lexnet'>('alerts')

  const load = () =>
    window.api.notifications.getAll().then((data) => setNotifications(data as Notification[]))

  useEffect(() => { load() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await window.api.notifications.generateAlerts()
    await load()
    setRefreshing(false)
  }

  const filtered = statusFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.status === statusFilter)

  const handleStatus = async (id: number, status: string) => {
    await window.api.notifications.updateStatus(id, status)
    load()
  }

  const handleDelete = async (id: number) => {
    await window.api.notifications.delete(id)
    load()
  }

  const unreadCount = notifications.filter((n) => n.status === 'unread').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Administraciones públicas</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {unreadCount > 0 ? `${unreadCount} alertas nuevas` : 'Sin alertas nuevas'}
          </p>
        </div>
        {activeTab === 'alerts' && (
          <button
            className="btn-secondary"
            style={{ fontSize: '11px' }}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Actualizando...' : '↻ Actualizar alertas'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
        <button
          className={activeTab === 'alerts' ? 'btn-primary' : 'btn-ghost'}
          style={{ padding: '0.5rem 1rem', fontSize: '11px', borderRadius: '4px 4px 0 0', marginBottom: '-1px' }}
          onClick={() => setActiveTab('alerts')}
        >
          Alertas {unreadCount > 0 && <span style={{ marginLeft: '4px', background: 'var(--color-danger)', color: '#fff', borderRadius: '8px', padding: '0 5px', fontSize: '9px' }}>{unreadCount}</span>}
        </button>
        <button
          className={activeTab === 'dehu' ? 'btn-primary' : 'btn-ghost'}
          style={{ padding: '0.5rem 1rem', fontSize: '11px', borderRadius: '4px 4px 0 0', marginBottom: '-1px' }}
          onClick={() => setActiveTab('dehu')}
        >
          Buzón DEHU
        </button>
        <button
          className={activeTab === 'lexnet' ? 'btn-primary' : 'btn-ghost'}
          style={{ padding: '0.5rem 1rem', fontSize: '11px', borderRadius: '4px 4px 0 0', marginBottom: '-1px' }}
          onClick={() => setActiveTab('lexnet')}
        >
          Buzón LexNET
        </button>
      </div>

      {/* DEHU panel */}
      {activeTab === 'dehu' && <DehuPanel />}

      {/* LexNET panel */}
      {activeTab === 'lexnet' && <LexnetPanel />}

      {/* Alerts panel */}
      {activeTab === 'alerts' && <>
      <div className="flex gap-1 mb-5">
        {([['all', 'Todas'], ['unread', 'Nuevas'], ['read', 'Leídas'], ['managed', 'Gestionadas'], ['archived', 'Archivadas']] as [string, string][]).map(([val, label]) => {
          const count = val === 'all' ? notifications.length : notifications.filter((n) => n.status === val).length
          return (
            <button
              key={val}
              className={statusFilter === val ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 0.85rem', fontSize: '10px' }}
              onClick={() => setStatusFilter(val)}
            >
              {label}{count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      <div className="card p-0">
        <table className="table-aurea">
          <thead>
            <tr>
              <th>Urgencia</th>
              <th>Tipo</th>
              <th>Asunto</th>
              <th>Vence</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2.5rem' }}>
                  {statusFilter === 'all'
                    ? 'No hay alertas. Pulsa «↻ Actualizar alertas» para revisar certificados y plazos fiscales.'
                    : 'No hay notificaciones en esta categoría'}
                </td>
              </tr>
            )}
            {filtered.map((n) => {
              const daysLeft = n.deadline ? differenceInDays(parseISO(n.deadline), new Date()) : null
              const isSystem = isSystemAlert(n)
              return (
                <tr key={n.id} style={{ opacity: n.status === 'archived' ? 0.5 : 1 }}>
                  <td>
                    <span className={`badge ${URGENCY_BADGE[n.urgency]}`}>
                      {URGENCY_LABELS[n.urgency] ?? n.urgency}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {n.organism}
                    </div>
                    {n.client_name && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{n.client_name}</div>
                    )}
                    {isSystem && (
                      <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginTop: '2px', letterSpacing: '0.05em' }}>
                        ALERTA AUTOMÁTICA
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-primary)', maxWidth: '320px' }}>
                    {n.subject || '—'}
                  </td>
                  <td style={{ fontSize: '12px', minWidth: '90px' }}>
                    {n.deadline ? (
                      <div>
                        <div style={{ color: daysLeft !== null && daysLeft <= 7 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                          {format(parseISO(n.deadline), 'dd/MM/yyyy', { locale: es })}
                        </div>
                        {daysLeft !== null && daysLeft >= 0 && (
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                            en {daysLeft}d
                          </div>
                        )}
                        {daysLeft !== null && daysLeft < 0 && (
                          <div style={{ fontSize: '10px', color: 'var(--color-danger)' }}>vencido</div>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    <select
                      className="field-select"
                      style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '11px' }}
                      value={n.status}
                      onChange={(e) => handleStatus(n.id, e.target.value)}
                    >
                      <option value="unread">Nueva</option>
                      <option value="read">Leída</option>
                      <option value="managed">Gestionada</option>
                      <option value="archived">Archivada</option>
                    </select>
                  </td>
                  <td>
                    <button
                      title="Eliminar"
                      style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0 4px' }}
                      onClick={() => handleDelete(n.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </>}
    </div>
  )
}
