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

3. Para "notaria_nombre": extrae el nombre de la NOTARIA (la ENTIDAD, NO el notario).
   · CORRECTO: "Notaría Segunda del Círculo de Pasto", "Notaría 4 de Bogotá", "Notaría 1a de Medellín"
   · INCORRECTO: "MIRIAM CONSUELO LASSO MEDINA" (ese es el NOMBRE DEL NOTARIO, una persona)
   · INCORRECTO: "SEGUNDA" (solo el número, sin el resto del nombre)

   REGLA CLAVE: El notario es una PERSONA que actua; la notaria es una ENTIDAD/OFICINA.
   Cuando el documento diga "ante mi [NOMBRE DEL NOTARIO], Notaria [N] del Circulo de [CIUDAD]",
   DEBES extraer "Notaria [N] del Circulo de [CIUDAD]" y NUNCA el nombre del notario.

   Ejemplo del texto: "ante mi MIRIAM CONSUELO LASSO MEDINA, Notaria Segunda del Circulo de Pasto"
   → notaria_nombre: "Notaria Segunda del Circulo de Pasto"
   → El nombre "MIRIAM CONSUELO LASSO MEDINA" se IGNORA (es el notario, no la notaria)

4. Para "area_m2": convierte hectáreas a metros cuadrados.
   · 1 hectárea = 10.000 m²
   · Ej: "8 hectáreas y 5.000 m²" → 85000

5. Para "linderos": copia el texto literal de los linderos.

═══════════════════════════════════════════════════════════════════════════
═══════════════════════════════════════════════════════════════════════════
INSTRUCCIONES ESPECIFICAS PARA CEDULA DE CIUDADANIA
═══════════════════════════════════════════════════════════════════════════

Cuando el documento sea una CEDULA DE CIUDADANIA colombiana (fisica o digital,
anverso y reverso), llena el objeto "cedula" con los datos DEL TITULAR.

IMPORTANTE — La cedula tiene 2 fechas que NO debes confundir:

  FECHA DE NACIMIENTO (aparece arriba en la cedula)
  Ejemplo: "18-OCT-1971"  -> fecha_nacimiento: 1971-10-18

  FECHA DE EXPEDICION (aparece abajo, junto a la ciudad)
  Ejemplo: "31-JUL-1990 PASTO" -> fecha_expedicion: 1990-07-31, lugar_expedicion: Pasto

Campos a extraer:

1. nombre_completo: NOMBRES + APELLIDOS en orden natural.
   · La cedula muestra primero los APELLIDOS y luego los NOMBRES
   · Si ves "CONTRERAS CERON" arriba y "JOHN BRAULIO" abajo,
     el nombre completo es "JOHN BRAULIO CONTRERAS CERON"

2. numero_documento: Numero de la cedula SIN puntos ni espacios.
   · "98.381.080" -> "98381080"
   · "1.085.248.404" -> "1085248404"

3. fecha_nacimiento: Fecha de nacimiento en formato YYYY-MM-DD.

4. fecha_expedicion: Fecha de expedicion en formato YYYY-MM-DD.

5. lugar_nacimiento: Ciudad/municipio de nacimiento (sin departamento si es posible).
   · "LA UNION (NARINO)" -> "La Union"

6. lugar_expedicion: Ciudad donde se expidio la cedula.

7. sexo: "M" o "F" si aparece.

REGLA CRITICA: NUNCA uses la fecha de nacimiento como fecha_expedicion
ni viceversa. Son dos campos independientes.

CLASIFICACION DEL TIPO DE CEDULA (campo "tipo_cedula"):

  - "cedula_amarilla": Cedula tradicional amarilla con hologramas (formato anterior a 2020).
    Muestra fotografia, huella, firma y fondo amarillo con patrones.

  - "cedula_digital_fisica": Cedula digital en formato fisico de policarbonato (nueva generacion
    desde 2020). Es una tarjeta plastica mas rigida, con chip y codigos QR.

  - "cedula_digital_app": Captura de pantalla de la app movil "Cedula Digital Colombia"
    de la Registraduria. Se reconoce porque muestra la interfaz de la app con botones,
    menus, fecha de actualizacion, y el texto "Cedula Digital" o el logo de la app.
    NOTA: si ves barra de estado de telefono, botones de app o menus moviles, es tipo app.

  - null: si no puedes determinar el tipo.

REGLA: Si el documento NO es una cedula colombiana (ej. cedula de extranjeria, pasaporte,
tarjeta de identidad), deja tipo_cedula en null y clasifica el documento como "otro".

═══════════════════════════════════════════════════════════════════════════
INSTRUCCIONES ESPECIFICAS PARA PAZ Y SALVO (PREDIAL O VALORIZACION)
═══════════════════════════════════════════════════════════════════════════

Cuando el documento sea un PAZ Y SALVO (municipal, predial o de valorizacion),
llena el objeto "paz_salvo" con estos datos:

1. tipo: "predial" | "valorizacion" | "otro" | null
   · "predial" si menciona "impuesto predial", "predial unificado", "paz y salvo predial"
   · "valorizacion" si menciona "valorizacion" o "contribucion por valorizacion"
   · "otro" si es un paz y salvo de otro concepto

2. entidad_emisora: Alcaldia o entidad que lo expide.
   · Ejemplo: "Alcaldia Municipal de Buesaco" -> "Alcaldia Municipal de Buesaco"
   · Si dice "Tesoreria Municipal de Buesaco" tambien se acepta.

3. numero_paz_salvo: Numero o radicado del paz y salvo.
   · Ejemplo: "Paz y Salvo No. 13781" -> "13781"
   · Si no aparece, dejar null.

4. propietario: Nombre completo del propietario a quien se expide.
   · Ejemplo: "JUAN BAUTISTA MONCAYO MONCAYO"

5. numero_documento_propietario: Cedula o NIT del propietario SIN puntos.
   · Ejemplo: "2.771.580" -> "2771580"
   · Ejemplo: "000002771580" -> "2771580"

6. codigo_predial: Codigo predial municipal.
   · Ejemplo: "000200180074000"
   · Puede tener 15 o mas digitos. Mantener tal cual sin ceros adicionales.
   · Si aparece "No. Pred. Nac." o "Numero Predial Nacional" usar ese.

7. numero_predial_nacional: Codigo predial nacional (30 digitos aproximadamente).
   · Ejemplo: "52110000200000018007400000000"

8. direccion: Direccion o nombre del predio.
   · Ejemplo: "GUINDAS"

9. vereda: Vereda o corregimiento.
   · Ejemplo: "San Antonio"

10. municipio: Municipio donde esta el predio.
    · Ejemplo: "Buesaco"

11. area_m2: Area total del predio en metros cuadrados.
    · Puede venir como "8 HC + 4668 m2" -> convertir a 84668
    · 1 HC (hectarea) = 10.000 m2

12. avaluo: Avaluo catastral en pesos colombianos (solo numero).
    · Ejemplo: "$17,614,000" -> 17614000

13. ultimo_ano_pago: Ultimo ano pagado del impuesto.
    · Ejemplo: "2025" -> 2025

14. fecha_expedicion: Fecha de expedicion del paz y salvo (YYYY-MM-DD).

15. valido_hasta: Fecha de vigencia del paz y salvo (YYYY-MM-DD).
    · Buscar frases como "Valido hasta", "Vigente hasta", "Vence el".
    · IMPORTANTE: Si no aparece este campo, dejar null.
    · Ejemplo: "Valido hasta 2025-10-16" -> "2025-10-16"

REGLA: Si el documento es una LIQUIDACION (factura) de impuesto predial,
NO es un paz y salvo en si mismo, pero puede usarse como soporte. Clasificar
el documento como "paz_salvo_predial" solo si es el paz y salvo emitido por la
tesoreria, no la liquidacion.

═══════════════════════════════════════════════════════════════════════════
INSTRUCCIONES ESPECIFICAS PARA ANALISIS DE ANOTACIONES
═══════════════════════════════════════════════════════════════════════════

Para CADA anotación en el certificado de tradición y libertad, extrae:

1. numero_anotacion: El número secuencial de la anotación.
2. codigo_anotacion: El código numérico oficial de la SNR que clasifica el acto.
   Series principales:
   - 01xx: Tradición (Compraventa, Permuta, Donación) → transfieren dominio.
   - 02xx: Gravámenes (0201 Hipoteca, 0205 Patrimonio de Familia, 0206 Afectación Vivienda Familiar, 0207 Usufructo, 0208 Servidumbres).
   - 04xx: Medidas Cautelares (0427 Embargo Ejecutivo con Acción Personal, 0428 Embargo, 0411 Demanda, 0421 Secuestro).
   - 06xx: Falsa Tradición / Dominio Incompleto (0604 Compraventa de Cosa Ajena, 0607 Compraventa de Derechos y Acciones, 0610 Venta de Derechos Herenciales).
   - 09xx: Otros Actos (Adjudicaciones por sucesión, liquidaciones de sociedades).
   - 91x: Otros Actos Administrativos (Afectaciones por obras públicas).
3. descripcion_codigo: La descripción textual que acompaña al código.
4. fecha_anotacion: La fecha de la anotación (YYYY-MM-DD).
5. especificacion: El texto completo de la especificación de la anotación.
6. personas: Array de strings con los intervinientes (DE: X, A: Y).

REGLA CRITICA: El código de anotación es un dato NUMERICO de 4 dígitos. NO confundir con el número de anotación secuencial. El código aparece después de "ESPECIFICACION:" o "Redacción:".

═══════════════════════════════════════════════════════════════════════════
INSTRUCCIONES ESPECIFICAS PARA CERTIFICADO DE USO DE SUELO
═══════════════════════════════════════════════════════════════════════════

Cuando el documento sea un CERTIFICADO O CONCEPTO DE USO DE SUELO (expedido por Curaduría Urbana o Secretaría de Planeación Municipal), llena el objeto "uso_suelo" con:

1. numero_predial_nacional: Número Predial Nacional de 30 dígitos (campo clave).
2. direccion_predio: Dirección o nomenclatura del predio.
3. municipio: Municipio donde se ubica el predio.
4. uso_principal_permitido: Uso principal autorizado por el POT (ej. "Residencial", "Comercial").
5. usos_complementarios: Array de usos complementarios permitidos.
6. usos_prohibidos: Array de usos prohibidos.
7. norma_urbanistica: Acuerdo o Decreto que sustenta el concepto (ej. "Acuerdo 0373 de 2014").
8. fecha_expedicion: Fecha de expedición del certificado (YYYY-MM-DD).
9. entidad_emisora: Entidad que expide (Curaduría Urbana, Secretaría de Planeación).

REGLA: La vigencia del certificado varía por municipio (1, 2 o 3 años). Si el documento indica vigencia, extraerla. Si no, dejar null.

CLASIFICACION DEL SUELO (campo "tipo_suelo"):

Segun la Ley 388 de 1997 (Ley de Ordenamiento Territorial) y el Decreto 1077 de 2015,
el suelo se clasifica en:

  - "urbano": Area dentro del perimetro urbano con infraestructura vial, acueducto
    y alcantarillado. Usos tipicos: residencial, comercial, servicios, industrial,
    dotacional.

  - "rural": Terrenos no aptos para uso urbano. Usos tipicos: agricola, ganadero,
    forestal, agropecuario, agroforestal, minero.

  - "expansion_urbana": Area urbanizable a mediano o largo plazo, sujeta a plan
    parcial. No se puede urbanizar sin plan parcial aprobado.

  - "suburbano": Zona mixta dentro del suelo rural. Usos tipicos: vivienda campestre,
    parcelaciones, equipamientos de bajo impacto.

  - "proteccion": Areas de conservacion, reserva forestal, humedales, paramos.
    Usos muy restringidos (solo conservacion).

  - null: si no puedes determinar el tipo de suelo.

NOTA: Si el documento dice "suelo urbano", "area urbana", "perimetro urbano" -> "urbano".
Si dice "suelo rural", "area rural", "predio rural" -> "rural".
Si dice "expansion urbana" o "suelo de expansion" -> "expansion_urbana".
Si dice "suburbano" o "area suburbana" -> "suburbano".
Si dice "proteccion", "reserva", "conservacion" -> "proteccion".

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
═══════════════════════════════════════════════════════════════════════════
INSTRUCCIONES DE CLASIFICACION (campo "tipo_detectado")
═══════════════════════════════════════════════════════════════════════════

Clasifica el documento en UNO de estos tipos:

- "escritura": Escritura publica notarial (compraventa, hipoteca, etc.)
- "certificado": Certificado de tradicion y libertad del folio de matricula (ORIP/SNR)
- "cedula": Cedula de ciudadania colombiana (fisica o digital, anverso y reverso)
- "poder": Poder notarial otorgado por una parte a un apoderado
- "camara_comercio": Certificado de existencia y representacion legal de una empresa (Camara de Comercio)
- "paz_salvo_predial": Paz y salvo del impuesto predial municipal
- "paz_salvo_valorizacion": Paz y salvo de contribucion por valorizacion
- "certificado_catastral": Certificado catastral del IGAC o municipal
- "adicional": Otros documentos relacionados con el tramite registral (promesa de compraventa, reglamento de propiedad horizontal, licencia de construccion, etc.)
- "otro": Documentos NO relacionados con el tramite registral (carnes, licencias de conduccion, diplomas, recibos de servicios, etc.)

REGLA CRITICA: Si el documento NO esta relacionado con un tramite inmobiliario/registral (carnes, diplomas, licencias de conduccion, extractos bancarios, etc.), clasificalo como "otro". CERTIKUS solo acepta documentos prediales/registrales.

ESTRUCTURA DEL JSON DE SALIDA
═══════════════════════════════════════════════════════════════════════════

{
  "matricula_inmobiliaria": "string o null",
  "fecha_documento": "YYYY-MM-DD o null",
  "notaria": "string o null",
  "tipo_detectado": "escritura | certificado | cedula | poder | camara_comercio | paz_salvo_predial | paz_salvo_valorizacion | certificado_catastral | adicional | otro | null",
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
  "paz_salvo": {
    "tipo": "predial | valorizacion | otro | null",
    "entidad_emisora": "string o null",
    "numero_paz_salvo": "string o null",
    "propietario": "string o null",
    "numero_documento_propietario": "string o null",
    "codigo_predial": "string o null",
    "numero_predial_nacional": "string o null",
    "direccion": "string o null",
    "vereda": "string o null",
    "municipio": "string o null",
    "area_m2": number o null,
    "avaluo": number o null,
    "ultimo_ano_pago": number o null,
    "fecha_expedicion": "YYYY-MM-DD o null",
    "valido_hasta": "YYYY-MM-DD o null"
  } o null,
  "cedula": {
    "tipo_cedula": "cedula_amarilla | cedula_digital_fisica | cedula_digital_app | null",
    "nombre_completo": "string o null",
    "numero_documento": "string o null",
    "fecha_nacimiento": "YYYY-MM-DD o null",
    "lugar_nacimiento": "string o null",
    "fecha_expedicion": "YYYY-MM-DD o null",
    "lugar_expedicion": "string o null",
    "sexo": "M | F | null"
  } o null,
  "uso_suelo": {
    "tipo_suelo": "urbano | rural | expansion_urbana | suburbano | proteccion | null",
    "numero_predial_nacional": "string o null",
    "direccion_predio": "string o null",
    "municipio": "string o null",
    "uso_principal_permitido": "string o null",
    "usos_complementarios": ["string"] o null,
    "usos_prohibidos": ["string"] o null,
    "norma_urbanistica": "string o null",
    "fecha_expedicion": "YYYY-MM-DD o null",
    "entidad_emisora": "string o null",
    "vigencia_hasta": "YYYY-MM-DD o null"
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
                // Usar el mimetype REAL del documento (PDF, JPG o PNG)
                mimeType: document.mimeType || 'application/pdf',
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