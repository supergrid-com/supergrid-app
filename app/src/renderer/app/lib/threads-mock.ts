// MOCK: agent threads for designing the rail's Threads section. There is no agent in this version,
// so nothing here is real; replace with the agent's own thread list once it is connected.

/**
 * Where a thread stands, as the rail shows it:
 * - working: the agent is doing something in it right now
 * - needs-input: it stopped to ask a question or for permission
 * - done: it finished since you last looked
 * - failed: it stopped on an error
 * - idle: nothing new
 */
export type ThreadStatus = "working" | "needs-input" | "done" | "failed" | "idle";
export type Thread = { id: string; title: string; updatedAt: string; status: ThreadStatus };

const titles = [
  "Webinar landing page refresh",
  "Weekly funnel check-in",
  "Spring cohort launch plan",
  "Replay page not converting",
  "Add a waitlist form",
  "Import contacts from the old CRM",
  "Tag everyone who booked a call",
  "Fix the checkout redirect",
  "Write the welcome email sequence",
  "Abandoned cart workflow",
  "New pricing page",
  "Why is bounce rate up?",
  "Course module pages",
  "Testimonials section",
  "Clean up duplicate contacts",
  "Hook Stripe events into contacts",
  "Blog post template",
  "Speed up the home page",
  "Segment for past attendees",
  "Footer links and legal pages",
  "Theme: warmer accent",
  "Podcast episode pages",
  "Set up the custom domain",
];

// one of each state near the top, so the rail shows them all
const statuses: ThreadStatus[] = ["working", "done", "needs-input", "failed", "idle", "idle", "working", "done"];

const minute = 60_000;
export const mockThreads: Thread[] = titles.map((title, i) => ({
  id: `t${i + 1}`,
  title,
  updatedAt: new Date(Date.now() - (i * i + 1) * 37 * minute).toISOString(),
  status: statuses[i] ?? "idle",
}));
