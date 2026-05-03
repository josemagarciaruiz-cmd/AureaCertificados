import { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@components/layout/Layout'
import Dashboard from '@pages/Dashboard'
import Clients from '@pages/Clients'
import Certificates from '@pages/Certificates'
import TramitesAEAT from '@pages/TramitesAEAT'
import TramitesTGSS from '@pages/TramitesTGSS'
import Calendar from '@pages/Calendar'
import Notifications from '@pages/Notifications'
import Settings from '@pages/Settings'

export default function App() {
  const [locked, setLocked] = useState(false)

  if (locked) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-primary">
        <div className="text-center">
          <p className="eyebrow mb-4">Áurea Certificados</p>
          <h1 className="font-serif text-4xl font-bold text-text-primary mb-8">
            Sesión bloqueada
          </h1>
          <button className="btn-primary" onClick={() => setLocked(false)}>
            Desbloquear
          </button>
        </div>
      </div>
    )
  }

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Layout onLock={() => setLocked(true)}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/tramites/aeat" element={<TramitesAEAT />} />
          <Route path="/tramites/tgss" element={<TramitesTGSS />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
