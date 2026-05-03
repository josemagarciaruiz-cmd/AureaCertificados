import { ipcMain } from 'electron'
import { getDb } from './database'

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
}
