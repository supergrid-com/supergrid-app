"use client";

import { PlayIcon, XIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// "Watch the Demo": a button that opens the demo video in a modal over the page, and the same modal
// opened by a link to supergrid.com/#demo (the repo README links there). The video is the launch film
// on YouTube (youtu.be/Aq2P6M_lzBQ).

const DEMO_VIDEO_ID = "Aq2P6M_lzBQ";

export function WatchDemoButton({ className, children = "Watch the Demo" }: { className: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`cursor-pointer ${className}`}>
        <PlayIcon className="size-4" /> {children}
      </button>
      {open ? <VideoModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Opens the video when the address is #demo, on load or when the hash changes; closing it drops the hash. Mount once. */
export function DemoFromHash() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => setOpen(window.location.hash === "#demo");
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  if (!open) return null;
  return (
    <VideoModal
      onClose={() => {
        history.replaceState(null, "", window.location.pathname + window.location.search);
        setOpen(false);
      }}
    />
  );
}

function VideoModal({ onClose }: { onClose: () => void }) {
  // close on Escape, and keep the page behind from scrolling while it's open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="SuperGrid demo" onClick={onClose} className="demo-fade fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4 sm:p-8">
      <div onClick={(e) => e.stopPropagation()} className="demo-in relative w-full max-w-[min(1120px,calc((100dvh-12rem)*16/9))]">
        <button type="button" onClick={onClose} aria-label="Close the video" className="absolute -top-12 right-0 grid size-10 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
          <XIcon className="size-5" />
        </button>
        <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-[0_0_0_1px_rgb(255_255_255/10%),0_40px_120px_rgb(0_0_0/60%)]">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
            title="SuperGrid demo"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="size-full"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
