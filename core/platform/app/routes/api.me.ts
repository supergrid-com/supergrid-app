// `sg login` checks the key with this; the CLI also uses it to pick the organization for new workspaces.
import { platformContext, requireActor } from "../../src/context";
import type { Route } from "./+types/api.me";

export async function loader({ context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  return Response.json({
    user: { id: p.actor.user.id, name: p.actor.user.name, email: p.actor.user.email }, operator: p.actor.operator, via: p.actor.via, mode: p.mode,
    organizations: p.memberships.map((m) => ({ id: m.organizationId, slug: m.slug, name: m.name, role: m.role })),
  });
}
