import { ipcMain } from 'electron'
import { getDb } from './database'

const SELECT_SHORTCUT = `
  SELECT s.*, c.alias as cert_alias, c.valid_to as cert_valid_to,
    cl.name as client_name, cl.nif_cif as client_nif
  FROM shortcuts s
  LEFT JOIN certificates c ON c.id = s.certificate_id
  LEFT JOIN clients cl ON cl.id = c.client_id
`

export function registerShortcutHandlers(): void {
  ipcMain.handle('shortcuts:getAll', () => {
    return getDb().prepare(`${SELECT_SHORTCUT} ORDER BY s.use_count DESC, s.name ASC`).all()
  })

  ipcMain.handle('shortcuts:getTop', (_, limit: number = 6) => {
    return getDb().prepare(`${SELECT_SHORTCUT} ORDER BY s.use_count DESC, s.last_used DESC LIMIT ?`).all(limit)
  })

  ipcMain.handle('shortcuts:create', (_, data: {
    name: string
    url: string
    certificate_id: number | null
    color: string
    notes?: string
  }) => {
    const result = getDb().prepare(`
      INSERT INTO shortcuts (name, url, certificate_id, color, notes)
      VALUES (@name, @url, @certificateId, @color, @notes)
    `).run({
      name: data.name,
      url: data.url,
      certificateId: data.certificate_id ?? null,
      color: data.color || '#d4a853',
      notes: data.notes ?? null,
    })
    return getDb().prepare(`${SELECT_SHORTCUT} WHERE s.id = ?`).get(result.lastInsertRowid)
  })

  ipcMain.handle('shortcuts:update', (_, id: number, data: {
    name?: string
    url?: string
    certificate_id?: number | null
    color?: string
    notes?: string
  }) => {
    const fields: string[] = []
    const params: Record<string, unknown> = { id }
    if (data.name !== undefined) { fields.push('name = @name'); params.name = data.name }
    if (data.url !== undefined) { fields.push('url = @url'); params.url = data.url }
    if ('certificate_id' in data) { fields.push('certificate_id = @certId'); params.certId = data.certificate_id ?? null }
    if (data.color !== undefined) { fields.push('color = @color'); params.color = data.color }
    if (data.notes !== undefined) { fields.push('notes = @notes'); params.notes = data.notes }
    if (fields.length === 0) return null
    getDb().prepare(`UPDATE shortcuts SET ${fields.join(', ')} WHERE id = @id`).run(params)
    return getDb().prepare(`${SELECT_SHORTCUT} WHERE s.id = ?`).get(id)
  })

  ipcMain.handle('shortcuts:delete', (_, id: number) => {
    getDb().prepare('DELETE FROM shortcuts WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('shortcuts:recordUse', (_, id: number) => {
    getDb().prepare(`
      UPDATE shortcuts
      SET use_count = use_count + 1, last_used = datetime('now')
      WHERE id = ?
    `).run(id)
    return { success: true }
  })
}
