import { ipcMain } from 'electron'
import { getDb } from './database'

export function registerClientHandlers(): void {
  ipcMain.handle('clients:getAll', () => {
    return getDb().prepare(`
      SELECT c.*,
        COUNT(DISTINCT cert.id) as cert_count,
        COUNT(DISTINCT proc.id) as procedure_count
      FROM clients c
      LEFT JOIN certificates cert ON cert.client_id = c.id
      LEFT JOIN procedures proc ON proc.client_id = c.id AND proc.status != 'cancelled'
      WHERE c.active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all()
  })

  ipcMain.handle('clients:getById', (_, id: number) => {
    return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(id)
  })

  ipcMain.handle('clients:search', (_, query: string) => {
    const q = `%${query}%`
    return getDb().prepare(`
      SELECT * FROM clients
      WHERE active = 1 AND (name LIKE ? OR nif_cif LIKE ? OR email LIKE ?)
      ORDER BY name ASC LIMIT 50
    `).all(q, q, q)
  })

  ipcMain.handle('clients:create', (_, data: Record<string, unknown>) => {
    const stmt = getDb().prepare(`
      INSERT INTO clients (name, nif_cif, type, email, phone, address, city, postal_code, notes)
      VALUES (@name, @nif_cif, @type, @email, @phone, @address, @city, @postal_code, @notes)
    `)
    const result = stmt.run(data)
    return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('clients:update', (_, id: number, data: Record<string, unknown>) => {
    getDb().prepare(`
      UPDATE clients SET
        name = @name, nif_cif = @nif_cif, type = @type,
        email = @email, phone = @phone, address = @address,
        city = @city, postal_code = @postal_code, notes = @notes,
        updated_at = datetime('now')
      WHERE id = @id
    `).run({ ...data, id })
    return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(id)
  })

  ipcMain.handle('clients:delete', (_, id: number) => {
    getDb().prepare('UPDATE clients SET active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return { success: true }
  })
}
