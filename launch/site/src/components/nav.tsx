"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/components/brand";

// The top bar. At the very top it sits inside the dark hero with no background of its own; once
// the page scrolls it turns to the hero's dark at 90%, over a light blur.

// In page order: the letter, the new model, the workspace, apps, and the expert-built App Store
const links = [
  ["Why SuperGrid", "#changing"],
  ["How It Works", "#how"],
  ["Workspaces", "#workspaces"],
  ["Apps", "#apps"],
  ["Expert Apps", "#marketplace"],
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY >= 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const bar = scrolled ? "border-white/10 bg-[#1B1D24]/90 backdrop-blur-sm" : "border-transparent bg-transparent pt-5 md:pt-6";

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b pt-2 transition-[background-color,border-color,padding] duration-300 md:pt-0 ${bar}`}>
      <div className="flex h-16 w-full items-center gap-8 px-5 sm:px-8 md:grid md:px-10 md:grid-cols-[1fr_auto_1fr]">
        <a href="#" className="flex items-center gap-2.5 text-xl font-medium tracking-wide text-white">
          <Mark size={24} mono />
          SuperGrid
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] font-normal tracking-wider text-white/70 uppercase">Beta</span>
        </a>
        <nav className="hidden items-center gap-8 text-[16.5px] font-medium text-white/90 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="transition-colors hover:text-white">
              {label}
            </a>
          ))}
        </nav>
        <a href="#beta" className="ml-auto inline-flex h-10 shrink-0 items-center rounded-full bg-white px-4 text-[15px] whitespace-nowrap text-ink sm:px-5 transition-colors hover:bg-white/90 md:justify-self-end">
          Try the Beta
        </a>
      </div>
    </header>
  );
}
