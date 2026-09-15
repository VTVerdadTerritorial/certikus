'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ReportePDF, type Finding as FindingPDF } from '@/components/ReportePDF';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Scale,
  Clock,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  Loader2,
  HelpCircle,
} from 'lucide-react';

type Severity = 'critical' | 'review' | 'ok' | 'illegible';

interface Finding {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  docA: { name: string; page: number; field: string; value: string };
  docB: { name: string; page: number; field: string; value: string };
  why: string;
}

const MOCK_FINDINGS: Finding[] = [
  {
    id: 'F01',
    severity: 'critical',
    title: 'Falsa tradición detectada en el certificado',
    description:
      'El certificado de tradición reporta una anotación de FALSA TRADICIÓN con presunción de bien baldío.',
    docA: {
      name: 'Certificado de Tradición',
      page: 1,
      field: 'Anotación',
      value: 'Falsa tradición — se presume baldío',
    },
    docB: {
      name: 'Escritura Pública',
      page: 1,
      field: 'Naturaleza del acto',
      value: 'NO DETECTADO — documento manuscrito ilegible',
    },
    why: 'La anotación de falsa tradición implica que el bien podría tener naturaleza de baldío. Este es un hallazgo crítico que requiere análisis jurídico especializado antes de cualquier radicación. La escritura manuscrita no permitió contrastar el acto.',
  },
  {
    id: 'F02',
    severity: 'illegible',
    title: 'Escritura pública manuscrita de 1947 — ilegible',
    description:
      'El documento es manuscrito con letra cursiva de 1947. El OCR no pudo extraer los datos confiablemente.',
    docA: {
      name: 'Escritura Pública',
      page: 1,
      field: 'Contenido general',
      value: 'ILEGIBLE — requiere transcripción manual',
    },
    docB: {
      name: 'Sistema',
      page: 0,
      field: 'Confianza OCR',
      value: 'BAJA CONFIANZA (< 40%)',
    },
    why: 'La escritura es un documento manuscrito de más de 75 años. El OCR moderno no puede procesarla confiablemente. Se requiere transcripción manual certificada o solicitar copia mecanografiada a la notaría de origen antes de continuar.',
  },
  {
    id: 'F03',
    severity: 'illegible',
    title: 'Matrícula inmobiliaria no verificable en la escritura',
    description:
      'No fue posible extraer el número de matrícula inmobiliaria de la escritura pública.',
    docA: {
      name: 'Escritura Pública',
      page: 0,
      field: 'Matrícula',
      value: 'NO DETECTADO',
    },
    docB: {
      name: 'Certificado de Tradición',
      page: 1,
      field: 'Matrícula',
      value: '50N-20493812',
    },
    why: 'La matrícula solo se pudo verificar en el certificado. Sin la matrícula de la escritura no es posible validar que ambos documentos se refieran al mismo inmueble. Verificación manual obligatoria.',
  },
  {
    id: 'F04',
    severity: 'illegible',
    title: 'Área del inmueble no verificable',
    description:
      'El área no se pudo extraer de la escritura pública por ilegibilidad del documento.',
    docA: {
      name: 'Escritura Pública',
      page: 0,
      field: 'Área (m²)',
      value: 'NO DETECTADO',
    },
    docB: {
      name: 'Certificado de Tradición',
      page: 1,
      field: 'Área (m²)',
      value: '152.40 m²',
    },
    why: 'Solo se cuenta con el área del certificado. Se recomienda solicitar el certificado catastral para contrastar el área con la realidad física del predio antes de la radicación.',
  },
  {
    id: 'F05',
    severity: 'ok',
    title: 'Vigencia del certificado',
    description:
      'El certificado fue expedido el 02 de septiembre de 2026 y está vigente.',
    docA: {
      name: 'Certificado de Tradición',
      page: 1,
      field: 'Fecha de expedición',
      value: '02/09/2026',
    },
    docB: {
      name: 'Fecha de referencia',
      page: 0,
      field: 'Fecha de análisis',
      value: '13/09/2026',
    },
    why: 'El certificado tiene 11 días de expedido, dentro del plazo de vigencia de 30 días. Está apto para radicación.',
  },
  {
    id: 'F06',
    severity: 'review',
    title: 'Documentos de identidad no aportados',
    description:
      'No se cargaron documentos de identidad de las partes mencionadas en el expediente.',
    docA: {
      name: 'Expediente',
      page: 0,
      field: 'Documentos cargados',
      value: 'Sin cédulas',
    },
    docB: {
      name: 'Checklist',
      page: 0,
      field: 'Requerido',
      value: 'Recomendado',
    },
    why: 'Sin los documentos de identidad no es posible validar tracto sucesivo ni coincidencia de nombres entre la escritura y el certificado. Su ausencia limita significativamente el análisis.',
  },
];

const CHECKLIST: { label: string; status: Severity }[] = [
  { label: 'Escritura Pública cargada', status: 'ok' },
  { label: 'Certificado de Tradición cargado', status: 'ok' },
  { label: 'Escritura legible por OCR', status: 'illegible' },
  { label: 'Matrícula inmobiliaria verificada en escritura', status: 'illegible' },
  { label: 'Matrícula inmobiliaria verificada en certificado', status: 'ok' },
  { label: 'Titular identificado en certificado', status: 'ok' },
  { label: 'Naturaleza del acto verificada en escritura', status: 'illegible' },
  { label: 'Área verificable en ambos documentos', status: 'illegible' },
  { label: 'Linderos verificables', status: 'illegible' },
  { label: 'Vigencia del certificado (< 30 días)', status: 'ok' },
  { label: 'Certificado sin falsa tradición', status: 'critical' },
  { label: 'Documentos de identidad aportados', status: 'review' },
];

export default function ReportePage() {
  const [expedienteName, setExpedienteName] = useState('Expediente sin nombre');
  const [expandedFinding, setExpandedFinding] = useState<string | null>('F01');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = window.sessionStorage.getItem('certikus_expediente');
      if (name) setExpedienteName(name);
    }
  }, []);
   
  // Guardar el expediente en el historial la primera vez que se monta la página
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const id = window.sessionStorage.getItem('certikus_expediente_id');
    const nombre =
      window.sessionStorage.getItem('certikus_expediente') || 'Expediente sin nombre';

    if (!id) return;

    const alreadySaved = window.sessionStorage.getItem(`certikus_saved_${id}`);
    if (alreadySaved === 'true') return;

    const nuevoExpediente = {
      id,
      nombre,
      fecha: new Date().toISOString(),
      estado,
      consistencia,
      criticals,
      reviews,
      oks,
      totalHallazgos: MOCK_FINDINGS.length,
    };

    try {
      const stored = window.localStorage.getItem('certikus_expedientes');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [nuevoExpediente, ...existing];
      window.localStorage.setItem('certikus_expedientes', JSON.stringify(updated));
      window.sessionStorage.setItem(`certikus_saved_${id}`, 'true');
      console.log('Expediente guardado en historial:', nuevoExpediente);
    } catch (err) {
      console.error('Error guardando expediente en historial:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const criticals = MOCK_FINDINGS.filter((f) => f.severity === 'critical').length;
  const reviews = MOCK_FINDINGS.filter((f) => f.severity === 'review').length;
  const oks = MOCK_FINDINGS.filter((f) => f.severity === 'ok').length;

  const estado: 'CORREGIR' | 'REVISAR' | 'CONSISTENTE' =
    criticals > 0 ? 'CORREGIR' : reviews > 0 ? 'REVISAR' : 'CONSISTENTE';

  const estadoColor =
    estado === 'CORREGIR'
      ? {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: XCircle,
        }
      : estado === 'REVISAR'
        ? {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            icon: AlertTriangle,
          }
        : {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            icon: CheckCircle2,
          };

  const consistencia = Math.round((oks / MOCK_FINDINGS.length) * 100);

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const { pdf } = await import('@react-pdf/renderer');

      let logoDataUri = '';
      try {
        const logoResponse = await fetch('/logo-certikus.png');
        const logoBlob = await logoResponse.blob();
        logoDataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoBlob);
        });
      } catch (logoErr) {
        console.warn('No se pudo cargar el logo para el PDF:', logoErr);
      }

      const fechaActual = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const blob = await pdf(
        <ReportePDF
          expedienteName={expedienteName}
          fecha={fechaActual}
          estado={estado}
          consistencia={consistencia}
          criticals={criticals}
          reviews={reviews}
          oks={oks}
          findings={MOCK_FINDINGS as FindingPDF[]}
          checklist={CHECKLIST}
          logoDataUri={logoDataUri}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = expedienteName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase();
      link.download = `certikus-reporte-${safeName}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert(
        `Hubo un error al generar el PDF: ${
          err instanceof Error ? err.message : 'Error desconocido'
        }`
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-50/80 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group" aria-label="CERTIKUS - Inicio">
            <Image
              src="/logo-certikus.png"
              alt="CERTIKUS - Certeza Registral"
              width={200}
              height={60}
              priority
              className="h-12 w-auto object-contain"
            />
          </Link>
          <Link
            href="/carga"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Nuevo análisis
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Paso 3 de 3 — Reporte de Preparación Registral
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Reporte de Preparación Registral
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Expediente: <strong className="text-slate-900">{expedienteName}</strong>
          </p>
        </div>

        <div className={`rounded-2xl border-2 ${estadoColor.border} ${estadoColor.bg} p-6 sm:p-8 mb-8`}>
          <div className="flex items-start gap-5">
            <div className="p-4 rounded-2xl bg-white shadow-sm shrink-0">
              <estadoColor.icon className={`w-10 h-10 ${estadoColor.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Resultado del análisis
              </p>
              <h2 className={`text-2xl sm:text-3xl font-black ${estadoColor.text} mb-2`}>
                {estado}
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {estado === 'CORREGIR' &&
                  'Se detectaron inconsistencias críticas que debes revisar antes de radicar el expediente ante la ORIP.'}
                {estado === 'REVISAR' &&
                  'Se detectaron aspectos que recomendamos revisar antes de la radicación. No son bloqueantes, pero pueden generar notas devolutivas.'}
                {estado === 'CONSISTENTE' &&
                  'No se detectaron inconsistencias dentro de los parámetros evaluados. El expediente está en buen estado para radicación.'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200">
              <TrendingUp className="w-5 h-5 mx-auto text-blue-600 mb-1" />
              <p className="text-2xl font-black text-slate-900">{consistencia}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Consistencia</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200">
              <XCircle className="w-5 h-5 mx-auto text-red-600 mb-1" />
              <p className="text-2xl font-black text-red-700">{criticals}</p>
              <p className="text-xs text-slate-500 mt-0.5">Críticos</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200">
              <AlertTriangle className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              <p className="text-2xl font-black text-amber-700">{reviews}</p>
              <p className="text-xs text-slate-500 mt-0.5">A revisar</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200">
              <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-2xl font-black text-emerald-700">{oks}</p>
              <p className="text-xs text-slate-500 mt-0.5">Consistentes</p>
            </div>
          </div>
        </div>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Hallazgos detectados</h3>
            <span className="text-xs text-slate-500">
              {MOCK_FINDINGS.length} reglas evaluadas
            </span>
          </div>

          <div className="space-y-3">
            {MOCK_FINDINGS.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                expanded={expandedFinding === finding.id}
                onToggle={() =>
                  setExpandedFinding(expandedFinding === finding.id ? null : finding.id)
                }
              />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Checklist de preparación registral
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <ul className="space-y-3">
              {CHECKLIST.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  {item.status === 'ok' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {item.status === 'review' && (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  {item.status === 'critical' && (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  )}
                  {item.status === 'illegible' && (
                    <HelpCircle className="w-5 h-5 text-violet-600 shrink-0" />
                  )}
                  <span className="text-sm text-slate-700">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mb-8 p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-start gap-3">
          <Scale className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>Aviso:</strong> CERTIKUS no sustituye la calificación oficial de la ORIP.
            Este reporte identifica posibles inconsistencias documentales dentro de los
            parámetros evaluados y es una herramienta de preparación. La calificación registral
            es competencia exclusiva del Registrador de Instrumentos Públicos conforme a la Ley
            1579 de 2012.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white rounded-lg shadow-md transition-all flex-1 ${
              isGeneratingPDF
                ? 'bg-blue-400 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Descargar reporte PDF
              </>
            )}
          </button>
          <Link
            href="/carga"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Nuevo análisis
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Análisis completado
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Trazabilidad verificada
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            {MOCK_FINDINGS.length} hallazgos
          </span>
        </div>
      </main>
    </div>
  );
}

interface FindingCardProps {
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
}

function FindingCard({ finding, expanded, onToggle }: FindingCardProps) {
  const config = {
    critical: {
      icon: XCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800 border-red-200',
      label: 'Crítico',
    },
    review: {
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      label: 'Revisar',
    },
    ok: {
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      label: 'Consistente',
    },
    illegible: {
      icon: HelpCircle,
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      text: 'text-violet-700',
      badge: 'bg-violet-100 text-violet-800 border-violet-200',
      label: 'Ilegible / No detectado',
    },
  }[finding.severity];

  const Icon = config.icon;

  const valueClass = (value: string) => {
    const upper = value.toUpperCase();
    if (
      upper.includes('NO DETECTADO') ||
      upper.includes('ILEGIBLE') ||
      upper.includes('BAJA CONFIANZA')
    ) {
      return 'text-sm font-bold text-violet-700 italic break-words';
    }
    return 'text-sm font-mono font-bold text-slate-900 break-words';
  };

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/40 transition-colors"
      >
        <div className="p-2.5 rounded-lg bg-white shadow-sm shrink-0">
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${config.badge}`}
            >
              {config.label}
            </span>
            <span className="text-xs text-slate-500 font-mono">{finding.id}</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900">{finding.title}</h4>
          <p className="text-xs text-slate-600 mt-1">{finding.description}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-white/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <EvidenceBox doc={finding.docA} side="A" />
            <EvidenceBox doc={finding.docB} side="B" />
          </div>
          <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              ¿Por qué importa?
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{finding.why}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface EvidenceBoxProps {
  doc: { name: string; page: number; field: string; value: string };
  side: 'A' | 'B';
}

function EvidenceBox({ doc, side }: EvidenceBoxProps) {
  const valueClass = (value: string) => {
    const upper = value.toUpperCase();
    if (
      upper.includes('NO DETECTADO') ||
      upper.includes('ILEGIBLE') ||
      upper.includes('BAJA CONFIANZA')
    ) {
      return 'text-sm font-bold text-violet-700 italic break-words';
    }
    return 'text-sm font-mono font-bold text-slate-900 break-words';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
          {side}
        </span>
        <p className="text-xs font-semibold text-slate-900 truncate">{doc.name}</p>
      </div>
      <div className="space-y-2">
        {doc.page > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Página</span>
            <span className="font-mono text-slate-700">{doc.page}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Campo</span>
          <span className="font-medium text-slate-700">{doc.field}</span>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-1">Valor detectado</p>
          <p className={valueClass(doc.value)}>{doc.value}</p>
        </div>
      </div>
    </div>
  );
}