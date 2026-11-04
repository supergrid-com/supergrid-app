"use client";

import { useEffect, useRef } from "react";

// The grey half of a two-tone headline, filling in word by word as it scrolls up the screen. Each
// word starts in the grey and blends to rose; the words go in order, so the fill reads left to
// right. With reduced motion it stays grey, as it was.

// Where the fill runs: from when the text's top reaches this far down the screen, to this far.
const START = 0.85;
const END = 0.4;

const FILL = "var(--color-rose)";

export function ScrollFill({ text, from, className }: { text: string; from: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = Array.from(root.querySelectorAll<HTMLSpanElement>("[data-word]"));
    let frame = 0;

    const paint = () => {
      frame = 0;
      const vh = window.innerHeight;
      const top = root.getBoundingClientRect().top;
      const atEnd = window.scrollY + vh >= document.documentElement.scrollHeight - 2;
      const p = atEnd ? 1 : Math.min(1, Math.max(0, (vh * START - top) / (vh * (START - END))));
      words.forEach((w, i) => {
        const t = Math.min(1, Math.max(0, p * words.length - i));
        w.style.color = `color-mix(in srgb, ${FILL} ${(t * 100).toFixed(1)}%, ${from})`;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [from]);

  return (
    <span ref={ref} className={className}>
      {text.split(" ").map((word, i) => (
        <span key={i}>
          {" "}
          <span data-word style={{ color: from }} className="transition-colors duration-150 ease-out">
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}
