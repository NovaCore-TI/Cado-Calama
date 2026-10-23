'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, checkSupabaseConnection } from '@/lib/supabase';

export interface ComfortProfile {
  anxietyLevel: 'tranquilo' | 'nervioso' | 'fobia' | 'no_responde';
  soundPreference: 'musica_suave' | 'silencio' | 'explicacion_paso_a_paso';
  jawBreaks: boolean;
  companionAllowed: boolean;
  handSignalPledge: boolean;
  notes?: string;
}

export interface QuestionnaireSubmission {
  id: string;
  reason: string;
  feeling: string;
  previousExperience: string;
  painSensitivity: string;
  communicationPreference: string;
  consent: boolean;
  createdAt: string;
  syncedToSupabase?: boolean;
}

export interface Appointment {
  id: string;
  patientName: string;
  email: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  comfortProfile: ComfortProfile;
  questionnaire?: QuestionnaireSubmission;
  meetLink: string;
  status: 'Programada' | 'Realizada' | 'No asistió' | 'Cancelada' | 'Derivada a Dentalink';
  derivationStatus?: 'Sin derivación' | 'Pendiente presencial' | 'Derivada a Dentalink';
  dentalinkAudit?: {
    derivedAt: string;
    notes?: string;
  };
  createdAt: string;
  syncedToSupabase?: boolean;
}

export interface DoctorUser {
  id?: string;
  email?: string;
  nombre?: string;
  rol?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: 'Miedo Dental' | 'Cuidados' | 'Bruxismo' | 'Urgencias';
  author: string;
  readTime: string;
  date: string;
  published: boolean;
}

export interface SupabaseStatus {
  connected: boolean;
  tablesReady: boolean;
  latencyMs: number;
  message: string;
}

export interface CadoContextType {
  // Supabase Status
  supabaseStatus: SupabaseStatus;
  refreshSupabaseData: () => Promise<void>;

  // Appointments
  appointments: Appointment[];
  addAppointment: (app: Omit<Appointment, 'id' | 'createdAt' | 'status'> & { id?: string; createdAt?: string; skipSupabaseSync?: boolean }) => Appointment;
  updateAppointmentStatus: (id: string, status: Appointment['status'], notes?: string) => void;
  updateDerivationStatus: (id: string, status: NonNullable<Appointment['derivationStatus']>) => void;
  cancelAppointment: (id: string) => void;
  rescheduleAppointment: (id: string, newDate: string, newTime: string) => boolean;

  // Questionnaire & Comfort Profile
  activeComfortProfile: ComfortProfile;
  setActiveComfortProfile: React.Dispatch<React.SetStateAction<ComfortProfile>>;
  saveComfortPreferences: (profile: ComfortProfile) => Promise<void>;
  activeQuestionnaire: QuestionnaireSubmission | null;
  submitQuestionnaire: (data: Omit<QuestionnaireSubmission, 'id' | 'createdAt'>) => Promise<QuestionnaireSubmission>;
  questionnaires: QuestionnaireSubmission[];
  patientDraftInfo: { name: string; email: string; phone: string };
  setPatientDraftInfo: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string }>>;

  // Doctor Availability & Blocked Days
  availableSlots: string[];
  toggleSlotAvailability: (slot: string) => void;
  blockedDates: string[];
  addBlockedDate: (date: string, reason?: string) => void;
  removeBlockedDate: (date: string) => void;

  // Blog Posts
  blogPosts: BlogPost[];
  addBlogPost: (post: Omit<BlogPost, 'id' | 'date'>) => void;
  updateBlogPost: (id: string, post: Partial<BlogPost>) => void;
  deleteBlogPost: (id: string) => void;

  // Realtime WebSockets (Sincronización en vivo automática)
  realtimeConnected: boolean;
  lastRealtimeEvent: string | null;

  // Auth for Doctor (RF-17 & RF-18 con Supabase Auth)
  isDoctorLoggedIn: boolean;
  doctorUser: DoctorUser | null;
  authMethod: 'supabase' | 'demo' | null;
  loginDoctor: (email: string, pass: string) => Promise<{ ok: boolean; error?: string; locked?: boolean }>;
  logoutDoctor: () => Promise<void>;
}

function getInitialSlots(): string[] {
  const slots: string[] = [];
  const now = new Date();
  for (let d = 0; d <= 5; d++) {
    const target = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const dateStr = target.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
    slots.push(`${dateStr}|18:00`, `${dateStr}|18:15`, `${dateStr}|18:30`, `${dateStr}|19:30`);
  }
  return slots;
}

const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: 'b-seed-1',
    title: 'Cómo superar el miedo al dentista paso a paso en Calama',
    slug: 'como-superar-miedo-al-dentista-calama',
    category: 'Miedo Dental',
    excerpt: 'Descubre cómo las pausas acordadas, el control del ambiente y una orientación telemática previa ayudan a recuperar la tranquilidad antes de ir a consulta.',
    content: `Sentir ansiedad o temor antes de asistir a una consulta odontológica es mucho más común de lo que imaginas. En CADO Odontología entendemos que cada persona vive sus tiempos de manera diferente y que el respeto por tus límites es el primer paso hacia tu bienestar.\n\n1. Conversar antes de cualquier revisión clínica\nLa orientación virtual de 15 minutos te permite conocer al Dr. Javier Beiza desde la tranquilidad de tu casa, plantear tus inquietudes y acordar un plan suave antes de visitar la consulta en Edificio Espacio Parque.\n\n2. Señal de pausa respetada en todo momento\nAntes de comenzar cualquier atención presencial, acordamos un gesto simple con tu mano. Si necesitas descansar la mandíbula, respirar o hacer una pregunta, nos detenemos de inmediato.\n\n3. Tu ambiente, a tu medida\nA través de nuestro Test de Confort puedes indicarnos si prefieres escuchar música relajante, mantener silencio en el box o recibir una explicación detallada antes de cada paso.`,
    author: 'Dr. Javier Beiza Ayala',
    readTime: '3 min de lectura',
    date: '14 de octubre de 2026',
    published: true,
  },
  {
    id: 'b-seed-2',
    title: 'Bruxismo y tensión mandibular: señales de alerta y alivio inicial',
    slug: 'bruxismo-tension-mandibular-senales-alivio',
    category: 'Bruxismo',
    excerpt: '¿Despiertas con dolor en la mandíbula o sensibilidad dental? Conoce las causas frecuentes de los trastornos temporomandibulares (TTM) y qué medidas suaves puedes aplicar.',
    content: `El bruxismo y los Trastornos Temporomandibulares (TTM) suelen intensificarse en períodos de alto estrés o sistemas de turnos laborales exigentes como ocurre frecuentemente en Calama.\n\nPrincipales señales a observar:\n• Rigidez o cansancio mandibular al despertar.\n• Dolor cerca del oído al masticar o abrir la boca.\n• Desgaste dental progresivo o hipersensibilidad.\n\nMedidas iniciales de alivio en casa:\nAplicar calor local tibio durante 10 minutos, evitar alimentos excesivamente duros o chicles, y mantener los dientes ligeramente separados cuando estás en reposo ("labios juntos, dientes separados") ayudan a disminuir la sobrecarga muscular mientras agendas tu evaluación especializada.`,
    author: 'Dr. Javier Beiza Ayala',
    readTime: '4 min de lectura',
    date: '12 de octubre de 2026',
    published: true,
  },
  {
    id: 'b-seed-3',
    title: 'Cuidados esenciales después de una extracción dental (Exodoncia)',
    slug: 'cuidados-despues-de-extraccion-dental',
    category: 'Cuidados',
    excerpt: 'Guía práctica para las primeras 48 horas tras una exodoncia: alimentación, higiene segura y cuándo comunicarte con la clínica.',
    content: `Las primeras 24 a 48 horas posteriores a una extracción dental son clave para proteger el coágulo sanguíneo y asegurar una cicatrización cómoda.\n\nRecomendaciones principales:\n• Mantén la gasa presionada suavemente durante los primeros 30 a 45 minutos.\n• Evita escupir con fuerza, hacer buches intensos, usar bombillas o fumar durante las primeras 48 horas.\n• Prefiere una dieta blanda y fría o tibia durante el primer día (yogur, puré tibio, helado suave).\n• Descansa con la cabeza ligeramente elevada utilizando una almohada adicional.\n\nRecuerda que también puedes descargar nuestra Guía Clínica en PDF desde la sección de Recursos para tener estas indicaciones siempre a mano en tu teléfono.`,
    author: 'Dr. Javier Beiza Ayala',
    readTime: '3 min de lectura',
    date: '10 de octubre de 2026',
    published: true,
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'CADO-2026-842',
    patientName: 'Camila Rojas (Caso Demostración)',
    email: 'camila.rojas@ejemplo.cl',
    phone: '+56987654321',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    time: '18:15',
    comfortProfile: {
      anxietyLevel: 'nervioso',
      soundPreference: 'musica_suave',
      jawBreaks: true,
      companionAllowed: true,
      handSignalPledge: true,
      notes: 'Hace 4 años que no asisto al dentista por temor a la anestesia.',
    },
    questionnaire: {
      id: 'Q-2026-101',
      reason: 'Sensibilidad al frío en molares inferiores y dolor mandibular al despertar.',
      feeling: 'Tengo algunas inquietudes',
      previousExperience: 'Mala experiencia hace años por dolor durante un procedimiento.',
      painSensitivity: 'Alta sensibilidad; me gustaría que me avisen antes de cada paso.',
      communicationPreference: 'Explicación paso a paso con lenguaje sencillo',
      consent: true,
      createdAt: '15/10/2026, 19:20',
    },
    meetLink: 'https://meet.google.com/cado-orientacion-demo',
    status: 'Programada',
    derivationStatus: 'Sin derivación',
    createdAt: '15/10/2026, 19:22',
  },
];

const CadoContext = createContext<CadoContextType | undefined>(undefined);

export const CadoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [availableSlots, setAvailableSlots] = useState<string[]>(() => getInitialSlots());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireSubmission[]>([]);
  const [activeQuestionnaire, setActiveQuestionnaire] = useState<QuestionnaireSubmission | null>(null);

  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>({
    connected: false,
    tablesReady: false,
    latencyMs: 0,
    message: 'Verificando conexión con Supabase...',
  });

  // Active comfort profile in wizard
  const [activeComfortProfile, setActiveComfortProfile] = useState<ComfortProfile>({
    anxietyLevel: 'nervioso',
    soundPreference: 'musica_suave',
    jawBreaks: true,
    companionAllowed: true,
    handSignalPledge: true,
    notes: '',
  });

  const [patientDraftInfo, setPatientDraftInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Realtime WebSocket state
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<string | null>(null);

  // Doctor Auth state (RF-17 & RF-18)
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(false);
  const [doctorUser, setDoctorUser] = useState<DoctorUser | null>(null);
  const [authMethod, setAuthMethod] = useState<'supabase' | 'demo' | null>(null);

  // Vinculación dinámica y persistente con la tabla SQL public.doctores
  const fetchDoctorProfile = useCallback(async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<DoctorUser> => {
    const userEmail = user.email?.trim().toLowerCase() || '';
    if (!userEmail) return { id: user.id, email: '', nombre: 'Dr. Javier Beiza Ayala', rol: 'Cirujano Dentista · Director Clínico CADO' };

    // 1. Buscar si el usuario ya existe en la tabla SQL public.doctores
    try {
      const { data: dbDoctor, error: errFetch } = await supabase
        .from('doctores')
        .select('id, nombre, email, rol')
        .eq('email', userEmail)
        .maybeSingle();

      if (!errFetch && dbDoctor?.nombre) {
        return {
          id: dbDoctor.id || user.id,
          email: userEmail,
          nombre: dbDoctor.nombre,
          rol: dbDoctor.rol || 'Cirujano Dentista · Director Clínico CADO',
        };
      }
    } catch (err) {
      console.warn('[CadoContext] Error consultando doctores en DB:', err);
    }

    // 2. Determinar nombre a partir de user_metadata o correo
    const metaNombre = (user.user_metadata?.nombre || user.user_metadata?.full_name || user.user_metadata?.name) as string | undefined;
    const metaRol = (user.user_metadata?.rol || user.user_metadata?.role) as string | undefined;

    const baseName = userEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = baseName
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const nombreFinal = metaNombre || (formattedName ? `Dr. ${formattedName}` : 'Dr. Javier Beiza Ayala');
    const rolFinal = metaRol || 'Cirujano Dentista · Director Clínico CADO';

    // 3. ¡VINCULAR EN SQL! Si no existía en public.doctores, creamos el registro automáticamente en la base de datos
    try {
      const { data: insertedDoctor, error: errInsert } = await supabase
        .from('doctores')
        .upsert(
          {
            nombre: nombreFinal,
            email: userEmail,
            rol: rolFinal,
          },
          { onConflict: 'email' }
        )
        .select('id, nombre, email, rol')
        .maybeSingle();

      if (!errInsert && insertedDoctor?.nombre) {
        return {
          id: insertedDoctor.id || user.id,
          email: userEmail,
          nombre: insertedDoctor.nombre,
          rol: insertedDoctor.rol || rolFinal,
        };
      }
    } catch (err) {
      console.warn('[CadoContext] Auto-vinculación en SQL completada con fallback local:', err);
    }

    return {
      id: user.id,
      email: userEmail,
      nombre: nombreFinal,
      rol: rolFinal,
    };
  }, []);

  const refreshSupabaseData = useCallback(async () => {
    const status = await checkSupabaseConnection();
    setSupabaseStatus(status);

    if (status.tablesReady) {
      // Load blog posts from Supabase
      const { data: sbPosts } = await supabase
        .from('articulos_blog')
        .select('*')
        .order('created_at', { ascending: false });

      if (sbPosts && sbPosts.length > 0) {
        const mappedPosts: BlogPost[] = sbPosts.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          title: String(row.titulo),
          slug: String(row.slug),
          category: (row.categoria as BlogPost['category']) || 'Cuidados',
          excerpt: String(row.resumen),
          content: String(row.cuerpo),
          author: String(row.autor_nombre || 'Dr. Javier Beiza Ayala'),
          readTime: String(row.tiempo_lectura || '3 min de lectura'),
          date: row.created_at
            ? new Date(String(row.created_at)).toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Octubre 2026',
          published: Boolean(row.publicado),
        }));
        setBlogPosts(mappedPosts);
      }

      // Load appointments from Supabase (con desduplicación estricta y cuestionarios vinculados)
      const { data: sbApps } = await supabase
        .from('orientaciones_citas')
        .select('*, cuestionarios_perfilamiento (*)')
        .order('created_at', { ascending: false });

      if (sbApps && sbApps.length > 0) {
        const seenIds = new Set<string>();
        const seenSlots = new Set<string>();
        const mappedApps: Appointment[] = [];

        for (const row of sbApps as Record<string, unknown>[]) {
          const id = String(row.codigo || row.id);
          const date = String(row.fecha);
          const time = String(row.hora);
          const status = (row.estado_atencion as Appointment['status']) || 'Programada';
          const slotKey = `${date}|${time}`;

          // Desduplicar si el ID ya fue procesado
          if (seenIds.has(id)) continue;

          // Si hay más de una cita con el mismo bloque horario en estado Programada, conservar solo la más reciente
          if (status === 'Programada' && seenSlots.has(slotKey)) continue;

          seenIds.add(id);
          if (status === 'Programada') {
            seenSlots.add(slotKey);
          }

          // Mapear cuestionario de perfilamiento sensible vinculado
          let questionnaire: QuestionnaireSubmission | undefined = undefined;
          const qRow = row.cuestionarios_perfilamiento as Record<string, unknown> | null;
          if (qRow && qRow.motivo_consulta) {
            const extras = (qRow.respuestas_adicionales as Record<string, string>) || {};
            questionnaire = {
              id: String(qRow.id),
              reason: String(qRow.motivo_consulta || ''),
              feeling: String(qRow.nivel_temor || 'nervioso'),
              previousExperience: String(extras.previousExperience || 'Prefiero no responder'),
              painSensitivity: String(extras.painSensitivity || 'Estándar'),
              communicationPreference: String(extras.communicationPreference || 'Explicación paso a paso con lenguaje sencillo'),
              consent: Boolean(qRow.consentimiento_privacidad),
              createdAt: qRow.created_at
                ? new Date(String(qRow.created_at)).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                : '',
              syncedToSupabase: true,
            };
          }

          mappedApps.push({
            id,
            patientName: String(row.nombre_paciente || 'Paciente'),
            email: String(row.email_paciente || ''),
            phone: String(row.telefono_paciente || ''),
            date,
            time,
            comfortProfile: (row.preferencias_confort as ComfortProfile) || {
              anxietyLevel: 'nervioso',
              soundPreference: 'musica_suave',
              jawBreaks: true,
              companionAllowed: false,
              handSignalPledge: true,
            },
            questionnaire,
            meetLink: String(row.meet_link || 'https://meet.google.com/cado-orientacion-demo'),
            status,
            derivationStatus:
              (row.estado_derivacion as Appointment['derivationStatus']) || 'Sin derivación',
            createdAt: row.created_at
              ? new Date(String(row.created_at)).toLocaleString('es-CL', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : '',
            syncedToSupabase: true,
          });
        }

        setAppointments(mappedApps);
        try {
          localStorage.setItem('cado_demo_appointments_v3', JSON.stringify(mappedApps));
        } catch {}
      }
    }
  }, []);

  // Hydrate from localStorage & Supabase
  useEffect(() => {
    try {
      const savedApps = localStorage.getItem('cado_demo_appointments_v3');
      if (savedApps) {
        const parsed = JSON.parse(savedApps);
        if (Array.isArray(parsed) && parsed.length > 0) setAppointments(parsed);
      }

      const savedPosts = localStorage.getItem('cado_demo_blog_posts_v3');
      if (savedPosts) {
        const parsed = JSON.parse(savedPosts);
        if (Array.isArray(parsed) && parsed.length > 0) setBlogPosts(parsed);
      }

      const savedSlots = localStorage.getItem('cado_demo_slots_v3');
      if (savedSlots) {
        const parsed = JSON.parse(savedSlots);
        if (Array.isArray(parsed) && parsed.length > 0) setAvailableSlots(parsed);
      }

      const savedBlocked = localStorage.getItem('cado_demo_blocked_dates_v3');
      if (savedBlocked) setBlockedDates(JSON.parse(savedBlocked));

      const savedComfort = localStorage.getItem('cado_demo_comfort_v3');
      if (savedComfort) setActiveComfortProfile(JSON.parse(savedComfort));

      const savedQuest = localStorage.getItem('cado_demo_questionnaires_v3');
      if (savedQuest) {
        const parsed = JSON.parse(savedQuest);
        setQuestionnaires(parsed);
        if (parsed.length > 0) setActiveQuestionnaire(parsed[0]);
      }

      const savedAuth = sessionStorage.getItem('cado_demo_session_v2');
      if (savedAuth === 'true') {
        setIsDoctorLoggedIn(true);
        setDoctorUser({ id: 'demo-doctor', email: 'demo@cado.local' });
        setAuthMethod('demo');
      }
    } catch {
      // ignore storage errors
    }

async function checkSupabaseSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchDoctorProfile(session.user);
          setIsDoctorLoggedIn(true);
          setDoctorUser(profile);
          setAuthMethod('supabase');
        }
      } catch {}
    }
    void checkSupabaseSession();

    refreshSupabaseData();
  }, [refreshSupabaseData]);

  
  // =========================================================================
  // SUPABASE REALTIME (SINCRONIZACIÓN AUTOMÁTICA EN VIVO VÍA WEBSOCKETS)
  // =========================================================================
  useEffect(() => {
    const channel = supabase
      .channel('cado-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orientaciones_citas' },
        (payload) => {
          const action = payload.eventType === 'INSERT' ? 'Nueva cita recibida' : payload.eventType === 'UPDATE' ? 'Cita actualizada' : 'Cita modificada';
          const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastRealtimeEvent(`${action} (${time})`);
          void refreshSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bloques_disponibilidad' },
        (payload) => {
          const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          setLastRealtimeEvent(`Disponibilidad horaria actualizada (${time})`);
          void refreshSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'articulos_blog' },
        (payload) => {
          const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          setLastRealtimeEvent(`Artículo de blog actualizado (${time})`);
          void refreshSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cuestionarios_perfilamiento' },
        () => {
          void refreshSupabaseData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeConnected(false);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshSupabaseData]);

  // Suscripción a cambios de estado de Supabase Auth
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsDoctorLoggedIn(true);
        setDoctorUser({ id: session.user.id, email: session.user.email });
        setAuthMethod('supabase');
      } else if (event === 'SIGNED_OUT') {
        const isDemo = sessionStorage.getItem('cado_demo_session_v2');
        if (isDemo !== 'true') {
          setIsDoctorLoggedIn(false);
          setDoctorUser(null);
          setAuthMethod(null);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // RF-18: Cierre de sesión automático por 30 minutos de inactividad
  useEffect(() => {
    if (!isDoctorLoggedIn) return;

    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos

    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        void logoutDoctor();
        alert('Tu sesión ha finalizado automáticamente tras 30 minutos de inactividad para proteger los datos médicos de los pacientes (RF-18).');
      }, INACTIVITY_MS);
    };

    resetInactivity();

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetInactivity, { passive: true }));

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetInactivity));
    };
  }, [isDoctorLoggedIn]);

  const saveAppointments = (apps: Appointment[]) => {
    setAppointments(apps);
    try {
      localStorage.setItem('cado_demo_appointments_v3', JSON.stringify(apps));
    } catch {}
  };

  const saveComfortPreferences = async (profile: ComfortProfile) => {
    setActiveComfortProfile(profile);
    try {
      localStorage.setItem('cado_demo_comfort_v3', JSON.stringify(profile));
    } catch {}

    try {
      await supabase.from('preferencias_confort').insert({
        ambiente_preferido: profile.soundPreference,
        solicita_pausas: profile.jawBreaks,
        desea_acompanante: profile.companionAllowed,
        senal_pausa: profile.handSignalPledge,
        notas: profile.notes || '',
        consent_datos: true,
      });
    } catch {
      // Fallback to localStorage already done
    }
  };

  const submitQuestionnaire = async (
    data: Omit<QuestionnaireSubmission, 'id' | 'createdAt'>
  ): Promise<QuestionnaireSubmission> => {
    let synced = false;
    let generatedId = `Q-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const { data: inserted, error } = await supabase
        .from('cuestionarios_perfilamiento')
        .insert({
          motivo_consulta: data.reason,
          nivel_temor: data.feeling,
          respuestas_adicionales: {
            previousExperience: data.previousExperience,
            painSensitivity: data.painSensitivity,
            communicationPreference: data.communicationPreference,
          },
          consentimiento_privacidad: data.consent,
        })
        .select('id')
        .single();

      if (!error && inserted?.id) {
        generatedId = String(inserted.id);
        synced = true;
      }
    } catch {
      // Fallback local
    }

    const submission: QuestionnaireSubmission = {
      ...data,
      id: generatedId,
      createdAt: new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }),
      syncedToSupabase: synced,
    };

    const nextList = [submission, ...questionnaires];
    setQuestionnaires(nextList);
    setActiveQuestionnaire(submission);
    try {
      localStorage.setItem('cado_demo_questionnaires_v3', JSON.stringify(nextList));
    } catch {}

    return submission;
  };

  const addAppointment = (
    data: Omit<Appointment, 'id' | 'createdAt' | 'status'> & {
      id?: string;
      createdAt?: string;
      skipSupabaseSync?: boolean;
    }
  ): Appointment => {
    const code = data.id || `CADO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const newApp: Appointment = {
      ...data,
      id: code,
      questionnaire: data.questionnaire || activeQuestionnaire || undefined,
      meetLink: data.meetLink || `https://meet.google.com/cado-${code.toLowerCase()}`,
      status: 'Programada',
      derivationStatus: 'Sin derivación',
      createdAt: data.createdAt || new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }),
    };

    // Prevenir duplicidad en estado local por ID o por mismo horario
    setAppointments((prev) => {
      const alreadyExists = prev.some(
        (a) => a.id === newApp.id || (a.date === newApp.date && a.time === newApp.time && a.status === 'Programada')
      );
      if (alreadyExists) return prev;
      const next = [newApp, ...prev];
      try {
        localStorage.setItem('cado_demo_appointments_v3', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Quitar bloque de disponibilidad pública
    const slotKey = `${data.date}|${data.time}`;
    setAvailableSlots((prev) => {
      const next = prev.filter((s) => s !== slotKey);
      try {
        localStorage.setItem('cado_demo_slots_v3', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Si ya fue guardado en Supabase a través de /api/orientaciones, no insertar por segunda vez
    if (data.skipSupabaseSync) {
      return newApp;
    }

    // Persistencia en Supabase solo como fallback si se ejecuta localmente
    void (async () => {
      try {
        const { data: colision } = await supabase
          .from('orientaciones_citas')
          .select('id')
          .eq('fecha', newApp.date)
          .eq('hora', newApp.time)
          .eq('estado_atencion', 'Programada')
          .maybeSingle();

        if (colision) return; // Ya existe, evitar duplicación

        const { data: patientRow } = await supabase
          .from('pacientes')
          .insert({
            nombre_completo: newApp.patientName,
            email: newApp.email,
            telefono: newApp.phone,
          })
          .select('id')
          .single();

        await supabase.from('orientaciones_citas').insert({
          codigo: newApp.id,
          paciente_id: patientRow?.id || null,
          nombre_paciente: newApp.patientName,
          email_paciente: newApp.email,
          telefono_paciente: newApp.phone,
          fecha: newApp.date,
          hora: newApp.time,
          preferencias_confort: newApp.comfortProfile,
          estado_atencion: newApp.status,
          estado_derivacion: newApp.derivationStatus,
          meet_link: newApp.meetLink,
          estado_sync: 'Sincronizado',
        });
      } catch {
        // Modo local activo
      }
    })();

    return newApp;
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status'], notes?: string) => {
    const now = new Date();
    const timestampStr = `${now.toLocaleDateString('es-CL')} a las ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs`;
    const updated = appointments.map((app) => {
      if (app.id === id) {
        return {
          ...app,
          status,
          dentalinkAudit:
            status === 'Derivada a Dentalink'
              ? {
                  derivedAt: timestampStr,
                  notes: notes || 'Derivación confirmada hacia agenda oficial Dentalink CADO.',
                }
              : app.dentalinkAudit,
        };
      }
      return app;
    });
    saveAppointments(updated);

    void supabase
      .from('orientaciones_citas')
      .update({ estado_atencion: status, updated_at: new Date().toISOString() })
      .eq('codigo', id);
  };

  const cancelAppointment = (id: string) => {
    const target = appointments.find((a) => a.id === id);
    if (target) {
      // Release the slot back to availableSlots
      const slotKey = `${target.date}|${target.time}`;
      setAvailableSlots((prev) => {
        if (prev.includes(slotKey)) return prev;
        const next = [...prev, slotKey].sort();
        try {
          localStorage.setItem('cado_demo_slots_v3', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    updateAppointmentStatus(id, 'Cancelada', 'Cancelada mediante autogestión de paciente.');
  };

  const rescheduleAppointment = (id: string, newDate: string, newTime: string): boolean => {
    const target = appointments.find((a) => a.id === id);
    if (!target) return false;
    const newSlotKey = `${newDate}|${newTime}`;
    if (!availableSlots.includes(newSlotKey)) return false;

    const oldSlotKey = `${target.date}|${target.time}`;
    setAvailableSlots((prev) => {
      const withoutNew = prev.filter((s) => s !== newSlotKey);
      const restored = withoutNew.includes(oldSlotKey) ? withoutNew : [...withoutNew, oldSlotKey].sort();
      try {
        localStorage.setItem('cado_demo_slots_v3', JSON.stringify(restored));
      } catch {}
      return restored;
    });

    const updated = appointments.map((app) =>
      app.id === id ? { ...app, date: newDate, time: newTime, status: 'Programada' as const } : app
    );
    saveAppointments(updated);

    void supabase
      .from('orientaciones_citas')
      .update({ fecha: newDate, hora: newTime, updated_at: new Date().toISOString() })
      .eq('codigo', id);

    return true;
  };

  const updateDerivationStatus = (id: string, status: NonNullable<Appointment['derivationStatus']>) => {
    const derivedAt = new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
    const updated = appointments.map((app) =>
      app.id === id
        ? {
            ...app,
            derivationStatus: status,
            dentalinkAudit:
              status === 'Derivada a Dentalink'
                ? { derivedAt, notes: 'Derivación registrada con auditoría CADO.' }
                : undefined,
          }
        : app
    );
    saveAppointments(updated);

    void supabase
      .from('orientaciones_citas')
      .update({
        estado_derivacion: status,
        fecha_derivacion: status === 'Derivada a Dentalink' ? new Date().toISOString() : null,
      })
      .eq('codigo', id);
  };

  const toggleSlotAvailability = (slot: string) => {
    setAvailableSlots((prev) => {
      const next = prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot].sort();
      try {
        localStorage.setItem('cado_demo_slots_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const addBlockedDate = (date: string) => {
    setBlockedDates((prev) => {
      if (prev.includes(date)) return prev;
      const next = [...prev, date];
      try {
        localStorage.setItem('cado_demo_blocked_dates_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeBlockedDate = (date: string) => {
    setBlockedDates((prev) => {
      const next = prev.filter((d) => d !== date);
      try {
        localStorage.setItem('cado_demo_blocked_dates_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const addBlogPost = (post: Omit<BlogPost, 'id' | 'date'>) => {
    const newPost: BlogPost = {
      ...post,
      id: `b-${Date.now()}`,
      date: new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
    const updated = [newPost, ...blogPosts];
    setBlogPosts(updated);
    try {
      localStorage.setItem('cado_demo_blog_posts_v3', JSON.stringify(updated));
    } catch {}

    void supabase.from('articulos_blog').insert({
      titulo: newPost.title,
      slug: newPost.slug,
      categoria: newPost.category,
      resumen: newPost.excerpt,
      cuerpo: newPost.content,
      autor_nombre: newPost.author,
      tiempo_lectura: newPost.readTime,
      publicado: newPost.published,
      estado_publicacion: newPost.published ? 'Publicado' : 'Borrador',
    });
  };

  const updateBlogPost = (id: string, partial: Partial<BlogPost>) => {
    const updated = blogPosts.map((p) => (p.id === id ? { ...p, ...partial } : p));
    setBlogPosts(updated);
    try {
      localStorage.setItem('cado_demo_blog_posts_v3', JSON.stringify(updated));
    } catch {}

    const target = updated.find((p) => p.id === id);
    if (target) {
      void supabase
        .from('articulos_blog')
        .update({
          titulo: target.title,
          categoria: target.category,
          resumen: target.excerpt,
          cuerpo: target.content,
          publicado: target.published,
          estado_publicacion: target.published ? 'Publicado' : 'Borrador',
        })
        .eq('slug', target.slug);
    }
  };

  const deleteBlogPost = (id: string) => {
    const target = blogPosts.find((p) => p.id === id);
    const updated = blogPosts.filter((p) => p.id !== id);
    setBlogPosts(updated);
    try {
      localStorage.setItem('cado_demo_blog_posts_v3', JSON.stringify(updated));
    } catch {}

    if (target) {
      void supabase.from('articulos_blog').delete().eq('slug', target.slug);
    }
  };

  // RF-17: Autenticación con Supabase Auth y bloqueo por fuerza bruta tras 5 intentos (15 min)
  const loginDoctor = async (
    email: string,
    pass: string
  ): Promise<{ ok: boolean; error?: string; locked?: boolean }> => {
    // 1. Validar bloqueo temporal de 15 minutos si hubo 5 fallos previos
    try {
      const savedLock = localStorage.getItem('cado_auth_lockout');
      if (savedLock) {
        const { attempts, lockUntil } = JSON.parse(savedLock);
        if (lockUntil && Date.now() < lockUntil) {
          const remainingMinutes = Math.ceil((lockUntil - Date.now()) / 60000);
          return {
            ok: false,
            locked: true,
            error: `Acceso bloqueado temporalmente por motivos de seguridad tras 5 intentos fallidos (RF-17). Intente nuevamente en ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}.`,
          };
        }
      }
    } catch {}

    const cleanEmail = email.trim().toLowerCase();

    // 2. Intentar autenticación directa con Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (!error && data?.session?.user) {
        const profile = await fetchDoctorProfile(data.session.user);
        setIsDoctorLoggedIn(true);
        setDoctorUser(profile);
        setAuthMethod('supabase');
        try {
          localStorage.removeItem('cado_auth_lockout');
          sessionStorage.setItem('cado_auth_method', 'supabase');
        } catch {}
        return { ok: true };
      }
    } catch {
      // Continuar al fallback de prueba si falla la conexión de red
    }

    // 3. Fallo de autenticación en Supabase

    // 4. Registro de intento fallido (5 intentos -> bloqueo de 15 min)
    let currentAttempts = 1;
    let lockUntil = 0;
    try {
      const savedLock = localStorage.getItem('cado_auth_lockout');
      if (savedLock) {
        const parsed = JSON.parse(savedLock);
        currentAttempts = (parsed.attempts || 0) + 1;
      }
      const failedAttempts = currentAttempts;
    if (failedAttempts >= 5) {
        lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutos
      }
      localStorage.setItem(
        'cado_auth_lockout',
        JSON.stringify({ attempts: currentAttempts, lockUntil })
      );
    } catch {}

    const failedAttempts = currentAttempts;
    if (failedAttempts >= 5) {
      return {
        ok: false,
        locked: true,
        error: 'Acceso bloqueado temporalmente por motivos de seguridad tras 5 intentos fallidos consecutivos (RF-17). Intente nuevamente en 15 minutos.',
      };
    }

    return {
      ok: false,
      error: `Credenciales no válidas. Por favor verifique sus datos. (Intento ${currentAttempts} de 5 antes de bloqueo de seguridad)`,
    };
  };

  const logoutDoctor = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setIsDoctorLoggedIn(false);
    setDoctorUser(null);
    setAuthMethod(null);
    try {
      sessionStorage.removeItem('cado_demo_session_v2');
      sessionStorage.removeItem('cado_auth_method');
    } catch {}
  };

  return (
    <CadoContext.Provider
      value={{
        supabaseStatus,
        refreshSupabaseData,
        appointments,
        addAppointment,
        updateAppointmentStatus,
        updateDerivationStatus,
        cancelAppointment,
        rescheduleAppointment,
        activeComfortProfile,
        setActiveComfortProfile,
        saveComfortPreferences,
        activeQuestionnaire,
        submitQuestionnaire,
        questionnaires,
        patientDraftInfo,
        setPatientDraftInfo,
        availableSlots,
        toggleSlotAvailability,
        blockedDates,
        addBlockedDate,
        removeBlockedDate,
        blogPosts,
        addBlogPost,
        updateBlogPost,
        deleteBlogPost,
        realtimeConnected,
        lastRealtimeEvent,
        isDoctorLoggedIn,
        doctorUser,
        authMethod,
        loginDoctor,
        logoutDoctor,
      }}
    >
      {children}
    </CadoContext.Provider>
  );
};

export const useCado = () => {
  const context = useContext(CadoContext);
  if (!context) {
    throw new Error('useCado debe utilizarse dentro de un CadoProvider');
  }
  return context;
};
