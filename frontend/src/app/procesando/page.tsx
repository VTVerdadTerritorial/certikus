'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle2,
  Loader2,
  FileSearch,
  ScanText,
  Database,
  GitCompare,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { analysisApi } from '@/lib/api-client';

const STEPS = [
  { id: 1, label: 'Documento recibido y almacenado', icon: FileSearch },
  { id: 2, label: 'Texto identificado con OCR', icon: ScanText },
  { id: 3, label: 'Datos estructurados extraídos con IA', icon: Database },
  { id: 4, label: 'Comparando información entre documentos', icon: GitCompare },
  { id: 5, label: 'Generando Reporte de Preparación Registral', icon: FileCheck },
];

export default function ProcesandoPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [expedienteName, setExpedienteName] = useState('Expediente sin nombre');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState('');

  // ============================================================
  // 1. Leer datos de sessionStorage al montar
  // ============================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const name = window.sessionStorage.getItem('certikus_expediente');
    const id = window.sessionStorage.getItem('certikus_case_id');

    if (name) setExpedienteName(name);

    if (!id) {
      // No hay caso activo → volver a /carga
      setError('No se encontró un expediente activo. Inicia un nuevo análisis.');
      setTimeout(() => router.push('/carga'), 3000);
      return;
    }

    setCaseId(id);
  }, [router]);

  // ============================================================
  // 2. Animación de pasos + llamada al backend
  // ============================================================
  useEffect(() => {
    if (!caseId) return;

    let cancelled = false;

    // Animar los pasos mientras el backend procesa
    const timers: NodeJS.Timeout[] = [];

    // Paso 1: Inmediato
    timers.push(
      setTimeout(() => {
        if (!cancelled) setCurrentStep(1);
      }, 500)
    );

    // Paso 2: A los 3 segundos (OCR)
    timers.push(
      setTimeout(() => {
        if (!cancelled) setCurrentStep(2);
      }, 3000)
    );

    // Paso 3: A los 8 segundos (Extracción IA)
    timers.push(
      setTimeout(() => {
        if (!cancelled) setCurrentStep(3);
      }, 8000)
    );

    // Paso 4: A los 20 segundos (Comparación)
    timers.push(
      setTimeout(() => {
        if (!cancelled) setCurrentStep(4);
      }, 20000)
    );

    // ============================================================
    // Llamar al backend para ejecutar el análisis real
    // ============================================================
    const runAnalysis = async () => {
      try {
        setAnalysisProgress('Conectando con el servidor de análisis...');

        const startTime = Date.now();
        const result = await analysisApi.analyze(caseId);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[CERTIKUS] Análisis completado en ${elapsed}s:`, result);

        if (cancelled) return;

        setAnalysisProgress(`Análisis completado en ${elapsed}s`);

        // Marcar todos los pasos como completados
        setCurrentStep(STEPS.length);

        // Navegar a /reporte
        setTimeout(() => {
          if (!cancelled) router.push('/reporte');
        }, 1000);
      } catch (err) {
        if (cancelled) return;

        console.error('[CERTIKUS] Error en análisis:', err);
        const message =
          err instanceof Error
            ? err.message
            : 'Error al analizar el expediente. Intenta de nuevo.';

        setError(message);
        setAnalysisProgress('');
      }
    };

    runAnalysis();

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, [caseId, router]);

  // ============================================================
  // Calcular progreso (0-100%)
  // ============================================================
  const progress = Math.min((currentStep / STEPS.length) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-50/80 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
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
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* ENCABEZADO */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Paso 2 de 3 — Analizando expediente
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            CERTIKUS está analizando tu expediente
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            <strong className="text-slate-900">{expedienteName}</strong>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Este análisis puede tardar entre 15 y 40 segundos. No cierres esta ventana.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">Error en el análisis</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Link
                href="/carga"
                className="text-xs font-semibold text-red-800 underline mt-2 inline-block"
              >
                Volver a intentar
              </Link>
            </div>
          </div>
        )}

        {/* BARRA DE PROGRESO */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">Progreso</span>
            <span className="text-xs font-bold text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* LISTA DE PASOS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <ul className="space-y-4">
            {STEPS.map((step, index) => {
              const isDone = index < currentStep;
              const isCurrent = index === currentStep && !error;
              const Icon = step.icon;

              return (
                <li
                  key={step.id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-500 ${
                    isDone
                      ? 'bg-emerald-50/60'
                      : isCurrent
                        ? 'bg-blue-50 border border-blue-100'
                        : 'bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-600'
                        : isCurrent
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <p
                    className={`flex-1 text-sm font-medium ${
                      isDone
                        ? 'text-emerald-800'
                        : isCurrent
                          ? 'text-blue-900'
                          : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </p>

                  <div className="shrink-0">
                    {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {isCurrent && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* PROGRESO DETALLADO */}
        {analysisProgress && !error && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
            <p className="text-xs text-blue-800 font-medium">{analysisProgress}</p>
          </div>
        )}

        {/* NOTA */}
        <div className="mt-8 p-4 bg-slate-100 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-600 leading-relaxed text-center">
            CERTIKUS está comparando los datos entre tu escritura y certificado de tradición.
            Al terminar, verás un reporte con los hallazgos detectados.
          </p>
        </div>
      </main>
    </div>
  );
}