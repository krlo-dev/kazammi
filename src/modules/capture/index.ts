// Public API of the capture module. Import this module only through this file.
import "client-only";

export type { Spectrogram } from "@/modules/dsp";
export type { Peak } from "@/modules/fingerprint";

export type { HashExample, RecognizerDebug } from "./debug";
export { useLastRecognition, type LastRecognition } from "./last-recognition";
export type { RecognizerLive } from "./live-analyser";
export type { RecognizerErrorReason, RecognizerState } from "./machine";
export { useRecognizer } from "./use-recognizer";
