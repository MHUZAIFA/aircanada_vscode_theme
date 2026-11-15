# Air Canada Flight Deck

A VS Code extension built for Air Canada employees: three colour themes, aviation product and file icons, a coding-session timer rendered as a flight, a per-workspace task checklist, manual meeting reminders with an animated plane fly-by, and cockpit-style notifications. The palette comes from the 2017 livery — black tail and underbelly, white upper fuselage, Rondelle red — and syntax colours follow the conventions pilots already read every day on EFIS / navigation displays.

> **Not an official Air Canada product.** This is an employee-made theme for internal use. The extension icon is the official Air Canada Rondelle, taken from the public 2017 logo file, and the palette is sampled from the same file. See [Trademarks](#trademarks) before distributing it outside the company.

**[⬇ Download the latest .vsix](https://github.com/MHUZAIFA/aircanada_vscode_theme/raw/main/releases/air-canada-flight-deck-theme.vsix)** · then follow [Install](#install).

## Fleet (theme variants)

| Theme | Type | Inspired by |
| --- | --- | --- |
| **Air Canada Flight Deck** | Dark | Night cockpit. Black activity bar, near-black editor, Rondelle-red status bar. |
| **Air Canada Signature Light** | Light | White upper fuselage with black tail. Red accents, black status bar. |
| **Air Canada Rouge** | Dark | Rouge sub-brand. Burgundy base (`#A20B31`), bright Rouge red (`#ED1C24`) accents. |

## Brand palette

Hex values are sampled directly from the official public logo files (Wikimedia Commons: *Air Canada 2017.svg*, *Air Canada Rouge logo.svg*), not from third-party palette sites.

| Role | Hex | Source |
| --- | --- | --- |
| Air Canada red | `#F01428` | Rondelle fill, 2017 logo |
| Charcoal | `#2E2A25` | "AIR CANADA" wordmark, 2017 logo |
| Black | `#000000` | Tail, underbelly, engine nacelles (livery) |
| White | `#FFFFFF` | Upper fuselage (livery) |
| Rouge burgundy | `#A20B31` | "rouge" script, Rouge logo |
| Rouge red | `#ED1C24` | "AIR CANADA" + Rondelle, Rouge logo |

## Cockpit colour conventions → syntax

Electronic flight displays use a fixed colour grammar so that a glance tells you what a symbol *means*. The theme maps that grammar onto code:

| EFIS meaning | Colour | In the editor |
| --- | --- | --- |
| **Magenta** — FMS-managed route, the plan the aircraft follows | `#E07AC8` | Keywords, control flow, decorators |
| **Cyan** — live data, sky | `#5FD3E8` | Strings, regex, links |
| **Green** — engaged mode, go | `#7FD88F` | Functions, methods, git additions |
| **Amber** — caution | `#F2B544` | Numbers, constants, warnings, modified files |
| **Red** — warning / Rondelle | `#F01428` | Errors, HTML tags, accents, cursor |
| **White** — armed mode | `#F3F4F6` | Types, classes, headings |

Other cues:

- **Bracket pairs** cycle red → amber → cyan → magenta → green → blue, like an approach lighting system.
- **Active line number** lights up Rondelle red, like the heading bug on an HSI.
- **Git gutter**: green added / amber modified / red deleted — same as a CAS/EICAS message hierarchy.
- **Terminal ANSI** colours match the same six-colour grammar so `ls --color`, test runners and CI output all read the same way.

## Coding-session timer ("flight")

The status bar carries a session timer drawn as a flight:

```text
YYZ ───✈······ YVR  32:10
```

- **Hover** the item for a static card with quick actions: at the gate, *Board 25 / 50 / 90 / Custom*; in flight, extend chips **+5 +10 +15 +30 +1 h Custom**, **Pause / Resume**, **Cancel**. (Hover open delay is VS Code's `workbench.hover.delay`; 150 ms feels instant.)
- **Click** the item to open the **Flight Deck** view.
- The ✈ taxis from origin to destination as time passes. On arrival: *Landed* notification with **Return flight** (swaps the route) or **New flight**.
- Commands (⌘⇧P → "Air Canada"): **Board Flight**, **Pause**, **Resume**, **Extend Flight by…**, **Cancel Flight**, **Return Flight**, **Set Flight Route**, **Set Default Session Length**, **Open Flight Deck**.

### Flight Deck view

The plane icon in the activity bar opens the **Flight Deck**: one scrolling view with the flight card on top and two collapsible panels below it, **Flight Plan** and **Meetings**. The activity-bar badge counts open tasks.

The flight card has three layouts that slide in:

- **At gate**
  - Departure and arrival codes. Click either one to change just that airport.
  - Between them, the departure time (now) and estimated arrival for the block time you've picked. It updates as you change the selection.
  - Block-time picker: **25** Short hop · **50** Domestic · **90** International · **Custom** minutes.
  - **Board flight**, then today's flights, focus time and your last flight.
- **En route** — large time remaining and the plane flying a route arc, with the flown part in red. Below that: nautical miles flown and to go, elapsed of block, ETA and a progress bar. Then the controls: extend chips **+5 +10 +15 +30 +1 h …**, **Pause/Resume** and **Cancel**. Only the numbers and the plane move each second, so the layout never flickers.
- **Landed** — destination, block length, **Return flight** / **New flight** and today's totals.

**Aircraft type** — `airCanada.flight.aircraft`, default *Boeing 777-300ER*; 16 types to pick from (777-200LR, 787-8/-9, A330-300, A321neo, A320, A220-300, 737 MAX 8, E175, CRJ900, Dash 8-400, A380, 747-400, A350-1000).

| Setting | Default | |
| --- | --- | --- |
| `airCanada.flight.enabled` | `true` | Show the timer |
| `airCanada.flight.durationMinutes` | `50` | Default session length, 1–600 |
| `airCanada.flight.origin` / `destination` | `YYZ` / `YVR` | Airport codes |
| `airCanada.flight.autoStart` | `false` | Board on startup with the default length |
| `airCanada.flight.aircraft` | `Boeing 777-300ER` | Aircraft type shown on the deck and hover |

## Flight Plan (task checklist)

The **Flight Plan** panel is a lightweight per-workspace to-do list:

- Type in the box and press Enter to add; click a task's text to rename it; hover for edit / remove.
- Tick the checkbox when a task has landed. It turns muted grey, is struck through, is marked *landed* in green and drops below the open ones.
- The activity-bar badge and the panel's badge count open tasks.
- **Clear landed** removes finished ones; **Clear Flight Plan** (view menu) empties the list (both confirm first).

Tasks live in VS Code's workspace storage (per opened folder), or global storage when no folder is open. Nothing is written into the repository.

## Meetings (manual reminders + fly-by)

The **Meetings** panel holds reminders you type in yourself. There is deliberately **no calendar sync** and no account sign-in.

- **+ Add meeting** asks four things: title · time (`14:30`, `2:30pm`, `in 20`, `+45`, `tomorrow 09:00`) · length in minutes · an optional Teams/Zoom/Meet link or a note.
- **5 minutes before** it starts (`airCanada.meetings.leadMinutes`), four things happen at once:
  1. An **incoming card** appears at the top of the Meetings panel. A red plane flies a straight track while the card is up, with the trail behind it in red and the seconds left beside it. Below that are the title, start time and time span, the platform, your note, and **Join**, **Snooze 2 min** and **Dismiss**. It closes itself after 20 s.
  2. A VS Code **notification** in the bottom-right corner with **Join** and **Snooze 2 min**.
  3. A panel opens beside the editor: night sky, runway lights, and an airliner in the **2017 Air Canada livery** towing the meeting card.
  4. A ✈ taxis across the status bar carrying the one-line summary. Click it to join.
- **Preview** (the play icon on a reminder, or in the panel header for a demo meeting) shows the incoming card and the notification only, without the full-screen panel.
- Click a reminder to rename, re-time or change its link. Hover for inline Join / Preview / Remove. **Clear past** tidies up, and reminders older than 12 h are pruned automatically.

| Setting | Default | |
| --- | --- | --- |
| `airCanada.meetings.leadMinutes` | `5` | Minutes before start |
| `airCanada.meetings.flyby.enabled` | `true` | Animated panel |
| `airCanada.meetings.flyby.durationSeconds` | `20` | How long the panel and the incoming card stay up |
| `airCanada.meetings.statusBarFlyby` | `true` | Status-bar plane |
| `airCanada.meetings.notification` | `true` | Notification with buttons |

Reminders are stored in VS Code global storage on your machine only.

## Cockpit announcements

| Event | Message |
| --- | --- |
| Workspace opens | *✈ Boarding complete — welcome aboard. Flight `main` is ready for departure.* |
| Task exits 0 | *✈ Wheels up — "build" completed* (status bar, 6 s) |
| Task fails | *✈ Go-around — "test" exited with code 1* → **Show Problems** / **Show Terminal** |
| Debug session starts / ends | *✈ Cleared for takeoff* / *✈ Landed* (status bar) |

Toggles: `airCanada.notifications.enabled`, `.welcome`, `.tasks`, `.debug`.

## Aviation icons

Two optional icon sets, independent of the colour theme:

**Product icons — "Air Canada Aviation"** (*Preferences: Product Icon Theme*)
Explorer → luggage tag · Search → radar sweep · Source Control → air-route network · Run & Debug → airliner · Extensions → cockpit gauge · Accounts → pilot wings · Settings → turbine · Remote → control tower · Terminal → runway · Notifications → fasten-seatbelt sign · Run → takeoff · Branch → diverging route · Home → terminal building. Unlisted glyphs fall back to the default codicons.

**File icons — "Air Canada Aviation (Boarding Pass)"** (*Preferences: File Icon Theme*)
Every file is a boarding pass: white body, stub coloured by language (EFIS palette), and an airline-style code — `TS`, `PY`, `MD`, `JSON`, `DKR`, `ENV`, `LOCK`… Folders are hangars (door opens when expanded); the workspace root is a control tower. 37 languages, 89 extensions, 50 special file names.

Both sets are generated: `scripts/build-product-icons.js` (SVG → WOFF via fantasticon) and `scripts/build-file-icons.js` (table → SVGs + theme JSON). Add a language with one line.

## Pre-flight checklist (walkthrough)

**Help → Get Started → Pre-flight checklist** (or command *Air Canada: Open Pre-flight Checklist*) walks a new hire through theme, icons, recommended settings and the first flight.

## Install

### Download from GitHub (easiest)

1. Download **[air-canada-flight-deck-theme.vsix](https://github.com/MHUZAIFA/aircanada_vscode_theme/raw/main/releases/air-canada-flight-deck-theme.vsix)**. You can also open the [`releases`](releases) folder and click **Download raw file**.
2. Open VS Code and go to the **Extensions** view (`Cmd+Shift+X` on macOS, `Ctrl+Shift+X` on Windows/Linux).
3. Click the **`···`** menu at the top of the Extensions view and choose **Install from VSIX…**
4. Pick the file you downloaded. VS Code shows *Completed installing extension* when it's done.
5. Run **Developer: Reload Window** from the Command Palette (`Cmd/Ctrl+Shift+P`).
6. Pick a theme: **Preferences: Color Theme** (`Cmd/Ctrl+K`, then `Cmd/Ctrl+T`) → *Air Canada Flight Deck*, *Signature Light* or *Rouge*.
7. Optional: **Preferences: File Icon Theme** and **Preferences: Product Icon Theme** → *Air Canada Aviation*.

Prefer the terminal? After downloading:

```bash
code --install-extension air-canada-flight-deck-theme.vsix
```

**Updating:** download the file again and repeat steps 3–5. VS Code replaces the old version.

**Uninstalling:** Extensions view → *Air Canada Flight Deck* → **Uninstall**.

### From source

```bash
git clone https://github.com/MHUZAIFA/aircanada_vscode_theme.git
cd aircanada_vscode_theme
npm install
npm run build        # themes + file icons + product icon font + TypeScript
npm run package      # produces the .vsix in the project folder
```

Or press `F5` with the folder open in VS Code to launch an Extension Development Host with the theme loaded.

### Publishing a new downloadable build (maintainers)

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. Run `npm run release`. It builds everything and writes `releases/air-canada-flight-deck-theme.vsix`.
3. Commit and push. The download link above always serves the newest file.

## Recommended settings

```jsonc
{
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",
  "editor.semanticHighlighting.enabled": true,
  "workbench.colorTheme": "Air Canada Flight Deck"
}
```

## Customising

All three colour variants are generated from one file: `scripts/build-themes.js`. Change a hex in the `variants` block, run `npm run build`, and every workbench and token colour updates. Don't edit `themes/*.json`, `icons/**/*.json` or `icons/**/svg/*` by hand — they're build output.

## Project layout

```text
aircanada_vscode_theme/
├── package.json                    # manifest: themes, icon themes, commands, settings, walkthrough
├── src/
│   ├── extension.ts                # activate(): commands + wiring
│   ├── flightTracker.ts            # status-bar coding-session timer (flight)
│   ├── sessionView.ts              # "Flight Deck" webview: Flight / Plan / Meetings tabs
│   ├── checklist.ts                # task checklist store + prompts
│   ├── meetings.ts                 # manual meeting reminders store + scheduler
│   ├── flyby.ts                    # animated fly-by webview + status-bar plane
│   ├── notifications.ts            # boarding / wheels-up / go-around / debug announcements
│   └── git.ts                      # current branch via built-in Git API
├── scripts/
│   ├── build-themes.js             # single source of truth for colours → themes/*.json
│   ├── build-file-icons.js         # boarding-pass table → icons/files/svg + theme JSON
│   └── build-product-icons.js      # glyph SVGs → icons/product/dist/*.woff + theme JSON
├── themes/                         # generated — three colour themes
├── icons/files/                    # generated — file icon theme
├── icons/product/                  # generated — product icon theme (font + JSON)
├── media/walkthrough/              # pre-flight checklist pages
├── images/icon.svg|png             # official Rondelle on black (Air Canada trademark)
├── samples/flight-plan.ts          # demo file for screenshots / QA
├── releases/                       # latest .vsix, linked from the Install section
└── .vscode/launch.json             # F5 → Extension Development Host
```

## Trademarks

"Air Canada", "Air Canada Rouge", "Air Canada Signature", and the Rondelle / maple-leaf marks are trademarks of Air Canada. This theme is an independent, employee-made project intended for internal use. The extension icon **does** use the official Rondelle (path geometry from the public 2017 logo file; the file is tagged public-domain on Wikimedia Commons for copyright purposes, but trademark rights are unaffected). Before distributing it outside the company — e.g. to the VS Code Marketplace — get Brand/Legal clearance for the name, colours and logo.

## Author

Created by **MHUZAIFA**

- GitHub: [github.com/MHUZAIFA](https://github.com/MHUZAIFA)
- Portfolio: [mohammedhuzaifa.vercel.app](https://mohammedhuzaifa.vercel.app/)

## Changelog

See `CHANGELOG.md`.

## License

MIT — see `LICENSE`.
