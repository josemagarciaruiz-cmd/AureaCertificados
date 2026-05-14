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
  { model: '030', name: 'Censo de obligados tributarios (personas físicas)', category: 'censos', periodicity: 'puntual', description: 'Alta, cambio de domicilio fiscal o variación de datos para personas físicas no empresarios', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC01.shtml' },
  { model: '036', name: 'Censo de empresarios, profesionales y retenedores', category: 'censos', periodicity: 'puntual', description: 'Alta, modificación y baja censal. Imprescindible para iniciar actividad empresarial', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC01.shtml' },
  { model: '035', name: 'Registro OSS/IOSS (ventanilla única IVA comercio electrónico)', category: 'censos', periodicity: 'puntual', description: 'Alta, modificación o baja en regímenes de ventanilla única de IVA', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G420.shtml' },
  { model: '040', name: 'Registro de operadores de plataformas digitales (DAC7)', category: 'censos', periodicity: 'puntual', description: 'Alta, modificación y baja para operadores de plataformas obligados a informar. NUEVO 2024', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientos/G335.shtml', notes: 'Nuevo en 2024' },

  // IRPF
  { model: '100', name: 'IRPF — Declaración anual (Renta)', category: 'irpf', periodicity: 'anual', description: 'Declaración anual de la Renta para personas físicas residentes', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI01.shtml' },
  { model: '102', name: 'IRPF — Segundo plazo de fraccionamiento', category: 'irpf', periodicity: 'anual', description: 'Documento de ingreso del segundo plazo (40%) de la declaración del IRPF. Del 1 al 5 de noviembre', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI01.shtml' },
  { model: '130', name: 'Pago fraccionado IRPF — Estimación directa', category: 'irpf', periodicity: 'trimestral', description: 'Pago fraccionado trimestral para autónomos en estimación directa (normal y simplificada)', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI02.shtml' },
  { model: '131', name: 'Pago fraccionado IRPF — Estimación objetiva (módulos)', category: 'irpf', periodicity: 'trimestral', description: 'Pago fraccionado trimestral para autónomos en estimación objetiva', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI03.shtml' },
  { model: '140', name: 'Abono anticipado deducción por maternidad', category: 'irpf', periodicity: 'puntual', description: 'Solicitud del abono mensual anticipado de la deducción por maternidad (100€/mes)', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI14.shtml' },
  { model: '143', name: 'Abono anticipado deducciones familia numerosa / discapacitados', category: 'irpf', periodicity: 'puntual', description: 'Solicitud del abono mensual anticipado de las deducciones familiares', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI14.shtml' },
  { model: '149', name: 'Régimen especial impatriados (Ley Beckham)', category: 'irpf', periodicity: 'puntual', description: 'Comunicación de opción/renuncia al régimen de trabajadores desplazados a España', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI17.shtml' },
  { model: '151', name: 'Declaración anual régimen impatriados', category: 'irpf', periodicity: 'anual', description: 'Declaración anual equivalente al modelo 100 para contribuyentes acogidos al régimen Beckham', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI17.shtml' },
  { model: '714', name: 'Impuesto sobre el Patrimonio', category: 'irpf', periodicity: 'anual', description: 'Declaración anual del patrimonio neto. Obligatorio si cuota a ingresar o patrimonio > 2M€', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G611.shtml' },

  // RETENCIONES TRIMESTRALES
  { model: '111', name: 'Retenciones IRPF — Trabajo y actividades profesionales', category: 'retenciones', periodicity: 'trimestral', description: 'Retención sobre nóminas, honorarios de profesionales y premios. Trimestral o mensual (grandes empresas)', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI24.shtml' },
  { model: '115', name: 'Retenciones — Arrendamientos de inmuebles urbanos', category: 'retenciones', periodicity: 'trimestral', description: 'Retenciones sobre alquileres de locales comerciales y oficinas', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI26.shtml' },
  { model: '117', name: 'Retenciones — Acciones y participaciones en IIC', category: 'retenciones', periodicity: 'trimestral', description: 'Retenciones sobre transmisión o reembolso de participaciones en fondos de inversión', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI27.shtml' },
  { model: '123', name: 'Retenciones — Capital mobiliario', category: 'retenciones', periodicity: 'trimestral', description: 'Retenciones sobre dividendos, intereses de cuentas y depósitos', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI29.shtml' },
  { model: '124', name: 'Retenciones — Activos financieros y deuda pública', category: 'retenciones', periodicity: 'mensual', description: 'Rendimientos de activos financieros y de deuda pública', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI30.shtml' },
  { model: '126', name: 'Retenciones — Capital mobiliario cuentas financieras', category: 'retenciones', periodicity: 'trimestral', description: 'Retenciones de cuentas en entidades financieras', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI31.shtml' },
  { model: '128', name: 'Retenciones — Rentas exentas y otros rendimientos', category: 'retenciones', periodicity: 'trimestral', description: 'Liquidación trimestral de retenciones sobre ciertos rendimientos de capital', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI32.shtml' },

  // RESÚMENES ANUALES RETENCIONES
  { model: '180', name: 'Retenciones arrendamientos — Resumen anual', category: 'retenciones', periodicity: 'anual', description: 'Resumen anual de las retenciones sobre alquileres. Plazo: enero del año siguiente', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI26.shtml' },
  { model: '187', name: 'Acciones y participaciones IIC — Resumen anual', category: 'informativas', periodicity: 'anual', description: 'Gestoras de fondos informan sobre partícipes y sus operaciones', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI27.shtml' },
  { model: '188', name: 'Retenciones activos financieros — Resumen anual', category: 'retenciones', periodicity: 'anual', description: 'Resumen anual de retenciones sobre rendimientos de capital mobiliario de activos financieros', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI30.shtml' },
  { model: '190', name: 'Retenciones trabajo/profesionales — Resumen anual', category: 'retenciones', periodicity: 'anual', description: 'Resumen anual de retenciones sobre nóminas, honorarios. Plazo: enero del año siguiente', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI24.shtml' },
  { model: '193', name: 'Retenciones capital mobiliario — Resumen anual', category: 'retenciones', periodicity: 'anual', description: 'Resumen anual de retenciones sobre dividendos, intereses, etc.', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI29.shtml' },
  { model: '194', name: 'Retenciones activos financieros cuentas — Resumen anual', category: 'retenciones', periodicity: 'anual', description: 'Resumen anual de retenciones sobre activos financieros de cuentas', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI31.shtml' },
  { model: '196', name: 'Retenciones cuentas instituciones financieras — Resumen anual / Mensual desde 2026', category: 'retenciones', periodicity: 'anual', description: 'NOVEDAD 2026: pasa a ser declaración mensual de cuentas en instituciones financieras', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI31.shtml', notes: 'Pasa a mensual desde enero 2026' },
  { model: '198', name: 'Operaciones con activos financieros', category: 'informativas', periodicity: 'anual', description: 'Operaciones de compraventa, transmisión, canje de acciones, obligaciones y otros activos', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI37.shtml' },

  // IVA
  { model: '303', name: 'IVA — Autoliquidación trimestral / mensual', category: 'iva', periodicity: 'trimestral', description: 'Liquidación periódica del IVA. Trimestral para la mayoría, mensual para inscritos en el REDEME', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI45.shtml' },
  { model: '308', name: 'IVA — Devolución por recargo de equivalencia y ocasionales', category: 'iva', periodicity: 'trimestral', description: 'Solicitud de devolución para comerciantes en recargo de equivalencia y sujetos pasivos ocasionales', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI46.shtml' },
  { model: '309', name: 'IVA — Declaración-liquidación no periódica', category: 'iva', periodicity: 'puntual', description: 'Para operaciones concretas no periódicas sujetas a IVA', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI47.shtml' },
  { model: '322', name: 'IVA — Grupos de entidades (modelo individual mensual)', category: 'iva', periodicity: 'mensual', description: 'Autoliquidación mensual individual de cada entidad de un grupo de IVA', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI50.shtml' },
  { model: '349', name: 'IVA — Operaciones intracomunitarias', category: 'iva', periodicity: 'trimestral', description: 'Declaración recapitulativa de entregas y adquisiciones intracomunitarias', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI28.shtml' },
  { model: '353', name: 'IVA — Grupos de entidades (modelo agregado mensual)', category: 'iva', periodicity: 'mensual', description: 'Autoliquidación mensual agregada del grupo de IVA', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI50.shtml' },
  { model: '369', name: 'IVA — Ventanilla única OSS/IOSS (comercio electrónico UE)', category: 'iva', periodicity: 'trimestral', description: 'Declaración de ventas B2C a consumidores de la UE. Sustituye al antiguo MOSS', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G420.shtml' },
  { model: '390', name: 'IVA — Resumen anual', category: 'iva', periodicity: 'anual', description: 'Resumen anual de todas las operaciones de IVA del ejercicio. Plazo: hasta 30 de enero', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI53.shtml' },

  // IMPUESTO DE SOCIEDADES
  { model: '200', name: 'Impuesto sobre Sociedades — Declaración anual', category: 'sociedades', periodicity: 'anual', description: 'Declaración anual del IS. Plazo: 25 días desde los 6 meses del cierre del ejercicio (generalmente 1-25 julio)', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI55.shtml' },
  { model: '202', name: 'IS — Pago fraccionado', category: 'sociedades', periodicity: 'trimestral', description: 'Pagos fraccionados a cuenta del IS. Plazos: abril, octubre y diciembre', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI56.shtml' },
  { model: '206', name: 'IRNR — Declaración anual (establecimientos permanentes)', category: 'sociedades', periodicity: 'anual', description: 'Documento de ingreso/devolución del IRNR para establecimientos permanentes', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI55.shtml' },
  { model: '220', name: 'IS — Grupos fiscales consolidados', category: 'sociedades', periodicity: 'anual', description: 'Declaración del IS en régimen de grupos fiscales (sociedad dominante)', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI55.shtml' },
  { model: '222', name: 'IS — Pago fraccionado grupos fiscales', category: 'sociedades', periodicity: 'trimestral', description: 'Pago fraccionado para grupos fiscales en consolidación fiscal', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI56.shtml' },
  { model: '232', name: 'Operaciones vinculadas y con paraísos fiscales', category: 'sociedades', periodicity: 'anual', description: 'Declaración informativa anual de operaciones entre partes vinculadas. Plazo: noviembre', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI58.shtml' },

  // DECLARACIONES INFORMATIVAS
  { model: '182', name: 'Donativos, donaciones y aportaciones recibidas', category: 'informativas', periodicity: 'anual', description: 'Entidades que reciben donaciones informan sobre donantes para que apliquen deducciones', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI35.shtml' },
  { model: '184', name: 'Entidades en régimen de atribución de rentas', category: 'informativas', periodicity: 'anual', description: 'Comunidades de bienes, herencias yacentes y sociedades civiles informan sobre rentas atribuidas', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI36.shtml' },
  { model: '233', name: 'Gastos en guarderías o centros educación infantil', category: 'informativas', periodicity: 'anual', description: 'Centros 0-3 años informan sobre importes abonados para la deducción del IRPF', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI38.shtml' },
  { model: '238', name: 'Declaración informativa de operadores de plataformas (DAC7)', category: 'informativas', periodicity: 'anual', description: 'Plataformas digitales (Airbnb, Amazon, Wallapop...) informan sobre vendedores. Sustituye al 179', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI52.shtml', notes: 'Sustituye al modelo 179 desde 2024' },
  { model: '281', name: 'Planes de ahorro a largo plazo (PIAS)', category: 'informativas', periodicity: 'anual', description: 'Entidades gestoras de PIAS y seguros de ahorro a largo plazo informan sobre titulares', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI39.shtml' },
  { model: '289', name: 'Cuentas financieras — CRS (Common Reporting Standard)', category: 'informativas', periodicity: 'anual', description: 'Entidades financieras informan sobre titulares extranjeros (intercambio automático internacional)', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI40.shtml' },
  { model: '345', name: 'Planes de pensiones, PPA, PIAS, seguros de dependencia', category: 'informativas', periodicity: 'anual', description: 'Gestoras de fondos de pensiones informan sobre partícipes y aportaciones', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI43.shtml' },
  { model: '347', name: 'Declaración anual de operaciones con terceros', category: 'informativas', periodicity: 'anual', description: 'Operaciones con clientes y proveedores > 3.005,06€. Plazo: hasta 28/29 de febrero', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI51.shtml' },
  // BIENES EN EL EXTRANJERO
  { model: '720', name: 'Bienes y derechos en el extranjero', category: 'informativas', periodicity: 'anual', description: 'Residentes declaran cuentas, valores y bienes inmuebles en el extranjero > 50.000€. Plazo: enero-marzo', portal_url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI34.shtml' },
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
