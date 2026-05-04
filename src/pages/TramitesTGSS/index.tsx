import { useState } from 'react'
import { TGSS_TRAMITES, TGSS_BLOCKS, type TgssTramite } from '@data/tgss-tramites'
import CertPickerModal from '@components/CertPickerModal'
import InlineUrlEdit from '@components/InlineUrlEdit'
import { useUrlOverrides } from '@hooks/useUrlOverrides'

export default function TramitesTGSS() {
  const [search, setSearch] = useState('')
  const [activeBlock, setActiveBlock] = useState<string>('all')
  const [certPicker, setCertPicker] = useState<TgssTramite | null>(null)
  const { get: getUrl, isOverridden, save: saveUrl, reset: resetUrl } = useUrlOverrides('tgss_url_overrides')

  const filtered = TGSS_TRAMITES.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.block.toLowerCase().includes(search.toLowerCase())
    const matchBlock = activeBlock === 'all' || t.category === activeBlock
    return matchSearch && matchBlock
  })

  const blockColor: Record<string, string> = Object.fromEntries(
    TGSS_BLOCKS.map((b) => [b.id, b.color])
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Seguridad Social</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {TGSS_TRAMITES.length} trámites disponibles · TGSS + INSS + SEPE
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="field-input"
          style={{ width: '280px' }}
          placeholder="Buscar trámite..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          <button
            className={activeBlock === 'all' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.5rem 0.85rem', fontSize: '10px' }}
            onClick={() => setActiveBlock('all')}
          >
            Todos
          </button>
          {TGSS_BLOCKS.map((b) => (
            <button
              key={b.id}
              className={activeBlock === b.id ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 0.85rem', fontSize: '10px' }}
              onClick={() => setActiveBlock(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0">
        <table className="table-aurea">
          <thead>
            <tr>
              <th>Trámite</th>
              <th>Bloque</th>
              <th>Sistema</th>
              <th>Descripción</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  Sin resultados
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const url = getUrl(t.id, t.portal_url)
              return (
                <tr key={t.id}>
                  <td style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '13px', maxWidth: '220px' }}>
                    {t.name}
                    {t.notes && (
                      <div style={{ fontSize: '10px', color: 'var(--color-warning)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        ⚠ {t.notes}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        color: blockColor[t.category] || 'var(--color-text-muted)',
                        borderColor: `${blockColor[t.category] || ''}40`,
                        background: `${blockColor[t.category] || ''}10`,
                        fontSize: '10px',
                      }}
                    >
                      {t.block}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {t.system}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '300px' }}>
                    {t.description}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        className="btn-ghost"
                        style={{ fontSize: '11px' }}
                        onClick={() => window.api.app.openExternal(url)}
                      >
                        Sede →
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: '11px', color: 'var(--color-accent)' }}
                        onClick={() => setCertPicker(t)}
                      >
                        Con cert. →
                      </button>
                      <InlineUrlEdit
                        id={t.id}
                        defaultUrl={url}
                        isOverridden={isOverridden(t.id)}
                        onSave={saveUrl}
                        onReset={resetUrl}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {certPicker && (
        <CertPickerModal
          tramiteName={certPicker.name}
          portalUrl={getUrl(certPicker.id, certPicker.portal_url)}
          onClose={() => setCertPicker(null)}
        />
      )}
    </div>
  )
}
