import { ArrowDownIcon, ArrowRightIcon, CodeIcon, DownloadIcon, ServerIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Container, Muse, MuseGlyph } from "@/components/brand";
import { DemoApp } from "@/components/demo/demo-app";
import { WatchDemoButton } from "@/components/demo-video";

// The hero is a dark card inset from the page: #1B1D24 at the top, fading down into a slow-moving
// violet, magenta, orange and cyan glow, with a dot grid over it and a light that drifts across the dots.
export function Hero() {
  return (
    <section className="p-2 md:p-3">
      <div id="hero" className="relative isolate overflow-clip rounded-[22px] bg-[#1B1D24] md:rounded-[32px]">
        <HeroBackdrop />
        <Container className="relative flex flex-col items-center pt-24 text-center md:pt-28">
          <a
            href="https://cerebralvalley.ai/e/meta-ai-developer-hackathon"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-1.5 text-sm text-white backdrop-blur-md transition-colors hover:bg-white/10"
          >
            <Muse product="Code" />
            <span>Built for the Meta AI Developer Hackathon</span>
            <ArrowRightIcon className="size-3.5" />
          </a>
          <div className="mt-20 mb-4 text-sm font-medium tracking-[0.22em] text-white/70 uppercase md:mt-28">Creators &amp; Marketers</div>
          <h1 className="hero-title text-[40px] leading-[1.1] font-medium tracking-wider text-white sm:text-5xl md:text-6xl md:whitespace-nowrap">Introducing a new way to build</h1>
          <p className="mt-6 max-w-[60ch] text-xl leading-relaxed tracking-wide text-balance text-white md:text-2xl">SuperGrid is a platform to build, own and extend your own marketing stack</p>
          <p className="mt-3 max-w-[50ch] text-lg leading-relaxed tracking-wide text-balance text-white/70 md:text-xl">Install apps, build your own and own every part of it</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="#beta" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[17px] text-ink shadow-[0_0_40px_rgb(255_255_255/18%)] transition-colors hover:bg-white/90">
              <DownloadIcon className="size-4" /> Try the Beta App
            </a>
            <WatchDemoButton className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/[0.04] px-6 text-[17px] text-white backdrop-blur-md transition-colors hover:bg-white/10" />
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-2.5 text-[15px] font-medium text-white">
            {(
              [
                [<ServerIcon key="s" className="size-4 text-white/70" />, "Self-hosted"],
                [<MuseGlyph key="m" className="h-2.5 w-5" />, "Your own Muse Code"],
                [<CodeIcon key="c" className="size-4 text-white/70" />, "Extend & build"],
              ] as const
            ).map(([icon, label]) => (
              <li key={label} className="flex items-center gap-2 rounded-full bg-[#1B1D24]/35 px-4 py-2 backdrop-blur-md">
                {icon}
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-16 flex items-center gap-2 text-[15px] tracking-wide text-white/60 md:mt-20">
            A clickable preview of the SuperGrid desktop app, have a look around
            <ArrowDownIcon className="size-4 animate-bounce" />
          </p>
          <Blueprint>
            <DemoApp className="relative" />
          </Blueprint>
        </Container>
      </div>
    </section>
  );
}

// The clickable app, nearly the hero's full width at the bottom of the dark card, drawn up like
// a blueprint: a dashed frame sits just outside it in the gutter. Hidden on phones.
function Blueprint({ children }: { children: ReactNode }) {
  return (
    <div className="relative mt-8 mb-12 w-[calc(100vw-48px)] md:w-[min(1680px,calc(100vw-136px))] md:mt-10 md:mb-16">
      <div className="absolute inset-x-[8%] -top-10 bottom-0 rounded-full bg-white/12 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
        {/* the dashed frame */}
        <div className="absolute -inset-3.5 rounded-[24px] border border-dashed border-white/10" />
      </div>
      {children}
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <div className="hero-blob hero-blob-violet" />
      <div className="hero-blob hero-blob-blue" />
      <div className="hero-blob hero-blob-cyan" />
      <div className="hero-blob hero-blob-magenta" />
      <div className="hero-blob hero-blob-orange" />
      <div className="hero-fade" />
      <div className="hero-dots" />
      <div className="hero-dots hero-dots-lit" />
    </div>
  );
}
