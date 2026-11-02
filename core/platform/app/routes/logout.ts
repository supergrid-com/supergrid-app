import { redirect } from "react-router";
import { platformContext } from "../../src/context";
import type { Route } from "./+types/logout";

export async function action({ request, context }: Route.ActionArgs) {
  const p = context.get(platformContext);
  const { headers } = await p.auth.api.signOut({ headers: request.headers, returnHeaders: true }).catch(() => ({ headers: new Headers() }));
  return redirect("/login", { headers });
}
export const loader = () => redirect("/");
