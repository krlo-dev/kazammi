import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { FINGERPRINT_VERSION } from "@/modules/fingerprint";

import { postRecognize, RecognizeRequestError, toRecognizeRequest } from "./api-client";
import { dueAttempt, runAttempt, type AttemptDeps } from "./attempts";
import { toRecognizerDebug, type RecognizerDebug } from "./debug";
import { publishLastRecognition } from "./last-recognition";
import { createFingerprintWorker, type FingerprintWorker } from "./fingerprint-client";
import {
  createLiveAnalyser,
  LIVE_FFT_SIZE,
  type LiveAnalyser,
  type RecognizerLive,
} from "./live-analyser";
import {
  ATTEMPT_SECONDS,
  initialRecognizerState,
  recognizerReducer,
  type RecognizerErrorReason,
  type RecognizerState,
} from "./machine";
import { RecorderError, startRecorder, type Recorder } from "./recorder";
import { resample } from "./resample";

const STARTABLE = new Set<RecognizerState["status"]>(["idle", "matched", "no_match", "error"]);

/** The UI shows the elapsed time with this granularity. */
const TICK_MS = 100;
/** ~30 fps for the live spectrum (CAP-R9). */
const LIVE_MS = 33;

/** Resources of one listening run. Stale async results check `active` and are dropped. */
interface Session {
  active: boolean;
  frame: number;
  abort: AbortController;
  recorder?: Recorder;
  worker?: FingerprintWorker;
  analyser?: LiveAnalyser;
  started: number;
  processing: boolean;
  lastTick: number;
  lastLive: number;
}

const reasonOf = (error: unknown): RecognizerErrorReason =>
  error instanceof RecorderError || error instanceof RecognizeRequestError
    ? error.reason
    : "unknown";

/** Releases the microphone, the AudioContext, the worker and pending requests (CAP-R11). */
function release(session: Session) {
  session.active = false;
  cancelAnimationFrame(session.frame);
  session.abort.abort();
  session.worker?.terminate();
  void session.recorder?.stop();
}

/**
 * Entry point of the capture module for the UI (CAP-R8): records, fingerprints in a
 * worker and runs the cumulative attempts at 4, 8 and 12 s.
 */
export function useRecognizer(): {
  state: RecognizerState;
  live: RecognizerLive | null;
  debug: RecognizerDebug | null;
  start(): void;
  cancel(): void;
  reset(): void;
} {
  const [state, dispatch] = useReducer(recognizerReducer, initialRecognizerState);
  const [live, setLive] = useState<RecognizerLive | null>(null);
  const [debug, setDebug] = useState<RecognizerDebug | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const statusRef = useRef(state.status);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  const finish = useCallback((session: Session) => {
    release(session);
    if (sessionRef.current === session) sessionRef.current = null;
    setLive(null);
  }, []);

  const start = useCallback(() => {
    // Idle, or any final state: "Intentar de nuevo" starts over in one tap (UI-R15).
    if (sessionRef.current || !STARTABLE.has(statusRef.current)) return;
    const session: Session = {
      active: true,
      frame: 0,
      abort: new AbortController(),
      started: 0,
      processing: false,
      lastTick: 0,
      lastLive: 0,
    };
    sessionRef.current = session;
    statusRef.current = "requesting";
    setDebug(null);
    dispatch({ type: "reset" });
    dispatch({ type: "start" });

    const deps: AttemptDeps = {
      resample: (pcm, fromRate) => resample(pcm, fromRate),
      fingerprint: (pcm, withDebug) => session.worker!.run(pcm, withDebug),
      toRequest: (fp, withDebug) => toRecognizeRequest(fp, FINGERPRINT_VERSION, withDebug),
      recognize: (request) => postRecognize(request, fetch, session.abort.signal),
    };

    const fail = (error: unknown) => {
      if (!session.active) return;
      finish(session);
      dispatch({ type: "failed", reason: reasonOf(error) });
    };

    const launch = (index: number, recorder: Recorder) => {
      session.started = index + 1;
      session.processing = true;
      dispatch({ type: "attempt_started" });
      const audio = recorder.read(Math.round(ATTEMPT_SECONDS[index] * recorder.sampleRate));
      const isLast = session.started === ATTEMPT_SECONDS.length;
      if (isLast) {
        // All the audio is in: turn the microphone off while the last attempt runs.
        void recorder.stop();
        setLive(null);
      }

      runAttempt(deps, audio, recorder.sampleRate, true).then((result) => {
        if (!session.active) return;
        session.processing = false;
        if (process.env.NODE_ENV !== "production") {
          console.info(
            `[capture] attempt ${session.started}: ${audio.length} samples at ` +
              `${recorder.sampleRate} Hz -> ${result.pcm.length} at 11025 Hz -> ` +
              `${result.response.status} (score ${result.response.score})`,
          );
        }
        const attemptDebug = toRecognizerDebug(result);
        if (attemptDebug) {
          setDebug(attemptDebug);
          publishLastRecognition({
            debug: attemptDebug,
            match: result.response.status === "match" ? result.response : null,
          });
        }
        dispatch({ type: "attempt_finished", response: result.response });
        if (result.response.status === "match" || isLast) finish(session);
      }, fail);
    };

    const loop = (now: number) => {
      const { recorder, analyser } = session;
      if (!session.active || !recorder || !analyser) return;
      const elapsedMs = Math.round((recorder.length / recorder.sampleRate) * 1000);
      if (now - session.lastTick >= TICK_MS) {
        session.lastTick = now;
        dispatch({ type: "tick", elapsedMs });
      }
      if (now - session.lastLive >= LIVE_MS) {
        session.lastLive = now;
        setLive(analyser.analyse(recorder.latest(LIVE_FFT_SIZE)));
      }
      const due = dueAttempt(elapsedMs, session.started, session.processing);
      if (due !== null) launch(due, recorder);
      if (session.started < ATTEMPT_SECONDS.length) {
        session.frame = requestAnimationFrame(loop);
      }
    };

    startRecorder({ maxSeconds: ATTEMPT_SECONDS[ATTEMPT_SECONDS.length - 1] }).then((recorder) => {
      session.recorder = recorder;
      if (!session.active) {
        void recorder.stop();
        return;
      }
      try {
        session.worker = createFingerprintWorker();
        session.analyser = createLiveAnalyser(recorder.sampleRate);
      } catch (error) {
        fail(new RecorderError("unsupported", { cause: error }));
        return;
      }
      dispatch({ type: "permission_granted" });
      session.frame = requestAnimationFrame(loop);
    }, fail);
  }, [finish]);

  const cancel = useCallback(() => {
    const session = sessionRef.current;
    if (session) finish(session);
    dispatch({ type: "cancel" });
  }, [finish]);

  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  useEffect(
    () => () => {
      if (sessionRef.current) release(sessionRef.current);
    },
    [],
  );

  return { state, live, debug, start, cancel, reset };
}
