import { useEffect, useRef, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@components/layout/Layout'
import LockScreen from '@components/LockScreen'
import { CertPickerProvider } from '@contexts/CertPickerContext'
import Dashboard from '@pages/Dashboard'
import Clients from '@pages/Clients'
import Certificates from '@pages/Certificates'
import TramitesAEAT from '@pages/TramitesAEAT'
import TramitesTGSS from '@pages/TramitesTGSS'
import Calendar from '@pages/Calendar'
import Notifications from '@pages/Notifications'
import Settings from '@pages/Settings'
import AccesosDirectos from '@pages/AccesosDirectos'

export default function App() {
  const [locked, setLocked] = useState(false)
  const [lockTimeout, setLockTimeout] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.api.settings.get('lock_timeout_minutes').then((val) => {
      setLockTimeout(parseInt((val as string) ?? '0') || 0)
    })
  }, [])

  useEffect(() => {
    if (lockTimeout <= 0 || locked) return

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setLocked(true), lockTimeout * 60 * 1000)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, reset))
    reset()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [lockTimeout, locked])

  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} />
  }

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CertPickerProvider>
      <Layout onLock={() => setLocked(true)}>
        <Routes>
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
          <Route path="/inicio" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/accesos-directos" element={<AccesosDirectos />} />
          <Route path="/tramites/aeat" element={<TramitesAEAT />} />
          <Route path="/tramites/tgss" element={<TramitesTGSS />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      </CertPickerProvider>
    </HashRouter>
  )
}
