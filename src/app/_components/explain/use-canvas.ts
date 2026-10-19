"use client";

import { useEffect, useRef } from "react";

/**
 * Canvas sized to its box at the device pixel ratio. `draw` runs on mount, on resize and
 * when `deps` change, with the context already scaled to CSS pixels.
 */
export function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  deps: unknown[],
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);

  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawRef.current(ctx, width, height);
    };
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's data
  }, deps);

  return ref;
}

export const INK = {
  axis: "rgba(185, 180, 220, 0.85)",
  grid: "rgba(255, 255, 255, 0.07)",
  teal: "#1fd1a5",
  magenta: "#c03cff",
  violet: "#6036a4",
  white: "#ffffff",
};

let family: string | null = null;

/**
 * Canvas font in the page's own face. A canvas cannot resolve CSS variables, so the family
 * is read once from the computed style. 14px is the floor for labels read on a projector.
 */
export function canvasFont(px = 14, weight = 500): string {
  family ??= getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  return `${weight} ${px}px ${family}`;
}

/** Spectrogram color map: the app's field rising into violet, magenta and a pale peak. */
const STOPS: Array<[number, [number, number, number]]> = [
  [0, [5, 6, 9]],
  [0.3, [26, 16, 69]],
  [0.55, [96, 54, 164]],
  [0.78, [192, 60, 255]],
  [1, [255, 214, 245]],
];

export function colormap(v: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, v));
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    if (x <= p1) {
      const [p0, c0] = STOPS[i - 1];
      const t = (x - p0) / (p1 - p0);
      return [0, 1, 2].map((j) => Math.round(c0[j] + (c1[j] - c0[j]) * t)) as [
        number,
        number,
        number,
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}
