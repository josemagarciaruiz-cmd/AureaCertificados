import { ipcMain } from 'electron'
import { getDb } from './database'
import { readFileSync } from 'fs'

function parseIcs(content: string): Array<Record<string, string>> {
  const events: Array<Record<string, string>> = []
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  let current: Record<string, string> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
    } else if (line === 'END:VEVENT' && current) {
      events.push(current)
      current = null
    } else if (current) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).split(';')[0].trim()
        const value = line.substring(colonIdx + 1).trim()
        current[key] = value
      }
    }
  }
  return events
}

function icsDateToISO(icsDate: string): string {
  if (icsDate.length === 8) {
    return `${icsDate.substring(0, 4)}-${icsDate.substring(4, 6)}-${icsDate.substring(6, 8)}`
  }
  return icsDate
}

function inferCategory(summary: string): string {
  const s = summary.toLowerCase()
  if (s.includes('iva') || s.includes('303') || s.includes('390') || s.includes('349')) return 'iva'
  if (s.includes('irpf') || s.includes('renta') || s.includes('130') || s.includes('131') || s.includes('100')) return 'irpf'
  if (s.includes('sociedad') || s.includes('200') || s.includes('202')) return 'sociedades'
  if (s.includes('retenci') || s.includes('111') || s.includes('115') || s.includes('190') || s.includes('180')) return 'retenciones'
  if (s.includes('seguridad social') || s.includes('tgss') || s.includes('reta')) return 'ss'
  if (s.includes('informativa') || s.includes('347') || s.includes('720') || s.includes('721')) return 'informativas'
  return 'otros'
}

export function registerCalendarHandlers(): void {
  ipcMain.handle('calendar:getDeadlines', (_, year: number, month?: number) => {
    if (month !== undefined) {
      return getDb().prepare(`
        SELECT * FROM fiscal_calendar WHERE year = ? AND month = ? ORDER BY due_date ASC
      `).all(year, month)
    }
    return getDb().prepare(`
      SELECT * FROM fiscal_calendar WHERE year = ? ORDER BY due_date ASC
    `).all(year)
  })

  ipcMain.handle('calendar:getUpcoming', (_, days: number) => {
    return getDb().prepare(`
      SELECT * FROM fiscal_calendar
      WHERE date(due_date) >= date('now')
        AND date(due_date) <= date('now', '+' || ? || ' days')
      ORDER BY due_date ASC
      LIMIT 30
    `).all(days)
  })

  ipcMain.handle('calendar:getImportedCalendars', () => {
    return getDb().prepare('SELECT * FROM imported_calendars ORDER BY imported_at DESC').all()
  })

  ipcMain.handle('calendar:importIcs', (_, filePath: string) => {
    const content = readFileSync(filePath, 'utf8')
    const events = parseIcs(content)

    if (events.length === 0) {
      return { success: false, error: 'No se encontraron eventos en el archivo' }
    }

    const years = new Set<number>()
    for (const e of events) {
      const dateStr = e['DTSTART'] || e['DTEND'] || ''
      if (dateStr.length >= 4) years.add(parseInt(dateStr.substring(0, 4)))
    }
    const year = years.size > 0 ? Math.max(...years) : new Date().getFullYear()

    const calResult = getDb().prepare(`
      INSERT INTO imported_calendars (name, year, source_file, events_count)
      VALUES (?, ?, ?, ?)
    `).run(`Calendario AEAT ${year}`, year, filePath, events.length)

    const calId = calResult.lastInsertRowid

    const insert = getDb().prepare(`
      INSERT INTO fiscal_calendar
        (year, month, due_date, model_number, name, category, periodicity, source, imported_calendar_id)
      VALUES (?, ?, ?, ?, ?, ?, 'puntual', 'ics_import', ?)
    `)

    let imported = 0
    const insertMany = getDb().transaction(() => {
      for (const event of events) {
        const dtstart = event['DTSTART'] || event['DTEND'] || ''
        if (!dtstart) continue
        const isoDate = icsDateToISO(dtstart.split('T')[0])
        const dateParts = isoDate.split('-')
        if (dateParts.length < 2) continue
        const evYear = parseInt(dateParts[0])
        const evMonth = parseInt(dateParts[1])
        const summary = event['SUMMARY'] || event['DESCRIPTION'] || 'Evento fiscal'
        const category = inferCategory(summary)
        const modelMatch = summary.match(/\b(\d{3})\b/)
        const modelNumber = modelMatch ? modelMatch[1] : null
        insert.run(evYear, evMonth, isoDate, modelNumber, summary, category, calId)
        imported++
      }
    })
    insertMany()

    getDb().prepare('UPDATE imported_calendars SET events_count = ? WHERE id = ?').run(imported, calId)

    return { success: true, imported, year }
  })

  ipcMain.handle('calendar:deleteImportedCalendar', (_, id: number) => {
    getDb().prepare('DELETE FROM fiscal_calendar WHERE imported_calendar_id = ?').run(id)
    getDb().prepare('DELETE FROM imported_calendars WHERE id = ?').run(id)
    return { success: true }
  })
}
