CREATE TABLE "playlist_tracks" (
	"playlist_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"track_id" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "playlist_tracks_playlist_id_track_id_pk" PRIMARY KEY("playlist_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "playlists_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "playlists_name_length" CHECK (char_length("playlists"."name") BETWEEN 1 AND 60)
);
--> statement-breakpoint
CREATE TABLE "saved_tracks" (
	"user_id" text NOT NULL,
	"track_id" integer NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_tracks_user_id_track_id_pk" PRIMARY KEY("user_id","track_id")
);
--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_fk" FOREIGN KEY ("playlist_id","user_id") REFERENCES "public"."playlists"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_saved_fk" FOREIGN KEY ("user_id","track_id") REFERENCES "public"."saved_tracks"("user_id","track_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_tracks" ADD CONSTRAINT "saved_tracks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_tracks" ADD CONSTRAINT "saved_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "playlists_user_name_idx" ON "playlists" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "saved_tracks_recent_idx" ON "saved_tracks" USING btree ("user_id","saved_at" DESC NULLS LAST);