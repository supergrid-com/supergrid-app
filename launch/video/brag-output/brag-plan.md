# SuperGrid Launch Film

## Angle

SaaS was four things bundled together. AI made three of them nearly free; the fourth, the vision, is what cloning throws away. SuperGrid lets people own the software and keep that part. The film argues it with abstract diagrams first, then proves it in the product.

## Look

After the live sales page (supergrid.com), simple and strong: plain white page, big type, a picture only where it shows something the words can't

- Page: plain white, no glow, dots, guides or notes. The dark card (`#1B1D24`, inset 16, the site's hero) is only for the SuperGrid reveal and the end card
- Type: Cal Sans 500 with a little tracking, near-black ink (`#1d1d1f`). Headlines are two-tone like the site: the statement in ink, the second half in grey that fills in to rose (`#f33869`) word by word as the voice says it (the site runs the same fill on scroll). No full stops anywhere
- Colour: rose for the second half of a line and for what replaced something; the site's violet → magenta → orange gradient for the one word that should glow (selling point, taste)
- Motion only where it shows something: what it took struck out in rose for what it takes now (Code, Servers, Support, and Build for Clone), Vision the one line left standing, 3 of 100 squares lighting up, the iceberg's tip and the mass under it
- The product: the desktop app in its own dark Pitch theme on the white page, about 1800 px wide, one continuous shot with no captions
- Muse: Meta blue and the infinity mark, only where Muse is

## Voice

- Script draft 9 (`video/script-draft-9.md`), Archie take of 2026-11-04, voice over only, no music or sound effects
- Sped up 1.25x (3:10 → 2:32); the original is `film/vo-original.mp3`
- Timed by word: whisper.cpp word times on the sped voice, lined up with the script by `film/scripts/cues.mjs` into `src/cues.json` (one cue per sentence) and `src/words.json`. Scenes start on a sentence (`cue(n)`) or on the word they show (`say(n, "phrase")`), so a new take moves the whole film. The draft 8 voice and cues are in `work/draft8/`

## Storyboard

| Time | Beat | On Screen |
|---|---|---|
| 0:00 | Hook | Text only. A "New · AI assistant" launch badge with a light sweeping across it over "AI was the selling point" (in the gradient), then "Now AI is rebuilding the product", with "and taking the business with it" in rose |
| 0:07 | Four things | SaaS was four things, sold as one subscription filling in to rose, over one hairline pill holding Code, Servers, Support, Vision |
| 0:10 | Code, Servers, Support, Vision | One screen each: the word, what it took, then struck through in rose for what it takes now (an agent, overnight; nearly free at yours; an agent fixes the bug). Vision's line stays standing, with Unchanged under it |
| 0:32 | Taste | "AI can't recreate taste" alone |
| 0:34 | Buy or build | Buy or Build, for big companies, then for one person with an agent |
| 0:39 | 100 features | 100 features to use 3, over a 10 × 10 grid where three squares light rose |
| 0:42 | Clone | Build struck out as Clone opens up beside it, then the screens, in an afternoon |
| 0:46 | Iceberg | The screens on the tip, years of decisions under the waterline, then the builder loses the business, the user gets a worse copy |
| 0:55 | Why people clone | People clone for three reasons, then their own code, their own AI (Muse Spark by Meta), their own way, one screen each |
| 1:02 | Reveal | The dark card scrolls up. The mark builds, SuperGrid, the desktop IDE for your site and the tools behind it, then a strip answering the three: your own repo, your Cloudflare, your own AI. The card scrolls away again |
| 1:11 | The app | On the plain white page, the window nearly the whole frame (60px margin), no captions. One shot: Connect Muse Code, connect Cloudflare, create Studio and its repo, the core lighting up as it's named, apps on top, install Blog, the commit lands (the whole iceberg, not the tip), the Ad Designer on Muse Image, the site's pages, Muse writing a post over MCP |
| 1:43 | Updates, in the app | Apps · Installed: Blog 1.1.0 fixes a bug for every install, your copy has 2 edited files and it conflicts. Update opens the old either-or: keep your copy or take the update, never both |
| 1:54 | Merge, in the app | Muse's way out appears in the dialog. Muse merges around the signup form it added, checks security, fixes a break, then asks; Approve, and Blog is up to date |
| 2:04 | CTO | The page scrolls on from the app: Muse Code by Meta, the CTO for every creator |
| 2:07 | Every industry | Every industry has its experts, today their software gets cloned, then installed, owned, updated a word at a time, and the expert gets paid |
| 2:17 | Close | SaaS isn't dead, the code moves to the user |
| 2:20 | End | Built by experts, Shaped by users, Powered by your AI, then the SuperGrid lockup: made possible by Muse Code, the platform for a new kind of SaaS, built for the Meta AI Developer Hackathon |

## Open for the Next Pass

- The Ad Designer and the store's other apps and builders are mocks, as agreed in beats.md
- Beat 2 (who I am) isn't in this voice over, so it isn't in the film
