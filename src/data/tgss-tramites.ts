export interface TgssTramite {
  id: string
  name: string
  block: string
  category: 'inscripcion' | 'afiliacion' | 'reta' | 'cotizacion' | 'prestaciones' | 'especiales' | 'certificados' | 'notificaciones'
  description: string
  portal_url: string
  system: string
  notes?: string
}

export const TGSS_TRAMITES: TgssTramite[] = [
  // BLOQUE 1 — INSCRIPCIÓN DE EMPRESAS
  { id: 'autorizado-red', name: 'Autorización RED — Alta y gestión de accesos', block: 'Inscripción de empresas', category: 'inscripcion', description: 'Solicitud de autorización para actuar como Autorizado RED. Asignación/desasignación de CCC a gestor', portal_url: 'https://sede.seg-social.gob.es/wps/portal/sede/sede/EmpresasyProfesionales/RED/202383', system: 'Sede Electrónica TGSS' },

  // BLOQUE 2 — AFILIACIÓN RÉGIMEN GENERAL
  { id: 'ta1', name: 'Solicitud número de afiliación (TA.1)', block: 'Afiliación Régimen General', category: 'afiliacion', description: 'Asignación del Número de Afiliación a la Seguridad Social para nuevos trabajadores', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas,+bajas+y+modificaciones/Altas+y+afiliacion+de+trabajadores/Solicitar+el+numero+de+la+Seguridad+Social', system: 'IMPORTASS' },
  { id: 'ta300', name: 'Desplazamiento temporal al extranjero — Certificado A1 (TA.300)', block: 'Afiliación Régimen General', category: 'afiliacion', description: 'Certificado A1 para trabajadores desplazados temporalmente a países con convenio de SS', portal_url: 'https://sede.seg-social.gob.es/wps/portal/sede/sede/Ciudadanos/Otros+Procedimientos/1202_TD', system: 'Sede Electrónica TGSS' },

  // BLOQUE 3 — RETA (AUTÓNOMOS)
  { id: 'alta-reta', name: 'Alta en el RETA (TA.0521)', block: 'RETA — Autónomos', category: 'reta', description: 'Alta como trabajador autónomo. Se puede pedir hasta 60 días antes. Incluye elección de base de cotización provisional', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas,+bajas+y+modificaciones/Altas+y+afiliacion+de+trabajadores/Alta_trabajo_autonomo', system: 'IMPORTASS' },
  { id: 'baja-reta', name: 'Baja en el RETA', block: 'RETA — Autónomos', category: 'reta', description: 'Comunicar en los 3 días naturales siguientes al cese. Efecto desde fin del mes si está en plazo', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas%2C+bajas+y+modificaciones/Bajas+y+modificaciones/Baja_trabajo_autonomo', system: 'IMPORTASS' },
  { id: 'cambio-base-reta', name: 'Cambio de base de cotización RETA', block: 'RETA — Autónomos', category: 'reta', description: 'Hasta 6 cambios al año en los periodos habilitados: enero, marzo, mayo, julio, septiembre, noviembre', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas,+bajas+y+modificaciones/Bajas+y+modificaciones/BCRendimientos', system: 'IMPORTASS' },
  { id: 'rendimientos-reta', name: 'Comunicación / Modificación de rendimientos previstos RETA', block: 'RETA — Autónomos', category: 'reta', description: 'Ajustar la cuota al tramo de ingresos reales. Hasta 6 cambios anuales', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas,+bajas+y+modificaciones/Bajas+y+modificaciones/BCRendimientos', system: 'IMPORTASS', notes: 'Sistema cotización por ingresos reales desde 2023' },
  { id: 'idc-reta', name: 'IDC — Informe de Datos de Cotización del autónomo', block: 'RETA — Autónomos', category: 'reta', description: 'Resumen de bases y cuotas cotizadas en el RETA por periodos. Necesario para acreditar cotización, solicitar prestaciones o verificar la regularización anual', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida+laboral+e+informes/Informes+de+tus+cotizaciones/Informe_datos_cotizacion_trabajo_autonomo', system: 'IMPORTASS' },

  // BLOQUE 4 — COTIZACIÓN / RECAUDACIÓN
  { id: 'consulta-deudas', name: 'Consulta de deudas y obtención de documento de pago', block: 'Cotización — Recaudación', category: 'cotizacion', description: 'Consulta de deudas pendientes con la TGSS y generación de documento de pago (NRC). Accesible con certificado digital', portal_url: 'https://sede.seg-social.gob.es/wps/portal/sede/sede/EmpresasyProfesionales/Recaudacion/TGSS_RECAUDACION_210217', system: 'Sede Electrónica TGSS' },

  // BLOQUE 5 — SISTEMAS ESPECIALES
  { id: 'alta-hogar', name: 'Alta empleado de hogar (TA.2/S-0138)', block: 'Sistema Especial Empleados de Hogar', category: 'especiales', description: 'Alta antes del inicio de la actividad. Disponible 24/7 en IMPORTASS y app de la SS', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas,+bajas+y+modificaciones/Altas+y+afiliacion+de+trabajadores/Alta+en+empleo+de+hogar', system: 'IMPORTASS / App SS' },
  { id: 'baja-hogar', name: 'Baja empleado de hogar (TA.2/S-0138)', block: 'Sistema Especial Empleados de Hogar', category: 'especiales', description: 'En los 6 días naturales siguientes al cese', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas,+bajas+y+modificaciones/Bajas+y+modificaciones/Baja+de+empleo+de+hogar', system: 'IMPORTASS / App SS' },

  // BLOQUE 6 — PRESTACIONES INSS
  { id: 'nacimiento-menor', name: 'Prestación por nacimiento y cuidado de menor', block: 'Prestaciones familiares', category: 'prestaciones', description: '16 semanas para cada progenitor (desde 2021 unificado). Intransferible. Primeras 6 semanas obligatorias e inmediatas. Incluye adopción y acogimiento', portal_url: 'https://prestaciones.seg-social.es/nacimiento-adopcion-prestaciones-familiares.html', system: 'Portal Prestaciones INSS', notes: 'Sustituye a maternidad/paternidad desde enero 2021' },
  { id: 'riesgo-embarazo', name: 'Prestación por riesgo durante el embarazo / lactancia', block: 'Prestaciones familiares', category: 'prestaciones', description: 'Gestionada por la mutua o INSS. Requiere certificado médico de riesgo', portal_url: 'https://sede.seg-social.gob.es/wps/portal/sede/sede/Ciudadanos/familia/202017', system: 'Portal Prestaciones INSS' },
  { id: 'ip', name: 'Incapacidad Permanente — Solicitud de pensión', block: 'Incapacidad Permanente', category: 'prestaciones', description: 'Grados: Parcial, Total, Absoluta, Gran Invalidez. Revisable de oficio o a petición del interesado', portal_url: 'https://prestaciones.seg-social.es/servicio/pension-incapacidad-permanente.html', system: 'Portal Prestaciones INSS' },
  { id: 'jubilacion', name: 'Jubilación', block: 'Jubilación', category: 'prestaciones', description: 'Solicitud de pensión de jubilación en sus distintas modalidades: ordinaria, anticipada involuntaria (hasta 4 años antes, por ERE/despido) y anticipada voluntaria (2 años antes con penalización). Disponible por internet, teléfono, correo o en CAISS con cita', portal_url: 'https://prestaciones.seg-social.es/jubilacion.html', system: 'Portal Prestaciones INSS' },
  { id: 'viudedad-orfandad', name: 'Viudedad y orfandad', block: 'Muerte y supervivencia', category: 'prestaciones', description: 'Solicitud de pensión de viudedad y orfandad. Disponible para representantes desde 2024', portal_url: 'https://prestaciones.seg-social.es/fallecimientos-viudedad-orfandad.html', system: 'Portal Prestaciones INSS' },
  { id: 'convenio-especial', name: 'Convenio especial — Suscripción y baja', block: 'Convenio especial', category: 'prestaciones', description: 'Mantener cotización durante periodos sin empleo: excedencias, desempleo sin cobertura, etc. Varias modalidades disponibles', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas,+bajas+y+modificaciones/Altas+y+afiliacion+de+trabajadores/Alta_CE', system: 'IMPORTASS' },

  // BLOQUE 7 — CERTIFICADOS Y CONSULTAS
  { id: 'cert-corriente', name: 'Certificado de estar al corriente de pago', block: 'Certificados', category: 'certificados', description: 'Descargable con certificado digital. Necesario para contratar con AA.PP., subvenciones, licitaciones', portal_url: 'https://sede.seg-social.gob.es/wps/portal/sede/sede/EmpresasyProfesionales/Informes+y+Certificados/N201736', system: 'Sede Electrónica TGSS' },
  { id: 'vida-laboral', name: 'Informe de vida laboral', block: 'Certificados', category: 'certificados', description: 'Historial completo de cotización por regímenes y periodos. Accesible con o sin certificado (SMS)', portal_url: 'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida+laboral+e+informes', system: 'IMPORTASS / Sede Electrónica' },
  { id: 'simulador-jubilacion', name: 'Simulación de jubilación', block: 'Certificados', category: 'certificados', description: 'Estimación de pensión futura. Disponible sin certificado digital (solo SMS)', portal_url: 'https://prestaciones.seg-social.es/jubilacion.html', system: 'Portal Prestaciones INSS' },

  // BLOQUE 8 — NOTIFICACIONES
  { id: 'dehu', name: 'DEHU — Notificaciones electrónicas', block: 'Notificaciones', category: 'notificaciones', description: 'Dirección Electrónica Habilitada Única. Recepción de notificaciones de AEAT, TGSS, Correos y otras administraciones. Requiere certificado digital', portal_url: 'https://dehu.redsara.es/', system: 'DEHU / REDsara' },
]

export const TGSS_BLOCKS = [
  { id: 'inscripcion', label: 'Inscripción de empresas', color: '#a78bfa' },
  { id: 'afiliacion', label: 'Afiliación Régimen General', color: '#60a5fa' },
  { id: 'reta', label: 'RETA — Autónomos', color: '#34d399' },
  { id: 'cotizacion', label: 'Cotización — Recaudación', color: '#fb923c' },
  { id: 'especiales', label: 'Sistemas especiales', color: '#f472b6' },
  { id: 'prestaciones', label: 'Prestaciones INSS', color: '#facc15' },
  { id: 'certificados', label: 'Certificados y consultas', color: '#71717a' },
  { id: 'notificaciones', label: 'Notificaciones', color: '#06b6d4' },
]
