"use client";

import { Sheet } from "./Sheet";

/** Confirmation for destructive actions: names the consequence, then the verb. */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}>
      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="btn-pill justify-center">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="btn-pill justify-center border-danger/40 bg-danger/15 text-danger hover:bg-danger/25"
        >
          {pending ? "Un momento…" : confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
