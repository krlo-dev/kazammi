import type { Candidate } from "@/modules/catalog";

export interface MatchParams {
  /** τ_abs: minimum aligned hashes for the winner. */
  minScore: number;
  /** ρ: the winner must have at least this many times the runner-up's score. */
  minRatio: number;
}

export const DEFAULT_MATCH_PARAMS: MatchParams = Object.freeze({ minScore: 25, minRatio: 2 });

export type MatchDecision =
  | {
      status: "match";
      trackId: number;
      delta: number;
      score: number;
      runnerUpScore: number;
      confidence: number;
    }
  | { status: "no_match"; score: number; runnerUpScore: number; confidence: 0 };

/**
 * Picks the track with the most hashes aligned at a single offset. Accepts it only if
 * score >= minScore and score / runnerUp >= minRatio. `candidates` hold one row per
 * track (its best offset), in any order.
 */
export function decide(candidates: readonly Candidate[], params: MatchParams): MatchDecision {
  const sorted = [...candidates].sort((a, b) => b.count - a.count || a.trackId - b.trackId);
  const best = sorted[0];
  const score = best?.count ?? 0;
  const runnerUpScore = sorted[1]?.count ?? 0;

  const clearWinner = runnerUpScore === 0 || score / runnerUpScore >= params.minRatio;
  if (!best || score < params.minScore || !clearWinner) {
    return { status: "no_match", score, runnerUpScore, confidence: 0 };
  }
  return {
    status: "match",
    trackId: best.trackId,
    delta: best.delta,
    score,
    runnerUpScore,
    confidence: confidence(score, runnerUpScore, params.minScore),
  };
}

/**
 * (1 - runnerUp / score) * min(1, score / (2 * minScore)): how far the winner is from the
 * runner-up, damped when its absolute score is low. A UI heuristic, not a probability.
 */
export function confidence(score: number, runnerUpScore: number, minScore: number): number {
  if (score <= 0) return 0;
  const separation = 1 - runnerUpScore / score;
  const strength = Math.min(1, score / (2 * minScore));
  return Math.max(0, Math.min(1, separation * strength));
}
