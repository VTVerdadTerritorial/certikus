import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R17 — Consistencia en Propiedad Horizontal
// Fundamento: Ley 675 de 2001
// ============================================================================

export const R17_PropiedadHorizontal: Rule = {
  id: 'R17',
  nombre: 'Consistencia en Propiedad Horizontal',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;

    if (!escritura || !certificado) {
      return {
        reglaId: 'R17',
        severity: 'illegible',
        titulo: 'Propiedad Horizontal',
        descripcion: 'No se puede verificar sin escritura y certificado.',
        razon: 'Se requieren ambos documentos para validar el régimen de propiedad horizontal.',
      };
    }

    const esc = escritura.rawExtraction?.escritura;
    const cert = certificado.rawExtraction?.certificado;

    if (!esc || !cert) {
      return {
        reglaId: 'R17',
        severity: 'illegible',
        titulo: 'Propiedad Horizontal',
        descripcion: 'No se pudieron extraer los datos de uno o ambos documentos.',
        razon: 'Se requiere información legible de ambos documentos.',
      };
    }

    const esPHEscritura = esc.es_propiedad_horizontal === true;
    const esPHCertificado = cert.es_propiedad_horizontal === true;

    if (!esPHEscritura && !esPHCertificado) {
      return {
        reglaId: 'R17',
        severity: 'ok',
        titulo: 'Propiedad Horizontal no aplica',
        descripcion: 'El inmueble no está sometido al régimen de propiedad horizontal.',
        razon: 'No se requiere validación de la Ley 675 de 2001.',
      };
    }

    if (esPHEscritura && !esPHCertificado) {
      return {
        reglaId: 'R17',
        severity: 'critical',
        titulo: 'Inconsistencia en régimen de Propiedad Horizontal',
        descripcion: 'La escritura menciona propiedad horizontal pero el certificado no la reporta.',
        docAId: escritura.id,
        docAField: 'Propiedad Horizontal',
        docAValue: 'Sí (escritura)',
        docBId: certificado.id,
        docBField: 'Propiedad Horizontal',
        docBValue: 'No (certificado)',
        razon: 'Inconsistencia crítica. Verifica si el reglamento de propiedad horizontal fue debidamente protocolizado e inscrito (Ley 675 de 2001).',
      };
    }

    if (!esPHEscritura && esPHCertificado) {
      return {
        reglaId: 'R17',
        severity: 'review',
        titulo: 'Inmueble bajo Propiedad Horizontal',
        descripcion: 'El certificado reporta que el inmueble pertenece a un régimen de propiedad horizontal.',
        docBId: certificado.id,
        docBField: 'Propiedad Horizontal',
        docBValue: 'Sí (certificado)',
        razon: 'Verifica que el coeficiente de copropiedad y la identificación de la unidad privada estén correctamente citados en la escritura (Ley 675 de 2001).',
      };
    }

    const problemas: string[] = [];

    if (esc.coeficiente_copropiedad === null || esc.coeficiente_copropiedad === undefined) {
      problemas.push('Coeficiente de copropiedad no identificado en la escritura');
    } else if (esc.coeficiente_copropiedad <= 0 || esc.coeficiente_copropiedad > 100) {
      problemas.push(`Coeficiente de copropiedad fuera de rango: ${esc.coeficiente_copropiedad}%`);
    }

    if (
      esc.coeficiente_copropiedad !== null &&
      cert.coeficiente_copropiedad !== null &&
      esc.coeficiente_copropiedad !== undefined &&
      cert.coeficiente_copropiedad !== undefined
    ) {
      const diff = Math.abs(esc.coeficiente_copropiedad - cert.coeficiente_copropiedad);
      if (diff > 0.01) {
        problemas.push(
          `Coeficiente diferente: Escritura ${esc.coeficiente_copropiedad}% vs Certificado ${cert.coeficiente_copropiedad}%`
        );
      }
    }

    if (!esc.nombre_conjunto || esc.nombre_conjunto.trim().length < 3) {
      problemas.push('Nombre del conjunto o edificio no identificado en la escritura');
    }

    if (!esc.bienes_privados || esc.bienes_privados.length === 0) {
      problemas.push('Bienes privados no identificados en la escritura');
    }

    if (problemas.length === 0) {
      return {
        reglaId: 'R17',
        severity: 'ok',
        titulo: 'Propiedad Horizontal consistente',
        descripcion: 'El régimen de propiedad horizontal está correctamente identificado.',
        docAId: escritura.id,
        docAField: 'Propiedad Horizontal',
        docAValue: `${esc.nombre_conjunto || '-'} (${esc.coeficiente_copropiedad || '-'}%)`,
        docBId: certificado.id,
        docBField: 'Propiedad Horizontal',
        docBValue: `${cert.coeficiente_copropiedad || '-'}%`,
        razon: 'Se cumplen los requisitos de la Ley 675 de 2001.',
      };
    }

    return {
      reglaId: 'R17',
      severity: problemas.length >= 2 ? 'critical' : 'review',
      titulo: 'Inconsistencias en Propiedad Horizontal',
      descripcion: `Se detectaron ${problemas.length} problema(s) en el régimen de propiedad horizontal.`,
      docAId: escritura.id,
      docAField: 'Propiedad Horizontal',
      docAValue: `${esc.nombre_conjunto || 'NO DETECTADO'} (${esc.coeficiente_copropiedad ?? 'NO DETECTADO'}%)`,
      docBId: certificado.id,
      docBField: 'Propiedad Horizontal',
      docBValue: `${cert.coeficiente_copropiedad ?? 'NO DETECTADO'}%`,
      razon: problemas.join(' | ') + '. Requisitos exigidos por la Ley 675 de 2001.',
    };
  },
};