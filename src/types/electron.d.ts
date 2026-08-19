export {}

declare global {
  interface Window {
    api: {
      app: {
        getVersion: () => Promise<string>
        openExternal: (url: string) => Promise<void>
      }
      dialog: {
        openFile: (options: {
          title?: string
          filters?: Array<{ name: string; extensions: string[] }>
          properties?: string[]
        }) => Promise<{ canceled: boolean; filePaths: string[] }>
        saveFile: (options: {
          title?: string
          filters?: Array<{ name: string; extensions: string[] }>
          defaultPath?: string
        }) => Promise<{ canceled: boolean; filePath?: string }>
      }
      clients: {
        getAll: () => Promise<unknown[]>
        getById: (id: number) => Promise<unknown>
        create: (data: unknown) => Promise<unknown>
        update: (id: number, data: unknown) => Promise<unknown>
        delete: (id: number) => Promise<unknown>
        search: (query: string) => Promise<unknown[]>
      }
      certificates: {
        getAll: () => Promise<unknown[]>
        getAllMeta: () => Promise<unknown[]>
        getByClient: (clientId: number) => Promise<unknown[]>
        import: (data: unknown) => Promise<unknown>
        delete: (id: number) => Promise<unknown>
        getAuditLog: (certId?: number) => Promise<unknown[]>
        openPortal: (certId: number, url: string) => Promise<unknown>
        openBatchPortal: (data: { certs: Array<{ id: number; serialNumber: string; alias: string }>; url: string }) => Promise<unknown>
        scanOsStore: () => Promise<unknown[]>
        cleanOsStore: () => Promise<{ cleaned: number }>
        importFromOsStore: (data: { thumbprint: string; alias: string; clientId: number | null; masterPassword: string; password?: string }) => Promise<unknown>
        parseP12: (filePath: string, password: string) => Promise<unknown>
        openPortalWithCert: (data: { certId: number; url: string; masterPassword: string }) => Promise<unknown>
      }
      procedures: {
        getAll: (clientId?: number) => Promise<unknown[]>
        getById: (id: number) => Promise<unknown>
        create: (data: unknown) => Promise<unknown>
        update: (id: number, data: unknown) => Promise<unknown>
        delete: (id: number) => Promise<unknown>
        getUpcoming: (days: number) => Promise<unknown[]>
      }
      calendar: {
        getDeadlines: (year: number, month?: number) => Promise<unknown[]>
        getUpcoming: (days: number) => Promise<unknown[]>
        importIcs: (filePath: string) => Promise<unknown>
        getImportedCalendars: () => Promise<unknown[]>
        deleteImportedCalendar: (id: number) => Promise<unknown>
      }
      notifications: {
        getAll: (clientId?: number) => Promise<unknown[]>
        getById: (id: number) => Promise<unknown>
        updateStatus: (id: number, status: string) => Promise<unknown>
        delete: (id: number) => Promise<unknown>
        generateAlerts: () => Promise<unknown>
      }
      customTramites: {
        getAll: () => Promise<unknown[]>
        getByCategory: (category: string) => Promise<unknown[]>
        create: (data: { name: string; category: string; subcategory?: string; portal_url: string; description: string }) => Promise<{ id: number }>
        update: (id: number, data: { name?: string; portal_url?: string; description?: string; subcategory?: string }) => Promise<unknown>
        delete: (id: number) => Promise<unknown>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: unknown) => Promise<unknown>
        getAll: () => Promise<Record<string, string>>
        setLockPassword: (password: string) => Promise<unknown>
        verifyLockPassword: (password: string) => Promise<boolean>
        removeLockPassword: () => Promise<unknown>
      }
      shortcuts: {
        getAll: () => Promise<unknown[]>
        getTop: (limit?: number) => Promise<unknown[]>
        create: (data: { name: string; url: string; certificate_id: number | null; color: string; notes?: string }) => Promise<unknown>
        update: (id: number, data: { name?: string; url?: string; certificate_id?: number | null; color?: string; notes?: string }) => Promise<unknown>
        delete: (id: number) => Promise<unknown>
        recordUse: (id: number) => Promise<unknown>
      }
      festivos: {
        getLocations: () => Promise<{
          ccaa: Array<{ code: string; name: string }>
          islas: Array<{ code: string; name: string }>
          anios: number[]
        }>
        loadYear: (data: { ccaa: string; isla?: string | null; year: number }) => Promise<{ success: boolean; count?: number; error?: string }>
        getByYear: (year: number) => Promise<Array<{
          id: number
          year: number
          fecha: string
          nombre: string
          ambito: 'nacional' | 'autonomico' | 'insular' | 'local'
          ccaa: string | null
          isla: string | null
          municipio: string | null
          source: 'builtin' | 'manual' | 'import'
        }>>
        addLocal: (data: { year: number; fecha: string; nombre: string; municipio?: string | null }) => Promise<{ success: boolean }>
        delete: (id: number) => Promise<{ success: boolean }>
      }
    }
  }
}
