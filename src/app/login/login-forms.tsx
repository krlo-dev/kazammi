"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  authClient,
  authErrorMessage,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  signInSchema,
  signUpSchema,
} from "@/modules/auth/client";

type Mode = "sign-in" | "sign-up";

/** Validates with the same rules as the server, then calls Better Auth. Returns an error message or null. */
async function send(mode: Mode, fields: Record<string, unknown>): Promise<string | null> {
  if (mode === "sign-up") {
    const parsed = signUpSchema.safeParse(fields);
    if (!parsed.success) return parsed.error.issues[0]?.message ?? "Revisa los datos";
    const { error } = await authClient.signUp.email(parsed.data);
    return error ? authErrorMessage(error.code) : null;
  }
  const parsed = signInSchema.safeParse(fields);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Revisa los datos";
  const { error } = await authClient.signIn.email(parsed.data);
  return error ? authErrorMessage(error.code) : null;
}

// Unstyled forms: the final login design arrives with specs/08-ui.
export function LoginForms({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fields = Object.fromEntries(new FormData(event.currentTarget));

    setPending(true);
    const message = await send(mode, fields);
    setPending(false);
    if (message) {
      setError(message);
      return;
    }
    // A new account goes to / (AUTH-R7); signing in returns to where the user was going.
    router.replace(mode === "sign-up" ? "/" : next);
    router.refresh();
  }

  const isSignUp = mode === "sign-up";
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4">
      <h1>{isSignUp ? "Crear cuenta" : "Iniciar sesión"}</h1>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        {isSignUp && (
          <label className="flex flex-col">
            Nombre
            <input name="name" autoComplete="name" maxLength={MAX_NAME_LENGTH} required />
          </label>
        )}
        <label className="flex flex-col">
          Correo
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="flex flex-col">
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
            maxLength={MAX_PASSWORD_LENGTH}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Un momento..." : isSignUp ? "Crear cuenta" : "Entrar"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(isSignUp ? "sign-in" : "sign-up");
          setError(null);
        }}
      >
        {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Crea una"}
      </button>
    </main>
  );
}
