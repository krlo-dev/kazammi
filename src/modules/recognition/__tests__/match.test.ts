import { describe, expect, it } from "vitest";

import { confidence, decide, DEFAULT_MATCH_PARAMS } from "../match";

const params = DEFAULT_MATCH_PARAMS; // minScore 20, minRatio 2
const c = (trackId: number, count: number, delta = 100) => ({ trackId, count, delta });

describe("decide", () => {
  it("accepts a clear winner and reports its offset and runner-up", () => {
    expect(decide([c(1, 156, 268), c(2, 9), c(3, 4)], params)).toEqual({
      status: "match",
      trackId: 1,
      delta: 268,
      score: 156,
      runnerUpScore: 9,
      confidence: 1 - 9 / 156,
    });
  });

  it("does not depend on the order of the candidates", () => {
    expect(decide([c(2, 9), c(1, 156, 268)], params)).toMatchObject({
      status: "match",
      trackId: 1,
    });
  });

  it("accepts a single candidate above the minimum score", () => {
    expect(decide([c(7, 20)], params)).toMatchObject({
      status: "match",
      trackId: 7,
      runnerUpScore: 0,
    });
  });

  it("rejects a winner below the absolute minimum", () => {
    expect(decide([c(1, 19), c(2, 1)], params)).toEqual({
      status: "no_match",
      score: 19,
      runnerUpScore: 1,
      confidence: 0,
    });
  });

  it("rejects a tie or a runner-up that is too close", () => {
    expect(decide([c(1, 50), c(2, 50)], params).status).toBe("no_match");
    expect(decide([c(1, 59), c(2, 30)], params).status).toBe("no_match"); // ratio 1.97
    expect(decide([c(1, 60), c(2, 30)], params).status).toBe("match"); // ratio exactly 2
  });

  it("returns no_match with score 0 for no candidates", () => {
    expect(decide([], params)).toEqual({
      status: "no_match",
      score: 0,
      runnerUpScore: 0,
      confidence: 0,
    });
  });

  it("uses the given thresholds", () => {
    expect(decide([c(1, 10)], { minScore: 5, minRatio: 3 }).status).toBe("match");
    expect(decide([c(1, 10), c(2, 4)], { minScore: 5, minRatio: 3 }).status).toBe("no_match");
  });
});

describe("confidence", () => {
  it("is 1 for a strong winner with no runner-up", () => {
    expect(confidence(40, 0, 20)).toBe(1);
    expect(confidence(400, 0, 20)).toBe(1);
  });

  it("drops when the absolute score is low or the runner-up is close", () => {
    expect(confidence(20, 0, 20)).toBe(0.5);
    expect(confidence(100, 50, 20)).toBe(0.5);
    expect(confidence(20, 10, 20)).toBe(0.25);
  });

  it("stays in [0, 1]", () => {
    expect(confidence(0, 0, 20)).toBe(0);
    expect(confidence(10, 30, 20)).toBe(0);
  });
});
