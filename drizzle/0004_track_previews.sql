CREATE TABLE "track_previews" (
	"track_id" integer PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"start_sec" real NOT NULL,
	"data" "bytea" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "has_preview" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "track_previews" ADD CONSTRAINT "track_previews_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;