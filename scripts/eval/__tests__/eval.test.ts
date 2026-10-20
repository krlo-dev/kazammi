import { describe, expect, it } from "vitest";

import { DEFAULT_PARAMS, fingerprint } from "@/modules/fingerprint";
import { decide, DEFAULT_MATCH_PARAMS, type Recognize } from "@/modules/recognition";

import { runEval, type EvalSong } from "../eval";
import { mulberry32 } from "../noise";
import { percentile, toCsv, toMarkdown } from "../report";

const SAMPLE_RATE = 11025;

/**
 * 3 sines whose frequencies change every 0.1 s. Fingerprints keep only note onsets, so the
 * notes must be short for a 5 s query to clear τ_abs.
 */
function melody(seconds: number, seed: number): Float32Array {
  const next = mulberry32(seed);
  const out = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  const note = Math.round(0.1 * SAMPLE_RATE);
  let freqs = [0, 0, 0];
  for (let n = 0; n < out.length; n++) {
    if (n % note === 0) freqs = freqs.map(() => 200 + next() * 3800);
    let value = 0;
    for (const f of freqs) value += Math.sin((2 * Math.PI * f * n) / SAMPLE_RATE);
    out[n] = value / 3;
  }
  return out;
}

/**
 * Fake recognizer backed by an in-memory index of the given songs: same offset histogram
 * idea as the SQL query, so the evaluation loop is tested end to end without a database.
 */
function memoryRecognizer(songs: EvalSong[]): Recognize {
  const index = new Map<number, { trackId: number; frame: number }[]>();
  for (const song of songs) {
    const { hashes, anchorFrames } = fingerprint(song.pcm);
    hashes.forEach((hash, i) => {
      const list = index.get(hash) ?? [];
      list.push({ trackId: song.trackId!, frame: anchorFrames[i] });
      index.set(hash, list);
    });
  }
  return async (input) => {
    const votes = new Map<string, number>();
    for (const [hash, t] of input.hashes) {
      for (const hit of index.get(hash) ?? []) {
        const key = `${hit.trackId}:${hit.frame - t}`;
        votes.set(key, (votes.get(key) ?? 0) + 1);
      }
    }
    // Best offset per track, then the production decision (τ_abs and ρ).
    const best = new Map<number, { trackId: number; delta: number; count: number }>();
    for (const [key, count] of votes) {
      const [trackId, delta] = key.split(":").map(Number);
      if (count > (best.get(trackId)?.count ?? 0)) best.set(trackId, { trackId, delta, count });
    }
    const decision = decide([...best.values()], DEFAULT_MATCH_PARAMS);
    const timings = { dbMs: 1, totalMs: 2 };
    if (decision.status === "no_match")
      return { status: "no_match", score: decision.score, timings };
    return {
      status: "match",
      track: {
        id: decision.trackId,
        title: "",
        artist: "",
        album: null,
        genre: null,
        year: null,
        durationSec: 0,
        coverUrl: null,
      },
      confidence: decision.confidence,
      offsetSeconds: (decision.delta * DEFAULT_PARAMS.hopSize) / SAMPLE_RATE,
      score: decision.score,
      runnerUpScore: decision.runnerUpScore,
      timings,
    };
  };
}

describe("runEval", () => {
  const indexed: EvalSong[] = [1, 2, 3].map((seed) => ({
    trackId: seed,
    label: `song-${seed}`,
    pcm: melody(30, seed),
  }));
  const holdout: EvalSong[] = [{ trackId: null, label: "unknown", pcm: melody(30, 99) }];
  const options = {
    durations: [5, 10],
    snrs: [Infinity, 10],
    rooms: [10],
    trials: 3,
    falsePositiveTrials: 4,
    seed: 7,
  };

  it("tests every segment at every SNR and in the room, then the holdout songs", async () => {
    const results = await runEval(indexed, holdout, options, {
      recognize: memoryRecognizer(indexed),
      log: () => {},
    });
    const measured = results.filter((r) => r.kind === "indexed");
    expect(measured).toHaveLength(2 * 3 * 3);
    expect(results.filter((r) => r.kind === "holdout")).toHaveLength(4);
    // The same segment is used across SNRs.
    const first = measured.filter((r) => r.duration === 5 && r.trial === 0);
    expect(first.map((r) => [r.condition, r.snr])).toEqual([
      ["white", Infinity],
      ["white", 10],
      ["room", 10],
    ]);
    expect(new Set(first.map((r) => r.startSec)).size).toBe(1);
  });

  it("finds clean segments with the offset within one frame", async () => {
    const results = await runEval(indexed, holdout, options, {
      recognize: memoryRecognizer(indexed),
      log: () => {},
    });
    for (const r of results.filter(
      (r) => r.kind === "indexed" && r.condition === "white" && r.snr === Infinity,
    )) {
      expect(r.hit).toBe(true);
      expect(r.offsetErrorSec).toBeLessThanOrEqual(DEFAULT_PARAMS.hopSize / SAMPLE_RATE);
    }
  });

  it("scores holdout segments as correct only when nothing is recognized", async () => {
    const results = await runEval(indexed, holdout, options, {
      recognize: memoryRecognizer(indexed),
      log: () => {},
    });
    for (const r of results.filter((r) => r.kind === "holdout")) {
      expect(r.expectedTrackId).toBeNull();
      expect(r.hit).toBe(r.predictedTrackId === null);
    }
  });

  it("is reproducible with the same seed", async () => {
    const deps = { recognize: memoryRecognizer(indexed), log: () => {} };
    const a = await runEval(indexed, holdout, options, deps);
    const b = await runEval(indexed, holdout, options, deps);
    expect(a.map((r) => [r.song, r.startSec, r.hit])).toEqual(
      b.map((r) => [r.song, r.startSec, r.hit]),
    );
  });

  it("writes a CSV row per query and a Markdown table per duration and condition", async () => {
    const results = await runEval(indexed, holdout, options, {
      recognize: memoryRecognizer(indexed),
      log: () => {},
    });
    const csv = toCsv(results).trim().split("\n");
    expect(csv).toHaveLength(results.length + 1);
    expect(csv[0]).toMatch(/^kind,duration,snr,trial,song/);
    expect(csv[1]).toMatch(/^indexed,5,inf,0,song-/);

    const md = toMarkdown(results, {
      date: "2026-10-16",
      seed: 7,
      trials: 3,
      indexedSongs: 3,
      holdoutSongs: 1,
      fingerprintVersion: 1,
      minScore: 20,
      minRatio: 2,
    });
    expect(md).toContain("| Duración | ∞ dB | 10 dB | sala 10 dB |");
    expect(md).toMatch(/\| 5 s \| 100\.0% \|/);
    expect(md).toMatch(/\d+ falsos positivos en 4 intentos/);
  });

  it("reports missing holdout data", () => {
    expect(
      toMarkdown([], {
        date: "x",
        seed: 1,
        trials: 0,
        indexedSongs: 0,
        holdoutSongs: 0,
        fingerprintVersion: 1,
        minScore: 20,
        minRatio: 2,
      }),
    ).toContain("falta `data/songs-holdout/`");
  });
});

describe("percentile", () => {
  it("uses the nearest-rank method", () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 50)).toBeNaN();
  });
});
