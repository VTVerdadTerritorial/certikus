import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R28 — Validacion de cedulas vs comparecientes + analisis de roles
// Fundamento: Art. 3 y 29 Ley 1579 de 2012 + Art. 768, 1871 C.C.
// ============================================================================
// Valida identidad de las partes y clasifica el riesgo juridico segun el rol.
// Casos especiales:
//   - Comprador que no coincide → puede ser tercero de buena fe (REVIEW).
//   - Vendedor que no es titular registral → venta de cosa ajena (CRITICAL).
//   - Vendedor que no coincide → falsa tradicion / suplantacion (CRITICAL).
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

export const R28_CedulasVsComparecientes: Rule = {
  id: 'R28',
  nombre: 'Cedulas vs comparecientes + roles',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado, otrosDocumentos } = ctx;

    if (!escritura) {
      return {
        reglaId: 'R28', severity: 'illegible',
        titulo: 'Validacion de comparecientes',
        descripcion: 'No se puede verificar sin la escritura publica.',
        razon: 'Se requiere la escritura para validar las cedulas aportadas.',
      };
    }

    const comparecientes = escritura.rawExtraction?.escritura?.comparecientes || [];
    const cedulaVendedor = otrosDocumentos.find((d) => d.tipo === 'cedula_vendedor');
    const cedulaComprador = otrosDocumentos.find((d) => d.tipo === 'cedula_comprador');

    const criticos: string[] = [];
    const reviews: string[] = [];

    // ========================================================================
    // 1. VALIDAR VENDEDOR
    // ========================================================================
    if (cedulaVendedor) {
      const nombreCedula = cedulaVendedor.rawExtraction?.cedula?.nombre_completo;
      const vendedorEscritura = comparecientes.find(
        (c: any) => (c.calidad || '').toLowerCase().includes('vendedor')
      );
      const nombreEscritura = vendedorEscritura?.nombre_completo;

      if (nombreCedula && nombreEscritura && !sonMismoTitular(nombreCedula, nombreEscritura)) {
        criticos.push(
          'La cedula del VENDEDOR ("' + nombreCedula + '") NO coincide con el vendedor de la escritura ("' + nombreEscritura + '"). Posible falsa tradicion o suplantacion (Art. 29 Ley 1579).'
        );
      }

      // Validar que el vendedor sea el titular registral
      if (certificado && nombreEscritura) {
        const titulares = certificado.rawExtraction?.certificado?.titulares || [];
        if (titulares.length > 0) {
          const titularActual = titulares[titulares.length - 1];
          const nombreTitular = titularActual.nombre_completo || '';
          if (nombreTitular && !sonMismoTitular(nombreEscritura, nombreTitular)) {
            criticos.push(
              'El VENDEDOR de la escritura ("' + nombreEscritura + '") NO es el titular registral actual del certificado ("' + nombreTitular + '"). Posible venta de cosa ajena (Art. 1871 C.C.).'
            );
          }
        }
      }
    }

    // ========================================================================
    // 2. VALIDAR COMPRADOR (con matiz de tercero de buena fe)
    // ========================================================================
    if (cedulaComprador) {
      const nombreCedula = cedulaComprador.rawExtraction?.cedula?.nombre_completo;
      const compradorEscritura = comparecientes.find(
        (c: any) => (c.calidad || '').toLowerCase().includes('comprador')
      );
      const nombreEscritura = compradorEscritura?.nombre_completo;

      if (nombreCedula && nombreEscritura && !sonMismoTitular(nombreCedula, nombreEscritura)) {
        reviews.push(
          'La cedula del COMPRADOR ("' + nombreCedula + '") NO coincide con el comprador de la escritura ("' + nombreEscritura + '"). Verifica si se trata de un tercero de buena fe o de un error en la documentacion. Si el comprador es un tercero que adquiere de quien cree es el dueño, su proteccion depende de la buena fe exenta de culpa (Art. 768 C.C. y Art. 1135 C.C.).'
        );
      }

      // Advertencia adicional: si el vendedor tiene problemas de titularidad,
      // el comprador podria verse afectado.
      if (cedulaVendedor && criticos.length > 0 && nombreCedula) {
        reviews.push(
          'El COMPRADOR ("' + nombreCedula + '") podria estar adquiriendo de alguien que no es el titular registral. Si actua de buena fe, podria invocar la proteccion del tercero adquirente (Art. 768 C.C.), pero la ORIP podria rechazar la inscripcion. Requiere estudio de titulos.'
        );
      }
    }

    // ========================================================================
    // 3. SIN CEDULAS APORTADAS
    // ========================================================================
    if (!cedulaVendedor && !cedulaComprador) {
      return {
        reglaId: 'R28', severity: 'review',
        titulo: 'Cedulas no aportadas',
        descripcion: 'No se aportaron cedulas para validar contra los comparecientes.',
        razon: 'Sin documentos de identidad no se puede validar la identidad de las partes.',
      };
    }

    // ========================================================================
    // 4. RESULTADO
    // ========================================================================
    if (criticos.length > 0) {
      return {
        reglaId: 'R28', severity: 'critical',
        titulo: 'Inconsistencias criticas en las partes',
        descripcion: criticos.join(' '),
        razon: 'Las inconsistencias en vendedor o cadena de titularidad pueden generar falsa tradicion o venta de cosa ajena. Requiere analisis juridico especializado antes de radicar (Art. 3 y 29 Ley 1579).',
      };
    }

    if (reviews.length > 0) {
      return {
        reglaId: 'R28', severity: 'review',
        titulo: 'Observaciones en las partes del acto',
        descripcion: reviews.join(' '),
        razon: 'Verifica la identidad de las partes y su rol en el acto. Si hay tercero de buena fe, documenta la debida diligencia (Art. 1135 C.C.).',
      };
    }

    return {
      reglaId: 'R28', severity: 'ok',
      titulo: 'Cedulas y roles correctos',
      descripcion: 'Las cedulas aportadas corresponden a las partes de la escritura y el vendedor es el titular registral.',
      razon: 'La identidad de las partes y la cadena de titularidad estan verificadas (Art. 3 y 29 Ley 1579).',
    };
  },
};
