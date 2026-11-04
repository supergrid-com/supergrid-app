# SuperGrid Launch Film

## Angle

SaaS was four things bundled together. AI made three of them nearly free; the fourth, the vision, is what cloning throws away. SuperGrid lets people own the software and keep that part. The film argues it with abstract diagrams first, then proves it in the product.

## Look

After the sales page (`launch/site`): a white page with a dark card that scrolls up over it, clean type, gradient light and hints of a blueprint

- Page: white, near-black type (`#1d1d1f`), a pastel glow in the bottom corners, a faint dot grid at the edges, and a quiet frame of guides with crosshairs where they meet. The chapter is noted in mono in the top corners (01 — The shift … 07 — What changes)
- The dark card: `#1B1D24`, inset 16 px with round corners like the site's hero, a 26 px dot grid with a light wandering over it, and a slow glow that drifts like the site's CSS: violet in a corner for the reveal, all five colours at the edges behind the app, magenta for Muse as CTO, the full hero pool along the bottom for the end. It scrolls up over the white page for the reveal, away for the close and back up for the end card, like scrolling the site
- Blueprint: dashed frames, guides running out past the edges, crosshairs, ticks and small uppercase mono notes around the thing a frame is about: the old SaaS app (with callouts for the AI assistant and MCP server bolted on), the four parts' card, the iceberg's waterline, the mark's construction lines, and the app window (SuperGrid · Desktop, 1640 × 860 · Dev, Workspace, Muse Code · ACP)
- Type: Cal Sans at medium weight with a little tracking, two-tone headlines (the statement in ink, the rest in grey), Geist Mono for eyebrows, notes and code. No full stops anywhere, subtitles `text-wrap: pretty`
- Colour: coral `#E8614A` as the accent; the site's violet → magenta → orange gradient for the one word that should glow (taste, 3 used, the prompt's ring, the parts index marker); the four-colour mark (cyan, orange, magenta, violet)
- The product: the desktop app in its own dark Pitch theme, rebuilt in React from `app/src/renderer/app/shell`, about 1700 of the 1920 pixels wide and shown whole, backlit by the glow on the dark card. One continuous shot from "Here's how it works" through the merge: no camera moves and no cutaways. Pages crossfade inside it, panels slide, and one short caption above it names each step
- Motion: soft rise and unblur in, drift up and blur out, and a line always leaves before the next one arrives in the same place, so nothing double exposes. Guides draw out from their middles, crosshairs turn in
- Lists become screens: the four parts of SaaS and the three wants each get their own frame instead of filling in on one
- Muse: Meta blue (`#0064E0` → `#0082FB`) and an infinity mark, used only where Muse is: the Their Own AI card, the Connect Muse Code step, the Muse Image ad designer, the agent panel and composer in the app, the merge, the CTO card, and the hackathon pill on the end card

## Voice

- Script draft 9 (`video/script-draft-9.md`), Archie take of 2026-11-04, voice over only, no music or sound effects
- Sped up 1.25x (3:10 → 2:32); the original is `film/vo-original.mp3`
- Timed by word: whisper.cpp word times on the sped voice, lined up with the script by `film/scripts/cues.mjs` into `src/cues.json` (one cue per sentence) and `src/words.json`. Scenes start on a sentence (`cue(n)`) or on the word they show (`say(n, "phrase")`), so a new take moves the whole film. The draft 8 voice and cues are in `work/draft8/`

## Storyboard

| Time | Beat | On Screen |
|---|---|---|
| 0:00 | Hook | A SaaS app gets an Ask AI button (2025), then steps back as the Acme login is handed to a prompt that types "Rebuild this whole product" (2026) |
| 0:07 | Four things | SaaS was four things sold as one subscription: Code, Servers, Support, Vision in a hairline strip |
| 0:10 | Code, Servers, Support, Vision | One screen each, same frame: a team of engineers → an agent overnight, hard at everybody scale → nearly free at yours, a team on tickets → an agent fixes it, a founder's obsession → unchanged |
| 0:32 | Taste | "AI can't recreate taste" alone |
| 0:34 | Buy or build | Big companies give way to one person with an agent |
| 0:39 | 100 features | A 10 × 10 grid, three tiles light |
| 0:42 | Clone | Build struck out for Clone; with the login, the agent copies the screens in one afternoon |
| 0:46 | Iceberg | The screens on top, years of decisions under the water (edge cases, trade-offs, taste, lessons). The tip is all a clone gets. The builder loses the business; the user gets a worse copy and every bug |
| 0:55 | Why people clone | Their own code, their own AI (Muse Spark by Meta), their own way, one screen each |
| 1:02 | Reveal | The dark card scrolls up. The mark builds, SuperGrid, the desktop IDE for your site and the tools behind it, then a strip answering the three: your own repo, your Cloudflare, your own AI. The card scrolls away again |
| 1:11 | The app | On the plain white page, the window nearly the whole frame (60px margin), no captions. One shot: Connect Muse Code, connect Cloudflare, create Studio and its repo, the core lighting up as it's named, apps on top, install Blog, the commit lands (the whole iceberg, not the tip), the Ad Designer on Muse Image, the site's pages, Muse writing a post over MCP |
| 1:43 | Updates, in the app | Apps · Installed: Blog 1.1.0 fixes a bug for every install, your copy has 2 edited files and it conflicts. Update opens the old either-or: keep your copy or take the update, never both |
| 1:54 | Merge, in the app | Muse's way out appears in the dialog. Muse merges around the signup form it added, checks security, fixes a break, then asks; Approve, and Blog is up to date |
| 2:04 | CTO | The page scrolls on from the app: Muse Code by Meta, the CTO for every creator |
| 2:07 | Every industry | Six experts' apps, marked Cloned, then Installed, Owned, Updated, and the builder Paid |
| 2:17 | Close | SaaS isn't dead, the code moves to the user: a code chip travels from the builder to the user |
| 2:20 | End | Built by experts, Shaped by users, Powered by your AI, then the SuperGrid lockup: made possible by Muse Code, the platform for a new kind of SaaS, built for the Meta AI Developer Hackathon |

## Open for the Next Pass

- The Ad Designer and the store's other apps and builders are mocks, as agreed in beats.md
- Beat 2 (who I am) isn't in this voice over, so it isn't in the film
