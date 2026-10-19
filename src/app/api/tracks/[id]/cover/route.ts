import { withApiAuth } from "@/modules/auth";
import { createCatalogRepository } from "@/modules/catalog";
import { getDb } from "@/modules/db";

// A track's cover never changes (re-ingesting creates a new track id), so it can be
// cached forever by the browser and the CDN.
const IMMUTABLE = "public, max-age=31536000, immutable";

export const GET = withApiAuth(
  async (_user, _request: Request, ctx: RouteContext<"/api/tracks/[id]/cover">) => {
    const { id } = await ctx.params;
    const trackId = Number(id);
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(trackId) || trackId < 1) {
      return new Response("Invalid track id", { status: 400 });
    }

    const cover = await createCatalogRepository(getDb()).getCover(trackId);
    if (!cover) return new Response("Cover not found", { status: 404 });

    return new Response(new Uint8Array(cover.data), {
      headers: {
        "Content-Type": cover.mime,
        "Content-Length": String(cover.data.byteLength),
        "Cache-Control": IMMUTABLE,
      },
    });
  },
);
