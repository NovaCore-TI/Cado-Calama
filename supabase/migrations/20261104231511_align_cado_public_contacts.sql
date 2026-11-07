-- Update only public contact wording; preserve guide publication and review states.
update public.preguntas_frecuentes
set respuesta = 'CADO ofrece sesiones de acercamiento virtual (SAV) de 15 minutos en horarios compatibles con jornadas laborales y turnos, además de consultas presenciales coordinadas y urgencias en Edificio Espacio Parque.'
where respuesta = 'CADO ofrece bloques de orientación virtual de 15 minutos en horario compatible con jornadas laborales y turnos, además de coordinación presencial vespertina (19:00 y 20:00 hrs) en Edificio Espacio Parque.';

update public.guias_clinicas
set contenido = replace(replace(replace(contenido::text,
  'Vivar #1580', 'Vivar #1500'), 'oficina 203', 'oficina 205'), 'Oficina 203', 'Oficina 205')::jsonb,
  descripcion = replace(replace(replace(descripcion,
  'Vivar #1580', 'Vivar #1500'), 'oficina 203', 'oficina 205'), 'Oficina 203', 'Oficina 205')
where contenido::text like '%Vivar #1580%' or descripcion like '%Vivar #1580%';
