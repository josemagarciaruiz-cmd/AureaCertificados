import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database

export function getDb(): Database.Database {
  return db
}

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'aurea.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables()
  runMigrations()
}

function runMigrations(): void {
  const notifCols = db.prepare("PRAGMA table_info(notifications)").all() as { name: string }[]
  if (!notifCols.find((c) => c.name === 'source_key')) {
    db.exec("ALTER TABLE notifications ADD COLUMN source_key TEXT")
  }

  const customCols = db.prepare("PRAGMA table_info(custom_tramites)").all() as { name: string }[]
  if (!customCols.find((c) => c.name === 'subcategory')) {
    db.exec("ALTER TABLE custom_tramites ADD COLUMN subcategory TEXT NOT NULL DEFAULT ''")
  }

  // v1.0.6 — Accesos directos
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
  `)

  // Track thumbprints of certs installed by the app in the OS store.
  // cleanOsStore() uses this to remove them even if they are no longer in the certificates table
  // (e.g. certs from previous sessions that crashed before cleanup, or certs deleted from the DB).
  db.exec(`
    CREATE TABLE IF NOT EXISTS installed_cert_thumbprints (
      thumbprint TEXT PRIMARY KEY,
      cert_id    INTEGER REFERENCES certificates(id) ON DELETE SET NULL,
      installed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // v1.0.24 — Justicia / LexNET: widen the custom_tramites category CHECK constraint.
  // SQLite cannot ALTER a CHECK constraint, so the table is rebuilt when the stored
  // schema still lacks 'justicia'. Fresh installs already get it from createTables().
  const ctSchema = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='custom_tramites'")
    .get() as { sql: string } | undefined
  if (ctSchema && !ctSchema.sql.includes("'justicia'")) {
    db.exec(`
      CREATE TABLE custom_tramites_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'aeat' CHECK(category IN ('aeat','tgss','justicia')),
        subcategory TEXT NOT NULL DEFAULT '',
        portal_url TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO custom_tramites_new (id, name, category, subcategory, portal_url, description, created_at)
        SELECT id, name, category, subcategory, portal_url, description, created_at FROM custom_tramites;
      DROP TABLE custom_tramites;
      ALTER TABLE custom_tramites_new RENAME TO custom_tramites;
    `)
  }
}

function createTables(): void {
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
      category TEXT NOT NULL DEFAULT 'aeat' CHECK(category IN ('aeat','tgss','justicia')),
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
  `)

  seedDefaultSettings()
  seedFiscalCalendar2026()
}

function seedDefaultSettings(): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `)
  const defaults = [
    ['despacho_nombre', ''],
    ['despacho_nif', ''],
    ['despacho_email', ''],
    ['despacho_telefono', ''],
    ['despacho_direccion', ''],
    ['cert_alert_days', '30'],
    ['procedure_alert_days', '7'],
    ['smtp_host', ''],
    ['smtp_port', '587'],
    ['smtp_user', ''],
    ['smtp_pass', ''],
    ['smtp_from', ''],
    ['lock_timeout_minutes', '15'],
    ['app_version', '1.0.0'],
  ]
  for (const [key, value] of defaults) {
    insert.run(key, value)
  }
}

function seedFiscalCalendar2026(): void {
  const count = db.prepare('SELECT COUNT(*) as c FROM fiscal_calendar WHERE year = 2026 AND source = ?').get('builtin') as { c: number }
  if (count.c > 0) return

  const insert = db.prepare(`
    INSERT INTO fiscal_calendar (year, month, due_date, model_number, name, category, periodicity, period, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'builtin')
  `)

  const deadlines2026 = [
    // ENERO 2026
    [2026, 1, '2026-01-20', '111', 'Retenciones IRPF trabajo/profesionales 4T 2025', 'retenciones', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-20', '115', 'Retenciones arrendamientos urbanos 4T 2025', 'retenciones', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-20', '117', 'Retenciones acciones/participaciones IIC 4T 2025', 'retenciones', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-20', '123', 'Retenciones capital mobiliario 4T 2025', 'retenciones', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-20', '124', 'Retenciones activos financieros 4T 2025', 'retenciones', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-20', '126', 'Retenciones capital mobiliario cuentas 4T 2025', 'retenciones', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-20', '128', 'Retenciones rentas exentas 4T 2025', 'retenciones', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-30', '130', 'Pago fraccionado IRPF estimación directa 4T 2025', 'irpf', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-30', '131', 'Pago fraccionado IRPF estimación objetiva 4T 2025', 'irpf', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-30', '303', 'Autoliquidación IVA 4T 2025', 'iva', 'trimestral', '4T2025'],
    [2026, 1, '2026-01-30', '390', 'Resumen anual IVA 2025', 'iva', 'anual', '2025'],
    // El 31 cae sábado → se prorroga al 2 febrero
    [2026, 2, '2026-02-02', '180', 'Resumen anual retenciones arrendamientos 2025', 'retenciones', 'anual', '2025'],
    [2026, 2, '2026-02-02', '184', 'Entidades régimen atribución de rentas 2025', 'informativas', 'anual', '2025'],
    [2026, 2, '2026-02-02', '187', 'Acciones y participaciones IIC. Resumen anual 2025', 'informativas', 'anual', '2025'],
    [2026, 2, '2026-02-02', '188', 'Retenciones activos financieros. Resumen anual 2025', 'retenciones', 'anual', '2025'],
    [2026, 2, '2026-02-02', '190', 'Resumen anual retenciones trabajo/profesionales 2025', 'retenciones', 'anual', '2025'],
    [2026, 2, '2026-02-02', '193', 'Resumen anual retenciones capital mobiliario 2025', 'retenciones', 'anual', '2025'],
    [2026, 2, '2026-02-02', '194', 'Retenciones capital mobiliario activos financieros anual 2025', 'retenciones', 'anual', '2025'],
    [2026, 2, '2026-02-02', '196', 'Retenciones capital mobiliario cuentas. Resumen anual 2025', 'retenciones', 'anual', '2025'],
    [2026, 2, '2026-02-02', '198', 'Operaciones con activos financieros 2025', 'informativas', 'anual', '2025'],
    // FEBRERO 2026
    [2026, 2, '2026-02-20', '111', 'Retenciones IRPF grandes empresas enero 2026', 'retenciones', 'mensual', 'ENE2026'],
    [2026, 2, '2026-02-20', '115', 'Retenciones arrendamientos grandes empresas enero 2026', 'retenciones', 'mensual', 'ENE2026'],
    [2026, 2, '2026-02-20', '123', 'Retenciones capital mobiliario grandes empresas enero 2026', 'retenciones', 'mensual', 'ENE2026'],
    [2026, 2, '2026-02-20', '170', 'Operaciones con tarjetas de pago enero 2026 (NUEVO)', 'informativas', 'mensual', 'ENE2026'],
    [2026, 3, '2026-03-02', '347', 'Declaración anual operaciones con terceros 2025', 'informativas', 'anual', '2025'],
    // MARZO 2026
    [2026, 3, '2026-03-31', '720', 'Bienes y derechos en el extranjero 2025', 'informativas', 'anual', '2025'],
    [2026, 3, '2026-03-31', '721', 'Monedas virtuales en el extranjero 2025', 'informativas', 'anual', '2025'],
    // ABRIL 2026 - Inicio Renta
    [2026, 4, '2026-04-08', '100', 'Inicio campaña Renta y Patrimonio 2025 (Internet)', 'irpf', 'anual', '2025'],
    [2026, 4, '2026-04-20', '111', 'Retenciones IRPF 1T 2026', 'retenciones', 'trimestral', '1T2026'],
    [2026, 4, '2026-04-20', '115', 'Retenciones arrendamientos 1T 2026', 'retenciones', 'trimestral', '1T2026'],
    [2026, 4, '2026-04-20', '117', 'Retenciones IIC 1T 2026', 'retenciones', 'trimestral', '1T2026'],
    [2026, 4, '2026-04-20', '123', 'Retenciones capital mobiliario 1T 2026', 'retenciones', 'trimestral', '1T2026'],
    [2026, 4, '2026-04-20', '130', 'Pago fraccionado IRPF estimación directa 1T 2026', 'irpf', 'trimestral', '1T2026'],
    [2026, 4, '2026-04-20', '131', 'Pago fraccionado IRPF módulos 1T 2026', 'irpf', 'trimestral', '1T2026'],
    [2026, 4, '2026-04-20', '202', 'Pago fraccionado IS (1er pago) 2026', 'sociedades', 'trimestral', '1T2026'],
    [2026, 4, '2026-04-20', '303', 'Autoliquidación IVA 1T 2026', 'iva', 'trimestral', '1T2026'],
    [2026, 4, '2026-04-20', '349', 'Operaciones intracomunitarias 1T 2026', 'iva', 'trimestral', '1T2026'],
    // JUNIO 2026 - Fin Renta
    [2026, 6, '2026-06-25', '100', 'Renta 2025 - Último día con domiciliación bancaria', 'irpf', 'anual', '2025'],
    [2026, 6, '2026-06-30', '100', 'Fin campaña Renta y Patrimonio 2025', 'irpf', 'anual', '2025'],
    [2026, 6, '2026-06-30', '714', 'Fin campaña Patrimonio 2025', 'irpf', 'anual', '2025'],
    // JULIO 2026 - 2T + IS
    [2026, 7, '2026-07-20', '111', 'Retenciones IRPF 2T 2026', 'retenciones', 'trimestral', '2T2026'],
    [2026, 7, '2026-07-20', '115', 'Retenciones arrendamientos 2T 2026', 'retenciones', 'trimestral', '2T2026'],
    [2026, 7, '2026-07-20', '123', 'Retenciones capital mobiliario 2T 2026', 'retenciones', 'trimestral', '2T2026'],
    [2026, 7, '2026-07-20', '130', 'Pago fraccionado IRPF estimación directa 2T 2026', 'irpf', 'trimestral', '2T2026'],
    [2026, 7, '2026-07-20', '131', 'Pago fraccionado IRPF módulos 2T 2026', 'irpf', 'trimestral', '2T2026'],
    [2026, 7, '2026-07-20', '202', 'Pago fraccionado IS (2º pago) 2026', 'sociedades', 'trimestral', '2T2026'],
    [2026, 7, '2026-07-20', '303', 'Autoliquidación IVA 2T 2026', 'iva', 'trimestral', '2T2026'],
    [2026, 7, '2026-07-20', '349', 'Operaciones intracomunitarias 2T 2026', 'iva', 'trimestral', '2T2026'],
    [2026, 7, '2026-07-25', '200', 'Impuesto de Sociedades 2025', 'sociedades', 'anual', '2025'],
    [2026, 7, '2026-07-25', '220', 'IS Grupos consolidados 2025', 'sociedades', 'anual', '2025'],
    // OCTUBRE 2026 - 3T
    [2026, 10, '2026-10-20', '111', 'Retenciones IRPF 3T 2026', 'retenciones', 'trimestral', '3T2026'],
    [2026, 10, '2026-10-20', '115', 'Retenciones arrendamientos 3T 2026', 'retenciones', 'trimestral', '3T2026'],
    [2026, 10, '2026-10-20', '123', 'Retenciones capital mobiliario 3T 2026', 'retenciones', 'trimestral', '3T2026'],
    [2026, 10, '2026-10-20', '130', 'Pago fraccionado IRPF estimación directa 3T 2026', 'irpf', 'trimestral', '3T2026'],
    [2026, 10, '2026-10-20', '131', 'Pago fraccionado IRPF módulos 3T 2026', 'irpf', 'trimestral', '3T2026'],
    [2026, 10, '2026-10-20', '202', 'Pago fraccionado IS (3er pago) 2026', 'sociedades', 'trimestral', '3T2026'],
    [2026, 10, '2026-10-20', '303', 'Autoliquidación IVA 3T 2026', 'iva', 'trimestral', '3T2026'],
    [2026, 10, '2026-10-20', '349', 'Operaciones intracomunitarias 3T 2026', 'iva', 'trimestral', '3T2026'],
  ]

  const insertMany = db.transaction((rows: unknown[][]) => {
    for (const row of rows) {
      insert.run(...row)
    }
  })

  insertMany(deadlines2026)
}
