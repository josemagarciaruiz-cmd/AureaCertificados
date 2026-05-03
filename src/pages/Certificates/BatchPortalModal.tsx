import { useState } from 'react'

interface Cert {
  id: number
  alias: string
  client_name: string
  serial_number: string
}

interface Props {
  certs: Cert[]
  onClose: () => void
}

const PORTALS = [
  {
    group: 'Seguridad Social — TUSS',
    items: [
      { label: 'Vida laboral', url: 'https://sede-tu.seg-social.gob.es/wps/portal/sede-tu/inicio' },
      { label: 'Bases de cotización', url: 'https://sede-tu.seg-social.gob.es/wps/portal/sede-tu/inicio' },
      { label: 'Simulación de jubilación', url: 'https://sede-tu.seg-social.gob.es/wps/portal/sede-tu/inicio' },
    ],
  },
  {
    group: 'Seguridad Social — Sede Electrónica',
    items: [
      { label: 'Corriente de pago', url: 'https://sede.seg-social.gob.es/wps/portal/sede/sede/Ciudadanos' },
      { label: 'Afiliación y CCC', url: 'https://sede.seg-social.gob.es/wps/portal/sede/sede/EmpresasyProfesionales' },
    ],
  },
  {
    group: 'IMPORTASS — Autónomos',
    items: [
      { label: 'IDC — Informe de Datos de Cotización', url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Informes+y+certificados' },
      { label: 'Gestiones RETA', url: 'https://portal.seg-social.gob.es/wps/portal/importass' },
    ],
  },
  {
    group: 'AEAT — Sede Electrónica',
    items: [
      { label: 'Sede principal', url: 'https://sede.agenciatributaria.gob.es/Sede/inicio.html' },
      { label: 'Consulta declaraciones presentadas', url: 'https://sede.agenciatributaria.gob.es/Sede/consultas-informatizadas/declaraciones-censales/consulta-declaraciones-presentadas.html' },
    ],
  },
  {
    group: 'DEHU',
    items: [
      { label: 'Notificaciones electrónicas', url: 'https://dehu.redsara.es/' },
    ],
  },
]

export default function BatchPortalModal({ certs, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const [done, setDone] = useState(false)

  const handleLaunch = async () => {
    if (!selected) return
    setLaunching(true)
    await window.api.certificates.openBatchPortal({
      certs: certs.map((c) => ({ id: c.id, serialNumber: c.serial_number, alias: c.alias })),
      url: selected,
    })
    setLaunching(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="card w-full max-w-2xl p-0" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}>
          <div>
            <div className="kicker mb-1">Acceso múltiple</div>
            <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
              Selecciona el portal
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
          {/* Selected certs summary */}
          <div className="mb-5 p-3" style={{ background: 'var(--color-bg-secondary)', borderLeft: '2px solid var(--color-accent)' }}>
            <div className="kicker mb-2" style={{ fontSize: '9px' }}>
              {certs.length} certificado{certs.length !== 1 ? 's' : ''} seleccionado{certs.length !== 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              {certs.map((c) => (
                <span key={c.id} className="badge badge-pending" style={{ fontSize: '11px' }}>
                  {c.alias}{c.client_name ? ` · ${c.client_name}` : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Portal list */}
          <div className="space-y-4">
            {PORTALS.map((group) => (
              <div key={group.group}>
                <div className="kicker mb-2" style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>
                  {group.group}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.url + item.label}
                      className="w-full flex items-center justify-between px-4 py-3 border transition-all"
                      style={{
                        background: selected === item.url && selected !== null && group.items.find(i => i.label === item.label && i.url === selected)
                          ? 'var(--color-accent-dim)'
                          : 'var(--color-bg-secondary)',
                        borderColor: selected === item.url ? 'var(--color-accent)' : 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        textAlign: 'left',
                      }}
                      onClick={() => setSelected(item.url === selected ? null : item.url)}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.label}</span>
                      {selected === item.url && (
                        <span style={{ fontSize: '11px', color: 'var(--color-accent)' }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}>
          {done ? (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              ✓ Se han abierto {certs.length} ventana{certs.length !== 1 ? 's' : ''}. Selecciona el certificado en cada una si el portal lo solicita.
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Se abrirá una ventana por certificado. Si el portal admite identificación automática se seleccionará el correcto.
            </p>
          )}
          <div className="flex gap-2" style={{ flexShrink: 0, marginLeft: '1rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              {done ? 'Cerrar' : 'Cancelar'}
            </button>
            {!done && (
              <button
                className="btn-primary"
                onClick={handleLaunch}
                disabled={!selected || launching}
              >
                {launching ? 'Abriendo...' : `Abrir ${certs.length} ventana${certs.length !== 1 ? 's' : ''} →`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
