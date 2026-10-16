# 10 Auth: tareas

- [ ] **T1. Esquema de auth**
  - Generar el esquema con la CLI de Better Auth para Drizzle, moverlo a `db/schema/auth.ts` y crear la migración.
  - Generar `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) en `.env.local`.
  - Commit: `feat(db): add better auth tables`

- [ ] **T2. Hash con bcrypt**
  - Cubre: AUTH-R3, AUTH-R4.
  - Dependencias: `bcryptjs`.
  - Verifica: tests de `hashPassword`/`verifyPassword` (prefijo `$2`, costo 12, contraseña incorrecta falla).
  - Commit: `feat(auth): add bcrypt password hashing`

- [ ] **T3. Instancia de Better Auth y route handler**
  - Cubre: AUTH-R1, AUTH-R2, AUTH-R5, AUTH-R7, AUTH-R13, AUTH-R14.
  - Dependencias: `better-auth`.
  - Commit: `feat(auth): add email and password auth with bcrypt`

- [ ] **T4. Cliente y página de login mínima**
  - Cubre: AUTH-R6, AUTH-R10.
  - Formularios sin estilos de entrar y crear cuenta; el diseño final llega en `08-ui`.
  - Commit: `feat(auth): add auth client and minimal login page`

- [ ] **T5. Helpers de sesión**
  - Cubre: AUTH-R9, AUTH-R11.
  - Verifica: tests de `requireUserForApi` (401) y de la validación de `next`.
  - Incluye: exigir sesión en `GET /api/tracks/[id]/cover` (hoy tiene un `TODO(10-auth)`, ver `04-catalog` T6).
  - Commit: `feat(auth): add server session helpers`

- [ ] **T6. Proxy de rutas**
  - Cubre: AUTH-R8, AUTH-R10, AUTH-R12.
  - Verifica: criterios de aceptación de redirección.
  - Commit: `feat(auth): redirect unauthenticated requests to login`
