import { withApiAuth } from "@/modules/auth";
import { createCatalogRepository } from "@/modules/catalog";
import { getDb } from "@/modules/db";

// Like the cover, a track's sample is written once by the ingestion and never changes.
const IMMUTABLE = "public, max-age=31536000, immutable";

export const GET = withApiAuth(
  async (_user, _request: Request, ctx: RouteContext<"/api/tracks/[id]/preview">) => {
    const { id } = await ctx.params;
    const trackId = Number(id);
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(trackId) || trackId < 1) {
      return new Response("Invalid track id", { status: 400 });
    }

    const preview = await createCatalogRepository(getDb()).getPreview(trackId);
    if (!preview) return new Response("Preview not found", { status: 404 });

    return new Response(new Uint8Array(preview.data), {
      headers: {
        "Content-Type": preview.mime,
        "Content-Length": String(preview.data.byteLength),
        "Cache-Control": IMMUTABLE,
      },
    });
  },
);
