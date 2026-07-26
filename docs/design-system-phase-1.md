# Phase 1 Frontend Audit And Design System

## Scope

This phase audits the existing frontend and establishes reusable design-system foundations. It does not redesign page layouts, change backend code, or alter business logic.

## Frontend Audit

### Duplicate Styles

- Page shells repeat `max-w-7xl`, `px-4 sm:px-6 lg:px-8`, and vertical section padding across navigation, footer, landing, legal, and authenticated layouts.
- Repeated card primitives appear as `rounded-md border bg-background p-3`, `rounded-lg border bg-card p-4`, and `rounded-md border p-4` in dashboard, settings, security, analytics, and legal pages.
- Interactive list/menu items repeat `rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground`.
- Icon containers repeat `grid h-10 w-10` or `grid h-11 w-11 place-items-center rounded-md`.
- Focus styles are mostly consistent but duplicated in local buttons, links, menu items, and global base rules.

### Inconsistent Colours

- The previous global theme used a blue/slate/green palette while the desired brand palette is warm neutral/brown.
- Semantic status colors existed only for `success` and `warning`; `danger`, `info`, and explicit primary hover tokens were missing.
- `secondary`, `muted`, and `accent` were doing too much visual work, which makes future redesign decisions harder to keep consistent.
- `index.html` still used the old blue theme color for browser UI.
- Google brand SVG colors are intentionally hard-coded because they represent third-party brand colors.

### Inconsistent Spacing

- Containers are generally consistent but implemented directly rather than through a reusable page container token.
- Section spacing ranges from `py-10` to `py-24` without named semantic tiers.
- Card internals commonly use `p-3`, `p-4`, `p-5`, `p-6`, and `sm:p-8` with no documented density model.
- Dashboard and settings controls share similar spacing needs but implement them independently.

### Typography Issues

- Inter is configured, but there was no documented type scale or utility classes for display, title, body, and caption text.
- Headings use direct Tailwind sizes per page, usually `text-3xl font-bold`, while landing/legal pages use larger one-off heading sizes.
- Body copy generally uses `leading-7`, `leading-6`, or browser defaults without named text roles.
- Letter spacing is mostly neutral, which is good; uppercase helper text uses tracking for labels and should be standardized later.

### Component Inconsistencies

- Button, input, card, badge, dialog, switch, and table primitives exist, but page code still recreates select, textarea, menu item, segmented control, and icon tile styles.
- Repeated dashboard/settings/security preference rows are not yet represented by a shared component.
- Landing navigation and authenticated navigation share visual patterns but are implemented separately.
- Cards use `rounded-lg` by default while most inner controls use `rounded-md`; this is acceptable but should remain token-driven.

### Responsive Issues

- Main containers are responsive, but repeated direct container classes make future width changes easy to miss.
- Several dense dashboard actions rely on many icon buttons in a row and should be reviewed in Phase 2 for small-screen overflow and action grouping.
- Tables use horizontal overflow, which is appropriate, while mobile card alternatives exist for analytics/dashboard areas.
- Hero and CTA sections should be rechecked later after page redesign, especially for text wrapping and card density.

### Accessibility Problems

- Positive patterns: skip link, `aria-label`, `aria-live`, table captions, dialog semantics, reduced-motion handling, and tooltip-backed icon buttons are already present.
- Risk areas: custom dropdown/menu behavior should be keyboard-audited for roving focus and expected menu semantics.
- Disabled placeholder settings may need explanatory text or hidden status context if retained in future phases.
- Tooltip content is hover/focus visible but should be verified for touch workflows and collision handling in later component work.
- Focus rings are global and generally consistent, but local duplicated rings should migrate to a shared utility.

### Repeated CSS

- Repeated focus ring, surface, card, icon tile, page container, nav item, menu item, and status badge styles are candidates for shared primitives.
- Recharts components already consume CSS variables, which is good and should continue.
- Existing shadcn-style primitives are the right anchor point for the design system.

### Pages Outside The Shared Design Language

- Landing page is more marketing-like and uses a preview card/CTA treatment that differs from the authenticated product UI.
- Legal pages use simpler content styling and side navigation, which is reasonable but needs token alignment.
- Dashboard, analytics, security, settings, and dashboard settings share a utilitarian app language but duplicate many control rows and panel treatments.
- Auth pages are componentized through `AuthForm`, but their form density and success/status surfaces should be standardized later.

## Redesign Plan For Later Phases

1. Migrate page containers to `.container-page` or `max-w-container-page` where appropriate.
2. Introduce shared primitives for page headers, section headers, settings rows, menu items, icon tiles, segmented controls, empty states, and notice/toast surfaces.
3. Replace repeated direct typography classes with `text-display`, `text-title-*`, `text-body`, `text-body-sm`, and `text-caption` where the visual role is clear.
4. Normalize dashboard, analytics, settings, and security pages around the same app layout density before touching landing/legal pages.
5. Audit custom menus and dropdowns for keyboard behavior, focus return, Escape behavior, and pointer/touch parity.
6. Run responsive and accessibility tests after each page migration.

## Design System Tokens

### Colour Tokens

Light mode:

- `background`: `#F8F6F2`
- `card/surface`: `#FFFFFF`
- `secondary/muted/accent surface`: `#F3EFE8`
- `foreground`: `#2E241B`
- `muted-foreground`: `#6C5B4F`
- `border/input`: `#DDD2C4`
- `primary`: `#9A6B3F`
- `primary-hover`: `#7D5430`
- `success`: `#2E8B57`
- `warning`: `#D89B29`
- `danger/destructive`: `#C94C4C`
- `info`: `#5A7DAA`

Dark mode:

- `background`: `#14100C`
- `card/surface`: `#1E1712`
- `secondary/muted/accent surface`: `#2A211A`
- `foreground`: `#F7F3EE`
- `muted-foreground`: `#C4B5A5`
- `border/input`: `#3B3027`
- `primary`: `#C89A6B`
- `primary-hover`: `#D9AE83`
- `success`: `#45B97C`
- `warning`: `#E2B74C`
- `danger/destructive`: `#E56A6A`
- `info`: `#88AEDD`

### Typography Tokens

- Font family: Inter first, Geist fallback, then system sans.
- Mono family: JetBrains Mono first, then system monospace.
- Scale: `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `6xl`.
- Utility roles: `.text-display`, `.text-title-1`, `.text-title-2`, `.text-title-3`, `.text-body`, `.text-body-sm`, `.text-caption`.

### Spacing Tokens

- Base spacing follows Tailwind's 4px grid.
- Added named extension points: `18` and `22`.
- CSS variables expose `--space-1` through `--space-24` for non-Tailwind surfaces.

### Radius Tokens

- `xs`: 4px
- `sm`: 6px
- `md`: 8px
- `lg`: 12px
- `xl`: 16px
- `full`: 9999px

### Shadow Tokens

- `shadow-xs`: subtle elevation
- `shadow-sm`: low control/card elevation
- `shadow-soft`: medium panel elevation
- `shadow-panel`: high overlay/panel elevation

### Motion Tokens

- `duration-fast`: 120ms
- `duration-base`: 180ms
- `duration-slow`: 260ms
- `ease-standard`: cubic-bezier(0.2, 0, 0, 1)
- Reduced-motion handling remains in global CSS.

### Border Tokens

- `border`: semantic border color
- `input`: form border color
- `border-hairline`: 1px
- `border-strong`: 2px

### Icon Tokens

- Current standard sizes in use: 16px, 20px, 24px, 40px icon tiles, 44px action targets.
- Phase 2 should convert repeated icon tile classes into a shared primitive.

### Container Tokens

- `container-sm`: 40rem
- `container-md`: 48rem
- `container-lg`: 64rem
- `container-xl`: 80rem
- `container-page`: 80rem
- `.container-page`: centered page wrapper with 1rem side gutters.

### Z-Index Tokens

- `hide`: -1
- `base`: 0
- `docked`: 10
- `dropdown`: 20
- `sticky`: 30
- `overlay`: 40
- `modal`: 50
- `toast`: 60
