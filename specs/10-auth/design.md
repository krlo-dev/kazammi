# 10 Auth: diseño

## Enfoque

**Better Auth** con el método de correo y contraseña, configurado para hashear con **bcrypt** (`bcryptjs`). Better Auth se encarga de lo tedioso y fácil de hacer mal: tablas de usuario y sesión, cookies firmadas, expiración, rate limit. Nosotros solo elegimos el algoritmo de hash.

Se usa `bcryptjs` (JavaScript puro) y no `bcrypt` (nativo) porque el nativo necesita compilar en Windows y puede fallar en el build de Vercel. El formato del hash es el mismo.

## Piezas

| Archivo | Rol |
|---|---|
| `src/modules/auth/auth.ts` | Instancia `betterAuth` (servidor) |
| `src/modules/auth/password.ts` | `hashPassword` y `verifyPassword` con bcryptjs |
| `src/modules/auth/session.ts` | `getSession()`, `requireUser()`, `requireUserForApi()` |
| `src/modules/auth/index.ts` | API pública de servidor (`server-only`) |
| `src/modules/auth/client.ts` | `authClient` para el navegador (`createAuthClient` de `better-auth/react`) |
| `src/modules/db/schema/auth.ts` | Tablas `user`, `session`, `account`, `verification` generadas por la CLI de Better Auth |
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

Los nombres exactos de las opciones se confirman contra la documentación de Better Auth al implementar.

**Costo 12**: ~250 ms por hash en un servidor normal. Suficiente para frenar ataques de fuerza bruta sin que el login se sienta lento.

## Dónde queda la contraseña

Better Auth guarda el hash en la tabla `account`, con `provider_id = 'credential'`. La tabla `user` no tiene columna de contraseña. Así el esquema queda listo si algún día se agrega OAuth.

## Sesión en el servidor

```ts
export async function getSession(): Promise<Session | null>;   // auth.api.getSession({ headers: await headers() })
export async function requireUser(): Promise<User>;            // páginas y server actions: redirect("/login") si no hay sesión
export async function requireUserForApi(): Promise<User>;      // route handlers: lanza UnauthorizedError -> 401
```

El `layout.tsx` del grupo `(app)` llama a `requireUser()` y pasa `{ name, email }` al header.

## Proxy

```ts
// src/proxy.ts (middleware.ts en Next.js < 16)
export function proxy(request: NextRequest) {
  const hasSession = getSessionCookie(request);           // better-auth/cookies
  const isLogin = request.nextUrl.pathname === "/login";
  if (!hasSession && !isLogin) return redirect("/login?next=" + pathname);
  if (hasSession && isLogin) return redirect("/");
}
export const config = {
  matcher: ["/((?!api/auth|api/health|_next|brand|favicon|icon|.*\\.(?:svg|png|webp|ico)$).*)"],
};
```

Solo revisa que la cookie exista; la validación real la hacen `requireUser()` y `requireUserForApi()`.

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
