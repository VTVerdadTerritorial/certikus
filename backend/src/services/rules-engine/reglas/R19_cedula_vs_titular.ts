import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R19 — Cedula del vendedor vs titular registral
// Fundamento: Art. 3 y Art. 29 Ley 1579 de 2012 (tracto sucesivo)
// ============================================================================
// Valida que el VENDEDOR (o tradente) identificado con su cedula coincida
// con el titular registral actual del certificado. Sin esto, se podria estar
// vendiendo un predio que no es del vendedor.
// ============================================================================

function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PALABRAS_IGNORADAS = new Set(['de', 'la', 'las', 'los', 'del', 'y', 'e', 'o', 'u']);

function palabrasSignificativas(nombre: string): Set<string> {
  return new Set(
    normalizarNombre(nombre)
      .split(' ')
      .filter((p) => p.length > 2 && !PALABRAS_IGNORADAS.has(p))
  );
}

function sonMismoTitular(a: string, b: string): boolean {
  const pa = palabrasSignificativas(a);
  const pb = palabrasSignificativas(b);
  let coincidencias = 0;
  for (const p of pa) {
    if (pb.has(p)) coincidencias++;
  }
  return coincidencias >= 2;
}

export const R19_CedulaVsTitular: Rule = {
  id: 'R19',
  nombre: 'Cedula del vendedor vs titular registral',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado, otrosDocumentos } = ctx;

    if (!certificado) {
      return {
        reglaId: 'R19', severity: 'illegible',
        titulo: 'Verificacion de vendedor',
        descripcion: 'No se puede verificar sin el certificado de tradicion.',
        razon: 'Se requiere el certificado para conocer al titular registral.',
      };
    }

    const cedulaVendedor = otrosDocumentos.find((d) => d.tipo === 'cedula_vendedor');
    if (!cedulaVendedor) {
      return {
        reglaId: 'R19', severity: 'review',
        titulo: 'Cedula del vendedor no aportada',
        descripcion: 'No se aporto la cedula del vendedor. No se puede validar que coincida con el titular registral.',
        razon: 'Sin la cedula del vendedor no se puede verificar el tracto sucesivo (Art. 3 Ley 1579).',
      };
    }

    const nombreCedula = cedulaVendedor.rawExtraction?.cedula?.nombre_completo;
    if (!nombreCedula) {
      return {
        reglaId: 'R19', severity: 'illegible',
        titulo: 'Nombre del vendedor no extraido',
        descripcion: 'El OCR no pudo extraer el nombre completo de la cedula del vendedor.',
        docAId: cedulaVendedor.id, docAField: 'Cedula - Nombre',
        docAValue: 'NO DETECTADO',
        razon: 'Verifica la calidad del documento de identidad.',
      };
    }

    const titulares = certificado.rawExtraction?.certificado?.titulares || [];
    if (titulares.length === 0) {
      return {
        reglaId: 'R19', severity: 'illegible',
        titulo: 'Titulares no extraidos del certificado',
        descripcion: 'El certificado no reporta titulares registrales.',
        docBId: certificado.id, docBField: 'Titulares',
        docBValue: 'NO DETECTADO',
        razon: 'El certificado debe indicar quien es el titular actual del dominio.',
      };
    }

    const titularRegistral = titulares[titulares.length - 1];
    const nombreTitular = titularRegistral.nombre_completo || '';

    if (!nombreTitular) {
      return {
        reglaId: 'R19', severity: 'illegible',
        titulo: 'Titular registral sin nombre',
        descripcion: 'El titular del certificado no tiene nombre completo extraido.',
        docBId: certificado.id, docBField: 'Titular',
        docBValue: 'NO DETECTADO',
        razon: 'Verifica manualmente quien es el titular registral actual.',
      };
    }

    const coincide = sonMismoTitular(nombreCedula, nombreTitular);

    if (coincide) {
      return {
        reglaId: 'R19', severity: 'ok',
        titulo: 'Vendedor coincide con titular registral',
        descripcion: 'La cedula del vendedor corresponde al titular registral actual del predio.',
        docAId: cedulaVendedor.id, docAField: 'Cedula - Vendedor',
        docAValue: nombreCedula,
        docBId: certificado.id, docBField: 'Titular registral',
        docBValue: nombreTitular,
        razon: 'Se respeta el principio de tracto sucesivo (Art. 29 Ley 1579).',
      };
    }

    return {
      reglaId: 'R19', severity: 'critical',
      titulo: 'Vendedor NO coincide con titular registral',
      descripcion: 'La persona que figura como vendedor en la cedula NO es el titular registral actual del certificado.',
      docAId: cedulaVendedor.id, docAField: 'Cedula - Vendedor',
      docAValue: nombreCedula,
      docBId: certificado.id, docBField: 'Titular registral',
      docBValue: nombreTitular,
      razon: 'Nadie puede vender lo que no le pertenece. El tracto sucesivo exige que el vendedor sea el titular registral (Art. 3 y Art. 29 Ley 1579).',
    };
  },
};
