'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  AlertCircle,
} from 'lucide-react';
import { analysisApi, getToken, API_URL } from '@/lib/api-client';

// ============================================================================
// TIPOS
// ============================================================================
type Severity = 'critical' | 'review' | 'ok' | 'illegible';

interface FindingBackend {
  id: string;
  caseId: string;
  reglaId: string;
  severity: Severity;
  titulo: string;
  descripcion: string;
  docAId: string | null;
  docAPage: number | null;
  docAField: string | null;
  docAValue: string | null;
  docBId: string | null;
  docBPage: number | null;
  docBField: string | null;
  docBValue: string | null;
  razon: string;
  createdAt: string;
}

interface ReportBackend {
  caseId: string;
  nombre: string;
  tipoOperacion: string | null;
  estado: 'CORREGIR' | 'REVISAR' | 'CONSISTENTE' | 'PENDIENTE';
  consistencia: number | null;
  metrics: {
    criticals: number;
    reviews: number;
    oks: number;
    total: number;
  };
  documents: Array<{
    id: string;
    tipo: string;
    filename: string;
    extractionStatus: string;
    extractionConfidence: number | null;
    uploadedAt: string;
  }>;
  findings: FindingBackend[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function ReportePage() {
  const router = useRouter();
  const [report, setReport] = useState<ReportBackend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // ============================================================
  // 1. Cargar el reporte real desde el backend
  // ============================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const caseId = window.sessionStorage.getItem('certikus_case_id');

    if (!caseId) {
      setError('No se encontró un expediente. Inicia un nuevo análisis.');
      setIsLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError('');

        console.log('[CERTIKUS] Cargando reporte del backend:', caseId);
        const data = await analysisApi.getReport(caseId);
        console.log('[CERTIKUS] Reporte recibido:', data);

        setReport(data as ReportBackend);

        // Expandir el primer hallazgo crítico o el primero de la lista
        const firstCritical = (data as ReportBackend).findings.find(
          (f) => f.severity === 'critical'
        );
        const firstFinding = (data as ReportBackend).findings[0];
        setExpandedFinding(firstCritical?.id || firstFinding?.id || null);
      } catch (err) {
        console.error('[CERTIKUS] Error cargando reporte:', err);
        const message =
          err instanceof Error ? err.message : 'Error al cargar el reporte.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, []);

  // ============================================================
  // 2. Descargar PDF desde el backend
  // ============================================================
  const handleDownloadPDF = async () => {
    if (!report || !report.caseId) return;

    try {
      setIsDownloadingPDF(true);

      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/v1/cases/${report.caseId}/report/pdf`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status} al descargar el PDF`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = report.nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase();
      link.download = `certikus-reporte-${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[CERTIKUS] Error descargando PDF:', err);
      alert(
        err instanceof Error ? err.message : 'Error al descargar el PDF.'
      );
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // ============================================================
  // 3. Estados de carga / error
  // ============================================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-slate-600">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            No se pudo cargar el reporte
          </h2>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <Link
            href="/carga"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Iniciar nuevo análisis
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // 4. Preparar datos para la UI
  // ============================================================
  const estadoColor =
    report.estado === 'CORREGIR'
      ? {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: XCircle,
        }
      : report.estado === 'REVISAR'
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

  // Ordenar hallazgos por severidad
  const ordenSeveridad: Record<Severity, number> = {
    critical: 0,
    review: 1,
    illegible: 2,
    ok: 3,
  };
  const sortedFindings = [...report.findings].sort(
    (a, b) => (ordenSeveridad[a.severity] ?? 9) - (ordenSeveridad[b.severity] ?? 9)
  );

  // Checklist derivado de los findings reales
  const checklist = report.findings.map((f) => ({
    label: f.titulo,
    status: f.severity,
  }));

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
            Expediente: <strong className="text-slate-900">{report.nombre}</strong>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {report.findings.length} hallazgos detectados ·{' '}
            {report.documents.length} documentos analizados
          </p>
        </div>

        {/* TARJETA DE ESTADO */}
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
                {report.estado}
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {report.estado === 'CORREGIR' &&
                  'Se detectaron inconsistencias críticas que debes revisar antes de radicar el expediente ante la ORIP.'}
                {report.estado === 'REVISAR' &&
                  'Se detectaron aspectos que recomendamos revisar antes de la radicación. No son bloqueantes, pero pueden generar notas devolutivas.'}
                {report.estado === 'CONSISTENTE' &&
                  'No se detectaron inconsistencias dentro de los parámetros evaluados. El expediente está en buen estado para radicación.'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200">
              <TrendingUp className="w-5 h-5 mx-auto text-blue-600 mb-1" />
              <p className="text-2xl font-black text-slate-900">
                {report.consistencia ?? 0}%
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Consistencia</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200">
              <XCircle className="w-5 h-5 mx-auto text-red-600 mb-1" />
              <p className="text-2xl font-black text-red-700">{report.metrics.criticals}</p>
              <p className="text-xs text-slate-500 mt-0.5">Críticos</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200">
              <AlertTriangle className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              <p className="text-2xl font-black text-amber-700">{report.metrics.reviews}</p>
              <p className="text-xs text-slate-500 mt-0.5">A revisar</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200">
              <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-2xl font-black text-emerald-700">{report.metrics.oks}</p>
              <p className="text-xs text-slate-500 mt-0.5">Consistentes</p>
            </div>
          </div>
        </div>

        {/* HALLAZGOS */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Hallazgos detectados</h3>
            <span className="text-xs text-slate-500">
              {report.findings.length} reglas evaluadas
            </span>
          </div>

          {report.findings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-900">
                No se detectaron hallazgos
              </p>
              <p className="text-xs text-slate-500 mt-1">
                El expediente pasó todas las validaciones del motor de reglas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedFindings.map((finding) => (
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
          )}
        </section>

        {/* CHECKLIST */}
        <section className="mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Checklist de preparación registral
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <ul className="space-y-3">
              {checklist.map((item, i) => (
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

        {/* AVISO LEGAL */}
        <div className="mb-8 p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-start gap-3">
          <Scale className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>Aviso:</strong> CERTIKUS no sustituye la calificación oficial de la ORIP.
            Este reporte identifica posibles inconsistencias documentales dentro de los
            parámetros evaluados y es una herramienta de preparación. La calificación
            registral es competencia exclusiva del Registrador de Instrumentos Públicos
            conforme a la Ley 1579 de 2012.
          </p>
        </div>

        {/* ACCIONES */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white rounded-lg shadow-md transition-all flex-1 ${
              isDownloadingPDF
                ? 'bg-blue-400 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {isDownloadingPDF ? (
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
            {report.findings.length} hallazgos
          </span>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// COMPONENTE: FindingCard
// ============================================================================
interface FindingCardProps {
  finding: FindingBackend;
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

  const valueClass = (value: string | null) => {
    if (!value) return 'text-sm font-mono text-slate-400 break-words';
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
            <span className="text-xs text-slate-500 font-mono">{finding.reglaId}</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900">{finding.titulo}</h4>
          <p className="text-xs text-slate-600 mt-1">{finding.descripcion}</p>
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
            <EvidenceBox
              side="A"
              name={
                finding.docAId
                  ? `Documento A (${finding.docAField || 'Campo'})`
                  : 'Sin documento A'
              }
              page={finding.docAPage}
              field={finding.docAField}
              value={finding.docAValue}
            />
            <EvidenceBox
              side="B"
              name={
                finding.docBId
                  ? `Documento B (${finding.docBField || 'Campo'})`
                  : 'Sin documento B'
              }
              page={finding.docBPage}
              field={finding.docBField}
              value={finding.docBValue}
            />
          </div>
          <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              ¿Por qué importa?
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{finding.razon}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: EvidenceBox
// ============================================================================
interface EvidenceBoxProps {
  side: 'A' | 'B';
  name: string;
  page: number | null;
  field: string | null;
  value: string | null;
}

function EvidenceBox({ side, name, page, field, value }: EvidenceBoxProps) {
  const valueClass = (v: string | null) => {
    if (!v) return 'text-sm font-mono text-slate-400 break-words';
    const upper = v.toUpperCase();
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
        <p className="text-xs font-semibold text-slate-900 truncate">{name}</p>
      </div>
      <div className="space-y-2">
        {page !== null && page > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Página</span>
            <span className="font-mono text-slate-700">{page}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Campo</span>
          <span className="font-medium text-slate-700">{field || '—'}</span>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-1">Valor detectado</p>
          <p className={valueClass(value)}>{value || '—'}</p>
        </div>
      </div>
    </div>
  );
}