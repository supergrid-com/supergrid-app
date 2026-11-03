# Public pages

The public side of an app is what visitors see on the workspace's domain, under the app's mount. It follows the
workspace's **theme** at runtime (colors, fonts, radius, spacing, buttons and inputs), so every app on a site looks
like one site, and a theme change restyles them all with no rebuild.

## The pieces

- `app/routes/public/layout.tsx` wraps every public page in `SiteLayout`.
- `components/site/layout.tsx`: `SiteLayout` (header, nav, footer, the tracker), `Container`, `PageTitle`. The app's own;
  change it. A site app (the one at `/`) is where the shared header and footer live for real.
- `components/ui`: the base-ui kit, copied in and themed by `tokens.css`. `Button`, `Input`, `Card`, `Dialog`… read
  `--primary`, `--background`, `--radius` and the rest, so they already match the theme.
- `root.tsx` loads `<link rel="stylesheet" href="/_ws/theme.css">` on public routes (not on `/admin/*`, which takes the
  shell's tokens). `workspace.readTheme()` + `themeToCss()` inline it instead when a page wants no round trip.

## Rules

- Tokens, never literal looks: `bg-background`, `text-foreground`, `bg-primary text-primary-foreground`,
  `text-muted-foreground`, `rounded-lg`, `font-heading`. Ramps when a tint is needed: `bg-[var(--sg-primary-50)]`.
- Links through `ctx.href("/path")` (`href` in `appContext`) so they follow the mount the sitemap chose; the mount
  arrives on every request as `x-sg-mount`.
- `font-heading` on headings, `font-accent` for eyebrows and quotes; no `dark:` rules (a dark theme is a theme).
- Forms post to actions that write through operations or the workspace (`upsertContact`, never a core table directly).

## What the system gives a public page

| Need | Use |
|---|---|
| Track what visitors do | `<Analytics app>` in the layout sends one `page.view` per navigation; `useTrack()` for `track("cta.clicked", props)`; `identify({ email })` after the visitor gave an email. Server side: `ctx.events.emit(...)`. |
| Pictures, video, audio, files | `<Img asset width>`, `<Video asset>`, `<Audio asset>`, `<FileLink asset>` from `@supergrid/app-kit/media-react`, over the `Asset` the workspace returned or an `AssetRef` a `media` column holds. Uploads from the browser: `useUpload(client, appId)`. |
| Contacts | `workspace.upsertContact(appId, { email, name })` in an action; tag with `tagContacts`. |
| The theme's assets | `/_ws/theme.json` → `assets.logo`, `assets.favicon`; or `theme.assets` from `readTheme()`. |
| Settings the owner edits | `workspace.getSetting("app:<id>:settings")`, written by the app's settings screen. |
| The visitor | `ctx.events.anonymousId` on the server, the workspace's cookie in the browser; the same id in both. |

## The site app

The app with `public.mount: "/"` (or a `home`) is the site: its layout is the header and footer every other app's pages
share, through server-side fragments once they exist. Until then each app's `SiteLayout` draws its own header from the
same tokens, which already reads as one site.
