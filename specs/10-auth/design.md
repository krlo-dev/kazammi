# 10 Auth: diseño

## Enfoque

**Better Auth** con el método de correo y contraseña, configurado para hashear con **bcrypt** (`bcryptjs`). Better Auth se encarga de lo tedioso y fácil de hacer mal: tablas de usuario y sesión, cookies firmadas, expiración, rate limit. Nosotros solo elegimos el algoritmo de hash.

Se usa `bcryptjs` (JavaScript puro) y no `bcrypt` (nativo) porque el nativo necesita compilar en Windows y puede fallar en el build de Vercel. El formato del hash es el mismo.

## Piezas

| Archivo | Rol |
|---|---|
| `src/modules/auth/auth.ts` | `createAuth(db)` y `getAuth()` (instancia perezosa de `betterAuth`) |
| `src/modules/auth/password.ts` | `hashPassword` y `verifyPassword` con bcryptjs |
| `src/modules/auth/rules.ts` | Límites y esquemas zod de los formularios (los usa también el servidor) |
| `src/modules/auth/next-path.ts` | `safeNextPath()`: valida el parámetro `next` |
| `src/modules/auth/session.ts` | `getSession()`, `requireUser()`, `requireUserForApi()`, `withApiAuth()` |
| `src/modules/auth/index.ts` | API pública de servidor (`server-only`) |
| `src/modules/auth/client.ts` | `authClient` para el navegador (`createAuthClient` de `better-auth/react`) |
| `src/modules/db/schema/auth.ts` | Tablas `user`, `session`, `account`, `verification` y `rate_limit`, generadas con la CLI (`npx auth@<versión de better-auth> generate`) |
| `src/app/api/auth/[...all]/route.ts` | `export const { GET, POST } = toNextJsHandler(auth)` |
| `src/proxy.ts` | Redirección optimista a `/login` |
| `src/app/login/page.tsx` | Pantalla con "Iniciar sesión" y "Crear cuenta" (diseño en `08-ui`) |

## Configuración

```ts
// password.ts
import bcrypt from "bcryptjs";
const COST = 12;
export const hashPassword = (password: string) => bcrypt.hash(password, COST);
export const verifyPassword = ({ hash, password }: { hash: string; password: string }) =>
  bcrypt.compare(password, hash);

// auth.ts
export const auth = betterAuth({
  database: drizzleAdapter(getDb(), { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 64,
    password: { hash: hashPassword, verify: verifyPassword },
  },
  rateLimit: { enabled: true },
  plugins: [nextCookies()],
});
```

Los nombres exactos de las opciones se confirmaron contra los tipos de Better Auth 1.7.10.

### Notas de implementación

- **Instancia perezosa**: `getAuth()` crea la instancia en la primera petición. `next build` importa los route handlers, y con `betterAuth({ database: getDb() })` a nivel de módulo el build exigiría `DATABASE_URL`. Los tests usan `createAuth(testDb)` sobre PGlite.
- **Rate limit en la base** (`rateLimit: { storage: "database" }`, tabla `rate_limit`): en Vercel cada instancia vive poco y un contador en memoria se reiniciaría a cada rato. Better Auth lo activa solo en producción (AUTH-R13).
- **Reglas del servidor**: `databaseHooks.user.create.before` recorta el nombre, exige 1 a 60 caracteres (código `INVALID_NAME`) y normaliza el correo. Better Auth ya valida el largo de la contraseña.
- **`cacheComponents`**: el proyecto lo tiene activo, así que el layout de `(app)` y `/login` leen la sesión dentro de `<Suspense>`. La redirección de `requireUser()` dentro de `Suspense` llega como redirección en el stream (lado cliente); la redirección HTTP 307 la hace el proxy.

**Costo 12**: ~250 ms por hash en un servidor normal. Suficiente para frenar ataques de fuerza bruta sin que el login se sienta lento.

## Dónde queda la contraseña

Better Auth guarda el hash en la tabla `account`, con `provider_id = 'credential'`. La tabla `user` no tiene columna de contraseña. Así el esquema queda listo si algún día se agrega OAuth.

## Sesión en el servidor

```ts
export async function getSession(): Promise<Session | null>;   // auth.api.getSession({ headers: await headers() })
export async function requireUser(): Promise<User>;            // páginas y server actions: redirect("/login") si no hay sesión
export async function requireUserForApi(): Promise<User>;      // route handlers: lanza UnauthorizedError -> 401
export function withApiAuth(handler: (user, ...args) => Promise<Response>); // envuelve un route handler: 401 sin sesión
```

`UnauthorizedError` vive en `shared/errors.ts`.

El `layout.tsx` del grupo `(app)` llama a `requireUser()` y pasa `{ name, email }` al header.

## Proxy

```ts
// src/proxy.ts (middleware.ts en Next.js < 16)
export function proxy(request: NextRequest) {
  const hasSession = getSessionCookie(request);           // better-auth/cookies
  const isLogin = request.nextUrl.pathname === "/login";
  if (!hasSession && !isLogin) return redirect("/login?next=" + pathname + search);
}
export const config = {
  matcher: ["/((?!api/|_next/|brand/|favicon|icon|.*\\.(?:svg|png|webp|ico|jpg|txt|xml)$).*)"],
};
```

Solo revisa que la cookie exista; la validación real la hacen `requireUser()` y `requireUserForApi()`. Dos cambios respecto al borrador original:

- **No redirige `/login` con cookie**: con una cookie vencida, el proxy mandaría `/login` a `/` y `requireUser()` mandaría `/` de vuelta a `/login`, en bucle. La página `/login` valida la sesión de verdad (`getSession()`) y solo entonces redirige a `next` (AUTH-R10).
- **Excluye todo `/api/`**: un `fetch` a `/api/recognize` sin cookie debe recibir 401, no una redirección a una página HTML. Cada route handler protegido usa `withApiAuth` (AUTH-R9).

## Cliente

```ts
await authClient.signUp.email({ name, email, password });
await authClient.signIn.email({ email, password, callbackURL: next ?? "/" });
await authClient.signOut();
```

- Los formularios validan con zod antes de enviar (mismas reglas que el servidor).
- `next` solo acepta rutas internas (empieza con `/` y no con `//`), para evitar redirecciones abiertas.
- Los errores del servidor se traducen a mensajes en español; el de credenciales es siempre el genérico (AUTH-R6).

## Decisiones

| Decisión | Alternativa | Motivo | Requisitos |
|---|---|---|---|
| Correo y contraseña | OAuth de Google y GitHub | Sin registrar apps ni callbacks en proveedores externos | AUTH-R1, R2 |
| bcrypt (bcryptjs, costo 12) | scrypt (lo que trae Better Auth por defecto), argon2 | Pedido explícito; estándar conocido y fácil de explicar | AUTH-R3 |
| Better Auth para sesiones | Sesiones hechas a mano | Cookies, expiración y rate limit ya resueltos y probados | AUTH-R8 a R13 |
| Proxy optimista + validación en servidor | Solo proxy | El proxy no debe consultar la base en cada petición | AUTH-R8, R9 |
