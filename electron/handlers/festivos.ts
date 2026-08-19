import { ipcMain } from 'electron'
import { getDb } from './database'
import { CCAA, ISLAS_CANARIAS, ANIOS_DISPONIBLES, FESTIVOS_POR_ANIO } from '../data/festivos-data'

/**
 * Calendario laboral (festivos). Mismo patrón que el calendario fiscal:
 *   - Datos oficiales embebidos por año (BOE) que se "siembran" en la tabla
 *     `festivos` filtrados por la ubicación del usuario (CCAA + isla).
 *   - Festivos locales (2 por municipio) que el usuario añade a mano, ya que no
 *     existe una fuente única fiable para los miles de municipios.
 *
 * `source`:
 *   - 'builtin' : nacionales / autonómicos / insulares cargados desde el BOE.
 *   - 'manual'  : festivos locales introducidos por el usuario.
 */
export function registerFestivosHandlers(): void {
  // Catálogo para los selectores de la UI.
  ipcMain.handle('festivos:getLocations', () => ({
    ccaa: CCAA,
    islas: ISLAS_CANARIAS,
    anios: ANIOS_DISPONIBLES,
  }))

  // Siembra los festivos nacionales + autonómicos (+ insular) del año para la ubicación.
  // Conserva los festivos locales ('manual'); solo reemplaza los 'builtin' de ese año.
  ipcMain.handle('festivos:loadYear', (_, data: { ccaa: string; isla?: string | null; year: number }) => {
    const { ccaa, isla, year } = data
    const anio = FESTIVOS_POR_ANIO[year]
    if (!anio) {
      return { success: false, error: `No hay datos oficiales cargados para el año ${year}.` }
    }

    const db = getDb()
    const run = db.transaction(() => {
      db.prepare("DELETE FROM festivos WHERE year = ? AND source = 'builtin'").run(year)
      const ins = db.prepare(`
        INSERT INTO festivos (year, fecha, nombre, ambito, ccaa, isla, municipio, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'builtin')
      `)
      let count = 0
      for (const f of anio.nacionalesYAutonomicos) {
        if (f.ambito === 'nacional') {
          ins.run(year, `${year}-${f.fecha}`, f.nombre, 'nacional', null, null, null)
          count++
        } else if (f.ccaas?.includes(ccaa)) {
          ins.run(year, `${year}-${f.fecha}`, f.nombre, 'autonomico', ccaa, null, null)
          count++
        }
      }
      if (ccaa === 'CN' && isla) {
        for (const i of anio.insularesCanarias) {
          if (i.islas.includes(isla)) {
            ins.run(year, `${year}-${i.fecha}`, i.nombre, 'insular', 'CN', isla, null)
            count++
          }
        }
      }
      return count
    })

    const count = run()
    return { success: true, count }
  })

  ipcMain.handle('festivos:getByYear', (_, year: number) => {
    return getDb().prepare('SELECT * FROM festivos WHERE year = ? ORDER BY fecha ASC').all(year)
  })

  // Alta de un festivo local (2 por municipio). fecha en formato 'YYYY-MM-DD'.
  ipcMain.handle('festivos:addLocal', (_, data: { year: number; fecha: string; nombre: string; municipio?: string | null }) => {
    getDb().prepare(`
      INSERT INTO festivos (year, fecha, nombre, ambito, ccaa, isla, municipio, source)
      VALUES (?, ?, ?, 'local', NULL, NULL, ?, 'manual')
    `).run(data.year, data.fecha, data.nombre || 'Festivo local', data.municipio ?? null)
    return { success: true }
  })

  ipcMain.handle('festivos:delete', (_, id: number) => {
    getDb().prepare('DELETE FROM festivos WHERE id = ?').run(id)
    return { success: true }
  })
}

/**
 * Devuelve el conjunto de fechas festivas ('YYYY-MM-DD') de un año, para poder
 * excluirlas en cálculos de días hábiles/plazos. Reutilizable desde otros handlers.
 */
export function getFestivosSet(year: number): Set<string> {
  const rows = getDb().prepare('SELECT fecha FROM festivos WHERE year = ?').all(year) as { fecha: string }[]
  return new Set(rows.map((r) => r.fecha))
}
