"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
const authClient = () => import("@/lib/supabase").then((module) => module.supabase);

export interface ComfortProfile {
  anxietyLevel: "tranquilo" | "nervioso" | "fobia" | "no_responde";
  soundPreference: "musica_suave" | "silencio" | "explicacion_paso_a_paso";
  jawBreaks: boolean;
  companionAllowed: boolean;
  handSignalPledge: boolean;
  notes?: string;
  explanationStepByStep?: boolean;
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
  syncStatus?: string;
  id: string;
  patientName: string;
  email: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  comfortProfile: ComfortProfile;
  questionnaire?: QuestionnaireSubmission;
  meetLink: string;
  status:
    | "Programada"
    | "Realizada"
    | "No asistió"
    | "Cancelada"
    | "Derivada a Dentalink";
  derivationStatus?:
    "Sin derivación" | "Pendiente presencial" | "Derivada a Dentalink";
  dentalinkAudit?: {
    derivedAt: string;
    notes?: string;
  };
  createdAt: string;
  syncedToSupabase?: boolean;
}

export interface DoctorUser {
  id: string;
  email: string;
  nombre: string;
  auth_user_id?: string;
  rol?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: "Miedo Dental" | "Cuidados" | "Bruxismo" | "Urgencias";
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
  addAppointment: (
    app: Omit<Appointment, "id" | "createdAt" | "status"> & {
      id?: string;
      createdAt?: string;
      skipSupabaseSync?: boolean;
    },
  ) => Appointment;
  updateAppointmentStatus: (
    id: string,
    status: Appointment["status"],
    notes?: string,
  ) => void;
  updateDerivationStatus: (
    id: string,
    status: NonNullable<Appointment["derivationStatus"]>,
  ) => void;
  cancelAppointment: (id: string) => void;
  rescheduleAppointment: (
    id: string,
    newDate: string,
    newTime: string,
  ) => boolean;

  // Questionnaire & Comfort Profile
  activeComfortProfile: ComfortProfile;
  setActiveComfortProfile: React.Dispatch<React.SetStateAction<ComfortProfile>>;
  saveComfortPreferences: (profile: ComfortProfile) => Promise<void>;
  activeQuestionnaire: QuestionnaireSubmission | null;
  submitQuestionnaire: (
    data: Omit<QuestionnaireSubmission, "id" | "createdAt">,
  ) => Promise<QuestionnaireSubmission>;
  questionnaires: QuestionnaireSubmission[];
  patientDraftInfo: { name: string; email: string; phone: string };
  setPatientDraftInfo: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; phone: string }>
  >;

  // Doctor Availability & Blocked Days
  availableSlots: string[];
  toggleSlotAvailability: (slot: string) => void;
  blockedDates: string[];
  addBlockedDate: (date: string, reason?: string) => void;
  removeBlockedDate: (date: string) => void;

  // Blog Posts
  blogPosts: BlogPost[];
  doctorBlogPosts: BlogPost[];
  addBlogPost: (post: Omit<BlogPost, "id" | "date">) => Promise<boolean>;
  updateBlogPost: (id: string, post: Partial<BlogPost>) => Promise<boolean>;
  deleteBlogPost: (id: string) => Promise<boolean>;

  // Realtime WebSockets (Sincronización en vivo automática)
  realtimeConnected: boolean;
  lastRealtimeEvent: string | null;

  // Auth for Doctor (RF-17 & RF-18 con Supabase Auth)
  isDoctorLoggedIn: boolean;
  doctorUser: DoctorUser | null;
  authMethod: "supabase" | null;
  loginDoctor: (
    email: string,
    pass: string,
  ) => Promise<{ ok: boolean; error?: string; locked?: boolean }>;
  logoutDoctor: () => Promise<void>;
}

const CadoContext = createContext<CadoContextType | undefined>(undefined);
type ArticleRow = {
  id: string;
  titulo: string;
  slug: string;
  resumen: string;
  cuerpo: string;
  categoria: BlogPost["category"];
  autor_nombre: string;
  tiempo_lectura: string;
  created_at: string;
  published_at: string | null;
  publicado: boolean;
};
type AppointmentRow = {
  estado_sync: string;
  codigo: string;
  nombre_paciente: string;
  email_paciente: string;
  telefono_paciente: string;
  fecha: string;
  hora: string;
  preferencias_confort: ComfortProfile;
  estado_atencion: Appointment["status"];
  estado_derivacion: Appointment["derivationStatus"];
  meet_link: string;
  created_at: string;
  fecha_derivacion?: string;
  notas_derivacion?: string;
  cuestionarios_perfilamiento?: {
    id: string;
    motivo_consulta: string;
    nivel_temor: string;
    consentimiento_privacidad: boolean;
    created_at: string;
    respuestas_adicionales?: {
      previousExperience?: string;
      painSensitivity?: string;
      communicationPreference?: string;
    };
  };
};
const defaultComfort: ComfortProfile = {
  anxietyLevel: "no_responde",
  soundPreference: "musica_suave",
  jawBreaks: true,
  companionAllowed: false,
  handSignalPledge: false,
};
async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw new Error(result.error || "No se pudo completar la operación.");
  return result;
}
export function CadoProvider({ children }: { children: React.ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [doctorBlogPosts, setDoctorBlogPosts] = useState<BlogPost[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [questionnaires, setQuestionnaires] = useState<
    QuestionnaireSubmission[]
  >([]);
  const [activeQuestionnaire, setActiveQuestionnaire] =
    useState<QuestionnaireSubmission | null>(null);
  const [activeComfortProfile, setActiveComfortProfile] =
    useState<ComfortProfile>(defaultComfort);
  const [patientDraftInfo, setPatientDraftInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(false);
  const [doctorUser, setDoctorUser] = useState<DoctorUser | null>(null);
  const [authMethod, setAuthMethod] = useState<"supabase" | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>({
    connected: false,
    tablesReady: false,
    latencyMs: 0,
    message: "Comprobando conexión…",
  });
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastRealtimeEvent] = useState<string | null>(null);
  const authorized = useRef(false);
  const privateVersion = useRef(0);
  const activeDoctor = useRef<string | null>(null);
  const activeAuthUser = useRef<string | null>(null);
  const clearPrivate = useCallback(() => {
    privateVersion.current += 1;
    activeDoctor.current = null;
    activeAuthUser.current = null;
    authorized.current = false;
    setAppointments([]);
    setDoctorBlogPosts([]);
    setAvailableSlots([]);
    setBlockedDates([]);
    setQuestionnaires([]);
    setActiveQuestionnaire(null);
    setDoctorUser(null);
    setIsDoctorLoggedIn(false);
    setAuthMethod(null);
    setRealtimeConnected(false);
    setPatientDraftInfo({ name: "", email: "", phone: "" });
    setActiveComfortProfile(defaultComfort);
  }, []);
  const acceptDoctor = useCallback(
    (doctor: DoctorUser) => {
      if (!doctor?.id) throw new Error("Perfil profesional no disponible.");
      if (activeDoctor.current !== doctor.id) clearPrivate();
      activeDoctor.current = doctor.id;
      activeAuthUser.current = doctor.auth_user_id || null;
      authorized.current = true;
      setDoctorUser(doctor);
      setIsDoctorLoggedIn(true);
      setAuthMethod("supabase");
    },
    [clearPrivate],
  );
  const refreshSupabaseData = useCallback(async () => {
    const version = privateVersion.current;
    const isAuth = authorized.current;
    const current = () => version === privateVersion.current;
    const started = performance.now();
    const publicTask = Promise.all([
      api("/api/blog"),
      api(isAuth ? "/api/bloques?admin=1" : "/api/bloques"),
    ]);
    const privateTask = isAuth
      ? Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }).catch(() => null),
          api("/api/orientaciones").then(
            (r) => ({ ok: true as const, data: r.data }),
            () => ({ ok: false as const, data: null }),
          ),
          api("/api/blog?admin=1").then(
            (r) => r.data as ArticleRow[],
            () => null,
          ),
        ])
      : null;
    try {
      const [result, blocks] = await publicTask;
      if (!current()) return;
      setSupabaseStatus({ connected: true, tablesReady: true, latencyMs: Math.round(performance.now() - started), message: "Contenido disponible." });
      setBlogPosts(
        result.data.map((r: Record<string, unknown>) => ({
          id: String(r.id),
          title: String(r.titulo),
          slug: String(r.slug),
          excerpt: String(r.resumen),
          content: String(r.cuerpo),
          category: r.categoria,
          author: String(r.autor_nombre || ""),
          readTime: String(r.tiempo_lectura || ""),
          date: String(r.published_at || ""),
          published: Boolean(r.publicado),
        })),
      );
      if (authorized.current && blocks.blockedDates)
        setBlockedDates(blocks.blockedDates);
      setAvailableSlots(
        blocks.slots.map((r: { slotKey: string }) => r.slotKey),
      );
    } catch {
      if (!current()) return;
      setAvailableSlots([]);
      setSupabaseStatus({ connected: false, tablesReady: false, latencyMs: Math.round(performance.now() - started), message: "No se pudieron cargar los datos." });
    }
    if (!privateTask || !authorized.current) {
      setAppointments([]);
      return;
    }
    const [session, orientacionesResult, posts] = await privateTask;
    if (!current()) return;
    if (!session || !session.ok) {
      clearPrivate();
      return;
    }
    const profile = (await session.json()).doctor as DoctorUser;
    if (!current()) return;
    if (profile.id !== activeDoctor.current) {
      clearPrivate();
      return;
    }
    setDoctorUser(profile);
    if (!orientacionesResult.ok) {
      setSupabaseStatus((s) => ({
        ...s,
        message: "No se pudieron cargar las orientaciones.",
      }));
      return;
    }
    const rows = orientacionesResult.data;
    if (!current() || !authorized.current) return;
    const mappedAppointments: Appointment[] = (rows || []).map(
      (r: AppointmentRow) => {
        const q = r.cuestionarios_perfilamiento;
        const extra = q?.respuestas_adicionales || {};
        return {
          id: r.codigo,
          patientName: r.nombre_paciente,
          email: r.email_paciente,
          phone: r.telefono_paciente,
          date: r.fecha,
          time: String(r.hora).slice(0, 5),
          comfortProfile: r.preferencias_confort || defaultComfort,
          status: r.estado_atencion,
          derivationStatus: r.estado_derivacion,
          meetLink: r.meet_link || "",
          createdAt: r.created_at,
          syncedToSupabase: true,
          syncStatus: r.estado_sync,
          dentalinkAudit: r.fecha_derivacion
            ? { derivedAt: r.fecha_derivacion, notes: r.notas_derivacion || "" }
            : undefined,
          questionnaire: q
            ? {
                id: q.id,
                reason: q.motivo_consulta,
                feeling: q.nivel_temor,
                previousExperience: extra.previousExperience || "",
                painSensitivity: extra.painSensitivity || "",
                communicationPreference: extra.communicationPreference || "",
                consent: q.consentimiento_privacidad,
                createdAt: q.created_at,
              }
            : undefined,
        };
      },
    );
    setAppointments(mappedAppointments);
    setQuestionnaires(
      mappedAppointments.flatMap((a) =>
        a.questionnaire ? [a.questionnaire] : [],
      ),
    );
    // Drafts are visible only to the verified professional.
    if (current() && authorized.current && posts)
      setDoctorBlogPosts(
        posts.map((r: ArticleRow) => ({
          id: r.id,
          title: r.titulo,
          slug: r.slug,
          excerpt: r.resumen,
          content: r.cuerpo,
          category: r.categoria,
          author: r.autor_nombre,
          readTime: r.tiempo_lectura,
          date: r.published_at || r.created_at,
          published: r.publicado,
        })),
      );
  }, [clearPrivate]);
  useEffect(() => {
    for (const key of [
      "cado_demo_appointments_v3",
      "cado_demo_questionnaires_v3",
      "cado_demo_comfort_v3",
      "cado_demo_slots_v3",
      "cado_demo_blocked_dates_v3",
      "cado_demo_blog_posts_v3",
      "cado_auth_lockout",
    ]) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
    try {
      sessionStorage.removeItem("cado_demo_session_v2");
    } catch {}
    let active = true;
    const path =
      typeof window !== "undefined" ? window.location.pathname : "";
    if (path === "/admin/login") {
      return () => {
        active = false;
      };
    }
    if (path.startsWith("/admin")) {
      void api("/api/auth/session")
        .then((r) => {
          if (active) acceptDoctor(r.doctor);
        })
        .catch(() => {})
        .finally(() => {
          if (active) void refreshSupabaseData();
        });
    } else {
      void refreshSupabaseData();
      void api("/api/auth/session")
        .then((r) => {
          if (active) {
            acceptDoctor(r.doctor);
            void refreshSupabaseData();
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [refreshSupabaseData, acceptDoctor]);
  useEffect(() => {
    const refresh = () => {
      const version = privateVersion.current;
      void api(authorized.current ? "/api/bloques?admin=1" : "/api/bloques")
        .then((r) => {
          if (version !== privateVersion.current) return;
          setAvailableSlots(
            r.slots.map((slot: { slotKey: string }) => slot.slotKey),
          );
          if (authorized.current) setBlockedDates(r.blockedDates || []);
        })
        .catch(() => {
          if (version === privateVersion.current) setAvailableSlots([]);
        });
    };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const logoutDoctor = useCallback(async () => {
    clearPrivate();
    await Promise.allSettled([
      fetch("/api/auth/session", { method: "DELETE" }),
      authClient().then((client) => client.auth.signOut()),
    ]);
    if (window.location.pathname.startsWith("/admin"))
      window.location.assign("/admin/login");
  }, [clearPrivate]);
  useEffect(() => {
    if (!isDoctorLoggedIn) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void authClient().then((client) => {
      if (cancelled) return;
      const { data } = client.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_OUT" ||
        (authorized.current &&
          session?.user.id &&
          activeAuthUser.current &&
          session.user.id !== activeAuthUser.current)
      ) {
        clearPrivate();
        void fetch("/api/auth/session", { method: "DELETE" });
      }
    });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [clearPrivate, isDoctorLoggedIn]);
  useEffect(() => {
    if (!isDoctorLoggedIn) return;
    let timer: ReturnType<typeof setTimeout>;
    let lastRenewal = Date.now();
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          void logoutDoctor();
        },
        30 * 60 * 1000,
      );
      if (Date.now() - lastRenewal > 60_000) {
        lastRenewal = Date.now();
        void authClient()
          .then((client) => client.auth.getSession())
          .then(async ({ data }) => {
            if (!data.session) return logoutDoctor();
            const result = await fetch("/api/auth/session", {
              method: "POST",
              headers: { Authorization: "Bearer " + data.session.access_token },
            });
            if (!result.ok) await logoutDoctor();
          })
          .catch(() => {
            void logoutDoctor();
          });
      }
    };
    reset();
    const events = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [isDoctorLoggedIn, logoutDoctor]);
  useEffect(() => {
    if (!isDoctorLoggedIn) return;
    const timer = setInterval(() => {
      void refreshSupabaseData().catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [isDoctorLoggedIn, refreshSupabaseData]);
  const loginDoctor: CadoContextType["loginDoctor"] = async (email, pass) => {
    clearPrivate();
    try {
      const [result, client] = await Promise.all([
        api("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass }),
        }),
        authClient(),
      ]);
      const stored = await client.auth.setSession(result.session);
      if (stored.error) throw Error("No se pudo guardar la sesión de acceso.");
      acceptDoctor(result.doctor);
      await refreshSupabaseData();
      return { ok: true };
    } catch (error) {
      await Promise.allSettled([
        fetch("/api/auth/session", { method: "DELETE" }),
        authClient().then((client) => client.auth.signOut()),
      ]);
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo verificar el acceso.",
      };
    }
  };
  const submitQuestionnaire: CadoContextType["submitQuestionnaire"] = async (
    data,
  ) => {
    const r = await api("/api/cuestionario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const submission = {
      ...data,
      id: r.data.id,
      createdAt: r.data.created_at,
      syncedToSupabase: true,
    };
    setActiveQuestionnaire(submission);
    return submission;
  };
  const saveComfortPreferences = async (profile: ComfortProfile) => {
    setActiveComfortProfile(profile);
  };
  const addAppointment: CadoContextType["addAppointment"] = (data) => {
    // Only adopt a confirmed server response; there is no local booking fallback.
    if (!data.id || !data.skipSupabaseSync)
      throw new Error("La reserva debe confirmarse en el servidor.");
    const app: Appointment = {
      ...data,
      id: data.id,
      createdAt: data.createdAt || new Date().toISOString(),
      status: "Programada",
      syncedToSupabase: true,
    };
    setActiveQuestionnaire(null);
    setPatientDraftInfo({ name: "", email: "", phone: "" });
    setActiveComfortProfile(defaultComfort);
    // A public booking can belong to a different doctor. Only the private API
    // may populate the professional appointment collection.
    void refreshSupabaseData();
    return app;
  };
  const mutate = async (operation: () => Promise<void>): Promise<boolean> => {
    const version = privateVersion.current;
    try {
      await operation();
      if (version !== privateVersion.current) return false;
      await refreshSupabaseData();
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar el cambio.";
      setSupabaseStatus((s) => ({ ...s, message }));
      window.alert(message);
      return false;
    }
  };
  const updateAppointmentStatus: CadoContextType["updateAppointmentStatus"] = (
    id,
    status,
  ) =>
    mutate(async () => {
      await api("/api/orientaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: id,
          action: "estado",
          nuevoEstado: status,
        }),
      });
    });
  const updateDerivationStatus: CadoContextType["updateDerivationStatus"] = (
    id,
    status,
  ) =>
    mutate(async () => {
      await api("/api/orientaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: id,
          action: "derivacion",
          nuevoEstado: status,
        }),
      });
    });
  const cancelAppointment = (id: string) =>
    updateAppointmentStatus(id, "Cancelada");
  const rescheduleAppointment: CadoContextType["rescheduleAppointment"] = (
    id,
    date,
    time,
  ) => {
    mutate(async () => {
      await api("/api/orientaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: id,
          action: "reprogramar",
          nuevaFecha: date,
          nuevaHora: time,
        }),
      });
    });
    return false;
  };
  const toggleSlotAvailability = (slot: string) =>
    mutate(async () => {
      const [fecha, horaInicio] = slot.split("|");
      await api("/api/bloques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          horaInicio,
          estado: availableSlots.includes(slot) ? "Bloqueado" : "Disponible",
        }),
      });
    });
  const addBlockedDate = (date: string) => {
    mutate(async () => {
      await api("/api/bloques", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: date, bloqueada: true }),
      });
    });
  };
  const removeBlockedDate = (date: string) => {
    mutate(async () => {
      await api("/api/bloques", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: date, bloqueada: false }),
      });
    });
  };
  const addBlogPost: CadoContextType["addBlogPost"] = (post) =>
    mutate(async () => {
      await api("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: post.title,
          categoria: post.category,
          resumen: post.excerpt,
          cuerpo: post.content,
          publicado: post.published,
          slug: post.slug,
        }),
      });
    });
  const updateBlogPost: CadoContextType["updateBlogPost"] = (id, partial) =>
    mutate(async () => {
      const post = { ...doctorBlogPosts.find((p) => p.id === id), ...partial };
      await api("/api/blog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          titulo: post.title,
          slug: post.slug,
          resumen: post.excerpt,
          cuerpo: post.content,
          categoria: post.category,
          publicado: post.published,
        }),
      });
    });
  const deleteBlogPost = (id: string) =>
    mutate(async () => {
      await api("/api/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    });
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
        doctorBlogPosts,
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
}
export function useCado() {
  const context = useContext(CadoContext);
  if (!context) throw new Error("CadoProvider requerido");
  return context;
}
