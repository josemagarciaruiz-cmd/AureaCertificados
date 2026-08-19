import { useState } from 'react'
import { JUSTICIA_TRAMITES, JUSTICIA_BLOCKS, type JusticiaTramite } from '@data/justicia-tramites'
import CertPickerModal from '@components/CertPickerModal'
import InlineUrlEdit from '@components/InlineUrlEdit'
import CustomTramitesSection from '@components/CustomTramitesSection'
import { useUrlOverrides } from '@hooks/useUrlOverrides'

const LEXNET_ID = 'lexnet'

export default function TramitesJusticia() {
  const [search, setSearch] = useState('')
  const [activeBlock, setActiveBlock] = useState<string>('all')
  const [certPicker, setCertPicker] = useState<JusticiaTramite | null>(null)
  const { get: getUrl, isOverridden, save: saveUrl, reset: resetUrl } = useUrlOverrides('justicia_url_overrides')

  const lexnet = JUSTICIA_TRAMITES.find((t) => t.id === LEXNET_ID)

  const filtered = JUSTICIA_TRAMITES.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.block.toLowerCase().includes(search.toLowerCase())
    const matchBlock = activeBlock === 'all' || t.category === activeBlock
    return matchSearch && matchBlock
  })

  const blockColor: Record<string, string> = Object.fromEntries(
    JUSTICIA_BLOCKS.map((b) => [b.id, b.color])
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kicker mb-1">Administración de Justicia</div>
          <div className="divider-gold-thin mb-3" style={{ width: '40px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {JUSTICIA_TRAMITES.length} accesos disponibles · LexNET + Sede Judicial + sistemas autonómicos
          </p>
        </div>
      </div>

      {/* LexNET destacado */}
      {lexnet && (
        <div
          className="card"
          style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', borderLeft: `3px solid ${blockColor.lexnet}` }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div style={{ flex: '1 1 340px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.25em',
                  textTransform: 'uppercase', color: blockColor.lexnet, marginBottom: '0.35rem',
                }}
              >
                Buzón judicial
              </div>
              <div className="font-serif font-bold text-lg" style={{ color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
                LexNET
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.35rem' }}>
                Notificaciones, citaciones y emplazamientos de los juzgados. Los graduados sociales colegiados acceden
                a la jurisdicción social para demandas, papeletas de conciliación y recursos.
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-warning)', lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>
                ⚠ Requiere certificado de colegiado. Firmar y presentar escritos necesita Autofirma instalado en el equipo.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap" style={{ alignSelf: 'center' }}>
              <button
                className="btn-primary"
                style={{ fontSize: '11px' }}
                onClick={() => setCertPicker(lexnet)}
              >
                Abrir con certificado →
              </button>
              <button
                className="btn-ghost"
                style={{ fontSize: '11px' }}
                onClick={() => window.api.app.openExternal(getUrl(lexnet.id, lexnet.portal_url))}
              >
                Abrir sin certificado →
              </button>
            </div>
          </div>
        </div>
      )}

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
          {JUSTICIA_BLOCKS.map((b) => (
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

      <CustomTramitesSection category="justicia" blocks={JUSTICIA_BLOCKS} />

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
