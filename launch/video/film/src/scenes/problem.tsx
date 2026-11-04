import { ArrowUpIcon, Building2Icon, CodeIcon, HeadsetIcon, KeyRoundIcon, LightbulbIcon, SearchIcon, ServerIcon, SparklesIcon, UserIcon } from "lucide-react";
import * as React from "react";
import { Appear, Chip, Eyebrow, FONT, GradText, L, MONO, Muse, Scene, Sub, Swap, Title, Typed, center, lerp, prog, useT } from "../kit";
import { Blueprint, Callout, Cross, GRAD, Note, SCROLL, Ticks, pageShift, scrolls } from "../look";
import { beats, cue, say } from "../timeline";

// Beats 1–8 of launch/video/beats.md, on the white page: SaaS changed, its four parts (one screen
// each), buy vs. build turning into clone, the iceberg a clone misses, and the three things people
// want instead (one word each). Drawn like the sales page: two-tone headlines, hairline tiles, and
// the blueprint's guides and mono notes around whatever the frame is about.

/** An everyday SaaS app, the kind AI first got bolted onto. Light, like most of them. */
function SaasApp({ assistant = 0, wire = 1, style }: { assistant?: number; wire?: number; style?: React.CSSProperties }): React.ReactElement {
  const rows = ["Website redesign", "Q3 onboarding", "Pricing page", "Partner portal", "Mobile app beta", "Help center"];
  const owners = ["Ana", "Ben", "Kai", "Mo", "Sia", "Tom"];
  const status = ["In progress", "Review", "Done", "In progress", "Planned", "Review"];
  // `wire` < 1 draws it row by row, still being built
  const ghost = (i: number) => (wire >= 1 ? 1 : Math.min(1, Math.max(0, wire * 8 - i)));
  return (
    <div style={{ width: 860, height: 540, background: "#fff", borderRadius: 18, overflow: "hidden", fontFamily: FONT, display: "flex", flexDirection: "column", boxShadow: `0 0 0 1px ${L.line}, ${L.shadow}`, ...style }}>
      <div style={{ height: 46, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", borderBottom: `1px solid ${L.line}` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 99, background: "#e1e1e6" }} />
        ))}
        <div style={{ marginLeft: 14, width: 22, height: 22, borderRadius: 6, background: "#4b6bfb" }} />
        <span style={{ color: L.ink, fontSize: 16 }}>Acme Projects</span>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ width: 170, background: L.softer, borderRight: `1px solid ${L.line}`, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {["Projects", "Tasks", "Reports", "Team", "Billing"].map((l, i) => (
            <div key={l} style={{ padding: "7px 10px", borderRadius: 7, fontSize: 14, color: i === 0 ? L.ink : L.muted, background: i === 0 ? "#ececf0" : "transparent", opacity: ghost(i) }}>{l}</div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 18, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20, color: L.ink }}>Projects</span>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 8, border: `1px solid ${L.line}`, color: L.faint, fontSize: 13 }}>
              <SearchIcon style={{ width: 13, height: 13 }} /> Search
            </div>
            {assistant > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", borderRadius: 8, background: "linear-gradient(90deg,#7c5cff,#c058f5)", color: "#fff", fontSize: 13, transform: `scale(${0.85 + 0.15 * assistant})`, opacity: assistant, boxShadow: `0 0 0 ${6 * (1 - assistant)}px rgb(124 92 255 / ${Math.round(25 * assistant)}%)` }}>
                <SparklesIcon style={{ width: 13, height: 13 }} /> Ask AI
              </div>
            ) : null}
          </div>
          {rows.map((r, i) => (
            <div key={r} style={{ display: "flex", alignItems: "center", height: 46, borderTop: `1px solid ${L.line}`, fontSize: 14.5, color: L.ink2, opacity: ghost(i) }}>
              <span style={{ flex: 1 }}>{r}</span>
              <span style={{ width: 90, color: L.muted }}>{owners[i]}</span>
              <span style={{ width: 110, color: L.muted }}>{status[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hook(): React.ReactElement {
  const t = useT();
  // the app steps back as the prompt comes up: the assistant handed the login, asked to rebuild it all
  const back = lerp(t, [cue(2), cue(2, 1.0)], [0, 1]);
  const ai = prog(t, say(1, "ai assistant", -0.1), 0.7);
  const key = say(2, "login", -0.15);
  const ask = say(2, "ask", 0.05);
  const ask$ = "Rebuild this whole product";
  const sent = ask + ask$.length / 30 + 0.25;
  const press = prog(t, sent, 0.25) * (1 - prog(t, sent + 0.25, 0.4));
  return (
    <Scene from={beats.hook} to={beats.fourParts}>
      <div style={{ position: "absolute", top: 104, left: 0, right: 0, height: 40 }}>
        <Swap
          items={[
            { at: 0.1, node: <Eyebrow size={26} color={L.faint}>2025</Eyebrow> },
            { at: cue(2), node: <Eyebrow size={26}>2026</Eyebrow> },
          ]}
          y={12}
        />
      </div>
      <div style={{ ...center, top: 40 }}>
        <Appear at={0.2} y={40}>
          <div style={{ position: "relative", transform: `scale(${1.08 - back * 0.1}) translateY(${-back * 60}px)`, opacity: 1 - back * 0.45 }}>
            <Blueprint x={0} y={0} w={860} h={540} at={0.5} outAt={cue(2)} radius={28} />
            <SaasApp assistant={ai} />
            {/* what got bolted on, marked up like a drawing */}
            <Callout x={846} y={79} len={84} k={ai * (1 - back)}>
              AI assistant
            </Callout>
          </div>
        </Appear>
      </div>
      {t >= cue(2) ? (
        <Appear at={cue(2, 0.3)} y={40} style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 860, borderRadius: 999, padding: 2, background: GRAD, boxShadow: "0 24px 70px rgb(236 20 128 / 14%), 0 10px 30px rgb(155 61 255 / 10%)" }}>
            <div style={{ borderRadius: 999, background: "#fff", padding: "16px 18px 16px 22px", display: "flex", alignItems: "center", gap: 18 }}>
              {/* the login, handed over like an attachment */}
              <Appear at={key} y={0} x={-16} scale={0.9} dur={0.6} style={{ display: "flex" }}>
                <Chip tone="warning" style={{ fontSize: 24, padding: "10px 18px" }}>
                  <KeyRoundIcon style={{ width: 20, height: 20 }} /> Acme login
                </Chip>
              </Appear>
              <div style={{ fontSize: 32, color: L.ink, flex: 1, letterSpacing: "0.015em", whiteSpace: "nowrap" }}>
                {t < key ? <span style={{ color: L.faint }}>Ask anything</span> : <Typed text={ask$} at={ask} cps={30} color={L.ink} />}
              </div>
              <div style={{ width: 54, height: 54, borderRadius: 99, background: L.ink, display: "grid", placeItems: "center", color: "#fff", transform: `scale(${1 - press * 0.12})`, boxShadow: `0 0 0 ${press * 8}px rgb(155 61 255 / ${Math.round(press * 25)}%)` }}>
                <ArrowUpIcon style={{ width: 24, height: 24 }} />
              </div>
            </div>
          </div>
        </Appear>
      ) : null}
    </Scene>
  );
}

type Part = { key: string; label: string; icon: typeof CodeIcon; at: number; before: string; after: string; flipAt: number; afterTone: "green" | "accent" };

function partsList(): Part[] {
  return [
    { key: "code", label: "Code", icon: CodeIcon, at: cue(4), before: "A team of engineers", after: "An agent, overnight", flipAt: say(6, "agent", -0.1), afterTone: "green" },
    { key: "servers", label: "Servers", icon: ServerIcon, at: cue(7), before: "Hard at everybody scale", after: "Nearly free at yours", flipAt: say(9, "nearly", -0.15), afterTone: "green" },
    { key: "support", label: "Support", icon: HeadsetIcon, at: cue(10), before: "A team on tickets", after: "An agent fixes it", flipAt: say(12, "agent", -0.1), afterTone: "green" },
    { key: "vision", label: "Vision", icon: LightbulbIcon, at: cue(13), before: "A founder's obsession", after: "Unchanged", flipAt: cue(15), afterTone: "accent" },
  ];
}

function Status({ text, tone }: { text: string; tone: "amber" | "green" | "accent" | "muted" }): React.ReactElement {
  const color = tone === "amber" ? L.amber : tone === "green" ? L.green : tone === "accent" ? L.accent : L.muted;
  return (
    <div style={{ fontSize: 44, letterSpacing: "0.02em", color, whiteSpace: "nowrap" }}>{text}</div>
  );
}

function FourParts(): React.ReactElement {
  const t = useT();
  const parts = partsList();
  const s = beats.fourParts;
  const first = parts[0]!.at;
  const taste = cue(16);
  return (
    <Scene from={s} to={beats.buyBuild}>
      {/* the overview: the four parts named at once, in a hairline strip */}
      <Appear at={s + 0.05} outAt={first - 0.35} style={{ ...center, gap: 76 }}>
        <Title size={96} rest="sold as one subscription" style={{ maxWidth: 1280 }}>
          SaaS was four things
        </Title>
        <div style={{ display: "flex", background: "#fff", borderRadius: 32, boxShadow: `0 0 0 1px ${L.line}`, overflow: "hidden" }}>
          {parts.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.key} style={{ width: 300, height: 210, borderLeft: i ? `1px solid ${L.line}` : undefined }}>
                <Appear at={s + 0.3 + i * 0.09} y={16} style={{ height: "100%", padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <Icon style={{ width: 40, height: 40, color: L.ink, strokeWidth: 1.6 }} />
                  <div style={{ fontSize: 32, letterSpacing: "0.02em", color: L.ink }}>{p.label}</div>
                </Appear>
              </div>
            );
          })}
        </div>
      </Appear>

      {/* one screen per part, framed the same so only what changes moves */}
      <Appear at={first - 0.1} outAt={taste - 0.3} y={0} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: 180, top: 0, bottom: 0, width: 720 }}>
          {parts.map((p, i) => {
            const next = parts[i + 1]?.at;
            return (
              <Appear key={p.key} at={p.at} outAt={next === undefined ? undefined : next - 0.38} outDur={0.38} y={30} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
                <Title size={140} style={{ textAlign: "left" }}>{p.label}</Title>
                <div style={{ position: "relative", height: 60 }}>
                  <Swap
                    items={[
                      { at: p.at + 0.35, node: <Status text={p.before} tone={p.key === "vision" ? "muted" : "amber"} /> },
                      { at: p.flipAt, node: <Status text={p.after} tone={p.afterTone} /> },
                    ]}
                    y={16}
                  />
                </div>
              </Appear>
            );
          })}
        </div>
        {/* the card the picture sits on, drawn up, with a soft glow under it */}
        <div style={{ position: "absolute", left: 1000, top: 730, width: 700, height: 200, borderRadius: "50%", background: "radial-gradient(closest-side, rgb(155 61 255 / 14%), rgb(236 20 128 / 8%) 55%, transparent)" }} />
        <Blueprint x={960} y={230} w={780} h={620} at={first} radius={40} reach={260} reachV={56} />
        <div style={{ position: "absolute", left: 960, top: 230, width: 780, height: 620, borderRadius: 32, background: "#fff", boxShadow: `0 0 0 1px ${L.line}, 0 30px 80px rgb(0 0 0 / 7%)`, overflow: "hidden" }}>
          {parts.map((p, i) => {
            const next = parts[i + 1]?.at;
            return (
              <Appear key={p.key} at={p.at + 0.05} outAt={next === undefined ? undefined : next - 0.38} outDur={0.38} y={20} style={{ position: "absolute", inset: 0 }}>
                <PartVisual part={p.key} t={t} at={p.at} flipAt={p.flipAt} />
              </Appear>
            );
          })}
        </div>
      </Appear>

      <Appear at={taste + 0.05} y={30} style={{ ...center }}>
        <Title size={150}>
          AI can't recreate <GradText gradient={GRAD}>taste</GradText>
        </Title>
      </Appear>
    </Scene>
  );
}

function PartVisual({ part, t, at, flipAt }: { part: string; t: number; at: number; flipAt: number }): React.ReactElement | null {
  if (part === "code") {
    const lines = ["export default {", "  async fetch(req, env) {", "    const rows = await env.DB", "      .prepare(sql)", "      .all()", "    return Response.json(rows)", "  },", "}"];
    // slowly by hand, then the agent writes the rest at once
    const n = t < at ? 0 : t < flipAt ? Math.min(2, (t - at) * 0.7) : 2 + (t - flipAt) * 12;
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 56, display: "flex", alignItems: "center", gap: 10, padding: "0 24px", borderBottom: `1px solid ${L.line}`, fontSize: 20, color: L.muted }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 99, background: "#e1e1e6" }} />
          ))}
          <span style={{ marginLeft: 12, fontFamily: MONO, fontSize: 18 }}>worker.ts</span>
        </div>
        <div style={{ padding: "26px 30px", fontFamily: MONO, fontSize: 25, lineHeight: 1.75 }}>
          {lines.map((l, i) => {
            const shown = Math.max(0, Math.min(1, n - i));
            return (
              <div key={i} style={{ display: "flex", gap: 26, whiteSpace: "pre" }}>
                <span style={{ width: 22, textAlign: "right", color: "#c7c7cc" }}>{i + 1}</span>
                <span style={{ color: L.ink2 }}>{shown > 0 ? l.slice(0, Math.ceil(l.length * shown)) : ""}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  if (part === "servers") {
    // everybody's scale: tall bars; most people's scale: a few small ones
    const shrink = prog(t, say(9, "you scale", -0.1), 1.4, "inOut");
    const bars = Array.from({ length: 14 }, (_, i) => 0.5 + 0.5 * Math.abs(Math.sin(i * 1.3 + 0.6)));
    return (
      <div style={{ height: "100%", padding: 44, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", height: 40, fontSize: 28, letterSpacing: "0.02em" }}>
          <Swap
            items={[
              { at: at + 0.2, node: <span style={{ color: L.muted }}>Everybody scale</span> },
              { at: say(9, "you scale", -0.1), node: <span style={{ color: L.ink }}>Your scale</span> },
            ]}
            y={12}
          />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 12, marginTop: 30 }}>
          {bars.map((b, i) => {
            const grow = prog(t, at + 0.1 + i * 0.04, 0.8);
            const h = b * (1 - shrink * 0.82) * grow;
            const warm = i % 3 === 0;
            return <div key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 8, background: `color-mix(in srgb, #34c759 ${Math.round(shrink * 100)}%, ${warm ? "#ffb067" : "#dcdce1"})` }} />;
          })}
        </div>
      </div>
    );
  }
  if (part === "support") {
    const bubble = (who: "user" | "agent", text: string, a: number) => (
      <Appear at={a} y={14} style={{ display: "flex", justifyContent: who === "user" ? "flex-end" : "flex-start" }}>
        <div className="pretty" style={{ maxWidth: 480, padding: "16px 24px", borderRadius: 26, fontSize: 28, lineHeight: 1.3, letterSpacing: "0.015em", background: who === "user" ? "#ececf0" : L.greenSoft, color: who === "user" ? L.ink : L.green }}>{text}</div>
      </Appear>
    );
    return (
      <div style={{ height: "100%", padding: 40, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        {bubble("user", "How do I export my data", at + 0.3)}
        {bubble("user", "Export is broken on Safari", at + 1.2)}
        {bubble("agent", "Here's how, from the docs", say(12, "answers", -0.15))}
        {bubble("agent", "Found the bug, fixed and shipped", say(12, "fixes", -0.1))}
      </div>
    );
  }
  if (part === "vision") {
    // obsessing over a problem: rings closing in on one point, in the site's colours
    const hues = ["155 61 255", "236 20 128", "255 90 31"];
    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        {[0, 1, 2, 3, 4, 5].map((r) => {
          const phase = (Math.max(0, t - at) * 0.35 + r / 6) % 1;
          const s = 1 - phase;
          return <div key={r} style={{ position: "absolute", width: 520 * s, height: 520 * s, borderRadius: 999, border: `2px solid rgb(${hues[r % 3]} / ${Math.round(80 * phase)}%)` }} />;
        })}
        <div style={{ width: 28, height: 28, borderRadius: 99, background: GRAD }} />
      </div>
    );
  }
  return null;
}

function BuyBuild(): React.ReactElement {
  const t = useT();
  const solo = prog(t, cue(18), 0.9, "inOut");
  return (
    <Scene from={beats.buyBuild} to={beats.features}>
      <div style={{ ...center, gap: 80 }}>
        <Appear at={beats.buyBuild + 0.05}>
          <Title size={132}>
            Buy <span style={{ color: L.faint }}>or</span> Build
          </Title>
        </Appear>
        <Appear at={beats.buyBuild + 0.4} y={30}>
          <div style={{ position: "relative", width: 520, height: 250 }}>
            {[
              { icon: Building2Icon, label: "Big companies", v: 1 - solo, x: -1 },
              { icon: UserIcon, label: "One person with an agent", v: solo, x: 1 },
            ].map(({ icon: Icon, label, v, x }) => (
              <div key={label} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, whiteSpace: "nowrap", opacity: v, transform: `translateX(${(1 - v) * 60 * x}px)`, filter: v < 0.99 ? `blur(${(1 - v) * 6}px)` : undefined }}>
                <div style={{ position: "relative", width: 156, height: 156, borderRadius: 44, display: "grid", placeItems: "center", background: x > 0 ? "linear-gradient(135deg, #ffe7dc, #fff5ee)" : "#fff", boxShadow: x > 0 ? undefined : `0 0 0 1px ${L.line}` }}>
                  <Icon style={{ width: 66, height: 66, color: x > 0 ? L.accent : L.ink, strokeWidth: 1.5 }} />
                  {x > 0 ? <SparklesIcon style={{ position: "absolute", right: 22, top: 20, width: 30, height: 30, color: "#ec1480", strokeWidth: 1.6 }} /> : null}
                </div>
                <div style={{ fontSize: 40, letterSpacing: "0.02em", color: L.ink2 }}>{label}</div>
              </div>
            ))}
          </div>
        </Appear>
      </div>
    </Scene>
  );
}

function Features(): React.ReactElement {
  const t = useT();
  const used = new Map([
    [23, "#9b3dff"],
    [58, "#ec1480"],
    [81, "#ff5a1f"],
  ]);
  const pick = prog(t, say(19, "to use", -0.1), 0.9);
  return (
    <Scene from={beats.features} to={beats.clone}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 130 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 52px)", gap: 12 }}>
          {Array.from({ length: 100 }, (_, i) => {
            const r = Math.floor(i / 10);
            const c = i % 10;
            const a = prog(t, beats.features + 0.05 + (r + c) * 0.025, 0.6);
            const on = used.get(i);
            return <div key={i} style={{ width: 52, height: 52, borderRadius: 14, opacity: a * (on ? 1 : 1 - pick * 0.55), transform: `scale(${(0.8 + 0.2 * a) * (on ? 1 + 0.08 * pick : 1)})`, background: on && pick > 0 ? `color-mix(in srgb, ${on} ${Math.round(pick * 100)}%, #ececf0)` : "#ececf0", boxShadow: on && pick > 0 ? `0 8px 24px color-mix(in srgb, ${on} ${Math.round(pick * 30)}%, transparent)` : undefined }} />;
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 30, width: 540 }}>
          <Appear at={beats.features + 0.3} x={-30} y={0}>
            <Title size={96} style={{ textAlign: "left" }}>100 features</Title>
          </Appear>
          <Appear at={say(19, "to use", -0.1)} x={-30} y={0}>
            <Title size={96} style={{ textAlign: "left" }}>
              <GradText gradient={GRAD}>3 used</GradText>
            </Title>
          </Appear>
        </div>
      </div>
    </Scene>
  );
}

function Clone(): React.ReactElement {
  const t = useT();
  const cloning = prog(t, say(20, "clone", -0.1), 0.5, "inOut");
  const copy = prog(t, say(21, "copies", -0.1), 1.4, "inOut");
  const w = 860 * 0.62;
  const h = 540 * 0.62;
  return (
    <Scene from={beats.clone} to={beats.iceberg}>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 34 }}>
        <Appear at={beats.clone + 0.05}>
          <Title size={112} color={cloning > 0.5 ? L.faint : L.ink} style={{ position: "relative" }}>
            Build
            <div style={{ position: "absolute", left: -6, right: -6, top: "54%", height: 6, borderRadius: 3, background: L.accent, transform: `scaleX(${cloning})`, transformOrigin: "left" }} />
          </Title>
        </Appear>
        <Appear at={say(20, "clone", -0.1)} x={-30} y={0}>
          <Title size={112} color={L.accent}>Clone</Title>
        </Appear>
      </div>
      <Appear at={beats.clone + 0.45} y={40} style={{ position: "absolute", left: 0, right: 0, top: 440, display: "flex", justifyContent: "center", gap: 56, alignItems: "center" }}>
        <div style={{ position: "relative", width: w, height: h }}>
          <SaasApp style={{ transform: "scale(0.62)", transformOrigin: "0 0" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Chip>
            <KeyRoundIcon style={{ width: 18, height: 18, color: L.amber }} /> Login
          </Chip>
          <div style={{ width: 150, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${L.accent} ${copy * 100}%, #e8e8ed ${copy * 100}%)` }} />
          <Appear at={say(21, "afternoon", -0.15)} y={8} style={{ width: 240, height: 20 }}>
            <Note style={{ textAlign: "center" }}>One afternoon</Note>
          </Appear>
        </div>
        <div style={{ position: "relative", width: w, height: h }}>
          {/* the clone is a drawing until the agent fills it in */}
          <div style={{ position: "absolute", inset: -12, borderRadius: 22, border: "1.5px dashed rgb(232 97 74 / 45%)", opacity: 1 - copy }} />
          <SaasApp wire={copy} style={{ transform: "scale(0.62)", transformOrigin: "0 0", opacity: 0.35 + 0.65 * copy }} />
        </div>
      </Appear>
    </Scene>
  );
}

function Outcome({ who, what, at }: { who: string; what: string; at: number }): React.ReactElement {
  return (
    <Appear at={at} y={20} style={{ width: 360, padding: "28px 34px", borderRadius: 26, background: "#fff", boxShadow: `0 0 0 1px ${L.line}, 0 30px 70px rgb(0 0 0 / 6%)`, fontSize: 36, lineHeight: 1.2, letterSpacing: "0.02em", color: L.ink }}>
      {who}
      <div style={{ color: L.faint }}>{what}</div>
    </Appear>
  );
}

function Iceberg(): React.ReactElement {
  const t = useT();
  const s = beats.iceberg;
  const lost = prog(t, cue(23, 0.1), 1.2, "inOut");
  const mass = say(21, "years", -0.15);
  const bob = Math.sin(t * 1.1) * 4;
  const water = prog(t, s + 0.05, 0.9);
  return (
    <Scene from={s} to={beats.wants}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef0fb" />
            <stop offset="0.6" stopColor="#f8f4fb" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g opacity={water}>
          <rect x={0} y={410} width={1920} height={670} fill="url(#water)" />
        </g>
        <g transform={`translate(0 ${bob})`}>
          {/* the tip: the screens a clone copies */}
          <path d="M870 410 L940 305 L985 335 L1020 285 L1080 410 Z" fill="#ffffff" stroke={L.ink} strokeWidth={2.5} strokeLinejoin="round" opacity={prog(t, s + 0.1, 0.7)} />
          {/* the mass under the water: the years of decisions the builder made */}
          <path d="M870 410 L1080 410 L1250 530 L1310 710 L1210 890 L970 970 L710 890 L610 700 L690 510 Z" fill={`rgb(232 97 74 / ${(7 * (1 - lost)).toFixed(1)}%)`} stroke={L.accent} strokeOpacity={1 - lost * 0.7} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray={lost > 0 ? `${12 * lost} ${10 * lost}` : undefined} opacity={prog(t, mass, 1.0)} />
        </g>
      </svg>
      {/* the waterline as a drawn guide, with its ticks */}
      <div style={{ position: "absolute", left: 0, top: 410, width: 1920, height: 1, background: "linear-gradient(to right, transparent, rgb(0 0 0 / 18%) 15%, rgb(0 0 0 / 18%) 85%, transparent)", transform: `scaleX(${water})` }} />
      <Ticks x={180} y={410} len={1560} n={53} k={prog(t, s + 0.2, 1.2, "inOut")} />
      <Cross x={180} y={410} k={prog(t, s + 0.5, 0.7)} />
      <Cross x={1740} y={410} k={prog(t, s + 0.55, 0.7)} />
      <div style={{ position: "absolute", left: 0, top: bob }}>
        <Callout x={1026} y={300} len={110} k={prog(t, s + 0.3, 0.8)} color={L.muted}>
          The screens
        </Callout>
      </div>
      <Appear at={mass + 0.2} y={14} style={{ position: "absolute", left: 0, right: 0, top: 640 + bob, textAlign: "center", opacity: 1 - lost * 0.8 }}>
        <span style={{ fontSize: 52, letterSpacing: "0.02em", color: L.ink }}>Years of decisions</span>
      </Appear>
      <div style={{ position: "absolute", left: 170, top: 600 }}>
        <Outcome who="The builder" what="loses the business" at={say(23, "builder", -0.15)} />
      </div>
      <div style={{ position: "absolute", right: 170, top: 600 }}>
        <Outcome who="The user" what="gets a worse copy" at={say(23, "user", -0.15)} />
      </div>
    </Scene>
  );
}

function Wants(): React.ReactElement {
  const t = useT();
  const s = beats.wants;
  const word = (title: React.ReactNode, below: React.ReactNode) => (
    <div style={{ ...center, gap: 34 }}>
      <Title size={160}>{title}</Title>
      {below}
    </div>
  );
  // the page scrolls up and away as the dark card rises over it
  return (
    <Scene from={s} to={scrolls.reveal + SCROLL} fadeOut={0.01} shift={pageShift(t)}>
      <div style={{ position: "absolute", inset: 0, top: 60 }}>
        <Swap
          items={[
            { at: say(25, "own", -0.3), node: word("Their own code", <Sub size={40}>In their repo, on their servers</Sub>) },
            { at: say(26, "use", -0.25), node: word("Their own AI", <Muse product="Spark" size={40} byMeta />) },
            { at: say(27, "shaped", -0.3), node: word("Their own way", <Sub size={40}>Shaped to how they work</Sub>) },
          ]}
        />
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
