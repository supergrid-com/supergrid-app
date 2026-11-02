import type { AppId } from "~/lib/mock";

export type AppStat = { label: string; value: string; hint?: string };

// The numbers on an app's overview. Canned per app.
export function appStats(app: AppId): AppStat[] {
  return (
    app === "pages"
      ? [{ label: "Pages", value: "6", hint: "4 published" }, { label: "Views (7d)", value: "12.4k" }, { label: "Drafts", value: "2" }, { label: "Media", value: "38" }]
      : app === "funnels"
        ? [{ label: "Funnels", value: "3", hint: "2 live" }, { label: "Conversion", value: "3.6%" }, { label: "Checkouts (7d)", value: "41" }, { label: "Revenue (7d)", value: "$2,380" }]
        : app === "forms"
          ? [{ label: "Forms", value: "2" }, { label: "Answers (7d)", value: "17" }, { label: "Contacts created", value: "9" }, { label: "Spam blocked", value: "3" }]
          : [{ label: "Pings", value: "3" }, { label: "Visitors", value: "1" }]
  );
}
