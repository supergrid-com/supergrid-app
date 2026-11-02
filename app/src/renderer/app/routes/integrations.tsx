import { CheckIcon, PlugIcon } from "lucide-react";
import { PageFrame } from "~/components/page-frame";
import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { toastManager } from "~/components/ui/toast";
import { connections } from "~/lib/mock";

export default function Integrations() {
  return (
    <PageFrame crumbs={[{ label: "Home", to: "/" }, { label: "Integrations" }]}>
      <PageHeader title="Integrations" description="Connections an app can use from any workspace: email, payments, sheets. Secrets stay per workspace." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {connections.map((c) => (
          <div key={c.id} className="flex flex-col gap-3 rounded-2xl border bg-background p-5 shadow-xs/5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: c.color }}>
                {c.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-semibold">{c.name}</div>
                {c.status === "connected" ? (
                  <Badge variant="success" size="sm">
                    <CheckIcon />
                    connected
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">not connected</span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            <div className="mt-auto">
              {c.status === "connected" ? (
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => toastManager.add({ title: `Connecting ${c.name}`, description: "Opens the provider's OAuth flow in the real platform.", type: "info" })}>
                  <PlugIcon />
                  Connect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}
