#!/usr/bin/env node
/**
 * File icon theme generator — "boarding pass" icons.
 *
 * Every file is a boarding pass: white body, coloured stub, and a short
 * airline-style code (TS, PY, MD…). Folders are hangars; the workspace root
 * is a control tower. Everything is generated from the table below, so adding
 * a language is one line. Run: `npm run build:file-icons`
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "icons", "files");
const SVG_DIR = path.join(OUT_DIR, "svg");

// EFIS palette (shared with the colour themes)
const C = {
  red: "#F01428",
  magenta: "#E07AC8",
  cyan: "#5FD3E8",
  green: "#7FD88F",
  amber: "#F2B544",
  blue: "#6FA8FF",
  white: "#E6E8EC",
  grey: "#9AA1AD",
  dark: "#1A1C20",
  slate: "#5F6672",
};

// code shown on the pass, stub colour, and what it maps to
const PASSES = [
  { id: "ts",     code: "TS",   stub: C.blue,    languageIds: ["typescript"],              ext: ["ts", "mts", "cts"] },
  { id: "tsx",    code: "TSX",  stub: C.blue,    languageIds: ["typescriptreact"],         ext: ["tsx"] },
  { id: "js",     code: "JS",   stub: C.amber,   languageIds: ["javascript"],              ext: ["js", "mjs", "cjs"] },
  { id: "jsx",    code: "JSX",  stub: C.amber,   languageIds: ["javascriptreact"],         ext: ["jsx"] },
  { id: "json",   code: "JSON", stub: C.amber,   languageIds: ["json", "jsonc"],           ext: ["json", "jsonc", "json5"] },
  { id: "md",     code: "MD",   stub: C.white,   languageIds: ["markdown"],                ext: ["md", "mdx", "markdown"] },
  { id: "py",     code: "PY",   stub: C.green,   languageIds: ["python"],                  ext: ["py", "pyi", "ipynb"] },
  { id: "html",   code: "HTML", stub: C.red,     languageIds: ["html"],                    ext: ["html", "htm"] },
  { id: "css",    code: "CSS",  stub: C.magenta, languageIds: ["css", "scss", "less"],     ext: ["css", "scss", "sass", "less"] },
  { id: "vue",    code: "VUE",  stub: C.green,   languageIds: ["vue"],                     ext: ["vue", "svelte"] },
  { id: "yaml",   code: "YML",  stub: C.cyan,    languageIds: ["yaml"],                    ext: ["yml", "yaml"] },
  { id: "toml",   code: "TOML", stub: C.cyan,    languageIds: ["toml"],                    ext: ["toml", "ini", "cfg"] },
  { id: "xml",    code: "XML",  stub: C.grey,    languageIds: ["xml"],                     ext: ["xml", "plist", "csproj", "xaml"] },
  { id: "sh",     code: "SH",   stub: C.green,   languageIds: ["shellscript", "powershell"], ext: ["sh", "bash", "zsh", "ps1"] },
  { id: "go",     code: "GO",   stub: C.cyan,    languageIds: ["go"],                      ext: ["go"] },
  { id: "rs",     code: "RS",   stub: C.amber,   languageIds: ["rust"],                    ext: ["rs"] },
  { id: "java",   code: "JV",   stub: C.red,     languageIds: ["java", "kotlin"],          ext: ["java", "kt", "kts"] },
  { id: "cs",     code: "C#",   stub: C.magenta, languageIds: ["csharp"],                  ext: ["cs"] },
  { id: "c",      code: "C",    stub: C.blue,    languageIds: ["c", "cpp", "objective-c"], ext: ["c", "h", "cpp", "hpp", "cc", "m"] },
  { id: "swift",  code: "SWF",  stub: C.amber,   languageIds: ["swift"],                   ext: ["swift"] },
  { id: "dart",   code: "DRT",  stub: C.cyan,    languageIds: ["dart"],                    ext: ["dart"] },
  { id: "rb",     code: "RB",   stub: C.red,     languageIds: ["ruby"],                    ext: ["rb", "erb"] },
  { id: "php",    code: "PHP",  stub: C.magenta, languageIds: ["php"],                     ext: ["php"] },
  { id: "sql",    code: "SQL",  stub: C.cyan,    languageIds: ["sql"],                     ext: ["sql"] },
  { id: "docker", code: "DKR",  stub: C.blue,    languageIds: ["dockerfile"],              ext: [], names: ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", ".dockerignore"] },
  { id: "git",    code: "GIT",  stub: C.red,     languageIds: ["git-commit", "git-rebase", "ignore"], ext: [], names: [".gitignore", ".gitattributes", ".gitmodules", ".gitkeep"] },
  { id: "env",    code: "ENV",  stub: C.amber,   languageIds: ["dotenv"],                  ext: ["env"], names: [".env", ".env.local", ".env.example", ".env.development", ".env.production"] },
  { id: "lock",   code: "LOCK", stub: C.slate,   languageIds: [],                          ext: ["lock"], names: ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Cargo.lock", "poetry.lock", "Gemfile.lock"] },
  { id: "pkg",    code: "PKG",  stub: C.green,   languageIds: [],                          ext: [], names: ["package.json", "Cargo.toml", "pyproject.toml", "go.mod", "Gemfile", "pom.xml", "build.gradle"] },
  { id: "img",    code: "IMG",  stub: C.magenta, languageIds: [],                          ext: ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif"] },
  { id: "font",   code: "FNT",  stub: C.grey,    languageIds: [],                          ext: ["woff", "woff2", "ttf", "otf", "eot"] },
  { id: "pdf",    code: "PDF",  stub: C.red,     languageIds: [],                          ext: ["pdf"] },
  { id: "zip",    code: "ZIP",  stub: C.slate,   languageIds: [],                          ext: ["zip", "tar", "gz", "tgz", "7z", "rar", "vsix"] },
  { id: "txt",    code: "TXT",  stub: C.grey,    languageIds: ["plaintext"],               ext: ["txt", "log"] },
  { id: "license",code: "LIC",  stub: C.white,   languageIds: [],                          ext: [], names: ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "COPYING"] },
  { id: "readme", code: "RDME", stub: C.red,     languageIds: [],                          ext: [], names: ["README.md", "README", "readme.md", "CHANGELOG.md", "CONTRIBUTING.md"] },
  { id: "test",   code: "TEST", stub: C.green,   languageIds: [],                          ext: ["test.ts", "spec.ts", "test.js", "spec.js", "test.tsx", "spec.tsx", "test.py"] },
  { id: "config", code: "CFG",  stub: C.cyan,    languageIds: [],                          ext: [], names: ["tsconfig.json", "jsconfig.json", ".eslintrc", ".eslintrc.json", ".prettierrc", "vite.config.ts", "webpack.config.js", "next.config.js", "tailwind.config.js", "babel.config.js", ".editorconfig", ".vscodeignore", ".npmrc", ".nvmrc"] },
];

// ---------------------------------------------------------------------------
// SVG builders
// ---------------------------------------------------------------------------
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// stub spans x 1–8, body x 8–31 (23 units wide) so 4-letter codes fit
function boardingPass(code, stub) {
  const size = code.length >= 4 ? 6.6 : code.length === 3 ? 8.2 : 9.8;
  const spacing = code.length >= 4 ? -0.45 : -0.2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <mask id="notch">
      <rect width="32" height="32" fill="#fff"/>
      <circle cx="8" cy="7" r="2.1" fill="#000"/>
      <circle cx="8" cy="25" r="2.1" fill="#000"/>
    </mask>
  </defs>
  <g mask="url(#notch)">
    <rect x="1" y="7" width="30" height="18" rx="3" fill="${C.white}"/>
    <path d="M1 10a3 3 0 0 1 3-3h4v18H4a3 3 0 0 1-3-3z" fill="${stub}"/>
  </g>
  <path d="M8 9.5v13" stroke="${C.dark}" stroke-opacity=".35" stroke-width="1" stroke-dasharray="1.5 1.5"/>
  <text x="19.6" y="19.6" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="700" letter-spacing="${spacing}" fill="${C.dark}">${escape(code)}</text>
</svg>
`;
}

function plainFile() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <mask id="notch">
      <rect width="32" height="32" fill="#fff"/>
      <circle cx="8" cy="7" r="2.1" fill="#000"/>
      <circle cx="8" cy="25" r="2.1" fill="#000"/>
    </mask>
  </defs>
  <g mask="url(#notch)">
    <rect x="1" y="7" width="30" height="18" rx="3" fill="${C.white}"/>
    <path d="M1 10a3 3 0 0 1 3-3h4v18H4a3 3 0 0 1-3-3z" fill="${C.grey}"/>
  </g>
  <path d="M8 9.5v13" stroke="${C.dark}" stroke-opacity=".35" stroke-width="1" stroke-dasharray="1.5 1.5"/>
  <rect x="12" y="13" width="14" height="1.8" rx=".9" fill="${C.dark}" fill-opacity=".45"/>
  <rect x="12" y="17" width="9" height="1.8" rx=".9" fill="${C.dark}" fill-opacity=".45"/>
</svg>
`;
}

function hangar(open) {
  const door = open
    ? `<rect x="10" y="12" width="12" height="4" rx="1" fill="${C.dark}"/>
  <path d="M12.5 21h7l-1 3h-5z" fill="${C.white}" fill-opacity=".9"/>`
    : `<rect x="10" y="14" width="12" height="11" rx="1" fill="${C.dark}"/>
  <rect x="10" y="17.5" width="12" height="1.2" fill="${C.grey}" fill-opacity=".6"/>
  <rect x="10" y="21" width="12" height="1.2" fill="${C.grey}" fill-opacity=".6"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="M3 26V15a13 13 0 0 1 26 0v11z" fill="${open ? "#B5BBC6" : C.grey}"/>
  <path d="M3 15a13 13 0 0 1 26 0v1.6H3z" fill="${C.red}"/>
  ${door}
  <rect x="2" y="26" width="28" height="2" rx="1" fill="${C.slate}"/>
</svg>
`;
}

function tower(open) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="M6 9h20l-2.5 6h-15z" fill="${open ? "#B5BBC6" : C.grey}"/>
  <rect x="7.5" y="10.5" width="17" height="2" fill="${C.dark}" fill-opacity=".55"/>
  <rect x="13" y="15" width="6" height="11" fill="${C.slate}"/>
  <rect x="14.5" y="3" width="3" height="6" fill="${C.red}"/>
  <circle cx="16" cy="3" r="1.6" fill="${C.red}"/>
  <rect x="4" y="26" width="24" height="2" rx="1" fill="${C.slate}"/>
</svg>
`;
}

function escape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
fs.mkdirSync(SVG_DIR, { recursive: true });

const iconDefinitions = {};
const write = (id, svg) => {
  fs.writeFileSync(path.join(SVG_DIR, `${id}.svg`), svg);
  iconDefinitions[`_${id}`] = { iconPath: `./svg/${id}.svg` };
};

write("file", plainFile());
write("folder", hangar(false));
write("folder-open", hangar(true));
write("root", tower(false));
write("root-open", tower(true));

const fileExtensions = {};
const fileNames = {};
const languageIds = {};
for (const p of PASSES) {
  write(p.id, boardingPass(p.code, p.stub));
  for (const e of p.ext) fileExtensions[e] = `_${p.id}`;
  for (const n of p.names || []) fileNames[n] = `_${p.id}`;
  for (const l of p.languageIds) languageIds[l] = `_${p.id}`;
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
  fileExtensions,
  fileNames,
  languageIds,
};

fs.writeFileSync(path.join(OUT_DIR, "air-canada-file-icons.json"), JSON.stringify(theme, null, 2) + "\n");
console.log(`✈  File icons: ${Object.keys(iconDefinitions).length} SVGs, ${Object.keys(fileExtensions).length} extensions, ${Object.keys(fileNames).length} file names, ${Object.keys(languageIds).length} languages → icons/files/`);
