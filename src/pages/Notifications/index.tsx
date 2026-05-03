import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

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
  ai_summary: string
  ai_classification: string
}

const STATUS_LABELS: Record<string, string> = { unread: 'Nueva', read: 'Leída', managed: 'Gestionada', archived: 'Archivada' }
const URGENCY_BADGE: Record<string, string> = { critical: 'badge-critical', high: 'badge-warning', normal: 'badge-pending', low: 'badge-pending' }

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [statusFilter, setStatusFilter] = useState('all')

  const load = () => window.api.notifications.getAll().then((data) => setNotifications(data as Notification[]))
  useEffect(() => { load() }, [])

  const filtered = statusFilter === 'all' ? notifications : notifications.filter((n) => n.status === statusFilter)

  const handleStatus = async (id: number, status: string) => {
    await window.api.notifications.updateStatus(id, status)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Administraciones públicas</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {notifications.filter((n) => n.status === 'unread').length} notificaciones nuevas
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-5">
        {[['all', 'Todas'], ['unread', 'Nuevas'], ['read', 'Leídas'], ['managed', 'Gestionadas'], ['archived', 'Archivadas']].map(([val, label]) => (
          <button
            key={val}
            className={statusFilter === val ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.5rem 0.85rem', fontSize: '10px' }}
            onClick={() => setStatusFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card p-0">
        <table className="table-aurea">
          <thead>
            <tr>
              <th>Urgencia</th>
              <th>Cliente</th>
              <th>Organismo</th>
              <th>Asunto</th>
              <th>Recibida</th>
              <th>Vence</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  No hay notificaciones
                </td>
              </tr>
            )}
            {filtered.map((n) => (
              <tr key={n.id}>
                <td><span className={`badge ${URGENCY_BADGE[n.urgency]}`}>{n.urgency}</span></td>
                <td>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{n.client_name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-accent)' }}>{n.nif_cif}</div>
                </td>
                <td style={{ fontSize: '12px' }}>{n.organism}</td>
                <td style={{ fontSize: '13px', color: 'var(--color-text-primary)', maxWidth: '200px' }}>{n.subject || '—'}</td>
                <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {n.received_at ? format(parseISO(n.received_at), 'dd/MM/yyyy', { locale: es }) : '—'}
                </td>
                <td style={{ fontSize: '12px' }}>
                  {n.deadline ? <span style={{ color: 'var(--color-danger)' }}>{format(parseISO(n.deadline), 'dd/MM/yyyy', { locale: es })}</span> : '—'}
                </td>
                <td><span className="badge badge-pending">{STATUS_LABELS[n.status]}</span></td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
