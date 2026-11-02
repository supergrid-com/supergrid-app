import { useLoaderData, useOutletContext } from "react-router";
import { appContext } from "@supergrid/app-kit/context";
import type { AdminHost } from "@supergrid/admin-sdk/app";
import type { Route } from "./+types/index";

export async function loader({ context }: Route.LoaderArgs) {
  const { workspace, db, user } = context.get(appContext);
  const [contacts, notes] = await Promise.all([workspace.listContacts(50), db.prepare("SELECT COUNT(*) AS n FROM app_hello_notes").first<{ n: number }>()]);
  return { contacts, noteCount: notes?.n ?? 0, user: user && { name: user.name, email: user.email, role: user.role, permissions: user.permissions } };
}

export default function AdminIndex() {
  const { contacts, noteCount, user } = useLoaderData<typeof loader>();
  const { host } = useOutletContext<{ host: AdminHost | null }>();
  return (
    <section className="sg-card" style={{ background: "var(--sg-admin-panel)" }}>
      <h2 style={{ marginTop: 0 }}>Hello overview</h2>
      <p className="sg-muted">
        {host ? (host.embedded ? `Embedded in the platform as ${host.session?.user.name} on ${host.session?.workspace.name}.` : "Running standalone.") : "Connecting to host…"}
      </p>
      {user && <p className="sg-muted">Server-side (from the workspace's <code>x-sg-user</code>): {user.name} &lt;{user.email}&gt;, role <strong>{user.role}</strong>, {user.permissions.length} permissions.</p>}
      <p>{contacts.length} contact(s) in the workspace, {noteCount} note(s) in <code>app_hello_notes</code>.</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th align="left">Email</th><th align="left">Name</th><th align="left">Created</th></tr></thead>
        <tbody>{contacts.map((c) => <tr key={c.id}><td>{c.email}</td><td>{c.name}</td><td className="sg-muted">{c.created_at}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
