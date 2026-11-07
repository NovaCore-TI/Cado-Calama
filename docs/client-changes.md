# Cambios solicitados por CADO

La portada presenta CADO como Centro Avanzado de Dolor Orofacial. Las instrucciones directas del cliente tienen prioridad frente a las variantes del bloque SEO del Word. La portada no tiene los dos botones anteriores; el acceso destacado a TES/SAV está en el menú y en el bloque final.

## Contenido y rutas

- `/equipo` presenta a Javier Beiza, Juan y Oscar. Los perfiles individuales están en `/equipo/dr-javier-beiza`, `/equipo/juan` y `/equipo/oscar`.
- Los nombres Juan y Oscar y el enlace de Google se recibieron del usuario. No se asignaron apellidos ni especialidades individuales no confirmadas.
- `/dolor-orofacial`, `/endodoncia-calama`, `/trastornos-ttm-bruxismo` y `/contacto` tienen contenido propio. Las rutas alternativas del Word redirigen a sus rutas canónicas.
- TES y SAV comparten `/agendar`. Los enlaces anteriores `/test-confort` y `/cuestionario` redirigen al mismo recorrido. TES contiene seis preferencias; compartir historia clínica adicional es opcional. La encuesta no obliga a reservar y sus preferencias se conservan durante la navegación de la sesión actual. Se guardan en la base al confirmar una reserva consentida.
- La dirección nueva es Vivar #1500, Oficina 205, Edificio Espacio Parque, Calama. Se actualizó también en guías, PDFs, API y textos de Calendar, incluido el contenido de la guía existente en la base. Se conservó su estado de borrador.
- La ficha proporcionada es `https://share.google/Af4IcUf6FfpfVmbTX`. El mapa incrustado busca la dirección, y los enlaces abren la ficha real del negocio.

## Testimonios

El panel incluye Testimonios: carga de imágenes PNG/JPG/WebP hasta 2 MB, vista previa, transcripción accesible, borrador, publicación, retiro y eliminación. Las imágenes se guardan en un bucket privado y la API sólo sirve públicamente imágenes de testimonios publicados. Las operaciones privadas comprueban sesión y propiedad del profesional.

La migración `create_cado_testimonials` está aplicada en el proyecto existente. `supabase/testimonials.sql` conserva el SQL de instalación: crea la tabla con RLS sin acceso directo de anon/authenticated y el bucket privado. Se usa el cliente de servidor y su credencial existente. No se han publicado reseñas ficticias ni se han copiado las de Google automáticamente.

La base estaba inicialmente INACTIVE y luego pasó a ACTIVE_HEALTHY. Se aplicaron las migraciones de testimonios y contactos públicos y se verificó la conexión de la aplicación. Una prueba real confirmó carga/descarga privada, persistencia de un borrador, exclusión pública de ese borrador y su imagen, y rechazo de acceso administrativo sin sesión. El registro y la imagen temporales fueron eliminados. No se crearon reservas ni se enviaron invitaciones de Google Calendar durante la prueba.

## Pago de SAV

Sin precio o proveedor confirmado, se ofrece consultar valor y pago por WhatsApp. No se marca ninguna reserva como pagada.

Para habilitar un enlace de pago externo, configurar en el servidor:

```text
CADO_SAV_PRICE_CLP=valor_entero_positivo
CADO_SAV_PAYMENT_URL=https://enlace-real-del-proveedor
```

El precio se informa antes de confirmar; el enlace se ofrece después de la reserva junto con su código. El enlace no recibe datos del paciente ni el token privado de gestión. Es un enlace de pago externo con verificación manual del equipo; no incluye cobro automático, webhook ni conciliación. Para automatizar el cobro hace falta definir proveedor, importe, momento de confirmación y políticas de cancelación.

## Material pendiente del cliente

- Apellidos, biografías, credenciales y especialidades de Juan y Oscar.
- Fotografías individuales y fotografía grupal; imágenes específicas de evaluación ATM y endodoncia. Se conservaron fotografías existentes y avatares tipográficos donde no hay retrato, sin inventar identidades.
- Imágenes y transcripciones de reseñas reales.
- Valor, proveedor y condiciones de pago de SAV.

Los metadatos y datos estructurados usan rutas y archivos reales. No se copiaron horarios, coordenadas, teléfonos de ejemplo ni especialidades individuales no confirmadas del JSON-LD propuesto por IA.

`NEXT_PUBLIC_SITE_URL` permite configurar el dominio público canónico. La URL de desarrollo/OAuth (`NEXT_PUBLIC_APP_URL`) ya no se usa para SEO: ejecutar en localhost no cambia los enlaces canónicos de producción.
El sitemap conserva las rutas públicas conocidas si falla la consulta de artículos, sin inventar publicaciones ni dejar inaccesible el índice completo.

## Verificación realizada

Compilación de producción, TypeScript y ESLint correctos. Las 77 pruebas automatizadas pasaron, incluyendo SQL/RLS, aislamiento de profesionales, eventos compartidos, reconexión y agrupación de actualizaciones. Se comprobaron las diez páginas principales con HTTP 200, un H1 y URL canónica pública, y las cinco redirecciones con HTTP 308. La revisión en navegador cubrió escritorio, móvil de 320 px, perfiles y transferencia de preferencias TES a SAV. La verificación de almacenamiento y borradores se realizó además contra Supabase y limpió sus datos temporales.

## Actualización sin F5

La migración `20261104234524_configure_realtime_revisions.sql` está aplicada en Supabase. La publicación `supabase_realtime` contiene únicamente `app_live_revisions`: se transmiten recurso, audiencia, profesional, revisión y fecha, sin replicar pacientes, respuestas, tokens privados, notas clínicas ni cuerpos de artículos.

- Triggers invalidan agenda, orientaciones, disponibilidad, perfil profesional, blog, guías, testimonios y FAQ. Publicar, editar, retirar, eliminar, reservar, reprogramar y cancelar provocan la actualización correspondiente.
- RLS limita los avisos privados al profesional activo propietario. Los borradores de blog y testimonios generan avisos privados, sin avisos de publicación al público. La biblioteca compartida usa avisos de personal autorizado.
- El cliente comparte un canal por audiencia/identidad y vuelve a consultar las API existentes, que conservan las comprobaciones de sesión y propiedad. No se amplió el acceso directo a tablas clínicas.
- Las ráfagas se agrupan y las peticiones se serializan; secuencias de solicitud descartan respuestas antiguas. El panel actualiza listas y estados conservando formularios, filtros y borradores sin guardar.
- Una suscripción que todavía no tiene sesión reintenta cada 5 segundos. Al conectar/reconectar, recuperar red, volver a la pestaña o enfocarla se comprueban los datos. Como respaldo se consulta cada 15 segundos la disponibilidad, cada 30 segundos el panel y listados, y cada 60 segundos FAQ y artículos individuales. Las pestañas ocultas pausan las consultas periódicas.
- La confirmación de SAV y el enlace privado de gestión actualizan fecha, hora, estado y Meet mediante su token privado. La confirmación conserva además su espera inicial de sincronización de Calendar. Los eventos públicos nunca contienen esos datos.
- El listado del blog entrega sus artículos publicados mediante SSR y después se actualiza en el cliente. Un artículo abierto también se vuelve a consultar; retirar su publicación retira su acceso público.

Se verificaron conexiones WebSocket reales con dos cuentas temporales y un cliente anónimo: entrega al propietario, exclusión del otro profesional, privacidad de borradores, aviso público de disponibilidad y payload limitado a revisiones. En el navegador, un cambio realizado por una conexión independiente apareció en el panel sin recargar y el título que se estaba escribiendo siguió intacto. Los usuarios y el borrador de prueba fueron eliminados; no se crearon reservas ni eventos de Google.

Para el panel local se debe usar `http://localhost:3000`, que coincide con `NEXT_PUBLIC_APP_URL` de este entorno. En producción esa variable debe coincidir con el origen HTTPS de la aplicación y con la URL autorizada de OAuth; se conserva la comprobación de origen de las escrituras. La base ya está configurada; el frontend requiere su despliegue habitual para llevar este código a producción.
