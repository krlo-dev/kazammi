"use client";

import { Eye, EyeOff, LockKeyhole, Mail, UserRound, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Logo } from "@/app/_components/brand/Logo";
import { LogoLoader } from "@/app/_components/brand/LogoLoader";
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
type Field = "name" | "email" | "password";
type FieldErrors = Partial<Record<Field, string>>;

/** Same zod rules as the server (UI-R5): one message per field, next to it. */
function validate(mode: Mode, fields: Record<string, unknown>) {
  const parsed = (mode === "sign-up" ? signUpSchema : signInSchema).safeParse(fields);
  if (parsed.success) return { data: parsed.data, errors: null };
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as Field;
    errors[field] ??= issue.message;
  }
  return { data: null, errors };
}

export function LoginForms({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const isSignUp = mode === "sign-up";

  function switchTo(target: Mode) {
    setMode(target);
    setErrors({});
    setFormError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const { data, errors: invalid } = validate(
      mode,
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (invalid) {
      setErrors(invalid);
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = isSignUp
      ? await authClient.signUp.email(data as { name: string; email: string; password: string })
      : await authClient.signIn.email(data as { email: string; password: string });
    if (error) {
      setPending(false);
      setFormError(authErrorMessage(error.code));
      return;
    }
    // The animated mark covers the navigation into the app.
    setLeaving(true);
    // A new account goes to / (AUTH-R7); signing in returns to where the user was going.
    router.replace(isSignUp ? "/" : next);
    router.refresh();
  }

  const clearError = (field: Field) =>
    errors[field] && setErrors((current) => ({ ...current, [field]: undefined }));

  return (
    <div className="relative w-full max-w-[400px]">
      <section
        aria-labelledby="auth-title"
        className="rounded-3xl border border-white/[0.07] bg-card/90 p-6 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Elige cómo entrar"
            className="inline-flex rounded-full bg-black/60 p-1 ring-1 ring-white/[0.06]"
          >
            {(
              [
                ["sign-in", "Iniciar sesión"],
                ["sign-up", "Crear cuenta"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => switchTo(value)}
                className="min-h-10 rounded-full px-4 text-sm font-medium text-muted transition-colors aria-pressed:bg-field aria-pressed:text-white aria-pressed:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
              >
                {label}
              </button>
            ))}
          </div>
          <Logo className="h-9 w-9 shrink-0 text-white" title="Kazammi" />
        </div>

        <h1 id="auth-title" className="mt-7 text-[1.625rem] font-semibold tracking-[-0.02em]">
          {isSignUp ? "Crea tu cuenta" : "Bienvenido de nuevo"}
        </h1>

        <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3" key={mode}>
          {isSignUp && (
            <TextField
              name="name"
              label="Nombre"
              icon={UserRound}
              autoComplete="name"
              maxLength={MAX_NAME_LENGTH}
              error={errors.name}
              onInput={() => clearError("name")}
            />
          )}
          <TextField
            name="email"
            label="Correo"
            type="email"
            icon={Mail}
            autoComplete="email"
            inputMode="email"
            error={errors.email}
            onInput={() => clearError("email")}
          />
          <PasswordField
            isSignUp={isSignUp}
            error={errors.password}
            onInput={() => clearError("password")}
          />

          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
            >
              {formError}
            </p>
          )}

          <button type="submit" className="btn-primary mt-2 w-full" disabled={pending}>
            {pending
              ? isSignUp
                ? "Creando tu cuenta…"
                : "Entrando…"
              : isSignUp
                ? "Crear cuenta"
                : "Entrar"}
          </button>
        </form>
      </section>

      <p className="mt-6 text-center text-sm text-muted">
        Identifica canciones con la transformada de Fourier.
      </p>

      {leaving && (
        <div
          role="status"
          className="absolute inset-0 grid place-items-center rounded-3xl bg-card/95 backdrop-blur-xl"
        >
          <LogoLoader className="h-28 w-28 text-white" label="Entrando a Kazammi" />
        </div>
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name"> {
  name: Field;
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: string;
  trailing?: React.ReactNode;
}

function TextField({ name, label, icon: Icon, error, hint, trailing, ...input }: TextFieldProps) {
  const id = useId();
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-center gap-3 rounded-[10px] border bg-field px-3.5 transition-colors focus-within:border-white/30 ${
          error ? "border-danger/60" : "border-transparent"
        }`}
      >
        <Icon aria-hidden className="h-[18px] w-[18px] shrink-0 text-muted" strokeWidth={1.75} />
        <input
          id={id}
          name={name}
          placeholder={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="min-w-0 flex-1 bg-transparent py-3 text-[0.9375rem] text-white outline-none placeholder:text-muted focus-visible:outline-none"
          {...input}
        />
        {trailing}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 px-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 px-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  isSignUp,
  error,
  onInput,
}: {
  isSignUp: boolean;
  error?: string;
  onInput: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const Toggle = visible ? EyeOff : Eye;
  return (
    <TextField
      name="password"
      label="Contraseña"
      type={visible ? "text" : "password"}
      icon={LockKeyhole}
      autoComplete={isSignUp ? "new-password" : "current-password"}
      maxLength={MAX_PASSWORD_LENGTH}
      hint={isSignUp ? `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.` : undefined}
      error={error}
      onInput={onInput}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="-mr-2 grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:text-white"
        >
          <Toggle aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      }
    />
  );
}
