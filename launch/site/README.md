# supergrid.com

The SuperGrid sales page. Next.js (App Router) + Tailwind 4, set in Cal Sans like the launch film.

```bash
pnpm install
pnpm dev
```

- `src/app/page.tsx`: the page, one component per section, in the film's beat order (`../video/beats.md`)
- `src/components/brand.tsx`: the mark, Muse glyph, chips, buttons and product shots, after the film's kit
- `public/shots/`: frames of the app cropped from the launch film (`../video/film`)

## Icons and share card

- `src/app/icon.svg`: the favicon, the white mark on a dark rounded square
- `src/app/apple-icon.png`: the same at 180 × 180 for home screens
- `src/app/opengraph-image.png` (+ `.alt.txt`): the share card, captured from `src/app/_og/page.tsx`. To change it, rename `_og` to `og`, run `pnpm dev`, then:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=6000 --screenshot=src/app/opengraph-image.png http://localhost:5320/og
```

and rename the folder back to `_og`.

## README pictures

The repo README's banner, app shot and diagrams are pages in `src/app/_readme/` (hero, app, stack, core), each laid out at
1600 px wide. To change one, rename the folder to `readme`, run `pnpm dev`, then capture it at 2x with a transparent
background (the height is the page's own: hero 440, app 860, stack 600, core 600):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=2 --default-background-color=00000000 --window-size=1600,440 --virtual-time-budget=8000 --screenshot=../../.github/readme/hero.png http://localhost:5320/readme/hero
```

and rename the folder back to `_readme`. The app shot is a real capture of the desktop's demo workspace, kept as
`_readme/app/window.png`.

The shot of the site itself (`site.png`) is the live hero, captured by `scripts/readme-site.mjs` over the DevTools
protocol: start `pnpm dev`, then a headless Chrome with `--remote-debugging-port=9400`, then
`node scripts/readme-site.mjs ../../.github/readme/site.png 1536 1080`.
