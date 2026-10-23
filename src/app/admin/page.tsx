'use client';

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
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
  Sparkles,
  Trash2,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useCado, type Appointment, type BlogPost, type QuestionnaireSubmission } from '@/context/CadoContext';

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
    questionnaires,
    realtimeConnected,
    lastRealtimeEvent,
    isDoctorLoggedIn,
    doctorUser,
    authMethod,
    loginDoctor,
    logoutDoctor,
  } = useCado();

  const [section, setSection] = useState<Section>('resumen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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
  const [scheduleViewFilter, setScheduleViewFilter] = useState<'proximos' | 'con_citas' | 'todos'>('proximos');
  const [slotTimeInputByDate, setSlotTimeInputByDate] = useState<Record<string, string>>({});

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

  // Desduplicación estricta de citas para evitar duplicados en memoria o estado local
  const uniqueAppointments = useMemo(() => {
    const seen = new Set<string>();
    return appointments.filter((app) => {
      const key = app.id || `${app.date}|${app.time}|${app.email}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [appointments]);

  const scheduled = uniqueAppointments.filter((a) => a.status === 'Programada').length;
  const completed = uniqueAppointments.filter((a) => a.status === 'Realizada').length;
  const derived = uniqueAppointments.filter((a) =>
    a.derivationStatus ? a.derivationStatus === 'Derivada a Dentalink' : a.status === 'Derivada a Dentalink'
  );

  const filteredAppointments = uniqueAppointments.filter((appointment) => {
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

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    const res = await loginDoctor(email, password);
    setIsLoggingIn(false);
    if (!res.ok) {
      setLoginError(res.error || 'Credenciales no válidas. Por favor verifique sus datos.');
    } else {
      setLoginError('');
    }
  }

  

  // Integración Google Calendar & Meet (RF-13)
  const [googleDoctor, setGoogleDoctor] = useState<{
    id: string;
    nombre: string;
    email: string;
    rol?: string;
    google_conectado: boolean;
    google_email?: string | null;
  } | null>(null);
  const [googleNotification, setGoogleNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchGoogleDoctorStatus = async () => {
    try {
      const res = await fetch('/api/doctores');
      const json = await res.json();
      if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
        setGoogleDoctor(json.data[0]);
      }
    } catch {}
  };

  useEffect(() => {
    fetchGoogleDoctorStatus();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('google_success') === 'true') {
        const mail = params.get('email');
        setGoogleNotification({
          type: 'success',
          message: `¡Cuenta de Google Calendar (${mail || ''}) vinculada exitosamente!`,
        });
        setSection('integraciones');
      } else if (params.get('google_error')) {
        setGoogleNotification({
          type: 'error',
          message: `Error al vincular Google Calendar: ${params.get('google_error')}`,
        });
        setSection('integraciones');
      }
    }
  }, []);

  const handleDisconnectGoogle = async (doctorId: string) => {
    if (!confirm('¿Deseas desvincular la cuenta de Google Calendar?')) return;
    try {
      await fetch('/api/doctores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'desconectar', doctorId }),
      });
      await fetchGoogleDoctorStatus();
    } catch {
      alert('Error al desvincular cuenta.');
    }
  };

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
        author: doctorUser?.nombre || 'Dr. Javier Beiza Ayala',
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

  // Agrupación y gestión avanzada de agenda por fecha
  const scheduleByDate = useMemo(() => {
    const datesSet = new Set<string>();

    availableSlots.forEach((slot) => {
      const [d] = slot.split('|');
      if (d) datesSet.add(d);
    });

    appointments
      .filter((a) => a.status === 'Programada')
      .forEach((a) => {
        if (a.date) datesSet.add(a.date);
      });

    let sortedDates = Array.from(datesSet).sort();

    if (scheduleViewFilter === 'proximos') {
      sortedDates = sortedDates.filter((d) => d >= today);
    } else if (scheduleViewFilter === 'con_citas') {
      sortedDates = sortedDates.filter((d) =>
        appointments.some((a) => a.date === d && a.status === 'Programada')
      );
    }

    return sortedDates.map((dateStr) => {
      const freeTimes = availableSlots
        .filter((s) => s.startsWith(`${dateStr}|`))
        .map((s) => s.split('|')[1])
        .sort();

      const bookedApps = appointments.filter(
        (a) => a.date === dateStr && a.status === 'Programada'
      );

      return {
        date: dateStr,
        freeTimes,
        bookedApps,
        totalItems: freeTimes.length + bookedApps.length,
        isBlocked: blockedDates.includes(dateStr),
      };
    });
  }, [availableSlots, appointments, blockedDates, scheduleViewFilter, today]);

  function formatFullDate(dateStr: string) {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const formatted = dateObj.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return dateStr;
    }
  }

  function getRelativeDateLabel(dateStr: string) {
    if (dateStr === today) return 'Hoy';
    try {
      const [y1, m1, d1] = dateStr.split('-').map(Number);
      const [y2, m2, d2] = today.split('-').map(Number);
      const t1 = new Date(y1, m1 - 1, d1).getTime();
      const t2 = new Date(y2, m2 - 1, d2).getTime();
      const diffDays = Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return 'Mañana';
      if (diffDays === -1) return 'Ayer';
      if (diffDays < -1) return 'Pasado';
      return `En ${diffDays} días`;
    } catch {
      return '';
    }
  }

  function handleClearPastSlots() {
    const pastSlots = availableSlots.filter((slot) => {
      const [d] = slot.split('|');
      return d < today;
    });
    if (pastSlots.length === 0) {
      alert('No hay bloques de fechas pasadas para limpiar.');
      return;
    }
    if (window.confirm(`¿Deseas eliminar ${pastSlots.length} bloque(s) anteriores a hoy?`)) {
      pastSlots.forEach((slot) => toggleSlotAvailability(slot));
    }
  }

  function handleGenerateWeek() {
    const now = new Date();
    const standardTimes = ['18:00', '18:15', '18:30', '19:30'];
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const target = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      const dayOfWeek = target.getDay();
      if (dayOfWeek === 0) continue; // Omite domingos
      const dateStr = target.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
      if (blockedDates.includes(dateStr)) continue;
      standardTimes.forEach((t) => {
        const slotKey = `${dateStr}|${t}`;
        if (!availableSlots.includes(slotKey)) {
          toggleSlotAvailability(slotKey);
          count++;
        }
      });
    }
    alert(`Se añadieron ${count} nuevos bloques vespertinos para los próximos 7 días.`);
  }

  function handleClearDateSlots(dateStr: string) {
    const dateSlots = availableSlots.filter((s) => s.startsWith(`${dateStr}|`));
    if (dateSlots.length === 0) return;
    if (window.confirm(`¿Quitar los ${dateSlots.length} bloques disponibles para el ${dateStr}?`)) {
      dateSlots.forEach((s) => toggleSlotAvailability(s));
    }
  }

  function handleAddStandardSlotsForDate(dateStr: string) {
    const standardTimes = ['18:00', '18:15', '18:30', '19:30'];
    standardTimes.forEach((t) => {
      const key = `${dateStr}|${t}`;
      if (!availableSlots.includes(key)) {
        toggleSlotAvailability(key);
      }
    });
  }

  function handleAddCustomSlotToDate(dateStr: string) {
    const time = slotTimeInputByDate[dateStr] || '19:45';
    if (!time) return;
    const key = `${dateStr}|${time}`;
    if (!availableSlots.includes(key)) {
      toggleSlotAvailability(key);
    }
    setSlotTimeInputByDate((prev) => ({ ...prev, [dateStr]: '' }));
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
                Espacio de trabajo de <strong>{doctorUser?.nombre || 'Dr. Javier Beiza Ayala'}</strong> para revisar el cuestionario previo y las preferencias de confort de cada paciente antes de la orientación virtual.
              </p>
            </div>

            <div className="relative mt-12 rounded-2xl border border-[#E2E7E7] bg-white p-4 text-xs leading-relaxed text-[#665D66]">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" aria-hidden="true" />
                <span>
                  Protección de datos bajo la Ley N° 19.628 y N° 20.584. Conexión cifrada de extremo a extremo con base de datos clínica.
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
                  placeholder="ej: doctor@cado.cl"
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
                disabled={isLoggingIn}
                className="btn-cado-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold shadow-md active:scale-98 disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isLoggingIn ? 'Verificando credenciales…' : 'Entrar al panel de gestión'}</span>
              </button>
            </form>

            </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PANEL ADMINISTRATIVO PRINCIPAL (AUTENTICADO)
  // =========================================================================
  const rawTitle = sectionTitles[section];
  const title = {
    ...rawTitle,
    title: section === 'resumen'
      ? `Panel Clínico · ${doctorUser?.nombre || 'Dr. Javier Beiza'}`
      : rawTitle.title,
  };

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
            {doctorUser?.nombre || 'Dr. Javier Beiza Ayala'}
          </h2>
          <p className="text-xs text-[#766C75]">{doctorUser?.rol || 'CADO Odontología · Calama'}</p>
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
              {realtimeConnected ? 'En vivo (Automático)' : supabaseStatus.connected ? 'Base de datos en línea' : 'Modo local'}
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
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#513D49]">Portal de Gestión Clínica</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {authMethod === 'supabase' ? 'Sesión Verificada' : 'Sesión Clínica'} · {doctorUser?.nombre || doctorUser?.email || 'Dr. Javier Beiza'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* INDICADOR DE REALTIME WEBSOCKETS */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                realtimeConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
              title={realtimeConnected ? 'Sincronización instantánea activa' : 'Conectando sincronización en vivo...'}
            >
              <span className="relative flex h-2 w-2">
                {realtimeConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    realtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span>{realtimeConnected ? 'En vivo' : 'Conectando…'}</span>
            </div>

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
              <span className="hidden sm:inline">Sincronizar Datos</span>
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
          {googleNotification && (
            <aside
              aria-label="Notificación de Google Calendar"
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-medium shadow-sm ${
                googleNotification.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <span>{googleNotification.message}</span>
              <button
                type="button"
                onClick={() => setGoogleNotification(null)}
                className="rounded-lg px-2 py-1 hover:bg-black/5"
              >
                ✕
              </button>
            </aside>
          )}
          {/* BANNER DE NOTIFICACIÓN DE SINCRONIZACIÓN EN TIEMPO REAL */}
          {lastRealtimeEvent && (
            <aside
              aria-label="Sincronización en tiempo real"
              className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs font-medium text-emerald-900 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span>
                  <strong>Sincronización en vivo:</strong> {lastRealtimeEvent}
                </span>
              </div>
              <span className="rounded-full bg-emerald-200/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Auto-sync
              </span>
            </aside>
          )}

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
                    Base de Datos en la Nube
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

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              app.questionnaire
                                ? 'bg-purple-100 text-[#8A3D7D]'
                                : 'bg-gray-100 text-[#766C75]'
                            }`}
                          >
                            {app.questionnaire ? 'Cuestionario completado' : 'Sin cuestionario'}
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
          {/* SECCIÓN 3: DISPONIBILIDAD HORARIA Y AGENDA                      */}
          {/* =============================================================== */}
          {section === 'disponibilidad' && (
            <div className="space-y-8">
              {/* BANNER EXPLICATIVO Y ACCIONES GLOBALES */}
              <div className="flex flex-col gap-4 rounded-3xl border border-[#A14B92]/30 bg-[#F8EFF6] p-6 text-xs text-[#513D49] sm:flex-row sm:items-center sm:justify-between shadow-xs">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 text-[#A14B92] font-bold text-sm">
                    <Clock3 className="h-4 w-4" />
                    <span>Control de Agenda Telemática · Calama</span>
                  </div>
                  <p className="leading-relaxed text-[#513D49]">
                    Configura los bloques vespertinos de 15 minutos (18:00 a 19:45 hrs) para las orientaciones virtuales. Los pacientes solo podrán elegir los bloques habilitados aquí.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleGenerateWeek}
                    className="btn-cado-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm active:scale-98"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>Generar semana estándar (L–S 18:00–19:30)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearPastSlots}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#B3BFBF] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#766C75] hover:border-red-300 hover:text-red-700 hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Limpiar fechas pasadas</span>
                  </button>
                </div>
              </div>

              {/* PANELES DE ENTRADA Y BLOQUEO DE DÍAS */}
              <div className="grid gap-6 xl:grid-cols-2">
                {/* AGREGAR BLOQUE ESPECÍFICO */}
                <section className="clay-card rounded-3xl p-6 sm:p-7 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Plus className="h-5 w-5 text-[#A14B92]" />
                    <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                      Añadir bloque específico
                    </h2>
                  </div>
                  <p className="text-xs text-[#766C75]">
                    Elige una fecha y una hora para habilitarla inmediatamente en la web pública.
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <label className="text-xs font-semibold text-[#513D49] flex-1 min-w-[140px]">
                      Fecha
                      <input
                        type="date"
                        min={today}
                        value={newSlotDate}
                        onChange={(e) => setNewSlotDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs font-normal outline-none focus:border-[#A14B92]"
                      />
                    </label>

                    <label className="text-xs font-semibold text-[#513D49] flex-1 min-w-[110px]">
                      Hora (15 min)
                      <input
                        type="time"
                        value={newSlot}
                        onChange={(e) => setNewSlot(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs font-normal outline-none focus:border-[#A14B92]"
                      />
                    </label>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (newSlot && newSlotDate) {
                            toggleSlotAvailability(`${newSlotDate}|${newSlot}`);
                          }
                        }}
                        className="btn-cado-primary inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Habilitar</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2E7E7]">
                    <button
                      type="button"
                      onClick={handleGenerateCalamaEveningSlots}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A14B92] hover:underline"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Rellenar automáticamente 18:00, 18:15, 18:30 y 19:30 para {newSlotDate}</span>
                    </button>
                  </div>
                </section>

                {/* FECHAS BLOQUEADAS */}
                <section className="clay-card rounded-3xl p-6 sm:p-7 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="h-5 w-5 text-[#A14B92]" />
                    <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                      Bloquear día completo
                    </h2>
                  </div>
                  <p className="text-xs text-[#766C75]">
                    Marca días de descanso, cirugías o feriados donde no se ofrecerá teleorientación.
                  </p>

                  <div className="flex gap-2 pt-1">
                    <input
                      type="date"
                      min={today}
                      value={newBlockedDate}
                      onChange={(e) => setNewBlockedDate(e.target.value)}
                      className="flex-1 rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs outline-none focus:border-[#A14B92]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newBlockedDate) {
                          addBlockedDate(newBlockedDate);
                          setNewBlockedDate('');
                        }
                      }}
                      className="btn-cado-secondary rounded-xl px-4 py-2 text-xs font-semibold hover:border-red-300"
                    >
                      Bloquear fecha
                    </button>
                  </div>

                  <div className="pt-1 text-xs">
                    <span className="font-semibold text-[#766C75]">
                      Días bloqueados ({blockedDates.length}):
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {blockedDates.length === 0 ? (
                        <span className="text-[#766C75] text-[11px]">No hay fechas bloqueadas.</span>
                      ) : (
                        blockedDates.map((date) => (
                          <span
                            key={date}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-800"
                          >
                            <span>{date}</span>
                            <button
                              type="button"
                              onClick={() => removeBlockedDate(date)}
                              className="text-red-500 hover:text-red-800 font-black ml-0.5"
                              title="Desbloquear"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* =========================================================== */}
              {/* TABLERO DE DISPONIBILIDAD ACTIVA AGRUPADO POR FECHA         */}
              {/* =========================================================== */}
              <section className="clay-card rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E7E7] pb-5">
                  <div className="space-y-1">
                    <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                      Tablero de Disponibilidad Activa
                    </h2>
                    <p className="text-xs text-[#766C75]">
                      Visualiza tus bloques abiertos para pacientes y las citas confirmadas día por día.
                    </p>
                  </div>

                  {/* FILTROS DE VISTA */}
                  <div className="flex items-center gap-2 bg-[#F6F8F8] p-1 rounded-2xl border border-[#E2E7E7] text-xs">
                    <button
                      type="button"
                      onClick={() => setScheduleViewFilter('proximos')}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                        scheduleViewFilter === 'proximos'
                          ? 'bg-white text-[#A14B92] shadow-xs'
                          : 'text-[#766C75] hover:text-[#513D49]'
                      }`}
                    >
                      Próximos días ({scheduleByDate.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setScheduleViewFilter('con_citas')}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                        scheduleViewFilter === 'con_citas'
                          ? 'bg-white text-[#A14B92] shadow-xs'
                          : 'text-[#766C75] hover:text-[#513D49]'
                      }`}
                    >
                      Con citas reservadas
                    </button>

                    <button
                      type="button"
                      onClick={() => setScheduleViewFilter('todos')}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                        scheduleViewFilter === 'todos'
                          ? 'bg-white text-[#A14B92] shadow-xs'
                          : 'text-[#766C75] hover:text-[#513D49]'
                      }`}
                    >
                      Todos
                    </button>
                  </div>
                </div>

                {/* LISTADO DE TARJETAS DE DÍA */}
                {scheduleByDate.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#B3BFBF] bg-[#F6F8F8] p-10 text-center space-y-3">
                    <Clock3 className="mx-auto h-8 w-8 text-[#B3BFBF]" />
                    <h3 className="font-semibold text-base text-[#513D49]">
                      No hay bloques configurados para este filtro
                    </h3>
                    <p className="text-xs text-[#766C75] max-w-md mx-auto">
                      Puedes generar automáticamente los bloques vespertinos de la semana o agregar uno manualmente arriba.
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateWeek}
                      className="btn-cado-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Generar semana vespertina estándar</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {scheduleByDate.map((dayItem) => {
                      const relativeLabel = getRelativeDateLabel(dayItem.date);
                      return (
                        <div
                          key={dayItem.date}
                          className={`rounded-2xl border p-5 transition ${
                            dayItem.isBlocked
                              ? 'border-red-200 bg-red-50/40'
                              : dayItem.date === today
                              ? 'border-[#A14B92]/40 bg-[#F8EFF6]/30 shadow-xs'
                              : 'border-[#E2E7E7] bg-white'
                          }`}
                        >
                          {/* CABECERA DEL DÍA */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E7E7] pb-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#A14B92]/10 text-[#A14B92]">
                                <Calendar className="h-4 w-4" />
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <strong className="text-sm font-semibold text-[#513D49]">
                                    {formatFullDate(dayItem.date)}
                                  </strong>
                                  {relativeLabel && (
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                        relativeLabel === 'Hoy'
                                          ? 'bg-[#A14B92] text-white'
                                          : relativeLabel === 'Mañana'
                                          ? 'bg-purple-100 text-[#A14B92]'
                                          : 'bg-gray-100 text-[#766C75]'
                                      }`}
                                    >
                                      {relativeLabel}
                                    </span>
                                  )}
                                  {dayItem.isBlocked && (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                                      🔒 Día bloqueado
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[#766C75]">
                                  {dayItem.date}
                                </span>
                              </div>
                            </div>

                            {/* INSIGNIAS DE CONTEO Y ACCIONES RÁPIDAS DEL DÍA */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-[#A14B92]">
                                {dayItem.freeTimes.length} libres
                              </span>

                              {dayItem.bookedApps.length > 0 && (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                  {dayItem.bookedApps.length} reservadas
                                </span>
                              )}

                              {/* BOTÓN AGREGAR 4 BLOQUES ESTÁNDAR AL DÍA */}
                              {dayItem.freeTimes.length < 4 && !dayItem.isBlocked && (
                                <button
                                  type="button"
                                  onClick={() => handleAddStandardSlotsForDate(dayItem.date)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-[#B3BFBF] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#513D49] hover:border-[#A14B92] hover:text-[#A14B92] transition"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>+ 4 Bloques estándar</span>
                                </button>
                              )}

                              {/* BOTÓN QUITAR TODOS LOS LIBRES DE ESTE DÍA */}
                              {dayItem.freeTimes.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleClearDateSlots(dayItem.date)}
                                  className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition"
                                  title="Quitar todos los bloques disponibles de esta fecha"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Quitar libres</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* LISTA DE BLOQUES DEL DÍA (CITAS + DISPONIBLES) */}
                          <div className="pt-3.5">
                            {dayItem.totalItems === 0 ? (
                              <p className="text-xs text-[#766C75] italic">
                                No hay horarios configurados para este día.
                              </p>
                            ) : (
                              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                                {/* CITAS YA RESERVADAS POR PACIENTES */}
                                {dayItem.bookedApps.map((bookedApp) => (
                                  <div
                                    key={bookedApp.id}
                                    className="flex flex-col justify-between rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 shadow-2xs space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-xs font-bold text-emerald-900">
                                        🕒 {bookedApp.time} hrs
                                      </span>
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                                        ● Cita
                                      </span>
                                    </div>
                                    <div>
                                      <strong className="block text-xs font-semibold text-emerald-950 truncate">
                                        {bookedApp.patientName}
                                      </strong>
                                      <span className="text-[10px] text-emerald-800">
                                        {bookedApp.comfortProfile.soundPreference === 'silencio'
                                          ? 'Silencio'
                                          : 'Música'} · {bookedApp.comfortProfile.jawBreaks ? 'Pausas 5m' : 'Sin pausas'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setOpenAppointmentId(bookedApp.id)}
                                      className="text-left text-[11px] font-bold text-[#A14B92] hover:underline pt-1 border-t border-emerald-200"
                                    >
                                      Ver Ficha Clínica →
                                    </button>
                                  </div>
                                ))}

                                {/* BLOQUES LIBRES PARA RESERVA PÚBLICA */}
                                {dayItem.freeTimes.map((timeStr) => (
                                  <div
                                    key={timeStr}
                                    className="group flex flex-col justify-between rounded-xl border border-[#E2E7E7] bg-white p-3 hover:border-[#A14B92] hover:shadow-2xs transition space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-xs font-bold text-[#513D49]">
                                        🕒 {timeStr} hrs
                                      </span>
                                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-[#A14B92] border border-purple-200">
                                        Disponible
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-[#766C75]">
                                      Orientación virtual (15 min)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleSlotAvailability(`${dayItem.date}|${timeStr}`)
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800 hover:underline pt-1 border-t border-gray-100"
                                    >
                                      <span>Quitar este bloque</span>
                                      <span>×</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* AGREGAR HORA RÁPIDA A ESTE DÍA */}
                            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#E2E7E7]/60 text-xs">
                              <span className="text-[#766C75] text-[11px]">
                                Añadir hora personalizada a este día:
                              </span>
                              <input
                                type="time"
                                value={slotTimeInputByDate[dayItem.date] || ''}
                                onChange={(e) =>
                                  setSlotTimeInputByDate((prev) => ({
                                    ...prev,
                                    [dayItem.date]: e.target.value,
                                  }))
                                }
                                className="rounded-lg border border-[#B3BFBF] bg-white px-2 py-1 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddCustomSlotToDate(dayItem.date)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#513D49] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#3E2D37]"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Agregar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
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
                    Los artículos guardados se sincronizan con la base de datos clínica (`articulos_blog`).
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

              {/* Panel de Conexión Google Calendar & Meet (RF-13) */}
              <section className="rounded-[1.7rem] border border-[#E2E7E7] bg-white p-6 shadow-xs sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E7E7] pb-5">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A14B92]">
                      Integración Externa (RF-13)
                    </span>
                    <h2 className="mt-1 font-title text-2xl font-semibold sm:text-3xl text-[#513D49]">
                      Conexión Google Calendar & Meet
                    </h2>
                    <p className="mt-2 max-w-3xl text-xs leading-6 text-[#665D66]">
                      Vincula una cuenta de Google para sincronización de teleorientaciones. Al confirmarse una reserva telemática, se creará un evento automático en la agenda y se generará una sala de Google Meet oficial.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="max-w-xl rounded-2xl border border-[#E2E7E7] bg-[#F6F8F8] p-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#A14B92] shadow-xs">
                          <Video className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="font-semibold text-[#513D49]">
                            {doctorUser?.nombre || googleDoctor?.nombre || 'Dr. Javier Beiza Ayala'}
                          </h3>
                          <p className="text-xs text-[#766C75]">
                            {doctorUser?.rol || googleDoctor?.rol || 'Cirujano Dentista · Director Clínico CADO'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                          googleDoctor?.google_conectado
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white text-[#766C75] border-[#E2E7E7]'
                        }`}
                      >
                        {googleDoctor?.google_conectado ? '● Conectado a Google' : '○ No conectado'}
                      </span>
                    </div>

                    {googleDoctor?.google_email && (
                      <div className="mt-4 rounded-xl bg-emerald-50/70 border border-emerald-100 p-3 text-xs text-emerald-900">
                        Cuenta vinculada: <strong>{googleDoctor.google_email}</strong>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3 border-t border-[#E2E7E7] pt-4">
                      {googleDoctor?.google_conectado ? (
                        <>
                          <a
                            href={`/api/auth/google?doctorId=${googleDoctor.id}`}
                            className="btn-cado-secondary inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold"
                          >
                            <CalendarDays className="h-4 w-4" />
                            <span>Re-conectar cuenta</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDisconnectGoogle(googleDoctor.id)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Desvincular
                          </button>
                        </>
                      ) : (
                        <a
                          href={`/api/auth/google?doctorId=${googleDoctor?.id || 'e03d11e6-6409-4149-af0d-c01de4222fa8'}`}
                          className="btn-cado-primary inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold"
                        >
                          <CalendarDays className="h-4 w-4" />
                          <span>Vincular Google Calendar con cuenta de prueba</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </section>
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
                {(() => {
                  const q = app.questionnaire || questionnaires.find((item: QuestionnaireSubmission) => item.id === app.id || item.reason === app.patientName);
                  return (
                    <div className="rounded-2xl border border-[#A14B92]/30 bg-[#F8EFF6] p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-title text-xl font-semibold text-[#513D49]">
                          Cuestionario Previo de Sensibilidad
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            q ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {q ? '✓ Completado por paciente' : 'Omitido'}
                        </span>
                      </div>
                      {q ? (
                        <div className="space-y-2 text-xs text-[#513D49]">
                          <p>
                            <strong>Motivo de consulta:</strong> {q.reason}
                          </p>
                          <p>
                            <strong>Nivel de ansiedad / temor:</strong> {q.feeling}
                          </p>
                          <p>
                            <strong>Experiencias anteriores:</strong>{' '}
                            {q.previousExperience}
                          </p>
                          <p>
                            <strong>Sensibilidad reportada:</strong>{' '}
                            {q.painSensitivity}
                          </p>
                          <p>
                            <strong>Estilo de comunicación preferido:</strong>{' '}
                            {q.communicationPreference}
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
                  );
                })()}

                {/* BOTONES DE ACCIÓN */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <a
                    href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hola ${app.patientName}, le saluda ${doctorUser?.nombre || 'el Dr. Javier Beiza'} de CADO Odontología Calama respecto a su orientación telemática del día ${app.date}.`
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
