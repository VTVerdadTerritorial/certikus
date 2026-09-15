import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R16 — Verificación de Identificación del Inmueble en Escritura
// Fundamento: Art. 16 Par. 1 Ley 1579 de 2012 + Decreto-Ley 960 de 1970
// ============================================================================

function normalizarDireccion(dir: string): string {
  return dir
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const R16_IdentificacionInmueble: Rule = {
  id: 'R16',
  nombre: 'Identificación del inmueble en escritura',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;

    if (!escritura) {
      return {
        reglaId: 'R16',
        severity: 'illegible',
        titulo: 'Identificación del inmueble',
        descripcion: 'No se puede verificar sin la escritura pública.',
        razon: 'Se requiere la escritura para validar la identificación del inmueble.',
      };
    }

    const esc = escritura.rawExtraction?.escritura;
    if (!esc) {
      return {
        reglaId: 'R16',
        severity: 'illegible',
        titulo: 'Identificación del inmueble',
        descripcion: 'No se pudo extraer la información del inmueble de la escritura.',
        docAId: escritura.id,
        razon: 'La escritura no contiene datos legibles del inmueble.',
      };
    }

    const problemas: string[] = [];

    if (!esc.direccion_inmueble || esc.direccion_inmueble.trim().length < 5) {
      problemas.push('Dirección/nomenclatura no identificada');
    }

    if (esc.area_m2 === null || esc.area_m2 <= 0) {
      problemas.push('Área no identificada o inválida');
    }

    if (!esc.linderos || esc.linderos.trim().length < 10) {
      problemas.push('Linderos no identificados');
    }

    if (!esc.tipo_inmueble) {
      problemas.push('Tipo de inmueble (urbano/rural) no identificado');
    }

    if (certificado && esc.direccion_inmueble) {
      const certDir = certificado.rawExtraction?.certificado?.direccion_inmueble;
      if (certDir) {
        const dirEscNorm = normalizarDireccion(esc.direccion_inmueble);
        const dirCertNorm = normalizarDireccion(certDir);
        if (dirEscNorm !== dirCertNorm) {
          problemas.push(
            `Direcciones diferentes: Escritura "${esc.direccion_inmueble}" vs Certificado "${certDir}"`
          );
        }
      }
    }

    if (esc.cedula_catastral) {
      const formatoValido = /^[0-9A-Z]{10,30}$/i.test(esc.cedula_catastral.replace(/[- ]/g, ''));
      if (!formatoValido) {
        problemas.push('Cédula catastral con formato inválido');
      }
    }

    if (problemas.length === 0) {
      return {
        reglaId: 'R16',
        severity: 'ok',
        titulo: 'Identificación del inmueble',
        descripcion: 'El inmueble está plenamente identificado en la escritura.',
        docAId: escritura.id,
        docAField: 'Dirección / Área / Linderos',
        docAValue: `${esc.direccion_inmueble || '-'} | ${esc.area_m2 || '-'} m² | ${esc.tipo_inmueble || '-'}`,
        razon: 'Se cumple con el Art. 16 Par. 1 de la Ley 1579 de 2012.',
      };
    }

    return {
      reglaId: 'R16',
      severity: problemas.length >= 3 ? 'critical' : 'review',
      titulo: 'Identificación incompleta del inmueble',
      descripcion: `Se detectaron ${problemas.length} problema(s) en la identificación del inmueble.`,
      docAId: escritura.id,
      docAField: 'Dirección / Área / Linderos',
      docAValue: esc.direccion_inmueble || 'NO DETECTADO',
      razon: problemas.join(' | ') + '. El Art. 16 Par. 1 exige que el inmueble esté plenamente identificado por matrícula, nomenclatura o linderos, área en sistema métrico decimal.',
    };
  },
};