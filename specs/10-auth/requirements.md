# 10 Auth: requisitos

## Historias

- Como usuario nuevo, quiero crear una cuenta con mi nombre, correo y contraseña, y entrar de una vez a identificar canciones.
- Como usuario, quiero que mis canciones guardadas y mis playlists sean solo mías y sigan ahí la próxima vez que entre.

## Requisitos

| ID | Prioridad | Requisito |
|---|---|---|
| AUTH-R1 | M | EL SISTEMA DEBE permitir **crear una cuenta** con nombre (1 a 60 caracteres), correo y contraseña. |
| AUTH-R2 | M | EL SISTEMA DEBE permitir **iniciar sesión** con correo y contraseña. |
| AUTH-R3 | M | Las contraseñas DEBEN guardarse solo como hash **bcrypt** con factor de costo 12. Nunca en texto plano ni en logs. |
| AUTH-R4 | M | La contraseña DEBE tener entre 8 y 64 caracteres (bcrypt solo procesa los primeros 72 bytes). |
| AUTH-R5 | M | SI el correo ya está registrado, ENTONCES el registro DEBE fallar con un mensaje claro. El correo se guarda en minúsculas y sin espacios. |
| AUTH-R6 | M | SI el correo o la contraseña son incorrectos, ENTONCES EL SISTEMA DEBE responder con un mensaje genérico ("Correo o contraseña incorrectos"), sin revelar cuál falló. |
| AUTH-R7 | M | CUANDO el registro es exitoso, EL SISTEMA DEBE iniciar la sesión automáticamente y llevar a `/`. |
| AUTH-R8 | M | SI una petición a una página de la app llega sin cookie de sesión, ENTONCES EL SISTEMA DEBE redirigir a `/login` conservando la ruta de destino. |
| AUTH-R9 | M | Toda página del grupo `(app)`, toda server action y `POST /api/recognize` DEBEN validar la sesión en el servidor (la redirección del proxy es solo optimista). |
| AUTH-R10 | M | CUANDO un usuario con sesión abre `/login`, EL SISTEMA DEBE redirigirlo a `/`. |
| AUTH-R11 | M | EL SISTEMA DEBE permitir cerrar sesión desde el menú de perfil. |
| AUTH-R12 | M | Las rutas `/login`, `/api/auth/*`, `/api/health` y los recursos estáticos DEBEN ser públicos. |
| AUTH-R13 | M | EL SISTEMA DEBE limitar los intentos de inicio de sesión y registro por IP (rate limit) en producción. |
| AUTH-R14 | M | `BETTER_AUTH_SECRET` DEBE vivir solo en variables de entorno. |
| AUTH-R15 | W | Verificación de correo y recuperación de contraseña (requieren un servicio de envío de correos). Fuera de v1. |

## Criterios de aceptación

- Registrarse crea una fila en `user` y otra en `account` (proveedor `credential`) cuya contraseña empieza por `$2a$12$` o `$2b$12$`.
- Registrar dos veces el mismo correo (aunque cambien las mayúsculas) falla la segunda vez.
- Un correo inexistente y una contraseña incorrecta producen exactamente el mismo mensaje.
- Abrir `/saved` sin sesión redirige a `/login?next=/saved`; tras entrar vuelve a `/saved`.
- Un `fetch` a `/api/recognize` sin cookie responde 401.
- Cerrar sesión borra la cookie y la siguiente navegación lleva a `/login`.
