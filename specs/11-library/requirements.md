# 11 Library: requisitos

## Historias

- Como usuario, cuando identifico una canción quiero guardarla con un toque, para encontrarla después.
- Como usuario, quiero ver todas mis canciones guardadas en una playlist general, **Guardadas**.
- Como usuario, quiero crear playlists propias (por ejemplo "Para entrenar") y agregarles canciones.

## Modelo

- **Guardadas** es la playlist general: contiene todas las canciones que el usuario guardó. No se puede renombrar ni borrar.
- Las **playlists personalizadas** se arman con canciones de Guardadas.
- Agregar una canción a una playlist personalizada **también la guarda** en Guardadas.
- Quitar una canción de Guardadas **la quita de todas** sus playlists.
- Borrar una playlist personalizada no quita sus canciones de Guardadas.

## Requisitos

| ID | Prioridad | Requisito |
|---|---|---|
| LIB-R1 | M | EL SISTEMA DEBE permitir guardar una canción identificada. Guardar una canción ya guardada no tiene efecto (idempotente). |
| LIB-R2 | M | EL SISTEMA DEBE permitir quitar una canción de Guardadas, y al hacerlo DEBE quitarla de todas las playlists del usuario. |
| LIB-R3 | M | EL SISTEMA DEBE listar Guardadas de la más reciente a la más antigua, con paginación por cursor. |
| LIB-R4 | M | EL SISTEMA DEBE indicar si una canción está en Guardadas (para el resultado del reconocimiento). |
| LIB-R5 | M | EL SISTEMA DEBE devolver las últimas 5 canciones guardadas (sección "Mis canciones" del inicio). |
| LIB-R6 | M | EL SISTEMA DEBE permitir crear una playlist con un nombre de 1 a 60 caracteres, único por usuario sin distinguir mayúsculas, y distinto de "Guardadas". |
| LIB-R7 | M | EL SISTEMA DEBE listar las playlists del usuario con cantidad de canciones y hasta 4 portadas para el mosaico. |
| LIB-R8 | M | EL SISTEMA DEBE mostrar el detalle de una playlist con sus canciones en orden de agregado. |
| LIB-R9 | M | CUANDO se agrega una canción a una playlist, EL SISTEMA DEBE guardarla también en Guardadas, en la misma transacción. |
| LIB-R10 | M | EL SISTEMA DEBE permitir quitar una canción de una playlist sin quitarla de Guardadas. |
| LIB-R11 | M | EL SISTEMA DEBE permitir borrar una playlist personalizada. |
| LIB-R12 | S | EL SISTEMA DEBE permitir renombrar una playlist personalizada. |
| LIB-R13 | M | EL SISTEMA DEBE listar las playlists del usuario indicando cuáles ya contienen una canción dada (hoja "Agregar a playlist"). |
| LIB-R14 | M | SI un usuario intenta leer o modificar una playlist ajena o inexistente, ENTONCES EL SISTEMA DEBE responder "no encontrada", sin revelar que existe. |
| LIB-R15 | M | La base de datos DEBE garantizar las reglas del modelo (claves foráneas), no solo el código. |
| LIB-R16 | S | EL SISTEMA DEBE limitar a 50 playlists por usuario y 500 canciones por playlist. |
| LIB-R17 | C | EL SISTEMA DEBE permitir reordenar las canciones de una playlist. |

## Criterios de aceptación (tests sobre PGlite)

- Guardar dos veces la misma canción deja una sola fila.
- Agregar a una playlist una canción no guardada la deja en la playlist y en Guardadas.
- Quitar de Guardadas una canción que estaba en 2 playlists la quita de las 2.
- Borrar una playlist deja sus canciones en Guardadas.
- Crear "guardadas" o un nombre repetido con otras mayúsculas falla con error de validación.
- El usuario B no puede ver, renombrar, borrar ni modificar las playlists del usuario A (error "no encontrada").
- Un `INSERT` directo en `playlist_tracks` de una canción que no está en `saved_tracks` falla por clave foránea.
