import { ArrowRightIcon, CloudIcon, CodeXmlIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Mark, MuseGlyph } from "@/components/brand";
import { Frame, Tile } from "../art";

// The README's "how it fits together": the three places SuperGrid lives, as the core grid's dark
// tiles, joined by what moves between them, with what each one holds listed underneath.

export const metadata = { robots: { index: false } };

export default function ReadmeStack() {
  return (
    <Frame width={1600} height={600}>
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-line bg-gradient-to-b from-softer to-white px-14 py-12">
        <div className="grid flex-1 grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch">
          <Column
            tile={
              <Tile title="Your Mac" logo={<Mark size={48} mono className="text-white" />} glow="rgb(0 130 251 / 55%)" className="h-[250px] rounded-3xl">
                The SuperGrid desktop app, with Muse Code on your own subscription
              </Tile>
            }
            items={[
              ["SuperGrid desktop", "Electron"],
              [<span key="m" className="inline-flex items-center gap-2"><MuseGlyph className="h-2.5 w-5" />Muse Code</span>, "over ACP"],
              ["Live / Dev", "deployed or local"],
              ["The workspace's tools", "over MCP"],
            ]}
          />
          <Join label="Muse Code edits it" />
          <Column
            tile={
              <Tile
                title="Workspace Repo"
                logo={
                  <span className="flex items-center gap-4">
                    <CodeXmlIcon className="size-12 text-white" strokeWidth={1.6} />
                    <span className="h-8 w-px bg-white/15" />
                    <MuseGlyph className="h-6 w-12" />
                  </span>
                } glow="rgb(138 18 224 / 60%)" className="h-[250px] rounded-3xl">
                One git repo. Every app is a folder, copied in and yours to change
              </Tile>
            }
            mono
            items={[
              ["supergrid.workspace.json", ""],
              ["app/", "theme, kit, site frame"],
              ["apps/journal/", "an app"],
              ["apps/forms/", "an app"],
            ]}
          />
          <Join label="Deploys as one Worker" />
          <Column
            tile={
              <Tile title="Your Cloudflare" logo={<CloudIcon className="size-12 text-cf" strokeWidth={1.6} />} glow="rgb(255 84 20 / 55%)" className="h-[250px] rounded-3xl">
                Everything runs in your own account, on your own bill
              </Tile>
            }
            items={[
              ["Worker", "sg-ws-k3x9qz"],
              ["D1 database", "every app's tables"],
              ["Queues", "events"],
              ["Images · Stream · R2", "media and files"],
            ]}
          />
        </div>
      </div>
    </Frame>
  );
}

function Column({ tile, items, mono }: { tile: ReactNode; items: [ReactNode, string][]; mono?: boolean }) {
  return (
    <div className="flex w-[416px] flex-col">
      <div className="shadow-[0_24px_50px_-20px_rgb(27_29_36/45%)] rounded-3xl">{tile}</div>
      <ul className="mt-6 flex flex-col divide-y divide-line rounded-2xl border border-line bg-white">
        {items.map(([name, note], i) => (
          <li key={i} className="flex items-center justify-between h-[54px] gap-4 px-5 text-[17px]">
            <span className={mono ? "font-mono text-[15px] text-ink" : "text-ink"}>{name}</span>
            <span className="text-[15px] text-muted">{note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The link between two tiles: a short violet-to-magenta line with what crosses it written above. */
function Join({ label }: { label: string }) {
  return (
    <div className="flex h-[250px] w-[116px] flex-col items-center justify-center gap-3">
      <span className="max-w-[92px] text-center text-[14px] leading-tight text-muted">{label}</span>
      <div className="flex w-full items-center">
        <div className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-[#9b3dff]/50 to-[#ec1480]/60" />
        <ArrowRightIcon className="-ml-1.5 size-4 text-[#ec1480]" strokeWidth={2.2} />
      </div>
    </div>
  );
}
