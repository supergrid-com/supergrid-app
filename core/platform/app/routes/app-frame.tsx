import { useEffect, useRef, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { mountAppFrame } from "@supergrid/admin-sdk/host";
import { defaultTokens } from "@supergrid/theme";
import { requireWorkspace } from "../../src/access";
import { platformContext, requireActor } from "../../src/context";
import { LegacyPage } from "../ui";
import type { Route } from "./+types/app-frame";

export async function loader({ context, params }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  const { ws, grant } = await requireWorkspace(p.env, p.actor, params.id, "content:read");
  const path = params["*"] ? `/${params["*"]}` : "";
  // The iframe loads a platform route that redirects to the workspace with a signed handoff token (ARCHITECTURE.md §6).
  const src = `/w/${ws.id}/apps/${params.app}/frame?path=${encodeURIComponent(path)}`;
  const user = { id: p.actor.user.id, name: p.actor.user.name, email: p.actor.user.email, role: grant.role, permissions: grant.permissions };
  return { ws: { id: ws.id, name: ws.name, origin: new URL(ws.url).origin }, app: params.app, src, tokens: defaultTokens, user };
}

export default function AppFrame() {
  const { ws, app, src, tokens, user } = useLoaderData<typeof loader>();
  const ref = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const [title, setTitle] = useState(app);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    if (!ref.current) return;
    return mountAppFrame(ref.current, {
      session: { user, workspace: { id: ws.id, name: ws.name } },
      tokens, basePath: `/w/${ws.id}/apps/${app}`,
    }, {
      ready: () => setStatus("connected"),
      title: setTitle,
      navigate: (path) => navigate(`/w/${ws.id}/apps/${app}${path === "/" ? "" : path}`, { replace: true }),
    }, { origin: ws.origin });
  }, [ws.id, ws.name, ws.origin, app, tokens, navigate, user]);
  return (
    <LegacyPage title={title} crumbs={[{ label: "Workspaces", to: "/" }, { label: ws.name, to: `/w/${ws.id}` }, { label: title }]} width="wide">
      <div className="flex items-baseline justify-between gap-4">
        <h1>{title}</h1>
        <span className="sg-muted text-xs">iframe {status} · {user.role} · <a href={src} target="_blank" rel="noreferrer">open standalone</a></span>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
        <iframe ref={ref} className="sg-app" src={src} title={`${app} admin`} />
      </div>
    </LegacyPage>
  );
}
