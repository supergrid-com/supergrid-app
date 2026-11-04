# SuperGrid Launch Film

## Angle

SaaS was four things bundled together. AI made three of them nearly free; the fourth, the vision, is what cloning throws away. SuperGrid lets people own the software and keep that part. The film argues it with abstract diagrams first, then proves it in the product.

## Look

After supergrid.com and Squarespace, with the judges in mind: plain white page, big type, photography and product where they carry the story, nothing decorative

- Page: plain white. The dark card (`#1B1D24`, inset 16) only for the SuperGrid reveal and the end card, with the mark in plain white
- Type: Cal Sans 500 with a little tracking, near-black ink. Two-tone headlines: the statement lands in ink first, then the rest arrives in rose (`#f33869`) a word at a time as the voice says it. No gradients on text. No full stops anywhere
- Motion: text slides up and fades in quickly, no blur. Every other movement shows something: the wall drifting, the mosaic assembling, the blocks lighting, a line struck through
- Hook: a wall of real SaaS homepages (Notion, Slack, HubSpot, Zendesk, Intercom, Figma, Asana, monday, Shopify, Zoom, Webflow, Dropbox, Atlassian, Grammarly, Miro, Airtable, Loom; headless Chrome screenshots in `film/public/wall`) drifting on a tilted plane; then, half a second before the voice turns, a plain chat composer handed contentblocks.com and bill.harper@gmail.com, asked to rebuild the whole product, and the agent's stream: opening, reading 48 screens, mapping the data model, writing a plan, building
- Four parts: the word and its lines on the left, one picture card on the right: a Midnight editor where three lines are typed by hand and then the agent floods the file and opens three more; a globe of users counting past two million, then one user; an inbox of eight threads a machine clears in seconds, each stamped replied · fixed · 0.7s; and a bento mosaic of seventeen pieces flying in to fit together
- Iceberg: a block grid, the top row solid (the screens), four rows outlined under a hairline, each block an icon for what a clone misses: the database, servers, security, time, decisions, taste
- Three reasons: the headline, then three columns that arrive one by one and stay up together
- The product: the desktop app on its Midnight theme (blue-black, periwinkle accent), polished like Attio, with the site pages it produces styled like Squarespace templates over Unsplash photography (`film/public/photos`)
- Muse: Meta blue and the infinity mark, only where Muse is

## Voice

- Script draft 9 (`video/script-draft-9.md`), Archie take of 2026-11-04, voice over only, no music or sound effects
- Sped up 1.35x (3:10 → 2:21); the original is `film/vo-original.mp3`
- Timed by word: whisper.cpp word times on the sped voice, lined up with the script by `film/scripts/cues.mjs` into `src/cues.json` (one cue per sentence) and `src/words.json`. Scenes start on a sentence (`cue(n)`) or on the word they show (`say(n, "phrase")`), so a new take moves the whole film. The draft 8 voice and cues are in `work/draft8/`

## Storyboard

| Time | Beat | On Screen |
|---|---|---|
| 0:00 | Hook | SaaS homepages drift on a tilted plane under "AI was the selling point"; then "Now AI is rebuilding the product" beside a plain chat window: the site and a gmail login handed over in the composer, "Rebuild this whole product" sent, and the agent's reply streaming in step by step |
| 0:07 | Four things | SaaS was four things, sold as one subscription, over one pill: Code, Servers, Support, Vision with their icons, and $49 / mo landing on "subscription" |
| 0:09 | Code, Servers, Support, Vision | Two columns each, the before line struck in rose for the after. Code: three engineers' carets typing by hand, then an agent's caret writes the whole file and opens three more. Servers: a turning globe filling with users past two million, easing to a stop on one: you. Support: an inbox filling faster than the team answers, then an agent clears it top to bottom. Vision: a mosaic built one piece at a time through the line, ringed in rose on "hasn't changed" |
| 0:30 | Taste | "AI can't recreate taste" alone |
| 0:32 | Buy or build | Buy or Build over a company's worth of people, for big companies; on "one person" everyone else steps away and an Agent pill joins the one left |
| 0:37 | 100 features | 100 features to use 3, over a 10 × 10 grid where three squares light rose |
| 0:39 | Clone | Build struck out as Clone opens up beside it, then the screens, in an afternoon |
| 0:43 | Iceberg | A centred block grid: the screens solid on top, the water line, then on "years of decisions underneath" four rows of outlined blocks rise under it, each an icon for what a clone misses; the top row lights rose on "tip". Then two columns: the builder loses the business (revenue climbing, then falling away) and the user gets a worse copy (a wireframe filling with bugs on "every bug is now theirs") |
| 0:51 | Why people clone | People clone for three reasons, then three columns with icons arriving one by one and staying: their own code, their own AI (Muse Spark by Meta), their own way |
| 0:58 | Reveal | The dark card scrolls up. The mark builds in white, SuperGrid, the desktop IDE for your site and the tools behind it, then your own repo, your Cloudflare, your own AI. The card scrolls away again |
| 1:06 | The app | On the plain white page, the window nearly the whole frame, Midnight theme. One shot: Connect Muse Code, connect Cloudflare, create Studio and its repo, the core lighting up as it's named, apps on top, install Blog, the commit lands, the Ad Designer on Muse Image, the site's Squarespace-like pages, Muse writing a post over MCP |
| 1:35 | Updates, in the app | Apps · Installed: Blog 1.1.0 fixes a bug for every install, your copy has 2 edited files and it conflicts. Update opens the old either-or: keep your copy or take the update, never both |
| 1:46 | Merge, in the app | Muse's way out appears in the dialog. Muse merges around the signup form it added, checks security, fixes a break, then asks; Approve, and Blog is up to date |
| 1:55 | CTO | The page scrolls on from the app: Muse Code by Meta, the CTO for every creator |
| 1:57 | Every industry | A row of five expert apps (class booking by a fitness coach, client intake by a family lawyer, menu and orders by a chef, patient forms by a dentist, listings by a real estate agent): each gets a dashed copy pulled off it and a Cloned mark, then installed, owned, updated marks land on the words, and a Paid tag on "paid" |
| 2:07 | Close | SaaS isn't dead, the code moves to the user |
| 2:10 | End | Built by experts, Shaped by users, Powered by your AI, then the SuperGrid lockup with the white mark: made possible by Muse Code, the platform for a new kind of SaaS, built for the Meta AI Developer Hackathon |

## Open for the Next Pass

- The Ad Designer and the store's other apps and builders are mocks, as agreed in beats.md
- Beat 2 (who I am) isn't in this voice over, so it isn't in the film
