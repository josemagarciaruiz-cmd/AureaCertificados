// Calendario laboral (festivos) — datos oficiales.
//
// Fuente: Resolución de 17 de octubre de 2025, de la Dirección General de Trabajo,
// por la que se publica la relación de fiestas laborales para el año 2026
// (BOE-A-2025-21667, «BOE» núm. 259, de 28/10/2025). Festivos insulares de Canarias:
// Decreto 61/2025, de 28 de abril (BOC de 5 de mayo de 2025), recogido en la nota 1
// de la misma Resolución.
//
// Estructura pensada para crecer por años: para añadir 2027 basta con añadir una
// entrada nueva a FESTIVOS_POR_ANIO con los datos del BOE de ese año.

export interface CCAADef {
  code: string
  name: string
}

export interface IslaDef {
  code: string
  name: string
}

// Festivo nacional (todas las CCAA) o autonómico (solo las CCAA de `ccaas`).
export interface FestivoDef {
  fecha: string // 'MM-DD'
  nombre: string
  ambito: 'nacional' | 'autonomico'
  ccaas?: string[] // solo para 'autonomico'
}

export interface InsularDef {
  fecha: string // 'MM-DD'
  nombre: string
  islas: string[] // códigos de isla
}

export interface FestivosAnio {
  nacionalesYAutonomicos: FestivoDef[]
  insularesCanarias: InsularDef[]
}

export const CCAA: CCAADef[] = [
  { code: 'AN', name: 'Andalucía' },
  { code: 'AR', name: 'Aragón' },
  { code: 'AS', name: 'Principado de Asturias' },
  { code: 'IB', name: 'Illes Balears' },
  { code: 'CN', name: 'Canarias' },
  { code: 'CB', name: 'Cantabria' },
  { code: 'CM', name: 'Castilla-La Mancha' },
  { code: 'CL', name: 'Castilla y León' },
  { code: 'CT', name: 'Cataluña' },
  { code: 'EX', name: 'Extremadura' },
  { code: 'GA', name: 'Galicia' },
  { code: 'MD', name: 'Comunidad de Madrid' },
  { code: 'MC', name: 'Región de Murcia' },
  { code: 'NC', name: 'Comunidad Foral de Navarra' },
  { code: 'PV', name: 'País Vasco' },
  { code: 'RI', name: 'La Rioja' },
  { code: 'VC', name: 'Comunitat Valenciana' },
  { code: 'CE', name: 'Ciudad de Ceuta' },
  { code: 'ML', name: 'Ciudad de Melilla' },
]

// Solo Canarias tiene festividad insular propia.
export const ISLAS_CANARIAS: IslaDef[] = [
  { code: 'EH', name: 'El Hierro' },
  { code: 'FV', name: 'Fuerteventura' },
  { code: 'GC', name: 'Gran Canaria' },
  { code: 'GO', name: 'La Gomera' },
  { code: 'LP', name: 'La Palma' },
  { code: 'LZ', name: 'Lanzarote' },
  { code: 'GR', name: 'La Graciosa' },
  { code: 'TF', name: 'Tenerife' },
]

const FESTIVOS_2026: FestivosAnio = {
  nacionalesYAutonomicos: [
    // ── Fiestas nacionales (aplican a todo el territorio) ──
    { fecha: '01-01', nombre: 'Año Nuevo', ambito: 'nacional' },
    { fecha: '01-06', nombre: 'Epifanía del Señor', ambito: 'nacional' },
    { fecha: '04-03', nombre: 'Viernes Santo', ambito: 'nacional' },
    { fecha: '05-01', nombre: 'Fiesta del Trabajo', ambito: 'nacional' },
    { fecha: '08-15', nombre: 'Asunción de la Virgen', ambito: 'nacional' },
    { fecha: '10-12', nombre: 'Fiesta Nacional de España', ambito: 'nacional' },
    { fecha: '12-08', nombre: 'Inmaculada Concepción', ambito: 'nacional' },
    { fecha: '12-25', nombre: 'Natividad del Señor', ambito: 'nacional' },

    // ── Fiestas de Comunidad Autónoma (y nacionales sustituidas/no ejercidas) ──
    { fecha: '02-28', nombre: 'Día de Andalucía', ambito: 'autonomico', ccaas: ['AN'] },
    { fecha: '03-02', nombre: 'Lunes siguiente al Día de les Illes Balears', ambito: 'autonomico', ccaas: ['IB'] },
    { fecha: '03-19', nombre: 'San José', ambito: 'autonomico', ccaas: ['GA', 'MC', 'NC', 'PV', 'VC'] },
    { fecha: '03-20', nombre: 'Fiesta del Eid Fitr', ambito: 'autonomico', ccaas: ['CE'] },
    { fecha: '04-02', nombre: 'Jueves Santo', ambito: 'autonomico', ccaas: ['AN', 'AR', 'AS', 'IB', 'CN', 'CB', 'CM', 'CL', 'EX', 'GA', 'MD', 'MC', 'NC', 'PV', 'VC', 'CE', 'ML'] },
    { fecha: '04-06', nombre: 'Lunes de Pascua', ambito: 'autonomico', ccaas: ['IB', 'CM', 'CT', 'NC', 'PV', 'RI', 'VC'] },
    { fecha: '04-23', nombre: 'San Jorge (Día de Aragón)', ambito: 'autonomico', ccaas: ['AR'] },
    { fecha: '04-23', nombre: 'Fiesta de Castilla y León', ambito: 'autonomico', ccaas: ['CL'] },
    { fecha: '05-02', nombre: 'Fiesta de la Comunidad de Madrid', ambito: 'autonomico', ccaas: ['MD'] },
    { fecha: '05-27', nombre: 'Fiesta del Sacrificio (Eidul Adha)', ambito: 'autonomico', ccaas: ['CE'] },
    { fecha: '05-27', nombre: 'Fiesta del Sacrificio (Aid al Adha)', ambito: 'autonomico', ccaas: ['ML'] },
    { fecha: '05-30', nombre: 'Día de Canarias', ambito: 'autonomico', ccaas: ['CN'] },
    { fecha: '06-04', nombre: 'Corpus Christi', ambito: 'autonomico', ccaas: ['CM'] },
    { fecha: '06-09', nombre: 'Día de la Región de Murcia', ambito: 'autonomico', ccaas: ['MC'] },
    { fecha: '06-09', nombre: 'Día de La Rioja', ambito: 'autonomico', ccaas: ['RI'] },
    { fecha: '06-24', nombre: 'San Juan', ambito: 'autonomico', ccaas: ['CT', 'GA', 'VC'] },
    { fecha: '07-25', nombre: 'Santiago Apóstol (Día de Galicia)', ambito: 'autonomico', ccaas: ['GA', 'PV'] },
    { fecha: '07-28', nombre: 'Día de las Instituciones de Cantabria', ambito: 'autonomico', ccaas: ['CB'] },
    { fecha: '08-05', nombre: 'Nuestra Señora de África', ambito: 'autonomico', ccaas: ['CE'] },
    { fecha: '09-02', nombre: 'Día de Ceuta', ambito: 'autonomico', ccaas: ['CE'] },
    { fecha: '09-08', nombre: 'Día de Asturias', ambito: 'autonomico', ccaas: ['AS'] },
    { fecha: '09-08', nombre: 'Día de Extremadura', ambito: 'autonomico', ccaas: ['EX'] },
    { fecha: '09-11', nombre: 'Fiesta Nacional de Cataluña', ambito: 'autonomico', ccaas: ['CT'] },
    { fecha: '09-15', nombre: 'La Bien Aparecida', ambito: 'autonomico', ccaas: ['CB'] },
    { fecha: '10-09', nombre: 'Día de la Comunitat Valenciana', ambito: 'autonomico', ccaas: ['VC'] },
    { fecha: '11-02', nombre: 'Día siguiente a Todos los Santos', ambito: 'autonomico', ccaas: ['AN', 'AR', 'AS', 'CN', 'CM', 'CL', 'EX', 'MD', 'NC'] },
    { fecha: '12-07', nombre: 'Lunes siguiente al Día de la Constitución Española', ambito: 'autonomico', ccaas: ['AN', 'AR', 'AS', 'CB', 'CL', 'EX', 'MD', 'MC', 'RI', 'ML'] },
    { fecha: '12-26', nombre: 'San Esteban', ambito: 'autonomico', ccaas: ['IB', 'CT'] },
  ],
  insularesCanarias: [
    { fecha: '02-02', nombre: 'Virgen de la Candelaria', islas: ['TF'] },
    { fecha: '08-05', nombre: 'Nuestra Señora de Las Nieves', islas: ['LP'] },
    { fecha: '09-08', nombre: 'Nuestra Señora del Pino', islas: ['GC'] },
    { fecha: '09-15', nombre: 'Nuestra Señora de los Volcanes', islas: ['LZ', 'GR'] },
    { fecha: '09-18', nombre: 'Nuestra Señora de la Peña', islas: ['FV'] },
    { fecha: '09-24', nombre: 'Nuestra Señora de los Reyes', islas: ['EH'] },
    { fecha: '10-05', nombre: 'Nuestra Señora de Guadalupe', islas: ['GO'] },
  ],
}

// Años con datos oficiales cargados. Añadir aquí ejercicios futuros.
export const FESTIVOS_POR_ANIO: Record<number, FestivosAnio> = {
  2026: FESTIVOS_2026,
}

export const ANIOS_DISPONIBLES = Object.keys(FESTIVOS_POR_ANIO).map(Number)
