// The admin shell: connects to the SuperGrid desktop around the iframe (admin-sdk), applies the admin tokens, keeps the
// shell's menu and the address in step with React Router, and draws a plain menu of its own when the admin runs standalone.
// Wrap the admin layout route in <AdminApp>; everything under it can call useAdmin().
import { connectAdminHost, type AdminHost } from "@supergrid/admin-sdk/app";
import { flattenNav, type AppManifest, type NavItem } from "@supergrid/app-kit/manifest";
import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { cn } from "../ui/utils";

const AdminContext = React.createContext<{ host: AdminHost | null; manifest: AppManifest; basePath: string } | null>(null);

/** The host (null until it answers), the manifest and the admin's base path. */
export function useAdmin(): { host: AdminHost | null; manifest: AppManifest; basePath: string } {
  const c = React.useContext(AdminContext);
  if (!c) throw new Error("useAdmin outside <AdminApp>");
  return c;
}

/** `/admin/<id>` joined with a path inside the admin. */
export const adminHref = (manifest: Pick<AppManifest, "id">, path: string): string => `/admin/${manifest.id}${path === "/" ? "" : path}`;

export function AdminApp({ manifest, children, className }: { manifest: AppManifest; children: React.ReactNode; className?: string }): React.ReactElement {
  const [host, setHost] = React.useState<AdminHost | null>(null);
  const basePath = `/admin/${manifest.id}`;
  const location = useLocation();
  const navigate = useNavigate();
  React.useEffect(() => {
    let live = true;
    void connectAdminHost(manifest.id, { nav: manifest.admin?.nav ?? [] }).then((h) => { if (live) setHost(h); });
    return () => { live = false; };
  }, [manifest.id]);
  // dialogs, sheets and popovers portal to the body, so the admin tokens live on the document root too
  React.useEffect(() => {
    document.documentElement.setAttribute("data-sg-admin", "");
    return () => document.documentElement.removeAttribute("data-sg-admin");
  }, []);
  // where the app is, as the shell wants it: relative to basePath
  const rel = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) || "/" : location.pathname;
  React.useEffect(() => { host?.navigate(rel + location.search); }, [host, rel, location.search]);
  React.useEffect(() => host?.onNavigate((path) => { if (path !== rel) navigate(adminHref(manifest, path)); }), [host, rel, navigate, manifest]);
  const value = React.useMemo(() => ({ host, manifest, basePath }), [host, manifest, basePath]);
  return (
    <AdminContext.Provider value={value}>
      <div data-sg-admin className={cn("min-h-screen font-sans text-sm antialiased", host && !host.embedded && "flex", className)}>
        {host && !host.embedded && <StandaloneNav manifest={manifest} current={rel} />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AdminContext.Provider>
  );
}

/** The app's menu as the shell would show it, for running the admin on its own. */
function StandaloneNav({ manifest, current }: { manifest: AppManifest; current: string }): React.ReactElement {
  const items: NavItem[] = manifest.admin?.nav ?? [];
  const active = (it: NavItem) => (it.path === "/" ? current === "/" : current === it.path || current.startsWith(`${it.path}/`));
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-1 border-e bg-app-bg p-3">
      <div className="px-2.5 pt-1 pb-3 font-heading text-[15px] font-semibold">{manifest.name}</div>
      <div className="px-2.5 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Standalone</div>
      {flattenNav(items).filter((it) => it.place !== "settings").map((it) => (
        <Link key={it.id ?? it.path} to={adminHref(manifest, it.path)} className={cn("flex h-8 items-center rounded-lg px-2.5 text-[14px] hover:bg-accent", active(it) && "bg-accent font-medium", items.every((top) => top !== it) && "ps-6 text-[13px]")}>
          {it.label}
        </Link>
      ))}
    </aside>
  );
}
