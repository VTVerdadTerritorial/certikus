'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  LogOut,
  User,
  History,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface ExpedienteGuardado {
  id: string;
  nombre: string;
  fecha: string;
  estado: 'CORREGIR' | 'REVISAR' | 'CONSISTENTE';
  consistencia: number;
  criticals: number;
  reviews: number;
  oks: number;
  totalHallazgos: number;
}

const STORAGE_KEY = 'certikus_expedientes';

export default function HistorialPage() {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState<ExpedienteGuardado[]>([]);
  const [userName, setUserName] = useState('Usuario');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loggedIn = window.sessionStorage.getItem('certikus_logged_in');
    if (loggedIn !== 'true') {
      router.push('/login');
      return;
    }

    const name = window.sessionStorage.getItem('certikus_user_nombre') || 'Usuario';
    setUserName(name);

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ExpedienteGuardado[];
        setExpedientes(parsed);
      }
    } catch (err) {
      console.error('Error cargando expedientes:', err);
    }

    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem('certikus_logged_in');
    window.sessionStorage.removeItem('certikus_user_email');
    window.sessionStorage.removeItem('certikus_user_nombre');
    router.push('/');
  };

  const handleDelete = (id: string) => {
    const updated = expedientes.filter((e) => e.id !== id);
    setExpedientes(updated);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    setConfirmDelete(null);
  };

  const estadoStyle = (estado: string) => {
    if (estado === 'CORREGIR') {
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle };
    }
    if (estado === 'REVISAR') {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        icon: AlertTriangle,
      };
    }
    return {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      icon: CheckCircle2,
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">Cargando tu historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-50/80 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="CERTIKUS - Inicio">
            <Image
              src="/logo-certikus.png"
              alt="CERTIKUS - Certeza Registral"
              width={180}
              height={54}
              priority
              className="h-11 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">
                {userName}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-medium mb-3">
                <History className="w-3.5 h-3.5" />
                Historial de expedientes
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Hola, {userName}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {expedientes.length === 0
                  ? 'Aún no has realizado ningún análisis.'
                  : `${expedientes.length} ${expedientes.length === 1 ? 'expediente' : 'expedientes'} analizado${expedientes.length === 1 ? '' : 's'}.`}
              </p>
            </div>
            <Link
              href="/carga"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all shrink-0"
            >
              <Plus className="w-5 h-5" />
              Nuevo análisis
            </Link>
          </div>
        </div>

        {expedientes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900">{expedientes.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Corregir
                </span>
              </div>
              <p className="text-2xl font-black text-red-700">
                {expedientes.filter((e) => e.estado === 'CORREGIR').length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Revisar
                </span>
              </div>
              <p className="text-2xl font-black text-amber-700">
                {expedientes.filter((e) => e.estado === 'REVISAR').length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Consistente
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-700">
                {expedientes.filter((e) => e.estado === 'CONSISTENTE').length}
              </p>
            </div>
          </div>
        )}

        {expedientes.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 sm:p-16 text-center">
            <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-2xl mb-5">
              <FileText className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Tu historial está vacío
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              Cuando analices tu primer expediente, aparecerá aquí con toda su
              trazabilidad y podrás acceder al reporte cuando quieras.
            </p>
            <Link
              href="/carga"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Analizar mi primer expediente
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {expedientes.map((exp) => {
              const style = estadoStyle(exp.estado);
              const Icon = style.icon;
              return (
                <article
                  key={exp.id}
                  className={`bg-white rounded-2xl border ${style.border} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className={`p-3 rounded-xl ${style.bg} shrink-0`}>
                      <Icon className={`w-6 h-6 ${style.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {exp.estado}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {exp.id.slice(-8)}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {exp.nombre}
                      </h3>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(exp.fecha).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {exp.consistencia}% consistencia
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {exp.totalHallazgos} hallazgos
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/reporte?id=${exp.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Ver reporte"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(exp.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Datos almacenados localmente en tu navegador
          </span>
        </div>
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-red-50 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">¿Eliminar expediente?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Esta acción no se puede deshacer. El análisis se eliminará de tu historial
                  local.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}