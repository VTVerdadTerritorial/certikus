"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Loader2,
  FileSearch,
  ScanText,
  Database,
  GitCompare,
  FileCheck,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  FileWarning,
  FolderX,
  WifiOff,
} from "lucide-react";
import { analysisApi, ApiError } from "@/lib/api-client";

const STEPS = [
  { id: 1, label: "Documento recibido y almacenado", icon: FileSearch },
  { id: 2, label: "Texto identificado con OCR", icon: ScanText },
  { id: 3, label: "Datos estructurados extraidos con IA", icon: Database },
  { id: 4, label: "Comparando informacion entre documentos", icon: GitCompare },
  { id: 5, label: "Generando Reporte de Preparacion Registral", icon: FileCheck },
];

interface ErrorInfo {
  title: string;
  message: string;
  icon: typeof AlertCircle;
  color: "red" | "amber" | "slate";
  canRetry: boolean;
  actionLabel?: string;
  actionHref?: string;
}

function buildErrorInfo(err: unknown): ErrorInfo {
  if (err instanceof ApiError) {
    if (err.code === "DOCUMENT_ILLEGIBLE") {
      return {
        title: "Un documento no es legible",
        message: err.message,
        icon: FileWarning,
        color: "red",
        canRetry: false,
        actionLabel: "Subir documentos mas nitidos",
        actionHref: "/carga",
      };
    }
    if (err.code === "DOCUMENT_WRONG_SLOT") {
      return {
        title: "Documento en el sitio incorrecto",
        message: err.message,
        icon: FolderX,
        color: "amber",
        canRetry: false,
        actionLabel: "Corregir ubicacion de documentos",
        actionHref: "/carga",
      };
    }
    if (err.code === "TIMEOUT") {
      return {
        title: "El analisis tardo demasiado",
        message:
          "El servidor sigue procesando. Puedes reintentar sin volver a subir los documentos.",
        icon: AlertCircle,
        color: "amber",
        canRetry: true,
      };
    }
    if (err.isNetworkError) {
      return {
        title: "Sin conexion con el servidor",
        message: err.message,
        icon: WifiOff,
        color: "red",
        canRetry: true,
      };
    }
    return {
      title: "Error en el analisis",
      message: err.message,
      icon: AlertCircle,
      color: "red",
      canRetry: true,
    };
  }
  return {
    title: "Error inesperado",
    message: err instanceof Error ? err.message : "Intenta de nuevo en unos segundos.",
    icon: AlertCircle,
    color: "red",
    canRetry: true,
  };
}

export default function ProcesandoPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [expedienteName, setExpedienteName] = useState("Expediente sin nombre");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // ============================================================
  // 1. Leer datos de sessionStorage al montar
  // ============================================================
  useEffect(() => {
    if (typeof window === "undefined") return;
    const name = window.sessionStorage.getItem("certikus_expediente");
    const id = window.sessionStorage.getItem("certikus_case_id");
    if (name) setExpedienteName(name);
    if (!id) {
      setErrorInfo({
        title: "No hay expediente activo",
        message: "Inicia un nuevo analisis desde la pantalla de carga.",
        icon: AlertCircle,
        color: "slate",
        canRetry: false,
        actionLabel: "Volver a la carga",
        actionHref: "/carga",
      });
      return;
    }
    setCaseId(id);
  }, []);

  // ============================================================
  // 2. Contador de tiempo transcurrido
  // ============================================================
  useEffect(() => {
    if (!caseId || errorInfo) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [caseId, errorInfo]);

  // ============================================================
  // 3. Logica de analisis
  // ============================================================
  const runAnalysis = useCallback(
    async (isRetry: boolean) => {
      if (!caseId) return;

      setErrorInfo(null);
      setRetrying(isRetry);
      setAnalysisProgress(
        isRetry ? "Reintentando analisis..." : "Conectando con el servidor de analisis..."
      );
      setCurrentStep(0);
      setElapsed(0);

      try {
        const result = await analysisApi.analyze(caseId);
        console.log("[CERTIKUS] Analisis completado:", result);
        setAnalysisProgress("Analisis completado. Redirigiendo al reporte...");
        setCurrentStep(STEPS.length);

        setTimeout(() => {
          router.push("/reporte");
        }, 800);
      } catch (err) {
        console.error("[CERTIKUS] Error en analisis:", err);
        setErrorInfo(buildErrorInfo(err));
        setAnalysisProgress("");
      } finally {
        setRetrying(false);
      }
    },
    [caseId, router]
  );

  // ============================================================
  // 4. Animacion de pasos + llamada inicial al backend
  // ============================================================
  useEffect(() => {
    if (!caseId || errorInfo) return;

    let cancelled = false;
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => !cancelled && setCurrentStep(1), 500));
    timers.push(setTimeout(() => !cancelled && setCurrentStep(2), 3000));
    timers.push(setTimeout(() => !cancelled && setCurrentStep(3), 10000));
    timers.push(setTimeout(() => !cancelled && setCurrentStep(4), 25000));

    runAnalysis(false);

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, [caseId, runAnalysis, errorInfo]);

  const progress = errorInfo
    ? 0
    : Math.min((currentStep / STEPS.length) * 100, 100);

  const colorClasses = {
    red: {
      container: "bg-red-50 border-red-200",
      icon: "text-red-600",
      title: "text-red-900",
      message: "text-red-800",
    },
    amber: {
      container: "bg-amber-50 border-amber-200",
      icon: "text-amber-600",
      title: "text-amber-900",
      message: "text-amber-800",
    },
    slate: {
      container: "bg-slate-50 border-slate-200",
      icon: "text-slate-600",
      title: "text-slate-900",
      message: "text-slate-800",
    },
  };

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
            Paso 2 de 3 - Analizando expediente
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {errorInfo ? "No pudimos completar el analisis" : "CERTIKUS esta analizando tu expediente"}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            <strong className="text-slate-900">{expedienteName}</strong>
          </p>
          {!errorInfo && (
            <p className="mt-1 text-xs text-slate-500">
              El analisis puede tardar entre 30 segundos y 3 minutos dependiendo del numero
              de documentos. No cierres esta ventana.
              {elapsed > 0 && (
                <span className="ml-1 font-semibold text-slate-700">
                  ({elapsed}s transcurridos)
                </span>
              )}
            </p>
          )}
        </div>

        {/* ERROR ESPECIFICO */}
        {errorInfo && (
          <div
            className={`mb-8 p-5 border rounded-xl flex items-start gap-4 ${colorClasses[errorInfo.color].container}`}
          >
            <errorInfo.icon
              className={`w-6 h-6 shrink-0 mt-0.5 ${colorClasses[errorInfo.color].icon}`}
            />
            <div className="flex-1">
              <p className={`text-sm font-bold ${colorClasses[errorInfo.color].title}`}>
                {errorInfo.title}
              </p>
              <p className={`text-sm mt-1 ${colorClasses[errorInfo.color].message}`}>
                {errorInfo.message}
              </p>

              <div className="flex flex-wrap gap-3 mt-4">
                {errorInfo.canRetry && (
                  <button
                    type="button"
                    onClick={() => runAnalysis(true)}
                    disabled={retrying}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {retrying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Reintentando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reintentar analisis
                      </>
                    )}
                  </button>
                )}

                {errorInfo.actionHref && (
                  <Link
                    href={errorInfo.actionHref === "/carga" && caseId ? `/carga?caseId=${caseId}` : errorInfo.actionHref}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {errorInfo.actionLabel || "Volver"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BARRA DE PROGRESO (solo si no hay error) */}
        {!errorInfo && (
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
        )}

        {/* LISTA DE PASOS (solo si no hay error) */}
        {!errorInfo && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <ul className="space-y-4">
              {STEPS.map((step, index) => {
                const isDone = index < currentStep;
                const isCurrent = index === currentStep;
                const Icon = step.icon;
                return (
                  <li
                    key={step.id}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-500 ${
                      isDone
                        ? "bg-emerald-50/60"
                        : isCurrent
                          ? "bg-blue-50 border border-blue-100"
                          : "bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                        isDone
                          ? "bg-emerald-100 text-emerald-600"
                          : isCurrent
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p
                      className={`flex-1 text-sm font-medium ${
                        isDone
                          ? "text-emerald-800"
                          : isCurrent
                            ? "text-blue-900"
                            : "text-slate-500"
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
        )}

        {/* PROGRESO DETALLADO */}
        {analysisProgress && !errorInfo && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
            <p className="text-xs text-blue-800 font-medium">{analysisProgress}</p>
          </div>
        )}

        {/* NOTA */}
        {!errorInfo && (
          <div className="mt-8 p-4 bg-slate-100 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-600 leading-relaxed text-center">
              CERTIKUS esta comparando los datos entre tu escritura y certificado de
              tradicion. Al terminar, veras un reporte con los hallazgos detectados.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
