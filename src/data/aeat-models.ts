export interface AeatModel {
  model: string
  name: string
  category: 'irpf' | 'iva' | 'sociedades' | 'retenciones' | 'informativas' | 'censos' | 'otros'
  periodicity: string
  description: string
  portal_url: string
  notes?: string
}

export const AEAT_MODELS: AeatModel[] = [
  // CENSOS Y REGISTRO
  { model: '030', name: 'Censo de obligados tributarios (personas físicas)', category: 'censos', periodicity: 'puntual', description: 'Alta, cambio de domicilio fiscal o variación de datos para personas físicas no empresarios', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G321.shtml' },
  { model: '036', name: 'Censo de empresarios, profesionales y retenedores', category: 'censos', periodicity: 'puntual', description: 'Alta, modificación y baja censal. Imprescindible para iniciar actividad empresarial', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml' },
  { model: '035', name: 'Registro OSS/IOSS (ventanilla única IVA comercio electrónico)', category: 'censos', periodicity: 'puntual', description: 'Alta, modificación o baja en regímenes de ventanilla única de IVA', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientos/G333.shtml' },
  { model: '040', name: 'Registro de operadores de plataformas digitales (DAC7)', category: 'censos', periodicity: 'puntual', description: 'Alta, modificación y baja para operadores de plataformas obligados a informar', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientos/G335.shtml', notes: 'Nuevo en 2024' },

  // IRPF
  { model: '100', name: 'IRPF — Declaración anual (Renta)', category: 'irpf', periodicity: 'anual', description: 'Declaración anual de la Renta para personas físicas residentes', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G229.shtml' },
  { model: '102', name: 'IRPF — Segundo plazo de fraccionamiento', category: 'irpf', periodicity: 'anual', description: 'Documento de ingreso del segundo plazo (40%) de la declaración del IRPF. Del 1 al 5 de noviembre', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G229.shtml' },
  { model: '130', name: 'Pago fraccionado IRPF — Estimación directa', category: 'irpf', periodicity: 'trimestral', description: 'Pago fraccionado trimestral para autónomos en estimación directa (normal y simplificada)', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G601.shtml' },
  { model: '131', name: 'Pago fraccionado IRPF — Estimación objetiva (módulos)', category: 'irpf', periodicity: 'trimestral', description: 'Pago fraccionado trimestral para autónomos en estimación objetiva', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G602.shtml' },
  { model: '149', name: 'Régimen especial impatriados (Ley Beckham) — Comunicación', category: 'irpf', periodicity: 'puntual', description: 'Comunicación de opción, renuncia, exclusión y fin del desplazamiento al régimen de trabajadores desplazados a España', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G606.shtml' },
  { model: '714', name: 'Impuesto sobre el Patrimonio', category: 'irpf', periodicity: 'anual', description: 'Declaración anual del patrimonio neto. Obligatorio si cuota a ingresar o patrimonio > 2M€', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G611.shtml' },

  // RETENCIONES
  { model: '111', name: 'Retenciones IRPF — Trabajo y actividades profesionales', category: 'retenciones', periodicity: 'trimestral', description: 'Retención sobre nóminas, honorarios de profesionales y premios. Trimestral o mensual (grandes empresas)', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH01.shtml' },
  { model: '123', name: 'Retenciones — Capital mobiliario', category: 'retenciones', periodicity: 'trimestral', description: 'Retenciones sobre dividendos, intereses de cuentas y depósitos', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH04.shtml' },
  { model: '126', name: 'Retenciones — Capital mobiliario cuentas financieras', category: 'retenciones', periodicity: 'trimestral', description: 'Retenciones de cuentas en entidades financieras', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH06.shtml' },
  { model: '190', name: 'Retenciones trabajo/profesionales — Resumen anual', category: 'retenciones', periodicity: 'anual', description: 'Resumen anual de retenciones sobre nóminas, honorarios. Plazo: enero del año siguiente', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI10.shtml' },

  // IVA
  { model: '303', name: 'IVA — Autoliquidación trimestral / mensual', category: 'iva', periodicity: 'trimestral', description: 'Liquidación periódica del IVA. Trimestral para la mayoría, mensual para inscritos en el REDEME', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml' },
  { model: '349', name: 'IVA — Operaciones intracomunitarias', category: 'iva', periodicity: 'trimestral', description: 'Declaración recapitulativa de entregas y adquisiciones intracomunitarias', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI28.shtml' },

  // IMPUESTO DE SOCIEDADES
  { model: '200', name: 'Impuesto sobre Sociedades — Declaración anual', category: 'sociedades', periodicity: 'anual', description: 'Declaración anual del IS. Plazo: 25 días desde los 6 meses del cierre del ejercicio (generalmente 1-25 julio)', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE04.shtml' },
  { model: '206', name: 'IRNR — Declaración anual (establecimientos permanentes)', category: 'sociedades', periodicity: 'anual', description: 'Documento de ingreso/devolución del IRNR para establecimientos permanentes', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE04.shtml' },

  // DECLARACIONES INFORMATIVAS
  { model: '232', name: 'Operaciones vinculadas y con paraísos fiscales', category: 'informativas', periodicity: 'anual', description: 'Declaración informativa anual de operaciones entre partes vinculadas. Plazo: noviembre', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI43.shtml' },
  { model: '347', name: 'Declaración anual de operaciones con terceros', category: 'informativas', periodicity: 'anual', description: 'Operaciones con clientes y proveedores > 3.005,06€. Plazo: hasta 28/29 de febrero', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI27.shtml' },
]

export const AEAT_CATEGORIES = [
  { id: 'censos', label: 'Censos y registro', color: '#a78bfa' },
  { id: 'irpf', label: 'IRPF', color: '#60a5fa' },
  { id: 'retenciones', label: 'Retenciones', color: '#34d399' },
  { id: 'iva', label: 'IVA', color: '#a78bfa' },
  { id: 'sociedades', label: 'Impuesto de Sociedades', color: '#fb923c' },
  { id: 'informativas', label: 'Declaraciones informativas', color: '#f472b6' },
  { id: 'otros', label: 'Otros', color: '#71717a' },
]
