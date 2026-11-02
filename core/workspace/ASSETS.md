# Assets

Images, video, audio and files a workspace holds, and how apps and the desktop use them. Everything lives in the user's own Cloudflare account; the workspace keeps the catalogue.

## One table, three products

| Kind | Goes to | Why |
|---|---|---|
| image | **Cloudflare Images** | resizing and format negotiation on the URL (`/w=400,fit=cover`), no build step, no origin |
| video, audio | **Cloudflare Stream** | encoding, adaptive playback (HLS and DASH), a player, thumbnails, and per-video analytics |
| file (and images when Images is not connected, or anything over the basic-upload limits) | **R2**, the workspace's own bucket | plain bytes served by the workspace Worker at `/_ws/files/<key>` |

`assets` in D1 is a row per thing: `kind`, `provider`, `provider_id` (an Images id, a Stream uid or an R2 key), the file name, title and alt, size and dimensions, `status`, a `folder` path, tags (also in `asset_tags` for filtering) and a `meta` JSON bag. The types are in `packages/app-kit/src/rpc.ts` under Assets; the module is `src/assets.ts`.

A row carries `urls`, computed on read, so an app never needs the account's Images hash or Stream customer code:

```
images   base: https://imagedelivery.net/<hash>/<id>      src: <base>/public   thumbnail: <base>/w=400,h=400,fit=cover
stream   hls, dash, thumbnail, embed (the Stream player iframe)   src = hls
r2       src: https://<workspace>/_ws/files/<key>         thumbnail = src for pictures
```

The hash and the customer host are learned from the first upload (they appear in the upload URL and in a video's playback URLs) and stored in `settings` (`media.images_hash`, `media.stream_customer`). Flexible variants are switched on for the account the first time an image goes up, so the `w=,h=,fit=,q=,f=` URL syntax works without defining variants.

## Credentials

The workspace Worker needs two things: `CF_ACCOUNT_ID` and `SG_MEDIA_TOKEN`, an API token with **Images: Edit, Stream: Edit, Account Analytics: Read** (`MEDIA_PERMISSIONS` in `packages/cloud/src/scopes.ts`). Both are set at provisioning, and on the next update for workspaces from before (`mediaToken` in `packages/cloud/src/ops.ts`): a token minted for that one workspace when the desktop's own token may create tokens, else the desktop's own token. Nobody pastes anything; the desktop got its token when Cloudflare was connected (`app/CONNECT.md`). Both are Worker secrets, set through the Cloudflare API, never through the workspace itself. Until they exist `mediaConfig()` reports `images: false, stream: false` and pictures go to R2; the Assets page says so and offers "Turn on", which sets them the same way.

The R2 bucket is `<worker>-files`, bound as `FILES`, created at provision and added to older workspaces on their next update (`packages/cloud/src/ops.ts`). Locally it is `ws-local-files` under `.state`.

## Uploads: a ticket, then the bytes, then a confirmation

No browser, and no app, ever holds the media token. An upload is three calls on the RPC surface:

1. `createUpload(appId, { name, mime, size, folder?, tags?, … })` inserts a `pending` row and returns a **ticket**: the row plus where the bytes go.
   - Images: a direct creator upload URL (`POST /images/v2/direct_upload`), a multipart `POST` with the file under `file`, good for 30 minutes.
   - Stream: a direct creator upload URL (`POST /stream/direct_upload`), same form shape, up to 200 MB without tus.
   - R2: a URL on the workspace, `/_ws/upload/<id>?exp=…&sig=…`, signed with the workspace token, that takes one `PUT` with the body as the file.
2. The client sends the file there. `uploadFile` in `packages/app-kit/src/media.ts` does this with progress, and measures an image's size or a video's duration on the way.
3. `completeUpload(appId, id, measured?)` asks the provider what it has and sets the status: `ready`, `processing` (Stream encoding; `refreshAsset` later) or `error`. The R2 `PUT` handler marks its own row ready, so the third call there only fills in the measurements.

Events: `asset.created`, `asset.ready`, `asset.deleted` are reserved names the core emits, so a workflow can react to a new video being playable.

## Reading, editing, removing

- `listAssets(query)`: by kind, status, folder or folder prefix, tags (all of), search over name, title and alt, app; sorted and paged.
- `listAssetFolders()`: the folder paths in use with counts, enough for a tree.
- `saveAsset(appId, { id, name?, title?, alt?, folder?, tags?, meta? })`: the catalogue fields. A Stream rename is pushed to the video's `meta.name`.
- `removeAssets(appId, ids)`: deletes at the provider first, then the rows; a provider failure keeps that row and reports it.

## Analytics

`mediaAnalytics({ days | from, to, assetId?, groupBy: asset | day | country })` runs Cloudflare's bulk Stream analytics (GraphQL dataset `streamMinutesViewedAdaptiveGroups`, the one documented for fetching bulk analytics) and returns minutes viewed and playback counts per asset, per day or per viewer country, with the asset rows joined on for the per-asset view. It needs the Analytics read scope on the media token. Our own `events` table is not involved: Stream counts playback at the edge, which catches views from every embed, not only ones an app instrumented.

## In an app

`@supergrid/app-kit/media` has the URL helpers and the upload runner; `@supergrid/app-kit/media-react` has the components. Both are written to be copied into an app and edited (they depend on React only):

```tsx
import { Img, Video, Audio, FileLink, useUpload } from "@supergrid/app-kit/media-react";

<Img asset={hero} width={1200} sizes="(min-width: 900px) 60vw, 100vw" alt="…" />
<Video asset={clip} autoplay muted />          // the Stream player in an iframe
<Audio asset={episode} />
<FileLink asset={brochure}>Download the PDF</FileLink>
```

`useUpload(client)` takes any object with `createUpload` and `completeUpload` (an app's `ctx.workspace` behind a route action, or the desktop's RPC bridge) and returns `{ upload(file, input), jobs }` with per-file progress.

## Desktop

The **Assets** page (`app/src/renderer/app/components/workspace/assets/`) is the manager: a grid or list of everything, tabs per kind, search, folder and tag filters, drag-and-drop upload with progress, a detail sheet (preview, the catalogue fields, copy URL, delete) and an Analytics tab over `mediaAnalytics`. A workspace from before media shows a card with "Turn on"; the bridge's `ws.setMediaToken` mints or copies the token and writes the two secrets through the Cloudflare API.

## Later, not now

- Resumable (tus) uploads to Stream for files over 200 MB, and multipart uploads to R2 for very large files.
- Signed URLs (`requireSignedURLs`) for private assets; today everything uploaded is public by URL.
- Stream webhooks instead of `refreshAsset` polling for encoding status.
- Image variants defined by name (`hero`, `card`) on top of the flexible syntax.
- A custom domain in front of `imagedelivery.net` and `/_ws/files`.
- Usage: where each asset is referenced (pages, products), so "unused" can be a filter.
