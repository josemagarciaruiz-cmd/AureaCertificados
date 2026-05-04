import { ipcMain } from 'electron'
import { getDb } from './database'

export function generateAlerts(): void {
  const db = getDb()

  // Alertas de certificados próximos a caducar (30 días)
  const certs = db.prepare(`
    SELECT c.id, c.alias, cl.name as client_name, c.valid_to
    FROM certificates c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.valid_to IS NOT NULL
    AND date(c.valid_to) BETWEEN date('now') AND date('now', '+30 days')
  `).all() as { id: number; alias: string; client_name: string; valid_to: string }[]

  for (const cert of certs) {
    const sourceKey = `cert_expiry_${cert.id}`
    const exists = db.prepare("SELECT id FROM notifications WHERE source_key = ? AND status != 'archived'").get(sourceKey)
    if (!exists) {
      const days = Math.round((new Date(cert.valid_to).getTime() - Date.now()) / 86400000)
      db.prepare(`
        INSERT INTO notifications (organism, subject, received_at, deadline, status, urgency, source_key)
        VALUES ('Sistema', ?, date('now'), ?, 'unread', ?, ?)
      `).run(
        `Certificado próximo a caducar: ${cert.alias} · ${cert.client_name}`,
        cert.valid_to,
        days <= 15 ? 'critical' : 'high',
        sourceKey
      )
    }
  }

  // Alertas de plazos fiscales próximos (15 días)
  const deadlines = db.prepare(`
    SELECT * FROM fiscal_calendar
    WHERE date(due_date) BETWEEN date('now') AND date('now', '+15 days')
    ORDER BY due_date ASC
  `).all() as { id: number; model_number: string; name: string; due_date: string }[]

  for (const d of deadlines) {
    const sourceKey = `fiscal_${d.id}`
    const exists = db.prepare("SELECT id FROM notifications WHERE source_key = ? AND status != 'archived'").get(sourceKey)
    if (!exists) {
      const days = Math.round((new Date(d.due_date).getTime() - Date.now()) / 86400000)
      db.prepare(`
        INSERT INTO notifications (organism, subject, received_at, deadline, status, urgency, source_key)
        VALUES ('AEAT', ?, date('now'), ?, 'unread', ?, ?)
      `).run(
        d.model_number ? `Plazo fiscal: Modelo ${d.model_number} — ${d.name}` : `Plazo fiscal: ${d.name}`,
        d.due_date,
        days <= 7 ? 'critical' : 'high',
        sourceKey
      )
    }
  }
}

export function registerNotificationHandlers(): void {
  ipcMain.handle('notifications:getAll', (_, clientId?: number) => {
    if (clientId) {
      return getDb().prepare(`
        SELECT n.*, c.name as client_name, c.nif_cif
        FROM notifications n LEFT JOIN clients c ON c.id = n.client_id
        WHERE n.client_id = ? ORDER BY n.created_at DESC
      `).all(clientId)
    }
    return getDb().prepare(`
      SELECT n.*, c.name as client_name, c.nif_cif
      FROM notifications n LEFT JOIN clients c ON c.id = n.client_id
      ORDER BY n.created_at DESC LIMIT 200
    `).all()
  })

  ipcMain.handle('notifications:getById', (_, id: number) => {
    return getDb().prepare(`
      SELECT n.*, c.name as client_name FROM notifications n
      LEFT JOIN clients c ON c.id = n.client_id WHERE n.id = ?
    `).get(id)
  })

  ipcMain.handle('notifications:updateStatus', (_, id: number, status: string) => {
    getDb().prepare('UPDATE notifications SET status = ? WHERE id = ?').run(status, id)
    return { success: true }
  })

  ipcMain.handle('notifications:delete', (_, id: number) => {
    getDb().prepare('DELETE FROM notifications WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('notifications:generateAlerts', () => {
    generateAlerts()
    return { success: true }
  })
}
