import { ipcMain } from 'electron'
import { getDb } from './database'

interface CustomTramiteRow {
  id: number
  name: string
  category: string
  portal_url: string
  description: string
  created_at: string
}

export function registerCustomTramiteHandlers(): void {
  ipcMain.handle('custom-tramites:getAll', () => {
    return getDb().prepare('SELECT * FROM custom_tramites ORDER BY created_at DESC').all()
  })

  ipcMain.handle('custom-tramites:getByCategory', (_, category: string) => {
    return getDb().prepare('SELECT * FROM custom_tramites WHERE category = ? ORDER BY created_at DESC').all(category)
  })

  ipcMain.handle('custom-tramites:create', (_, data: Omit<CustomTramiteRow, 'id' | 'created_at'>) => {
    const result = getDb().prepare(
      'INSERT INTO custom_tramites (name, category, portal_url, description) VALUES (?, ?, ?, ?)'
    ).run(data.name, data.category, data.portal_url, data.description || '')
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('custom-tramites:update', (_, id: number, data: Partial<Omit<CustomTramiteRow, 'id' | 'created_at'>>) => {
    getDb().prepare(
      'UPDATE custom_tramites SET name = COALESCE(?, name), portal_url = COALESCE(?, portal_url), description = COALESCE(?, description) WHERE id = ?'
    ).run(data.name ?? null, data.portal_url ?? null, data.description ?? null, id)
    return { success: true }
  })

  ipcMain.handle('custom-tramites:delete', (_, id: number) => {
    getDb().prepare('DELETE FROM custom_tramites WHERE id = ?').run(id)
    return { success: true }
  })
}
