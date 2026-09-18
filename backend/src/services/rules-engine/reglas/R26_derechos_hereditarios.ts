import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R26 — Analisis de Derechos Hereditarios
// Fundamento: Art. 1016, 1045, 1393 C.C.
//             Art. 6 y Art. 47 Ley 1579 de 2012
// ============================================================================
// Detecta si el vendedor actua como heredero sin que la adjudicacion de la
// sucesion haya sido previamente registrada. La venta de derechos hereditarios
// sin adjudicacion previa genera una cadena de titulacion interrumpida.
// ============================================================================

interface AnotacionHerencia {
  numero: number | null;
  codigo: string;
  tipo: 'adjudicacion' | 'venta_derechos' | 'sucesion_iliquida' | 'testamentaria';
  descripcion: string;
}

// Palabras clave para detectar referencias a sucesiones
const PALABRAS_SUCESION = [
  'sucesion',
  'herencia',
  'heredero',
  'herederos',
  'causante',
  'testamentaria',
  'intestada',
  'iliquida',
  'particion',
  'adjudicacion',
];

// Palabras clave para adjudicaciones ya registradas
const PALABRAS_ADJUDICACION = [
  'adjudicacion',
  'particion',
  'liquidacion de sociedad conyugal',
  'partijas',
];

// Palabras clave para venta de derechos hereditarios (falsa tradicion)
const PALABRAS_VENTA_DERECHOS = [
  'derechos hereditarios',
  'derechos y acciones',
  'derechos sucesorales',
  'venta de derechos',
  'cesion de derechos',
];

// Palabras clave para sucesiones iliquidas (falta paso previo)
const PALABRAS_ILIQUIDA = [
  'sucesion iliquida',
  'sucesion en tramite',
  'sin adjudicacion',
  'sin particion',
  'sin liquidar',
];

export const R26_DerechosHereditarios: Rule = {
  id: 'R26',
  nombre: 'Analisis de derechos hereditarios',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;
    if (!certificado) {
      return {
        reglaId: 'R26', severity: 'illegible',
        titulo: 'Analisis de derechos hereditarios',
        descripcion: 'No se puede verificar sin el certificado de tradicion.',
        razon: 'Se requiere el certificado para analizar las sucesiones y herencias.',
      };
    }

    const anotaciones = certificado.rawExtraction?.certificado?.anotaciones || [];
    if (anotaciones.length === 0) {
      return {
        reglaId: 'R26', severity: 'illegible',
        titulo: 'Sin anotaciones extraidas',
        descripcion: 'No se pudieron extraer las anotaciones del certificado.',
        razon: 'Verifica que el certificado sea legible y contenga anotaciones.',
      };
    }

    // 1. Buscar referencias a sucesiones/herencias
    const referencias: AnotacionHerencia[] = [];
    let hayAdjudicacionRegistrada = false;

    for (const a of anotaciones) {
      const codigo = (a.codigo_anotacion || '').trim();
      const descripcion = (a.descripcion || '') + ' ' + (a.descripcion_codigo || '');
      const descLower = descripcion.toLowerCase();

      // ¿Menciona palabras de sucesion?
      const mencionaSucesion = PALABRAS_SUCESION.some((p) => descLower.includes(p));
      if (!mencionaSucesion) continue;

      // Clasificar el tipo
      let tipo: AnotacionHerencia['tipo'] = 'sucesion_iliquida';

      if (codigo.startsWith('09') || PALABRAS_ADJUDICACION.some((p) => descLower.includes(p))) {
        tipo = 'adjudicacion';
        hayAdjudicacionRegistrada = true;
      } else if (PALABRAS_VENTA_DERECHOS.some((p) => descLower.includes(p))) {
        tipo = 'venta_derechos';
      } else if (PALABRAS_ILIQUIDA.some((p) => descLower.includes(p))) {
        tipo = 'sucesion_iliquida';
      } else if (descLower.includes('testamentaria')) {
        tipo = 'testamentaria';
      }

      referencias.push({
        numero: a.numero_anotacion,
        codigo,
        tipo,
        descripcion: descripcion.substring(0, 200),
      });
    }

    // 2. Si no hay referencias a sucesiones → OK
    if (referencias.length === 0) {
      return {
        reglaId: 'R26', severity: 'ok',
        titulo: 'Sin referencias a sucesiones',
        descripcion: 'El folio no reporta anotaciones relacionadas con sucesiones o herencias.',
        docAId: certificado.id, docAField: 'Anotaciones',
        docAValue: anotaciones.length + ' anotaciones revisadas',
        razon: 'El inmueble no tiene procesos sucesorales pendientes en el folio.',
      };
    }

    // 3. Si hay venta de derechos hereditarios SIN adjudicacion previa → CRITICAL
    const ventaDerechos = referencias.filter((r) => r.tipo === 'venta_derechos');
    if (ventaDerechos.length > 0 && !hayAdjudicacionRegistrada) {
      const detalles = ventaDerechos
        .map((r) => 'anotacion ' + r.numero + ' (codigo ' + r.codigo + ')')
        .join(', ');
      return {
        reglaId: 'R26', severity: 'critical',
        titulo: 'Venta de derechos hereditarios sin adjudicacion',
        descripcion: 'El folio reporta venta de derechos hereditarios (' + detalles + ') pero NO hay adjudicacion de la sucesion registrada previamente.',
        docAId: certificado.id, docAField: 'Venta de derechos',
        docAValue: ventaDerechos.map((r) => r.descripcion).join(' | '),
        razon: 'Para vender un inmueble heredado, primero debe registrarse la adjudicacion de la sucesion (Art. 6 y Art. 47 Ley 1579). La venta de derechos hereditarios sin adjudicacion genera cadena de titulacion interrumpida (Art. 1016 C.C.).',
      };
    }

    // 4. Si hay referencias a sucesion iliquida → REVIEW
    const iliquidas = referencias.filter((r) => r.tipo === 'sucesion_iliquida');
    if (iliquidas.length > 0 && !hayAdjudicacionRegistrada) {
      const detalles = iliquidas
        .map((r) => 'anotacion ' + r.numero)
        .join(', ');
      return {
        reglaId: 'R26', severity: 'review',
        titulo: 'Referencia a sucesion sin adjudicar',
        descripcion: 'El folio menciona sucesion (' + detalles + ') pero no se identifico una adjudicacion registrada.',
        docAId: certificado.id, docAField: 'Sucesion',
        docAValue: iliquidas.map((r) => r.descripcion).join(' | '),
        razon: 'Verifica si la sucesion esta liquidada y adjudicada. Si no lo esta, es requisito previo a cualquier venta (Art. 1016 C.C.).',
      };
    }

    // 5. Si hay adjudicacion registrada → OK
    if (hayAdjudicacionRegistrada) {
      return {
        reglaId: 'R26', severity: 'ok',
        titulo: 'Adjudicacion de sucesion registrada',
        descripcion: 'El folio reporta la adjudicacion de la sucesion. Los herederos tienen titulo registrado.',
        docAId: certificado.id, docAField: 'Adjudicacion',
        docAValue: referencias
          .filter((r) => r.tipo === 'adjudicacion')
          .map((r) => 'anotacion ' + r.numero)
          .join(', '),
        razon: 'La sucesion esta debidamente registrada y los herederos tienen titulo de dominio (Art. 47 Ley 1579).',
      };
    }

    // 6. Fallback: hay referencias pero sin clasificar claramente
    return {
      reglaId: 'R26', severity: 'review',
      titulo: 'Referencias a sucesion requieren revision',
      descripcion: 'El folio contiene referencias a sucesiones que no pudieron clasificarse claramente.',
      docAId: certificado.id, docAField: 'Sucesion',
      docAValue: referencias.map((r) => r.descripcion).join(' | '),
      razon: 'Verifica manualmente el estado de las sucesiones en el folio (Art. 6 Ley 1579).',
    };
  },
};
