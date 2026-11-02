import defaults from "./tokens.json";

export type Tokens = Record<string, string>;
export const defaultTokens: Tokens = defaults;

/** Tokens → CSS custom properties on :root, plus a few base rules every app shares. */
export function tokensToCss(tokens: Tokens): string {
  const vars = Object.entries(tokens).map(([k, v]) => `  --sg-${k}: ${v};`).join("\n");
  return `:root {\n${vars}\n}\n` +
    `html { font-family: var(--sg-font-sans); color: var(--sg-color-fg); background: var(--sg-color-bg); }\n` +
    `.sg-btn { display:inline-block; padding:.5rem 1rem; border-radius:var(--sg-radius); background:var(--sg-color-accent); color:var(--sg-color-accent-fg); border:0; font:inherit; cursor:pointer; text-decoration:none; }\n` +
    `.sg-card { border:1px solid var(--sg-color-border); border-radius:var(--sg-radius); padding:var(--sg-space); background:var(--sg-color-bg); }\n` +
    `.sg-muted { color: var(--sg-color-muted); }\n`;
}
