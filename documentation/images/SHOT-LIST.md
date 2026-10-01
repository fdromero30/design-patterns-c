# Screenshots

Screenshots live here. They are **tracked** (not ignored) so a reviewer sees the components
without running the app; keep each file small (aim for under ~300 kB, ~1200 px wide, PNG) and
crop the browser chrome so the component is what dominates the frame.

The READMEs reference these exact filenames; the markup is commented out until a file exists, so
add the image, uncomment the matching line, and there are no broken links in between.

| Filename                    | What to capture                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `workbench-light.png`       | The whole workbench in the default theme (used in the repository README).              |
| `workbench-dark.png`        | The same view after the theme toggle (the alternative theme).                          |
| `cw-select-closed.png`      | `cw-select` with a value selected, list closed, default theme.                         |
| `cw-select-open.png`        | The same control with the list open, showing the active option and an unavailable one. |
| `cw-select-dark.png`        | The open state in the alternative theme.                                               |
| `cw-status-badge-light.png` | All four statuses (and the three sizes) in the default theme.                          |
| `cw-status-badge-dark.png`  | The same badges in the alternative theme.                                              |

How to get them: `npm start`, open <http://localhost:4200>, use the **Theme** button in the header
to switch, and look at the _Status badge_, _Review filters_ and _Several hundred options_ sections.

When writing alt text, describe the state, not the pixels: "cw-select with the list open and
'Priya Raghunathan' active" reads better than "select component screenshot".
