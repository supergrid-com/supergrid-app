import type * as React from "react";
import { useParams } from "react-router";
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
export function Library(): React.ReactElement {
  const sub = useParams()["*"] ?? "";
  const [head, ...rest] = sub.split("/");
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
