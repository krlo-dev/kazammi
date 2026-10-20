"use client";

import {
  CloudOff,
  Lock,
  MicOff,
  RefreshCw,
  SearchX,
  TriangleAlert,
  UserRoundX,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { TrackView } from "@/app/_lib/tracks";
import {
  useRecognizer,
  type RecognizerErrorReason,
  type RecognizerLive,
  type RecognizerState,
} from "@/modules/capture";

import { LogoLoader } from "../brand/LogoLoader";
import { TrackRow } from "../library/TrackRow";
import { StateMessage } from "../ui/StateMessage";
import { MatchView } from "./MatchView";
import { Orb, type OrbProgress } from "./Orb";
import { RecentStack } from "./RecentStack";

const ATTEMPTS = 3;

const ERRORS: Record<
  RecognizerErrorReason,
  { icon: LucideIcon; title: string; body: string; action: "retry" | "reload" | null }
> = {
  permission_denied: {
    icon: MicOff,
    title: "Kazammi no tiene acceso al micrófono",
    body: "Toca el ícono junto a la dirección del sitio, permite el micrófono y vuelve a intentarlo.",
    action: "retry",
  },
  unsupported: {
    icon: TriangleAlert,
    title: "Este navegador no puede escuchar",
    body: "Usa una versión reciente de Chrome, Safari, Edge o Firefox y revisa que haya un micrófono conectado.",
    action: "retry",
  },
  insecure_context: {
    icon: Lock,
    title: "Falta una conexión segura",
    body: "El micrófono solo funciona con HTTPS. Abre Kazammi desde su dirección https://.",
    action: null,
  },
  network: {
    icon: CloudOff,
    title: "No pudimos hablar con el servidor",
    body: "Revisa tu conexión a internet y vuelve a intentarlo.",
    action: "retry",
  },
  unauthorized: {
    icon: UserRoundX,
    title: "Tu sesión expiró",
    body: "Te llevamos a iniciar sesión de nuevo.",
    action: null,
  },
  version_mismatch: {
    icon: RefreshCw,
    title: "Kazammi se actualizó",
    body: "Recarga la página para usar la versión nueva.",
    action: "reload",
  },
  unknown: {
    icon: TriangleAlert,
    title: "Algo salió mal",
    body: "No sabemos bien qué pasó. Vuelve a intentarlo.",
    action: "retry",
  },
};

/** What a screen reader hears on every change of state (UI-R28). */
function announcement(state: RecognizerState): string {
  switch (state.status) {
    case "idle":
      return "";
    case "requesting":
      return "Pidiendo acceso al micrófono.";
    case "listening":
      return state.processing
        ? `Intento ${state.attempt} de ${ATTEMPTS}: comparando con el catálogo.`
        : "Escuchando.";
    case "matched":
      return `Encontrada: ${state.result.track.title}, de ${state.result.track.artist}.`;
    case "no_match":
      return "No encontramos la canción.";
    case "error":
      return ERRORS[state.reason].title;
  }
}

/** The identify screen (T5, UI-R7 to UI-R15). It consumes only useRecognizer(). */
export function IdentifyScreen({ recent }: { recent: TrackView[] }) {
  const router = useRouter();
  const { state, live, start, cancel, reset } = useRecognizer();
  const liveRef = useRef<RecognizerLive | null>(null);
  const progressRef = useRef<OrbProgress | null>(null);

  useEffect(() => {
    liveRef.current = live;
    progressRef.current =
      state.status === "listening"
        ? { elapsedMs: state.elapsedMs, attempt: state.attempt, processing: state.processing }
        : null;
  });

  // The ring collapses for a moment before the cover blooms in its place.
  const [prevStatus, setPrevStatus] = useState(state.status);
  const [resolving, setResolving] = useState(false);
  if (state.status !== prevStatus) {
    setPrevStatus(state.status);
    if (prevStatus === "listening" && state.status === "matched") setResolving(true);
  }
  useEffect(() => {
    if (!resolving) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setResolving(false), reduced ? 0 : 460);
    return () => clearTimeout(timer);
  }, [resolving]);

  const expired = state.status === "error" && state.reason === "unauthorized";
  useEffect(() => {
    if (expired) router.replace("/login?next=/");
  }, [expired, router]);

  const listening = state.status === "listening";
  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && cancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [listening, cancel]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-x-clip px-4 pb-6 pt-6 sm:px-6 lg:px-10 lg:pb-6 lg:pt-2">
      <p aria-live="polite" className="sr-only">
        {announcement(state)}
      </p>

      {(state.status === "idle" || state.status === "requesting" || listening) && (
        <Home state={state} recent={recent} onStart={start} />
      )}

      {state.status === "matched" && !resolving && (
        <MatchView key={state.result.track.id} result={state.result} onAgain={reset} />
      )}

      {state.status === "no_match" && (
        <Outcome>
          <StateMessage
            icon={SearchX}
            title="No encontramos esta canción"
            actions={
              <>
                <button type="button" onClick={start} className="btn-primary rounded-full">
                  Intentar de nuevo
                </button>
                <button type="button" onClick={reset} className="btn-pill">
                  Volver
                </button>
              </>
            }
          >
            <ul className="space-y-1.5 text-left">
              <li>Acerca el micrófono al parlante, a un metro o menos.</li>
              <li>Sube un poco el volumen y baja el ruido de alrededor.</li>
              <li>Kazammi solo reconoce las canciones de su catálogo.</li>
            </ul>
          </StateMessage>
        </Outcome>
      )}

      {state.status === "error" && (
        <Outcome>
          <ErrorMessage reason={state.reason} onRetry={start} onBack={reset} />
        </Outcome>
      )}

      {(listening || resolving) && (
        <ListeningOverlay
          state={state}
          resolving={resolving}
          liveRef={liveRef}
          progressRef={progressRef}
          onCancel={cancel}
        />
      )}
    </main>
  );
}

function Home({
  state,
  recent,
  onStart,
}: {
  state: RecognizerState;
  recent: TrackView[];
  onStart: () => void;
}) {
  const requesting = state.status === "requesting";
  return (
    // Title top-left on the phone; on desktop the title and "Mis canciones" share the orb's
    // center axis. "Mis canciones" stays anchored to the bottom.
    <div className="grid flex-1 grid-rows-[auto_1fr_auto] gap-y-4">
      <h1 className="display text-[clamp(2.75rem,8vw,5rem)] lg:text-center">
        Identificar
        <br />
        <span className="text-fg-2">canciones</span>
      </h1>

      <div className="flex flex-col items-center justify-center py-4 lg:py-0">
        {/* The canvas leaves room for the halo: the caption sits just under the ring. */}
        <div className="relative pb-12 lg:pb-9">
          <button
            type="button"
            onClick={onStart}
            disabled={requesting}
            aria-label="Identificar la canción que está sonando"
            className="group relative w-[min(66vw,20rem)] rounded-full transition-transform duration-300 ease-[var(--ease-out-quart)] hover:scale-[1.015] active:scale-[0.985] disabled:cursor-progress lg:w-[min(52vw,49vh,32rem)]"
          >
            <Orb mode={requesting ? "requesting" : "idle"} ring={0.45} />
            <MicGlyph className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-white transition-transform duration-300 group-hover:scale-110" />
          </button>
          <p
            className="absolute inset-x-0 top-[calc(100%-1.5rem)] text-center text-fg-2"
            aria-hidden={!requesting}
          >
            {requesting ? "Permite el acceso al micrófono para empezar." : "Toca para identificar"}
          </p>
        </div>
      </div>

      <MyMusic recent={recent} />
    </div>
  );
}

function MyMusic({ recent }: { recent: TrackView[] }) {
  const heading = (
    <h2 id="my-music" className="text-xl font-medium tracking-[-0.015em]">
      Mis canciones
    </h2>
  );
  const seeAll = (
    <Link href="/saved" className="btn-pill min-h-9 px-3.5 text-sm">
      Ver todo
    </Link>
  );
  if (recent.length > 1) {
    return (
      <section aria-labelledby="my-music" className="mx-auto w-full lg:max-w-md">
        <RecentStack tracks={recent} heading={heading} action={seeAll} />
      </section>
    );
  }

  return (
    <section aria-labelledby="my-music" className="mx-auto w-full lg:max-w-md">
      <div className="mb-3 flex items-center justify-between">
        {heading}
        {recent.length > 0 && seeAll}
      </div>
      {recent.length > 0 ? (
        <div>
          <ul>
            <TrackRow track={recent[0]} />
          </ul>
          {/* Cards stacked behind the only song, as in the reference: more lives in Guardadas. */}
          <div aria-hidden className="mx-auto w-[94%]">
            <div className="h-2 rounded-b-[1rem] border-x border-b border-hairline bg-white/[0.04]" />
            <div className="mx-auto h-1.5 w-[94%] rounded-b-[0.875rem] border-x border-b border-hairline bg-white/[0.025]" />
          </div>
        </div>
      ) : (
        <p className="glass rounded-[1.25rem] px-4 py-5 text-fg-2">
          Todavía no guardas canciones. Identifica una y toca{" "}
          <span className="font-medium text-fg">Guardar</span> para verla aquí.
        </p>
      )}
    </section>
  );
}

function ListeningOverlay({
  state,
  resolving,
  liveRef,
  progressRef,
  onCancel,
}: {
  state: RecognizerState;
  resolving: boolean;
  liveRef: React.RefObject<RecognizerLive | null>;
  progressRef: React.RefObject<OrbProgress | null>;
  onCancel: () => void;
}) {
  const listening = state.status === "listening";
  const attempt = listening ? state.attempt : ATTEMPTS;
  const processing = listening && state.processing;
  const seconds = listening ? Math.min(12, Math.floor(state.elapsedMs / 1000)) : 12;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="listening-title"
      className={`kz-id-overlay ${resolving ? "kz-id-resolving" : ""}`}
    >
      <div aria-hidden className="kz-id-overlayField" />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[2.75rem_1fr_2.75rem] items-center px-4 pt-5 sm:px-6 lg:px-10">
        <span />
        <h1 id="listening-title" className="text-center text-xl font-normal tracking-[-0.01em]">
          Escuchando…
        </h1>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          className="btn-icon"
          autoFocus
        >
          <X aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-2">
        <div className={`relative w-[min(96vw,74vh,44rem)] kz-id-listeningOrb`}>
          <Orb mode="listening" liveRef={liveRef} progressRef={progressRef} />
          {/* While listening the mic gives way to the dancing Mono DJ of the loader. */}
          <LogoLoader
            label="Escuchando"
            className="absolute left-1/2 top-1/2 h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 text-white"
          />
        </div>
      </div>

      <div className="px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center">
        <p className="text-lg tabular-nums">
          {processing ? (
            <>
              Intento {attempt} de {ATTEMPTS} <span className="text-fg-2">· comparando…</span>
            </>
          ) : (
            <>
              <span className="text-fg-2">Escuchando</span> {seconds} s{" "}
              <span className="text-fg-2">de 12</span>
            </>
          )}
        </p>
        <p className="mt-1 text-sm text-fg-3">Acerca el micrófono a la música.</p>
      </div>
    </div>
  );
}

function Outcome({ children }: { children: React.ReactNode }) {
  return (
    <div className={`kz-id-rise flex flex-1 items-center justify-center py-10`}>{children}</div>
  );
}

function ErrorMessage({
  reason,
  onRetry,
  onBack,
}: {
  reason: RecognizerErrorReason;
  onRetry: () => void;
  onBack: () => void;
}) {
  const error = ERRORS[reason];
  return (
    <StateMessage
      icon={error.icon}
      title={error.title}
      tone="danger"
      actions={
        <>
          {error.action === "retry" && (
            <button type="button" onClick={onRetry} className="btn-primary rounded-full">
              Reintentar
            </button>
          )}
          {error.action === "reload" && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary rounded-full"
            >
              Recargar
            </button>
          )}
          {reason !== "unauthorized" && (
            <button type="button" onClick={onBack} className="btn-pill">
              Volver
            </button>
          )}
        </>
      }
    >
      <p>{error.body}</p>
    </StateMessage>
  );
}

/** Microphone glyph drawn for the orb's core (lucide's Mic, slightly heavier). */
function MicGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pointer-events-none drop-shadow-[0_0_10px_rgb(255_255_255/0.45)] ${className ?? ""}`}
    >
      <rect x="9" y="2.5" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
      <path d="M18.5 11.5a6.5 6.5 0 0 1-13 0" />
      <path d="M12 18v3.5" />
    </svg>
  );
}
