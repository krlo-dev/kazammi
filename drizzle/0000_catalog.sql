CREATE TABLE "app_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fingerprints" (
	"hash" bigint NOT NULL,
	"track_id" integer NOT NULL,
	"anchor_frame" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_covers" (
	"track_id" integer PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_path" text NOT NULL,
	"content_sha256" text NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"album" text,
	"genre" text,
	"year" integer,
	"duration_sec" real NOT NULL,
	"has_cover" boolean DEFAULT false NOT NULL,
	"fingerprint_version" integer NOT NULL,
	"hash_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracks_content_sha256_unique" UNIQUE("content_sha256")
);
--> statement-breakpoint
ALTER TABLE "fingerprints" ADD CONSTRAINT "fingerprints_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_covers" ADD CONSTRAINT "track_covers_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;