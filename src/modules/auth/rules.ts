// Account rules shared by the login forms (browser) and the server. No server-only code here.
import { z } from "zod";

export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 60;
/** bcrypt only reads the first 72 bytes, so 64 characters keeps most passwords whole. */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;

/** Emails are stored trimmed and lowercased, so "Ana@X.com " and "ana@x.com" are one account. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const email = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.email({ error: "El correo no es válido" }));

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, {
    error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
  })
  .max(MAX_PASSWORD_LENGTH, {
    error: `La contraseña debe tener como máximo ${MAX_PASSWORD_LENGTH} caracteres`,
  });

export const nameSchema = z
  .string()
  .trim()
  .min(MIN_NAME_LENGTH, { error: "Escribe tu nombre" })
  .max(MAX_NAME_LENGTH, {
    error: `El nombre debe tener como máximo ${MAX_NAME_LENGTH} caracteres`,
  });

export const signUpSchema = z.object({ name: nameSchema, email, password });

/** Sign in only checks the shape: the real check is the password hash (AUTH-R6). */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Escribe tu contraseña" }),
});
