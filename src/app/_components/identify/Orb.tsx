"use client";

import { useEffect, useRef, type RefObject } from "react";

import type { RecognizerLive } from "@/modules/capture";

export type OrbMode = "idle" | "requesting" | "listening";

export interface OrbProgress {
  elapsedMs: number;
  /** Attempts started, 0 to 3. */
  attempt: number;
  processing: boolean;
}

/** Marks of the cumulative attempts on the outer track, in ms (07-capture CAP-R5). */
const MARKS_MS = [4000, 8000, 12000];
const TOTAL_MS = MARKS_MS[MARKS_MS.length - 1];
const POINTS = 160;
const BANDS = 128;
const TAU = Math.PI * 2;
/** The canvas is this much larger than the orb's box, so the light has room to fade out. */
const BLEED = 1.7;

/**
 * Clouds of light around the rim (reference B): soft radial lobes that drift at their own
 * pace. Angle in turns, size and strength relative to the ring radius.
 */
const LOBES = [
  { color: [192, 60, 255], angle: 0.08, speed: 0.021, size: 0.95, strength: 0.85 },
  { color: [70, 90, 255], angle: 0.36, speed: -0.017, size: 0.85, strength: 0.75 },
  { color: [140, 60, 255], angle: 0.58, speed: 0.013, size: 1.05, strength: 0.7 },
  { color: [230, 70, 220], angle: 0.8, speed: -0.024, size: 0.7, strength: 0.6 },
  { color: [31, 209, 165], angle: 0.5, speed: 0.009, size: 0.55, strength: 0.35 },
] as const;

/**
 * The neon orb. A thin teal rim inside drifting clouds of magenta and blue light. While
 * listening, the rim and the aura follow the live spectrum (our FFT, 128 log bands mirrored
 * around the circle, bass at the bottom) and the level drives the aura's reach. Reads
 * `liveRef` and `progressRef` every frame, so React never re-renders for the animation.
 * Every soft edge is a gradient, not a canvas filter, so it renders the same in Safari.
 */
export function Orb({
  mode,
  ring = 0.3,
  liveRef,
  progressRef,
  className,
}: {
  mode: OrbMode;
  /** Ring radius as a fraction of the orb's box; the light spills past the box. */
  ring?: number;
  liveRef?: RefObject<RecognizerLive | null>;
  progressRef?: RefObject<OrbProgress | null>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const ringRef = useRef(ring);

  useEffect(() => {
    modeRef.current = mode;
    ringRef.current = ring;
  }, [mode, ring]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let size = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const raw = new Float32Array(BANDS);
    const smooth = new Float32Array(BANDS);
    const scratch = new Float32Array(BANDS);
    let level = 0;
    let presence = 0;
    let frame = 0;
    const start = performance.now();
    const xs = new Float32Array(POINTS);
    const ys = new Float32Array(POINTS);

    /** Band value (0..1) at an angle: 0 at the bottom, mirrored on both sides. */
    const bandAt = (theta: number) => {
      const u = Math.abs((((theta / TAU) * 2 + 1) % 2) - 1);
      return smooth[Math.min(BANDS - 1, Math.floor(u * BANDS))];
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (size === 0) return;
      const still = reduced.matches;
      const t = still ? 0 : (now - start) / 1000;
      const listening = modeRef.current === "listening";
      const dim = modeRef.current === "requesting" ? 0.5 : 1;

      // Time smoothing (fast attack, slow release), then two passes of neighbor smoothing so
      // the edge undulates instead of stepping band by band.
      const live = listening && !still ? liveRef?.current : null;
      level += ((live ? Math.min(1, live.level * 4) ** 0.7 : 0) - level) * 0.16;
      presence += ((listening ? 1 : 0) - presence) * 0.08;
      for (let i = 0; i < BANDS; i++) {
        const target = live ? Math.max(0, (live.spectrum[i] - 0.35) / 0.65) : 0;
        raw[i] += (target - raw[i]) * (target > raw[i] ? 0.4 : 0.1);
      }
      smooth.set(raw);
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < BANDS; i++) {
          let sum = 0;
          for (let k = -3; k <= 3; k++) sum += smooth[Math.min(BANDS - 1, Math.max(0, i + k))];
          scratch[i] = sum / 7;
        }
        smooth.set(scratch);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const c = size / 2;
      // Ring radius: 0.3 of the orb's box, which is the canvas divided by BLEED.
      const box = size / BLEED;
      const R = box * ringRef.current;
      const breathe = still ? 1 : 1 + 0.012 * Math.sin(t * 1.3);

      for (let p = 0; p < POINTS; p++) {
        const theta = (p / POINTS) * TAU;
        let r = R * breathe;
        if (!still) {
          // The slow undulation fades in with listening: at rest the rim is a true circle.
          r +=
            R *
            presence *
            (0.008 * Math.sin(3 * theta + t * 0.9) + 0.006 * Math.sin(5 * theta - t * 1.2));
          r += R * presence * (0.04 * level + 0.22 * bandAt(theta) ** 1.3);
        }
        xs[p] = c + r * Math.sin(theta);
        ys[p] = c + r * Math.cos(theta);
      }
      const ringPath = () => {
        ctx.beginPath();
        const mx = (i: number) => (xs[i] + xs[(i + 1) % POINTS]) / 2;
        const my = (i: number) => (ys[i] + ys[(i + 1) % POINTS]) / 2;
        ctx.moveTo(mx(POINTS - 1), my(POINTS - 1));
        for (let i = 0; i < POINTS; i++) ctx.quadraticCurveTo(xs[i], ys[i], mx(i), my(i));
        ctx.closePath();
      };

      ctx.globalCompositeOperation = "lighter";

      // Clouds of light: soft radial lobes riding just outside the rim.
      const reach = 1 + presence * (0.2 + 0.45 * level);
      for (const lobe of LOBES) {
        const angle = (lobe.angle + lobe.speed * t * (1 + presence)) * TAU;
        const sway = still ? 1 : 0.85 + 0.15 * Math.sin(t * 0.7 + lobe.angle * 9);
        const energy = presence * bandAt(angle) * 0.9;
        // Never past the canvas edge, where a cut gradient would show as a straight line.
        const radius = Math.min(R * lobe.size * reach * sway, size * 0.5 - R * 1.08);
        const lx = c + R * 1.08 * Math.sin(angle);
        const ly = c + R * 1.08 * Math.cos(angle);
        const alpha = Math.min(1, (lobe.strength + energy) * dim);
        const [r, g, b] = lobe.color;
        const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.55 * alpha})`);
        glow.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${0.22 * alpha})`);
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(lx - radius, ly - radius, radius * 2, radius * 2);
      }

      // Aura: the rim's own light, wide and faint, then narrower and brighter.
      const rotation = t * (0.25 + presence * 0.6);
      const gradient =
        "createConicGradient" in ctx
          ? ctx.createConicGradient(rotation, c, c)
          : (ctx as CanvasRenderingContext2D).createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, "#1fd1a5");
      gradient.addColorStop(0.28, "#4b6bff");
      gradient.addColorStop(0.5, "#c03cff");
      gradient.addColorStop(0.74, "#7a3cff");
      gradient.addColorStop(1, "#1fd1a5");
      const width = box * (0.05 + presence * (0.03 + 0.07 * level));
      // Shadow-only strokes: the ring is drawn off-canvas and only its Gaussian shadow lands
      // here, so the glow falls off smoothly instead of in visible steps. Shadow offset and
      // blur ignore the transform, hence the dpr.
      const offset = size * 4;
      const glow = (color: string, lineWidth: number, blur: number, alpha: number) => {
        ctx.save();
        ctx.translate(-offset, 0);
        ringPath();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = "#000";
        ctx.shadowColor = color;
        ctx.shadowBlur = blur * dpr;
        ctx.shadowOffsetX = offset * dpr;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.restore();
      };
      const lift = 1 + presence * 0.4;
      glow("rgb(140, 70, 255)", width * 1.2, width * 2.4, 0.55 * dim * lift);
      glow("rgb(192, 60, 255)", width * 0.6, width * 1.1, 0.5 * dim * lift);
      glow("rgb(31, 209, 165)", width * 0.3, width * 0.6, 0.35 * dim);
      // A narrow band of the turning spectrum, mostly hidden by the lens, colors the inner glow.
      ringPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width * 0.35;
      ctx.globalAlpha = 0.3 * dim;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Dark lens: covers the inner half of the aura so the light sits around a black core.
      ctx.globalCompositeOperation = "source-over";
      ringPath();
      const core = ctx.createRadialGradient(c, c * 0.95, R * 0.1, c, c, R * 1.02);
      core.addColorStop(0, "#020205");
      core.addColorStop(0.82, "#03020c");
      core.addColorStop(1, "rgba(6, 4, 22, 0.85)");
      ctx.fillStyle = core;
      ctx.fill();

      // The thin, crisp rim: teal, with a whisper of its own glow.
      ctx.globalCompositeOperation = "lighter";
      ringPath();
      const rim = ctx.createLinearGradient(c, c - R, c, c + R);
      rim.addColorStop(0, "rgba(120, 140, 255, 0.95)");
      rim.addColorStop(0.55, "rgba(31, 209, 165, 1)");
      rim.addColorStop(1, "rgba(31, 209, 165, 1)");
      ctx.strokeStyle = rim;
      ctx.shadowColor = "rgba(31, 209, 165, 0.75)";
      ctx.shadowBlur = box * 0.02;
      ctx.lineWidth = Math.max(1.5, box * 0.0065);
      ctx.globalAlpha = 0.95 * dim;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      const progress = listening ? progressRef?.current : null;
      if (progress) drawTrack(ctx, c, R * 1.5, box, progress, t);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [liveRef, progressRef]);

  return (
    <div className={`relative aspect-square w-full ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[170%] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}

/** Thin track around the ring: fills over 12 s, one mark per cumulative attempt. `size` is the orb's box. */
function drawTrack(
  ctx: CanvasRenderingContext2D,
  c: number,
  radius: number,
  size: number,
  { elapsedMs, attempt, processing }: OrbProgress,
  t: number,
) {
  const top = -Math.PI / 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, size * 0.004);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath();
  ctx.arc(c, c, radius, 0, TAU);
  ctx.stroke();

  const done = Math.min(1, elapsedMs / TOTAL_MS);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = Math.max(2, size * 0.006);
  ctx.beginPath();
  ctx.arc(c, c, radius, top, top + done * TAU);
  ctx.stroke();

  MARKS_MS.forEach((mark, index) => {
    const angle = top + (mark / TOTAL_MS) * TAU;
    const x = c + radius * Math.cos(angle);
    const y = c + radius * Math.sin(angle);
    const reached = elapsedMs >= mark;
    const active = processing && attempt === index + 1;
    const dot = size * (active ? 0.016 + 0.004 * Math.sin(t * 8) : 0.012);
    ctx.beginPath();
    ctx.arc(x, y, dot, 0, TAU);
    ctx.fillStyle = active ? "#1fd1a5" : reached ? "#ffffff" : "rgba(255, 255, 255, 0.28)";
    ctx.shadowColor = active ? "rgba(31, 209, 165, 0.9)" : "transparent";
    ctx.shadowBlur = active ? size * 0.04 : 0;
    ctx.fill();
  });
  ctx.restore();
}
