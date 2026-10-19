# 10 Auth: tareas

- [x] **T1. Esquema de auth**
  - Generar el esquema con la CLI de Better Auth para Drizzle, moverlo a `db/schema/auth.ts` y crear la migración.
  - Generar `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) en `.env.local` (o `.env`).
  - Estado: migración `0002_auth` aplicada en la rama `dev`.
  - Commit: `feat(db): add better auth tables`

- [x] **T2. Hash con bcrypt**
  - Cubre: AUTH-R3, AUTH-R4.
  - Dependencias: `bcryptjs`.
  - Verifica: tests de `hashPassword`/`verifyPassword` (prefijo `$2`, costo 12, contraseña incorrecta falla).
  - Commit: `feat(auth): add bcrypt password hashing`

- [x] **T3. Instancia de Better Auth y route handler**
  - Cubre: AUTH-R1, AUTH-R2, AUTH-R5, AUTH-R7, AUTH-R13, AUTH-R14.
  - Dependencias: `better-auth`.
  - Commit: `feat(auth): add email and password auth with bcrypt`

- [x] **T4. Cliente y página de login mínima**
  - Cubre: AUTH-R6, AUTH-R10.
  - Formularios sin estilos de entrar y crear cuenta; el diseño final llega en `08-ui`.
  - Commit: `feat(auth): add auth client and minimal login page`

- [x] **T5. Helpers de sesión**
  - Cubre: AUTH-R9, AUTH-R11.
  - Verifica: tests de `requireUserForApi` (401) y de la validación de `next`.
  - Incluye: exigir sesión en `GET /api/tracks/[id]/cover` (hoy tiene un `TODO(10-auth)`, ver `04-catalog` T6).
  - Commit: `feat(auth): add server session helpers`

- [x] **T6. Proxy de rutas**
  - Cubre: AUTH-R8, AUTH-R10, AUTH-R12.
  - Verifica: criterios de aceptación de redirección.

## Verificación en `localhost` (build de producción + Neon `dev`)

| Criterio | Resultado |
|---|---|
| Registro crea `user` + `account` (`credential`) con hash `$2b$12$` | Sí (test de integración en PGlite) |
| Mismo correo en mayúsculas falla | 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` |
| Correo inexistente y contraseña mala: mismo mensaje | Ambos 401 `INVALID_EMAIL_OR_PASSWORD` |
| `/saved` sin sesión | 307 a `/login?next=%2Fsaved` |
| `/api/tracks/2/cover` sin sesión / con sesión | 401 / 200 `image/webp` con caché inmutable |
| `/login` con sesión | Redirige a `/` |
| Cerrar sesión | 200; la siguiente navegación a `/saved` vuelve a `/login` |
| `POST /api/recognize` sin cookie: 401 | Sí, sin consultar `fingerprints` (test del route handler en `06-recognition`) |
  - Commit: `feat(auth): redirect unauthenticated requests to login`
