import { useEffect, useState } from 'react'
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

export default function Calendar() {
  const [year, setYear] = useState(2026)
  const [activeMonth, setActiveMonth] = useState<number | null>(null)
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [importedCalendars, setImportedCalendars] = useState<ImportedCalendar[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const load = async () => {
    const [dl, ic] = await Promise.all([
      window.api.calendar.getDeadlines(year, activeMonth ?? undefined),
      window.api.calendar.getImportedCalendars(),
    ])
    setDeadlines(dl as Deadline[])
    setImportedCalendars(ic as ImportedCalendar[])
  }

  useEffect(() => { load() }, [year, activeMonth])

  const filtered = deadlines.filter(
    (d) => activeCategory === 'all' || d.category === activeCategory
  )

  const byMonth = MONTH_NAMES.reduce<Record<number, Deadline[]>>((acc, _, i) => {
    acc[i + 1] = filtered.filter((d) => d.month === i + 1)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Plazos oficiales</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {deadlines.length} plazos · Calendario {year}
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
        <div className="kicker mb-1" style={{ fontSize: '9px' }}>Cómo actualizar el calendario cada año</div>
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
            if (items.length === 0) return null
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
                  <span className="badge badge-accent">{items.length}</span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
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
