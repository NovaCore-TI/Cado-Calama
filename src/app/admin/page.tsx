'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Hand,
  HeartHandshake,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageCircle,
  PauseCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useCado, type Appointment, type BlogPost } from '@/context/CadoContext';

type Section = 'resumen' | 'orientaciones' | 'disponibilidad' | 'derivaciones' | 'contenidos' | 'integraciones';

const navigation = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'orientaciones', label: 'Orientaciones', icon: Users },
  { id: 'disponibilidad', label: 'Disponibilidad', icon: CalendarDays },
  { id: 'derivaciones', label: 'Derivaciones', icon: ArrowRight },
  { id: 'contenidos', label: 'Contenidos Blog', icon: FileText },
  { id: 'integraciones', label: 'Integraciones', icon: Video },
] as const;

const sectionTitles: Record<Section, { eyebrow: string; title: string; description: string }> = {
  resumen: {
    eyebrow: 'Vista General',
    title: 'Panel Clínico · Dr. Javier Beiza',
    description: 'Resumen consolidado de orientaciones telemáticas, estado de agenda y sincronización con Supabase.',
  },
  orientaciones: {
    eyebrow: 'Atención Inicial',
    title: 'Bandeja de Orientaciones Virtuales',
    description: 'Revisa las fichas de los pacientes con sus respuestas al cuestionario sensible y pactos de confort ambiental.',
  },
  disponibilidad: {
    eyebrow: 'Agenda Virtual',
    title: 'Configuración de Horarios en Calama',
    description: 'Gestiona los bloques vespertinos de 15 minutos disponibles para teleorientación y bloquea fechas específicas.',
  },
  derivaciones: {
    eyebrow: 'Seguimiento Presencial',
    title: 'Derivaciones a Dentalink',
    description: 'Control de pacientes orientados telemáticamente que avanzan hacia su consulta presencial en Edificio Espacio Parque.',
  },
  contenidos: {
    eyebrow: 'Educación sin Miedo',
    title: 'Gestor de Contenidos del Blog',
    description: 'Redacta, edita y publica artículos orientados a resolver dudas sobre fobia dental, bruxismo y postoperatorio.',
  },
  integraciones: {
    eyebrow: 'Infraestructura',
    title: 'Estado de Integraciones Backend',
    description: 'Monitoreo en tiempo real de Supabase PostgreSQL, generación de salas Google Meet y microservicios API.',
  },
};

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof CalendarDays;
}) {
  return (
    <div className="rounded-3xl border border-[#E2E7E7] bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-[#766C75]">{label}</span>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <strong className="mt-4 block font-title text-4xl font-semibold text-[#513D49]">
        {value}
      </strong>
      <span className="mt-1 block text-xs leading-relaxed text-[#766C75]">{detail}</span>
    </div>
  );
}

export default function AdminPage() {
  const {
    supabaseStatus,
    refreshSupabaseData,
    appointments,
    addAppointment,
    updateAppointmentStatus,
    updateDerivationStatus,
    availableSlots,
    toggleSlotAvailability,
    blockedDates,
    addBlockedDate,
    removeBlockedDate,
    blogPosts,
    addBlogPost,
    updateBlogPost,
    deleteBlogPost,
    isDoctorLoggedIn,
    loginDoctor,
    logoutDoctor,
  } = useCado();

  const [section, setSection] = useState<Section>('resumen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros de orientaciones
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(null);

  // Disponibilidad
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const [newSlotDate, setNewSlotDate] = useState(today);
  const [newSlot, setNewSlot] = useState('18:00');
  const [newBlockedDate, setNewBlockedDate] = useState('');

  // Blog CMS
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState<BlogPost['category']>('Cuidados');
  const [postExcerpt, setPostExcerpt] = useState('');
  const [postContent, setPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);

  // Modal ESC handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (openAppointmentId) setOpenAppointmentId(null);
        if (previewPost) setPreviewPost(null);
      }
    }
    if (openAppointmentId || previewPost) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [openAppointmentId, previewPost]);

  const scheduled = appointments.filter((a) => a.status === 'Programada').length;
  const completed = appointments.filter((a) => a.status === 'Realizada').length;
  const derived = appointments.filter((a) =>
    a.derivationStatus ? a.derivationStatus === 'Derivada a Dentalink' : a.status === 'Derivada a Dentalink'
  );

  const filteredAppointments = appointments.filter((appointment) => {
    const term = query.toLowerCase().trim();
    const matchesQuery =
      !term ||
      appointment.patientName.toLowerCase().includes(term) ||
      appointment.id.toLowerCase().includes(term) ||
      appointment.email.toLowerCase().includes(term) ||
      appointment.phone.includes(term);
    const matchesStatus = statusFilter === 'todas' || appointment.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = loginDoctor(email, password);
    if (!ok) {
      setLoginError('Credenciales incorrectas. Para ingresar usa el acceso de demostración provisto.');
    } else {
      setLoginError('');
    }
  }

  function handleFillDemoCredentials() {
    setEmail('demo@cado.local');
    setPassword('DEMO');
  }

  async function handleRefreshBackend() {
    setIsRefreshing(true);
    await refreshSupabaseData();
    setIsRefreshing(false);
  }

  function handleSavePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;
    const excerpt = postExcerpt.trim() || `${postContent.trim().slice(0, 140)}…`;
    if (editingPostId) {
      updateBlogPost(editingPostId, {
        title: postTitle.trim(),
        category: postCategory,
        excerpt,
        content: postContent.trim(),
      });
    } else {
      addBlogPost({
        title: postTitle.trim(),
        slug: postTitle
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        category: postCategory,
        excerpt,
        content: postContent.trim(),
        author: 'Dr. Javier Beiza Ayala',
        readTime: `${Math.max(2, Math.ceil(postContent.trim().split(/\s+/).length / 180))} min de lectura`,
        published: false,
      });
    }
    setEditingPostId(null);
    setPostTitle('');
    setPostExcerpt('');
    setPostContent('');
  }

  function editPost(post: BlogPost) {
    setEditingPostId(post.id);
    setPostTitle(post.title);
    setPostCategory(post.category);
    setPostExcerpt(post.excerpt);
    setPostContent(post.content);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }

  function handleGenerateCalamaEveningSlots() {
    if (!newSlotDate) return;
    const standardTimes = ['18:00', '18:15', '18:30', '19:30'];
    standardTimes.forEach((t) => {
      const slotKey = `${newSlotDate}|${t}`;
      if (!availableSlots.includes(slotKey)) {
        toggleSlotAvailability(slotKey);
      }
    });
  }

  // =========================================================================
  // PANTALLA DE ACCESO CLÍNICO (LOGIN)
  // =========================================================================
  if (!isDoctorLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8F8] px-6 py-14 text-[#513D49]">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_24px_80px_rgba(81,61,73,.12)] lg:grid-cols-2">
          {/* LADO IZQUIERDO: MARCA */}
          <div className="relative flex flex-col justify-between overflow-hidden border-b border-[#E2E7E7] bg-[#F6F8F8] p-8 sm:p-12 lg:border-b-0 lg:border-r">
            <div
              className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[#A14B92]/15 blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative space-y-6">
              <Image
                src="/brand/image2.png"
                alt="CADO Odontología"
                width={180}
                height={65}
                className="h-12 w-auto object-contain"
                priority
              />
              <span className="inline-flex rounded-full border border-[#B3BFBF] bg-white px-3.5 py-1 text-xs font-semibold text-[#A14B92]">
                Portal Clínico Privado
              </span>
              <h1 className="font-title text-4xl font-semibold leading-tight sm:text-5xl text-balance">
                Gestión cercana, ética y personalizada.
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-[#665D66]">
                Espacio de trabajo del <strong>Dr. Javier Beiza Ayala</strong> para revisar el cuestionario previo y las preferencias de confort de cada paciente antes de la orientación virtual.
              </p>
            </div>

            <div className="relative mt-12 rounded-2xl border border-[#E2E7E7] bg-white p-4 text-xs leading-relaxed text-[#665D66]">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" aria-hidden="true" />
                <span>
                  Protección de datos bajo la Ley N° 19.628 y N° 20.584. Sincronizado de extremo a extremo con Supabase PostgreSQL.
                </span>
              </div>
            </div>
          </div>

          {/* LADO DERECHO: FORMULARIO */}
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A3D7D] hover:underline"
            >
              ← Volver al sitio público
            </Link>

            <span className="section-eyebrow">Acceso del Profesional</span>
            <h2 className="mt-2 font-title text-3xl font-semibold text-[#513D49]">
              Ingresar a la Intranet
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#766C75]">
              Ingresa tus credenciales profesionales para gestionar orientaciones y contenidos.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <label className="block text-xs font-semibold text-[#513D49]">
                Usuario / Correo clínico
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 text-sm outline-none focus:border-[#A14B92]"
                  placeholder="demo@cado.local"
                />
              </label>

              <label className="block text-xs font-semibold text-[#513D49]">
                Contraseña
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 pr-11 text-sm outline-none focus:border-[#A14B92]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3.5 top-3.5 text-[#766C75] hover:text-[#513D49]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {loginError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                >
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="btn-cado-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold shadow-md active:scale-98"
              >
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                <span>Entrar al panel de gestión</span>
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-[#E2E7E7] bg-[#F6F8F8] p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#513D49]">Acceso de prueba:</span>
                <button
                  type="button"
                  onClick={handleFillDemoCredentials}
                  className="text-xs font-bold text-[#A14B92] hover:underline"
                >
                  Rellenar automáticamente
                </button>
              </div>
              <p className="text-[#766C75]">
                Usuario: <code className="font-mono text-[#513D49]">demo@cado.local</code> · Clave:{' '}
                <code className="font-mono text-[#513D49]">DEMO</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PANEL ADMINISTRATIVO PRINCIPAL (AUTENTICADO)
  // =========================================================================
  const title = sectionTitles[section];

  return (
    <div className="min-h-screen bg-[#F6F8F8] text-[#513D49] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* SIDEBAR DE NAVEGACIÓN */}
      <aside className="border-b border-[#E2E7E7] bg-white px-6 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4">
          <Image
            src="/brand/image2.png"
            alt="CADO Odontología"
            width={140}
            height={48}
            className="h-10 w-auto object-contain"
          />
          <span className="rounded-full border border-[#B3BFBF] bg-[#F6F8F8] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#A14B92]">
            Intranet
          </span>
        </div>

        <div className="mt-8 hidden border-t border-[#E2E7E7] pt-6 lg:block">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#A14B92]">
            Espacio Clínico
          </p>
          <h2 className="mt-1 font-title text-xl font-semibold text-[#513D49]">
            Dr. Javier Beiza Ayala
          </h2>
          <p className="text-xs text-[#766C75]">CADO Odontología · Calama</p>
        </div>

        {/* MENÚ DE SECCIONES */}
        <nav
          aria-label="Secciones del panel clínico"
          className="-mx-2 mt-6 flex gap-1.5 overflow-x-auto pb-2 lg:mt-8 lg:flex-col lg:overflow-visible"
        >
          {navigation.map(({ id, label, icon: Icon }) => {
            const isCurrent = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                aria-current={isCurrent ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-xs font-semibold transition lg:w-full ${
                  isCurrent
                    ? 'bg-[#A14B92] text-white shadow-sm'
                    : 'text-[#665D66] hover:bg-[#F6F8F8] hover:text-[#513D49]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
                {id === 'orientaciones' && scheduled > 0 && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isCurrent ? 'bg-white text-[#A14B92]' : 'bg-[#A14B92]/10 text-[#A14B92]'
                    }`}
                  >
                    {scheduled}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* PIE DE SIDEBAR */}
        <div className="mt-auto hidden border-t border-[#E2E7E7] pt-5 lg:block space-y-3">
          <div className="flex items-center gap-2 text-xs text-[#766C75]">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                supabaseStatus.connected ? 'bg-[#10B981] animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="truncate">
              {supabaseStatus.connected ? `Supabase (${supabaseStatus.latencyMs}ms)` : 'Modo local'}
            </span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#8A3D7D] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ver sitio público</span>
          </Link>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <div className="min-w-0">
        {/* TOP BAR */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E7E7] bg-white/90 px-6 py-4 backdrop-blur-md sm:px-9">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A14B92]">
              CADO · {title.eyebrow}
            </span>
            <p className="text-sm font-semibold text-[#513D49]">Portal de Gestión Clínica</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshBackend}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#B3BFBF] bg-white px-3 py-1.5 text-xs font-semibold text-[#513D49] hover:bg-[#F6F8F8] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#A14B92] ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Sincronizar Supabase</span>
            </button>

            <button
              type="button"
              onClick={logoutDoctor}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </header>

        {/* CUERPO PRINCIPAL SEGÚN SECCIÓN */}
        <main className="mx-auto max-w-7xl space-y-8 px-6 py-8 sm:px-9 sm:py-10">
          <div>
            <span className="section-eyebrow">{title.eyebrow}</span>
            <h1 className="mt-2 font-title text-3xl font-semibold text-[#513D49] sm:text-4xl">
              {title.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#766C75]">
              {title.description}
            </p>
          </div>

          {/* =============================================================== */}
          {/* SECCIÓN 1: RESUMEN GENERAL                                      */}
          {/* =============================================================== */}
          {section === 'resumen' && (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Orientaciones programadas"
                  value={scheduled}
                  detail="Pendientes de realizar"
                  icon={CalendarDays}
                />
                <StatCard
                  label="Orientaciones realizadas"
                  value={completed}
                  detail="Historial acumulado"
                  icon={CheckCircle2}
                />
                <StatCard
                  label="Derivadas a Dentalink"
                  value={derived.length}
                  detail="Continuidad presencial"
                  icon={ArrowRight}
                />
                <StatCard
                  label="Bloques virtuales"
                  value={availableSlots.length}
                  detail="Horarios configurados"
                  icon={Clock3}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                {/* PRÓXIMAS ORIENTACIONES */}
                <section className="clay-card rounded-3xl p-6 sm:p-7 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                        Próximas orientaciones
                      </h2>
                      <p className="text-xs text-[#766C75]">
                        Pacientes con sesión telemática agendada
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('orientaciones')}
                      className="text-xs font-bold text-[#A14B92] hover:underline"
                    >
                      Ver todas ({appointments.length}) →
                    </button>
                  </div>

                  {scheduled === 0 ? (
                    <div className="rounded-2xl bg-[#F6F8F8] p-8 text-center space-y-2">
                      <CalendarDays className="mx-auto h-8 w-8 text-[#B3BFBF]" />
                      <p className="text-sm font-semibold text-[#513D49]">
                        No hay orientaciones pendientes
                      </p>
                      <p className="text-xs text-[#766C75]">
                        Las nuevas reservas aparecerán aquí automáticamente.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointments
                        .filter((a) => a.status === 'Programada')
                        .slice(0, 4)
                        .map((a) => (
                          <div
                            key={a.id}
                            onClick={() => {
                              setSection('orientaciones');
                              setOpenAppointmentId(a.id);
                            }}
                            className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#E2E7E7] bg-white p-4 transition hover:border-[#A14B92] hover:bg-[#F6F8F8]"
                          >
                            <div className="space-y-0.5">
                              <strong className="block text-sm font-semibold text-[#513D49]">
                                {a.patientName}
                              </strong>
                              <p className="text-xs text-[#766C75]">
                                {a.date} · {a.time} hrs ·{' '}
                                <span className="font-medium text-[#A14B92]">
                                  {a.comfortProfile.soundPreference === 'silencio'
                                    ? 'Silencio'
                                    : 'Música suave'}
                                </span>
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-[#A14B92]" />
                          </div>
                        ))}
                    </div>
                  )}
                </section>

                {/* ESTADO DEL BACKEND */}
                <section className="clay-card rounded-3xl p-6 sm:p-7 space-y-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
                    <Zap className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                    Backend & Supabase
                  </h2>
                  <p className="text-xs leading-relaxed text-[#665D66]">
                    {supabaseStatus.message}
                  </p>
                  <div className="rounded-2xl border border-[#E2E7E7] bg-[#F6F8F8] p-3 text-xs space-y-1">
                    <p className="font-semibold text-[#513D49]">
                      Estado:{' '}
                      <span className="text-[#10B981]">
                        {supabaseStatus.connected ? 'Conectado a la nube' : 'Modo local activo'}
                      </span>
                    </p>
                    <p className="text-[#766C75]">
                      Tablas clínicas: {supabaseStatus.tablesReady ? 'Listas y verificadas' : 'Pendientes'}
                    </p>
                  </div>
                  <Link
                    href="/api/health"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A3D7D] hover:underline"
                  >
                    <span>Ver estado JSON (/api/health)</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </section>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SECCIÓN 2: ORIENTACIONES Y FICHAS DE PACIENTES                  */}
          {/* =============================================================== */}
          {section === 'orientaciones' && (
            <div className="space-y-6">
              {/* FILTROS Y BÚSQUEDA */}
              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[260px] flex-1">
                  <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#766C75]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre, código de cita o correo..."
                    className="w-full rounded-2xl border border-[#B3BFBF] bg-white py-3 pl-11 pr-4 text-xs sm:text-sm outline-none focus:border-[#A14B92]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filtrar por estado clínico"
                  className="rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 text-xs font-semibold text-[#513D49] outline-none"
                >
                  <option value="todas">Todos los estados</option>
                  <option value="Programada">Programadas</option>
                  <option value="Realizada">Realizadas</option>
                  <option value="Cancelada">Canceladas</option>
                  <option value="No asistió">No asistió</option>
                </select>
              </div>

              {/* LISTA DE CITAS */}
              {filteredAppointments.length === 0 ? (
                <div className="rounded-3xl border border-[#E2E7E7] bg-white p-12 text-center space-y-3">
                  <Users className="mx-auto h-10 w-10 text-[#B3BFBF]" />
                  <h3 className="font-title text-2xl font-semibold text-[#513D49]">
                    No se encontraron orientaciones
                  </h3>
                  <p className="text-xs text-[#766C75]">
                    Prueba cambiando el filtro de búsqueda o el estado.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAppointments.map((app) => (
                    <article
                      key={app.id}
                      className="clay-card rounded-3xl p-6 transition hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-bold text-[#A14B92]">
                            {app.id}
                          </span>
                          <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                            {app.patientName}
                          </h2>
                          <p className="text-xs text-[#766C75]">
                            {app.date} a las {app.time} hrs · {app.email} · {app.phone}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              app.status === 'Programada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'Realizada'
                                ? 'bg-purple-100 text-[#A14B92]'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {app.status}
                          </span>

                          <button
                            type="button"
                            onClick={() => setOpenAppointmentId(app.id)}
                            className="btn-cado-primary rounded-xl px-4 py-2 text-xs font-semibold shadow-sm"
                          >
                            Ver Ficha Clínica y Confort
                          </button>
                        </div>
                      </div>

                      {/* ACCIONES RÁPIDAS DE LA CITA */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E7E7] pt-4">
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`tel:${app.phone}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#F6F8F8]"
                          >
                            <Phone className="h-3.5 w-3.5 text-[#A14B92]" />
                            <span>Llamar</span>
                          </a>

                          {app.meetLink && (
                            <a
                              href={app.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs font-semibold text-[#A14B92] hover:bg-[#F8EFF6]"
                            >
                              <Video className="h-3.5 w-3.5" />
                              <span>Google Meet</span>
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <label className="text-xs font-semibold text-[#766C75]">
                            Estado:
                            <select
                              value={app.status}
                              onChange={(e) =>
                                updateAppointmentStatus(app.id, e.target.value as Appointment['status'])
                              }
                              className="ml-2 rounded-xl border border-[#B3BFBF] bg-white px-3 py-1.5 text-xs font-semibold text-[#513D49]"
                            >
                              <option value="Programada">Programada</option>
                              <option value="Realizada">Realizada</option>
                              <option value="No asistió">No asistió</option>
                              <option value="Cancelada">Cancelada</option>
                            </select>
                          </label>

                          <label className="text-xs font-semibold text-[#766C75]">
                            Derivación:
                            <select
                              value={app.derivationStatus ?? 'Sin derivación'}
                              onChange={(e) =>
                                updateDerivationStatus(
                                  app.id,
                                  e.target.value as NonNullable<Appointment['derivationStatus']>
                                )
                              }
                              className="ml-2 rounded-xl border border-[#B3BFBF] bg-white px-3 py-1.5 text-xs font-semibold text-[#513D49]"
                            >
                              <option value="Sin derivación">Sin derivación</option>
                              <option value="Pendiente presencial">Pendiente presencial</option>
                              <option value="Derivada a Dentalink">Derivada a Dentalink</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* SECCIÓN 3: DISPONIBILIDAD HORARIA                               */}
          {/* =============================================================== */}
          {section === 'disponibilidad' && (
            <div className="space-y-8">
              <div className="rounded-3xl border border-[#A14B92]/30 bg-[#F8EFF6] p-6 text-xs text-[#513D49] space-y-2">
                <strong className="block text-sm text-[#A14B92]">
                  Configuración de Horarios Vespertinos de Calama:
                </strong>
                <p>
                  Por defecto, la orientación virtual se organiza en bloques de 15 minutos entre 18:00 y 19:45 hrs. Puedes habilitar bloques individuales o generarlos en bloque para la fecha que elijas.
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {/* BLOQUES HABILITADOS */}
                <section className="clay-card rounded-3xl p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-[#A14B92]" />
                    <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                      Habilitar bloques por fecha
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <input
                      type="date"
                      min={today}
                      value={newSlotDate}
                      onChange={(e) => setNewSlotDate(e.target.value)}
                      className="rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="time"
                      value={newSlot}
                      onChange={(e) => setNewSlot(e.target.value)}
                      className="rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSlot && newSlotDate) {
                          toggleSlotAvailability(`${newSlotDate}|${newSlot}`);
                        }
                      }}
                      className="btn-cado-primary inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Agregar bloque</span>
                    </button>
                  </div>

                  {/* GENERADOR EN 1 CLIC */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleGenerateCalamaEveningSlots}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#A14B92] bg-[#F8EFF6] px-4 py-2.5 text-xs font-semibold text-[#A14B92] hover:bg-[#A14B92] hover:text-white transition"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Generar 4 bloques vespertinos (18:00 a 19:30) para esta fecha</span>
                    </button>
                  </div>

                  <div className="border-t border-[#E2E7E7] pt-4 space-y-2">
                    <span className="block text-xs font-semibold text-[#766C75]">
                      Bloques actualmente disponibles ({availableSlots.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.length === 0 ? (
                        <p className="text-xs text-[#766C75]">No hay bloques configurados.</p>
                      ) : (
                        availableSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => toggleSlotAvailability(slot)}
                            className="rounded-xl border border-[#B3BFBF] bg-white px-3 py-1.5 text-xs font-semibold text-[#513D49] hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition"
                          >
                            {slot.replace('|', ' a las ')} hrs ×
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                {/* FECHAS BLOQUEADAS */}
                <section className="clay-card rounded-3xl p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-[#A14B92]" />
                    <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                      Fechas bloqueadas (Feriados / Cirugías)
                    </h2>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="date"
                      min={today}
                      value={newBlockedDate}
                      onChange={(e) => setNewBlockedDate(e.target.value)}
                      className="flex-1 rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newBlockedDate) {
                          addBlockedDate(newBlockedDate);
                          setNewBlockedDate('');
                        }
                      }}
                      className="btn-cado-secondary rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Bloquear día
                    </button>
                  </div>

                  <div className="border-t border-[#E2E7E7] pt-4 space-y-2">
                    <span className="block text-xs font-semibold text-[#766C75]">
                      Días bloqueados ({blockedDates.length}):
                    </span>
                    <div className="space-y-2">
                      {blockedDates.length === 0 ? (
                        <p className="text-xs text-[#766C75]">No hay fechas bloqueadas.</p>
                      ) : (
                        blockedDates.map((date) => (
                          <div
                            key={date}
                            className="flex items-center justify-between rounded-xl bg-[#F6F8F8] p-3 text-xs"
                          >
                            <span className="font-semibold text-[#513D49]">{date}</span>
                            <button
                              type="button"
                              onClick={() => removeBlockedDate(date)}
                              className="font-bold text-red-700 hover:underline"
                            >
                              Desbloquear
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SECCIÓN 4: DERIVACIONES A DENTALINK                             */}
          {/* =============================================================== */}
          {section === 'derivaciones' && (
            <section className="clay-card rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                    Seguimiento hacia consulta presencial
                  </h2>
                  <p className="mt-1 text-xs text-[#766C75]">
                    Pacientes orientados virtualmente que cuentan con derivación hacia la agenda Dentalink o presencial en Vivar #1580, Calama.
                  </p>
                </div>
                <a
                  href="https://dentalink.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-cado-secondary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  <span>Portal Dentalink</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {derived.length === 0 ? (
                <div className="rounded-2xl bg-[#F6F8F8] p-10 text-center space-y-2">
                  <ArrowRight className="mx-auto h-8 w-8 text-[#B3BFBF]" />
                  <p className="text-sm font-semibold text-[#513D49]">
                    Aún no hay derivaciones marcadas
                  </p>
                  <p className="text-xs text-[#766C75]">
                    Puedes derivar pacientes desde la sección de Orientaciones al finalizar la sesión virtual.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {derived.map((app) => (
                    <div
                      key={app.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2E7E7] bg-white p-4"
                    >
                      <div>
                        <strong className="block text-sm font-semibold text-[#513D49]">
                          {app.patientName}
                        </strong>
                        <p className="text-xs text-[#766C75]">
                          Cita {app.id} · Sesión {app.date} {app.time} hrs · {app.phone}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-[#A14B92]">
                        ✓ Derivada a Dentalink
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* =============================================================== */}
          {/* SECCIÓN 5: GESTOR DE CONTENIDOS DEL BLOG                        */}
          {/* =============================================================== */}
          {section === 'contenidos' && (
            <div className="grid gap-8 xl:grid-cols-[1.3fr_1fr]">
              {/* FORMULARIO EDITAR / CREAR */}
              <form
                onSubmit={handleSavePost}
                className="clay-card rounded-3xl p-6 sm:p-8 space-y-5"
              >
                <div>
                  <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                    {editingPostId ? 'Editar artículo' : 'Redactar nuevo artículo'}
                  </h2>
                  <p className="text-xs text-[#766C75]">
                    Los artículos guardados se sincronizan con Supabase (`articulos_blog`).
                  </p>
                </div>

                <label className="block text-xs font-semibold text-[#513D49]">
                  Título del artículo
                  <input
                    type="text"
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Ej: Cómo prepararse para una consulta sin dolor en Calama"
                    className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white p-3 text-sm outline-none focus:border-[#A14B92]"
                  />
                </label>

                <label className="block text-xs font-semibold text-[#513D49]">
                  Categoría
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value as BlogPost['category'])}
                    className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white p-3 text-sm font-semibold text-[#513D49] outline-none"
                  >
                    <option value="Miedo Dental">Miedo Dental</option>
                    <option value="Cuidados">Cuidados</option>
                    <option value="Bruxismo">Bruxismo</option>
                    <option value="Urgencias">Urgencias</option>
                  </select>
                </label>

                <label className="block text-xs font-semibold text-[#513D49]">
                  Resumen breve (Excerpt)
                  <textarea
                    rows={2}
                    value={postExcerpt}
                    onChange={(e) => setPostExcerpt(e.target.value)}
                    placeholder="Breve descripción que se mostrará en la tarjeta del blog..."
                    className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white p-3 text-xs outline-none focus:border-[#A14B92]"
                  />
                </label>

                <label className="block text-xs font-semibold text-[#513D49]">
                  Cuerpo del artículo (Texto completo)
                  <textarea
                    rows={8}
                    required
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Escribe aquí las indicaciones y explicaciones con lenguaje claro y respetuoso..."
                    className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white p-3 text-sm leading-relaxed outline-none focus:border-[#A14B92]"
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  {editingPostId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPostId(null);
                        setPostTitle('');
                        setPostExcerpt('');
                        setPostContent('');
                      }}
                      className="btn-cado-secondary rounded-xl px-4 py-2.5 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-cado-primary rounded-xl px-6 py-2.5 text-xs font-semibold shadow-md"
                  >
                    {editingPostId ? 'Guardar cambios' : 'Crear artículo borrador'}
                  </button>
                </div>
              </form>

              {/* LISTA DE ARTÍCULOS */}
              <section className="clay-card rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                    Artículos registrados
                  </h2>
                  <span className="rounded-full bg-[#A14B92]/10 px-3 py-1 text-xs font-bold text-[#A14B92]">
                    {blogPosts.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {blogPosts.map((post) => (
                    <article
                      key={post.id}
                      className="rounded-2xl border border-[#E2E7E7] bg-white p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#A14B92]">
                          {post.category}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            post.published
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {post.published ? 'Publicado' : 'Borrador'}
                        </span>
                      </div>

                      <h3 className="font-semibold text-sm text-[#513D49]">{post.title}</h3>

                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setPreviewPost(post)}
                          className="font-semibold text-[#8A3D7D] hover:underline"
                        >
                          Vista previa
                        </button>
                        <button
                          type="button"
                          onClick={() => editPost(post)}
                          className="font-semibold text-[#513D49] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateBlogPost(post.id, { published: !post.published })
                          }
                          className="font-semibold text-[#A14B92] hover:underline"
                        >
                          {post.published ? 'Despublicar' : 'Publicar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar «${post.title}»?`)) {
                              deleteBlogPost(post.id);
                            }
                          }}
                          className="ml-auto font-semibold text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* =============================================================== */}
          {/* SECCIÓN 6: INTEGRACIONES Y SERVICIOS BACKEND                    */}
          {/* =============================================================== */}
          {section === 'integraciones' && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <article className="clay-card rounded-3xl p-6 space-y-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
                    <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                    Supabase PostgreSQL
                  </h2>
                  <p className="text-xs leading-relaxed text-[#665D66]">
                    {supabaseStatus.message}
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      {supabaseStatus.connected ? `Activo · ${supabaseStatus.latencyMs}ms` : 'Modo local'}
                    </span>
                  </div>
                </article>

                <article className="clay-card rounded-3xl p-6 space-y-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
                    <Video className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                    Google Meet & Calendar
                  </h2>
                  <p className="text-xs leading-relaxed text-[#665D66]">
                    Generación de enlaces seguros para videollamada vespertina de 15 minutos en cada reserva.
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-[#A14B92]">
                      Operativo en agendamiento
                    </span>
                  </div>
                </article>

                <article className="clay-card rounded-3xl p-6 space-y-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
                    <FileText className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                    APIs Next.js 16
                  </h2>
                  <p className="text-xs leading-relaxed text-[#665D66]">
                    Rutas activas: /api/orientaciones, /api/confort, /api/cuestionario, /api/faq, /api/blog, /api/recursos, /api/urgencias.
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                      8 Endpoints sincronizados
                    </span>
                  </div>
                </article>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* MODAL: FICHA CLÍNICA DE CONFORT Y CUESTIONARIO                     */}
      {/* =================================================================== */}
      {openAppointmentId &&
        appointments.find((app) => app.id === openAppointmentId) &&
        (() => {
          const app = appointments.find((item) => item.id === openAppointmentId)!;
          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-patient-name"
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpenAppointmentId(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
            >
              <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-9 space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-[#E2E7E7] pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#A14B92]">
                      Ficha Previa · Cita #{app.id}
                    </span>
                    <h2
                      id="modal-patient-name"
                      className="mt-1 font-title text-3xl font-semibold text-[#513D49]"
                    >
                      {app.patientName}
                    </h2>
                    <p className="text-xs text-[#766C75]">
                      Fecha: <strong>{app.date}</strong> a las <strong>{app.time} hrs</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenAppointmentId(null)}
                    aria-label="Cerrar ficha"
                    className="rounded-xl border border-[#B3BFBF] p-2 text-[#766C75] hover:bg-[#F6F8F8] hover:text-[#513D49]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* CONTACTO DEL PACIENTE */}
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-2xl bg-[#F6F8F8] p-4 space-y-1">
                    <span className="font-semibold text-[#513D49]">Datos de contacto:</span>
                    <p className="text-[#665D66]">Correo: {app.email}</p>
                    <p className="text-[#665D66]">Teléfono: {app.phone}</p>
                  </div>

                  <div className="rounded-2xl bg-[#F6F8F8] p-4 space-y-1">
                    <span className="font-semibold text-[#513D49]">Estado y seguimiento:</span>
                    <p className="text-[#665D66]">Orientación: {app.status}</p>
                    <p className="text-[#665D66]">
                      Derivación: {app.derivationStatus ?? 'Sin derivación'}
                    </p>
                  </div>
                </div>

                {/* PREFERENCIAS DE CONFORT AMBIENTAL */}
                <div className="rounded-2xl border border-[#E2E7E7] bg-white p-5 space-y-3">
                  <h3 className="font-title text-xl font-semibold text-[#513D49]">
                    Preferencias de Confort Ambiental del Box
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-[#513D49]">
                    <div className="flex items-center gap-2">
                      {app.comfortProfile.soundPreference === 'silencio' ? (
                        <VolumeX className="h-4 w-4 text-[#A14B92]" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-[#A14B92]" />
                      )}
                      <span>
                        Ambiente:{' '}
                        <strong>
                          {app.comfortProfile.soundPreference === 'silencio'
                            ? 'Silencio total'
                            : 'Música suave'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <PauseCircle className="h-4 w-4 text-[#A14B92]" />
                      <span>
                        Pausas mandibulares:{' '}
                        <strong>{app.comfortProfile.jawBreaks ? 'Sí, cada 5-7 min' : 'A demanda'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Hand className="h-4 w-4 text-[#A14B92]" />
                      <span>
                        Señal de mano (Stop):{' '}
                        <strong>{app.comfortProfile.handSignalPledge ? 'Pactada' : 'No'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#A14B92]" />
                      <span>
                        Acompañante:{' '}
                        <strong>{app.comfortProfile.companionAllowed ? 'Sí asistirá' : 'Solo'}</strong>
                      </span>
                    </div>
                  </div>

                  {app.comfortProfile.notes && (
                    <div className="mt-2 border-t border-[#E2E7E7] pt-2 text-xs text-[#513D49]">
                      <strong>Nota del paciente:</strong> «{app.comfortProfile.notes}»
                    </div>
                  )}
                </div>

                {/* CUESTIONARIO DE PERFILAMIENTO */}
                <div className="rounded-2xl border border-[#A14B92]/30 bg-[#F8EFF6] p-5 space-y-3">
                  <h3 className="font-title text-xl font-semibold text-[#513D49]">
                    Cuestionario Previo de Sensibilidad
                  </h3>
                  {app.questionnaire ? (
                    <div className="space-y-2 text-xs text-[#513D49]">
                      <p>
                        <strong>Motivo de consulta:</strong> {app.questionnaire.reason}
                      </p>
                      <p>
                        <strong>Nivel de ansiedad / temor:</strong> {app.questionnaire.feeling}
                      </p>
                      <p>
                        <strong>Experiencias anteriores:</strong>{' '}
                        {app.questionnaire.previousExperience}
                      </p>
                      <p>
                        <strong>Sensibilidad reportada:</strong>{' '}
                        {app.questionnaire.painSensitivity}
                      </p>
                      <p>
                        <strong>Estilo de comunicación preferido:</strong>{' '}
                        {app.questionnaire.communicationPreference}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-800 pt-1">
                        ✓ Consentimiento Ley N° 19.628 / 20.584 aceptado
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#766C75]">
                      El paciente optó por omitir el cuestionario previo (Atención con protocolo estándar).
                    </p>
                  )}
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <a
                    href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hola ${app.patientName}, le saluda el Dr. Javier Beiza de CADO Odontología Calama respecto a su orientación telemática del día ${app.date}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    <span>Contactar por WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setOpenAppointmentId(null)}
                    className="btn-cado-secondary rounded-xl px-5 py-2.5 text-xs font-semibold"
                  >
                    Cerrar ficha
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* =================================================================== */}
      {/* MODAL: VISTA PREVIA DEL ARTÍCULO                                  */}
      {/* =================================================================== */}
      {previewPost && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPost(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <article className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-9 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-[#E2E7E7] pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#A14B92]">
                  {previewPost.category} · {previewPost.published ? 'Publicado' : 'Borrador'}
                </span>
                <h2 className="mt-1 font-title text-3xl font-semibold text-[#513D49]">
                  {previewPost.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="rounded-xl border border-[#B3BFBF] p-2 hover:bg-[#F6F8F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm font-semibold text-[#513D49]">{previewPost.excerpt}</p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#665D66]">
              {previewPost.content}
            </div>

            <div className="pt-3 border-t border-[#E2E7E7] flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="btn-cado-secondary rounded-xl px-5 py-2 text-xs font-semibold"
              >
                Cerrar vista previa
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
