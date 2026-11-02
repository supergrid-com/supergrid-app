import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router";
import { connectAdminHost, type AdminHost } from "@supergrid/admin-sdk/app";
import manifest from "../../../supergrid.app.json";

export default function AdminLayout() {
  const [host, setHost] = useState<AdminHost | null>(null);
  useEffect(() => { connectAdminHost(manifest.id).then(setHost); }, []);
  return (
    <div style={{ background: "var(--sg-admin-bg)", color: "var(--sg-admin-fg)", minHeight: host?.embedded ? undefined : "100vh", padding: "1rem" }}>
      {!host?.embedded && <nav style={{ marginBottom: "1rem" }}><strong>{manifest.name} admin (standalone)</strong> · <Link to={`/admin/${manifest.id}`}>Forms</Link></nav>}
      <Outlet context={{ host }} />
    </div>
  );
}
