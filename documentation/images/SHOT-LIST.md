# Screenshots

Screenshots live here and are **tracked** (not ignored), so a reviewer sees the workbench without
running the app. Both files are referenced by the repository README:

| Filename              | What it shows                                                 |
| --------------------- | ------------------------------------------------------------- |
| `workbench-light.png` | The whole workbench in the default theme.                     |
| `workbench-dark.png`  | The same view after the theme toggle (the alternative theme). |

Notes:

- **File names matter.** The README links to these exact names; renaming a file without updating the
  README breaks the image.
- These are full-page captures, so expect a few hundred kB each. If the weight becomes a concern,
  resize to ~1200 px wide and re-encode as PNG before committing.
- To retake them: `npm start`, open <http://localhost:4200>, use the **Theme** button in the header
  to switch themes, and capture the _Status badge_, _Review filters_ and _Several hundred options_
  sections.
- Alt text should describe the state, not the pixels: "cw-select with the list open and 'Priya
  Raghunathan' active" reads better than "select component screenshot".
