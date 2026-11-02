import { fetchBundle, fetchRelease, type Bundle, type Release } from "@supergrid/cloud";

// Where workspace releases come from: a signed feed, verified against a public key baked into the
// app. The hackathon build points at the dev feed on the SuperGrid test account; SG_RELEASE_FEED
// and SG_RELEASE_PUBKEY point it at another one (a fork's own feed).
export const RELEASE_FEED = process.env.SG_RELEASE_FEED ?? "https://sgdev-feed.supergrid-operator.workers.dev";
export const RELEASE_PUBKEY = process.env.SG_RELEASE_PUBKEY ?? "ZYqwD0wKU9cOJpZVHQ3ngL3vtA1oFfoYoTNxCqa3T6M=";

/** The newest workspace release, its pointer verified. */
export const workspaceRelease = (): Promise<Release> => fetchRelease(RELEASE_FEED, "workspace", RELEASE_PUBKEY);

/** The release's bundle, checked against the hash in the signed pointer. */
export const workspaceBundle = (release: Release): Promise<Bundle> => fetchBundle(RELEASE_FEED, release);
