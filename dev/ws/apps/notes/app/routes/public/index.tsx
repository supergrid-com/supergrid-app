import { appContext } from "@supergrid/app-kit/context";
import { Link, useLoaderData } from "react-router";
import { Container, PageTitle } from "~/components/site/layout";
import { listItems } from "../../lib/items";
import manifest from "../../../supergrid.app.json";
import type { Route } from "./+types/index";

// The public index: published items. Links use `href` so they follow the mount the sitemap chose.
export async function loader({ context }: Route.LoaderArgs) {
  const { db, href } = context.get(appContext);
  const items = await listItems(db, { status: "published" });
  return { items: items.map((i) => ({ id: i.id, title: i.title, body: i.body, href: href(`/${i.id}`) })) };
}

export default function PublicIndex() {
  const { items } = useLoaderData<typeof loader>();
  return (
    <Container>
      <PageTitle title={manifest.name} lede={manifest.description} />
      {items.length === 0 ? (
        <p className="pb-16 text-muted-foreground">Nothing published yet.</p>
      ) : (
        <ul className="grid gap-4 pb-16 sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.id}>
              <Link to={i.href} className="block rounded-2xl border bg-card p-5 transition-colors hover:bg-muted">
                <h2 className="font-heading text-lg font-semibold">{i.title}</h2>
                {i.body && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{i.body}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
