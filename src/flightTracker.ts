import * as vscode from "vscode";

export type Phase = "idle" | "flying" | "paused" | "landed";

/** Popular types, Air Canada fleet first. Cruise speed (kn) drives nothing yet — shown for flavour. */
export const AIRCRAFT: { type: string; detail: string; cruiseKn: number }[] = [
  { type: "Boeing 777-300ER", detail: "Flagship long-haul · 400 seats", cruiseKn: 490 },
  { type: "Boeing 777-200LR", detail: "Ultra long-haul", cruiseKn: 490 },
  { type: "Boeing 787-9 Dreamliner", detail: "Long-haul", cruiseKn: 488 },
  { type: "Boeing 787-8 Dreamliner", detail: "Long-haul", cruiseKn: 488 },
  { type: "Airbus A330-300", detail: "Long-haul", cruiseKn: 470 },
  { type: "Airbus A321neo", detail: "Narrow-body", cruiseKn: 450 },
  { type: "Airbus A321", detail: "Narrow-body", cruiseKn: 450 },
  { type: "Airbus A320", detail: "Narrow-body", cruiseKn: 447 },
  { type: "Airbus A220-300", detail: "Narrow-body · built in Mirabel", cruiseKn: 447 },
  { type: "Boeing 737 MAX 8", detail: "Narrow-body", cruiseKn: 453 },
  { type: "Embraer E175", detail: "Regional (Jazz)", cruiseKn: 447 },
  { type: "Bombardier CRJ900", detail: "Regional (Jazz)", cruiseKn: 447 },
  { type: "De Havilland Dash 8-400", detail: "Regional turboprop (Jazz)", cruiseKn: 360 },
  { type: "Airbus A380", detail: "Super-jumbo", cruiseKn: 488 },
  { type: "Boeing 747-400", detail: "Queen of the Skies", cruiseKn: 492 },
  { type: "Airbus A350-1000", detail: "Long-haul", cruiseKn: 488 },
];
export const DEFAULT_AIRCRAFT = AIRCRAFT[0].type;

export interface FlightState {
  phase: Phase;
  origin: string;
  destination: string;
  durationMinutes: number;
  elapsedMs: number;
  remainingMs: number;
  progress: number;
  /** Aircraft type flown this session, e.g. "Boeing 777-300ER". */
  aircraft: string;
  /** Nautical miles for the route (fictional-but-plausible), for the deck readout. */
  distanceNm: number;
}

export interface FlightRecord {
  minutes: number;
  endedAt: number;
  origin: string;
  destination: string;
}

export interface FlightStats {
  todayFlights: number;
  todayMinutes: number;
  last?: FlightRecord;
}

const SEGMENTS = 10;
const TICK_MS = 1000;
const HISTORY_KEY = "airCanada.flight.history";
const EXTEND_CHIPS = [5, 10, 15, 30, 60];

// great-circle-ish distances (nm) for common Air Canada city pairs
const ROUTE_NM: Record<string, number> = {
  "YYZ-YVR": 1804, "YYZ-YUL": 275, "YYZ-YYC": 1456, "YYZ-YOW": 194, "YYZ-YHZ": 688, "YYZ-YWG": 811,
  "YYZ-LHR": 3090, "YYZ-CDG": 3250, "YYZ-NRT": 5600, "YYZ-LAX": 1890, "YYZ-JFK": 310, "YYZ-MIA": 1080,
  "YUL-YVR": 1990, "YUL-CDG": 2990, "YUL-LHR": 2820, "YUL-YYC": 1640, "YVR-YYC": 370, "YVR-NRT": 4060,
  "YVR-SYD": 6750, "YVR-LHR": 4100, "YVR-LAX": 940, "YYC-LHR": 3800, "YUL-YQB": 130, "YYZ-YEG": 1450,
};

const DURATION_PICKS = [
  { label: "$(watch) 25 min", description: "Short hop", minutes: 25 },
  { label: "$(watch) 50 min", description: "Domestic", minutes: 50 },
  { label: "$(watch) 90 min", description: "International", minutes: 90 },
  { label: "$(edit) Custom…", description: "Enter minutes", minutes: -1 },
];

/**
 * Coding-session timer rendered as a flight in the status bar: the ✈ taxis
 * from origin to destination over the block time. Click to board / pause /
 * resume. Exposes `state` + `onDidChange` for the Session view.
 */
export class FlightTracker implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly changeEmitter = new vscode.EventEmitter<FlightState>();
  readonly onDidChange = this.changeEmitter.event;

  private phase: Phase = "idle";
  private elapsedMs = 0;
  private lastTick = 0;
  private sessionMs = 0;
  private timer: NodeJS.Timeout | undefined;
  private tooltipKey = "";

  constructor(private readonly context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem("airCanada.flight", vscode.StatusBarAlignment.Left, 1000);
    this.item.name = "Air Canada Flight";
    this.item.command = "airCanada.flight.openDeck";
    this.sessionMs = this.defaultDurationMs;
    this.disposables.push(
      this.item,
      this.changeEmitter,
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("airCanada.flight")) {
          if (this.phase === "idle" || this.phase === "landed") this.sessionMs = this.defaultDurationMs;
          this.render();
        }
      }),
    );

    this.render();
    if (this.cfg<boolean>("autoStart", false)) this.start();
  }

  // ------------------------------------------------------------ public API

  get state(): FlightState {
    const elapsed = this.phase === "idle" ? 0 : Math.min(this.elapsedMs, this.sessionMs);
    return {
      phase: this.phase,
      origin: this.origin,
      destination: this.destination,
      durationMinutes: Math.round(this.sessionMs / 60_000),
      elapsedMs: elapsed,
      remainingMs: Math.max(0, this.sessionMs - elapsed),
      progress: this.sessionMs ? Math.min(1, elapsed / this.sessionMs) : 0,
      aircraft: this.aircraft,
      distanceNm: ROUTE_NM[`${this.origin}-${this.destination}`] ?? ROUTE_NM[`${this.destination}-${this.origin}`] ?? 1000,
    };
  }

  get stats(): FlightStats {
    const history = this.context.globalState.get<FlightRecord[]>(HISTORY_KEY, []);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = history.filter((r) => r.endedAt >= start.getTime());
    return {
      todayFlights: today.length,
      todayMinutes: today.reduce((a, r) => a + r.minutes, 0),
      last: history[history.length - 1],
    };
  }

  /** Add time to the flight in progress. */
  extend(minutes: number): void {
    if (this.phase !== "flying" && this.phase !== "paused") return;
    const add = Math.max(1, Math.min(600, Math.round(minutes)));
    this.sessionMs = Math.min(600 * 60_000, this.sessionMs + add * 60_000);
    this.render();
    void vscode.window.setStatusBarMessage(`✈ Flight extended by ${add} min — ${clock(this.state.remainingMs)} remaining`, 3000);
  }

  async extendCustom(): Promise<void> {
    if (this.phase !== "flying" && this.phase !== "paused") return;
    const raw = await vscode.window.showInputBox({
      title: "Extend flight by how many minutes?",
      value: "20",
      validateInput: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 600 ? undefined : "Enter 1–600"),
    });
    if (raw) this.extend(+raw);
  }

  /** Abort the flight in progress (back to the gate). */
  cancel(): void {
    if (this.phase === "idle") return;
    const was = this.phase;
    this.reset();
    if (was === "flying" || was === "paused") void vscode.window.setStatusBarMessage("✈ Flight cancelled — back at the gate", 3000);
  }

  /** Pick the aircraft type shown on the deck and in the hover. */
  async setAircraft(): Promise<void> {
    const current = this.aircraft;
    const pick = await vscode.window.showQuickPick(
      AIRCRAFT.map((a) => ({
        label: `${a.type === current ? "$(check) " : "$(rocket) "}${a.type}`,
        description: a.detail,
        detail: `Cruise ${a.cruiseKn} kn`,
        type: a.type,
      })),
      { title: "Aircraft type", placeHolder: "Which aircraft are you flying today?", matchOnDescription: true },
    );
    if (!pick) return;
    await vscode.workspace.getConfiguration("airCanada.flight").update("aircraft", pick.type, vscode.ConfigurationTarget.Global);
    this.render();
  }

  /** Swap origin/destination and take off with the same block time. */
  async returnFlight(): Promise<void> {
    const minutes = Math.round(this.sessionMs / 60_000) || Math.round(this.defaultDurationMs / 60_000);
    const cfg = vscode.workspace.getConfiguration("airCanada.flight");
    const [o, d] = [this.origin, this.destination];
    await cfg.update("origin", d, vscode.ConfigurationTarget.Global);
    await cfg.update("destination", o, vscode.ConfigurationTarget.Global);
    this.start(minutes);
  }

  /** Interactive start: pick the session length, then take off. */
  async board(): Promise<void> {
    const def = Math.round(this.defaultDurationMs / 60_000);
    const pick = await vscode.window.showQuickPick(
      [{ label: `$(rocket) ${def} min`, description: "Default (airCanada.flight.durationMinutes)", minutes: def }, ...DURATION_PICKS],
      { title: "Board flight — how long is this coding session?", placeHolder: "Block time" },
    );
    if (!pick) return;
    let minutes = pick.minutes;
    if (minutes < 0) {
      const raw = await vscode.window.showInputBox({
        title: "Session length (minutes)",
        value: String(def),
        validateInput: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 600 ? undefined : "Enter 1–600"),
      });
      if (!raw) return;
      minutes = +raw;
    }
    this.start(minutes);
  }

  /** Start a flight. `minutes` overrides the configured block time for this flight only. */
  start(minutes?: number): void {
    if (!this.cfg<boolean>("enabled", true)) {
      void vscode.window.showInformationMessage("Flight timer is disabled (airCanada.flight.enabled).");
      return;
    }
    this.sessionMs = minutes && minutes > 0 ? Math.min(600, minutes) * 60_000 : this.defaultDurationMs;
    this.elapsedMs = 0;
    this.lastTick = Date.now();
    this.phase = "flying";
    this.ensureTimer();
    this.render();
    void vscode.window.setStatusBarMessage(
      `✈ Cleared for takeoff — ${this.aircraft}, ${this.origin} → ${this.destination}, ${Math.round(this.sessionMs / 60_000)} min`,
      5000,
    );
  }

  pause(): void {
    if (this.phase !== "flying") return;
    this.phase = "paused";
    this.stopTimer();
    this.render();
    void vscode.window.setStatusBarMessage("✈ Holding pattern — session paused", 3000);
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.phase = "flying";
    this.lastTick = Date.now();
    this.ensureTimer();
    this.render();
  }

  toggle(): void {
    switch (this.phase) {
      case "idle":
      case "landed":
        void this.board();
        break;
      case "flying":
        this.pause();
        break;
      case "paused":
        this.resume();
        break;
    }
  }

  reset(): void {
    this.stopTimer();
    this.phase = "idle";
    this.elapsedMs = 0;
    this.sessionMs = this.defaultDurationMs;
    this.render();
  }

  /** Edit the route: both ends by default, or just one when `only` is given. */
  async setRoute(only?: "origin" | "destination"): Promise<void> {
    const cfg = vscode.workspace.getConfiguration("airCanada.flight");
    if (only !== "destination") {
      const origin = await vscode.window.showInputBox({
        title: "Flight route — departure",
        prompt: "Airport code (e.g. YYZ, YUL, YVR)",
        value: this.origin,
        validateInput: validateCode,
      });
      if (origin === undefined) return;
      await cfg.update("origin", origin.toUpperCase(), vscode.ConfigurationTarget.Global);
    }
    if (only !== "origin") {
      const destination = await vscode.window.showInputBox({
        title: "Flight route — arrival",
        prompt: "Airport code (e.g. YYZ, YUL, YVR)",
        value: this.destination,
        validateInput: validateCode,
      });
      if (destination === undefined) return;
      await cfg.update("destination", destination.toUpperCase(), vscode.ConfigurationTarget.Global);
    }
    this.render();
  }

  /** Change the default block time (persisted). */
  async setDuration(): Promise<void> {
    const pick = await vscode.window.showQuickPick(DURATION_PICKS, { title: "Default session length" });
    if (!pick) return;
    let minutes = pick.minutes;
    if (minutes < 0) {
      const raw = await vscode.window.showInputBox({
        title: "Default session length (minutes)",
        value: String(Math.round(this.defaultDurationMs / 60_000)),
        validateInput: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 600 ? undefined : "Enter 1–600"),
      });
      if (!raw) return;
      minutes = +raw;
    }
    await vscode.workspace
      .getConfiguration("airCanada.flight")
      .update("durationMinutes", minutes, vscode.ConfigurationTarget.Global);
    if (this.phase === "idle" || this.phase === "landed") this.sessionMs = minutes * 60_000;
    this.render();
  }

  dispose(): void {
    this.stopTimer();
    for (const d of this.disposables) d.dispose();
  }

  // ------------------------------------------------------------- internals

  private cfg<T>(key: string, fallback: T): T {
    return vscode.workspace.getConfiguration("airCanada.flight").get<T>(key, fallback);
  }
  private get origin(): string {
    return (this.cfg<string>("origin", "YYZ") || "YYZ").toUpperCase().slice(0, 4);
  }
  private get destination(): string {
    return (this.cfg<string>("destination", "YVR") || "YVR").toUpperCase().slice(0, 4);
  }
  private get defaultDurationMs(): number {
    return Math.min(600, Math.max(1, this.cfg<number>("durationMinutes", 50))) * 60_000;
  }
  private get aircraft(): string {
    return this.cfg<string>("aircraft", DEFAULT_AIRCRAFT) || DEFAULT_AIRCRAFT;
  }

  private ensureTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }
  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private tick(): void {
    if (this.phase !== "flying") return;
    const now = Date.now();
    this.elapsedMs += now - this.lastTick;
    this.lastTick = now;
    if (this.elapsedMs >= this.sessionMs) {
      this.land();
      return;
    }
    this.render();
  }

  private land(): void {
    this.stopTimer();
    this.phase = "landed";
    this.elapsedMs = this.sessionMs;
    const minutes = Math.round(this.sessionMs / 60_000);
    const history = this.context.globalState.get<FlightRecord[]>(HISTORY_KEY, []);
    const cutoff = Date.now() - 30 * 86_400_000;
    history.push({ minutes, endedAt: Date.now(), origin: this.origin, destination: this.destination });
    void this.context.globalState.update(HISTORY_KEY, history.filter((r) => r.endedAt >= cutoff));
    this.render();
    void vscode.window
      .showInformationMessage(`✈ Landed at ${this.destination}. ${minutes} min of focus — take a stretch.`, "Return flight", "New flight")
      .then((choice) => {
        if (choice === "Return flight") void this.returnFlight();
        else if (choice === "New flight") void this.board();
      });
  }

  private render(): void {
    void vscode.commands.executeCommand("setContext", "airCanada.flight.phase", this.phase);
    const s = this.state;

    if (!this.cfg<boolean>("enabled", true)) {
      this.item.hide();
      this.changeEmitter.fire(s);
      return;
    }

    switch (s.phase) {
      case "idle":
        this.item.text = `✈ ${s.origin} → ${s.destination}`;
        break;
      case "flying":
        this.item.text = `${s.origin} ${track(s.progress)} ${s.destination}  ${clock(s.remainingMs)}`;
        break;
      case "paused":
        this.item.text = `${s.origin} ${track(s.progress)} ${s.destination}  ⏸ ${clock(s.remainingMs)}`;
        break;
      case "landed":
        this.item.text = `✈ Landed ${s.destination}`;
        break;
    }
    // The hover is rebuilt only when something other than the clock changes —
    // reassigning it every tick makes VS Code re-render it under the cursor.
    const key = `${s.phase}|${s.origin}|${s.destination}|${s.durationMinutes}|${s.aircraft}`;
    if (key !== this.tooltipKey) {
      this.tooltipKey = key;
      this.item.tooltip = this.tooltip(s);
    }
    this.item.show();
    this.changeEmitter.fire(s);
  }

  private tooltip(s: FlightState): vscode.MarkdownString {
    const cmd = (id: string, args?: unknown[]) => `command:${id}${args ? `?${encodeURIComponent(JSON.stringify(args))}` : ""}`;
    // VS Code's hover sanitizer keeps a <span style> only when it matches, in
    // this order: color:#hex;background-color:#hex;display:inline-block;border-radius:Npx;
    // No padding/margin — &nbsp; does the horizontal padding, inline-block the
    // button body. Wrapped in a command link so the whole pill is clickable.
    const RED = "#F01428";
    const GREY = "#3A3F4A";
    // Vertical padding: padding/line-height are stripped, but <sup>/<sub> are
    // allowed and each grows the inline box upward/downward by ~a third of a
    // line, so a blank one at either end pads the pill top and bottom evenly.
    const pill = (label: string, link: string, bg = RED) =>
      `[<span style="color:#ffffff;background-color:${bg};display:inline-block;border-radius:5px;"><sup>&nbsp;</sup>&nbsp;&nbsp;${label}&nbsp;&nbsp;<sub>&nbsp;</sub></span>](${link})`;
    const row = (...pills: string[]) => pills.join("&nbsp;&nbsp;") + "\n\n";
    // Margins are stripped too, so a blank paragraph is the only way to open
    // up space between the header text and the buttons.
    const spacer = "&nbsp;\n\n";

    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = true;
    md.supportHtml = true;
    const route = `${s.origin} → ${s.destination}`;
    switch (s.phase) {
      case "idle":
        md.appendMarkdown(`**✈ ${s.aircraft}** &nbsp;·&nbsp; ${route}\n\n`);
        md.appendMarkdown(`At gate &nbsp;·&nbsp; default block ${s.durationMinutes} min\n\n`);
        md.appendMarkdown(spacer);
        md.appendMarkdown(
          row(
            pill("25 min", cmd("airCanada.flight.start", [25])),
            pill("50 min", cmd("airCanada.flight.start", [50])),
            pill("90 min", cmd("airCanada.flight.start", [90])),
            pill("Custom…", cmd("airCanada.flight.board")),
          ),
        );
        md.appendMarkdown(spacer);
        md.appendMarkdown(
          row(
            pill("Flight deck", cmd("airCanada.flight.openDeck"), GREY),
            pill("Aircraft", cmd("airCanada.flight.setAircraft"), GREY),
            pill("Route", cmd("airCanada.flight.setRoute"), GREY),
            pill("Default length", cmd("airCanada.flight.setDuration"), GREY),
          ),
        );
        break;
      case "flying":
      case "paused":
        md.appendMarkdown(`**✈ ${s.phase === "flying" ? "En route" : "Holding"}** &nbsp;·&nbsp; ${s.aircraft} &nbsp;·&nbsp; ${route} &nbsp;·&nbsp; ${s.durationMinutes} min block\n\n`);
        md.appendMarkdown(spacer);
        md.appendMarkdown(`Extend\n\n`);
        md.appendMarkdown(
          row(
            ...EXTEND_CHIPS.map((m) => pill(`+${m >= 60 ? `${m / 60} h` : `${m}`}`, cmd("airCanada.flight.extend", [m]))),
            pill("Custom…", cmd("airCanada.flight.extendCustom")),
          ),
        );
        md.appendMarkdown(spacer);
        md.appendMarkdown(
          row(
            s.phase === "flying" ? pill("⏸ Pause", cmd("airCanada.flight.pause"), GREY) : pill("▶ Resume", cmd("airCanada.flight.resume"), GREY),
            pill("✕ Cancel", cmd("airCanada.flight.cancel"), "#B3201F"),
            pill("Flight deck", cmd("airCanada.flight.openDeck"), GREY),
          ),
        );
        break;
      case "landed":
        md.appendMarkdown(`**✈ Landed at ${s.destination}** &nbsp;·&nbsp; ${s.aircraft} &nbsp;·&nbsp; ${s.durationMinutes} min\n\n`);
        md.appendMarkdown(spacer);
        md.appendMarkdown(
          row(
            pill("↩ Return flight", cmd("airCanada.flight.returnFlight")),
            pill("New flight", cmd("airCanada.flight.board")),
            pill("Flight deck", cmd("airCanada.flight.openDeck"), GREY),
          ),
        );
        break;
    }
    return md;
  }
}

// ------------------------------------------------------------------ helpers

export function track(progress: number, segments = SEGMENTS): string {
  const pos = Math.min(segments, Math.floor(progress * (segments + 1)));
  return "─".repeat(pos) + "✈" + "·".repeat(segments - pos);
}

export function clock(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function validateCode(v: string): string | undefined {
  return /^[A-Za-z0-9]{3,4}$/.test(v.trim()) ? undefined : "3–4 letters, e.g. YYZ";
}
