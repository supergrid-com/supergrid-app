import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { connectAdminHost, type AdminHost } from "@supergrid/admin-sdk/app";
import manifest from "../../../supergrid.app.json";

export default function AdminLayout() {
  const [host, setHost] = useState<AdminHost | null>(null);
  const loc = useLocation();
  useEffect(() => { connectAdminHost(manifest.id).then(setHost); }, []);
  useEffect(() => { host?.navigate(loc.pathname.replace(`/admin/${manifest.id}`, "") || "/"); }, [host, loc.pathname]);
  const base = `/admin/${manifest.id}`;
  return (
    <div style={{ background: "var(--sg-admin-bg)", color: "var(--sg-admin-fg)", minHeight: host?.embedded ? undefined : "100vh", padding: "1rem" }}>
      {!host?.embedded && (
        <nav style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <strong>{manifest.name} admin (standalone)</strong>
          {manifest.admin?.nav.map((n) => <Link key={n.path} to={base + (n.path === "/" ? "" : n.path)}>{n.label}</Link>)}
        </nav>
      )}
      <Outlet context={{ host }} />
    </div>
  );
}
