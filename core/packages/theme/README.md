# @supergrid/theme

The theme is a small JSON document a workspace stores and every app reads. It compiles **at runtime** to CSS custom properties; no component is rebuilt when a theme changes, and a workspace can keep several themes (light, dark, a redesign in progress) with one marked default.

```
theme document (D1, one row per theme)
  └─ themeToCss()  →  /_ws/theme.css  →  <link> in every app  →  the base-ui kit reads the variables
```

## The document

```jsonc
{
  "id": "default",            // slug, fixed once created
  "name": "Default",
  "mode": "light",            // or "dark": drives color-scheme and the derived greys
  "fonts": {
    "heading": { "family": "Inter" },               // a Google family loads with one @import
    "body":    { "family": "Inter" },
    "accent":  { "family": "Instrument Serif" },    // optional: eyebrows, quotes
    "mono":    { "family": "JetBrains Mono" }       // optional: code
  },
  "colors": {
    "primary": "#3b5bdb", "secondary": "#0f766e", "accent": "#f59e0b",
    "background": "#ffffff", "foreground": "#171717",
    "success": "#16a34a", "warning": "#f59e0b", "danger": "#dc2626", "info": "#2563eb",   // optional
    "custom": { "teal": "#0d9488" }                 // optional extras, each with a 50–950 ramp
  },
  "radius": "md",             // none | sm | md | lg | xl | full
  "spacing": "normal",        // tight | normal | relaxed
  "buttons": { "radius": "theme", "weight": "medium", "uppercase": false, "shadow": true },
  "inputs":  { "style": "outline", "radius": "theme" },
  "assets":  { "logo": "https://…/logo.svg", "favicon": "/favicon.png" },
  "notes": "Brand refresh, March. Keep the amber accent."
}
```

Everything after `colors` is optional and takes the default theme's value. `schema.json` is the JSON Schema; `parseTheme()` in `src/validate.ts` is the one place input is checked.

## What comes out

`themeToCss(theme)` writes one `:root { … }` block (and the `@import` for web fonts). The names are the ones shadcn-style kits use, so the base-ui kit in `@supergrid/ui` and the desktop app read them unchanged:

| Group | Variables |
|---|---|
| Fonts | `--font-sans` (body), `--font-heading`, `--font-accent`, `--font-mono` |
| Surfaces | `--background`, `--foreground`, `--card`, `--popover`, `--app-bg` and their `-foreground`s |
| Brand | `--primary`, `--secondary`, `--accent` and their `-foreground`s (black or white, picked by contrast) |
| Quiet layer | `--muted`, `--muted-foreground`, `--border`, `--input`, `--ring` — mixes of foreground into background, so they follow any background |
| Status | `--destructive`, `--success`, `--warning`, `--info` and `-foreground`s |
| Shape | `--radius`, `--radius-button`, `--radius-input`, `--radius-card`, `--spacing` (Tailwind's base unit: scales every padding and gap) |
| Knobs the kit reads | `--sg-button-weight`, `--sg-button-transform`, `--sg-button-tracking`, `--sg-button-shadow`, `--sg-input-bg`, `--sg-input-border` |
| Ramps | `--sg-primary-50` … `--sg-primary-950`, same for `secondary`, `accent`, `neutral` and every custom color |
| Assets | `--sg-logo`, `--sg-logo-dark`, `--sg-icon` as `url()` values |

Ramps are generated in OKLCH from the one color you give: the base keeps its hue and sets the peak chroma, and lands on the step nearest its own lightness (so `--sg-primary-600` is usually the primary itself).

## Loading it

**Public pages and admin screens of an app.** Link the stylesheet the workspace serves; it carries an ETag and a short max-age, and the workspace revalidates it from D1 in one point read:

```html
<link rel="stylesheet" href="/_ws/theme.css">            <!-- the default theme -->
<link rel="stylesheet" href="/_ws/theme/dark.css">       <!-- a specific one -->
```

Or inline it from a loader, which saves the round trip and lets the page pick a theme per request:

```ts
import { themeToCss } from "@supergrid/theme";
const theme = await workspace.readTheme();          // the default; readTheme("dark") for another
return { css: themeToCss(theme), favicon: theme.assets.favicon };
```

`/_ws/theme.json` returns the default theme's document for anything that wants the assets or the mode.

**The desktop app** previews a theme by putting `themeToStyle(theme)` on a container: the kit's components inside pick up the variables, the app's own chrome does not.

## Editing it

- People: the Design page in the desktop app (`app/src/renderer/app/components/workspace/design-page.tsx`).
- Agents: the `supergrid` MCP server the desktop gives every chat session (`app/src/main/mcp.ts`): `theme_guide`, `list_themes`, `get_theme`, `save_theme` (full document or a patch), `create_theme`, `set_default_theme`, `delete_theme`. `SKILL.md` in this folder is what `theme_guide` returns.
- Code: the workspace RPC `listThemes`, `readTheme`, `saveTheme`, `removeTheme`, `setDefaultTheme`.

Saving a theme writes the row and bumps the CSS ETag; pages pick it up on their next load. Nothing is built.

## Not yet

- Assets picked in the editor are stored as data URLs in the document (limit 400 KB each) until workspace media lands in R2. Prefer a URL when you have one.
- A KV binding would let `/_ws/theme.css` skip D1 entirely; the workspace Worker has no KV today, so the stylesheet is cached by ETag and max-age instead.
