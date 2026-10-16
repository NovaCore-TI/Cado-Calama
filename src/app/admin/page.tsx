'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Clock3, ExternalLink,
  FileText, HeartHandshake, LayoutDashboard, LockKeyhole, LogOut, Plus, Video,
  Search, ShieldCheck, Trash2, Users, XCircle,
} from 'lucide-react';
import { useCado, type Appointment, type BlogPost } from '@/context/CadoContext';

type Section = 'resumen' | 'orientaciones' | 'disponibilidad' | 'derivaciones' | 'contenidos' | 'integraciones';

const navigation = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'orientaciones', label: 'Orientaciones', icon: Users },
  { id: 'disponibilidad', label: 'Disponibilidad', icon: CalendarDays },
  { id: 'derivaciones', label: 'Derivaciones', icon: ArrowRight },
  { id: 'contenidos', label: 'Contenidos', icon: FileText },
  { id: 'integraciones', label: 'Integraciones', icon: Video },
] as const;

const sectionTitles: Record<Section, { eyebrow: string; title: string; description: string }> = {
  resumen: { eyebrow: 'Vista general', title: 'Bienvenido, Dr. Beiza', description: 'Un punto de partida para revisar orientaciones, disponibilidad y contenido de CADO.' },
  orientaciones: { eyebrow: 'Atención inicial', title: 'Orientaciones virtuales', description: 'Consulta las solicitudes y cambia su estado dentro de esta demostración local.' },
  disponibilidad: { eyebrow: 'Agenda', title: 'Disponibilidad virtual', description: 'Configura bloques de ejemplo de 15 minutos y fechas no disponibles.' },
  derivaciones: { eyebrow: 'Seguimiento', title: 'Derivaciones a Dentalink', description: 'Revisa las orientaciones marcadas para continuar el proceso presencial.' },
  contenidos: { eyebrow: 'Comunicación', title: 'Artículos educativos', description: 'Prepara borradores locales para su revisión profesional.' },
  integraciones: { eyebrow: 'Flujos externos', title: 'Calendar, Meet y contingencias', description: 'Vista de los servicios y estados previstos para el producto conectado.' },
};

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: typeof CalendarDays }) {
  return <div className="rounded-[1.6rem] border border-white bg-white p-5 shadow-[0_12px_35px_rgba(81,61,73,.06)]">
    <div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold text-[#746A73]">{label}</span><span className="clay-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#A14B92]"><Icon className="h-5 w-5" /></span></div>
    <strong className="mt-4 block font-title text-4xl font-semibold text-[#513D49]">{value}</strong>
    <span className="mt-1 block text-xs leading-5 text-[#766C75]">{detail}</span>
  </div>;
}

export default function AdminPage() {
  const {
    supabaseStatus, appointments, addAppointment, updateAppointmentStatus, updateDerivationStatus, availableSlots, toggleSlotAvailability,
    blockedDates, addBlockedDate, removeBlockedDate, blogPosts, addBlogPost,
    updateBlogPost, deleteBlogPost, isDoctorLoggedIn, loginDoctor, logoutDoctor,
  } = useCado();

  const [section, setSection] = useState<Section>('resumen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [newSlot, setNewSlot] = useState('');
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState<BlogPost['category']>('Cuidados');
  const [postExcerpt, setPostExcerpt] = useState('');
  const [postContent, setPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(null);

  const scheduled = appointments.filter((appointment) => appointment.status === 'Programada').length;
  const completed = appointments.filter((appointment) => appointment.status === 'Realizada').length;
  const derived = appointments.filter((appointment) => appointment.derivationStatus ? appointment.derivationStatus === 'Derivada a Dentalink' : appointment.status === 'Derivada a Dentalink');
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesQuery = `${appointment.patientName} ${appointment.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'todas' || appointment.status === statusFilter);
  });

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(loginDoctor(email, password) ? '' : 'Acceso de demostración incorrecto. Usa las credenciales indicadas abajo.');
  }

  function handleSavePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;
    const excerpt = postExcerpt.trim() || `${postContent.trim().slice(0, 140)}…`;
    if (editingPostId) {
      updateBlogPost(editingPostId, { title: postTitle.trim(), category: postCategory, excerpt, content: postContent.trim() });
    } else {
      addBlogPost({
        title: postTitle.trim(), slug: postTitle.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        category: postCategory, excerpt, content: postContent.trim(), author: 'Dr. Javier Beiza Ayala',
        readTime: `${Math.max(2, Math.ceil(postContent.trim().split(/\s+/).length / 180))} min de lectura`, published: false,
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
  }

  function createExampleAppointment() {
    const nextDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
    const created = addAppointment({
      patientName: 'Paciente de ejemplo', email: 'ejemplo@demo.local', phone: '+56000000000',
      date: nextDate, time: availableSlots[0]?.split('|')[1] || '10:00',
      comfortProfile: { anxietyLevel: 'no_responde', soundPreference: 'silencio', jawBreaks: true, companionAllowed: false, handSignalPledge: true },
      meetLink: '',
      derivationStatus: 'Sin derivación',
    });
    setSection('orientaciones');
    setOpenAppointmentId(created.id);
  }

  if (!isDoctorLoggedIn) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8F8] px-6 py-14 text-[#513D49]">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(81,61,73,.13)] lg:grid-cols-2">
        <div className="relative flex flex-col justify-between overflow-hidden border-r border-[#E2E7E7] bg-[#F6F8F8] p-8 text-[#513D49] sm:p-12">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[#B3BFBF]/30 blur-3xl" aria-hidden="true" />
          <div className="relative"><Image src="/brand/image2.png" alt="CADO Odontología" width={180} height={65} className="h-14 w-auto object-contain" /><span className="mt-12 inline-flex rounded-full border border-[#B3BFBF] bg-white px-3 py-1.5 text-xs font-semibold text-[#A14B92]">Portal del doctor · prototipo</span><h1 className="mt-5 max-w-md font-title text-5xl font-semibold leading-tight">La gestión de CADO, en un solo lugar.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-[#665D66]">Una vista de trabajo para explorar la agenda virtual, las orientaciones y los contenidos educativos.</p></div>
          <p className="relative mt-16 flex items-start gap-2 text-xs leading-6 text-[#665D66]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#A14B92]" />Este acceso es una simulación local. No ingreses información real de pacientes.</p>
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <Link href="/" className="mb-12 text-xs font-semibold text-[#8A3D7D] hover:underline">← Volver al sitio público</Link>
          <span className="section-eyebrow">Acceso de demostración</span>
          <h2 className="mt-3 font-title text-4xl font-semibold">Entrar a la intranet</h2>
          <p className="mt-3 text-sm leading-7 text-[#766C75]">Prueba la interfaz con credenciales de ejemplo. Este prototipo no implementa autenticación clínica.</p>
          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold">Usuario<input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#DDE4E4] bg-white px-4 py-3 text-sm outline-none focus:border-[#A14B92]" placeholder="demo@cado.local" /></label>
            <label className="block text-sm font-semibold">Clave<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#DDE4E4] bg-white px-4 py-3 text-sm outline-none focus:border-[#A14B92]" placeholder="Clave de demostración" /></label>
            {loginError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{loginError}</p>}
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#A14B92] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#8C3C7E]"><LockKeyhole className="h-4 w-4" /> Entrar al panel</button>
          </form>
          <div className="mt-7 rounded-2xl bg-[#F6F8F8] p-4 text-xs leading-6 text-[#665D66]"><strong>Para probar:</strong> usuario demo@cado.local · clave DEMO</div>
        </div>
      </div>
    </div>
  );

  const title = sectionTitles[section];
  return (
    <div className="min-h-screen bg-[#F6F8F8] text-[#513D49] lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b border-[#E2E7E7] bg-white px-5 py-6 text-[#513D49] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4"><Image src="/brand/image2.png" alt="CADO Odontología" width={150} height={50} className="h-11 w-auto object-contain" /><span className="rounded-full border border-[#B3BFBF] px-2 py-1 text-[10px] uppercase tracking-wider text-[#8A3D7D]">Intranet</span></div>
        <div className="mt-8 hidden border-t border-[#E2E7E7] pt-7 lg:block"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#A14B92]">Espacio de trabajo</p><h2 className="mt-2 font-title text-2xl font-semibold">Dr. Javier Beiza</h2><p className="mt-1 text-xs text-[#665D66]">CADO Odontología · Calama</p></div>
        <nav aria-label="Secciones de la intranet" className="-mx-1 mt-6 flex gap-2 overflow-x-auto pb-1 lg:mt-10 lg:flex-col lg:overflow-visible">
          {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} aria-current={section === id ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition lg:w-full ${section === id ? 'bg-[#A14B92] text-white shadow-[0_8px_22px_rgba(161,75,146,.18)]' : 'text-[#665D66] hover:bg-[#F6F8F8] hover:text-[#513D49]'}`}><Icon className="h-4 w-4" />{label}{id === 'orientaciones' && appointments.length > 0 && <span className="ml-auto text-xs">{appointments.length}</span>}</button>)}
        </nav>
        <div className="mt-auto hidden border-t border-[#E2E7E7] pt-6 lg:block"><p className="mb-4 text-xs leading-6 text-[#665D66]">Vista local de demostración. No contiene información clínica real.</p><Link href="/" className="flex items-center gap-2 text-xs font-semibold text-[#8A3D7D] hover:underline"><ExternalLink className="h-4 w-4" /> Ver sitio público</Link></div>
      </aside>

      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E7E7] bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-9"><div><p className="text-[11px] font-semibold uppercase tracking-[.17em] text-[#A14B92]">CADO / {title.eyebrow}</p><p className="mt-1 text-sm font-semibold">Portal de gestión</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${supabaseStatus.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#E6EBEB] text-[#8A3D7D]'}`}>{supabaseStatus.connected ? `● Supabase Conectado (${supabaseStatus.latencyMs}ms)` : 'Respaldo Local'}</span><button type="button" onClick={logoutDoctor} className="flex items-center gap-2 rounded-xl border border-[#E2E7E7] px-3 py-2 text-xs font-semibold hover:bg-[#F6F8F8]"><LogOut className="h-4 w-4" /> Salir</button></div></header>
        <main className="mx-auto max-w-7xl space-y-8 px-6 py-8 sm:px-9 sm:py-10">
          {section === 'orientaciones' && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E7E7] bg-white p-4"><p className="max-w-2xl text-xs leading-6 text-[#665D66]">Bandeja sincronizada con el cuestionario previo, test de confort y reservas telemáticas. Puedes inspeccionar el perfil completo de cada paciente.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={createExampleAppointment} className="btn-cado-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"><Plus className="h-4 w-4" /> Crear caso de ejemplo</button>{appointments.length > 0 && <select aria-label="Abrir detalle de orientación" value="" onChange={event => setOpenAppointmentId(event.target.value)} className="rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs font-semibold"><option value="">Ver detalle de una orientación</option>{appointments.map(app => <option key={app.id} value={app.id}>{app.patientName} · {app.date}</option>)}</select>}</div></div>}
          <div><p className="section-eyebrow">{title.eyebrow}</p><h1 className="mt-2 font-title text-4xl font-semibold sm:text-5xl">{title.title}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-[#746A73]">{title.description}</p></div>

          {section === 'resumen' && <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Orientaciones programadas" value={scheduled} detail="Pendientes de realizar" icon={CalendarDays} /><StatCard label="Orientaciones realizadas" value={completed} detail="Registradas en esta vista" icon={CheckCircle2} /><StatCard label="Derivaciones" value={derived.length} detail="Marcadas para Dentalink" icon={ArrowRight} /><StatCard label="Bloques virtuales" value={availableSlots.length} detail="Horarios habilitados" icon={Clock3} /></div>
            <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><section className="rounded-[1.7rem] border border-[#E2E7E7] bg-white p-6 shadow-[0_12px_35px_rgba(81,61,73,.05)]"><div className="flex items-start justify-between gap-4"><div><h2 className="font-title text-2xl font-semibold">Próximas orientaciones</h2><p className="mt-1 text-xs text-[#766C75]">Solicitudes programadas</p></div><button type="button" onClick={() => setSection('orientaciones')} className="text-xs font-semibold text-[#8A3D7D] hover:underline">Ver todas →</button></div>{scheduled === 0 ? <div className="mt-7 rounded-2xl bg-[#F6F8F8] px-6 py-9 text-center"><CalendarDays className="mx-auto h-8 w-8 text-[#B3BFBF]" /><p className="mt-3 text-sm font-semibold">Aún no hay orientaciones programadas</p></div> : <div className="mt-5 space-y-3">{appointments.filter((a) => a.status === 'Programada').slice(0, 4).map((a) => <div key={a.id} onClick={() => { setSection('orientaciones'); setOpenAppointmentId(a.id); }} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#E2E7E7] p-4 text-sm hover:bg-[#F6F8F8]"><div><strong>{a.patientName}</strong><p className="mt-1 text-xs text-[#766C75]">{a.date} · {a.time} · Ambiente: {a.comfortProfile.soundPreference === 'silencio' ? 'Silencio' : 'Música suave'}</p></div><ChevronRight className="h-4 w-4 text-[#A14B92]" /></div>)}</div>}</section><section className="clay-card rounded-[1.7rem] p-6"><span className="clay-icon flex h-11 w-11 items-center justify-center rounded-xl text-[#A14B92]"><HeartHandshake className="h-5 w-5" /></span><h2 className="mt-6 font-title text-2xl font-semibold">Estado Backend & Supabase</h2><p className="mt-2 text-sm leading-7 text-[#665D66]">{supabaseStatus.message}</p><Link href="/api/health" target="_blank" className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#8A3D7D] hover:underline">Ver estado de servicios (/api/health) <ArrowRight className="h-4 w-4" /></Link></section></div>
            <div className="grid gap-4 sm:grid-cols-3">{[{ id: 'orientaciones', label: 'Revisar orientaciones', detail: 'Estados y datos de contacto', icon: Users }, { id: 'disponibilidad', label: 'Ajustar disponibilidad', detail: 'Bloques y fechas bloqueadas', icon: Clock3 }, { id: 'contenidos', label: 'Trabajar en contenidos', detail: 'Artículos del blog conectados', icon: FileText }].map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id as Section)} className="flex items-center gap-4 rounded-2xl border border-[#E2E7E7] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><span className="clay-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#A14B92]"><Icon className="h-5 w-5" /></span><span><strong className="block text-sm">{label}</strong><small className="mt-1 block text-xs text-[#766C75]">{detail}</small></span></button>)}</div>
          </>}

          {section === 'orientaciones' && <section className="rounded-[1.7rem] border border-[#E2E7E7] bg-white p-5 sm:p-7"><div className="flex flex-wrap gap-3"><label className="relative flex min-w-[220px] flex-1 items-center"><Search className="absolute left-4 h-4 w-4 text-[#8A7D88]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por paciente o código" className="w-full rounded-xl border border-[#DDE4E4] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#A14B92]" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por estado" className="rounded-xl border border-[#DDE4E4] bg-white px-4 py-3 text-sm"><option value="todas">Todos los estados</option>{['Programada', 'Realizada', 'Cancelada', 'No asistió'].map((status) => <option key={status}>{status}</option>)}</select></div>{filteredAppointments.length === 0 ? <div className="mt-6 rounded-2xl bg-[#F6F8F8] px-6 py-12 text-center"><Users className="mx-auto h-9 w-9 text-[#B3BFBF]" /><h2 className="mt-3 font-title text-2xl font-semibold">No hay orientaciones para mostrar</h2></div> : <div className="mt-6 space-y-3">{filteredAppointments.map((appointment: Appointment) => <article key={appointment.id} className="rounded-2xl border border-[#E2E7E7] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-semibold text-[#A14B92]">{appointment.id}</span><h2 className="mt-1 font-title text-2xl font-semibold">{appointment.patientName}</h2><p className="mt-1 text-xs text-[#766C75]">{appointment.date} · {appointment.time} · {appointment.email}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => setOpenAppointmentId(appointment.id)} className="rounded-xl border border-[#B3BFBF] px-3 py-1.5 text-xs font-semibold text-[#513D49] hover:bg-[#F6F8F8]">Ver Ficha de Confort y Cuestionario</button><span className="rounded-full bg-[#E6EBEB] px-3 py-1.5 text-xs font-semibold text-[#8A3D7D]">{appointment.status}</span></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E7E7] pt-4"><div className="flex gap-2"><a href={`tel:${appointment.phone}`} className="rounded-xl border border-[#DDE4E4] px-3 py-2 text-xs font-semibold hover:bg-[#F6F8F8]">Llamar</a>{appointment.meetLink && <a href={appointment.meetLink} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#DDE4E4] px-3 py-2 text-xs font-semibold hover:bg-[#F6F8F8]">Abrir Meet</a>}</div><select aria-label={`Cambiar estado de ${appointment.patientName}`} value={appointment.status} onChange={(event) => updateAppointmentStatus(appointment.id, event.target.value as Appointment['status'])} className="rounded-xl border border-[#DDE4E4] bg-white px-3 py-2 text-xs font-semibold"><option>Programada</option><option>Realizada</option><option>No asistió</option><option>Cancelada</option></select><select aria-label={`Derivación de ${appointment.patientName}`} value={appointment.derivationStatus ?? (appointment.status === 'Derivada a Dentalink' ? 'Derivada a Dentalink' : 'Sin derivación')} onChange={(event) => updateDerivationStatus(appointment.id, event.target.value as NonNullable<Appointment['derivationStatus']>)} className="rounded-xl border border-[#DDE4E4] bg-white px-3 py-2 text-xs font-semibold"><option>Sin derivación</option><option>Pendiente presencial</option><option>Derivada a Dentalink</option></select></div></article>)}</div>}</section>}

          {section === 'disponibilidad' && <><div className="glass-panel rounded-2xl p-5 text-sm leading-7 text-[#665D66]"><strong className="text-[#513D49]">Horarios de Orientación Virtual.</strong> Configura los bloques de 15 minutos habilitados para reserva telemática.</div><div className="grid gap-5 xl:grid-cols-2"><section className="rounded-[1.7rem] border border-[#E2E7E7] bg-white p-6"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-[#A14B92]" /><h2 className="font-title text-2xl font-semibold">Bloques virtuales</h2></div><p className="mt-2 text-xs leading-6 text-[#766C75]">Habilita o deshabilita bloques por fecha.</p><div className="mt-6 flex flex-wrap gap-2"><input type="date" aria-label="Fecha del nuevo bloque virtual" value={newSlotDate} onChange={(event) => setNewSlotDate(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#DDE4E4] px-3 py-2 text-sm" /><input type="time" aria-label="Hora del nuevo bloque virtual" value={newSlot} onChange={(event) => setNewSlot(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#DDE4E4] px-3 py-2 text-sm" /><button type="button" onClick={() => { if (newSlot && newSlotDate && newSlotDate >= new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }) && !blockedDates.includes(newSlotDate)) toggleSlotAvailability([newSlotDate, newSlot].join('|')); setNewSlot(''); }} className="flex items-center gap-1 rounded-xl bg-[#A14B92] px-4 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" /> Agregar</button></div><div className="mt-5 flex flex-wrap gap-2">{availableSlots.length === 0 ? <p className="text-sm text-[#766C75]">No hay bloques configurados.</p> : availableSlots.map((slot) => <button key={slot} type="button" onClick={() => toggleSlotAvailability(slot)} className="rounded-xl bg-[#E6EBEB] px-3 py-2 text-xs font-semibold text-[#8A3D7D] hover:bg-[#E2E7E7]">{slot.replace('|', ' · ')} · Quitar</button>)}</div></section><section className="rounded-[1.7rem] border border-[#E2E7E7] bg-white p-6"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-[#A14B92]" /><h2 className="font-title text-2xl font-semibold">Fechas bloqueadas</h2></div><p className="mt-2 text-xs leading-6 text-[#766C75]">Marca feriados o días en que no se ofrecería orientación virtual.</p><div className="mt-6 flex gap-2"><input type="date" aria-label="Fecha por bloquear" value={newBlockedDate} onChange={(event) => setNewBlockedDate(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#DDE4E4] px-3 py-2 text-sm" /><button type="button" onClick={() => { if (newBlockedDate) addBlockedDate(newBlockedDate); setNewBlockedDate(''); }} className="rounded-xl bg-[#A14B92] px-4 py-2 text-xs font-semibold text-white">Bloquear</button></div><div className="mt-5 space-y-2">{blockedDates.length === 0 ? <p className="text-sm text-[#766C75]">No hay fechas bloqueadas.</p> : blockedDates.map((date) => <div key={date} className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8F8] p-3 text-sm"><span>{date}</span><button type="button" onClick={() => removeBlockedDate(date)} className="text-xs font-semibold text-red-700 hover:underline">Desbloquear</button></div>)}</div></section></div></>}

          {section === 'derivaciones' && <section className="rounded-[1.7rem] border border-[#E2E7E7] bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-title text-2xl font-semibold">Seguimiento de derivaciones</h2><p className="mt-2 max-w-xl text-sm leading-7 text-[#766C75]">Registro auditado de pacientes derivados a atención presencial en Dentalink.</p></div><a href="https://dentalink.cl" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-[#DDE4E4] px-4 py-2 text-xs font-semibold hover:bg-[#F6F8F8]">Sitio de Dentalink <ExternalLink className="h-4 w-4" /></a></div>{derived.length === 0 ? <div className="mt-7 rounded-2xl bg-[#F6F8F8] px-6 py-12 text-center"><ArrowRight className="mx-auto h-8 w-8 text-[#B3BFBF]" /><p className="mt-3 text-sm font-semibold">Aún no hay derivaciones registradas</p></div> : <div className="mt-6 space-y-3">{derived.map((appointment) => <div key={appointment.id} className="flex flex-wrap justify-between gap-3 rounded-2xl border border-[#E2E7E7] p-4 text-sm"><div><strong>{appointment.patientName}</strong><p className="mt-1 text-xs text-[#766C75]">Orientación {appointment.id} · {appointment.date}</p></div><span className="text-xs text-[#8A3D7D]">{appointment.dentalinkAudit?.derivedAt ?? 'Registrada'}</span></div>)}</div>}</section>}

          {section === 'contenidos' && <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]"><form onSubmit={handleSavePost} className="space-y-5 rounded-[1.7rem] border border-[#E2E7E7] bg-white p-6"><div><h2 className="font-title text-2xl font-semibold">{editingPostId ? 'Editar artículo' : 'Nuevo artículo del blog'}</h2><p className="mt-1 text-xs leading-6 text-[#766C75]">Se sincroniza con Supabase (`articulos_blog`) y el blog público.</p></div><label className="block text-sm font-semibold">Título<input required value={postTitle} onChange={(event) => setPostTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DDE4E4] px-4 py-3 text-sm outline-none focus:border-[#A14B92]" /></label><label className="block text-sm font-semibold">Categoría<select value={postCategory} onChange={(event) => setPostCategory(event.target.value as BlogPost['category'])} className="mt-2 w-full rounded-xl border border-[#DDE4E4] bg-white px-4 py-3 text-sm"><option>Miedo Dental</option><option>Cuidados</option><option>Bruxismo</option><option>Urgencias</option></select></label><label className="block text-sm font-semibold">Resumen<textarea rows={2} value={postExcerpt} onChange={(event) => setPostExcerpt(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DDE4E4] px-4 py-3 text-sm outline-none focus:border-[#A14B92]" /></label><label className="block text-sm font-semibold">Contenido<textarea required rows={8} value={postContent} onChange={(event) => setPostContent(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DDE4E4] px-4 py-3 text-sm outline-none focus:border-[#A14B92]" /></label><div className="flex flex-wrap justify-end gap-2">{editingPostId && <button type="button" onClick={() => { setEditingPostId(null); setPostTitle(''); setPostExcerpt(''); setPostContent(''); }} className="rounded-xl border border-[#DDE4E4] px-4 py-2.5 text-xs font-semibold">Cancelar edición</button>}<button type="submit" className="rounded-xl bg-[#A14B92] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#8C3C7E]">{editingPostId ? 'Guardar cambios' : 'Guardar borrador'}</button></div></form><section className="rounded-[1.7rem] border border-[#E2E7E7] bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-title text-2xl font-semibold">Artículos registrados</h2><span className="rounded-full bg-[#E6EBEB] px-3 py-1 text-xs font-semibold text-[#8A3D7D]">{blogPosts.length}</span></div>{blogPosts.length === 0 ? <div className="mt-7 rounded-2xl bg-[#F6F8F8] px-5 py-10 text-center"><FileText className="mx-auto h-8 w-8 text-[#B3BFBF]" /><p className="mt-3 text-sm font-semibold">Todavía no hay artículos</p></div> : <div className="mt-5 space-y-3">{blogPosts.map((post) => <article key={post.id} className="rounded-2xl border border-[#E2E7E7] p-4"><span className="text-[11px] font-semibold text-[#A14B92]">{post.category}</span><h3 className="mt-1 text-sm font-semibold">{post.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#766C75]">{post.excerpt}</p><div className="mt-4 flex gap-4 border-t border-[#E2E7E7] pt-3"><button type="button" onClick={() => editPost(post)} className="text-xs font-semibold text-[#8A3D7D] hover:underline">Editar</button><button type="button" onClick={() => { if (window.confirm(`¿Eliminar el artículo «${post.title}»?`)) deleteBlogPost(post.id); }} className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"><Trash2 className="h-3 w-3" /> Eliminar</button></div></article>)}</div>}</section></div>}

          <p className="flex items-start gap-2 border-t border-[#E2E7E7] pt-6 text-xs leading-6 text-[#665D66]"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#A14B92]" />Conectado a Supabase (`{process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zccvmxtaxbigyqopqftd.supabase.co'}`) y servicios backend de CADO.</p>
          {section === 'contenidos' && <section className="rounded-[1.7rem] border border-[#E2E7E7] bg-white p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-title text-2xl font-semibold">Revisión y visibilidad</h2><p className="mt-1 text-xs leading-6 text-[#766C75]">Publica o pasa a borrador los artículos del blog educativo.</p></div><Link href="/blog" className="text-xs font-semibold text-[#8A3D7D] hover:underline">Ver blog público →</Link></div>{blogPosts.length === 0 ? <p className="mt-6 text-sm text-[#766C75]">Guarda un borrador para probar la vista previa y el estado publicado.</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{blogPosts.map(post => <article key={post.id} className="rounded-2xl border border-[#E2E7E7] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#8A3D7D]">{post.category}</p><h3 className="mt-1 font-semibold">{post.title}</h3><p className="mt-1 text-xs text-[#766C75]">/blog/{post.slug}</p></div><span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${post.published ? 'bg-[#E6EBEB] text-[#513D49]' : 'bg-[#F8EFF6] text-[#8A3D7D]'}`}>{post.published ? 'Publicado' : 'Borrador'}</span></div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setPreviewPost(post)} className="btn-cado-secondary rounded-xl px-3 py-2 text-xs font-semibold">Vista previa</button><button type="button" onClick={() => updateBlogPost(post.id, { published: !post.published })} className="btn-cado-primary rounded-xl px-3 py-2 text-xs font-semibold">{post.published ? 'Pasar a borrador' : 'Publicar'}</button></div></article>)}</div>}</section>}
          {section === 'integraciones' && <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3">{[
            { name: 'Supabase PostgreSQL', detail: supabaseStatus.message, icon: ShieldCheck, badge: supabaseStatus.connected ? 'Conectado' : 'Local' },
            { name: 'Google Calendar & Meet', detail: 'Generación de sala virtual para orientaciones de 15 minutos.', icon: Video, badge: 'Configurado en reserva' },
            { name: 'Servicios Backend CADO', detail: 'Rutas activas: /api/perfil, /api/blog, /api/faq, /api/recursos, /api/urgencias, /api/cuestionario, /api/confort, /api/orientaciones.', icon: FileText, badge: 'Operativo' },
          ].map(({ name, detail, icon: Icon, badge }) => <article key={name} className="clay-card rounded-3xl p-6"><span className="clay-icon flex h-11 w-11 items-center justify-center rounded-xl text-[#A14B92]"><Icon className="h-5 w-5" /></span><h2 className="mt-5 font-title text-2xl font-semibold">{name}</h2><p className="mt-2 text-sm leading-7 text-[#665D66]">{detail}</p><span className="mt-5 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#8A3D7D]">{badge}</span></article>)}</div></div>}
          {openAppointmentId && appointments.find(app => app.id === openAppointmentId) && (() => { const app = appointments.find(item => item.id === openAppointmentId)!; return <div role="dialog" aria-modal="true" aria-label="Detalle de orientación" className="fixed inset-0 z-50 flex items-center justify-center bg-[#513D49]/65 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="section-eyebrow">Detalle de orientación</p><h2 className="mt-2 font-title text-3xl font-semibold">{app.patientName}</h2><p className="mt-1 text-xs text-[#766C75]">{app.id} · {app.date} · {app.time} h</p></div><button type="button" onClick={() => setOpenAppointmentId(null)} aria-label="Cerrar detalle" className="rounded-xl border border-[#E2E7E7] p-2"><XCircle className="h-5 w-5" /></button></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#F6F8F8] p-5"><h3 className="font-semibold">Contacto</h3><p className="mt-2 text-sm">{app.email}</p><p className="text-sm">{app.phone}</p></div><div className="rounded-2xl bg-[#F6F8F8] p-5"><h3 className="font-semibold">Seguimiento</h3><p className="mt-2 text-sm">Orientación: {app.status}</p><p className="text-sm">Derivación: {app.derivationStatus ?? 'Sin derivación'}</p>{app.dentalinkAudit && <p className="mt-2 text-xs text-[#665D66]">Registrada: {app.dentalinkAudit.derivedAt}</p>}</div></div><div className="mt-4 rounded-2xl border border-[#E2E7E7] p-5"><h3 className="font-semibold">Preferencias de Confort Ambiental</h3><div className="mt-3 grid gap-2 text-sm text-[#665D66] sm:grid-cols-2"><p><strong>Ambiente:</strong> {app.comfortProfile.soundPreference === 'silencio' ? 'Silencio' : 'Música suave'}</p><p><strong>Pausas periódicas:</strong> {app.comfortProfile.jawBreaks ? 'Sí, solicitadas' : 'No indicado'}</p><p><strong>Acompañante:</strong> {app.comfortProfile.companionAllowed ? 'Sí, asistirá con acompañante' : 'No indicado'}</p><p><strong>Señal manual de pausa:</strong> {app.comfortProfile.handSignalPledge ? 'Acordada' : 'No indicado'}</p></div>{app.comfortProfile.notes && <p className="mt-3 border-t border-[#E2E7E7] pt-2 text-xs text-[#513D49]"><strong>Nota del paciente:</strong> {app.comfortProfile.notes}</p>}</div><div className="mt-4 rounded-2xl border border-[#E2E7E7] bg-[#F8EFF6]/40 p-5"><h3 className="font-semibold">Cuestionario de Perfilamiento</h3>{app.questionnaire ? <div className="mt-3 space-y-2 text-sm text-[#513D49]"><p><strong>Motivo de consulta:</strong> {app.questionnaire.reason}</p><p><strong>Percepción ante la consulta:</strong> {app.questionnaire.feeling}</p><p><strong>Experiencias previas:</strong> {app.questionnaire.previousExperience}</p><p><strong>Sensibilidad reportada:</strong> {app.questionnaire.painSensitivity}</p><p><strong>Estilo de comunicación:</strong> {app.questionnaire.communicationPreference}</p><p className="text-xs text-emerald-700 font-semibold">✓ Consentimiento informado Ley 19.628 aceptado ({app.questionnaire.createdAt})</p></div> : <p className="mt-2 text-sm leading-6 text-[#665D66]">El paciente reservó directamente sin adjuntar cuestionario adicional.</p>}</div></div></div>; })()}
          {previewPost && <div role="dialog" aria-modal="true" aria-label="Vista previa del artículo" className="fixed inset-0 z-50 flex items-center justify-center bg-[#513D49]/65 p-4"><article className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-9"><div className="flex items-start justify-between gap-4"><div><p className="section-eyebrow">Vista previa privada · {previewPost.published ? 'Publicado' : 'Borrador'}</p><h2 className="mt-3 font-title text-4xl font-semibold">{previewPost.title}</h2><p className="mt-2 text-xs text-[#766C75]">/blog/{previewPost.slug} · {previewPost.category}</p></div><button type="button" onClick={() => setPreviewPost(null)} aria-label="Cerrar vista previa" className="rounded-xl border border-[#E2E7E7] p-2"><XCircle className="h-5 w-5" /></button></div><p className="mt-7 text-sm font-semibold leading-7">{previewPost.excerpt}</p><div className="mt-5 whitespace-pre-wrap text-sm leading-8 text-[#665D66]">{previewPost.content}</div></article></div>}
        </main>
      </div>
    </div>
  );
}
