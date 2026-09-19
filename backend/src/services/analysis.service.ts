import { prisma } from '../config/database';
import { DocumentError } from './document.service';
import { extractDataFromDocument } from './gemini.service';
import { ejecutarReglas, calcularEstado, calcularMetricas } from './rules-engine';
import type { RuleContext, RuleResult } from '../types/rules.types';
import type { ExtractionResult } from '../types/extraction.types';

// ============================================================================
// SERVICIO: ANÁLISIS COMPLETO DE UN CASO
// ============================================================================
export async function analyzeCase(
  userId: string,
  caseId: string
): Promise<{
  caseId: string;
  estado: 'CORREGIR' | 'REVISAR' | 'CONSISTENTE';
  metrics: {
    criticals: number;
    reviews: number;
    oks: number;
    illegibles: number;
    total: number;
  };
  findings: RuleResult[];
  analysisTimeSeconds: number;
}> {
  const startTime = Date.now();

  // 1. Verificar caso + permisos
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    include: { documents: true },
  });

  if (!caseData) {
    throw new DocumentError('CASE_NOT_FOUND', 'Expediente no encontrado.', 404);
  }
  if (caseData.userId !== userId) {
    throw new DocumentError(
      'FORBIDDEN',
      'No tienes permiso para analizar este expediente.',
      403
    );
  }
  if (caseData.documents.length === 0) {
    throw new DocumentError(
      'NO_DOCUMENTS',
      'El expediente no tiene documentos para analizar.',
      400
    );
  }

  // 2. Marcar como "analyzing"
  await prisma.case.update({
    where: { id: caseId },
    data: { estado: 'analyzing' },
  });

  try {
    // 3. Extraer datos de cada documento
    const documentosExtraidos = [];
    for (const doc of caseData.documents) {
      let rawExtraction = doc.rawExtraction as ExtractionResult | null;

      if (!rawExtraction || doc.extractionStatus !== 'completed') {
        console.log(`[Análisis] Extrayendo datos de ${doc.id}...`);
        rawExtraction = await extractDataFromDocument(userId, doc.id);
      }

      documentosExtraidos.push({
        id: doc.id,
        tipo: doc.tipo,
        filename: doc.filename,
        rawExtraction,
        extractionStatus: 'completed',
      });
    }

    // 3.5 — R26: Verificar calidad de extraccion antes de analizar
    // Si un documento CRITICO (escritura o certificado) tiene confianza < 60,
    // bloquear el analisis y pedir al usuario una version mas nitida.
    const DOCS_CRITICOS_R26 = ['escritura', 'certificado'];
    const CONFIANZA_MINIMA_R26 = 60;

    const documentosBajaCalidad = documentosExtraidos
      .filter((d) => DOCS_CRITICOS_R26.includes(d.tipo))
      .filter((d) => {
        const conf = d.rawExtraction?.confidence ?? 0;
        return conf < CONFIANZA_MINIMA_R26;
      });

    if (documentosBajaCalidad.length > 0) {
      const detalles = documentosBajaCalidad
        .map((d) => `"${d.filename}" (confianza ${d.rawExtraction?.confidence ?? 0}%)`)
        .join(', ');

      await prisma.case.update({
        where: { id: caseId },
        data: { estado: 'failed' },
      });

      throw new DocumentError(
        'DOCUMENT_ILLEGIBLE',
        `No podemos analizar el expediente porque los siguientes documentos no son legibles: ${detalles}. Por favor, sube versiones mas nitidas e intenta de nuevo.`,
        422
      );
    }

    // 3.6 — R18: Verificar que cada documento este en el slot correcto
    // Mapeo: slot de subida -> tipo esperado que debe detectar el OCR
    const SLOT_A_TIPO_ESPERADO: Record<string, string> = {
      escritura: 'escritura',
      certificado: 'certificado',
      cedula_vendedor: 'cedula',
      cedula_comprador: 'cedula',
      poder: 'poder',
      camara_comercio: 'camara_comercio',
      paz_salvo_predial: 'paz_salvo_predial',
      paz_salvo_valorizacion: 'paz_salvo_valorizacion',
      certificado_catastral: 'certificado_catastral',
      adicional: 'adicional',
    };

    const NOMBRES_AMIGABLES: Record<string, string> = {
      escritura: 'escritura publica',
      certificado: 'certificado de tradicion y libertad',
      cedula: 'cedula de ciudadania',
      poder: 'poder notarial',
      camara_comercio: 'certificado de camara de comercio',
      paz_salvo_predial: 'paz y salvo predial',
      paz_salvo_valorizacion: 'paz y salvo de valorizacion',
      certificado_catastral: 'certificado catastral',
      adicional: 'documento adicional del tramite',
      otro: 'documento NO relacionado con el tramite registral',
    };

    const documentosMalUbicados: string[] = [];

    for (const doc of documentosExtraidos) {
      const tipoEsperado = SLOT_A_TIPO_ESPERADO[doc.tipo];
      const tipoDetectado = doc.rawExtraction?.tipo_detectado;

      if (!tipoEsperado) continue;

      // EXCEPCION: si el slot es adicional, aceptar cualquier documento predial
      if (doc.tipo === 'adicional') {
        const tiposPredialesAceptadosEnAdicional = ['adicional', 'paz_salvo_predial', 'liquidacion_predial', 'paz_salvo_valorizacion', 'certificado_catastral', 'uso_suelo'];
        if (tipoDetectado === null || tiposPredialesAceptadosEnAdicional.includes(tipoDetectado)) { continue; }
      }

      // Documento clasificado como "otro" -> rechazo siempre
      if (tipoDetectado === 'otro') {
        documentosMalUbicados.push(
          `"${doc.filename}" fue subido como "${NOMBRES_AMIGABLES[tipoEsperado]}" pero CERTIKUS detecto que NO es un documento relacionado con el tramite registral`
        );
        continue;
      }

      // Tipo detectado no coincide con el esperado -> rechazo
      if (tipoDetectado && tipoDetectado !== tipoEsperado) {
        documentosMalUbicados.push(
          `"${doc.filename}" fue subido como "${NOMBRES_AMIGABLES[tipoEsperado]}" pero CERTIKUS detecto que es "${NOMBRES_AMIGABLES[tipoDetectado] || tipoDetectado}"`
        );
      }
    }

    if (documentosMalUbicados.length > 0) {
      await prisma.case.update({
        where: { id: caseId },
        data: { estado: 'failed' },
      });

      const detalle = documentosMalUbicados.join('. ');
      throw new DocumentError(
        'DOCUMENT_WRONG_SLOT',
        `CERTIKUS detecto documentos en el sitio incorrecto: ${detalle}. Por favor, sube cada documento en el sitio correcto e intenta de nuevo.`,
        422
      );
    }

    // 4. Clasificar documentos
    const escritura = documentosExtraidos.find((d) => d.tipo === 'escritura') || null;
    const certificado = documentosExtraidos.find((d) => d.tipo === 'certificado') || null;
    const otrosDocumentos = documentosExtraidos.filter(
      (d) => d.tipo !== 'escritura' && d.tipo !== 'certificado'
    );

    // 5. Ejecutar motor de reglas
    const tipoOperacion = (caseData.tipoOperacion || 'orip') as 'orip' | 'notaria' | 'titularidad';
    const context: RuleContext = { escritura, certificado, otrosDocumentos, tipoOperacion };
    console.log('[Análisis] Ejecutando 15 reglas...');
    const findings = ejecutarReglas(context);

    // 6. Calcular estado y métricas
    const estado = calcularEstado(findings);
    const metrics = calcularMetricas(findings);

    // 7. Limpiar findings previos y guardar nuevos
    await prisma.finding.deleteMany({ where: { caseId } });

    for (const finding of findings) {
      await prisma.finding.create({
        data: {
          caseId,
          reglaId: finding.reglaId,
          severity: finding.severity,
          titulo: finding.titulo,
          descripcion: finding.descripcion,
          docAId: finding.docAId || null,
          docAPage: finding.docAPage || null,
          docAField: finding.docAField || null,
          docAValue: finding.docAValue || null,
          docBId: finding.docBId || null,
          docBPage: finding.docBPage || null,
          docBField: finding.docBField || null,
          docBValue: finding.docBValue || null,
          razon: finding.razon,
        },
      });
    }

    // 8. Calcular consistencia
    const consistencia =
      metrics.total > 0 ? Math.round((metrics.oks / metrics.total) * 100) : 0;

    // 9. Actualizar el caso
    await prisma.case.update({
      where: { id: caseId },
      data: {
        estado: 'completed',
        consistencia,
        criticals: metrics.criticals,
        reviews: metrics.reviews,
        oks: metrics.oks,
      },
    });

    const analysisTimeSeconds = (Date.now() - startTime) / 1000;
    console.log(`[Análisis] Completado en ${analysisTimeSeconds.toFixed(2)}s`);
    console.log(
      `[Análisis] Estado: ${estado} | C:${metrics.criticals} R:${metrics.reviews} OK:${metrics.oks}`
    );

    return { caseId, estado, metrics, findings, analysisTimeSeconds };
  } catch (err) {
    await prisma.case.update({
      where: { id: caseId },
      data: { estado: 'failed' },
    });

    console.error('Error en análisis:', err);

    if (err instanceof DocumentError) throw err;
    throw new DocumentError(
      'ANALYSIS_ERROR',
      err instanceof Error ? err.message : 'Error al analizar el expediente.',
      500
    );
  }
}

// ============================================================================
// SERVICIO: OBTENER REPORTE DE UN CASO
// ============================================================================
export async function getCaseReport(userId: string, caseId: string) {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      documents: {
        select: {
          id: true,
          tipo: true,
          filename: true,
          extractionStatus: true,
          extractionConfidence: true,
          uploadedAt: true,
        },
      },
      findings: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!caseData) {
    throw new DocumentError('CASE_NOT_FOUND', 'Expediente no encontrado.', 404);
  }
  if (caseData.userId !== userId) {
    throw new DocumentError(
      'FORBIDDEN',
      'No tienes permiso para ver este expediente.',
      403
    );
  }

  let estado: 'CORREGIR' | 'REVISAR' | 'CONSISTENTE' | 'PENDIENTE';
  if (caseData.estado === 'completed') {
    if (caseData.criticals > 0) estado = 'CORREGIR';
    else if (caseData.reviews > 0) estado = 'REVISAR';
    else estado = 'CONSISTENTE';
  } else {
    estado = 'PENDIENTE';
  }

  return {
    caseId: caseData.id,
    nombre: caseData.nombre,
    tipoOperacion: caseData.tipoOperacion,
    estado,
    consistencia: caseData.consistencia,
    metrics: {
      criticals: caseData.criticals,
      reviews: caseData.reviews,
      oks: caseData.oks,
      total: caseData.criticals + caseData.reviews + caseData.oks,
    },
    documents: caseData.documents,
    findings: caseData.findings,
    createdAt: caseData.createdAt,
    updatedAt: caseData.updatedAt,
  };
}