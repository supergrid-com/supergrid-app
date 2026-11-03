import * as React from "react";
import { useLocation, useSearchParams } from "react-router";
import type { AppContext } from "../../../../shared/agent";
import { useAgent } from "~/lib/agent/provider";
import { sg } from "~/lib/bridge";
import { usePlatform } from "~/lib/platform";
import { useSession } from "~/lib/session";
import type { WorkspaceSummary } from "~/lib/workspaces";
import { sections, settingsSections } from "~/shell/sections";

// What the agent knows about where the user is. The workspace shell builds it from the address
// and the workspace, keeps the agent store's copy current (it rides along with each prompt as a
// resource block) and tells the main process, where the tools read it (app_context).

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The context for a path inside the workspace (`database/contacts`, `library/themes/dark`). */
export function buildContext(ws: WorkspaceSummary, org: { name: string; accountId: string; prefix: string } | null, rest: string, modal: { settings: string | null; docs: string | null }, dark: boolean): AppContext {
  const parts = rest.split("/").filter(Boolean);
  const [head, second, third] = parts;
  const location: AppContext["location"] = { path: rest, section: null, page: null, label: "Home" };
  const section = sections.find((s) => s.path === head);
  if (section) {
    location.section = section.label;
    if (section.path === "database") {
      const item = section.items?.find((i) => i.path === second);
      if (item) location.page = item.label;
      else if (second) {
        location.table = second;
        location.page = second;
      }
    } else if (section.path === "workflows") {
      const item = section.items?.find((i) => i.path && i.path === second);
      if (item) location.page = item.label + (third ? ` · ${third}` : "");
      else if (second) location.page = `Workflow ${second}`;
      else location.page = "Workflows";
    } else {
      const item = section.items?.find((i) => i.path === (second ?? ""));
      location.page = item ? item.label + (third ? ` · ${third}` : "") : second ? cap(second) : null;
    }
    location.label = location.page && location.page !== section.label ? `${section.label} · ${location.page}` : section.label;
  } else if (head === "apps" && second) {
    const app = ws.apps.find((a) => a.app === second);
    location.section = "Apps";
    location.app = second;
    location.page = app?.name ?? second;
    const sub = parts.slice(2).join("/");
    location.label = `App · ${app?.name ?? second}${sub ? ` · /${sub}` : ""}`;
  }
  if (modal.settings) {
    location.settings = settingsSections.find((s) => s.id === modal.settings)?.label ?? modal.settings;
    location.label += ` (Settings · ${location.settings} open)`;
  }
  if (modal.docs) {
    location.docs = modal.docs;
    location.label += ` (Docs · ${modal.docs} open)`;
  }
  return {
    at: new Date().toISOString(),
    org,
    workspace: { id: ws.id, name: ws.name, url: ws.url, version: ws.version, apps: ws.apps.map((a) => ({ app: a.app, name: a.name, public: a.public, admin: a.admin, api: a.api })) },
    location,
    dark,
  };
}

/** Keeps the agent's context current for this workspace while the shell is up. */
export function useAgentContext(ws: WorkspaceSummary): void {
  const agent = useAgent();
  const { org } = useSession();
  const { pageDark } = usePlatform();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const settings = params.get("org");
  const docs = params.get("docs");
  const rest = pathname.slice(`/w/${ws.id}`.length).replace(/^\//, "");
  const link = org?.cloudflare ? { name: org.name, accountId: org.cloudflare.accountId, prefix: org.cloudflare.prefix } : null;
  const key = JSON.stringify([ws.id, ws.name, ws.apps.map((a) => a.app), link, rest, settings, docs, pageDark]);
  React.useEffect(() => {
    const ctx = buildContext(ws, link, rest, { settings, docs }, pageDark);
    agent.setContext(ws.id, ctx);
    void sg?.agent.setContext(ws.id, ctx).catch(() => undefined);
  }, [agent, key]);
}
