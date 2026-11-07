# RF-02 · Fecha de publicación del blog

Sprint 2 · CADO-39 y CADO-38.

Aplicar `supabase/migrations/20261030012410_fix_blog_publication_date.sql`
antes de desplegar este cambio. Probado en PostgreSQL embebido; aplicación remota
y verificación del despliegue pendientes.

El servidor de base de datos asigna `published_at` en la primera publicación.
Los borradores nuevos no tienen fecha de publicación. Editar, retirar o republicar
conserva esa primera fecha. El listado público ordena por publicación descendente
y desempata por ID; el panel mantiene el orden de creación de borradores.

La migración limpia las fechas iniciales de borradores anteriores a la corrección.
Las fechas de artículos ya publicados se conservan: sin otra evidencia no es
posible reconstruir cuándo se publicaron realmente. Revisar el historial editorial
antes de corregir manualmente esos artículos. No se alteran permisos de tablas.

Prueba de regresión: `node --test tests/blog_publication_date.test.mjs`.
Incluye publicación diferida, edición, retiro, republicación, fechas aportadas
por el cliente, repetición de la migración y escritura con un rol sin privilegios
de definidor. La prueba del handler comprueba el orden del listado público y privado.
