#!/usr/bin/env node
/**
 * Product icon theme generator — aviation glyphs for the workbench.
 *
 * VS Code product icon themes are font-based, so each glyph below is a
 * filled 24×24 SVG (no strokes — strokes are dropped during font conversion).
 * fantasticon turns them into a WOFF; this script then writes the theme JSON
 * that maps codicon IDs to the new glyphs. Any codicon not listed here falls
 * back to the default, so the set can grow incrementally.
 *
 * Run: `npm run build:product-icons`
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "icons", "product");
const SVG_DIR = path.join(OUT_DIR, "svg");
const DIST_DIR = path.join(OUT_DIR, "dist");
const FONT_NAME = "ac-aviation";

// Keys are codicon IDs. Values are the inner SVG of a 24×24 viewBox.
const GLYPHS = {
  // Explorer → luggage tag
  files: `<path fill-rule="evenodd" d="M9.2 2h5.6a1 1 0 0 1 .96.73L16.6 6H19a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1h2.4l.84-3.27A1 1 0 0 1 9.2 2zm.76 2-.5 2h5.08l-.5-2zM7 10v2h10v-2zm0 4v2h7v-2z"/>`,

  // Search → radar sweep
  search: `<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"/><path d="M12 12V4a8 8 0 0 1 7.45 5.1L12 12z"/><circle cx="12" cy="12" r="1.7"/><circle cx="7.5" cy="15.5" r="1.3"/>`,

  // Source control → route network between three airports
  "source-control": `<circle cx="5" cy="18" r="2.6"/><circle cx="19" cy="18" r="2.6"/><circle cx="12" cy="5" r="2.6"/><path d="M11 7.4h2L17.9 16l-1.8.9L12 9.6l-4.1 7.3-1.8-.9z"/><path d="M7 19h10v-2H7z"/>`,

  // Run & Debug → airliner, plan view
  "debug-alt": `<path d="M12 1.5c.9 0 1.6 1.3 1.6 2.9v4.5l8.4 4.9v2.3l-8.4-2.5v4.6l2.3 1.7v1.7L12 20.5l-3.9 1.1v-1.7l2.3-1.7v-4.6L2 16.1v-2.3l8.4-4.9V4.4c0-1.6.7-2.9 1.6-2.9z"/>`,

  // Extensions → cockpit gauge
  extensions: `<path fill-rule="evenodd" d="M12 3a9 9 0 0 0-6.6 15.1h13.2A9 9 0 0 0 12 3zm0 2a7 7 0 0 1 5.6 11.2l-1.6-1.2A5 5 0 0 0 8 15l-1.6 1.2A7 7 0 0 1 12 5z"/><path d="M12 12.2l5.2-4.3-3.6 5.7a1.6 1.6 0 1 1-1.6-1.4z"/><rect x="4" y="20" width="16" height="1.8" rx=".9"/>`,

  // Accounts → pilot wings (wing bars either side of a ringed hub, shield below)
  account: `<path d="M1.5 10.2c3.2-1.6 6-2.2 7.6-2.2v5.2c-1.6 0-4.4-.5-7.6-2.1a.5.5 0 0 1 0-.9z"/><path d="M22.5 10.2c-3.2-1.6-6-2.2-7.6-2.2v5.2c1.6 0 4.4-.5 7.6-2.1a.5.5 0 0 0 0-.9z"/><path fill-rule="evenodd" d="M12 6.8a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zm0 2.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z"/><path d="M10.2 15.4h3.6l-.4 3.4L12 20.6l-1.4-1.8z"/>`,

  // Settings → turbine fan
  "settings-gear": `<path fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22zm0 2a9 9 0 1 1 0 18 9 9 0 0 1 0-18z"/><path d="M12 12L12 4.5 14.9 6.5zM12 12l6.5-3.75-.3 3.55zM12 12l6.5 3.75-3.2 1.55zM12 12l0 7.5-2.9-2zM12 12l-6.5 3.75.3-3.55zM12 12L5.5 8.25l3.2-1.55z"/><circle cx="12" cy="12" r="2.1"/>`,

  // Remote → control tower
  remote: `<path d="M4 7h16l-2 5H6z"/><rect x="10" y="12" width="4" height="8"/><rect x="7" y="20" width="10" height="2" rx="1"/><rect x="11" y="3" width="2" height="4"/><circle cx="12" cy="2.8" r="1.3"/>`,

  // Terminal → runway with centreline
  terminal: `<path fill-rule="evenodd" d="M9 3h6l5 18H4zM11.5 6h1v3h-1zm-.3 5h1.6v3h-1.6zm-.4 5h2.4v3h-2.4z"/>`,

  // Notifications → fasten-seatbelt sign
  bell: `<path d="M1.5 12c0-1.3 1-2.3 2.3-2.3H8v4.6H3.8c-1.3 0-2.3-1-2.3-2.3z"/><path d="M22.5 12c0-1.3-1-2.3-2.3-2.3H16v4.6h4.2c1.3 0 2.3-1 2.3-2.3z"/><path fill-rule="evenodd" d="M8 8h8v8H8zm2.2 2.8v2.4h3.6v-2.4z"/>`,
  "bell-dot": `<path d="M1.5 12c0-1.3 1-2.3 2.3-2.3H8v4.6H3.8c-1.3 0-2.3-1-2.3-2.3z"/><path d="M22.5 12c0-1.3-1-2.3-2.3-2.3H16v4.6h4.2c1.3 0 2.3-1 2.3-2.3z"/><path fill-rule="evenodd" d="M8 8h8v8H8zm2.2 2.8v2.4h3.6v-2.4z"/><circle cx="19.5" cy="4.5" r="3"/>`,

  // Start debugging / run → takeoff
  "debug-start": `<path d="M3 20h18v2H3z"/><path d="M2.4 13.1l2-.8 3.3 1.3 4.6-6.8 2.2.6-2.1 7.4 6 1.6c1.3.3 2.1 1.5 1.6 2.6l-.4.8L4.1 16z"/>`,

  // Git branch → diverging route
  "git-branch": `<circle cx="6" cy="19" r="2.6"/><circle cx="6" cy="5" r="2.6"/><circle cx="18" cy="8" r="2.6"/><path d="M5 7h2v10H5z"/><path d="M15.8 9.7l1.4 1.4c-3.2 3-6.7 3.5-10.2 3.5v-2c3 0 6.1-.4 8.8-2.9z"/>`,

  // Home → terminal building
  home: `<path d="M3 20h18v2H3z"/><path d="M4 19v-9l8-5 8 5v9h-5v-5H9v5z"/>`,
};

// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(SVG_DIR, { recursive: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  for (const [id, body] of Object.entries(GLYPHS)) {
    fs.writeFileSync(
      path.join(SVG_DIR, `${id}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000">${body}</svg>\n`,
    );
  }

  let fantasticon;
  try {
    fantasticon = require("fantasticon");
  } catch {
    console.error("✖  fantasticon is not installed — run `npm install` first.");
    process.exit(1);
  }
  const { generateFonts, FontAssetType, OtherAssetType } = fantasticon;

  const result = await generateFonts({
    inputDir: SVG_DIR,
    outputDir: DIST_DIR,
    name: FONT_NAME,
    fontTypes: [FontAssetType.WOFF],
    assetTypes: [OtherAssetType.JSON],
    normalize: true,
    fontHeight: 1000,
    descent: 0,
    prefix: "ac",
    tag: "i",
  });

  const iconDefinitions = {};
  for (const [id, cp] of Object.entries(result.codepoints)) {
    iconDefinitions[id] = {
      fontCharacter: "\\" + cp.toString(16).toUpperCase().padStart(4, "0"),
      fontId: FONT_NAME,
    };
  }

  const theme = {
    $schema: "vscode://schemas/product-icon-theme",
    fonts: [
      {
        id: FONT_NAME,
        src: [{ path: `./dist/${FONT_NAME}.woff`, format: "woff" }],
        weight: "normal",
        style: "normal",
      },
    ],
    iconDefinitions,
  };
  fs.writeFileSync(path.join(OUT_DIR, "air-canada-product-icons.json"), JSON.stringify(theme, null, 2) + "\n");

  // keep dist lean: only the font is needed at runtime
  for (const f of fs.readdirSync(DIST_DIR)) if (!f.endsWith(".woff")) fs.unlinkSync(path.join(DIST_DIR, f));

  console.log(`✈  Product icons: ${Object.keys(iconDefinitions).length} glyphs → icons/product/dist/${FONT_NAME}.woff`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
