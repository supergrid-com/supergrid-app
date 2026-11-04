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
