'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Upload,
  X,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lock,
  AlertCircle,
  Users,
  Receipt,
  MapPin,
  FolderOpen,
  Plus,
  ChevronDown,
  Building2,
  ScrollText,
  Search,
} from 'lucide-react';
import { casesApi, documentsApi } from '@/lib/api-client';

const ACCEPT_TYPES = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';
const MIMES_VALIDOS = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

type DocId =
  | 'escritura'
  | 'certificado'
  | 'cedula_vendedor'
  | 'cedula_comprador'
  | 'poder'
  | 'camara_comercio'
  | 'paz_salvo_predial'
  | 'paz_salvo_valorizacion'
  | 'certificado_catastral'
  | 'uso_suelo';

type TipoAnalisis = 'orip' | 'notaria' | 'titularidad';

interface DocConfig {
  id: DocId;
  title: string;
  description: string;
  required: boolean;
  aplica?: boolean;
}

interface DocGroup {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof FileText;
  color: string;
  docs: DocConfig[];
  collapsible: boolean;
  defaultOpen: boolean;
}

interface ExistingDoc {
  id: string;
  filename: string;
  tipo: string;
}

const DOC_GROUPS_BASE: DocGroup[] = [
  {
    id: 'principales',
    title: 'Documentos principales',
    subtitle: 'Obligatorios para el análisis',
    icon: FileText,
    color: 'blue',
    collapsible: false,
    defaultOpen: true,
    docs: [
      { id: 'escritura', title: 'Escritura Pública', description: 'Minuta, protocolización, compraventa o hipoteca (PDF)', required: true },
      { id: 'certificado', title: 'Certificado de Tradición y Libertad', description: 'Folio de matrícula inmobiliaria vigente (PDF)', required: true },
    ],
  },
  {
    id: 'partes',
    title: 'Identificación de las partes',
    subtitle: 'Recomendado para validar tracto sucesivo',
    icon: Users,
    color: 'emerald',
    collapsible: true,
    defaultOpen: true,
    docs: [
      { id: 'cedula_vendedor', title: 'Cédula del Vendedor / Propietario', description: 'Documento de identidad del titular actual (PDF)', required: true },
      { id: 'cedula_comprador', title: 'Cédula del Comprador / Adquirente', description: 'Documento de identidad de quien adquiere (PDF)', required: false },
      { id: 'poder', title: 'Poder Notarial', description: 'Si alguna de las partes actúa por medio de apoderado (PDF)', required: false },
      { id: 'camara_comercio', title: 'Certificado de Cámara de Comercio', description: 'Si alguna parte es persona jurídica (PDF)', required: false },
    ],
  },
  {
    id: 'tributarios',
    title: 'Documentos tributarios',
    subtitle: 'Requisitos de radicación ante ORIP',
    icon: Receipt,
    color: 'amber',
    collapsible: true,
    defaultOpen: false,
    docs: [
      { id: 'paz_salvo_predial', title: 'Paz y Salvo de Impuesto Predial', description: 'Certificado de estar al día con el municipio (PDF)', required: false },
      { id: 'paz_salvo_valorizacion', title: 'Paz y Salvo de Valorización', description: 'Si el inmueble tiene contribución de valorización (PDF)', required: false },
    ],
  },
  {
    id: 'catastrales',
    title: 'Documentos catastrales',
    subtitle: 'Validación de área y linderos contra catastro',
    icon: MapPin,
    color: 'violet',
    collapsible: true,
    defaultOpen: false,
    docs: [
      { id: 'certificado_catastral', title: 'Certificado Catastral', description: 'Ficha predial con cédula catastral y linderos (PDF)', required: false },
      { id: 'uso_suelo', title: 'Uso de Suelo', description: 'Concepto de viabilidad del predio según POT (PDF)', required: false },
    ],
  },
];

function esDocAplicable(docId: DocId, tipo: TipoAnalisis): boolean {
  if (tipo === 'orip') return true;
  if (tipo === 'notaria') return docId !== 'uso_suelo';
  if (tipo === 'titularidad') {
    const noAplican: DocId[] = ['poder', 'camara_comercio', 'paz_salvo_predial', 'paz_salvo_valorizacion'];
    return !noAplican.includes(docId);
  }
  return true;
}

function getDocGroupsForTipo(tipo: TipoAnalisis): DocGroup[] {
  return DOC_GROUPS_BASE.map((g) => ({
    ...g,
    docs: g.docs.map((d) => ({
      ...d,
      aplica: esDocAplicable(d.id, tipo),
    })),
  }));
}

const TIPO_CONFIG: Record<TipoAnalisis, {
  label: string;
  title: string;
  subtitle: string;
  icon: typeof Building2;
  bannerBg: string;
  bannerText: string;
  bannerAccent: string;
  bannerIcon: string;
  pageBg: string;
  headerBg: string;
  borderAccent: string;
}> = {
  orip: {
    label: 'Radicar en Oficina de Registro (ORIP)',
    title: 'Análisis para radicar en la Oficina de Registro',
    subtitle: 'Requisitos de la Ley 1579 de 2012 y guía registral de la SNR.',
    icon: Building2,
    bannerBg: 'bg-blue-50',
    bannerText: 'text-blue-900',
    bannerAccent: 'text-blue-600',
    bannerIcon: 'bg-blue-100 text-blue-600',
    pageBg: 'bg-blue-50/60',
    headerBg: 'bg-blue-50/90',
    borderAccent: 'border-blue-200',
  },
  notaria: {
    label: 'Escriturar en Notaría',
    title: 'Análisis para escriturar en Notaría',
    subtitle: 'Requisitos del Decreto 960 de 1970 y Decreto 1069 de 2015.',
    icon: ScrollText,
    bannerBg: 'bg-emerald-50',
    bannerText: 'text-emerald-900',
    bannerAccent: 'text-emerald-600',
    bannerIcon: 'bg-emerald-100 text-emerald-600',
    pageBg: 'bg-emerald-50/60',
    headerBg: 'bg-emerald-50/90',
    borderAccent: 'border-emerald-200',
  },
  titularidad: {
    label: 'Estudio de títulos',
    title: 'Análisis para estudio de títulos',
    subtitle: 'Debida diligencia y viabilidad del predio (Ley 160 de 1994).',
    icon: Search,
    bannerBg: 'bg-violet-50',
    bannerText: 'text-violet-900',
    bannerAccent: 'text-violet-600',
    bannerIcon: 'bg-violet-100 text-violet-600',
    pageBg: 'bg-violet-50/60',
    headerBg: 'bg-violet-50/90',
    borderAccent: 'border-violet-200',
  },
};

export default function CargaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseIdFromUrl = searchParams.get('caseId');

  const [nombreExpediente, setNombreExpediente] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [adicionales, setAdicionales] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [tipoAnalisis, setTipoAnalisis] = useState<TipoAnalisis>('orip');

  const [caseId, setCaseId] = useState<string | null>(null);
  const [existingDocs, setExistingDocs] = useState<Record<string, ExistingDoc>>({});
  const [adicionalesExistentes, setAdicionalesExistentes] = useState<ExistingDoc[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [toDelete, setToDelete] = useState<string[]>([]);

  const docGroups = getDocGroupsForTipo(tipoAnalisis);
  const tipoConf = TIPO_CONFIG[tipoAnalisis];
  const TipoIcon = tipoConf.icon;

  useEffect(() => {
    if (!caseIdFromUrl || typeof window === 'undefined') return;

    setCaseId(caseIdFromUrl);
    setLoadingExisting(true);

    const nameStored = window.sessionStorage.getItem('certikus_expediente');
    if (nameStored) setNombreExpediente(nameStored);

    casesApi
      .get(caseIdFromUrl)
      .then((caso) => {
        if (caso && caso.nombre) setNombreExpediente(caso.nombre);
        if (caso && caso.tipoOperacion) {
          const tipo = caso.tipoOperacion as TipoAnalisis;
          if (['orip', 'notaria', 'titularidad'].includes(tipo)) {
            setTipoAnalisis(tipo);
          }
        }
      })
      .catch(() => {});

    documentsApi
      .list(caseIdFromUrl)
      .then((res) => {
        const docs: Record<string, ExistingDoc> = {};
        const adicionalesArr: ExistingDoc[] = [];
        for (const d of res.documents || []) {
          if (d.tipo === 'adicional') {
            adicionalesArr.push({ id: d.id, filename: d.filename, tipo: d.tipo });
          } else if (d.tipo) {
            docs[d.tipo] = { id: d.id, filename: d.filename, tipo: d.tipo };
          }
        }
        setExistingDocs(docs);
        setAdicionalesExistentes(adicionalesArr);
      })
      .catch(() => {
        setError('No se pudieron cargar los documentos existentes. Puedes subirlos de nuevo.');
      })
      .finally(() => setLoadingExisting(false));
  }, [caseIdFromUrl]);

  const handleFile = useCallback(
    (docId: DocId, file: File) => {
      setError('');
      const existing = existingDocs[docId];
      if (existing) {
        setToDelete((prev) => [...prev, existing.id]);
        setExistingDocs((prev) => {
          const copy = { ...prev };
          delete copy[docId];
          return copy;
        });
      }
      setFiles((prev) => ({ ...prev, [docId]: file }));
    },
    [existingDocs]
  );

  const handleRemove = useCallback((docId: DocId) => {
    setFiles((prev) => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
  }, []);

  const handleRemoveExisting = useCallback(
    (docId: DocId) => {
      const existing = existingDocs[docId];
      if (existing) {
        setToDelete((prev) => [...prev, existing.id]);
        setExistingDocs((prev) => {
          const copy = { ...prev };
          delete copy[docId];
          return copy;
        });
      }
    },
    [existingDocs]
  );

  const handleAddAdicional = useCallback((newFiles: File[]) => {
    setAdicionales((prev) => [...prev, ...newFiles]);
  }, []);

  const handleRemoveAdicional = useCallback((index: number) => {
    setAdicionales((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveAdicionalExistente = useCallback((id: string) => {
    setAdicionalesExistentes((prev) => prev.filter((a) => a.id !== id));
    setToDelete((prev) => [...prev, id]);
  }, []);

  const totalSubidos =
    Object.values(files).filter(Boolean).length +
    adicionales.length +
    Object.keys(existingDocs).length +
    adicionalesExistentes.length;

  const handleSubmit = async () => {
    if (!nombreExpediente.trim() && !caseId) {
      setError('Por favor, asigna un nombre al expediente.');
      return;
    }
    if (!files.escritura && !existingDocs.escritura) {
      setError('Debes tener la Escritura Pública (subida o existente).');
      return;
    }
    if (!files.certificado && !existingDocs.certificado) {
      setError('Debes tener el Certificado de Tradición y Libertad (subido o existente).');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      let currentCaseId = caseId;
      if (!currentCaseId) {
        setUploadProgress('Creando expediente en el servidor...');
        const caso = await casesApi.create({
          nombre: nombreExpediente.trim(),
          tipoOperacion: tipoAnalisis,
        });
        currentCaseId = caso.id;
        setCaseId(currentCaseId);
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('certikus_case_id', currentCaseId);
        window.sessionStorage.setItem('certikus_expediente', nombreExpediente.trim());
      }

      if (toDelete.length > 0) {
        setUploadProgress('Eliminando documentos reemplazados...');
        for (const docIdToDelete of toDelete) {
          try {
            await documentsApi.delete(docIdToDelete);
          } catch (delErr) {
            console.warn('[CERTIKUS] No se pudo eliminar doc:', docIdToDelete, delErr);
          }
        }
        setToDelete([]);
      }

      if (files.escritura) {
        setUploadProgress('Subiendo escritura pública...');
        await documentsApi.upload(currentCaseId, files.escritura, 'escritura');
      }

      if (files.certificado) {
        setUploadProgress('Subiendo certificado de tradición y libertad...');
        await documentsApi.upload(currentCaseId, files.certificado, 'certificado');
      }

      const otrosDocs: Array<[DocId, File]> = Object.entries(files)
        .filter(([k, v]) => v && k !== 'escritura' && k !== 'certificado')
        .map(([k, v]) => [k as DocId, v as File]);

      for (const [docId, file] of otrosDocs) {
        setUploadProgress(`Subiendo ${docId.replace(/_/g, ' ')}...`);
        await documentsApi.upload(currentCaseId, file, docId);
      }

      for (let i = 0; i < adicionales.length; i++) {
        setUploadProgress(`Subiendo documento adicional ${i + 1} de ${adicionales.length}...`);
        await documentsApi.upload(currentCaseId, adicionales[i], 'adicional');
      }

      setUploadProgress('Documentos listos. Iniciando análisis con IA...');

      setTimeout(() => {
        router.push('/procesando');
      }, 800);
    } catch (err) {
      console.error('[CERTIKUS] Error en la carga:', err);
      let message = 'Error al procesar el expediente. Intenta de nuevo.';
      if (err instanceof Error) message = err.message;
      setError(message);
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const tieneNombre = nombreExpediente.trim() !== '' || !!caseId;
  const canSubmit =
    tieneNombre &&
    (files.escritura || existingDocs.escritura) &&
    (files.certificado || existingDocs.certificado);

  return (
    <div className={`min-h-screen ${tipoConf.pageBg} text-slate-800 font-sans antialiased transition-colors duration-500`}>
      <header className={`sticky top-0 z-50 w-full backdrop-blur-md ${tipoConf.headerBg} border-b border-slate-200/80 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group" aria-label="CERTIKUS - Inicio">
            <Image src="/logo-certikus.png" alt="CERTIKUS - Certeza Registral" width={200} height={60} priority className="h-12 w-auto object-contain" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200 text-slate-700 text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            {caseId ? 'Paso 1 de 3 — Corrigiendo expediente' : 'Paso 1 de 3 — Carga de documentos'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {caseId ? 'Corrige los documentos necesarios' : tipoConf.title}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {caseId
              ? 'Los documentos ya subidos se conservan. Solo reemplaza los que necesites y vuelve a analizar.'
              : 'Sube los documentos de tu operación. Cuantos más aportes, más completo será el análisis de CERTIKUS.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-4">
          <label htmlFor="tipo-analisis" className="block text-sm font-bold text-slate-900 mb-2">
            ¿Qué vas a hacer con este expediente? <span className="text-red-500">*</span>
          </label>
          <select
            id="tipo-analisis"
            value={tipoAnalisis}
            onChange={(e) => setTipoAnalisis(e.target.value as TipoAnalisis)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
          >
            <option value="orip">Radicar en Oficina de Registro (ORIP)</option>
            <option value="notaria">Escriturar en Notaría</option>
            <option value="titularidad">Estudio de títulos</option>
          </select>
        </div>

        <div className={`rounded-2xl border ${tipoConf.borderAccent} p-5 mb-6 ${tipoConf.bannerBg}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${tipoConf.bannerIcon}`}>
              <TipoIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${tipoConf.bannerAccent}`}>
                Modo de análisis
              </p>
              <p className={`text-base font-bold ${tipoConf.bannerText}`}>
                {tipoConf.label}
              </p>
              <p className={`text-xs mt-1 ${tipoConf.bannerText} opacity-80`}>
                {tipoConf.subtitle}
              </p>
            </div>
          </div>
        </div>

        {loadingExisting && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
            <span className="text-sm font-medium text-blue-900">Cargando documentos existentes...</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
          <label htmlFor="nombre" className="block text-sm font-bold text-slate-900 mb-2">
            Nombre del expediente <span className="text-red-500">*</span>
          </label>
          <input
            id="nombre"
            type="text"
            value={nombreExpediente}
            onChange={(e) => setNombreExpediente(e.target.value)}
            placeholder="Ej: Casa Pérez — Calle 100 #15-20, Bogotá"
            disabled={isSubmitting}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </div>

        {totalSubidos > 0 && (
          <div className="mb-4 flex items-center justify-between bg-white/80 border border-slate-200 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">
              {totalSubidos} {totalSubidos === 1 ? 'documento listo' : 'documentos listos'}
            </span>
            <span className="text-xs text-slate-600">
              {Object.keys(existingDocs).length + adicionalesExistentes.length} existentes ·{' '}
              {Object.values(files).filter(Boolean).length + adicionales.length} nuevos
            </span>
          </div>
        )}

        <div className="space-y-4">
          {docGroups.map((group) => (
            <DocGroupSection
              key={group.id}
              group={group}
              files={files}
              existingDocs={existingDocs}
              onFile={handleFile}
              onRemove={handleRemove}
              onRemoveExisting={handleRemoveExisting}
            />
          ))}

          <AdicionalesSection
            files={adicionales}
            existingFiles={adicionalesExistentes}
            onAdd={handleAddAdicional}
            onRemove={handleRemoveAdicional}
            onRemoveExisting={handleRemoveAdicionalExistente}
          />
        </div>

        <div className="mt-6 p-4 bg-white/80 border border-slate-200 rounded-xl flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <strong>Tus documentos están seguros.</strong> Se procesan con encriptación AES-256 y cumplen con la Ley 1581 de Protección de Datos de Colombia.
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {uploadProgress && (
          <div className="mt-6 p-4 bg-white/80 border border-blue-200 rounded-xl flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
            <p className="text-sm text-blue-800 font-medium">{uploadProgress}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-4">
          <Link href="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors order-2 sm:order-1">
            Cancelar
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-bold rounded-lg shadow-md transition-all order-1 sm:order-2 ${
              canSubmit && !isSubmitting
                ? 'text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                : 'text-slate-400 bg-slate-200 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                {caseId ? 'Re-analizar expediente' : 'Analizar expediente'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

interface DocGroupSectionProps {
  group: DocGroup;
  files: Record<string, File | null>;
  existingDocs: Record<string, ExistingDoc>;
  onFile: (docId: DocId, file: File) => void;
  onRemove: (docId: DocId) => void;
  onRemoveExisting: (docId: DocId) => void;
}

function DocGroupSection({ group, files, existingDocs, onFile, onRemove, onRemoveExisting }: DocGroupSectionProps) {
  const [open, setOpen] = useState(group.defaultOpen);
  const Icon = group.icon;
  const subidos = group.docs.filter((d) => files[d.id] || existingDocs[d.id]).length;
  const aplicables = group.docs.filter((d) => d.aplica !== false).length;

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  };
  const colors = colorMap[group.color] || colorMap.blue;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => group.collapsible && setOpen(!open)}
        className={`w-full flex items-center justify-between gap-4 p-5 text-left ${group.collapsible ? 'hover:bg-slate-50 transition-colors cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`p-3 rounded-xl shrink-0 ${colors.bg} ${colors.text}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900">{group.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{group.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {subidos > 0 && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              {subidos} {subidos === 1 ? 'listo' : 'listos'}
            </span>
          )}
          <span className="text-xs text-slate-400">
            {aplicables} aplica{aplicables !== 1 ? 'n' : ''}
          </span>
          {group.collapsible && <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-5">
          {group.docs.map((doc) => (
            <FileSlot
              key={doc.id}
              doc={doc}
              file={files[doc.id] || null}
              existingDoc={existingDocs[doc.id] || null}
              onFile={(f) => onFile(doc.id, f)}
              onRemove={() => onRemove(doc.id)}
              onRemoveExisting={() => onRemoveExisting(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AdicionalesSectionProps {
  files: File[];
  existingFiles: ExistingDoc[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  onRemoveExisting: (id: string) => void;
}

function AdicionalesSection({ files, existingFiles, onAdd, onRemove, onRemoveExisting }: AdicionalesSectionProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleClick = () => inputRef.current?.click();
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) onAdd(selected);
    if (inputRef.current) inputRef.current.value = '';
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => MIMES_VALIDOS.includes(f.type));
    if (dropped.length > 0) onAdd(dropped);
  };

  const totalAdicionales = existingFiles.length + files.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-3 rounded-xl shrink-0 bg-slate-100 text-slate-600"><FolderOpen className="w-6 h-6" /></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900">Documentos adicionales</h2>
            <p className="text-xs text-slate-500 mt-0.5">Promesa, reglamento de PH, licencia de construcción u otros PDFs</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {totalAdicionales > 0 && (
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
              {totalAdicionales} {totalAdicionales === 1 ? 'archivo' : 'archivos'}
            </span>
          )}
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-5 space-y-3">
          <div onClick={handleClick} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
            <input ref={inputRef} type="file" accept={ACCEPT_TYPES} multiple onChange={handleChange} className="hidden" />
            <div className="flex flex-col items-center gap-2">
              <div className={`p-3 rounded-xl ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                {isDragActive ? <Upload className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              </div>
              <p className="text-sm font-semibold text-slate-900">{isDragActive ? 'Suelta los archivos aquí...' : 'Agregar documentos adicionales'}</p>
              <p className="text-xs text-slate-500">Haz clic o arrastra · Múltiples PDFs · Máximo 20 MB cada uno</p>
            </div>
          </div>

          {totalAdicionales > 0 && (
            <ul className="space-y-2">
              {existingFiles.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                  <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{doc.filename}</p>
                    <p className="text-xs text-blue-600">Ya subido · Conservado</p>
                  </div>
                  <button type="button" onClick={() => onRemoveExisting(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Eliminar ${doc.filename}`}>
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                  <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-emerald-600">{(file.size / 1024).toFixed(1)} KB · Nuevo</p>
                  </div>
                  <button type="button" onClick={() => onRemove(index)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Eliminar ${file.name}`}>
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

interface FileSlotProps {
  doc: DocConfig;
  file: File | null;
  existingDoc: ExistingDoc | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  onRemoveExisting: () => void;
}

function FileSlot({ doc, file, existingDoc, onFile, onRemove, onRemoveExisting }: FileSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleClick = () => inputRef.current?.click();
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFile(selected);
    if (inputRef.current) inputRef.current.value = '';
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && MIMES_VALIDOS.includes(dropped.type)) onFile(dropped);
  };

  const aplica = doc.aplica !== false;

  if (!aplica && !file && !existingDoc) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-100/70 p-5 opacity-70">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-lg shrink-0 bg-slate-200 text-slate-500">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-500">
              {doc.title}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              No aplica para este tipo de análisis
            </p>
          </div>
          <span className="text-xs font-bold text-white bg-slate-500 border border-slate-600 px-2.5 py-1 rounded-full shrink-0">
            N/A
          </span>
        </div>
      </div>
    );
  }

  if (file) {
    return (
      <div className="bg-emerald-50/50 rounded-xl border-2 border-emerald-200 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-0.5">{doc.title}</p>
            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · Nuevo</p>
          </div>
          <button type="button" onClick={onRemove} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Eliminar ${doc.title}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (existingDoc) {
    return (
      <div className="bg-blue-50/50 rounded-xl border-2 border-blue-200 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-0.5">{doc.title}</p>
            <p className="text-sm font-medium text-slate-900 truncate">{existingDoc.filename}</p>
            <p className="text-xs text-slate-500">Ya subido · Conservado</p>
          </div>
          <button type="button" onClick={handleClick} className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 rounded-lg transition-colors">
            Reemplazar
          </button>
          <input ref={inputRef} type="file" accept={ACCEPT_TYPES} onChange={handleChange} className="hidden" />
          <button type="button" onClick={onRemoveExisting} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Eliminar ${doc.title}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      className={`rounded-xl border-2 border-dashed p-5 cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
    >
      <input ref={inputRef} type="file" accept={ACCEPT_TYPES} onChange={handleChange} className="hidden" />
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-lg transition-colors shrink-0 ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
          {isDragActive ? <Upload className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">
            {doc.title}
            {doc.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.description}</p>
        </div>
        <p className="hidden sm:block text-xs text-slate-400 shrink-0">
          {isDragActive ? <span className="text-blue-600 font-semibold">Soltar</span> : 'Clic o arrastra'}
        </p>
      </div>
    </div>
  );
}