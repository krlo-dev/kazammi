import type { Fingerprint, FingerprintDebug } from "@/modules/fingerprint";

import type { FingerprintReply, FingerprintRequest } from "./worker-protocol";

export interface FingerprintWorker {
  /** Fingerprints mono 11,025 Hz PCM in the worker. `pcm` is transferred, so it is emptied. */
  run(pcm: Float32Array, debug: boolean): Promise<Fingerprint & { debug?: FingerprintDebug }>;
  /** Stops the worker and rejects the pending runs. */
  terminate(): void;
}

export function createFingerprintWorker(): FingerprintWorker {
  const worker = new Worker(new URL("./fingerprint.worker.ts", import.meta.url), {
    type: "module",
  });
  const pending = new Map<
    number,
    {
      resolve: (value: Fingerprint & { debug?: FingerprintDebug }) => void;
      reject: (e: Error) => void;
    }
  >();
  let nextId = 0;

  const rejectAll = (error: Error) => {
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
  };

  worker.onmessage = (event: MessageEvent<FingerprintReply>) => {
    const reply = event.data;
    const entry = pending.get(reply.id);
    if (!entry) return;
    pending.delete(reply.id);
    if (reply.ok) {
      entry.resolve({ hashes: reply.hashes, anchorFrames: reply.anchorFrames, debug: reply.debug });
    } else {
      entry.reject(new Error(`Fingerprint worker failed: ${reply.message}`));
    }
  };
  worker.onerror = (event) => {
    rejectAll(new Error(`Fingerprint worker crashed: ${event.message}`));
  };

  return {
    run(pcm, debug) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        const request: FingerprintRequest = { id, pcm, debug };
        worker.postMessage(request, [pcm.buffer]);
      });
    },
    terminate() {
      worker.terminate();
      rejectAll(new Error("Fingerprint worker terminated"));
    },
  };
}
