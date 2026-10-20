// Contract of POST /api/recognize, shared by the route handler and the capture client.
import { z } from "zod";

export const MAX_QUERY_HASHES = 20_000;
const UINT32_MAX = 0xffffffff;
const INT32_MAX = 0x7fffffff;

/** [hash, t]: uint32 hash and the anchor frame of the recording where it starts. */
const hashPair = z.tuple([z.int().min(0).max(UINT32_MAX), z.int().min(0).max(INT32_MAX)]);

export const recognizeRequestSchema = z.object({
  fingerprintVersion: z.int().min(1),
  hashes: z.array(hashPair).min(1).max(MAX_QUERY_HASHES),
  debug: z.boolean().optional().default(false),
});

export type RecognizeRequest = z.input<typeof recognizeRequestSchema>;
export type ParsedRecognizeRequest = z.output<typeof recognizeRequestSchema>;

const timings = z.object({ dbMs: z.number(), totalMs: z.number() });

export const recognizedTrackSchema = z.object({
  id: z.int(),
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  genre: z.string().nullable(),
  year: z.int().nullable(),
  durationSec: z.number(),
  coverUrl: z.string().nullable(),
  /** 5 s MP3 sample of the loudest stretch, or null when the track has none. */
  previewUrl: z.string().nullable(),
});

export const matchResponseSchema = z.object({
  status: z.literal("match"),
  track: recognizedTrackSchema,
  saved: z.boolean(),
  /** Heuristic in [0, 1] for the UI, not a probability. */
  confidence: z.number().min(0).max(1),
  offsetSeconds: z.number(),
  score: z.int(),
  runnerUpScore: z.int(),
  timings,
  /** [delta, count] of the winning track, only with debug: true. */
  debug: z.object({ histogram: z.array(z.tuple([z.int(), z.int()])) }).optional(),
});

export const noMatchResponseSchema = z.object({
  status: z.literal("no_match"),
  score: z.int(),
  timings,
});

export const recognizeResponseSchema = z.discriminatedUnion("status", [
  matchResponseSchema,
  noMatchResponseSchema,
]);

export type RecognizedTrack = z.infer<typeof recognizedTrackSchema>;
export type MatchResponse = z.infer<typeof matchResponseSchema>;
export type NoMatchResponse = z.infer<typeof noMatchResponseSchema>;
export type RecognizeResponse = z.infer<typeof recognizeResponseSchema>;

/** Body of every non-200 answer. */
export const recognizeErrorSchema = z.object({
  error: z.enum(["invalid_request", "unauthorized", "version_mismatch", "internal_error"]),
  message: z.string().optional(),
});
export type RecognizeError = z.infer<typeof recognizeErrorSchema>;
