import * as vscode from "vscode";

export type FlybyAction = "join" | "snooze" | "dismiss";

export interface FlybyCard {
  title: string;
  /** "in 5 min · 13:00–13:30" */
  when: string;
  minutesUntil: number;
  platform?: string;
  notes?: string;
  joinUrl?: string;
  /** Plain-text one-liner for notification / status bar. */
  oneLine: string;
}

/**
 * The "plane across VS Code" moment: an airliner flies across a night sky in
 * a webview panel towing the meeting card, while a ✈ taxis across the status
 * bar with the one-line summary.
 */
export class Flyby implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private closeTimer: NodeJS.Timeout | undefined;
  private readonly status: vscode.StatusBarItem;
  private statusTimer: NodeJS.Timeout | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.status = vscode.window.createStatusBarItem("airCanada.flyby", vscode.StatusBarAlignment.Left, 999);
    this.status.name = "Air Canada meeting fly-by";
  }

  show(card: FlybyCard, onAction: (a: FlybyAction) => void): void {
    const cfg = vscode.workspace.getConfiguration("airCanada.meetings");
    if (cfg.get<boolean>("flyby.enabled", true)) this.showPanel(card, onAction, cfg.get<number>("flyby.durationSeconds", 20));
    if (cfg.get<boolean>("statusBarFlyby", true)) this.statusFlyby(card, onAction);
  }

  // ------------------------------------------------------------ webview

  private showPanel(card: FlybyCard, onAction: (a: FlybyAction) => void, seconds: number): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "airCanada.flyby",
        "✈ Incoming meeting",
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: true, localResourceRoots: [] },
      );
      this.panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, "images", "icon.png");
      this.panel.onDidDispose(() => {
        this.panel = undefined;
        if (this.closeTimer) clearTimeout(this.closeTimer);
      });
    }
    const panel = this.panel;
    panel.title = `✈ ${card.title} ${card.minutesUntil > 0 ? `in ${card.minutesUntil} min` : "now"}`;

    let interacted = false;
    const sub = panel.webview.onDidReceiveMessage((msg: { type: string }) => {
      if (msg.type === "hover") {
        interacted = true;
        if (this.closeTimer) clearTimeout(this.closeTimer);
        return;
      }
      if (msg.type === "join" || msg.type === "snooze" || msg.type === "dismiss") {
        sub.dispose();
        onAction(msg.type);
        panel.dispose();
      }
    });

    panel.webview.html = html(card, seconds, panel.webview.cspSource);
    panel.reveal(vscode.ViewColumn.Beside, true);

    this.closeTimer = setTimeout(() => {
      if (!interacted && this.panel === panel) panel.dispose();
    }, Math.max(5, seconds) * 1000);
  }

  // ------------------------------------------------------------ status bar

  private statusFlyby(card: FlybyCard, onAction: (a: FlybyAction) => void): void {
    if (this.statusTimer) clearInterval(this.statusTimer);
    const width = 16;
    let frame = 0;
    const label = card.oneLine.length > 70 ? card.oneLine.slice(0, 69) + "…" : card.oneLine;
    this.status.command = { command: "airCanada.meetings.flybyAction", title: "Join", arguments: [card.joinUrl ? "join" : "dismiss", onAction] };
    this.status.tooltip = `${card.oneLine}\n${card.joinUrl ? "Click to join" : "Click to dismiss"}`;
    this.status.show();
    this.statusTimer = setInterval(() => {
      if (frame <= width) {
        this.status.text = `${"·".repeat(frame)}✈${"·".repeat(width - frame)} ${label}`;
      } else if (frame === width + 1) {
        this.status.text = `✈ ${label}`;
      } else if (frame > width + 80) {
        // ~12 s hold after the fly-by
        this.hideStatus();
      }
      frame++;
    }, 150);
  }

  hideStatus(): void {
    if (this.statusTimer) clearInterval(this.statusTimer);
    this.statusTimer = undefined;
    this.status.hide();
  }

  dispose(): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.hideStatus();
    this.panel?.dispose();
    this.status.dispose();
  }
}

// ------------------------------------------------------------------ Livery

/** Rondelle path, verbatim from the public 2017 logo file (bbox 0,0 → 21.3,20.8). */
const RONDELLE_PATH =
  "M11,14.8c0-0.7,0.3-0.8,1-0.4c1.2,0.7,2.4,1.3,2.4,1.3c0-0.4,0.4-0.7,1.1-0.5c0.7,0.2,1.4,0.3,1.4,0.3s-0.4-0.9-0.6-1.3c-0.3-0.7,0-1.1,0.3-1.2c0,0-0.4-0.3-0.7-0.5c-0.6-0.4-0.5-0.9,0.1-1.1c0.8-0.4,1.9-0.8,1.9-0.8c-0.3-0.2-0.7-0.7-0.3-1.4c0.4-0.6,1.1-1.5,1.1-1.5s-1.1,0-1.9,0c-0.7,0-0.9-0.6-0.9-1c0,0-1.1,0.8-1.9,1.3c-0.7,0.5-1.3,0-1.2-0.8c0.2-1.2,0.3-2.6,0.3-2.6C12.7,5,12,4.9,11.6,4.3c-0.5-1-1-2.2-1-2.2s-0.5,1.2-1,2.2C9.3,4.9,8.6,5,8.2,4.7c0,0,0.1,1.4,0.3,2.6C8.6,8,8,8.5,7.3,8C6.5,7.5,5.3,6.7,5.3,6.7c0,0.4-0.2,0.9-0.9,1c-0.8,0-1.9,0-1.9,0s0.7,0.9,1.1,1.5c0.4,0.6,0,1.2-0.3,1.4c0,0,1,0.5,1.9,0.8c0.6,0.3,0.8,0.7,0.1,1.1C5.1,12.7,4.6,13,4.6,13C5,13.1,5.3,13.5,5,14.2c-0.2,0.4-0.6,1.3-0.6,1.3s0.7-0.2,1.4-0.3c0.7-0.2,1,0.2,1.1,0.5c0,0,1.2-0.7,2.4-1.3c0.6-0.4,1-0.2,1,0.4v1.7c0,1-0.2,2-0.5,2.6c-4.5-0.5-8.3-4.1-8.3-8.9c0-4.9,4.1-8.9,9.2-8.9s9.2,4,9.2,8.9c0,4.6-3.6,8.4-8.2,8.9v1.2c5.4-0.5,9.6-4.8,9.6-10.1C21.3,4.5,16.5,0,10.6,0C4.8,0,0,4.5,0,10.1c0,4.9,3.7,9,8.6,9.9c0.8,0.2,1.3,0.3,1.8,0.8c0.5-1,0.6-3,0.6-4.1V14.8z";

/**
 * Side-profile twin-jet (777-class) in the 2017 Air Canada livery: white
 * upper fuselage, black belly sweeping up into an all-black tail, black
 * cockpit "mask", black engine with the Rondelle, Rondelle on the fin, and
 * the charcoal wordmark above the window line. Nose points right (direction
 * of travel). ViewBox 720×260.
 */
const FUSELAGE =
  "M38 128 C70 112 118 100 180 100 L596 100 C648 100 686 118 706 138 C690 160 652 172 598 174 L262 174 C190 174 100 156 38 128 Z";

/** Cabin windows along the fuselage, leaving gaps for the doors. */
function cabinWindows(): string {
  const doors = [176, 300, 586];
  const out: string[] = [];
  for (let x = 168; x <= 612; x += 13) {
    if (doors.some((d) => x > d - 10 && x < d + 16)) continue;
    out.push(`<rect x="${x}" y="118" width="6" height="8" rx="2"/>`);
  }
  return out.join("");
}

const AIRLINER_SVG = `<svg viewBox="0 0 720 260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="fuse"><path d="${FUSELAGE}"/></clipPath>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#F3F4F6"/><stop offset="1" stop-color="#D9DCE2"/></linearGradient>
    <linearGradient id="belly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C1E22"/><stop offset="1" stop-color="#000000"/></linearGradient>
    <linearGradient id="nacelle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2D33"/><stop offset=".5" stop-color="#0B0C0F"/><stop offset="1" stop-color="#000000"/></linearGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9EBEF"/><stop offset="1" stop-color="#C4C9D2"/></linearGradient>
  </defs>

  <!-- vertical stabiliser (black) with rudder hinge line -->
  <path d="M232 101 L152 16 L94 16 L70 112 Z" fill="#000000"/>
  <path d="M106 16 L84 110" stroke="#2A2D33" stroke-width="1.5"/>
  <!-- Rondelle on the fin -->
  <g transform="translate(116 35) scale(2.2)"><path d="${RONDELLE_PATH}" fill="#F01428"/></g>
  <!-- horizontal stabiliser (black) -->
  <path d="M178 126 L76 152 L128 152 L212 126 Z" fill="#0A0A0A"/>
  <path d="M178 126 L76 152 L84 152 L186 126 Z" fill="#2A2D33"/>

  <!-- fuselage skin -->
  <path d="${FUSELAGE}" fill="url(#skin)"/>
  <!-- 2017 livery: black belly that sweeps up into the tail -->
  <path d="M-10 -10 L56 -10 L196 146 L606 146 C650 146 680 142 720 138 L720 270 L-10 270 Z" fill="url(#belly)" clip-path="url(#fuse)"/>
  <!-- APU exhaust -->
  <circle cx="40" cy="128" r="3.5" fill="#3A3F4A"/>
  <!-- registration on the rear fuselage -->
  <text x="118" y="148" font-family="-apple-system,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" font-weight="600" letter-spacing="1" fill="#8B93A1">C-FIVW</text>

  <!-- cockpit mask + glazing -->
  <path d="M624 101 C662 104 690 120 706 138 L700 135 C686 124 668 117 650 115 C642 110 636 105 624 101 Z" fill="#000000"/>
  <path d="M656 112 L676 118 L672 122 L652 117 Z" fill="#B5BBC6"/>
  <path d="M679 119.5 L692 126.5 L689 130 L676 124 Z" fill="#B5BBC6"/>
  <!-- antenna / sat dome -->
  <rect x="470" y="95" width="26" height="6" rx="3" fill="#D9DCE2"/>

  <!-- wordmark above the window line, forward fuselage -->
  <text x="372" y="115" font-family="-apple-system,'Segoe UI',Helvetica,Arial,sans-serif" font-size="16" font-weight="800" letter-spacing="3" fill="#2E2A25">AIR CANADA</text>
  <!-- doors -->
  <g fill="none" stroke="#C4C9D2" stroke-width="1.2">
    <rect x="586" y="106" width="12" height="26" rx="2.5"/>
    <rect x="300" y="106" width="12" height="26" rx="2.5"/>
    <rect x="176" y="106" width="12" height="26" rx="2.5"/>
  </g>
  <!-- cabin windows -->
  <g fill="#1B1E25">${cabinWindows()}</g>

  <!-- near wing: swept back, coming toward the viewer, with winglet -->
  <path d="M448 150 L292 150 L148 228 L228 234 Z" fill="url(#wing)"/>
  <path d="M292 150 L148 228 L160 229 L302 152 Z" fill="#AEB4BF"/>
  <path d="M148 228 L138 200 L147 203 L160 229 Z" fill="#1B1E25"/>
  <!-- wing-to-body fairing -->
  <path d="M470 150 C470 158 440 164 370 164 C300 164 274 158 274 150 Z" fill="#000000"/>

  <!-- engine: pylon, GE90-class nacelle, inlet lip, exhaust, Rondelle -->
  <path d="M322 150 L356 150 L346 168 L330 168 Z" fill="#1B1E25"/>
  <path d="M386 190 C386 172 372 164 340 164 L296 164 C274 164 262 176 262 190 C262 204 274 216 296 216 L340 216 C372 216 386 208 386 190 Z" fill="url(#nacelle)"/>
  <ellipse cx="384" cy="190" rx="7" ry="26" fill="#1B1E25" stroke="#3A3F4A" stroke-width="1.5"/>
  <ellipse cx="384" cy="190" rx="3" ry="12" fill="#5F6672"/>
  <rect x="244" y="182" width="20" height="16" rx="3" fill="#6B7280"/>
  <path d="M262 184 L262 196 L250 192 L250 188 Z" fill="#9AA1AD"/>
  <g transform="translate(305 173) scale(1.6)"><path d="${RONDELLE_PATH}" fill="#F01428"/></g>
  <!-- specular highlight along the upper fuselage -->
  <path d="M190 106 L590 106" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// ------------------------------------------------------------------ HTML

function html(s: FlybyCard, seconds: number, cspSource: string): string {
  const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const esc = (v?: string | number) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const flySec = Math.max(6, Math.min(seconds, 9));
  const chips = [s.platform].filter(Boolean).map((c) => `<span class="chip">${esc(c)}</span>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data:;">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Incoming meeting</title>
<style>
  :root { --red:#F01428; --amber:#F2B544; --cyan:#5FD3E8; --fg:#E6E8EC; --dim:#9AA1AD; --bg:#0B0C0F; }
  html,body { height:100%; margin:0; background:var(--bg); color:var(--fg); font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow:hidden; }
  .sky { position:absolute; inset:0; background: radial-gradient(1200px 600px at 70% 110%, #1B1E25 0%, var(--bg) 60%); }
  .star { position:absolute; width:2px; height:2px; background:#fff; border-radius:50%; opacity:.5; animation: twinkle 3s infinite ease-in-out; }
  @keyframes twinkle { 0%,100%{opacity:.25} 50%{opacity:.8} }
  .runway { position:absolute; left:0; right:0; bottom:46px; height:2px; background:linear-gradient(90deg, transparent, rgba(255,255,255,.25) 20%, rgba(255,255,255,.25) 80%, transparent); }
  .lights { position:absolute; left:0; right:0; bottom:30px; display:flex; justify-content:space-around; }
  .lights i { width:6px; height:6px; border-radius:50%; background:var(--amber); box-shadow:0 0 8px var(--amber); animation: pulse 1.6s infinite; }
  .lights i:nth-child(2n){ animation-delay:.8s }
  @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }

  .plane { position:absolute; top:16%; left:-30%; width:min(460px, 58vw); filter: drop-shadow(0 14px 22px rgba(0,0,0,.6)); animation: fly ${flySec}s cubic-bezier(.25,.1,.25,1) forwards; }
  .plane svg { width:100%; height:auto; display:block; }
  /* contrail trails from the engine exhaust: 0.361 = svg aspect, 0.73 = engine centreline */
  .contrail { position:absolute; top:calc(16% + min(460px, 58vw) * .263); left:-30%; height:3px; width:0; background:linear-gradient(90deg, transparent, rgba(255,255,255,.35)); border-radius:2px; animation: trail ${flySec}s cubic-bezier(.25,.1,.25,1) forwards; }
  @keyframes fly { 0%{left:-30%; transform:translateY(0) rotate(0)} 50%{transform:translateY(-12px) rotate(-1.5deg)} 100%{left:110%; transform:translateY(0) rotate(0)} }
  @keyframes trail { 0%{left:-30%; width:0} 100%{left:-30%; width:140%} }

  .card { position:absolute; left:50%; top:52%; transform:translate(-50%,-40%); width:min(560px, 86vw); background:#13151A; border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:22px 24px 18px; box-shadow:0 20px 60px rgba(0,0,0,.6); opacity:0; animation: rise .8s 1.8s ease-out forwards; }
  @keyframes rise { to { opacity:1; transform:translate(-50%,-50%);} }
  .eyebrow { display:flex; align-items:center; gap:10px; color:var(--red); font-weight:700; letter-spacing:.14em; font-size:11px; text-transform:uppercase; }
  .eyebrow .dot { width:8px; height:8px; border-radius:50%; background:var(--red); box-shadow:0 0 10px var(--red); animation:pulse 1s infinite; }
  h1 { font-size:22px; margin:10px 0 4px; line-height:1.25; }
  .when { color:var(--cyan); font-weight:600; font-size:14px; margin-bottom:12px; }
  .chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
  .chip { font-size:12px; color:var(--fg); background:rgba(255,255,255,.07); border-radius:999px; padding:4px 10px; }
  .notes { color:var(--dim); font-size:13.5px; line-height:1.5; margin:0 0 16px; white-space:pre-wrap; }
  .actions { display:flex; gap:10px; align-items:center; }
  button { font: inherit; font-size:13px; font-weight:600; border:0; border-radius:8px; padding:9px 16px; cursor:pointer; color:#fff; background:rgba(255,255,255,.08); }
  button.primary { background:var(--red); }
  button:hover { filter:brightness(1.12); }
  .bar { position:absolute; left:0; right:0; bottom:0; height:3px; background:rgba(255,255,255,.06); border-radius:0 0 14px 14px; overflow:hidden; }
  .bar i { display:block; height:100%; width:100%; background:var(--red); transform-origin:left; animation: drain ${Math.max(5, seconds)}s linear forwards; }
  @keyframes drain { to { transform:scaleX(0);} }
  .card:hover .bar i { animation-play-state: paused; }
</style>
</head>
<body>
  <div class="sky" id="sky"></div>
  <div class="runway"></div>
  <div class="lights"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
  <div class="contrail"></div>
  <div class="plane" aria-hidden="true">
    ${AIRLINER_SVG}
  </div>

  <section class="card" id="card" role="dialog" aria-label="Incoming meeting">
    <div class="eyebrow"><span class="dot"></span> Incoming meeting</div>
    <h1>${esc(s.title)}</h1>
    <div class="when">${esc(s.when)}</div>
    ${chips ? `<div class="chips">${chips}</div>` : ""}
    ${s.notes ? `<p class="notes">${esc(s.notes)}</p>` : ""}
    <div class="actions">
      ${s.joinUrl ? `<button class="primary" id="join">Join ${esc(s.platform ?? "meeting")}</button>` : ""}
      <button id="snooze">Snooze 2 min</button>
      <button id="dismiss">Dismiss</button>
    </div>
    <div class="bar"><i></i></div>
  </section>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const sky = document.getElementById('sky');
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('i'); s.className = 'star';
    s.style.left = Math.random()*100 + '%'; s.style.top = Math.random()*70 + '%';
    s.style.animationDelay = (Math.random()*3) + 's'; sky.appendChild(s);
  }
  document.getElementById('card').addEventListener('mouseenter', () => vscode.postMessage({ type: 'hover' }));
  for (const id of ['join','snooze','dismiss']) {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', () => vscode.postMessage({ type: id }));
  }
</script>
</body>
</html>`;
}
