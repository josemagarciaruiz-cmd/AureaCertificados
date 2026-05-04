import { useState } from 'react'
import { AEAT_MODELS, AEAT_CATEGORIES, type AeatModel } from '@data/aeat-models'
import CertPickerModal from '@components/CertPickerModal'

export default function TramitesAEAT() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [certPicker, setCertPicker] = useState<AeatModel | null>(null)

  const filtered = AEAT_MODELS.filter((m) => {
    const matchSearch =
      m.model.includes(search) ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || m.category === activeCategory
    return matchSearch && matchCat
  })

  const categoryColor: Record<string, string> = Object.fromEntries(
    AEAT_CATEGORIES.map((c) => [c.id, c.color])
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Agencia Tributaria</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {AEAT_MODELS.length} modelos y trámites disponibles
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => window.api.app.openExternal('https://sede.agenciatributaria.gob.es/Sede/consultas-informatizadas/declaraciones-censales/consulta-declaraciones-presentadas.html')}
        >
          Consulta declaraciones presentadas →
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="field-input"
          style={{ width: '280px' }}
          placeholder="Buscar por nº modelo, nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          <button
            className={activeCategory === 'all' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.5rem 0.85rem', fontSize: '10px' }}
            onClick={() => setActiveCategory('all')}
          >
            Todos
          </button>
          {AEAT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={activeCategory === c.id ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 0.85rem', fontSize: '10px' }}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0">
        <table className="table-aurea">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Periodicidad</th>
              <th>Descripción</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  Sin resultados
                </td>
              </tr>
            )}
            {filtered.map((m) => (
              <tr key={m.model}>
                <td>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--color-accent)',
                    }}
                  >
                    {m.model}
                  </span>
                  {m.notes && (
                    <div style={{ fontSize: '10px', color: 'var(--color-warning)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      ⚠ {m.notes}
                    </div>
                  )}
                </td>
                <td style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '13px', maxWidth: '240px' }}>
                  {m.name}
                </td>
                <td>
                  <span
                    className="badge"
                    style={{
                      color: categoryColor[m.category] || 'var(--color-text-muted)',
                      borderColor: `${categoryColor[m.category] || ''}40`,
                      background: `${categoryColor[m.category] || ''}10`,
                    }}
                  >
                    {m.category}
                  </span>
                </td>
                <td>
                  <span className="badge badge-pending">{m.periodicity}</span>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '300px' }}>
                  {m.description}
                </td>
                <td>
                  <div className="flex gap-1">
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '11px' }}
                      onClick={() => window.api.app.openExternal(m.portal_url)}
                    >
                      Sede →
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '11px', color: 'var(--color-accent)' }}
                      onClick={() => setCertPicker(m)}
                    >
                      Con cert. →
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {certPicker && (
        <CertPickerModal
          tramiteName={certPicker.name}
          portalUrl={certPicker.portal_url}
          onClose={() => setCertPicker(null)}
        />
      )}
    </div>
  )
}
