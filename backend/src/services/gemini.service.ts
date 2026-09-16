import { prisma } from '../config/database';
import { bucket } from '../config/storage';
import { generativeModel } from '../config/gemini';
import { DocumentError } from './document.service';
import type { ExtractionResult } from '../types/extraction.types';

// ============================================================================
// PROMPT ESPECIALIZADO PARA GEMINI 2.5 FLASH — v2 (mejorado)
// ============================================================================
// Mejoras respecto a v1:
//   · Instrucciones explícitas de EXCLUSIÓN para comparecientes
//   · Guía de dónde extraer TITULARES del certificado (última anotación)
//   · Guía de dónde extraer FOLIO ANTECEDENTE de la escritura
//   · Guía de extracción del nombre COMPLETO de la notaría
//   · Detección de FALSA TRADICIÓN por anotación (no solo bool)
// ============================================================================
const PROMPT = `Eres un extractor de datos de documentos notariales y registrales colombianos. Tu función es leer el PDF adjunto y devolver la información en un JSON estructurado.

═══════════════════════════════════════════════════════════════════════════
REGLAS CRÍTICAS (aplican siempre)
═══════════════════════════════════════════════════════════════════════════

1. NUNCA INVENTES DATOS. Si un campo no aparece en el documento, devuélvelo como null.
2. Si el documento es manuscrito o ilegible, indica la situación en "notas_legibilidad" y usa null en los campos que no puedas leer.
3. El "confidence" es un número 0-100 que refleja tu certeza sobre la calidad de la extracción.
4. Respeta el formato exacto del JSON de salida.
5. No agregues texto antes o después del JSON.

═══════════════════════════════════════════════════════════════════════════
REGLA DE EXCLUSIÓN DE PERSONAS (CRÍTICA — aplica a escrituras)
═══════════════════════════════════════════════════════════════════════════

En el array "comparecientes" SOLO deben aparecer las PARTES del acto:
   ✅ VENDEDOR / TRADENTE
   ✅ COMPRADOR / ADQUIRENTE
   ✅ DONANTE / DONATARIO
   ✅ PERMUTANTES
   ✅ APODERADOS con facultad expresa
   ✅ SOCIEDAD CONYUGAL (si aparece como titular)

NUNCA incluyas en "comparecientes":
   ❌ EL NOTARIO o NOTARIA (ej: "MIRIAM CONSUELO LASSO MEDINA")
   ❌ EL REGISTRADOR
   ❌ TESTIGOS o DECLARANTES
   ❌ FUNCIONARIOS de la notaría
   ❌ ABOGADOS que solo autentican firmas
   ❌ El nombre del AL CALDE o funcionario público

Si dudas si alguien es compareciente, es porque NO lo es. Solo van los que venden o compran.

═══════════════════════════════════════════════════════════════════════════
INSTRUCCIONES ESPECÍFICAS PARA ESCRITURA PÚBLICA
═══════════════════════════════════════════════════════════════════════════

Cuando el documento sea una ESCRITURA PÚBLICA:

1. Extrae "comparecientes" aplicando la REGLA DE EXCLUSIÓN de arriba.
   · El vendedor suele aparecer como: "compareció el señor X" o "vendedor: X"
   · El comprador suele aparecer como: "en favor de Y" o "compradora: Y"
   · Extrae nombre_completo, tipo_documento (CC/CE/PA), numero_documento, calidad.

2. Para "numero_folio_antecedente": busca en el texto frases como:
   · "adquirido por compra hecha mediante escritura pública No. X"
   · "registrada bajo el folio de matrícula inmobiliaria No. Y"
   · "título antecedente", "antecedente registral", "inscrito bajo el folio"
   · Extrae el número COMPLETO del folio (ej: "240-24248"). Si menciona dos números (escritura y folio), prioriza el FOLIO DE MATRÍCULA.

3. Para "notaria_nombre": extrae el nombre COMPLETO tal como aparece.
   · Correcto: "Notaría Segunda del Círculo de Pasto", "Notaría 4 de Bogotá"
   · Incorrecto: "SEGUNDA" (solo el número)
   · Busca frases como: "ante mí [NOMBRE], Notaría [N] del Círculo de [CIUDAD]"

4. Para "area_m2": convierte hectáreas a metros cuadrados.
   · 1 hectárea = 10.000 m²
   · Ej: "8 hectáreas y 5.000 m²" → 85000

5. Para "linderos": copia el texto literal de los linderos.

═══════════════════════════════════════════════════════════════════════════
INSTRUCCIONES ESPECÍFICAS PARA CERTIFICADO DE TRADICIÓN Y LIBERTAD
═══════════════════════════════════════════════════════════════════════════

Cuando el documento sea un CERTIFICADO DE TRADICIÓN:

1. Extrae "titulares" de la ÚLTIMA anotación donde aparezca "A:" (adquirente).
   · Cada anotación tiene "DE: [vendedor]" y "A: [comprador]".
   · El titular ACTUAL es el "A:" de la última anotación.
   · Si la última anotación dice "A: MONCAYO MONCAYO JUAN BAUTISTA", ese es el titular actual.
   · Extrae también el número de documento (CC#) si aparece.

2. Para "anotacion_falsa_tradicion": marca true si CUALQUIER anotación del certificado contiene:
   · El texto literal "FALSA TRADICIÓN" o "FALSA TRADICION"
   · El código "610", "607", "608" en la especificación
   · Frases como "ENAJENACION DERECHOS SUCESORALES CUERPO CIERTO"
   · Frases como "COMPRAVENTA DERECHOS Y ACCIONES"
   · Frases como "ADJUDICACION EN SUCESION DE LA POSESION"
   · Frases como "COMPRAVENTA DE LA POSESION"
   Marca también el número de anotaciones afectadas si es posible.

3. Para "area_m2" del certificado: extrae el área de la DESCRIPCIÓN PRINCIPAL (encabezado "DESCRIPCION: CABIDA Y LINDEROS"), NO de las anotaciones.
   · 1 hectárea = 10.000 m²
   · Ej: "CINCO HECTAREAS" → 50000
   · Si la descripción y las anotaciones difieren, prioriza la DESCRIPCIÓN pero nota la discrepancia en "notas_legibilidad".

4. Para "estado_folio": analiza el campo "ESTADO DEL FOLIO" del certificado.
   · "ACTIVO" → "activo"
   · "CERRADO" → "cerrado"
   · Si el folio nació con falsa tradición pero sigue activo, deja "activo" y marca "anotacion_falsa_tradicion"=true.

5. Para "anotaciones": extrae TODAS las anotaciones del certificado como array.
   · numero_anotacion, fecha_anotacion, naturaleza (ej: "FALSA TRADICION", "COMPRAVENTA")
   · documento_origen (escritura, notaría)
   · descripcion (texto completo de la especificación)
   · personas: array con "DE: X" y "A: Y"

6. Para "direccion_inmueble": usa el campo "DIRECCION DEL INMUEBLE" del certificado.
   · Ej: "LAS PIEDRAS"

═══════════════════════════════════════════════════════════════════════════
ESTRUCTURA DEL JSON DE SALIDA
═══════════════════════════════════════════════════════════════════════════

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

═══════════════════════════════════════════════════════════════════════════
REGLAS ADICIONALES
═══════════════════════════════════════════════════════════════════════════

- Si el documento es una ESCRITURA PÚBLICA, llena el objeto "escritura" y deja "certificado" en null.
- Si el documento es un CERTIFICADO DE TRADICIÓN Y LIBERTAD, llena el objeto "certificado" y deja "escritura" en null.
- Para matrículas inmobiliarias colombianas, el formato típico es "NNN-NNNNNNN" (ej: 240-24248).
- Para cédulas colombianas, el formato es 8-10 dígitos sin puntos.
- Si el certificado menciona textualmente "FALSA TRADICIÓN", marca "anotacion_falsa_tradicion" como true.
- Si el certificado menciona textualmente "PRESUNCIÓN DE BALDÍO" o "SE PRESUME BALDÍO", marca "presuncion_baldio" como true. NO los mezcles con falsa tradición.
- Cuando un campo no aparezca textualmente, devuélvelo como null. NUNCA agregues texto interpretativo o inferencias jurídicas.
- Si el inmueble está sometido al régimen de PROPIEDAD HORIZONTAL (Ley 675 de 2001), marca "es_propiedad_horizontal" como true.
- Para el tipo de inmueble, identifica "urbano" o "rural" según la descripción del documento.
- La cédula catastral es el identificador predial (formato "AAA0000XXXX0000000"). Si no aparece, null.
- El coeficiente de copropiedad debe expresarse como número decimal entre 0 y 100.

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