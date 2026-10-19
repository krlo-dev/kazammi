"use client";

import Image from "next/image";
import { useState } from "react";

import { Logo } from "../brand/Logo";

/**
 * Track cover from /api/tracks/[id]/cover. `unoptimized` because the route needs the
 * session cookie, which the image optimizer would not send. Without a cover (or when it
 * fails), a placeholder in the ring's colors with the Mono DJ mark.
 */
export function Cover({
  src,
  alt,
  size,
  className = "",
  priority = false,
}: {
  src: string | null;
  alt: string;
  size: number;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`grid shrink-0 place-items-center overflow-hidden bg-[radial-gradient(120%_120%_at_20%_10%,var(--color-teal)_0%,var(--color-violet)_45%,var(--color-ink-2)_100%)] ${className}`}
      >
        <Logo className="h-[46%] w-[46%] text-white/85" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      priority={priority}
      onError={() => setFailed(true)}
      className={`shrink-0 bg-ink-2 object-cover ${className}`}
    />
  );
}
