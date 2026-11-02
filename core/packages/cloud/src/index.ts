// Everything that talks to a user's Cloudflare account or to a release feed. The platform Worker and the CLI share it,
// so an install from the terminal and a click in the UI run the same code. Runs on Workers and on Node 24.
export * from "./client";
export * from "./deploy";
export * from "./resources";
export * from "./release";
export * from "./repo";
export * from "./ops";
export * from "./scopes";
