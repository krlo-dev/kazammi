import { SearchX } from "lucide-react";
import Link from "next/link";

import { StateMessage } from "@/app/_components/ui/StateMessage";

export default function AppNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <StateMessage
        icon={SearchX}
        title="No encontramos esta página"
        actions={
          <>
            <Link href="/playlists" className="btn-pill">
              Mis playlists
            </Link>
            <Link href="/" className="btn-primary rounded-full">
              Ir a Identificar
            </Link>
          </>
        }
      >
        <p>Puede que la playlist se haya borrado o que el enlace esté mal.</p>
      </StateMessage>
    </main>
  );
}
