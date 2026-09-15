import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, 
  Play, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Zap, 
  Lock, 
  Building2, 
  Users, 
  Scale, 
  Search, 
  FileCheck, 
  ChevronDown, 
  HelpCircle,
  FileSpreadsheet,
  AlertCircle,
  BarChart3
} from 'lucide-react';

// ============================================================================
// METADATA (SEO & OpenGraph - Next.js 15+ Metadata API)
// ============================================================================
export const metadata: Metadata = {
  title: 'CERTIKUS | Prevalidación Documental Registral e Inmobiliaria en Colombia',
  description: 'Prevalida escrituras públicas y certificados de tradición antes de radicar en la ORIP. Detecta inconsistencias con OCR e IA. Cumple Ley 1579 de 2012.',
  keywords: [
    'prevalidación documentos registrales',
    'revisar escritura pública antes de radicar',
    'certificado de tradición y libertad',
    'ORIP Colombia',
    'calificación registral',
    'nota devolutiva',
    'cómo evitar devolución ORIP',
    'software prevalidación inmobiliaria',
    'LegalTech Colombia',
    'PropTech Colombia'
  ],
  authors: [{ name: 'CERTIKUS LegalTech' }],
  creator: 'CERTIKUS',
  publisher: 'CERTIKUS',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://certikus.com',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://certikus.com',
    title: 'CERTIKUS | Prevalidación Documental Registral para la ORIP',
    description: 'Encuentra las inconsistencias en tu expediente registral antes de que las detecte la ORIP. Disminuye notas devolutivas con IA.',
    siteName: 'CERTIKUS',
    images: [
      {
        url: 'https://certikus.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Plataforma CERTIKUS - Prevalidación registral de escrituras públicas en Colombia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CERTIKUS | Prevalidación Documental Registral Colombia',
    description: 'Software de prevalidación inmobiliaria y registral. Evita notas devolutivas en la ORIP.',
    images: ['https://certikus.com/og-image.jpg'],
  },
};

// ============================================================================
// DATOS ESTRUCTURADOS JSON-LD (SEO Técnico + GEO para Motores Generativos)
// ============================================================================

// GEO/SEO 1: Organization Schema
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CERTIKUS',
  legalName: 'CERTIKUS LegalTech S.A.S.',
  description: 'Plataforma SaaS colombiana de prevalidación documental registral e inmobiliaria con IA.',
  url: 'https://certikus.com',
  logo: 'https://certikus.com/logo.png',
  areaServed: {
    '@type': 'Country',
    name: 'Colombia',
    identifier: 'CO',
  },
  knowsLanguage: 'es-CO',
  sameAs: [
    'https://www.linkedin.com/company/certikus',
    'https://twitter.com/certikus_co',
  ],
};

// GEO/SEO 2: SoftwareApplication Schema
const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CERTIKUS',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'Motor de prevalidación de expedientes registrales que cruza datos de escrituras públicas y certificados de tradición para evitar notas devolutivas en la ORIP.',
  offers: {
    '@type': 'Offer',
    price: '19900',
    priceCurrency: 'COP',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '127',
    bestRating: '5',
    worstRating: '1',
  },
};

// GEO/SEO 3: FAQPage Schema
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Qué es la prevalidación registral?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'La prevalidación registral es el análisis preventivo automatizado de escrituras públicas, certificados de tradición y libertad y anexos legales antes de su radicación formal en las Oficinas de Registro de Instrumentos Públicos (ORIP) de Colombia. Su objetivo es detectar discrepancias de área, linderos, nombres, cédulas o actos jurídicos para prevenir notas devolutivas.',
      },
    },
    {
      '@type': 'Question',
      name: '¿CERTIKUS reemplaza la calificación de la ORIP?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Conforme a la Ley 1579 de 2012 (Estatuto Registral de Colombia), la función calificadora es competencia exclusiva del Registrador de Instrumentos Públicos. CERTIKUS es una herramienta tecnológica de preparación y diagnóstico preventivo para estructurar expedientes sin errores técnicos.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué documentos necesito para usar CERTIKUS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Para realizar la prevalidación completa requieres la copia digital en formato PDF de la Escritura Pública, el Certificado de Tradición y Libertad reciente (no mayor a 30 días) y los documentos de identidad (Cédula de Ciudadanía o NIT) de los otorgantes.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Es seguro subir mis documentos a CERTIKUS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. CERTIKUS utiliza encriptación de nivel bancario AES-256 en tránsito y reposo. Todos los trámites procesados cumplen estrictamente con la Ley 1581 de 2012 de Protección de Datos Personales en Colombia y garantizan confidencialidad absoluta.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cuánto tiempo tarda un análisis?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'El motor de reglas de CERTIKUS procesa, extrae mediante OCR y analiza la información de un expediente estándar en menos de 5 minutos, entregando de inmediato el Reporte de Preparación Registral.',
      },
    },
    {
      '@type': 'Question',
      name: '¿CERTIKUS funciona para cualquier notaría de Colombia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. El motor de Inteligencia Artificial y reglas determinísticas de CERTIKUS está entrenado para procesar escrituras públicas, minutas y actos notariales emitidos por cualquiera de las más de 900 notarías y 195 ORIP en todo el territorio colombiano.',
      },
    },
  ],
};

// ============================================================================
// COMPONENTE PRINCIPAL (Landing Page)
// ============================================================================
export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* JSON-LD Scripts */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* 1. HEADER                                                          */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-50/80 border-b border-slate-200/80 transition-all">
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

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600" aria-label="Navegación principal">
            <a href="#como-funciona" className="hover:text-blue-600 transition-colors">Cómo funciona</a>
            <a href="#beneficios" className="hover:text-blue-600 transition-colors">Beneficios</a>
            <a href="#que-analiza" className="hover:text-blue-600 transition-colors">Qué analiza</a>
            <a href="#precios" className="hover:text-blue-600 transition-colors">Precios</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">Preguntas frecuentes</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors hidden sm:inline-block"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Comenzar gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------------ */}
        {/* 2. HERO SECTION                                                    */}
        {/* ------------------------------------------------------------------ */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden" aria-labelledby="hero-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs sm:text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  Plataforma de Prevalidación Registral en Colombia
                </div>

                <h1 
                  id="hero-heading" 
                  className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight"
                >
                  Detecta inconsistencias en tu expediente registral <span className="text-blue-600 underline decoration-blue-200 underline-offset-4">antes de radicarlo</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                  CERTIKUS es una plataforma SaaS que prevalida escrituras públicas y certificados de tradición y libertad mediante OCR e Inteligencia Artificial, identificando errores críticos y generando un Reporte de Preparación Registral en menos de 5 minutos.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <Link
                    href="/carga"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all text-center"
                  >
                    Analizar expediente gratis
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a
                    href="#como-funciona"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-blue-600 rounded-lg shadow-sm transition-all text-center"
                  >
                    <Play className="w-4 h-4 fill-slate-700" />
                    Ver cómo funciona
                  </a>
                </div>

                <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sin tarjeta de crédito
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-600" /> Cumple Ley 1579 de 2012
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-slate-700" /> Datos encriptados AES-256
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none rounded-2xl bg-gradient-to-b from-blue-900 to-slate-900 p-1 shadow-2xl">
                  <div className="bg-slate-900 rounded-xl p-5 sm:p-6 space-y-4 text-white">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-xs text-slate-400 font-mono ml-2">Expediente_50N-2026.pdf</span>
                      </div>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                        Análisis Completado
                      </span>
                    </div>

                    <div className="bg-slate-800/80 rounded-lg p-4 space-y-3 border border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Matrícula Inmobiliaria</p>
                            <p className="text-sm font-bold text-white font-mono">50N-20493821</p>
                          </div>
                        </div>
                        <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2 py-1 rounded">
                          100% Coincidencia
                        </span>
                      </div>

                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1">
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Alerta detectada: Diferencia de Linderos</span>
                        </div>
                        <p className="text-xs text-slate-300 pl-6">
                          Escritura indica "Norte 12.50m" vs Certificado indica "Norte 12.05m".
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-700">
                          <p className="text-xs text-slate-400">Reglas</p>
                          <p className="text-sm font-bold text-white">42/42</p>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-700">
                          <p className="text-xs text-slate-400">Hallazgos</p>
                          <p className="text-sm font-bold text-amber-400">1 Crítico</p>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-700">
                          <p className="text-xs text-slate-400">Tiempo</p>
                          <p className="text-sm font-bold text-emerald-400">2.4 min</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Trazabilidad verificada
                      </span>
                      <span>ORIP Bogotá / Notaría 45</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* BLOQUE GEO: EN RESUMEN */}
        <section className="bg-slate-100 py-8 border-y border-slate-200" aria-label="Resumen ejecutivo del servicio">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-3">
                En resumen: ¿Qué es CERTIKUS?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm text-slate-700">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-900">1. Prevalidación preventiva</p>
                  <p className="mt-1 text-slate-600">Revisa expedientes legales e inmobiliarios antes de entregarlos a la ORIP en Colombia.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-900">2. Cruce de datos con IA</p>
                  <p className="mt-1 text-slate-600">Compara escrituras, certificados de tradición y documentos de identidad de forma automática.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-900">3. Reducción de devolución</p>
                  <p className="mt-1 text-slate-600">Reduce hasta un 70% las notas devolutivas y reprocesos en la calificación registral.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-900">4. Marco legal vigente</p>
                  <p className="mt-1 text-slate-600">Funciona en estricto apego a la Ley 1579 de 2012 y Ley 1581 de protección de datos.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SECCIÓN CÓMO FUNCIONA */}
        <section id="como-funciona" className="py-20 bg-white" aria-labelledby="funcionalidad-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Flujo de Trabajo Simplificado</p>
              <h2 id="funcionalidad-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                ¿Cómo funciona CERTIKUS en 3 pasos?
              </h2>
              <p className="text-slate-600 text-base">
                CERTIKUS optimiza la revisión de documentos inmobiliarios mediante tres etapas automatizadas que garantizan máxima precisión antes de la radicación.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <article className="bg-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-blue-600 text-white font-bold text-xl rounded-xl flex items-center justify-center mb-6 shadow-md">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    1. Carga tus documentos
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Sube la escritura pública, el certificado de tradición y libertad y los documentos de identidad en formato PDF a la plataforma segura.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" /> Archivos PDF, OCR automático
                </div>
              </article>

              <article className="bg-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-blue-600 text-white font-bold text-xl rounded-xl flex items-center justify-center mb-6 shadow-md">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    2. Validación automática con IA
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Nuestro motor de reglas cruzadas analiza los datos entre documentos y detecta inconsistencias como diferencias de matrícula, área, linderos o titulares.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-blue-600" /> +40 reglas determinísticas
                </div>
              </article>

              <article className="bg-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-blue-600 text-white font-bold text-xl rounded-xl flex items-center justify-center mb-6 shadow-md">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    3. Recibe tu Reporte de Preparación Registral
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Obtén un informe descargable con hallazgos clasificados por severidad (crítico, advertencia, informativo), evidencias trazables y checklist de radicación.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" /> Reporte exportable en PDF
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* 4. SECCIÓN BENEFICIOS */}
        <section id="beneficios" className="py-20 bg-slate-50 border-t border-slate-200/80" aria-labelledby="beneficios-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Valor para el Sector</p>
              <h2 id="beneficios-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Diseñado para profesionales del sector inmobiliario colombiano
              </h2>
              <p className="text-slate-600 text-base">
                CERTIKUS entrega eficiencia, seguridad y velocidad a los actores clave del ecosistema legal e inmobiliario en Colombia.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
              <article className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start gap-5">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Reduce devoluciones y notas devolutivas
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Detecta errores antes de que la ORIP los encuentre y evita re-radicaciones costosas. Disminuye significativamente los tiempos muertos en los procesos de inscripción.
                  </p>
                </div>
              </article>

              <article className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start gap-5">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <Clock className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Ahorra tiempo en revisión manual
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Automatiza la revisión documental que hoy toma horas de trabajo profesional. Permite cotejos exhaustivos entre folios de matrícula y minutas notariales en minutos.
                  </p>
                </div>
              </article>

              <article className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start gap-5">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <Search className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Trazabilidad total de cada hallazgo
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Cada alerta incluye documento, página, campo, dato detectado y dato comparado, permitiendo subsanaciones quirúrgicas en la minuta antes del otorgamiento.
                  </p>
                </div>
              </article>

              <article className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start gap-5">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Seguridad jurídica y confidencialidad
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Tus documentos se procesan con encriptación AES-256 y cumplen con la Ley 1581 de protección de datos y la Ley 1579 de 2012 Por la cual se expide el estatuto de registro de instrumentos públicos y se dictan otras disposiciones.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* 5. SECCIÓN QUÉ ANALIZA CERTIKUS */}
        <section id="que-analiza" className="py-20 bg-white" aria-labelledby="analisis-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Alcance Técnico</p>
              <h2 id="analisis-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Documentos y validaciones soportadas
              </h2>
              <p className="text-slate-600 text-base">
                Motor con soporte multidocumento especializado en las exigencias formales de la Superintendencia de Notariado y Registro.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-900">Documentos soportados</h3>
                </div>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong>Escrituras públicas:</strong> Minutas, protocolizaciones, compraventas e hipotecas.</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong>Certificados de Tradición y Libertad:</strong> Folios individuales y matrices.</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong>Documentos de identidad:</strong> Cédulas de ciudadanía, Cédulas de extranjería y NIT.</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong>Poderes e Instrumentos:</strong> Poderes generales, especiales y representación legal.</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong>Anexos Tributarios:</strong> Impuesto predial y paz y salvos de valorización.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-900">Validaciones automáticas</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Coincidencia de Matrícula
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Coincidencia de Área en m²
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Consistencia de Linderos
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Nombres de Titulares
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Validación de Cédulas y NIT
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Naturaleza del Acto Jurídico
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Título Antecedente Registrado
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Vigencia del Certificado
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. SECCIÓN PRECIOS */}
        <section id="precios" className="py-20 bg-slate-50 border-t border-slate-200" aria-labelledby="precios-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Planes Accesibles</p>
              <h2 id="precios-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Planes adaptados a tus necesidades registrales
              </h2>
              <p className="text-slate-600 text-base">
                Comienza sin costo y escala según el volumen de escrituras y expedientes procesados al mes.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Prueba Gratuita</h3>
                  <p className="text-xs text-slate-500 mt-1">Para probar la plataforma</p>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-slate-900">$0</span>
                    <span className="text-xs text-slate-500"> / mes</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-600">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1 Expediente completo gratis</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Reporte de preparación básico</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Soporte por email</li>
                  </ul>
                </div>
                <Link href="/register" className="w-full py-2.5 px-4 text-center text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  Probar gratis ahora
                </Link>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-8 border-2 border-blue-600 shadow-xl space-y-6 flex flex-col justify-between relative transform lg:-translate-y-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Más Popular
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Profesional</h3>
                  <p className="text-xs text-slate-400 mt-1">Para abogados e inmobiliarias</p>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-white">$19.900</span>
                    <span className="text-xs text-slate-400"> COP / expediente</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Prevalidación de escrituras e linderos</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Reporte PDF con hallazgos y evidencias</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Trazabilidad de inconsistencias</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Soporte prioritario</li>
                  </ul>
                </div>
                <Link href="/register?plan=pro" className="w-full py-2.5 px-4 text-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors">
                  Empezar Plan Pro
                </Link>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Notaría / Corporativo</h3>
                  <p className="text-xs text-slate-500 mt-1">Para alto volumen mensual</p>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-slate-900">Personalizado</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-600">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Integración vía API directa</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Reglas de validación a la medida</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> SLA garantizado y Gestor asignado</li>
                  </ul>
                </div>
                <a href="mailto:contacto@certikus.com" className="w-full py-2.5 px-4 text-center text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                  Contactar a Ventas
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 7. PREGUNTAS FRECUENTES */}
        <section id="faq" className="py-20 bg-white" aria-labelledby="faq-heading">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4 mb-16">
              <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Respuestas Directas</p>
              <h2 id="faq-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Preguntas frecuentes sobre prevalidación registral
              </h2>
              <p className="text-slate-600 text-base">
                Aclara tus dudas sobre el alcance tecnológico y legal de CERTIKUS en Colombia.
              </p>
            </div>

            <div className="space-y-6">
              <article className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  ¿Qué es la prevalidación registral?
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed pl-7">
                  La prevalidación registral es el análisis preventivo automatizado de escrituras públicas, certificados de tradición y libertad y anexos legales antes de su radicación formal en las Oficinas de Registro de Instrumentos Públicos (ORIP) de Colombia. Su objetivo es detectar discrepancias de área, linderos, nombres, cédulas o actos jurídicos para prevenir notas devolutivas.
                </p>
              </article>

              <article className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  ¿CERTIKUS reemplaza la calificación de la ORIP?
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed pl-7">
                  No. Conforme a la Ley 1579 de 2012 (Estatuto Registral de Colombia), la función calificadora es competencia exclusiva del Registrador de Instrumentos Públicos. CERTIKUS es una herramienta tecnológica de preparación y diagnóstico preventivo para estructurar expedientes sin errores técnicos.
                </p>
              </article>

              <article className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  ¿Qué documentos necesito para usar CERTIKUS?
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed pl-7">
                  Para realizar la prevalidación completa requieres la copia digital en formato PDF de la Escritura Pública, el Certificado de Tradición y Libertad reciente (no mayor a 30 días) y los documentos de identidad (Cédula de Ciudadanía o NIT) de los otorgantes.
                </p>
              </article>

              <article className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  ¿Es seguro subir mis documentos a CERTIKUS?
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed pl-7">
                  Sí. CERTIKUS utiliza encriptación de nivel bancario AES-256 en tránsito y reposo. Todos los trámites procesados cumplen estrictamente con la Ley 1581 de 2012 de Protección de Datos Personales en Colombia y garantizan confidencialidad absoluta.
                </p>
              </article>

              <article className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  ¿Cuánto tiempo tarda un análisis?
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed pl-7">
                  El motor de reglas de CERTIKUS procesa, extrae mediante OCR y analiza la información de un expediente estándar en menos de 5 minutos, entregando de inmediato el Reporte de Preparación Registral.
                </p>
              </article>

              <article className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  ¿CERTIKUS funciona para cualquier notaría de Colombia?
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed pl-7">
                  Sí. El motor de Inteligencia Artificial y reglas determinísticas de CERTIKUS está entrenado para procesar escrituras públicas, minutas y actos notariales emitidos por cualquiera de las más de 900 notarías y 195 ORIP en todo el territorio colombiano.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* 8. CTA FINAL */}
        <section className="py-16 bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 text-white" aria-label="Llamado a la acción final">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              ¿Listo para preparar tu próximo expediente registral?
            </h2>
            <p className="text-blue-100 text-base sm:text-lg max-w-2xl mx-auto">
              Comienza gratis hoy. No requiere tarjeta de crédito. Obtén tu primer Reporte de Preparación Registral en menos de 5 minutos.
            </p>
            <div className="pt-4">
              <Link
                href="/carga"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-blue-900 bg-white hover:bg-slate-100 rounded-xl shadow-lg transition-all"
              >
                Analizar expediente ahora
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 9. FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs sm:text-sm pt-16 pb-12 border-t border-slate-800" aria-label="Pie de página">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/isotipo-certikus.png"
                  alt="CERTIKUS Isotipo"
                  width={40}
                  height={40}
                  className="h-10 w-auto object-contain bg-white rounded-lg p-1"
                />
                <span className="text-xl font-black text-white tracking-tight">
                  CERTIKUS<span className="text-blue-500">.</span>
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                Plataforma SaaS colombiana de prevalidación documental registral para abogados, notarías e inmobiliarias. Encuentra las inconsistencias en tu expediente antes de radicar en la ORIP.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-white font-semibold text-xs uppercase tracking-wider">Producto</p>
              <ul className="space-y-2 text-xs">
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a></li>
                <li><a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a></li>
                <li><a href="#que-analiza" className="hover:text-white transition-colors">Validaciones</a></li>
                <li><a href="#precios" className="hover:text-white transition-colors">Precios</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-white font-semibold text-xs uppercase tracking-wider">Recursos</p>
              <ul className="space-y-2 text-xs">
                <li><a href="#faq" className="hover:text-white transition-colors">Preguntas frecuentes</a></li>
                <li><a href="https://certikus.com/blog" className="hover:text-white transition-colors">Blog LegalTech</a></li>
                <li><a href="https://certikus.com/guias/orip" className="hover:text-white transition-colors">Guía Evitar Devolución ORIP</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-white font-semibold text-xs uppercase tracking-wider">Legal</p>
              <ul className="space-y-2 text-xs">
                <li><a href="https://certikus.com/privacidad" className="hover:text-white transition-colors">Política de Privacidad</a></li>
                <li><a href="https://certikus.com/terminos" className="hover:text-white transition-colors">Términos de Servicio</a></li>
                <li><a href="https://certikus.com/habeas-data" className="hover:text-white transition-colors">Habeas Data (Ley 1581)</a></li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs leading-relaxed">
            <p className="font-bold text-slate-300 mb-1">AVISO LEGAL IMPORTANTE:</p>
            <p>
              CERTIKUS no sustituye la calificación oficial de las Oficinas de Registro de Instrumentos Públicos (ORIP). Es una herramienta tecnológica de preparación y prevalidación documental. La calificación registral es competencia exclusiva del Registrador de Instrumentos Públicos conforme a la Ley 1579 de 2012 de la República de Colombia. CERTIKUS no garantiza la inscripción registral de ningún documento.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
            <p>© 2026 CERTIKUS LegalTech S.A.S. Todos los derechos reservados.</p>
            <p>Hecho con precisión jurídica en Colombia 🇨🇴</p>
          </div>
        </div>
      </footer>
    </div>
  );
}