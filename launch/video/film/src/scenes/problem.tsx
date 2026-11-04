import { ArrowUpIcon, BookOpenIcon, LayoutGridIcon, BrainIcon, BugIcon, CalendarIcon, CheckIcon, ClockIcon, CodeIcon, CompassIcon, DatabaseIcon, FlaskConicalIcon, GitBranchIcon, GlobeIcon, HeadsetIcon, HistoryIcon, HourglassIcon, KeyRoundIcon, LayersIcon, LightbulbIcon, LinkIcon, ListChecksIcon, LockIcon, MapIcon, MessageSquareIcon, PaletteIcon, PenToolIcon, PuzzleIcon, ScaleIcon, ServerIcon, ShieldIcon, SlidersHorizontalIcon, SparklesIcon, TrendingUpIcon, UserIcon, UsersIcon, WrenchIcon, type LucideIcon } from "lucide-react";
import { Img, staticFile } from "remotion";
import * as React from "react";
import { tokens } from "../editor";
import { Appear, C, FONT, Fill, L, MONO, Muse, MuseGlyph, Rise, Scene, Sub, Title, Typed, center, prog, useT } from "../kit";
import { SCROLL, pageShift, scrolls } from "../look";
import { beats, cue, say } from "../timeline";

// Beats 1–8 of launch/video/beats.md, on the plain white page: SaaS changed, its four parts (one
// screen each), buy vs. build turning into clone, the iceberg a clone misses, and the three things
// people want instead. Set like the sales page: big ink headlines whose second half arrives in rose
// as it's said, and a picture only where it shows something the words can't.

/** A fixed scatter, the same every frame. */
function hash(i: number): number {
  let x = Math.imul(i + 1, 2654435761) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

/** A spinner that turns into a rose check once `done` comes round. */
function Status({ t, at, done, size = 26 }: { t: number; at: number; done: number; size?: number }): React.ReactElement {
  const d = prog(t, done, 0.2);
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 99, display: "grid", placeItems: "center", background: d > 0 ? L.rose : "transparent", border: d > 0 ? "none" : `2.5px solid ${L.line}`, borderTopColor: d > 0 ? undefined : L.rose, transform: d > 0 ? `scale(${0.6 + 0.4 * d})` : `rotate(${((t - at) * 1.6) * 360}deg)` }}>
      {d > 0 ? <CheckIcon style={{ width: size * 0.6, height: size * 0.6, color: "#fff", strokeWidth: 3 }} /> : null}
    </div>
  );
}

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
      <div style={{ position: "absolute", inset: 0, background: "rgb(255 255 255 / 74%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 62% 44% at 50% 50%, rgb(255 255 255 / 97%), rgb(255 255 255 / 0%))" }} />
    </div>
  );
}

/** A plain chat window, no one's in particular: a site and its login handed over, the whole product
 *  asked for, and the agent's reply streaming in a step at a time. Fixed size, so nothing jumps. */
const STEPS = ["Opening contentblocks.com", "Reading the app · 48 screens, 12 tables", "Mapping the data model", "Writing a build plan", "Building auth, billing, the editor"];

function CloneChat({ at }: { at: number }): React.ReactElement {
  const t = useT();
  const url = say(2, "hand", -0.1);
  const login = say(2, "login", -0.3);
  const ask = say(2, "ask", -0.1);
  const ask$ = "Rebuild this whole product";
  const sent = ask + ask$.length / 75 + 0.1;
  const press = prog(t, sent, 0.15) * (1 - prog(t, sent + 0.15, 0.25));
  const posted = prog(t, sent + 0.05, 0.22);
  const attached = (a: number) => prog(t, a, 0.35) * (1 - posted);
  const chip = (icon: React.ReactNode, text: string, k = 1) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: L.soft, color: L.ink2, fontSize: 23, letterSpacing: "0.01em", whiteSpace: "nowrap", opacity: k, transform: `scale(${0.92 + 0.08 * k})`, transformOrigin: "0 50%" }}>
      {icon}
      {text}
    </span>
  );
  const link = <LinkIcon style={{ width: 19, height: 19, color: L.muted }} />;
  const key = <KeyRoundIcon style={{ width: 19, height: 19, color: L.rose }} />;
  const tray = Math.max(attached(url), attached(login));
  return (
    <Appear at={at} y={40} style={{ position: "absolute", left: 900, top: 190, width: 860, height: 700 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: "#fff", boxShadow: `0 0 0 1px ${L.line}, 0 40px 100px rgb(0 0 0 / 10%)`, overflow: "hidden" }}>
        <div style={{ height: 76, display: "flex", alignItems: "center", gap: 14, padding: "0 28px", borderBottom: `1px solid ${L.line}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 99, background: L.ink, display: "grid", placeItems: "center" }}>
            <SparklesIcon style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
          <span style={{ fontSize: 24, color: L.ink, letterSpacing: "0.01em" }}>New chat</span>
        </div>
        {/* an empty chat, waiting */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 76, bottom: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, opacity: 1 - posted }}>
          <div style={{ width: 64, height: 64, borderRadius: 99, background: L.soft, display: "grid", placeItems: "center" }}>
            <SparklesIcon style={{ width: 28, height: 28, color: L.ink2 }} />
          </div>
          <span style={{ fontSize: 34, color: L.ink2, letterSpacing: "0.01em" }}>What should we build?</span>
        </div>
        {/* the conversation */}
        <div style={{ position: "absolute", left: 32, right: 32, top: 108, display: "flex", flexDirection: "column", gap: 30 }}>
          {posted > 0 ? (
            <div style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, opacity: posted, transform: `translateY(${(1 - posted) * 40}px)` }}>
              <div style={{ display: "flex", gap: 10 }}>
                {chip(link, "contentblocks.com")}
                {chip(key, "bill.harper@gmail.com")}
              </div>
              <div style={{ padding: "16px 26px", borderRadius: 24, background: L.ink, color: "#fff", fontSize: 30, letterSpacing: "0.01em" }}>{ask$}</div>
            </div>
          ) : null}
          {t >= sent + 0.3 ? (
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 99, background: L.soft, display: "grid", placeItems: "center" }}>
                <SparklesIcon style={{ width: 18, height: 18, color: L.ink2 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 2 }}>
                {STEPS.map((s, i) => {
                  const a = sent + 0.3 + i * 0.24;
                  return (
                    <Appear key={s} at={a} y={10} dur={0.3} style={{ display: "flex", alignItems: "center", gap: 14, height: 34 }}>
                      <Status t={t} at={a} done={a + 0.26} size={24} />
                      <span style={{ fontSize: 25, letterSpacing: "0.01em", color: L.ink2, whiteSpace: "nowrap" }}>{s}</span>
                    </Appear>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        {/* the composer, where the site and the login are handed over */}
        <div style={{ position: "absolute", left: 24, right: 24, bottom: 24, borderRadius: 24, border: `1.5px solid ${L.line}`, background: "#fff", padding: "16px 16px 16px 26px", display: "flex", flexDirection: "column", gap: 12 * tray }}>
          <div style={{ height: 46 * tray, display: "flex", gap: 10, overflow: "hidden" }}>
            {attached(url) > 0 ? chip(link, "contentblocks.com", attached(url)) : null}
            {attached(login) > 0 ? chip(key, "bill.harper@gmail.com", attached(login)) : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1, fontSize: 32, color: L.ink, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
              {t < ask || posted > 0.5 ? <span style={{ color: L.faint }}>Ask anything</span> : <Typed text={ask$} at={ask} cps={75} color={L.ink} />}
            </div>
            <div style={{ width: 54, height: 54, borderRadius: 99, background: t >= ask && posted < 0.5 ? L.ink : "#d2d2d7", display: "grid", placeItems: "center", color: "#fff", transform: `scale(${1 - press * 0.14})` }}>
              <ArrowUpIcon style={{ width: 24, height: 24 }} />
            </div>
          </div>
        </div>
      </div>
    </Appear>
  );
}

function Hook(): React.ReactElement {
  const t = useT();
  // a year ago AI was what sold the product; now it's what rebuilds it
  const now = cue(2, -0.5);
  const wall = 1 - prog(t, now - 0.2, 0.4, "inOut");
  return (
    <Scene from={beats.hook} to={beats.fourParts} fadeOut={0.3}>
      <Wall fade={wall} />
      <Appear at={-1} outAt={now - 0.3} outDur={0.3} y={0} style={{ ...center }}>
        <Title size={150} style={{ maxWidth: 1400 }}>
          <Rise at={0.25} words={["AI", "was", "the", <span style={{ color: L.rose }}>selling point</span>]} />
        </Title>
      </Appear>
      <div style={{ position: "absolute", left: 150, top: 0, bottom: 0, width: 700, display: "flex", alignItems: "center" }}>
        <Title size={118} style={{ textAlign: "left" }}>
          <Rise at={now + 0.05} words={["Now", "AI", "is", "rebuilding", "the", "product"]} />
        </Title>
      </div>
      <CloneChat at={now + 0.2} />
    </Scene>
  );
}

type Part = { key: string; label: string; icon: LucideIcon; at: number; before: string; after: string; flipAt: number; kept?: boolean };

function partsList(): Part[] {
  return [
    { key: "code", label: "Code", icon: CodeIcon, at: cue(4), before: "A team of engineers", after: "An agent, overnight", flipAt: say(6, "agent", -0.1) },
    { key: "servers", label: "Servers", icon: ServerIcon, at: cue(7), before: "Hard at everybody scale", after: "Nearly free at yours", flipAt: say(9, "nearly", -0.15) },
    { key: "support", label: "Support", icon: HeadsetIcon, at: cue(10), before: "A team on tickets", after: "An agent fixes the bug", flipAt: say(12, "agent", -0.1) },
    // the one that doesn't get struck out
    { key: "vision", label: "Vision", icon: LightbulbIcon, at: cue(13), before: "A founder's obsession", after: "Unchanged", flipAt: cue(15), kept: true },
  ];
}

/** A line struck through in rose at `at`, greying as the line crosses it. */
function Struck({ children, at, size, kept = false, color = L.ink2 }: { children: React.ReactNode; at: number; size: number; kept?: boolean; color?: string }): React.ReactElement {
  const t = useT();
  const k = kept ? 0 : prog(t, at, 0.5, "inOut");
  return (
    <span style={{ position: "relative", display: "inline-block", fontSize: size, letterSpacing: "0.02em", whiteSpace: "nowrap", color: `color-mix(in srgb, ${L.faint} ${(k * 100).toFixed(1)}%, ${color})` }}>
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
      {/* the bundle: four things, one price */}
      <Appear at={s + 0.05} outAt={first - 0.32} outDur={0.3} style={{ ...center, gap: 80 }}>
        <Title size={120} style={{ maxWidth: 1500 }}>
          SaaS was four things
          <span style={{ display: "block" }}>
            <Fill text="sold as one subscription" from={say(3, "sold", -0.05)} to={say(3, "subscription", -0.05)} />
          </span>
        </Title>
        <div style={{ display: "flex", borderRadius: 999, background: "#fff", boxShadow: `0 0 0 1.5px ${L.line}, 0 20px 50px rgb(0 0 0 / 5%)` }}>
          {parts.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.key} style={{ width: 250, height: 104, display: "grid", placeItems: "center", borderLeft: i ? `1.5px solid ${L.line}` : undefined }}>
                <Appear at={s + 0.3 + i * 0.08} y={14} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 38, letterSpacing: "0.02em", color: L.ink }}>
                  <Icon style={{ width: 30, height: 30, color: L.ink2, strokeWidth: 1.6 }} />
                  {p.label}
                </Appear>
              </div>
            );
          })}
          <div style={{ width: 220, height: 104, display: "grid", placeItems: "center", borderLeft: `1.5px solid ${L.line}` }}>
            <Appear at={say(3, "subscription", -0.1)} y={14} style={{ fontSize: 38, letterSpacing: "0.02em", color: L.rose, whiteSpace: "nowrap" }}>
              $49 / mo
            </Appear>
          </div>
        </div>
      </Appear>

      {/* one screen per part, the same frame each time: on the left what it took, struck out for what
          it takes now; on the right one picture of the same change */}
      <Appear at={first - 0.05} outAt={taste - 0.32} outDur={0.3} y={0} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: 180, top: 0, bottom: 0, width: 720 }}>
          {parts.map((p, i) => {
            const next = parts[i + 1]?.at;
            return (
              <Appear key={p.key} at={p.at} outAt={next === undefined ? undefined : next - 0.32} outDur={0.3} y={30} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
        <div style={{ position: "absolute", left: 980, top: 230, width: 760, height: 620, borderRadius: 36, background: "#fff", boxShadow: `0 0 0 1.5px ${L.line}, 0 30px 80px rgb(0 0 0 / 7%)`, overflow: "hidden" }}>
          {parts.map((p, i) => {
            const next = parts[i + 1]?.at;
            return (
              <Appear key={p.key} at={p.at + 0.05} outAt={next === undefined ? undefined : next - 0.32} outDur={0.3} y={20} style={{ position: "absolute", inset: 0 }}>
                {p.key === "code" ? <CodeCard at={p.at} flipAt={p.flipAt} /> : p.key === "servers" ? <GlobeCard at={p.at} /> : p.key === "support" ? <InboxCard at={p.at} flipAt={p.flipAt} /> : <MosaicCard at={p.at} flipAt={p.flipAt} />}
              </Appear>
            );
          })}
        </div>
      </Appear>

      <Appear at={taste + 0.02} y={30} style={{ ...center }}>
        <Title size={160}>
          AI can't recreate <span style={{ color: L.rose }}>taste</span>
        </Title>
      </Appear>
    </Scene>
  );
}

// ---- code: a team typing by hand, then an agent writing the whole file at once ----

const ROUTES = ['import { Hono } from "hono"', 'import { db, posts } from "./db"', "", "const app = new Hono()", "", 'app.get("/api/posts", async (c) => {', "  const rows = await db.select().from(posts)", "  return c.json(rows)", "})", "", 'app.post("/api/posts", async (c) => {', "  const body = await c.req.json()", "  await db.insert(posts).values(body)", "  return c.json({ ok: true })", "})"];
const TEAM = [
  { name: "Ana", line: 0, color: "#5b9dff" },
  { name: "Ben", line: 5, color: "#e6a23c" },
  { name: "Kai", line: 10, color: "#34d399" },
];

/** One line of code, coloured, cut off after `n` characters. */
function TypedLine({ text, n }: { text: string; n: number }): React.ReactElement {
  let left = n;
  return (
    <>
      {tokens(text, "ts").map((r, i) => {
        if (left <= 0) return null;
        const part = r.text.slice(0, left);
        left -= r.text.length;
        return <span key={i} style={{ color: r.color }}>{part}</span>;
      })}
    </>
  );
}

/** A typing caret with its owner's name flagged above it, the way shared editors show who's where. */
function Caret({ name, color }: { name: string; color: string }): React.ReactElement {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 2.5, height: 26, marginLeft: 1, verticalAlign: "-5px", background: color }}>
      <span style={{ position: "absolute", left: -1, bottom: 25, padding: "2px 8px", borderRadius: "6px 6px 6px 0", background: color, color: "#fff", fontFamily: FONT, fontSize: 14, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{name}</span>
    </span>
  );
}

function CodeCard({ at, flipAt }: { at: number; flipAt: number }): React.ReactElement {
  const t = useT();
  const agent = t >= flipAt;
  // by hand: three people, a few characters a second each
  const byHand = (m: number) => Math.max(0, Math.floor((Math.min(t, flipAt) - at - 0.3 - m * 0.3) * 7));
  // the agent: line after line, top to bottom, in under a second
  const agentAt = agent ? (t - flipAt) * 19 : -1;
  const shown = (li: number) => {
    const full = ROUTES[li]!.length;
    const m = TEAM.findIndex((x) => x.line === li);
    const hand = m >= 0 ? Math.min(full, byHand(m)) : 0;
    return agent ? Math.max(hand, Math.round(full * Math.max(0, Math.min(1, agentAt - li)))) : hand;
  };
  const writing = agent && agentAt < ROUTES.length + 0.2;
  const agentLine = Math.max(0, Math.min(ROUTES.length - 1, Math.floor(agentAt)));
  const files = ["schema.sql", "post.tsx", "auth.ts"].filter((_, i) => t >= flipAt + 0.75 + i * 0.13);
  const team = 1 - prog(t, flipAt, 0.3);
  const tabs = ["routes.ts", ...files];
  return (
    <div style={{ position: "absolute", inset: 0, background: C.page, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 60, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 18px 0 22px", borderBottom: `1px solid ${C.line}`, background: C.bg }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 99, background: C.raised }} />
        ))}
        <div style={{ display: "flex", gap: 4, marginLeft: 16 }}>
          {tabs.map((f, i) => (
            <div key={f} style={{ height: 38, padding: "0 14px", display: "flex", alignItems: "center", gap: 8, borderRadius: 9, background: i === tabs.length - 1 ? C.raised : "transparent", fontFamily: MONO, fontSize: 16, color: i === tabs.length - 1 ? C.strong : C.muted }}>
              {f}
              {i ? <span style={{ color: C.success, fontSize: 13 }}>A</span> : null}
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {/* who's in the file: the team, then the agent */}
        <div style={{ position: "relative", width: 120, height: 34 }}>
          <div style={{ position: "absolute", right: 0, top: 0, display: "flex", opacity: team }}>
            {TEAM.map((m, i) => (
              <div key={m.name} style={{ width: 34, height: 34, borderRadius: 99, marginLeft: i ? -8 : 0, background: m.color, border: `2px solid ${C.bg}`, color: "#fff", display: "grid", placeItems: "center", fontFamily: FONT, fontSize: 14 }}>{m.name[0]}</div>
            ))}
          </div>
          <div style={{ position: "absolute", right: 0, top: 0, height: 34, padding: "0 14px", borderRadius: 99, background: L.rose, color: "#fff", display: "flex", alignItems: "center", gap: 7, fontFamily: FONT, fontSize: 16, opacity: 1 - team, transform: `scale(${0.9 + 0.1 * (1 - team)})` }}>
            <SparklesIcon style={{ width: 15, height: 15 }} /> Agent
          </div>
        </div>
      </div>
      <div style={{ padding: "26px 0" }}>
        {ROUTES.map((line, li) => {
          const n = shown(li);
          const m = TEAM.findIndex((x) => x.line === li);
          return (
            <div key={li} style={{ display: "flex", alignItems: "center", height: 32, fontFamily: MONO, fontSize: 19, whiteSpace: "pre" }}>
              <span style={{ width: 66, flexShrink: 0, textAlign: "right", paddingRight: 24, color: C.dim }}>{li + 1}</span>
              <span>
                <TypedLine text={line} n={n} />
                {m >= 0 && team > 0.02 ? <span style={{ opacity: team }}><Caret name={TEAM[m]!.name} color={TEAM[m]!.color} /></span> : null}
                {writing && li === agentLine ? <Caret name="Agent" color={L.rose} /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- servers: users all over a turning globe, then just one ----

function GlobeCard({ at }: { at: number }): React.ReactElement {
  const t = useT();
  const you = say(9, "you scale", -0.1);
  const focus = prog(t, you, 0.8, "inOut");
  const R = 232, cx = 380, cy = 350, V = 0.42, D = 0.9;
  // turns steadily, then eases to a stop once it's down to you
  const turn = (x: number) => {
    const tau = Math.max(0, Math.min(x - you, D));
    return V * (Math.min(x, you) - at) + V * (tau - (tau * tau) / (2 * D));
  };
  const rot = turn(t);
  const users = Array.from({ length: 170 }, (_, i) => {
    const h = hash(i + 40);
    const lat = Math.asin(((h % 1000) / 1000) * 1.8 - 0.9);
    const lon = (((h >>> 10) % 1000) / 1000) * Math.PI * 2;
    return { lat, lon, a: at + 0.2 + ((h >>> 20) % 100) * 0.024 };
  });
  const project = (u: { lat: number; lon: number }, r: number) => ({ x: cx + R * Math.cos(u.lat) * Math.sin(u.lon + r), y: cy - R * Math.sin(u.lat), z: Math.cos(u.lat) * Math.cos(u.lon + r) });
  // you: whoever faces us most squarely when the voice gets to you
  const rotYou = turn(you);
  const me = users.reduce((best, u, i) => (u.a < you && project(u, rotYou).z > project(users[best]!, rotYou).z ? i : best), 0);
  const count = Math.round(prog(t, at + 0.2, 2.6, "linear") ** 1.6 * 2184311);
  const pulse = ((t - you) * 0.9) % 1;
  const p = project(users[me]!, rot);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={760} height={620} style={{ position: "absolute", inset: 0 }}>
        <g opacity={1 - focus * 0.6}>
          <circle cx={cx} cy={cy} r={R} fill="#fafafa" stroke="rgb(0 0 0 / 22%)" strokeWidth={1.5} />
          {[-60, -30, 0, 30, 60].map((d) => {
            const a = (d * Math.PI) / 180;
            const w = R * Math.cos(a);
            return <line key={d} x1={cx - w} y1={cy - R * Math.sin(a)} x2={cx + w} y2={cy - R * Math.sin(a)} stroke="rgb(0 0 0 / 12%)" strokeWidth={1} />;
          })}
          {Array.from({ length: 6 }, (_, k) => {
            const lon = (k * Math.PI) / 6 + rot;
            const rx = Math.abs(R * Math.sin(lon));
            const front = Math.cos(lon) > 0;
            return <path key={k} d={`M ${cx} ${cy - R} A ${rx.toFixed(2)} ${R} 0 0 ${Math.sin(lon) > 0 ? 1 : 0} ${cx} ${cy + R}`} fill="none" stroke={`rgb(0 0 0 / ${front ? 15 : 6}%)`} strokeWidth={1} />;
          })}
        </g>
        {users.map((u, i) => {
          if (i === me) return null;
          const q = project(u, rot);
          if (q.z < 0.04) return null;
          const k = prog(t, u.a, 0.35);
          return <circle key={i} cx={q.x} cy={q.y} r={3.5 + 2.5 * q.z} fill={L.ink} opacity={k * (0.3 + 0.65 * q.z) * (1 - focus * 0.94)} />;
        })}
        {p.z > 0.04 ? (
          <g>
            {focus > 0 ? <circle cx={p.x} cy={p.y} r={14 + pulse * 34} fill="none" stroke={L.rose} strokeWidth={2.5} opacity={focus * (1 - pulse)} /> : null}
            <circle cx={p.x} cy={p.y} r={5.5 + 7 * focus} fill={L.rose} opacity={prog(t, users[me]!.a, 0.35)} />
            <text x={p.x + 28} y={p.y + 11} fontFamily={FONT} fontSize={32} fill={L.ink} opacity={focus}>You</text>
          </g>
        ) : null}
      </svg>
      <div style={{ position: "absolute", left: 40, top: 34, display: "flex", alignItems: "baseline", gap: 12, opacity: prog(t, at + 0.35, 0.3) }}>
        <span style={{ fontSize: 44, letterSpacing: "0.01em", color: focus > 0.5 ? L.rose : L.ink, fontVariantNumeric: "tabular-nums" }}>{focus > 0.5 ? "1" : count.toLocaleString("en-US")}</span>
        <span style={{ fontSize: 24, color: L.muted }}>{focus > 0.5 ? "user" : "users"}</span>
      </div>
    </div>
  );
}

// ---- support: an inbox filling faster than a team can answer, then a machine clearing it ----

const THREADS: [string, string][] = [
  ["Maya Chen", "Export is broken on Safari"],
  ["Leo Dubois", "Can't reset my password"],
  ["Nora Patel", "Charged twice this month"],
  ["Felix Haddad", "Where did my drafts go"],
  ["Iris Moreau", "Invite link says expired"],
  ["Kiln & Co", "Webhook stopped firing"],
  ["Sam Okafor", "CSV import skips rows"],
  ["Ava Lindqvist", "Dark mode logo is wrong"],
  ["Tomás Ruiz", "Can I change my plan"],
  ["Priya Nair", "Our emails land in spam"],
  ["Jonah Weiss", "Two-factor code never arrives"],
  ["Elif Kaya", "Search misses old posts"],
  ["Ruth Abara", "Team invite won't send"],
];
const HUES = ["#e8614a", "#7c8cf8", "#1f8f4e", "#f59e0b", "#14b8a6", "#a855f7", "#ec4899", "#3b82f6"];

function InboxCard({ at, flipAt }: { at: number; flipAt: number }): React.ReactElement {
  const t = useT();
  const ROW = 70;
  const arrive = THREADS.map((_, i) => at + 0.25 + i * 0.3);
  const arrivedBy = (x: number) => arrive.filter((a) => a <= x).length;
  // the team gets through one, slowly; then the agent takes the queue from the top in seconds
  const replied = (i: number) => i === 0 && t >= at + 2.0 && t < flipAt + 0.2;
  const fixAt = (i: number) => Math.max(flipAt + 0.2 + Math.max(0, arrivedBy(flipAt) - 1 - i) * 0.07, arrive[i]! + 0.35);
  const open = THREADS.filter((_, i) => t >= arrive[i]! && t < fixAt(i) && !replied(i)).length;
  const agent = prog(t, flipAt, 0.35);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 76, flexShrink: 0, display: "flex", alignItems: "center", gap: 14, padding: "0 30px", borderBottom: `1.5px solid ${L.line}`, background: "#fff", position: "relative", zIndex: 2 }}>
        <span style={{ fontSize: 28, color: L.ink, letterSpacing: "0.02em" }}>Inbox</span>
        <span style={{ padding: "4px 14px", borderRadius: 99, background: open ? L.soft : "rgb(243 56 105 / 10%)", color: open ? L.ink2 : L.rose, fontSize: 20, fontVariantNumeric: "tabular-nums" }}>{open} open</span>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative", width: 240, height: 34 }}>
          <div style={{ position: "absolute", right: 0, top: 0, display: "flex", alignItems: "center", gap: 10, opacity: 1 - agent, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 18, color: L.muted }}>Support team</span>
            {["#5b9dff", "#e6a23c"].map((c, i) => (
              <div key={c} style={{ width: 30, height: 30, borderRadius: 99, marginLeft: i ? -14 : 0, background: c, border: "2px solid #fff" }} />
            ))}
          </div>
          <div style={{ position: "absolute", right: 0, top: 0, height: 34, padding: "0 14px", borderRadius: 99, background: L.rose, color: "#fff", display: "flex", alignItems: "center", gap: 7, fontSize: 17, opacity: agent, transform: `scale(${0.9 + 0.1 * agent})` }}>
            <SparklesIcon style={{ width: 15, height: 15 }} /> Agent
          </div>
        </div>
      </div>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        {THREADS.map(([who, what], i) => {
          const a = arrive[i]!;
          if (t < a) return null;
          // newest on top: every thread after this one pushes it down a row
          const y = arrive.slice(i + 1).reduce((sum, b) => sum + prog(t, b, 0.35, "inOut") * ROW, 0);
          if (y > 560) return null;
          const k = prog(t, a, 0.35, "inOut");
          const d = prog(t, fixAt(i), 0.25);
          return (
            <div key={who} style={{ position: "absolute", left: 0, right: 0, top: y, height: ROW, display: "flex", alignItems: "center", gap: 16, padding: "0 30px", borderBottom: `1px solid ${L.line}`, background: "#fff", transform: `translateY(${(1 - k) * -ROW}px)` }}>
              <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 99, background: HUES[i % HUES.length], color: "#fff", display: "grid", placeItems: "center", fontSize: 15, letterSpacing: "0.04em", opacity: 1 - d * 0.45 }}>
                {who.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, opacity: 1 - d * 0.4 }}>
                <div style={{ fontSize: 21, color: L.ink, letterSpacing: "0.01em" }}>{who}</div>
                <div style={{ fontSize: 18, color: L.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{what}</div>
              </div>
              {d > 0 ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 18, color: L.rose, opacity: d, transform: `translateX(${(1 - d) * 12}px)`, whiteSpace: "nowrap" }}>
                  <CheckIcon style={{ width: 17, height: 17, strokeWidth: 2.5 }} /> Fixed · {(0.4 + ((hash(i) >>> 4) % 50) / 100).toFixed(1)}s
                </span>
              ) : replied(i) ? (
                <span style={{ fontSize: 17, color: L.muted, padding: "5px 12px", borderRadius: 99, background: L.soft, whiteSpace: "nowrap" }}>Replied · 2h</span>
              ) : (
                <span style={{ fontSize: 17, color: L.faint, padding: "5px 12px", borderRadius: 99, background: L.soft }}>Open</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- vision: the pieces of one problem, each finding where it fits ----

const PIECES: [number, number, number, number][] = [[0, 0, 2, 2], [2, 0, 1, 1], [3, 0, 3, 1], [2, 1, 1, 1], [3, 1, 1, 2], [4, 1, 2, 1], [0, 2, 1, 1], [1, 2, 2, 1], [4, 2, 2, 2], [0, 3, 1, 2], [1, 3, 1, 1], [2, 3, 2, 1], [1, 4, 3, 2], [4, 4, 1, 1], [5, 4, 1, 2], [0, 5, 1, 1], [4, 5, 1, 1]];

function MosaicCard({ at, flipAt }: { at: number; flipAt: number }): React.ReactElement {
  const t = useT();
  // the grid stretched to the whole card, less a thin margin
  const G = 8, PAD = 14;
  const SX = (760 - 2 * PAD - 5 * G) / 6, SY = (620 - 2 * PAD - 5 * G) / 6;
  // each piece its own saturated gradient with a faint white pattern laid over it
  const P = {
    dots: "radial-gradient(rgb(255 255 255 / 10%) 1.6px, transparent 1.9px) 0 0 / 14px 14px",
    grid: "linear-gradient(rgb(255 255 255 / 8%) 1px, transparent 1px) 0 0 / 18px 18px, linear-gradient(90deg, rgb(255 255 255 / 8%) 1px, transparent 1px) 0 0 / 18px 18px",
    stripes: "repeating-linear-gradient(45deg, rgb(255 255 255 / 7%) 0 2px, transparent 2px 11px)",
    waves: `url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2724%27%20height%3D%2714%27%3E%3Cpath%20d%3D%27M0%207%20Q6%201%2012%207%20T24%207%27%20fill%3D%27none%27%20stroke%3D%27white%27%20stroke-opacity%3D%270.1%27%20stroke-width%3D%271.5%27/%3E%3C/svg%3E") 0 0 / 24px 14px`,
    diamonds: `url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2718%27%20height%3D%2718%27%3E%3Cpath%20d%3D%27M9%202%20L16%209%20L9%2016%20L2%209%20Z%27%20fill%3D%27none%27%20stroke%3D%27white%27%20stroke-opacity%3D%270.1%27%20stroke-width%3D%271.2%27/%3E%3C/svg%3E") 0 0 / 18px 18px`,
    none: "linear-gradient(transparent, transparent)",
  };
  const grad = (a: string, b: string, deg = 135) => `linear-gradient(${deg}deg, ${a}, ${b})`;
  const fills: [string, string][] = [
    [P.grid, grad("#7b2fff", "#4f6bff")],
    [P.dots, grad("#ff2d78", "#ff6a3d")],
    [P.waves, grad("#00c2e8", "#2f7bff")],
    [P.none, grad("#ffb000", "#ff6a1f")],
    [P.stripes, grad("#ec1480", "#9b3dff", 160)],
    [P.diamonds, grad("#14c08a", "#0aa7c9")],
    [P.dots, grad("#4f6bff", "#9b3dff")],
    [P.waves, grad("#ff5a1f", "#f33869")],
    [P.diamonds, grad("#9b3dff", "#ec1480")],
    [P.grid, grad("#ffcc33", "#ff8a1f")],
    [P.stripes, grad("#2f7bff", "#00c2e8", 160)],
    [P.none, grad("#f33869", "#ff2d78")],
    [P.waves, grad("#6b4dff", "#ec1480")],
    [P.dots, grad("#00b8d9", "#14c08a")],
    [P.diamonds, grad("#ff6a1f", "#ffb000", 160)],
    [P.grid, grad("#ec1480", "#ff5a1f")],
    [P.stripes, grad("#4f6bff", "#00c2e8")],
  ];
  // one piece at a time, all through the line about the obsession, the last landing as it ends
  const order = PIECES.map((_, i) => i).sort((a, b) => (hash(a + 3) % 97) - (hash(b + 3) % 97));
  const step = (flipAt - 0.5 - (at + 0.3)) / PIECES.length;
  const ring = prog(t, flipAt + 0.1, 0.9, "inOut");
  const per = 2 * (760 - 12) + 2 * (620 - 12);
  // solid for most, outlined for some, frosted glass for a few
  const look = (i: number): React.CSSProperties => {
    const [pattern, fill] = fills[i]!;
    const kind = [2, 7, 13].includes(i) ? "outline" : [5, 10, 16].includes(i) ? "glass" : "solid";
    const [a, b] = fill.match(/#[0-9a-f]{6}/gi)!;
    if (kind === "outline") return { background: `${pattern}, linear-gradient(135deg, ${a}26, ${b}12)`, boxShadow: `inset 0 0 0 2.5px ${a}, 0 0 28px ${a}40` };
    if (kind === "glass") return { background: `${pattern}, linear-gradient(160deg, rgb(255 255 255 / 30%), rgb(255 255 255 / 6%) 55%), linear-gradient(135deg, ${a}bb, ${b}88)`, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 40%), inset 0 1px 0 rgb(255 255 255 / 55%), 0 12px 26px rgb(0 0 0 / 30%)" };
    return { background: `${pattern}, ${fill}`, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 22%), 0 0 0 1px rgb(0 0 0 / 40%), 0 12px 26px rgb(0 0 0 / 35%)" };
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: "#1B1D24" }}>
      {/* the site's hero, quietly: a dot grid and a little colour pooled at the bottom */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 45% at 15% 110%, rgb(138 18 224 / 30%), transparent), radial-gradient(ellipse 60% 40% at 90% 110%, rgb(255 84 20 / 18%), transparent), radial-gradient(rgb(255 255 255 / 7%) 1px, transparent 1.2px) 0 0 / 24px 24px" }} />
      <div style={{ position: "absolute", inset: PAD }}>
        <svg width={760} height={620} style={{ position: "absolute", left: -PAD, top: -PAD, overflow: "visible" }}>
          <rect x={6} y={6} width={760 - 12} height={620 - 12} rx={30} fill="none" stroke={L.rose} strokeWidth={2.5} strokeDasharray={per} strokeDashoffset={per * (1 - ring)} opacity={ring > 0 ? 1 : 0} />
        </svg>
        {PIECES.map(([x, y, w, h], i) => {
          const hh = hash(i + 7);
          const k = prog(t, at + 0.3 + order.indexOf(i) * step, 0.5);
          const rot = ((hh >>> 15) % 24) - 12;
          return <div key={i} style={{ position: "absolute", left: x * (SX + G), top: y * (SY + G), width: w * SX + (w - 1) * G, height: h * SY + (h - 1) * G, borderRadius: 18, ...look(i), opacity: k, transform: `translateY(${(1 - k) * -46}px) rotate(${rot * (1 - k)}deg) scale(${0.9 + 0.1 * k})` }} />;
        })}
      </div>
    </div>
  );
}

// ---- buy or build: a company's question, now one person's ----

function BuyBuild(): React.ReactElement {
  const t = useT();
  const s = beats.buyBuild;
  const solo = say(18, "one person", -0.2);
  const go = prog(t, solo, 0.8, "inOut");
  const agent = prog(t, solo + 0.45, 0.5);
  const COLS = 6, D = 76, G = 20;
  const keep = 8;
  const w = COLS * D + (COLS - 1) * G;
  return (
    <Scene from={s} to={beats.features}>
      <Appear at={s + 0.02} style={{ position: "absolute", left: 0, right: 0, top: 200 }}>
        <Title size={160}>
          Buy <span style={{ color: L.faint }}>or</span> Build
        </Title>
      </Appear>
      {/* a company's worth of people deciding, then one person and an agent */}
      <div style={{ position: "absolute", left: 960 - w / 2, top: 470, width: w, height: 3 * D + 2 * G }}>
        {Array.from({ length: 18 }, (_, i) => {
          const r = Math.floor(i / COLS), c = i % COLS;
          const x0 = c * (D + G), y0 = r * (D + G);
          const k = prog(t, s + 0.25 + (r + c) * 0.035, 0.45);
          if (i === keep) {
            const size = D + 44 * go;
            const x = x0 + (w / 2 - 110 - D / 2 - x0) * go;
            const y = y0 + (D + G - y0) * go - 22 * go;
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: 99, background: go > 0.5 ? L.ink : "#e5e5ea", display: "grid", placeItems: "center", opacity: k }}>
                <UserIcon style={{ width: size * 0.42, height: size * 0.42, color: go > 0.5 ? "#fff" : L.muted, strokeWidth: 1.8 }} />
              </div>
            );
          }
          const out = prog(t, solo + ((hash(i) % 10) / 10) * 0.25, 0.4, "inOut");
          return (
            <div key={i} style={{ position: "absolute", left: x0, top: y0, width: D, height: D, borderRadius: 99, background: "#e5e5ea", display: "grid", placeItems: "center", opacity: k * (1 - out), transform: `scale(${(0.85 + 0.15 * k) * (1 - 0.4 * out)})` }}>
              <UserIcon style={{ width: 32, height: 32, color: L.muted, strokeWidth: 1.8 }} />
            </div>
          );
        })}
        {agent > 0 ? (
          <div style={{ position: "absolute", left: w / 2 + 40, top: D + G - 22 + (D + 44) / 2 - 36, height: 72, padding: "0 30px 0 22px", borderRadius: 99, background: L.rose, color: "#fff", display: "flex", alignItems: "center", gap: 12, fontSize: 36, letterSpacing: "0.02em", opacity: agent, transform: `translateX(${(1 - agent) * -30}px)` }}>
            <SparklesIcon style={{ width: 30, height: 30 }} /> Agent
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, height: 80 }}>
        <Appear at={s + 0.4} outAt={solo - 0.05} outDur={0.3} y={16} style={{ position: "absolute", inset: 0, textAlign: "center", fontSize: 52, letterSpacing: "0.02em", color: L.faint }}>
          For big companies
        </Appear>
        <Appear at={solo + 0.3} y={16} style={{ position: "absolute", inset: 0, textAlign: "center", fontSize: 52, letterSpacing: "0.02em", color: L.rose }}>
          For one person with an agent
        </Appear>
      </div>
    </Scene>
  );
}

function Features(): React.ReactElement {
  const t = useT();
  const used = [23, 58, 81];
  const at = say(19, "to use", -0.15);
  const pick = prog(t, at, 0.6);
  const room = prog(t, at - 0.2, 0.45, "inOut");
  return (
    <Scene from={beats.features} to={beats.clone}>
      <div style={{ ...center, gap: 70 }}>
        <Appear at={beats.features + 0.02}>
          <Title size={110} style={{ whiteSpace: "nowrap" }}>
            100 features
            <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", maxWidth: 520 * room, paddingLeft: `${0.26 * room}em` }}>
              <Fill text="to use 3" from={at} to={say(19, "three", -0.15)} />
            </span>
          </Title>
        </Appear>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 40px)", gap: 11 }}>
          {Array.from({ length: 100 }, (_, i) => {
            const a = prog(t, beats.features + 0.1 + (Math.floor(i / 10) + (i % 10)) * 0.018, 0.5);
            const on = used.includes(i);
            return <div key={i} style={{ width: 40, height: 40, borderRadius: 11, opacity: a * (on ? 1 : 1 - pick * 0.55), transform: `scale(${(0.8 + 0.2 * a) * (on ? 1 + 0.14 * pick : 1)})`, background: on ? `color-mix(in srgb, ${L.rose} ${Math.round(pick * 100)}%, #e3e3e8)` : "#e3e3e8", boxShadow: on && pick > 0 ? `0 8px 20px rgb(243 56 105 / ${Math.round(pick * 30)}%)` : undefined }} />;
          })}
        </div>
      </div>
    </Scene>
  );
}

function Clone(): React.ReactElement {
  const t = useT();
  const at = say(20, "into", -0.12);
  const k = prog(t, at, 0.45, "inOut");
  return (
    <Scene from={beats.clone} to={beats.iceberg}>
      <div style={{ ...center, gap: 40 }}>
        <Appear at={beats.clone + 0.02}>
          <div style={{ display: "flex", alignItems: "baseline", fontFamily: FONT, fontSize: 190, letterSpacing: "0.02em", lineHeight: 1.1, fontWeight: 500 }}>
            <Struck at={at} size={190} color={L.ink}>
              Build
            </Struck>
            {/* Clone opens up beside it, so Build slides over instead of jumping */}
            <span style={{ display: "inline-block", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 700 * k, paddingLeft: 56 * k, color: L.rose, opacity: k }}>Clone</span>
          </div>
        </Appear>
        <div style={{ height: 80 }}>
          <Appear at={say(21, "copies", -0.1)} y={16}>
            <Sub size={60} style={{ color: L.muted }}>The screens, in an afternoon</Sub>
          </Appear>
        </div>
      </div>
    </Scene>
  );
}

// ---- the iceberg: the screens on top, and under the line everything a clone never sees ----

const HIDDEN = [DatabaseIcon, ServerIcon, ShieldIcon, GitBranchIcon, LockIcon, GlobeIcon, BugIcon, ClockIcon, CalendarIcon, HourglassIcon, HistoryIcon, ListChecksIcon, MessageSquareIcon, UsersIcon, LightbulbIcon, BrainIcon, CompassIcon, ScaleIcon, BookOpenIcon, FlaskConicalIcon, PuzzleIcon, PaletteIcon, PenToolIcon, SparklesIcon, LayersIcon, WrenchIcon, TrendingUpIcon, MapIcon];

const HUE = ["#7b2fff", "#2f7bff", "#00a9cc", "#ec1480", "#ff6a1f", "#14a37a", "#9b3dff"];

function Iceberg(): React.ReactElement {
  const t = useT();
  const s = beats.iceberg;
  const COLS = 7, ROWS = 5, S = 104, G = 12, DIP = 64;
  const w = COLS * S + (COLS - 1) * G;
  const h = ROWS * S + (ROWS - 1) * G + DIP;
  const label = 420;
  const left = (1920 - (w + 56 + label)) / 2;
  const top = (1080 - h) / 2;
  const line = top + S + DIP / 2 + 4;
  const under = say(21, "years", -0.2);
  const tip = say(22, "tip", -0.1);
  const out = cue(23, -0.32);
  const lit = prog(t, tip, 0.45, "inOut");
  const water = prog(t, under - 0.15, 0.6, "inOut");
  return (
    <Scene from={s} to={beats.wants}>
      <Appear at={-1} outAt={out} outDur={0.3} y={0} style={{ position: "absolute", inset: 0 }}>
        {/* the water: everything below the line, pale */}
        <div style={{ position: "absolute", left: 0, right: 0, top: line, bottom: 0, background: `linear-gradient(to bottom, rgb(79 107 255 / ${(10 * water).toFixed(2)}%), rgb(155 61 255 / ${(6 * water).toFixed(2)}%) 45%, rgb(236 20 128 / ${(4 * water).toFixed(2)}%) 80%, rgb(255 90 31 / ${(2 * water).toFixed(2)}%))` }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: line, height: 1.5, background: "rgb(0 0 0 / 14%)", transform: `scaleX(${prog(t, s + 0.15, 0.8, "inOut")})` }} />
        <div style={{ position: "absolute", left, top, width: w, height: h }}>
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const r = Math.floor(i / COLS), c = i % COLS;
            const x = c * (S + G), y = r * (S + G) + (r ? DIP : 0);
            if (r === 0) {
              // the screens: all a clone copies
              const k = prog(t, s + c * 0.04, 0.4);
              return (
                <div key={i} style={{ position: "absolute", left: x, top: y, width: S, height: S, borderRadius: 18, background: `color-mix(in srgb, ${L.rose} ${Math.round(lit * 100)}%, ${L.ink})`, opacity: k, transform: `scale(${0.85 + 0.15 * k})`, display: "grid", placeItems: "center" }}>
                  <LayoutGridIcon style={{ width: 42, height: 42, color: "#fff", strokeWidth: 1.6 }} />
                </div>
              );
            }
            // and under the line, row by row as it's said, what it misses
            const Icon = HIDDEN[(i - COLS) % HIDDEN.length]!;
            const a = under + (r - 1) * 0.2 + c * 0.035;
            const k = prog(t, a, 0.4);
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, width: S, height: S, borderRadius: 18, background: "#fff", border: "1.5px dashed rgb(0 0 0 / 26%)", opacity: k * (1 - lit * 0.4), transform: `translateY(${(1 - k) * 14}px)`, display: "grid", placeItems: "center" }}>
                <Icon style={{ width: 38, height: 38, color: HUE[(i - COLS) % HUE.length], strokeWidth: 1.6 }} />
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: left + w + 56, top: top + S / 2 - 28, fontSize: 46, letterSpacing: "0.02em", whiteSpace: "nowrap", color: `color-mix(in srgb, ${L.rose} ${Math.round(lit * 100)}%, ${L.ink})` }}>
          <Appear at={s + 0.1} x={-16} y={0}>The screens</Appear>
        </div>
        <div style={{ position: "absolute", left: left + w + 56, top: top + S + DIP + G + 1.5 * (S + G) + S / 2 - 30, fontSize: 46, letterSpacing: "0.02em", whiteSpace: "nowrap", color: L.muted }}>
          <Appear at={under + 0.3} x={-16} y={0}>Years of decisions</Appear>
        </div>
      </Appear>
      <Outcomes />
    </Scene>
  );
}

// ---- what a clone costs both sides ----

function Outcomes(): React.ReactElement {
  const t = useT();
  const builder = say(23, "builder", -0.3);
  const user = say(23, "user", -0.3);
  const loses = say(23, "loses", -0.05);
  const bugs = say(23, "every bug", -0.15);
  const rise = prog(t, builder + 0.25, 0.9, "inOut");
  const fallAt = Math.max(loses, builder + 1.2);
  const drop = prog(t, fallAt, 0.7, "inOut");
  // revenue climbing for years, then falling away once the product is copied
  // years of steady growth, rounding over at the top, then falling away once the product is copied
  const RISE = "M 0 196 C 90 190, 150 170, 220 142 S 360 86, 430 72";
  const FALL = "M 430 72 C 466 66, 488 112, 524 206";
  const card = (children: React.ReactNode) => <div style={{ position: "relative", width: 640, height: 300, borderRadius: 28, background: "#fff", boxShadow: `0 0 0 1.5px ${L.line}, 0 24px 60px rgb(0 0 0 / 6%)`, overflow: "hidden" }}>{children}</div>;
  const BUGS: [number, number][] = [[214, 96], [398, 120], [300, 176], [496, 82], [180, 214], [452, 216], [560, 160], [250, 140]];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 100 }}>
      <div style={{ width: 700, height: 560, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Appear at={builder} y={24} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46 }}>
          <Title size={84}>
            The builder
            <span style={{ display: "block" }}>
              <Fill text="loses the business" from={loses - 0.08} to={loses + 0.1} />
            </span>
          </Title>
          {card(
            <>
              <div style={{ position: "absolute", left: 34, top: 28, fontSize: 22, color: L.muted }}>Revenue</div>
              <div style={{ position: "absolute", right: 34, top: 22, fontSize: 34, color: drop > 0.5 ? L.rose : L.ink, fontVariantNumeric: "tabular-nums" }}>{drop > 0.5 ? "$1,940" : "$48,200"}</div>
              <svg width={640} height={300} style={{ position: "absolute", inset: 0 }}>
                <g transform="translate(50 40)">
                  <line x1={0} y1={210} x2={560} y2={210} stroke="rgb(0 0 0 / 10%)" strokeWidth={1.5} />
                  <path d={RISE} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - rise} fill="none" stroke={L.ink} strokeWidth={4} strokeLinecap="round" />
                  {drop > 0 ? <path d={FALL} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - drop} fill="none" stroke={L.rose} strokeWidth={4} strokeLinecap="round" /> : null}
                  <circle cx={524} cy={206} r={7} fill={L.rose} opacity={prog(t, fallAt + 0.6, 0.2)} />
                </g>
              </svg>
            </>,
          )}
        </Appear>
      </div>
      <div style={{ width: 700, height: 560, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Appear at={user} y={24} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46 }}>
          <Title size={84}>
            The user
            <span style={{ display: "block" }}>
              <Fill text="gets a worse copy" from={say(23, "gets", -0.12)} to={say(23, "gets", 0.08)} />
            </span>
          </Title>
          {card(
            <>
              {/* the copy: the same screens, nothing under them, and every bug now theirs */}
              <div style={{ position: "absolute", left: 30, top: 30, bottom: 30, width: 120, borderRadius: 14, background: L.soft, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {[70, 54, 62, 46].map((x, i) => (
                  <div key={i} style={{ height: 10, width: `${x}%`, borderRadius: 5, background: "#dcdce1" }} />
                ))}
              </div>
              <div style={{ position: "absolute", left: 172, right: 30, top: 30, height: 30, borderRadius: 8, background: L.soft }} />
              {[0, 1, 2, 3].map((r) => (
                <div key={r} style={{ position: "absolute", left: 172, right: 30, top: 82 + r * 48, height: 34, borderRadius: 8, border: `1.5px dashed rgb(0 0 0 / 14%)` }} />
              ))}
              {BUGS.map(([x, y], i) => {
                const k = prog(t, bugs + i * 0.09, 0.3);
                return k > 0 ? (
                  <div key={i} style={{ position: "absolute", left: x - 20, top: y - 20, width: 40, height: 40, borderRadius: 99, background: L.rose, display: "grid", placeItems: "center", opacity: k, transform: `scale(${0.4 + 0.6 * k})`, boxShadow: "0 6px 16px rgb(243 56 105 / 30%)" }}>
                    <BugIcon style={{ width: 21, height: 21, color: "#fff", strokeWidth: 2 }} />
                  </div>
                ) : null;
              })}
            </>,
          )}
        </Appear>
      </div>
    </div>
  );
}

// ---- the three reasons, ending up together ----

function Wants(): React.ReactElement {
  const t = useT();
  const s = beats.wants;
  const items: { at: number; title: string; icon: React.ReactNode; below: React.ReactNode }[] = [
    { at: say(25, "own", -0.3), title: "Their own code", icon: <GitBranchIcon style={{ width: 44, height: 44, color: L.ink, strokeWidth: 1.6 }} />, below: <Sub size={32}>In their repo, on their servers</Sub> },
    { at: say(26, "use", -0.25), title: "Their own AI", icon: <MuseGlyph size={52} />, below: <Muse product="Spark" size={32} byMeta /> },
    { at: say(27, "shaped", -0.3), title: "Their own way", icon: <SlidersHorizontalIcon style={{ width: 44, height: 44, color: L.ink, strokeWidth: 1.6 }} />, below: <Sub size={32}>Shaped to how they work</Sub> },
  ];
  // the three stay up together; the page scrolls up and away as the dark card rises over it
  return (
    <Scene from={s} to={scrolls.reveal + SCROLL} fadeOut={0.01} shift={pageShift(t)}>
      <Appear at={s + 0.02} style={{ position: "absolute", left: 0, right: 0, top: 250 }}>
        <Title size={116}>
          People clone <Fill text="for three reasons" from={say(24, "for", -0.05)} to={say(24, "reasons", -0.05)} />
        </Title>
      </Appear>
      <div style={{ position: "absolute", left: 0, right: 0, top: 490, display: "flex", justifyContent: "center" }}>
        {items.map((it, i) => (
          <div key={it.title} style={{ position: "relative", width: 560, height: 330, display: "flex", justifyContent: "center" }}>
            {i ? <div style={{ position: "absolute", left: 0, top: 30, bottom: 30, width: 1.5, background: L.line, transform: `scaleY(${prog(t, it.at, 0.5, "inOut")})` }} /> : null}
            <Appear at={it.at} y={30} style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20 }}>
              <div style={{ width: 104, height: 104, borderRadius: 28, background: L.soft, display: "grid", placeItems: "center", marginBottom: 34 }}>{it.icon}</div>
              <div style={{ fontSize: 64, letterSpacing: "0.02em", color: L.ink, whiteSpace: "nowrap", marginBottom: 14 }}>{it.title}</div>
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
