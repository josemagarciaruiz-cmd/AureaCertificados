import { ipcMain } from 'electron'
import { getDb } from './database'
import * as crypto from 'crypto'

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

  ipcMain.handle('settings:setLockPassword', (_, password: string) => {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
    const upsert = getDb().prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)
    upsert.run('lock_password_hash', hash)
    upsert.run('lock_password_salt', salt)
    return { success: true }
  })

  ipcMain.handle('settings:verifyLockPassword', (_, password: string) => {
    const hashRow = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('lock_password_hash') as { value: string } | undefined
    const saltRow = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('lock_password_salt') as { value: string } | undefined
    if (!hashRow || !saltRow) return false
    const hash = crypto.pbkdf2Sync(password, saltRow.value, 100000, 32, 'sha256').toString('hex')
    return hash === hashRow.value
  })

  ipcMain.handle('settings:removeLockPassword', () => {
    getDb().prepare("DELETE FROM settings WHERE key IN ('lock_password_hash', 'lock_password_salt')").run()
    return { success: true }
  })
}
