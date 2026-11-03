import { applyPatch, parseTheme, shift, ThemeError, themeSchema, themeToCss, type Theme, type ThemeRecord, type ThemeSummary } from "@supergrid/theme";
import type { ThemeCard } from "../../shared/agent";
import { findDoc } from "../../shared/docs";
import { str, ToolError, type Tool, type ToolCtx } from "./index";

// The theme tools, over the workspace's own RPC (listThemes, readTheme, saveTheme, ...), so a save
// is what every app of the workspace loads next. A theme card in the chat shows what changed.

const themeIdSchema = { type: "string", pattern: "^[a-z][a-z0-9-]{0,39}$", description: "The theme's id (slug)." };

const card = (t: Theme, isDefault: boolean): ThemeCard => ({ id: t.id, name: t.name, mode: t.mode, isDefault, colors: { primary: t.colors.primary, secondary: t.colors.secondary, accent: t.colors.accent, background: t.colors.background, foreground: t.colors.foreground }, fonts: { heading: t.fonts.heading.family, body: t.fonts.body.family }, logo: t.assets?.logo });

async function showThemes(ctx: ToolCtx, only?: string[]): Promise<ThemeSummary[]> {
  const summaries = await ctx.rpc<ThemeSummary[]>("listThemes");
  const picked = only ? summaries.filter((s) => only.includes(s.id)) : summaries;
  const docs = await Promise.all(picked.map((s) => ctx.rpc<Theme>("readTheme", [s.id])));
  ctx.widget({ type: "themes", items: docs.map((t, i) => card(t, !!picked[i]!.isDefault)) });
  return summaries;
}

/** A theme error as a list the agent can act on. */
const explain = (e: unknown): never => {
  if (e instanceof ThemeError) throw new ToolError(`The theme is not valid:\n- ${e.problems.join("\n- ")}`);
  throw e;
};

export const themeTools: Tool[] = [
  {
    name: "theme_guide",
    description: "How themes work and the JSON Schema of a theme document. Read this before creating or editing a theme.",
    inputSchema: { type: "object", properties: {} },
    run: async () => ({ guide: findDoc("themes")?.body ?? "See @supergrid/theme/SKILL.md.", schema: themeSchema }),
  },
  {
    name: "themes_list",
    description: "The workspace's themes as cards in the chat: name, mode, colors, fonts, and which one is the default that apps load.",
    inputSchema: { type: "object", properties: {} },
    run: (ctx) => showThemes(ctx),
  },
  {
    name: "theme_get",
    description: "One theme's full document. Omit id for the default. withCss adds the CSS variables it compiles to.",
    inputSchema: { type: "object", properties: { id: themeIdSchema, withCss: { type: "boolean" } } },
    run: async (ctx, { id, withCss }) => {
      const theme = await ctx.rpc<Theme>("readTheme", [typeof id === "string" ? id : null]);
      const summaries = await ctx.rpc<ThemeSummary[]>("listThemes");
      ctx.widget({ type: "themes", items: [card(theme, !!summaries.find((s) => s.id === theme.id)?.isDefault)] });
      return withCss ? { theme, css: themeToCss(theme) } : theme;
    },
  },
  {
    name: "theme_save",
    description: "Change a theme. Pass { id, patch } to merge a partial document over the existing theme (null removes an optional value), or { theme } with a full document to create or replace one. Shows the result as a card.",
    inputSchema: { type: "object", properties: { id: themeIdSchema, patch: { type: "object", description: "A partial theme document: only the branches to change." }, theme: { type: "object", description: "A full theme document (see theme_guide)." } } },
    run: async (ctx, { id, patch, theme }) => {
      let saved: ThemeRecord;
      try {
        if (theme && typeof theme === "object") saved = await ctx.rpc<ThemeRecord>("saveTheme", [parseTheme(theme)]);
        else {
          if (typeof id !== "string" || !patch || typeof patch !== "object") throw new ToolError("Pass { id, patch } or { theme }.");
          const base = await ctx.rpc<Theme>("readTheme", [id]);
          saved = await ctx.rpc<ThemeRecord>("saveTheme", [applyPatch(base, patch as Theme)]);
        }
      } catch (e) {
        explain(e);
      }
      await showThemes(ctx, [saved!.theme.id]);
      return saved!.theme;
    },
  },
  {
    name: "theme_create",
    description: "A new theme copied from another (default: the default theme). Give it a name; the id is derived unless you pass one. Set mode to dark to start a dark counterpart (brand colors are lightened a step). Then change it with theme_save.",
    inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string", maxLength: 60 }, id: themeIdSchema, from: themeIdSchema, mode: { enum: ["light", "dark"] } } },
    run: async (ctx, { name, id, from, mode }) => {
      const base = await ctx.rpc<Theme>("readTheme", [typeof from === "string" ? from : null]);
      const slug = typeof id === "string" ? id : str(name, "name").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "theme";
      const existing = await ctx.rpc<ThemeSummary[]>("listThemes");
      if (existing.some((t) => t.id === slug)) throw new ToolError(`A theme with id "${slug}" exists; pass another id.`);
      const doc: Theme = { ...base, id: slug, name: String(name), mode: mode === "dark" || mode === "light" ? mode : base.mode };
      if (mode && mode !== base.mode) {
        const dir = mode === "dark" ? 0.12 : -0.12;
        doc.colors = { ...base.colors, primary: shift(base.colors.primary, dir), secondary: shift(base.colors.secondary, dir), accent: shift(base.colors.accent, dir), background: mode === "dark" ? "#0b0b0f" : "#ffffff", foreground: mode === "dark" ? "#ededf0" : "#171717" };
      }
      let saved: ThemeRecord;
      try {
        saved = await ctx.rpc<ThemeRecord>("saveTheme", [parseTheme(doc)]);
      } catch (e) {
        explain(e);
      }
      await showThemes(ctx, [slug]);
      ctx.navigate(`library/themes/${slug}`);
      return saved!.theme;
    },
  },
  {
    name: "theme_set_default",
    description: "Make a theme the default: the one every app and page loads.",
    inputSchema: { type: "object", required: ["id"], properties: { id: themeIdSchema } },
    run: async (ctx, { id }) => {
      const out = await ctx.rpc<ThemeSummary[]>("setDefaultTheme", [str(id, "id")]);
      await showThemes(ctx);
      return out;
    },
  },
  {
    name: "theme_delete",
    description: "Remove a theme, after the user approves. The default theme cannot be removed.",
    inputSchema: { type: "object", required: ["id"], properties: { id: themeIdSchema } },
    run: async (ctx, { id }) => {
      const tid = str(id, "id");
      const a = await ctx.ask({ kind: "confirm", title: `Delete the ${tid} theme?`, danger: true, confirmLabel: "Delete" });
      if (!a.ok) return `The user kept the ${tid} theme.`;
      await ctx.rpc("removeTheme", [tid]);
      return { ok: true, id: tid };
    },
  },
];
