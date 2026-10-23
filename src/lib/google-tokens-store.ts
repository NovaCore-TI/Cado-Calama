import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';

export interface DoctorGoogleCredentials {
  doctorId: string;
  doctorName?: string;
  email: string;
  refreshToken: string;
  connectedAt: string;
}

// Ruta del archivo local de persistencia defensiva
const TOKENS_FILE = path.join(process.cwd(), '.google-doctor-tokens.json');

function readTokensFile(): Record<string, DoctorGoogleCredentials> {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const raw = fs.readFileSync(TOKENS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[GoogleTokensStore] Error leyendo archivo de tokens local:', e);
  }
  return {};
}

function writeTokensFile(tokens: Record<string, DoctorGoogleCredentials>) {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
  } catch (e) {
    console.warn('[GoogleTokensStore] Error guardando archivo de tokens local:', e);
  }
}

/**
 * Guarda o actualiza las credenciales de Google de un doctor tanto en Supabase como en el archivo local de fallback.
 */
export async function saveDoctorGoogleCredentials(
  doctorId: string,
  credentials: { email: string; refreshToken?: string; doctorName?: string }
): Promise<void> {
  const currentTokens = readTokensFile();
  const existing = currentTokens[doctorId] || {};

  const updatedCreds: DoctorGoogleCredentials = {
    doctorId,
    doctorName: credentials.doctorName || existing.doctorName,
    email: credentials.email,
    refreshToken: credentials.refreshToken || existing.refreshToken || '',
    connectedAt: new Date().toISOString(),
  };

  currentTokens[doctorId] = updatedCreds;
  writeTokensFile(currentTokens);

  // Intentar actualizar en Supabase si las columnas existen
  try {
    const updatePayload: Record<string, unknown> = {
      google_email: credentials.email,
      google_conectado: true,
      ultimo_acceso: new Date().toISOString(),
    };
    if (credentials.refreshToken) {
      updatePayload.google_refresh_token = credentials.refreshToken;
    }

    await supabase
      .from('doctores')
      .update(updatePayload)
      .eq('id', doctorId);
  } catch (supabaseErr) {
    console.warn(
      '[GoogleTokensStore] Supabase no tiene aún las columnas de Google OAuth, usando fallback local:',
      supabaseErr
    );
  }
}

/**
 * Obtiene el refresh_token y email de Google de un doctor (buscando en Supabase o en fallback local).
 */
export async function getDoctorGoogleCredentials(
  doctorId: string
): Promise<DoctorGoogleCredentials | null> {
  // 1. Intentar desde Supabase
  try {
    const { data } = await supabase
      .from('doctores')
      .select('*')
      .eq('id', doctorId)
      .maybeSingle();

    if (data && data.google_conectado && data.google_refresh_token) {
      return {
        doctorId: data.id,
        doctorName: data.nombre,
        email: data.google_email || data.email,
        refreshToken: data.google_refresh_token,
        connectedAt: data.ultimo_acceso || new Date().toISOString(),
      };
    }
  } catch {
    // Si falla Supabase, pasar al almacén local
  }

  // 2. Fallback a almacenamiento seguro local
  const tokens = readTokensFile();
  return tokens[doctorId] || null;
}

/**
 * Lista todos los doctores que tienen su Google Calendar conectado.
 */
export function getAllConnectedDoctorTokens(): Record<string, DoctorGoogleCredentials> {
  return readTokensFile();
}

/**
 * Desconecta la cuenta Google de un doctor.
 */
export async function removeDoctorGoogleCredentials(doctorId: string): Promise<void> {
  const tokens = readTokensFile();
  delete tokens[doctorId];
  writeTokensFile(tokens);

  try {
    await supabase
      .from('doctores')
      .update({
        google_conectado: false,
        google_refresh_token: null,
        google_email: null,
      })
      .eq('id', doctorId);
  } catch {
    // Silencioso
  }
}
