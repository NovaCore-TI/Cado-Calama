# RNF de CADO: verificación durante el desarrollo

Referencia: documentación de CADO-7 en Jira. Corte de revisión: 30/10/2026.
Sprint 5 conserva la validación final. Una implementación o prueba técnica no
sustituye aceptación con usuarios ni certifica automáticamente todo el requisito.

| RNF | Evidencia técnica disponible | Validación restante |
|---|---|---|
| 01 · LCP ≤ 2,5 s en 3/5 | Inicio publicado: 1,304; 1,111; 1,175; 1,026; 1,117 s. Cinco mediciones Lighthouse móvil con throttling simulado. | Repetir si cambia el contenido, las fuentes o el despliegue. |
| 02 · CLS ≤ 0,1 | Publicado: Inicio 0–0,038; Cuestionario 0,041; Reserva 0,005 en cargas medidas. | Verificar también interacciones y estados dinámicos. |
| 03 · 20 intentos concurrentes | Ensayo HTTP/SQL con 20 sesiones PostgreSQL observadas simultáneamente: 1 reserva y 19 conflictos; sin paciente adicional. Repetido incluyendo la nueva migración. | Mantener CI y repetir ante cambios transaccionales. |
| 04 · 5 intentos / 15 minutos | `login_limits.test.mjs`: contador persistente, bloqueo, reinicio y rechazo antes de contactar Auth. | Ensayo de acceso en hosting con cuenta de prueba. |
| 05 · 30 min de inactividad | Cookie HttpOnly/Secure/SameSite, expiración firmada, rechazo de cookie falsa/expirada y cierre: `rf17_rf18_auth.test.mjs`. Temporizador de interacción en el proveedor. | Prueba prolongada y de múltiples pestañas con sesión real. |
| 06 · 401/403 en privados | APIs publicadas sin sesión: 401. Ajuste de proxy y `private_page_status.test.mjs` para que /admin también rechace con 401/403 y ofrezca un enlace al formulario de acceso. Los fallos del servicio conservan 503. | Verificar el ajuste tras desplegar. |
| 07 · HTTPS / TLS | Publicado: HTTP 308 hacia HTTPS; TLS 1.3; HSTS `max-age=63072000; includeSubDomains; preload`. | Vigilar dominio y servicios externos al cambiar configuración. |
| 08 · Sin secretos expuestos | Sin coincidencias de secretos privados conocidos ni firmas de claves privadas en archivos rastreados y 9 paquetes JS públicos revisados. Variables privadas fuera del cliente. | Mantener escaneo; esto no es una garantía frente a cualquier patrón desconocido ni una auditoría exhaustiva del historial Git. |
| 09 · Contraste AA | Lighthouse accesibilidad 100 en Inicio, Cuestionario y Reserva publicados. | Completar contraste de todos los estados del panel y controles interactivos. Lighthouse 100 no certifica WCAG completa. |
| 10 · Texto/zoom 200 % | Detectado desbordamiento al emular reflujo de 360 a 180 CSS px. Corrección conserva tipografía y permite ajuste de texto, flex/grid y fieldset. | Validar también panel autenticado y zoom nativo en distintos navegadores. |
| 11 · Teclado | Primer Tab alcanza «Saltar al contenido principal» con contorno visible. Tests y componente Modal cubren foco. Etiqueta accesible añadida al motivo de consulta en Reserva. | Recorrido completo de todos los pasos, modales y panel con teclado y lector de pantalla. |
| 12 · 360/768/1024/1440 | Diez páginas públicas: sin desbordamiento horizontal en los cuatro anchos (40 casos). | Panel autenticado y estados completos de formularios. |
| 13 · Cuestionario: 8/10 en ≤3 min | Implementación y validaciones presentes. | Ensayo con 10 personas reales; pendiente para validación, confirmado por el equipo. |
| 14 · Reserva: 8/10 en ≤5 min | Implementación y validaciones presentes. | Ensayo con 10 personas reales; pendiente para validación. |
| 15 · Sin RUT; ≤4 datos identificatorios | `rf12_formulario_minimizado.test.mjs`: rechazo de RUT y falta de consentimiento antes de persistir. | Mantener revisión del formulario ante cambios. |
| 16 · Críticos 100 %; global ≥90 % | 68/68 pruebas de la suite aprobadas; ensayo concurrente separado aprobado; lint, TypeScript y build aprobados. | El porcentaje corresponde a la suite existente, no a cobertura total de código ni a todos los casos humanos de aceptación. |
| 17 · Calendar/Meet en ≥19/20 | Ensayo autorizado contra Google real: 20/20 reservas sincronizadas con evento y enlace Meet usando el correo de prueba indicado por el equipo. Cancelación y limpieza verificadas; sin citas, pacientes o bloques de prueba restantes. | Emisor y destinatario fueron la misma cuenta: no acredita recepción en un buzón independiente. Se ejercitó el código de integración local contra servicios reales, sin certificar el scheduler del hosting. |

## Correcciones y despliegue

- El lote de agenda espera confirmaciones y reporta resultados reales; excluye
  horarios pasados, domingos, fechas bloqueadas y citas ya ocupadas.
- La lectura clínica recorre páginas de 200 registros y nunca devuelve una lista
  truncada como si estuviera completa; conserva RLS por profesional. Existe un
  límite explícito de 20.000 registros que falla de forma visible: una futura
  interfaz de historial masivo deberá incorporar filtrado/paginación de pantalla.
- Las migraciones `20261030173551_paginate_clinical_records.sql` y
  `20261030173623_fix_blog_publication_date.sql` coinciden con el historial ya
  registrado en Supabase. La función anterior sigue disponible para compatibilidad.
- Los cambios de cliente, proxy y CSS deben publicarse para que sustituyan el
  comportamiento del despliegue anterior.

Comandos de desarrollo: `npm test`, `npm run lint`, `npm run typecheck`,
`npm run build` y `npm run test:concurrency` con una base PostgreSQL local vacía.
Los informes completos y los datos privados de fixtures permanecen fuera de Git.
