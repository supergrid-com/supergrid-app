// Small shared pieces for the platform's screens that are not yet rebuilt on the UI components
// (account, org, settings, operator, workspace, setup, signup, invite). They render inside
// LegacyPage / AuthFrame, which give plain HTML a reasonable look under app.css's .sg-legacy rules.
// Each of those screens gets its own design in a later stage; this file shrinks as they do.
import { PageFrame } from "~/components/page-frame";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { cn } from "~/lib/utils";

export const safeNext = (v: string | null | undefined) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/");

/** A page inside the shell: top bar with breadcrumbs, then the legacy markup in a centered column. */
export function LegacyPage({ title, crumbs, children, width }: { title: string; crumbs?: { label: string; to?: string }[]; children: React.ReactNode; width?: "default" | "wide" | "narrow" }) {
  return (
    <PageFrame crumbs={crumbs ?? [{ label: title }]} width={width}>
      <div className="sg-legacy flex flex-col gap-4">{children}</div>
    </PageFrame>
  );
}

/** A public page (setup, sign-up, invitation): one centered card. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      <div className="sg-legacy w-full max-w-md">{children}</div>
    </div>
  );
}

export function Panel({ title, children, danger, className }: { title?: string; children: React.ReactNode; danger?: boolean; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", danger && "border-destructive/40 bg-destructive/4", className)}>
      {title && <h3 className="font-heading text-base font-semibold">{title}</h3>}
      {children}
    </section>
  );
}

export const Err = ({ msg }: { msg?: string | null }) => (msg ? <Alert variant="error"><AlertDescription>{msg}</AlertDescription></Alert> : null);
export const Ok = ({ msg }: { msg?: string | null }) => (msg ? <Alert variant="success"><AlertDescription>{msg}</AlertDescription></Alert> : null);

export const btnLink: React.CSSProperties = { background: "none", border: 0, padding: 0, color: "var(--primary)", cursor: "pointer", font: "inherit", textDecoration: "underline", textUnderlineOffset: 4 };

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object") {
    const body = (e as { body?: { message?: string } }).body;
    if (body?.message) return body.message;
    if ((e as Error).message) return (e as Error).message;
  }
  return String(e);
}
