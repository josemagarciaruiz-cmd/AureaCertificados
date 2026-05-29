import { ipcMain, BrowserWindow } from 'electron'
import { getDb } from './database'
import * as forge from 'node-forge'
import * as crypto from 'crypto'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { tmpdir, homedir } from 'os'
import { join } from 'path'
import { exec, execSync } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)

const ALGORITHM = 'aes-256-gcm'

/**
 * Computes the SHA-1 thumbprint of a certificate from its DER data.
 * Handles all formats Electron may provide in Certificate.data:
 *   – PEM string (-----BEGIN CERTIFICATE-----)
 *   – Raw binary string (Latin-1 encoded DER bytes)
 *   – Buffer / Uint8Array (some Electron versions)
 * Returns uppercase hex without colons, matching PowerShell Thumbprint format.
 */
function getCertSha1(certData: unknown): string {
  try {
    let derBuffer: Buffer
    if (Buffer.isBuffer(certData)) {
      derBuffer = certData
    } else if (certData instanceof Uint8Array) {
      derBuffer = Buffer.from(certData)
    } else if (typeof certData === 'string') {
      const match = certData.match(/-----BEGIN CERTIFICATE-----\s*([\s\S]+?)\s*-----END CERTIFICATE-----/)
      if (match) {
        derBuffer = Buffer.from(match[1].replace(/\s+/g, ''), 'base64')
      } else {
        derBuffer = Buffer.from(certData, 'binary')
      }
    } else {
      return ''
    }
    return crypto.createHash('sha1').update(derBuffer).digest('hex').toUpperCase()
  } catch {
    return ''
  }
}

/**
 * Extracts the Electron-format SHA-256 fingerprint ("sha256/<base64>") from a
 * decrypted P12 buffer. This matches Certificate.fingerprint from the
 * select-client-certificate event exactly, enabling reliable cert selection
 * without depending on the ambiguous Certificate.data field.
 */
function getCertElectronFingerprint(p12Buffer: Buffer, password: string): string {
  try {
    const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'))
    const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(p12Der), password)
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBags = bags[forge.pki.oids.certBag]
    if (!certBags?.length) return ''
    const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(certBags[0].cert!)).getBytes()
    const sha256b64 = crypto.createHash('sha256').update(Buffer.from(derBytes, 'binary')).digest('base64')
    return `sha256/${sha256b64}`
  } catch {
    return ''
  }
}

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

/**
 * Removes from the OS certificate store all certificates that are stored in
 * the app's database (identified by their SHA-1 fingerprint).
 *
 * This must be called:
 *   1. At app startup (non-blocking) — clears residues from crashed sessions.
 *   2. Before each openPortalWithCert — ensures only the intended cert is in
 *      the OS store when the portal window opens (critical for sites that read
 *      certs directly from the OS store via JS rather than via TLS handshake).
 *   3. On demand via the "Limpiar caché" button in Settings.
 *
 * Errors are silently ignored so the app continues regardless.
 */
export async function cleanOsStore(): Promise<{ cleaned: number }> {
  try {
    // --- Source 1: SHA-1 fingerprints stored in the certificates table ---
    const rows = getDb().prepare(
      "SELECT fingerprint FROM certificates WHERE fingerprint IS NOT NULL AND fingerprint != ''"
    ).all() as { fingerprint: string }[]

    const sha1sFromDb = rows
      .map((r) => r.fingerprint.replace(/:/g, '').toUpperCase())
      .filter(Boolean)

    // --- Source 2: Thumbprints the app installed in previous sessions ---
    // This catches certs that are NO LONGER in the DB (deleted, imported from OS store, etc.)
    // and certs from sessions that crashed before the cleanup callback ran.
    let trackedThumbs: string[] = []
    try {
      const trackedRows = getDb().prepare(
        'SELECT thumbprint FROM installed_cert_thumbprints'
      ).all() as { thumbprint: string }[]
      trackedThumbs = trackedRows.map((r) => r.thumbprint.toUpperCase()).filter(Boolean)
    } catch { /* table may not exist in older DB files — ignore */ }

    // Merge and deduplicate
    const allThumbs = [...new Set([...sha1sFromDb, ...trackedThumbs])]

    if (allThumbs.length === 0) return { cleaned: 0 }

    if (process.platform === 'win32') {
      const thumbprintList = allThumbs.map((t) => `'${t}'`).join(',')
      const psScript = `
$tps = @(${thumbprintList})
$count = 0
foreach ($tp in $tps) {
  $cert = Get-Item "Cert:\\CurrentUser\\My\\$tp" -ErrorAction SilentlyContinue
  if ($cert) {
    Remove-Item "Cert:\\CurrentUser\\My\\$tp" -DeleteKey -ErrorAction SilentlyContinue
    $count++
  }
}
Write-Output $count
`
      try {
        const psEncoded = Buffer.from(psScript, 'utf16le').toString('base64')
        const { stdout } = await execAsync(
          `powershell -NonInteractive -EncodedCommand ${psEncoded}`,
          { encoding: 'utf8', timeout: 30000 }
        )
        // Clear the tracking table — all installed thumbprints have been removed
        try { getDb().prepare('DELETE FROM installed_cert_thumbprints').run() } catch { /* ignore */ }
        return { cleaned: parseInt(stdout.trim(), 10) || 0 }
      } catch {
        return { cleaned: 0 }
      }
    }

    if (process.platform === 'darwin') {
      const keychainPath = `${homedir()}/Library/Keychains/login.keychain-db`
      let cleaned = 0
      for (const sha1 of allThumbs) {
        try {
          await execAsync(
            `security delete-identity -Z '${sha1}' '${keychainPath}' 2>/dev/null || security delete-certificate -Z '${sha1}' '${keychainPath}' 2>/dev/null`,
            { timeout: 5000 }
          )
          cleaned++
        } catch { /* not in keychain — ignore */ }
      }
      try { getDb().prepare('DELETE FROM installed_cert_thumbprints').run() } catch { /* ignore */ }
      return { cleaned }
    }
  } catch { /* DB not ready or other error */ }

  return { cleaned: 0 }
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

  // Lean endpoint: only metadata columns (no encrypted_p12/iv/salt blobs).
  // Use this wherever only alias + validity info is needed (e.g. dropdowns).
  ipcMain.handle('certificates:getAllMeta', () => {
    return getDb().prepare(`
      SELECT cert.id, cert.client_id, cert.alias, cert.valid_from, cert.valid_to,
             cert.issuer, cert.subject,
             c.name as client_name, c.nif_cif as client_nif
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

    // 0. Pre-cleanup: remove any certs from the OS store that belong to this app.
    //    Many Spanish gov portals read certs directly from the OS store via JS (not via
    //    TLS handshake), so stale certs from previous sessions would be picked up.
    //    We race with a 4s timeout to avoid blocking the UI for too long.
    await Promise.race([
      cleanOsStore(),
      new Promise<void>((r) => setTimeout(r, 4000)),
    ])

    // 1. Decrypt stored P12 (inner password = masterPassword for re-packaged certs)
    const p12Buffer = decryptP12(dbCert.encrypted_p12, dbCert.iv, dbCert.salt, data.masterPassword)

    // Compute Electron-format SHA-256 fingerprint from the decrypted P12.
    // This will be used as the PRIMARY cert-selection criterion in select-client-certificate,
    // matching Certificate.fingerprint directly — far more reliable than parsing c.data.
    const targetFingerprint = getCertElectronFingerprint(p12Buffer, data.masterPassword)

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
    // Serial number obtained directly from PowerShell after installation — 100 % reliable match
    // because it comes from the same OS object Chromium reads in select-client-certificate.
    let winSerialNumber = ''
    // SHA-256 fingerprint computed from the cert DER bytes in the Windows store — bypasses
    // forge and matches Certificate.fingerprint in select-client-certificate exactly.
    let winCertFingerprint = ''

    // Non-blocking cleanup: runs fire-and-forget so closing the window never freezes the UI
    const cleanup = () => {
      try { unlinkSync(tempPath) } catch { /* ignore */ }
      if (process.platform === 'win32' && winThumbprint) {
        exec(
          `powershell -Command "Remove-Item -Path 'Cert:\\CurrentUser\\My\\${winThumbprint}' -DeleteKey -ErrorAction SilentlyContinue"`,
          { timeout: 10000 },
          () => { /* ignore result */ }
        )
      } else if (process.platform === 'darwin' && dbCert.fingerprint) {
        const sha1 = dbCert.fingerprint.replace(/:/g, '')
        const keychainPath = `${homedir()}/Library/Keychains/login.keychain-db`
        // delete-identity removes cert + private key (identity pair).
        // Fallback to delete-certificate in case the identity pairing is missing.
        exec(
          `security delete-identity -Z '${sha1}' '${keychainPath}' 2>/dev/null || security delete-certificate -Z '${sha1}' '${keychainPath}' 2>/dev/null`,
          { timeout: 10000 },
          () => { /* ignore if already removed */ }
        )
      }
    }

    try {
      // 3. Install to OS cert store (async — never blocks main process)
      if (process.platform === 'win32') {
        // Use -EncodedCommand (base64 UTF-16LE) to avoid ALL cmd.exe quoting issues.
        // -Command "..." caused variables like $certPwd to be stripped by the shell layer.
        const psImportScript = [
          `$certPwd = ConvertTo-SecureString -String '${tempPass}' -Force -AsPlainText`,
          `$cert = Import-PfxCertificate -FilePath '${tempPath}' -CertStoreLocation Cert:\\CurrentUser\\My -Password $certPwd -Exportable`,
          `Write-Output $cert.Thumbprint`
        ].join('\n')
        const psImportEncoded = Buffer.from(psImportScript, 'utf16le').toString('base64')
        const { stdout: psOut, stderr: psErr } = await execAsync(
          `powershell -NonInteractive -EncodedCommand ${psImportEncoded}`,
          { encoding: 'utf8', timeout: 30000 }
        )
        // ── Diagnostic log — always written so we can inspect what happened ──
        try {
          const { appendFileSync: _afs } = require('fs')
          const { join: _pj } = require('path')
          const { app: _app } = require('electron')
          _afs(
            _pj(_app.getPath('userData'), 'cert_debug.log'),
            `[${new Date().toISOString()}] IMPORT-PFXCERTIFICATE\n` +
            `  certId : ${data.certId}\n` +
            `  stdout : ${psOut?.trim() || '(empty)'}\n` +
            `  stderr : ${psErr?.trim() || '(none)'}\n`
          )
        } catch { /* non-blocking */ }
        // PowerShell can output warnings, BOM or blank lines before the thumbprint.
        // Extract the first 40-char uppercase hex token to be robust against that noise.
        winThumbprint = (psOut.match(/[0-9A-Fa-f]{40}/)?.[0] ?? '').toUpperCase()

        if (winThumbprint) {
          // Persist the installed thumbprint so cleanOsStore() can remove it in future sessions
          // even if this session crashes before the cleanup callback runs.
          try {
            getDb().prepare(
              'INSERT OR REPLACE INTO installed_cert_thumbprints (thumbprint, cert_id) VALUES (?, ?)'
            ).run(winThumbprint, data.certId)
          } catch { /* non-blocking */ }

          // Get serial number directly from Windows — exact same value Chromium reports
          // in Certificate.serialNumber inside select-client-certificate.
          try {
            const { stdout: serialOut } = await execAsync(
              `powershell -NonInteractive -Command "(Get-Item 'Cert:\\CurrentUser\\My\\${winThumbprint}').SerialNumber"`,
              { encoding: 'utf8', timeout: 10000 }
            )
            winSerialNumber = serialOut.trim().toLowerCase()
          } catch { /* use DB serial as fallback */ }

          // Compute Electron-format SHA-256 fingerprint ("sha256/<base64>") directly from
          // the cert DER bytes in the Windows store — bypasses forge parsing entirely and
          // is 100 % guaranteed to match Certificate.fingerprint in select-client-certificate.
          try {
            const { stdout: b64Out } = await execAsync(
              `powershell -NonInteractive -Command "$c = Get-Item 'Cert:\\CurrentUser\\My\\${winThumbprint}'; [System.Convert]::ToBase64String($c.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))"`,
              { encoding: 'utf8', timeout: 10000 }
            )
            const derBuffer = Buffer.from(b64Out.trim(), 'base64')
            const sha256b64 = crypto.createHash('sha256').update(derBuffer).digest('base64')
            winCertFingerprint = `sha256/${sha256b64}`
          } catch { /* keep forge-based targetFingerprint as fallback */ }
        }
      } else if (process.platform === 'darwin') {
        const keychainPath = `${homedir()}/Library/Keychains/login.keychain-db`
        try {
          await execAsync(
            `security import '${tempPath}' -k '${keychainPath}' -P '${tempPass}' -A -T ''`,
            { encoding: 'utf8', timeout: 30000 }
          )
        } catch { /* may warn but cert is imported */ }
      }

      // Give Chromium time to pick up the updated OS cert store.
      // 400 ms was too short on some systems — 1200 ms is safer.
      await new Promise<void>((r) => setTimeout(r, 1200))

      // 4. Open browser window with isolated session so Chromium never reuses a cached cert
      const win = new BrowserWindow({
        width: 1280,
        height: 900,
        title: `${dbCert.alias} — ÁureaCert`,
        webPreferences: { sandbox: true, partition: `cert-${data.certId}-${Date.now()}` },
      })

      win.webContents.on('select-client-certificate', (event, _url, list, callback) => {
        event.preventDefault()

        // ── Diagnostic log ──
        try {
          const { appendFileSync: _afs } = require('fs')
          const { join: _pj } = require('path')
          const { app: _app } = require('electron')
          _afs(
            _pj(_app.getPath('userData'), 'cert_debug.log'),
            `[${new Date().toISOString()}] SELECT-CLIENT-CERTIFICATE\n` +
            `  url           : ${_url}\n` +
            `  winThumbprint : ${winThumbprint || '(empty)'}\n` +
            `  winCertFP     : ${winCertFingerprint || '(empty)'}\n` +
            `  winSerial     : ${winSerialNumber || '(empty)'}\n` +
            `  targetFP      : ${targetFingerprint || '(empty)'}\n` +
            `  list.length   : ${list.length}\n` +
            list.map((c, i) => `  cert[${i}] fp=${c.fingerprint} serial=${c.serialNumber} subj=${c.subjectName}`).join('\n') + '\n'
          )
        } catch { /* non-blocking */ }

        // ── Strategy 1: SHA-256 fingerprint from the cert DER bytes installed in Windows ──
        // winCertFingerprint is computed by exporting the cert from the OS store after
        // Import-PfxCertificate — it is guaranteed to match Certificate.fingerprint exactly.
        // targetFingerprint (forge-based) is the fallback in case the PS export failed.
        const fpToMatch = winCertFingerprint || targetFingerprint
        if (fpToMatch) {
          const match = list.find((c) => c.fingerprint === fpToMatch)
          if (match) { callback(match); return }
        }

        // ── Strategy 2: SHA-1 of c.data (backwards compatibility) ──
        // winThumbprint: returned by PowerShell after Import-PfxCertificate (Windows).
        // storedSha1:    stored in DB at import time (XX:XX:... → XXXXXX...).
        const storedSha1 = dbCert.fingerprint
          ? (dbCert.fingerprint as string).replace(/:/g, '').toUpperCase()
          : null

        const matchSha1 = list.find((c) => {
          const sha1 = getCertSha1(c.data)
          if (!sha1) return false
          if (winThumbprint && sha1 === winThumbprint) return true
          if (storedSha1 && sha1 === storedSha1) return true
          return false
        })
        if (matchSha1) { callback(matchSha1); return }

        // ── Strategy 3: serial number ──
        // winSerialNumber comes directly from PowerShell after Install-PfxCertificate —
        // it is the exact hex string Chromium uses in Certificate.serialNumber, so this
        // match is 100 % reliable when Strategies 1 & 2 fail (e.g. forge parsing issues,
        // unreliable c.data format, or missing fingerprint in older DB records).
        const normalize = (s?: string) => (s ?? '').toLowerCase().replace(/^0+/, '')
        const targetSerial = normalize(winSerialNumber) || normalize(dbCert.serial_number as string)
        if (targetSerial) {
          const matchSerial = list.find((c) => normalize(c.serialNumber) === targetSerial)
          if (matchSerial) { callback(matchSerial); return }
        }

        // No match found — log and cancel
        try {
          const { appendFileSync: _afs } = require('fs')
          const { join: _pj } = require('path')
          const { app: _app } = require('electron')
          _afs(_pj(_app.getPath('userData'), 'cert_debug.log'),
            `[${new Date().toISOString()}] NO MATCH — all strategies failed\n`)
        } catch { /* non-blocking */ }

        console.error(
          `[ÁureaCert] select-client-certificate: no match for cert id=${data.certId} (${dbCert.alias}).`,
          `targetFingerprint=${targetFingerprint} winSerial=${winSerialNumber}`,
          `list=${list.map((c) => `${c.fingerprint}|${c.serialNumber}`).join(', ')}`
        )
        callback()  // undefined arg = cancel — do NOT cast to Certificate (causes wrong cert selection)
      })

      // Prevent any portal page from blocking the window close with a beforeunload dialog
      win.webContents.on('will-prevent-unload', (event) => {
        event.preventDefault()
      })

      win.on('closed', cleanup)

      // Auto-click the certificate access button once the portal landing page loads.
      // The flag prevents re-firing on subsequent navigations (hash changes, AJAX
      // reloads, SPA transitions) which would create a scroll/click loop on sites
      // like DEHU or the FNMT renewal wizard.
      let initialLoadDone = false
      win.webContents.on('did-finish-load', () => {
        if (initialLoadDone) return
        initialLoadDone = true
        win.webContents.executeJavaScript(`
          (function() {
            // Use specific selectors only — avoid broad href patterns like
            // a[href*="certificado"] that match navigation menus and breadcrumbs
            // causing an infinite click→navigate→did-finish-load loop.
            const selectors = [
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

  ipcMain.handle('certificates:cleanOsStore', async () => {
    return cleanOsStore()
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
    password?: string
  }) => {
    if (process.platform !== 'win32') throw new Error('Solo disponible en Windows')
    return importCertFromWindowsStore(data.thumbprint, data.alias, data.clientId, data.masterPassword, data.password)
  })
}

async function scanWindowsCertStore(): Promise<unknown[]> {
  try {
    // Detect exportability for both legacy CAPI keys and modern CNG keys (FNMT, AEAT, etc.)
    // Note: CNG certs with Export Policy = 0 are shown as exportable='cng_locked' — the import
    // function can still handle them by forcing the policy to 3 before exporting.
    const psScript = `
$certs = Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.HasPrivateKey }
$result = foreach ($c in $certs) {
    $exportable = try {
        # Legacy CAPI
        $e = $c.PrivateKey.CspKeyContainerInfo.Exportable
        if ($null -ne $e) { $e }
        else {
            # Modern CNG RSA
            $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($c)
            if ($rsa -is [System.Security.Cryptography.RSACng]) {
                try {
                    $prop = $rsa.Key.GetProperty('Export Policy', [System.Security.Cryptography.CngPropertyOptions]::None)
                    $val = [System.BitConverter]::ToInt32($prop.GetValue(), 0)
                    if (($val -band 1) -ne 0) { $true } else { 'cng_locked' }
                } catch { 'cng_locked' }
            } else {
                # CNG ECDSA or unknown
                $ec = [System.Security.Cryptography.X509Certificates.ECDsaCertificateExtensions]::GetECDsaPrivateKey($c)
                if ($ec -is [System.Security.Cryptography.ECDsaCng]) {
                    try {
                        $prop = $ec.Key.GetProperty('Export Policy', [System.Security.Cryptography.CngPropertyOptions]::None)
                        $val = [System.BitConverter]::ToInt32($prop.GetValue(), 0)
                        if (($val -band 1) -ne 0) { $true } else { 'cng_locked' }
                    } catch { 'cng_locked' }
                } else { 'unknown' }
            }
        }
    } catch { 'unknown' }
    [PSCustomObject]@{
        Thumbprint   = $c.Thumbprint
        Subject      = $c.Subject
        Issuer       = $c.Issuer
        NotBefore    = $c.NotBefore.ToString('yyyy-MM-ddTHH:mm:ss')
        NotAfter     = $c.NotAfter.ToString('yyyy-MM-ddTHH:mm:ss')
        HasPrivateKey = $c.HasPrivateKey
        Exportable   = $exportable
    }
}
$result | ConvertTo-Json -Compress -Depth 3
`
    const psEncoded = Buffer.from(psScript, 'utf16le').toString('base64')
    const { stdout } = await execAsync(
      `powershell -NonInteractive -EncodedCommand ${psEncoded}`,
      { encoding: 'utf8', timeout: 90000 }  // 90s: 150 certs × CNG introspection can be slow
    )
    const raw = JSON.parse(stdout.trim())
    return Array.isArray(raw) ? raw : [raw]
  } catch {
    return []
  }
}

async function importCertFromWindowsStore(
  thumbprint: string,
  alias: string,
  clientId: number | null,
  masterPassword: string,
  _certPassword?: string
): Promise<unknown> {
  const tempPass = crypto.randomBytes(16).toString('hex')
  const tempPath = join(tmpdir(), `aurea-${Date.now()}.pfx`)

  try {
    // PowerShell script that:
    // 1. Locates the cert by thumbprint
    // 2. Attempts to mark the CNG private key as exportable (needed for modern FNMT certs)
    //    — works without admin rights for keys stored in the user profile
    // 3. Falls back to legacy CAPI exportability detection for older certs
    // 4. Exports to a temporary PFX with a random password
    const psScript = `
$ErrorActionPreference = 'Stop'
$cert = Get-ChildItem -Path 'Cert:\\CurrentUser\\My\\${thumbprint}'
if (-not $cert) { throw 'Certificado no encontrado en el almacen' }

# Try to mark CNG RSA key as exportable (FNMT and modern certs use CNG)
try {
    $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    if ($rsa -is [System.Security.Cryptography.RSACng]) {
        $policyBytes = [System.BitConverter]::GetBytes([int]3)
        $exportPolicy = New-Object System.Security.Cryptography.CngProperty(
            'Export Policy', $policyBytes, [System.Security.Cryptography.CngPropertyOptions]::Persist)
        $rsa.Key.SetProperty($exportPolicy)
    }
} catch {}

# Try to mark CNG ECDSA key as exportable (for EC certificates)
try {
    $ecdsa = [System.Security.Cryptography.X509Certificates.ECDsaCertificateExtensions]::GetECDsaPrivateKey($cert)
    if ($ecdsa -is [System.Security.Cryptography.ECDsaCng]) {
        $policyBytes = [System.BitConverter]::GetBytes([int]3)
        $exportPolicy = New-Object System.Security.Cryptography.CngProperty(
            'Export Policy', $policyBytes, [System.Security.Cryptography.CngPropertyOptions]::Persist)
        $ecdsa.Key.SetProperty($exportPolicy)
    }
} catch {}

$p = ConvertTo-SecureString -String '${tempPass}' -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath '${tempPath.replace(/\\/g, '\\\\')}' -Password $p | Out-Null
`
    // Use -EncodedCommand to avoid escaping issues with paths and special chars
    const psEncoded = Buffer.from(psScript, 'utf16le').toString('base64')
    try {
      await execAsync(
        `powershell -NonInteractive -EncodedCommand ${psEncoded}`,
        { encoding: 'utf8', timeout: 30000 }
      )
    } catch (psErr: any) {
      const detail = (psErr.stderr as string || '').trim() || (psErr.stdout as string || '').trim() || psErr.message || 'Error desconocido'
      throw new Error(`PowerShell: ${detail.replace(/\r?\n/g, ' ').slice(0, 300)}`)
    }

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
         @encrypted, @iv, @salt, @fingerprint, 'os_store')
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
