import { Bookmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageTitle } from "@/app/_components/library/PageTitle";
import { SavedList } from "@/app/_components/library/SavedList";
import { PageLoading } from "@/app/_components/ui/PageLoading";
import { StateMessage } from "@/app/_components/ui/StateMessage";
import { getLibrary, SAVED_PAGE_SIZE } from "@/app/_lib/library";
import { toTrackView } from "@/app/_lib/tracks";
import { requireUser } from "@/modules/auth";

export const metadata: Metadata = { title: "Guardadas" };

// The session and the data are request data: read them inside Suspense (cacheComponents).
export default function SavedPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Saved />
    </Suspense>
  );
}

async function Saved() {
  const user = await requireUser();
  const page = await getLibrary().listSaved(user.id, { limit: SAVED_PAGE_SIZE });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
      <PageTitle
        first="Guardadas"
        lead="Tu playlist general: todo lo que guardas, lo más reciente primero."
      />
      {page.items.length > 0 ? (
        <SavedList
          initial={page.items.map((item) => toTrackView(item.track))}
          initialCursor={page.nextCursor}
        />
      ) : (
        <div className="py-12">
          <StateMessage
            icon={Bookmark}
            title="Todavía no guardas canciones"
            actions={
              <Link href="/" className="btn-primary rounded-full">
                Ir a Identificar
              </Link>
            }
          >
            <p>
              Identifica una canción y toca Guardar: aparecerá aquí y podrás sumarla a tus
              playlists.
            </p>
          </StateMessage>
        </div>
      )}
    </main>
  );
}
