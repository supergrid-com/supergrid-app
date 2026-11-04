import * as React from "react";
import { Img, staticFile } from "remotion";

// The pages Studio's apps put on its site, drawn like a Squarespace template: full-bleed photography,
// one big light headline with tight letter-spacing, black and white, a lot of air, small uppercase
// buttons and a thin nav. Each page is laid out at DESIGN_W wide and scaled into the app's Site
// preview, so the proportions hold whatever the preview's width.

export const DESIGN_W = 900;
const SANS = "'Helvetica Neue', ui-sans-serif, system-ui, sans-serif";
const INK = "#111";
const GREY = "#6b6b6b";
const RULE = "#e3e3e3";

export const photo = (n: number): string => staticFile(`photos/p${n}.jpg`);

/** A photo filling its box. `focus` is the object position, for where the subject sits. */
export function Photo({ n, width = "100%", height, focus = "50% 50%", style }: { n: number; width?: number | string; height: number | string; focus?: string; style?: React.CSSProperties }): React.ReactElement {
  return <Img src={photo(n)} style={{ width, height, objectFit: "cover", objectPosition: focus, display: "block", ...style }} />;
}

const upper: React.CSSProperties = { fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" };

/** The thin nav at the top of every page. */
function Nav({ active }: { active?: string }): React.ReactElement {
  return (
    <div style={{ height: 68, display: "flex", alignItems: "center", padding: "0 56px", borderBottom: `1px solid ${RULE}` }}>
      <span style={{ ...upper, fontSize: 13, letterSpacing: "0.28em", color: INK }}>Studio</span>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 32 }}>
        {["Shop", "Journal", "About", "Waitlist"].map((l) => (
          <span key={l} style={{ ...upper, color: l === active ? INK : GREY, borderBottom: l === active ? `1px solid ${INK}` : undefined, paddingBottom: 2 }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/** The small uppercase button, black or outlined. */
function SiteButton({ children, outline }: { children: React.ReactNode; outline?: boolean }): React.ReactElement {
  return <span style={{ ...upper, display: "inline-block", padding: "17px 30px", background: outline ? "transparent" : INK, color: outline ? INK : "#fff", border: `1px solid ${INK}` }}>{children}</span>;
}

function Headline({ children, size = 64 }: { children: React.ReactNode; size?: number }): React.ReactElement {
  return <div style={{ fontSize: size, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.04, color: INK }}>{children}</div>;
}

function Body({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return <p style={{ fontSize: 17, lineHeight: 1.7, color: "#3a3a3a", margin: "0 0 26px", maxWidth: 620, ...style }}>{children}</p>;
}

/** The studio journal: one post, the photo across the top. */
export function BlogPostPage(): React.ReactElement {
  return (
    <div style={{ width: DESIGN_W, background: "#fff", fontFamily: SANS, color: INK, fontWeight: 400 }}>
      <Nav active="Journal" />
      <Photo n={1} height={500} focus="50% 40%" />
      <div style={{ padding: "64px 140px 40px" }}>
        <div style={{ ...upper, color: GREY, marginBottom: 26 }}>Journal · Glaze Notes · October 1</div>
        <Headline size={68}>Forty Test Tiles for One Blue</Headline>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "30px 0 44px", fontSize: 14, color: GREY }}>
          <span style={{ width: 30, height: 30, borderRadius: 99, background: "#e9e4dc" }} />
          Maya Chen · 4 min read
        </div>
        <Body>Tide took forty tiles and three firings to land. The first versions ran off the pots entirely; the last ones break just enough over the rims. Here is every tile, in order, and what we changed each time.</Body>
        <Body>The base is a cone 6 celadon with a little more silica than the book says. What makes it Tide is the rutile, which goes in at the very end and pools dark where the clay curves.</Body>
      </div>
      <div style={{ padding: "0 56px" }}>
        <Photo n={2} height={560} focus="50% 30%" />
      </div>
      <div style={{ padding: "48px 140px 80px" }}>
        <Body>Every tile is numbered on the back. The one we kept is thirty-eight.</Body>
      </div>
    </div>
  );
}

/** The waitlist form, photo down one side. */
export function WaitlistPage(): React.ReactElement {
  const field = (label: string) => (
    <div key={label} style={{ marginBottom: 34 }}>
      <div style={{ ...upper, color: GREY, marginBottom: 14 }}>{label}</div>
      <div style={{ height: 1, background: INK }} />
    </div>
  );
  return (
    <div style={{ width: DESIGN_W, background: "#fff", fontFamily: SANS, color: INK, fontWeight: 400 }}>
      <Nav active="Waitlist" />
      <div style={{ display: "flex", minHeight: 1300 }}>
        <Photo n={3} width={420} height={1300} focus="50% 50%" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, padding: "96px 72px 80px" }}>
          <div style={{ ...upper, color: GREY, marginBottom: 28 }}>Spring Collection</div>
          <Headline size={58}>Join the Waitlist</Headline>
          <Body style={{ margin: "30px 0 56px", fontSize: 16 }}>Five glazes, eleven pieces. The waitlist gets a day's head start and free shipping on its first order.</Body>
          {["First Name", "Email"].map(field)}
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: GREY, margin: "4px 0 48px" }}>
            <span style={{ width: 16, height: 16, border: `1px solid ${INK}`, display: "inline-block" }} />
            Send me the journal too
          </div>
          <SiteButton>Join the Waitlist</SiteButton>
          <div style={{ marginTop: 72, fontSize: 13, color: GREY, lineHeight: 1.7 }}>We send one note the morning it opens, then the journal twice a month. Unsubscribe any time.</div>
        </div>
      </div>
    </div>
  );
}

/** The spring landing page: a hero, then the three pieces. */
export function LandingPage(): React.ReactElement {
  const items: [number, string, string, string][] = [
    [2, "Bone Pitcher", "$92", "50% 40%"],
    [6, "Hand Balm", "$18", "50% 50%"],
    [7, "The Spring Set", "$64", "50% 50%"],
  ];
  return (
    <div style={{ width: DESIGN_W, background: "#fff", fontFamily: SANS, color: INK, fontWeight: 400 }}>
      <Nav active="Shop" />
      <div style={{ position: "relative", height: 640 }}>
        <Photo n={4} height={640} focus="78% 50%" />
        <div style={{ position: "absolute", left: 72, top: 110, width: 460 }}>
          <div style={{ ...upper, color: GREY, marginBottom: 26 }}>Now Open · Spring 2026</div>
          <Headline size={72}>The Spring Collection</Headline>
          <div style={{ fontSize: 17, lineHeight: 1.6, color: "#3a3a3a", margin: "28px 0 40px", maxWidth: 380 }}>Five glazes, eleven pieces, every one fired twice in the studio.</div>
          <SiteButton>Shop the Collection</SiteButton>
        </div>
      </div>
      <div style={{ padding: "72px 56px 80px" }}>
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 36 }}>
          <Headline size={36}>New This Season</Headline>
          <div style={{ flex: 1 }} />
          <span style={{ ...upper, color: INK, borderBottom: `1px solid ${INK}`, paddingBottom: 3 }}>View All</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          {items.map(([n, name, price, focus]) => (
            <div key={name}>
              <Photo n={n} height={330} focus={focus} />
              <div style={{ display: "flex", marginTop: 16, fontSize: 15 }}>
                <span>{name}</span>
                <div style={{ flex: 1 }} />
                <span style={{ color: GREY }}>{price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The app's Site preview: a browser strip, then the page scaled to fit the width. */
export function SitePreview({ url, width, children, style }: { url: string; width: number; children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  const scale = width / DESIGN_W;
  return (
    <div style={{ width, height: "100%", borderRadius: 12, background: "#fff", overflow: "hidden", boxShadow: "0 0 0 1px rgb(0 0 0 / 50%), 0 20px 50px rgb(0 0 0 / 35%)", display: "flex", flexDirection: "column", ...style }}>
      <div style={{ height: 36, flexShrink: 0, background: "#f2f2f4", borderBottom: "1px solid #e4e4e8", display: "flex", alignItems: "center", gap: 7, padding: "0 12px", fontFamily: SANS }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 9, height: 9, borderRadius: 99, background: "#d6d6db" }} />
        ))}
        <div style={{ flex: 1, marginLeft: 8, height: 22, borderRadius: 6, background: "#fff", fontSize: 12, color: GREY, display: "flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap", overflow: "hidden" }}>{url}</div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: DESIGN_W, transformOrigin: "0 0", transform: `scale(${scale})` }}>{children}</div>
      </div>
    </div>
  );
}
