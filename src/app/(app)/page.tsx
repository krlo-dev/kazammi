import type { Metadata } from "next";

import { IdentifyScreen } from "@/app/_components/identify/IdentifyScreen";
import { getLibrary } from "@/app/_lib/library";
import { toTrackView } from "@/app/_lib/tracks";
import { requireUser } from "@/modules/auth";

export const metadata: Metadata = { title: "Identificar" };

// "Mis canciones" is read on the server (UI-R10); the screen itself is the recognizer.
export default async function IdentifyPage() {
  const user = await requireUser();
  const recent = await getLibrary().recentSaved(user.id);
  return <IdentifyScreen recent={recent.map((item) => toTrackView(item.track))} />;
}
