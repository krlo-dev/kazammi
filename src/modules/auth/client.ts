"use client";

// Browser entry point of the auth module (the only exception to "import through index.ts").
import { createAuthClient } from "better-auth/react";

export { safeNextPath } from "./next-path";
export {
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  signInSchema,
  signUpSchema,
} from "./rules";

/** Same origin as the app, so no baseURL is needed. */
export const authClient = createAuthClient();

/** Better Auth error codes -> Spanish messages for the login screen. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    // Same text for unknown email and wrong password (AUTH-R6).
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return "Correo o contraseña incorrectos";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Ya existe una cuenta con ese correo";
    case "PASSWORD_TOO_SHORT":
      return "La contraseña debe tener al menos 8 caracteres";
    case "PASSWORD_TOO_LONG":
      return "La contraseña debe tener como máximo 64 caracteres";
    case "INVALID_EMAIL":
      return "El correo no es válido";
    case "INVALID_NAME":
      return "El nombre debe tener entre 1 y 60 caracteres";
    case "TOO_MANY_REQUESTS":
      return "Demasiados intentos. Espera un momento y vuelve a intentarlo";
    default:
      return "No se pudo completar la operación. Inténtalo de nuevo";
  }
}
