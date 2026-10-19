"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Glass sheet on a native <dialog> (focus trap, Escape and inert background for free).
 * Rises from the bottom on phones and sits centered on wider screens.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      className="kz-sheet-sheet"
    >
      <div className="kz-sheet-panel">
        <div aria-hidden className="kz-sheet-grabber" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-medium tracking-[-0.015em]">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-fg-2">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="btn-icon -mr-1 shrink-0"
          >
            <X aria-hidden className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </dialog>
  );
}
