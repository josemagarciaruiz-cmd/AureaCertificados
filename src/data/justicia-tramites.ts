export interface JusticiaTramite {
  id: string
  name: string
  block: string
  category: 'lexnet' | 'territorial' | 'sede' | 'consultas' | 'pagos'
  description: string
  portal_url: string
  system: string
  notes?: string
}

/**
 * Portales de la Administración de Justicia.
 *
 * Reparto territorial: solo cinco comunidades tienen sistema propio de presentación y
 * notificación (Cataluña, País Vasco, Navarra, Aragón y Cantabria). El resto — incluidas
 * Madrid, Andalucía y la Comunidad Valenciana — usa LexNET, aunque tenga su propio gestor
 * procesal (Adriano, Cicerone, Atlante...), que interopera con LexNET en lugar de sustituirlo.
 */
export const JUSTICIA_TRAMITES: JusticiaTramite[] = [
  // BLOQUE 1 — LEXNET
  { id: 'lexnet', name: 'LexNET — Buzón de notificaciones judiciales', block: 'LexNET', category: 'lexnet', description: 'Recepción de notificaciones judiciales y presentación de escritos. Los graduados sociales colegiados actúan en la jurisdicción social: demandas, escritos de trámite y recursos de suplicación', portal_url: 'https://lexnet.justicia.es/', system: 'Ministerio de Justicia', notes: 'Requiere alta previa en LexNET por el Colegio profesional. Firmar escritos necesita Autofirma' },
  { id: 'lexnet-info', name: 'LexNET — Soporte, avisos y manuales', block: 'LexNET', category: 'lexnet', description: 'Portal informativo oficial: incidencias, versiones, formatos y certificados admitidos, guías de uso', portal_url: 'https://www.administraciondejusticia.gob.es/lexnet', system: 'Ministerio de Justicia' },
  { id: 'lexnet-mapa', name: 'Mapa de comunicaciones electrónicas', block: 'LexNET', category: 'lexnet', description: 'Indica qué sistema de notificación aplica en cada provincia y jurisdicción: LexNET o el sistema autonómico correspondiente', portal_url: 'https://www.administraciondejusticia.gob.es/lexnet/mapa-de-comunicaciones-electronicas', system: 'Ministerio de Justicia' },
  { id: 'lexnet-graduados', name: 'LexNET para Graduados Sociales', block: 'LexNET', category: 'lexnet', description: 'Manuales y ayuda del Consejo General de Colegios Oficiales de Graduados Sociales. El acceso al buzón se hace en lexnet.justicia.es con rol de graduado social', portal_url: 'https://www.graduadosocial.org/ilexnet/lexnet.html', system: 'Consejo General Graduados Sociales' },
  { id: 'redabogacia', name: 'RedAbogacía — Servicios telemáticos', block: 'LexNET', category: 'lexnet', description: 'Zona privada del abogado colegiado: certificado ACA, servicios telemáticos y acceso a LexNET', portal_url: 'https://www.redabogacia.org/', system: 'Consejo General de la Abogacía', notes: 'LexNET Abogacía se desconectó en 2017: hoy se accede por lexnet.justicia.es' },
  { id: 'tcpe-procuradores', name: 'TCPE — Traslado de copias (Procuradores)', block: 'LexNET', category: 'lexnet', description: 'Portal del Consejo General de Procuradores integrado con LexNET para el traslado de copias y la presentación de escritos', portal_url: 'https://www.procuradores.es/TCPE', system: 'Consejo General de Procuradores' },

  // BLOQUE 2 — SISTEMAS AUTONÓMICOS (no usan LexNET)
  { id: 'ejusticia-cat', name: 'e-justícia.cat — Extranet del Professional', block: 'Sistemas autonómicos', category: 'territorial', description: 'Cataluña. Presentación de escritos y recepción de notificaciones (NOTICAT). Sustituye a LexNET en todo el territorio catalán', portal_url: 'https://ejcat.justicia.gencat.cat/IAP-ng/', system: 'Generalitat de Catalunya' },
  { id: 'psp-euskadi', name: 'PSP Euskadi (Avantius)', block: 'Sistemas autonómicos', category: 'territorial', description: 'País Vasco. Portal de Servicios al Profesional. Sustituyó definitivamente a JustiziaSip en febrero de 2023', portal_url: 'https://psp.justizia.eus/PSP/', system: 'Gobierno Vasco' },
  { id: 'navarra-justicia', name: 'Avantius Navarra — Sede judicial electrónica', block: 'Sistemas autonómicos', category: 'territorial', description: 'Navarra. Presentación de escritos y notificaciones judiciales a profesionales', portal_url: 'https://administracionelectronica.navarra.es', system: 'Gobierno de Navarra' },
  { id: 'psp-aragon', name: 'PSP Aragón (Avantius)', block: 'Sistemas autonómicos', category: 'territorial', description: 'Aragón. Portal de Servicios al Profesional para escritos y notificaciones judiciales', portal_url: 'https://psp.justicia.aragon.es/psp', system: 'Gobierno de Aragón' },
  { id: 'cantabria-profesional', name: 'Portal Profesional de Cantabria (Vereda)', block: 'Sistemas autonómicos', category: 'territorial', description: 'Cantabria. Presentación telemática de escritos y recepción de notificaciones judiciales', portal_url: 'https://portalprofesional.cantabria.es/', system: 'Gobierno de Cantabria' },

  // BLOQUE 3 — SEDES ELECTRÓNICAS
  { id: 'sede-judicial', name: 'Sede Judicial Electrónica', block: 'Sedes electrónicas', category: 'sede', description: 'Sede estatal de la Administración de Justicia: consulta de procedimientos, presentación de escritos y trámites judiciales', portal_url: 'https://sedejudicial.justicia.es/', system: 'Administración de Justicia' },
  { id: 'carpeta-justicia', name: 'Carpeta Justicia', block: 'Sedes electrónicas', category: 'sede', description: 'Punto de Acceso General de Justicia. Consulta unificada del estado de los procedimientos en los que se es parte', portal_url: 'https://carpeta.justicia.es/', system: 'Ministerio de Justicia', notes: 'Acceso con Cl@ve, no admite certificado directo' },
  { id: 'sede-mjusticia', name: 'Sede Electrónica del Ministerio de Justicia', block: 'Sedes electrónicas', category: 'sede', description: 'Antecedentes penales, Registro Civil, nacionalidad, apostilla de La Haya y resto de trámites del Ministerio', portal_url: 'https://sede.mjusticia.gob.es/', system: 'Ministerio de Justicia' },
  { id: 'portal-justicia', name: 'Portal de la Administración de Justicia', block: 'Sedes electrónicas', category: 'sede', description: 'Portal general del servicio público de Justicia: normativa, novedades y acceso a todos los servicios', portal_url: 'https://www.administraciondejusticia.gob.es/', system: 'Ministerio de Justicia' },

  // BLOQUE 4 — CONSULTAS Y CITAS
  { id: 'subastas-boe', name: 'Portal de Subastas Judiciales', block: 'Consultas y citas', category: 'consultas', description: 'Consulta y participación en subastas judiciales y notariales electrónicas', portal_url: 'https://subastas.boe.es/', system: 'Agencia Estatal BOE' },
  { id: 'cita-registro-civil', name: 'Cita previa Registro Civil', block: 'Consultas y citas', category: 'consultas', description: 'Solicitud de cita previa para trámites presenciales del Registro Civil', portal_url: 'https://sede.mjusticia.gob.es/tramites/cita-previa-registro-civil', system: 'Ministerio de Justicia' },
  { id: 'sede-judicial-madrid', name: 'Sede Judicial Electrónica de Madrid', block: 'Consultas y citas', category: 'consultas', description: 'Comunidad de Madrid. Consulta de procedimientos. Las notificaciones siguen yendo por LexNET', portal_url: 'https://sedejudicial.madrid.org/', system: 'Comunidad de Madrid' },
  { id: 'sede-judicial-gva', name: 'Sede Judicial Electrónica valenciana', block: 'Consultas y citas', category: 'consultas', description: 'Comunidad Valenciana. Consulta del estado de los procedimientos. Las notificaciones van por LexNET', portal_url: 'https://sedejudicial.gva.es/', system: 'Generalitat Valenciana' },

  // BLOQUE 5 — TASAS Y CONSIGNACIONES
  { id: 'cdcj-info', name: 'Cuentas de Depósitos y Consignaciones Judiciales', block: 'Tasas y consignaciones', category: 'pagos', description: 'Información oficial sobre las cuentas judiciales: ingresos, mandamientos de devolución y transferencias', portal_url: 'https://www.administraciondejusticia.gob.es/-/cuentas-de-depositos-y-consignaciones-judiciales-cdcj-', system: 'Ministerio de Justicia' },
  { id: 'cdcj-santander', name: 'Consignaciones judiciales — Banco Santander', block: 'Tasas y consignaciones', category: 'pagos', description: 'Banca electrónica del banco depositario de las cuentas judiciales. Ruta: Supernet → Cuentas y Tarjetas → Pagos → Consignaciones Judiciales', portal_url: 'https://www.bancosantander.es/', system: 'Banco Santander', notes: 'No hay enlace directo estable: hay que navegar desde Supernet' },
]

export const JUSTICIA_BLOCKS = [
  { id: 'lexnet', label: 'LexNET', color: '#c084fc' },
  { id: 'territorial', label: 'Sistemas autonómicos', color: '#34d399' },
  { id: 'sede', label: 'Sedes electrónicas', color: '#60a5fa' },
  { id: 'consultas', label: 'Consultas y citas', color: '#fb923c' },
  { id: 'pagos', label: 'Tasas y consignaciones', color: '#facc15' },
]
