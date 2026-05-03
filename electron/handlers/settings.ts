import { ipcMain } from 'electron'
import { getDb } from './database'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (_, key: string) => {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  })

  ipcMain.handle('settings:set', (_, key: string, value: unknown) => {
    getDb().prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, String(value))
    return { success: true }
  })

  ipcMain.handle('settings:getAll', () => {
    const rows = getDb().prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  })
}
