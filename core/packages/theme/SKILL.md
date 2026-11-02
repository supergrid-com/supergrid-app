---
name: supergrid-theme
description: Create and edit a workspace's design themes (fonts, colors, shape, buttons, inputs, assets) through the SuperGrid MCP tools. Use when asked to change how a site or its apps look, add a dark theme, try a new style, or set a logo or favicon.
---

# Editing a SuperGrid theme

A theme is one JSON document (see the schema below). It compiles to CSS variables at runtime; you never touch component code to change a theme. A workspace can hold several themes; one is the default and is what apps load.

## Tools

| Tool | Use it for |
|---|---|
| `theme_guide` | this text and the JSON Schema |
| `list_themes` | what themes exist and which is default |
| `get_theme { id? }` | the full document; add `withCss: true` to see the generated CSS |
| `save_theme { id, patch }` | change parts of a theme; `patch` is merged over the current document |
| `save_theme { theme }` | replace a theme with a full document, or create one with a new `id` |
| `create_theme { name, from?, mode? }` | a copy of `from` (default: the default theme) under a new id |
| `set_default_theme { id }` | make a theme the one apps load |
| `delete_theme { id }` | remove a theme (not the default) |

## How to work

1. Call `list_themes`, then `get_theme` on the one you will change. Read `notes`.
2. Prefer `save_theme` with a **patch**: `{ "id": "default", "patch": { "colors": { "primary": "#0f766e" } } }`. A patch keeps everything you did not mention. `null` removes an optional value (`"assets": { "logoDark": null }`, `"colors": { "custom": { "teal": null } }`).
3. To try something without touching the live look, `create_theme { name: "Teal test", from: "default" }`, edit the copy, and tell the user how to switch (`set_default_theme`) or do it when asked.
4. Say what you changed in plain words: "primary is now teal, headings are Fraunces".

## Rules of thumb

- `primary` is the brand color and must read on `background`: aim for contrast ≥ 3:1 for buttons. The system picks black or white text on it.
- `foreground` on `background` needs ≥ 7:1 for body text. A dark theme is `mode: "dark"` with a dark `background` and a light `foreground`; do not just invert colors, raise the lightness of brand colors a step too.
- `accent` is for emphasis in small doses (badges, the active item). Pick something that contrasts with `primary`.
- Two fonts are enough: a heading and a body. Add `accent` only for a distinct voice (a serif for quotes, say). Any Google Fonts family works by name.
- `radius` sets the mood: `none`/`sm` reads technical, `lg`/`xl` friendly, `full` playful. Use `buttons.radius: "pill"` for pill buttons without rounding cards.
- `spacing` scales every padding and gap at once; `tight` for dense admin tools, `relaxed` for marketing pages.
- `custom` colors are for things the five core colors cannot express (a chart palette, a highlight). Each gets `--sg-<name>-50…950`.
- Assets are URLs. A data URL works for small files (under 400 KB) when there is no upload yet.
- Keep `id` stable; it is how apps reference a theme. Change `name` freely.

## The CSS an app sees

`--font-sans`, `--font-heading`, `--font-accent`, `--font-mono`; `--background`, `--foreground`, `--card`, `--popover`; `--primary`, `--secondary`, `--accent` (+ `-foreground`); `--muted`, `--muted-foreground`, `--border`, `--input`, `--ring`; `--destructive`, `--success`, `--warning`, `--info`; `--radius`, `--radius-button`, `--radius-input`, `--radius-card`, `--spacing`; ramps `--sg-primary-500` etc.; `--sg-logo`, `--sg-icon`.

Apps load it with `<link rel="stylesheet" href="/_ws/theme.css">` or `workspace.readTheme()` + `themeToCss()`.
