"use client";

/**
 * One audio element for the whole tab, so starting a sample stops the one playing. The
 * sample is fetched as a blob (with the session cookie) and played from an object URL:
 * Safari only streams <audio> from servers that answer byte ranges.
 */
export type PreviewStatus = "idle" | "loading" | "playing";
export interface PreviewState {
  url: string | null;
  status: PreviewStatus;
}

const IDLE: PreviewState = { url: null, status: "idle" };

let state = IDLE;
let audio: HTMLAudioElement | null = null;
/** Bumped on every start or stop, so a slow fetch cannot resume a sample that was stopped. */
let generation = 0;
const objectUrls = new Map<string, string>();
const listeners = new Set<() => void>();

function set(next: PreviewState) {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = () => state;
export const getServerSnapshot = () => IDLE;

export function stopPreview() {
  generation++;
  audio?.pause();
  if (state.status !== "idle") set(IDLE);
}

/** Plays `url`, or stops it when it is the sample already loading or playing. */
export async function togglePreview(url: string) {
  if (state.url === url && state.status !== "idle") {
    stopPreview();
    return;
  }
  stopPreview();
  const current = generation;
  set({ url, status: "loading" });
  try {
    let src = objectUrls.get(url);
    if (!src) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Sample request failed: ${response.status}`);
      src = URL.createObjectURL(await response.blob());
      objectUrls.set(url, src);
    }
    if (current !== generation) return;
    audio ??= new Audio();
    audio.src = src;
    audio.onended = () => {
      if (current === generation) set(IDLE);
    };
    await audio.play();
    if (current === generation) set({ url, status: "playing" });
  } catch {
    if (current === generation) set(IDLE);
  }
}
