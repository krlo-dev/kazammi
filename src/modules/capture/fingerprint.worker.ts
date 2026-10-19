// Web Worker that computes fingerprints off the main thread (CAP-R4).
import { handleFingerprintRequest, type FingerprintRequest } from "./worker-protocol";

// The project compiles with the DOM lib only, so the worker scope is typed by hand.
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<FingerprintRequest>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

scope.onmessage = (event) => {
  const { reply, transfer } = handleFingerprintRequest(event.data);
  scope.postMessage(reply, transfer);
};
