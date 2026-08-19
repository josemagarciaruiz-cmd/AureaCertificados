import { useEffect, useState, type CSSProperties } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Deadline {
  id: number
  year: number
  month: number
  due_date: string
  model_number: string
  name: string
  category: string
  periodicity: string
  period: string
  source: string
}

interface ImportedCalendar {
  id: number
  name: string
  year: number
  events_count: number
  imported_at: string
}

interface Festivo {
  id: number
  year: number
  fecha: string
  nombre: string
  ambito: 'nacional' | 'autonomico' | 'insular' | 'local'
  ccaa: string | null
  isla: string | null
  municipio: string | null
  source: 'builtin' | 'manual' | 'import'
}

interface Locations {
  ccaa: Array<{ code: string; name: string }>
  islas: Array<{ code: string; name: string }>
  anios: number[]
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const CATEGORY_COLORS: Record<string, string> = {
  irpf: '#60a5fa',
  iva: '#a78bfa',
  sociedades: '#fb923c',
  retenciones: '#34d399',
  informativas: '#f472b6',
  ss: '#facc15',
  otros: '#71717a',
}

const FESTIVO_COLORS: Record<Festivo['ambito'], string> = {
  nacional: '#e05a5a',
  autonomico: '#e0a34a',
  insular: '#4aa3e0',
  local: '#8b5cf6',
}

const FESTIVO_LABELS: Record<Festivo['ambito'], string> = {
  nacional: 'Nacional',
  autonomico: 'Autonómico',
  insular: 'Insular',
  local: 'Local',
}

const inputStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  padding: '0.4rem 0.6rem',
  fontSize: '12px',
  borderRadius: '2px',
}

export default function Calendar() {
  const [year, setYear] = useState(2026)
  const [activeMonth, setActiveMonth] = useState<number | null>(null)
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [importedCalendars, setImportedCalendars] = useState<ImportedCalendar[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  // ── Calendario laboral (festivos) ──
  const [festivos, setFestivos] = useState<Festivo[]>([])
  const [locations, setLocations] = useState<Locations>({ ccaa: [], islas: [], anios: [] })
  const [ccaa, setCcaa] = useState('')
  const [isla, setIsla] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [festMsg, setFestMsg] = useState('')
  const [loadingFest, setLoadingFest] = useState(false)
  const [localFecha, setLocalFecha] = useState('')
  const [localNombre, setLocalNombre] = useState('')
  const [showFestConfig, setShowFestConfig] = useState(false)

  const load = async () => {
    const [dl, ic, fest] = await Promise.all([
      window.api.calendar.getDeadlines(year, activeMonth ?? undefined),
      window.api.calendar.getImportedCalendars(),
      window.api.festivos.getByYear(year),
    ])
    setDeadlines(dl as Deadline[])
    setImportedCalendars(ic as ImportedCalendar[])
    setFestivos(fest as Festivo[])
  }

  useEffect(() => { load() }, [year, activeMonth])

  // Carga inicial de catálogo de ubicaciones y ubicación guardada.
  useEffect(() => {
    (async () => {
      const locs = await window.api.festivos.getLocations()
      setLocations(locs)
      const s = await window.api.settings.getAll()
      setCcaa(s.festivos_ccaa || '')
      setIsla(s.festivos_isla || '')
      setMunicipio(s.festivos_municipio || '')
      if (!s.festivos_ccaa) setShowFestConfig(true)
    })()
  }, [])

  const filtered = deadlines.filter(
    (d) => activeCategory === 'all' || d.category === activeCategory
  )

  const byMonth = MONTH_NAMES.reduce<Record<number, Deadline[]>>((acc, _, i) => {
    acc[i + 1] = filtered.filter((d) => d.month === i + 1)
    return acc
  }, {})

  const festByMonth = MONTH_NAMES.reduce<Record<number, Festivo[]>>((acc, _, i) => {
    acc[i + 1] = festivos.filter((f) => parseInt(f.fecha.slice(5, 7), 10) === i + 1)
    return acc
  }, {})

  const handleImportIcs = async () => {
    const result = await window.api.dialog.openFile({
      title: 'Importar calendario AEAT (.ics)',
      filters: [{ name: 'Calendario iCal', extensions: ['ics'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return
    setImporting(true)
    setImportMsg('')
    try {
      const res = await window.api.calendar.importIcs(result.filePaths[0]) as { success: boolean; imported?: number; year?: number; error?: string }
      if (res.success) {
        setImportMsg(`✓ Importados ${res.imported} eventos del año ${res.year}`)
        load()
      } else {
        setImportMsg(`✗ Error: ${res.error}`)
      }
    } catch {
      setImportMsg('✗ Error al importar el archivo')
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteCalendar = async (id: number) => {
    if (!confirm('¿Eliminar este calendario importado y todos sus eventos?')) return
    await window.api.calendar.deleteImportedCalendar(id)
    load()
  }

  const handleSaveLocation = async () => {
    await window.api.settings.set('festivos_ccaa', ccaa)
    await window.api.settings.set('festivos_isla', ccaa === 'CN' ? isla : '')
    await window.api.settings.set('festivos_municipio', municipio)
    setFestMsg('✓ Ubicación guardada')
  }

  const handleLoadFestivos = async () => {
    if (!ccaa) { setFestMsg('✗ Elige primero la comunidad autónoma'); return }
    setLoadingFest(true)
    setFestMsg('')
    try {
      await handleSaveLocation()
      const res = await window.api.festivos.loadYear({ ccaa, isla: ccaa === 'CN' ? isla : null, year })
      if (res.success) {
        setFestMsg(`✓ Cargados ${res.count} festivos oficiales de ${year}`)
        load()
      } else {
        setFestMsg(`✗ ${res.error}`)
      }
    } catch {
      setFestMsg('✗ Error al cargar los festivos')
    } finally {
      setLoadingFest(false)
    }
  }

  const handleAddLocal = async () => {
    if (!localFecha || !localNombre) { setFestMsg('✗ Indica fecha y nombre del festivo local'); return }
    await window.api.festivos.addLocal({ year, fecha: localFecha, nombre: localNombre, municipio: municipio || null })
    setLocalFecha('')
    setLocalNombre('')
    setFestMsg('✓ Festivo local añadido')
    load()
  }

  const handleDeleteFestivo = async (id: number) => {
    await window.api.festivos.delete(id)
    load()
  }

  const localCount = festivos.filter((f) => f.ambito === 'local').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Plazos oficiales</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {deadlines.length} plazos · {festivos.length} festivos · Calendario {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <button className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }} onClick={() => setYear(y => y - 1)}>← {year - 1}</button>
            <span className="btn-primary" style={{ pointerEvents: 'none' }}>{year}</span>
            <button className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }} onClick={() => setYear(y => y + 1)}>{year + 1} →</button>
          </div>
          <button className="btn-secondary" onClick={handleImportIcs} disabled={importing}>
            {importing ? 'Importando...' : '↑ Importar .ics AEAT'}
          </button>
        </div>
      </div>

      {importMsg && (
        <div className={`badge ${importMsg.startsWith('✓') ? 'badge-ok' : 'badge-critical'} mb-4 p-3`} style={{ fontSize: '12px' }}>
          {importMsg}
        </div>
      )}

      {/* Calendario laboral (festivos) */}
      <div className="card p-4 mb-5" style={{ borderColor: FESTIVO_COLORS.nacional, borderLeft: `2px solid ${FESTIVO_COLORS.nacional}` }}>
        <div className="flex items-center justify-between">
          <div className="kicker" style={{ fontSize: '9px' }}>Calendario laboral · Festivos</div>
          <button className="btn-ghost" style={{ fontSize: '11px' }} onClick={() => setShowFestConfig(v => !v)}>
            {showFestConfig ? 'Ocultar configuración ▲' : 'Configurar ubicación ▼'}
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '0.4rem' }}>
          {ccaa
            ? <>Ubicación: <strong>{locations.ccaa.find(c => c.code === ccaa)?.name ?? ccaa}</strong>
                {ccaa === 'CN' && isla && <> · <strong>{locations.islas.find(i => i.code === isla)?.name ?? isla}</strong></>}
                {municipio && <> · <strong>{municipio}</strong></>}
                {' · '}{festivos.length} festivos cargados · {localCount}/2 locales</>
            : 'Sin ubicación configurada. Elige tu comunidad, isla y municipio para cargar los festivos oficiales.'}
        </p>

        {festMsg && (
          <div className={`badge ${festMsg.startsWith('✓') ? 'badge-ok' : 'badge-critical'} mt-3`} style={{ fontSize: '11px', padding: '0.4rem 0.6rem' }}>
            {festMsg}
          </div>
        )}

        {showFestConfig && (
          <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Ubicación */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Comunidad autónoma
                <select style={{ ...inputStyle, minWidth: '200px' }} value={ccaa} onChange={(e) => { setCcaa(e.target.value); if (e.target.value !== 'CN') setIsla('') }}>
                  <option value="">— Selecciona —</option>
                  {locations.ccaa.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>

              {ccaa === 'CN' && (
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  Isla
                  <select style={{ ...inputStyle, minWidth: '160px' }} value={isla} onChange={(e) => setIsla(e.target.value)}>
                    <option value="">— Selecciona —</option>
                    {locations.islas.map((i) => <option key={i.code} value={i.code}>{i.name}</option>)}
                  </select>
                </label>
              )}

              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Municipio (para festivos locales)
                <input style={{ ...inputStyle, minWidth: '180px' }} value={municipio} placeholder="Ej. Arrecife" onChange={(e) => setMunicipio(e.target.value)} />
              </label>

              <button className="btn-primary" style={{ padding: '0.5rem 0.9rem' }} onClick={handleLoadFestivos} disabled={loadingFest}>
                {loadingFest ? 'Cargando...' : `↓ Cargar festivos ${year}`}
              </button>
              <button className="btn-secondary" style={{ padding: '0.5rem 0.9rem' }} onClick={handleSaveLocation}>Guardar ubicación</button>
            </div>

            {/* Alta de festivos locales */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
              <div className="kicker mb-2" style={{ fontSize: '9px' }}>Festivos locales (2 por municipio — se introducen a mano)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <input type="date" style={inputStyle} value={localFecha} min={`${year}-01-01`} max={`${year}-12-31`} onChange={(e) => setLocalFecha(e.target.value)} />
                <input style={{ ...inputStyle, minWidth: '220px' }} value={localNombre} placeholder="Nombre del festivo local" onChange={(e) => setLocalNombre(e.target.value)} />
                <button className="btn-secondary" style={{ padding: '0.45rem 0.8rem' }} onClick={handleAddLocal}>+ Añadir local</button>
              </div>
            </div>

            {/* Leyenda + descarga */}
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              Datos oficiales: nacionales y autonómicos según la Resolución de la Dirección General de Trabajo (BOE); insulares de Canarias según el Decreto del Gobierno de Canarias.
              Los <strong>locales</strong> se publican en el boletín provincial de cada municipio y se añaden a mano.
            </p>
          </div>
        )}
      </div>

      {/* Calendarios importados */}
      {importedCalendars.length > 0 && (
        <div className="card p-4 mb-5">
          <div className="kicker mb-3" style={{ fontSize: '9px' }}>Calendarios importados manualmente</div>
          <div className="flex flex-wrap gap-3">
            {importedCalendars.map((ic) => (
              <div key={ic.id} className="flex items-center gap-2 p-2 border" style={{ borderColor: 'var(--color-border)', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-accent)' }}>{ic.name}</span>
                <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                  {ic.events_count} eventos · {new Date(ic.imported_at).toLocaleDateString('es-ES')}
                </span>
                <button onClick={() => handleDeleteCalendar(ic.id)} style={{ color: 'var(--color-danger)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instrucción importación */}
      <div className="card p-4 mb-5" style={{ borderColor: 'var(--color-accent)', borderLeft: '2px solid var(--color-accent)' }}>
        <div className="kicker mb-1" style={{ fontSize: '9px' }}>Cómo actualizar el calendario fiscal cada año</div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
          1. Ve a <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/icalendar.html</span><br />
          2. Descarga el archivo <strong>.ics</strong> del año correspondiente<br />
          3. Usa el botón <strong>↑ Importar .ics AEAT</strong> de arriba para cargarlo en la aplicación
        </p>
      </div>

      {/* Filtros categoría */}
      <div className="flex flex-wrap gap-1 mb-5">
        {[{ id: 'all', label: 'Todos', color: 'var(--color-text-muted)' },
          { id: 'irpf', label: 'IRPF', color: CATEGORY_COLORS.irpf },
          { id: 'iva', label: 'IVA', color: CATEGORY_COLORS.iva },
          { id: 'sociedades', label: 'Sociedades', color: CATEGORY_COLORS.sociedades },
          { id: 'retenciones', label: 'Retenciones', color: CATEGORY_COLORS.retenciones },
          { id: 'informativas', label: 'Informativas', color: CATEGORY_COLORS.informativas },
          { id: 'ss', label: 'SS', color: CATEGORY_COLORS.ss },
        ].map((c) => (
          <button
            key={c.id}
            className={activeCategory === c.id ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.75rem', fontSize: '10px' }}
            onClick={() => setActiveCategory(c.id)}
          >
            {c.label}
          </button>
        ))}

        <button
          className={activeMonth === null ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.4rem 0.75rem', fontSize: '10px', marginLeft: 'auto' }}
          onClick={() => setActiveMonth(null)}
        >
          Todo el año
        </button>
      </div>

      {/* Vista anual por mes */}
      {activeMonth === null ? (
        <div className="grid grid-cols-2 gap-4">
          {MONTH_NAMES.map((monthName, idx) => {
            const month = idx + 1
            const items = byMonth[month] ?? []
            const fest = festByMonth[month] ?? []
            if (items.length === 0 && fest.length === 0) return null
            return (
              <div key={month} className="card p-0">
                <div
                  className="px-4 py-3 border-b flex items-center justify-between cursor-pointer"
                  style={{ borderColor: 'var(--color-border)' }}
                  onClick={() => setActiveMonth(month)}
                >
                  <div className="font-serif font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {monthName}
                  </div>
                  <div className="flex gap-1">
                    {fest.length > 0 && <span className="badge" style={{ color: FESTIVO_COLORS.nacional, borderColor: `${FESTIVO_COLORS.nacional}40`, background: `${FESTIVO_COLORS.nacional}10` }}>{fest.length} fest.</span>}
                    {items.length > 0 && <span className="badge badge-accent">{items.length}</span>}
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {fest.map((f) => (
                    <div key={`f-${f.id}`} className="flex items-center gap-3 px-4 py-2">
                      <div className="w-1 h-6" style={{ background: FESTIVO_COLORS[f.ambito], flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                          <span style={{ color: FESTIVO_COLORS[f.ambito], fontSize: '10px', marginRight: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{FESTIVO_LABELS[f.ambito]}</span>
                          {f.nombre}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {format(parseISO(f.fecha), 'd MMM', { locale: es })}
                      </div>
                    </div>
                  ))}
                  {items.slice(0, 4).map((d) => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-2">
                      <div className="w-1 h-6" style={{ background: CATEGORY_COLORS[d.category] ?? '#71717a', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                          {d.model_number && <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginRight: '0.4rem' }}>M-{d.model_number}</span>}
                          {d.name.length > 50 ? d.name.substring(0, 50) + '...' : d.name}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {format(parseISO(d.due_date), 'd MMM', { locale: es })}
                      </div>
                    </div>
                  ))}
                  {items.length > 4 && (
                    <div className="px-4 py-2 text-center">
                      <button className="btn-ghost" style={{ fontSize: '11px' }} onClick={() => setActiveMonth(month)}>
                        Ver {items.length - 4} más →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button className="btn-ghost" onClick={() => setActiveMonth(null)}>← Volver al año</button>
            <h2 className="font-serif font-bold text-2xl" style={{ color: 'var(--color-text-primary)' }}>
              {MONTH_NAMES[activeMonth - 1]} {year}
            </h2>
          </div>

          {/* Festivos del mes */}
          {(festByMonth[activeMonth] ?? []).length > 0 && (
            <div className="card p-0 mb-4">
              <div className="px-4 py-2 border-b kicker" style={{ borderColor: 'var(--color-border)', fontSize: '9px' }}>Festivos</div>
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {(festByMonth[activeMonth] ?? []).map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-2">
                    <div className="w-1 h-6" style={{ background: FESTIVO_COLORS[f.ambito], flexShrink: 0 }} />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: FESTIVO_COLORS[f.ambito], whiteSpace: 'nowrap', minWidth: '150px' }}>
                      {format(parseISO(f.fecha), "EEEE, d 'de' MMMM", { locale: es })}
                    </div>
                    <div style={{ flex: 1, color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '13px' }}>{f.nombre}</div>
                    <span className="badge" style={{ color: FESTIVO_COLORS[f.ambito], borderColor: `${FESTIVO_COLORS[f.ambito]}40`, background: `${FESTIVO_COLORS[f.ambito]}10` }}>
                      {FESTIVO_LABELS[f.ambito]}
                    </span>
                    {f.source === 'manual' && (
                      <button onClick={() => handleDeleteFestivo(f.id)} style={{ color: 'var(--color-danger)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-0">
            <table className="table-aurea">
              <thead>
                <tr>
                  <th>Fecha límite</th>
                  <th>Modelo</th>
                  <th>Trámite</th>
                  <th>Categoría</th>
                  <th>Periodo</th>
                  <th>Origen</th>
                </tr>
              </thead>
              <tbody>
                {(byMonth[activeMonth] ?? []).map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--color-accent)' }}>
                      {format(parseISO(d.due_date), "EEEE, d 'de' MMMM", { locale: es })}
                    </td>
                    <td>
                      {d.model_number && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>
                          {d.model_number}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '13px' }}>{d.name}</td>
                    <td>
                      <span className="badge" style={{ color: CATEGORY_COLORS[d.category], borderColor: `${CATEGORY_COLORS[d.category]}40`, background: `${CATEGORY_COLORS[d.category]}10` }}>
                        {d.category}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{d.period || '—'}</td>
                    <td>
                      <span className={`badge ${d.source === 'ics_import' ? 'badge-accent' : 'badge-pending'}`}>
                        {d.source === 'ics_import' ? 'Importado' : 'Integrado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
