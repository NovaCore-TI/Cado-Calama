export interface Doctor {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  google_email?: string | null;
  google_conectado: boolean;
  google_calendar_id?: string;
  ultimo_acceso?: string;
}

// Cuenta oficial del Dr. Javier Beiza para vinculación de Google Calendar & Meet
export const OFFICIAL_CADO_DOCTORS: Doctor[] = [
  {
    id: 'e03d11e6-6409-4149-af0d-c01de4222fa8',
    nombre: 'Dr. Javier Beiza Ayala',
    email: 'contacto@cado.cl',
    rol: 'Cirujano Dentista · Director Clínico CADO',
    google_conectado: false,
    google_calendar_id: 'primary',
  },
];
