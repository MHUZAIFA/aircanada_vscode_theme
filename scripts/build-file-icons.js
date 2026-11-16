#!/usr/bin/env node
/**
 * File icon theme generator — "luggage tag" icons.
 *
 * Files are luggage tags: a solid tag in the language's colour with a punched
 * hole, carrying either a bold short code (TS, PY, GO…) or a simple glyph
 * ({ }, branch, lock…). Codes are capped at three letters so they stay
 * readable at 16 px. Folders are folders, tinted and badged for common names
 * (src, node_modules, out…); build output folders carry a departing plane and
 * the workspace root is Rondelle red. Run: `npm run build:file-icons`
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "icons", "files");
const SVG_DIR = path.join(OUT_DIR, "svg");

const C = {
  red: "#F01428", orange: "#F28C38", amber: "#F2B544", yellow: "#F5D547",
  green: "#7FD88F", mint: "#42D392", teal: "#2DD4BF", cyan: "#5FD3E8",
  sky: "#38BDF8", blue: "#4C8DFF", navy: "#2F6FD6", purple: "#A78BFA",
  magenta: "#E07AC8", white: "#E6E8EC", silver: "#C3C8D1", grey: "#9AA1AD",
  steel: "#8FA3BF", slate: "#5F6672", ink: "#15171B",
};

// Plane silhouette (24×24, nose up), shared with the Flight Deck view.
const PLANE = "M12 1.5c.9 0 1.6 1.3 1.6 2.9v4.5l8.4 4.9v2.3l-8.4-2.5v4.6l2.3 1.7v1.7L12 20.5l-3.9 1.1v-1.7l2.3-1.7v-4.6L2 16.1v-2.3l8.4-4.9V4.4c0-1.6.7-2.9 1.6-2.9z";

// ---------------------------------------------------------------- glyphs
// Drawn in a 16×16 box centred on 0,0. `k` is the ink colour.
const S = (k, w = 2) => `fill="none" stroke="${k}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const G = {
  braces: (k) => `<path ${S(k)} d="M-3 -7c-2 0-2.6 1-2.6 2.6v1.6c0 1.2-.6 2-1.9 2.8 1.3.8 1.9 1.6 1.9 2.8v1.6c0 1.6.6 2.6 2.6 2.6M3 -7c2 0 2.6 1 2.6 2.6v1.6c0 1.2.6 2 1.9 2.8-1.3.8-1.9 1.6-1.9 2.8v1.6c0 1.6-.6 2.6-2.6 2.6"/>`,
  code: (k) => `<path ${S(k, 2.2)} d="M-3.5 -5L-8 0l4.5 5M3.5 -5L8 0l-4.5 5M1.6 -7l-3.2 14"/>`,
  angle: (k) => `<path ${S(k, 2.4)} d="M-2 -5.5L-7.5 0l5.5 5.5M2 -5.5L7.5 0 2 5.5"/>`,
  branch: (k) => `<g ${S(k, 2)}><circle cx="-4" cy="-5.2" r="2"/><circle cx="-4" cy="5.2" r="2"/><circle cx="4.5" cy="-3.2" r="2"/><path d="M-4 -3.2v6.4M4.5 -1.2c0 3.4-5.6 2.2-7.6 4.6"/></g>`,
  image: (k) => `<path fill="${k}" d="M-7.5 6l5-7 3.5 4 2.5-3 4 6z"/><circle cx="3.6" cy="-4.4" r="2.1" fill="${k}"/>`,
  lock: (k) => `<rect x="-5.2" y="-1" width="10.4" height="7.8" rx="1.6" fill="${k}"/><path ${S(k, 2)} d="M-3 -1v-2.6a3 3 0 0 1 6 0V-1"/>`,
  box: (k) => `<path ${S(k, 1.9)} d="M0 -7.5l6.5 3.5v8L0 7.5-6.5 4v-8zM-6.5 -4L0 -.5 6.5 -4M0 -.5v8"/>`,
  sliders: (k) => `<path ${S(k, 1.7)} d="M-7 -4.6h14M-7 0h14M-7 4.6h14"/><circle cx="2.6" cy="-4.6" r="2.2" fill="${k}"/><circle cx="-3.2" cy="0" r="2.2" fill="${k}"/><circle cx="4" cy="4.6" r="2.2" fill="${k}"/>`,
  seal: (k) => `<circle cx="0" cy="-1.8" r="4.6" ${S(k, 2)}/><path fill="${k}" d="M-3.2 2.2L-4.6 7.8 0 5.8l4.6 2-1.4-5.6a6.4 6.4 0 0 1-6.4 0z"/>`,
  info: (k) => `<circle cx="0" cy="0" r="7" ${S(k, 1.9)}/><circle cx="0" cy="-3.5" r="1.35" fill="${k}"/><path ${S(k, 2.3)} d="M0 -.4v4.6"/>`,
  zip: (k) => [-7.5, -5, -2.5, 0].map((y, i) => `<rect x="${i % 2 ? 0 : -3}" y="${y}" width="3" height="1.8" rx=".5" fill="${k}"/>`).join("") + `<path ${S(k, 1.4)} d="M0 -7.5v9.5"/><rect x="-2.6" y="2.4" width="5.2" height="5.4" rx="1.3" fill="${k}"/>`,
  key: (k) => `<circle cx="-3.6" cy="0" r="3.3" ${S(k, 2)}/><path ${S(k, 2)} d="M-.3 0h7.6M5 0v3.2M2.4 0v2.4"/>`,
  check: (k) => `<path ${S(k, 2.6)} d="M-6 .4l4 4 8-9"/>`,
  prompt: (k) => `<path ${S(k, 2.2)} d="M-7 -5l5 5-5 5M.5 5.5h6.5"/>`,
  lines: (k) => `<path ${S(k, 1.9)} d="M-6.5 -4.5h13M-6.5 0h13M-6.5 4.5h8"/>`,
  db: (k) => `<g ${S(k, 1.8)}><ellipse cx="0" cy="-4.6" rx="6" ry="2.4"/><path d="M-6 -4.6v9.2c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4v-9.2M-6 0c0 1.3 2.7 2.4 6 2.4S6 1.3 6 0"/></g>`,
  docker: (k) => [[-7.2, -1.4], [-3.6, -1.4], [0, -1.4], [-3.6, -5], [0, -5]].map(([x, y]) => `<rect x="${x}" y="${y}" width="3" height="3" rx=".5" fill="${k}"/>`).join("") + `<path fill="${k}" d="M-8 2.6h14.5c.6-1.3 1.6-1.9 2.6-1.8-.3 3.8-4.3 6.7-9.6 6.7-4 0-6.8-1.8-7.5-4.9z"/>`,
  hash: (k) => `<path ${S(k, 2)} d="M-2.4 -7l-1.6 14M3.6 -7L2 7M-7 -2.6h14M-7.6 2.6h14"/>`,
  drop: (k) => `<path fill="${k}" d="M0 -7.5c2.6 3.2 5.6 5.8 5.6 9.4a5.6 5.6 0 0 1-11.2 0C-5.6 -1.7-2.6 -4.3 0 -7.5z"/>`,
  globe: (k) => `<g ${S(k, 1.7)}><circle r="7"/><path d="M-7 0h14M0 -7c-2.4 2-3.4 4.4-3.4 7s1 5 3.4 7c2.4-2 3.4-4.4 3.4-7s-1-5-3.4-7"/></g>`,
  plane: (k) => `<path fill="${k}" transform="rotate(45) translate(-9 -9) scale(.75)" d="${PLANE}"/>`,
  planeUp: (k) => `<path fill="${k}" transform="translate(-9 -9) scale(.75)" d="${PLANE}"/>`,
};

// ---------------------------------------------------------------- helpers
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = hexToRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const inkFor = (bg) => (lum(bg) > 0.33 ? C.ink : "#FFFFFF");
const shade = (h, f) => "#" + hexToRgb(h).map((v) => Math.round(v * f).toString(16).padStart(2, "0")).join("");
const FONT = "-apple-system,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>\n`;

// ---------------------------------------------------------------- luggage tag
// Chamfered left end with a punched hole; content area centred on (18.5, 16).
const TAG = "M9 5.5h19a2.5 2.5 0 0 1 2.5 2.5v16a2.5 2.5 0 0 1-2.5 2.5H9L2 19.6v-7.2z";
function tag(color, { code, glyph, faint } = {}) {
  const k = inkFor(color);
  let content = "";
  if (glyph) content = `<g transform="translate(18.6 16)"${faint ? ' opacity=".55"' : ""}>${G[glyph](k)}</g>`;
  else if (code) {
    const size = code.length === 1 ? 16 : code.length === 2 ? 13.2 : 10;
    const ls = code.length >= 3 ? -0.6 : -0.3;
    content = `<text x="18.8" y="${(16 + size * 0.36).toFixed(2)}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="800" letter-spacing="${ls}" fill="${k}">${esc(code)}</text>`;
  }
  return svg(`<defs><mask id="h"><rect width="32" height="32" fill="#fff"/><circle cx="6.6" cy="16" r="1.9" fill="#000"/></mask></defs>` +
    `<path mask="url(#h)" fill="${color}" d="${TAG}"/>${content}`);
}

// ---------------------------------------------------------------- folders
const BACK = "M2.5 8.2a2 2 0 0 1 2-2h7.2l2.6 2.6h13.2a2 2 0 0 1 2 2V25a2 2 0 0 1-2 2h-23a2 2 0 0 1-2-2z";
function folder(color, glyph, open) {
  const back = `<path fill="${shade(color, 0.62)}" d="${BACK}"/>`;
  const front = open
    ? `<path fill="${color}" d="M6.2 13.4h23.6a1.5 1.5 0 0 1 1.45 1.9l-2.9 10.2a2 2 0 0 1-1.9 1.5H4.4a1.5 1.5 0 0 1-1.45-1.9l2.9-10.2a2 2 0 0 1 .35-.7z"/>`
    : `<rect x="2.5" y="11" width="27" height="16" rx="2" fill="${color}"/>`;
  const g = glyph ? `<g transform="translate(${open ? 16.8 : 16} ${open ? 20.3 : 19.2}) scale(.72)">${G[glyph](inkFor(color))}</g>` : "";
  return svg(back + front + g);
}

// ---------------------------------------------------------------- tables
const TAGS = [
  { id: "ts", code: "TS", color: C.navy, languageIds: ["typescript"], ext: ["ts", "mts", "cts"] },
  { id: "tsx", code: "TSX", color: C.sky, languageIds: ["typescriptreact"], ext: ["tsx"] },
  { id: "js", code: "JS", color: C.yellow, languageIds: ["javascript"], ext: ["js", "mjs", "cjs"] },
  { id: "jsx", code: "JSX", color: C.amber, languageIds: ["javascriptreact"], ext: ["jsx"] },
  { id: "json", glyph: "braces", color: C.amber, languageIds: ["json", "jsonc"], ext: ["json", "jsonc", "json5"] },
  { id: "md", code: "MD", color: C.white, languageIds: ["markdown"], ext: ["md", "mdx", "markdown"] },
  { id: "py", code: "PY", color: C.blue, languageIds: ["python"], ext: ["py", "pyi", "ipynb"] },
  { id: "html", glyph: "code", color: C.orange, languageIds: ["html"], ext: ["html", "htm"] },
  { id: "css", glyph: "hash", color: C.magenta, languageIds: ["css", "scss", "less"], ext: ["css", "scss", "sass", "less"] },
  { id: "vue", code: "V", color: C.mint, languageIds: ["vue", "svelte"], ext: ["vue", "svelte"] },
  { id: "yaml", code: "YML", color: C.cyan, languageIds: ["yaml"], ext: ["yml", "yaml"] },
  { id: "toml", code: "TML", color: C.teal, languageIds: ["toml", "ini"], ext: ["toml", "ini", "cfg"] },
  { id: "xml", glyph: "angle", color: C.grey, languageIds: ["xml"], ext: ["xml", "plist", "csproj", "xaml"] },
  { id: "sh", glyph: "prompt", color: C.slate, languageIds: ["shellscript", "powershell"], ext: ["sh", "bash", "zsh", "ps1"] },
  { id: "go", code: "GO", color: C.cyan, languageIds: ["go"], ext: ["go"] },
  { id: "rs", code: "RS", color: C.orange, languageIds: ["rust"], ext: ["rs"] },
  { id: "java", code: "JV", color: C.red, languageIds: ["java", "kotlin"], ext: ["java", "kt", "kts"] },
  { id: "cs", code: "C#", color: C.purple, languageIds: ["csharp"], ext: ["cs"] },
  { id: "c", code: "C", color: C.blue, languageIds: ["c", "cpp", "objective-c"], ext: ["c", "h", "cpp", "hpp", "cc", "m"] },
  { id: "swift", code: "SW", color: C.orange, languageIds: ["swift"], ext: ["swift"] },
  { id: "dart", code: "DT", color: C.sky, languageIds: ["dart"], ext: ["dart"] },
  { id: "rb", code: "RB", color: C.red, languageIds: ["ruby"], ext: ["rb", "erb"] },
  { id: "php", code: "PHP", color: C.purple, languageIds: ["php"], ext: ["php"] },
  { id: "sql", glyph: "db", color: C.cyan, languageIds: ["sql"], ext: ["sql", "sqlite", "db"] },
  { id: "docker", glyph: "docker", color: C.blue, languageIds: ["dockerfile"], ext: [], names: ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", ".dockerignore"] },
  { id: "git", glyph: "branch", color: C.red, languageIds: ["git-commit", "git-rebase", "ignore"], ext: [], names: [".gitignore", ".gitattributes", ".gitmodules", ".gitkeep"] },
  { id: "env", glyph: "key", color: C.amber, languageIds: ["dotenv"], ext: ["env"], names: [".env", ".env.local", ".env.example", ".env.development", ".env.production"] },
  { id: "lock", glyph: "lock", color: C.slate, languageIds: [], ext: ["lock"], names: ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Cargo.lock", "poetry.lock", "Gemfile.lock"] },
  { id: "pkg", glyph: "box", color: C.green, languageIds: [], ext: [], names: ["package.json", "Cargo.toml", "pyproject.toml", "go.mod", "Gemfile", "pom.xml", "build.gradle"] },
  { id: "img", glyph: "image", color: C.magenta, languageIds: [], ext: ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif"] },
  { id: "font", code: "Aa", color: C.silver, languageIds: [], ext: ["woff", "woff2", "ttf", "otf", "eot"] },
  { id: "pdf", code: "PDF", color: C.red, languageIds: [], ext: ["pdf"] },
  { id: "zip", glyph: "zip", color: C.grey, languageIds: [], ext: ["zip", "tar", "gz", "tgz", "7z", "rar"] },
  { id: "vsix", glyph: "plane", color: C.red, languageIds: [], ext: ["vsix"] },
  { id: "txt", glyph: "lines", color: C.silver, languageIds: ["plaintext", "log"], ext: ["txt", "log"] },
  { id: "license", glyph: "seal", color: C.white, languageIds: [], ext: [], names: ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "COPYING"] },
  { id: "readme", glyph: "info", color: C.red, languageIds: [], ext: [], names: ["README.md", "README", "readme.md", "CHANGELOG.md", "CONTRIBUTING.md"] },
  { id: "test", glyph: "check", color: C.green, languageIds: [], ext: ["test.ts", "spec.ts", "test.js", "spec.js", "test.tsx", "spec.tsx", "test.py"] },
  { id: "config", glyph: "sliders", color: C.steel, languageIds: [], ext: [], names: ["tsconfig.json", "jsconfig.json", ".eslintrc", ".eslintrc.json", "eslint.config.js", ".prettierrc", "vite.config.ts", "webpack.config.js", "next.config.js", "tailwind.config.js", "babel.config.js", ".editorconfig", ".vscodeignore", ".npmrc", ".nvmrc"] },
];

const FOLDERS = [
  { id: "src", glyph: "code", color: C.blue, names: ["src", "source", "lib", "app"] },
  { id: "modules", glyph: "box", color: C.green, names: ["node_modules", "vendor", "packages"] },
  { id: "vscode", glyph: "sliders", color: C.navy, names: [".vscode", ".idea", ".devcontainer"] },
  { id: "git", glyph: "branch", color: C.red, names: [".git"] },
  { id: "github", glyph: "branch", color: C.slate, names: [".github", ".gitlab"] },
  { id: "media", glyph: "image", color: C.magenta, names: ["images", "img", "media", "assets", "icons", "screenshots"] },
  { id: "public", glyph: "globe", color: C.cyan, names: ["public", "static", "www"] },
  { id: "scripts", glyph: "prompt", color: C.slate, names: ["scripts", "bin", "tools"] },
  { id: "out", glyph: "plane", color: C.amber, names: ["out", "dist", "build", "release", "releases", "target"] },
  { id: "test", glyph: "check", color: C.green, names: ["test", "tests", "__tests__", "spec", "e2e"] },
  { id: "docs", glyph: "info", color: C.white, names: ["docs", "doc", "documentation"] },
  { id: "themes", glyph: "drop", color: C.purple, names: ["themes", "styles", "css", "theme"] },
  { id: "config", glyph: "sliders", color: C.steel, names: ["config", "configs", ".config", "settings"] },
  { id: "components", glyph: "box", color: C.purple, names: ["components", "ui", "widgets"] },
  { id: "samples", glyph: "angle", color: C.teal, names: ["samples", "examples", "demo", "demos"] },
];

// ---------------------------------------------------------------- build
fs.rmSync(SVG_DIR, { recursive: true, force: true });
fs.mkdirSync(SVG_DIR, { recursive: true });

const iconDefinitions = {};
const write = (id, body) => {
  fs.writeFileSync(path.join(SVG_DIR, `${id}.svg`), body);
  iconDefinitions[`_${id}`] = { iconPath: `./svg/${id}.svg` };
};

write("file", tag(C.silver, { glyph: "lines", faint: true }));
write("folder", folder("#8C95A3", null, false));
write("folder-open", folder("#8C95A3", null, true));
write("root", folder(C.red, "planeUp", false));
write("root-open", folder(C.red, "plane", true));

const fileExtensions = {}, fileNames = {}, languageIds = {};
for (const t of TAGS) {
  write(t.id, tag(t.color, t));
  for (const e of t.ext) fileExtensions[e] = `_${t.id}`;
  for (const n of t.names || []) fileNames[n] = `_${t.id}`;
  for (const l of t.languageIds) languageIds[l] = `_${t.id}`;
}

const folderNames = {}, folderNamesExpanded = {};
for (const f of FOLDERS) {
  write(`folder-${f.id}`, folder(f.color, f.glyph, false));
  write(`folder-${f.id}-open`, folder(f.color, f.glyph, true));
  for (const n of f.names) { folderNames[n] = `_folder-${f.id}`; folderNamesExpanded[n] = `_folder-${f.id}-open`; }
}

const theme = {
  $schema: "vscode://schemas/icon-theme",
  hidesExplorerArrows: false,
  iconDefinitions,
  file: "_file",
  folder: "_folder",
  folderExpanded: "_folder-open",
  rootFolder: "_root",
  rootFolderExpanded: "_root-open",
  folderNames,
  folderNamesExpanded,
  fileExtensions,
  fileNames,
  languageIds,
};

fs.writeFileSync(path.join(OUT_DIR, "air-canada-file-icons.json"), JSON.stringify(theme, null, 2) + "\n");
console.log(`✈  File icons: ${Object.keys(iconDefinitions).length} SVGs, ${Object.keys(fileExtensions).length} extensions, ${Object.keys(fileNames).length} file names, ${Object.keys(languageIds).length} languages, ${Object.keys(folderNames).length} folder names → icons/files/`);
