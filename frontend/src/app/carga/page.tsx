'use client';

import {
  useState,
  useCallback,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { casesApi, documentsApi } from '@/lib/api-client';

// Tipos de archivo aceptados (contexto colombiano: PDF, JPG, PNG)
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
  | 'certificado_catastral';

interface DocConfig {
  id: DocId;
  title: string;
  description: string;
  required: boolean;
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

const DOC_GROUPS: DocGroup[] = [
  {
    id: 'principales',
    title: 'Documentos principales',
    subtitle: 'Obligatorios para el análisis',
    icon: FileText,
    color: 'blue',
    collapsible: false,
    defaultOpen: true,
    docs: [
      {
        id: 'escritura',
        title: 'Escritura Pública',
        description: 'Minuta, protocolización, compraventa o hipoteca (PDF)',
        required: true,
      },
      {
        id: 'certificado',
        title: 'Certificado de Tradición y Libertad',
        description: 'Folio de matrícula inmobiliaria vigente (PDF)',
        required: true,
      },
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
      {
        id: 'cedula_vendedor',
        title: 'Cédula del Vendedor / Propietario',
        description: 'Documento de identidad del titular actual (PDF)',
        required: false,
      },
      {
        id: 'cedula_comprador',
        title: 'Cédula del Comprador / Adquirente',
        description: 'Documento de identidad de quien adquiere (PDF)',
        required: false,
      },
      {
        id: 'poder',
        title: 'Poder Notarial',
        description: 'Si alguna de las partes actúa por medio de apoderado (PDF)',
        required: false,
      },
      {
        id: 'camara_comercio',
        title: 'Certificado de Cámara de Comercio',
        description: 'Si alguna parte es persona jurídica (PDF)',
        required: false,
      },
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
      {
        id: 'paz_salvo_predial',
        title: 'Paz y Salvo de Impuesto Predial',
        description: 'Certificado de estar al día con el municipio (PDF)',
        required: false,
      },
      {
        id: 'paz_salvo_valorizacion',
        title: 'Paz y Salvo de Valorización',
        description: 'Si el inmueble tiene contribución de valorización (PDF)',
        required: false,
      },
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
      {
        id: 'certificado_catastral',
        title: 'Certificado Catastral',
        description: 'Ficha predial con cédula catastral y linderos (PDF)',
        required: false,
      },
    ],
  },
];

export default function CargaPage() {
  const router = useRouter();
  const [nombreExpediente, setNombreExpediente] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [adicionales, setAdicionales] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFile = useCallback((docId: DocId, file: File) => {
    setError('');
    setFiles((prev) => ({ ...prev, [docId]: file }));
  }, []);

  const handleRemove = useCallback((docId: DocId) => {
    setFiles((prev) => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
  }, []);

  const handleAddAdicional = useCallback((newFiles: File[]) => {
    setAdicionales((prev) => [...prev, ...newFiles]);
  }, []);

  const handleRemoveAdicional = useCallback((index: number) => {
    setAdicionales((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totalSubidos = Object.values(files).filter(Boolean).length + adicionales.length;

  const handleSubmit = async () => {
    // Validaciones locales
    if (!nombreExpediente.trim()) {
      setError('Por favor, asigna un nombre al expediente.');
      return;
    }
    if (!files.escritura) {
      setError('Debes subir la Escritura Pública.');
      return;
    }
    if (!files.certificado) {
      setError('Debes subir el Certificado de Tradición y Libertad.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    setUploadProgress('Creando expediente en el servidor...');

    try {
      // ============================================================
      // 1. Crear el caso en el backend
      // ============================================================
      const caso = await casesApi.create({
        nombre: nombreExpediente.trim(),
        tipoOperacion: 'compraventa',
      });

      console.log('[CERTIKUS] Caso creado en backend:', caso);

      // Guardar el case_id real para /procesando y /reporte
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('certikus_case_id', caso.id);
        window.sessionStorage.setItem('certikus_expediente', nombreExpediente.trim());
      }

      // ============================================================
      // 2. Subir la escritura pública
      // ============================================================
      setUploadProgress('Subiendo escritura pública...');
      await documentsApi.upload(caso.id, files.escritura, 'escritura');
      console.log('[CERTIKUS] Escritura subida correctamente');

      // ============================================================
      // 3. Subir el certificado de tradición
      // ============================================================
      setUploadProgress('Subiendo certificado de tradición y libertad...');
      await documentsApi.upload(caso.id, files.certificado, 'certificado');
      console.log('[CERTIKUS] Certificado subido correctamente');

      // ============================================================
      // 4. Subir documentos opcionales (partes, tributarios, catastrales)
      // ============================================================
      const otrosDocs: Array<[DocId, File]> = Object.entries(files)
        .filter(([k, v]) => v && k !== 'escritura' && k !== 'certificado')
        .map(([k, v]) => [k as DocId, v as File]);

      for (const [docId, file] of otrosDocs) {
        setUploadProgress(`Subiendo ${docId.replace(/_/g, ' ')}...`);
        await documentsApi.upload(caso.id, file, docId);
      }

      // ============================================================
      // 5. Subir documentos adicionales
      // ============================================================
      for (let i = 0; i < adicionales.length; i++) {
        setUploadProgress(`Subiendo documento adicional ${i + 1} de ${adicionales.length}...`);
        await documentsApi.upload(caso.id, adicionales[i], 'adicional');
      }

      console.log('[CERTIKUS] Todos los documentos subidos correctamente');
      setUploadProgress('Documentos subidos. Iniciando análisis con IA...');

      // ============================================================
      // 6. Navegar a /procesando
      // ============================================================
      setTimeout(() => {
        router.push('/procesando');
      }, 800);
    } catch (err) {
      console.error('[CERTIKUS] Error en la carga:', err);
      let message = 'Error al procesar el expediente. Intenta de nuevo.';

      if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const canSubmit =
    nombreExpediente.trim() !== '' && files.escritura && files.certificado;

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
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Paso 1 de 3 — Carga de documentos
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Nuevo análisis de expediente
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Sube los documentos de tu operación inmobiliaria. Cuantos más documentos aportes, más completo será el análisis de CERTIKUS.
          </p>
        </div>

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
          <p className="mt-2 text-xs text-slate-500">
            Usa un nombre descriptivo para identificar este análisis en tu historial.
          </p>
        </div>

        {totalSubidos > 0 && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-blue-900">
              {totalSubidos} {totalSubidos === 1 ? 'documento cargado' : 'documentos cargados'}
            </span>
            <span className="text-xs text-blue-700">
              {Object.values(files).filter(Boolean).length} de 9 campos + {adicionales.length} adicional{adicionales.length !== 1 ? 'es' : ''}
            </span>
          </div>
        )}

        <div className="space-y-4">
          {DOC_GROUPS.map((group) => (
            <DocGroupSection
              key={group.id}
              group={group}
              files={files}
              onFile={handleFile}
              onRemove={handleRemove}
            />
          ))}

          <AdicionalesSection
            files={adicionales}
            onAdd={handleAddAdicional}
            onRemove={handleRemoveAdicional}
          />
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <strong>Tus documentos están seguros.</strong> Se procesan con encriptación AES-256 y cumplen con la Ley 1581 de Protección de Datos de Colombia. No compartimos tu información con terceros.
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {uploadProgress && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
            <p className="text-sm text-blue-800 font-medium">{uploadProgress}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors order-2 sm:order-1"
          >
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
                Analizar expediente
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
  onFile: (docId: DocId, file: File) => void;
  onRemove: (docId: DocId) => void;
}

function DocGroupSection({ group, files, onFile, onRemove }: DocGroupSectionProps) {
  const [open, setOpen] = useState(group.defaultOpen);
  const Icon = group.icon;
  const subidos = group.docs.filter((d) => files[d.id]).length;

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
        className={`w-full flex items-center justify-between gap-4 p-5 text-left ${
          group.collapsible ? 'hover:bg-slate-50 transition-colors cursor-pointer' : 'cursor-default'
        }`}
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
              {subidos} {subidos === 1 ? 'subido' : 'subidos'}
            </span>
          )}
          {group.collapsible && (
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-5">
          {group.docs.map((doc) => (
            <FileSlot
              key={doc.id}
              doc={doc}
              file={files[doc.id] || null}
              onFile={(f) => onFile(doc.id, f)}
              onRemove={() => onRemove(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AdicionalesSectionProps {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}

function AdicionalesSection({ files, onAdd, onRemove }: AdicionalesSectionProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) onAdd(selected);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => MIMES_VALIDOS.includes(f.type)
    );
    if (dropped.length > 0) onAdd(dropped);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-3 rounded-xl shrink-0 bg-slate-100 text-slate-600">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900">Documentos adicionales</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Promesa, reglamento de PH, licencia de construcción u otros PDFs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {files.length > 0 && (
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
              {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
            </span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-5 space-y-3">
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_TYPES}
              multiple
              onChange={handleChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div
                className={`p-3 rounded-xl ${
                  isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isDragActive ? <Upload className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {isDragActive ? 'Suelta los archivos aquí...' : 'Agregar documentos adicionales'}
              </p>
              <p className="text-xs text-slate-500">
                Haz clic o arrastra · Múltiples PDFs · Máximo 20 MB cada uno
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label={`Eliminar ${file.name}`}
                  >
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
  onFile: (file: File) => void;
  onRemove: () => void;
}

function FileSlot({ doc, file, onFile, onRemove }: FileSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFile(selected);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && MIMES_VALIDOS.includes(dropped.type)) {
      onFile(dropped);
    }
  };

  if (file) {
    return (
      <div className="bg-emerald-50/50 rounded-xl border-2 border-emerald-200 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-0.5">
              {doc.title}
            </p>
            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label={`Eliminar ${doc.title}`}
          >
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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`rounded-xl border-2 border-dashed p-5 cursor-pointer transition-all ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_TYPES}
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-lg transition-colors shrink-0 ${
            isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
          }`}
        >
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
          {isDragActive ? (
            <span className="text-blue-600 font-semibold">Soltar</span>
          ) : (
            'Clic o arrastra'
          )}
        </p>
      </div>
    </div>
  );
}