// The public side's frame: the workspace theme's fonts and colors (loaded by root.tsx from /_ws/theme.css), the
// tracker that records a page.view per navigation, and a header and footer every public page shares. Change it
// freely; it is the app's own. Keep looks in tokens (bg-background, text-muted-foreground, font-heading).
import { Analytics } from "@supergrid/app-kit/react";
import * as React from "react";
import { Link } from "react-router";
import { cn } from "../ui/utils";

export function SiteLayout({ app, title, home, nav = [], children, footer }: { app: string; title: string; home: string; nav?: { label: string; to: string }[]; children: React.ReactNode; footer?: React.ReactNode }): React.ReactElement {
  return (
    <Analytics app={app}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="border-b">
          <Container className="flex h-14 items-center gap-6">
            <Link to={home} className="font-heading text-lg font-semibold">{title}</Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              {nav.map((n) => (
                <Link key={n.to} to={n.to} className="hover:text-foreground">{n.label}</Link>
              ))}
            </nav>
          </Container>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t py-8 text-sm text-muted-foreground">
          <Container>{footer ?? `© ${new Date().getFullYear()} ${title}`}</Container>
        </footer>
      </div>
    </Analytics>
  );
}

export function Container({ children, className, size = "default" }: { children: React.ReactNode; className?: string; size?: "default" | "narrow" | "wide" }): React.ReactElement {
  return <div className={cn("mx-auto w-full px-4 sm:px-6", size === "default" && "max-w-5xl", size === "narrow" && "max-w-2xl", size === "wide" && "max-w-7xl", className)}>{children}</div>;
}

/** A page's title block on the public side. */
export function PageTitle({ title, lede }: { title: string; lede?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {lede && <p className="max-w-2xl text-lg text-muted-foreground">{lede}</p>}
    </div>
  );
}
