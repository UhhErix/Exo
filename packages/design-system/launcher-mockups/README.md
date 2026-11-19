# Exo Launcher mock-ups (the design canvas)

The owner's shipping design, with improvements, drawn room by room for review before anything is built. Published as the
private design canvas "Exo Design Language" (https://claude.ai/artifact/RM1PZWPAFymnLCwdQdqjr7). First round, 2026-11-09:
Library, the game page, Store, Music, PC, Devices, Settings, and the top bar with its mini players.

- `tools/lib.mjs` is the kit: the app's own values (Geist, the glass rim and blur, radii, sizes, the green) and its own icons
  (`icons.json`), both read from the running 3.26 UI by `ExoLauncher\tools\ui-pass\tokens.mjs`, as functions that emit
  inline-styled HTML. `rooms1.mjs` to `rooms3.mjs` draw the boards into `project/*.dc.html`.
- `node tools/rooms1.mjs` (and 2, 3) regenerates; `node tools/preview.mjs [Name ...]` renders each board to `shots/`.
- To publish: read `project/canvas.json` from the artifact first (the page rewrites it), then publish it with `root` set to
  this folder and the changed boards in `files`.
- The art is a stand-in (a sun and two ridges from a seed): no real game's or album's art is used.

What the boards propose, beyond what ships: live mini players sit left of the Rooms (the side that was empty) so the Rooms
stay at the window's centre, and each opens a card under it; the Library's Continue is one large card and two small; gifts
are one row; the grid has All / Installed / Favorites; the game page opens on its art and shows its captures; the PC room
leads with what needs you; Devices shows each device's main controls in place, with no pictures.
