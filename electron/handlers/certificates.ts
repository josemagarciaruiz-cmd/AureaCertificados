import { ipcMain, BrowserWindow } from 'electron'
import { getDb } from './database'
import * as forge from 'node-forge'
import * as crypto from 'crypto'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { tmpdir, homedir } from 'os'
import { join } from 'path'
import { execSync } from 'child_process'

const ALGORITHM = 'aes-256-gcm'

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')
}

function encryptP12(p12Buffer: Buffer, password: string): { encrypted: string; iv: string; salt: string } {
  const salt = crypto.randomBytes(16)
  const key = deriveKey(password, salt)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(p12Buffer), cipher.final()])
  const authTag = cipher.getAuthTag()
  const combined = Buffer.concat([authTag, encrypted])
  return {
    encrypted: combined.toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
  }
}

function decryptP12(encryptedBase64: string, ivBase64: string, saltBase64: string, password: string): Buffer {
  const salt = Buffer.from(saltBase64, 'base64')
  const key = deriveKey(password, salt)
  const iv = Buffer.from(ivBase64, 'base64')
  const combined = Buffer.from(encryptedBase64, 'base64')
  const authTag = combined.subarray(0, 16)
  const encrypted = combined.subarray(16)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

function parseP12Info(p12Buffer: Buffer, password: string): Record<string, string> {
  try {
    const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'))
    const p12Asn1 = forge.asn1.fromDer(p12Der)
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

    let subject = ''
    let issuer = ''
    let serialNumber = ''
    let validFrom = ''
    let validTo = ''
    let fingerprint = ''

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBags = bags[forge.pki.oids.certBag]
    if (certBags && certBags.length > 0) {
      const cert = certBags[0].cert!
      const subjectAttrs = cert.subject.attributes
      const commonName = subjectAttrs.find((a) => a.name === 'commonName')
      subject = String(commonName?.value || subjectAttrs.map((a) => `${a.shortName}=${a.value}`).join(', '))
      issuer = cert.issuer.attributes.map((a) => `${a.shortName}=${a.value}`).join(', ')
      serialNumber = cert.serialNumber
      validFrom = cert.validity.notBefore.toISOString()
      validTo = cert.validity.notAfter.toISOString()
      const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
      const md = forge.md.sha1.create()
      md.update(der)
      fingerprint = md.digest().toHex().toUpperCase().match(/.{2}/g)!.join(':')
    }

    return { subject, issuer, serialNumber, validFrom, validTo, fingerprint }
  } catch {
    return { subject: '', issuer: '', serialNumber: '', validFrom: '', validTo: '', fingerprint: '' }
  }
}

function repackageP12(buffer: Buffer, originalPassword: string, newPassword: string): Buffer {
  const p12Der = forge.util.createBuffer(buffer.toString('binary'))
  const p12Asn1 = forge.asn1.fromDer(p12Der)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, originalPassword)

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
  const certs = (certBags[forge.pki.oids.certBag] ?? [])
    .map((b) => b.cert)
    .filter((c): c is forge.pki.Certificate => !!c)

  if (!keyBag?.key) throw new Error('No se encontró la clave privada en el P12')

  const newP12Asn1 = forge.pkcs12.toPkcs12Asn1(keyBag.key, certs, newPassword, {
    algorithm: '3des',
    friendlyName: certs[0]?.subject.getField('CN')?.value ?? undefined,
  })
  return Buffer.from(forge.asn1.toDer(newP12Asn1).getBytes(), 'binary')
}

export function registerCertificateHandlers(): void {
  ipcMain.handle('certificates:parseP12', (_, filePath: string, password: string) => {
    const buffer = readFileSync(filePath)
    return parseP12Info(buffer, password)
  })

  ipcMain.handle('certificates:getAll', () => {
    return getDb().prepare(`
      SELECT cert.*, c.name as client_name, c.nif_cif as client_nif
      FROM certificates cert
      LEFT JOIN clients c ON c.id = cert.client_id
      ORDER BY cert.alias ASC
    `).all()
  })

  ipcMain.handle('certificates:getByClient', (_, clientId: number) => {
    return getDb().prepare(`
      SELECT * FROM certificates WHERE client_id = ? ORDER BY alias ASC
    `).all(clientId)
  })

  ipcMain.handle('certificates:import', (_, data: {
    filePath: string
    password: string
    alias: string
    clientId: number | null
    masterPassword: string
  }) => {
    const buffer = readFileSync(data.filePath)
    const info = parseP12Info(buffer, data.password)

    // Use CN from the certificate as alias if the filename-derived alias is generic
    const resolvedAlias = data.alias || info.subject || 'Certificado'

    // Re-package so the inner P12 password equals masterPassword — required for OS store install later
    const repackaged = repackageP12(buffer, data.password, data.masterPassword)
    const { encrypted, iv, salt } = encryptP12(repackaged, data.masterPassword)

    const clientId = data.clientId ?? null

    const result = getDb().prepare(`
      INSERT INTO certificates
        (client_id, alias, issuer, serial_number, subject, valid_from, valid_to,
         encrypted_p12, iv, salt, fingerprint, source)
      VALUES
        (@clientId, @alias, @issuer, @serialNumber, @subject, @validFrom, @validTo,
         @encrypted, @iv, @salt, @fingerprint, 'manual')
    `).run({
      clientId,
      alias: resolvedAlias,
      issuer: info.issuer,
      serialNumber: info.serialNumber,
      subject: info.subject,
      validFrom: info.validFrom,
      validTo: info.validTo,
      encrypted,
      iv,
      salt,
      fingerprint: info.fingerprint,
    })

    const cert = getDb().prepare('SELECT * FROM certificates WHERE id = ?').get(result.lastInsertRowid)

    getDb().prepare(`
      INSERT INTO audit_log (certificate_id, certificate_alias, client_name, action)
      VALUES (?, ?, (SELECT name FROM clients WHERE id = ?), 'import')
    `).run(result.lastInsertRowid, resolvedAlias, clientId)

    return cert
  })

  ipcMain.handle('certificates:delete', (_, id: number) => {
    const cert = getDb().prepare('SELECT * FROM certificates WHERE id = ?').get(id) as Record<string, string> | undefined
    if (cert) {
      getDb().prepare(`
        INSERT INTO audit_log (certificate_id, certificate_alias, action)
        VALUES (?, ?, 'delete')
      `).run(id, cert.alias)
    }
    getDb().prepare('DELETE FROM certificates WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('certificates:getAuditLog', (_, certId?: number) => {
    if (certId) {
      return getDb().prepare(`
        SELECT * FROM audit_log WHERE certificate_id = ? ORDER BY timestamp DESC LIMIT 200
      `).all(certId)
    }
    return getDb().prepare(`
      SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 500
    `).all()
  })

  ipcMain.handle('certificates:openPortal', (_, certId: number, url: string) => {
    const cert = getDb().prepare('SELECT * FROM certificates WHERE id = ?').get(certId) as Record<string, string> | undefined
    if (!cert) return { success: false, error: 'Certificado no encontrado' }

    getDb().prepare(`
      INSERT INTO audit_log (certificate_id, certificate_alias, client_name, action, url)
      VALUES (?, ?, (SELECT name FROM clients WHERE id = ?), 'portal_access', ?)
    `).run(certId, cert.alias, cert.client_id, url)

    const win = BrowserWindow.getFocusedWindow()
    if (win) win.webContents.executeJavaScript(`window.open('${url}', '_blank')`)

    return { success: true }
  })

  ipcMain.handle('certificates:openPortalWithCert', async (_, data: {
    certId: number
    url: string
    masterPassword: string
  }) => {
    const dbCert = getDb().prepare(`
      SELECT cert.*, c.name as client_name FROM certificates cert
      LEFT JOIN clients c ON c.id = cert.client_id
      WHERE cert.id = ?
    `).get(data.certId) as Record<string, string> | undefined

    if (!dbCert) throw new Error('Certificado no encontrado')

    // 1. Decrypt stored P12 (inner password = masterPassword for re-packaged certs)
    const p12Buffer = decryptP12(dbCert.encrypted_p12, dbCert.iv, dbCert.salt, data.masterPassword)

    // 2. Re-package with a random temp password for OS store install
    const tempPass = crypto.randomBytes(16).toString('hex')
    let tempP12: Buffer
    try {
      tempP12 = repackageP12(p12Buffer, data.masterPassword, tempPass)
    } catch {
      throw new Error('No se pudo leer el certificado. Si fue importado antes de la última actualización, reimporta el archivo .p12.')
    }

    const tempPath = join(tmpdir(), `aurea-portal-${Date.now()}.pfx`)
    writeFileSync(tempPath, tempP12)

    let winThumbprint = ''

    const cleanup = () => {
      try { unlinkSync(tempPath) } catch { /* ignore */ }
      if (process.platform === 'win32' && winThumbprint) {
        try {
          execSync(
            `powershell -Command "Remove-Item -Path 'Cert:\\CurrentUser\\My\\${winThumbprint}' -DeleteKey -ErrorAction SilentlyContinue"`,
            { timeout: 10000 }
          )
        } catch { /* ignore */ }
      } else if (process.platform === 'darwin' && dbCert.fingerprint) {
        const sha1 = dbCert.fingerprint.replace(/:/g, '')
        const keychainPath = `${homedir()}/Library/Keychains/login.keychain-db`
        try {
          execSync(
            `security delete-certificate -Z '${sha1}' '${keychainPath}'`,
            { timeout: 10000 }
          )
        } catch { /* ignore if cert already removed */ }
      }
    }

    try {
      // 3. Install to OS cert store
      if (process.platform === 'win32') {
        const psOut = execSync(
          `powershell -Command "$pwd = ConvertTo-SecureString -String '${tempPass}' -Force -AsPlainText; $cert = Import-PfxCertificate -FilePath '${tempPath.replace(/\\/g, '\\\\')}' -CertStoreLocation Cert:\\CurrentUser\\My -Password $pwd -Exportable; Write-Output $cert.Thumbprint"`,
          { encoding: 'utf8', timeout: 30000 }
        )
        winThumbprint = psOut.trim()
      } else if (process.platform === 'darwin') {
        const keychainPath = `${homedir()}/Library/Keychains/login.keychain-db`
        try {
          execSync(
            `security import '${tempPath}' -k '${keychainPath}' -P '${tempPass}' -A -T ''`,
            { encoding: 'utf8', timeout: 30000 }
          )
        } catch { /* may warn but cert is imported */ }
      }

      // Small delay so the OS cert store change is visible to Chromium
      await new Promise<void>((r) => setTimeout(r, 400))

      // 4. Open browser window with isolated session so Chromium never reuses a cached cert
      const win = new BrowserWindow({
        width: 1280,
        height: 900,
        title: `${dbCert.alias} — ÁureaCert`,
        webPreferences: { sandbox: true, partition: `cert-${data.certId}-${Date.now()}` },
      })

      win.webContents.on('select-client-certificate', (event, _url, list, callback) => {
        event.preventDefault()
        const match = list.find((c) =>
          c.serialNumber?.toLowerCase().replace(/^0+/, '') ===
          dbCert.serial_number?.toLowerCase().replace(/^0+/, '')
        )
        callback(match ?? list[0] ?? undefined!)
      })

      win.on('closed', cleanup)

      // Auto-click the certificate access button once DEHU's landing page loads
      win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript(`
          (function() {
            // DEHU: look for the certificate access link/button and click it
            const selectors = [
              'a[href*="certificado"]',
              'a[href*="certificate"]',
              'button[id*="cert"]',
              'a[id*="cert"]',
              '[data-id="cert"]',
              '.acceso-certificado',
            ]
            for (const sel of selectors) {
              const el = document.querySelector(sel)
              if (el) { el.click(); break }
            }
          })()
        `).catch(() => { /* page may not support JS injection */ })
      })

      win.loadURL(data.url)

      getDb().prepare(`
        INSERT INTO audit_log (certificate_id, certificate_alias, client_name, action, url)
        VALUES (?, ?, ?, 'portal_access', ?)
      `).run(data.certId, dbCert.alias, dbCert.client_name ?? null, data.url)

      return { success: true }
    } catch (err) {
      cleanup()
      throw err
    }
  })

  ipcMain.handle('certificates:scanOsStore', async () => {
    if (process.platform === 'win32') return scanWindowsCertStore()
    return []
  })

  ipcMain.handle('certificates:openBatchPortal', async (_, data: {
    certs: Array<{ id: number; serialNumber: string; alias: string }>
    url: string
  }) => {
    for (let i = 0; i < data.certs.length; i++) {
      const cert = data.certs[i]
      const win = new BrowserWindow({
        width: 1280,
        height: 900,
        title: `${cert.alias} — ÁureaCert`,
        webPreferences: { sandbox: true, partition: `cert-${cert.id}-${Date.now()}-${i}` },
      })

      win.webContents.on('select-client-certificate', (event, _url, list, callback) => {
        event.preventDefault()
        const match = list.find((c) =>
          c.serialNumber?.toLowerCase().replace(/^0+/, '') ===
          cert.serialNumber?.toLowerCase().replace(/^0+/, '')
        )
        callback(match ?? list[0] ?? undefined!)
      })

      await new Promise<void>((resolve) => setTimeout(resolve, i * 600))
      win.loadURL(data.url)
    }
    return { success: true, opened: data.certs.length }
  })

  ipcMain.handle('certificates:importFromOsStore', async (_, data: {
    thumbprint: string
    alias: string
    clientId: number | null
    masterPassword: string
  }) => {
    if (process.platform !== 'win32') throw new Error('Solo disponible en Windows')
    return importCertFromWindowsStore(data.thumbprint, data.alias, data.clientId, data.masterPassword)
  })
}

function scanWindowsCertStore(): unknown[] {
  try {
    const output = execSync(
      `powershell -Command "Get-ChildItem Cert:\\CurrentUser\\My | Select-Object Thumbprint, Subject, Issuer, @{N='NotBefore';E={$_.NotBefore.ToString('yyyy-MM-ddTHH:mm:ss')}}, @{N='NotAfter';E={$_.NotAfter.ToString('yyyy-MM-ddTHH:mm:ss')}}, @{N='HasPrivateKey';E={$_.HasPrivateKey}}, @{N='Exportable';E={try{$_.PrivateKey.CspKeyContainerInfo.Exportable}catch{'unknown'}}} | ConvertTo-Json -Compress"`,
      { encoding: 'utf8', timeout: 10000 }
    )
    const raw = JSON.parse(output.trim())
    return Array.isArray(raw) ? raw : [raw]
  } catch {
    return []
  }
}

async function importCertFromWindowsStore(
  thumbprint: string,
  alias: string,
  clientId: number | null,
  masterPassword: string
): Promise<unknown> {
  const tempPass = crypto.randomBytes(16).toString('hex')
  const tempDir = tmpdir().replace(/\\/g, '/')
  const tempPath = join(tempDir, `aurea-${Date.now()}.pfx`)

  try {
    execSync(
      `powershell -Command "$cert = Get-ChildItem -Path 'Cert:\\CurrentUser\\My\\${thumbprint}'; $pwd = ConvertTo-SecureString -String '${tempPass}' -Force -AsPlainText; Export-PfxCertificate -Cert $cert -FilePath '${tempPath}' -Password $pwd | Out-Null"`,
      { encoding: 'utf8', timeout: 30000 }
    )

    const buffer = readFileSync(tempPath)
    const info = parseP12Info(buffer, tempPass)
    // Re-package so inner P12 password equals masterPassword — required for OS store install later
    const repackaged = repackageP12(buffer, tempPass, masterPassword)
    const { encrypted, iv, salt } = encryptP12(repackaged, masterPassword)

    const result = getDb().prepare(`
      INSERT INTO certificates
        (client_id, alias, issuer, serial_number, subject, valid_from, valid_to,
         encrypted_p12, iv, salt, fingerprint, source)
      VALUES
        (@clientId, @alias, @issuer, @serialNumber, @subject, @validFrom, @validTo,
         @encrypted, @iv, @salt, @fingerprint, 'windows_store')
    `).run({
      clientId,
      alias,
      issuer: info.issuer,
      serialNumber: info.serialNumber,
      subject: info.subject,
      validFrom: info.validFrom,
      validTo: info.validTo,
      encrypted,
      iv,
      salt,
      fingerprint: info.fingerprint,
    })

    getDb().prepare(`
      INSERT INTO audit_log (certificate_id, certificate_alias, client_name, action)
      VALUES (?, ?, (SELECT name FROM clients WHERE id = ?), 'import_os_store')
    `).run(result.lastInsertRowid, alias, clientId)

    return getDb().prepare('SELECT * FROM certificates WHERE id = ?').get(result.lastInsertRowid)
  } finally {
    try { unlinkSync(tempPath) } catch { /* temp file cleanup */ }
  }
}
