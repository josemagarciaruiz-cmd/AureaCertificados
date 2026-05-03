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
    getByClient: (clientId: number) => ipcRenderer.invoke('certificates:getByClient', clientId),
    import: (data: unknown) => ipcRenderer.invoke('certificates:import', data),
    delete: (id: number) => ipcRenderer.invoke('certificates:delete', id),
    getAuditLog: (certId?: number) => ipcRenderer.invoke('certificates:getAuditLog', certId),
    openPortal: (certId: number, url: string) => ipcRenderer.invoke('certificates:openPortal', certId, url),
    scanOsStore: () => ipcRenderer.invoke('certificates:scanOsStore'),
    importFromOsStore: (data: { thumbprint: string; alias: string; clientId: number | null; masterPassword: string }) =>
      ipcRenderer.invoke('certificates:importFromOsStore', data),
    parseP12: (filePath: string, password: string) =>
      ipcRenderer.invoke('certificates:parseP12', filePath, password),
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
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    setLockPassword: (password: string) => ipcRenderer.invoke('settings:setLockPassword', password),
    verifyLockPassword: (password: string) => ipcRenderer.invoke('settings:verifyLockPassword', password),
    removeLockPassword: () => ipcRenderer.invoke('settings:removeLockPassword'),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
