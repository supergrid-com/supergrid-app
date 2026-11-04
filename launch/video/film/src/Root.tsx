import { loadFont } from "@remotion/fonts";
import * as React from "react";
import { AbsoluteFill, Audio, Composition, continueRender, delayRender, staticFile } from "remotion";
import { PageBackdrop, Stage, scrolls } from "./look";
import { Reveal, Tour } from "./scenes/demo";
import { Close, Cto, End, Industries } from "./scenes/future";
import { Problem } from "./scenes/problem";
import { DURATION, FPS } from "./timeline";
import "./style.css";

// Cal Sans and Geist Mono load before any frame is taken.
const fonts = delayRender("fonts");
Promise.all([
  loadFont({ family: "Cal Sans", url: staticFile("CalSansVF.woff2"), weight: "400 700" }),
  loadFont({ family: "Geist Mono", url: staticFile("GeistMono.woff2"), weight: "100 900" }),
]).then(() => continueRender(fonts));

// The film is a page, like the site: white sections, with a dark card that scrolls up over them for the
// reveal and scrolls away again to leave the app on the plain white page; the end is white too.
function Launch(): React.ReactElement {
  return (
    <AbsoluteFill style={{ background: "#ffffff" }}>
      <PageBackdrop />
      <Problem />
      <Tour />
      <Cto />
      <Industries />
      <Close />
      <Stage rise={scrolls.reveal} leave={scrolls.app} moods={() => ({ hero: 0.42 })}>
        <Reveal />
      </Stage>
      <End />
      <Audio src={staticFile("vo.mp3")} />
    </AbsoluteFill>
  );
}

export function Root(): React.ReactElement {
  return <Composition id="Launch" component={Launch} durationInFrames={Math.ceil(DURATION * FPS)} fps={FPS} width={1920} height={1080} />;
}
