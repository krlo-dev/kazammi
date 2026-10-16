# 09 Deploy: requisitos

## Historia

Como presentador, quiero abrir una URL con HTTPS en cualquier dispositivo (incluido mi celular), iniciar sesión y que la demo funcione contra el catálogo completo.

## Requisitos

| ID | Prioridad | Requisito |
|---|---|---|
| DEP-R1 | M | La app DEBE estar desplegada en Vercel conectada al repositorio de GitHub, con producción desde `main`. |
| DEP-R2 | M | CUANDO se abre un PR, Vercel DEBE crear un preview deployment. |
| DEP-R3 | M | Producción DEBE usar la rama `main` de Neon, con las migraciones aplicadas y el catálogo indexado. |
| DEP-R4 | M | Las credenciales (base y `BETTER_AUTH_SECRET`) DEBEN vivir solo en las variables de entorno de Vercel, separadas por entorno. |
| DEP-R5 | M | Las funciones de Vercel DEBEN estar en la región más cercana a la de Neon. |
| DEP-R6 | M | Crear cuenta e iniciar sesión DEBEN funcionar en el dominio de producción. |
| DEP-R7 | S | Los preview deployments DEBEN usar una rama de Neon separada para no tocar los datos de producción. |
| DEP-R8 | S | El login DEBE funcionar en los preview deployments (URL base dinámica, ver diseño). |
| DEP-R9 | M | `GET /api/health` en producción DEBE reportar la versión de fingerprint y el estado de la base. |
| DEP-R10 | C | EL SISTEMA DEBE tener un `Dockerfile` (salida `standalone` de Next.js) como alternativa de despliegue. |

## Criterios de aceptación

- La URL de producción carga en Chrome de escritorio y en el celular, se puede crear una cuenta y entrar, y el navegador permite el micrófono.
- Los criterios V-1, V-2, V-3 y V-6 de la visión se cumplen en producción.
- `curl https://<app>/api/health` devuelve `status: "ok"` y `fingerprintVersion` igual a la del código.
- El p95 de `/api/recognize` (logs de Vercel) es < 1,5 s con Neon despierto.
