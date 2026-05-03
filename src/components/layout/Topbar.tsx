import { useLocation } from 'react-router-dom'

const titles: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Dashboard', sub: 'Resumen del despacho' },
  '/clients': { title: 'Clientes', sub: 'Gestión de clientes' },
  '/certificates': { title: 'Certificados', sub: 'Gestión de certificados digitales' },
  '/tramites/aeat': { title: 'Trámites AEAT', sub: 'Agencia Tributaria' },
  '/tramites/tgss': { title: 'Trámites TGSS', sub: 'Seguridad Social' },
  '/calendar': { title: 'Calendario Fiscal', sub: 'Plazos y vencimientos 2026' },
  '/notifications': { title: 'Notificaciones', sub: 'Notificaciones electrónicas' },
  '/settings': { title: 'Configuración', sub: 'Preferencias del despacho' },
}

interface TopbarProps {
  onLock: () => void
}

export default function Topbar({ onLock }: TopbarProps) {
  const location = useLocation()
  const info = titles[location.pathname] ?? { title: 'Áurea Certificados', sub: '' }
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
    >
      <div>
        <h1
          className="font-serif font-bold text-xl"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}
        >
          {info.title}
        </h1>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {info.sub}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.05em',
            textTransform: 'capitalize',
          }}
        >
          {dateStr}
        </span>

        <button
          onClick={onLock}
          className="btn-ghost"
          title="Bloquear sesión"
        >
          <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Bloquear</span>
        </button>
      </div>
    </header>
  )
}
