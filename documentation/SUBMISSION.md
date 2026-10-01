# Submission notes

## AI usage

**Where it helped.** Extracting the brief out of the supplied PDF (the machine had no PDF text
tool and no PDF library, so I decompressed the PDF's content streams and rebuilt the text, then
kept it side by side while implementing); the contrast arithmetic that selected the token values;
and boilerplate — signal inputs, the `ControlValueAccessor` skeleton, the ARIA attribute set.

**Where I corrected or rejected generated output.**

- The token guard passed while checking nothing. Two bugs: the regexes had doubled backslashes
  (so they matched a literal `\s` instead of whitespace and never matched a violation), and
  reading `.scss` through the bundler (`import.meta.glob` with `?raw`) returned compiled CSS rather
  than source. I found both by **breaking the guard on purpose** — injecting `#ff0000 !important`
  into a component stylesheet — and seeing it still pass. Fixed by reading the files from disk and
  stripping comments first, so prose that mentions an anti-pattern does not fail the build.
- I lost files by running two `rsync`s over the same tree in parallel (the second one's `--delete`
  ran while the first was reading). Recovered by committing the untouched baseline before touching
  anything else and re-writing the missing files; the parallel-commands mistake is why every step
  since runs as one sequential command sequence.
- I re-checked every ARIA claim rather than trusting recall: `aria-activedescendant` is only valid
  on `combobox`, `textbox`, `group`, `application` or a composite widget (which is what rules out a
  plain `button` as the trigger), and `role="combobox"` on a `button` is valid HTML-ARIA — so the
  honest statement is "focus would have to move into the popup", not "a button cannot do it".
- The new `cw-select` tests surfaced a real type-ahead bug: a second single-letter keystroke started
  searching just after the active option, so it skipped the first match (`Ana`, `Bruno`, `Carla` →
  `c` landed on `Carla`), and repeating a letter built a `"cc"` buffer that matched nothing. I wrote
  the tests first, watched them fail (`expected 'Cesar' to be 'Carla'`), then fixed the search to
  start at the top for a fresh query and only cycle for a repeated letter.
- One red test was the test's fault, not the component's: seeding a `[(ngModel)]` host after the
  first change detection threw `NG0100`, and because `writeValue` runs inside change detection the
  DOM only refreshed on the next pass. I isolated it with a throwaway probe (the form control held
  `'c'` while the DOM still showed the placeholder) and rewrote the test to seed the model before the
  first check — which a running app gets for free from `ApplicationRef.tick`.

**How I verified the result.** The token guard is verified by deliberately breaking it; every
contrast ratio in the stylesheets was computed, not guessed; the ARIA behaviour was checked against
WAI-ARIA 1.2, HTML-ARIA and the APG select-only example; and `ng test --watch=false` plus
`npm run build` were run after each stage. The new tests were written to fail first — the type-ahead
cases were run against the unfixed code and went red before the fix turned them green, which is how
the bug above was found rather than assumed.

## Approximate time spent

About three hours of working time, in this order: token layer and theme, then the picker (the
largest single piece), then the badge rework, then the notes. The starter's README arrives saying
three hours is the expectation, so I optimised for a coherent solution over completeness: there is
no Storybook, no packaging pipeline and no virtual scrolling.

## What I would do next, in order

The focused test suite (Part 3) now lives beside each component — `select.spec.ts`,
`status-badge.spec.ts`, `app.spec.ts` and `tokens.guard.spec.ts`, 34 tests behind a single
`ng test --watch=false`. What is left, in order:

1. A **codemod/schematic** for the badge migration, and the golden test of `public-api.ts`
   described in `ADOPTION.md`.
2. The **editable/filtering combobox** as an opt-in variant (see the trade-off in `DECISIONS.md`),
   because discovering one option among hundreds is genuinely worse with type-ahead jumping.
3. Packaging: turn `src/lib` into an `ng-packagr` library and publish the tokens as their own entry
   point, so the adoption story in `ADOPTION.md` is executable rather than described.

## One risk or limitation I knowingly left, and the next test for it

**The risk.** The popup is positioned absolutely inside the host, with no collision or flip
handling (explicitly out of scope in the brief). In a container with `overflow: hidden` — a modal, a
scrolling table row — the list will clip, and a second one is that typing **jumps** to a match
rather than filtering, so a long list still relies on scrolling once the user stops typing.

**The next test I would write.** The type-ahead and two-instances cases from the last iteration now
exist, so the next one targets the clipping above: mount the picker in an `overflow: hidden`
container and assert the list is clipped today, so the test starts failing the moment someone adds
collision/flip handling. A regression in "where the user is inside a long list" or in id uniqueness
would still reach a real user first, which is why those are already covered.
