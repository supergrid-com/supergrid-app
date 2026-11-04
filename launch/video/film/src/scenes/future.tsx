import * as React from "react";
import { Appear, Fill, L, Mark, Muse, Rise, Scene, Sub, Title, center, prog, useT } from "../kit";
import { Note, SCROLL, pageShift, scrollOn, scrolls } from "../look";
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
          <Title size={136}>
            The CTO <Fill text="for every creator" from={say(46, "for")} to={say(46, "creator")} />
          </Title>
        </Appear>
      </div>
    </Scene>
  );
}

export function Industries(): React.ReactElement {
  const s = beats.industries;
  const today = cue(48, -0.1);
  const steps = ["installed", "owned", "updated"].map((w) => say(49, w, -0.15));
  return (
    <Scene from={s} to={beats.close}>
      <Appear at={s + 0.05} outAt={today - 0.35} outDur={0.35} style={{ ...center }}>
        <Title size={130}>
          Every industry
          <span style={{ display: "block" }}>
            <Fill text="has its experts" from={say(47, "has")} to={say(47, "experts")} />
          </span>
        </Title>
      </Appear>
      <Appear at={today} outAt={steps[0]! - 0.45} outDur={0.35} style={{ ...center }}>
        <Title size={130}>
          Today their software
          <span style={{ display: "block" }}>
            <Fill text="gets cloned" from={say(48, "gets")} to={say(48, "cloned")} />
          </span>
        </Title>
      </Appear>
      {/* what it gets instead, a word at a time as it's said */}
      <div style={{ ...center, gap: 30 }}>
        <Title size={130}>
          <Rise words={["Installed,", "owned,", "updated"]} ats={steps} />
        </Title>
        <div style={{ height: 110 }}>
          <Appear at={say(49, "paid", -0.3)} y={20}>
            <Title size={96} color={L.rose}>
              and the expert gets paid
            </Title>
          </Appear>
        </div>
      </div>
    </Scene>
  );
}

export function Close(): React.ReactElement {
  const t = useT();
  const s = beats.close;
  // the page scrolls up and away as the end card rises over it
  return (
    <Scene from={s} to={scrolls.end + SCROLL} fadeOut={0.01} shift={pageShift(t)}>
      <Appear at={s + 0.05} y={24} style={{ ...center }}>
        <Title size={124}>
          SaaS isn't dead
          <span style={{ display: "block" }}>
            <Fill text="The code moves to the user" from={say(51, "the code", -0.05)} to={say(51, "user", -0.05)} />
          </span>
        </Title>
      </Appear>
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
      <div style={{ ...center, gap: 14, opacity: 1 - away, transform: `translateY(${-away * 30}px)` }}>
        {lines.map((l, i) => (
          <Appear key={l.text} at={l.at} y={22}>
            <Title size={108} dark>
              {i === 2 ? l.text : <span style={{ color: "rgb(255 255 255 / 78%)" }}>{l.text}</span>}
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
            <Mark size={124} color="#fff" style={{ filter: "drop-shadow(0 0 30px rgb(255 255 255 / 22%))" }} />
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
