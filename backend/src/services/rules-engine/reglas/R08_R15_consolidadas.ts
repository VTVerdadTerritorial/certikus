import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R08 — Título antecedente
// ============================================================================
export const R08_TituloAntecedente: Rule = {
  id: 'R08',
  nombre: 'Título antecedente',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura } = ctx;
    if (!escritura) {
      return {
        reglaId: 'R08', severity: 'illegible',
        titulo: 'Título antecedente',
        descripcion: 'No se puede verificar sin la escritura.',
        razon: 'Se requiere la escritura pública.',
      };
    }
    const antecedente = escritura.rawExtraction?.escritura?.numero_folio_antecedente;
    if (antecedente && antecedente.trim() !== '') {
      return {
        reglaId: 'R08', severity: 'ok',
        titulo: 'Título antecedente',
        descripcion: 'La escritura cita el título antecedente.',
        docAId: escritura.id, docAField: 'Folio antecedente',
        docAValue: antecedente,
        razon: 'Se respeta el principio de tracto sucesivo (Art. 29 Ley 1579).',
      };
    }
    return {
      reglaId: 'R08', severity: 'review',
      titulo: 'Título antecedente no identificado',
      descripcion: 'La escritura no cita el título antecedente o no se pudo extraer.',
      docAId: escritura.id, docAField: 'Folio antecedente',
      docAValue: 'NO DETECTADO',
      razon: 'Sin el título antecedente no se puede verificar la cadena de tradición (Art. 29 Ley 1579).',
    };
  },
};

// ============================================================================
// R09 — Naturaleza del acto
// ============================================================================
const NATURALEZAS_VALIDAS = [
  'compraventa', 'hipoteca', 'donacion', 'permuta', 'sucesion',
  'propiedad horizontal', 'afectacion', 'usufructo', 'servidumbre',
];

export const R09_NaturalezaActo: Rule = {
  id: 'R09',
  nombre: 'Naturaleza del acto',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura } = ctx;
    if (!escritura) {
      return {
        reglaId: 'R09', severity: 'illegible',
        titulo: 'Naturaleza del acto',
        descripcion: 'No se puede verificar sin la escritura.',
        razon: 'Se requiere la escritura pública.',
      };
    }
    const naturaleza = escritura.rawExtraction?.escritura?.naturaleza_acto;
    if (!naturaleza) {
      return {
        reglaId: 'R09', severity: 'illegible',
        titulo: 'Naturaleza del acto',
        descripcion: 'No se pudo extraer la naturaleza del acto.',
        docAId: escritura.id, docAField: 'Naturaleza del acto',
        docAValue: 'NO DETECTADO',
        razon: 'Sin naturaleza del acto no se puede validar contra el catálogo legal.',
      };
    }
    const naturalezaNorm = naturaleza.toLowerCase().trim();
    const esValida = NATURALEZAS_VALIDAS.some((n) => naturalezaNorm.includes(n));
    if (esValida) {
      return {
        reglaId: 'R09', severity: 'ok',
        titulo: 'Naturaleza del acto',
        descripcion: 'La naturaleza del acto corresponde a las tipologías del Art. 4.',
        docAId: escritura.id, docAField: 'Naturaleza del acto',
        docAValue: naturaleza,
        razon: 'El acto está tipificado en la Ley 1579 de 2012.',
      };
    }
    return {
      reglaId: 'R09', severity: 'review',
      titulo: 'Naturaleza del acto no reconocida',
      descripcion: 'La naturaleza del acto no corresponde a las tipologías estándar.',
      docAId: escritura.id, docAField: 'Naturaleza del acto',
      docAValue: naturaleza,
      razon: 'Verifica que el acto sea registrable según el Art. 4 de la Ley 1579.',
    };
  },
};

// ============================================================================
// R10 — Documentos de identidad (ACTIVA)
// ============================================================================
// Valida que estén las cédulas requeridas según el tipo de acto:
//   · Actos bilaterales (compraventa, permuta, donación, hipoteca, etc.)
//     → requieren cédula del vendedor/tradente Y del comprador/adquirente.
//   · Actos unilaterales o indeterminados → al menos una cédula.
// ============================================================================
const ACTOS_BILATERALES = [
  'compraventa', 'permuta', 'donacion', 'hipoteca',
  'usufructo', 'servidumbre', 'fiducia',
];

export const R10_DocsIdentidad: Rule = {
  id: 'R10',
  nombre: 'Documentos de identidad',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, otrosDocumentos } = ctx;

    const tieneCedulaVendedor = otrosDocumentos.some(
      (d) => d.tipo === 'cedula_vendedor'
    );
    const tieneCedulaComprador = otrosDocumentos.some(
      (d) => d.tipo === 'cedula_comprador'
    );
    const totalCedulas = (tieneCedulaVendedor ? 1 : 0) + (tieneCedulaComprador ? 1 : 0);

    // Determinar si el acto es bilateral
    const naturaleza = (
      escritura?.rawExtraction?.escritura?.naturaleza_acto || ''
    ).toLowerCase();
    const esActoBilateral = ACTOS_BILATERALES.some((a) => naturaleza.includes(a));

    // Caso A — Acto bilateral con AMBAS cédulas → OK
    if (esActoBilateral && tieneCedulaVendedor && tieneCedulaComprador) {
      return {
        reglaId: 'R10', severity: 'ok',
        titulo: 'Documentos de identidad',
        descripcion: 'Se aportaron las cédulas de ambas partes (vendedor y comprador).',
        razon: 'Los documentos de identidad de ambas partes permiten validar el tracto sucesivo con precisión.',
      };
    }

    // Caso B — Acto bilateral con UNA sola cédula → REVIEW
    if (esActoBilateral && totalCedulas === 1) {
      const falta = !tieneCedulaVendedor
        ? 'del vendedor/tradente'
        : 'del comprador/adquirente';
      return {
        reglaId: 'R10', severity: 'review',
        titulo: 'Documento de identidad faltante',
        descripcion: `Se aportó solo una cédula. Falta la cédula ${falta}.`,
        razon: `En un acto de ${naturaleza || 'transmisión de dominio'}, se requieren las cédulas de ambas partes para validar los comparecientes (Art. 3 Ley 1579 de 2012).`,
      };
    }

    // Caso C — Acto bilateral SIN cédulas → REVIEW
    if (esActoBilateral && totalCedulas === 0) {
      return {
        reglaId: 'R10', severity: 'review',
        titulo: 'Documentos de identidad no aportados',
        descripcion: `No se aportaron cédulas de las partes del acto de ${naturaleza}.`,
        razon: 'Sin documentos de identidad no es posible validar los comparecientes.',
      };
    }

    // Caso D — Acto no bilateral (o indeterminado) con al menos una cédula → OK
    if (totalCedulas >= 1) {
      return {
        reglaId: 'R10', severity: 'ok',
        titulo: 'Documentos de identidad',
        descripcion: 'Se aportaron documentos de identidad.',
        razon: 'Los documentos de identidad permiten validar los comparecientes.',
      };
    }

    // Caso E — Sin cédulas → REVIEW
    return {
      reglaId: 'R10', severity: 'review',
      titulo: 'Documentos de identidad no aportados',
      descripcion: 'No se cargaron cédulas de las partes.',
      razon: 'Sin documentos de identidad no es posible validar los comparecientes.',
    };
  },
};

// ============================================================================
// R11 — Cédulas consistentes
// ============================================================================
function normalizarDoc(doc: string): string {
  return doc.replace(/[^0-9]/g, '');
}

export const R11_CedulasConsistentes: Rule = {
  id: 'R11',
  nombre: 'Cédulas consistentes',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;
    if (!escritura || !certificado) {
      return {
        reglaId: 'R11', severity: 'illegible',
        titulo: 'Cédulas consistentes',
        descripcion: 'No se pueden comparar documentos por falta de archivos.',
        razon: 'Se requiere escritura y certificado.',
      };
    }
    const comparecientes = escritura.rawExtraction?.escritura?.comparecientes || [];
    const titulares = certificado.rawExtraction?.certificado?.titulares || [];
    const docsEscritura = comparecientes
      .map((c) => c.numero_documento)
      .filter((n): n is string => !!n)
      .map(normalizarDoc);
    const docsCertificado = titulares
      .map((t) => t.numero_documento)
      .filter((n): n is string => !!n)
      .map(normalizarDoc);
    if (docsEscritura.length === 0 || docsCertificado.length === 0) {
      return {
        reglaId: 'R11', severity: 'illegible',
        titulo: 'Cédulas consistentes',
        descripcion: 'No se pudieron extraer números de documento.',
        razon: 'Sin documentos de identidad en ambos archivos no se puede validar.',
      };
    }
    const hayCoincidencia = docsCertificado.some((d) => docsEscritura.includes(d));
    if (hayCoincidencia) {
      return {
        reglaId: 'R11', severity: 'ok',
        titulo: 'Cédulas consistentes',
        descripcion: 'Al menos un número de documento coincide entre documentos.',
        docAId: escritura.id, docAField: 'Cédulas comparecientes',
        docAValue: docsEscritura.join(', '),
        docBId: certificado.id, docBField: 'Cédulas titulares',
        docBValue: docsCertificado.join(', '),
        razon: 'Los números de documento coinciden.',
      };
    }
    return {
      reglaId: 'R11', severity: 'critical',
      titulo: 'Cédulas inconsistentes',
      descripcion: 'Ningún número de documento coincide entre escritura y certificado.',
      docAId: escritura.id, docAField: 'Cédulas comparecientes',
      docAValue: docsEscritura.join(', '),
      docBId: certificado.id, docBField: 'Cédulas titulares',
      docBValue: docsCertificado.join(', '),
      razon: 'Las cédulas no coinciden. Puede indicar que los comparecientes no son los titulares registrales.',
    };
  },
};

// ============================================================================
// R12 — Porcentaje de titularidad
// ============================================================================
export const R12_PorcentajeTitularidad: Rule = {
  id: 'R12',
  nombre: 'Porcentaje de titularidad',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;
    if (!certificado) {
      return {
        reglaId: 'R12', severity: 'illegible',
        titulo: 'Porcentaje de titularidad',
        descripcion: 'No se puede verificar sin el certificado.',
        razon: 'Se requiere el certificado de tradición.',
      };
    }
    const titulares = certificado.rawExtraction?.certificado?.titulares || [];
    const porcentajes = titulares
      .map((t) => t.porcentaje)
      .filter((p): p is number => typeof p === 'number');
    if (porcentajes.length === 0) {
      return {
        reglaId: 'R12', severity: 'review',
        titulo: 'Porcentaje de titularidad no verificable',
        descripcion: 'No se pudieron extraer los porcentajes de titularidad.',
        razon: 'Verifica manualmente las cuotas de los titulares en el certificado.',
      };
    }
    const suma = porcentajes.reduce((a, b) => a + b, 0);
    if (Math.abs(suma - 100) < 0.5) {
      return {
        reglaId: 'R12', severity: 'ok',
        titulo: 'Porcentaje de titularidad',
        descripcion: 'Los porcentajes de titularidad suman 100%.',
        docAId: certificado.id, docAField: 'Porcentajes titulares',
        docAValue: `${suma}%`,
        razon: 'Las cuotas están correctamente distribuidas.',
      };
    }
    return {
      reglaId: 'R12', severity: 'review',
      titulo: 'Porcentajes de titularidad inconsistentes',
      descripcion: `Los porcentajes suman ${suma}%, no 100%.`,
      docAId: certificado.id, docAField: 'Porcentajes titulares',
      docAValue: `${suma}%`,
      razon: 'Verifica que las cuotas de los titulares sumen el 100% del derecho de dominio.',
    };
  },
};

// ============================================================================
// R13 — Notaría válida
// ============================================================================
export const R13_NotariaValida: Rule = {
  id: 'R13',
  nombre: 'Notaría válida',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura } = ctx;
    if (!escritura) {
      return {
        reglaId: 'R13', severity: 'illegible',
        titulo: 'Notaría válida',
        descripcion: 'No se puede verificar sin la escritura.',
        razon: 'Se requiere la escritura pública.',
      };
    }
    const notaria = escritura.rawExtraction?.escritura?.notaria_nombre ||
      escritura.rawExtraction?.notaria;
    if (!notaria) {
      return {
        reglaId: 'R13', severity: 'review',
        titulo: 'Notaría no identificada',
        descripcion: 'No se pudo extraer el nombre de la notaría.',
        docAId: escritura.id, docAField: 'Notaría',
        docAValue: 'NO DETECTADO',
        razon: 'Verifica que la notaría esté correctamente identificada.',
      };
    }
    const notariaNorm = notaria.toLowerCase();
    const esValida = /notar[ií]a\s+\d+/.test(notariaNorm) ||
      notariaNorm.includes('circulo') || notariaNorm.includes('círculo');
    if (esValida) {
      return {
        reglaId: 'R13', severity: 'ok',
        titulo: 'Notaría válida',
        descripcion: 'La notaría tiene formato válido.',
        docAId: escritura.id, docAField: 'Notaría',
        docAValue: notaria,
        razon: 'El formato de la notaría corresponde a la nomenclatura notarial colombiana.',
      };
    }
    return {
      reglaId: 'R13', severity: 'review',
      titulo: 'Notaría con formato no reconocido',
      descripcion: 'El nombre de la notaría no corresponde al formato estándar.',
      docAId: escritura.id, docAField: 'Notaría',
      docAValue: notaria,
      razon: 'Verifica que la notaría sea una de las autorizadas en Colombia (Decreto 960 de 1970).',
    };
  },
};

// ============================================================================
// R14 — Área positiva
// ============================================================================
export const R14_AreaPositiva: Rule = {
  id: 'R14',
  nombre: 'Área positiva',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;
    const areaEscritura = escritura?.rawExtraction?.escritura?.area_m2 ?? null;
    const areaCertificado = certificado?.rawExtraction?.certificado?.area_m2 ?? null;
    if (areaEscritura === null && areaCertificado === null) {
      return {
        reglaId: 'R14', severity: 'illegible',
        titulo: 'Área positiva',
        descripcion: 'No se pudo extraer el área de ningún documento.',
        razon: 'Verifica manualmente el área del inmueble.',
      };
    }
    const areasNegativas: string[] = [];
    if (areaEscritura !== null && areaEscritura <= 0) {
      areasNegativas.push(`Escritura: ${areaEscritura} m²`);
    }
    if (areaCertificado !== null && areaCertificado <= 0) {
      areasNegativas.push(`Certificado: ${areaCertificado} m²`);
    }
    if (areasNegativas.length === 0) {
      return {
        reglaId: 'R14', severity: 'ok',
        titulo: 'Área positiva',
        descripcion: 'Las áreas extraídas son valores positivos válidos.',
        razon: 'El área es un número positivo.',
      };
    }
    return {
      reglaId: 'R14', severity: 'critical',
      titulo: 'Área con valor inválido',
      descripcion: 'El área extraída es cero o negativa.',
      docAValue: areasNegativas.join(' | '),
      razon: 'El área debe ser un número positivo (Art. 16 Par. 1 Ley 1579).',
    };
  },
};

// ============================================================================
// R15 — Estado del folio
// ============================================================================
export const R15_EstadoFolio: Rule = {
  id: 'R15',
  nombre: 'Estado del folio',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;
    if (!certificado) {
      return {
        reglaId: 'R15', severity: 'illegible',
        titulo: 'Estado del folio',
        descripcion: 'No se puede verificar sin el certificado.',
        razon: 'Se requiere el certificado de tradición.',
      };
    }
    const estado = certificado.rawExtraction?.certificado?.estado_folio;
    if (estado === 'cerrado') {
      return {
        reglaId: 'R15', severity: 'critical',
        titulo: 'Folio de matrícula cerrado',
        descripcion: 'El folio de matrícula está cerrado.',
        docAId: certificado.id, docAField: 'Estado del folio',
        docAValue: 'Cerrado',
        razon: 'Un folio cerrado no permite inscripciones (Art. 55 Ley 1579).',
      };
    }
    if (estado === 'falsa_tradicion') {
      return {
        reglaId: 'R15', severity: 'critical',
        titulo: 'Folio con falsa tradición',
        descripcion: 'El folio presenta anotación de falsa tradición.',
        docAId: certificado.id, docAField: 'Estado del folio',
        docAValue: 'Falsa tradición',
        razon: 'Requiere análisis jurídico especializado (Art. 8 Par. 3 Ley 1579).',
      };
    }
    if (estado === 'activo') {
      return {
        reglaId: 'R15', severity: 'ok',
        titulo: 'Estado del folio',
        descripcion: 'El folio está activo y admite inscripciones.',
        docAId: certificado.id, docAField: 'Estado del folio',
        docAValue: 'Activo',
        razon: 'El folio está habilitado para nuevas inscripciones.',
      };
    }
    return {
      reglaId: 'R15', severity: 'review',
      titulo: 'Estado del folio no determinado',
      descripcion: 'No se pudo determinar el estado del folio.',
      docAId: certificado.id, docAField: 'Estado del folio',
      docAValue: estado || 'NO DETECTADO',
      razon: 'Verifica manualmente el estado del folio de matrícula.',
    };
  },
};