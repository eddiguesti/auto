# Easy Memoir Design System — "Keepsake"

The product is a memoir-writing app for seniors and their families. Every screen
must feel **calm, warm, premium, and effortless** — a keepsake, not a dashboard.
Reference quality: Apple, Linear, Stripe, Claude. Restraint over decoration.

## Non-negotiable principles

1. **One primary action per screen.** Ink-colored button. Everything else is quiet.
2. **Typography carries hierarchy** — not color, not boxes. Boska (font-display)
   for headlines, General Sans for UI, Lora (`.prose-memoir` / `font-serif`) for
   story content only.
3. **Senior-friendly:** body text ≥ `text-base` (17px), touch targets ≥ 44px,
   real labels (no icon-only for critical actions), high contrast.
4. **Whitespace is the layout.** 8pt grid. Section gaps `mb-10`/`mb-12`. Never cramped.
5. **Motion reinforces, never decorates.** `page-enter` on page roots,
   `stagger-item` on list entrances, `card-hover` on interactive cards. 200–350ms.
   Reduced-motion is handled globally — never add infinite attention-seeking animation.
6. **Progressive disclosure.** Hide complexity until asked for. Remove UI that
   duplicates another path to the same action.

## Color — use ONLY these tokens

- Surfaces: `bg-parchment` (page), `bg-surface` (cards), `bg-cream` (subtle wells),
  `bg-sepia-50/100` (tinted wells)
- Text: `text-ink` (headings/emphasis), `text-ink-soft` (body), `text-sepia-600`
  (secondary), `text-sepia-500` (tertiary/meta). Never lower contrast than sepia-500
  for meaningful text.
- Borders: `border-sepia-200` (default), `border-sepia-300` (hover)
- Accent (progress, links, highlights, active states): `bronze-400…700`.
  Use sparingly — bronze is the jewelry, not the wardrobe.
- Semantic: `success`/`warning`/`error`/`info` each with `-soft` (bg) and
  `-strong` (text on soft bg). e.g. `bg-error-soft text-error-strong`.
- **Banned:** raw Tailwind palette colors (`amber-600`, `green-50`, `violet-500`,
  `blue-*`, `purple-*`, `stone-*`, `gray-*`…), hex values in JSX, the legacy
  `heritage-*`/`warmgray`/`primary`/`accent`/`secondary` aliases in redesigned code,
  and multi-hue gradients. Gradients only within the bronze ramp or surface tints.

## Components — always use the kit (`src/components/ui`)

```js
import {
  Button,
  Card,
  Field,
  Input,
  Textarea,
  Modal,
  ProgressBar,
  ProgressRing,
  Badge,
  Skeleton,
  EmptyState
} from '../components/ui' // adjust path
import AppShell from '../components/layout/AppShell'
```

- `Button` — variants: `primary` (ink, one per screen), `secondary`, `accent`
  (bronze, upgrade/celebration only), `ghost`, `danger`. Sizes `sm|md|lg|xl`.
  Props: `to` (renders Link), `href`, `loading`, `icon`, `iconRight`.
  Never hand-roll a button.
- `Card` — `interactive` + `to`/`onClick` for navigation cards (auto hover-lift).
- `Field`/`Input`/`Textarea` — all forms. `<Field label error hint>{(id, describedBy) =>
<Input id={id} aria-describedby={describedBy} … />}</Field>`
- `Modal` — all dialogs. Props: `onClose`, `title`, `eyebrow`, `size`, `dismissable`.
  Bottom-sheet on mobile, centered on desktop; focus trap + Esc built in.
- `ProgressBar`/`ProgressRing` — all progress. Bronze fill, never rainbow gradients.
- `Badge`, `Skeleton`, `EmptyState` — statuses, loading shapes, empty screens.
- `AppShell` — wrap every authenticated app page:
  `<AppShell>` on Home; `<AppShell back="/home" title="Chapter title">` on subpages.
  Remove per-page ad-hoc headers/back buttons/settings gears.

## Icons

`@tabler/icons-react` only — no inline `<svg>` paths in pages.
`<IconPencil size={20} stroke={1.75} />` for UI, `size={24} stroke={1.5}` for
feature icons in 44px tinted squares: `bg-sepia-100 text-sepia-600 rounded-xl`
(bronze tint reserved for the primary feature of the screen).

## Patterns

- Page root: `page-enter` class; heading block first:
  `<h1 className="text-3xl sm:text-4xl font-display text-ink">` + one-line
  `text-sepia-600` subtitle. Optional `eyebrow` label above.
- Error banners: `bg-error-soft text-error-strong rounded-xl p-4 text-sm` with
  an `IconAlertCircle`. Always recoverable — offer a retry where applicable.
- Loading: page-shaped `Skeleton` compositions, never spinners on content areas.
- Empty states: `EmptyState` with one clear action.
- Radii: cards `rounded-2xl`, modals `rounded-3xl`, buttons `rounded-full`,
  inputs `rounded-xl`. Shadows: `shadow-soft` resting, `shadow-lifted` hover,
  `shadow-modal` overlays. No heavy borders, no `shadow-2xl`.

## What NOT to change

Behavior. Every handler, route, analytics call, API call, a11y attribute, and
piece of copy logic stays. This is a visual/markup redesign — components must
remain drop-in compatible (same props, same exports). Do not add dependencies.
Do not delete features; simplification means visual de-emphasis, not removal.
