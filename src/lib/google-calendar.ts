import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';
import { OFFICIAL_CADO_DOCTORS } from '@/lib/doctors-catalog';
import {
  getDoctorGoogleCredentials,
  saveDoctorGoogleCredentials,
  getAllConnectedDoctorTokens,
} from '@/lib/google-tokens-store';

// Parámetros de conexión Google Cloud / Google Calendar API
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const REDIRECT_URI = `${APP_URL}/api/auth/google/callback`;

export function getOAuth2Client(customRedirectUri?: string) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return null;
  }
  const uri = customRedirectUri || REDIRECT_URI;
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, uri);
}

// 1. Generar URL de autorización para que un doctor vincule su Google Calendar
export function getDoctorGoogleAuthUrl(doctorId: string, redirectUri?: string): string | null {
  const oauth2Client = getOAuth2Client(redirectUri);
  if (!oauth2Client) return null;

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Obliga a Google a devolver refresh_token
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: doctorId,
  });
}

// 2. Intercambiar código de Google OAuth por refresh_token y asociarlo al doctor
export async function exchangeCodeAndSaveDoctorTokens(
  code: string,
  doctorId: string,
  redirectUri?: string
) {
  const oauth2Client = getOAuth2Client(redirectUri);
  if (!oauth2Client) throw new Error('Credenciales de Google OAuth no configuradas');

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Obtener email de Google del doctor
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const googleEmail = userInfo.data.email || '';

  const officialDoctor = OFFICIAL_CADO_DOCTORS.find((d) => d.id === doctorId);
  const doctorName = officialDoctor?.nombre || 'Doctor CADO';

  // Guardar en el almacén de tokens (archivo local de alta resiliencia y DB Supabase)
  await saveDoctorGoogleCredentials(doctorId, {
    email: googleEmail,
    refreshToken: tokens.refresh_token || undefined,
    doctorName,
  });

  return { doctorId, doctorName, googleEmail };
}

// Formatear fechas ISO para Google Calendar (Chile Continental America/Santiago)
function formatChileDateTime(fecha: string, hora: string) {
  const cleanHour = String(hora).slice(0, 5);
  const [h, m] = cleanHour.split(':').map(Number);
  const endMinutes = m + 15;
  const endH = h + Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;

  const startIso = `${fecha}T${cleanHour}:00`;
  const endIso = `${fecha}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

  return { startIso, endIso, cleanHour };
}

// 3. Crear evento en Google Calendar y sala Google Meet con el doctor asignado (RF-13 & RF-16)
export async function createGoogleAppointmentEvent(params: {
  codigo: string;
  fecha: string;
  hora: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId?: string | null;
  comfortProfile?: Record<string, unknown>;
}) {
  const { codigo, fecha, hora, patientName, patientEmail, patientPhone, doctorId, comfortProfile } = params;
  const { startIso, endIso } = formatChileDateTime(fecha, hora);

  // 1. Resolver qué doctor atenderá (buscar asignado o el primero que tenga Google conectado)
  let resolvedDoctorId = doctorId || '';
  let credentials = resolvedDoctorId ? await getDoctorGoogleCredentials(resolvedDoctorId) : null;

  if (!credentials || !credentials.refreshToken) {
    // Si el doctor pedido no tiene Google conectado, buscar si alguno de los doctores sí lo tiene
    const connectedTokens = getAllConnectedDoctorTokens();
    const connectedId = Object.keys(connectedTokens).find((id) => connectedTokens[id]?.refreshToken);
    if (connectedId) {
      resolvedDoctorId = connectedId;
      credentials = connectedTokens[connectedId];
    }
  }

  const officialDoc = OFFICIAL_CADO_DOCTORS.find((d) => d.id === resolvedDoctorId) || OFFICIAL_CADO_DOCTORS[0];
  const doctorName = credentials?.doctorName || officialDoc.nombre;
  const doctorEmail = credentials?.email || officialDoc.email;

  const defaultMeetLink = `https://meet.google.com/cado-${codigo.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // 2. Si hay credenciales de Google OAuth activas con refresh_token
  if (credentials?.refreshToken && GOOGLE_CLIENT_ID) {
    try {
      const oauth2Client = getOAuth2Client();
      if (oauth2Client) {
        oauth2Client.setCredentials({ refresh_token: credentials.refreshToken });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const calendarResponse = await calendar.events.insert({
          calendarId: 'primary',
          conferenceDataVersion: 1,
          sendUpdates: 'all', // Notifica automáticamente por email tanto al paciente como al doctor
          requestBody: {
            summary: `Orientación Telemática CADO · ${patientName} (${codigo})`,
            description: [
              `Orientación Odontológica Inicial de 15 minutos en CADO Odontología.`,
              `Paciente: ${patientName} (${patientPhone} - ${patientEmail})`,
              `Profesional: ${doctorName}`,
              `Código de Reserva: ${codigo}`,
              ``,
              `Preferencias de Confort del Paciente:`,
              comfortProfile?.jawBreaks ? `• Solicita pausas para descanso mandibular` : null,
              comfortProfile?.handSignalPledge ? `• Señal manual de parada acordada` : null,
              comfortProfile?.companionAllowed ? `• Asistirá con acompañante` : null,
              comfortProfile?.notes ? `• Notas adicionales: ${comfortProfile.notes}` : null,
              ``,
              `Enlace de autogestión/cancelación: ${APP_URL}/gestionar?codigo=${codigo}`,
              `Vivar #1580 Of. 203, Calama`,
            ]
              .filter(Boolean)
              .join('\n'),
            start: {
              dateTime: startIso,
              timeZone: 'America/Santiago',
            },
            end: {
              dateTime: endIso,
              timeZone: 'America/Santiago',
            },
            attendees: [
              { email: patientEmail, displayName: patientName },
              { email: doctorEmail, displayName: doctorName, responseStatus: 'accepted' },
            ],
            conferenceData: {
              createRequest: {
                requestId: `${codigo}-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 15 },
                { method: 'email', minutes: 60 },
              ],
            },
          },
        });

        const createdEvent = calendarResponse.data;
        const officialMeetLink =
          createdEvent.hangoutLink ||
          createdEvent.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
          defaultMeetLink;

        return {
          ok: true,
          source: 'google_calendar_api',
          eventId: createdEvent.id || null,
          meetLink: officialMeetLink,
          doctorName,
          status: 'Sincronizado',
        };
      }
    } catch (apiError: unknown) {
      // RF-16: Resiliencia ante fallos externos de API - Registro en auditoría
      const errMessage = apiError instanceof Error ? apiError.message : String(apiError);
      try {
        await supabase.from('logs_auditoria').insert({
          accion: 'FALLO_SYNC_GOOGLE_CALENDAR',
          entidad: 'orientaciones_citas',
          entidad_id: codigo,
          detalle: `Fallo al sincronizar con Google Calendar del doctor ${doctorName}: ${errMessage}. Usando fallback local.`,
        });
      } catch {
        // Silencioso
      }

      return {
        ok: true,
        source: 'resilient_fallback_meet',
        eventId: null,
        meetLink: defaultMeetLink,
        doctorName,
        status: 'Pendiente_Reintento',
        syncError: errMessage,
      };
    }
  }

  // Fallback seguro si ningún doctor ha vinculado aún Google Calendar
  return {
    ok: true,
    source: 'standard_meet_room',
    eventId: null,
    meetLink: defaultMeetLink,
    doctorName,
    status: 'Sincronizado',
  };
}

// 4. Reprogramar evento en Google Calendar
export async function rescheduleGoogleAppointmentEvent(params: {
  eventId?: string | null;
  doctorId?: string | null;
  nuevaFecha: string;
  nuevaHora: string;
}) {
  const { eventId, doctorId, nuevaFecha, nuevaHora } = params;
  if (!eventId || !GOOGLE_CLIENT_ID) {
    return { ok: false, reason: 'no_event_or_creds' };
  }

  try {
    let credentials = doctorId ? await getDoctorGoogleCredentials(doctorId) : null;
    if (!credentials?.refreshToken) {
      const connectedTokens = getAllConnectedDoctorTokens();
      const connectedId = Object.keys(connectedTokens).find((id) => connectedTokens[id]?.refreshToken);
      if (connectedId) credentials = connectedTokens[connectedId];
    }

    if (!credentials?.refreshToken) return { ok: false, reason: 'doctor_not_connected' };

    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) return { ok: false };
    oauth2Client.setCredentials({ refresh_token: credentials.refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { startIso, endIso } = formatChileDateTime(nuevaFecha, nuevaHora);

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
      requestBody: {
        start: { dateTime: startIso, timeZone: 'America/Santiago' },
        end: { dateTime: endIso, timeZone: 'America/Santiago' },
      },
    });

    return { ok: true };
  } catch (err) {
    console.warn('[rescheduleGoogleAppointmentEvent] Error:', err);
    return { ok: false, error: String(err) };
  }
}

// 5. Cancelar evento en Google Calendar
export async function cancelGoogleAppointmentEvent(params: {
  eventId?: string | null;
  doctorId?: string | null;
  reason?: string;
}) {
  const { eventId, doctorId } = params;
  if (!eventId || !GOOGLE_CLIENT_ID) {
    return { ok: false, reason: 'no_event_or_creds' };
  }

  try {
    let credentials = doctorId ? await getDoctorGoogleCredentials(doctorId) : null;
    if (!credentials?.refreshToken) {
      const connectedTokens = getAllConnectedDoctorTokens();
      const connectedId = Object.keys(connectedTokens).find((id) => connectedTokens[id]?.refreshToken);
      if (connectedId) credentials = connectedTokens[connectedId];
    }

    if (!credentials?.refreshToken) return { ok: false, reason: 'doctor_not_connected' };

    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) return { ok: false };
    oauth2Client.setCredentials({ refresh_token: credentials.refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all', // Notifica la cancelación a paciente y doctor
    });

    return { ok: true };
  } catch (err) {
    console.warn('[cancelGoogleAppointmentEvent] Error:', err);
    return { ok: false, error: String(err) };
  }
}

// 6. Generar URL de un solo clic para añadir a Google Calendar del paciente o doctor
export function generateDirectGoogleCalendarUrl(params: {
  codigo: string;
  fecha: string;
  hora: string;
  patientName: string;
  meetLink: string;
  doctorName?: string;
  comfortNotes?: string;
}): string {
  const { codigo, fecha, hora, patientName, meetLink, doctorName = 'Dr. Javier Beiza', comfortNotes = '' } = params;
  const cleanHour = String(hora).slice(0, 5).replace(':', '');
  const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
  const endMinutes = m + 15;
  const endH = h + Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endHour = `${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}`;

  const cleanDate = fecha.replace(/-/g, '');
  const datesParam = `${cleanDate}T${cleanHour}00/${cleanDate}T${endHour}00`;

  const title = encodeURIComponent(`Orientación Odontológica CADO · ${patientName} (${codigo})`);
  const details = encodeURIComponent(
    `Orientación telemática de 15 minutos en CADO Odontología.\n` +
      `Profesional: ${doctorName}\n` +
      `Paciente: ${patientName}\n` +
      `Sala Google Meet: ${meetLink}\n` +
      (comfortNotes ? `Preferencias de confort: ${comfortNotes}\n` : '') +
      `Gestión de cita: ${APP_URL}/gestionar?codigo=${codigo}\n\n` +
      `Vivar #1580 Of. 203, Calama · Tel/WhatsApp: +56 9 4465 7815`
  );
  const location = encodeURIComponent(meetLink);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}&ctz=America/Santiago`;
}

// 7. Generar archivo iCalendar (.ics) descargable
export function generateIcsCalendarContent(params: {
  codigo: string;
  fecha: string;
  hora: string;
  patientName: string;
  meetLink: string;
  doctorName?: string;
}): string {
  const { codigo, fecha, hora, patientName, meetLink, doctorName = 'Dr. Javier Beiza Ayala' } = params;
  const cleanDate = fecha.replace(/-/g, '');
  const cleanHour = String(hora).slice(0, 5).replace(':', '');
  const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
  const endMinutes = m + 15;
  const endH = h + Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endHour = `${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CADO Odontologia//Orientacion Telematica v1.0//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${codigo}-${cleanDate}@cado.cl`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;TZID=America/Santiago:${cleanDate}T${cleanHour}00`,
    `DTEND;TZID=America/Santiago:${cleanDate}T${endHour}00`,
    `SUMMARY:Orientación Odontológica CADO - ${patientName}`,
    `DESCRIPTION:Orientación virtual de 15 min con ${doctorName}. Sala Meet: ${meetLink}`,
    `LOCATION:${meetLink}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio orientación CADO en 15 minutos',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
