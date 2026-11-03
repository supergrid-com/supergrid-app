import { appContext } from "@supergrid/app-kit/context";
import { Img } from "@supergrid/app-kit/media-react";
import { useLoaderData } from "react-router";
import { parseAssetRef } from "~/components/admin/asset-field";
import { Container, PageTitle } from "~/components/site/layout";
import { getItem } from "../../lib/items";
import type { Route } from "./+types/item";

// One published item. The image column holds an asset reference (JSON); <Img> draws it at the right size from
// Cloudflare Images, or the file itself when the workspace keeps pictures in its bucket.
export async function loader({ context, params }: Route.LoaderArgs) {
  const { db } = context.get(appContext);
  const item = await getItem(db, params.id);
  if (!item || item.status !== "published") throw new Response("Not found", { status: 404 });
  return { item: { ...item, image: parseAssetRef(item.image) } };
}

export default function PublicItem() {
  const { item } = useLoaderData<typeof loader>();
  return (
    <Container size="narrow">
      <PageTitle title={item.title} />
      {item.image && <Img asset={item.image} width={768} className="mb-8 w-full rounded-2xl" />}
      {item.body && <div className="whitespace-pre-wrap pb-16 text-lg leading-relaxed">{item.body}</div>}
    </Container>
  );
}
