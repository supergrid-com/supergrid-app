import { ArrowUpIcon, BookOpenIcon, CheckIcon, BrainIcon, BugIcon, CalendarIcon, ClockIcon, CompassIcon, DatabaseIcon, FlaskConicalIcon, GitBranchIcon, GlobeIcon, HistoryIcon, HourglassIcon, KeyRoundIcon, LayersIcon, LightbulbIcon, LinkIcon, ListChecksIcon, LockIcon, MapIcon, MessageSquareIcon, PaletteIcon, PenToolIcon, PuzzleIcon, ScaleIcon, ServerIcon, ShieldIcon, SparklesIcon, TrendingUpIcon, UsersIcon, WrenchIcon } from "lucide-react";
import { Img, staticFile } from "remotion";
import * as React from "react";
import { Appear, C, FONT, Fill, L, MONO, Muse, Rise, Scene, Sub, Swap, Title, Typed, center, prog, useT } from "../kit";
import { CodeView, TabStrip } from "../editor";
import { SCROLL, pageShift, scrolls } from "../look";
import { beats, cue, say } from "../timeline";

// Beats 1–8 of launch/video/beats.md, on the plain white page: SaaS changed, its four parts (one
// screen each), buy vs. build turning into clone, the iceberg a clone misses, and the three things
// people want instead. Set like the sales page: big ink headlines whose grey second half fills in to
// rose as it's said, and a picture only where it shows something the words can't.

/** The homepages of the SaaS everyone knows, a wall of screenshots on a tilted plane drifting past. */
const WALL = ["notion", "slack", "hubspot", "zendesk", "intercom", "figma", "asana", "monday", "shopify", "zoom", "webflow", "dropbox", "atlassian", "grammarly", "miro", "airtable", "loom", "notion", "figma", "slack"];

function Wall({ fade }: { fade: number }): React.ReactElement {
  const t = useT();
  const W = 460, H = 288, GAP = 30, COLS = 5;
  const loop = 4 * (H + GAP);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: fade }}>
      <div style={{ position: "absolute", left: 960, top: 540, width: 0, height: 0, perspective: 2400, perspectiveOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", left: -(COLS * (W + GAP)) / 2, top: -loop * 1.5, width: COLS * (W + GAP), height: loop * 3, transform: "rotateX(24deg) rotateY(-18deg) rotateZ(7deg) scale(1.1)", transformStyle: "preserve-3d" }}>
          {Array.from({ length: COLS }, (_, c) => {
            // columns drift at their own pace, alternating up and down, and wrap seamlessly
            const speed = [46, -38, 54, -42, 48][c]!;
            const y = ((t * speed) % loop + loop) % loop;
            return (
              <div key={c} style={{ position: "absolute", left: c * (W + GAP), top: 0, width: W }}>
                {[0, 1, 2].map((copy) =>
                  Array.from({ length: 4 }, (_, r) => {
                    const i = (c * 4 + r) % WALL.length;
                    return (
                      <div key={`${copy}-${r}`} style={{ position: "absolute", left: 0, top: y + (copy * 4 + r) * (H + GAP) + (c % 2 ? 150 : 0), width: W, height: H, borderRadius: 16, overflow: "hidden", background: "#fff", boxShadow: `0 0 0 1px ${L.line}, 0 20px 50px rgb(0 0 0 / 10%)` }}>
                        <Img src={staticFile(`wall/${WALL[i]}.jpg`)} style={{ width: W, height: H, objectFit: "cover", objectPosition: "top", display: "block" }} />
                      </div>
                    );
                  }),
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* a wash of white so the headline sits on the wall */}
      <div style={{ position: "absolute", inset: 0, background: "rgb(255 255 255 / 28%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 56% 38% at 50% 50%, rgb(255 255 255 / 96%), rgb(255 255 255 / 0%))" }} />
    </div>
  );
}

/** A plain chat, no one's in particular: a site and its login handed over, the whole product asked for,
 *  and the agent getting to work the way agents do, one step at a time. */
const STEPS = ["Opening contentblocks.com", "Reading the app · 48 screens, 12 tables", "Mapping the data model", "Writing a build plan", "Building · auth, billing, dashboard, editor"];

function CloneChat({ at }: { at: number }): React.ReactElement {
  const t = useT();
  const url = at + 0.45;
  const login = say(2, "login", -0.3);
  const ask = say(2, "ask", -0.1);
  const ask$ = "Rebuild this whole product";
  const sent = ask + ask$.length / 75 + 0.1;
  const press = prog(t, sent, 0.2) * (1 - prog(t, sent + 0.2, 0.3));
  const chip = (icon: React.ReactNode, text: string, a: number) => (
    <Appear at={a} y={0} x={-14} scale={0.92} dur={0.4} style={{ display: "flex" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "9px 16px", borderRadius: 12, background: L.soft, color: L.ink2, fontSize: 26, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
        {icon}
        {text}
      </span>
    </Appear>
  );
  return (
    <Appear at={at} y={36} style={{ position: "absolute", left: 400, top: 390, width: 1120 }}>
      <div style={{ borderRadius: 28, background: "#fff", boxShadow: `0 0 0 1px ${L.line}, 0 30px 80px rgb(0 0 0 / 9%)`, padding: "28px 30px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ height: 50, display: "flex", gap: 12 }}>
          {chip(<LinkIcon style={{ width: 20, height: 20, color: L.muted }} />, "contentblocks.com", url)}
          {chip(<KeyRoundIcon style={{ width: 20, height: 20, color: L.rose }} />, "bill.harper@gmail.com", login)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ flex: 1, fontSize: 38, color: L.ink, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
            {t < ask ? <span style={{ color: L.faint }}>Ask anything</span> : <Typed text={ask$} at={ask} cps={75} color={L.ink} />}
          </div>
          <div style={{ width: 58, height: 58, borderRadius: 99, background: L.ink, display: "grid", placeItems: "center", color: "#fff", transform: `scale(${1 - press * 0.12})` }}>
            <ArrowUpIcon style={{ width: 26, height: 26 }} />
          </div>
        </div>
        {t >= sent + 0.15 ? (
          <div style={{ borderTop: `1px solid ${L.line}`, paddingTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {STEPS.map((s, i) => {
              const a = sent + 0.18 + i * 0.28;
              const done = prog(t, a + 0.3, 0.2);
              const spin = ((t - a) * 1.4) % 1;
              return (
                <Appear key={s} at={a} y={10} dur={0.3} style={{ display: "flex", alignItems: "center", gap: 16, height: 36 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 99, display: "grid", placeItems: "center", background: done > 0 ? L.rose : "transparent", border: done > 0 ? "none" : `2.5px solid ${L.line}`, borderTopColor: done > 0 ? undefined : L.rose, transform: done > 0 ? `scale(${0.6 + 0.4 * done})` : `rotate(${spin * 360}deg)` }}>
                    {done > 0 ? <CheckIcon style={{ width: 16, height: 16, color: "#fff", strokeWidth: 3 }} /> : null}
                  </div>
                  <span style={{ fontSize: 26, letterSpacing: "0.01em", color: done > 0 ? L.ink2 : L.ink, whiteSpace: "nowrap" }}>{s}</span>
                </Appear>
              );
            })}
          </div>
        ) : null}
      </div>
    </Appear>
  );
}

function Hook(): React.ReactElement {
  const t = useT();
  // a year ago AI was what sold the product; now it's what rebuilds it
  const now = cue(2, -0.5);
  const wall = 1 - prog(t, now - 0.25, 0.45, "inOut");
  return (
    <Scene from={beats.hook} to={beats.fourParts} fadeOut={0.3}>
      <Wall fade={wall} />
      <Appear at={-1} outAt={now - 0.3} outDur={0.3} y={0} style={{ ...center }}>
        <Title size={150} style={{ maxWidth: 1400 }}>
          <Rise at={0.25} words={["AI", "was", "the", <span style={{ color: L.rose }}>selling point</span>]} />
        </Title>
      </Appear>
      <div style={{ position: "absolute", left: 0, right: 0, top: 110 }}>
        <Title size={110} style={{ maxWidth: 1500 }}>
          <Rise at={now + 0.02} words={["Now", "AI", "is", "rebuilding", "the", "product"]} />
        </Title>
      </div>
      <CloneChat at={now + 0.15} />
    </Scene>
  );
}

type Part = { key: string; label: string; at: number; before: string; after: string; flipAt: number; kept?: boolean };

function partsList(): Part[] {
  return [
    { key: "code", label: "Code", at: cue(4), before: "A team of engineers", after: "An agent, overnight", flipAt: say(6, "agent", -0.1) },
    { key: "servers", label: "Servers", at: cue(7), before: "Hard at everybody scale", after: "Nearly free at yours", flipAt: say(9, "nearly", -0.15) },
    { key: "support", label: "Support", at: cue(10), before: "A team on tickets", after: "An agent fixes the bug", flipAt: say(12, "agent", -0.1) },
    // the one that doesn't get struck out
    { key: "vision", label: "Vision", at: cue(13), before: "A founder's obsession", after: "Unchanged", flipAt: cue(15), kept: true },
  ];
}

/** A line struck through in rose at `at`, greying as the line crosses it. */
function Struck({ children, at, size, kept = false }: { children: React.ReactNode; at: number; size: number; kept?: boolean }): React.ReactElement {
  const t = useT();
  const k = kept ? 0 : prog(t, at, 0.5, "inOut");
  return (
    <span style={{ position: "relative", display: "inline-block", fontSize: size, letterSpacing: "0.02em", whiteSpace: "nowrap", color: `color-mix(in srgb, ${L.faint} ${(k * 100).toFixed(1)}%, ${L.ink2})` }}>
      {children}
      <span style={{ position: "absolute", left: -8, right: -8, top: "54%", height: Math.max(4, size * 0.07), borderRadius: 99, background: L.rose, transform: `scaleX(${k})`, transformOrigin: "left" }} />
    </span>
  );
}

function FourParts(): React.ReactElement {
  const parts = partsList();
  const s = beats.fourParts;
  const first = parts[0]!.at;
  const taste = cue(16);
  return (
    <Scene from={s} to={beats.buyBuild}>
      {/* the bundle: four things, one subscription */}
      <Appear at={s + 0.05} outAt={first - 0.35} style={{ ...center, gap: 84 }}>
        <Title size={120} style={{ maxWidth: 1500 }}>
          SaaS was four things
          <span style={{ display: "block" }}>
            <Fill text="sold as one subscription" from={say(3, "sold", -0.05)} to={say(3, "subscription", -0.05)} />
          </span>
        </Title>
        <div style={{ display: "flex", borderRadius: 999, boxShadow: `0 0 0 1.5px ${L.line}` }}>
          {parts.map((p, i) => (
            <div key={p.key} style={{ width: 280, height: 112, display: "grid", placeItems: "center", borderLeft: i ? `1.5px solid ${L.line}` : undefined }}>
              <Appear at={s + 0.35 + i * 0.08} y={14} style={{ fontSize: 44, letterSpacing: "0.02em", color: L.ink }}>
                {p.label}
              </Appear>
            </div>
          ))}
        </div>
      </Appear>

      {/* one screen per part, the same frame each time: on the left what it took, struck out for what
          it takes now; on the right one picture of the same change */}
      <Appear at={first - 0.05} outAt={taste - 0.35} y={0} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: 180, top: 0, bottom: 0, width: 720 }}>
          {parts.map((p, i) => {
            const next = parts[i + 1]?.at;
            return (
              <Appear key={p.key} at={p.at} outAt={next === undefined ? undefined : next - 0.35} y={30} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Title size={170} style={{ textAlign: "left" }}>{p.label}</Title>
                <div style={{ marginTop: 16, height: 74, display: "flex", alignItems: "center" }}>
                  <Appear at={p.at + 0.3} y={16}>
                    <Struck at={p.flipAt} size={58} kept={p.kept}>
                      {p.before}
                    </Struck>
                  </Appear>
                </div>
                <div style={{ height: 74, display: "flex", alignItems: "center" }}>
                  <Appear at={p.flipAt + 0.2} y={16} style={{ fontSize: 58, letterSpacing: "0.02em", color: L.rose, whiteSpace: "nowrap" }}>
                    {p.after}
                  </Appear>
                </div>
              </Appear>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 980, top: 230, width: 760, height: 620, borderRadius: 36, background: "#fff", boxShadow: `0 0 0 1.5px ${L.line}, 0 24px 60px rgb(0 0 0 / 5%)`, overflow: "hidden" }}>
          {parts.map((p, i) => {
            const next = parts[i + 1]?.at;
            return (
              <Appear key={p.key} at={p.at + 0.1} outAt={next === undefined ? undefined : next - 0.35} y={20} style={{ position: "absolute", inset: 0 }}>
                <PartPicture part={p} />
              </Appear>
            );
          })}
        </div>
      </Appear>

      <Appear at={taste + 0.05} y={30} style={{ ...center }}>
        <Title size={150}>
          AI can't recreate <span style={{ color: L.rose }}>taste</span>
        </Title>
      </Appear>
    </Scene>
  );
}

/** A fixed scatter, the same every frame. */
function hash(i: number): number {
  let x = Math.imul(i + 1, 2654435761) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

const ROUTES = ['import { Hono } from "hono"', 'import { db, posts } from "./db"', "", "const app = new Hono()", "", 'app.get("/api/posts", async (c) => {', "  const rows = await db.select().from(posts)", "  return c.json(rows)", "})", "", 'app.post("/api/posts", async (c) => {', "  const body = await c.req.json()", "  await db.insert(posts).values(body)", "  return c.json({ ok: true })", "})", "", "export default app"];

/** The right-hand card for each part: one picture of the before and after, and nothing else. */
function PartPicture({ part }: { part: Part }): React.ReactElement | null {
  const t = useT();
  const { at, flipAt } = part;
  if (part.key === "code") {
    // a file written a line at a time by hand, then the agent writes the rest, and the next files, at once
    const byHand = Math.min(3, Math.max(0, (t - at - 0.2) * 1.4));
    const n = t < flipAt ? byHand : 3 + (t - flipAt) * 26;
    const files = ["schema.sql", "post.tsx", "auth.ts"].filter((_, i) => t >= flipAt + 0.35 + i * 0.22);
    const lines = Math.min(ROUTES.length, Math.floor(n)) + (t >= flipAt ? Math.floor(Math.max(0, t - flipAt - 0.3) * 140) : 0);
    return (
      <div style={{ position: "absolute", inset: 0, background: C.page, overflow: "hidden" }}>
        <div style={{ width: 760 / 1.5, height: 620 / 1.5, transform: "scale(1.5)", transformOrigin: "0 0" }}>
          <TabStrip tabs={[{ name: "routes.ts", active: files.length === 0 }, ...files.map((name, i) => ({ name, active: i === files.length - 1, status: "A" as const }))]} right={t >= flipAt + 0.3 ? <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, paddingRight: 10 }}>{1 + files.length} files · {lines} lines</span> : null} />
          <CodeView lines={ROUTES} lang="ts" appear={(i) => Math.max(0, Math.min(1, n - i))} />
        </div>
      </div>
    );
  }
  if (part.key === "servers") {
    // everybody: users lighting up all over a globe, more every second; then just you, one of them
    const R = 212, cx = 380, cy = 320;
    const you = say(9, "you scale", -0.1);
    const focus = prog(t, you, 0.8, "inOut");
    const count = Math.round(prog(t, at + 0.2, 2.4, "linear") * 2184311);
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <svg width={760} height={620} style={{ position: "absolute", inset: 0 }}>
          <g opacity={1 - focus * 0.75}>
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgb(0 0 0 / 20%)" strokeWidth={1.5} />
            {[-0.66, -0.33, 0, 0.33, 0.66].map((k) => {
              const w = Math.sqrt(1 - k * k) * R;
              return <line key={k} x1={cx - w} y1={cy + k * R} x2={cx + w} y2={cy + k * R} stroke="rgb(0 0 0 / 13%)" strokeWidth={1} />;
            })}
            {[0.25, 0.55, 0.85].map((k) => (
              <ellipse key={k} cx={cx} cy={cy} rx={R * k} ry={R} fill="none" stroke="rgb(0 0 0 / 13%)" strokeWidth={1} />
            ))}
          </g>
          {Array.from({ length: 70 }, (_, i) => {
            const h = hash(i + 40);
            const r = R * 0.94 * Math.sqrt(((h >>> 2) % 1000) / 1000);
            const a = (((h >>> 12) % 1000) / 1000) * Math.PI * 2;
            const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
            const k = prog(t, at + 0.25 + ((h >>> 22) % 100) * 0.022, 0.35);
            const me = i === 23;
            const o = me ? 1 : k * (1 - focus * 0.92);
            return <circle key={i} cx={x} cy={y} r={me ? 6 + 8 * focus : 5} fill={me ? L.rose : L.ink} opacity={me ? k : o} />;
          })}
          {focus > 0 ? (() => {
            const h = hash(63);
            const r = R * 0.94 * Math.sqrt(((h >>> 2) % 1000) / 1000);
            const a = (((h >>> 12) % 1000) / 1000) * Math.PI * 2;
            const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
            const pulse = ((t - you) * 0.9) % 1;
            return (
              <g>
                <circle cx={x} cy={y} r={14 + pulse * 30} fill="none" stroke={L.rose} strokeWidth={2} opacity={focus * (1 - pulse)} />
                <text x={x + 26} y={y + 10} fontFamily={FONT} fontSize={30} fill={L.ink} opacity={focus}>You</text>
              </g>
            );
          })() : null}
        </svg>
        <div style={{ position: "absolute", right: 36, top: 30, fontFamily: MONO, fontSize: 20, color: L.muted, letterSpacing: "0.02em" }}>
          {focus > 0.5 ? "1 user" : `${count.toLocaleString("en-US")} users`}
        </div>
      </div>
    );
  }
  if (part.key === "support") {
    // an inbox filling with threads faster than a team can answer; then a machine clears it in seconds
    const threads = [
      ["Maya Chen", "Export is broken on Safari", "#e8614a"],
      ["Leo Dubois", "Can't reset my password", "#7c8cf8"],
      ["Nora Patel", "Charged twice this month", "#1f8f4e"],
      ["Felix Haddad", "Where did my drafts go", "#f59e0b"],
      ["Iris Moreau", "Invite link says expired", "#14b8a6"],
      ["Kiln & Co", "Webhook stopped firing", "#a855f7"],
      ["Sam Okafor", "CSV import skips rows", "#ec4899"],
      ["Ava Lindqvist", "Dark mode logo is wrong", "#3b82f6"],
    ];
    const fixed = (i: number) => prog(t, flipAt + 0.2 + i * 0.1, 0.25);
    const open = threads.filter((_, i) => fixed(i) < 0.5).length;
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", borderBottom: `1.5px solid ${L.line}` }}>
          <span style={{ fontSize: 26, color: L.ink, letterSpacing: "0.02em" }}>Inbox</span>
          <span style={{ fontFamily: MONO, fontSize: 18, color: open ? L.muted : L.rose }}>{open ? `${open} open` : "0 open · agent"}</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "4px 0" }}>
          {threads.map(([who, what, color], i) => {
            const d = fixed(i);
            return (
              <Appear key={who} at={at + 0.25 + i * 0.13} y={12} dur={0.35} style={{ height: 68, display: "flex", alignItems: "center", gap: 16, padding: "0 32px", borderBottom: i < threads.length - 1 ? `1px solid ${L.line}` : undefined }}>
                <div style={{ width: 36, height: 36, borderRadius: 99, background: color, color: "#fff", display: "grid", placeItems: "center", fontSize: 14, letterSpacing: "0.04em", opacity: 1 - d * 0.5 }}>{who!.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0, opacity: 1 - d * 0.45 }}>
                  <div style={{ fontSize: 20, color: L.ink, letterSpacing: "0.01em" }}>{who}</div>
                  <div style={{ fontSize: 17, color: L.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{what}</div>
                </div>
                {d > 0 ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 15, color: L.rose, opacity: d, transform: `translateX(${(1 - d) * 10}px)` }}>
                    <CheckIcon style={{ width: 15, height: 15, strokeWidth: 2.5 }} /> replied · fixed · {(0.3 + ((hash(i) >>> 4) % 60) / 100).toFixed(1)}s
                  </span>
                ) : (
                  <span style={{ fontSize: 16, color: L.faint, padding: "4px 12px", borderRadius: 99, background: L.soft }}>Open</span>
                )}
              </Appear>
            );
          })}
        </div>
      </div>
    );
  }
  // vision: the pieces of one problem, scattered, each finding where it fits
  const S = 84, G = 8;
  const size = 6 * S + 5 * G;
  const pieces: [number, number, number, number][] = [[0, 0, 2, 2], [2, 0, 1, 1], [3, 0, 3, 1], [2, 1, 1, 1], [3, 1, 1, 2], [4, 1, 2, 1], [0, 2, 1, 1], [1, 2, 2, 1], [4, 2, 2, 2], [0, 3, 1, 2], [1, 3, 1, 1], [2, 3, 2, 1], [1, 4, 3, 2], [4, 4, 1, 1], [5, 4, 1, 2], [0, 5, 1, 1], [4, 5, 1, 1]];
  const shades = ["#ececf0", "#d2d2d7", L.faint, L.muted, L.ink2, L.ink];
  const rose = new Set([4, 12, 15]);
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {pieces.map(([x, y, w, h], i) => {
          const hh = hash(i + 7);
          const k = prog(t, at + 0.2 + ((hh % 100) / 100) * 2.0, 0.9, "inOut");
          const dx = (((hh >>> 3) % 200) - 100) * 2.6;
          const dy = (((hh >>> 9) % 200) - 100) * 2.6;
          const rot = ((hh >>> 15) % 60) - 30;
          return <div key={i} style={{ position: "absolute", left: x * (S + G), top: y * (S + G), width: w * S + (w - 1) * G, height: h * S + (h - 1) * G, borderRadius: 18, background: rose.has(i) ? L.rose : shades[(hh >>> 20) % shades.length], opacity: k, transform: `translate(${dx * (1 - k)}px, ${dy * (1 - k)}px) rotate(${rot * (1 - k)}deg) scale(${0.6 + 0.4 * k})` }} />;
        })}
      </div>
    </div>
  );
}

/** One line under a title, swapped for the next in place. */
function Line({ children, color = L.faint }: { children: React.ReactNode; color?: string }): React.ReactElement {
  return <div style={{ ...center, fontSize: 64, letterSpacing: "0.02em", color, whiteSpace: "nowrap" }}>{children}</div>;
}

function BuyBuild(): React.ReactElement {
  const s = beats.buyBuild;
  return (
    <Scene from={s} to={beats.features}>
      <div style={{ ...center, gap: 44 }}>
        <Appear at={s + 0.05}>
          <Title size={170}>
            Buy <span style={{ color: L.faint }}>or</span> Build
          </Title>
        </Appear>
        <div style={{ position: "relative", width: 1600, height: 90 }}>
          <Swap
            y={16}
            items={[
              { at: s + 0.45, node: <Line>For big companies</Line> },
              { at: say(18, "one person", -0.15), node: <Line color={L.rose}>For one person with an agent</Line> },
            ]}
          />
        </div>
      </div>
    </Scene>
  );
}

function Features(): React.ReactElement {
  const t = useT();
  const used = [23, 58, 81];
  const at = say(19, "to use", -0.1);
  const pick = prog(t, at, 0.9);
  return (
    <Scene from={beats.features} to={beats.clone}>
      <div style={{ ...center, gap: 70 }}>
        <Appear at={beats.features + 0.05}>
          <Title size={110}>
            100 features <Fill text="to use 3" from={at} to={say(19, "three", -0.1)} />
          </Title>
        </Appear>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 40px)", gap: 11 }}>
          {Array.from({ length: 100 }, (_, i) => {
            const a = prog(t, beats.features + 0.15 + (Math.floor(i / 10) + (i % 10)) * 0.02, 0.6);
            const on = used.includes(i);
            return <div key={i} style={{ width: 40, height: 40, borderRadius: 11, opacity: a * (on ? 1 : 1 - pick * 0.5), transform: `scale(${0.8 + 0.2 * a})`, background: on ? `color-mix(in srgb, ${L.rose} ${Math.round(pick * 100)}%, #ececf0)` : "#ececf0" }} />;
          })}
        </div>
      </div>
    </Scene>
  );
}

function Clone(): React.ReactElement {
  const t = useT();
  const at = say(20, "clone", -0.1);
  const k = prog(t, at, 0.7, "inOut");
  return (
    <Scene from={beats.clone} to={beats.iceberg}>
      <div style={{ ...center, gap: 40 }}>
        <Appear at={beats.clone + 0.05}>
          <div style={{ display: "flex", alignItems: "baseline", fontFamily: FONT, fontSize: 190, letterSpacing: "0.02em", lineHeight: 1.1, fontWeight: 500 }}>
            <Struck at={at} size={190}>
              <span style={{ color: "inherit" }}>Build</span>
            </Struck>
            {/* Clone opens up beside it, so Build slides over instead of jumping */}
            <span style={{ display: "inline-block", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 700 * k, paddingLeft: 56 * k, color: L.rose, opacity: k }}>Clone</span>
          </div>
        </Appear>
        <div style={{ height: 80 }}>
          <Appear at={say(21, "copies", -0.1)} y={16}>
            <Sub size={60} style={{ color: L.faint }}>The screens, in an afternoon</Sub>
          </Appear>
        </div>
      </div>
    </Scene>
  );
}

/** Everything under a product, as blocks: the screens on top, solid, and under the line the years of
 *  work a clone never sees, outlined, each block one kind of it. */
const HIDDEN = [DatabaseIcon, ServerIcon, ShieldIcon, GitBranchIcon, LockIcon, GlobeIcon, BugIcon, ClockIcon, CalendarIcon, HourglassIcon, HistoryIcon, ListChecksIcon, MessageSquareIcon, UsersIcon, LightbulbIcon, BrainIcon, CompassIcon, ScaleIcon, BookOpenIcon, FlaskConicalIcon, PuzzleIcon, PaletteIcon, PenToolIcon, SparklesIcon, LayersIcon, WrenchIcon, TrendingUpIcon, MapIcon];

function Iceberg(): React.ReactElement {
  const t = useT();
  const s = beats.iceberg;
  const COLS = 7, ROWS = 5, S = 116, G = 10;
  const w = COLS * S + (COLS - 1) * G;
  const left = 400, top = 222;
  const tip = cue(22, -0.05);
  const out = cue(23, -0.35);
  const lit = prog(t, tip, 0.5, "inOut");
  const builder = say(23, "builder", -0.25);
  const user = say(23, "user", -0.25);
  return (
    <Scene from={s} to={beats.wants}>
      <Appear at={-1} outAt={out} outDur={0.35} y={0} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left, top, width: w }}>
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const r = Math.floor(i / COLS), c = i % COLS;
            const x = c * (S + G), y = r * (S + G) + (r ? 14 : 0);
            if (r === 0) {
              // the screens: what a clone copies
              const k = prog(t, s - 0.3 + c * 0.05, 0.4);
              return (
                <div key={i} style={{ position: "absolute", left: x, top: y, width: S, height: S, borderRadius: 18, background: `color-mix(in srgb, ${L.rose} ${Math.round(lit * 100)}%, ${L.ink})`, opacity: k, transform: `scale(${0.85 + 0.15 * k})`, display: "grid", placeItems: "center" }}>
                  <div style={{ width: 60, height: 42, borderRadius: 7, border: "2px solid rgb(255 255 255 / 85%)", overflow: "hidden" }}>
                    <div style={{ height: 9, borderBottom: "2px solid rgb(255 255 255 / 85%)" }} />
                    <div style={{ margin: "7px 8px 0", height: 3, width: 26, background: "rgb(255 255 255 / 70%)", borderRadius: 2 }} />
                    <div style={{ margin: "5px 8px 0", height: 3, width: 36, background: "rgb(255 255 255 / 45%)", borderRadius: 2 }} />
                  </div>
                </div>
              );
            }
            // and under the line, what it misses
            const Icon = HIDDEN[(i - COLS) % HIDDEN.length]!;
            const k = prog(t, s + 0.2 + (r - 1) * 0.16 + c * 0.05, 0.45);
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, width: S, height: S, borderRadius: 18, border: "1.5px dashed rgb(0 0 0 / 28%)", opacity: k * (1 - lit * 0.45), transform: `scale(${0.85 + 0.15 * k})`, display: "grid", placeItems: "center" }}>
                <Icon style={{ width: 40, height: 40, color: L.ink2, strokeWidth: 1.5, opacity: prog(t, s + 0.3 + (r - 1) * 0.16 + c * 0.05, 0.4) }} />
              </div>
            );
          })}
          {/* the waterline */}
          <div style={{ position: "absolute", left: -40, right: -40, top: S + 11, height: 1.5, background: "rgb(0 0 0 / 16%)", transform: `scaleX(${prog(t, s + 0.1, 0.8, "inOut")})` }} />
        </div>
        <div style={{ position: "absolute", left: left + w + 56, top: top + S / 2 - 26, fontSize: 44, letterSpacing: "0.02em", color: `color-mix(in srgb, ${L.rose} ${Math.round(lit * 100)}%, ${L.ink})`, whiteSpace: "nowrap" }}>
          <Appear at={s - 0.2} x={-16} y={0}>The screens</Appear>
        </div>
        <div style={{ position: "absolute", left: left + w + 56, top: top + S + 14 + (2 * (S + G)) - 26, fontSize: 44, letterSpacing: "0.02em", color: L.muted, whiteSpace: "nowrap" }}>
          <Appear at={s + 0.5} x={-16} y={0}>Years of decisions</Appear>
        </div>
      </Appear>
      {/* and what that costs both sides */}
      <div style={{ ...center, gap: 18 }}>
        <div style={{ height: 120 }}>
          <Appear at={builder} y={20}>
            <Title size={104} style={{ whiteSpace: "nowrap" }}>
              The builder <Fill text="loses the business" from={say(23, "loses")} to={say(23, "business")} />
            </Title>
          </Appear>
        </div>
        <div style={{ height: 120 }}>
          <Appear at={user} y={20}>
            <Title size={104} style={{ whiteSpace: "nowrap" }}>
              The user <Fill text="gets a worse copy" from={say(23, "gets")} to={say(23, "copy")} />
            </Title>
          </Appear>
        </div>
      </div>
    </Scene>
  );
}

function Wants(): React.ReactElement {
  const t = useT();
  const s = beats.wants;
  const items: { at: number; title: string; below: React.ReactNode }[] = [
    { at: say(25, "own", -0.3), title: "Their own code", below: <Sub size={34}>In their repo, on their servers</Sub> },
    { at: say(26, "use", -0.25), title: "Their own AI", below: <Muse product="Spark" size={34} byMeta /> },
    { at: say(27, "shaped", -0.3), title: "Their own way", below: <Sub size={34}>Shaped to how they work</Sub> },
  ];
  // the three stay up together; the page scrolls up and away as the dark card rises over it
  return (
    <Scene from={s} to={scrolls.reveal + SCROLL} fadeOut={0.01} shift={pageShift(t)}>
      <Appear at={s + 0.05} style={{ position: "absolute", left: 0, right: 0, top: 230 }}>
        <Title size={120}>
          People clone <Fill text="for three reasons" from={say(24, "for")} to={say(24, "reasons")} />
        </Title>
      </Appear>
      <div style={{ position: "absolute", left: 0, right: 0, top: 540, display: "flex", justifyContent: "center" }}>
        {items.map((it, i) => (
          <div key={it.title} style={{ position: "relative", width: 540, height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
            {i ? <div style={{ position: "absolute", left: 0, top: 20, bottom: 20, width: 1.5, background: L.line, transform: `scaleY(${prog(t, it.at, 0.5, "inOut")})` }} /> : null}
            <Appear at={it.at} y={30} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
              <div style={{ fontSize: 66, letterSpacing: "0.02em", color: L.ink, whiteSpace: "nowrap" }}>{it.title}</div>
              {it.below}
            </Appear>
          </div>
        ))}
      </div>
    </Scene>
  );
}

export function Problem(): React.ReactElement {
  return (
    <>
      <Hook />
      <FourParts />
      <BuyBuild />
      <Features />
      <Clone />
      <Iceberg />
      <Wants />
    </>
  );
}
