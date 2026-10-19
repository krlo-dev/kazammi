import type { MatchResponse, RecognizeResponse } from "@/shared";

/** Cumulative attempts: each one fingerprints the audio from 0 s up to this mark. */
export const ATTEMPT_SECONDS = [4, 8, 12] as const;

export type RecognizerErrorReason =
  | "permission_denied"
  | "unsupported"
  | "insecure_context"
  | "network"
  | "unauthorized"
  | "version_mismatch"
  | "unknown";

export type RecognizerState =
  | { status: "idle" }
  | { status: "requesting" }
  | {
      status: "listening";
      elapsedMs: number;
      /** Attempts started so far, 0 to ATTEMPT_SECONDS.length. */
      attempt: number;
      /** An attempt is being fingerprinted or sent to the API. */
      processing: boolean;
    }
  | { status: "matched"; result: MatchResponse }
  | { status: "no_match"; bestScore: number }
  | { status: "error"; reason: RecognizerErrorReason };

export type RecognizerEvent =
  | { type: "start" }
  | { type: "permission_granted" }
  | { type: "tick"; elapsedMs: number }
  | { type: "attempt_started" }
  | { type: "attempt_finished"; response: RecognizeResponse }
  | { type: "failed"; reason: RecognizerErrorReason }
  | { type: "cancel" }
  | { type: "reset" };

export const initialRecognizerState: RecognizerState = { status: "idle" };

const IDLE: RecognizerState = initialRecognizerState;

/**
 * Pure transition function of the recognizer (specs/07-capture/design.md).
 * Events that do not apply to the current state return it unchanged, so late
 * answers from a cancelled recording are ignored.
 */
export function recognizerReducer(state: RecognizerState, event: RecognizerEvent): RecognizerState {
  switch (state.status) {
    case "idle":
      return event.type === "start" ? { status: "requesting" } : state;

    case "requesting":
      switch (event.type) {
        case "permission_granted":
          return { status: "listening", elapsedMs: 0, attempt: 0, processing: false };
        case "failed":
          return { status: "error", reason: event.reason };
        case "cancel":
          return IDLE;
        default:
          return state;
      }

    case "listening":
      switch (event.type) {
        case "tick":
          return { ...state, elapsedMs: event.elapsedMs };
        case "attempt_started":
          // Attempts never overlap and never go past the last mark.
          if (state.processing || state.attempt >= ATTEMPT_SECONDS.length) return state;
          return { ...state, attempt: state.attempt + 1, processing: true };
        case "attempt_finished":
          if (!state.processing) return state;
          if (event.response.status === "match") {
            return { status: "matched", result: event.response };
          }
          // The last attempt covers all the audio, so its score is the best one to report.
          if (state.attempt >= ATTEMPT_SECONDS.length) {
            return { status: "no_match", bestScore: event.response.score };
          }
          return { ...state, processing: false };
        case "failed":
          return { status: "error", reason: event.reason };
        case "cancel":
          return IDLE;
        default:
          return state;
      }

    case "matched":
    case "no_match":
    case "error":
      return event.type === "reset" ? IDLE : state;
  }
}
