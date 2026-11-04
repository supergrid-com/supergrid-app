import { FilmIcon, FolderIcon, ImageIcon, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { useParams } from "react-router";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { WorkspaceFrame } from "~/components/workspace/frame";
import { useOpenNav, useShell } from "~/shell/context";
import { SectionPlaceholder } from "~/pages/workspace/section";
import { FilesPage } from "./files";
import { ImagesPage } from "./images";
import { MediaAnalyticsPage, MediaPage, VideoPage } from "./media";
import { SitemapPage } from "./sitemap";
import { SkillsPage } from "./skills";
import { ThemesPage } from "./themes";

// The Library: Images (the account's Cloudflare Images), Media (its Stream, with one page per video
// and an analytics page), Files (this workspace's R2 bucket) and Themes (its database). The sub
// panel lists the four (shell/sections.ts); the rest of the path says which one, and what inside it.
// A workspace that lives only on this Mac (the demo) has no account, so Images, Media and Files say so.
export function Library(): React.ReactElement {
  const sub = useParams()["*"] ?? "";
  const [head, ...rest] = sub.split("/");
  const { ws } = useShell();
  if (ws.local && !head) return <NeedsAccount title="Images" icon={ImageIcon} what="Cloudflare Images" />;
  if (ws.local && head === "media") return <NeedsAccount title="Media" icon={FilmIcon} what="Cloudflare Stream" />;
  if (ws.local && head === "files") return <NeedsAccount title="Files" icon={FolderIcon} what="the workspace's R2 bucket" />;
  if (!head) return <ImagesPage />;
  if (head === "media") {
    if (rest[0] === "analytics") return <MediaAnalyticsPage />;
    if (rest[0]) return <VideoPage uid={rest[0]} />;
    return <MediaPage />;
  }
  if (head === "files") return <FilesPage />;
  if (head === "themes") return <ThemesPage id={rest[0]} />;
  if (head === "skills") return <SkillsPage id={rest[0]} />;
  if (head === "sitemap") return <SitemapPage tab={rest[0]} />;
  return <SectionPlaceholder path="library" />;
}

function NeedsAccount({ title, icon: Icon, what }: { title: string; icon: LucideIcon; what: string }): React.ReactElement {
  const onOpenNav = useOpenNav();
  return (
    <WorkspaceFrame icon={<Icon />} title={title} onOpenNav={onOpenNav}>
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>Needs a Cloudflare Account</EmptyTitle>
          <EmptyDescription>{title} are kept in {what}. This workspace runs only on this Mac, so there is no account to keep them in.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </WorkspaceFrame>
  );
}
