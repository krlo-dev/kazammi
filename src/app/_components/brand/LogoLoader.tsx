"use client";

import { useId } from "react";

import { LOADER_MARKUP, LOADER_VIEWBOX } from "./logo-data";

/**
 * The animated Mono DJ (head grooves, body breathes, notes float). Inline, not an <img>,
 * so --logo-color reaches it and its animations run; classes are prefixed per instance.
 * It already slows down under prefers-reduced-motion.
 */
export function LogoLoader({
  className,
  label = "Cargando",
}: {
  className?: string;
  label?: string;
}) {
  const prefix = `kz${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      viewBox={LOADER_VIEWBOX}
      className={className}
      role="img"
      aria-label={label}
      style={{ ["--logo-color" as string]: "currentColor" }}
      dangerouslySetInnerHTML={{ __html: LOADER_MARKUP.replaceAll("__ID__", prefix) }}
    />
  );
}
