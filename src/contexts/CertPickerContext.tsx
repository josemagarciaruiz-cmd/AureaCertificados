import { createContext, useContext, useState, ReactNode } from 'react'
import CertPickerModal from '@components/CertPickerModal'

interface CertPickerContextType {
  openCertPicker: (tramiteName: string, portalUrl: string) => void
}

const CertPickerContext = createContext<CertPickerContextType>({ openCertPicker: () => {} })

export function CertPickerProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<{ name: string; url: string } | null>(null)

  return (
    <CertPickerContext.Provider value={{ openCertPicker: (name, url) => setConfig({ name, url }) }}>
      {children}
      {config && (
        <CertPickerModal
          tramiteName={config.name}
          portalUrl={config.url}
          onClose={() => setConfig(null)}
        />
      )}
    </CertPickerContext.Provider>
  )
}

export const useCertPicker = () => useContext(CertPickerContext)
