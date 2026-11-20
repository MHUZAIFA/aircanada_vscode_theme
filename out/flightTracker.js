"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightTracker = exports.DEFAULT_AIRCRAFT = exports.AIRCRAFT = void 0;
exports.track = track;
exports.clock = clock;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
/** Popular types, Air Canada fleet first. Cruise speed (kn) drives nothing yet — shown for flavour. */
exports.AIRCRAFT = [
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
exports.DEFAULT_AIRCRAFT = exports.AIRCRAFT[0].type;
const SEGMENTS = 10;
const TICK_MS = 1000;
const HISTORY_KEY = "airCanada.flight.history";
const EXTEND_CHIPS = [5, 10, 15, 30, 60];
const SHARED_FILE = "flight.json";
const SYNC_POLL_MS = 2000;
// great-circle-ish distances (nm) for common Air Canada city pairs
const ROUTE_NM = {
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
class FlightTracker {
    constructor(context) {
        this.context = context;
        this.disposables = [];
        this.changeEmitter = new vscode.EventEmitter();
        this.onDidChange = this.changeEmitter.event;
        this.phase = "idle";
        this.elapsedMs = 0;
        this.resumedAt = 0;
        this.sessionMs = 0;
        this.flightId = "";
        this.rev = "";
        this.tooltipKey = "";
        this.item = vscode.window.createStatusBarItem("airCanada.flight", vscode.StatusBarAlignment.Left, 1000);
        this.item.name = "Air Canada Flight";
        this.item.command = "airCanada.flight.openDeck";
        this.sessionMs = this.defaultDurationMs;
        this.syncDir = context.globalStorageUri.fsPath;
        this.disposables.push(this.item, this.changeEmitter, vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("airCanada.flight")) {
                if (this.phase === "idle" || this.phase === "landed")
                    this.sessionMs = this.defaultDurationMs;
                this.render();
            }
        }));
        this.initSync();
        this.render();
        // Only board automatically if no other window already has a flight going.
        if (this.cfg("autoStart", false) && (this.phase === "idle" || this.phase === "landed"))
            this.start();
    }
    // ------------------------------------------------------------ public API
    get state() {
        const elapsed = this.phase === "idle" ? 0 : Math.min(this.currentElapsed(), this.sessionMs);
        return {
            phase: this.phase,
            origin: this.origin,
            destination: this.destination,
            durationMinutes: Math.round(this.sessionMs / 60000),
            elapsedMs: elapsed,
            remainingMs: Math.max(0, this.sessionMs - elapsed),
            progress: this.sessionMs ? Math.min(1, elapsed / this.sessionMs) : 0,
            aircraft: this.aircraft,
            distanceNm: ROUTE_NM[`${this.origin}-${this.destination}`] ?? ROUTE_NM[`${this.destination}-${this.origin}`] ?? 1000,
        };
    }
    get stats() {
        const history = this.context.globalState.get(HISTORY_KEY, []);
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
    extend(minutes) {
        if (this.phase !== "flying" && this.phase !== "paused")
            return;
        const add = Math.max(1, Math.min(600, Math.round(minutes)));
        this.sessionMs = Math.min(600 * 60000, this.sessionMs + add * 60000);
        this.save();
        this.render();
        void vscode.window.setStatusBarMessage(`✈ Flight extended by ${add} min — ${clock(this.state.remainingMs)} remaining`, 3000);
    }
    async extendCustom() {
        if (this.phase !== "flying" && this.phase !== "paused")
            return;
        const raw = await vscode.window.showInputBox({
            title: "Extend flight by how many minutes?",
            value: "20",
            validateInput: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 600 ? undefined : "Enter 1–600"),
        });
        if (raw)
            this.extend(+raw);
    }
    /** Abort the flight in progress (back to the gate). */
    cancel() {
        if (this.phase === "idle")
            return;
        const was = this.phase;
        this.reset();
        if (was === "flying" || was === "paused")
            void vscode.window.setStatusBarMessage("✈ Flight cancelled — back at the gate", 3000);
    }
    /** Pick the aircraft type shown on the deck and in the hover. */
    async setAircraft() {
        const current = this.aircraft;
        const pick = await vscode.window.showQuickPick(exports.AIRCRAFT.map((a) => ({
            label: `${a.type === current ? "$(check) " : "$(rocket) "}${a.type}`,
            description: a.detail,
            detail: `Cruise ${a.cruiseKn} kn`,
            type: a.type,
        })), { title: "Aircraft type", placeHolder: "Which aircraft are you flying today?", matchOnDescription: true });
        if (!pick)
            return;
        await vscode.workspace.getConfiguration("airCanada.flight").update("aircraft", pick.type, vscode.ConfigurationTarget.Global);
        this.render();
    }
    /** Swap origin/destination and take off with the same block time. */
    async returnFlight() {
        const minutes = Math.round(this.sessionMs / 60000) || Math.round(this.defaultDurationMs / 60000);
        const cfg = vscode.workspace.getConfiguration("airCanada.flight");
        const [o, d] = [this.origin, this.destination];
        await cfg.update("origin", d, vscode.ConfigurationTarget.Global);
        await cfg.update("destination", o, vscode.ConfigurationTarget.Global);
        this.start(minutes);
    }
    /** Interactive start: pick the session length, then take off. */
    async board() {
        const def = Math.round(this.defaultDurationMs / 60000);
        const pick = await vscode.window.showQuickPick([{ label: `$(rocket) ${def} min`, description: "Default (airCanada.flight.durationMinutes)", minutes: def }, ...DURATION_PICKS], { title: "Board flight — how long is this coding session?", placeHolder: "Block time" });
        if (!pick)
            return;
        let minutes = pick.minutes;
        if (minutes < 0) {
            const raw = await vscode.window.showInputBox({
                title: "Session length (minutes)",
                value: String(def),
                validateInput: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 600 ? undefined : "Enter 1–600"),
            });
            if (!raw)
                return;
            minutes = +raw;
        }
        this.start(minutes);
    }
    /** Start a flight. `minutes` overrides the configured block time for this flight only. */
    start(minutes) {
        if (!this.cfg("enabled", true)) {
            void vscode.window.showInformationMessage("Flight timer is disabled (airCanada.flight.enabled).");
            return;
        }
        this.sessionMs = minutes && minutes > 0 ? Math.min(600, minutes) * 60000 : this.defaultDurationMs;
        this.elapsedMs = 0;
        this.resumedAt = Date.now();
        this.flightId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        this.phase = "flying";
        this.ensureTimer();
        this.save();
        this.render();
        void vscode.window.setStatusBarMessage(`✈ Cleared for takeoff — ${this.aircraft}, ${this.origin} → ${this.destination}, ${Math.round(this.sessionMs / 60000)} min`, 5000);
    }
    pause() {
        if (this.phase !== "flying")
            return;
        this.elapsedMs = this.currentElapsed();
        this.phase = "paused";
        this.stopTimer();
        this.save();
        this.render();
        void vscode.window.setStatusBarMessage("✈ Holding pattern — session paused", 3000);
    }
    resume() {
        if (this.phase !== "paused")
            return;
        this.phase = "flying";
        this.resumedAt = Date.now();
        this.ensureTimer();
        this.save();
        this.render();
    }
    toggle() {
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
    reset() {
        this.stopTimer();
        this.phase = "idle";
        this.elapsedMs = 0;
        this.sessionMs = this.defaultDurationMs;
        this.save();
        this.render();
    }
    /** Edit the route: both ends by default, or just one when `only` is given. */
    async setRoute(only) {
        const cfg = vscode.workspace.getConfiguration("airCanada.flight");
        if (only !== "destination") {
            const origin = await vscode.window.showInputBox({
                title: "Flight route — departure",
                prompt: "Airport code (e.g. YYZ, YUL, YVR)",
                value: this.origin,
                validateInput: validateCode,
            });
            if (origin === undefined)
                return;
            await cfg.update("origin", origin.toUpperCase(), vscode.ConfigurationTarget.Global);
        }
        if (only !== "origin") {
            const destination = await vscode.window.showInputBox({
                title: "Flight route — arrival",
                prompt: "Airport code (e.g. YYZ, YUL, YVR)",
                value: this.destination,
                validateInput: validateCode,
            });
            if (destination === undefined)
                return;
            await cfg.update("destination", destination.toUpperCase(), vscode.ConfigurationTarget.Global);
        }
        this.render();
    }
    /** Change the default block time (persisted). */
    async setDuration() {
        const pick = await vscode.window.showQuickPick(DURATION_PICKS, { title: "Default session length" });
        if (!pick)
            return;
        let minutes = pick.minutes;
        if (minutes < 0) {
            const raw = await vscode.window.showInputBox({
                title: "Default session length (minutes)",
                value: String(Math.round(this.defaultDurationMs / 60000)),
                validateInput: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 600 ? undefined : "Enter 1–600"),
            });
            if (!raw)
                return;
            minutes = +raw;
        }
        await vscode.workspace
            .getConfiguration("airCanada.flight")
            .update("durationMinutes", minutes, vscode.ConfigurationTarget.Global);
        if (this.phase === "idle" || this.phase === "landed")
            this.sessionMs = minutes * 60000;
        this.render();
    }
    dispose() {
        this.stopTimer();
        this.watcher?.close();
        if (this.poller)
            clearInterval(this.poller);
        for (const d of this.disposables)
            d.dispose();
    }
    // ------------------------------------------------------------- internals
    cfg(key, fallback) {
        return vscode.workspace.getConfiguration("airCanada.flight").get(key, fallback);
    }
    get origin() {
        return (this.cfg("origin", "YYZ") || "YYZ").toUpperCase().slice(0, 4);
    }
    get destination() {
        return (this.cfg("destination", "YVR") || "YVR").toUpperCase().slice(0, 4);
    }
    get defaultDurationMs() {
        return Math.min(600, Math.max(1, this.cfg("durationMinutes", 50))) * 60000;
    }
    get aircraft() {
        return this.cfg("aircraft", exports.DEFAULT_AIRCRAFT) || exports.DEFAULT_AIRCRAFT;
    }
    ensureTimer() {
        if (this.timer)
            return;
        this.timer = setInterval(() => this.tick(), TICK_MS);
    }
    stopTimer() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = undefined;
    }
    currentElapsed() {
        return this.phase === "flying" ? this.elapsedMs + (Date.now() - this.resumedAt) : this.elapsedMs;
    }
    tick() {
        if (this.phase !== "flying")
            return;
        if (this.currentElapsed() >= this.sessionMs) {
            this.land();
            return;
        }
        this.render();
    }
    land() {
        this.stopTimer();
        this.phase = "landed";
        this.elapsedMs = this.sessionMs;
        this.save();
        this.render();
        this.onLanded();
    }
    /**
     * Every window notices the landing, but only one logs it and only one shows
     * the notification: whichever first creates the marker file. The focused
     * window tries straight away; the others wait a moment, so the message lands
     * where you're working.
     */
    onLanded() {
        const id = this.flightId;
        if (!id)
            return;
        const minutes = Math.round(this.sessionMs / 60000);
        const [origin, destination] = [this.origin, this.destination];
        if (this.claim(`landed-${id}.log`)) {
            const history = this.context.globalState.get(HISTORY_KEY, []);
            const cutoff = Date.now() - 30 * 86400000;
            history.push({ minutes, endedAt: Date.now(), origin, destination });
            void this.context.globalState.update(HISTORY_KEY, history.filter((r) => r.endedAt >= cutoff));
        }
        const announce = () => {
            if (!this.claim(`landed-${id}.notify`))
                return;
            void vscode.window
                .showInformationMessage(`✈ Landed at ${destination}. ${minutes} min of focus — take a stretch.`, "Return flight", "New flight")
                .then((choice) => {
                if (choice === "Return flight")
                    void this.returnFlight();
                else if (choice === "New flight")
                    void this.board();
            });
        };
        if (vscode.window.state.focused)
            announce();
        else
            setTimeout(announce, 1500);
    }
    // ------------------------------------------------------- cross-window sync
    initSync() {
        try {
            fs.mkdirSync(this.syncDir, { recursive: true });
            this.pruneMarkers();
        }
        catch {
            return; // no shared storage: behave as a single-window timer
        }
        this.syncFromDisk();
        try {
            this.watcher = fs.watch(this.syncDir, (_e, name) => {
                if (!name || name.toString() === SHARED_FILE)
                    this.syncFromDisk();
            });
        }
        catch {
            /* the poll below still keeps windows in step */
        }
        // fs.watch can miss events on some file systems; a light poll backs it up.
        this.poller = setInterval(() => this.syncFromDisk(), SYNC_POLL_MS);
    }
    save() {
        this.rev = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const shared = {
            rev: this.rev,
            flightId: this.flightId,
            phase: this.phase,
            sessionMs: this.sessionMs,
            elapsedMs: this.elapsedMs,
            resumedAt: this.resumedAt,
        };
        try {
            const file = path.join(this.syncDir, SHARED_FILE);
            const tmp = `${file}.${process.pid}.tmp`;
            fs.writeFileSync(tmp, JSON.stringify(shared));
            fs.renameSync(tmp, file); // atomic, so other windows never read half a file
        }
        catch {
            /* sharing is best-effort; this window keeps working on its own */
        }
    }
    syncFromDisk() {
        let shared;
        try {
            shared = JSON.parse(fs.readFileSync(path.join(this.syncDir, SHARED_FILE), "utf8"));
        }
        catch {
            return;
        }
        if (!shared || shared.rev === this.rev)
            return;
        const was = this.phase;
        this.rev = shared.rev;
        this.flightId = shared.flightId;
        this.phase = shared.phase;
        this.sessionMs = shared.phase === "idle" ? this.defaultDurationMs : shared.sessionMs;
        this.elapsedMs = shared.elapsedMs;
        this.resumedAt = shared.resumedAt;
        if (this.phase === "flying") {
            // A flight that ended while no window was watching lands now.
            if (this.currentElapsed() >= this.sessionMs)
                return this.land();
            this.ensureTimer();
        }
        else
            this.stopTimer();
        this.render();
        if (this.phase === "landed" && was !== "landed")
            this.onLanded();
    }
    /** Create a marker file exclusively; true for the one window that wins. */
    claim(name) {
        try {
            fs.writeFileSync(path.join(this.syncDir, name), "", { flag: "wx" });
            return true;
        }
        catch (e) {
            // Without shared storage there's only this window, so it always "wins".
            return e.code !== "EEXIST";
        }
    }
    pruneMarkers() {
        const cutoff = Date.now() - 2 * 86400000;
        for (const name of fs.readdirSync(this.syncDir)) {
            if (!name.startsWith("landed-"))
                continue;
            const file = path.join(this.syncDir, name);
            try {
                if (fs.statSync(file).mtimeMs < cutoff)
                    fs.unlinkSync(file);
            }
            catch {
                /* another window removed it first */
            }
        }
    }
    render() {
        void vscode.commands.executeCommand("setContext", "airCanada.flight.phase", this.phase);
        const s = this.state;
        if (!this.cfg("enabled", true)) {
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
    tooltip(s) {
        const cmd = (id, args) => `command:${id}${args ? `?${encodeURIComponent(JSON.stringify(args))}` : ""}`;
        // VS Code's hover sanitizer keeps a <span style> only when it matches, in
        // this order: color:#hex;background-color:#hex;display:inline-block;border-radius:Npx;
        // No padding/margin — &nbsp; does the horizontal padding, inline-block the
        // button body. Wrapped in a command link so the whole pill is clickable.
        const RED = "#F01428";
        const GREY = "#3A3F4A";
        // Vertical padding: padding/line-height are stripped, but <sup>/<sub> are
        // allowed and each grows the inline box upward/downward by ~a third of a
        // line, so a blank one at either end pads the pill top and bottom evenly.
        const pill = (label, link, bg = RED) => `[<span style="color:#ffffff;background-color:${bg};display:inline-block;border-radius:5px;"><sup>&nbsp;</sup>&nbsp;&nbsp;${label}&nbsp;&nbsp;<sub>&nbsp;</sub></span>](${link})`;
        const row = (...pills) => pills.join("&nbsp;&nbsp;") + "\n\n";
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
                md.appendMarkdown(row(pill("25 min", cmd("airCanada.flight.start", [25])), pill("50 min", cmd("airCanada.flight.start", [50])), pill("90 min", cmd("airCanada.flight.start", [90])), pill("Custom…", cmd("airCanada.flight.board"))));
                md.appendMarkdown(spacer);
                md.appendMarkdown(row(pill("Flight deck", cmd("airCanada.flight.openDeck"), GREY), pill("Aircraft", cmd("airCanada.flight.setAircraft"), GREY), pill("Route", cmd("airCanada.flight.setRoute"), GREY), pill("Default length", cmd("airCanada.flight.setDuration"), GREY)));
                break;
            case "flying":
            case "paused":
                md.appendMarkdown(`**✈ ${s.phase === "flying" ? "En route" : "Holding"}** &nbsp;·&nbsp; ${s.aircraft} &nbsp;·&nbsp; ${route} &nbsp;·&nbsp; ${s.durationMinutes} min block\n\n`);
                md.appendMarkdown(spacer);
                md.appendMarkdown(`Extend\n\n`);
                md.appendMarkdown(row(...EXTEND_CHIPS.map((m) => pill(`+${m >= 60 ? `${m / 60} h` : `${m}`}`, cmd("airCanada.flight.extend", [m]))), pill("Custom…", cmd("airCanada.flight.extendCustom"))));
                md.appendMarkdown(spacer);
                md.appendMarkdown(row(s.phase === "flying" ? pill("⏸ Pause", cmd("airCanada.flight.pause"), GREY) : pill("▶ Resume", cmd("airCanada.flight.resume"), GREY), pill("✕ Cancel", cmd("airCanada.flight.cancel"), "#B3201F"), pill("Flight deck", cmd("airCanada.flight.openDeck"), GREY)));
                break;
            case "landed":
                md.appendMarkdown(`**✈ Landed at ${s.destination}** &nbsp;·&nbsp; ${s.aircraft} &nbsp;·&nbsp; ${s.durationMinutes} min\n\n`);
                md.appendMarkdown(spacer);
                md.appendMarkdown(row(pill("↩ Return flight", cmd("airCanada.flight.returnFlight")), pill("New flight", cmd("airCanada.flight.board")), pill("Flight deck", cmd("airCanada.flight.openDeck"), GREY)));
                break;
        }
        return md;
    }
}
exports.FlightTracker = FlightTracker;
// ------------------------------------------------------------------ helpers
function track(progress, segments = SEGMENTS) {
    const pos = Math.min(segments, Math.floor(progress * (segments + 1)));
    return "─".repeat(pos) + "✈" + "·".repeat(segments - pos);
}
function clock(ms) {
    const total = Math.round(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function validateCode(v) {
    return /^[A-Za-z0-9]{3,4}$/.test(v.trim()) ? undefined : "3–4 letters, e.g. YYZ";
}
//# sourceMappingURL=flightTracker.js.map