import { useSyncExternalStore } from "react";

import type { MatchResponse } from "@/shared";

import type { RecognizerDebug } from "./debug";

/** The last finished attempt, kept for the explanatory view while the tab stays open. */
export interface LastRecognition {
  debug: RecognizerDebug;
  /** The match, or null when the last attempt did not find the song. */
  match: MatchResponse | null;
}

let last: LastRecognition | null = null;
const listeners = new Set<() => void>();

export function publishLastRecognition(value: LastRecognition): void {
  last = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Debug data of the last listening in this tab, or null (CAP-R10). Lost on reload. */
export function useLastRecognition(): LastRecognition | null {
  return useSyncExternalStore(
    subscribe,
    () => last,
    () => null,
  );
}
