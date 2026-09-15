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
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Documento recibido y almacenado', icon: FileSearch, duration: 600 },
  { id: 2, label: 'Texto identificado con OCR', icon: ScanText, duration: 900 },
  { id: 3, label: 'Datos estructurados extraídos', icon: Database, duration: 800 },
  { id: 4, label: 'Comparando información entre documentos', icon: GitCompare, duration: 1000 },
  { id: 5, label: 'Generando Reporte de Preparación Registral', icon: FileCheck, duration: 700 },
];

export default function ProcesandoPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [expedienteName, setExpedienteName] = useState('Expediente sin nombre');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = window.sessionStorage.getItem('certikus_expediente');
      if (name) setExpedienteName(name);
    }
  }, []);

  useEffect(() => {
    if (currentStep >= STEPS.length) {
      const timer = setTimeout(() => router.push('/reporte'), 800);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), STEPS[currentStep].duration);
    return () => clearTimeout(timer);
  }, [currentStep, router]);

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
            Paso 2 de 3 — Procesando análisis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            CERTIKUS está analizando tu expediente
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            <strong className="text-slate-900">{expedienteName}</strong>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Esto puede tomar unos segundos. No cierres esta ventana.
          </p>
        </div>

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
              const isCurrent = index === currentStep;
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
                      isDone ? 'text-emerald-800' : isCurrent ? 'text-blue-900' : 'text-slate-500'
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

        {/* NOTA */}
        <div className="mt-8 p-4 bg-slate-100 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-600 leading-relaxed text-center">
            CERTIKUS está comparando los datos entre tu escritura y certificado de tradición. Al terminar, verás un reporte con los hallazgos detectados.
          </p>
        </div>
      </main>
    </div>
  );
}