import { NavLink } from 'react-router-dom'

const nav = [
  {
    group: 'Principal',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: IconDashboard },
      { path: '/clients', label: 'Clientes', icon: IconClients },
      { path: '/certificates', label: 'Certificados', icon: IconCert },
      { path: '/notifications', label: 'Notificaciones', icon: IconBell },
    ],
  },
  {
    group: 'Trámites',
    items: [
      { path: '/tramites/aeat', label: 'AEAT', icon: IconAEAT },
      { path: '/tramites/tgss', label: 'TGSS', icon: IconTGSS },
    ],
  },
  {
    group: 'Gestión',
    items: [
      { path: '/calendar', label: 'Calendario Fiscal', icon: IconCalendar },
      { path: '/settings', label: 'Configuración', icon: IconSettings },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col border-r"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="eyebrow mb-1" style={{ fontSize: '9px', letterSpacing: '0.3em' }}>
          Familia Áurea
        </div>
        <div
          className="font-serif font-bold text-xl"
          style={{ color: 'var(--color-text-primary)', lineHeight: 1.1 }}
        >
          Áurea
          <span style={{ color: 'var(--color-accent)' }}>Cert</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {nav.map((group) => (
          <div key={group.group} className="mb-5">
            <div
              className="px-2 mb-2"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
              }}
            >
              {group.group}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 mb-0.5 text-sm transition-all ${
                    isActive
                      ? 'text-accent border-l-2'
                      : 'text-text-secondary hover:text-text-primary border-l-2 border-transparent'
                  }`
                }
                style={({ isActive }) => ({
                  borderLeftColor: isActive ? 'var(--color-accent)' : 'transparent',
                  background: isActive ? 'var(--color-accent-dim)' : 'transparent',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                })}
              >
                <item.icon size={16} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.label}</span>
              </NavLink>
            ))}
            {group.group === 'Trámites' && (
              <button
                className="flex items-center gap-3 px-3 py-2.5 mb-0.5 w-full border-l-2 border-transparent transition-all"
                style={{ color: 'var(--color-text-secondary)', background: 'transparent', textAlign: 'left' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                onClick={() => window.api.app.openExternal('https://dehu.redsara.es/')}
              >
                <IconDEHU size={16} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>DEHU</span>
                <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>↗</span>
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-muted)',
          }}
        >
          v1.0.0
        </div>
      </div>
    </aside>
  )
}

function IconDashboard({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function IconClients({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconCert({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function IconBell({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function IconAEAT({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
    </svg>
  )
}

function IconTGSS({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function IconCalendar({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function IconDEHU({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function IconSettings({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
