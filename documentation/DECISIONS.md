# Decisions

Context: this was built against the take-home brief. Part 1 (the reviewer picker) and
Part 2 (tokens, theming and the inherited `cw-status-badge`) are implemented; the focused
test suite and `ADOPTION.md` are the next steps and are tracked in the submission notes.

Legend: "APG" is the W3C WAI **ARIA Authoring Practices Guide**. It is guidance, not a
norm. The normative references used here are WAI-ARIA 1.2 (`combobox` role), HTML-ARIA
(which roles an element may carry) and Core-AAM (how browsers expose them).

---

## 1. The picker is a select-only combobox, and focus never leaves the trigger

**Decision.** `cw-select` implements the APG _select-only combobox_ pattern: the trigger is
a `div[role="combobox"][tabindex="0"]` that keeps DOM focus for the whole interaction and
points at the active option with `aria-activedescendant`; the popup is a `listbox` of
`option`s. Chosen over the "button + listbox that takes focus" reading of the same widget.

**Why.** Each required behaviour maps onto one part of this pattern, and the mapping is
checked against the spec rather than guessed:

| Requirement                                 | What the pattern gives it                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| AT knows what the control is                | `role="combobox"`                                                                                                                           |
| AT knows the current value                  | the combobox's own value: text content when the host has no value of its own (ARIA requires user agents to expose one; see `w3c/aria#1225`) |
| AT knows a list opened                      | `aria-expanded` + `aria-controls` pointing at the listbox id                                                                                |
| AT knows which option is active             | `aria-activedescendant`, plus `aria-selected` on the selected option                                                                        |
| "Focus is never lost to the document"       | by construction: DOM focus stays on one element, so there is no focus to trap and none to restore                                           |
| Dismissing returns focus somewhere sensible | nothing to restore: the trigger still has it                                                                                                |

The alternative (a `button` with `aria-haspopup="listbox"`, focus moved into the popup and
`aria-activedescendant` on the listbox) also works, but it deletes the two properties above
that are hardest to get right: with focus inside the popup you own save/restore, `Tab`
inside the list, and click focus. Note also that `aria-activedescendant` is only valid when
the focused element's role is `combobox`, `textbox`, `group`, `application` or a composite
widget — so a plain `button` cannot use it at all.

**What would change if we had chosen the other pattern.** The trigger becomes
`button[aria-haspopup="listbox"]`, the listbox takes focus on open and gets
`aria-activedescendant`, the keyboard handler splits in two (trigger vs list), and the focus
tests change from "the focus never moved" to "the focus moved in and came back".

**Host element.** `div[role="combobox"]` was preferred over `input[readonly]` (native focus
and `disabled`, but AT announces "read only" and the caret has to be tamed) and over
`button[role="combobox"]` (native activation, but the value has to come from content). A div
is not a labelable element, so the label is wired with `aria-labelledby` rather than
`<label for>` — which is why this is an explicit decision and not a detail.

## 2. Value handling is a `ControlValueAccessor`; signals inside

**Decision.** The component implements `ControlValueAccessor` and keeps its state in signals.

**Why.** One source of truth for the value (the Angular forms API), and it works with
`[formControl]`, `formControlName` and `[(ngModel)]` — reactive and template-driven, as the
brief allows — including disabled state and touched/dirty. Signal Forms are experimental in
Angular 21 (stable in 22) and would force consumers onto `Field` or a compat layer, which is
a bad trade for a shared kit whose consumers are on classic forms.

**Alternatives considered.** (a) Signal Forms: the component would expose signal inputs plus a
`touch` output and the workbench would migrate to `form()`. (b) A parallel `value` `model()`
input for form-less usage: tempting for a design system, but it creates a second source of
truth and a write loop (`writeValue` → `valueChange` → `onChange` → …) that has to be broken
with a flag. If it is ever needed, a `fromForm` guard is the cheap way to add it without
changing the form contract.

## 3. Options are data, not projected content

**Decision.** `[options]` takes `readonly CwSelectOption[]` (`value`, `label`,
`description?`, `disabled?`). No `cw-select-option` child component.

**Why.** The component owns ids, the active option and type-ahead, so it needs the labels in
memory. With projection, type-ahead would either read the DOM or require a second `label`
input per option; ids would have to be reconciled against queried children; and gating the
popup with `@if` would destroy and re-create projected content on every open/close.

**Alternative considered.** Projection with an optional `optionTemplate` for rich option
rendering. Projection buys arbitrary per-option markup and costs all of the above. The middle
ground — keep the data model and let a template override the row rendering — is the natural
next iteration and does not change this API.

## 4. Typing jumps to a match; it does not filter the list

**Decision.** Printable characters open the list if needed and move the active option to the
first match (buffered keystrokes, `Space` opens instead of typing).

**Why.** It is what a native `<select>` does and what the APG select-only combobox specifies.
The popup stays a plain `listbox` (a `textbox` inside a `listbox` is not valid), the value
keeps belonging to a closed set of options, and there is no query state, no "no results"
state and no live result count to maintain.

**Alternative considered.** An editable combobox that filters as you type. It is genuinely
better for discovering one option among hundreds, and it is the honest cost of this decision.
Choosing it would mean: `aria-autocomplete="list"`, an `aria-live` announcement of the number
of results, a decision about what the control's value is while text is typed (a free-text
value would break the closed set), and clearing the query on close/Escape.

## 5. Theming: semantic roles re-pointed by a theme, with component tokens as the seam

**Decision.** Three levels: primitives (supplied, raw) → semantic roles (`_semantic.scss`) →
themes (`_themes.scss`, which only re-points roles). Components read roles and bind them to
their own custom properties. A theme is selected with `data-cw-theme="dark"` (or `"light"`)
on any element.

**Why.** The dark theme is ~40 lines of re-pointing and **zero** component changes, which is
what makes a second theme cheap. Putting the attribute on any element (rather than only on
`:root`) means a theme can be scoped to a sub-tree, which matters when two versions of the kit
end up on one page. `color-scheme` is set alongside the tokens so native UI follows.

**Rule that came out of measuring, not taste:** on dark, _no_ filled state reaches 3:1 against
the popup surface (`blue-800` 1.11:1, `gray-700` 1.37:1, `blue-600` 1.96:1). So the active
option is indicated by a **ring** (`--cw-focus-ring-color`, 7.56:1 on dark) and the selected
option by a **fill** (`blue-400` on `gray-800` = 3.53:1, text on it 4.5:1). Contrast figures for
every role are in the stylesheets next to the definitions.

**Alternatives considered.** A class-based theme on `:root` (fights with consumer classes and
cannot be scoped); per-component token files with no semantic layer (every theme forks every
component); `prefers-color-scheme` only (no way for a consumer to choose).

**Kept honest by a test.** `tokens.guard.spec.ts` fails if a component or app stylesheet
contains a colour literal, a primitive colour token, `!important` or `::ng-deep`, if a file
outside `_primitives.scss` contains a colour literal, or if a theme forgets a colour role the
default theme defines. It was verified by breaking it on purpose.

## 6. `cw-status-badge` changes its API — a breaking change to a shared library

**Decision.** Five mutually-exclusive-pretending-to-be-independent inputs collapse into two:
`status: 'ready' | 'processing' | 'error' | 'unknown'` and `size: 'sm' | 'md' | 'lg'`.
`label` becomes optional with a humanised default, `tooltip` becomes optional, and a new
`live` input opts into `role="status"`. The text stops being `aria-hidden`.

**Why.** `[isReady]="true" [isError]="true"` compiled before and rendered whatever the class
string happened to produce; the single input makes that unrepresentable. And the supplied
component hid its only text from assistive technology while encoding state in a dot colour —
for a screen reader the badge said nothing at all. Contrast went from 2.35:1 to 8.88:1
(neutral) with the semantic roles.

**Alternatives considered.** (a) A generic `tone: 'neutral' | 'success' | ...` API, which is
more reusable for a kit in the abstract but loses the domain meaning the brief gives this
component and would force every consumer to own the mapping; adding `tone` on top later is
possible without breaking `status`. (b) A transitional release keeping the booleans as
`@deprecated` with a console warning: friendlier for consumers already in production, but it
requires defining precedence between `status` and the booleans, which is exactly the ambiguity
this change removes. With many consumers already shipping, I would take the deprecation route;
here the honest option is one clean major plus a migration table in `ADOPTION.md`.

---

## Smaller decisions (append-only)

- **Navigation does not commit.** The value changes on `Enter`, `Space`, `Tab`, `Alt+ArrowUp`
  or click, and not at all on `Escape` or an outside click. The APG example commits on blur; not
  committing keeps "dismiss without changing the selection" true for every dismissal.
- **Unavailable options are skipped by navigation** (like a native `<select>`) but stay in the
  list and are announced with `aria-disabled="true"`.
- **`aria-activedescendant` is removed while the popup is closed**, and the active option is
  scrolled into view (`scrollIntoView` guarded with `?.` so jsdom tests stay honest).
- **The popup is positioned inside the host** (`position: absolute`, no top layer). Collision
  and flip handling are out of scope; in a container with `overflow: hidden` it will clip, and
  that is the known limitation recorded in the submission notes.
- **Ids are unique per instance** (`cw-select-<n>-…`), because two pickers on one page is a
  normal case and duplicate ids would break `aria-activedescendant` silently.
- **`data-status` / `data-size` on the host are the public styling hooks**; the class names
  inside the components are internal and free to change.
- **Colour is a role; geometry is a primitive.** Component styles must not contain a colour
  literal, but they may use `--cw-space-*`, `--cw-radius-*` and `--cw-font-*` directly. A blanket
  "no primitives" rule would be stricter than the problem and would make those primitives
  unusable.
- **The workbench themes itself with the same tokens** and flips themes through the same
  attribute a consumer would, so the demo cannot drift from the documented mechanism.
- **`@types/node` was added as a devDependency** so the token guard can read stylesheet
  sources as a normal unit test. The alternative tried first — reading the sources through the
  bundler (`import.meta.glob` with `?raw`) — returns compiled CSS for `.scss` in this pipeline,
  which would have made the guard silently vacuous. Runtime cost: none (dev-only types).
- **`label` is a required input on `cw-select`.** The brief requires the control to be
  labelled; a kit that lets that be forgotten will have unlabelled controls in production.

## Deliberately not done

- Multi-select, async options, virtual scrolling, popup collision/flip: explicit scope cuts.
- Validation UI (error messages, `aria-describedby` plumbing): `invalid` only sets
  `aria-invalid`; validation belongs to the form.
- Storybook and packaging: out of scope for the exercise, and the distribution story is
  described in `ADOPTION.md` instead.
