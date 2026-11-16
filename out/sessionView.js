"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightDeckView = void 0;
const meetings_1 = require("./meetings");
/**
 * "Flight Deck" — one scrolling cockpit view: a primary flight display for
 * the coding session on top, then Flight Plan (tasks) and Meetings as
 * collapsible instrument panels. Numbers and the plane update in place;
 * lists re-render only when their data changes, so nothing flickers.
 */
class FlightDeckView {
    constructor(context, tracker, checklist, meetings) {
        this.context = context;
        this.tracker = tracker;
        this.checklist = checklist;
        this.meetings = meetings;
        this.disposables = [];
        this.disposables.push(tracker.onDidChange(() => this.push()), checklist.onDidChange(() => this.push()), meetings.onDidChange(() => this.push()));
        this.minuteTimer = setInterval(() => this.push(), 60000);
    }
    resolveWebviewView(view) {
        this.view = view;
        view.webview.options = { enableScripts: true, localResourceRoots: [] };
        view.webview.html = html(view.webview.cspSource);
        view.title = "Flight Deck";
        this.disposables.push(view.webview.onDidReceiveMessage((m) => this.onMessage(m)), view.onDidChangeVisibility(() => view.visible && this.push()), view.onDidDispose(() => (this.view = undefined)));
        this.push();
    }
    push() {
        if (!this.view)
            return;
        const open = this.checklist.openCount;
        this.view.badge = open ? { value: open, tooltip: `${open} open task${open === 1 ? "" : "s"}` } : undefined;
        if (!this.view.visible)
            return;
        const flight = this.tracker.state;
        const stats = this.tracker.stats;
        void this.view.webview.postMessage({
            type: "state",
            now: Date.now(),
            flight,
            stats,
            tasks: this.checklist.tasks,
            meetings: this.meetings.reminders.map((r) => ({ ...r, platform: r.link ? (0, meetings_1.platformOf)(r.link) : undefined })),
            incoming: this.meetings.incoming,
        });
    }
    onMessage(m) {
        const t = this.tracker;
        switch (m.type) {
            case "ready":
                this.push();
                break;
            case "board":
                if (typeof m.minutes === "number" && m.minutes > 0)
                    t.start(m.minutes);
                else
                    void t.board();
                break;
            case "extend":
                if (typeof m.minutes === "number")
                    t.extend(m.minutes);
                else
                    void t.extendCustom();
                break;
            case "pause":
                t.pause();
                break;
            case "resume":
                t.resume();
                break;
            case "cancel":
                t.cancel();
                break;
            case "return":
                void t.returnFlight();
                break;
            case "route":
                void t.setRoute();
                break;
            case "route-origin":
                void t.setRoute("origin");
                break;
            case "route-dest":
                void t.setRoute("destination");
                break;
            case "duration":
                void t.setDuration();
                break;
            case "aircraft":
                void t.setAircraft();
                break;
            case "task.add":
                void this.checklist.add(m.title);
                break;
            case "task.toggle":
                if (m.id)
                    void this.checklist.toggle(m.id);
                break;
            case "task.edit":
                if (m.id)
                    void this.checklist.edit(m.id);
                break;
            case "task.remove":
                if (m.id)
                    void this.checklist.remove(m.id);
                break;
            case "task.clearDone":
                void this.checklist.clearDone();
                break;
            case "meeting.add":
                void this.meetings.add();
                break;
            case "meeting.edit":
                if (m.id)
                    void this.meetings.edit(m.id);
                break;
            case "meeting.remove":
                if (m.id)
                    void this.meetings.remove(m.id);
                break;
            case "meeting.preview":
                if (m.id)
                    this.meetings.preview(m.id);
                break;
            case "meeting.join":
                if (m.id)
                    this.meetings.join(m.id);
                break;
            case "meeting.incoming.join":
                this.meetings.incomingAction("join");
                break;
            case "meeting.incoming.snooze":
                this.meetings.incomingAction("snooze");
                break;
            case "meeting.incoming.dismiss":
                this.meetings.incomingAction("dismiss");
                break;
            case "meeting.demo":
                this.meetings.demo();
                break;
            case "meeting.clearPast":
                void this.meetings.clearPast();
                break;
        }
    }
    dispose() {
        if (this.minuteTimer)
            clearInterval(this.minuteTimer);
        for (const d of this.disposables)
            d.dispose();
    }
}
exports.FlightDeckView = FlightDeckView;
FlightDeckView.viewId = "airCanada.session";
// --------------------------------------------------------------------- HTML
const PLANE_PATH = "M12 1.5c.9 0 1.6 1.3 1.6 2.9v4.5l8.4 4.9v2.3l-8.4-2.5v4.6l2.3 1.7v1.7L12 20.5l-3.9 1.1v-1.7l2.3-1.7v-4.6L2 16.1v-2.3l8.4-4.9V4.4c0-1.6.7-2.9 1.6-2.9z";
function html(cspSource) {
    const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data:;">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Flight Deck</title>
<style>
  :root {
    --red: #F01428; --red-deep: #B3201F; --amber: #F2B544; --cyan: #5FD3E8; --green: #7FD88F; --magenta: #E07AC8;
    --fg: var(--vscode-foreground); --dim: var(--vscode-descriptionForeground);
    --bg: var(--vscode-sideBar-background);
    --panel: color-mix(in srgb, var(--vscode-foreground) 5%, transparent);
    --panel-2: color-mix(in srgb, var(--vscode-foreground) 9%, transparent);
    --line: color-mix(in srgb, var(--vscode-foreground) 10%, transparent);
    --ease: cubic-bezier(.2,.8,.2,1);
    --mono: ui-monospace, "SF Mono", Menlo, "JetBrains Mono", Consolas, monospace;
    --sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable", "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
    --display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); font-family: var(--sans); font-size: 12.5px; line-height: 1.4; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; font-feature-settings: "kern", "tnum"; }
  button { font: inherit; color: inherit; letter-spacing: inherit; }
  .num { font-variant-numeric: tabular-nums lining-nums; }
  .page { display: flex; flex-direction: column; gap: 10px; padding: 8px 12px 16px; }

  /* ================================================== primary flight display */
  .pfd { position: relative; border-radius: 14px; background:
           radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--red) 14%, transparent) 0%, transparent 55%),
           var(--panel);
         padding: 14px 14px 12px; overflow: hidden; }
  .stack { display: grid; }
  .layout { grid-area: 1 / 1; display: flex; flex-direction: column; gap: 10px; opacity: 0; transform: translateY(14px); visibility: hidden; pointer-events: none; transition: transform .3s var(--ease), opacity .24s ease, visibility 0s linear .3s; }
  .layout.active { opacity: 1; transform: none; visibility: visible; pointer-events: auto; transition-delay: 0s; }
  /* Hidden layouts don't take up room, so each card is only as tall as its own content. */
  .stack { position: relative; }
  .layout:not(.active) { position: absolute; top: 0; left: 0; right: 0; }

  .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .status { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; padding: 4px 9px; border-radius: 999px; background: color-mix(in srgb, var(--green) 16%, transparent); color: var(--green); }
  .status .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
  .status.flying { background: color-mix(in srgb, var(--red) 18%, transparent); color: var(--red); }
  .status.flying .dot { animation: pulse 1.2s infinite; }
  .status.paused { background: color-mix(in srgb, var(--amber) 18%, transparent); color: var(--amber); }
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
  .aircraft { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dim); cursor: pointer; min-width: 0; }
  .aircraft span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .aircraft:hover { color: var(--fg); }
  .aircraft svg { flex: 0 0 auto; }

  .route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; }
  .route .ap { display: flex; flex-direction: column; cursor: pointer; justify-self: start; }
  .route .ap:last-child { text-align: right; align-items: flex-end; justify-self: end; }
  .route .code { font-family: var(--display); font-size: 28px; font-weight: 800; letter-spacing: .02em; line-height: 1; }
  .route .ap small { font-size: 9.5px; color: var(--dim); letter-spacing: .14em; text-transform: uppercase; margin-top: 4px; font-weight: 600; }
  .route .mid { display: flex; flex-direction: column; align-items: center; gap: 5px; color: var(--dim); }
  .route .mid .line { display: flex; align-items: center; gap: 4px; }
  .route .mid .times { font-family: var(--mono); font-size: 10.5px; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--fg); opacity: .75; }
  .route .mid i { display: block; width: 18px; height: 1px; background: var(--line); }
  .route .ap:hover .code { color: var(--red); }

  .big { font-family: var(--display); font-variant-numeric: tabular-nums lining-nums; font-size: 46px; font-weight: 700; line-height: 1; letter-spacing: -.035em; display: flex; align-items: baseline; gap: 10px; }
  .big small { font-family: var(--sans); font-size: 10px; font-weight: 600; color: var(--dim); letter-spacing: .14em; text-transform: uppercase; }

  .map { position: relative; height: 84px; margin: -2px 0; }
  .map svg { width: 100%; height: 100%; overflow: visible; }
  .map .arc { fill: none; stroke: var(--magenta); stroke-opacity: .35; stroke-width: 2; stroke-dasharray: 3 5; }
  .map .flown { fill: none; stroke: var(--red); stroke-width: 2.5; stroke-linecap: round; transition: stroke-dashoffset .9s linear; }
  .map .pin { fill: var(--fg); }
  .map .pin.dest { fill: var(--bg); stroke: var(--fg); stroke-width: 1.25; }
  .map .plane { position: absolute; left: 0; top: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px; fill: #fff; pointer-events: none;
    transition: left .9s linear, top .9s linear, transform .9s linear; filter: drop-shadow(0 0 6px rgba(255,255,255,.5)); }
  .map .plane svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .map .lbl { font-family: var(--sans); font-size: 10px; font-weight: 700; fill: var(--dim); letter-spacing: .12em; }

  .tape { display: grid; grid-template-columns: repeat(4, 1fr); border-radius: 10px; overflow: hidden; background: var(--panel-2); }
  .tape div { padding: 7px 8px; min-width: 0; border-right: 1px solid var(--line); }
  .tape div:last-child { border-right: 0; }
  .tape b { display: block; font-family: var(--mono); font-size: 12.5px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.01em; }
  .tape span { font-size: 9px; color: var(--dim); text-transform: uppercase; letter-spacing: .12em; font-weight: 600; }
  .tape .cy b { color: var(--cyan); } .tape .gr b { color: var(--green); } .tape .am b { color: var(--amber); }
  .bar { height: 4px; border-radius: 2px; background: var(--line); overflow: hidden; }
  .bar i { display: block; height: 100%; width: 0; background: var(--red); transition: width .9s linear; }

  .label { font-size: 9.5px; color: var(--dim); letter-spacing: .16em; text-transform: uppercase; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .label::after { content: ""; flex: 1; height: 1px; background: var(--line); }
  .chips { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .chip { font-size: 11.5px; font-weight: 700; font-variant-numeric: tabular-nums; padding: 7px 0; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); cursor: pointer; text-align: center; transition: background .12s, border-color .12s, transform .12s; }
  .chip:hover { border-color: var(--red); background: color-mix(in srgb, var(--red) 16%, transparent); transform: translateY(-1px); }
  .row { display: flex; gap: 8px; }
  .btn { flex: 1; font-size: 12px; font-weight: 600; letter-spacing: .01em; padding: 9px 10px; border-radius: 9px; border: 0; cursor: pointer; background: var(--panel-2); display: flex; align-items: center; justify-content: center; gap: 6px; transition: filter .12s, background .12s; }
  .btn:hover { background: color-mix(in srgb, var(--vscode-foreground) 14%, transparent); }
  .btn.primary { background: var(--red); color: #fff; }
  .btn.primary:hover { filter: brightness(1.1); }
  .btn.danger:hover { color: #fff; background: var(--red-deep); }
  .btn svg { width: 12px; height: 12px; fill: currentColor; }

  /* gate */
  .seg { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 4px; border-radius: 11px; background: var(--panel-2); }
  .seg button { border: 0; border-radius: 8px; padding: 6px 2px; background: transparent; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; transition: background .12s, color .12s; }
  .seg button b { font-family: var(--display); font-size: 14px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
  .seg button small { font-size: 7.5px; white-space: nowrap; color: var(--dim); letter-spacing: .08em; text-transform: uppercase; font-weight: 600; }
  .seg button:hover { background: color-mix(in srgb, var(--vscode-foreground) 10%, transparent); }
  .seg button.on { background: var(--red); color: #fff; }
  .seg button.on small { color: rgba(255,255,255,.8); }
  .seg input { width: 100%; text-align: center; border: 0; background: transparent; color: inherit; font-family: var(--display); font-size: 14px; font-weight: 700; line-height: 1; padding: 0; outline: 0; }
  .seg input::-webkit-inner-spin-button, .seg input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .seg input { -moz-appearance: textfield; appearance: textfield; }
  .seg input::placeholder { color: var(--dim); font-family: var(--sans); font-weight: 600; font-size: 8.5px; letter-spacing: .08em; }
  .board { flex: none; height: 36px; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .stat { min-width: 0; background: var(--panel-2); border-radius: 9px; padding: 7px 9px; }
  .stat b { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--display); font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
  .stat span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 7.5px; color: var(--dim); text-transform: uppercase; letter-spacing: .1em; font-weight: 600; }
  .hint { font-size: 11px; color: var(--dim); line-height: 1.5; }
  .link { color: var(--cyan); cursor: pointer; }
  .link:hover { text-decoration: underline; }

  /* landed */
  .hero { text-align: center; padding: 8px 0 2px; }
  .hero .code { font-family: var(--display); font-size: 36px; font-weight: 800; letter-spacing: .02em; }
  .hero p { margin: 4px 0 0; color: var(--dim); font-size: 12px; }

  /* ================================================== panels */
  .panel { border-radius: 14px; background: var(--panel); overflow: hidden; }
  .panel-h { display: flex; align-items: center; gap: 8px; padding: 10px 10px 10px 14px; cursor: pointer; user-select: none; }
  .panel-h:hover .chev { color: var(--fg); }
  .panel-h .chev { width: 14px; height: 14px; color: var(--dim); transition: transform .22s var(--ease), color .12s; flex: 0 0 auto; }
  .panel.collapsed .panel-h .chev { transform: rotate(-90deg); }
  .panel-h h2 { margin: 0; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; color: var(--fg); flex: 1; display: flex; align-items: center; gap: 8px; }
  .count { font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 18px; height: 18px; padding: 0 6px; border-radius: 999px; background: var(--panel-2); color: var(--dim); display: inline-flex; align-items: center; justify-content: center; }
  .count.hot { background: var(--red); color: #fff; }
  .panel-h .sub { font-size: 10.5px; color: var(--dim); white-space: nowrap; }
  .iconbtn { width: 26px; height: 26px; border: 0; border-radius: 7px; background: transparent; color: var(--dim); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
  .iconbtn:hover { background: color-mix(in srgb, var(--vscode-foreground) 12%, transparent); color: var(--fg); }
  .iconbtn.red { background: var(--red); color: #fff; }
  .iconbtn.red:hover { filter: brightness(1.1); }
  .iconbtn svg { width: 13px; height: 13px; fill: currentColor; }
  .panel-b { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .26s var(--ease); }
  .panel.collapsed .panel-b { grid-template-rows: 0fr; }
  .panel-b > div { overflow: hidden; }
  .panel-c { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 6px; }

  .add { display: flex; gap: 6px; }
  .add input { flex: 1; min-width: 0; font: inherit; padding: 7px 10px; border-radius: 8px; border: 1px solid transparent; background: var(--panel-2); color: var(--fg); }
  .add input:focus { outline: 0; border-color: var(--red); }
  .add input::placeholder { color: var(--dim); }

  .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .item { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; border-radius: 9px; padding: 7px 6px 7px 10px; transition: background .12s; }
  .item:hover { background: var(--panel-2); }
  .item .title { font-size: 12.5px; font-weight: 500; letter-spacing: -.005em; cursor: text; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item .meta { font-size: 10.5px; color: var(--dim); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .item .actions { display: flex; align-items: center; gap: 2px; }
  .item .actions .iconbtn { opacity: 0; transition: opacity .12s; width: 24px; height: 24px; }
  .item:hover .actions .iconbtn, .item:focus-within .actions .iconbtn { opacity: 1; }
  .iconbtn.danger:hover { color: #fff; background: var(--red); }
  .check { appearance: none; width: 16px; height: 16px; border-radius: 5px; border: 1.5px solid var(--dim); background: transparent; cursor: pointer; display: inline-grid; place-content: center; margin: 0; transition: background .12s, border-color .12s; }
  .check::before { content: ""; width: 9px; height: 9px; background: #fff; transform: scale(0); transition: transform .14s var(--ease); clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%); }
  .check:checked { background: var(--line); border-color: var(--line); }
  .check:checked::before { background: var(--dim); }
  .check:checked::before { transform: scale(1); }
  .item.done .title { text-decoration: line-through; text-decoration-thickness: 1.5px; text-decoration-color: var(--dim); color: var(--dim); }
  .item.done .meta { color: var(--green); }
  /* Flight Plan: compact text */
  #panel-plan .add input { font-size: 11.5px; padding: 6px 9px; }
  #panel-plan .item { padding: 5px 6px 5px 9px; gap: 7px; }
  #panel-plan .item .title { font-size: 11.5px; }
  #panel-plan .item .meta { font-size: 9.5px; }
  #panel-plan .check { width: 14px; height: 14px; border-radius: 4px; }
  #panel-plan .check::before { width: 8px; height: 8px; }
  #panel-plan .item .actions .iconbtn { width: 20px; height: 20px; }
  #panel-plan .item .actions .iconbtn svg { width: 11px; height: 11px; }
  /* Long task names wrap; checkbox, label and buttons line up with the first line. */
  #panel-plan .item { align-items: start; }
  #panel-plan .item .title { white-space: normal; overflow-wrap: anywhere; line-height: 1.4; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
  #panel-plan .check { margin-top: 1px; }
  #panel-plan .item .meta { line-height: 16px; }
  #panel-plan .item .actions { margin-top: -2px; }
  .time { font-family: var(--mono); font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; padding: 3px 7px; border-radius: 6px; background: var(--panel-2); color: var(--cyan); }
  .item.live .time { background: var(--red); color: #fff; }
  .item.past .time { color: var(--dim); }
  .item .sub { grid-column: 2 / span 2; font-size: 10.5px; color: var(--dim); display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  [hidden] { display: none !important; }
  /* incoming meeting: straight route track that counts down how long the alert stays */
  .incoming { display: flex; flex-direction: column; gap: 12px; padding: 12px 14px 14px; border-radius: 12px; background: var(--panel); border: 1px solid color-mix(in srgb, var(--red) 35%, transparent); }
  .in-top { display: flex; align-items: center; gap: 12px; }
  .in-track { position: relative; flex: 1; height: 16px; margin-left: 8px; }
  .in-track .rest, .in-track .trail { position: absolute; left: 0; top: 50%; height: 3px; margin-top: -1.5px; border-radius: 2px; }
  .in-track .rest { right: 0; background: var(--panel-2); }
  .in-track .trail { width: 0; background: var(--red); transition: width .25s linear; }
  .in-track .plane { position: absolute; left: 0; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px; color: var(--red); transition: left .25s linear; }
  .in-track .plane svg { display: block; width: 100%; height: 100%; transform: rotate(90deg); }
  .in-left { font-family: var(--mono); font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--dim); min-width: 26px; text-align: right; }
  .in-body { display: flex; flex-direction: column; gap: 5px; }
  .in-kicker { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--red); }
  .in-kicker .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--red); box-shadow: 0 0 6px var(--red); }
  .in-title { font-size: 15px; font-weight: 700; line-height: 1.25; letter-spacing: -.01em; }
  .in-when { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 11.5px; color: var(--dim); }
  .in-when b { color: var(--cyan); font-weight: 600; }
  .in-when .span { font-family: var(--mono); font-size: 11px; font-variant-numeric: tabular-nums; }
  .in-notes { font-size: 11.5px; line-height: 1.45; color: var(--dim); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .in-actions { display: flex; gap: 6px; }
  .in-actions .btn { padding: 8px 10px; }
  .pill { font-size: 9.5px; padding: 1px 7px; border-radius: 999px; background: var(--panel-2); letter-spacing: .04em; }
  .empty { color: var(--dim); font-size: 10.5px; padding: 4px 4px 2px; line-height: 1.4; }
  .foot { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: var(--dim); padding: 2px 4px 0; }
</style>
</head>
<body>
<div class="page">

  <!-- ================================================= PFD -->
  <section class="pfd">
    <div class="stack">

      <!-- GATE -->
      <div class="layout" id="gate">
        <div class="top">
          <span class="status"><span class="dot"></span>At gate</span>
          <span class="aircraft" data-cmd="aircraft" title="Change aircraft"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="${PLANE_PATH}"/></svg><span id="g-aircraft">Boeing 777-300ER</span></span>
        </div>
        <div class="route">
          <div class="ap" data-cmd="route-origin" title="Change departure"><span class="code" id="g-origin">YYZ</span><small>Departure</small></div>
          <div class="mid"><span class="times" id="g-times" title="Departs now · estimated arrival">--:-- → --:--</span><div class="line"><i></i><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="transform:rotate(90deg)"><path d="${PLANE_PATH}"/></svg><i></i></div></div>
          <div class="ap" data-cmd="route-dest" title="Change arrival"><span class="code" id="g-dest">YVR</span><small>Arrival</small></div>
        </div>
        <div class="label">Block time</div>
        <div class="seg" id="seg">
          <button data-min="25" class="on"><b>25</b><small>Short hop</small></button>
          <button data-min="50"><b>50</b><small>Domestic</small></button>
          <button data-min="90"><b>90</b><small>International</small></button>
          <button data-min="custom"><input id="custom" type="number" min="1" max="600" placeholder="CUSTOM" /><small>minutes</small></button>
        </div>
        <button class="btn primary board" id="board">✈ &nbsp;Board flight</button>
        <div class="stats">
          <div class="stat"><b id="s-today">0</b><span>Flights today</span></div>
          <div class="stat"><b id="s-minutes">0 min</b><span>Focus time</span></div>
          <div class="stat"><b id="s-last">—</b><span>Last flight</span></div>
        </div>
      </div>

      <!-- EN ROUTE / HOLDING -->
      <div class="layout" id="flight">
        <div class="top">
          <span class="status flying" id="f-status"><span class="dot"></span><span id="f-status-text">En route</span></span>
          <span class="aircraft" data-cmd="aircraft" title="Change aircraft"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="${PLANE_PATH}"/></svg><span id="f-aircraft">Boeing 777-300ER</span></span>
        </div>
        <div class="big"><span id="f-remaining">00:00</span><small>remaining</small></div>
        <div class="map">
          <svg viewBox="0 0 300 84" preserveAspectRatio="none">
            <path id="arc" class="arc" d="M14 54 Q150 -24 286 54"/>
            <path id="flown" class="flown" d="M14 54 Q150 -24 286 54"/>
            <circle class="pin" cx="14" cy="54" r="2.5"/>
            <circle class="pin dest" cx="286" cy="54" r="2.5"/>
            <text class="lbl" x="4" y="82" id="m-origin">YYZ</text>
            <text class="lbl" x="296" y="82" text-anchor="end" id="m-dest">YVR</text>
          </svg>
          <!-- Outside the stretched SVG so the plane keeps its shape and its glow isn't clipped. -->
          <div id="plane" class="plane" style="left:4.667%;top:64.29%"><svg viewBox="-11 -11 22 22"><path d="M0-9c.8 0 1.5 1.2 1.5 2.7v4.1l7.6 4.5v2.1l-7.6-2.3v4.2l2.1 1.5v1.6L0 8.4l-3.6 1V7.8l2.1-1.5V2.1l-7.6 2.3V2.3l7.6-4.5v-4.1C-1.5-7.8-.8-9 0-9z"/></svg></div>
        </div>
        <div class="bar"><i id="f-bar"></i></div>
        <div class="tape">
          <div class="cy"><b id="f-flown">0 nm</b><span>Flown</span></div>
          <div class="cy"><b id="f-togo">0 nm</b><span>To go</span></div>
          <div class="gr"><b id="f-elapsed">00:00</b><span id="f-block">of 50</span></div>
          <div class="am"><b id="f-eta">--:--</b><span>ETA</span></div>
        </div>
        <div class="label">Extend</div>
        <div class="chips">
          <button class="chip" data-extend="5">+5</button>
          <button class="chip" data-extend="10">+10</button>
          <button class="chip" data-extend="15">+15</button>
          <button class="chip" data-extend="30">+30</button>
          <button class="chip" data-extend="60">+1h</button>
          <button class="chip" data-extend="custom">…</button>
        </div>
        <div class="row">
          <button class="btn" id="pause"><svg viewBox="0 0 16 16"><path d="M4 2h3v12H4zM9 2h3v12H9z"/></svg><span id="pause-label">Pause</span></button>
          <button class="btn danger" id="cancel"><svg viewBox="0 0 16 16"><path d="M3.3 2 2 3.3 6.7 8 2 12.7 3.3 14 8 9.3l4.7 4.7 1.3-1.3L9.3 8 14 3.3 12.7 2 8 6.7z"/></svg>Cancel</button>
        </div>
      </div>

      <!-- LANDED -->
      <div class="layout" id="landed">
        <div class="top">
          <span class="status"><span class="dot"></span>Landed</span>
          <span class="aircraft"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="${PLANE_PATH}"/></svg><span id="l-aircraft">Boeing 777-300ER</span></span>
        </div>
        <div class="hero"><div class="code" id="l-dest">YVR</div><p id="l-sub">50 min of focus · take a stretch</p></div>
        <div class="row">
          <button class="btn primary" data-cmd="return">↩ Return flight</button>
          <button class="btn" data-cmd="new">New flight</button>
        </div>
        <div class="stats">
          <div class="stat"><b id="l-today">0</b><span>Flights today</span></div>
          <div class="stat"><b id="l-minutes">0 min</b><span>Focus time</span></div>
          <div class="stat"><b id="l-block">50 min</b><span>This flight</span></div>
        </div>
      </div>

    </div>
  </section>

  <!-- ================================================= FLIGHT PLAN -->
  <section class="panel" id="panel-plan">
    <div class="panel-h" data-toggle="panel-plan">
      <svg class="chev" viewBox="0 0 16 16" fill="currentColor"><path d="M3.6 5.6 8 10l4.4-4.4 1.2 1.2L8 12.4 2.4 6.8z"/></svg>
      <h2>Flight plan <span class="count" id="c-plan">0</span></h2>
      <span class="sub" id="plan-sub"></span>
      <button class="iconbtn" id="tasks-clear" title="Clear landed tasks" hidden><svg viewBox="0 0 16 16"><path d="M6 1h4l.5 1H14v1.5H2V2h3.5zM3 5h10l-.7 9.1a1 1 0 0 1-1 .9H4.7a1 1 0 0 1-1-.9z"/></svg></button>
      <button class="iconbtn red" id="task-focus" title="Add task"><svg viewBox="0 0 16 16"><path d="M7 2h2v5h5v2H9v5H7V9H2V7h5z"/></svg></button>
    </div>
    <div class="panel-b"><div><div class="panel-c">
      <form class="add" id="task-form"><input id="task-input" type="text" placeholder="Add a task and press Enter" maxlength="200" /></form>
      <ul class="list" id="tasks"></ul>
      <div class="empty" id="tasks-empty" hidden>Nothing filed yet — add what you want to land this session.</div>
    </div></div></div>
  </section>

  <!-- ================================================= MEETINGS -->
  <section class="panel" id="panel-meet">
    <div class="panel-h" data-toggle="panel-meet">
      <svg class="chev" viewBox="0 0 16 16" fill="currentColor"><path d="M3.6 5.6 8 10l4.4-4.4 1.2 1.2L8 12.4 2.4 6.8z"/></svg>
      <h2>Meetings <span class="count" id="c-meet">0</span></h2>
      <span class="sub" id="meet-sub"></span>
      <button class="iconbtn" data-cmd="meeting.demo" title="Preview the fly-by"><svg viewBox="0 0 16 16"><path d="M3 2l11 6-11 6z"/></svg></button>
      <button class="iconbtn red" data-cmd="meeting.add" title="Add meeting"><svg viewBox="0 0 16 16"><path d="M7 2h2v5h5v2H9v5H7V9H2V7h5z"/></svg></button>
    </div>
    <div class="panel-b"><div><div class="panel-c">
      <div class="incoming" id="incoming" hidden>
        <div class="in-top">
          <div class="in-track"><i class="rest"></i><i class="trail" id="in-trail"></i><span class="plane" id="in-plane"><svg viewBox="0 0 24 24" fill="currentColor"><path d="${PLANE_PATH}"/></svg></span></div>
          <span class="in-left" id="in-left" title="Closes in"></span>
        </div>
        <div class="in-body">
          <div class="in-kicker"><span class="dot"></span>Incoming meeting</div>
          <div class="in-title" id="in-title"></div>
          <div class="in-when"><b id="in-rel"></b><span class="span" id="in-span"></span><span class="pill" id="in-platform"></span></div>
        </div>
        <div class="in-notes" id="in-notes"></div>
        <div class="in-actions">
          <button class="btn primary" id="in-join" data-cmd="meeting.incoming.join">Join</button>
          <button class="btn" data-cmd="meeting.incoming.snooze">Snooze 2 min</button>
          <button class="btn" data-cmd="meeting.incoming.dismiss">Dismiss</button>
        </div>
      </div>
      <ul class="list" id="meetings"></ul>
      <div class="empty" id="meet-empty" hidden>No meetings yet.</div>
      <div class="foot" id="meet-foot" hidden><span></span><span class="link" data-cmd="meeting.clearPast">Clear past</span></div>
    </div></div></div>
  </section>

</div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let phase = null, tasksKey = '', meetKey = '', selMin = 25;
  const state = vscode.getState() || {};

  // ---- collapsible panels (remembered)
  for (const id of ['panel-plan', 'panel-meet']) if (state[id] === 'collapsed') $(id).classList.add('collapsed');
  document.querySelectorAll('[data-toggle]').forEach(h => h.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const p = $(h.dataset.toggle); p.classList.toggle('collapsed');
    vscode.setState({ ...(vscode.getState() || {}), [p.id]: p.classList.contains('collapsed') ? 'collapsed' : 'open' });
  }));

  // ---- helpers
  const arc = $('arc'), flown = $('flown'), plane = $('plane');
  const arcLen = arc.getTotalLength();
  let planePlaced = false, lastProgress = 0;
  flown.style.strokeDasharray = arcLen; flown.style.strokeDashoffset = arcLen;
  function clock(ms) { const t = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; const mm = String(m).padStart(2,'0'), ss = String(s).padStart(2,'0'); return h ? h + ':' + mm + ':' + ss : mm + ':' + ss; }
  function fmtMin(m) { return m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + ' min'; }
  function nm(n) { return Math.round(n).toLocaleString() + ' nm'; }
  function hhmm(ms) { return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function rel(ts, now) { const m = Math.round((now - ts) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); return h < 24 ? h + ' h ago' : Math.round(h / 24) + ' d ago'; }
  function sameDay(a, b) { a = new Date(a); b = new Date(b); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function switchLayout(next) {
    if (phase === next) return;
    const id = (p) => p === 'flying' || p === 'paused' ? 'flight' : p === 'idle' ? 'gate' : 'landed';
    document.querySelectorAll('.layout').forEach(l => l.classList.remove('active'));
    requestAnimationFrame(() => $(id(next)).classList.add('active'));
    phase = next;
  }

  // ---- flight
  // Gate card: departure (now) → estimated arrival for the selected block time.
  // An empty custom box falls back to the default block, as Board does.
  let defaultMin = 25;
  function gateTimes() {
    const m = selMin === 'custom' ? (+$('custom').value > 0 ? +$('custom').value : defaultMin) : selMin;
    const now = Date.now();
    $('g-times').textContent = hhmm(now) + ' → ' + hhmm(now + m * 60000);
  }
  setInterval(gateTimes, 10000);

  function renderFlight(s, stats, now) {
    defaultMin = s.durationMinutes;
    const wasAirborne = phase === 'flying' || phase === 'paused';
    switchLayout(s.phase);
    $('g-origin').textContent = s.origin; $('g-dest').textContent = s.destination;
    $('g-aircraft').textContent = s.aircraft; $('f-aircraft').textContent = s.aircraft; $('l-aircraft').textContent = s.aircraft;
    $('s-today').textContent = stats.todayFlights; $('l-today').textContent = stats.todayFlights;
    $('s-minutes').textContent = fmtMin(stats.todayMinutes); $('l-minutes').textContent = fmtMin(stats.todayMinutes);
    $('s-last').textContent = stats.last ? stats.last.minutes + ' min → ' + stats.last.destination : '—';
    if (s.phase === 'flying' || s.phase === 'paused') {
      $('f-status').classList.toggle('paused', s.phase === 'paused');
      $('f-status').classList.toggle('flying', s.phase === 'flying');
      $('f-status-text').textContent = s.phase === 'paused' ? 'Holding' : 'En route';
      $('f-remaining').textContent = clock(s.remainingMs);
      $('f-elapsed').textContent = clock(s.elapsedMs);
      $('f-block').textContent = 'of ' + s.durationMinutes;
      $('f-eta').textContent = s.phase === 'paused' ? '--:--' : hhmm(now + s.remainingMs);
      $('f-bar').style.width = (s.progress * 100).toFixed(2) + '%';
      $('f-flown').textContent = nm(s.distanceNm * s.progress);
      $('f-togo').textContent = nm(s.distanceNm * (1 - s.progress));
      $('m-origin').textContent = s.origin; $('m-dest').textContent = s.destination;
      flown.style.strokeDashoffset = arcLen * (1 - s.progress);
      const p = arc.getPointAtLength(arcLen * s.progress);
      const p2 = arc.getPointAtLength(Math.min(arcLen, arcLen * s.progress + 1));
      // The arc's SVG stretches to the card width, so compute the heading in screen space.
      const map = plane.parentElement, sx = map.clientWidth / 300, sy = map.clientHeight / 84;
      const ang = Math.atan2((p2.y - p.y) * sy, (p2.x - p.x) * sx) * 180 / Math.PI + 90;
      // Jump straight to the spot (no glide) on the first placement, whenever
      // the card was hidden, or when progress goes backwards (a new flight).
      const snap = !planePlaced || !wasAirborne || s.progress < lastProgress;
      if (snap) plane.style.transition = 'none';
      plane.style.left = (p.x / 300 * 100) + '%';
      plane.style.top = (p.y / 84 * 100) + '%';
      plane.style.transform = 'rotate(' + ang + 'deg)';
      if (snap) { void plane.offsetWidth; plane.style.transition = ''; }
      planePlaced = true; lastProgress = s.progress;
      $('pause-label').textContent = s.phase === 'paused' ? 'Resume' : 'Pause';
      $('pause').dataset.cmd = s.phase === 'paused' ? 'resume' : 'pause';
    }
    $('l-dest').textContent = s.destination;
    $('l-sub').textContent = s.durationMinutes + ' min of focus · take a stretch';
    $('l-block').textContent = s.durationMinutes + ' min';
  }

  // ---- tasks
  const I_EDIT = '<svg viewBox="0 0 16 16"><path d="M13.2 1.3a1 1 0 0 1 1.5 0 1 1 0 0 1 0 1.5L6 11.5l-2.8.8.8-2.8zM2 13h12v1.5H2z"/></svg>';
  const I_DEL = '<svg viewBox="0 0 16 16"><path d="M6 1h4l.5 1H14v1.5H2V2h3.5zM3 5h10l-.7 9.1a1 1 0 0 1-1 .9H4.7a1 1 0 0 1-1-.9z"/></svg>';
  const I_PLAY = '<svg viewBox="0 0 16 16"><path d="M3 2l11 6-11 6z"/></svg>';
  const I_LINK = '<svg viewBox="0 0 16 16"><path d="M9 2h5v5h-1.5V4.6L7.1 10 6 8.9l5.4-5.4H9zM3 4h4v1.5H4.5v6h6V9H12v4H3z"/></svg>';
  function renderTasks(tasks, now) {
    const key = JSON.stringify(tasks) + '|' + Math.floor(now / 60000);
    if (key === tasksKey) return; tasksKey = key;
    const open = tasks.filter(t => !t.done).length, done = tasks.length - open;
    $('c-plan').textContent = open; $('c-plan').classList.toggle('hot', open > 0);
    $('plan-sub').textContent = done ? done + ' landed' : '';
    $('tasks-clear').hidden = !done;
    $('tasks-empty').hidden = tasks.length > 0;
    $('tasks').innerHTML = tasks.map(t => \`
      <li class="item \${t.done ? 'done' : ''}" data-id="\${t.id}">
        <input class="check" type="checkbox" \${t.done ? 'checked' : ''} data-act="task.toggle" aria-label="done">
        <span class="title" data-act="task.edit" title="\${esc(t.title)} (click to edit)">\${esc(t.title)}</span>
        <span class="actions">
          <span class="meta">\${t.done ? 'landed' : rel(t.createdAt, now)}</span>
          <button class="iconbtn" data-act="task.edit" title="Edit">\${I_EDIT}</button>
          <button class="iconbtn danger" data-act="task.remove" title="Remove">\${I_DEL}</button>
        </span>
      </li>\`).join('');
  }

  // ---- meetings
  // ---- incoming meeting card: plane flies the track while the alert stays up
  let inKey = '', inTimer = null;
  function renderIncoming(inc, now) {
    const key = inc ? inc.id + '|' + inc.startedAt : '';
    if (key === inKey) return;
    inKey = key; clearInterval(inTimer);
    const el = $('incoming');
    if (!inc) { el.hidden = true; return; }
    $('in-title').textContent = inc.title;
    const t = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    let a = t(inc.start), b = t(inc.start + inc.durationMin * 60000);
    const sa = a.split(' '), sb = b.split(' ');
    if (sa.length === 2 && sb.length === 2 && sa[1] === sb[1]) a = sa[0];
    $('in-span').textContent = a + ' – ' + b;
    $('in-platform').textContent = inc.platform || ''; $('in-platform').hidden = !inc.platform;
    $('in-notes').textContent = inc.notes || ''; $('in-notes').hidden = !inc.notes;
    $('in-join').hidden = !inc.hasLink;
    const total = inc.seconds * 1000, end = Date.now() + (inc.startedAt + total - now);
    const step = () => {
      const left = Math.max(0, end - Date.now()), pct = (1 - left / total) * 100 + '%';
      $('in-trail').style.width = pct; $('in-plane').style.left = pct;
      $('in-left').textContent = Math.ceil(left / 1000) + 's';
      const m = Math.round((inc.start - Date.now()) / 60000);
      $('in-rel').textContent = m > 0 ? 'in ' + m + ' min' : m === 0 ? 'starting now' : 'started ' + -m + ' min ago';
      if (!left) { clearInterval(inTimer); el.hidden = true; }
    };
    $('in-trail').style.transition = $('in-plane').style.transition = 'none';
    step(); void el.offsetWidth;
    $('in-trail').style.transition = $('in-plane').style.transition = '';
    el.hidden = false;
    $('panel-meet').classList.remove('collapsed');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    inTimer = setInterval(step, 250);
  }

  function renderMeetings(list, now) {
    const key = JSON.stringify(list) + '|' + Math.floor(now / 60000);
    if (key === meetKey) return; meetKey = key;
    const upcoming = list.filter(r => r.start + r.durationMin * 60000 > now);
    const next = upcoming.find(r => r.start > now);
    $('c-meet').textContent = upcoming.length; $('c-meet').classList.toggle('hot', !!next && next.start - now <= 30 * 60000);
    $('meet-sub').textContent = next ? 'next in ' + Math.max(1, Math.round((next.start - now) / 60000)) + ' min' : '';
    $('meet-empty').hidden = list.length > 0; $('meet-foot').hidden = !list.some(r => r.start + r.durationMin * 60000 <= now);
    $('meetings').innerHTML = list.map(r => {
      const end = r.start + r.durationMin * 60000, live = r.start <= now && end > now, past = end <= now;
      const mins = Math.round((r.start - now) / 60000);
      const when = past ? 'ended ' + hhmm(end) : live ? 'live · ends ' + hhmm(end) : (sameDay(r.start, now) ? '' : new Date(r.start).toLocaleDateString([], { weekday: 'short' }) + ' · ') + (mins < 180 ? 'in ' + mins + ' min' : 'until ' + hhmm(end));
      return \`
      <li class="item \${live ? 'live' : ''} \${past ? 'past' : ''}" data-id="\${r.id}">
        <span class="time">\${hhmm(r.start)}</span>
        <span class="title" data-act="meeting.edit" title="Click to edit">\${esc(r.title)}</span>
        <span class="actions">
          \${r.link ? '<button class="iconbtn" data-act="meeting.join" title="Join">' + I_LINK + '</button>' : ''}
          <button class="iconbtn" data-act="meeting.preview" title="Preview fly-by">\${I_PLAY}</button>
          <button class="iconbtn danger" data-act="meeting.remove" title="Remove">\${I_DEL}</button>
        </span>
        <span class="sub">\${esc(when)}\${r.platform ? '<span class="pill">' + esc(r.platform) + '</span>' : ''}\${r.notes ? '<span>' + esc(r.notes) + '</span>' : ''}</span>
      </li>\`;
    }).join('');
  }

  window.addEventListener('message', (e) => {
    const d = e.data; if (d.type !== 'state') return;
    renderFlight(d.flight, d.stats, d.now); gateTimes(); renderTasks(d.tasks, d.now); renderMeetings(d.meetings, d.now); renderIncoming(d.incoming, d.now);
  });

  // ---- gate: segmented block-time picker + board
  $('seg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-min]'); if (!b) return;
    document.querySelectorAll('#seg button').forEach(x => x.classList.toggle('on', x === b));
    if (b.dataset.min === 'custom') { selMin = 'custom'; $('custom').focus(); } else selMin = +b.dataset.min;
    gateTimes();
  });
  $('custom').addEventListener('input', gateTimes);
  $('custom').addEventListener('focus', () => { document.querySelectorAll('#seg button').forEach(x => x.classList.toggle('on', x.dataset.min === 'custom')); selMin = 'custom'; gateTimes(); });
  $('custom').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('board').click(); });
  $('board').addEventListener('click', () => {
    const v = selMin === 'custom' ? +$('custom').value : selMin;
    vscode.postMessage(v > 0 ? { type: 'board', minutes: v } : { type: 'board' });
  });

  // ---- generic actions
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a) { if (a.dataset.act === 'task.toggle') return; vscode.postMessage({ type: a.dataset.act, id: a.closest('[data-id]')?.dataset.id }); return; }
    const t = e.target.closest('[data-extend],[data-cmd],#pause,#cancel,#tasks-clear,#task-focus');
    if (!t) return;
    if (t.dataset.extend) return vscode.postMessage(t.dataset.extend === 'custom' ? { type: 'extend' } : { type: 'extend', minutes: +t.dataset.extend });
    if (t.id === 'cancel') return vscode.postMessage({ type: 'cancel' });
    if (t.id === 'pause') return vscode.postMessage({ type: t.dataset.cmd || 'pause' });
    if (t.id === 'tasks-clear') return vscode.postMessage({ type: 'task.clearDone' });
    if (t.id === 'task-focus') { $('panel-plan').classList.remove('collapsed'); $('task-input').focus(); return; }
    if (t.dataset.cmd === 'new') return vscode.postMessage({ type: 'board' });
    if (t.dataset.cmd) return vscode.postMessage({ type: t.dataset.cmd });
  });
  document.addEventListener('change', (e) => {
    const c = e.target.closest('[data-act="task.toggle"]');
    if (c) vscode.postMessage({ type: 'task.toggle', id: c.closest('[data-id]').dataset.id });
  });
  $('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('task-input').value.trim(); if (!v) return;
    vscode.postMessage({ type: 'task.add', title: v }); $('task-input').value = '';
  });

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}
//# sourceMappingURL=sessionView.js.map