import { fingerprint, type FingerprintDebug } from "@/modules/fingerprint";

/** Main thread -> worker. `pcm` is mono at 11,025 Hz and is transferred. */
export interface FingerprintRequest {
  id: number;
  pcm: Float32Array;
  debug: boolean;
}

/** Worker -> main thread. The typed arrays are transferred, not copied. */
export type FingerprintReply =
  | {
      id: number;
      ok: true;
      hashes: Uint32Array;
      anchorFrames: Uint32Array;
      debug?: FingerprintDebug;
    }
  | { id: number; ok: false; message: string };

/** Body of the worker, kept apart so Node tests run the exact same code. */
export function handleFingerprintRequest(request: FingerprintRequest): {
  reply: FingerprintReply;
  transfer: Transferable[];
} {
  const { id, pcm, debug } = request;
  try {
    if (debug) {
      const result = fingerprint(pcm, { debug: true });
      return {
        reply: { id, ok: true, ...result },
        transfer: [
          result.hashes.buffer,
          result.anchorFrames.buffer,
          result.debug.spectrogram.data.buffer,
        ],
      };
    }
    const result = fingerprint(pcm);
    return {
      reply: { id, ok: true, ...result },
      transfer: [result.hashes.buffer, result.anchorFrames.buffer],
    };
  } catch (error) {
    return {
      reply: { id, ok: false, message: error instanceof Error ? error.message : String(error) },
      transfer: [],
    };
  }
}
