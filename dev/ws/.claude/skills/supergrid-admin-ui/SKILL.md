---
name: supergrid-admin-ui
description: Build or change an app's admin screens so they look native inside the SuperGrid desktop. Use when adding or styling anything under app/routes/admin or app/components/admin in a SuperGrid app.
---

# Admin screens that look native

An app's admin screens render inside the SuperGrid desktop in an iframe, next to the desktop's own pages (Database,
Workflows, Library). They should be indistinguishable from them. The desktop pushes its tokens into the iframe
(`--sg-admin-*`, through the admin SDK) and `components/admin/admin.css` maps them onto the kit, so a screen built from
the kit and the admin layer takes the shell's colors, fonts, radius and light or dark mode with no code.

## Build with these

| Piece | From | Use for |
|---|---|---|
| `AdminApp` | `components/admin/shell` | wraps the admin layout route; connects to the shell; a plain menu when standalone |
| `useAdmin()` | same | `host` (navigate, setTitle, pickAsset, toast, open), `manifest`, `basePath` |
| `Page` | `components/admin/page` | one screen: title (shown in the shell's title bar), description, `actions` (the one main action) |
| `Card`, `Row` | same | a titled card; a label-and-control row inside it (forms, settings, details) |
| `StatRow`, `Stat` | same | numbers across the top of a screen |
| `DataTable` | `components/admin/data-table` | every list: compact rows, sortable headers, a click per row |
| `EmptyState` | `components/admin/page` | what a list shows with nothing in it, with the one thing to do |
| `Toolbar` | same | filters left, search and buttons right, above a table |
| `AssetField` | `components/admin/asset-field` | a picture, video or file from the workspace library, through the shell's picker |
| the kit | `components/ui/*` | `Button`, `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`, `Dialog`, `Sheet`, `Badge`, `Tabs`, `Menu`, `Tooltip`, `Alert`, `toastManager`… |

## Do

- One `Page` per route. Title Case titles. The main action (`New Item`, `Save`) in `actions`; everything else in the body.
- Lists in a `Card padded={false}` with a `DataTable`; details and forms in a `Card` of `Row`s.
- `host.toast("Saved", { tone: "success" })` after a save; `host.open("database/app_<id>_<table>")` to show the raw rows.
- Pictures through `AssetField`; store the asset reference JSON and draw it with `<Img>` on the public side.
- `host.navigate` is automatic (the shell follows React Router); call `host.setTitle` only outside `Page`.
- Keep screens working standalone (`pnpm dev`, open `/admin/<id>`): `AdminApp` draws a menu and `host.embedded` is false.

## Don't

- No literal colors (`#fff`, `bg-blue-500`), fonts or radii. Tokens only: `bg-card`, `text-muted-foreground`, `border-border`, `rounded-lg`, `font-heading`.
- No `dark:` rules; the tokens already change with the shell's mode.
- No page-level chrome of your own (no sidebars, top bars, logos): the shell provides them. The iframe is the page's content area.
- No `font-bold`; `font-medium` or `font-semibold`. No subtitles under titles beyond the one-line description.
- No external stylesheets or fonts; the iframe inherits the shell's through the tokens.
- No fetches to other origins from the admin; talk to your own Worker (actions, `/api/<id>/ops/*`).
- Never hide a permission check in the UI only; the operation's `access` is the check.

## Sizes and spacing

Body text 13–14px (`text-sm`, `text-[13px]` in tables), titles `text-xl`, card titles `text-[13px] font-semibold`, 16px
page gutters, `gap-5` between cards. These match the desktop's own pages; copy them rather than inventing a scale.
