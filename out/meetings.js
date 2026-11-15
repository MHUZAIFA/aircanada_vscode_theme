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
exports.Meetings = void 0;
exports.parseWhen = parseWhen;
exports.platformOf = platformOf;
exports.hhmm = hhmm;
const vscode = __importStar(require("vscode"));
const KEY = "airCanada.meetings.reminders";
const TICK_MS = 15000;
/**
 * Manual meeting reminders — no calendar accounts. You type the meeting in;
 * `leadMinutes` before it starts, the plane flies by with the card. Rendered
 * by the Flight Deck webview; this class owns data, prompts and scheduling.
 */
class Meetings {
    constructor(context, flyby) {
        this.context = context;
        this.flyby = flyby;
        this.emitter = new vscode.EventEmitter();
        this.onDidChange = this.emitter.event;
        this.snoozed = new Map();
        this.notifyCount = 0;
        this.timer = setInterval(() => this.tick(), TICK_MS);
        this.prune();
    }
    // ------------------------------------------------------------ storage
    get reminders() {
        return this.context.globalState.get(KEY, []).sort((a, b) => a.start - b.start);
    }
    get upcomingCount() {
        const now = Date.now();
        return this.reminders.filter((r) => r.start + r.durationMin * 60000 > now).length;
    }
    find(arg) {
        const id = typeof arg === "string" ? arg : arg?.id;
        return this.reminders.find((r) => r.id === id);
    }
    async save(list) {
        await this.context.globalState.update(KEY, list);
        this.emitter.fire();
    }
    // ------------------------------------------------------------ actions
    async add() {
        const title = await vscode.window.showInputBox({
            title: "Meeting reminder (1/4) — what is it?",
            placeHolder: "e.g. Sprint sync with Flight Ops",
            ignoreFocusOut: true,
            validateInput: (v) => (v.trim() ? undefined : "Title can't be empty"),
        });
        if (!title)
            return;
        const when = await this.askTime("Meeting reminder (2/4) — when?", undefined);
        if (when === undefined)
            return;
        const durRaw = await vscode.window.showInputBox({
            title: "Meeting reminder (3/4) — how long? (minutes)",
            value: "30",
            ignoreFocusOut: true,
            validateInput: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 600 ? undefined : "1–600"),
        });
        if (durRaw === undefined)
            return;
        const link = await vscode.window.showInputBox({
            title: "Meeting reminder (4/4) — join link / notes (optional)",
            prompt: "Paste a Teams / Zoom / Meet link, or type a note. Leave empty to skip.",
            ignoreFocusOut: true,
        });
        if (link === undefined)
            return;
        const r = {
            id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            title: title.trim(),
            start: when,
            durationMin: +durRaw,
            ...(link.trim() ? (/^https?:\/\//i.test(link.trim()) ? { link: link.trim() } : { notes: link.trim() }) : {}),
        };
        await this.save([...this.reminders, r]);
        const lead = this.leadMinutes;
        const minsUntil = Math.round((when - Date.now()) / 60000);
        void vscode.window.setStatusBarMessage(minsUntil <= lead
            ? `✈ "${r.title}" starts in ${Math.max(0, minsUntil)} min — fly-by incoming`
            : `✈ "${r.title}" at ${hhmm(new Date(when))} — fly-by ${lead} min before`, 6000);
        this.tick();
    }
    async edit(arg) {
        const r = this.find(arg);
        if (!r)
            return;
        const pick = await vscode.window.showQuickPick([
            { label: "$(edit) Rename", action: "title" },
            { label: "$(clock) Change time", description: hhmm(new Date(r.start)), action: "time" },
            { label: "$(link) Change link / notes", description: r.link ?? r.notes, action: "link" },
            { label: "$(rocket) Preview fly-by", action: "preview" },
            { label: "$(trash) Remove", action: "remove" },
        ], { title: r.title });
        if (!pick)
            return;
        if (pick.action === "preview")
            return this.preview(r);
        if (pick.action === "remove")
            return this.remove(r);
        const list = this.reminders;
        const idx = list.findIndex((x) => x.id === r.id);
        if (idx < 0)
            return;
        if (pick.action === "title") {
            const t = await vscode.window.showInputBox({ title: "Rename", value: r.title, validateInput: (v) => (v.trim() ? undefined : "Title can't be empty") });
            if (!t)
                return;
            list[idx] = { ...r, title: t.trim() };
        }
        else if (pick.action === "time") {
            const when = await this.askTime("New time", r.start);
            if (when === undefined)
                return;
            list[idx] = { ...r, start: when, alertedAt: undefined };
        }
        else if (pick.action === "link") {
            const v = await vscode.window.showInputBox({ title: "Join link or notes", value: r.link ?? r.notes ?? "" });
            if (v === undefined)
                return;
            const t = v.trim();
            list[idx] = { ...r, link: /^https?:\/\//i.test(t) ? t : undefined, notes: t && !/^https?:\/\//i.test(t) ? t : undefined };
        }
        await this.save(list);
    }
    async remove(arg) {
        const r = this.find(arg);
        if (!r)
            return;
        this.cancelSnooze(r.id);
        await this.save(this.reminders.filter((x) => x.id !== r.id));
    }
    async clearPast() {
        const now = Date.now();
        await this.save(this.reminders.filter((r) => r.start + r.durationMin * 60000 > now));
    }
    preview(arg) {
        const r = this.find(arg);
        if (r)
            this.alert(r, true);
    }
    /** Demo fly-by with a fake meeting 5 minutes out. */
    demo() {
        this.alert({
            id: "demo",
            title: "Crew briefing — sprint sync",
            start: Date.now() + 5 * 60000,
            durationMin: 30,
            link: "https://teams.microsoft.com/l/meetup-join/demo",
            notes: "Go/no-go for the YUL baggage-tracking rollout. Bring last night's latency numbers.",
        }, true);
    }
    join(arg) {
        const r = this.find(arg);
        if (r?.link)
            void vscode.env.openExternal(vscode.Uri.parse(r.link));
    }
    dispose() {
        if (this.timer)
            clearInterval(this.timer);
        if (this.incomingState)
            clearTimeout(this.incomingState.timer);
        for (const t of this.snoozed.values())
            clearTimeout(t);
        this.emitter.dispose();
    }
    // ------------------------------------------------------------ scheduling
    get leadMinutes() {
        return Math.max(1, vscode.workspace.getConfiguration("airCanada.meetings").get("leadMinutes", 5));
    }
    tick() {
        if (!vscode.workspace.getConfiguration("airCanada.notifications").get("enabled", true))
            return;
        const now = Date.now();
        const lead = this.leadMinutes * 60000;
        let changed = false;
        const list = this.reminders;
        for (const r of list) {
            const delta = r.start - now;
            if (!r.alertedAt && !this.snoozed.has(r.id) && delta <= lead && delta > -2 * 60000) {
                r.alertedAt = now;
                changed = true;
                this.alert(r, false);
            }
        }
        if (changed)
            void this.context.globalState.update(KEY, list);
    }
    /** Previews show only the bottom-right notification; real reminders also get the fly-by. */
    alert(r, preview) {
        const card = this.card(r);
        if (preview)
            return this.notify(r, card);
        this.flyby.show(card, (a) => this.onAction(a, r));
        if (vscode.workspace.getConfiguration("airCanada.meetings").get("notification", true))
            this.notify(r, card);
    }
    get incoming() {
        return this.incomingState?.info;
    }
    showIncoming(r, card) {
        if (this.incomingState)
            clearTimeout(this.incomingState.timer);
        const seconds = Math.max(5, vscode.workspace.getConfiguration("airCanada.meetings").get("flyby.durationSeconds", 20));
        const info = {
            id: r.id,
            title: card.title,
            when: card.when,
            platform: card.platform,
            notes: card.notes,
            hasLink: !!r.link,
            start: r.start,
            durationMin: r.durationMin,
            startedAt: Date.now(),
            seconds,
        };
        this.incomingState = { r, info, timer: setTimeout(() => this.clearIncoming(), seconds * 1000) };
        this.emitter.fire();
    }
    clearIncoming() {
        if (!this.incomingState)
            return;
        clearTimeout(this.incomingState.timer);
        this.incomingState = undefined;
        this.emitter.fire();
    }
    /** Join / Snooze / Dismiss clicked on the Flight Deck's incoming card. */
    incomingAction(a) {
        const r = this.incomingState?.r;
        if (r)
            this.onAction(a, r);
        else
            this.clearIncoming();
    }
    notify(r, card) {
        this.showIncoming(r, card);
        const buttons = r.link ? ["Join", "Snooze 2 min"] : ["Snooze 2 min"];
        const notes = card.notes ? ` ${card.notes}` : "";
        // VS Code drops a toast whose text matches one already in the notification
        // centre, so repeat alerts get a different run of invisible characters.
        const nonce = "\u200B".repeat(++this.notifyCount % 16);
        void vscode.window.showInformationMessage(`✈ Incoming — ${card.oneLine}.${notes}${nonce}`, ...buttons).then((c) => {
            if (c === "Join")
                this.onAction("join", r);
            if (c === "Snooze 2 min")
                this.onAction("snooze", r);
        });
    }
    onAction(a, r) {
        this.flyby.hideStatus();
        if (this.incomingState?.r.id === r.id)
            this.clearIncoming();
        if (a === "join")
            this.join(r);
        if (a === "snooze") {
            this.cancelSnooze(r.id);
            const t = setTimeout(() => {
                this.snoozed.delete(r.id);
                this.alert(r, false);
            }, 2 * 60000);
            this.snoozed.set(r.id, t);
            void vscode.window.setStatusBarMessage(`✈ Snoozed — "${r.title}" again in 2 min`, 3000);
        }
    }
    cancelSnooze(id) {
        const t = this.snoozed.get(id);
        if (t)
            clearTimeout(t);
        this.snoozed.delete(id);
    }
    prune() {
        const cutoff = Date.now() - 12 * 3600000;
        const list = this.reminders;
        const keep = list.filter((r) => r.start + r.durationMin * 60000 > cutoff);
        if (keep.length !== list.length)
            void this.context.globalState.update(KEY, keep);
    }
    card(r) {
        const now = Date.now();
        const minutesUntil = Math.round((r.start - now) / 60000);
        const rel = minutesUntil > 0 ? `in ${minutesUntil} min` : minutesUntil === 0 ? "starting now" : `started ${-minutesUntil} min ago`;
        const span = `${hhmm(new Date(r.start))}–${hhmm(new Date(r.start + r.durationMin * 60000))}`;
        const platform = r.link ? platformOf(r.link) : undefined;
        return {
            title: r.title,
            when: `${rel} · ${span}`,
            minutesUntil,
            platform,
            notes: r.notes,
            joinUrl: r.link,
            oneLine: `${r.title} — ${[rel, span, platform].filter(Boolean).join(" · ")}`,
        };
    }
    // ------------------------------------------------------------ time input
    async askTime(title, current) {
        const raw = await vscode.window.showInputBox({
            title,
            prompt: 'Examples: "14:30", "2:30pm", "in 20" (minutes), "+45", "tomorrow 09:00"',
            value: current ? hhmm(new Date(current)) : undefined,
            ignoreFocusOut: true,
            validateInput: (v) => (parseWhen(v) === undefined ? 'Try "14:30", "2:30pm", "in 20" or "tomorrow 09:00"' : undefined),
        });
        if (raw === undefined)
            return undefined;
        return parseWhen(raw);
    }
}
exports.Meetings = Meetings;
// ------------------------------------------------------------------ helpers
/** "14:30" | "2:30pm" | "in 20" | "+45" | "20m" | "tomorrow 09:00" → epoch ms (next occurrence). */
function parseWhen(input, now = new Date()) {
    const s = input.trim().toLowerCase();
    if (!s)
        return undefined;
    const rel = /^(?:in\s+|\+)?(\d{1,3})\s*(?:m|min|mins|minutes)?$/.exec(s);
    if (rel && (s.startsWith("in") || s.startsWith("+") || /m/.test(s)))
        return now.getTime() + +rel[1] * 60000;
    const hrs = /^(?:in\s+|\+)?(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hours?)$/.exec(s);
    if (hrs)
        return now.getTime() + +hrs[1] * 3600000;
    let dayOffset = 0;
    let rest = s;
    if (rest.startsWith("tomorrow")) {
        dayOffset = 1;
        rest = rest.slice(8).trim();
    }
    else if (rest.startsWith("today")) {
        rest = rest.slice(5).trim();
    }
    const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(rest);
    if (!m)
        return undefined;
    let h = +m[1];
    const mi = +(m[2] ?? 0);
    if (h > 23 || mi > 59)
        return undefined;
    if (m[3] === "pm" && h < 12)
        h += 12;
    if (m[3] === "am" && h === 12)
        h = 0;
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, mi, 0, 0);
    if (dayOffset === 0 && d.getTime() <= now.getTime() - 60000)
        d.setDate(d.getDate() + 1); // already passed → tomorrow
    return d.getTime();
}
function platformOf(url) {
    if (/teams\.(microsoft|live)\.com/i.test(url))
        return "Microsoft Teams";
    if (/zoom\.us/i.test(url))
        return "Zoom";
    if (/meet\.google\.com/i.test(url))
        return "Google Meet";
    if (/webex\.com/i.test(url))
        return "Webex";
    return "meeting";
}
function hhmm(d) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
//# sourceMappingURL=meetings.js.map