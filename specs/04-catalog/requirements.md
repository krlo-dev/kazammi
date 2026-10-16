# 04 DB y Catalog: requisitos

Esta spec cubre dos módulos: `db` (conexión, esquema completo y migraciones) y `catalog` (canciones, portadas y fingerprints).

## Historia

Como sistema de reconocimiento, necesito guardar los metadatos de las canciones, sus portadas y cientos de miles de fingerprints en PostgreSQL, y consultarlos por hash en milisegundos.

## Requisitos: `db`

| ID | Prioridad | Requisito |
|---|---|---|
| DB-R1 | M | EL SISTEMA DEBE conectarse a Neon con Drizzle y el driver `postgres` usando `DATABASE_URL`, con una sola instancia por proceso. |
| DB-R2 | M | EL SISTEMA DEBE definir **todo** el esquema (catálogo, auth y biblioteca) en `src/modules/db/schema/` y gestionarlo con migraciones versionadas en `drizzle/`. |
| DB-R3 | M | EL SISTEMA DEBE proveer una base PGlite en memoria con las migraciones aplicadas, para los tests. |
| DB-R4 | M | El módulo solo DEBE ejecutarse en el servidor o en scripts de Node. |

## Requisitos: `catalog`

| ID | Prioridad | Requisito |
|---|---|---|
| CAT-R1 | M | EL SISTEMA DEBE guardar por canción: id, ruta de origen, hash SHA-256 del archivo, título, artista, álbum, género, año, duración, si tiene portada, `fingerprintVersion` y cantidad de hashes. |
| CAT-R2 | M | EL SISTEMA DEBE guardar fingerprints como `(hash bigint, track_id, anchor_frame)` con un índice B-tree por `hash` que incluya `track_id` y `anchor_frame` (index-only scan). |
| CAT-R3 | M | EL SISTEMA DEBE guardar la portada de cada canción (webp, 512 px) en una tabla aparte y servirla por `GET /api/tracks/[id]/cover` con caché inmutable. |
| CAT-R4 | M | EL SISTEMA DEBE insertar todos los fingerprints de una canción en una sola sentencia (`unnest` de arreglos) dentro de la misma transacción que la canción. |
| CAT-R5 | M | EL SISTEMA DEBE resolver la consulta de matching en SQL: recibir pares `(hash, t)` y devolver los N mejores `(trackId, delta, count)`, un solo resultado por canción. |
| CAT-R6 | M | EL SISTEMA DEBE obtener canciones por id (para el resultado del reconocimiento y la biblioteca). |
| CAT-R7 | S | EL SISTEMA DEBE exponer estadísticas: total de canciones, total de fingerprints, versión indexada, tamaño de la tabla. |
| CAT-R8 | M | SI una canción se borra, ENTONCES sus fingerprints y portada DEBEN borrarse en cascada. |

## Criterios de aceptación

| Requisito | Prueba |
|---|---|
| CAT-R2, R4, R5 | Test de integración en PGlite: insertar 3 canciones con hashes conocidos; la consulta devuelve la correcta con el delta y conteo esperados y el segundo resultado es otra canción. |
| CAT-R2 | En la rama `dev` de Neon, `EXPLAIN ANALYZE` de la consulta muestra `Index Only Scan using fingerprints_hash_idx` y `Heap Fetches: 0` tras `VACUUM ANALYZE`. |
| CAT-R3 | La respuesta de la portada trae `Content-Type: image/webp` y `Cache-Control: public, max-age=31536000, immutable`. |
| CAT-R8 | Borrar una canción en PGlite deja 0 fingerprints y 0 portadas de ella. |
