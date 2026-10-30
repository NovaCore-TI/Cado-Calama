import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.invalid';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'not-configured';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  latencyMs: number;
  message: string;
}> {
  const start = performance.now();
  try {
    const { error } = await supabase.from('articulos_blog').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (!error) {
      return {
        connected: true,
        tablesReady: true,
        latencyMs,
        message: 'Contenido público disponible en Supabase',
      };
    }

    // PGRST205 means Supabase REST API is reachable and authenticated, but table hasn't been created yet
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return {
        connected: true,
        tablesReady: false,
        latencyMs,
        message: 'Conectado a Supabase API (Falta ejecutar supabase/schema.sql para persistencia en nube)',
      };
    }

    return {
      connected: true,
      tablesReady: false,
      latencyMs,
      message: `No se pudo comprobar el contenido público (${error.message})`,
    };
  } catch {
    return {
      connected: false,
      tablesReady: false,
      latencyMs: Math.round(performance.now() - start),
      message: 'No se pudo conectar con el contenido público.',
    };
  }
}
