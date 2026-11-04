import { SparklesIcon } from "lucide-react";
import * as React from "react";
import { Appear, FONT, Fill, GradText, L, Muse, Rise, Scene, Sub, Swap, Title, center, lerp, prog, useT } from "../kit";
import { GRAD, SCROLL, pageShift, scrolls } from "../look";
import { beats, cue, say } from "../timeline";

// Beats 1–8 of launch/video/beats.md, on the plain white page: SaaS changed, its four parts (one
// screen each), buy vs. build turning into clone, the iceberg a clone misses, and the three things
// people want instead. Set like the sales page: big ink headlines whose grey second half fills in to
// rose as it's said, and a picture only where it shows something the words can't.

/** The badge every SaaS site put on its AI, when AI was what sold it. A light sweeps across once. */
function NewBadge(): React.ReactElement {
  const t = useT();
  const sheen = lerp(t, [0.8, 1.8], [-1, 1]);
  return (
    <div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 16, height: 78, padding: "0 36px 0 11px", borderRadius: 999, background: "#fff", boxShadow: `0 0 0 1px ${L.line}, 0 16px 44px rgb(155 61 255 / 14%)`, fontSize: 34, color: L.ink, letterSpacing: "0.02em" }}>
      <span style={{ height: 56, padding: "0 21px", borderRadius: 999, background: GRAD, color: "#fff", fontSize: 28, display: "grid", placeItems: "center" }}>New</span>
      <SparklesIcon style={{ width: 30, height: 30, color: "#9b3dff", strokeWidth: 1.8 }} />
      AI assistant
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 75%) 50%, transparent 70%)", transform: `translateX(${sheen * 100}%)` }} />
    </div>
  );
}

function Hook(): React.ReactElement {
  // a year ago AI was what sold the product; now it's what rebuilds it, and the business goes with it
  const now = cue(2);
  return (
    <Scene from={beats.hook} to={beats.fourParts}>
      <Appear at={-1} outAt={now - 0.32} outDur={0.32} y={0} style={{ ...center, gap: 60 }}>
        <div style={{ height: 78 }}>
          <Appear at={0.05} y={0} scale={0.88} dur={0.7}>
            <NewBadge />
          </Appear>
        </div>
        <Title size={150} style={{ maxWidth: 1400 }}>
          <Rise at={0.3} words={["AI", "was", "the", <GradText gradient={GRAD}>selling point</GradText>]} />
        </Title>
      </Appear>
      <div style={{ ...center, gap: 48 }}>
        <Title size={150} style={{ maxWidth: 1500 }}>
          <Rise at={now + 0.02} words={["Now", "AI", "is", "rebuilding", "the", "product"]} />
        </Title>
        <div style={{ height: 96 }}>
          <Appear at={say(2, "login", -0.15)} y={20}>
            <Sub size={72} style={{ color: L.rose }}>and taking the business with it</Sub>
          </Appear>
        </div>
      </div>
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
          it takes now; on the right one plain picture of the same change */}
      <Appear at={first - 0.05} outAt={taste - 0.35} y={0} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: 180, top: 0, bottom: 0, width: 720 }}>
          {parts.map((p, i) => {
            const next = parts[i + 1]?.at;
            return (
              <Appear key={p.key} at={p.at} outAt={next === undefined ? undefined : next - 0.35} y={30} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Title size={170} style={{ textAlign: "left" }}>{p.label}</Title>
                <div style={{ marginTop: 44, height: 80, display: "flex", alignItems: "center" }}>
                  <Appear at={p.at + 0.35} y={16}>
                    <Struck at={p.flipAt} size={60} kept={p.kept}>
                      {p.before}
                    </Struck>
                  </Appear>
                </div>
                <div style={{ height: 80, display: "flex", alignItems: "center" }}>
                  <Appear at={p.flipAt + 0.2} y={16} style={{ fontSize: 60, letterSpacing: "0.02em", color: L.rose, whiteSpace: "nowrap" }}>
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
          AI can't recreate <GradText gradient={GRAD}>taste</GradText>
        </Title>
      </Appear>
    </Scene>
  );
}

/** The right-hand card for each part: one plain picture of the before and after, and nothing else. */
function PartPicture({ part }: { part: Part }): React.ReactElement | null {
  const t = useT();
  const { at, flipAt } = part;
  const flip = prog(t, flipAt, 0.6, "inOut");
  const label = (text: string, color: string = L.muted) => <div style={{ fontSize: 30, letterSpacing: "0.02em", color, whiteSpace: "nowrap" }}>{text}</div>;
  if (part.key === "code") {
    // a file written a line at a time by hand, then the agent writes the rest at once
    const widths = [62, 78, 54, 86, 70, 44, 80, 58, 66];
    const n = t < flipAt ? Math.min(3, Math.max(0, (t - at - 0.2) * 1.3)) : 3 + (t - flipAt) * 14;
    return (
      <div style={{ position: "absolute", inset: 0, padding: "70px 64px", display: "flex", flexDirection: "column", gap: 26 }}>
        {widths.map((w, i) => {
          const k = Math.max(0, Math.min(1, n - i));
          return <div key={i} style={{ height: 24, width: `${w * k}%`, borderRadius: 12, background: i < 3 ? "#dcdce1" : L.rose, opacity: i < 3 ? 1 : 0.85 }} />;
        })}
      </div>
    );
  }
  if (part.key === "servers") {
    // what running it costs: everybody's scale, then yours beside it
    const you = say(9, "you scale", -0.1);
    const grow = prog(t, at + 0.3, 0.9);
    const yours = prog(t, you, 0.7);
    return (
      <div style={{ position: "absolute", inset: 0, padding: "70px 110px 56px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        {[
          { name: "Everybody", h: 400 * grow, bg: "#dcdce1", k: grow },
          { name: "You", h: 400 * (1 - 0.92 * flip), bg: `color-mix(in srgb, ${L.rose} ${Math.round(flip * 100)}%, #dcdce1)`, k: yours },
        ].map((b) => (
          <div key={b.name} style={{ width: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, opacity: b.k }}>
            <div style={{ width: "100%", height: b.h, borderRadius: 20, background: b.bg }} />
            {label(b.name, b.name === "You" ? L.ink : L.muted)}
          </div>
        ))}
      </div>
    );
  }
  if (part.key === "support") {
    // the queue: open tickets, each one fixed in turn
    const tickets = ["Export is broken", "Can't reset my password", "Charged twice"];
    return (
      <div style={{ position: "absolute", inset: 0, padding: "0 56px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
        {tickets.map((x, i) => {
          const done = prog(t, flipAt + 0.3 + i * 0.35, 0.4, "inOut");
          return (
            <Appear key={x} at={at + 0.3 + i * 0.15} y={16} style={{ height: 104, borderRadius: 22, background: L.softer, boxShadow: `0 0 0 1.5px ${L.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px" }}>
              <span style={{ fontSize: 32, letterSpacing: "0.02em", color: L.ink }}>{x}</span>
              <span style={{ fontSize: 26, letterSpacing: "0.02em", padding: "8px 18px", borderRadius: 99, background: done > 0.5 ? "rgb(243 56 105 / 10%)" : "#ececf0", color: done > 0.5 ? L.rose : L.muted }}>{done > 0.5 ? "Fixed" : "Open"}</span>
            </Appear>
          );
        })}
      </div>
    );
  }
  // vision: one problem, looked at until it's understood
  const close = prog(t, at + 0.3, 2.4, "inOut");
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      {[3, 2, 1].map((r) => (
        <div key={r} style={{ position: "absolute", width: (120 + r * 130) * (1.25 - 0.25 * close), height: (120 + r * 130) * (1.25 - 0.25 * close), borderRadius: 999, border: `2px solid rgb(0 0 0 / ${10 + (3 - r) * 5}%)` }} />
      ))}
      <div style={{ width: 44, height: 44, borderRadius: 99, background: L.rose, transform: `scale(${0.6 + 0.4 * close})` }} />
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

function Iceberg(): React.ReactElement {
  const t = useT();
  const s = beats.iceberg;
  const mass = say(21, "years", -0.15);
  const out = cue(23, -0.4);
  const line = prog(t, s + 0.05, 0.9, "inOut");
  const builder = say(23, "builder", -0.25);
  const user = say(23, "user", -0.25);
  return (
    <Scene from={s} to={beats.wants}>
      {/* the tip a clone copies, and the mass under the water it misses */}
      <Appear at={-1} outAt={out} outDur={0.4} y={0} style={{ position: "absolute", inset: 0 }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="mass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={L.rose} stopOpacity="0.07" />
              <stop offset="1" stopColor={L.rose} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <path d="M870 400 L940 295 L985 325 L1020 275 L1080 400 Z" fill="#fff" stroke={L.ink} strokeWidth={2.5} strokeLinejoin="round" opacity={prog(t, s + 0.15, 0.7)} />
          <path d="M870 400 L1080 400 L1215 455 L1300 560 L1335 690 L1270 800 L1130 885 L955 930 L800 890 L660 800 L585 670 L620 540 L735 455 Z" fill="url(#mass)" stroke={L.rose} strokeOpacity={0.5} strokeWidth={2} strokeLinejoin="round" opacity={prog(t, mass, 1.0)} />
        </svg>
        <div style={{ position: "absolute", left: 120, right: 120, top: 400, height: 1.5, background: "rgb(0 0 0 / 14%)", transform: `scaleX(${line})` }} />
        <Appear at={s + 0.35} x={-16} y={0} style={{ position: "absolute", left: 1120, top: 300, fontSize: 40, letterSpacing: "0.02em", color: L.faint }}>
          The screens
        </Appear>
        <Appear at={mass + 0.2} y={14} style={{ position: "absolute", left: 0, right: 0, top: 625, textAlign: "center", fontSize: 60, letterSpacing: "0.02em", color: L.ink }}>
          Years of decisions
        </Appear>
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
  const word = (title: React.ReactNode, below: React.ReactNode) => (
    <div style={{ ...center, gap: 36 }}>
      <Title size={160}>{title}</Title>
      {below}
    </div>
  );
  // the page scrolls up and away as the dark card rises over it
  return (
    <Scene from={s} to={scrolls.reveal + SCROLL} fadeOut={0.01} shift={pageShift(t)}>
      <Swap
        items={[
          {
            at: s + 0.05,
            node: (
              <div style={{ ...center }}>
                <Title size={130}>
                  People clone
                  <span style={{ display: "block" }}>
                    <Fill text="for three reasons" from={say(24, "for")} to={say(24, "reasons")} />
                  </span>
                </Title>
              </div>
            ),
          },
          { at: say(25, "own", -0.3), node: word("Their own code", <Sub size={48}>In their repo, on their servers</Sub>) },
          { at: say(26, "use", -0.25), node: word("Their own AI", <Muse product="Spark" size={46} byMeta />) },
          { at: say(27, "shaped", -0.3), node: word("Their own way", <Sub size={48}>Shaped to how they work</Sub>) },
        ]}
      />
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
