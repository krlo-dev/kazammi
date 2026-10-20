"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { TrackView } from "@/app/_lib/tracks";

import { TrackRow } from "../library/TrackRow";

/** px that the 1st, 2nd and 3rd card behind the front one peek out under it. */
const PEEK = [0, 9, 16, 21];
/** Cards behind the front one that still show an edge. */
const DEPTH = PEEK.length - 1;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * "Mis canciones" as a deck in a box the size of one card plus the peeking edges: the latest
 * card in front, the others stacked behind. Scrolling inside the box (wheel, touch, keys)
 * deals the cards like a carousel: the front one rises and fades, the next comes forward.
 * The page never grows: the box is a native scroll container that snaps to each card, and
 * the cards sit on a sticky layer whose transforms follow its scrollTop every frame.
 */
export function RecentStack({
  tracks,
  heading,
  action,
}: {
  tracks: TrackView[];
  /** The section title, laid out with the deck's controls and `action` in one row. */
  heading: ReactNode;
  action: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLUListElement>(null);
  const rowHeightRef = useRef(0);
  // The card in front, for the button below the deck (set only when it changes).
  const [front, setFront] = useState(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const layer = layerRef.current;
    if (!scroller || !layer) return;
    const cards = Array.from(layer.children) as HTMLElement[];
    const spacers = Array.from(scroller.querySelectorAll<HTMLElement>("[data-snap]"));
    const n = cards.length;
    let rowHeight = 0;
    let frame = 0;

    const layout = () => {
      rowHeight = cards[0].offsetHeight;
      rowHeightRef.current = rowHeight;
      const box = rowHeight + PEEK[Math.min(n - 1, DEPTH)];
      scroller.style.height = `${box}px`;
      layer.style.height = `${box}px`;
      layer.style.marginBottom = `${-box}px`;
      // One snap point per card; the last spacer fills the box so the last card can rest.
      spacers.forEach((spacer, i) => (spacer.style.height = `${i === n - 1 ? box : rowHeight}px`));
    };

    const apply = () => {
      frame = 0;
      const position = rowHeight > 0 ? scroller.scrollTop / rowHeight : 0;
      setFront(Math.round(position));
      // Bottom edge of the cards drawn in front so far, to clip what is still behind them.
      let frontBottom = -Infinity;
      cards.forEach((card, i) => {
        const d = i - position; // 0 = front, > 0 behind, < 0 dealt away
        let y: number;
        let scale = 1;
        let opacity = 1;
        let content = 1;
        if (d < 0) {
          // Leaving: lifts a little and fades, inside the box (it would be cut at its top).
          y = d * 12;
          scale = 1 + d * 0.04;
          opacity = clamp(1 + d * 1.6, 0, 1);
          content = clamp(1 + d * 2, 0, 1);
        } else {
          const depth = Math.min(d, DEPTH);
          const lower = Math.floor(depth);
          const upper = Math.min(lower + 1, DEPTH);
          y = PEEK[lower] + (PEEK[upper] - PEEK[lower]) * (depth - lower);
          scale = 1 - depth * 0.05;
          opacity = d > DEPTH ? clamp(DEPTH + 1 - d, 0, 1) : 1;
          // The arriving text shows in the second half, once the leaving one is gone.
          content = clamp(1 - d * 2, 0, 1);
        }
        card.style.transform = `translateY(${y}px) scaleX(${scale})`;
        card.style.opacity = String(opacity);
        card.style.setProperty("--content", String(content));
        card.style.zIndex = String(Math.round(1000 - Math.abs(d) * 10 - (d < 0 ? 5 : 0)));
        // The glass is translucent: hide the part of a card still behind the ones in front.
        const hidden = d > 0 ? Math.max(0, frontBottom - y) : 0;
        card.style.clipPath = hidden > 0 ? `inset(${hidden}px 0 0 0 round 1.25rem)` : "";
        if (d >= 0) frontBottom = Math.max(frontBottom, y + rowHeight);
        // Only the card in front takes clicks and focus.
        card.inert = Math.abs(d) > 0.5;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    // One gesture deals exactly one card. A touchpad swipe (and some wheels, with inertia)
    // sends a stream of events for up to a second, so after a card is dealt the rest of the
    // stream is swallowed until the events pause. At either end the event passes through.
    const GESTURE_GAP_MS = 220;
    let index = 0;
    let inGesture = false;
    let wheelSum = 0;
    let gestureEnd = 0;
    const onWheel = (event: WheelEvent) => {
      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;
      if (!inGesture) index = Math.round(scroller.scrollTop / rowHeight);
      const atEnd = (direction < 0 && index === 0) || (direction > 0 && index === n - 1);
      if (atEnd && !inGesture) return;
      event.preventDefault();
      window.clearTimeout(gestureEnd);
      gestureEnd = window.setTimeout(() => {
        inGesture = false;
        wheelSum = 0;
      }, GESTURE_GAP_MS);
      if (inGesture) return;
      wheelSum += event.deltaY;
      if (Math.abs(wheelSum) < 24) return;
      inGesture = true;
      index += direction;
      scroller.scrollTo({ top: index * rowHeight, behavior: "smooth" });
    };
    const onResize = () => {
      layout();
      schedule();
    };

    layout();
    apply();
    scroller.addEventListener("scroll", schedule, { passive: true });
    scroller.addEventListener("wheel", onWheel, { passive: false });
    const observer = new ResizeObserver(onResize);
    observer.observe(cards[0]);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      scroller.removeEventListener("wheel", onWheel);
      window.clearTimeout(gestureEnd);
      observer.disconnect();
    };
  }, [tracks]);

  const last = front >= tracks.length - 1;
  const deal = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const next = last ? 0 : front + 1;
    scroller.scrollTo({ top: next * rowHeightRef.current, behavior: "smooth" });
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        {heading}
        <div className="flex items-center gap-2">
          {/* Each click deals the next song; on the last one it goes back to the first. */}
          <button
            type="button"
            onClick={deal}
            aria-label={
              last
                ? "Volver a la primera canción"
                : `Siguiente canción (${front + 2} de ${tracks.length})`
            }
            className="btn-pill h-9 min-h-9 w-9 justify-center px-0"
          >
            {last ? (
              <ChevronUp aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
            ) : (
              <ChevronDown aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
            )}
          </button>
          {action}
        </div>
      </div>
      <div
        ref={scrollerRef}
        tabIndex={0}
        aria-label="Mis canciones: desplázate dentro para ver las demás"
        className="relative snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-[1.25rem] [scrollbar-width:none] focus-visible:outline-offset-2 [&::-webkit-scrollbar]:hidden"
      >
        <ul ref={layerRef} className="sticky top-0">
          {tracks.map((track) => (
            <li
              key={track.id}
              className="absolute inset-x-0 top-0 origin-top will-change-transform [&>div>*]:[opacity:var(--content,1)]"
            >
              <TrackRow track={track} as="div" />
            </li>
          ))}
        </ul>
        {tracks.map((track) => (
          // snap-always: a fast swipe on a touch screen still stops at the next card.
          <div key={track.id} data-snap aria-hidden className="snap-start snap-always" />
        ))}
      </div>
    </>
  );
}
