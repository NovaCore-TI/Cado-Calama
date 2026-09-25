'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ComfortProfile {
  anxietyLevel: 'tranquilo' | 'nervioso' | 'fobia' | 'no_responde';
  soundPreference: 'musica_suave' | 'silencio' | 'explicacion_paso_a_paso';
  jawBreaks: boolean;
  companionAllowed: boolean;
  handSignalPledge: boolean;
  notes?: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  email: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  comfortProfile: ComfortProfile;
  meetLink: string;
  status: 'Programada' | 'Realizada' | 'No asistió' | 'Cancelada' | 'Derivada a Dentalink';
  derivationStatus?: 'Sin derivación' | 'Pendiente presencial' | 'Derivada a Dentalink';
  dentalinkAudit?: {
    derivedAt: string;
    notes?: string;
  };
  createdAt: string;
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

export interface CadoContextType {
  // Appointments
  appointments: Appointment[];
  addAppointment: (app: Omit<Appointment, 'id' | 'createdAt' | 'status'>) => Appointment;
  updateAppointmentStatus: (id: string, status: Appointment['status'], notes?: string) => void;
  updateDerivationStatus: (id: string, status: NonNullable<Appointment['derivationStatus']>) => void;
  cancelAppointment: (id: string) => void;

  // Active / Drafting Comfort Profile for Booking
  activeComfortProfile: ComfortProfile;
  setActiveComfortProfile: React.Dispatch<React.SetStateAction<ComfortProfile>>;
  patientDraftInfo: { name: string; email: string; phone: string };
  setPatientDraftInfo: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string }>>;

  // Doctor Availability & Blocked Days
  availableSlots: string[]; // Demo blocks in YYYY-MM-DD|HH:mm format; no real calendar integration.
  toggleSlotAvailability: (slot: string) => void;
  blockedDates: string[]; // YYYY-MM-DD
  addBlockedDate: (date: string, reason?: string) => void;
  removeBlockedDate: (date: string) => void;

  // Blog Posts
  blogPosts: BlogPost[];
  addBlogPost: (post: Omit<BlogPost, 'id' | 'date'>) => void;
  updateBlogPost: (id: string, post: Partial<BlogPost>) => void;
  deleteBlogPost: (id: string) => void;

  // Auth for Doctor
  isDoctorLoggedIn: boolean;
  loginDoctor: (email: string, pass: string) => boolean;
  logoutDoctor: () => void;
}

const DEFAULT_SLOTS: string[] = [];

const INITIAL_APPOINTMENTS: Appointment[] = [];

const INITIAL_BLOG_POSTS: BlogPost[] = [];

const CadoContext = createContext<CadoContextType | undefined>(undefined);

export const CadoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [availableSlots, setAvailableSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [blockedDates, setBlockedDates] = useState<string[]>([]); // Fiestas patrias

  // Active comfort profile in wizard
  const [activeComfortProfile, setActiveComfortProfile] = useState<ComfortProfile>({
    anxietyLevel: 'nervioso',
    soundPreference: 'musica_suave',
    jawBreaks: true,
    companionAllowed: true,
    handSignalPledge: true,
    notes: ''
  });

  const [patientDraftInfo, setPatientDraftInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Doctor Auth state
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(false);

  // Hydrate from localStorage in browser
  useEffect(() => {
    try {
      const savedApps = localStorage.getItem('cado_demo_appointments_v2');
      if (savedApps) setAppointments(JSON.parse(savedApps));

      const savedPosts = localStorage.getItem('cado_demo_blog_posts_v2');
      if (savedPosts) setBlogPosts(JSON.parse(savedPosts));

      const savedSlots = localStorage.getItem('cado_demo_slots_v2');
      if (savedSlots) setAvailableSlots(JSON.parse(savedSlots));

      const savedBlocked = localStorage.getItem('cado_demo_blocked_dates_v2');
      if (savedBlocked) setBlockedDates(JSON.parse(savedBlocked));

      const savedAuth = sessionStorage.getItem('cado_demo_session_v2');
      if (savedAuth === 'true') setIsDoctorLoggedIn(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Save changes to localStorage
  const saveAppointments = (apps: Appointment[]) => {
    setAppointments(apps);
    try {
      localStorage.setItem('cado_demo_appointments_v2', JSON.stringify(apps));
    } catch {}
  };

  const addAppointment = (data: Omit<Appointment, 'id' | 'createdAt' | 'status'>): Appointment => {
    const newApp: Appointment = {
      ...data,
      id: `CADO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      status: 'Programada',
      derivationStatus: 'Sin derivación',
      createdAt: new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
    };
    const updated = [newApp, ...appointments];
    saveAppointments(updated);
    return newApp;
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status'], notes?: string) => {
    const now = new Date();
    const timestampStr = `${now.toLocaleDateString('es-CL')} a las ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs`;
    const updated = appointments.map(app => {
      if (app.id === id) {
        return {
          ...app,
          status,
          dentalinkAudit: status === 'Derivada a Dentalink' ? {
            derivedAt: timestampStr,
            notes: notes || 'Derivación confirmada hacia agenda oficial Dentalink CADO.'
          } : app.dentalinkAudit
        };
      }
      return app;
    });
    saveAppointments(updated);
  };

  const cancelAppointment = (id: string) => {
    updateAppointmentStatus(id, 'Cancelada', 'Cancelada por el paciente o solicitud telefónica.');
  };

  const updateDerivationStatus = (id: string, status: NonNullable<Appointment['derivationStatus']>) => {
    const derivedAt = new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
    const updated = appointments.map(app => app.id === id ? {
      ...app,
      derivationStatus: status,
      dentalinkAudit: status === 'Derivada a Dentalink' ? { derivedAt, notes: 'Derivación registrada en la demostración local.' } : undefined,
    } : app);
    saveAppointments(updated);
  };

  const toggleSlotAvailability = (slot: string) => {
    setAvailableSlots(prev => {
      const next = prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot].sort();
      try { localStorage.setItem('cado_demo_slots_v2', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const addBlockedDate = (date: string) => {
    setBlockedDates(prev => {
      if (prev.includes(date)) return prev;
      const next = [...prev, date];
      try { localStorage.setItem('cado_demo_blocked_dates_v2', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const removeBlockedDate = (date: string) => {
    setBlockedDates(prev => {
      const next = prev.filter(d => d !== date);
      try { localStorage.setItem('cado_demo_blocked_dates_v2', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const addBlogPost = (post: Omit<BlogPost, 'id' | 'date'>) => {
    const newPost: BlogPost = {
      ...post,
      id: `b-${Date.now()}`,
      date: new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    const updated = [newPost, ...blogPosts];
    setBlogPosts(updated);
    try { localStorage.setItem('cado_demo_blog_posts_v2', JSON.stringify(updated)); } catch {}
  };

  const updateBlogPost = (id: string, partial: Partial<BlogPost>) => {
    const updated = blogPosts.map(p => p.id === id ? { ...p, ...partial } : p);
    setBlogPosts(updated);
    try { localStorage.setItem('cado_demo_blog_posts_v2', JSON.stringify(updated)); } catch {}
  };

  const deleteBlogPost = (id: string) => {
    const updated = blogPosts.filter(p => p.id !== id);
    setBlogPosts(updated);
    try { localStorage.setItem('cado_demo_blog_posts_v2', JSON.stringify(updated)); } catch {}
  };

  const loginDoctor = (email: string, pass: string): boolean => {
    // Acceso exclusivo a la vista de demostración; no es autenticación clínica.
    if (email.trim().toLowerCase() === 'demo@cado.local' && pass === 'DEMO') {
      setIsDoctorLoggedIn(true);
      try { sessionStorage.setItem('cado_demo_session_v2', 'true'); } catch {}
      return true;
    }
    return false;
  };

  const logoutDoctor = () => {
    setIsDoctorLoggedIn(false);
    try { sessionStorage.removeItem('cado_demo_session_v2'); } catch {}
  };

  return (
    <CadoContext.Provider
      value={{
        appointments,
        addAppointment,
        updateAppointmentStatus,
        updateDerivationStatus,
        cancelAppointment,
        activeComfortProfile,
        setActiveComfortProfile,
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
        isDoctorLoggedIn,
        loginDoctor,
        logoutDoctor
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
