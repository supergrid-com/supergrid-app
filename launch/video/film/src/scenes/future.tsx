import { CheckIcon, CodeIcon, CoinsIcon, CopyIcon, PackageIcon, SquarePlusIcon, UserIcon } from "lucide-react";
import * as React from "react";
import { Appear, Chip, GradText, L, MONO, Mark, Muse, Scene, Sub, Title, center, prog, useT } from "../kit";
import { GRAD, Note, SCROLL, SPECTRUM, pageShift, scrollOn, scrolls } from "../look";
import { DURATION, beats, cue, say } from "../timeline";

// After the app, on the white page: Muse Code as every creator's CTO, the experts in every industry and
// the code moving to the user, then the end card, dark like the site's hero.

/** Comes up from below as the page scrolls on from the app. */
export function Cto(): React.ReactElement {
  const t = useT();
  const s = scrolls.cto;
  return (
    <Scene from={s} to={beats.industries} shift={scrollOn(t, s).in}>
      <div style={{ ...center, gap: 40 }}>
        <Appear at={s + 0.2} y={12}>
          <Muse product="Code" size={52} byMeta />
        </Appear>
        <Appear at={s + 0.35} y={24}>
          <Title size={150} rest="for every creator">
            The CTO
          </Title>
        </Appear>
      </div>
    </Scene>
  );
}

export function Industries(): React.ReactElement {
  const t = useT();
  const s = beats.industries;
  const shops = [
    { ws: "Peak Fitness", app: "Class Booking", by: "a fitness coach", from: "#3ad07a", to: "#139a52" },
    { ws: "Hale Family Law", app: "Client Intake", by: "a family lawyer", from: "#4d8dff", to: "#2549d6" },
    { ws: "Bloom Cafe", app: "Menu & Orders", by: "a chef", from: "#ffb054", to: "#f06a1a" },
    { ws: "Northside Dental", app: "Patient Forms", by: "a practice manager", from: "#b46bff", to: "#7a2bd6" },
    { ws: "Harbor Homes", app: "Listings", by: "a real estate agent", from: "#ff5c8a", to: "#d4145a" },
    { ws: "Studio Keys", app: "Lesson Planner", by: "a music teacher", from: "#2fd9ee", to: "#1593b8" },
  ];
  const cloned = say(48, "cloned", -0.25);
  const steps = [
    { label: "Installed", at: say(49, "installed", -0.1), check: true },
    { label: "Owned", at: say(49, "owned", -0.1) },
    { label: "Updated", at: say(49, "updated", -0.1) },
  ];
  const paid = say(49, "paid", -0.15);
  const chip = { fontSize: 18, padding: "6px 14px", gap: 8 };
  return (
    <Scene from={s} to={beats.close}>
      <Appear at={s + 0.1} style={{ position: "absolute", top: 128, left: 0, right: 0 }}>
        <Title size={68} rest="has its experts">
          Every industry
        </Title>
      </Appear>
      <div style={{ ...center, top: 110 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 520px)", background: "#fff", borderRadius: 32, boxShadow: `0 0 0 1px ${L.line}, 0 30px 80px rgb(0 0 0 / 5%)`, overflow: "hidden" }}>
          {shops.map((x, i) => {
            const stagger = i * 0.05;
            const copy = prog(t, cloned + stagger, 0.5) * (1 - prog(t, steps[0]!.at + stagger - 0.1, 0.35, "inOut"));
            const shown = steps[0]!.at + stagger;
            const installed = prog(t, shown, 0.6);
            const p = prog(t, paid + stagger, 0.6);
            return (
              <div key={x.ws} style={{ height: 290, borderLeft: i % 3 ? `1px solid ${L.line}` : undefined, borderTop: i >= 3 ? `1px solid ${L.line}` : undefined }}>
                <Appear at={s + 0.25 + i * 0.06} y={24} style={{ height: "100%", padding: 32, display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg, ${x.from}, ${x.to})`, color: "#fff", display: "grid", placeItems: "center", fontSize: 19 }}>{x.ws[0]}</div>
                    <span style={{ fontSize: 28, letterSpacing: "0.02em", color: L.ink, flex: 1, whiteSpace: "nowrap" }}>{x.ws}</span>
                    {p > 0 ? (
                      <Chip tone="accent" style={{ ...chip, opacity: p, transform: `scale(${0.9 + 0.1 * p})` }}>
                        <CoinsIcon style={{ width: 16, height: 16 }} /> Paid
                      </Chip>
                    ) : null}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 25, letterSpacing: "0.02em", color: L.ink }}>
                      <SquarePlusIcon style={{ width: 21, height: 21, color: x.to }} />
                      {x.app}
                    </div>
                    <div style={{ fontSize: 20, letterSpacing: "0.02em", color: L.muted }}>Built by {x.by}</div>
                  </div>
                  <div style={{ position: "relative", height: 38 }}>
                    {copy > 0 ? (
                      <Chip tone="danger" style={{ ...chip, position: "absolute", left: 0, top: 0, opacity: copy, transform: `translateY(${(1 - Math.min(1, copy * 2)) * 8}px)` }}>
                        <CopyIcon style={{ width: 16, height: 16 }} /> Cloned
                      </Chip>
                    ) : null}
                    {installed > 0 ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        {steps.map((st) => {
                          const k = prog(t, st.at + stagger, 0.5);
                          return k > 0 ? (
                            <Chip key={st.label} tone="success" style={{ ...chip, opacity: k, transform: `translateY(${(1 - k) * 8}px)` }}>
                              {st.check ? <CheckIcon style={{ width: 16, height: 16 }} /> : null}
                              {st.label}
                            </Chip>
                          ) : null;
                        })}
                      </div>
                    ) : null}
                  </div>
                </Appear>
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
}

export function Close(): React.ReactElement {
  const t = useT();
  const s = beats.close;
  const moves = say(51, "moves", -0.25);
  const go = prog(t, moves, 1.0, "inOut");
  const line = prog(t, s + 0.5, 0.9, "inOut");
  const node = (label: string, Icon: typeof CodeIcon, x: number, at: number, lit = 0) => (
    <Appear at={at} y={18} style={{ position: "absolute", left: x - 150, top: 25, width: 300, height: 100, borderRadius: 26, background: "#fff", boxShadow: lit > 0 ? `0 0 0 ${1 + lit}px rgb(232 97 74 / ${Math.round(20 + lit * 60)}%), 0 30px 70px rgb(232 97 74 / ${Math.round(lit * 10)}%)` : `0 0 0 1px ${L.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, letterSpacing: "0.02em", color: L.ink }}>
        <Icon style={{ width: 28, height: 28, strokeWidth: 1.6, color: L.ink }} />
        {label}
      </div>
    </Appear>
  );
  // the page scrolls up and away as the end card rises over it
  return (
    <Scene from={s} to={scrolls.end + SCROLL} fadeOut={0.01} shift={pageShift(t)}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <Appear at={s + 0.05} y={16}>
          <Mark size={52} />
        </Appear>
        <Appear at={s + 0.12} y={24}>
          <Title size={112} rest={<span style={{ opacity: prog(t, cue(51, -0.15), 0.6) }}><br />the code moves to the user</span>} style={{ maxWidth: 1400 }}>
            SaaS isn't dead,
          </Title>
        </Appear>
      </div>
      <div style={{ position: "absolute", left: 0, top: 700, width: 1920, height: 150 }}>
        {/* a guide from one to the other, and the code travelling along it */}
        <div style={{ position: "absolute", left: 610, width: 700, top: 75, height: 1, background: L.line, transform: `scaleX(${line})`, transformOrigin: "0 0" }} />
        <div style={{ position: "absolute", left: 610, width: 700 * go, top: 74, height: 3, borderRadius: 2, background: GRAD, opacity: go > 0 ? 1 : 0 }} />
        {node("Builder", PackageIcon, 460, s + 0.4)}
        {node("User", UserIcon, 1460, s + 0.5, prog(t, moves + 0.85, 0.5))}
        {t >= moves - 0.2 ? (
          <div style={{ position: "absolute", left: 620 + 540 * go, top: 51, width: 140, height: 48, borderRadius: 999, background: L.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: MONO, fontSize: 18, opacity: prog(t, moves - 0.2, 0.3) * (1 - prog(t, moves + 0.95, 0.3)) }}>
            <CodeIcon style={{ width: 18, height: 18 }} /> code
          </div>
        ) : null}
      </div>
    </Scene>
  );
}

/** On the end card, the site's hero. */
export function End(): React.ReactElement {
  const t = useT();
  const s = beats.end;
  const lockup = cue(53, 0.15);
  const lines = [
    { text: "Built by experts", at: s + 0.1 },
    { text: "Shaped by users", at: say(52, "shaped", -0.1) },
    { text: "Powered by your AI", at: say(52, "powered", -0.1) },
  ];
  const possible = prog(t, say(53, "muse code", -0.1), 0.8);
  const away = prog(t, lockup - 0.4, 0.5, "inOut");
  return (
    <Scene from={s} to={DURATION + 1} fadeOut={0.01} dark>
      <div style={{ ...center, gap: 14, opacity: 1 - away, transform: `translateY(${-away * 30}px)`, filter: away > 0.01 ? `blur(${away * 6}px)` : undefined }}>
        {lines.map((l, i) => (
          <Appear key={l.text} at={l.at} y={22}>
            <Title size={108} dark>
              {i === 2 ? <GradText gradient={SPECTRUM}>{l.text}</GradText> : l.text}
            </Title>
          </Appear>
        ))}
      </div>
      <div style={{ ...center, gap: 34 }}>
        <Appear at={say(53, "muse code", -0.25)} y={12}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 22px", borderRadius: 999, border: `1px solid rgb(59 140 255 / ${Math.round(18 + possible * 30)}%)`, background: "rgb(255 255 255 / 6%)", boxShadow: `0 0 ${40 * possible}px rgb(0 100 224 / ${Math.round(possible * 30)}%)`, fontSize: 24, letterSpacing: "0.02em", color: "#fff" }}>
            <span style={{ color: "rgb(255 255 255 / 70%)" }}>Made possible by</span>
            <Muse product="Code" size={24} dark />
          </div>
        </Appear>
        <Appear at={lockup} y={20} scale={0.94}>
          <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
            <Mark size={124} style={{ filter: "drop-shadow(0 0 30px rgb(155 61 255 / 35%))" }} />
            <Title size={150} dark style={{ textShadow: "0 0 60px rgb(255 255 255 / 22%)" }}>
              SuperGrid
            </Title>
          </div>
        </Appear>
        <Appear at={say(53, "platform", -0.25)} y={14}>
          <Sub size={42} dark>
            The platform for a new kind of SaaS
          </Sub>
        </Appear>
      </div>
      <Appear at={lockup + 0.8} y={8} style={{ position: "absolute", left: 0, right: 0, bottom: 96 }}>
        <Note dark style={{ textAlign: "center" }}>Built for the Meta AI Developer Hackathon</Note>
      </Appear>
    </Scene>
  );
}
