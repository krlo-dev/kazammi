import type { Fingerprint } from "@/modules/fingerprint";
import {
  MAX_QUERY_HASHES,
  recognizeResponseSchema,
  type RecognizeRequest,
  type RecognizeResponse,
} from "@/shared";

import type { RecognizerErrorReason } from "./machine";

const ENDPOINT = "/api/recognize";

/** A failed POST /api/recognize, with the state machine reason for it. */
export class RecognizeRequestError extends Error {
  override name = "RecognizeRequestError";
  constructor(
    readonly reason: RecognizerErrorReason,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

export function toRecognizeRequest(
  fp: Fingerprint,
  fingerprintVersion: number,
  debug: boolean,
): RecognizeRequest {
  const count = Math.min(fp.hashes.length, MAX_QUERY_HASHES);
  const hashes: [number, number][] = new Array(count);
  for (let i = 0; i < count; i++) hashes[i] = [fp.hashes[i], fp.anchorFrames[i]];
  return { fingerprintVersion, hashes, debug };
}

/** HTTP status of a non-200 answer -> state machine reason. */
function reasonForStatus(status: number): RecognizerErrorReason {
  if (status === 401) return "unauthorized";
  if (status === 409) return "version_mismatch";
  if (status >= 500) return "network";
  return "unknown";
}

/**
 * POST /api/recognize with the shared zod contract. The session cookie travels on its
 * own because the request is same-origin.
 */
export async function postRecognize(
  request: RecognizeRequest,
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<RecognizeResponse> {
  let response: Response;
  try {
    response = await fetchFn(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      credentials: "same-origin",
      signal,
    });
  } catch (error) {
    throw new RecognizeRequestError("network", "Could not reach the recognize API", {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new RecognizeRequestError(
      reasonForStatus(response.status),
      `POST ${ENDPOINT} answered ${response.status}`,
    );
  }

  const parsed = recognizeResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new RecognizeRequestError("unknown", `POST ${ENDPOINT} answered an invalid body`);
  }
  return parsed.data;
}
