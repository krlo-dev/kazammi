import { withApiAuth } from "@/modules/auth";
import { createCatalogRepository } from "@/modules/catalog";
import { getDb } from "@/modules/db";
import { createLibraryService, type LibraryService } from "@/modules/library";
import { createRecognizer, VersionMismatchError, type Recognize } from "@/modules/recognition";
import {
  recognizeRequestSchema,
  type MatchResponse,
  type RecognizeError,
  type RecognizeResponse,
} from "@/shared";

const NO_STORE = { "Cache-Control": "no-store" };

const fail = (status: number, body: RecognizeError) =>
  Response.json(body, { status, headers: NO_STORE });

// One recognizer per instance, so the indexed version stays cached between requests.
let recognizer: Recognize | undefined;
const getRecognizer = () =>
  (recognizer ??= createRecognizer({ catalog: createCatalogRepository(getDb()) }));
let library: LibraryService | undefined;
const getLibrary = () => (library ??= createLibraryService(getDb()));

// Thin composition: auth (401 before touching the database) + recognize + saved.
export const POST = withApiAuth(async (user, request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, { error: "invalid_request", message: "Body must be JSON" });
  }
  const parsed = recognizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(400, {
      error: "invalid_request",
      message: issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : undefined,
    });
  }

  try {
    const result = await getRecognizer()(parsed.data);
    const response: RecognizeResponse =
      result.status === "match"
        ? ({
            ...result,
            saved: await getLibrary().isSaved(user.id, result.track.id),
          } satisfies MatchResponse)
        : result;
    return Response.json(response, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      return fail(409, { error: "version_mismatch", message: error.message });
    }
    console.error("POST /api/recognize failed", error);
    return fail(500, { error: "internal_error" });
  }
});
