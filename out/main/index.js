"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const Database = require("better-sqlite3");
const forge = require("node-forge");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const child_process = require("child_process");
const util = require("util");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const forge__namespace = /* @__PURE__ */ _interopNamespaceDefault(forge);
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
let db;
function getDb() {
  return db;
}
function initDatabase() {
  const dbPath = path.join(electron.app.getPath("userData"), "aurea.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  createTables();
  runMigrations();
}
function runMigrations() {
  const notifCols = db.prepare("PRAGMA table_info(notifications)").all();
  if (!notifCols.find((c) => c.name === "source_key")) {
    db.exec("ALTER TABLE notifications ADD COLUMN source_key TEXT");
  }
  const customCols = db.prepare("PRAGMA table_info(custom_tramites)").all();
  if (!customCols.find((c) => c.name === "subcategory")) {
    db.exec("ALTER TABLE custom_tramites ADD COLUMN subcategory TEXT NOT NULL DEFAULT ''");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS shortcuts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      certificate_id INTEGER REFERENCES certificates(id) ON DELETE SET NULL,
      use_count INTEGER NOT NULL DEFAULT 0,
      last_used TEXT,
      color TEXT NOT NULL DEFAULT '#d4a853',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_shortcuts_use_count ON shortcuts(use_count DESC);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS installed_cert_thumbprints (
      thumbprint TEXT PRIMARY KEY,
      cert_id    INTEGER REFERENCES certificates(id) ON DELETE SET NULL,
      installed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nif_cif TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('autonomo','empresa','particular','sociedad')),
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      issuer TEXT,
      serial_number TEXT,
      subject TEXT,
      valid_from TEXT,
      valid_to TEXT,
      encrypted_p12 TEXT NOT NULL,
      iv TEXT NOT NULL,
      salt TEXT NOT NULL,
      fingerprint TEXT,
      is_exportable INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','os_store','chrome')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_id INTEGER REFERENCES certificates(id) ON DELETE SET NULL,
      certificate_alias TEXT,
      client_name TEXT,
      action TEXT NOT NULL,
      url TEXT,
      user_name TEXT,
      ip_address TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS procedures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK(category IN ('aeat','tgss','other')),
      organism TEXT,
      model_number TEXT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','presented','resolved','cancelled')),
      due_date TEXT,
      presented_at TEXT,
      notes TEXT,
      portal_url TEXT,
      alert_days INTEGER DEFAULT 7,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      organism TEXT NOT NULL,
      subject TEXT,
      received_at TEXT,
      deadline TEXT,
      status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread','read','managed','archived')),
      urgency TEXT NOT NULL DEFAULT 'normal' CHECK(urgency IN ('critical','high','normal','low')),
      raw_content TEXT,
      ai_summary TEXT,
      ai_classification TEXT,
      ai_draft TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fiscal_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      model_number TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('irpf','iva','sociedades','retenciones','informativas','ss','otros')),
      periodicity TEXT CHECK(periodicity IN ('mensual','trimestral','anual','semestral','puntual')),
      period TEXT,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'builtin' CHECK(source IN ('builtin','ics_import')),
      imported_calendar_id INTEGER REFERENCES imported_calendars(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS imported_calendars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year INTEGER,
      source_file TEXT,
      imported_at TEXT NOT NULL DEFAULT (datetime('now')),
      events_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
      password_hash TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS custom_tramites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'aeat' CHECK(category IN ('aeat','tgss')),
      portal_url TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_certificates_client ON certificates(client_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_valid_to ON certificates(valid_to);
    CREATE INDEX IF NOT EXISTS idx_audit_log_cert ON audit_log(certificate_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_procedures_client ON procedures(client_id);
    CREATE INDEX IF NOT EXISTS idx_procedures_due_date ON procedures(due_date);
    CREATE INDEX IF NOT EXISTS idx_procedures_status ON procedures(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications(client_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_fiscal_year_month ON fiscal_calendar(year, month);
  `);
  seedDefaultSettings();
  seedFiscalCalendar2026();
}
function seedDefaultSettings() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  const defaults = [
    ["despacho_nombre", ""],
    ["despacho_nif", ""],
    ["despacho_email", ""],
    ["despacho_telefono", ""],
    ["despacho_direccion", ""],
    ["cert_alert_days", "30"],
    ["procedure_alert_days", "7"],
    ["smtp_host", ""],
    ["smtp_port", "587"],
    ["smtp_user", ""],
    ["smtp_pass", ""],
    ["smtp_from", ""],
    ["lock_timeout_minutes", "15"],
    ["app_version", "1.0.0"]
  ];
  for (const [key, value] of defaults) {
    insert.run(key, value);
  }
}
function seedFiscalCalendar2026() {
  const count = db.prepare("SELECT COUNT(*) as c FROM fiscal_calendar WHERE year = 2026 AND source = ?").get("builtin");
  if (count.c > 0) return;
  const insert = db.prepare(`
    INSERT INTO fiscal_calendar (year, month, due_date, model_number, name, category, periodicity, period, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'builtin')
  `);
  const deadlines2026 = [
    // ENERO 2026
    [2026, 1, "2026-01-20", "111", "Retenciones IRPF trabajo/profesionales 4T 2025", "retenciones", "trimestral", "4T2025"],
    [2026, 1, "2026-01-20", "115", "Retenciones arrendamientos urbanos 4T 2025", "retenciones", "trimestral", "4T2025"],
    [2026, 1, "2026-01-20", "117", "Retenciones acciones/participaciones IIC 4T 2025", "retenciones", "trimestral", "4T2025"],
    [2026, 1, "2026-01-20", "123", "Retenciones capital mobiliario 4T 2025", "retenciones", "trimestral", "4T2025"],
    [2026, 1, "2026-01-20", "124", "Retenciones activos financieros 4T 2025", "retenciones", "trimestral", "4T2025"],
    [2026, 1, "2026-01-20", "126", "Retenciones capital mobiliario cuentas 4T 2025", "retenciones", "trimestral", "4T2025"],
    [2026, 1, "2026-01-20", "128", "Retenciones rentas exentas 4T 2025", "retenciones", "trimestral", "4T2025"],
    [2026, 1, "2026-01-30", "130", "Pago fraccionado IRPF estimación directa 4T 2025", "irpf", "trimestral", "4T2025"],
    [2026, 1, "2026-01-30", "131", "Pago fraccionado IRPF estimación objetiva 4T 2025", "irpf", "trimestral", "4T2025"],
    [2026, 1, "2026-01-30", "303", "Autoliquidación IVA 4T 2025", "iva", "trimestral", "4T2025"],
    [2026, 1, "2026-01-30", "390", "Resumen anual IVA 2025", "iva", "anual", "2025"],
    // El 31 cae sábado → se prorroga al 2 febrero
    [2026, 2, "2026-02-02", "180", "Resumen anual retenciones arrendamientos 2025", "retenciones", "anual", "2025"],
    [2026, 2, "2026-02-02", "184", "Entidades régimen atribución de rentas 2025", "informativas", "anual", "2025"],
    [2026, 2, "2026-02-02", "187", "Acciones y participaciones IIC. Resumen anual 2025", "informativas", "anual", "2025"],
    [2026, 2, "2026-02-02", "188", "Retenciones activos financieros. Resumen anual 2025", "retenciones", "anual", "2025"],
    [2026, 2, "2026-02-02", "190", "Resumen anual retenciones trabajo/profesionales 2025", "retenciones", "anual", "2025"],
    [2026, 2, "2026-02-02", "193", "Resumen anual retenciones capital mobiliario 2025", "retenciones", "anual", "2025"],
    [2026, 2, "2026-02-02", "194", "Retenciones capital mobiliario activos financieros anual 2025", "retenciones", "anual", "2025"],
    [2026, 2, "2026-02-02", "196", "Retenciones capital mobiliario cuentas. Resumen anual 2025", "retenciones", "anual", "2025"],
    [2026, 2, "2026-02-02", "198", "Operaciones con activos financieros 2025", "informativas", "anual", "2025"],
    // FEBRERO 2026
    [2026, 2, "2026-02-20", "111", "Retenciones IRPF grandes empresas enero 2026", "retenciones", "mensual", "ENE2026"],
    [2026, 2, "2026-02-20", "115", "Retenciones arrendamientos grandes empresas enero 2026", "retenciones", "mensual", "ENE2026"],
    [2026, 2, "2026-02-20", "123", "Retenciones capital mobiliario grandes empresas enero 2026", "retenciones", "mensual", "ENE2026"],
    [2026, 2, "2026-02-20", "170", "Operaciones con tarjetas de pago enero 2026 (NUEVO)", "informativas", "mensual", "ENE2026"],
    [2026, 3, "2026-03-02", "347", "Declaración anual operaciones con terceros 2025", "informativas", "anual", "2025"],
    // MARZO 2026
    [2026, 3, "2026-03-31", "720", "Bienes y derechos en el extranjero 2025", "informativas", "anual", "2025"],
    [2026, 3, "2026-03-31", "721", "Monedas virtuales en el extranjero 2025", "informativas", "anual", "2025"],
    // ABRIL 2026 - Inicio Renta
    [2026, 4, "2026-04-08", "100", "Inicio campaña Renta y Patrimonio 2025 (Internet)", "irpf", "anual", "2025"],
    [2026, 4, "2026-04-20", "111", "Retenciones IRPF 1T 2026", "retenciones", "trimestral", "1T2026"],
    [2026, 4, "2026-04-20", "115", "Retenciones arrendamientos 1T 2026", "retenciones", "trimestral", "1T2026"],
    [2026, 4, "2026-04-20", "117", "Retenciones IIC 1T 2026", "retenciones", "trimestral", "1T2026"],
    [2026, 4, "2026-04-20", "123", "Retenciones capital mobiliario 1T 2026", "retenciones", "trimestral", "1T2026"],
    [2026, 4, "2026-04-20", "130", "Pago fraccionado IRPF estimación directa 1T 2026", "irpf", "trimestral", "1T2026"],
    [2026, 4, "2026-04-20", "131", "Pago fraccionado IRPF módulos 1T 2026", "irpf", "trimestral", "1T2026"],
    [2026, 4, "2026-04-20", "202", "Pago fraccionado IS (1er pago) 2026", "sociedades", "trimestral", "1T2026"],
    [2026, 4, "2026-04-20", "303", "Autoliquidación IVA 1T 2026", "iva", "trimestral", "1T2026"],
    [2026, 4, "2026-04-20", "349", "Operaciones intracomunitarias 1T 2026", "iva", "trimestral", "1T2026"],
    // JUNIO 2026 - Fin Renta
    [2026, 6, "2026-06-25", "100", "Renta 2025 - Último día con domiciliación bancaria", "irpf", "anual", "2025"],
    [2026, 6, "2026-06-30", "100", "Fin campaña Renta y Patrimonio 2025", "irpf", "anual", "2025"],
    [2026, 6, "2026-06-30", "714", "Fin campaña Patrimonio 2025", "irpf", "anual", "2025"],
    // JULIO 2026 - 2T + IS
    [2026, 7, "2026-07-20", "111", "Retenciones IRPF 2T 2026", "retenciones", "trimestral", "2T2026"],
    [2026, 7, "2026-07-20", "115", "Retenciones arrendamientos 2T 2026", "retenciones", "trimestral", "2T2026"],
    [2026, 7, "2026-07-20", "123", "Retenciones capital mobiliario 2T 2026", "retenciones", "trimestral", "2T2026"],
    [2026, 7, "2026-07-20", "130", "Pago fraccionado IRPF estimación directa 2T 2026", "irpf", "trimestral", "2T2026"],
    [2026, 7, "2026-07-20", "131", "Pago fraccionado IRPF módulos 2T 2026", "irpf", "trimestral", "2T2026"],
    [2026, 7, "2026-07-20", "202", "Pago fraccionado IS (2º pago) 2026", "sociedades", "trimestral", "2T2026"],
    [2026, 7, "2026-07-20", "303", "Autoliquidación IVA 2T 2026", "iva", "trimestral", "2T2026"],
    [2026, 7, "2026-07-20", "349", "Operaciones intracomunitarias 2T 2026", "iva", "trimestral", "2T2026"],
    [2026, 7, "2026-07-25", "200", "Impuesto de Sociedades 2025", "sociedades", "anual", "2025"],
    [2026, 7, "2026-07-25", "220", "IS Grupos consolidados 2025", "sociedades", "anual", "2025"],
    // OCTUBRE 2026 - 3T
    [2026, 10, "2026-10-20", "111", "Retenciones IRPF 3T 2026", "retenciones", "trimestral", "3T2026"],
    [2026, 10, "2026-10-20", "115", "Retenciones arrendamientos 3T 2026", "retenciones", "trimestral", "3T2026"],
    [2026, 10, "2026-10-20", "123", "Retenciones capital mobiliario 3T 2026", "retenciones", "trimestral", "3T2026"],
    [2026, 10, "2026-10-20", "130", "Pago fraccionado IRPF estimación directa 3T 2026", "irpf", "trimestral", "3T2026"],
    [2026, 10, "2026-10-20", "131", "Pago fraccionado IRPF módulos 3T 2026", "irpf", "trimestral", "3T2026"],
    [2026, 10, "2026-10-20", "202", "Pago fraccionado IS (3er pago) 2026", "sociedades", "trimestral", "3T2026"],
    [2026, 10, "2026-10-20", "303", "Autoliquidación IVA 3T 2026", "iva", "trimestral", "3T2026"],
    [2026, 10, "2026-10-20", "349", "Operaciones intracomunitarias 3T 2026", "iva", "trimestral", "3T2026"]
  ];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(...row);
    }
  });
  insertMany(deadlines2026);
}
const execAsync = util.promisify(child_process.exec);
const ALGORITHM = "aes-256-gcm";
function getCertSha1(certData) {
  try {
    let derBuffer;
    if (Buffer.isBuffer(certData)) {
      derBuffer = certData;
    } else if (certData instanceof Uint8Array) {
      derBuffer = Buffer.from(certData);
    } else if (typeof certData === "string") {
      const match = certData.match(/-----BEGIN CERTIFICATE-----\s*([\s\S]+?)\s*-----END CERTIFICATE-----/);
      if (match) {
        derBuffer = Buffer.from(match[1].replace(/\s+/g, ""), "base64");
      } else {
        derBuffer = Buffer.from(certData, "binary");
      }
    } else {
      return "";
    }
    return crypto__namespace.createHash("sha1").update(derBuffer).digest("hex").toUpperCase();
  } catch {
    return "";
  }
}
function getCertElectronFingerprint(p12Buffer, password) {
  try {
    const p12Der = forge__namespace.util.createBuffer(p12Buffer.toString("binary"));
    const p12 = forge__namespace.pkcs12.pkcs12FromAsn1(forge__namespace.asn1.fromDer(p12Der), password);
    const bags = p12.getBags({ bagType: forge__namespace.pki.oids.certBag });
    const certBags = bags[forge__namespace.pki.oids.certBag];
    if (!certBags?.length) return "";
    const derBytes = forge__namespace.asn1.toDer(forge__namespace.pki.certificateToAsn1(certBags[0].cert)).getBytes();
    const sha256b64 = crypto__namespace.createHash("sha256").update(Buffer.from(derBytes, "binary")).digest("base64");
    return `sha256/${sha256b64}`;
  } catch {
    return "";
  }
}
function deriveKey(password, salt) {
  return crypto__namespace.pbkdf2Sync(password, salt, 1e5, 32, "sha256");
}
function encryptP12(p12Buffer, password) {
  const salt = crypto__namespace.randomBytes(16);
  const key = deriveKey(password, salt);
  const iv = crypto__namespace.randomBytes(12);
  const cipher = crypto__namespace.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(p12Buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([authTag, encrypted]);
  return {
    encrypted: combined.toString("base64"),
    iv: iv.toString("base64"),
    salt: salt.toString("base64")
  };
}
function decryptP12(encryptedBase64, ivBase64, saltBase64, password) {
  const salt = Buffer.from(saltBase64, "base64");
  const key = deriveKey(password, salt);
  const iv = Buffer.from(ivBase64, "base64");
  const combined = Buffer.from(encryptedBase64, "base64");
  const authTag = combined.subarray(0, 16);
  const encrypted = combined.subarray(16);
  const decipher = crypto__namespace.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
function parseP12Info(p12Buffer, password) {
  try {
    const p12Der = forge__namespace.util.createBuffer(p12Buffer.toString("binary"));
    const p12Asn1 = forge__namespace.asn1.fromDer(p12Der);
    const p12 = forge__namespace.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    let subject = "";
    let issuer = "";
    let serialNumber = "";
    let validFrom = "";
    let validTo = "";
    let fingerprint = "";
    const bags = p12.getBags({ bagType: forge__namespace.pki.oids.certBag });
    const certBags = bags[forge__namespace.pki.oids.certBag];
    if (certBags && certBags.length > 0) {
      const cert = certBags[0].cert;
      const subjectAttrs = cert.subject.attributes;
      const commonName = subjectAttrs.find((a) => a.name === "commonName");
      subject = String(commonName?.value || subjectAttrs.map((a) => `${a.shortName}=${a.value}`).join(", "));
      issuer = cert.issuer.attributes.map((a) => `${a.shortName}=${a.value}`).join(", ");
      serialNumber = cert.serialNumber;
      validFrom = cert.validity.notBefore.toISOString();
      validTo = cert.validity.notAfter.toISOString();
      const der = forge__namespace.asn1.toDer(forge__namespace.pki.certificateToAsn1(cert)).getBytes();
      const md = forge__namespace.md.sha1.create();
      md.update(der);
      fingerprint = md.digest().toHex().toUpperCase().match(/.{2}/g).join(":");
    }
    return { subject, issuer, serialNumber, validFrom, validTo, fingerprint };
  } catch {
    return { subject: "", issuer: "", serialNumber: "", validFrom: "", validTo: "", fingerprint: "" };
  }
}
function repackageP12(buffer, originalPassword, newPassword) {
  const p12Der = forge__namespace.util.createBuffer(buffer.toString("binary"));
  const p12Asn1 = forge__namespace.asn1.fromDer(p12Der);
  const p12 = forge__namespace.pkcs12.pkcs12FromAsn1(p12Asn1, originalPassword);
  const keyBags = p12.getBags({ bagType: forge__namespace.pki.oids.pkcs8ShroudedKeyBag });
  const certBags = p12.getBags({ bagType: forge__namespace.pki.oids.certBag });
  const keyBag = keyBags[forge__namespace.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  const certs = (certBags[forge__namespace.pki.oids.certBag] ?? []).map((b) => b.cert).filter((c) => !!c);
  if (!keyBag?.key) throw new Error("No se encontró la clave privada en el P12");
  const newP12Asn1 = forge__namespace.pkcs12.toPkcs12Asn1(keyBag.key, certs, newPassword, {
    algorithm: "3des",
    friendlyName: certs[0]?.subject.getField("CN")?.value ?? void 0
  });
  return Buffer.from(forge__namespace.asn1.toDer(newP12Asn1).getBytes(), "binary");
}
async function cleanOsStore() {
  try {
    const rows = getDb().prepare(
      "SELECT fingerprint FROM certificates WHERE fingerprint IS NOT NULL AND fingerprint != ''"
    ).all();
    const sha1sFromDb = rows.map((r) => r.fingerprint.replace(/:/g, "").toUpperCase()).filter(Boolean);
    let trackedThumbs = [];
    try {
      const trackedRows = getDb().prepare(
        "SELECT thumbprint FROM installed_cert_thumbprints"
      ).all();
      trackedThumbs = trackedRows.map((r) => r.thumbprint.toUpperCase()).filter(Boolean);
    } catch {
    }
    const allThumbs = [.../* @__PURE__ */ new Set([...sha1sFromDb, ...trackedThumbs])];
    if (allThumbs.length === 0) return { cleaned: 0 };
    if (process.platform === "win32") {
      const thumbprintList = allThumbs.map((t) => `'${t}'`).join(",");
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
`;
      try {
        const psEncoded = Buffer.from(psScript, "utf16le").toString("base64");
        const { stdout } = await execAsync(
          `powershell -NonInteractive -EncodedCommand ${psEncoded}`,
          { encoding: "utf8", timeout: 3e4 }
        );
        try {
          getDb().prepare("DELETE FROM installed_cert_thumbprints").run();
        } catch {
        }
        return { cleaned: parseInt(stdout.trim(), 10) || 0 };
      } catch {
        return { cleaned: 0 };
      }
    }
    if (process.platform === "darwin") {
      const keychainPath = `${os.homedir()}/Library/Keychains/login.keychain-db`;
      let cleaned = 0;
      for (const sha1 of allThumbs) {
        try {
          await execAsync(
            `security delete-identity -Z '${sha1}' '${keychainPath}' 2>/dev/null || security delete-certificate -Z '${sha1}' '${keychainPath}' 2>/dev/null`,
            { timeout: 5e3 }
          );
          cleaned++;
        } catch {
        }
      }
      try {
        getDb().prepare("DELETE FROM installed_cert_thumbprints").run();
      } catch {
      }
      return { cleaned };
    }
  } catch {
  }
  return { cleaned: 0 };
}
function registerCertificateHandlers() {
  electron.ipcMain.handle("certificates:parseP12", (_, filePath, password) => {
    const buffer = fs.readFileSync(filePath);
    return parseP12Info(buffer, password);
  });
  electron.ipcMain.handle("certificates:getAll", () => {
    return getDb().prepare(`
      SELECT cert.*, c.name as client_name, c.nif_cif as client_nif
      FROM certificates cert
      LEFT JOIN clients c ON c.id = cert.client_id
      ORDER BY cert.alias ASC
    `).all();
  });
  electron.ipcMain.handle("certificates:getAllMeta", () => {
    return getDb().prepare(`
      SELECT cert.id, cert.client_id, cert.alias, cert.valid_from, cert.valid_to,
             cert.issuer, cert.subject,
             c.name as client_name, c.nif_cif as client_nif
      FROM certificates cert
      LEFT JOIN clients c ON c.id = cert.client_id
      ORDER BY cert.alias ASC
    `).all();
  });
  electron.ipcMain.handle("certificates:getByClient", (_, clientId) => {
    return getDb().prepare(`
      SELECT * FROM certificates WHERE client_id = ? ORDER BY alias ASC
    `).all(clientId);
  });
  electron.ipcMain.handle("certificates:import", (_, data) => {
    const buffer = fs.readFileSync(data.filePath);
    const info = parseP12Info(buffer, data.password);
    const resolvedAlias = data.alias || info.subject || "Certificado";
    const repackaged = repackageP12(buffer, data.password, data.masterPassword);
    const { encrypted, iv, salt } = encryptP12(repackaged, data.masterPassword);
    const clientId = data.clientId ?? null;
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
      fingerprint: info.fingerprint
    });
    const cert = getDb().prepare("SELECT * FROM certificates WHERE id = ?").get(result.lastInsertRowid);
    getDb().prepare(`
      INSERT INTO audit_log (certificate_id, certificate_alias, client_name, action)
      VALUES (?, ?, (SELECT name FROM clients WHERE id = ?), 'import')
    `).run(result.lastInsertRowid, resolvedAlias, clientId);
    return cert;
  });
  electron.ipcMain.handle("certificates:delete", (_, id) => {
    const cert = getDb().prepare("SELECT * FROM certificates WHERE id = ?").get(id);
    if (cert) {
      getDb().prepare(`
        INSERT INTO audit_log (certificate_id, certificate_alias, action)
        VALUES (?, ?, 'delete')
      `).run(id, cert.alias);
    }
    getDb().prepare("DELETE FROM certificates WHERE id = ?").run(id);
    return { success: true };
  });
  electron.ipcMain.handle("certificates:getAuditLog", (_, certId) => {
    if (certId) {
      return getDb().prepare(`
        SELECT * FROM audit_log WHERE certificate_id = ? ORDER BY timestamp DESC LIMIT 200
      `).all(certId);
    }
    return getDb().prepare(`
      SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 500
    `).all();
  });
  electron.ipcMain.handle("certificates:openPortal", (_, certId, url) => {
    const cert = getDb().prepare("SELECT * FROM certificates WHERE id = ?").get(certId);
    if (!cert) return { success: false, error: "Certificado no encontrado" };
    getDb().prepare(`
      INSERT INTO audit_log (certificate_id, certificate_alias, client_name, action, url)
      VALUES (?, ?, (SELECT name FROM clients WHERE id = ?), 'portal_access', ?)
    `).run(certId, cert.alias, cert.client_id, url);
    const win = electron.BrowserWindow.getFocusedWindow();
    if (win) win.webContents.executeJavaScript(`window.open('${url}', '_blank')`);
    return { success: true };
  });
  electron.ipcMain.handle("certificates:openPortalWithCert", async (_, data) => {
    const dbCert = getDb().prepare(`
      SELECT cert.*, c.name as client_name FROM certificates cert
      LEFT JOIN clients c ON c.id = cert.client_id
      WHERE cert.id = ?
    `).get(data.certId);
    if (!dbCert) throw new Error("Certificado no encontrado");
    await Promise.race([
      cleanOsStore(),
      new Promise((r) => setTimeout(r, 4e3))
    ]);
    const p12Buffer = decryptP12(dbCert.encrypted_p12, dbCert.iv, dbCert.salt, data.masterPassword);
    const targetFingerprint = getCertElectronFingerprint(p12Buffer, data.masterPassword);
    const tempPass = crypto__namespace.randomBytes(16).toString("hex");
    let tempP12;
    try {
      tempP12 = repackageP12(p12Buffer, data.masterPassword, tempPass);
    } catch {
      throw new Error("No se pudo leer el certificado. Si fue importado antes de la última actualización, reimporta el archivo .p12.");
    }
    const tempPath = path.join(os.tmpdir(), `aurea-portal-${Date.now()}.pfx`);
    fs.writeFileSync(tempPath, tempP12);
    let winThumbprint = "";
    let winSerialNumber = "";
    let winCertFingerprint = "";
    const cleanup = () => {
      try {
        fs.unlinkSync(tempPath);
      } catch {
      }
      if (process.platform === "win32" && winThumbprint) {
        child_process.exec(
          `powershell -Command "Remove-Item -Path 'Cert:\\CurrentUser\\My\\${winThumbprint}' -DeleteKey -ErrorAction SilentlyContinue"`,
          { timeout: 1e4 },
          () => {
          }
        );
      } else if (process.platform === "darwin" && dbCert.fingerprint) {
        const sha1 = dbCert.fingerprint.replace(/:/g, "");
        const keychainPath = `${os.homedir()}/Library/Keychains/login.keychain-db`;
        child_process.exec(
          `security delete-identity -Z '${sha1}' '${keychainPath}' 2>/dev/null || security delete-certificate -Z '${sha1}' '${keychainPath}' 2>/dev/null`,
          { timeout: 1e4 },
          () => {
          }
        );
      }
    };
    try {
      if (process.platform === "win32") {
        const psImportScript = [
          `$certPwd = ConvertTo-SecureString -String '${tempPass}' -Force -AsPlainText`,
          `$cert = Import-PfxCertificate -FilePath '${tempPath}' -CertStoreLocation Cert:\\CurrentUser\\My -Password $certPwd -Exportable`,
          `Write-Output $cert.Thumbprint`
        ].join("\n");
        const psImportEncoded = Buffer.from(psImportScript, "utf16le").toString("base64");
        const { stdout: psOut, stderr: psErr } = await execAsync(
          `powershell -NonInteractive -EncodedCommand ${psImportEncoded}`,
          { encoding: "utf8", timeout: 3e4 }
        );
        try {
          const { appendFileSync: _afs } = require("fs");
          const { join: _pj } = require("path");
          const { app: _app } = require("electron");
          _afs(
            _pj(_app.getPath("userData"), "cert_debug.log"),
            `[${(/* @__PURE__ */ new Date()).toISOString()}] IMPORT-PFXCERTIFICATE
  certId : ${data.certId}
  stdout : ${psOut?.trim() || "(empty)"}
  stderr : ${psErr?.trim() || "(none)"}
`
          );
        } catch {
        }
        winThumbprint = (psOut.match(/[0-9A-Fa-f]{40}/)?.[0] ?? "").toUpperCase();
        if (winThumbprint) {
          try {
            getDb().prepare(
              "INSERT OR REPLACE INTO installed_cert_thumbprints (thumbprint, cert_id) VALUES (?, ?)"
            ).run(winThumbprint, data.certId);
          } catch {
          }
          try {
            const { stdout: serialOut } = await execAsync(
              `powershell -NonInteractive -Command "(Get-Item 'Cert:\\CurrentUser\\My\\${winThumbprint}').SerialNumber"`,
              { encoding: "utf8", timeout: 1e4 }
            );
            winSerialNumber = serialOut.trim().toLowerCase();
          } catch {
          }
          try {
            const { stdout: b64Out } = await execAsync(
              `powershell -NonInteractive -Command "$c = Get-Item 'Cert:\\CurrentUser\\My\\${winThumbprint}'; [System.Convert]::ToBase64String($c.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))"`,
              { encoding: "utf8", timeout: 1e4 }
            );
            const derBuffer = Buffer.from(b64Out.trim(), "base64");
            const sha256b64 = crypto__namespace.createHash("sha256").update(derBuffer).digest("base64");
            winCertFingerprint = `sha256/${sha256b64}`;
          } catch {
          }
        }
      } else if (process.platform === "darwin") {
        const keychainPath = `${os.homedir()}/Library/Keychains/login.keychain-db`;
        try {
          await execAsync(
            `security import '${tempPath}' -k '${keychainPath}' -P '${tempPass}' -A -T ''`,
            { encoding: "utf8", timeout: 3e4 }
          );
        } catch {
        }
      }
      await new Promise((r) => setTimeout(r, 1200));
      const partition = `cert-${data.certId}-${Date.now()}`;
      const portalSession = electron.session.fromPartition(partition);
      const pdfLogPath = path.join(electron.app.getPath("userData"), "pdf_debug.log");
      const pdfLog = (msg) => {
        try {
          fs.appendFileSync(pdfLogPath, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`);
        } catch {
        }
      };
      pdfLog(`=== PORTAL OPEN cert=${data.certId} url=${data.url} ===`);
      portalSession.webRequest.onHeadersReceived((details, callback) => {
        const headers = { ...details.responseHeaders };
        const ctKey = Object.keys(headers).find((k) => k.toLowerCase() === "content-type");
        const cdKey = Object.keys(headers).find((k) => k.toLowerCase() === "content-disposition");
        const xfoKey = Object.keys(headers).find((k) => k.toLowerCase() === "x-frame-options");
        const ct = ctKey ? headers[ctKey].join("") : "";
        const isPdfUrl = details.url.toLowerCase().includes("imprpdf") || details.url.toLowerCase().includes("inserseñacoder") || details.url.toLowerCase().includes("insenacoder") || details.url.toLowerCase().includes("generapdf") || details.url.toLowerCase().includes(".pdf");
        const isPdfCt = ct.toLowerCase().includes("pdf") || ct === "application/octet-stream";
        if (isPdfUrl || isPdfCt) {
          pdfLog(`=== PDF ENDPOINT ${details.statusCode} ${details.url} ===`);
          for (const [k, v] of Object.entries(headers)) {
            pdfLog(`  ${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
          }
        }
        if (isPdfUrl) {
          pdfLog(`  → PDF URL detected: forcing attachment download`);
          headers["content-type"] = ["application/pdf"];
          headers["content-disposition"] = ['attachment; filename="resolucion.pdf"'];
          if (xfoKey) {
            delete headers[xfoKey];
            pdfLog(`  → Removing X-Frame-Options`);
          }
          const cspKey2 = Object.keys(headers).find((k) => k.toLowerCase() === "content-security-policy");
          if (cspKey2) {
            delete headers[cspKey2];
          }
          callback({ responseHeaders: headers });
          return;
        }
        if (xfoKey) {
          pdfLog(`  → Removing X-Frame-Options`);
          delete headers[xfoKey];
        }
        callback({ responseHeaders: headers });
      });
      portalSession.on("will-download", (_event, item) => {
        const url = item.getURL();
        const mime = item.getMimeType();
        if (url.includes("ImprPDF") || url.includes("InSeNaCoder") || mime === "application/pdf") {
          const savePath = path.join(electron.app.getPath("temp"), `resolucion-${Date.now()}.pdf`);
          pdfLog(`WILL-DOWNLOAD PDF url=${url} mime=${mime} → saving to ${savePath}`);
          item.setSavePath(savePath);
          item.once("done", (_ev, state) => {
            if (state === "completed") {
              pdfLog(`PDF saved OK → opening with system viewer`);
              electron.shell.openPath(savePath);
            } else {
              pdfLog(`PDF download failed: state=${state}`);
            }
          });
        }
      });
      const selectCertHandler = (event, eventWebContents, _url, list, callback) => {
        if (eventWebContents.session !== portalSession) return;
        event.preventDefault();
        try {
          const { appendFileSync: _afs } = require("fs");
          const { join: _pj } = require("path");
          const { app: _app } = require("electron");
          _afs(
            _pj(_app.getPath("userData"), "cert_debug.log"),
            `[${(/* @__PURE__ */ new Date()).toISOString()}] SELECT-CLIENT-CERTIFICATE
  url           : ${_url}
  winThumbprint : ${winThumbprint || "(empty)"}
  winCertFP     : ${winCertFingerprint || "(empty)"}
  winSerial     : ${winSerialNumber || "(empty)"}
  targetFP      : ${targetFingerprint || "(empty)"}
  list.length   : ${list.length}
` + list.map((c, i) => `  cert[${i}] fp=${c.fingerprint} serial=${c.serialNumber} subj=${c.subjectName}`).join("\n") + "\n"
          );
        } catch {
        }
        const fpToMatch = winCertFingerprint || targetFingerprint;
        if (fpToMatch) {
          const match = list.find((c) => c.fingerprint === fpToMatch);
          if (match) {
            callback(match);
            return;
          }
        }
        const storedSha1 = dbCert.fingerprint ? dbCert.fingerprint.replace(/:/g, "").toUpperCase() : null;
        const matchSha1 = list.find((c) => {
          const sha1 = getCertSha1(c.data);
          if (!sha1) return false;
          if (winThumbprint && sha1 === winThumbprint) return true;
          if (storedSha1 && sha1 === storedSha1) return true;
          return false;
        });
        if (matchSha1) {
          callback(matchSha1);
          return;
        }
        const normalize = (s) => (s ?? "").toLowerCase().replace(/^0+/, "");
        const targetSerial = normalize(winSerialNumber) || normalize(dbCert.serial_number);
        if (targetSerial) {
          const matchSerial = list.find((c) => normalize(c.serialNumber) === targetSerial);
          if (matchSerial) {
            callback(matchSerial);
            return;
          }
        }
        try {
          const { appendFileSync: _afs } = require("fs");
          const { join: _pj } = require("path");
          const { app: _app } = require("electron");
          _afs(
            _pj(_app.getPath("userData"), "cert_debug.log"),
            `[${(/* @__PURE__ */ new Date()).toISOString()}] NO MATCH — all strategies failed
`
          );
        } catch {
        }
        console.error(
          `[ÁureaCert] select-client-certificate: no match for cert id=${data.certId} (${dbCert.alias}).`,
          `targetFingerprint=${targetFingerprint} winSerial=${winSerialNumber}`,
          `list=${list.map((c) => `${c.fingerprint}|${c.serialNumber}`).join(", ")}`
        );
        callback();
      };
      electron.app.on("select-client-certificate", selectCertHandler);
      const win = new electron.BrowserWindow({
        width: 1280,
        height: 900,
        title: `${dbCert.alias} — ÁureaCert`,
        // plugins:true enables Chromium's built-in PDF viewer (PDFium). Without it,
        // PDFs served inline (e.g. TGSS resolutions) open as a BLANK page. Required
        // both here and on popups below.
        webPreferences: { sandbox: true, partition, plugins: true }
      });
      win.webContents.setWindowOpenHandler(() => ({
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 1280,
          height: 900,
          webPreferences: { sandbox: true, partition, plugins: true }
        }
      }));
      const downloadHandler = (_e, item) => {
        const suggested = item.getFilename() || "resolucion.pdf";
        const savePath = electron.dialog.showSaveDialogSync(win, {
          title: "Guardar documento",
          defaultPath: path.join(electron.app.getPath("downloads"), suggested)
        });
        if (!savePath) {
          item.cancel();
          return;
        }
        item.setSavePath(savePath);
        item.once("done", (_evt, state) => {
          if (state === "completed") {
            try {
              electron.shell.openPath(savePath);
            } catch {
            }
          }
        });
      };
      portalSession.on("will-download", downloadHandler);
      win.webContents.on("before-input-event", (_e, input) => {
        if (input.type === "keyDown" && input.key === "F12") win.webContents.openDevTools();
      });
      win.webContents.on("will-navigate", (_e, url) => pdfLog(`NAVIGATE ${url}`));
      win.webContents.on("did-navigate", (_e, url) => pdfLog(`DID-NAVIGATE ${url}`));
      win.webContents.on("did-navigate-in-page", (_e, url) => pdfLog(`SPA-NAVIGATE ${url}`));
      win.webContents.on("did-create-window", (childWin) => {
        pdfLog(`POPUP CREATED url=${childWin.webContents.getURL()}`);
        childWin.webContents.on("before-input-event", (_e, input) => {
          if (input.type === "keyDown" && input.key === "F12") childWin.webContents.openDevTools();
        });
        childWin.webContents.on("will-navigate", (_e, url) => pdfLog(`POPUP NAVIGATE ${url}`));
        childWin.webContents.on("did-navigate", (_e, url) => pdfLog(`POPUP DID-NAVIGATE ${url}`));
        childWin.webContents.on("did-finish-load", () => pdfLog(`POPUP LOADED ${childWin.webContents.getURL()}`));
      });
      win.webContents.on("will-prevent-unload", (event) => {
        event.preventDefault();
      });
      win.on("closed", () => {
        try {
          electron.app.removeListener("select-client-certificate", selectCertHandler);
        } catch {
        }
        try {
          portalSession.removeListener("will-download", downloadHandler);
        } catch {
        }
        cleanup();
      });
      let initialLoadDone = false;
      win.webContents.on("did-finish-load", () => {
        if (initialLoadDone) return;
        initialLoadDone = true;
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
        `).catch(() => {
        });
      });
      win.loadURL(data.url);
      getDb().prepare(`
        INSERT INTO audit_log (certificate_id, certificate_alias, client_name, action, url)
        VALUES (?, ?, ?, 'portal_access', ?)
      `).run(data.certId, dbCert.alias, dbCert.client_name ?? null, data.url);
      return { success: true };
    } catch (err) {
      cleanup();
      throw err;
    }
  });
  electron.ipcMain.handle("certificates:cleanOsStore", async () => {
    return cleanOsStore();
  });
  electron.ipcMain.handle("certificates:scanOsStore", async () => {
    if (process.platform === "win32") return scanWindowsCertStore();
    return [];
  });
  electron.ipcMain.handle("certificates:openBatchPortal", async (_, data) => {
    for (let i = 0; i < data.certs.length; i++) {
      const cert = data.certs[i];
      const win = new electron.BrowserWindow({
        width: 1280,
        height: 900,
        title: `${cert.alias} — ÁureaCert`,
        webPreferences: { sandbox: true, partition: `cert-${cert.id}-${Date.now()}-${i}` }
      });
      win.webContents.on("select-client-certificate", (event, _url, list, callback) => {
        event.preventDefault();
        const match = list.find(
          (c) => c.serialNumber?.toLowerCase().replace(/^0+/, "") === cert.serialNumber?.toLowerCase().replace(/^0+/, "")
        );
        callback(match ?? list[0] ?? void 0);
      });
      await new Promise((resolve) => setTimeout(resolve, i * 600));
      win.loadURL(data.url);
    }
    return { success: true, opened: data.certs.length };
  });
  electron.ipcMain.handle("certificates:importFromOsStore", async (_, data) => {
    if (process.platform !== "win32") throw new Error("Solo disponible en Windows");
    return importCertFromWindowsStore(data.thumbprint, data.alias, data.clientId, data.masterPassword, data.password);
  });
}
async function scanWindowsCertStore() {
  try {
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
`;
    const psEncoded = Buffer.from(psScript, "utf16le").toString("base64");
    const { stdout } = await execAsync(
      `powershell -NonInteractive -EncodedCommand ${psEncoded}`,
      { encoding: "utf8", timeout: 9e4 }
      // 90s: 150 certs × CNG introspection can be slow
    );
    const raw = JSON.parse(stdout.trim());
    return Array.isArray(raw) ? raw : [raw];
  } catch {
    return [];
  }
}
async function importCertFromWindowsStore(thumbprint, alias, clientId, masterPassword, _certPassword) {
  const tempPass = crypto__namespace.randomBytes(16).toString("hex");
  const tempPath = path.join(os.tmpdir(), `aurea-${Date.now()}.pfx`);
  try {
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
Export-PfxCertificate -Cert $cert -FilePath '${tempPath.replace(/\\/g, "\\\\")}' -Password $p | Out-Null
`;
    const psEncoded = Buffer.from(psScript, "utf16le").toString("base64");
    try {
      await execAsync(
        `powershell -NonInteractive -EncodedCommand ${psEncoded}`,
        { encoding: "utf8", timeout: 3e4 }
      );
    } catch (psErr) {
      const detail = (psErr.stderr || "").trim() || (psErr.stdout || "").trim() || psErr.message || "Error desconocido";
      throw new Error(`PowerShell: ${detail.replace(/\r?\n/g, " ").slice(0, 300)}`);
    }
    const buffer = fs.readFileSync(tempPath);
    const info = parseP12Info(buffer, tempPass);
    const repackaged = repackageP12(buffer, tempPass, masterPassword);
    const { encrypted, iv, salt } = encryptP12(repackaged, masterPassword);
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
      fingerprint: info.fingerprint
    });
    getDb().prepare(`
      INSERT INTO audit_log (certificate_id, certificate_alias, client_name, action)
      VALUES (?, ?, (SELECT name FROM clients WHERE id = ?), 'import_os_store')
    `).run(result.lastInsertRowid, alias, clientId);
    return getDb().prepare("SELECT * FROM certificates WHERE id = ?").get(result.lastInsertRowid);
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {
    }
  }
}
function registerClientHandlers() {
  electron.ipcMain.handle("clients:getAll", () => {
    return getDb().prepare(`
      SELECT c.*,
        COUNT(DISTINCT cert.id) as cert_count,
        COUNT(DISTINCT proc.id) as procedure_count
      FROM clients c
      LEFT JOIN certificates cert ON cert.client_id = c.id
      LEFT JOIN procedures proc ON proc.client_id = c.id AND proc.status != 'cancelled'
      WHERE c.active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
  });
  electron.ipcMain.handle("clients:getById", (_, id) => {
    return getDb().prepare("SELECT * FROM clients WHERE id = ?").get(id);
  });
  electron.ipcMain.handle("clients:search", (_, query) => {
    const q = `%${query}%`;
    return getDb().prepare(`
      SELECT * FROM clients
      WHERE active = 1 AND (name LIKE ? OR nif_cif LIKE ? OR email LIKE ?)
      ORDER BY name ASC LIMIT 50
    `).all(q, q, q);
  });
  electron.ipcMain.handle("clients:create", (_, data) => {
    const stmt = getDb().prepare(`
      INSERT INTO clients (name, nif_cif, type, email, phone, address, city, postal_code, notes)
      VALUES (@name, @nif_cif, @type, @email, @phone, @address, @city, @postal_code, @notes)
    `);
    const result = stmt.run(data);
    return getDb().prepare("SELECT * FROM clients WHERE id = ?").get(result.lastInsertRowid);
  });
  electron.ipcMain.handle("clients:update", (_, id, data) => {
    getDb().prepare(`
      UPDATE clients SET
        name = @name, nif_cif = @nif_cif, type = @type,
        email = @email, phone = @phone, address = @address,
        city = @city, postal_code = @postal_code, notes = @notes,
        updated_at = datetime('now')
      WHERE id = @id
    `).run({ ...data, id });
    return getDb().prepare("SELECT * FROM clients WHERE id = ?").get(id);
  });
  electron.ipcMain.handle("clients:delete", (_, id) => {
    getDb().prepare("UPDATE clients SET active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    return { success: true };
  });
}
function registerProcedureHandlers() {
  electron.ipcMain.handle("procedures:getAll", (_, clientId) => {
    if (clientId) {
      return getDb().prepare(`
        SELECT p.*, c.name as client_name, c.nif_cif as client_nif
        FROM procedures p
        LEFT JOIN clients c ON c.id = p.client_id
        WHERE p.client_id = ?
        ORDER BY p.due_date ASC, p.created_at DESC
      `).all(clientId);
    }
    return getDb().prepare(`
      SELECT p.*, c.name as client_name, c.nif_cif as client_nif
      FROM procedures p
      LEFT JOIN clients c ON c.id = p.client_id
      ORDER BY p.due_date ASC, p.created_at DESC
    `).all();
  });
  electron.ipcMain.handle("procedures:getById", (_, id) => {
    return getDb().prepare(`
      SELECT p.*, c.name as client_name, c.nif_cif
      FROM procedures p LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.id = ?
    `).get(id);
  });
  electron.ipcMain.handle("procedures:getUpcoming", (_, days) => {
    return getDb().prepare(`
      SELECT p.*, c.name as client_name, c.nif_cif
      FROM procedures p LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.status IN ('pending','in_progress')
        AND p.due_date IS NOT NULL
        AND date(p.due_date) <= date('now', '+' || ? || ' days')
        AND date(p.due_date) >= date('now')
      ORDER BY p.due_date ASC
      LIMIT 50
    `).all(days);
  });
  electron.ipcMain.handle("procedures:create", (_, data) => {
    const result = getDb().prepare(`
      INSERT INTO procedures
        (client_id, category, organism, model_number, name, description,
         status, due_date, notes, portal_url, alert_days)
      VALUES
        (@client_id, @category, @organism, @model_number, @name, @description,
         @status, @due_date, @notes, @portal_url, @alert_days)
    `).run(data);
    return getDb().prepare("SELECT * FROM procedures WHERE id = ?").get(result.lastInsertRowid);
  });
  electron.ipcMain.handle("procedures:update", (_, id, data) => {
    getDb().prepare(`
      UPDATE procedures SET
        client_id = @client_id, category = @category, organism = @organism,
        model_number = @model_number, name = @name, description = @description,
        status = @status, due_date = @due_date, presented_at = @presented_at,
        notes = @notes, portal_url = @portal_url, alert_days = @alert_days,
        updated_at = datetime('now')
      WHERE id = @id
    `).run({ ...data, id });
    return getDb().prepare("SELECT * FROM procedures WHERE id = ?").get(id);
  });
  electron.ipcMain.handle("procedures:delete", (_, id) => {
    getDb().prepare("DELETE FROM procedures WHERE id = ?").run(id);
    return { success: true };
  });
}
function parseIcs(content) {
  const events = [];
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT" && current) {
      events.push(current);
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).split(";")[0].trim();
        const value = line.substring(colonIdx + 1).trim();
        current[key] = value;
      }
    }
  }
  return events;
}
function icsDateToISO(icsDate) {
  if (icsDate.length === 8) {
    return `${icsDate.substring(0, 4)}-${icsDate.substring(4, 6)}-${icsDate.substring(6, 8)}`;
  }
  return icsDate;
}
function inferCategory(summary) {
  const s = summary.toLowerCase();
  if (s.includes("iva") || s.includes("303") || s.includes("390") || s.includes("349")) return "iva";
  if (s.includes("irpf") || s.includes("renta") || s.includes("130") || s.includes("131") || s.includes("100")) return "irpf";
  if (s.includes("sociedad") || s.includes("200") || s.includes("202")) return "sociedades";
  if (s.includes("retenci") || s.includes("111") || s.includes("115") || s.includes("190") || s.includes("180")) return "retenciones";
  if (s.includes("seguridad social") || s.includes("tgss") || s.includes("reta")) return "ss";
  if (s.includes("informativa") || s.includes("347") || s.includes("720") || s.includes("721")) return "informativas";
  return "otros";
}
function registerCalendarHandlers() {
  electron.ipcMain.handle("calendar:getDeadlines", (_, year, month) => {
    if (month !== void 0) {
      return getDb().prepare(`
        SELECT * FROM fiscal_calendar WHERE year = ? AND month = ? ORDER BY due_date ASC
      `).all(year, month);
    }
    return getDb().prepare(`
      SELECT * FROM fiscal_calendar WHERE year = ? ORDER BY due_date ASC
    `).all(year);
  });
  electron.ipcMain.handle("calendar:getUpcoming", (_, days) => {
    return getDb().prepare(`
      SELECT * FROM fiscal_calendar
      WHERE date(due_date) >= date('now')
        AND date(due_date) <= date('now', '+' || ? || ' days')
      ORDER BY due_date ASC
      LIMIT 30
    `).all(days);
  });
  electron.ipcMain.handle("calendar:getImportedCalendars", () => {
    return getDb().prepare("SELECT * FROM imported_calendars ORDER BY imported_at DESC").all();
  });
  electron.ipcMain.handle("calendar:importIcs", (_, filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const events = parseIcs(content);
    if (events.length === 0) {
      return { success: false, error: "No se encontraron eventos en el archivo" };
    }
    const years = /* @__PURE__ */ new Set();
    for (const e of events) {
      const dateStr = e["DTSTART"] || e["DTEND"] || "";
      if (dateStr.length >= 4) years.add(parseInt(dateStr.substring(0, 4)));
    }
    const year = years.size > 0 ? Math.max(...years) : (/* @__PURE__ */ new Date()).getFullYear();
    const calResult = getDb().prepare(`
      INSERT INTO imported_calendars (name, year, source_file, events_count)
      VALUES (?, ?, ?, ?)
    `).run(`Calendario AEAT ${year}`, year, filePath, events.length);
    const calId = calResult.lastInsertRowid;
    const insert = getDb().prepare(`
      INSERT INTO fiscal_calendar
        (year, month, due_date, model_number, name, category, periodicity, source, imported_calendar_id)
      VALUES (?, ?, ?, ?, ?, ?, 'puntual', 'ics_import', ?)
    `);
    let imported = 0;
    const insertMany = getDb().transaction(() => {
      for (const event of events) {
        const dtstart = event["DTSTART"] || event["DTEND"] || "";
        if (!dtstart) continue;
        const isoDate = icsDateToISO(dtstart.split("T")[0]);
        const dateParts = isoDate.split("-");
        if (dateParts.length < 2) continue;
        const evYear = parseInt(dateParts[0]);
        const evMonth = parseInt(dateParts[1]);
        const summary = event["SUMMARY"] || event["DESCRIPTION"] || "Evento fiscal";
        const category = inferCategory(summary);
        const modelMatch = summary.match(/\b(\d{3})\b/);
        const modelNumber = modelMatch ? modelMatch[1] : null;
        insert.run(evYear, evMonth, isoDate, modelNumber, summary, category, calId);
        imported++;
      }
    });
    insertMany();
    getDb().prepare("UPDATE imported_calendars SET events_count = ? WHERE id = ?").run(imported, calId);
    return { success: true, imported, year };
  });
  electron.ipcMain.handle("calendar:deleteImportedCalendar", (_, id) => {
    getDb().prepare("DELETE FROM fiscal_calendar WHERE imported_calendar_id = ?").run(id);
    getDb().prepare("DELETE FROM imported_calendars WHERE id = ?").run(id);
    return { success: true };
  });
}
function registerSettingsHandlers() {
  electron.ipcMain.handle("settings:get", (_, key) => {
    const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row?.value ?? null;
  });
  electron.ipcMain.handle("settings:set", (_, key, value) => {
    getDb().prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, String(value));
    return { success: true };
  });
  electron.ipcMain.handle("settings:getAll", () => {
    const rows = getDb().prepare("SELECT key, value FROM settings").all();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });
  electron.ipcMain.handle("settings:setLockPassword", (_, password) => {
    const salt = crypto__namespace.randomBytes(16).toString("hex");
    const hash = crypto__namespace.pbkdf2Sync(password, salt, 1e5, 32, "sha256").toString("hex");
    const upsert = getDb().prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    upsert.run("lock_password_hash", hash);
    upsert.run("lock_password_salt", salt);
    return { success: true };
  });
  electron.ipcMain.handle("settings:verifyLockPassword", (_, password) => {
    const hashRow = getDb().prepare("SELECT value FROM settings WHERE key = ?").get("lock_password_hash");
    const saltRow = getDb().prepare("SELECT value FROM settings WHERE key = ?").get("lock_password_salt");
    if (!hashRow || !saltRow) return false;
    const hash = crypto__namespace.pbkdf2Sync(password, saltRow.value, 1e5, 32, "sha256").toString("hex");
    return hash === hashRow.value;
  });
  electron.ipcMain.handle("settings:removeLockPassword", () => {
    getDb().prepare("DELETE FROM settings WHERE key IN ('lock_password_hash', 'lock_password_salt')").run();
    return { success: true };
  });
}
function generateAlerts() {
  const db2 = getDb();
  const certs = db2.prepare(`
    SELECT c.id, c.alias, cl.name as client_name, c.valid_to
    FROM certificates c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.valid_to IS NOT NULL
    AND date(c.valid_to) BETWEEN date('now') AND date('now', '+30 days')
  `).all();
  for (const cert of certs) {
    const sourceKey = `cert_expiry_${cert.id}`;
    const exists = db2.prepare("SELECT id FROM notifications WHERE source_key = ? AND status != 'archived'").get(sourceKey);
    if (!exists) {
      const days = Math.round((new Date(cert.valid_to).getTime() - Date.now()) / 864e5);
      db2.prepare(`
        INSERT INTO notifications (organism, subject, received_at, deadline, status, urgency, source_key)
        VALUES ('Sistema', ?, date('now'), ?, 'unread', ?, ?)
      `).run(
        `Certificado próximo a caducar: ${cert.alias} · ${cert.client_name}`,
        cert.valid_to,
        days <= 15 ? "critical" : "high",
        sourceKey
      );
    }
  }
  const deadlines = db2.prepare(`
    SELECT * FROM fiscal_calendar
    WHERE date(due_date) BETWEEN date('now') AND date('now', '+15 days')
    ORDER BY due_date ASC
  `).all();
  for (const d of deadlines) {
    const sourceKey = `fiscal_${d.id}`;
    const exists = db2.prepare("SELECT id FROM notifications WHERE source_key = ? AND status != 'archived'").get(sourceKey);
    if (!exists) {
      const days = Math.round((new Date(d.due_date).getTime() - Date.now()) / 864e5);
      db2.prepare(`
        INSERT INTO notifications (organism, subject, received_at, deadline, status, urgency, source_key)
        VALUES ('AEAT', ?, date('now'), ?, 'unread', ?, ?)
      `).run(
        d.model_number ? `Plazo fiscal: Modelo ${d.model_number} — ${d.name}` : `Plazo fiscal: ${d.name}`,
        d.due_date,
        days <= 7 ? "critical" : "high",
        sourceKey
      );
    }
  }
}
function registerNotificationHandlers() {
  electron.ipcMain.handle("notifications:getAll", (_, clientId) => {
    if (clientId) {
      return getDb().prepare(`
        SELECT n.*, c.name as client_name, c.nif_cif
        FROM notifications n LEFT JOIN clients c ON c.id = n.client_id
        WHERE n.client_id = ? ORDER BY n.created_at DESC
      `).all(clientId);
    }
    return getDb().prepare(`
      SELECT n.*, c.name as client_name, c.nif_cif
      FROM notifications n LEFT JOIN clients c ON c.id = n.client_id
      ORDER BY n.created_at DESC LIMIT 200
    `).all();
  });
  electron.ipcMain.handle("notifications:getById", (_, id) => {
    return getDb().prepare(`
      SELECT n.*, c.name as client_name FROM notifications n
      LEFT JOIN clients c ON c.id = n.client_id WHERE n.id = ?
    `).get(id);
  });
  electron.ipcMain.handle("notifications:updateStatus", (_, id, status) => {
    getDb().prepare("UPDATE notifications SET status = ? WHERE id = ?").run(status, id);
    return { success: true };
  });
  electron.ipcMain.handle("notifications:delete", (_, id) => {
    getDb().prepare("DELETE FROM notifications WHERE id = ?").run(id);
    return { success: true };
  });
  electron.ipcMain.handle("notifications:generateAlerts", () => {
    generateAlerts();
    return { success: true };
  });
}
function registerCustomTramiteHandlers() {
  electron.ipcMain.handle("custom-tramites:getAll", () => {
    return getDb().prepare("SELECT * FROM custom_tramites ORDER BY created_at DESC").all();
  });
  electron.ipcMain.handle("custom-tramites:getByCategory", (_, category) => {
    return getDb().prepare("SELECT * FROM custom_tramites WHERE category = ? ORDER BY created_at DESC").all(category);
  });
  electron.ipcMain.handle("custom-tramites:create", (_, data) => {
    const result = getDb().prepare(
      "INSERT INTO custom_tramites (name, category, subcategory, portal_url, description) VALUES (?, ?, ?, ?, ?)"
    ).run(data.name, data.category, data.subcategory || "", data.portal_url, data.description || "");
    return { id: result.lastInsertRowid };
  });
  electron.ipcMain.handle("custom-tramites:update", (_, id, data) => {
    getDb().prepare(
      "UPDATE custom_tramites SET name = COALESCE(?, name), portal_url = COALESCE(?, portal_url), description = COALESCE(?, description), subcategory = COALESCE(?, subcategory) WHERE id = ?"
    ).run(data.name ?? null, data.portal_url ?? null, data.description ?? null, data.subcategory ?? null, id);
    return { success: true };
  });
  electron.ipcMain.handle("custom-tramites:delete", (_, id) => {
    getDb().prepare("DELETE FROM custom_tramites WHERE id = ?").run(id);
    return { success: true };
  });
}
const SELECT_SHORTCUT = `
  SELECT s.*, c.alias as cert_alias, c.valid_to as cert_valid_to,
    cl.name as client_name, cl.nif_cif as client_nif
  FROM shortcuts s
  LEFT JOIN certificates c ON c.id = s.certificate_id
  LEFT JOIN clients cl ON cl.id = c.client_id
`;
function registerShortcutHandlers() {
  electron.ipcMain.handle("shortcuts:getAll", () => {
    return getDb().prepare(`${SELECT_SHORTCUT} ORDER BY s.use_count DESC, s.name ASC`).all();
  });
  electron.ipcMain.handle("shortcuts:getTop", (_, limit = 6) => {
    return getDb().prepare(`${SELECT_SHORTCUT} ORDER BY s.use_count DESC, s.last_used DESC LIMIT ?`).all(limit);
  });
  electron.ipcMain.handle("shortcuts:create", (_, data) => {
    const result = getDb().prepare(`
      INSERT INTO shortcuts (name, url, certificate_id, color, notes)
      VALUES (@name, @url, @certificateId, @color, @notes)
    `).run({
      name: data.name,
      url: data.url,
      certificateId: data.certificate_id ?? null,
      color: data.color || "#d4a853",
      notes: data.notes ?? null
    });
    return getDb().prepare(`${SELECT_SHORTCUT} WHERE s.id = ?`).get(result.lastInsertRowid);
  });
  electron.ipcMain.handle("shortcuts:update", (_, id, data) => {
    const fields = [];
    const params = { id };
    if (data.name !== void 0) {
      fields.push("name = @name");
      params.name = data.name;
    }
    if (data.url !== void 0) {
      fields.push("url = @url");
      params.url = data.url;
    }
    if ("certificate_id" in data) {
      fields.push("certificate_id = @certId");
      params.certId = data.certificate_id ?? null;
    }
    if (data.color !== void 0) {
      fields.push("color = @color");
      params.color = data.color;
    }
    if (data.notes !== void 0) {
      fields.push("notes = @notes");
      params.notes = data.notes;
    }
    if (fields.length === 0) return null;
    getDb().prepare(`UPDATE shortcuts SET ${fields.join(", ")} WHERE id = @id`).run(params);
    return getDb().prepare(`${SELECT_SHORTCUT} WHERE s.id = ?`).get(id);
  });
  electron.ipcMain.handle("shortcuts:delete", (_, id) => {
    getDb().prepare("DELETE FROM shortcuts WHERE id = ?").run(id);
    return { success: true };
  });
  electron.ipcMain.handle("shortcuts:recordUse", (_, id) => {
    getDb().prepare(`
      UPDATE shortcuts
      SET use_count = use_count + 1, last_used = datetime('now')
      WHERE id = ?
    `).run(id);
    return { success: true };
  });
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    if (utils.is.dev) mainWindow.webContents.openDevTools();
    setImmediate(async () => {
      generateAlerts();
      try {
        await cleanOsStore();
      } catch {
      }
    });
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (!utils.is.dev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
          ]
        }
      });
    });
  }
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.aurea.certificados");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  initDatabase();
  registerCertificateHandlers();
  registerClientHandlers();
  registerProcedureHandlers();
  registerCalendarHandlers();
  registerSettingsHandlers();
  registerNotificationHandlers();
  registerCustomTramiteHandlers();
  registerShortcutHandlers();
  electron.ipcMain.handle("app:getVersion", () => electron.app.getVersion());
  electron.ipcMain.handle("app:openExternal", (_, url) => electron.shell.openExternal(url));
  electron.ipcMain.handle("dialog:openFile", async (_, options) => {
    const result = await electron.dialog.showOpenDialog(mainWindow, options);
    return result;
  });
  electron.ipcMain.handle("dialog:saveFile", async (_, options) => {
    const result = await electron.dialog.showSaveDialog(mainWindow, options);
    return result;
  });
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
