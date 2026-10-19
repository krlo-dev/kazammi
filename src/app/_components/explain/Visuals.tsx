"use client";

import { Mic } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";

import { formatDuration } from "@/app/_lib/tracks";
import { useLastRecognition, type HashExample, type Spectrogram } from "@/modules/capture";

import { StateMessage } from "../ui/StateMessage";
import { canvasFont, colormap, INK, useCanvas } from "./use-canvas";

const SAMPLE_RATE = 11025;
/** Bins shown on the frequency axis: up to 4 kHz, where music keeps most of its peaks. */
const MAX_HZ = 4000;

/** Shows the walk only when this tab has a finished listening (UI-R24). */
export function RecognitionGate({ children }: { children: ReactNode }) {
  const last = useLastRecognition();
  if (!last) {
    return (
      <div className="py-16">
        <StateMessage
          icon={Mic}
          title="Primero, identifica una canción"
          actions={
            <Link href="/" className="btn-primary rounded-full">
              Ir a Identificar
            </Link>
          }
        >
          <p>
            Esta vista muestra paso a paso cómo se reconoció tu última escucha: la onda, el
            espectrograma, los picos, los hashes y el desfase. Los datos viven en esta pestaña.
          </p>
        </StateMessage>
      </div>
    );
  }
  return <>{children}</>;
}

/** "Touch, de Daft Punk" or the no-match line, under the page title. */
export function RecognizedLead() {
  const last = useLastRecognition();
  if (!last) return null;
  if (!last.match) return <>Tu última escucha no encontró la canción. Así se analizó el audio.</>;
  const { track, offsetSeconds } = last.match;
  return (
    <>
      Tu última escucha: <span className="text-fg">{track.title}</span>, de{" "}
      <span className="text-fg">{track.artist}</span>, desde el{" "}
      <span className="tabular-nums text-fg">{formatDuration(offsetSeconds)}</span>.
    </>
  );
}

function Frame({
  label,
  children,
  tall = false,
}: {
  label: string;
  children: ReactNode;
  tall?: boolean;
}) {
  return (
    <figure className="glass overflow-hidden rounded-[1.5rem] p-3 sm:p-4">
      <div className={tall ? "h-[min(56vh,30rem)]" : "h-[min(36vh,18rem)]"}>{children}</div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

export function WaveformView() {
  const last = useLastRecognition();
  const waveform = last?.debug.waveform;
  const seconds = ((last?.debug.spectrogram.frames ?? 0) * 512) / SAMPLE_RATE;
  const ref = useCanvas(
    (ctx, w, h) => {
      if (!waveform) return;
      const pad = { l: 8, r: 8, t: 8, b: 30 };
      const mid = pad.t + (h - pad.t - pad.b) / 2;
      const amp = (h - pad.t - pad.b) / 2;
      let peak = 1e-6;
      for (const v of waveform) peak = Math.max(peak, Math.abs(v));
      const blocks = waveform.length / 2;
      const gradient = ctx.createLinearGradient(pad.l, 0, w - pad.r, 0);
      gradient.addColorStop(0, INK.teal);
      gradient.addColorStop(0.5, INK.magenta);
      gradient.addColorStop(1, INK.teal);
      ctx.fillStyle = gradient;
      const step = (w - pad.l - pad.r) / blocks;
      for (let b = 0; b < blocks; b++) {
        const lo = waveform[2 * b] / peak;
        const hi = waveform[2 * b + 1] / peak;
        const x = pad.l + b * step;
        ctx.fillRect(x, mid - hi * amp, Math.max(1, step * 0.85), Math.max(1, (hi - lo) * amp));
      }
      drawTimeAxis(ctx, pad.l, w - pad.r, h - 6, seconds);
    },
    [waveform, seconds],
  );
  return (
    <Frame label="Forma de onda de la grabación">
      <canvas ref={ref} aria-hidden className="h-full w-full" />
    </Frame>
  );
}

/** dB-normalized spectrogram as an image (frames x shown bins), built once per recording. */
function useSpectrogramImage(spec: Spectrogram | undefined) {
  return useMemo(() => {
    if (!spec || spec.frames === 0) return null;
    const bins = Math.min(spec.bins, Math.ceil((MAX_HZ * spec.windowSize) / spec.sampleRate));
    let max = 1e-9;
    for (const v of spec.data) max = Math.max(max, v);
    const image = new ImageData(spec.frames, bins);
    for (let f = 0; f < spec.frames; f++) {
      for (let k = 0; k < bins; k++) {
        const v = spec.data[f * spec.bins + k];
        const db = 20 * Math.log10(Math.max(v / max, 1e-6));
        const [r, g, b] = colormap(1 + db / 70);
        const i = ((bins - 1 - k) * spec.frames + f) * 4;
        image.data[i] = r;
        image.data[i + 1] = g;
        image.data[i + 2] = b;
        image.data[i + 3] = 255;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = spec.frames;
    canvas.height = bins;
    canvas.getContext("2d")?.putImageData(image, 0, 0);
    return { canvas, bins };
  }, [spec]);
}

const PAD = { l: 62, r: 8, t: 8, b: 30 };

function plotArea(w: number, h: number) {
  return { x: PAD.l, y: PAD.t, w: w - PAD.l - PAD.r, h: h - PAD.t - PAD.b };
}

export function SpectrogramView({ withPeaks = false }: { withPeaks?: boolean }) {
  const last = useLastRecognition();
  const spec = last?.debug.spectrogram;
  const peaks = last?.debug.peaks;
  const image = useSpectrogramImage(spec);
  const ref = useCanvas(
    (ctx, w, h) => {
      if (!spec || !image) return;
      const area = plotArea(w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = withPeaks ? 0.38 : 1;
      ctx.drawImage(image.canvas, area.x, area.y, area.w, area.h);
      ctx.globalAlpha = 1;
      if (withPeaks && peaks) {
        ctx.fillStyle = INK.teal;
        ctx.shadowColor = "rgba(31, 209, 165, 0.8)";
        ctx.shadowBlur = 6;
        for (const peak of peaks) {
          if (peak.bin >= image.bins) continue;
          const x = area.x + ((peak.frame + 0.5) / spec.frames) * area.w;
          const y = area.y + (1 - (peak.bin + 0.5) / image.bins) * area.h;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
      drawFreqAxis(ctx, area, (image.bins * spec.sampleRate) / spec.windowSize);
      drawTimeAxis(
        ctx,
        area.x,
        area.x + area.w,
        h - 6,
        (spec.frames * spec.hopSize) / spec.sampleRate,
      );
    },
    [spec, image, peaks, withPeaks],
  );
  return (
    <Frame
      label={withPeaks ? "Constelación de picos sobre el espectrograma" : "Espectrograma"}
      tall
    >
      <canvas ref={ref} aria-hidden className="h-full w-full" />
    </Frame>
  );
}

export function PeakCount() {
  const last = useLastRecognition();
  if (!last) return null;
  const seconds = (last.debug.spectrogram.frames * 512) / SAMPLE_RATE;
  return (
    <span className="tabular-nums">
      {last.debug.peaks.length.toLocaleString("es")} picos en {seconds.toFixed(1).replace(".", ",")}{" "}
      s
    </span>
  );
}

export function HashExampleView() {
  const last = useLastRecognition();
  const spec = last?.debug.spectrogram;
  const example = last?.debug.hashExample ?? null;
  const peaks = last?.debug.peaks;
  const image = useSpectrogramImage(spec);
  const ref = useCanvas(
    (ctx, w, h) => {
      if (!spec || !image || !example || !peaks) return;
      const area = plotArea(w, h);
      const f0 = Math.max(0, example.anchor.frame - 6);
      const f1 = Math.min(spec.frames, example.zone.toFrame + 4);
      const k0 = Math.max(
        0,
        Math.min(example.zone.fromBin, ...example.pairs.map((p) => p.point.bin)) - 6,
      );
      const k1 = Math.min(
        image.bins,
        Math.max(...example.pairs.map((p) => p.point.bin), example.anchor.bin) + 8,
      );
      const fx = (frame: number) => area.x + ((frame + 0.5 - f0) / (f1 - f0)) * area.w;
      const ky = (bin: number) => area.y + (1 - (bin + 0.5 - k0) / (k1 - k0)) * area.h;

      ctx.globalAlpha = 0.35;
      ctx.drawImage(
        image.canvas,
        f0,
        image.bins - k1,
        f1 - f0,
        k1 - k0,
        area.x,
        area.y,
        area.w,
        area.h,
      );
      ctx.globalAlpha = 1;

      // Target zone Z(a).
      const zx0 = fx(example.zone.fromFrame - 0.5);
      const zx1 = fx(Math.min(example.zone.toFrame, f1 - 1) + 0.5);
      const zy0 = ky(Math.min(example.zone.toBin, k1 - 1) + 0.5);
      const zy1 = ky(Math.max(example.zone.fromBin, k0) - 0.5);
      ctx.fillStyle = "rgba(31, 209, 165, 0.07)";
      ctx.fillRect(zx0, zy0, zx1 - zx0, zy1 - zy0);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(zx0, zy0, zx1 - zx0, zy1 - zy0);
      ctx.setLineDash([]);

      // Other peaks, faint.
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      for (const peak of peaks) {
        if (peak.frame < f0 || peak.frame >= f1 || peak.bin < k0 || peak.bin >= k1) continue;
        ctx.beginPath();
        ctx.arc(fx(peak.frame), ky(peak.bin), 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const ax = fx(example.anchor.frame);
      const ay = ky(example.anchor.bin);
      example.pairs.forEach(({ point }) => {
        ctx.strokeStyle = "rgba(31, 209, 165, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(fx(point.frame), ky(point.bin));
        ctx.stroke();
      });
      // Each label takes the spot (right/left, above/below its dot) farthest from every
      // other dot and from the labels already placed, so close points never collide.
      const dots = [
        { x: ax, y: ay },
        ...example.pairs.map(({ point }) => ({ x: fx(point.frame), y: ky(point.bin) })),
      ];
      const placed: Array<{ x: number; y: number }> = [];
      ctx.font = canvasFont();
      example.pairs.forEach((_pair, i) => {
        const { x, y } = dots[i + 1];
        ctx.fillStyle = INK.teal;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        const text = `p${i + 1}`;
        const tw = ctx.measureText(text).width;
        const spots = [
          { x: x + 9, y: y - 8 },
          { x: x + 9, y: y + 20 },
          { x: x - 9 - tw, y: y - 8 },
          { x: x - 9 - tw, y: y + 20 },
        ];
        // Distance from a spot's label center to the nearest obstacle.
        const clearance = (spot: { x: number; y: number }) => {
          const cx = spot.x + tw / 2;
          const cy = spot.y - 5;
          const others = [...dots.filter((_, d) => d !== i + 1), ...placed];
          return Math.min(...others.map((o) => Math.hypot(o.x - cx, o.y - cy)));
        };
        const best = spots.reduce((a, b) => (clearance(b) > clearance(a) ? b : a));
        placed.push({ x: best.x + tw / 2, y: best.y - 5 });
        ctx.fillStyle = INK.white;
        ctx.fillText(text, best.x, best.y);
      });
      ctx.fillStyle = INK.magenta;
      ctx.shadowColor = "rgba(192, 60, 255, 0.9)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(ax, ay, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = INK.white;
      ctx.font = canvasFont();
      ctx.fillText("a", ax - 4, ay - 12);

      drawFreqAxis(
        ctx,
        area,
        (k1 * spec.sampleRate) / spec.windowSize,
        (k0 * spec.sampleRate) / spec.windowSize,
      );
    },
    [spec, image, example, peaks],
  );

  if (!example) {
    return (
      <p className="text-fg-2">
        Esta escucha tuvo muy pocos picos para mostrar un ejemplo de pares.
      </p>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Frame label="Un ancla, su zona objetivo y los cinco puntos con los que forma pares" tall>
        <canvas ref={ref} aria-hidden className="h-full w-full" />
      </Frame>
      <HashTable example={example} />
    </div>
  );
}

const hex = (hash: number) => `0x${hash.toString(16).padStart(8, "0").toUpperCase()}`;

function HashTable({ example }: { example: HashExample }) {
  const first = example.pairs[0];
  const bits = [
    { name: "k", sub: "a", value: example.anchor.bin, width: 9, className: "bg-magenta/80" },
    { name: "k", sub: "p", value: first.point.bin, width: 9, className: "bg-teal/80 text-ink-0" },
    {
      name: "Δm",
      sub: "",
      value: first.deltaFrames,
      width: 14,
      className: "bg-white/80 text-ink-0",
    },
  ];
  return (
    <div className="glass flex flex-col rounded-[1.5rem] p-4">
      <p className="text-sm text-fg-2">
        Ancla <span className="text-fg">a</span> en el bin{" "}
        <span className="tabular-nums text-fg">{example.anchor.bin}</span> (
        {Math.round((example.anchor.bin * SAMPLE_RATE) / 1024)} Hz)
      </p>
      <table className="mt-3 w-full text-sm tabular-nums">
        <caption className="sr-only">Pares del ancla y sus hashes de 32 bits</caption>
        <thead className="text-left text-fg-3">
          <tr>
            <th className="py-1.5 font-medium">Par</th>
            <th className="py-1.5 font-medium">
              k<sub>p</sub>
            </th>
            <th className="py-1.5 font-medium">Δm</th>
            <th className="py-1.5 text-right font-medium">Hash</th>
          </tr>
        </thead>
        <tbody>
          {example.pairs.map((pair, i) => (
            <tr key={pair.hash + ":" + i} className="border-t border-hairline">
              <td className="py-2">(a, p{i + 1})</td>
              <td>{pair.point.bin}</td>
              <td>{pair.deltaFrames}</td>
              <td className="text-right font-mono text-fg">{hex(pair.hash)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-5 text-sm text-fg-2">Los 32 bits del primer hash:</p>
      <div className="mt-2 flex h-10 overflow-hidden rounded-lg text-sm font-semibold" aria-hidden>
        {bits.map((field) => (
          <div
            key={field.name + field.sub}
            className={`grid place-items-center ${field.className}`}
            style={{ flex: field.width }}
          >
            <span>
              {field.name}
              {field.sub && <sub>{field.sub}</sub>} = {field.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex text-sm text-fg-3 tabular-nums" aria-hidden>
        <span style={{ flex: 9 }}>9 bits</span>
        <span style={{ flex: 9 }}>9 bits</span>
        <span className="text-right" style={{ flex: 14 }}>
          14 bits
        </span>
      </div>
    </div>
  );
}

export function HistogramView() {
  const last = useLastRecognition();
  const histogram = last?.debug.histogram;
  const match = last?.match ?? null;
  const ref = useCanvas(
    (ctx, w, h) => {
      if (!histogram || histogram.length === 0) return;
      const area = plotArea(w, h);
      const deltas = histogram.map(([d]) => d);
      const minD = Math.min(...deltas);
      const maxD = Math.max(...deltas);
      const span = Math.max(1, maxD - minD);
      const top = Math.max(...histogram.map(([, c]) => c));
      const winner = histogram.reduce((a, b) => (b[1] > a[1] ? b : a));
      const bar = Math.max(1.5, Math.min(6, area.w / histogram.length));

      ctx.strokeStyle = INK.grid;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        const y = area.y + area.h - (i / 4) * area.h;
        ctx.beginPath();
        ctx.moveTo(area.x, y);
        ctx.lineTo(area.x + area.w, y);
        ctx.stroke();
      }

      for (const [delta, count] of histogram) {
        const x = area.x + ((delta - minD) / span) * (area.w - bar);
        const height = (count / top) * area.h;
        const isWinner = delta === winner[0];
        ctx.fillStyle = isWinner ? INK.magenta : "rgba(185, 180, 220, 0.55)";
        if (isWinner) {
          ctx.shadowColor = "rgba(192, 60, 255, 0.9)";
          ctx.shadowBlur = 18;
        }
        ctx.fillRect(x, area.y + area.h - height, bar, height);
        ctx.shadowBlur = 0;
      }

      // The peak's label sits on a chip beside the winning bar, never across it.
      const wx = area.x + ((winner[0] - minD) / span) * (area.w - bar);
      ctx.font = canvasFont(15, 600);
      // The long label, or the short one on narrow charts: whichever fits beside the bar.
      const labels = [
        `δ = ${winner[0]} frames · ${winner[1]} coincidencias`,
        `δ = ${winner[0]} · ${winner[1]}`,
      ];
      const roomRight = area.x + area.w - (wx + bar + 10);
      const roomLeft = wx - 10 - area.x;
      const label =
        labels.find((text) => ctx.measureText(text).width + 20 <= Math.max(roomRight, roomLeft)) ??
        labels[1];
      const chipW = ctx.measureText(label).width + 20;
      const chipH = 30;
      const cx = chipW <= roomRight ? wx + bar + 10 : Math.max(area.x, wx - 10 - chipW);
      const cy = area.y + 6;
      ctx.fillStyle = "rgba(5, 6, 9, 0.88)";
      ctx.strokeStyle = "rgba(192, 60, 255, 0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx, cy, chipW, chipH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK.white;
      ctx.fillText(label, cx + 10, cy + 20);

      ctx.fillStyle = INK.axis;
      ctx.font = canvasFont();
      ctx.fillText(String(top), 6, area.y + 12);
      ctx.fillText("0", 6, area.y + area.h);
      const toTime = (d: number) => formatDuration((d * 512) / SAMPLE_RATE);
      ctx.fillText(toTime(minD), area.x, h - 6);
      const end = toTime(maxD);
      ctx.fillText(end, area.x + area.w - ctx.measureText(end).width, h - 6);
    },
    [histogram],
  );

  if (!histogram || histogram.length === 0) {
    return (
      <p className="glass rounded-[1.5rem] p-5 text-fg-2">
        {match
          ? "Esta respuesta no trajo el histograma."
          : "Sin coincidencia: ningún desfase juntó suficientes hashes, así que no hay un pico que mostrar. Eso es justo lo que evita los falsos positivos."}
      </p>
    );
  }
  return (
    <Frame label="Histograma de desfases del ganador, con el pico resaltado" tall>
      <canvas ref={ref} aria-hidden className="h-full w-full" />
    </Frame>
  );
}

export function WinnerLine() {
  const last = useLastRecognition();
  const match = last?.match;
  if (!match) return null;
  return (
    <p className="mt-4 text-fg-2">
      El pico cae en el{" "}
      <span className="tabular-nums text-fg">{formatDuration(match.offsetSeconds)}</span> de{" "}
      <span className="text-fg">{match.track.title}</span>: ahí empezó tu grabación dentro de la
      canción. Score <span className="tabular-nums text-fg">{match.score}</span> contra{" "}
      <span className="tabular-nums text-fg">{match.runnerUpScore}</span> del segundo candidato.
    </p>
  );
}

function drawTimeAxis(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  seconds: number,
) {
  if (seconds <= 0) return;
  ctx.fillStyle = INK.axis;
  ctx.font = canvasFont();
  const step = seconds > 8 ? 2 : 1;
  for (let s = 0; s <= seconds + 1e-6; s += step) {
    const x = x0 + (s / seconds) * (x1 - x0);
    const text = `${s} s`;
    const tw = ctx.measureText(text).width;
    ctx.fillText(text, Math.min(Math.max(x0, x - tw / 2), x1 - tw), y);
  }
}

function drawFreqAxis(
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; w: number; h: number },
  topHz: number,
  bottomHz = 0,
) {
  ctx.fillStyle = INK.axis;
  ctx.font = canvasFont();
  const span = topHz - bottomHz;
  const step = span > 2500 ? 1000 : span > 1000 ? 500 : 250;
  for (let hz = Math.ceil(bottomHz / step) * step; hz <= topHz; hz += step) {
    const y = area.y + (1 - (hz - bottomHz) / span) * area.h;
    const text = hz >= 1000 ? `${(hz / 1000).toString().replace(".", ",")} kHz` : `${hz} Hz`;
    ctx.fillText(text, 0, Math.min(area.y + area.h, Math.max(area.y + 10, y + 4)));
  }
}
