import { ipcMain } from 'electron'
import { getDb } from './database'

export function registerProcedureHandlers(): void {
  ipcMain.handle('procedures:getAll', (_, clientId?: number) => {
    if (clientId) {
      return getDb().prepare(`
        SELECT p.*, c.name as client_name, c.nif_cif as client_nif
        FROM procedures p
        LEFT JOIN clients c ON c.id = p.client_id
        WHERE p.client_id = ?
        ORDER BY p.due_date ASC, p.created_at DESC
      `).all(clientId)
    }
    return getDb().prepare(`
      SELECT p.*, c.name as client_name, c.nif_cif as client_nif
      FROM procedures p
      LEFT JOIN clients c ON c.id = p.client_id
      ORDER BY p.due_date ASC, p.created_at DESC
    `).all()
  })

  ipcMain.handle('procedures:getById', (_, id: number) => {
    return getDb().prepare(`
      SELECT p.*, c.name as client_name, c.nif_cif
      FROM procedures p LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.id = ?
    `).get(id)
  })

  ipcMain.handle('procedures:getUpcoming', (_, days: number) => {
    return getDb().prepare(`
      SELECT p.*, c.name as client_name, c.nif_cif
      FROM procedures p LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.status IN ('pending','in_progress')
        AND p.due_date IS NOT NULL
        AND date(p.due_date) <= date('now', '+' || ? || ' days')
        AND date(p.due_date) >= date('now')
      ORDER BY p.due_date ASC
      LIMIT 50
    `).all(days)
  })

  ipcMain.handle('procedures:create', (_, data: Record<string, unknown>) => {
    const result = getDb().prepare(`
      INSERT INTO procedures
        (client_id, category, organism, model_number, name, description,
         status, due_date, notes, portal_url, alert_days)
      VALUES
        (@client_id, @category, @organism, @model_number, @name, @description,
         @status, @due_date, @notes, @portal_url, @alert_days)
    `).run(data)
    return getDb().prepare('SELECT * FROM procedures WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('procedures:update', (_, id: number, data: Record<string, unknown>) => {
    getDb().prepare(`
      UPDATE procedures SET
        client_id = @client_id, category = @category, organism = @organism,
        model_number = @model_number, name = @name, description = @description,
        status = @status, due_date = @due_date, presented_at = @presented_at,
        notes = @notes, portal_url = @portal_url, alert_days = @alert_days,
        updated_at = datetime('now')
      WHERE id = @id
    `).run({ ...data, id })
    return getDb().prepare('SELECT * FROM procedures WHERE id = ?').get(id)
  })

  ipcMain.handle('procedures:delete', (_, id: number) => {
    getDb().prepare('DELETE FROM procedures WHERE id = ?').run(id)
    return { success: true }
  })
}
