"use strict";
const electron = require("electron");
const api = {
  app: {
    getVersion: () => electron.ipcRenderer.invoke("app:getVersion"),
    openExternal: (url) => electron.ipcRenderer.invoke("app:openExternal", url)
  },
  dialog: {
    openFile: (options) => electron.ipcRenderer.invoke("dialog:openFile", options),
    saveFile: (options) => electron.ipcRenderer.invoke("dialog:saveFile", options)
  },
  clients: {
    getAll: () => electron.ipcRenderer.invoke("clients:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("clients:getById", id),
    create: (data) => electron.ipcRenderer.invoke("clients:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("clients:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("clients:delete", id),
    search: (query) => electron.ipcRenderer.invoke("clients:search", query)
  },
  certificates: {
    getAll: () => electron.ipcRenderer.invoke("certificates:getAll"),
    getByClient: (clientId) => electron.ipcRenderer.invoke("certificates:getByClient", clientId),
    import: (data) => electron.ipcRenderer.invoke("certificates:import", data),
    delete: (id) => electron.ipcRenderer.invoke("certificates:delete", id),
    getAuditLog: (certId) => electron.ipcRenderer.invoke("certificates:getAuditLog", certId),
    openPortal: (certId, url) => electron.ipcRenderer.invoke("certificates:openPortal", certId, url),
    openBatchPortal: (data) => electron.ipcRenderer.invoke("certificates:openBatchPortal", data),
    scanOsStore: () => electron.ipcRenderer.invoke("certificates:scanOsStore"),
    importFromOsStore: (data) => electron.ipcRenderer.invoke("certificates:importFromOsStore", data),
    parseP12: (filePath, password) => electron.ipcRenderer.invoke("certificates:parseP12", filePath, password),
    openPortalWithCert: (data) => electron.ipcRenderer.invoke("certificates:openPortalWithCert", data)
  },
  procedures: {
    getAll: (clientId) => electron.ipcRenderer.invoke("procedures:getAll", clientId),
    getById: (id) => electron.ipcRenderer.invoke("procedures:getById", id),
    create: (data) => electron.ipcRenderer.invoke("procedures:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("procedures:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("procedures:delete", id),
    getUpcoming: (days) => electron.ipcRenderer.invoke("procedures:getUpcoming", days)
  },
  calendar: {
    getDeadlines: (year, month) => electron.ipcRenderer.invoke("calendar:getDeadlines", year, month),
    getUpcoming: (days) => electron.ipcRenderer.invoke("calendar:getUpcoming", days),
    importIcs: (filePath) => electron.ipcRenderer.invoke("calendar:importIcs", filePath),
    getImportedCalendars: () => electron.ipcRenderer.invoke("calendar:getImportedCalendars"),
    deleteImportedCalendar: (id) => electron.ipcRenderer.invoke("calendar:deleteImportedCalendar", id)
  },
  notifications: {
    getAll: (clientId) => electron.ipcRenderer.invoke("notifications:getAll", clientId),
    getById: (id) => electron.ipcRenderer.invoke("notifications:getById", id),
    updateStatus: (id, status) => electron.ipcRenderer.invoke("notifications:updateStatus", id, status),
    delete: (id) => electron.ipcRenderer.invoke("notifications:delete", id),
    generateAlerts: () => electron.ipcRenderer.invoke("notifications:generateAlerts")
  },
  customTramites: {
    getAll: () => electron.ipcRenderer.invoke("custom-tramites:getAll"),
    getByCategory: (category) => electron.ipcRenderer.invoke("custom-tramites:getByCategory", category),
    create: (data) => electron.ipcRenderer.invoke("custom-tramites:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("custom-tramites:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("custom-tramites:delete", id)
  },
  settings: {
    get: (key) => electron.ipcRenderer.invoke("settings:get", key),
    set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
    getAll: () => electron.ipcRenderer.invoke("settings:getAll"),
    setLockPassword: (password) => electron.ipcRenderer.invoke("settings:setLockPassword", password),
    verifyLockPassword: (password) => electron.ipcRenderer.invoke("settings:verifyLockPassword", password),
    removeLockPassword: () => electron.ipcRenderer.invoke("settings:removeLockPassword")
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
