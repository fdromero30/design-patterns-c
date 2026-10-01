# Adoption

## Versioning and releasing the `cw-status-badge` change

The change to `cw-status-badge` is **breaking** and should ship as a major of the kit
(`1.x → 2.0.0`; if the kit has not reached `1.0` yet, it ships as `1.0.0`, the first stable public
surface).

It is breaking for two reasons, and the second is the one consuming teams will actually notice:

1. **The API changes.** `[isReady]`/`[isProcessing]`/`[isError]` collapse into
   `status="ready" | "processing" | "error" | "unknown"`, `[isSmall]`/`[isLarge]` become
   `size="sm" | "md" | "lg"`, and `label` becomes optional with a humanised default. This part is
   mechanical and a codemod covers it.
2. **The behaviour changes.** The badge's text used to be `aria-hidden`, so for assistive
   technology it said nothing at all. It now exposes its text and can opt into `role="status"`
   with `live`, which means **screen readers will start announcing status where they were silent
   before**. That is the entire point of the change, but it is a user-visible behaviour change and
   belongs in the release note rather than in a QA surprise.

What consuming teams have to do:

- Upgrade the dependency and run the migration table (mechanical).
- **Stop styling against internal class names.** `data-status` and `data-size` on the host are the
  supported hooks; anything that targeted the old `.badge-*` classes should move to those
  attributes or to the component's custom properties.
- Update tests that asserted the old DOM or the five former inputs.

How I would do it with consumers already in production, and why I did not do it here: ship a
`1.5.0` that **adds** `status`/`size`, keeps the booleans as `@deprecated` with a console warning
under a documented precedence rule ("`status` wins if both are set"), and removes them in
`2.0.0`. This kit is new and the clean cut is more honest; with a large installed base the
deprecation window is worth the extra code path. This trade-off is also recorded in
`DECISIONS.md`.

Mechanics of the release: build with `ng-packagr` in **partial compilation** (Angular Package
Format) and publish to a private registry. Crucially, the tokens must ship as their **own entry
point** (`@caseware/…/tokens`): a consumer that installs only JavaScript gets no styles and no
theme. Tag the release and write the migration table into the release notes.

## What I would document or automate so adopting it is safe, not merely possible

- **Document:** the kit README as the single source for API and theming rules (it is what a
  consuming team reads first), a migration guide for the major, and a short "how to add a theme"
  recipe — in this design a theme is a few dozen lines re-pointing roles, which is the point of the
  token layer.
- **Already automated:** `tokens.guard.spec.ts` fails the build on a colour literal, on a primitive
  colour token, on `!important`, on `::ng-deep`, and on a theme that forgets a role the default
  theme defines. The theming contract cannot be broken silently and a theme cannot half-exist.
- **What I would automate next:**
  - a **golden test of `public-api.ts`** — adding a symbol passes, removing or renaming one fails
    CI, so a breaking change cannot leave in a patch by accident;
  - a **contrast and keyboard smoke check for both themes in CI**, because "it builds" is not "a
    keyboard user can operate it and read it";
  - a **codemod/schematic** for the badge migration: six call sites here, hundreds in a consumer;
  - **version the tokens separately from the components**: a token-only change is usually minor or
    patch even while a component major is pending.

## Two versions of the kit on one page (module federation)

What goes wrong, concretely for this design:

- **Duplicate selectors.** Both versions define `cw-select` and `cw-status-badge`; the last
  registration wins, the other side sees an unknown element, and `customElements.define` throws on
  a duplicate tag.
- **Token collisions in `:root`, property by property.** Both versions declare `--cw-*` tokens at
  `:root`; the last stylesheet loaded wins _per property_, so a v1 component can render with v2's
  palette or v2's focus ring. The same applies to `[data-cw-theme]`.
- **A duplicate Angular runtime** if the two versions pin different `@angular/*`. That is a
  federation configuration problem, but it surfaces as kit bugs.

What this design makes **better**:

- A stable, prefixed token surface — semantic `--cw-<role>` tokens plus internal
  `--cw-<component>-*` tokens. Interference is confined to shared names and never reaches into a
  component's internals, which stay overridable per instance.
- The theme is an **attribute that can be scoped to a sub-tree**, so two versions can coexist when
  each is mounted inside its own wrapper and neither has to own `:root`.
- Components hold **no colour literals**, so they follow whatever theme is active instead of
  hard-breaking, and `data-status`/`data-size` keep consumer styling working across versions.

What it makes **worse**, honestly:

- The semantic token names carry **no version**, so two versions genuinely collide. Mitigation:
  treat tokens as a versioned, **additive-only** artefact — never re-point an existing name to a
  role of different contrast inside a major — and scope the theme per remote.
- **Duplicate selectors have no CSS-level fix.** Either publish version-suffixed tags as custom
  elements (`cw-select-v2`), or pin a single kit version in the federation `shared` scope of the
  shell. I would take the second: one kit version per page, enforced by the shell.
