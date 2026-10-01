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

**How I verified the result.** The token guard is verified by deliberately breaking it; every
contrast ratio in the stylesheets was computed, not guessed; the ARIA behaviour was checked against
WAI-ARIA 1.2, HTML-ARIA and the APG select-only example; and `npm test -- --watch=false` plus
`npm run build` were run after each stage.

## Approximate time spent

About three hours of working time, in this order: token layer and theme, then the picker (the
largest single piece), then the badge rework, then the notes. The starter's README arrives saying
three hours is the expectation, so I optimised for a coherent solution over completeness: there is
no Storybook, no packaging pipeline and no virtual scrolling.

## What I would do next, in order

1. **The focused test suite (Part 3)**: tests aimed at the riskiest behaviour rather than at
   coverage — type-ahead against several hundred options, `[(ngModel)]` (template-driven) on the
   same component, `disabled` arriving from the form control, and two pickers on one page to prove
   ids stay unique.
2. A **codemod/schematic** for the badge migration, and the golden test of `public-api.ts`
   described in `ADOPTION.md`.
3. The **editable/filtering combobox** as an opt-in variant (see the trade-off in `DECISIONS.md`),
   because discovering one option among hundreds is genuinely worse with type-ahead jumping.
4. Packaging: turn `src/lib` into an `ng-packagr` library and publish the tokens as their own entry
   point, so the adoption story in `ADOPTION.md` is executable rather than described.

## One risk or limitation I knowingly left, and the next test for it

**The risk.** The popup is positioned absolutely inside the host, with no collision or flip
handling (explicitly out of scope in the brief). In a container with `overflow: hidden` — a modal, a
scrolling table row — the list will clip, and a second one is that typing **jumps** to a match
rather than filtering, so a long list still relies on scrolling once the user stops typing.

**The next test I would write.** Type-ahead on a 300-option list: open with a keystroke, assert the
active option is the expected match, that it is the one referenced by `aria-activedescendant`, and
that it scrolled into view — followed by the two-instances-on-one-page case, because a regression
in "where the user is inside a long list" or in id uniqueness would reach a real user immediately.
