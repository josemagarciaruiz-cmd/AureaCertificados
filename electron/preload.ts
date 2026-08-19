import { contextBridge, ipcRenderer } from 'electron'

const api = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  },
  dialog: {
    openFile: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('dialog:saveFile', options),
  },
  clients: {
    getAll: () => ipcRenderer.invoke('clients:getAll'),
    getById: (id: number) => ipcRenderer.invoke('clients:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('clients:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('clients:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('clients:delete', id),
    search: (query: string) => ipcRenderer.invoke('clients:search', query),
  },
  certificates: {
    getAll: () => ipcRenderer.invoke('certificates:getAll'),
    getAllMeta: () => ipcRenderer.invoke('certificates:getAllMeta'),
    getByClient: (clientId: number) => ipcRenderer.invoke('certificates:getByClient', clientId),
    import: (data: unknown) => ipcRenderer.invoke('certificates:import', data),
    delete: (id: number) => ipcRenderer.invoke('certificates:delete', id),
    getAuditLog: (certId?: number) => ipcRenderer.invoke('certificates:getAuditLog', certId),
    openPortal: (certId: number, url: string) => ipcRenderer.invoke('certificates:openPortal', certId, url),
    openBatchPortal: (data: { certs: Array<{ id: number; serialNumber: string; alias: string }>; url: string }) =>
      ipcRenderer.invoke('certificates:openBatchPortal', data),
    scanOsStore: () => ipcRenderer.invoke('certificates:scanOsStore'),
    cleanOsStore: () => ipcRenderer.invoke('certificates:cleanOsStore'),
    importFromOsStore: (data: { thumbprint: string; alias: string; clientId: number | null; masterPassword: string }) =>
      ipcRenderer.invoke('certificates:importFromOsStore', data),
    parseP12: (filePath: string, password: string) =>
      ipcRenderer.invoke('certificates:parseP12', filePath, password),
    openPortalWithCert: (data: { certId: number; url: string; masterPassword: string }) =>
      ipcRenderer.invoke('certificates:openPortalWithCert', data),
  },
  procedures: {
    getAll: (clientId?: number) => ipcRenderer.invoke('procedures:getAll', clientId),
    getById: (id: number) => ipcRenderer.invoke('procedures:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('procedures:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('procedures:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('procedures:delete', id),
    getUpcoming: (days: number) => ipcRenderer.invoke('procedures:getUpcoming', days),
  },
  calendar: {
    getDeadlines: (year: number, month?: number) => ipcRenderer.invoke('calendar:getDeadlines', year, month),
    getUpcoming: (days: number) => ipcRenderer.invoke('calendar:getUpcoming', days),
    importIcs: (filePath: string) => ipcRenderer.invoke('calendar:importIcs', filePath),
    getImportedCalendars: () => ipcRenderer.invoke('calendar:getImportedCalendars'),
    deleteImportedCalendar: (id: number) => ipcRenderer.invoke('calendar:deleteImportedCalendar', id),
  },
  notifications: {
    getAll: (clientId?: number) => ipcRenderer.invoke('notifications:getAll', clientId),
    getById: (id: number) => ipcRenderer.invoke('notifications:getById', id),
    updateStatus: (id: number, status: string) => ipcRenderer.invoke('notifications:updateStatus', id, status),
    delete: (id: number) => ipcRenderer.invoke('notifications:delete', id),
    generateAlerts: () => ipcRenderer.invoke('notifications:generateAlerts'),
  },
  customTramites: {
    getAll: () => ipcRenderer.invoke('custom-tramites:getAll'),
    getByCategory: (category: string) => ipcRenderer.invoke('custom-tramites:getByCategory', category),
    create: (data: { name: string; category: string; portal_url: string; description: string }) =>
      ipcRenderer.invoke('custom-tramites:create', data),
    update: (id: number, data: { name?: string; portal_url?: string; description?: string }) =>
      ipcRenderer.invoke('custom-tramites:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('custom-tramites:delete', id),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    setLockPassword: (password: string) => ipcRenderer.invoke('settings:setLockPassword', password),
    verifyLockPassword: (password: string) => ipcRenderer.invoke('settings:verifyLockPassword', password),
    removeLockPassword: () => ipcRenderer.invoke('settings:removeLockPassword'),
  },
  shortcuts: {
    getAll: () => ipcRenderer.invoke('shortcuts:getAll'),
    getTop: (limit?: number) => ipcRenderer.invoke('shortcuts:getTop', limit),
    create: (data: { name: string; url: string; certificate_id: number | null; color: string; notes?: string }) =>
      ipcRenderer.invoke('shortcuts:create', data),
    update: (id: number, data: { name?: string; url?: string; certificate_id?: number | null; color?: string; notes?: string }) =>
      ipcRenderer.invoke('shortcuts:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('shortcuts:delete', id),
    recordUse: (id: number) => ipcRenderer.invoke('shortcuts:recordUse', id),
  },
  festivos: {
    getLocations: () => ipcRenderer.invoke('festivos:getLocations'),
    loadYear: (data: { ccaa: string; isla?: string | null; year: number }) =>
      ipcRenderer.invoke('festivos:loadYear', data),
    getByYear: (year: number) => ipcRenderer.invoke('festivos:getByYear', year),
    addLocal: (data: { year: number; fecha: string; nombre: string; municipio?: string | null }) =>
      ipcRenderer.invoke('festivos:addLocal', data),
    delete: (id: number) => ipcRenderer.invoke('festivos:delete', id),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
