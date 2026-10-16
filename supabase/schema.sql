-- =============================================================================
-- CADO ODONTOLOGÍA - SCHEMA SQL PARA SUPABASE
-- Ejecuta este script en el SQL Editor de tu panel de Supabase
-- =============================================================================

-- 1. Tabla de Pacientes (Minimización de datos: sin RUT)
CREATE TABLE IF NOT EXISTS public.pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo varchar(150) NOT NULL,
  email varchar(150) NOT NULL,
  telefono varchar(25) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Tabla de Cuestionarios de Perfilamiento
CREATE TABLE IF NOT EXISTS public.cuestionarios_perfilamiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  motivo_consulta varchar(255) NOT NULL,
  nivel_temor varchar(50) NOT NULL,
  respuestas_adicionales jsonb DEFAULT '{}'::jsonb,
  consentimiento_privacidad boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Tabla de Preferencias de Confort
CREATE TABLE IF NOT EXISTS public.preferencias_confort (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuestionario_id uuid REFERENCES public.cuestionarios_perfilamiento(id) ON DELETE CASCADE,
  ambiente_preferido varchar(100) DEFAULT 'musica_suave',
  solicita_pausas boolean DEFAULT true,
  desea_acompanante boolean DEFAULT false,
  senal_pausa boolean DEFAULT true,
  explicacion_paso_a_paso boolean DEFAULT true,
  notas text,
  consent_datos boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. Tabla de Doctores
CREATE TABLE IF NOT EXISTS public.doctores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(120) NOT NULL,
  email varchar(150) UNIQUE NOT NULL,
  rol varchar(50) DEFAULT 'Odontólogo Titular',
  ultimo_acceso timestamptz DEFAULT now()
);

-- 5. Tabla de Bloques de Disponibilidad
CREATE TABLE IF NOT EXISTS public.bloques_disponibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL,
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  estado varchar(25) DEFAULT 'Disponible',
  created_at timestamptz DEFAULT now(),
  UNIQUE(fecha, hora_inicio)
);

-- 6. Tabla de Orientaciones / Citas Telemáticas
CREATE TABLE IF NOT EXISTS public.orientaciones_citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(40) UNIQUE NOT NULL,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE CASCADE,
  bloque_id uuid REFERENCES public.bloques_disponibilidad(id) ON DELETE SET NULL,
  cuestionario_id uuid REFERENCES public.cuestionarios_perfilamiento(id) ON DELETE SET NULL,
  nombre_paciente varchar(150) NOT NULL,
  email_paciente varchar(150) NOT NULL,
  telefono_paciente varchar(25) NOT NULL,
  fecha date NOT NULL,
  hora varchar(10) NOT NULL,
  preferencias_confort jsonb DEFAULT '{}'::jsonb,
  estado_atencion varchar(30) DEFAULT 'Programada',
  estado_derivacion varchar(35) DEFAULT 'Sin derivación',
  fecha_derivacion timestamptz,
  notas_derivacion text,
  meet_link text DEFAULT '',
  calendar_event_id varchar(150),
  token_gestion varchar(100) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  intentos_sync integer DEFAULT 0,
  estado_sync varchar(30) DEFAULT 'Pendiente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Tabla de Artículos del Blog
CREATE TABLE IF NOT EXISTS public.articulos_blog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL,
  titulo varchar(200) NOT NULL,
  slug varchar(220) UNIQUE NOT NULL,
  categoria varchar(50) NOT NULL DEFAULT 'Cuidados',
  resumen text NOT NULL,
  cuerpo text NOT NULL,
  autor_nombre varchar(120) DEFAULT 'Dr. Javier Beiza Ayala',
  tiempo_lectura varchar(40) DEFAULT '3 min de lectura',
  publicado boolean DEFAULT true,
  estado_publicacion varchar(20) DEFAULT 'Publicado',
  created_at timestamptz DEFAULT now(),
  published_at timestamptz DEFAULT now()
);

-- 8. Tabla de Preguntas Frecuentes FAQ
CREATE TABLE IF NOT EXISTS public.preguntas_frecuentes (
  id serial PRIMARY KEY,
  categoria varchar(40) NOT NULL,
  pregunta text NOT NULL,
  respuesta text NOT NULL,
  orden integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 9. Tabla de Guías Clínicas PDF
CREATE TABLE IF NOT EXISTS public.guias_clinicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo varchar(160) NOT NULL,
  categoria varchar(60) NOT NULL,
  descripcion text NOT NULL,
  url_descarga text NOT NULL,
  tamano_kb integer DEFAULT 120,
  descargas integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 10. Tabla de Logs de Auditoría
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL,
  accion varchar(100) NOT NULL,
  entidad varchar(50) NOT NULL,
  entidad_id varchar(100),
  detalle text,
  ip_origen varchar(45) DEFAULT '127.0.0.1',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS y políticas públicas de acceso para la clave publishable/anon
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuestionarios_perfilamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferencias_confort ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloques_disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orientaciones_citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articulos_blog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preguntas_frecuentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guias_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pacientes','cuestionarios_perfilamiento','preferencias_confort','doctores','bloques_disponibilidad','orientaciones_citas','articulos_blog','preguntas_frecuentes','guias_clinicas','logs_auditoria']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acceso publico demo %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Acceso publico demo %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- Datos semilla iniciales: Doctor
INSERT INTO public.doctores (nombre, email, rol)
VALUES ('Dr. Javier Beiza Ayala', 'jbeiza@cado.cl', 'Cirujano Dentista Titular - 13 años en Calama')
ON CONFLICT (email) DO NOTHING;

-- Datos semilla iniciales: Blog Educativo
INSERT INTO public.articulos_blog (titulo, slug, categoria, resumen, cuerpo, autor_nombre, tiempo_lectura, publicado)
VALUES
  (
    'Cómo superar el miedo al dentista paso a paso en Calama',
    'como-superar-miedo-al-dentista-calama',
    'Miedo Dental',
    'Descubre cómo las pausas acordadas, el control del ambiente y una orientación telemática previa ayudan a recuperar la tranquilidad antes de ir a consulta.',
    'Sentir ansiedad o temor antes de asistir a una consulta odontológica es mucho más común de lo que imaginas. En CADO Odontología entendemos que cada persona vive sus tiempos de manera diferente.\n\n1. Hablar antes de abrir la boca: La orientación virtual de 15 minutos permite conocer al Dr. Javier Beiza desde un lugar seguro antes de pisar la clínica.\n2. Señal de parada en todo momento: Acordamos un gesto con tu mano para detener cualquier procedimiento de inmediato.\n3. Ambiente adaptado a ti: Tú eliges si prefieres música suave, silencio o que te expliquemos paso a paso cada etapa.',
    'Dr. Javier Beiza Ayala',
    '3 min de lectura',
    true
  ),
  (
    'Bruxismo y tensión mandibular: señales de alerta y alivio inicial',
    'bruxismo-tension-mandibular-senales-alivio',
    'Bruxismo',
    '¿Despiertas con dolor en la mandíbula o sensibilidad dental? Conoce las causas frecuentes de los trastornos temporomandibulares (TTM) y qué medidas suaves puedes aplicar.',
    'El bruxismo y los Trastornos Temporomandibulares (TTM) suelen intensificarse en períodos de alto estrés o turnos laborales exigentes como ocurre frecuentemente en Calama.\n\nLas principales señales incluyen rigidez al despertar, dolor cerca del oído al masticar y desgaste dental progresivo. Aplicar calor local húmedo por 10 minutos, evitar alimentos excesivamente duros y realizar pausas conscientes de relajación mandibular ayudan a disminuir la sobrecarga antes de tu evaluación presencial.',
    'Dr. Javier Beiza Ayala',
    '4 min de lectura',
    true
  ),
  (
    'Cuidados esenciales después de una extracción dental (Exodoncia)',
    'cuidados-despues-de-extraccion-dental',
    'Cuidados',
    'Guía práctica para las primeras 48 horas tras una exodoncia: alimentación, higiene segura y cuándo comunicarte con la clínica.',
    'Las primeras 24 a 48 horas posteriores a una extracción dental son clave para una cicatrización cómoda y sin contratiempos.\n\n• Mantén la gasa presionada suavemente durante los primeros 30-45 minutos.\n• Evita escupir con fuerza, usar bombillas (pajitas) o fumar, ya que esto puede desalojar el coágulo protector.\n• Prefiere alimentos blandos y fríos o tibios durante el primer día.\n• Si notas sangrado abundante que no cede o dolor que aumenta después del tercer día, escríbenos por WhatsApp para orientarte.',
    'Dr. Javier Beiza Ayala',
    '3 min de lectura',
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- Datos semilla iniciales: Preguntas Frecuentes
INSERT INTO public.preguntas_frecuentes (categoria, pregunta, respuesta, orden)
VALUES
  ('miedo', '¿Puedo contar que siento miedo o fobia al dentista?', 'Sí. CADO plantea un trato respetuoso y sin juicios. El cuestionario previo de perfilamiento y el test de confort permiten adaptar el ritmo, acordar una señal de parada con la mano y preparar un ambiente tranquilo.', 1),
  ('miedo', '¿Puedo pedir pausas durante una atención?', 'Por supuesto. Puedes solicitar pausas periódicas para descansar la mandíbula y acordar una señal manual con el Dr. Javier Beiza para detener el procedimiento inmediatamente cuando lo necesites.', 2),
  ('vespertino', '¿Cómo funcionan los horarios vespertinos en Calama?', 'CADO ofrece bloques de orientación virtual de 15 minutos en horario compatible con jornadas laborales y turnos, además de coordinación presencial vespertina (19:00 y 20:00 hrs) en Edificio Espacio Parque.', 3),
  ('miedo', '¿Qué privacidad tienen mis respuestas en el cuestionario previo?', 'Tus respuestas están protegidas bajo la Ley N° 19.628 y N° 20.584. Siempre puedes elegir «Prefiero no responder» en preguntas sensibles y solo se almacenan con tu consentimiento explícito.', 4),
  ('dentalink', '¿Cómo se reserva una consulta presencial después de la orientación?', 'Tras la orientación telemática, el doctor habilita la derivación hacia la agenda oficial en Dentalink o mediante coordinación directa asistida por WhatsApp.', 5),
  ('procedimientos', '¿Qué hacer si tengo dolor dental agudo o una urgencia hoy?', 'Dirígete a nuestra sección de Urgencias Dentales donde encontrarás contacto telefónico directo de un toque (+56 9 4465 7815), WhatsApp prioritario y guías PDF de primeros auxilios.', 6);
