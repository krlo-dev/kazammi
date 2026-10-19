"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Sheet } from "../ui/Sheet";
import { NewPlaylistForm } from "./AddToPlaylistSheet";

/** "Nueva playlist" (UI-R18): names it, creates it and opens it. */
export function NewPlaylistButton({ variant = "pill" }: { variant?: "pill" | "primary" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={variant === "primary" ? "btn-primary rounded-full" : "btn-pill"}
      >
        <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        Nueva playlist
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva playlist">
        {open && (
          <NewPlaylistForm
            submitLabel="Crear"
            onCancel={() => setOpen(false)}
            onCreated={(_name, id) => {
              setOpen(false);
              router.push(`/playlists/${id}`);
            }}
          />
        )}
      </Sheet>
    </>
  );
}
