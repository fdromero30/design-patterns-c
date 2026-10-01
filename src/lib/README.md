# The kit (`src/lib`)

This is the kit's own documentation: its public API, theming and contribution rules, for the
teams that consume it. To run the application see [`../README.md`](../README.md); the reasoning
behind the design is in
[`../documentation/DECISIONS.md`](../documentation/DECISIONS.md).

Everything a consumer needs is re-exported from [`public-api.ts`](./public-api.ts). Consumers
import from there and never reach into a component folder.

```ts
import { CwSelect, StatusBadge } from '../lib/public-api';
import type { CwSelectOption, CwStatus } from '../lib/public-api';
```

## Components

### `cw-select` — single-select picker

```html
<cw-select label="Reviewer" [options]="reviewerOptions" [formControl]="reviewerId" />
```

- **Generic.** It knows nothing about reviewers: `{ value, label, description?, disabled? }`.
- **Value.** It is a `ControlValueAccessor`: use `[formControl]`, `formControlName` or
  `[(ngModel)]`; disabled state and touched/dirty come from the form control. There is no
  second `value` input on purpose — one source of truth.
- **Keyboard.** `Down`/`Up`/`Home`/`End`/`Enter`/`Space`/`Alt+Down` open; `Down`/`Up`,
  `Home`/`End`, `PageUp`/`PageDown` move and skip unavailable options; printable characters open
  and jump to the first match; `Enter`/`Space`/`Tab`/`Alt+Up`/click commit and close;
  `Escape` and an outside click close without changing the value.
- **Accessibility.** Select-only combobox (APG): `role="combobox"`, `aria-expanded`,
  `aria-controls`, `aria-activedescendant`, popup of `role="option"` with `aria-selected` and
  `aria-disabled`. DOM focus stays on the trigger, so focus is never lost and never restored.
- **Deliberately out of scope:** multi-select, async options, virtual scrolling, popup
  collision/flip and filtering by text.

### `cw-status-badge` — engagement processing state

```html
<cw-status-badge status="ready" />
<cw-status-badge status="processing" size="sm" [tooltip]="'Still preparing'" />
```

- `status`: `ready` | `processing` | `error` | `unknown`; `size`: `sm` | `md` | `lg`.
- `label` defaults to the humanised status; pass it only to change the wording, and keep the
  wording descriptive — the text is what assistive technology reads, the dot is decoration.
- `live` opts into `role="status"` (off by default: a list of badges would be one live region
  each).
- `data-status` and `data-size` on the host are the stable hooks for consumer styling; the
  class names inside are internal.

## Screenshots

Screenshots of each component, in both themes, live in
[`../../documentation/images/`](../../documentation/images) (see the shot list there). The markup
below is ready and commented out until the files exist:

<!--
| Component | Default theme | Alternative theme |
| --- | --- | --- |
| `cw-select` | ![cw-select with a value selected](../../documentation/images/cw-select-closed.png) | ![cw-select open in the alternative theme](../../documentation/images/cw-select-open.png) |
| `cw-status-badge` | ![The four badge statuses](../../documentation/images/cw-status-badge-light.png) | ![The four badge statuses in the alternative theme](../../documentation/images/cw-status-badge-dark.png) |
-->

## Theming

The kit is built on three token levels in [`tokens/`](./tokens):

1. `_primitives.scss` — raw values (`--cw-blue-600`). What a value **is**.
2. `_semantic.scss` — roles (`--cw-color-text-muted`). What a value is **for**. Components
   consume this level and nothing else.
3. `_themes.scss` — a theme only re-points roles. `[data-cw-theme='dark']` (or `'light'`) on any
   element switches it, including for a sub-tree only.

```html
<html data-cw-theme="dark"></html>
```

- `tokens.scss` is loaded once from `src/styles.scss`; a consumer app imports nothing else.
- Each component declares its own custom properties on `:host`, bound to roles
  (`--cw-status-badge-fg`), so a consumer or a theme can override a component without touching
  its stylesheet.
- **Rules:** colour comes from the semantic layer (never a literal, never a primitive);
  spacing, radii and type may use primitives, because they are geometry rather than theme.
  `tokens.guard.spec.ts` fails the build on violations, and on a theme that forgets a colour
  role.
- Contrast is part of the review, so every role documents its measured ratio next to the
  definition. Note the dark theme rule that came out of those measurements: the active option is
  indicated by a focus ring (a dark fill cannot reach 3:1 against the popup), the selected
  option by a fill.

## Contributing a component

1. Keep the public surface in `public-api.ts`; export types with `export type`.
2. Consume semantic roles only, and expose component tokens if the component is styleable.
3. Prefer a required input over one that can quietly be forgotten (a control that must be
   labelled has a required `label`).
4. Document the ARIA pattern in the class comment, including what was deliberately left out.
5. Run `npm test -- --watch=false` before proposing the change.

One source of truth: this file owns the kit's API and theming rules; the repository README links
here instead of describing them again.
