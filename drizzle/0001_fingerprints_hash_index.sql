-- Covering index for the matching query: lookups by hash read track_id and
-- anchor_frame from the index alone (index-only scan). Drizzle's index builder
-- has no INCLUDE clause, so it lives in this custom migration.
CREATE INDEX "fingerprints_hash_idx" ON "fingerprints" ("hash") INCLUDE ("track_id", "anchor_frame");
