import { ActivityIcon, BarChart3Icon, BuildingIcon, ChartLineIcon, CloudIcon, ContactRoundIcon, DatabaseIcon, FolderIcon, GitBranchIcon, GlobeIcon, HistoryIcon, ImageIcon, KeyRoundIcon, LayersIcon, ListOrderedIcon, MapIcon, MessageCircleIcon, PaletteIcon, PlugIcon, RocketIcon, ServerIcon, ShieldCheckIcon, SparklesIcon, SquareTerminalIcon, ToggleRightIcon, UsersIcon, VideoIcon, WebhookIcon, WorkflowIcon, type LucideIcon } from "lucide-react";
import { Mark, MuseGlyph } from "@/components/brand";
import { Frame, Tile } from "../art";

// The README's "what every workspace ships with": the site's core grid, with only the parts that are
// built today in its cells, around the three tiles it all hangs on.

export const metadata = { robots: { index: false } };

const CELLS: [LucideIcon, string][] = [
  [DatabaseIcon, "Database"],
  [SquareTerminalIcon, "Query"],
  [ListOrderedIcon, "Migrations"],
  [HistoryIcon, "Backups"],
  [ContactRoundIcon, "Contacts"],
  [UsersIcon, "Segments"],
  [ActivityIcon, "Events"],
  [WebhookIcon, "Hooks"],
  [WorkflowIcon, "Workflows"],
  [BarChart3Icon, "Reports"],
  [ChartLineIcon, "Analytics"],
  [LayersIcon, "Queues"],
  [ImageIcon, "Images"],
  [VideoIcon, "Video"],
  [FolderIcon, "Files"],
  [SparklesIcon, "Skills"],
  [PaletteIcon, "Themes"],
  [MapIcon, "Sitemap"],
  [GlobeIcon, "Domains"],
  [GitBranchIcon, "Git"],
  [RocketIcon, "Deploys"],
  [ServerIcon, "Dev Server"],
  [ToggleRightIcon, "Live & Dev"],
  [PlugIcon, "MCP Tools"],
  [MessageCircleIcon, "Threads"],
  [ShieldCheckIcon, "Approvals"],
  [BuildingIcon, "Organizations"],
  [KeyRoundIcon, "Staff Sign-in"],
];

export default function ReadmeCore() {
  return (
    <Frame width={1600} height={600}>
      <div className="h-full w-full overflow-hidden rounded-[28px] border border-line bg-white">
        <div className="core-grid h-full">
          <div className="grid h-full auto-rows-fr grid-cols-10 gap-px bg-line">
            <div className="relative z-10 col-span-6 col-start-3 row-span-2 row-start-2 grid grid-cols-3 gap-px bg-[#2c2e38] shadow-[0_30px_70px_-20px_rgb(27_29_36/50%),0_12px_28px_-12px_rgb(27_29_36/35%)]">
              <Tile title="Muse Code" logo={<MuseGlyph className="h-7 w-14" />} glow="rgb(0 130 251 / 55%)">
                Builds with your own AI subscription
              </Tile>
              <Tile title="Core" logo={<Mark size={52} mono className="text-white" />} glow="rgb(138 18 224 / 60%)">
                Your site, apps and data, built in and owned by you
              </Tile>
              <Tile title="Cloudflare" logo={<CloudIcon className="size-12 text-cf" strokeWidth={1.6} />} glow="rgb(255 84 20 / 55%)">
                Everything deploys to your own account
              </Tile>
            </div>
            {CELLS.map(([Icon, label]) => (
              <div key={label} className="flex flex-col items-center justify-center gap-3 bg-white px-2 text-center">
                <Icon className="size-6 text-ink-2" strokeWidth={1.6} />
                <span className="text-[15px] leading-tight text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
