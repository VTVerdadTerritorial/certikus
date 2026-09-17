// ============================================================================
// TIPOS DE EXTRACCIÓN CON GEMINI
// ============================================================================

export interface PersonaExtraida {
  nombre_completo: string | null;
  tipo_documento: 'CC' | 'NIT' | 'CE' | 'PA' | null;
  numero_documento: string | null;
  calidad?: 'vendedor' | 'comprador' | 'apoderado' | 'titular' | 'otro' | null;
  porcentaje?: number | null;
}

export interface AnotacionExtraida {
  numero_anotacion: number | null;
  fecha_anotacion: string | null;
  naturaleza: string | null;
  documento_origen: string | null;
  descripcion: string | null;
  personas: string[] | null;
}

export interface DatosEscritura {
  numero_escritura: string | null;
  fecha_escritura: string | null;
  notaria_nombre: string | null;
  notaria_codigo: string | null;
  ciudad_notaria: string | null;
  matricula_inmobiliaria: string | null;
  numero_folio_antecedente: string | null;
  naturaleza_acto: string | null;
  valor_acto: number | null;
  direccion_inmueble: string | null;
  area_m2: number | null;
  linderos: string | null;
  tipo_inmueble: 'urbano' | 'rural' | null;
  cedula_catastral: string | null;
  comparecientes: PersonaExtraida[];
  // Propiedad Horizontal (Ley 675 de 2001)
  es_propiedad_horizontal: boolean | null;
  nombre_conjunto: string | null;
  coeficiente_copropiedad: number | null;
  bienes_privados: string[] | null;
  bienes_comunes: string[] | null;
}

export interface DatosCedula {
  nombre_completo: string | null;
  numero_documento: string | null;
  fecha_nacimiento: string | null;
  lugar_nacimiento: string | null;
  fecha_expedicion: string | null;
  lugar_expedicion: string | null;
  sexo: 'M' | 'F' | null;
}

export interface DatosCertificado {
  numero_matricula: string | null;
  fecha_expedicion: string | null;
  oficina_registro: string | null;
  codigo_oficina: string | null;
  area_m2: number | null;
  linderos: string | null;
  direccion_inmueble: string | null;
  estado_folio: 'activo' | 'cerrado' | 'falsa_tradicion' | null;
  anotacion_falsa_tradicion: boolean | null;
  presuncion_baldio: boolean | null;
  titulares: PersonaExtraida[];
  anotaciones: AnotacionExtraida[];
  // Propiedad Horizontal (Ley 675 de 2001)
  es_propiedad_horizontal: boolean | null;
  coeficiente_copropiedad: number | null;
}

export interface ExtractionResult {
  matricula_inmobiliaria: string | null;
  fecha_documento: string | null;
  notaria: string | null;
  escritura: DatosEscritura | null;
  cedula: DatosCedula | null;
  certificado: DatosCertificado | null;
  confidence: number;
  notas_legibilidad: string | null;
  tipo_detectado:
    | 'escritura'
    | 'certificado'
    | 'cedula'
    | 'poder'
    | 'camara_comercio'
    | 'paz_salvo_predial'
    | 'paz_salvo_valorizacion'
    | 'certificado_catastral'
    | 'adicional'
    | 'otro'
    | null;
}