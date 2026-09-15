import { prisma } from '../config/database';
import { bucket } from '../config/storage';
import { generativeModel } from '../config/gemini';
import { DocumentError } from './document.service';
import type { ExtractionResult } from '../types/extraction.types';

// ============================================================================
// PROMPT ESPECIALIZADO PARA GEMINI 2.5 FLASH
// ============================================================================
const PROMPT = `Eres un extractor de datos de documentos notariales y registrales colombianos. Tu función es leer el PDF adjunto y devolver la información en un JSON estructurado.

REGLAS CRÍTICAS:
1. NUNCA INVENTES DATOS. Si un campo no aparece en el documento, devuélvelo como null.
2. Si el documento es manuscrito o ilegible, indica la situación en "notas_legibilidad" y usa null en los campos que no puedas leer.
3. El "confidence" es un número 0-100 que refleja tu certeza sobre la calidad de la extracción.
4. Respeta el formato exacto del JSON de salida.
5. No agregues texto antes o después del JSON.

ESTRUCTURA DEL JSON DE SALIDA:
{
  "matricula_inmobiliaria": "string o null",
  "fecha_documento": "YYYY-MM-DD o null",
  "notaria": "string o null",
  "tipo_detectado": "escritura | certificado | otro | null",
  "escritura": {
    "numero_escritura": "string o null",
    "fecha_escritura": "YYYY-MM-DD o null",
    "notaria_nombre": "string o null",
    "notaria_codigo": "string o null",
    "ciudad_notaria": "string o null",
    "matricula_inmobiliaria": "string o null",
    "numero_folio_antecedente": "string o null",
    "naturaleza_acto": "string o null",
    "valor_acto": number o null,
    "direccion_inmueble": "string o null",
    "area_m2": number o null,
    "linderos": "string o null",
    "tipo_inmueble": "urbano | rural | null",
    "cedula_catastral": "string o null",
    "comparecientes": [
      {
        "nombre_completo": "string o null",
        "tipo_documento": "CC | NIT | CE | PA | null",
        "numero_documento": "string o null",
        "calidad": "vendedor | comprador | apoderado | otro | null"
      }
    ],
    "es_propiedad_horizontal": boolean o null,
    "nombre_conjunto": "string o null",
    "coeficiente_copropiedad": number o null,
    "bienes_privados": ["array de strings"] o null,
    "bienes_comunes": ["array de strings"] o null
  } o null,
  "certificado": {
    "numero_matricula": "string o null",
    "fecha_expedicion": "YYYY-MM-DD o null",
    "oficina_registro": "string o null",
    "codigo_oficina": "string o null",
    "area_m2": number o null,
    "linderos": "string o null",
    "direccion_inmueble": "string o null",
    "estado_folio": "activo | cerrado | falsa_tradicion | null",
    "anotacion_falsa_tradicion": boolean o null,
    "presuncion_baldio": boolean o null,
    "titulares": [
      {
        "nombre_completo": "string o null",
        "tipo_documento": "CC | NIT | CE | PA | null",
        "numero_documento": "string o null",
        "porcentaje": number o null
      }
    ],
    "anotaciones": [
      {
        "numero_anotacion": number o null,
        "fecha_anotacion": "YYYY-MM-DD o null",
        "naturaleza": "string o null",
        "documento_origen": "string o null",
        "descripcion": "string o null",
        "personas": ["array de strings"] o null
      }
    ],
    "es_propiedad_horizontal": boolean o null,
    "coeficiente_copropiedad": number o null
  } o null,
  "confidence": number,
  "notas_legibilidad": "string o null"
}

INSTRUCCIONES ESPECÍFICAS:
- Si el documento es una ESCRITURA PÚBLICA, llena el objeto "escritura" y deja "certificado" en null.
- Si el documento es un CERTIFICADO DE TRADICIÓN Y LIBERTAD, llena el objeto "certificado" y deja "escritura" en null.
- Para matrículas inmobiliarias colombianas, el formato típico es "NNN-NNNNNNN" (ej: 50N-20493821).
- Para cédulas colombianas, el formato es 8-10 dígitos sin puntos.
- Si detectas "FALSA TRADICIÓN" o "se presume baldío" en el certificado, márcalo en los booleanos correspondientes.
- Si el documento es manuscrito o de baja calidad, reduce el confidence y explica en notas_legibilidad.
- Si el inmueble está sometido al régimen de PROPIEDAD HORIZONTAL (Ley 675 de 2001), marca "es_propiedad_horizontal" como true y extrae el nombre del conjunto, el coeficiente de copropiedad (porcentaje sobre 100), y las listas de bienes privados y comunes si aparecen en el documento.
- Para el tipo de inmueble, identifica si es "urbano" o "rural" según la descripción del documento.
- La cédula catastral es el identificador predial del inmueble en el catastro (formato alfanumérico tipo "AAA0000XXXX0000000"). Si no aparece, devuélvela como null.
- El coeficiente de copropiedad debe expresarse como número decimal entre 0 y 100 (ej: 5.23 significa 5.23%).

Responde ÚNICAMENTE con el JSON válido.`;

// ============================================================================
// SERVICIO: EXTRAER DATOS CON GEMINI
// ============================================================================
export async function extractDataFromDocument(
  userId: string,
  documentId: string
): Promise<ExtractionResult> {
  // 1. Obtener el documento y verificar propiedad
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { case: { select: { userId: true } } },
  });

  if (!document) {
    throw new DocumentError('DOCUMENT_NOT_FOUND', 'Documento no encontrado.', 404);
  }
  if (document.case.userId !== userId) {
    throw new DocumentError(
      'FORBIDDEN',
      'No tienes permiso para acceder a este documento.',
      403
    );
  }

  // 2. Marcar como "processing"
  await prisma.document.update({
    where: { id: documentId },
    data: { extractionStatus: 'processing' },
  });

  try {
    // 3. Descargar el PDF desde Cloud Storage
    const file = bucket.file(document.storagePath);
    const [buffer] = await file.download();

    // 4. Convertir a base64 para enviar a Gemini
    const base64Data = buffer.toString('base64');

    // 5. Enviar a Gemini con el prompt
    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    const response = result.response;
    const textContent = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('Gemini no devolvió contenido.');
    }

    // 6. Parsear el JSON de respuesta
    let parsedData: ExtractionResult;
    try {
      // Limpiar posibles bloques de código markdown
      const cleanJson = textContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      parsedData = JSON.parse(cleanJson) as ExtractionResult;
    } catch (parseErr) {
      console.error('Error parseando JSON de Gemini:', textContent);
      throw new Error('La respuesta de Gemini no es un JSON válido.');
    }

    // 7. Guardar en la base de datos
    await prisma.document.update({
      where: { id: documentId },
      data: {
        rawExtraction: parsedData as object,
        extractionStatus: 'completed',
        extractionConfidence: parsedData.confidence || 0,
      },
    });

    return parsedData;
  } catch (err) {
    // Marcar como "failed" si hay error
    await prisma.document.update({
      where: { id: documentId },
      data: { extractionStatus: 'failed' },
    });

    console.error('Error en extracción con Gemini:', err);

    if (err instanceof DocumentError) throw err;
    throw new DocumentError(
      'EXTRACTION_ERROR',
      err instanceof Error ? err.message : 'Error al extraer datos del documento.',
      500
    );
  }
}