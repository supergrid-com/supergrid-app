# Admin screens

An app's admin screens render inside the SuperGrid desktop, in an iframe next to the desktop's own pages. The goal is
that nobody can tell where the desktop ends and the app begins. Three things make that true: the **admin layer**
(`components/admin`, copied into every app), the **admin SDK** (`@supergrid/admin-sdk`, the postMessage channel to the
shell), and the **tokens** the shell pushes into the iframe.

## How a screen reaches the window

1. The user clicks the app in the rail. The desktop mints a handoff token with the workspace's token and sets the
   iframe's `src` to `<workspace>/_ws/auth?token=…&next=/admin/<id>/…`. The workspace swaps it for the staff cookie
   and redirects to the screen. The app gets the user as `x-sg-user` (`ctx.user`).
2. The app's admin layout mounts `<AdminApp manifest>`, which calls `connectAdminHost(id)`: it posts `sg:ready`, the
   shell answers `sg:init` with the session, the tokens, the app's nav and the scheme. The tokens land on `:root` as
   `--sg-admin-*` and `components/admin/admin.css` maps them onto the kit under `[data-sg-admin]`.
3. From then on: the app reports where it is (`sg:navigate`) and the shell's menu and address follow; the shell moves
   the app when its menu is clicked (`sg:go`); the page title shows in the title bar (`sg:title`); the app can open the
   media picker (`sg:pick` → `sg:picked`), show a toast (`sg:toast`) and open a page of the shell (`sg:open`).

Standalone (`pnpm dev`, `http://localhost:5301/admin/<id>` through the local workspace, or the Dev panel's **Open
Admin**) there is no parent: `connectAdminHost` resolves with a stand-in owner, `AdminApp` draws a plain menu from the
manifest, and the tokens fall back to the shell's own light and dark values.

## The admin layer

| Piece | For |
|---|---|
| `AdminApp`, `useAdmin()` | the layout route; `host`, `manifest`, `basePath` anywhere under it |
| `Page` | one screen: the title (sent to the shell's title bar), a one-line description, the one main action |
| `Card`, `Row` | a titled card; label-and-control rows for forms, settings and details |
| `DataTable` | every list: sticky header, sortable columns, a click per row, an empty state |
| `StatRow`, `Stat` | numbers across the top |
| `EmptyState` | nothing yet, with the one thing to do |
| `Toolbar` | filters left, search and buttons right |
| `AssetField` | a picture, video or file from the library through the shell's picker; carries an `AssetRef` as JSON in a hidden input |

Everything else is the kit in `components/ui`: `Button`, `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`,
`Dialog`, `Sheet`, `Badge`, `Tabs`, `Menu`, `Tooltip`, `Alert`, `toastManager`… (the *UI kit* page lists them).

## Dos and don'ts

**Do**

- One `Page` per route, Title Case, the main action in `actions`, everything else in the body.
- Lists in `Card padded={false}` + `DataTable`; forms as `Card` of `Row`s; `host.toast` after a save.
- Writes through operations (`ctx.call`) in actions; the screen never holds a rule the operation does not.
- Keep the screen working standalone; `host.embedded` tells you which case you are in.
- Sizes as the desktop uses them: body 13–14px, titles `text-xl`, card titles `text-[13px] font-semibold`, `gap-5` between cards.

**Don't**

- No literal colors, fonts or radii; no `dark:` rules (the tokens change with the shell); no `font-bold`.
- No chrome of your own (sidebars, top bars, logos): the iframe is the page's content area.
- No external stylesheets or fonts; no fetches to other origins; the app's own Worker is the only server.
- No subtitles under titles beyond the one-line description; no hidden permission checks in the UI.

## The admin SDK

**App side** (`@supergrid/admin-sdk/app`): `connectAdminHost(appId, { nav })` → `AdminHost`: `embedded`, `session`
(`user`, `workspace { id, name, url }`), `tokens`, `basePath`, `nav`, `scheme`; `navigate(path)`, `setTitle(title)`,
`pickAssets({ kinds, multiple, title })`, `pickAsset()`, `toast(title, { description, tone })`, `open(to)`,
`onScheme(cb)`, `onNavigate(cb)`. The admin layer calls most of these for you.

**Host side** (`@supergrid/admin-sdk/host`): `mountAppFrame(iframe, init, handlers, { origin })` returns `{ unmount,
setScheme, go }`. The desktop's app page is the reference host; the platform's frame route is the other.

**Protocol** (`@supergrid/admin-sdk/protocol`): host → app `sg:init`, `sg:scheme`, `sg:go`, `sg:picked`; app → host
`sg:ready`, `sg:resize`, `sg:navigate`, `sg:title`, `sg:pick`, `sg:toast`, `sg:open`. Messages only cross between the
workspace's origin and the shell's; the host checks `e.origin` and `e.source`.

## The media picker

`host.pickAsset({ kinds: ["image"] })` opens the shell's sheet over the organization's Images and Stream and the
workspace's files. It resolves with an `Asset` in the workspace's own shape (`urls.src`, `urls.thumbnail`, `urls.base`
for Images with size options, `urls.embed` for Stream). `AssetField` wraps it for forms; store `toAssetRef(asset)` as
JSON in a `media` column and draw it with `<Img asset>` from `@supergrid/app-kit/media-react` on the public side.

## Tokens the shell pushes

`admin-page` (the page), `admin-fg`, `admin-card`, `admin-bg` (the window behind cards), `admin-hover`, `admin-muted`,
`admin-line`, `admin-input`, `admin-accent` and `admin-accent-fg` (the active color), `admin-primary` and
`admin-primary-fg`, `admin-radius`, `admin-font`, `admin-font-mono`. They arrive as `--sg-admin-*` on `:root`;
`admin.css` reads them with the shell's light and dark values as fallbacks and sets `.dark` when the scheme is dark.
