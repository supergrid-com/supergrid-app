// The theme document as JSON Schema, for agents (the MCP `theme_guide` tool returns it) and editors.
const hex = { type: "string", pattern: "^#[0-9a-fA-F]{6}$", description: "A hex color, #rrggbb." };
const font = {
  type: "object",
  required: ["family"],
  additionalProperties: false,
  properties: {
    family: { type: "string", maxLength: 120, description: "A Google Fonts family (Inter, Playfair Display…), a system stack, or the name under a custom url." },
    provider: { enum: ["google", "system", "custom"], description: "Where it loads from. Omit for a Google family." },
    weights: { type: "array", items: { type: "integer", minimum: 100, maximum: 900 }, description: "Google weights to load; default 400, 500, 600, 700." },
    url: { type: "string", format: "uri", description: "Stylesheet URL for a custom font." },
  },
};
const asset = { type: ["string", "null"], maxLength: 400000, description: "An https URL, a /path on the workspace, or a data:image URL. null removes it." };
const shapeRadius = { enum: ["theme", "pill", "square"] };

export const themeSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://supergrid.dev/schemas/theme.json",
  title: "SuperGrid theme",
  description: "What a workspace's apps share about how they look. Compiles at runtime to CSS variables; components never change.",
  type: "object",
  required: ["id", "name", "mode", "fonts", "colors", "radius", "spacing"],
  additionalProperties: false,
  properties: {
    id: { type: "string", pattern: "^[a-z][a-z0-9-]{0,39}$", description: "Slug, unique in the workspace. Cannot change after creation." },
    name: { type: "string", maxLength: 60 },
    mode: { enum: ["light", "dark"], description: "Whether the background is light or dark. Drives color-scheme and the derived greys." },
    fonts: {
      type: "object",
      required: ["heading", "body"],
      additionalProperties: false,
      properties: { heading: font, body: font, accent: { ...font, description: "Optional: eyebrows, quotes, labels. Falls back to heading." }, mono: { ...font, description: "Optional: code. Falls back to a system monospace." } },
    },
    colors: {
      type: "object",
      required: ["primary", "secondary", "accent", "background", "foreground"],
      additionalProperties: false,
      properties: {
        primary: { ...hex, description: "The brand color: primary buttons, links, focus rings." },
        secondary: { ...hex, description: "Second brand color: secondary buttons, highlights." },
        accent: { ...hex, description: "Sparing emphasis: badges, callouts, active nav." },
        background: { ...hex, description: "Page background." },
        foreground: { ...hex, description: "Body text on the background." },
        success: hex, warning: hex, danger: hex, info: hex,
        custom: { type: "object", maxProperties: 16, propertyNames: { pattern: "^[a-z][a-z0-9-]{0,29}$" }, additionalProperties: { ...hex, type: ["string", "null"] }, description: "Named extras, each with a generated 50–950 ramp (--sg-<name>-500). null removes one." },
      },
    },
    radius: { enum: ["none", "sm", "md", "lg", "xl", "full"], description: "Corner rounding for everything; buttons and inputs can override." },
    spacing: { enum: ["tight", "normal", "relaxed"], description: "Scales every padding and gap." },
    buttons: {
      type: "object",
      additionalProperties: false,
      properties: { radius: shapeRadius, weight: { enum: ["medium", "semibold", "bold"] }, uppercase: { type: "boolean" }, tracking: { type: "number", minimum: -0.05, maximum: 0.3, description: "Letter spacing in em." }, shadow: { type: "boolean" } },
    },
    inputs: { type: "object", additionalProperties: false, properties: { style: { enum: ["outline", "filled"] }, radius: shapeRadius } },
    assets: { type: "object", additionalProperties: false, properties: { logo: asset, logoDark: asset, favicon: asset, icon: asset, ogImage: asset } },
    notes: { type: ["string", "null"], maxLength: 4000, description: "What the theme is for and what to leave alone. Read it before editing." },
  },
} as const;
