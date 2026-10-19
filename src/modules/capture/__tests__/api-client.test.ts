import { describe, expect, it, vi } from "vitest";

import { MAX_QUERY_HASHES, type RecognizeResponse } from "@/shared";

import { postRecognize, RecognizeRequestError, toRecognizeRequest } from "../api-client";

const noMatch: RecognizeResponse = {
  status: "no_match",
  score: 3,
  timings: { dbMs: 1, totalMs: 2 },
};

const request = { fingerprintVersion: 2, hashes: [[10, 0] as [number, number]] };

const fetchReturning = (response: Response) =>
  vi.fn(async () => response) as unknown as typeof fetch;

async function reasonOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(RecognizeRequestError);
  return (error as RecognizeRequestError).reason;
}

describe("toRecognizeRequest", () => {
  it("pairs every hash with its anchor frame", () => {
    const fp = { hashes: Uint32Array.of(7, 0xffffffff), anchorFrames: Uint32Array.of(0, 12) };
    expect(toRecognizeRequest(fp, 2, true)).toEqual({
      fingerprintVersion: 2,
      hashes: [
        [7, 0],
        [0xffffffff, 12],
      ],
      debug: true,
    });
  });

  it("caps the query at MAX_QUERY_HASHES", () => {
    const n = MAX_QUERY_HASHES + 5;
    const fp = { hashes: new Uint32Array(n), anchorFrames: new Uint32Array(n) };
    expect(toRecognizeRequest(fp, 2, false).hashes).toHaveLength(MAX_QUERY_HASHES);
  });
});

describe("postRecognize", () => {
  it("posts JSON to /api/recognize and returns the parsed answer", async () => {
    const fetchFn = fetchReturning(Response.json(noMatch));
    await expect(postRecognize(request, fetchFn)).resolves.toEqual(noMatch);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/recognize",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify(request),
      }),
    );
  });

  it.each([
    [401, "unauthorized"],
    [409, "version_mismatch"],
    [500, "network"],
    [503, "network"],
    [400, "unknown"],
  ] as const)("maps HTTP %i to %s", async (status, reason) => {
    const fetchFn = fetchReturning(Response.json({ error: "x" }, { status }));
    expect(await reasonOf(postRecognize(request, fetchFn))).toBe(reason);
  });

  it("maps a failed fetch to network", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await reasonOf(postRecognize(request, fetchFn))).toBe("network");
  });

  it.each([
    ["a body that breaks the contract", Response.json({ status: "maybe" })],
    ["a body that is not JSON", new Response("<html>")],
  ])("rejects %s as unknown", async (_name, response) => {
    expect(await reasonOf(postRecognize(request, fetchReturning(response)))).toBe("unknown");
  });
});
