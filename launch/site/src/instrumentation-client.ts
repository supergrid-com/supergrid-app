// PostHog: page views, clicks and page leaves, in the hackathon's shared project (642580). Every
// event carries product: "supergrid" to tell it apart from the other entries. Only the live site
// reports, so local builds and previews stay out.
if (/(^|\.)supergrid\.com$/.test(location.hostname)) {
  import("posthog-js").then(({ default: posthog }) =>
    posthog.init("phc_wHmU9xGagja5baLnbfXbBsDSepVnU7h5bBB6Do6DAdGs", {
      api_host: "https://us.i.posthog.com",
      defaults: "2026-08-30",
      // Runs before the first page view, so that one is tagged too.
      loaded: (ph) => ph.register({ product: "supergrid" }),
    }),
  );
}
