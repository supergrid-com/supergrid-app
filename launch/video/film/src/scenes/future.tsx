import { BadgeCheckIcon, CoinsIcon, CopyIcon, DownloadIcon, KeyRoundIcon, RefreshCwIcon, SlidersHorizontalIcon } from "lucide-react";
import * as React from "react";
import { Img, staticFile } from "remotion";
import { Appear, Fill, L, Mark, Muse, MuseGlyph, Rise, Scene, Sub, Title, center, prog, useT } from "../kit";
import { Note, SCROLL, pageShift, scrollOn, scrolls } from "../look";
import { DURATION, beats, cue, say } from "../timeline";

// After the app, on the white page: Muse Code as every creator's CTO, the experts in every industry and
// the code moving to the user, then the end, white like the rest of the page.

/** Comes up from below as the page scrolls on from the app. */
export function Cto(): React.ReactElement {
  const t = useT();
  const s = scrolls.cto;
  return (
    <Scene from={s} to={beats.industries} shift={scrollOn(t, s).in}>
      <div style={{ ...center, gap: 40 }}>
        <Appear at={s + 0.2} y={12}>
          <Muse product="Code" size={56} byMeta />
        </Appear>
        <Appear at={s + 0.35} y={24}>
          <Title size={136}>
            The CTO <Fill text="for every creator" from={say(46, "for", -0.3)} to={say(46, "creator", -0.3)} />
          </Title>
        </Appear>
      </div>
    </Scene>
  );
}

/** Sites built by people who know one problem better than anyone, each a small Squarespace-like page:
 *  copied off in grey, then installed, owned, updated, and paid for. Every word lands on all four. */
const EXPERTS = [
  { site: "Peak Studio", line: "Move better", cta: "Book a class", app: "Class Booking", by: "a fitness coach", photo: "x1", tint: "124 92 255" },
  { site: "Hale Law", line: "Counsel for families", cta: "Start intake", app: "Client Intake", by: "a family lawyer", photo: "x2", tint: "38 140 210" },
  { site: "Ember", line: "Seasonal plates", cta: "Order now", app: "Menu & Orders", by: "a chef", photo: "x3", tint: "236 96 60" },
  { site: "Harbor Homes", line: "Find your place", cta: "View listings", app: "Listings", by: "a real estate agent", photo: "x5", tint: "236 20 128" },
];
const LIGHT = "'Helvetica Neue', ui-sans-serif, system-ui, sans-serif";

/** One expert's page: photo, a light headline, a small uppercase button. */
function SitePage({ x, W, H }: { x: (typeof EXPERTS)[number]; W: number; H: number }): React.ReactElement {
  return (
    <div style={{ position: "absolute", inset: 0, width: W, height: H }}>
      <Img src={staticFile(`photos/${x.photo}.jpg`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.8) contrast(0.88) brightness(1.06)" }} />
      {/* a soft wash in each site's own colour, a little deeper at the foot so the type reads */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, rgb(${x.tint} / 38%), rgb(${x.tint} / 22%) 45%, rgb(${x.tint} / 58%))` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgb(0 0 0 / 12%), transparent 30%, transparent 55%, rgb(0 0 0 / 22%))" }} />
      <div style={{ position: "absolute", left: 20, right: 20, top: 16, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: LIGHT, color: "#fff" }}>
        <span style={{ fontSize: 16, letterSpacing: "0.14em", textTransform: "uppercase" }}>{x.site}</span>
        <span style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((k) => (
            <span key={k} style={{ width: 15, height: 2, background: "rgb(255 255 255 / 80%)" }} />
          ))}
        </span>
      </div>
      <div style={{ position: "absolute", left: 22, right: 22, bottom: 24, fontFamily: LIGHT, color: "#fff" }}>
        <div style={{ fontSize: 40, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{x.line}</div>
        <div style={{ display: "inline-block", marginTop: 14, padding: "8px 16px", background: "#fff", color: "#111", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" }}>{x.cta}</div>
      </div>
    </div>
  );
}

export function Industries(): React.ReactElement {
  const t = useT();
  const s = beats.industries;
  const today = cue(48, -0.1);
  const cloned = say(48, "cloned", -0.35);
  const steps = ["installed", "owned", "updated"].map((w) => say(49, w, -0.15));
  const paid = say(49, "paid", -0.25);
  const W = 370, H = 330, GAP = 34;
  const head = { position: "absolute", left: 0, right: 0, top: 140, height: 260, display: "flex", alignItems: "center", justifyContent: "center" } as const;
  return (
    <Scene from={s} to={beats.close}>
      <Appear at={s + 0.02} outAt={today - 0.3} outDur={0.3} style={head}>
        <Title size={110}>
          Every industry
          <span style={{ display: "block" }}>
            <Fill text="has its experts" from={say(47, "has", -0.15)} to={say(47, "experts", -0.15)} />
          </span>
        </Title>
      </Appear>
      <Appear at={today} outAt={steps[0]! - 0.4} outDur={0.3} style={head}>
        <Title size={110}>
          Today their software
          <span style={{ display: "block" }}>
            <Fill text="gets cloned" from={say(48, "gets", -0.2)} to={say(48, "cloned", -0.2)} />
          </span>
        </Title>
      </Appear>
      <div style={head}>
        <Title size={110}>
          <Rise words={["Installed,", "owned,", "updated"]} ats={steps} />
          <span style={{ display: "block" }}>
            <Fill text="and the expert gets paid" from={paid - 0.1} to={paid + 0.25} />
          </span>
        </Title>
      </div>
      <div style={{ position: "absolute", left: (1920 - (4 * W + 3 * GAP)) / 2, top: 450, display: "flex", gap: GAP }}>
        {EXPERTS.map((x, i) => {
          const a = cloned + i * 0.08;
          // the copy: a grey duplicate pulled off the page while a scan runs down it
          const pull = prog(t, a, 0.5, "inOut") * (1 - prog(t, steps[0]! - 0.35, 0.35, "inOut"));
          const scan = prog(t, a - 0.05, 0.5, "inOut");
          const scanning = t > a - 0.05 && t < a + 0.5;
          // paid: a pill that pops past full size and settles, with coins bursting off it
          const p = prog(t, paid + i * 0.07, 0.5);
          const pop = p > 0 ? p + 0.22 * Math.sin(Math.PI * p) : 0;
          const burst = prog(t, paid + i * 0.07 + 0.05, 0.8);
          return (
            <div key={x.app} style={{ width: W, height: 470 }}>
              <Appear at={s + 0.25 + i * 0.08} y={30} style={{ position: "relative", width: W, height: 470 }}>
                {pull > 0 ? (
                  <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, borderRadius: 20, overflow: "hidden", opacity: 0.9 * pull, transform: `translate(${pull * 22}px, ${pull * 22}px) rotate(${pull * 2.5}deg)`, filter: "grayscale(1) contrast(0.8) brightness(1.15)", boxShadow: `0 0 0 2.5px ${L.rose}` }}>
                    <SitePage x={x} W={W} H={H} />
                    <div style={{ position: "absolute", inset: 0, background: "rgb(255 255 255 / 30%)" }} />
                  </div>
                ) : null}
                <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, borderRadius: 20, overflow: "hidden", background: "#fff", boxShadow: `0 0 0 1px ${L.line}, 0 24px 60px rgb(0 0 0 / 12%)` }}>
                  <SitePage x={x} W={W} H={H} />
                  {scanning ? <div style={{ position: "absolute", left: 0, right: 0, top: scan * H - 3, height: 6, background: L.rose, boxShadow: `0 0 24px 6px rgb(243 56 105 / 55%)` }} /> : null}
                  {pull > 0 ? (
                    <div style={{ position: "absolute", left: 16, top: 50, height: 38, padding: "0 15px", borderRadius: 99, background: L.rose, color: "#fff", display: "flex", alignItems: "center", gap: 8, fontSize: 19, opacity: pull }}>
                      <CopyIcon style={{ width: 17, height: 17 }} /> Cloned
                    </div>
                  ) : null}
                </div>
                {/* paid, with a little burst of coins */}
                {p > 0 ? (
                  <div style={{ position: "absolute", right: 16, top: 50 }}>
                    {Array.from({ length: 6 }, (_, j) => {
                      const ang = -Math.PI / 2 + (j - 2.5) * 0.42;
                      const d = 95 * burst;
                      return <div key={j} style={{ position: "absolute", right: 40 - Math.cos(ang) * d, top: 10 + Math.sin(ang) * d, width: 24, height: 24, borderRadius: 99, background: "#ffc53d", boxShadow: "inset 0 0 0 2.5px #f5a300", opacity: burst > 0 && burst < 1 ? 1 - burst : 0 }} />;
                    })}
                    <div style={{ height: 44, padding: "0 18px", borderRadius: 99, background: L.rose, color: "#fff", display: "flex", alignItems: "center", gap: 8, fontSize: 22, whiteSpace: "nowrap", transform: `scale(${pop})`, transformOrigin: "100% 50%", boxShadow: "0 10px 26px rgb(243 56 105 / 40%)" }}>
                      <CoinsIcon style={{ width: 19, height: 19 }} /> Paid
                    </div>
                  </div>
                ) : null}
                {/* who built it, and what it now gets */}
                <div style={{ position: "absolute", left: 4, right: 4, top: H + 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 28, letterSpacing: "0.02em", color: L.ink, whiteSpace: "nowrap" }}>{x.app}</div>
                    <div style={{ marginTop: 2, fontSize: 20, color: L.muted, whiteSpace: "nowrap" }}>by {x.by}</div>
                  </div>
                  <div style={{ display: "flex", gap: 7, paddingTop: 4 }}>
                    {[DownloadIcon, KeyRoundIcon, RefreshCwIcon].map((Icon, j) => {
                      const k = prog(t, steps[j]! + i * 0.04, 0.3);
                      return k > 0 ? (
                        <span key={j} style={{ width: 34, height: 34, borderRadius: 99, background: L.ink, display: "grid", placeItems: "center", opacity: k, transform: `translateY(${(1 - k) * 8}px)` }}>
                          <Icon style={{ width: 17, height: 17, color: "#fff" }} />
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </Appear>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}

export function Close(): React.ReactElement {
  const t = useT();
  const s = beats.close;
  // the page scrolls up and away as the end page comes up behind it
  return (
    <Scene from={s} to={scrolls.end + SCROLL} fadeOut={0.01} shift={pageShift(t)}>
      <Appear at={s + 0.05} y={24} style={{ ...center }}>
        <Title size={124}>
          SaaS isn't dead
          <span style={{ display: "block" }}>
            <Fill text="The code moves" from={say(51, "the code", -0.15)} to={say(51, "moves", -0.15)} />
          </span>
          <span style={{ display: "block" }}>
            <Fill text="to the user" from={say(51, "to the", -0.15)} to={say(51, "user", -0.15)} />
          </span>
        </Title>
      </Appear>
    </Scene>
  );
}

/** The end, on the white page: the three things the products are, in a row like the three reasons people
 *  clone; they step down for the lockup, then give way to the one that makes it possible, Muse Code. */
export function End(): React.ReactElement {
  const t = useT();
  const s = scrolls.end;
  const lockup = cue(53, 0.15);
  const make = prog(t, lockup - 0.3, 0.9, "inOut");
  const hero = say(53, "muse code", -0.45);
  // the row leaves first, then Muse Code rises into its place: never both at once
  const away = prog(t, hero, 0.4, "inOut");
  const muse = prog(t, hero + 0.3, 0.7, "inOut");
  const glow = prog(t, hero + 0.7, 0.9);
  const cols = [
    { title: "Built by experts", icon: <BadgeCheckIcon style={{ width: 44, height: 44, color: L.ink, strokeWidth: 1.6 }} />, at: beats.end + 0.1 },
    { title: "Shaped by users", icon: <SlidersHorizontalIcon style={{ width: 44, height: 44, color: L.ink, strokeWidth: 1.6 }} />, at: say(52, "shaped", -0.15) },
    { title: "Powered by your AI", icon: <MuseGlyph size={52} />, at: say(52, "powered", -0.15) },
  ];
  return (
    <Scene from={s} to={DURATION + 1} fadeOut={0.01} shift={scrollOn(t, s).in}>
      {/* the lockup, arriving above the row */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <Appear at={lockup} y={20} scale={0.96}>
          <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
            <Mark size={116} color={L.ink} />
            <Title size={150}>SuperGrid</Title>
          </div>
        </Appear>
        <Appear at={say(53, "platform", -0.25)} y={14}>
          <Sub size={42}>The platform for a new kind of SaaS</Sub>
        </Appear>
      </div>
      {/* the three, centred, then down a step under the lockup, then down and away for Muse Code */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 400 + 230 * make + 60 * away, display: "flex", justifyContent: "center", opacity: 1 - away }}>
        {cols.map((c, i) => (
          <div key={c.title} style={{ position: "relative", width: 560, height: 280, display: "flex", justifyContent: "center" }}>
            {i ? <div style={{ position: "absolute", left: 0, top: 30, bottom: 30, width: 1.5, background: L.line, transform: `scaleY(${prog(t, c.at, 0.5, "inOut")})` }} /> : null}
            <Appear at={c.at} y={30} style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20 }}>
              <div style={{ width: 104 - 24 * make, height: 104 - 24 * make, borderRadius: 28, background: L.soft, display: "grid", placeItems: "center", marginBottom: 30 - 10 * make }}>{c.icon}</div>
              <div style={{ fontSize: 60 - 14 * make, letterSpacing: "0.02em", color: L.ink, whiteSpace: "nowrap" }}>{c.title}</div>
            </Appear>
          </div>
        ))}
      </div>
      {/* Muse Code, the hero, rising into their place */}
      {muse > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 620 + 160 * (1 - muse), display: "flex", justifyContent: "center", opacity: muse }}>
          <div style={{ display: "flex", alignItems: "center", gap: 34, height: 160, padding: "0 60px", borderRadius: 999, background: "#fff", boxShadow: `0 0 0 1.5px rgb(0 100 224 / ${Math.round(18 + 22 * glow)}%), 0 24px 70px rgb(0 100 224 / ${Math.round(8 + 14 * glow)}%)` }}>
            <span style={{ fontSize: 40, letterSpacing: "0.02em", color: L.muted, whiteSpace: "nowrap" }}>Made possible by</span>
            <Muse product="Code" size={72} byMeta />
          </div>
        </div>
      ) : null}
      <Appear at={lockup + 0.8} y={8} style={{ position: "absolute", left: 0, right: 0, bottom: 70 }}>
        <Note size={18} style={{ textAlign: "center", color: L.faint }}>Built for the Meta AI Developer Hackathon</Note>
      </Appear>
    </Scene>
  );
}
