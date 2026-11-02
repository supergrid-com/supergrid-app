# @supergrid/ui

The base-ui design kit: the components the SuperGrid desktop app is built from (buttons, inputs, selects, dialogs, tables, tabs… 55 of them on [Base UI](https://base-ui.com) with Tailwind v4), themed at runtime by [`@supergrid/theme`](../theme/README.md).

An app **copies the kit in** and owns its copy: edit the components, add your own, delete what you do not use. The theme keeps working as long as components read the variables and not hard-coded colors.

## Put it in an app

```bash
cp -r core/packages/ui/src app/components/ui       # the components, utils.ts and tokens.css
```

```css
/* app/app.css */
@import "tailwindcss";
@import "./components/ui/tokens.css";
```

```tsx
// app/root.tsx: the theme the workspace serves, on every page
<link rel="stylesheet" href="/_ws/theme.css" />
```

Dependencies the kit expects in the app: `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tailwindcss` (and `@daypicker/react` for the calendar). The components import each other relatively (`./button`), so the folder can live anywhere.

## How theming works

The theme is CSS variables. `tokens.css` maps them onto Tailwind's theme (`--color-primary: var(--primary)` and so on), so `bg-primary`, `text-muted-foreground`, `rounded-lg`, `font-heading`, `p-4` all follow the workspace theme at runtime. Three things to know:

1. **Colors** come from `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, the derived greys (`--muted`, `--border`, `--input`, `--ring`) and status colors. Ramps are `--sg-primary-500`, `--sg-neutral-200`, `--sg-<custom>-700`.
2. **Shape** is `--radius` (and `--radius-button`, `--radius-input`, `--radius-card`) and `--spacing`, Tailwind's base unit: a `tight` theme makes every `p-4` smaller.
3. **Buttons and inputs** also honor a few knobs the theme exposes (`--sg-button-weight`, `--sg-button-transform`, `--sg-input-bg`…). `tokens.css` applies them through the components' `data-slot` attributes, so the components themselves stay untouched; keep `data-slot="button"` on anything that should behave like a button.

`tokens.css` ends with a `:root` fallback equal to the default theme, so a page looks right before `/_ws/theme.css` loads or when it is missing.

## Rules for components you add or change

- Use the token utilities (`bg-card`, `text-foreground`, `border-border`, `bg-primary text-primary-foreground`), never a literal color or a Tailwind palette color. If you need a tint, use a ramp step: `bg-[var(--sg-primary-50)]`.
- Use `rounded-lg` / `rounded-xl` (they derive from `--radius`), never a literal radius.
- Fonts: `font-sans` for text, `font-heading` for headings, `font-accent` for eyebrows and quotes, `font-mono` for code.
- Dark mode is a property of the theme, not of the page: the `dark:` variant still works (the workspace puts `.dark` on `html` when the default theme is dark), but every token already changes with the theme, so most components need no `dark:` rules at all.
- Status and emphasis: `success`, `warning`, `destructive`, `info` tokens and the badge/alert variants that use them.

## Keeping the kit and the desktop app in step

The desktop app's `components/ui` is the source. `pnpm -s ui:sync` from `core/` copies it here with relative imports and regenerates `tokens.css`'s fallback from the default theme. Run it after changing a component in the app.

## Preview

The Design page in the desktop app renders this kit inside a themed region, so every theme is judged on the real components. Open a workspace → Design.
