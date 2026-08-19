import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './handlers/database'
import { registerCertificateHandlers, cleanOsStore } from './handlers/certificates'
import { registerClientHandlers } from './handlers/clients'
import { registerProcedureHandlers } from './handlers/procedures'
import { registerCalendarHandlers } from './handlers/calendar'
import { registerSettingsHandlers } from './handlers/settings'
import { registerNotificationHandlers, generateAlerts } from './handlers/notifications'
import { registerCustomTramiteHandlers } from './handlers/custom-tramites'
import { registerShortcutHandlers } from './handlers/shortcuts'
import { registerFestivosHandlers } from './handlers/festivos'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    if (is.dev) mainWindow!.webContents.openDevTools()
    // generateAlerts() uses better-sqlite3 (synchronous) and can block the
    // Node event loop for hundreds of milliseconds, preventing the renderer's
    // IPC calls from being processed. Running it via setImmediate defers it
    // to after the current I/O cycle so the window is interactive immediately.
    setImmediate(async () => {
      generateAlerts()
      // Remove any stale certs left in the OS store from previous sessions
      // (crashed windows, failed cleanups, reinstalls, etc.)
      try { await cleanOsStore() } catch { /* non-blocking — ignore */ }
    })
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!is.dev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
          ]
        }
      })
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.aurea.certificados')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  // generateAlerts() moved to ready-to-show to avoid blocking the event loop at startup

  registerCertificateHandlers()
  registerClientHandlers()
  registerProcedureHandlers()
  registerCalendarHandlers()
  registerSettingsHandlers()
  registerNotificationHandlers()
  registerCustomTramiteHandlers()
  registerShortcutHandlers()
  registerFestivosHandlers()

  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:openExternal', (_, url: string) => shell.openExternal(url))
  ipcMain.handle('dialog:openFile', async (_, options) => {
    const result = await dialog.showOpenDialog(mainWindow!, options)
    return result
  })
  ipcMain.handle('dialog:saveFile', async (_, options) => {
    const result = await dialog.showSaveDialog(mainWindow!, options)
    return result
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
