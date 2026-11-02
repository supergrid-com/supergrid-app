import { createContext } from "react-router";
import type { Actor, Auth } from "./auth";
import type { Membership } from "./db";
import type { Env, Mode } from "./types";

export type Platform = {
  env: Env;
  auth: Auth;
  /** Null only on public routes (login, signup, setup, invitation). */
  actor: Actor | null;
  mode: Mode;
  memberships: Membership[];
  /** The organization the actor is working in: the session's active one, else their first. */
  activeOrg: Membership | null;
  branding: { name: string; accent: string };
};
export const platformContext = createContext<Platform>();

/** For loaders and actions on routes behind the login gate. */
export function requireActor(p: Platform): Platform & { actor: Actor } {
  if (!p.actor) throw new Response("Unauthorized", { status: 401 });
  return p as Platform & { actor: Actor };
}
