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
  User,
  Building2,
  Briefcase,
  Home,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================
type UserType = 'abogado' | 'notaria' | 'inmobiliaria' | 'ciudadano';

interface FormData {
  nombre: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
  aceptaTerminos: boolean;
}

const USER_TYPES: { value: UserType; label: string; description: string; icon: typeof User }[] = [
  {
    value: 'abogado',
    label: 'Abogado',
    description: 'Prevalida expedientes de tus clientes',
    icon: Briefcase,
  },
  {
    value: 'notaria',
    label: 'Notaría',
    description: 'Controla calidad documental',
    icon: Building2,
  },
  {
    value: 'inmobiliaria',
    label: 'Inmobiliaria',
    description: 'Gestiona operaciones inmobiliarias',
    icon: Home,
  },
  {
    value: 'ciudadano',
    label: 'Ciudadano',
    description: 'Revisa tu propio trámite',
    icon: User,
  },
];

// ============================================================================
// COMPONENTE
// ============================================================================
export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'abogado',
    aceptaTerminos: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar el error de este campo al escribir
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setGlobalError('');
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'Ingresa tu nombre completo.';
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres.';
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido.';
    }

    // Contraseña
    if (!formData.password) {
      newErrors.password = 'Crea una contraseña.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Debe contener al menos una letra y un número.';
    }

    // Confirmar contraseña
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    // Términos
    if (!formData.aceptaTerminos) {
      newErrors.aceptaTerminos = 'Debes aceptar los términos y condiciones.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    if (!validate()) {
      setGlobalError('Por favor, corrige los errores del formulario.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular registro (en el backend real, aquí se llamaría a la API)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Guardar datos en sessionStorage
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('certikus_user_nombre', formData.nombre);
        window.sessionStorage.setItem('certikus_user_email', formData.email);
        window.sessionStorage.setItem('certikus_user_type', formData.userType);
        window.sessionStorage.setItem('certikus_logged_in', 'true');
      }

      // Redirigir a la pantalla de carga
      router.push('/carga');
    } catch (err) {
      console.error('Error en registro:', err);
      setGlobalError('Hubo un error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* HEADER */}
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ENCABEZADO */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Crea tu cuenta gratis
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sin tarjeta de crédito. Comienza a prevalidar tus expedientes en minutos.
          </p>
        </div>

        {/* FORMULARIO */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6"
          noValidate
        >
          {/* NOMBRE */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-bold text-slate-900 mb-2">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => updateField('nombre', e.target.value)}
                placeholder="Ej: María González Pérez"
                autoComplete="name"
                className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                  errors.nombre ? 'border-red-300 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.nombre && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.nombre}
              </p>
            )}
          </div>

          {/* EMAIL */}
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
                className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
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

          {/* CONTRASEÑA */}
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
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
            {errors.password ? (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.password}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500">
                Debe contener al menos una letra y un número.
              </p>
            )}
          </div>

          {/* CONFIRMAR CONTRASEÑA */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                  errors.confirmPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* TIPO DE USUARIO */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-3">
              ¿Cómo usarás CERTIKUS? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {USER_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.userType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => updateField('userType', type.value)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{type.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TÉRMINOS */}
          <div className="flex items-start gap-3 pt-2">
            <input
              id="terminos"
              type="checkbox"
              checked={formData.aceptaTerminos}
              onChange={(e) => updateField('aceptaTerminos', e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="terminos" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
              Acepto los{' '}
              <a href="#" className="text-blue-600 hover:underline font-semibold">
                Términos de Servicio
              </a>{' '}
              y la{' '}
              <a href="#" className="text-blue-600 hover:underline font-semibold">
                Política de Privacidad
              </a>
              . Entiendo que CERTIKUS no sustituye la calificación oficial de la ORIP.
            </label>
          </div>
          {errors.aceptaTerminos && (
            <p className="text-xs text-red-600 flex items-center gap-1 -mt-3">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.aceptaTerminos}
            </p>
          )}

          {/* ERROR GLOBAL */}
          {globalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 font-medium">{globalError}</p>
            </div>
          )}

          {/* BOTÓN DE ENVÍO */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold rounded-lg shadow-md transition-all ${
              isSubmitting
                ? 'bg-blue-400 cursor-wait text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creando tu cuenta...
              </>
            ) : (
              <>
                Crear cuenta y comenzar
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* INFO DE SEGURIDAD */}
          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cumplimos con la Ley 1581 de Protección de Datos Personales.</span>
          </div>
        </form>

        {/* LINK A LOGIN */}
        <p className="text-center text-sm text-slate-600 mt-6">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </main>
    </div>
  );
}