import type { RecognizerErrorReason } from "./machine";

const WORKLET_URL = "/worklets/recorder.js";
const PROCESSOR_NAME = "kazammi-recorder";

/** Thrown by startRecorder() with the state machine reason for the failure. */
export class RecorderError extends Error {
  override name = "RecorderError";
  constructor(
    readonly reason: RecognizerErrorReason,
    options?: { cause?: unknown },
  ) {
    super(`Recorder failed: ${reason}`, options);
  }
}

export interface Recorder {
  /** Sample rate of the device, decided by the browser. */
  readonly sampleRate: number;
  /** Mono samples recorded so far. */
  readonly length: number;
  /** Copy of the first `count` samples (all of them when omitted). */
  read(count?: number): Float32Array;
  /** Copy of the last `count` samples, zero-padded at the start while there are fewer. */
  latest(count: number): Float32Array;
  /** Releases the microphone, the worklet and the AudioContext. Safe to call twice. */
  stop(): Promise<void>;
}

/** getUserMedia DOMException names that mean the user or the browser said no. */
const DENIED = new Set(["NotAllowedError", "SecurityError", "PermissionDeniedError"]);
/** No microphone, or it cannot be opened with these constraints. */
const NO_DEVICE = new Set(["NotFoundError", "NotReadableError", "OverconstrainedError"]);

function failureReason(error: unknown): RecognizerErrorReason {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  if (DENIED.has(name)) return "permission_denied";
  if (NO_DEVICE.has(name)) return "unsupported";
  return "unknown";
}

/**
 * Opens the microphone with the browser processing turned off (CAP-R1) and records mono
 * audio through an AudioWorklet (CAP-R2) into a buffer of at most `maxSeconds`.
 * Call it from the user gesture: the AudioContext is created before the first await
 * so iOS Safari lets it run.
 */
export async function startRecorder(options: { maxSeconds: number }): Promise<Recorder> {
  if (typeof window === "undefined" || !window.isSecureContext) {
    throw new RecorderError("insecure_context");
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
    throw new RecorderError("unsupported");
  }

  const context = new AudioContext();
  let stream: MediaStream | undefined;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    await context.audioWorklet.addModule(WORKLET_URL);
    await context.resume();
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    void context.close();
    throw new RecorderError(failureReason(error), { cause: error });
  }

  const sampleRate = context.sampleRate;
  const buffer = new Float32Array(Math.ceil(options.maxSeconds * sampleRate));
  let length = 0;

  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, PROCESSOR_NAME, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "explicit",
    channelCount: 1,
  });
  // Some browsers only render nodes that reach the destination: route it through silence.
  const mute = context.createGain();
  mute.gain.value = 0;

  node.port.onmessage = (event: MessageEvent<Float32Array>) => {
    const block = event.data;
    const room = buffer.length - length;
    if (room <= 0) return;
    const take = Math.min(room, block.length);
    buffer.set(take === block.length ? block : block.subarray(0, take), length);
    length += take;
  };

  source.connect(node);
  node.connect(mute);
  mute.connect(context.destination);

  let stopped = false;
  return {
    sampleRate,
    get length() {
      return length;
    },
    read(count = length) {
      return buffer.slice(0, Math.min(count, length));
    },
    latest(count) {
      const out = new Float32Array(count);
      const from = Math.max(0, length - count);
      out.set(buffer.subarray(from, length), count - (length - from));
      return out;
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      node.port.onmessage = null;
      node.port.close();
      source.disconnect();
      node.disconnect();
      mute.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      await context.close();
    },
  };
}
