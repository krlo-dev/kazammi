import { describe, expect, it } from "vitest";

import type { MatchResponse, NoMatchResponse } from "@/shared";

import {
  ATTEMPT_SECONDS,
  initialRecognizerState,
  recognizerReducer as reduce,
  type RecognizerEvent,
  type RecognizerState,
} from "../machine";

const timings = { dbMs: 10, totalMs: 20 };

const match: MatchResponse = {
  status: "match",
  track: {
    id: 1,
    title: "Song",
    artist: "Artist",
    album: null,
    genre: null,
    year: null,
    durationSec: 180,
    coverUrl: null,
  },
  saved: false,
  confidence: 0.9,
  offsetSeconds: 42,
  score: 120,
  runnerUpScore: 12,
  timings,
};

const noMatch = (score: number): NoMatchResponse => ({ status: "no_match", score, timings });

const listening = (attempt: number, processing: boolean, elapsedMs = 0): RecognizerState => ({
  status: "listening",
  elapsedMs,
  attempt,
  processing,
});

const run = (state: RecognizerState, ...events: RecognizerEvent[]) => events.reduce(reduce, state);

const allEvents: RecognizerEvent[] = [
  { type: "start" },
  { type: "permission_granted" },
  { type: "tick", elapsedMs: 100 },
  { type: "attempt_started" },
  { type: "attempt_finished", response: match },
  { type: "failed", reason: "unknown" },
  { type: "cancel" },
  { type: "reset" },
];

/** Asserts that every event outside `handled` leaves the state untouched. */
function expectIgnoresOthers(state: RecognizerState, handled: RecognizerEvent["type"][]) {
  for (const event of allEvents.filter((e) => !handled.includes(e.type))) {
    expect(reduce(state, event), event.type).toBe(state);
  }
}

describe("recognizerReducer", () => {
  it("starts idle and runs three attempts at 4, 8 and 12 s", () => {
    expect(initialRecognizerState).toEqual({ status: "idle" });
    expect(ATTEMPT_SECONDS).toEqual([4, 8, 12]);
  });

  describe("idle", () => {
    const idle = initialRecognizerState;

    it("start() requests the microphone", () => {
      expect(reduce(idle, { type: "start" })).toEqual({ status: "requesting" });
    });

    it("ignores every other event", () => expectIgnoresOthers(idle, ["start"]));
  });

  describe("requesting", () => {
    const requesting: RecognizerState = { status: "requesting" };

    it("starts listening when the permission is granted", () => {
      expect(reduce(requesting, { type: "permission_granted" })).toEqual(listening(0, false));
    });

    it.each(["permission_denied", "unsupported", "insecure_context", "unknown"] as const)(
      "ends in error with reason %s",
      (reason) => {
        expect(reduce(requesting, { type: "failed", reason })).toEqual({
          status: "error",
          reason,
        });
      },
    );

    it("cancel() goes back to idle", () => {
      expect(reduce(requesting, { type: "cancel" })).toEqual({ status: "idle" });
    });

    it("ignores every other event", () =>
      expectIgnoresOthers(requesting, ["permission_granted", "failed", "cancel"]));
  });

  describe("listening", () => {
    it("tick updates the elapsed time", () => {
      expect(reduce(listening(1, true, 0), { type: "tick", elapsedMs: 4500 })).toEqual(
        listening(1, true, 4500),
      );
    });

    it("attempt_started counts the attempt and marks it as processing", () => {
      expect(reduce(listening(0, false), { type: "attempt_started" })).toEqual(listening(1, true));
    });

    it("does not start an attempt while another one is processing", () => {
      const state = listening(1, true);
      expect(reduce(state, { type: "attempt_started" })).toBe(state);
    });

    it("does not start more attempts than ATTEMPT_SECONDS", () => {
      const state = listening(ATTEMPT_SECONDS.length, false);
      expect(reduce(state, { type: "attempt_started" })).toBe(state);
    });

    it("a match ends in matched on any attempt", () => {
      for (let attempt = 1; attempt <= ATTEMPT_SECONDS.length; attempt++) {
        expect(
          reduce(listening(attempt, true), { type: "attempt_finished", response: match }),
        ).toEqual({ status: "matched", result: match });
      }
    });

    it("a no_match before the last attempt keeps listening", () => {
      expect(
        reduce(listening(1, true, 4200), { type: "attempt_finished", response: noMatch(5) }),
      ).toEqual(listening(1, false, 4200));
    });

    it("a no_match on the last attempt ends in no_match with its score", () => {
      expect(
        reduce(listening(3, true), { type: "attempt_finished", response: noMatch(14) }),
      ).toEqual({ status: "no_match", bestScore: 14 });
    });

    it("ignores an attempt result when no attempt is processing", () => {
      const state = listening(1, false);
      expect(reduce(state, { type: "attempt_finished", response: match })).toBe(state);
    });

    it.each(["network", "unauthorized", "version_mismatch", "unknown"] as const)(
      "ends in error with reason %s",
      (reason) => {
        expect(reduce(listening(2, true), { type: "failed", reason })).toEqual({
          status: "error",
          reason,
        });
      },
    );

    it("cancel() goes back to idle, even while processing", () => {
      expect(reduce(listening(2, true), { type: "cancel" })).toEqual({ status: "idle" });
    });

    it("ignores start, permission_granted and reset", () => {
      const state = listening(1, false);
      expectIgnoresOthers(state, [
        "tick",
        "attempt_started",
        "attempt_finished",
        "failed",
        "cancel",
      ]);
    });
  });

  describe.each<[string, RecognizerState]>([
    ["matched", { status: "matched", result: match }],
    ["no_match", { status: "no_match", bestScore: 3 }],
    ["error", { status: "error", reason: "permission_denied" }],
  ])("%s", (_name, state) => {
    it("reset() goes back to idle", () => {
      expect(reduce(state, { type: "reset" })).toEqual({ status: "idle" });
    });

    it("ignores every other event", () => expectIgnoresOthers(state, ["reset"]));
  });

  describe("full flows", () => {
    const begin: RecognizerEvent[] = [{ type: "start" }, { type: "permission_granted" }];
    const attempt = (response: MatchResponse | NoMatchResponse): RecognizerEvent[] => [
      { type: "attempt_started" },
      { type: "attempt_finished", response },
    ];

    it("matches on the second attempt", () => {
      expect(
        run(initialRecognizerState, ...begin, ...attempt(noMatch(4)), ...attempt(match)),
      ).toEqual({ status: "matched", result: match });
    });

    it("ends in no_match after three attempts without a match", () => {
      expect(
        run(
          initialRecognizerState,
          ...begin,
          ...attempt(noMatch(2)),
          ...attempt(noMatch(6)),
          ...attempt(noMatch(9)),
        ),
      ).toEqual({ status: "no_match", bestScore: 9 });
    });

    it("ignores the answer of an attempt that arrives after cancel()", () => {
      expect(
        run(
          initialRecognizerState,
          ...begin,
          { type: "attempt_started" },
          { type: "cancel" },
          { type: "attempt_finished", response: match },
        ),
      ).toEqual({ status: "idle" });
    });

    it("can start again after a reset", () => {
      expect(
        run(
          initialRecognizerState,
          ...begin,
          ...attempt(match),
          { type: "reset" },
          {
            type: "start",
          },
        ),
      ).toEqual({ status: "requesting" });
    });
  });
});
