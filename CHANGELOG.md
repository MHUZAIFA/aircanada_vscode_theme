# Changelog

## 0.3.4 — 2026-11-15

- **New file icons, "Air Canada Aviation (Luggage Tags)".** Every file is a luggage tag in its language's colour, with a bold code of up to three letters or a symbol that reads at 16 px: `{ }` for JSON, a branch for Git, a lock for lockfiles, a box for package manifests, a key for `.env`, a plane for `.vsix`.
- **Folder icons** are real folder shapes. 15 kinds of common folders (54 names) get their own colour and badge: `src`, `node_modules`, `.vscode`, `.git`, `images`, `public`, `scripts`, `out`/`dist`, `test`, `docs` and more. Build output folders carry a departing plane, and the workspace root is Rondelle red.

## 0.3.3 — 2026-11-15

- At Gate card: smaller block-time picker, Board button and stats; the card is now only as tall as its content.
- Flight Plan: smaller task text, input, checkboxes and row height.
- Flight Plan: long task names wrap up to three lines; hover a task to see its full name.
- Meetings: shorter, smaller empty message.
- README: new screenshots, and the meetings notification shown in place of the fly-by panel.

## 0.3.2 — 2026-11-15

- Streamlined README with screenshots, Marketplace badges and install steps.

## 0.3.1 — 2026-11-15

- **Download from GitHub**: the latest build lives at `releases/air-canada-flight-deck-theme.vsix`, linked from the README with install steps. `npm run release` rebuilds it.
- **Incoming meeting card** at the top of the Meetings panel: a red plane flies a straight track while the alert is up, with title, time span, platform, notes and Join / Snooze 2 min / Dismiss. Closes itself after `airCanada.meetings.flyby.durationSeconds`.
- **Meeting previews** show the incoming card and a VS Code notification instead of the full-screen fly-by. Repeat alerts always raise a fresh notification.
- **At gate**: click Departure or Arrival to change just that airport; departure → estimated arrival time shown above the route plane; *Transcon* renamed **International**; Custom minutes centred.
- **En route**: plane keeps its true shape on wide cards, no longer clipped, and starts on the track instead of sliding in; more room between the airport codes and the arc.
- **Flight Plan**: finished tasks use a muted grey checkbox and strike-through; *landed* stays green.
- **Status-bar hover**: more vertical space between the header and the buttons.

## 0.3.0 — 2026-11-14 (crew tools)

- **Air Canada side bar** (plane icon in the activity bar) with two views.
- **Flight Deck view** (webview): three layouts that slide in/out — *gate* (preset 25/50/90 cards, custom minutes, today's flights + focus time, last flight), *en route* (big remaining time, plane travelling along a route arc, nm flown / to go, elapsed-of-block, progress bar) and *landed* (return / new flight). While flying only numbers and the plane position update — no re-render, no flicker. A control strip with **+5 +10 +15 +30 +1 h / Custom** extend chips plus **Pause** and **Cancel** slides up when the pointer enters the deck and back down when it leaves.
- **Status-bar hover** is now static during a flight (rebuilt only when phase/route/length change — no flicker) and carries the same extend chips, Pause / Resume, Cancel and "Open flight deck" links. Clicking the status-bar item opens the Flight Deck.
- New commands: Extend Flight by…, Cancel Flight, Return Flight, Open Flight Deck, Set Aircraft Type.
- **One view, three tabs**: Flight · Plan · Meetings now live in a single Flight Deck webview (tabs remember your selection; badges show open tasks / upcoming meetings). Controls are always visible — no slide-away strip.
- **Aircraft type** replaces the git callsign: pick from 16 popular types (Air Canada fleet first); default **Boeing 777-300ER**. Setting `airCanada.flight.aircraft`.
- Landed tasks are **struck through**; meetings list shows live / past state, platform pill and inline Join / Preview / Remove.
- Status-bar hover actions render as **key-cap buttons** (`<kbd>`), not inline text links.
- Fly-by plane redrawn in the **2017 Air Canada livery**: white upper fuselage, black belly and cockpit mask, black tail with the official red Rondelle, Rondelle on the engine inlet and belly, charcoal "AIR CANADA" wordmark.
- **Board Flight** now asks for the session length (25 / 50 / 90 min or custom) each time; `airCanada.flight.durationMinutes` is the default. New commands: Pause, Resume.
- **Flight Plan**: per-workspace task checklist with native checkboxes, inline edit/remove, "Clear Landed Tasks", open-task badge on the activity-bar icon.
- **Meetings view + fly-by**: add a meeting reminder by hand (title, time like `14:30` / `2:30pm` / `in 20` / `tomorrow 09:00`, length, optional join link or notes). `leadMinutes` (default 5) before it starts, an airliner flies across a panel beside the editor towing the meeting card (Join / Snooze 2 min / Dismiss), a ✈ taxis across the status bar with the summary, and a notification offers Join / Snooze. No calendar accounts, nothing leaves the machine. "Preview the Fly-by" demo in the view title.
- Walkthrough step 5: "File a flight plan".

## 0.2.0 — 2026-11-14 (aviation pack)

- **Flight focus timer** in the status bar: `YYZ ───✈······ YVR 32:10`. Click to board / pause / resume; "Landed" notification with one-click return flight. Commands: Start, Pause/Resume, Reset, Set Route, Set Duration (25/50/90/custom). Settings under `airCanada.flight.*`.
- **Cockpit notifications**: "Boarding complete" on workspace open (with git branch as flight number), "Wheels up" / "Go-around" on task success / failure, "Cleared for takeoff" / "Landed" for debug sessions. Settings under `airCanada.notifications.*`.
- **Product icon theme "Air Canada Aviation"**: 14 workbench glyphs replaced with aviation symbols (luggage tag, radar, route network, airliner, gauge, pilot wings, turbine, control tower, runway, seatbelt sign, takeoff, diverging route, terminal). Generated from `scripts/build-product-icons.js` via fantasticon.
- **File icon theme "Air Canada Aviation (Boarding Pass)"**: boarding-pass icons with language codes and EFIS stub colours for 37 languages / 89 extensions / 50 file names; hangar folders; control-tower root. Generated from `scripts/build-file-icons.js`.
- **Pre-flight checklist walkthrough** (Help → Get Started): theme, icons, recommended settings, first flight.
- Command **Air Canada: Enable Recommended Editor Settings** (bracket pair colours, bracket guides, semantic highlighting).
- Extension now has an activation entry point (`out/extension.js`, TypeScript); `npm run build` runs all generators and compiles.

## 0.1.4 — 2026-11-14

- Sash grip dots at full white on dark variants.
- All section outlines removed (modern UI `surface.border` and derived keys transparent).

## 0.1.3 — 2026-11-14

- Support for VS Code 1.146+ modern UI (floating card layout): shell background matches the editor, `surface.border` / `editor.border` / `modernPanel.border` / `modernActivityBar.border` cleared. Cards now merge into one continuous surface; the three-dot sash grip stays visible (white on dark variants) as the drag affordance.

## 0.1.2 — 2026-11-14

- Seamless workbench: activity bar, sidebar, tab strip, title bar, breadcrumbs, panel and sticky headers all share the editor background. Scroll and sticky-scroll shadows removed. Only the status bar remains a distinct colour band.

## 0.1.1 — 2026-11-14

- Borderless workbench: separators between activity bar, sidebar, editor groups, tabs, panel, title bar and status bar are now transparent.

## 0.1.0 — 2026-11-14 (first departure)

- Three variants: **Flight Deck** (dark), **Signature Light** (light), **Rouge** (dark, burgundy).
- Workbench colours: ~400 keys per variant covering editor, terminal, SCM, debug, testing, chat and settings UI.
- TextMate token rules for JS/TS, Python, Go, Rust, Java, C, SQL, shell, CSS, HTML, Markdown, JSON, YAML, TOML, diff.
- Semantic token colours (LSP) with declaration bolding and deprecated strikethrough.
- Terminal ANSI palette aligned with the EFIS colour grammar.
- Generator script so all variants build from one palette definition.
- Extension icon is the official Rondelle (geometry from the public 2017 logo file) on black.
- Brand reds sampled from official logo files: `#F01428` (Air Canada), `#A20B31` / `#ED1C24` (Rouge).
