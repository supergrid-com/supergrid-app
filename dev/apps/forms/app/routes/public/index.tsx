import { Link, useLoaderData } from "react-router";
import { appContext } from "@supergrid/app-kit/context";
import type { Route } from "./+types/index";

export async function loader({ context }: Route.LoaderArgs) {
  const { db, manifest } = context.get(appContext);
  const forms = (await db.prepare("SELECT slug, title FROM app_forms_forms ORDER BY created_at DESC").all<{ slug: string; title: string }>()).results;
  return { forms, mount: manifest.public!.mount };
}

export default function FormsIndex() {
  const { forms, mount } = useLoaderData<typeof loader>();
  return (
    <main style={{ maxWidth: "36rem", margin: "4rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontFamily: "var(--sg-font-display)" }}>Forms</h1>
      {forms.length === 0 && <p className="sg-muted">No forms yet. Create one in the admin.</p>}
      <ul>{forms.map((f) => <li key={f.slug}><Link to={`${mount}/${f.slug}`}>{f.title}</Link></li>)}</ul>
    </main>
  );
}
