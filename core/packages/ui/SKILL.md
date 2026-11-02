---
name: supergrid-ui
description: Build app screens with the SuperGrid base-ui kit (app/components/ui) so they follow the workspace theme at runtime. Use when adding or changing UI in a SuperGrid app, picking components, or styling anything.
---

# Building UI in a SuperGrid app

The app has a copy of the base-ui kit in `app/components/ui` (55 components on Base UI + Tailwind v4) and loads the workspace theme as CSS variables from `/_ws/theme.css`. You own the copy: change components, add new ones. What you must not do is hard-code looks.

## Use the kit first

`Button`, `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `NumberField`, `Field`/`Label`, `Form`, `Card`, `Dialog`, `AlertDialog`, `Sheet`, `Drawer`, `Popover`, `Tooltip`, `Menu`, `ContextMenu`, `Tabs`, `Accordion`, `Collapsible`, `Table`, `Pagination`, `Badge`, `Alert`, `Toast` (`toastManager.add`), `Avatar`, `Progress`, `Meter`, `Skeleton`, `Spinner`, `Separator`, `Kbd`, `Breadcrumb`, `Empty`, `ScrollArea`, `Sidebar`, `Toolbar`, `ToggleGroup`, `SegmentedControl`, `Calendar`. Import from `~/components/ui/<name>`.

Buttons: `variant` default | secondary | outline | ghost | link | destructive; `size` xs | sm | default | lg | icon. Badges and alerts carry `success` | `warning` | `error` | `info` variants.

## Styling rules

- Colors only through tokens: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary text-primary-foreground`, `bg-secondary`, `bg-accent`, `text-destructive`, `bg-success/10`… Ramps when you need a tint: `bg-[var(--sg-primary-50)]`, `text-[var(--sg-neutral-700)]`, custom colors `bg-[var(--sg-teal-500)]`.
- No literal hex, no `bg-blue-500`, no `rounded-[8px]`, no `font-[Inter]`. These break the moment the theme changes.
- Corners: `rounded-md` / `rounded-lg` / `rounded-xl` / `rounded-2xl` (all derive from the theme radius). Spacing: ordinary `p-*`, `gap-*` (the theme scales them).
- Fonts: `font-heading` on headings, `font-accent` for eyebrows and pull quotes, `font-mono` for code; body text needs no class.
- Write no `dark:` rules unless something is wrong in a dark theme: every token already changes with the theme.
- New components: copy the nearest kit component, keep its `data-slot` attribute, build with tokens.

## The theme itself

Fonts, colors, radius, spacing, button and input looks and assets (logo, favicon) live in the workspace theme, edited on the Design page or with the `supergrid` MCP tools (`theme_guide` explains them). When a request is about the look of everything ("make it teal", "rounder", "use a serif"), change the theme, not the components.

Loading: `<link rel="stylesheet" href="/_ws/theme.css">` in the root layout, or `workspace.readTheme()` in a loader + `themeToCss()` from `@supergrid/theme` to inline it. `theme.assets.favicon` and `theme.assets.logo` for the head and the header.
