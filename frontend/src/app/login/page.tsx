'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { authApi, setToken } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordarme, setRecordarme] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!password) {
      newErrors.password = 'Ingresa tu contraseña.';
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setSuccess(false);

    if (!validate()) {
      setGlobalError('Por favor, corrige los errores del formulario.');
      return;
    }

    setIsSubmitting(true);

    try {
      // ============================================================
      // 1. Llamar al backend con las credenciales
      // ============================================================
      const response = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('[CERTIKUS] Login exitoso:', response.user.email);

      // ============================================================
      // 2. Guardar el JWT en localStorage
      // ============================================================
      setToken(response.token);

      // ============================================================
      // 3. Guardar datos del usuario en sessionStorage
      // ============================================================
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('certikus_logged_in', 'true');
        window.sessionStorage.setItem('certikus_user_email', response.user.email);
        window.sessionStorage.setItem('certikus_user_nombre', response.user.nombre);
        window.sessionStorage.setItem('certikus_user_id', response.user.id);
        window.sessionStorage.setItem('certikus_user_tipo', response.user.tipoUsuario);

        // Si el usuario marcó "Recordarme", guardar también el email
        if (recordarme) {
          window.localStorage.setItem('certikus_remember_email', response.user.email);
        } else {
          window.localStorage.removeItem('certikus_remember_email');
        }
      }

      setSuccess(true);

      // ============================================================
      // 4. Redirigir al historial
      // ============================================================
      setTimeout(() => {
        router.push('/historial');
      }, 700);
    } catch (err) {
      console.error('[CERTIKUS] Error en login:', err);

      let message = 'Error al iniciar sesión. Intenta de nuevo.';
      if (err instanceof Error) {
        if (
          err.message.toLowerCase().includes('credenciales') ||
          err.message.toLowerCase().includes('invalid')
        ) {
          message = 'Credenciales inválidas. Verifica tu correo y contraseña.';
        } else {
          message = err.message;
        }
      }

      setGlobalError(message);
      setIsSubmitting(false);
    }
  };

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
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Inicia sesión
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Accede a tu cuenta para gestionar tus expedientes registrales.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5"
          noValidate
        >
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
                disabled={isSubmitting}
                className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-slate-100 ${
                  errors.email ? 'border-red-300 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-bold text-slate-900">
                Contraseña
              </label>
              <a
                href="#"
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Tu contraseña"
                autoComplete="current-password"
                disabled={isSubmitting}
                className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-slate-100 ${
                  errors.password ? 'border-red-300 bg-red-50/30' : 'border-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="recordarme"
              type="checkbox"
              checked={recordarme}
              onChange={(e) => setRecordarme(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="recordarme" className="text-xs text-slate-600 cursor-pointer">
              Recordarme en este dispositivo
            </label>
          </div>

          {globalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 font-medium">{globalError}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 font-medium">
                Sesión iniciada. Redirigiendo...
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || success}
            className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold rounded-lg shadow-md transition-all ${
              success
                ? 'bg-emerald-600 text-white cursor-default'
                : isSubmitting
                  ? 'bg-blue-400 cursor-wait text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
            }`}
          >
            {success ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Acceso concedido
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              <>
                Iniciar sesión
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tu sesión está protegida con encriptación AES-256.</span>
          </div>
        </form>

        <div className="mt-6 p-4 bg-slate-100 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700">
                ¿Aún no tienes cuenta en CERTIKUS?
              </p>
              <Link
                href="/register"
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                Crear cuenta gratis →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}