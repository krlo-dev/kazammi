"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * A button that opens a floating panel (disclosure pattern). Closes on Escape, outside
 * click and navigation, and gives focus back to the button.
 */
export function Disclosure({
  label,
  trigger,
  triggerClassName,
  panelClassName,
  children,
}: {
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState(pathname);

  // Navigating away closes the panel (state adjusted during render, not in an effect).
  if (open && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((value) => !value);
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className={`glass absolute right-0 top-[calc(100%+0.5rem)] z-40 origin-top-right rounded-2xl bg-ink-1/80 p-2 ${panelClassName ?? ""}`}
      >
        {children(() => setOpen(false))}
      </div>
    </div>
  );
}
