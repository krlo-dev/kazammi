"use client";

import { useEffect, useState } from "react";

const FALLBACK = "rgb(122, 60, 255)";

/**
 * Average color of the cover, lifted in brightness, for the halo behind it (reference B:
 * "halo de luz del mismo color de la portada"). Same-origin, so the canvas can read it.
 */
export function useCoverColor(src: string | null): string {
  const [color, setColor] = useState(FALLBACK);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 24;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, 24, 24);
      const { data } = ctx.getImageData(0, 0, 24, 24);
      // Weight saturated pixels more: the halo should carry the cover's color, not its grey.
      let r = 0;
      let g = 0;
      let b = 0;
      let weight = 0;
      for (let i = 0; i < data.length; i += 4) {
        const max = Math.max(data[i], data[i + 1], data[i + 2]);
        const min = Math.min(data[i], data[i + 1], data[i + 2]);
        const w = 0.15 + (max - min) / 255;
        r += data[i] * w;
        g += data[i + 1] * w;
        b += data[i + 2] * w;
        weight += w;
      }
      const [ar, ag, ab] = [r / weight, g / weight, b / weight];
      // A near-black or grey cover has no color to bloom: keep the world's violet then.
      const max = Math.max(ar, ag, ab);
      const chroma = (max - Math.min(ar, ag, ab)) / 255;
      if (max < 70 || chroma < 0.18) {
        setColor(FALLBACK);
        return;
      }
      // Scale up to a bright, saturated light of the same hue.
      const k = 235 / max;
      const lift = (v: number) => Math.round(Math.min(255, v * k));
      setColor(`rgb(${lift(ar)}, ${lift(ag)}, ${lift(ab)})`);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return src ? color : FALLBACK;
}
