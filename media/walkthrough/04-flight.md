## First flight

The status bar carries a focus timer rendered as a flight:

```text
YYZ ───✈······ YVR  32:10
```

- **Click** the item to board — you're asked how long the session is (25 / 50 / 90 min or custom) — then click again to pause (holding pattern) or resume.
- The ✈ taxis from origin to destination over the block time.
- On arrival you get a **Landed** notification with a one-click **Return flight**.
- The tooltip shows the route, callsign (your git branch), block time and elapsed time.

Commands (⌘⇧P → "Air Canada"): **Set Flight Route**, **Set Flight Duration** (25 / 50 / 90 min or custom), **Reset Flight**.

Settings live under `airCanada.flight.*`; set `airCanada.flight.enabled` to `false` to hide it.

### Cockpit announcements

- Workspace opens → *Boarding complete — welcome aboard, flight `main`*
- Task succeeds → *Wheels up* (status bar)
- Task fails → *Go-around* with **Show Problems**
- Debug starts / ends → *Cleared for takeoff* / *Landed*

All toggleable under `airCanada.notifications.*`.
