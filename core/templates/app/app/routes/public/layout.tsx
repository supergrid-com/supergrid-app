import { appContext } from "@supergrid/app-kit/context";
import { Outlet, useLoaderData } from "react-router";
import { SiteLayout } from "~/components/site/layout";
import manifest from "../../../supergrid.app.json";
import type { Route } from "./+types/layout";

// Every public page inside the site frame. `href` comes from the mount the workspace serves the app at.
export async function loader({ context }: Route.LoaderArgs) {
  const { href } = context.get(appContext);
  return { home: href("/") };
}

export default function PublicLayout() {
  const { home } = useLoaderData<typeof loader>();
  return (
    <SiteLayout app={manifest.id} title={manifest.name} home={home}>
      <Outlet />
    </SiteLayout>
  );
}
