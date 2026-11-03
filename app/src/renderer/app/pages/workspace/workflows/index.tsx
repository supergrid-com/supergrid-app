import type * as React from "react";
import { useParams } from "react-router";
import { EventsPage } from "./events";
import { HooksPage } from "./hooks";
import { WorkflowsIndex } from "./list";
import { LoggingPage } from "./logging";
import { ReportPage, ReportsIndex } from "./reports";
import { WorkflowPage } from "./workflow";

// The Workflows section: the workflows themselves (one page each, with Editor, Runs and Settings
// tabs), the reports, and under them the system pages: Events, Logging and Hooks. The sub panel
// lists the workflows and reports with a + for each (shell/workspace-shell.tsx); the rest of the
// path says which is open.
export function Workflows(): React.ReactElement {
  const sub = useParams()["*"] ?? "";
  const [head, ...rest] = sub.split("/");
  if (!head) return <WorkflowsIndex />;
  if (head === "reports") return rest[0] ? <ReportPage key={rest[0]} id={rest[0]} /> : <ReportsIndex />;
  if (head === "events") return <EventsPage />;
  if (head === "logging") return <LoggingPage />;
  if (head === "hooks") return <HooksPage />;
  return <WorkflowPage key={head} id={head} tab={rest[0]} />;
}
